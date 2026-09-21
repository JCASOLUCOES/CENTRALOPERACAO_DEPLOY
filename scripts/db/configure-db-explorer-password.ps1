<#
.SYNOPSIS
    Configura a variável de ambiente DB_EXPLORER_SENHA no IIS Application Pool "Suporte_Back"
    
.DESCRIPTION
    Este script configura a variável de ambiente DB_EXPLORER_SENHA 
    no Application Pool "Suporte_Back" do IIS, necessária para o Database Explorer
    conectar ao banco dbActyon_JCA (192.168.2.154).
    A senha NÃO é hardcoded — deve ser informada via parâmetro ou variável de ambiente.
    
.INSTRUCTIONS
    1. Copie este arquivo para o servidor 192.168.2.130
    2. Abra PowerShell COMO ADMINISTRADOR
    3. Execute: .\configure-db-explorer-password.ps1 -Senha "SUA_SENHA_AQUI"
       Ou defina a variável de ambiente $env:DB_EXPLORER_SENHA antes de rodar
    4. Teste em: http://192.168.2.130:1010/database -> "Testar conexão"
    
.REQUIREMENTS
    - PowerShell como Administrador
    - Módulo WebAdministration (padrão no Windows Server com IIS)
    - Application Pool "Suporte_Back" existente no IIS
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Senha = $(if ($env:DB_EXPLORER_SENHA) { $env:DB_EXPLORER_SENHA } else { Read-Host -AsSecureString "Digite a senha do DB_EXPLORER_SENHA" | ConvertFrom-SecureString })
)

$ErrorActionPreference = 'Stop'

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Configuração DB_EXPLORER_SENHA no IIS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se é Admin
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERRO: Execute o PowerShell COMO ADMINISTRADOR" -ForegroundColor Red
    exit 1
}

# Carregar módulo IIS
Write-Host "Carregando módulo WebAdministration..." -ForegroundColor Yellow
Import-Module WebAdministration -ErrorAction Stop

# Verificar se AppPool existe
$appPoolPath = "IIS:\AppPools\Suporte_Back"
if (-not (Test-Path $appPoolPath)) {
    Write-Host "ERRO: Application Pool 'Suporte_Back' não encontrado no IIS" -ForegroundColor Red
    Write-Host "Verifique se o nome está correto: 'Suporte_Back'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Application Pool 'Suporte_Back' encontrado" -ForegroundColor Green

# Obter configuração de environmentVariables
$appPool = Get-Item "IIS:\AppPools\Suporte_Back"
$envVars = $appPool.GetAttributeValue("environmentVariables")

if (-not $envVars) {
    Write-Host "Criando collection environmentVariables..." -ForegroundColor Yellow
    # Se não existe, o IIS cria automaticamente ao adicionar
}

# Verificar se já existe
$found = $envVars.Collection | Where-Object { $_.Name -eq "DB_EXPLORER_SENHA" }

if ($found) {
    Write-Host "DB_EXPLORER_SENHA já existe - atualizando valor..." -ForegroundColor Yellow
    $found.Value = $Senha
    Write-Host "  Valor atualizado" -ForegroundColor Green
} else {
    Write-Host "Adicionando nova variável DB_EXPLORER_SENHA..." -ForegroundColor Yellow
    $envVars.Collection.Add(@{ name = "DB_EXPLORER_SENHA"; value = $Senha })
    Write-Host "  Variável adicionada" -ForegroundColor Green
}

# Salvar alterações
try {
    $appPool.CommitChanges()
    Write-Host "" -ForegroundColor Green
    Write-Host "✓ Alterações salvas com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO ao salvar alterações: $_" -ForegroundColor Red
    exit 1
}

# Verificar se ficou salvo
Write-Host ""
Write-Host "Verificando configuração..." -ForegroundColor Yellow
$verify = Get-Item "IIS:\AppPools\Suporte_Back"
$verifyVars = $verify.GetAttributeValue("environmentVariables")
$verifyFound = $verifyVars.Collection | Where-Object { $_.Name -eq "DB_EXPLORER_SENHA" }

if ($verifyFound) {
    Write-Host "✓ DB_EXPLORER_SENHA confirmada: $($verifyFound.Value)" -ForegroundColor Green
} else {
    Write-Host "ERRO: Variável não encontrada após commit" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAÇÃO CONCLUÍDA COM SUCESSO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Recicle o Application Pool: IIS Manager > Suporte_Back > Recycle" -ForegroundColor White
Write-Host "2. Teste em: http://192.168.2.130:1010/database" -ForegroundColor White
Write-Host "3. Clique em 'Testar conexão' -> deve aparecer 🟢 CONECTADO" -ForegroundColor White
Write-Host ""
Read-Host "Pressione Enter para sair"