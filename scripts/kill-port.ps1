# Script para liberar uma porta específica no Windows
param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "🔍 Verificando processos usando a porta $Port..."

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if ($connections) {
    $processes = $connections | ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue } | Select-Object -Unique
    
    if ($processes) {
        Write-Host "📋 Processos encontrados usando a porta $Port:"
        $processes | ForEach-Object {
            Write-Host "  - PID: $($_.Id) | Nome: $($_.ProcessName) | Caminho: $($_.Path)"
        }
        
        Write-Host "`n🛑 Encerrando processos..."
        $processes | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction Stop
                Write-Host "  ✓ Processo $($_.Id) ($($_.ProcessName)) encerrado"
            } catch {
                Write-Host "  ✗ Erro ao encerrar processo $($_.Id): $_"
            }
        }
        
        Start-Sleep -Seconds 2
        
        # Verificar novamente
        $remaining = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($remaining) {
            Write-Host "`n⚠️ Ainda há processos usando a porta $Port. Tente executar como administrador."
        } else {
            Write-Host "`n✅ Porta $Port liberada com sucesso!"
        }
    }
} else {
    Write-Host "✅ Nenhum processo encontrado usando a porta $Port"
}

