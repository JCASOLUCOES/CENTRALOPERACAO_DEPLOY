# Arquitetura Multi-Webapp — Central de Operação JCA

> **Status:** plano aprovado (24/09/2026). Ainda **não implementado** — este arquivo é a fonte única do desenho da migração 1 → 4 webapps.
> Decisões do time registradas na §2. Workflow de branches e deploy vigente: [`10-DEPLOY.md`](./10-DEPLOY.md).

---

## 1. Contexto e objetivo

**Hoje:** um único Angular 18 (standalone + SSR/prerender) compilado, entrada única `main.ts` + `app.routes.ts`. Os módulos ativos compartilham o mesmo bundle, o mesmo deploy e a mesma UI; a Central Executiva mencionada no plano está removida e seria apenas uma etapa futura a reavaliar.

**Objetivo:** dividir o frontend em **4 webapps independentes**, cada uma consumindo o mesmo backend (`api/v1/*`):

| Webapp | Porta (prod IIS) | Domínio |
|---|---|---|
| `suporte` | 1011 | Trilhas, Ferramentas, Fraseologia, Acessos, FAQ, Database, Cursos… |
| `implantacao` | 1012 | Kanban, Projetos, Tarefas, Agenda, Dashboard |
| `adm-interna` | 1013 | Admin, Financeiro, Comercial (futuros) |
| `executivo` | 1014 | CEO/CTO/COO, painéis, alertas |

- **Backend permanece único:** `backend/Central_BackEnd` → `:1009` (sem mudança de DB).
- Porta `:1010` (site atual `Suporte_Front`) passa a hospedar a webapp **suporte** durante a transição, ou é migrada para `:1011` — definir na Fase 4.

---

## 2. Decisões aprovadas

| Tema | Decisão |
|---|---|
| Gerenciador de monorepo | **Angular multi-project** (`angular.json` com 4 apps + libs) — **sem NX** |
| Exposição IIS | **4 portas 1011–1014** (4 origins; exige CORS novo no backend) |
| SSR / prerender | **Removido** — build browser puro (hoje `server.mjs` nem é publicado no IIS) |
| Ordem das apps | **Suporte → Implantação → Adm → Executivo** |
| i18n / design / versionamento | **Tudo igual hoje**: sem i18n próprio, Bootstrap 5.3 + ng-bootstrap padrão, tags `vX.Y.Z` únicas do monorepo |
| Entrega desta rodada | **Só o plano em `docs/`** — implementação em sprint futura |

---

## 3. Estrutura alvo (Angular multi-project)

```
frontend/
├── angular.json                    # 4 projects application + 6 libs
├── tsconfig.base.json              # paths @co/*
│
├── apps/
│   ├── suporte/                    # :1011
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.routes.ts
│   │       ├── app.component.ts
│   │       ├── environments/
│   │       └── pages/…             # features movidas do monólito
│   ├── implantacao/                # :1012
│   ├── adm-interna/                # :1013
│   └── executivo/                  # :1014
│
├── libs/
│   ├── shared/src/                 # layout-shell, page-header, header/sidebar, pipes, styles
│   ├── auth/src/                   # auth.service, guards, auth.interceptor
│   ├── api/src/                    # http-client.service + services de domínio
│   ├── models/src/                 # usuario, agenda, tarefa, projeto…
│   ├── ui-kit/src/                 # design-tokens.scss, componentes base
│   └── utils/src/                  # validators, formatters
│
├── src/…                           # monólito atual — removido na Fase 5
└── public/web.config               # SPA rewrite (1 por app, copiado no build)
```

**Paths** (`tsconfig.base.json`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@co/auth": ["libs/auth/src/index.ts"],
      "@co/shared": ["libs/shared/src/index.ts"],
      "@co/models": ["libs/models/src/index.ts"],
      "@co/api": ["libs/api/src/index.ts"],
      "@co/ui-kit": ["libs/ui-kit/src/index.ts"],
      "@co/utils": ["libs/utils/src/index.ts"]
    }
  }
}
```

Aliases atuais do monólito (`@core/*`, `@layout/*`, `@shared/*`, `@features/*`, `@env/*`) são **remapeados** para os `@co/*` durante a Fase 1.

---

## 4. Achados do código que condicionam a migração

Levantamento READ-ONLY em 24/09/2026. Estes acoplamentos **precisam sair do caminho** antes (Fase 0) ou durante a separação:

| # | Arquivo | Problema |
|---|---|---|
| 1 | `frontend/src/app/features/admin/admin.routes.ts` | Importa **eager** `implantacao/pages/{kanban,tarefas,projetos}` — quebra fronteira admin↔implantação |
| 2 | `frontend/src/app/core/services/busca-index.service.ts` | Importa `.data` de 6 features (ferramentas, cursos, sql, procedimentos, utilidades, política, onboarding) — global search acopla core a tudo |
| 3 | `frontend/src/app/shared/components/usuario-dropdown` e `chamado-dropdown` | Importam `@features/implantacao/services/tarefas.service` — inversão shared→feature |
| 4 | `frontend/src/app/layout/main-layout` | Importa `features/chat/jota-widget` — layout acoplado ao widget |
| 5 | `frontend/src/app/shared/config/header-nav.config.ts` | Nav/sidebar com itens de **todos** os domínios num único arquivo |
| 6 | Services com `../../../../environments/environment` (6+ arquivos) | Relativos profundos; alias `@env/*` existe mas quase não é usado |
| 7 | `backend/Central_BackEnd/Program.cs` (CORS, ~L188–200) | Policy `Angular` com **3 origins hardcoded** + `AllowCredentials` — 1011–1014 precisarão entrar |
| 8 | `backend/.../Controllers/AuthController.cs` | Cookie `cc_refresh`: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure=false` — ok entre portas do **mesmo host** (same-site) |
| 9 | `scripts/smoke.ps1` / `scripts/deploy/deploy.ps1` | Fixos em `:1010` e 1 destino `Suporte_Front`; BUILD_INFO único |
| 10 | `frontend/prerender-routes.txt` + `server.ts` | SSR/prerender com ~40 rotas globais — **cortados** na migração |

---

## 5. Fases de implementação

### Fase 0 — Pré-migração no monólito (branch `developer`, baixo risco)

Entrega valor mesmo que a migração pare. Validate verde antes de seguir.

- [ ] `admin.routes.ts` → lazy load dos componentes de implantação (eliminar import eager).
- [ ] `usuario-dropdown` / `chamado-dropdown` → desacoplar de `tarefas.service` (interface injetada, token ou evento).
- [ ] `busca-index.service.ts` → registro de fontes por feature (plugin), sem import fixo de `.data`.
- [ ] `header-nav.config.ts` → exportar seções por domínio (`suporte`, `implantacao`, `admin`) para cada app montar sua sidebar.
- [ ] `main-layout` → `jota-widget` carregado via token/lazy (opcional por app).
- [ ] Padronizar `@env/*` (eliminar relativos `../../../../environments`).
- [ ] `scripts/` — nenhum change ainda (Fase 4).

### Fase 1 — Estrutura base (Sprint 2)

- [ ] `angular.json`: 4 projects `application` (standalone, SCSS, sem SSR) + libs `shared`, `auth`, `api`, `models`, `ui-kit`, `utils`.
- [ ] `tsconfig.base.json` com paths `@co/*`.
- [ ] Mover **código real** (não o draft simplificado):
  - `libs/auth`: `auth.service` (single-flight + `authInitialized$` + refresh 5 min), `token-storage` (access em memória / refresh no cookie), `auth.interceptor` (Bearer + `withCredentials` + retry 401), `auth.guard`, `admin.guard`.
  - `libs/api`: `HttpClientService` (`withCredentials` global).
  - `libs/models`: `usuario`, `auth.model`, modelos de domínio usados por >1 app.
  - `libs/shared`: `layout-shell` (header + sidebar + breadcrumb + `router-outlet`), `page-header`, nav via input/token.
  - `libs/ui-kit`: `design-tokens.scss` (cores/fontes atuais de `styles.scss`).
- [ ] `environments` por app (`apiBaseUrl`, `appName`); prod `http://192.168.2.130:1009/api/v1`.
- [ ] Login copiado/apontado para `libs/auth` (tela pode ficar em cada app ou em shared).
- [ ] Checklist: `ng build` das 4 apps vazias + teste unitário de auth.

### Fase 2 — Webapp `suporte` :1011 (Sprint 3–4) — prova de fogo

Rotas a mover para `apps/suporte`:

```
'' (home), /trilhas/{resolver,sql,rede,infra}, /ferramentas(/detalhe/:id),
/ferramentas/acessos, /ferramentas/faq, /fraseologia, /modelo-chamados,
/cursos(/detalhe/:id), /stack, /conhecimento, /politica,
/empresa/onboarding, /database/*, /chat ou Jota (opcional), /login
```

- [ ] Mover `features/` correspondentes para `apps/suporte/src/pages/…`.
- [ ] Sidebar/header só com seções de suporte.
- [ ] Validar: login → refresh cross-porta (`:1011` → `:1009`), guards, global search só com fontes de suporte.
- [ ] Bundle: initial só da app suporte + libs.

### Fase 3 — Demais webapps (Sprint 5–6)

| App | Porta | Rotas |
|---|---|---|
| `implantacao` | 1012 | `/implantacao/*` (dashboard, kanban, projetos, tarefas), `/agenda`, redirects internos |
| `adm-interna` | 1013 | `/admin/*` (cadastros, visao-adm) — layout admin existente |
| `executivo` | 1014 | shell + login + `/painel` vazio (conteúdo depois de requisito) |

- [ ] Repetir padrão da Fase 2 por app (rotas locais, nav, services de API).
- [ ] Testar navegação/links entre apps (redirects por URL cheia `http://…:1012/…`).

### Fase 4 — Backend, IIS e deploy (Sprint 7)

**Backend (mudança mínima):**

- [ ] CORS em `Program.cs`: adicionar origens `http://192.168.2.130:1011…1014` e `http://localhost:1011…1014` (ouOrigins via `appsettings`), mantendo `AllowCredentials`.
- [ ] Cookie `cc_refresh`: manter `SameSite=Strict` (portas ≠ host diferente); validar login em 2 portas em paralelo.

**IIS (192.168.2.130):**

```
Site Central de Operação
├── :1011 → Suporte_Front_Suporte      (ou reaproveitar Suporte_Front)
├── :1012 → Suporte_Front_Implantacao
├── :1013 → Suporte_Front_Adm
└── :1014 → Suporte_Front_Exec
Site Central Backend :1009 → Suporte_Back (inalterado)
```

- [ ] `web.config` por app (SPA rewrite → `index.html`, escape `/api/`) — clone do `frontend/public/web.config`.
- [ ] URL Rewrite instalado no servidor (já usado hoje).

**Scripts:**

- [ ] `deploy.ps1`: parâmetro `-App suporte|implantacao|adm-interna|executivo|all`; BUILDInfo por app; backup por pasta; matar `dotnet`/`node` mantido.
- [ ] `validate.ps1`: build backend + apps afetadas (gate final: todas).
- [ ] `smoke.ps1`: checar `:1011`, `:1012`, `:1013`, `:1014` + `:1009/swagger` (generalizar `-Servidor` + lista de portas).
- [ ] Homolog `192.168.2.154` → produção `192.168.2.130`.

### Fase 5 — Documentação e cleanup (Sprint 8)

- [ ] Este arquivo (já criado).
- [ ] `docs/GUIA-DESENVOLVIMENTO.md` — como criar feature compartilhada vs. feature de app.
- [ ] `docs/GUIA-DEPLOY-IIS.md` — 4 apps, ports, web.config, rollback por app.
- [ ] `docs/TROUBLESHOOTING.md` — CORS, cookie cross-porta, bundle, build.
- [ ] Atualizar [`10-DEPLOY.md`](./10-DEPLOY.md), [`02-ARQUITETURA.md`](./02-ARQUITETURA.md), [`01-VISAO-GERAL.md`](./01-VISAO-GERAL.md), os [READMEs do monorepo](../README.md) e o pipeline em [`AGENTS.md`](../AGENTS.md) para quatro apps.
- [ ] Remover monólito (`src/` antigo, SSR, `prerender-routes.txt`) **após** smoke das 4 apps em produção.
- [ ] Tag `vX.Y.Z` em `master` após merge.

---

## 6. Compartilhamento de código — regras

- **Nunca duplicar service/model** entre apps → `libs/api` / `libs/models`.
- **shared → feature é proibido** (hoje existe; corrigir na Fase 0).
- **admin → implantacao eager é proibido** (lazy ou duplicated shell).
- Componentes usados por ≥2 apps → `libs/shared` ou `libs/ui-kit`.
- Design system único: tokens em `libs/ui-kit/src/design-tokens.scss` (cores/fontes atuais).
- Services de domínio só-1-app podem viver dentro da app; promover a lib quando a 2ª app precisar.

---

## 7. Auth entre webapps

Fluxo real do monólito (replicar em cada app):

1. Login `POST /api/v1/auth/login` (`withCredentials: true`).
2. **Access token só em memória** (`token-storage.service`) — some no F5.
3. **Refresh em cookie HttpOnly `cc_refresh`** (backend define; JS nunca lê).
4. `authInterceptor`: anexa `Bearer` (exceto `/auth/`), `withCredentials` sempre; em **401** faz refresh **single-flight** e repete a request.
5. `auth.guard`: espera `authInitialized$`, tenta refresh, senão `/login?returnUrl=`.
6. A sessão é repopulada em memória pela resposta de `/auth/refresh`; não há restauração do usuário por `localStorage`.

Como as apps são **mesmo host, portas diferentes** → same-site; `SameSite=Strict` segue válido. Cada app tem seu `localStorage` por origin (usuário loga por app ou o fluxo de refresh é compartilhado por cookie — validar na Fase 2 se o login em :1011 concede sessão válida em :1012 sem novo login; se não, manter login por app).

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| CORS/cookie cross-porta quebrar login | Validar cedo (Fase 2) 2 portas em paralelo; origins via config |
| Global search acoplar apps | Fase 0 plugin obrigatória antes de separar |
| `deploy.ps1`/`smoke.ps1` acoplados a `:1010` | Generalizar na Fase 4 antes do 1º deploy multi-app |
| Escopo do executivo indefinido | App nasce shell; sem painéis sem requisito |
| WIP alheio no working tree | Branch `feat/multi-webapp`; nunca stagear arquivos alheios (ver `AGENTS.md`) |
| Regressão no monólito durante Fase 0 | Cada item da Fase 0 em commit pequeno + `validate.ps1` |

---

## 9. Timeline (1 dev, sem NX)

| Sprint | Fase | Saída |
|---|---|---|
| 1 | Fase 0 | Monólito desacoplado, validate verde |
| 2 | Fase 1 | 4 apps vazias + libs buildando |
| 3–4 | Fase 2 | `suporte` em `:1011` com login real |
| 5–6 | Fase 3 | 4 apps com rotas próprias |
| 7 | Fase 4 | IIS 4 portas + deploy/smoke multi-app |
| 8 | Fase 5 | Docs + cleanup + tag `vX.Y.Z` |

**Total: ~8 sprints (2 meses)** — referencia; reavaliar após Fase 2.

---

## 10. Arquivos de apoio (gerar na Fase 5)

1. `docs/ARQUITETURA-MULTI-WEBAPP.md` — **este arquivo** (design geral)
2. `docs/GUIA-DESENVOLVIMENTO.md` — nova feature compartilhada vs. app
3. `docs/GUIA-DEPLOY-IIS.md` — passo a passo 4 apps
4. `docs/TROUBLESHOOTING.md` — problemas e soluções
5. Atualizar [`docs/README.md`](./README.md) e [`AGENTS.md`](../AGENTS.md) no merge da Fase 5
