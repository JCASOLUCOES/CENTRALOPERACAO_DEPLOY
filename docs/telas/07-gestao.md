> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 19. Chat Central

### 19.1 `JotaWidgetComponent` (flutuante, em todo o `MainLayout`) + página `/chat`

**Componentes:** `src/app/features/chat/jota-widget/jota-widget.component.ts` (+ `.html`/`.scss`) · página `/chat` em `src/app/features/chat/chat.routes.ts` (`''` → `RagChatWidgetComponent`, `title: 'Chat Central'`, mantida)

### O que faz

JOTA transversal: FAB + painel flutuante disponível em todas as telas do `MainLayout`, com link "Abrir página do JOTA" (`/chat`). Usa o proxy real (`POST /api/rag-proxy/chat` via `JotaChatService.chat()`); sem respostas mockadas — falha exibe erro honesto ("JOTA indisponível no momento..."). Desde 2026-09-18 há contexto por tarefa (Corretor #1): o drawer do Kanban tem "Perguntar ao JOTA sobre esta tarefa", que situa o widget (`ChatContextoService`) com id/título/responsável/prioridade/status/projeto/descrição, exibe o indicador "Falando sobre: T{id}" (dispensável via ✕) e prefixa o prompt (resposta curta, máx. 3 linhas); o histórico por tarefa (últimas 30 mensagens) persiste em `sessionStorage` e é restaurado ao reabrir o contexto.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `JotaChatService` | `chat({ message, workspaceId: 'suporte', mode: 'query', sessionId })` | Chama o proxy real `POST /api/rag-proxy/chat` (`apiUrl = '/api/rag-proxy'`) |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | /api/rag-proxy/chat | RagProxyService.ChatAsync() | Recebe mensagem + workspace, retorna resposta + documentos + tempo |

### Payload de Requisição
| Campo | Tipo | Descrição |
|-------|------|-----------|
| message | string | Pergunta do operador |
| workspaceId | string | ID do workspace AnythingLLM (suporte, financeiro, implantacao, glossario) |
| mode | string | query | chat ou query |
| sessionId | string? | ID de sessão para histórico |

### Resposta da API
| Campo | Tipo | Descrição |
|-------|------|-----------|
| 
esposta | string | Resposta formatada com contexto de banco + glossário |
| documentos | string[] | Lista de documentos consultados |
| 	empoProcessamento | 
umber | Tempo em segundos |
| sessionId | string | ID de sessão persistido em sessionStorage |

### Banco de Dados
- **Conecta:** Sim  — consultas EF Core para contadores (Operadores.Count()) e termos de glossário
- Em modo mock: retorna respostas baseadas em keywords + dados relacionais do banco
- AnythingLLM (motor RAG  — opcional; modo fallback disponível)
- Langfuse (observabilidade  — Fase 4+)
- sessionStorage (persistência de sessão de chat)
### Observações Técnicas
- Componente **standalone** Angular, não requer módulo NgModule
- Componente **standalone** Angular, não requer módulo NgModule
- Rota "/chat"
lazy-loaded
no
features.routes.ts"
- Sem item do JOTA na sidebar (confirmado em `sidebar.component.ts`); acesso via FAB flutuante, página `/chat` e CTA "Pergunte ao JOTA" na trilha Resolver
- Cores seguindo design system: primario #0f4c81, cards #ffffff, sidebar #f8fafc
- Acessibilidade: aria-labels, navegacao teclado, focus visivel
- Sem mock no widget: `catchError(() => of(null))` → `erro.set('JOTA indisponível no momento. Tente de novo ou use a página de atendimento.')`; mensagem inicial fixa de boas-vindas; `sessionId` mantido em memória do componente
- Historial persistido em sessionStorage, sobrevivendo a reload
- Rate limiting no backend (politicas leitura, validacao, login)
- CORS configurado no AnythingLLM para dominio do IIS (http://192.168.2.130:1010)
- Chaves de API nunca expostas no frontend  — tudo via backend proxy


---

## 20. Central Executiva

### 20.1 `ExecutivoDashboardComponent` (`/executivo/dashboard`)

**Componente:** `src/app/features/executivo/pages/executivo-dashboard/executivo-dashboard.component.ts` (+ `.html`/`.scss`)

**Rota:** `/executivo` (lazy, `canActivate: [adminGuard]` sob `MainLayout`, em `features.routes.ts:10-13`) → `''` redireciona para `'dashboard'` (`executivo.routes.ts:3-8`) → `ExecutivoDashboardComponent` (`title: 'Central Executiva'`). Acesso restrito a perfil `Administrador` (`admin.guard.ts`: sem sessão tenta refresh silencioso; não-admin cai em `'/'`; sem sessão válida vai para `/login?returnUrl=`).

### O que faz
Painel do Diretor para gestores: consolida Implantação, equipes e pontos críticos em um só lugar. Header via `app-page-header` — Lote B (confirmado no código, `executivo-dashboard.component.html:2-28`): `titulo="Painel do Diretor"`, `descricao="Implantação, equipes e pontos críticos em um só lugar — sem abrir cada módulo."`, `icone="bi-speedometer2"` (mantido); eyebrow removido; slot `actions` (`.executivo__controls`) com filtro por função (select) + botão Limpar + botão Atualizar. 6 KPIs clicáveis; seção "Projetos em andamento" (cards de `projetosTop[]` com código, status, progresso, responsável, previsão e links Detalhe + `kanban?projetoId=`); seção "Kanban Total" (`app-implantacao-kanban` embutido + link "Abrir em tela cheia"); 2 gráficos Chart.js; visão por módulo; alertas de atenção imediata; tarefas críticas (até 6); próximas entregas (até 4) + agenda da semana (7 dias, até 6); visão por equipe (cards por função); 6 atalhos rápidos; rodapé com "Última atualização ... · auto-refresh a cada 30s".

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `ExecutivoDashboardService` | `obter(funcaoId?)` | Facade que consolida os 4 backends via `forkJoin` e monta o `ResumoExecutivo` |

### API Endpoints Consumidos (zero endpoint novo no backend)
| Método | Rota (v1) | Via | Descrição |
|--------|-----------|-----|-----------|
| GET | `/api/v1/admin/dashboard?funcaoId=N` | `AdminDashboardService.obter(funcaoId)` | Totais (total/em andamento/atrasadas/concluídas), por função (`funcoes[]`), `atualizadoEm` |
| GET | `/api/v1/implantacao/dashboard` | `DashboardService.obter()` | `projetosAtivos`, `projetosAtrasados`, `horasApontadas`, `proximosPrazo[]` |
| GET | `/api/v1/implantacao/projetos` | `ProjetosService.listar({})` | Base p/ `projetosTop[]` (top 6 ativos, atrasados primeiro) |
| GET | `/api/v1/implantacao/tarefas` | `TarefasService.listar({})` | Base local p/ bloqueadas (`bloqueada`), urgentes (`prioridade === 3`) e tarefas críticas |
| GET | `/api/v1/agenda/eventos?inicio=X&fim=Y&funcaoId=N` | `AgendaService.listarEventos(agora, +7 dias, undefined, funcaoId)` | Agenda da semana (até 6) |

### Banco de Dados
- **Conecta:** ❌ Não (via backend; mesmas tabelas de Implantação/Agenda/Admin já documentadas)

### Dependências Externas
- `Chart.js` (`chart.js`, `registerables`) — barra "Tarefas por equipe" (top 6 funções: em andamento/atrasadas/concluídas) + doughnut "Panorama das tarefas"
- `RouterLink` nos KPIs, alertas, módulos e atalhos
- `KanbanComponent` (`app-implantacao-kanban`, `features/implantacao/pages/kanban/kanban.component.ts`) embutido na seção "Kanban Total" (mesmo componente da Implantação, com deep-link `?projetoId`)

### Observações Técnicas
- **KPIs (6, `executivo-dashboard.service.ts:54-61`):** total (`/implantacao/tarefas`), em andamento (`?apenasEmAndamento=true`), concluídas (`?apenasConcluidas=true`), atrasadas (`?apenasAtrasadas=true`), bloqueadas (`/implantacao/kanban`), urgentes (`/implantacao/tarefas`)
- **Visão por módulo (`MODULOS_REGISTRY`, `modulos.registry.ts`):** só 2 entradas — Implantação = real (`/implantacao/dashboard`, "`N` projetos ativos"); Financeiro = placeholder com `emBreve: true` e `destinoEmBreve: '/visao-adm'` ("Conteúdo interno · sem pendências operacionais", "Rotinas e procedimentos disponíveis na Visão ADM"). Suporte/Compras/CRM foram removidos do registry; o comentário do arquivo orienta que só entram módulos reais (novos voltam quando tiverem entidade e endpoints próprios)
- **Visão por equipe via `Funcao`:** `equipes[]` deriva de `admin.funcoes[]` + `percentualConclusao` (concluídas/total); card exibe total, andamento, atrasadas, concluídas, barra de progresso e até 3 responsáveis (`nomesResponsaveis()`)
- **Alertas (`alertas[]`):** bloqueadas (`/implantacao/kanban`), atrasadas (`/implantacao/tarefas?apenasAtrasadas=true`), urgentes (`/implantacao/tarefas`); vazio → "Tudo em dia" (`/implantacao/dashboard`)
- **Atalhos (6 fixos, `executivo-dashboard.component.ts:18-25`):** Kanban Total (`/implantacao/kanban`), Kanban ADM (`/administrativo`), Agenda (`/agenda`), Projetos (`/implantacao/projetos`), Cadastros (`/implantacao/cadastros`), Admin (`/admin/dashboard`)
- **Auto-refresh 30s:** `setInterval(() => carregar(true), 30000)` silencioso (sem spinner); limpo no `ngOnDestroy` junto com `destroy()` dos charts
- **Filtro por função:** `select` (Todas as funções + `d.equipes[]` por `funcaoId`) no slot `actions` do header (`.executivo__controls`, `executivo-dashboard.component.html:6-27`) → `aoTrocarFuncao()` recarrega com `funcaoId`; `limparFiltro()` volta a `null`
- Status final local: `Concluida/Concluido/Cancelada/Cancelado` (`STATUS_FINAL`); críticas = bloqueadas + urgentes não-bloqueadas ordenadas por `dataPrevisao` (top 6)
- **Projetos em andamento (`projetosTop[]`, `executivo-dashboard.service.ts:134-144` + template `.html:67-108`):** filtra projetos não-finais, ordena atrasados primeiro (`dataPrevisao < hoje` à meia-noite) e depois por `dataPrevisao`, top 6; card exibe código, badge de status (`corStatus()`/`rotuloStatus()` via `STATUS_COR`/`STATUS_ROTULO`), badge "Atrasado" (`estaAtrasado()`), nome, tipo/cliente, barra de progresso, percentual, responsável e previsão; ações Detalhe (`/implantacao/projetos/:id`) + Kanban (`/implantacao/kanban?projetoId=:id`, deep-link lido no `ngOnInit` do Kanban)
- **Kanban Total embutido (`.html:110-119`):** `<app-implantacao-kanban>` dentro de `.executivo__kanban` + link "Abrir em tela cheia" (`/implantacao/kanban`); SCSS anti-sobreposição (`.executivo__kanban` com `overflow-x: auto` + `min-width: 0`, cards/atalhos/listas com `min-width: 0`, `flex-shrink: 0` e `overflow-wrap: anywhere`, `text-overflow: ellipsis` em nome/sub/títulos)

---

## 21. Módulo Gestor

### 21.1 `GestorModuloEntradaComponent` (`/gestor/entrada`)

**Componente:** `src/app/features/gestor/pages/modulo-entrada/modulo-entrada.component.ts` (+ `.html`/`.scss`)

**Rota:** `/gestor/entrada` — **top-level em `app.routes.ts`**, **fora** do `MainLayout` (full-screen: sem header/sidebar/breadcrumb/footer globais), `canActivate: [authGuard, adminGuard]`. Alias `/modulos` → redirect `redirect: 'gestor/entrada'`. Login Admin ainda vai para `/gestor/entrada` (`login.component.ts`). Redirect raiz `''` → `'ceo'` em `gestor.routes.ts`.

### O que faz

Tela de seleção full-screen do Gestor (redesign premium 2026-09-22): header branco com logo JCA + "CENTRAL DE OPERAÇÃO" / "JCA SOLUÇÕES", eyebrow "Painéis executivos", saudação real (`Bom dia/tarde/noite, {{primeiroNome}}! 👋`), instrução "Selecione seu módulo para acessar o dashboard", meta (`APP_VERSION` em pill + data pt-BR dinâmica + badge do perfil). **Grid 3 colunas** (`auto-fit minmax(300px,1fr)`; 1 coluna ≤768px) com cards CEO → CTO → COO em layout premium: **header do card com gradiente na cor-tema** + padrão de dots + badge (`CEO | Strategic Leadership`), **ícone Bootstrap Icons** (bi-gem/bi-cpu/bi-graph-up — emojis removidos), título, cargo, divisor em gradiente, descrição, 4 features com ícone BI em grid 2 colunas, divisor e CTA "Entrar como {X}" + `bi-arrow-right` com **loading** (`navegando` + spinner, botões disabled). Cores-tema expostas como CSS custom properties por card (`--cor-tema`, `--cor-escura`, `--cor-clara`, `--cor-rgb`, `--cor-hover`): CEO `#0052a3`, CTO `#00875d`, COO `#d97706`. Fundo: gradiente `#fafbfc → #f3f4f7` + **padrão de grid sutil + noise**; cards com `border-top` colorida, sombra refinada (base + inset) e hover `translateY(-6px)` / active `scale(0.98)`. **Animação de entrada staggered** (`card-in`, 100ms de delay por card via `--i`, respeita `prefers-reduced-motion`). **Dark mode** via `:host-context([data-theme='dark'])` com tokens do Design System. Acessível por teclado (`tabindex=0`, `role=button`, `keydown.enter/space`); animação `.animado` via `requestAnimationFrame`. Link "Módulo Colaborador" → `/`; footer com © + Política Interna (`/politica`) + versão. **Sem mock de último acesso.**

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AuthService` | `getCurrentUser()` | Obtém usuário logado (nome, perfil) para header/saudação |
| `GestorPermissionService` | `podeAcessarGestor()` | Verificação no `ngOnInit` (redireciona para `/` se sem permissão; guards da rota são `authGuard`+`adminGuard`) |
| `Router` | `navigate()` | Navegação para `/gestor/ceo|cto|coo`, `/` e `/politica` |

### Models Locais (`modulo-entrada.component.ts`)
| Tipo | Descrição |
|------|-----------|
| `FeatureItem` | `{ icone: string, texto: string }` (`icone` = classe Bootstrap Icons, ex.: `bi-cash-stack`) |
| `ModuloCard` | `{ id: 'ceo' \| 'cto' \| 'coo', titulo, cargo, cargoEn, descricao, features: FeatureItem[], rota, corPrimaria, corEscura, corClara, corRgb, corHover }` |

### Dados dos Módulos (hardcoded no componente)
| Módulo | ID | Cargo | cargoEn | Ícone (BI) | Cor-tema (`--cor-tema`) | Hover | Rota | Features (4 cada, ícone BI) |
|--------|-----|-------|---------|-------------|------------------------|-------|------|------------------------------|
| CEO | `ceo` | Chief Executive Officer | Strategic Leadership | bi-gem | `#0052a3` (esc `#003366`, rgb `0,82,163`) | `#003d7a` | `/gestor/ceo` | bi-cash-stack Resultados Financeiros, bi-kanban Pipeline Comercial, bi-people Satisfação Cliente, bi-bullseye KPIs Executivos |
| CTO | `cto` | Chief Technology Officer | Technology Excellence | bi-cpu | `#00875d` (esc `#004d38`, rgb `0,135,93`) | `#005a42` | `/gestor/cto` | bi-rocket-takeoff Desenvolvimento, bi-diagram-3 Infraestrutura, bi-shield-lock Segurança, bi-check2-circle Qualidade de Código |
| COO | `coo` | Chief Operating Officer | Operational Excellence | bi-graph-up | `#d97706` (esc `#92400e`, rgb `217,119,6`) | `#b45309` | `/gestor/coo` | bi-gear-wide-connected Operações & Processos, bi-graph-down-arrow Eficiência & Custos, bi-person-badge Recursos Humanos, bi-clipboard2-check Conformidade |

### API Endpoints Consumidos
| Método | Rota (v1) | Via | Descrição |
|--------|-----------|-----|-----------|
| — | — | — | **Nenhum endpoint direto** — componente puramente de navegação/roteamento; dados vêm do `AuthService` (sessão atual) |

### Banco de Dados
- **Conecta:** ❌ Não (apenas lê sessão via `AuthService`; roteamento para dashboards que consomem APIs próprias)

### Dependências Externas
- Imagem `assets/images/logo-jca.png`
- CSS Custom Properties do Design System (`--font-display`, `--font-body`, tokens claro/escuro) + variáveis locais de theming da página (`--cor-tema` etc. via `[style.--cor-*]`)
- Bootstrap Icons (classes `bi-*`, já carregado via CDN no `index.html`)
- `APP_VERSION` de `@shared/meta/app-version` (hoje `0.7.0`)

### Observações Técnicas
- **Componente standalone** Angular 18, imports apenas `CommonModule`
- **Full-screen real:** rota top-level em `app.routes.ts` (antes era filha do `MainLayout` e herdava header/sidebar)
- **Grid 3 colunas desktop:** `.cards-container { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) }`; ≤768px → 1 coluna
- **Animação staggered:** `@keyframes card-in` (opacity/scale/translate, 0.6s) com `animation-delay: calc(var(--i) * 100ms + 150ms)` (`--i` via `[style.--i]="i"`); desativada em `prefers-reduced-motion: reduce`
- **Loading no CTA:** `navegando: string | null` — botão do card ativo mostra spinner + "Carregando…"; demais disabled; reset no erro do `navigate`
- **Acessibilidade:** `tabindex="0"`, `role="button"`, `keydown.enter`/`keydown.space`, `aria-label`; `focus-visible`
- **Saudação:** `Date.getHours()` (<12 Bom dia, <18 Boa tarde, senão Boa noite) + primeiro nome + 👋
- **Data dinâmica:** `toLocaleDateString('pt-BR', { day, month: 'long', year })` no header
- **Versão:** `APP_VERSION` (`@shared/meta/app-version`) — alinhada a footer/header
- **Sem mock:** não exibe último acesso (decisão 2026-09-22)
- **Dark mode:** suportado via `:host-context([data-theme='dark'])` no SCSS do componente (tokens do Design System; cores-tema dos cards ganham variantes com `rgb(var(--cor-rgb))` + `brightness`)
- **Alias:** `/modulos` → `/gestor/entrada`

---

### 21.2 `GestorNavComponent` (navegação interna do Módulo Gestor)

**Componente:** `src/app/features/gestor/components/gestor-nav/gestor-nav.component.ts` (standalone, template + styles inline)

**Uso:** Incluído no `GestorLayoutComponent` (`src/app/features/gestor/components/gestor-layout/gestor-layout.component.ts`) — wrapper que encapsula o `<router-outlet>` das rotas filhas `/gestor/*`.

### O que faz

Barra de navegação interna do Módulo Gestor, substituindo o botão "Trocar Painel" que existia nos headers dos dashboards CEO/COO/CTO. Apresenta:
- **Tabs** para os 3 painéis executivos (CEO, COO, CTO) com ícones Bootstrap Icons (`bi-gem`, `bi-clipboard-check`, `bi-cpu`), usando `routerLinkActive` para estado ativo e `aria-selected` para acessibilidade.
- **Link "Central de Operação"** à direita (ícone `bi-grid`), navega para `/` (home da Central).
- Responsivo: `flex-wrap` em ≤768px.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `Router` | `url` (via `inject(Router).url`) | Verifica rota ativa para destacar tab (`isActive(id)`) |

### Models Locais (`gestor-nav.component.ts:14-18`)
| Tipo | Descrição |
|------|-----------|
| `Painel` (const array) | `{ id: 'ceo'|'coo'|'cto', label, icone }` — fixo, não configurável externamente |

### API Endpoints Consumidos
| Método | Rota (v1) | Via | Descrição |
|--------|-----------|-----|-----------|
| — | — | — | **Nenhum** — componente puramente de navegação/client-side |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `Bootstrap Icons` (`bi-*` classes)
- CSS Custom Properties do Design System (`--brand`, `--border-color`, `--radius-md`, `--surface-subtle`, `--text-muted`, `--text-strong`)

### Observações Técnicas
- **Componente standalone** Angular 18, imports: `CommonModule`, `RouterLink`, `RouterLinkActive`
- **Template + Styles inline** — ~60 linhas totais
- **Acessibilidade:** `role="tablist"` no `<ul>`, `role="tab"` nos links, `aria-selected` dinâmico, `aria-controls` apontando para `panel-{id}`
- **Estado ativo:** `isActive(id)` verifica `inject(Router).url.includes(\`/gestor/${id}\`)`
- **Sem lógica de permissão** — a guarda está no `GestorLayoutComponent` (rota pai)

---

### 21.3 `GestorLayoutComponent` (wrapper de layout do Módulo Gestor)

**Componente:** `src/app/features/gestor/components/gestor-layout/gestor-layout.component.ts` (standalone)

**Rota pai em `gestor.routes.ts`:** `path: ''` → `component: GestorLayoutComponent` com `canActivate: [GestorPermissionService.podeAcessarGestor()]` e children para `ceo`, `cto`, `coo`. A `entrada` **não** está neste arquivo — é rota top-level em `app.routes.ts` (fora do `MainLayout`).

### O que faz

Wrapper que compõe a navegação interna (`<app-gestor-nav>`) + `<router-outlet>` para as rotas filhas. Centraliza a guarda de permissão do módulo no nível pai (single flight), evitando duplicação do `canActivate` em cada rota filha (exceto as específicas por painel).

### Template
```html
<app-gestor-nav></app-gestor-nav>
<router-outlet></router-outlet>
```

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | Componente passivo (sem injeção direta; usa `GestorNavComponent` internamente) |

### Observações Técnicas
- **Componente standalone** Angular 18, imports: `CommonModule`, `RouterOutlet`, `GestorNavComponent`
- **Guarda única no pai:** `canActivate: [() => inject(GestorPermissionService).podeAcessarGestor()]` em `gestor.routes.ts:8`
- **Guards por painel mantidas nas children:** `canActivate: [() => inject(GestorPermissionService).podeAcessarPainel('ceo'|'coo'|'cto')]` para granularidade futura
- **Removeu botão "Trocar Painel"** dos headers dos dashboards CEO/COO/CTO (era `<a [routerLink]="['/gestor']">Trocar Painel</a>` no slot `actions` do `app-page-header`)

---

### 21.4 `gestor.routes.ts` + rota `entrada` em `app.routes.ts`

```typescript
// app.routes.ts (top-level, fora do MainLayout — full-screen)
{
  path: 'gestor/entrada',
  loadComponent: () => import('@features/gestor/pages/modulo-entrada/modulo-entrada.component')
    .then(m => m.GestorModuloEntradaComponent),
  canActivate: [authGuard, adminGuard]
},
{ path: 'modulos', redirectTo: 'gestor/entrada', pathMatch: 'full' },

// gestor.routes.ts (só painéis; entrada removida daqui)
export const gestorRoutes: Routes = [
  {
    path: '',
    component: GestorLayoutComponent,
    canActivate: [() => inject(GestorPermissionService).podeAcessarGestor()],
    children: [
      { path: '', redirectTo: 'ceo', pathMatch: 'full' },
      { path: 'ceo', loadComponent: () => import('./pages/ceo-dashboard/ceo-dashboard.component').then(m => m.CeoDashboardComponent), canActivate: [() => inject(GestorPermissionService).podeAcessarPainel('ceo')] },
      { path: 'cto', loadComponent: () => import('./pages/cto-dashboard/cto-dashboard.component').then(m => m.CtoDashboardComponent), canActivate: [() => inject(GestorPermissionService).podeAcessarPainel('cto')] },
      { path: 'coo', loadComponent: () => import('./pages/coo-dashboard/coo-dashboard.component').then(m => m.CooDashboardComponent), canActivate: [() => inject(GestorPermissionService).podeAcessarPainel('coo')] }
    ]
  }
];
```

**Mudanças (2026-09-22):**
- `entrada` saiu de `gestor.routes.ts` e virou rota **top-level** em `app.routes.ts` com `authGuard` + `adminGuard` → full-screen sem `MainLayout` (header/sidebar/breadcrumb/footer)
- Alias `/modulos` → redirect `gestor/entrada`
- Redirect raiz `''` → `'ceo'`
- Dashboards CEO/COO/CTO mantêm `canActivate` por painel sob o `MainLayout` + `GestorLayout`

---

## 20.2 `ExecutivoDashboardService` + `MODULOS_REGISTRY` (Frontend)

**Arquivos:** `src/app/features/executivo/services/executivo-dashboard.service.ts` · `src/app/features/executivo/data/modulos.registry.ts` · `src/app/features/executivo/models/executivo.model.ts`

### O que faz
Camada `providedIn: 'root'` que agrega 5 fontes existentes com `forkJoin` + `catchError` por fonte (`null`/`[]` em falha) e monta o `ResumoExecutivo` (`kpis`, `modulos`, `equipes`, `alertas`, `proximasEntregas`, `projetosTop`, `tarefasCriticas`, `agendaSemana`, `atualizadoEm`, `projetosAtivos`, `projetosAtrasados`, `horasApontadas`).

### Models Exportados (`executivo.model.ts`)
| Tipo | Descrição |
|------|-----------|
| `KpiResumo` | `{ chave: total\|andamento\|concluidas\|atrasadas\|bloqueadas\|urgentes, rotulo, valor, icone, cor, fundo, rota, queryParams? }` |
| `ModuloResumo` | `{ chave, titulo, descricao, icone, cor, tarefas, atrasadas, bloqueadas, extra?, rota, botao, emBreve? }` |
| `EquipeResumo` | `AdminFuncaoResumo` + `percentualConclusao` |
| `AlertaCritico` | `{ tipo: bloqueada\|atrasada\|urgente\|ok, titulo, detalhe, quantidade, rota, queryParams? }` |
| `ResumoExecutivo` | Agregado completo consumido pelo componente (inclui `projetosTop: ProjetoResumo[]` — top 6 ativos, atrasados primeiro) |

### Observações Técnicas
- **Nenhum endpoint novo no backend** — reutiliza `AdminDashboardService`, `DashboardService` (implantação), `ProjetosService.listar({})`, `TarefasService` e `AgendaService` (5 fontes no `forkJoin`, `executivo-dashboard.service.ts:32-40`)
- Registro enxuto: só Implantação (real) + Financeiro (placeholder → `/visao-adm`); Suporte/Compras/CRM removidos. Novos módulos só entram em `MODULOS_REGISTRY` quando tiverem entidade e endpoints próprios (ver comentário em `modulos.registry.ts:13-17`)

