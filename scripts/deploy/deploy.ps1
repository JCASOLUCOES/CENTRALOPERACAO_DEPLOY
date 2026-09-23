param(
    [string]$Saida = "deploy",
    [bool]$Publicar = $true,

    [string]$ServidorRemoto = "192.168.2.130",
    [string]$UsuarioRemoto = "JCASRV-SUP",

    [System.Security.SecureString]$SenhaRemota = (ConvertTo-SecureString 'jca@1532' -AsPlainText -Force),
    [Nullable[bool]]$BuildBackend = $null,
    [Nullable[bool]]$BuildFrontend = $null,

    [string]$DestinoBackendRel = "inetpub\wwwroot\Suporte_Back",
    [string]$DestinoFrontRel   = "inetpub\wwwroot\Suporte_Front",
    [string]$BackupBaseRel     = "Users\JCASRV-SUP\Documents\Backup_IIS",
    [string]$AppSettingsArquivo = "appsettings.json",
    [int]$EsperaOffline = 3,

    # Novo: controle de backup e timing
    [bool]$Backup = $false,
    [int]$TimingLevel = 0
)

$ErrorActionPreference = "Stop"

# Cronômetro global
$watch = [System.Diagnostics.Stopwatch]::StartNew()

function Write-Timing {
    param([string]$Mensagem)
    if ($TimingLevel -ge 1) {
        $decorrido = $watch.Elapsed.TotalSeconds
        Write-Host "  [TIMING] $Mensagem - $decorrido s" -ForegroundColor DarkCyan
    } else {
        Write-Host "  $Mensagem"
    }
}

function Invoke-Robocopy {
    param(
        [string]$Origem,
        [string]$Destino,
        [string]$Descricao,
        [string[]]$ExcluirArquivos = @(),
        [switch]$Mirror
    )
    $rcArgs = @($Origem, $Destino)
    if ($Mirror) { $rcArgs += '/MIR' } else { $rcArgs += '/E' }
    foreach ($padrao in $ExcluirArquivos) { $rcArgs += @('/XF', $padrao) }
    $rcArgs += @('/MT:8', '/R:2', '/W:1', '/XJ', '/NFL', '/NDL', '/NJH', '/NJS', '/NP')
    Write-Timing -Mensagem "Iniciando: $Descricao"
    & robocopy @rcArgs | Out-Null
    $code = $LASTEXITCODE
    if ($code -ge 8) { throw "Falha do robocopy ($Descricao): codigo $code." }
}

function Test-CaminhoRelativoSeguro {
    param([string]$Caminho)
    if ([string]::IsNullOrWhiteSpace($Caminho)) { return $false }
    if ($Caminho -match '^\s*[a-zA-Z]:') { return $false }
    if ($Caminho -match '(^|[\\/])\.\.($|[\\/])') { return $false }
    if ($Caminho -match '^[\\/]') { return $false }
    return $true
}

function Test-ArtefatosFrontend {
    param([string]$PastaFront)
    return (Test-Path -LiteralPath (Join-Path $PastaFront 'browser\index.html')) -and
           (Test-Path -LiteralPath (Join-Path $PastaFront 'server\server.mjs'))
}

function Test-ArtefatosBackend {
    param([string]$PastaBack)
    return (Test-Path -LiteralPath (Join-Path $PastaBack 'Central_BackEnd.dll')) -and
           (Test-Path -LiteralPath (Join-Path $PastaBack 'Central_BackEnd.runtimeconfig.json'))
}

function Read-RespostaSimNao {
    param(
        [string]$Pergunta,
        [bool]$Padrao
    )
    $sufixo = if ($Padrao) { '(S/n)' } else { '(s/N)' }
    while ($true) {
        $resp = Read-Host "$Pergunta $sufixo"
        if ([string]::IsNullOrWhiteSpace($resp)) { return $Padrao }
        switch ($resp.Trim().ToLower()) {
            's' { return $true }
            'n' { return $false }
            default { Write-Host "  Resposta invalida, informe S ou N." -ForegroundColor Yellow }
        }
    }
}

$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$frontDir = Join-Path $raiz 'frontend'
$backDir = Join-Path $raiz 'backend\Central_BackEnd'
$frontDist = Join-Path $frontDir 'dist\central-conhecimento-actyon'
$backPublish = Join-Path $backDir 'publish_output'

Write-Timing -Mensagem "=== DEPLOY INICIADO ==="

if (-not (Test-CaminhoRelativoSeguro $DestinoBackendRel) -or -not (Test-CaminhoRelativoSeguro $DestinoFrontRel)) {
    throw "Destinos de IIS devem ser caminhos relativos dentro de wwwroot (sem letra de unidade, raiz absoluta ou '..')."
}
if (-not (Test-CaminhoRelativoSeguro $BackupBaseRel)) {
    throw "BackupBaseRel deve ser caminho relativo valido no servidor."
}

if ($null -eq $BuildFrontend) {
    $BuildFrontend = Read-RespostaSimNao -Pergunta "Buildar o frontend (Angular) agora?" -Padrao $true
}
if ($null -eq $BuildBackend) {
    $BuildBackend = Read-RespostaSimNao -Pergunta "Buildar o backend (dotnet publish) agora?" -Padrao $true
}

Write-Timing -Mensagem ("Build frontend: {0} | Build backend: {1}" -f $BuildFrontend, $BuildBackend)

if ($BuildFrontend) {
    Write-Timing -Mensagem "Fase 1: Build do frontend Angular"
    Push-Location $frontDir
    try {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        npm run build 2>&1 | Out-Host
        $ErrorActionPreference = $prevEAP
        if ($LASTEXITCODE -ne 0) { throw "Falha no 'npm run build'." }
    }
    finally {
        Pop-Location
    }
    Write-Timing -Mensagem "Fase 1 concluida: npm run build"
} else {
    Write-Timing -Mensagem "Fase 1 pulada: build do frontend desabilitado (reaproveitando build existente)"
}

if ($BuildBackend) {
    Write-Timing -Mensagem "Fase 2: Publish do backend ASP.NET Core 8"
    Push-Location $backDir
    try {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        dotnet publish -c Release -o ./publish_output 2>&1 | Out-Host
        $ErrorActionPreference = $prevEAP
        if ($LASTEXITCODE -ne 0) { throw "Falha no 'dotnet publish'." }
    }
    finally {
        Pop-Location
    }
    Write-Timing -Mensagem "Fase 2 concluida: dotnet publish"
} else {
    Write-Timing -Mensagem "Fase 2 pulada: publish do backend desabilitado (reaproveitando publish existente)"
}

if (-not (Test-ArtefatosFrontend $frontDist)) {
    throw "Build do frontend ausente ou incompleta em $frontDist (browser/index.html e server/server.mjs obrigatorios). Rode com build do frontend."
}
if (-not (Test-ArtefatosBackend $backPublish)) {
    throw "Publish do backend ausente ou incompleto em $backPublish (Central_BackEnd.dll e runtimeconfig obrigatorios). Rode com build do backend."
}

# ============================================================
# 2b. Identidade Git do pacote (BUILD_INFO)
# ============================================================
$gitCommit = $null
$gitBranch = $null
try {
    $gitCommit = (git -C $raiz rev-parse HEAD 2>$null | Out-String).Trim()
    $gitBranch = (git -C $raiz rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
} catch { }

$saidaRoot     = Join-Path $raiz $Saida
$buildInfoPath = Join-Path $saidaRoot "BUILD_INFO.txt"
$algumBuild    = [bool]$BuildFrontend -or [bool]$BuildBackend

if ($Publicar -and -not $algumBuild) {
    # Publica SEM rebuild: o BUILD_INFO gravado na etapa de empacotamento anterior
    # precisa bater com o HEAD atual (publica o que foi validado/empacotado).
    if (-not (Test-Path -LiteralPath $buildInfoPath)) {
        throw "BUILD_INFO.txt ausente em $saidaRoot. Rode o pipeline na ordem: validate -> deploy (build) -> deploy (publicar)."
    }
    $infoHash = (Select-String -Path $buildInfoPath -Pattern '^GitCommit=(.+)$').Matches[0].Groups[1].Value.Trim()
    if ([string]::IsNullOrWhiteSpace($gitCommit)) {
        throw "Nao foi possivel ler o HEAD do Git para conferir o BUILD_INFO."
    }
    if ($infoHash -ne $gitCommit) {
        throw "BUILD_INFO ($infoHash) diverge do HEAD atual ($gitCommit). Houve commit apos o build — rode o build de novo (validate + deploy com build)."
    }
    Write-Timing -Mensagem "BUILD_INFO confere com HEAD ($($gitCommit.Substring(0,[Math]::Min(8,$gitCommit.Length))))"
}

# ============================================================
# 3. Empacotamento local
# ============================================================
Write-Timing -Mensagem "Fase 3: Empacotamento local"

$saidaBackend = Join-Path $saidaRoot "backend"
$saidaFront   = Join-Path $saidaRoot "frontend"
$browserDir   = Join-Path $saidaFront "browser"

if (-not ((Resolve-Path -LiteralPath $frontDist).Path.StartsWith($raiz, [System.StringComparison]::OrdinalIgnoreCase))) {
    throw "Pasta dist do frontend fora do repositorio."
}

New-Item -ItemType Directory -Path $saidaBackend -Force | Out-Null
New-Item -ItemType Directory -Path $saidaFront -Force | Out-Null

Invoke-Robocopy $backPublish $saidaBackend "Empacotar backend"
Invoke-Robocopy $frontDist $saidaFront "Empacotar frontend"

if (-not (Test-ArtefatosBackend $saidaBackend)) { throw "Pacote backend incompleto em $saidaBackend." }
if (-not (Test-ArtefatosFrontend $saidaFront)) { throw "Pacote frontend incompleto em $saidaFront." }

# Grava identidade do pacote apenas quando houve build nesta execucao
# (empacotar sem build NAO pode regravar o hash — manter o BUILD_INFO do build validado)
if ($algumBuild) {
    $buildInfoLinhas = @(
        "GitCommit=$gitCommit"
        "GitBranch=$gitBranch"
        "DataUtc=$((Get-Date).ToUniversalTime().ToString('o'))"
        "Usuario=$env:USERNAME"
        "BuildFrontend=$BuildFrontend"
        "BuildBackend=$BuildBackend"
        "Maquina=$env:COMPUTERNAME"
    )
    Set-Content -LiteralPath $buildInfoPath -Value $buildInfoLinhas -Encoding UTF8
    Write-Timing -Mensagem "BUILD_INFO gravado: $buildInfoPath"
}

Write-Timing -Mensagem "Fase 3 concluida: empacotamento local"
Write-Host "Pacote local gerado:" -ForegroundColor Green
Write-Host "  Backend : $saidaBackend" -ForegroundColor Cyan
Write-Host "  Frontend: $saidaFront" -ForegroundColor Cyan

if (-not $Publicar) {
    Write-Host "-Publicar:`$false - nada foi enviado ao IIS." -ForegroundColor Yellow
    $watch.Stop()
    if ($TimingLevel -ge 1) {
        Write-Host "Tempo total: $($watch.Elapsed.TotalSeconds) segundos"
    }
    return
}

# ============================================================
# 4. Validação de servidor
# ============================================================
Write-Timing -Mensagem "Fase 4: Validando conexao com servidor $ServidorRemoto"
if (-not (Test-Connection -ComputerName $ServidorRemoto -Count 1 -Quiet)) {
    throw "Servidor $ServidorRemoto inalcancavel - verifique conectividade de rede."
}
Write-Timing -Mensagem "Fase 4 concluida: servidor acessivel"

# ============================================================
# 5. Autenticacao no IIS
# ============================================================
Write-Timing -Mensagem "Fase 5: Autenticando em $ServidorRemoto"
if ($null -eq $SenhaRemota -or $SenhaRemota.Length -eq 0) {
    $SenhaRemota = ConvertTo-SecureString 'jca@1532' -AsPlainText -Force
}
$cred = New-Object System.Management.Automation.PSCredential($UsuarioRemoto, $SenhaRemota)

$driveRemoto = $null
try {
    $driveRemoto = New-PSDrive -Name DepDeploy -PSProvider FileSystem -Root "\\$ServidorRemoto\c$" -Credential $cred -ErrorAction Stop
    if (-not (Test-Path -LiteralPath "\\$ServidorRemoto\c$\inetpub")) {
        throw "Compartilhamento administrativo \\$ServidorRemoto\c$ inacessivel apos autenticar."
    }
}
catch {
    throw "Erro na autenticacao: $($_.Exception.Message)"
}
Write-Timing -Mensagem "Fase 5 concluida: autenticacao estabelecida"

# ============================================================
# 6. Backup do IIS (opcional)
# ============================================================
if ($Backup) {
    Write-Timing -Mensagem "Fase 6: Fazendo backup do IIS atual"
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupRoot = Join-Path "\\$ServidorRemoto\c$" (Join-Path $BackupBaseRel $timestamp)
    $backupBack = Join-Path $backupRoot "backend"
    $backupFront = Join-Path $backupRoot "frontend"

    New-Item -ItemType Directory -Path "$backupRoot" -Force | Out-Null
    New-Item -ItemType Directory -Path $backupBack -Force | Out-Null
    New-Item -ItemType Directory -Path $backupFront -Force | Out-Null

    $backendRemotePre = "\\$ServidorRemoto\c$\$DestinoBackendRel"
    $frontendRemotePre = "\\$ServidorRemoto\c$\$DestinoFrontRel"
    if (Test-Path -LiteralPath $backendRemotePre) {
        Invoke-Robocopy $backendRemotePre $backupBack "Backup backend" -ExcluirArquivos @('appsettings*.json')
    }
    if (Test-Path -LiteralPath $frontendRemotePre) {
        Invoke-Robocopy $frontendRemotePre $backupFront "Backup frontend"
    }
    Write-Timing -Mensagem "Fase 6 concluida: backup salvo em $backupRoot"
} else {
    Write-Timing -Mensagem "Fase 6 pulada: backup desabilitado (-Backup:$false)"
}

# ============================================================
# 7. Publicacao do Backend
# ============================================================
Write-Timing -Mensagem "Fase 7: Publicando backend em $DestinoBackendRel"
$backendRemote = "\\$ServidorRemoto\c$\$DestinoBackendRel"

if (-not (Test-Path -LiteralPath $backendRemote)) {
    New-Item -ItemType Directory -Path $backendRemote -Force | Out-Null
}

$offline = Join-Path $backendRemote "app_offline.htm"
$offlinePreexistente = Test-Path -LiteralPath $offline
if (-not $offlinePreexistente) {
    Set-Content -LiteralPath $offline -Value "Deploy em andamento..." -Encoding ascii
    Start-Sleep -Seconds $EsperaOffline
}

$publicacaoBackendOk = $false
try {
    Write-Timing -Mensagem "Excluindo do deploy: appsettings*.json (preservados no servidor)"
    Invoke-Robocopy $saidaBackend $backendRemote "Purge backend (mirror)" -ExcluirArquivos @('appsettings*.json', 'app_offline.htm') -Mirror
    if (Test-Path -LiteralPath (Join-Path $backendRemote $AppSettingsArquivo)) {
        Write-Timing -Mensagem "OK appsettings.json do servidor mantido intacto."
    } else {
        Write-Timing -Mensagem "AVISO: appsettings.json nao encontrado no servidor."
    }
    if (-not (Test-ArtefatosBackend $backendRemote)) {
        throw "Backend publicado incompleto em $backendRemote (dll/runtimeconfig ausentes)."
    }
    $publicacaoBackendOk = $true
}
finally {
    if (-not $offlinePreexistente -and -not $publicacaoBackendOk -and (Test-Path -LiteralPath $offline)) {
        Write-Timing -Mensagem "app_offline.htm mantido: backend publicado parcialmente, IIS continua offline."
    } elseif (-not $offlinePreexistente -and $publicacaoBackendOk -and (Test-Path -LiteralPath $offline)) {
        Remove-Item -LiteralPath $offline -Force
    }
}
Write-Timing -Mensagem "Fase 7 concluida: backend publicado"

# ============================================================
# 8. Publicacao do Frontend
# ============================================================
Write-Timing -Mensagem "Fase 8: Publicando frontend em $DestinoFrontRel"
$frontendRemote = "\\$ServidorRemoto\c$\$DestinoFrontRel"
if (-not (Test-Path -LiteralPath $frontendRemote)) {
    New-Item -ItemType Directory -Path $frontendRemote -Force | Out-Null
}
Invoke-Robocopy $browserDir $frontendRemote "Purge frontend (mirror)" -Mirror
if (-not (Test-Path -LiteralPath (Join-Path $frontendRemote 'index.html'))) {
    throw "Frontend publicado incompleto em $frontendRemote (index.html ausente)."
}
Write-Timing -Mensagem "Fase 8 concluida: frontend publicado"

# ============================================================
# 9. Limpeza e resumo
# ============================================================
Write-Timing -Mensagem "Fase 9: Limpeza e conexoes finais"
if ($driveRemoto) {
    Remove-PSDrive -Name $driveRemoto.Name -Force -ErrorAction SilentlyContinue
}

Write-Timing -Mensagem "=== DEPLOY CONCLUIDO ==="
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend : \\$ServidorRemoto\c$\inetpub\wwwroot\$DestinoBackendRel" -ForegroundColor Gray
Write-Host "Frontend: \\$ServidorRemoto\c$\inetpub\wwwroot\$DestinoFrontRel" -ForegroundColor Gray
if ($Backup) {
    Write-Host "Backup  : $backupRoot" -ForegroundColor Gray
}
Write-Host ""
Write-Host "O backend recarrega sozinho apos a remocao do app_offline.htm." -ForegroundColor Gray
Write-Host "Teste: frontend http://${ServidorRemoto}:1010" -ForegroundColor Gray
Write-Host "       swagger http://${ServidorRemoto}:1009/swagger" -ForegroundColor Gray
Write-Host "Git  : $gitBranch @ $gitCommit" -ForegroundColor Gray
Write-Host ""
Write-Host "Proximo passo: powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -Servidor $ServidorRemoto" -ForegroundColor Cyan

$watch.Stop()
if ($TimingLevel -ge 1) {
    Write-Host ""
    Write-Host "Tempo total: $($watch.Elapsed.TotalSeconds) segundos" -ForegroundColor Cyan
    Write-Host "Fases cronometradas: $TimingLevel" -ForegroundColor Cyan
}