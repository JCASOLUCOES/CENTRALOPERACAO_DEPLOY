# AGENTS.md — Central de Operação

## Idioma
- Responder sempre em **português (PT-BR)**, salvo pedido explícito do usuário por outro idioma.

## Prioridades
1. Complete a tarefa solicitada.
2. Cuide da integridade do código.
3. **Atualize a documentação automaticamente** (§ Documentação).
4. Mantenha o contexto leve.

## Repositório Único
Este é um **monorepo** com código frontend e backend na mesma repo (sem submódulos).

| Subprojeto | Stack | Pasta | Branch padrão | Branch de dev |
|---|---|---|---|---|
| Frontend | Angular 18 (standalone + SSR) | `frontend/` | `master` | `developer` |
| Backend | ASP.NET Core 8 (Web API) | `backend/` | `master` | `developer` |
| Docs | Documentação unificada | `docs/` | `master` | `developer` |
| Scripts | Deploy, extração, utilitários | `scripts/` | `master` | `developer` |

**Branches de backup manuais** (quando existirem): `backup-master-pre-agenda-rollback`, `backup-developer-pre-monorepo` — não usar no dia a dia.
**Tags** substituem "branch backup" — cada release vira `vX.Y.Z` imutável.
Branches pessoais/obsoletas (`sara`, `samuel`, `projeto-implantacao`) foram **removidas** do fluxo.

Detalhes em `README.md` (raiz) e `docs/DEPLOY.md` § 7.

## § Pipeline Dev/Deploy (fluxo obrigatório)

Fluxo do dia a dia ao **concluir uma tarefa**:

```
1. subir interno   → testa no navegador (dev, SEM build; banquinho homolog ou InMemory)
2. validar         → scripts/validate.ps1 (dotnet build + ng build) — SE VERMELHO, PARA
3. git add/commit/push  → grava no Git (branch developer)
4. validar         → confere o commit
5. deploy limpo    → empacota (BUILD_INFO) → publica no IIS (hash confere) → smoke
```

**Regra de ouro:** nunca `deploy limpo` sem `validar` verde no commit atual.

| Etapa | Comando / skill |
|---|---|
| Dev local | skill `subir interno` |
| Gate de build | `powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1` (ou skill `validar`) |
| Empacotar | `deploy.ps1 -BuildFrontend 1 -BuildBackend 1 -Publicar 0` |
| Publicar | `deploy.ps1 -BuildFrontend 0 -BuildBackend 0 -Publicar 1 -Backup 1` |
| Smoke | `powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1` (ou skill `deploy limpo` completa) |

- `scripts/deploy/deploy.ps1` grava `deploy/BUILD_INFO.txt` (hash/branch); na publicação sem rebuild, **aborta** se o hash divergir do HEAD.
- Banco local: `appsettings.Development.json` → `Database:UseSqlServer` (`true` = homolog `192.168.2.154` / `dbBUSINESS_HML`; `false` = InMemory).

## Regras de comunidade
- Não pergunte o que já foi definido/respondido; verifique e siga.
- Não pergunte se a mudança gera conflito com o código; verifique sozinho.
- **Antes de criar uma branch nova**, confirme se já existe no GitHub (não duplique).
- **Antes de taggear**, confirme que a versão está mergeada em `master` nos repositórios.

## § Documentação (prioridade 3 — atualização AUTOMÁTICA)
Ao **concluir** alterações relevantes, atualize a documentação **automaticamente, sem aguardar pedido do usuário**:

- **Alterações de código** (Angular em `frontend/src/app/features`, backend em `backend/src/Central_BackEnd`, skills, agentes, scripts de deploy):
  delegue **automaticamente** ao agente `docs-writer` (tool `task`) para revisar e atualizar:
  - `frontend/README.md`
  - `docs/*.md` (`DOCUMENTACAO-COMPLETA.md`, `DEPLOY.md`, `backend-auth-integracao.md`, **`TELAS.md` + `docs/telas/`**)
  - `docs/TELAS.md` ← **Índice; conteúdo por tela em `docs/telas/` (auto-sync via extract-screens.ts + GitHub Action)**
  - `backend/README.md`
  - `README.md` da raiz do monorepo
- **Alterações de conteúdo do wiki** (`*.data.ts`):
  delegue **automaticamente** ao agente `content-editor` (tool `task`).
- **Novos componentes/services/routers** (`frontend/src/app/features/**/*.component.ts`, `*.service.ts`, `*.routes.ts`):
  delegue **automaticamente** ao agente `docs-writer` para atualizar o arquivo do módulo em `docs/telas/` (tabela em `docs/TELAS.md`) com a nova tela/documentação.
- **Novos controllers/endpoints/models** (`backend/src/Central_BackEnd/Controllers/**/*.cs`, `Models/**/*.cs`, `Migrations/**/*.cs`):
  delegue **automaticamente** ao agente `docs-writer` para atualizar `docs/telas/06-backend.md` (seções 17/18).
- **Novos scripts de pipeline** (`scripts/validate.ps1`, `scripts/smoke.ps1`, mudanças em `scripts/deploy/deploy.ps1`):
  delegue **automaticamente** ao agente `docs-writer` para refletir em `docs/DEPLOY.md` e skills (`validar`, `deploy-limpo`).
- **Alterações no fluxo de branches / deploy / versionamento**:
  atualizar `README.md` da raiz, `frontend/README.md`,
  `backend/README.md`, `docs/DEPLOY.md` § 7, `docs/DOCUMENTACAO-COMPLETA.md`
  § Política de branches e tags — **e** a § Pipeline Dev/Deploy deste `AGENTS.md`.
- **Regras da delegação automática:**
  - Não pergunte se deve atualizar a documentação — faça.
  - Não invente fatos: o agente confirma no código antes de documentar.
  - Mesmo que o usuário não peça, execute a delegação ao final da tarefa.
  - `docs/TELAS.md` (+ `docs/telas/`) é **fonte única** de documentação de telas/APIs — deve estar sempre sincronizado com o código.
  - Regras do fatiamento: um assunto, um arquivo; nova tela entra na seção do arquivo do módulo (+ linha no índice se for módulo novo); teto de ~600 linhas por arquivo (subdividir e atualizar o índice ao estourar); **atualizar ≠ engordar** (trocar o trecho obsoleto, não anexar); ao linkar, apontar para o **arquivo**, nunca para âncora profunda.
  - Workflow `.github/workflows/docs-sync.yml` valida `scripts/screens-data.json` em PRs para `developer` (a sincronização do texto é feita pelo `docs-writer` no chat).

## Convenção de commits
- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `docs:` — apenas documentação
- `chore:` — manutenção (deps, config, etc.)
- `refactor:` — refatoração sem mudança de comportamento

## Observação
- Configuração/instruções (AGENTS.md, agentes, skills) valem em novas sessões; após modificá-las, informe o usuário para reiniciar o opencode.
