# Central de Operação JCA — Visão Geral do Projeto

> Documento de contexto para quem vai criar ou alterar telas. Fatos verificados no
> código em 2026-09. Índice de todos os docs: [`INDEX.md`](./INDEX.md). Regras de negócio: [`NEGOCIO.md`](./NEGOCIO.md).
> Detalhes por tela: [`TELAS.md`](./TELAS.md). QA: [`HISTORIAS-TELAS.md`](./HISTORIAS-TELAS.md).
> Guia técnico: [`DOCUMENTACAO-COMPLETA.md`](./DOCUMENTACAO-COMPLETA.md) (+ [`implantacao.md`](./implantacao.md),
> [`frontend-modulos.md`](./frontend-modulos.md), [`integracoes-bd.md`](./integracoes-bd.md)). Deploy: [`DEPLOY.md`](./DEPLOY.md).

## 1. O que é

Workspace operacional interno da JCA Soluções (não só wiki): o usuário entra para
**resolver** (atendimento), **executar** (ferramentas, implantação) e **aprender**
(conhecimento). Critério de toda decisão: *"isso faz o usuário voltar amanhã?"*.

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Angular 18 standalone + SSR/prerender (`frontend/`) |
| UI | Bootstrap 5.3 parcial + `bootstrap-icons` (`bi-*`) + ng-bootstrap + CDK + Chart.js |
| Backend | ASP.NET Core 8 Web API (`backend/Central_BackEnd`), EF Core (InMemory em dev, SQL Server em prod) |
| Auth | JWT (`cc_refresh` HttpOnly) + Google Sheets (acervo de empresas) + AnythingLLM via `POST /api/rag-proxy/chat` |
| Pastas | `frontend/` · `backend/` · `docs/` · `scripts/` (monorepo único, branches `master`/`developer`) |

## 3. Navegação (sidebar — seções em `header-nav.config.ts`)

Início (Visão Geral `/` + Agenda) · SUPORTE (Resolver `/trilhas/resolver`,
Fraseologias, Modelo de chamados, SQL, Rede, Infra) ·
Implantação (Visão geral, Projetos, Kanban, Tarefas) · Ferramentas
(Banco de Dados, Acessos, Central de Utilidades) · Conhecimento (Cursos, FAQ, Stack) ·
JCA (Empresa, Onboarding, Políticas, Procedimentos `/visao-adm`, Kanban ADM
`hasRole('F')` → `/implantacao/kanban?perfil=F`) · Administração
(shell `/admin`; rota `/admin/dashboard` sem ativação no menu).
Módulo Gestor e Central Executiva **removidos** em 24/09/2026 (`e87d763`);
página `/chat` e link `/suporte` também removidos.
JOTA é widget global (`<app-jota-widget>` no `MainLayout`), não item de menu.

## 4. Auth e permissões (`core/`)

- `PerfilUsuario`: `Usuario | Editor | Administrador | Suporte | F`.
- `authGuard`: qualquer autenticado (com refresh silencioso). `adminGuard`: **só
  `Administrador`** (perfil `F` é barrado aqui, embora `hasRole()` o trate como
  super-usuário — links admin na sidebar usam `ehAdministrador()` estrito).
- Pós-login: sem deep-link → `/` (Home); deep-link (`returnUrl`) sempre respeitado.
- `/administrativo` permanece desativada (rota comentada); Kanban ADM via `?perfil=F`.
  Módulo Gestor e `features/executivo/` foram **removidos** do repo (24/09/2026).

## 5. De onde vêm os dados

**Reais (HTTP → `environment.apiBaseUrl`):** Implantação (projetos/tarefas/kanban/
dashboard/cadastros), Agenda, Acessos, Database Explorer, Admin (facade
`forkJoin`, zero endpoint novo), JOTA via proxy. **Estáticos (`*.data.ts` + HTML):**
ferramentas, cursos, trilhas, SQL, fraseologia, FAQ, stack, política, onboarding,
procedimentos/Visão ADM. **Local (`localStorage`, por usuário):** recentes
(`cc.recentes.v1`), favoritos/contador da Visão ADM, tema, colunas do kanban.
**Não existe:** métricas globais de acesso, busca server-side, sessões persistentes
de chat, execução de SQL no Query Builder (só gerar/copiar), IA no Query Builder —
nunca simular; usar empty-state honesto.

## 6. Design System (`frontend/src/styles.scss`, `:root` + `[data-theme="dark"]`)

- Cores: `--primary-color:#0f4c81` · `--secondary-color:#57a0d3` · `--accent-color:#fdd36a` ·
  fundo `#eef3fb` · superfície `#fff` · texto `#202a3c` · borda `#d8e3f5`.
- Fontes: `Space Grotesk` (display) + `Inter` (corpo) + `IBM Plex Mono` (meta).
- Classes: `adm-page` + `adm-header__title/desc`, `adm-stats > adm-stat`,
  `adm-card (+__icone/__title/__desc/__meta)`, `adm-grid`, `adm-table-wrap`,
  `eyebrow`, `adm-btn/adm-badge/adm-pill`, `bi-*` para ícones, Chart.js para gráficos.
- Não criar novo DS: reutilizar tokens/classes; CSS escopado por componente;
  `min-width:0` + `ellipsis`/`overflow-wrap` em flex; respeitar `reduced-motion`.

## 7. Backend (resumo)

`Auth` (`/auth/login|refresh|logout|me`), `Agenda` (`/agenda/eventos|tipos|funcoes|
operadores`), `Acessos` (+ auditoria de visualização), `Implantacao/*` (projetos,
tarefas, dashboard, admin-dashboard só `Role Administrador`, etapas, tipos-projeto,
colunas-kanban), `Database/*` (só leitura + query-builder/compare-schemas; 19
endpoints desde 24/09/2026), `RagProxy` (`POST /chat`
— único endpoint; sem `/sessions`).

## 8. Checklist — nova tela

1. Rota em `features.routes.ts` (ou módulo `.routes.ts`) + guard (`authGuard`, `adminGuard` se admin).
2. Link na sidebar (seção correta) + label em `BREADCRUMB_LABELS` / `BREADCRUMB_PATTERNS` (`breadcrumb.component.ts`).
3. Componente standalone + service dedicado (reutilizar existentes antes de criar).
4. Dados reais ou empty-state honesto — nunca mockar comportamento.
5. Registrar em `TELAS.md` (§ nova ou existente) + história em `HISTORIAS-TELAS.md`
   (delegar ao agente `docs-writer`; `TELAS.md` diz "gerado automaticamente").
6. Validar: `npx tsc -p tsconfig.app.json --noEmit` + `npm run build` (45 rotas
   prerender; ruído de prerender sem token é pré-existente e inofensivo).

## 9. Ambientes

- Local: backend `http://localhost:1009` (InMemory, seed `admin/admin123`) +
  frontend `http://localhost:4200` (`npm start`).
- Produção: frontend `http://192.168.2.130:1010` · swagger `:1009` — deploy via
  `scripts/deploy/deploy.ps1` (ver `DEPLOY.md`; `appsettings*.json` preservados).
