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
- **Backend Dev:** URL absoluta `http://localhost:1009/api/v1`; não há `proxy.conf.json`
- **Build Produção:** `npm run build` (gera `dist/central-conhecimento-actyon`; o deploy publica `browser/`)
- **Fluxo pós-código:** skill `validar` (`scripts/validate.ps1` → `ng build`) → commit → skill `deploy limpo`

---

## 🏗️ Estrutura de Pastas

```
frontend/src/app/
├── core/                     # Serviços singleton, guards, interceptors
│   ├── services/
│   │   ├── auth.service.ts       # JWT, refresh token, sessão
│   │   ├── token-storage.service.ts  # Memória only (accessToken + user)
│   │   ├── busca.service.ts      # Sessão { aberta, origem: header|home|null, consulta }; uma origem/painel; buscaAberta$ compatível
│   │   ├── busca-index.service.ts  # Índice local síncrono (ferramentas, cursos, trilhas, SQL, procedimentos, utilidades, política, onboarding, páginas; multi-termo sem acento, sem backend; limite padrão 8)
│   │   ├── recentes.service.ts     # Histórico real (localStorage cc.recentes.v1, NavigationEnd; recentes()/maisUtilizados(), sem mock)
│   │   └── ...
│   ├── guards/
│   │   ├── auth.guard.ts         # Protege rotas + refresh silencioso
│   │   └── admin.guard.ts        # Só `Administrador` (não-admin → `/`; sem sessão → `/login?returnUrl=`)
│   └── interceptors/
│       └── auth.interceptor.ts   # Bearer token + withCredentials: true
├── layout/                   # Shell principal
│   ├── header/               # Nav (Início/Fraseologias/Ferramentas/Acessos/Cursos), breadcrumb (/agenda, /implantacao/*, /admin/*), <app-global-search> (Ctrl/Cmd+K), dropdown usuário
│   ├── sidebar/              # Seções de links diretos em `header-nav.config.ts` (sem /executivo, sem /administrativo)
│   ├── main-layout/          # Layout com <router-outlet> + <app-jota-widget> (URL relativa; exige reverse proxy e pode usar fallback)
│   └── footer/               # Versão (app-version.ts)
├── features/                 # Módulos lazy-loaded (Gestor/executivo removidos em 24/09/2026)
│   ├── agenda/               # Calendário MVP
│   │   ├── agenda.component.ts
│   │   ├── agenda-evento-modal.component.ts
│   │   └── services/agenda.service.ts  # DTOs/interfaces + moverEvento (models/agenda.model.ts removido — era duplicata)
│   ├── auth/                 # Login (+ `resolverDestino()`: sem deep-link → `/`)
│   ├── conhecimento/         # Conteúdo de conhecimento e áreas relacionadas
│   ├── implantacao/          # Dashboard, Kanban, Projetos e Tarefas (módulo Equipes removido em 2026-09-12)
│   ├── database/             # Database Explorer (6 abas)
│   ├── empresa/              # Onboarding
│   └── visao-adm/            # Visão ADM (procedimentos + utilidades)
├── shared/                   # Utilitários, componentes comuns
│   ├── components/
│   │   └── global-search/    # Busca standalone reutilizada pelo Header e Home; teclado + combobox/listbox acessível
│   ├── meta/app-version.ts   # Fonte única de versão (v0.7.0)
│   └── utils/texto.helper.ts # Busca normalizada
├── styles.scss               # Bootstrap SCSS parcial + tema escuro [data-theme="dark"]
└── app.routes.ts             # Rotas raiz; `/` carrega Home diretamente
```

---

## 🔐 Autenticação (Frontend)

| Conceito | Implementação |
|----------|---------------|
| **Access Token** | Memória apenas (`TokenStorageService`) — **nunca** `localStorage` |
| **Refresh Token** | Cookie HttpOnly `cc_refresh` (backend) — validade de 4h por token, renovada pelo frontend a cada 5min de uso; sessão inativa expira em aproximadamente 4h |
| **Refresh Silencioso** | `auth.guard` tenta refresh no reload (F5) → repopula `user` via `restaurarSessao()` |
| **Verificação Periódica** | A cada 5 min: valida token + antecipa refresh; expiração → logout + mensagem "Sua sessão expirou" |
| **Destino pós-login** | `resolverDestino()` (`login.component.ts`): deep-link respeitado; senão → `/` (Home, qualquer perfil) |
| **Logout** | Tenta `POST /api/v1/auth/logout` e limpa o estado local; o interceptor não envia Bearer em `/auth/*`, então o endpoint pode retornar 401 e a revogação do refresh no servidor não é garantida |

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
| `/` | Home | `HomeComponent` | Saudação com nome, input local **"Buscar na Central..."** via `GlobalSearchComponent` (painel próprio, consulta compartilhada e no máximo 8 resultados), 6 acessos rápidos, Continue/Mais utilizados (`RecentesService`, partem vazios) + agenda real 7 dias (usuário comum cai aqui após login) |
| ~~`/gestor/entrada`~~ | **Módulo Gestor — REMOVIDO** (24/09/2026) | — | Código em `features/gestor/` excluído; login sem deep-link → `/` |
| ~~`/executivo/dashboard`~~ | **Central Executiva — REMOVIDA** (24/09/2026) | — | Código em `features/executivo/` excluído; sem rota |
| `/agenda` | **Agenda (MVP)** | `AgendaComponent` | **Calendário Dia/Semana/Mês, CRUD eventos, tipos, participantes, filtros responsável/função, escopo Meus/Geral, drag-drop mover** |
| `/ferramentas` | Ferramentas | `FerramentasComponent` | Cards + busca |
| `/ferramentas/acessos` | Acessos | `AcessosComponent` | Empresas Google Sheets + modal senha + credenciais |
| `/cursos` | Cursos | `CursosComponent` | Catálogo por plataforma/trilha + player YouTube |
| `/trilhas/*` | Trilhas | `TrilhasComponent` + SQL/Rede/Infra | "Como resolver" + redesign `.tdh` (filtro de seções, 3 exemplos rápidos; CTA `/chat` removido) |
| ~~`/chat`~~ | Chat/JOTA | `JotaWidgetComponent` (flutuante no `MainLayout`) | Página `/chat` removida; FAB + painel chamam `POST /api/rag-proxy/chat` por URL relativa, exigem reverse proxy/ARR e podem receber fallback simulado |
| `/stack` | Stack | `StackComponent` | Stack tecnológica |
| `/fraseologia` | Fraseologia | `FraseologiaComponent` | Fluxo atendimento + copy |
| `/modelo-chamados` | Modelo Chamados | `ModeloChamadosComponent` | Templates atendimento |
| `/politica` | Política | `PoliticaComponent` | Política interna |
| `/visao-adm` | Visão ADM | `VisaoAdmComponent` | Procedimentos + Central Utilidades |
| `/implantacao/*` | Implantação | Dashboard, Kanban, Projetos, Tarefas | Projetos usam nove cards fixos; tarefas vinculada a `ProjetoEtapaId`. Cadastros de Etapas Globais não pertencem a este módulo. Ver [`docs/06-COMPONENTES-FRONTEND.md`](../docs/06-COMPONENTES-FRONTEND.md). |
| `/database/*` | Database | Shell + 6 abas | SQL Server Actyon explorer (consultas: editor SQL + Criador de Consultas em 7 etapas) |
| `/empresa/onboarding/*` | Onboarding | Home + Capítulos | Onboarding empresa |

---

## Integração Projetos / Etapas — estado atual

- `ProjetosService` acompanha os **16 endpoints atuais** de `ProjetosController`. Não há mais wrappers para `GET /projetos/{id}/jornada`, `POST /projetos/{id}/etapas/inicializar` ou `PATCH /projetos/{id}/status`. O contrato backend `ProjetoAtualizarRequest.Status` permanece no `PUT /projetos/{id}`; o formulário atual não expõe um controle de status.
- A criação de projeto chama a inicialização automática dos nove cards em `tbprojetoetapa`. Os lookups válidos são `GET /implantacao/projetos/etapas-padrao` e `GET /implantacao/projetos/{id}/etapas`.
- **Etapas Globais foram removidas do frontend:** saíram as rotas `/admin/cadastros/etapas*`, `EtapasComponent`, `EtapaFormComponent` e seus SCSS, `EtapasService`/tipos de `/implantacao/etapas`, o wrapper morto `TarefasService.listarEtapas()` e o breadcrumb específico. Antes da remoção, GET/POST no ambiente publicado retornavam 404 e a tela mascarava a falha como estado vazio.
- A API global não deve ser recriada. A validação registrada foi 19/19 testes, typechecks e build frontend, com gate backend/frontend verde.

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
- ✅ Navegação: Anterior/Próximo/Hoje + intervalo clicável com datepicker popup (`mostrarDatePicker` signal, `datePickerModel` computed `NgbDateStruct`, `alternarDatePicker()`/`aoSelecionarData()` → `intervaloDatas()`)
- ✅ Filtro por responsável (dropdown operadores ativos) + filtro por função (dropdown funções ativas) + escopo Meus/Geral (pill Meus = operador logado via `AuthService.getOperadorLogado()`; `limparFiltros()` reseta tudo)
- ✅ Legenda de categorias como tags neutras (pill branca) com status dot colorido via variável `--dot-color` (`[style.--dot-color]="t.cor"`)
- ✅ Acessibilidade do header: `aria-pressed` booleano nos toggles, `role="group"` nos 3 grupos (navegação/escopo/visão), botão de intervalo com `aria-haspopup="dialog"` + `aria-expanded`, popup com `role="dialog"`
- ✅ Eventos dia inteiro (render topo do dia)
- ✅ Cores: prioridade `evento.cor` → `tipoCor` → fallback `#0f4c81`
- ✅ Modal create/edit com validação cliente (título, datas, tipo, responsável obrigatórios)
- ✅ Validação de conflito de horários (Fase 1): backend retorna 409 `{ mensagem, conflitos, code: "CONFLICT_HORARIOS" }` em criar/editar/mover; modal trata via signal `conflitos` + `extrairConflitos()`/`tratarErroSalvar()` e lista os eventos em choque em `alert-warning`
- ✅ Drag-drop mover → `PATCH /mover` (nova data início/fim)
- ✅ Lazy loading do modal (code splitting)
- ✅ Limpeza overlay residual no `ngOnDestroy` (`.modal-backdrop`, `modal-open`)
- ✅ Estado vazio sem overlay: barra inline `.agenda-empty-inline` (`role="status"`) entre legenda e grade quando `!carregando() && eventos().length === 0`; grade sempre renderizada mesmo com `[]`; só `agenda-loading` é overlay (não bloqueia cliques)
- ✅ **Autorização Owner + Admin (Owner = `OperadorId === JWT sub`; Admin = `perfil = "Administrador"`):**
  - `AgendaComponent`: sinal `isAdmin` (computed → `auth.getCurrentUser()?.perfil === 'Administrador'`); método `podeEditar(e: AgendaResumo)` → `e.operadorId === usuarioLogado || isAdmin()`; `abrirEdicao()` passa `isAdmin` e `somenteLeitura = !podeEditar(evento)` para modal
  - Cards de evento (Dia/Semana/Operacional/Mês): `[class.agenda-evento--somente-leitura]="!podeEditar(e)"` com `(click)="podeEditar(e) && abrirEdicao(e)"` e tooltip "Apenas o responsável ou um administrador pode editar este evento"
  - Estilo `.agenda-evento--somente-leitura`: `cursor: not-allowed`, `opacity: 0.75`, `filter: grayscale(0.4)`, sem hover transform
  - `AgendaEventoModalComponent`: `@Input() isAdmin`, `@Input() somenteLeitura`; `salvar()`/`excluir()` early return se `somenteLeitura`; banner "Somente leitura: apenas o responsável X ou um administrador pode editar este evento"; inputs desabilitados; botões "Salvar"/"Excluir" ocultos; `tratarErroSalvar()` trata 403 → "Sem permissão para alterar este evento"
  - Backend: `PUT`/`DELETE`/`PATCH /mover` retornam **403** `ForbiddenException` se não for dono nem admin; `POST` (criar) permanece permissivo

### Navegação e Administração

A sidebar apresenta Início (Visão Geral `/` + Agenda), SUPORTE (resolver, fraseologia, modelos, trilhas), Implantação (`/implantacao/dashboard|projetos|kanban|tarefas`), Ferramentas (`/database`, `/ferramentas/acessos`, `/ferramentas`), Conhecimento (`/cursos`, `/ferramentas/faq`, `/stack`) e JCA (`/empresa`, `/empresa/onboarding`, `/politica`, `/visao-adm`, Kanban ADM `hasRole('F')` → `/implantacao/kanban?perfil=F`).

A Administração não possui item próprio na sidebar; a área é acessível pela rota protegida `/admin` (somente Administrador), que redireciona para `/admin/cadastros`. O caminho legado `/admin/dashboard` está órfão: o componente existe, mas não está registrado em `admin.routes.ts`. **Sem `/executivo`, `/administrativo` nem Módulo Gestor** (removidos/desativados em 24/09/2026).

---

## 🛠️ Scripts Disponíveis

```bash
npm start          # ng serve (dev, port 4200)
npm run build      # Build produção (SSR) → dist/central-conhecimento-actyon
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
  apiBaseUrl: 'http://localhost:1009/api/v1'
};

// src/environments/environment.prod.ts (prod)
export const environment = {
  production: true,
  useMockAuth: false,
  apiBaseUrl: 'http://192.168.2.130:1009/api/v1'
};
```

---

## 📚 Documentação Relacionada

- [`docs/README.md`](../docs/README.md) — entrada da documentação canônica
- [`docs/02-ARQUITETURA.md`](../docs/02-ARQUITETURA.md) — arquitetura do monorepo e fluxos técnicos
- [`docs/05-ENDPOINTS.md`](../docs/05-ENDPOINTS.md) — APIs consumidas pelo frontend
- [`docs/06-COMPONENTES-FRONTEND.md`](../docs/06-COMPONENTES-FRONTEND.md) — componentes, rotas, serviços e layout
- [`docs/07-SERVICES-BACKEND.md`](../docs/07-SERVICES-BACKEND.md) — serviços que suportam as telas
- [`docs/08-HISTORIAS-TELAS.md`](../docs/08-HISTORIAS-TELAS.md) — histórias e cenários de QA
- [`docs/09-TROUBLESHOOTING.md`](../docs/09-TROUBLESHOOTING.md) — diagnóstico de frontend, integrações e IIS
- [`docs/10-DEPLOY.md`](../docs/10-DEPLOY.md) — publicação do frontend no IIS
- [`README.md`](../README.md) — visão geral do monorepo
