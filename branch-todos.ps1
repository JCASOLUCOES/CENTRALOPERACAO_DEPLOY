param(
    [Parameter(Mandatory = $true)]
    [string]$Branch,

    [string]$Base = "main",

    [switch]$Push
)

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $raiz

$submodulos = @("frontend", "backend")

function Invoke-InSubmodule {
    param(
        [string]$Path,
        [string]$Branch,
        [string]$Base
    )
    Write-Host ""
    Write-Host "== Submodulo: $Path ==" -ForegroundColor Cyan
    Push-Location $Path
    try {
        $branchAtual = git rev-parse --abbrev-ref HEAD
        Write-Host "  branch atual: $branchAtual"

        if ($branchAtual -ne $Base) {
            Write-Host "  checkout $Base" -ForegroundColor Yellow
            git checkout $Base 2>&1 | Out-Null
        }

        Write-Host "  pull origin $Base" -ForegroundColor Yellow
        git pull origin $Base 2>&1 | Out-Null

        Write-Host "  criando branch '$Branch' baseada em '$Base'" -ForegroundColor Green
        git checkout -b $Branch 2>&1 | Out-Null

        if ($Push) {
            Write-Host "  push -u origin $Branch" -ForegroundColor Green
            git push -u origin $Branch 2>&1 | Out-Null
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BRANCH-TODOS - $Branch (base: $Base)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repos afetados:" -ForegroundColor Gray
Write-Host "  - monorepo (raiz)" -ForegroundColor Gray
foreach ($s in $submodulos) {
    Write-Host "  - submodule: $s" -ForegroundColor Gray
}

# 1. Monorepo raiz
Write-Host ""
Write-Host "== Monorepo (raiz) ==" -ForegroundColor Cyan
$raizBranch = git rev-parse --abbrev-ref HEAD
Write-Host "  branch atual: $raizBranch"
if ($raizBranch -ne $Base) {
    Write-Host "  checkout $Base" -ForegroundColor Yellow
    git checkout $Base 2>&1 | Out-Null
}
Write-Host "  pull origin $Base" -ForegroundColor Yellow
git pull origin $Base 2>&1 | Out-Null
Write-Host "  criando branch '$Branch' baseada em '$Base'" -ForegroundColor Green
git checkout -b $Branch 2>&1 | Out-Null
if ($Push) {
    Write-Host "  push -u origin $Branch" -ForegroundColor Green
    git push -u origin $Branch 2>&1 | Out-Null
}

# 2. Submodulos
foreach ($s in $submodulos) {
    if (Test-Path -LiteralPath $s) {
        Invoke-InSubmodule -Path $s -Branch $Branch -Base $Base
    } else {
        Write-Host "AVISO: submodulo '$s' nao encontrado em $raiz" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Branch '$Branch' criada em todos os repos" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
if (-not $Push) {
    Write-Host ""
    Write-Host "Use -Push para enviar ao remote (origin):" -ForegroundColor Yellow
    Write-Host "  .\branch-todos.ps1 -Branch $Branch -Base $Base -Push" -ForegroundColor Yellow
}
