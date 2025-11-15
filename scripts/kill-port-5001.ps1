# Script para liberar a porta 5001
# Uso: .\scripts\kill-port-5001.ps1

Write-Host "Liberando porta 5001..." -ForegroundColor Cyan

# Parar todos os processos Node.js
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process tsx -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep -Seconds 2

# Verificar se ainda há processos usando a porta
$connections = netstat -ano | findstr :5001
if ($connections) {
    Write-Host "Processos ainda usando a porta 5001:" -ForegroundColor Yellow
    $connections | ForEach-Object {
        $parts = $_ -split '\s+'
        $pid = $parts[-1]
        if ($pid -match '^\d+$') {
            Write-Host "  Parando processo PID: $pid" -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
}

Write-Host "Porta 5001 liberada!" -ForegroundColor Green




