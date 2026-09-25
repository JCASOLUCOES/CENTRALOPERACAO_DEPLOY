> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 1. Layout & Navegação

### 1.1 `MainLayoutComponent`

**Componente:** `src/app/layout/main-layout/main-layout.component.ts`

### O que faz
Layout principal da aplicação após login. Contém header com navegação superior, breadcrumb, barra de busca global, sidebar com 7 seções e o widget flutuante do JOTA (`app-jota-widget`). Renderiza a rota filha abaixo.

### Services Injetados
Nenhum. O `MainLayoutComponent` apenas monta o Header e a rota filha; a busca fica encapsulada nas instâncias de `GlobalSearchComponent` exibidas pelo Header e pela Home.

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum endpoint direto |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `RouterOutlet` (Angular Router)
- `GlobalSearchComponent` renderizado pelo Header e pela rota Home; o estado é compartilhado por `BuscaService`

### Observações Técnicas
- Rotas filhas renderizadas via `<router-outlet>`
- Sidebar com 7 seções fixas: Início, Atendimento, Implantação, Ferramentas, Conhecimento, JCA, Administração (só links diretos; nenhuma seção usa grupos expansíveis no momento, embora o template/componente ainda suportem `grupos`)
- Header com dropdown usuário (BEM `user-nav__*`), notificações e busca local reutilizável via `GlobalSearchComponent`
- JOTA transversal: `<app-jota-widget>` (FAB + painel) montado no `MainLayout` (`main-layout.component.html:9`); a página `/chat` foi **removida** em 2026-09-24 (`e87d763`)

---

### 1.2 `HeaderComponent`

**Componente:** `src/app/layout/header/header.component.ts`

### O que faz
Header superior com logo, navegação (Início / Fraseologias / Ferramentas / Acessos / Cursos), breadcrumb, busca local compartilhada com a Home e dropdown do usuário com perfil e logout. A entrada do Header mantém o placeholder **"Pesquisar qualquer conteúdo..."**.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AuthService` | `logout()` | Encerra sessão |

O Header não consome os serviços de busca diretamente: seu `<app-global-search>` injeta `BuscaService` e `BuscaIndexService`.

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/auth/logout` | `AuthService.logout()` | Revoga refresh token |
| GET | `/api/v1/auth/me` | (via refresh) | Dados do usuário (restauração pós-F5) |

### Banco de Dados
- **Conecta:** ❌ Não (chama backend que consulta `TBOPERADOR` + `RefreshTokens`)

### Dependências Externas
- `ng-bootstrap` dropdown (`NgbDropdown`, `NgbDropdownModule`)
- `GlobalSearchComponent` standalone (`origem="header"`, `variante="header"`)
- `AuthService` (logout)

### Observações Técnicas
- Dropdown usa BEM (`user-nav__*`)
- A busca do Header é o componente reutilizável `GlobalSearchComponent`; `Ctrl+K`/`Cmd+K` é interceptado no documento, abre a origem `header`, move o foco com `preventScroll` e seleciona o texto atual
- O componente também fecha por `Escape`, clique fora ou saída do container; `AcessosComponent` continua chamando `BuscaService.fecharBusca()` antes de abrir o modal de senha
- `navItems` (`header.component.ts:105-111`): Início (`/`, exact), Fraseologias (`/fraseologia`), Ferramentas (`/ferramentas`), Acessos (`/ferramentas/acessos`), Cursos (`/cursos`)
- `BREADCRUMB_LABELS` + `BREADCRUMB_PATTERNS` (`breadcrumb.component.ts`) cobrem todas as rotas autenticadas: estáticas (`/`, `/agenda`, `/conhecimento`, `/implantacao/*`, `/admin/*`, `/trilhas/*`, `/empresa/onboarding`, `/database/*`, etc.) e dinâmicas via padrão `:id` (detalhe/editar de curso, ferramenta, procedimento, projeto, tarefa, tipo de projeto, capítulo onboarding e `/database/tabela/:schema/:tabela`). Trilha global no `MainLayout` **e** no `AdminLayout`. Sem label, o último segmento é humanizado (breadcrumb não some em tela autenticada); segmentos numéricos intermediários são omitidos. Folhas dinâmicas ficam sem `routerLink`.
- `withCredentials: true` no interceptor (cookie cross-origin)

### Dropdown do Usuário — Implementação Atual (v0.7.0+)

O dropdown do perfil do usuário foi refatorado para garantir comportamento confiável de abertura/fechamento:

| Melhoria | Detalhe |
|----------|---------|
| **Estado explícito `isOpen`** | Booleano inicializado em `false`, sincronizado via binding bidirecional: `[open]="isOpen"` e `(openChange)="isOpen = $event"` no `ngbDropdown`. |
| **Fechamento ao clicar fora** | `@HostListener('document:click')` verifica se o clique ocorreu fora do elemento `#userDropdownEl` e chama `closeUserMenu()` (define `isOpen = false` + `userDropdown?.close()`). |
| **Trigger com `stopPropagation`** | Botão trigger chama `toggleUserMenu(event)` que executa `event.stopPropagation()` para evitar fechamento imediato ao clicar no próprio botão. |
| **`autoClose="outside"`** | Propriedade nativa do `ngbDropdown` que fecha automaticamente ao clicar fora do dropdown. |
| **`type="button"` em todos os itens** | Todos os `<button>` dentro do dropdown (`ngbDropdownItem`, logout, tema, etc.) agora têm `type="button"` para evitar submissão acidental de formulários. |
| **Template references** | `#userDropdownEl` (ElementRef\<HTMLElement\> no elemento `<li>`) e `#userDropdown="ngbDropdown"` (referência à diretiva `NgbDropdown`) permitem manipulação programática (`userDropdown?.close()`). |

---

### 1.3 `SidebarComponent`

**Componente:** `src/app/layout/sidebar/sidebar.component.ts`

### O que faz
Sidebar esquerda com 7 seções fixas (Início, SUPORTE, Implantação, Ferramentas, Conhecimento, JCA, Administração). A seção SUPORTE (Resolver problemas) usa 2 grupos expansíveis: Atendimento (Modelo de Chamados, Fraseologias — expandido por padrão) e Conhecimento Rápido (Visão do conhecimento, SQL, Rede, Infra). Papel derivado da sessão (2026-09-18, sem escolha manual): `tboperador.se_admin = 1` (perfil Administrador) → Gestor; demais → Operador; rodapé "Meu papel" somente exibição, sem destaque visual em nenhuma seção. Destaca link ativo (`routerLinkActive="active"`) e exibe ícones Bootstrap. Sem link do JOTA na sidebar (o JOTA vive só no widget flutuante).

| Seção | Links (label → rota) |
|---|---|
| Início | Visão Geral (`/`) · Agenda (`/agenda`) |
| SUPORTE (grupos) | Atendimento: Modelo de Chamados (`/modelo-chamados`) · Fraseologias (`/fraseologia`) — Conhecimento Rápido: Visão do conhecimento (`/conhecimento`) · SQL (`/trilhas/sql`) · Rede (`/trilhas/rede`) · Infra (`/trilhas/infra`) |
| Implantação | Visão geral (`/implantacao/dashboard`, `bi-bar-chart-fill`, com seção Produtividade fundida) · Projetos (`/implantacao/projetos`) · Kanban (`/implantacao/kanban`) · Tarefas (`/implantacao/tarefas`) |
| Ferramentas | Banco de Dados (`/database`) · Acessos (`/ferramentas/acessos`) · Central de Utilidades (`/ferramentas`) |
| Conhecimento | Cursos (`/cursos`) · FAQ (`/ferramentas/faq`) · Stack (`/stack`) |
| JCA | Empresa (`/empresa`) · Onboarding (`/empresa/onboarding`) · Políticas (`/politica`) · Procedimentos (`/visao-adm`) |
| Administração | Kanban ADM (`/administrativo`, só `hasRole('F')`) · Gestão da Central (`/admin/dashboard`, só Administrador) |

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AuthService` | `getCurrentUser()` (via `ehAdministrador()` estrito), `hasRole('F')` | Exibe links condicionais (Gestão da Central só `perfil === 'Administrador'`; Kanban ADM só perfil `F`) |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum endpoint direto |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `RouterLink` (Angular Router com `routerLinkActive`)

### Observações Técnicas
- Links diretos por seção (`section.links`); `section.grupos` não é usado em nenhuma das 7 seções atuais (suporte a `grupos` com `isExpandido()`/`alternarGrupo()` permanece no componente/template para uso futuro)
- Destaca link ativo via `routerLinkActive="active"` (exact nos links de seção)
- **Administração:** `LINK_KANBAN_ADM` (`/administrativo`) via `...(this.auth.hasRole('F') ? ...)`; `LINK_GESTAO_CENTRAL` (`/admin/dashboard`) via `...(this.ehAdministrador() ? ...)`; item **Central Executiva removido** da sidebar em `e87d763`

---

### 1.4 `FooterComponent`

**Componente:** `src/app/layout/footer/footer.component.ts`

### O que faz
Rodapé da aplicação com informação de versão (`app-version.ts`), links e copyright.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `appVersion` (sinal de `src/app/shared/meta/app-version.ts`)

### Observações Técnicas
- Versão exibida no rodapé e dropdown do usuário
- Fonte única: `frontend/src/app/shared/meta/app-version.ts`

---

### 1.5 `GlobalSearchComponent` + `BuscaIndexService` + `RecentesService` + `BuscaService`

**Arquivos:** `src/app/shared/components/global-search/global-search.component.ts` (+ `.html`/`.scss`) · `src/app/core/services/busca-index.service.ts` · `src/app/core/services/recentes.service.ts` · `src/app/core/services/busca.service.ts`

### O que faz
Header e Home renderizam o mesmo componente standalone, cada um com sua origem (`header` ou `home`). `BuscaService` mantém uma única sessão de busca — uma origem, no máximo um painel aberto e a mesma consulta — enquanto `BuscaIndexService` fornece resultados locais síncronos, sem backend. `RecentesService` permanece independente, responsável pelo histórico de navegação.

| Service | API | Detalhe confirmado no código |
|---|---|---|
| `BuscaIndexService` (`providedIn: 'root'`) | `buscar(termo, limite = 8): ResultadoBusca[]` | Índice local construído de acervos estáticos + `PAGINAS` (ferramentas, cursos, trilhas, SQL, procedimentos, utilidades, política, onboarding, páginas); normalização sem acento (`toLowerCase` + `normalize('NFD')`); multi-termo (`split(/\s+/)`, token `> 1` char, `every(t => busca.includes(t))`); termo vazio retorna sugestões. O componente sempre solicita `limite = 8` |
| `RecentesService` (`providedIn: 'root'`) | `recentes(limite = 6)`, `maisUtilizados(limite = 6)`, `mudancas$` | Tracking por `NavigationEnd` (`urlAfterRedirects`, sem query); ignora `/` e `/login`; rótulos por prefixo (`TITULOS`); persiste em `localStorage `cc.recentes.v1`` (máx. 30 itens, `{ rota, titulo, tipo, acessadoEm, usos }`); começam vazios, sem mock |
| `BuscaService` (`providedIn: 'root'`) | `estado$`, `estadoAtual`, `buscaAberta$`, `buscaAberta`, `abrirBusca(origem?)`, `atualizarConsulta(consulta, origem)`, `fecharBusca(origem?)` | `BehaviorSubject<BuscaEstado>` com `{ aberta, origem: 'header' | 'home' | null, consulta }`. `buscaAberta$` continua sendo um observable booleano compatível; abrir troca a origem sem apagar a consulta e fechar também a preserva; o filtro opcional por origem impede que uma instância feche o painel da outra |

#### Integração e comportamento
- **Header:** `origem="header"`, `variante="header"`, placeholder **"Pesquisar qualquer conteúdo..."**. `Ctrl+K`/`Cmd+K` abre esse painel, foca o input com `preventScroll` e seleciona a consulta existente.
- **Home:** `origem="home"`, `variante="home"`, placeholder **"Buscar na Central..."**. Foco ou clique abre o painel sob o próprio input; não redireciona o foco para o Header.
- **Consulta e resultados:** a entrada atualiza a consulta compartilhada; termo vazio mostra sugestões e termo sem correspondência mostra mensagem orientando a troca do termo. Clique segue o `routerLink`; `Enter` navega pela opção ativa (ou pela primeira quando não há destaque).
- **Teclado:** `ArrowDown`/`ArrowUp` percorrem as opções com retorno cíclico; `Escape` fecha sem retirar o foco do input; `Tab` limpa o destaque e segue a ordem natural. As opções usam `tabindex="-1"`, permanecendo fora da ordem de Tab.
- **Fechamento:** `clickOutside` e `focusout` fecham apenas quando o foco/interação sai do contêiner; a interação entre input e resultado não provoca fechamento prematuro. Não há timer de blur.
- **Acessibilidade:** padrão `combobox`/`listbox`/`option` com `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-selected` e status `role="status" aria-live="polite"`; label associado e IDs derivados da origem (`global-search-header-*` ou `global-search-home-*`); `aria-keyshortcuts="Control+K Meta+K"`; foco visível e `prefers-reduced-motion` respeitado.
- **SSR e foco:** `isPlatformBrowser` protege foco, rolagem da opção e atalho de documento; `focus({ preventScroll: true })` é usado apenas no componente de origem já acionado.

- Entrada `Visão geral da Implantação` (`/implantacao/dashboard`) usa `icone 'bi-bar-chart-fill'` (`busca-index.service.ts`); entrada da antiga Central Executiva removida em `e87d763`.

### 1.6 `PageHeaderComponent` (shared, reutilizável)

**Componente:** `src/app/shared/components/page-header/page-header.component.ts` (+ `.html`/`.scss`)

### O que faz
Cabeçalho padrão de página — título + descrição fixos à esquerda, ações projetadas à direita via slot `actions` (usado por Dashboard, Kanban, Projetos, Tarefas e mais 11 telas dos Lotes A+B, total 15). Elimina os headers/CSS antigos locais das telas (`dashboard.component.ts` overrides inline, `.imp-header*`, `.tar-header*`, `.imp-kanban__header`, CSS de header de Acessos/Ferramentas/Fraseologia/FAQ/Visão ADM/Modelo de Chamados, `.imp-form-header`/`.imp-form-title`/`.imp-form-subtitle` dos forms).

| API | Detalhe confirmado no código |
|---|---|
| `selector: 'app-page-header'` (standalone) | Uso: `<app-page-header titulo="..." descricao="..." icone="..."><div actions>…</div></app-page-header>` — `titulo` aceita binding (`[titulo]="..."`) para títulos dinâmicos (forms) |
| `@Input({ required: true }) titulo` | Título 800 1.5rem (`var(--font-display)`), com `<i class="bi" [ngClass]="icone">` opcional à esquerda; estático (`titulo="..."`) ou dinâmico (`[titulo]="titulo()"`) |
| `@Input() descricao?` | Subtítulo 400 0.875rem com `opacity: 0.7` (`*ngIf="descricao"`) |
| `@Input() icone?` | Classe Bootstrap Icons (ex.: `bi-bar-chart-fill`); cor `var(--primary-color)` |
| Slot `<ng-content select="[actions]">` | Contêiner `.page-header__acoes` (`flex`, `gap: 0.5rem`, `flex-wrap: wrap`) |
| Layout `.page-header` | `flex`, `space-between`, `wrap`, `gap: 1rem`, `min-height: 4.25rem`, `margin-bottom: 0.75rem` |

### Onde é usado (confirmado no código)
- **Dashboard** (`dashboard.component.ts`): `titulo="Visão Geral"`, `descricao="Acompanhe o progresso geral, métricas e o status consolidado do projeto."`, `icone="bi-bar-chart-fill"`; slot com select de projeto em optgroups Ativos/Concluídos (CSV/Imprimir removidos em 22/09/2026; período da produtividade migrou para o cabeçalho da seção).
- **Kanban** (`kanban.component.ts:63-73`): `titulo="Kanban"`, `descricao="Visualize e mova tarefas entre colunas. Atualizações sincronizam com o backend."`, `icone="bi-kanban"`; slot `actions` com select de projeto (contêiner `.imp-kanban__controls`); CSS local de header `.imp-kanban__header` removido.
- **Projetos** (`projetos.component.ts:18-32`): `titulo="Projetos"`, `descricao="Gerencie a lista de projetos, datas de entrega e atribuições da equipe."`, `icone="bi-folder2-open"`; slot `.imp-header__actions` com Filtros/Resumo/Novo Projeto (único CSS local remanescente, `projetos.component.scss:219`).
- **Tarefas** (`tarefas.component.ts:19-33`): `titulo="Tarefas"`, `descricao="Liste, filtre e acompanhe o detalhamento de todas as tarefas cadastradas."`, `icone="bi-list-check"`; slot `.tar-header__stats` com badge de atrasadas + Nova tarefa (único CSS local remanescente, `tarefas.component.scss:9`).
- **Acessos** — Lote A (`acessos.component.html:2-6`): `titulo="Acessos das Empresas"`, `icone="bi-building"`; títulos/ícones/textos mantidos, CSS de header local removido; sem slot `actions` (stats/busca seguem abaixo).
- **Ferramentas** — Lote A (`ferramentas.component.html:2-6`): `titulo="Central de Utilidades do Analista de Suporte"`, `icone="bi-grid-fill"`; títulos/ícones/textos mantidos, CSS de header local removido.
- **Fraseologia** — Lote A (`fraseologia.component.html:4-8`): `titulo="Fluxo de Atendimento e Fraseologias"`, `icone="bi-diagram-3-fill"`; títulos/ícones/textos mantidos, CSS de header local removido (blocos internos `.fb-bloco__header` mantidos — são seções de conteúdo, não header de página).
- **FAQ/Glossário** — Lote A (`faq.component.html:4-8`): `titulo="Glossário Interno Actyon"`, `icone="bi-book"`; títulos/ícones/textos mantidos, CSS de header local removido.
- **Visão ADM** — Lote A (`visao-adm.component.html:2-6`): `titulo="Visão ADM"`, `icone="bi-clipboard-data-fill"`; títulos/ícones/textos mantidos, CSS de header local removido. Fora do escopo: hero interno `util__hero` (seção abaixo, `visao-adm.component.html:105`, `visao-adm.component.scss:9`) mantido como está.
- **Modelo de Chamados** — Lote A (`modelo-chamados.component.html:2-6`): `titulo="Documentar chamados e atendimentos"`, `icone="bi-file-earmark-text-fill"`; títulos/ícones/textos mantidos, CSS de header local removido, tag redundante do header antigo removida.
- **Database** — Lote B (`database-shell.component.html:2-6`): `titulo="Banco de Dados"`, `icone="bi-hdd-network-fill"`; banner de status (`.db-shell__status`) continua abaixo do header, sem slot `actions`.
- **Admin Dashboard** — Lote B (`admin-dashboard.component.html:2-9`): `titulo="Dashboard Administrativo"`, `icone="bi-speedometer2"`; meta de refresh ("Atualizado automaticamente a cada 30s") no slot `actions` (`.admin-dashboard__refresh`).
- **Central Executiva** — Lote B: tela **removida** em `e87d763` (o uso do `app-page-header` era `titulo="Painel do Diretor"`).
- **Projeto Form** — Lote B (`projeto-form.component.html:2-11`, `projeto-form.component.ts:77-78`): título dinâmico via binding (`[titulo]="titulo()"` → `computed` `isEdit() ? 'Editar Projeto' : 'Novo Projeto'`), `icone="bi-folder2-open"`; Cancelar no slot `actions` (`.imp-form-header-actions`); CSS `.imp-form-header`/`.imp-form-title`/`.imp-form-subtitle` removido do scss (resta só o contêiner do slot; regra responsiva órfã `.imp-form-header` em `projeto-form.component.scss:189` sem elemento correspondente).
- **Tarefa Form** — Lote B (`tarefa-form.component.html:2-11`, `tarefa-form.component.ts:98-99`): título dinâmico via binding (`[titulo]="tituloPagina()"` → `computed` `isEdit() ? 'Editar Tarefa' : 'Nova Tarefa'`), `icone="bi-file-earmark-text"`; Cancelar no slot `actions` (`.imp-form-header-actions`); CSS `.imp-form-header`/`.imp-form-title`/`.imp-form-subtitle` removido do scss.
- Fora do escopo (não migrado): Agenda (header original em 3 zonas), heróis/banners, modais, login, sidebar.

---

## 2. Autenticação

### 2.1 `LoginComponent`

**Componente:** `src/app/features/auth/pages/login/login.component.ts`

### O que faz
Tela de login com formulário de usuário/senha. Autentica via `POST /api/v1/auth/login`. Hero (painel esquerdo): heading **"Sua base operacional"** + descrição de workspace operacional (Implantação, Agenda, Acessos e Ferramentas) e 4 benefícios (projetos, agenda, credenciais, ferramentas/conhecimento) — reescrito em 24/09/2026 (sem tom de LMS). Exibe mensagem **"Sessão expirada. Faça login para retornar à operação."** se redirecionado por timeout. O destino pós-login é resolvido por `resolverDestino(perfil)`: **deep-link (ex. `/implantacao/kanban`) é sempre respeitado**; sem deep-link → **`/`** (Home, qualquer perfil; Módulo Gestor/Central Executiva removidos em `e87d763`). A mesma regra vale para sessão já autenticada no `constructor`.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AuthService` | `login()`, `iniciarVerificacaoPeriodica()`, `pararVerificacaoPeriodica()` | Login + verificação periódica de sessão |
| `TokenStorageService` | `setUsuario()`, `setAccessToken()` | Armazena token + usuário em memória |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/auth/login` | `AuthService.login()` | Autentica e retorna accessToken + user |
| POST | `/api/v1/auth/refresh` | `AuthService.refreshTokenSingleFlight()` | Renova token via cookie |

### Banco de Dados
- **Conecta:** ❌ Não (backend consulta `TBOPERADOR` + `RefreshTokens`)

### Dependências Externas
- `auth.interceptor.ts` (com `withCredentials: true`)
- `auth.guard.ts` (protege rotas, refresh silencioso)
- Cookie `cc_refresh` (HttpOnly)

### Observações Técnicas
- Cookies: `cc_refresh` (4h com "Lembrar acesso" ou sessão), `cc_lembrar`
- Acess token: **somente em memória** (não usa `localStorage`)
- Verificação periódica: a cada 5 min, `verificarSessao()` → refresh ou logout
- Sessão após 4h: refresh falha → logout automático com mensagem
- `sessionStorage` flag `sessaoExpirada` para mensagem no login
- **Destino pós-login (`resolverDestino`, `login.component.ts`):** `returnUrl` diferente de `'/'`/vazio → retorna o próprio `returnUrl`; senão → `'/'` (Home; `e87d763`)

---

## 3. Home

### 3.1 `HomeComponent`

**Componente:** `src/app/features/home/home.component.ts` (+ `.html`/`.scss`)

### O que faz
Página inicial: saudação com primeiro nome (`Bom dia/Boa tarde/Boa noite, {nome}`), campo real **"Buscar na Central..."** com resultados locais no próprio Hero, 6 acessos rápidos (com contador de atalhos) e agenda real dos próximos 7 dias (com badge de data). Os blocos "Continue de onde parou" / "Mais utilizados" foram removidos em 2026-09-18.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AuthService` | `getCurrentUser()` | Primeiro nome da saudação |
| `AgendaService` | `listarEventos(inicio, fim)` | Compromissos reais da janela agora → +7 dias (top 5) |

A Home não injeta `BuscaService` diretamente; o `GlobalSearchComponent` filho coordena a origem `home` com a mesma sessão usada pelo Header.

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/agenda/eventos?inicio=X&fim=Y` | `AgendaService.listarEventos()` | Agenda de 7 dias da Home (falha → `catchError(() => of([]))`, lista vazia honesta) |

### Banco de Dados
- **Conecta:** ❌ Não (via backend da Agenda)

### Dependências Externas
- `RouterLink` para atalhos
- `GlobalSearchComponent` standalone (`origem="home"`, `variante="home"`)

### Observações Técnicas
- **Busca local:** o painel é renderizado abaixo do input da Home, compartilha a consulta com o Header e respeita o estado de origem única descrito na seção 1.5
- **6 acessos rápidos** (`ACOES`, `home.component.ts:18-25`): Resolver um problema (`/trilhas/resolver`) · Banco de Dados (`/database`) · Acessos das Empresas (`/ferramentas/acessos`) · Fraseologias (`/fraseologia`) · Implantação (`/implantacao`) · Cursos (`/cursos`)
- Estados vazios honestos: "Você ainda não navegou pela Central..." (recentes) e "Sem estatísticas ainda..." (utilizados); agenda vazia → "Nenhum compromisso nos próximos 7 dias"