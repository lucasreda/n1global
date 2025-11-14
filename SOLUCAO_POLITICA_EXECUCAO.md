# 🔧 Solução: Erro de Política de Execução do PowerShell

Se você recebeu o erro:
```
A execução de scripts foi desabilitada neste sistema
```

## ✅ Soluções Rápidas

### Solução 1: Usar Comandos npm (Mais Fácil)

Os comandos npm já contornam a política automaticamente:

```powershell
# Ver logs em tempo real
npm run dev:logs

# Rodar servidor salvando logs
npm run dev:with-logs
```

### Solução 2: Executar com Bypass (Sem Alterar Política)

Execute o script diretamente com bypass de política:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev-logs.ps1
```

### Solução 3: Usar Comandos Diretos (Sem Scripts)

Você pode ver os logs sem usar scripts:

```powershell
# Ver logs em tempo real
Get-Content -Path $env:TEMP\n1global-server.log -Wait -Tail 50

# Ver últimas 100 linhas
Get-Content -Path $env:TEMP\n1global-server.log -Tail 100

# Filtrar apenas erros
Get-Content -Path $env:TEMP\n1global-server.log -Wait | Select-String -Pattern "error|Error|ERROR|❌"
```

### Solução 4: Alterar Política Temporariamente (Apenas Esta Sessão)

Altere a política apenas para o processo atual (não afeta outros):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\scripts\dev-logs.ps1
```

### Solução 5: Alterar Política Permanentemente (Requer Admin)

⚠️ **Atenção**: Requer executar PowerShell como Administrador

```powershell
# Abrir PowerShell como Administrador e executar:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Isso permite executar scripts locais sem problemas.

---

## 📋 Verificar Política Atual

Para ver qual é a política atual:

```powershell
Get-ExecutionPolicy
```

Valores possíveis:
- `Restricted` - Nenhum script pode executar (padrão no Windows)
- `RemoteSigned` - Scripts locais podem executar, remotos precisam assinatura
- `Unrestricted` - Todos os scripts podem executar (não recomendado)

---

## 💡 Recomendação

**Use sempre os comandos npm** (`npm run dev:logs`), pois eles já contornam a política automaticamente e são mais seguros.










