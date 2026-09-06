$ErrorActionPreference = 'Stop'
$sec = ConvertTo-SecureString 'jca@1532' -AsPlainText -Force

# Limpa conexoes existentes
$exists = net use 2>&1 | Select-String '192.168.2.130'
if ($exists) {
    Write-Host "Limpando conexoes existentes..." -ForegroundColor Yellow
    net use * /delete /y 2>&1 | Out-Null
    Start-Sleep 2
}

Write-Host "Estabelecendo conexao com 192.168.2.130..." -ForegroundColor Yellow
$out = & cmd /c 'net use \\192.168.2.130\IPC$ /user:JCASRV-SUP "jca@1532" /persistent:no' 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host "Falha IPC." -ForegroundColor Red; exit 1 }
& cmd /c 'net use \\192.168.2.130\c$ /user:JCASRV-SUP "jca@1532" /persistent:no' 2>&1 | Out-Null
Write-Host "Conexao estabelecida." -ForegroundColor Green

# Cria copia modificada via Replace literal
$scriptPath = "$PSScriptRoot\deploy.ps1"
$destPath  = "$PSScriptRoot\deploy.patched.ps1"
$content = [System.IO.File]::ReadAllText($scriptPath)
$content = $content.Replace(
    '$netUseResult = & cmd /c "net use `"$auth`" /user:$UsuarioRemoto `"$pwAutenticacao`" /persistent:no" 2>&1',
    '$netUseResult = ""  # skipped - ja conectado via wrapper'
)
$content = $content.Replace(
    'if ($LASTEXITCODE -ne 0) { throw "Falha ao autenticar em $ServidorRemoto. Verifique usuario e senha." }',
    '# auth check skipped'
)
$content = $content.Replace(
    '& cmd /c "net use `"$uncC`" /user:$UsuarioRemoto `"$pwAutenticacao`" /persistent:no" 2>&1 | Out-Null',
    '# c$ connect skipped'
)
$content = $content.Replace(
    'if ($LASTEXITCODE -ne 0) { throw "Falha ao conectar ao compartilhamento administrativo $uncC." }',
    '# check skipped'
)
[System.IO.File]::WriteAllText($destPath, $content)

Write-Host "Iniciando deploy..." -ForegroundColor Cyan
& $destPath -SenhaRemota $sec

Remove-Item $destPath -Force -ErrorAction SilentlyContinue
net use * /delete /y 2>&1 | Out-Null
