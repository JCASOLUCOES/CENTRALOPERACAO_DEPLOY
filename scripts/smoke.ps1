#Requires -Version 5.1
<#
  smoke.ps1 - checagem rapida pos-deploy (Central de Operacao)
  Uso:
    powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -Servidor 192.168.2.130
    powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -Local
  Sai com 0 se frontend + swagger responderem; senao 1.
#>
param(
    [string]$Servidor = "192.168.2.130",
    [switch]$Local,
    [int]$Tentativas = 5,
    [int]$EsperaSeg = 3
)

$ErrorActionPreference = "Stop"

if ($Local) {
    $front = "http://localhost:1010"
    $api   = "http://localhost:1009/swagger"
}
else {
    $front = "http://${Servidor}:1010"
    $api   = "http://${Servidor}:1009/swagger"
}

function Test-Url {
    param(
        [string]$Url,
        [string]$Nome
    )
    $ok = $false
    for ($i = 1; $i -le $Tentativas; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
                Write-Host ("  OK  " + $Nome + " (" + $resp.StatusCode + ") - " + $Url)
                $ok = $true
                break
            }
            Write-Host ("  WARN " + $Nome + " (HTTP " + $resp.StatusCode + ") - " + $Url)
        }
        catch {
            Write-Host ("  Tentativa " + $i + "/" + $Tentativas + " falhou em " + $Nome + " - " + $Url)
            if ($i -lt $Tentativas) {
                Start-Sleep -Seconds $EsperaSeg
            }
        }
    }
    if (-not $ok) {
        Write-Host ("  FALHA " + $Nome + " - " + $Url)
    }
    return $ok
}

Write-Host "========================================"
Write-Host "  SMOKE - pos-deploy"
Write-Host "========================================"

$okFront = Test-Url -Url $front -Nome "Frontend"
$okApi   = Test-Url -Url $api   -Nome "Swagger/API"

Write-Host ""
if ($okFront -and $okApi) {
    Write-Host "  SMOKE: OK - sistema respondendo."
    exit 0
}
Write-Host "  SMOKE: FALHOU."
Write-Host "  Se o deploy acabou de ser feito, aguarde 30-60s (IIS recarrega)"
Write-Host "  e rode de novo. Se persistir, restaure o backup (ver skill deploy-limpo)."
exit 1
