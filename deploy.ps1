param(
    [string]$Saida = "deploy",
    [bool]$Publicar = $true,
    [string]$ServidorRemoto = "192.168.2.130",
    [string]$UsuarioRemoto = "JCASRV-SUP",
    [securestring]$SenhaRemota = $null,

    [string]$DestinoBackendRel = "inetpub\wwwroot\Suporte_Back",
    [string]$DestinoFrontRel   = "inetpub\wwwroot\Suporte_Front",
    [string]$BackupBaseRel     = "Users\JCASRV-SUP\Documents\Backup_IIS",
    [string]$AppSettingsArquivo = "appsettings.json",
    [int]$EsperaOffline = 3
)

$ErrorActionPreference = "Stop"

function Invoke-Robocopy {
    param(
        [string]$Origem,
        [string]$Destino,
        [string]$Descricao,
        [string]$Excluir = $null,
        [switch]$Mirror
    )
    $args = @($Origem, $Destino)
    if ($Mirror) { $args += '/MIR' } else { $args += '/E' }
    if ($Excluir) { $args += @('/XF', $Excluir) }
    $args += @('/NFL', '/NDL', '/NJH', '/NJS', '/NP')
    Write-Host "  [$Descricao]" -ForegroundColor DarkCyan
    robocopy @args | Out-Null
    $code = $LASTEXITCODE
    if ($code -ge 16) { throw "Falha fatal do robocopy ($Descricao): codigo $code." }
    if ($code -ge 8)  { Write-Warning "robocopy '$Descricao' concluido com avisos (codigo $code)." }
}

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontDir = Join-Path $raiz "Central-Conhecimento-developer"
$backDir  = Join-Path $raiz "CCBAckend\Central_BackEnd"

$saidaRoot    = Join-Path $raiz $Saida
$saidaBackend = Join-Path $saidaRoot "backend"
$saidaFront   = Join-Path $saidaRoot "frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY - Central de Conhecimento" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "== Frontend: npm run build =="
Push-Location $frontDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Falha no 'npm run build'." }
}
finally {
    Pop-Location
}

Write-Host "== Backend: dotnet publish =="
Push-Location $backDir
try {
    dotnet publish -c Release
    if ($LASTEXITCODE -ne 0) { throw "Falha no 'dotnet publish'." }
}
finally {
    Pop-Location
}

$publishDir = Join-Path $backDir "bin\Release\net8.0\publish"
$distDir    = Join-Path $frontDir "dist\central-conhecimento-actyon"

if (-not (Test-Path -LiteralPath $publishDir)) { throw "Pasta de publish nao encontrada: $publishDir" }
if (-not (Test-Path -LiteralPath $distDir))    { throw "Pasta de dist nao encontrada: $distDir" }

Write-Host "== Empacotando em $saidaRoot =="
Remove-Item -LiteralPath $saidaBackend -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $saidaFront -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $saidaBackend -Force | Out-Null
New-Item -ItemType Directory -Path $saidaFront -Force | Out-Null
Copy-Item -Path "$publishDir\*" -Destination $saidaBackend -Recurse -Force
Copy-Item -Path "$distDir\*"    -Destination $saidaFront -Recurse -Force

Write-Host ""
Write-Host "Pacote local gerado:" -ForegroundColor Green
Write-Host "  Backend : $saidaBackend"
Write-Host "  Frontend: $saidaFront"
Write-Host ""

if (-not $Publicar) {
    Write-Host "-Publicar:`$false - nada foi enviado ao IIS." -ForegroundColor Yellow
    return
}

if (-not $ServidorRemoto) {
    Write-Warning "Nenhum -ServidorRemoto informado; pacote parado em $saidaRoot."
    return
}

# ===== Publicacao direta no IIS via compartilhamento administrativo (c$) =====
$uncC        = "\\$ServidorRemoto\c`$"
$destBackend = Join-Path $uncC $DestinoBackendRel
$destFront   = Join-Path $uncC $DestinoFrontRel
$backupRoot  = Join-Path $uncC (Join-Path $BackupBaseRel (Get-Date -Format 'yyyyMMdd-HHmmss'))
$backupBack  = Join-Path $backupRoot "backend"
$backupFront = Join-Path $backupRoot "frontend"
$backupCfg   = Join-Path $backupBack $AppSettingsArquivo
$appCfg      = Join-Path $destBackend $AppSettingsArquivo
$auth        = "\\$ServidorRemoto\IPC`$"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PUBLICACAO NO IIS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Credenciais: usuario com padrao, senha obrigatoria
Write-Host "Servidor:  $ServidorRemoto" -ForegroundColor Gray
Write-Host "Usuario:   $UsuarioRemoto (padrao)" -ForegroundColor Gray
$inputUsuario = Read-Host "Usuario [$UsuarioRemoto]"
if ($inputUsuario.Trim()) { $UsuarioRemoto = $inputUsuario.Trim() }

if (-not $SenhaRemota) {
    $SenhaRemota = Read-Host "Senha" -AsSecureString
}
$pwAutenticacao = [System.Net.NetworkCredential]::new('', $SenhaRemota).Password

Write-Host ""
Write-Host "Conectando em $ServidorRemoto..." -ForegroundColor Yellow

net use $auth /user:$UsuarioRemoto $pwAutenticacao /persistent:no 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Falha ao autenticar em $ServidorRemoto. Verifique usuario e senha." }
net use $uncC /user:$UsuarioRemoto $pwAutenticacao /persistent:no 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Falha ao conectar ao compartilhamento administrativo $uncC." }

Write-Host "Conexao estabelecida!" -ForegroundColor Green

New-Item -ItemType Directory -Path $backupBack -Force  | Out-Null
New-Item -ItemType Directory -Path $backupFront -Force | Out-Null

Write-Host ""
Write-Host "== Backup do IIS atual em $backupRoot =="
if (Test-Path -LiteralPath $destBackend) { Invoke-Robocopy $destBackend $backupBack "Backend atual" }
if (Test-Path -LiteralPath $destFront)   { Invoke-Robocopy $destFront   $backupFront "Frontend atual" }

# Backend: app_offline.htm libera o lock do worker antes de trocar os binarios.
Write-Host ""
Write-Host "== Publicando Backend ($DestinoBackendRel) =="
New-Item -ItemType Directory -Path $destBackend -Force | Out-Null
$offline = Join-Path $destBackend "app_offline.htm"
Set-Content -LiteralPath $offline -Value "Deploy em andamento..." -Encoding ascii
Start-Sleep -Seconds $EsperaOffline

try {
    Write-Host "  Excluindo do deploy: appsettings*.json (preservados no servidor)" -ForegroundColor Yellow
    Invoke-Robocopy $saidaBackend $destBackend "Novo backend" -Excluir "appsettings*.json"
    Invoke-Robocopy $saidaBackend $destBackend "Purge backend (mirror)" -Excluir "appsettings*.json" -Mirror
    if (Test-Path -LiteralPath $appCfg) {
        Write-Host "  OK appsettings.json do servidor mantido intacto." -ForegroundColor Green
    } else {
        Write-Host "  AVISO: appsettings.json nao encontrado no servidor (sera necessario criar)." -ForegroundColor Yellow
    }
}
finally {
    if (Test-Path -LiteralPath $offline) { Remove-Item -LiteralPath $offline -Force }
}

# Frontend estatico (sem lock).
Write-Host ""
Write-Host "== Publicando Frontend ($DestinoFrontRel) =="
New-Item -ItemType Directory -Path $destFront -Force | Out-Null
$browserDir = Join-Path $saidaFront "browser"
if (-not (Test-Path -LiteralPath $browserDir)) { throw "Pasta 'browser' nao encontrada em $saidaFront." }
Invoke-Robocopy $browserDir $destFront "Novo frontend"
Invoke-Robocopy $browserDir $destFront "Purge frontend (mirror)" -Mirror

# Limpar conexao
net use $uncC /delete 2>&1 | Out-Null
net use $auth /delete 2>&1 | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend : $destBackend" -ForegroundColor Gray
Write-Host "Frontend: $destFront" -ForegroundColor Gray
Write-Host "Backup  : $backupRoot" -ForegroundColor Gray
Write-Host ""
Write-Host "O backend recarrega sozinho apos a remocao do app_offline.htm." -ForegroundColor Gray
Write-Host "Teste: frontend http://${ServidorRemoto}:1010" -ForegroundColor Gray
Write-Host "       swagger http://${ServidorRemoto}:1009/swagger" -ForegroundColor Gray
