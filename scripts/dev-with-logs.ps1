# Script para rodar o servidor salvando logs em arquivo
# Uso: .\scripts\dev-with-logs.ps1

$logFile = "$env:TEMP\n1global-server.log"

Write-Host "Iniciando servidor com logs salvos em arquivo..." -ForegroundColor Cyan
Write-Host "Arquivo de log: $logFile" -ForegroundColor Gray
Write-Host "Para ver logs em tempo real em outro terminal: npm run dev:logs" -ForegroundColor Yellow
Write-Host ""

$env:NODE_ENV = "development"
tsx server/index.ts 2>&1 | Tee-Object -FilePath $logFile






