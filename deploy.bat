@echo off
echo.
echo ========================================
echo   DEPLOY - Central de Conhecimento
echo ========================================
echo.
echo Executando deploy...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"

echo.
echo Pressione qualquer tecla para fechar...
pause >nul
