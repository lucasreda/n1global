# Script PowerShell para reiniciar o servidor de desenvolvimento no Windows
Write-Host "🔄 Reiniciando servidor de desenvolvimento..." -ForegroundColor Cyan
Write-Host ""

# Parar processos existentes do tsx
Write-Host "⏹️  Parando processos existentes..." -ForegroundColor Yellow
$tsxProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*tsx*server*" }
if ($tsxProcesses) {
    $tsxProcesses | Stop-Process -Force
    Write-Host "✅ Processos parados" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Nenhum processo tsx encontrado" -ForegroundColor Gray
}

# Limpar cache do tsx (se existir)
Write-Host ""
Write-Host "🧹 Limpando cache..." -ForegroundColor Yellow
$tsxCachePath = "$env:TEMP\.tsx"
if (Test-Path $tsxCachePath) {
    Remove-Item -Path $tsxCachePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cache limpo" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Nenhum cache encontrado" -ForegroundColor Gray
}

# Limpar node_modules/.cache se existir
$nodeCachePath = "node_modules\.cache"
if (Test-Path $nodeCachePath) {
    Remove-Item -Path $nodeCachePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cache do node_modules limpo" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Agora você pode iniciar o servidor com: npm run dev" -ForegroundColor Green
Write-Host ""

