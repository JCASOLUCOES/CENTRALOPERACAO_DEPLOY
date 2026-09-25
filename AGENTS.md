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

Detalhes em `README.md` (raiz) e `docs/10-DEPLOY.md`.

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

- **Entrada e documentos canônicos:** `docs/README.md` + `docs/00-ESTRUTURA.md` a `docs/10-DEPLOY.md`.
- **Alterações de código** (Angular em `frontend/src/app`, backend em `backend/Central_BackEnd`, skills, agentes ou scripts):
  delegue **automaticamente** ao agente `docs-writer` (tool `task`) para revisar os documentos temáticos afetados e, quando necessário, os READMEs da raiz, frontend e backend.
- **Alterações de conteúdo do wiki** (`*.data.ts`):
  delegue **automaticamente** ao agente `content-editor` (tool `task`).
- **Novos componentes/services/routers** (`frontend/src/app/features/**/*.component.ts`, `*.service.ts`, `*.routes.ts`):
  delegue ao `docs-writer` para atualizar `docs/06-COMPONENTES-FRONTEND.md`, os cenários de `docs/08-HISTORIAS-TELAS.md` e a navegação de `docs/01-VISAO-GERAL.md` quando aplicável.
- **Novos controllers/endpoints/models/migrations** (`backend/Central_BackEnd/Controllers/**/*.cs`, `Models/**/*.cs`, `Migrations/**/*.cs`):
  delegue ao `docs-writer` para atualizar `docs/04-ESTRUTURA-DADOS.md`, `docs/05-ENDPOINTS.md`, `docs/07-SERVICES-BACKEND.md` e os cenários de `docs/08-HISTORIAS-TELAS.md` quando houver impacto funcional.
- **Novos scripts de pipeline** (`scripts/validate.ps1`, `scripts/smoke.ps1`, mudanças em `scripts/deploy/deploy.ps1`):
  delegue ao `docs-writer` para refletir em `docs/09-TROUBLESHOOTING.md` e `docs/10-DEPLOY.md`; o agente principal atualiza as skills `validar` e `deploy-limpo`.
- **Alterações no fluxo de branches / deploy / versionamento**:
  delegue READMEs e `docs/00-ESTRUTURA.md`/`docs/10-DEPLOY.md` ao `docs-writer`; o agente principal atualiza a § Pipeline Dev/Deploy deste `AGENTS.md`.
- **Regras da delegação automática:**
  - Não pergunte se deve atualizar a documentação — faça.
  - Não invente fatos: o agente confirma no código antes de documentar.
  - Mesmo que o usuário não peça, execute a delegação ao final da tarefa.
  - `docs/README.md` é a entrada única; os 11 arquivos numerados de `00` a `10` são canônicos e devem permanecer sincronizados com o código.
  - `docs/backup/` é histórico não canônico: nunca editar, tratar como fonte atual ou usar o `docs-writer` para corrigi-lo.
  - Um assunto, um arquivo; **atualizar ≠ engardar**: substituir trechos obsoletos, preservar índices e links somente para arquivos, nunca para âncoras profundas.
  - Os tamanhos são estimativas: priorizar completude e tabelas compactas; se um canônico crescer excessivamente, propor subdivisão sem mudar a entrada única sem aprovação explícita.
  - Workflow `.github/workflows/docs-sync.yml` valida somente o inventário auxiliar `scripts/screens-data.json`; o texto canônico é revisado pelo `docs-writer` no chat.

## Convenção de commits
- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `docs:` — apenas documentação
- `chore:` — manutenção (deps, config, etc.)
- `refactor:` — refatoração sem mudança de comportamento

## Observação
- Configuração/instruções (AGENTS.md, agentes, skills) valem em novas sessões; após modificá-las, informe o usuário para reiniciar o opencode.
