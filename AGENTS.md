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
| Frontend | Angular 18 (standalone + SSR) | `frontend/` | `main` | `developer` |
| Backend | ASP.NET Core 8 (Web API) | `backend/` | `main` | `developer` |
| Docs | Documentação unificada | `docs/` | `main` | `developer` |
| Scripts | Deploy, extração, utilitários | `scripts/` | `main` | `developer` |

**Branches pessoais** (criadas a partir de `developer`): `sara`, `samuel`.
**Branch futura**: `projeto-implantacao`.
**Tags** substituem "branch backup" — cada release vira `vX.Y.Z` imutável.

Detalhes em `README.md` (raiz) e `docs/DEPLOY.md` § 7.

## Regras de comunidade
- Não pergunte o que já foi definido/respondido; verifique e siga.
- Não pergunte se a mudança gera conflito com o código; verifique sozinho.
- **Antes de criar uma branch nova**, confirme se já existe no GitHub (não duplique).
- **Antes de taggear**, confirme que a versão está mergeada em `main` nos repositórios.

## § Documentação (prioridade 3 — atualização AUTOMÁTICA)
Ao **concluir** alterações relevantes, atualize a documentação **automaticamente, sem aguardar pedido do usuário**:

- **Alterações de código** (Angular em `frontend/src/app/features`, backend em `backend/src/Central_BackEnd`, skills, agentes, scripts de deploy):
  delegue **automaticamente** ao agente `docs-writer` (tool `task`) para revisar e atualizar:
  - `frontend/README.md`
  - `docs/*.md` (`DOCUMENTACAO-COMPLETA.md`, `DEPLOY.md`, `backend-auth-integracao.md`, **`TELAS.md`**)
  - `docs/TELAS.md` ← **Documentação por tela (auto-sync via extract-screens.ts + GitHub Action)**
  - `backend/README.md`
  - `README.md` da raiz do monorepo
- **Alterações de conteúdo do wiki** (`*.data.ts`):
  delegue **automaticamente** ao agente `content-editor` (tool `task`).
- **Novos componentes/services/routers** (`frontend/src/app/features/**/*.component.ts`, `*.service.ts`, `*.routes.ts`):
  delegue **automaticamente** ao agente `docs-writer` para atualizar `docs/TELAS.md` com a nova tela/documentação.
- **Novos controllers/endpoints/models** (`backend/src/Central_BackEnd/Controllers/**/*.cs`, `Models/**/*.cs`, `Migrations/**/*.cs`):
  delegue **automaticamente** ao agente `docs-writer` para atualizar seção 17/18 de `docs/TELAS.md`.
- **Alterações no fluxo de branches / deploy / versionamento**:
  atualizar `README.md` da raiz, `frontend/README.md`,
  `backend/README.md`, `docs/DEPLOY.md` § 7, `docs/DOCUMENTACAO-COMPLETA.md`
  § Política de branches e tags.
- **Regras da delegação automática:**
  - Não pergunte se deve atualizar a documentação — faça.
  - Não invente fatos: o agente confirma no código antes de documentar.
  - Mesmo que o usuário não peça, execute a delegação ao final da tarefa.
  - `docs/TELAS.md` é **fonte única** de documentação de telas/APIs — deve estar sempre sincronizado com o código.
  - Workflow `.github/workflows/docs-sync.yml` executa `extract-screens.ts` + `docs-writer` em PRs para `developer`.

## Convenção de commits
- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `docs:` — apenas documentação
- `chore:` — manutenção (deps, config, etc.)
- `refactor:` — refatoração sem mudança de comportamento

## Observação
- Configuração/instruções (AGENTS.md, agentes, skills) valem em novas sessões; após modificá-las, informe o usuário para reiniciar o opencode.
