# 🔄 FORÇAR REINÍCIO DO SERVIDOR

## Problema
O servidor está usando código antigo em cache, causando erro `require is not defined`.

## Solução: Reiniciar completamente

### Passo 1: Parar TODOS os processos Node.js relacionados
```powershell
# Parar todos os processos node que podem estar rodando o servidor
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Passo 2: Limpar TODOS os caches
```powershell
# Limpar cache do tsx
Remove-Item -Path "$env:TEMP\.tsx" -Recurse -Force -ErrorAction SilentlyContinue

# Limpar cache do node_modules
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

# Limpar pasta dist (código compilado antigo)
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
```

### Passo 3: Verificar que o código está correto
O código já está correto:
- ✅ Linha 8: `import crypto from "crypto";`
- ✅ Linha 1546: `const token = crypto.randomBytes(32).toString('hex');`
- ✅ Nenhum `require('crypto')` encontrado

### Passo 4: Reiniciar o servidor
```bash
npm run dev
```

### Passo 5: Aguardar inicialização completa
Aguarde até ver mensagens como:
- "Server running on port..."
- "Routes registered"

### Passo 6: Testar novamente
Tente enviar um convite novamente.

## Se ainda não funcionar

Execute este comando para verificar se há algum processo ainda rodando:
```powershell
Get-Process -Name "node" | Format-Table Id, ProcessName, StartTime
```

Se houver processos, pare-os:
```powershell
Get-Process -Name "node" | Stop-Process -Force
```

Depois reinicie:
```bash
npm run dev
```

