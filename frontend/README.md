# Frontend — Central de Operação (Angular 18 SSR)

Interface do portal interno **Central de Operação** da JCA Soluções.

---

## 🚀 Quick Start

```bash
cd frontend
npm install
npm start
# ou: ng serve -o
```

- **Porta padrão:** `http://localhost:4200`
- **Proxy Dev:** `/api` → `http://localhost:1009/api` (config em `proxy.conf.json`)
- **Build Produção:** `npm run build` (gera `dist/frontend/browser` para IIS)
- **Fluxo pós-código:** skill `validar` (`scripts/validate.ps1` → `ng build`) → commit → skill `deploy limpo`

---

## 🏗️ Estrutura de Pastas

```
frontend/src/app/
├── core/                     # Serviços singleton, guards, interceptors
│   ├── services/
│   │   ├── auth.service.ts       # JWT, refresh token, sessão
│   │   ├── token-storage.service.ts  # Memória only (accessToken + user)
│   │   ├── busca.service.ts      # Estado busca global (BehaviorSubject + abrirBusca()/fecharBusca())
│   │   ├── busca-index.service.ts  # Índice local (ferramentas, cursos, trilhas, SQL, procedimentos, utilidades, política, onboarding, páginas; multi-termo sem acento, sem backend)
│   │   ├── recentes.service.ts     # Histórico real (localStorage cc.recentes.v1, NavigationEnd; recentes()/maisUtilizados(), sem mock)
│   │   └── ...
│   ├── guards/
│   │   ├── auth.guard.ts         # Protege rotas + refresh silencioso
│   │   └── admin.guard.ts        # Só `Administrador` (não-admin → `/`; sem sessão → `/login?returnUrl=`)
│   └── interceptors/
│       └── auth.interceptor.ts   # Bearer token + withCredentials: true
├── layout/                   # Shell principal
│   ├── header/               # Nav (Início/Fraseologias/Ferramentas/Acessos/Cursos), breadcrumb (/agenda, /chat, /implantacao/*, /admin/*, /gestor/entrada), busca local (BuscaIndexService), dropdown usuário
│   ├── sidebar/              # Seções de links diretos em `header-nav.config.ts` (sem /executivo, sem /administrativo)
│   ├── main-layout/          # Layout com <router-outlet> + <app-jota-widget> (FAB + painel, proxy real)
│   └── footer/               # Versão (app-version.ts)
├── features/                 # Módulos lazy-loaded (inclui `executivo/` — rota desativada em features.routes.ts)
│   ├── agenda/               # Calendário MVP
│   │   ├── agenda.component.ts
│   │   ├── agenda-evento-modal.component.ts
│   │   └── services/agenda.service.ts  # DTOs/interfaces + moverEvento (models/agenda.model.ts removido — era duplicata)
│   ├── auth/                 # Login (+ `resolverDestino()`: admin sem deep-link → `/gestor/entrada`)
│   ├── executivo/            # Central Executiva — rota COMENTADA (código permanece; sem acesso via URL)
│   │   ├── executivo.routes.ts       # `''` → redirect `dashboard`
│   │   ├── models/executivo.model.ts # KPIs, módulos, equipe, alertas, `ResumoExecutivo`
│   │   ├── data/modulos.registry.ts  # Implantação (real) + Financeiro (placeholder → /visao-adm)
│   │   ├── services/executivo-dashboard.service.ts  # Facade `forkJoin` 5 fontes (zero endpoint novo no backend)
│   │   └── pages/executivo-dashboard/  # Component + template + styles
│   ├── gestor/               # Módulo Gestor (`/gestor/entrada` — home pós-login admin, painéis CEO/CTO/COO)
│   ├── wiki/                 # Ferramentas, Acessos, Cursos, Trilhas, Stack, Fraseologia, Modelo Chamados, Política, Visão ADM
│   ├── implantacao/          # Dashboard, Kanban, Projetos, Tarefas, Cadastros (módulo Equipes removido em 2026-09-12)
│   ├── database/             # Database Explorer (7 abas)
│   ├── empresa/              # Onboarding
│   └── visao-adm/            # Visão ADM (procedimentos + utilidades)
├── shared/                   # Utilitários, componentes comuns
│   ├── meta/app-version.ts   # Fonte única de versão (v0.7.0)
│   └── utils/texto.helper.ts # Busca normalizada
├── styles.scss               # Bootstrap SCSS parcial + tema escuro [data-theme="dark"]
└── app.routes.ts             # Rotas raiz + redirect / → /home
```

---

## 🔐 Autenticação (Frontend)

| Conceito | Implementação |
|----------|---------------|
| **Access Token** | Memória apenas (`TokenStorageService`) — **nunca** `localStorage` |
| **Refresh Token** | Cookie HttpOnly `cc_refresh` (backend) — 4h com "Lembrar acesso" |
| **Refresh Silencioso** | `auth.guard` tenta refresh no reload (F5) → repopula `user` via `restaurarSessao()` |
| **Verificação Periódica** | A cada 5 min: valida token + antecipa refresh; expiração → logout + mensagem "Sua sessão expirou" |
| **Destino pós-login** | `resolverDestino()` (`login.component.ts`): admin com `returnUrl` genérico (`/` ou vazio) → `/gestor/entrada`; deep-link respeitado; comum → `/` |
| **Logout** | `POST /api/v1/auth/logout` (revoga refresh) + `Router.navigate(['/login'])` |

---

## 🎨 Design System

- **Bootstrap 5** + **ng-bootstrap 17** + **Bootstrap Icons**
- **SCSS Parcial:** Importa apenas módulos necessários (`modal`, `dropdown`, `navbar`, `transitions`, `tooltip`, `forms`, `grid`, `utilities`)
- **Tema Escuro:** Atributo `[data-theme="dark"]` no `<body>`
- **Tipografia:** Space Grotesk (display), Inter (body), IBM Plex Mono (dados/código)
- **BEM CSS:** Classes `.bloco__elemento--modificador`
- **Bundle Inicial:** ~669 kB (lazy loading completo reduziu de 1,51 MB)

---

## 📦 Módulos (Features) — Lazy Loading

| Rota | Módulo | Componente Principal | Descrição |
|------|--------|---------------------|-----------|
| `/` → `/home` | Home | `HomeComponent` | Saudação com nome, busca `Ctrl+K` (`BuscaService.abrirBusca()`), 6 acessos rápidos, Continue/Mais utilizados (`RecentesService`, partem vazios) + agenda real 7 dias (usuário comum cai aqui após login) |
| `/gestor/entrada` | **Módulo Gestor** (admin, pós-login) | painéis CEO/CTO/COO | Home dos gestores — ver `docs/telas/07-gestao.md`; admin sem deep-link cai aqui após login |
| ~~`/executivo/dashboard`~~ | **Central Executiva — DESATIVADA** (rota comentada) | `ExecutivoDashboardComponent` | Código em `features/executivo/` sem rota ativa; não acessível via URL |
| `/agenda` | **Agenda (MVP)** | `AgendaComponent` | **Calendário Dia/Semana/Mês, CRUD eventos, tipos, participantes, filtros responsável/função, escopo Meus/Geral, drag-drop mover** |
| `/ferramentas` | Ferramentas | `FerramentasComponent` | Cards + busca |
| `/ferramentas/acessos` | Acessos | `AcessosComponent` | Empresas Google Sheets + modal senha + credenciais |
| `/cursos` | Cursos | `CursosComponent` | Catálogo por plataforma/trilha + player YouTube |
| `/trilhas/*` | Trilhas | `TrilhasComponent` + SQL/Rede/Infra | "Como resolver" + redesign `.tdh` (filtro de seções, 3 exemplos rápidos, CTA JOTA → `/chat`) |
| `/chat` | Chat/JOTA | `JotaWidgetComponent` (flutuante no `MainLayout`) + página `/chat` (`RagChatWidgetComponent`) | FAB + painel em todas as telas, proxy real `POST /api/rag-proxy/chat`, erro honesto sem mock |
| `/stack` | Stack | `StackComponent` | Stack tecnológica |
| `/fraseologia` | Fraseologia | `FraseologiaComponent` | Fluxo atendimento + copy |
| `/modelo-chamados` | Modelo Chamados | `ModeloChamadosComponent` | Templates atendimento |
| `/politica` | Política | `PoliticaComponent` | Política interna |
| `/visao-adm` | Visão ADM | `VisaoAdmComponent` | Procedimentos + Central Utilidades |
| `/implantacao/*` | Implantação | Dashboard, Kanban, Projetos, Tarefas, Cadastros | Gerenciador projetos/tarefas (Kanban drag-drop com deep-link `?projetoId=`; módulo Equipes removido em 2026-09-12). **Evolução Tarefas v0.8.x**: responsáveis N:N (`IMPL_TarefaResponsavel`), chamados vinculados (`IMPL_TarefaChamado` ↔ `tbchamado`), apontamentos de horas (`IMPL_TarefaApontamento`, `HorasRealizadas` derivado), tipo Feature/Bug (`TRF_TipoTarefa`), data de entrega (`TRF_DataEntrega`). Ver [DOCUMENTACAO-COMPLETA.md](./docs/DOCUMENTACAO-COMPLETA.md#65-módulo-implantação--projetos-v110). |
| `/database/*` | Database | Shell + 7 abas | SQL Server Actyon explorer (consultas: editor SQL + Criador de Consultas em 7 etapas) |
| `/empresa/onboarding/*` | Onboarding | Home + Capítulos | Onboarding empresa |

---

## 🆕 Módulo Agenda (MVP) — Detalhamento

### Rotas
- `/agenda` → `AgendaComponent` (lazy loaded em `features.routes.ts:36-37`)

### Componentes
| Componente | Arquivo | Responsabilidade |
|------------|---------|------------------|
| `AgendaComponent` | `features/agenda/agenda.component.ts` | Shell: grid temporal, navegação, filtros, abre modais |
| `AgendaEventoModalComponent` | `features/agenda/agenda-evento-modal.component.ts` | Create/Edit modal (lazy loaded via dynamic import) |

### Services
| Service | Arquivo | Métodos Principais |
|---------|---------|-------------------|
| `AgendaService` | `features/agenda/services/agenda.service.ts` | `listarEventos`, `obterEvento`, `criarEvento`, `atualizarEvento`, `excluirEvento`, `moverEvento`, `listarTipos`, `listarOperadores`, `listarFuncoes` |

### Models (TypeScript)
Tipos definidos em `features/agenda/services/agenda.service.ts` (o arquivo `models/agenda.model.ts` foi removido — era duplicata):
- `AgendaResumo`, `AgendaDetalhe`
- `AgendaCriarRequest`, `AgendaAtualizarRequest`, `AgendaMoverRequest`, `AgendaFiltro` (`inicio`, `fim`, `responsavelId?`, `funcaoId?`)
- `TipoEventoResponse`, `OperadorResumo`, `FuncaoResumo` (`{ id, descricao, classificacao }`), `AgendaParticipanteResponse`
- Enums: `AgendaTipo`, `AgendaVisibilidade`, `AgendaRecorrencia`

O mesmo `agenda.service.ts` exporta ainda `ErroConflito` (`{ mensagem, conflitos: AgendaResumo[], code }` — corpo do HTTP 409 de sobreposição de horários).

### API Consumida (`/api/v1/agenda`)
| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N` | Carrega grid da visão atual (filtros opcionais: responsável e/ou função) |
| GET | `/eventos/{id}` | Detalhe ao editar |
| POST | `/eventos` | Salvar novo (409 exibe `alert-warning` com eventos em conflito) |
| PUT | `/eventos/{id}` | Salvar edição (409 exibe `alert-warning` com eventos em conflito) |
| DELETE | `/eventos/{id}` | Excluir |
| PATCH | `/eventos/{id}/mover` | Drag-drop mover (backend também valida conflito e pode retornar 409) |
| GET | `/tipos` | Dropdown tipos |
| GET | `/operadores` | Dropdown responsável/participantes |
| GET | `/funcoes` | Dropdown função (`FuncaoResumo[]` — só ativas com operadores ativos) |

### Funcionalidades Implementadas
- ✅ 3 Visões: **Dia** (slots 24h), **Semana** (7 colunas), **Mês** (grade calendário) + visão **Operacional 48h** (janela deslizante `agora → +48h`, botão outline `48h` com `title="Janela operacional de 48 horas"`)
- ✅ Header em 3 zonas (só frontend, sem mudança de API): esquerda (título + button-group `< Hoje >` + intervalo clicável `DD/MM/YYYY – DD/MM/YYYY` com popup `ngb-datepicker` via `NgbDatepickerModule`); centro (pill toggle Meus/Geral + selects inline Responsável/Função); direita (segmented Dia/Semana/Mês + botão outline `48h` + CTA primário `Novo evento`)
- ✅ Navegação: Anterior/Próximo/Hoje + intervalo clicável com datepicker popup (`mostrarDatePicker` signal, `dataPickerModel` computed `NgbDateStruct`, `alternarDatePicker()`/`aoSelecionarData()` → `intervaloDatas()`)
- ✅ Filtro por responsável (dropdown operadores ativos) + filtro por função (dropdown funções ativas) + escopo Meus/Geral (pill toggle; Meus = operador logado via `AuthService.getOperadorLogado()`; `limparFiltros()` reseta tudo)
- ✅ Legenda de categorias como tags neutras (pill branca) com status dot colorido via variável `--dot-color` (`[style.--dot-color]="t.cor"`)
- ✅ Acessibilidade do header: `aria-pressed` booleano nos toggles, `role="group"` nos 3 grupos (navegação/escopo/visão), botão de intervalo com `aria-haspopup="dialog"` + `aria-expanded`, popup com `role="dialog"`
- ✅ Eventos dia inteiro (render topo do dia)
- ✅ Cores: prioridade `evento.cor` → `tipoCor` → fallback `#0f4c81`
- ✅ Modal create/edit com validação cliente (título, datas, tipo, responsável obrigatórios)
- ✅ Validação de conflito de horários (Fase 1): backend retorna 409 `{ mensagem, conflitos, code: "CONFLICT_HORARIOS" }` em criar/editar/mover; modal trata via signal `conflitos` + `extrairConflitos()`/`tratarErroSalvar()` e lista os eventos em choque em `alert-warning`
- ✅ Drag-drop mover → `PATCH /mover` (nova data início/fim)
- ✅ Lazy loading do modal (code splitting)
- ✅ Limpeza overlay residual no `ngOnDestroy` (`.modal-backdrop`, `modal-open`)
- ✅ Estado vazio sem overlay: barra inline `.agenda-empty-inline` (`role="status"`) entre legenda e grade quando `!carregando() && eventos().length === 0`; grade sempre renderizada mesmo com `[]`; só `.agenda-loading` é overlay (não bloqueia cliques)
- ✅ **Autorização Owner + Admin (Owner = `OperadorId === JWT sub`; Admin = `perfil = "Administrador"`):**
  - `AgendaComponent`: sinal `isAdmin` (computed → `auth.getCurrentUser()?.perfil === 'Administrador'`); método `podeEditar(e: AgendaResumo)` → `e.operadorId === usuarioLogado || isAdmin()`; `abrirEdicao()` passa `isAdmin` e `somenteLeitura = !podeEditar(evento)` para modal
  - Cards de evento (Dia/Semana/Operacional/Mês): `[class.agenda-evento--somente-leitura]="!podeEditar(e)"` + `(click)="podeEditar(e) && abrirEdicao(e)"` com tooltip "Apenas o responsável ou um administrador pode editar este evento"
  - Estilo `.agenda-evento--somente-leitura`: `cursor: not-allowed`, `opacity: 0.75`, `filter: grayscale(0.4)`, sem hover transform
  - `AgendaEventoModalComponent`: `@Input() isAdmin`, `@Input() somenteLeitura`; `salvar()`/`excluir()` early return se `somenteLeitura`; banner "Somente leitura: apenas o responsável X ou um administrador pode editar este evento"; inputs desabilitados; botões "Salvar"/"Excluir" ocultos; `tratarErroSalvar()` trata 403 → "Sem permissão para alterar este evento"
  - Backend: `PUT`/`DELETE`/`PATCH /mover` retornam **403** `ForbiddenException` se não for dono nem admin; `POST` (criar) permanece permissivo

### Sidebar (`header-nav.config.ts`)
Início (Visão Geral `/` + Agenda), SUPORTE (resolver, fraseologia, modelos, trilhas), Implantação (`/implantacao/dashboard|projetos|kanban|tarefas`), Ferramentas (`/database`, `/ferramentas/acessos`, `/ferramentas`), Conhecimento (`/cursos`, `/ferramentas/faq`, `/stack`), JCA (`/empresa`, `/empresa/onboarding`, `/politica`, `/visao-adm`, Kanban ADM `hasRole('F')` → `/implantacao/kanban?perfil=F`), Administração (`/admin/dashboard` só Administrador). **Sem `/executivo` nem `/administrativo`** (rotas desativadas). Módulo Gestor via dropdown do usuário e pós-login.

---

## 🛠️ Scripts Disponíveis

```bash
npm start          # ng serve (dev, port 4200)
npm run build      # Build produção (SSR) → dist/frontend/browser
npm run watch      # Build watch mode
npm run test       # Jest unit tests
npm run lint       # ESLint + Prettier
```

---

## ⚙️ Variáveis de Ambiente

```typescript
// src/environments/environment.ts (dev)
export const environment = {
  production: false,
  useMockAuth: false,
  apiBaseUrl: 'http://localhost:1009/api'
};

// src/environments/environment.prod.ts (prod)
export const environment = {
  production: true,
  useMockAuth: false,
  apiBaseUrl: 'http://192.168.2.130:1009/api'
};
```

---

## 📚 Documentação Relacionada

- [`docs/INDEX.md`](../docs/INDEX.md) — índice de toda a documentação
- [`docs/telas/05-empresa-agenda.md`](../docs/telas/05-empresa-agenda.md) — tela Agenda + API
- [`docs/telas/07-gestao.md`](../docs/telas/07-gestao.md) — Módulo Gestor + Chat
- [`docs/frontend-modulos.md`](../docs/frontend-modulos.md) — módulos frontend (Agenda, Executiva desativada)
- [`docs/DEPLOY.md`](../docs/DEPLOY.md) — Deploy frontend no IIS (porta 1010)
- [`README.md`](../README.md) — Visão geral do monorepo