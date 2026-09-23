---
name: validar
description: Use when the user types "validar", "validado", "validar build", "checar build", "roda o validate" or asks to confirm the Central de Conhecimento compiles before commit or deploy. Runs scripts/validate.ps1 (git status + dotnet build + ng build) and reports pass/fail.
---

# Validar (gate de build)

Confere se o código **compila** antes de commitar ou de rodar o deploy.
Não sobe servidor, não publica no IIS — só prova se backend e frontend buildam.

## Quando usar

- Depois de terminar uma correção/feature, **antes** do commit.
- Depois do commit, **antes** do “deploy limpo”.
- Sempre que o usuário digitar **“validar”** ou **“validado”**.

## Comando

Na **raiz do monorepo**:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

Opções (uso raro):

| Parâmetro | Efeito |
|---|---|
| `-PularGit` | não checa `git status` |
| `-PularFrontend` | não roda `ng build` |
| `-PularBackend` | não roda `dotnet build` |

## O que ele faz

1. **Git** — mostra branch/commit e avisa se há alterações não commitadas (não bloqueia).
2. **Backend** — `dotnet build` em `backend/Central_BackEnd`.
3. **Frontend** — `npx ng build` em `frontend/`.

## Resultado

| Saída | Código | Significado |
|---|---|---|
| `VALIDATE: OK` (verde) | **0** | pode commitar / seguir para deploy |
| `VALIDATE: FALHOU` (vermelho) | **1** | **não** commitar nem deployar — corrigir e rodar de novo |

## Fluxo completo (dia a dia)

```
subir interno  →  validar  →  git add/commit/push  →  validar  →  deploy limpo
   (testa)        (builda)      (grava no Git)        (confere)    (sobe IIS)
```

**Regra de ouro:** nunca “deploy limpo” sem `validar` verde no commit atual.
