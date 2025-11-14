# Script para iniciar o servidor de forma confiável
Write-Host "🚀 Iniciando servidor N1Global..." -ForegroundColor Cyan
Write-Host ""

# Verificar se porta está livre
$port = 5001
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connection) {
    Write-Host "⚠️  Porta $port está em uso. Liberando..." -ForegroundColor Yellow
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Iniciar servidor
Write-Host "📍 Servidor será iniciado na porta $port" -ForegroundColor Gray
Write-Host "📍 URL: http://localhost:$port" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

npm run dev










