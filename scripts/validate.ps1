#Requires -Version 5.1
<#
  validate.ps1 - gate de build antes do commit/deploy (Central de Operacao)
  Uso:  powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
  Sai com codigo 0 se TUDO compilar; senao 1 (o deploy NAO deve seguir).
#>
param(
    [switch]$PularGit,
    [switch]$PularFrontend,
    [switch]$PularBackend
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$falhas = @()

Write-Host "========================================"
Write-Host "  VALIDATE - gate de build"
Write-Host "========================================"
Write-Host ("  Raiz: " + $raiz)

if (-not $PularGit) {
    Write-Host ""
    Write-Host "==> 1/3 Git status"
    Push-Location $raiz
    try {
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        $status = git status --porcelain 2>$null | Out-String
        $branch = git rev-parse --abbrev-ref HEAD 2>$null | Out-String
        $commit = git rev-parse --short HEAD 2>$null | Out-String
        $ErrorActionPreference = $prevEap
        $sujo = -not [string]::IsNullOrWhiteSpace($status)
        Write-Host ("  Branch: " + $branch.Trim() + "  Commit: " + $commit.Trim())
        if ($sujo) {
            Write-Host "  AVISO: ha alteracoes nao commitadas:"
            Write-Host $status
            Write-Host "  Recomendo: git add / commit / push ANTES do deploy."
        }
        else {
            Write-Host "  Working tree limpa."
        }
    }
    finally { Pop-Location }
}

if (-not $PularBackend) {
    Write-Host ""
    Write-Host "==> 2/3 dotnet build (backend)"
    $backDir = Join-Path $raiz 'backend\Central_BackEnd'
    Push-Location $backDir
    try {
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        dotnet build --nologo 2>&1 | Out-Host
        $code = $LASTEXITCODE
        $ErrorActionPreference = $prev
        if ($code -ne 0) {
            $falhas += "dotnet build falhou (exit $code)"
        }
        else {
            Write-Host "  Backend OK."
        }
    }
    finally { Pop-Location }
}

if (-not $PularFrontend) {
    Write-Host ""
    Write-Host "==> 3/3 ng build (frontend)"
    $frontDir = Join-Path $raiz 'frontend'
    Push-Location $frontDir
    try {
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        npx ng build 2>&1 | Out-Host
        $code = $LASTEXITCODE
        $ErrorActionPreference = $prev
        if ($code -ne 0) {
            $falhas += "ng build falhou (exit $code)"
        }
        else {
            Write-Host "  Frontend OK."
        }
    }
    finally { Pop-Location }
}

Write-Host ""
Write-Host "========================================"
if ($falhas.Count -eq 0) {
    Write-Host "  VALIDATE: OK - pode commitar/deployar."
    Write-Host "========================================"
    exit 0
}
Write-Host "  VALIDATE: FALHOU"
foreach ($f in $falhas) {
    Write-Host ("  - " + $f)
}
Write-Host "========================================"
Write-Host "Corrija, commit e rode 'validar' de novo."
exit 1
