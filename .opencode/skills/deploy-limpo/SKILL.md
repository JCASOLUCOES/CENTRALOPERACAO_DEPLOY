---
name: deploy-limpo
description: Use when the user types "deploy limpo", "deploy", "gerar deploy", "publicar o sistema" or asks to build and package the Central de Conhecimento frontend+backend for IIS. Runs the 4-stage pipeline: validate.ps1 -> deploy.ps1 build+package (BUILD_INFO) -> deploy.ps1 publish reusing package -> smoke.ps1.
---

# Deploy limpo (Central de Conhecimento)

Pipeline de 4 estágios: **congelar → validar → empacotar → publicar → smoke**.
Objetivo: só publicar no IIS o que **passou no validate** e está **identificado** no `BUILD_INFO.txt` (hash do Git).

## Pré-requisitos

- Código **commitado** (preferencialmente push em `developer`).
- `validate` verde no commit atual.
- Node/npm + SDK .NET 8.

## Pipeline (ordem fixa)

### 1. Git — congelar

```powershell
git status          # deve estar limpo (ou consciente do que está sujo)
git rev-parse HEAD  # anote o hash
```

### 2. Validar (build gate)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

- Saída **0** / `VALIDATE: OK` → segue.
- Saída **1** → **para aqui**. Corrige, commita, valida de novo.

### 3. Empacotar (NÃO sobe no IIS)

```powershell
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend 1 -BuildBackend 1 -Publicar 0"
```

- Gera `deploy/backend/` e `deploy/frontend/`.
- Grava `deploy/BUILD_INFO.txt` com `GitCommit`, branch, data, usuário.

### 4. Publicar o pacote validado (sem rebuild)

```powershell
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend 0 -BuildBackend 0 -Publicar 1 -Backup 1"
```

- **Não** builda de novo — publica o pacote da etapa 3.
- Confere se `BUILD_INFO.GitCommit` == `git rev-parse HEAD`; se divergir, **aborta**.
- Backup automático do IIS atual antes do replace.
- Preserva `appsettings*.json` do servidor.

### 5. Smoke

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -Servidor 192.168.2.130
```

- Espera frontend `:1010` + swagger `:1009/swagger` responderem.

## Atalho (tudo junto, só quando você tiver certeza)

Se preferir uma tacada só (build + publica + backup), **ainda** rode o validate antes:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
if ($LASTEXITCODE -eq 0) {
  powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend 1 -BuildBackend 1 -Publicar 1 -Backup 1"
  powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1
}
```

## Parâmetros do `deploy.ps1`

| Parâmetro | Default | Descrição |
|---|---|---|
| `-Publicar` | `$true` | `0` = só empacota em `deploy/` |
| `-BuildFrontend` / `-BuildBackend` | pergunta | `1`/`0` (bool via `-Command` usa `1`/`0` ou `` `$true ``) |
| `-Backup` | `$false` | `1` = backup do IIS antes de publicar |
| `-ServidorRemoto` | `192.168.2.130` | IIS |
| `-TimingLevel` | `0` | `1` = imprime tempos por fase |

> Via `powershell -Command`, prefira `-BuildFrontend 1` (aceito como bool) ou `` -BuildFrontend `$true ``.
> Nunca use `-BuildFrontend $true` sem escape — chega como string e o bind falha.

## Erros e rollback

| Situação | O que fazer |
|---|---|
| Validate vermelho | Corrigir código; **não** rodar deploy |
| `BUILD_INFO diverge do HEAD` | Houve commit depois do build → rode etapa 3 de novo |
| Smoke falhou logo após deploy | Aguardar 30–60s (IIS) e repetir smoke |
| Sistema ruim no ar | Restaurar backup em `\\192.168.2.130\c$\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>` copiando `backend`/`frontend` de volta (**sem** sobrescrever `appsettings*.json`) |
| Robocopy código 11 (lock DLL) | `app_offline.htm` fica; aguardar 1–2 min e repetir só o mirror do backend |

## Observações

- Build SSR: avisos de budget/SCSS são esperados.
- `deploy/` é regenerado pelo script — não edite à mão (o `BUILD_INFO.txt` é gerado).
- Senha do IIS embutida no script (decisão do projeto — risco aceito).
- **Skills amigas:** `validar` (gate), `subir-interno` (dev local), `smoke` via `scripts/smoke.ps1`.
