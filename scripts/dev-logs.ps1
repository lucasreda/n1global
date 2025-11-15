# Script PowerShell para visualizar logs do servidor em tempo real
# Uso: npm run dev:logs

$logFile = "$env:TEMP\n1global-server.log"

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Visualizando logs do servidor em tempo real" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Arquivo: $logFile" -ForegroundColor Gray
Write-Host "Para sair, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

if (Test-Path $logFile) {
    $fileInfo = Get-Item $logFile
    Write-Host "[OK] Arquivo de log encontrado" -ForegroundColor Green
    Write-Host "  Tamanho: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
    Write-Host "  Ultima modificacao: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "---------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "> Mostrando ultimas 50 linhas e seguindo em tempo real..." -ForegroundColor Green
    Write-Host "  Pressione Ctrl+C para sair" -ForegroundColor DarkGray
    Write-Host ""
    
    try {
        # Usar Get-Content -Wait -Tail que e a forma mais eficiente e nativa do PowerShell
        # Isso mostra as ultimas 50 linhas e depois segue apenas as novas linhas em tempo real
        Get-Content -Path $logFile -Wait -Tail 50 -ErrorAction Stop
    } catch {
        Write-Host ""
        Write-Host "Erro ao ler o arquivo de log: $_" -ForegroundColor Red
        Write-Host "Verifique se o arquivo nao esta sendo usado por outro processo." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[ERRO] Arquivo de log nao encontrado: $logFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verificando processos do servidor..." -ForegroundColor Yellow
    
    $processes = Get-Process | Where-Object { 
        $_.ProcessName -like "*node*" -or $_.ProcessName -like "*tsx*"
    } -ErrorAction SilentlyContinue
    
    if ($processes) {
        Write-Host ""
        Write-Host "Processos Node.js encontrados:" -ForegroundColor Green
        $processes | ForEach-Object { 
            Write-Host "  - PID: $($_.Id) - $($_.ProcessName) - $($_.MainWindowTitle)" -ForegroundColor Gray 
        }
    } else {
        Write-Host ""
        Write-Host "Nenhum processo do servidor encontrado" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "---------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Para iniciar o servidor com logs salvos:" -ForegroundColor Cyan
    Write-Host "  npm run dev:with-logs" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou simplesmente execute:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host "  (os logs aparecerao diretamente no terminal)" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
