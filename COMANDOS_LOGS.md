# Como executar os logs em tempo real

## Problema com política de execução do PowerShell

Se você receber o erro:
```
npm : O arquivo C:\Program Files\nodejs\npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada
```

## Soluções

### Solução 1: Executar diretamente via CMD (Recomendado)

Abra o **CMD** (Prompt de Comando) em vez do PowerShell e execute:

```cmd
scripts\dev-logs.bat
```

Ou navegue até a pasta do projeto e execute:
```cmd
cd C:\Users\Matheus\Documents\n1global
scripts\dev-logs.bat
```

### Solução 2: Alterar a política de execução do PowerShell (Requer Admin)

Abra o PowerShell **como Administrador** e execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Depois disso, você poderá executar normalmente:
```bash
npm run dev:logs
```

### Solução 3: Usar cmd para executar npm

No CMD (não PowerShell), execute:

```cmd
cmd /c npm run dev:logs
```

### Solução 4: Executar o script PowerShell diretamente

No CMD, execute:

```cmd
powershell.exe -ExecutionPolicy Bypass -File scripts\dev-logs.ps1
```

## Qual usar?

- **Use a Solução 1** se quiser algo rápido e não tiver permissões de admin
- **Use a Solução 2** se quiser resolver o problema de forma permanente e tiver permissões de admin
