# AGENTS.md — Central de Operação

## Idioma
- Responder sempre em **português (PT-BR)**, salvo pedido explícito do usuário por outro idioma.

## Prioridades
1. Complete a tarefa solicitada.
2. Cuide da integridade do código.
3. **Atualize a documentação automaticamente** (§ Documentação).
4. Mantenha o contexto leve.

## Repositórios e branches
O projeto vive em **3 repositórios git** que compartilham a mesma convenção:

| Repo | URL | Branch padrão | Branch de dev | Tags |
|---|---|---|---|---|
| Monorepo (raiz) | `JCASOLUCOES/CENTRALOPERACAO_DEPLOY` | `main` (= `master`) | `developer` | `v0.7.0`, ... |
| Frontend | `JCASOLUCOES/Central-Conhecimento` | `main` | `developer` | `v0.7.0`, ... |
| Backend | `JCASOLUCOES/CCBAckend` | `main` | `developer` | `v0.7.0`, ... |

**Branches pessoais** (criadas a partir de `developer`): `sara`, `samuel`.
**Branch futura**: `projeto-implantacao`.
**Tags** substituem "branch backup" — cada release vira `vX.Y.Z` imutável.

Detalhes em `README.md` (raiz) e `frontend/docs/DEPLOY.md` § 7.

## Regras de comunidade
- Não pergunte o que já foi definido/respondido; verifique e siga.
- Não pergunte se a mudança gera conflito com o código; verifique sozinho.
- **Antes de criar uma branch nova**, confirme se já existe no GitHub (não duplique).
- **Antes de taggear**, confirme que a versão está mergeada em `main` nos 3 repos.

## § Documentação (prioridade 3 — atualização AUTOMÁTICA)
Ao **concluir** alterações relevantes, atualize a documentação **automaticamente, sem aguardar pedido do usuário**:

- **Alterações de código** (Angular em `frontend/src`, backend em `backend/Central_BackEnd`, skills, agentes, scripts de deploy):
  delegue **automaticamente** ao agente `docs-writer` (tool `task`) para revisar e atualizar:
  - `frontend/README.md`
  - `frontend/docs/*.md` (`DOCUMENTACAO-COMPLETA.md`, `deploy-*`, etc.)
  - `backend/README.md`
  - `README.md` da raiz do monorepo
- **Alterações de conteúdo do wiki** (`*.data.ts`):
  delegue **automaticamente** ao agente `content-editor` (tool `task`).
- **Alterações no fluxo de branches / deploy / versionamento**:
  atualizar `README.md` da raiz, `frontend/README.md`,
  `backend/README.md`, `DEPLOY.md` § 7, `DOCUMENTACAO-COMPLETA.md`
  § Política de branches e tags.
- **Regras da delegação automática:**
  - Não pergunte se deve atualizar a documentação — faça.
  - Não invente fatos: o agente confirma no código antes de documentar.
  - Mesmo que o usuário não peça, execute a delegação ao final da tarefa.

## Convenção de commits
- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `docs:` — apenas documentação
- `chore:` — manutenção (deps, config, etc.)
- `refactor:` — refatoração sem mudança de comportamento

## Observação
- Configuração/instruções (AGENTS.md, agentes, skills) valem em novas sessões; após modificá-las, informe o usuário para reiniciar o opencode.