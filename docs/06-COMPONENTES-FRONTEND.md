---
title: "06 — Componentes e arquitetura do frontend"
description: "Estrutura, roteamento, componentes standalone, serviços, autenticação, design system e fluxos de dados do frontend Angular."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# 06 — Componentes e arquitetura do frontend

> Documento derivado do working tree em 2026-09-25. A fonte factual é o código de `frontend/src`; documentação de telas não foi usada para determinar componentes, rotas ou serviços. Não foram executados build, testes ou QA de navegador.

## Índice

1. Escopo e fontes
2. Runtime e organização
3. Bootstrap e provedores
4. Roteamento
5. Features e status de uso
6. Componentes standalone
7. Serviços do frontend
8. Autenticação, guards e interceptor
9. Design system
10. Fluxos de dados
11. Recursos removidos e código dormente
12. Limitações atuais e riscos confirmados
13. Incertezas remanescentes

## 1. Escopo e fontes

| Fonte | Papel factual |
|---|---|
| [`frontend/package.json`](../frontend/package.json) | Angular 18, SSR, RxJS, Bootstrap, ng-bootstrap e Chart.js |
| [`frontend/angular.json`](../frontend/angular.json) | Builder application, browser, server, assets e estilos globais |
| [`frontend/tsconfig.json`](../frontend/tsconfig.json) | Aliases `@core`, `@layout`, `@shared`, `@features` e `@env` |
| [`frontend/src/main.ts`](../frontend/src/main.ts) | Bootstrap do `AppComponent` no navegador |
| [`frontend/src/main.server.ts`](../frontend/src/main.server.ts) | Bootstrap SSR |
| [`frontend/src/app/app.routes.ts`](../frontend/src/app/app.routes.ts) | Rotas raiz e guards |
| [`frontend/src/app/features.routes.ts`](../frontend/src/app/features.routes.ts) | Rotas da área autenticada principal |
| [`frontend/src/app/features/admin/admin.routes.ts`](../frontend/src/app/features/admin/admin.routes.ts) | Rotas administrativas |
| [`frontend/src/app/features/implantacao/implantacao.routes.ts`](../frontend/src/app/features/implantacao/implantacao.routes.ts) | Rotas lazy de Implantação |
| [`frontend/src/app/features/database/database.routes.ts`](../frontend/src/app/features/database/database.routes.ts) | Rotas lazy do Database Explorer |
| [`frontend/src/styles.scss`](../frontend/src/styles.scss) | Bootstrap parcial, tokens, temas claro/escuro e escala global |

O código não usa `backend/src/...`; esta documentação descreve somente o frontend do monorepo.

## 2. Runtime e organização

### 2.1 Stack e bootstrap

| Item | Estado no código |
|---|---|
| Framework | Angular 18 com componentes standalone e router |
| Renderização | Browser + SSR/hydration |
| Reactive state | RxJS, `BehaviorSubject` e signals Angular |
| HTTP | `HttpClient` com `withFetch()` e interceptor funcional |
| UI base | Import parcial de Bootstrap SCSS |
| Componentes interativos | `NgbModule` e modais/serviços do ng-bootstrap |
| Tipografia | Fontes carregadas no [`frontend/src/index.html`](../frontend/src/index.html) |
| Ícones | Bootstrap Icons carregado por CDN no `index.html` |
| Charts | Chart.js 4 é dependência declarada; o uso fica nos componentes de gráficos |

O `bootstrapApplication` usa o mesmo `AppComponent` no browser e no servidor. A configuração de servidor mescla [`app.config.ts`](../frontend/src/app/app.config.ts) com `provideServerRendering()` em [`app.config.server.ts`](../frontend/src/app/app.config.server.ts).

### 2.2 Árvore lógica de `frontend/src/app`

| Área | Responsabilidade | Exemplos |
|---|---|---|
| raiz | Bootstrap, outlet, rotas e configuração | `app.component.ts`, `app.routes.ts`, `app.config.ts` |
| `core` | Estado singleton, autenticação, guards, interceptor e modelos compartilhados | `core/services`, `core/guards`, `core/interceptors` |
| `layout` | Shell da aplicação e componentes persistentes | `main-layout`, `header`, `sidebar`, `breadcrumb`, `footer` |
| `shared` | Componentes, diretiva, configuração, utilitários e metadados reutilizáveis | `PageHeaderComponent`, `GlobalSearchComponent`, `header-nav.config.ts` |
| `features` | Módulos funcionais e sub-rotas | `home`, `agenda`, `implantacao`, `database`, `admin` |
| `features/services` | Serviços de acervos locais consumidos por features | `acessos.service.ts`, `cursos.service.ts`, `ferramentas.service.ts` |

### 2.3 Aliases TypeScript

| Alias | Destino |
|---|---|
| `@core/*` | `src/app/core/*` |
| `@layout/*` | `src/app/layout/*` |
| `@shared/*` | `src/app/shared/*` |
| `@features/*` | `src/app/features/*` |
| `@env/*` | `src/environments/*` |

O TypeScript usa `strict`, `strictTemplates`, `noImplicitReturns` e `noPropertyAccessFromIndexSignature`.

## 3. Bootstrap e provedores

[`app.config.ts`](../frontend/src/app/app.config.ts) registra:

| Provedor | Efeito confirmado |
|---|---|
| `provideZoneChangeDetection` | Coalescência de eventos de change detection |
| `provideRouter(appRoutes)` | Router com as rotas raiz |
| `provideClientHydration()` | Hydration do HTML SSR no cliente |
| `provideAnimations()` | Animações Angular |
| `provideHttpClient(withFetch(), withInterceptors(...))` | Fetch HTTP e `authInterceptor` |
| `importProvidersFrom(NgbModule)` | Provedores do ng-bootstrap |

[`AppComponent`](../frontend/src/app/app.component.ts) contém apenas um `router-outlet`. No navegador, ele observa `NavigationEnd` e alterna a classe `scaled` no elemento `<html>`:

- todas as URLs navigadas recebem escala de 80%;
- `/login`, sem string de consulta, fragmento ou barra final, permanece em 100%;
- a remoção da escala ocorre no servidor, pois o código só chama `document` no browser.

## 4. Roteamento

### 4.1 Rotas raiz

| URL | Configuração | Proteção |
|---|---|---|
| `/login` | `LoginComponent` | Pública |
| `/` | `MainLayoutComponent`, com `featuresRoutes` como filhos | `authGuard` |
| `/admin` | `AdminLayoutComponent`, com `adminRoutes` como filhos | `authGuard` + `adminGuard` |
| qualquer URL não mapeada | redirect para `/` | Não há tela de 404 dedicada |

### 4.2 Rotas da área principal

Todas as linhas abaixo herdam `authGuard` do shell em `/`.

| URL | Componente ativo |
|---|---|
| `/` | `HomeComponent` |
| `/ferramentas` | `FerramentasComponent` |
| `/ferramentas/detalhe/:id` | `FerramentaDetalheComponent` |
| `/ferramentas/acessos` | `AcessosComponent` |
| `/ferramentas/faq` | `FaqComponent` |
| `/stack` | `StackComponent` |
| `/agenda` | `AgendaComponent` |
| `/cursos` | `CursosComponent` |
| `/cursos/detalhe/:id` | `CursoDetalheComponent` |
| `/trilhas/resolver` | `TrilhasComponent` |
| `/trilhas/sql` | `TrilhaSqlComponent` |
| `/trilhas/rede` | `TrilhaRedeComponent` |
| `/trilhas/infra` | `TrilhaInfraComponent` |
| `/visao-adm` | `VisaoAdmComponent` |
| `/visao-adm/detalhe/:id` | `VisaoAdmDetalheComponent` |
| `/fraseologia` | `FraseologiaComponent` |
| `/conhecimento` | `ConhecimentoSetorComponent` |
| `/modelo-chamados` | `ModeloChamadosComponent` |
| `/politica` | `PoliticaComponent` |
| `/empresa/onboarding` | `OnboardingHomeComponent` |
| `/empresa/onboarding/capitulo/:id` | `OnboardingCapituloComponent` |

`implantacao` e `database` usam `loadChildren`; as demais telas são carregadas com `loadComponent`.

### 4.3 Rotas administrativas

Todas as linhas abaixo herdam `authGuard` e `adminGuard` do shell em `/admin`.

| URL | Componente/redirect |
|---|---|
| `/admin/cadastros/tipos-projeto` | `TiposProjetoComponent` |
| `/admin/cadastros/tipos-projeto/novo` | `TipoProjetoFormComponent` |
| `/admin/cadastros/tipos-projeto/editar/:id` | `TipoProjetoFormComponent` |
| `/admin/kanban` | `KanbanComponent` |
| `/admin/tarefas` | `TarefasComponent` |
| `/admin/projetos` | `ProjetosComponent` |

O layout administrativo tem um outlet próprio e não reutiliza `MainLayoutComponent`.

### 4.4 Rotas de Implantação

| URL | Componente/redirect |
|---|---|
| `/implantacao/dashboard` | `DashboardComponent` |
| `/implantacao/kanban` | `KanbanComponent` |
| `/implantacao/projetos` | `ProjetosComponent` |
| `/implantacao/projetos/novo` | `ProjetoFormComponent` |
| `/implantacao/projetos/:id/editar` | `ProjetoFormComponent` |
| `/implantacao/projetos/:id` | `ProjetoDetalheComponent` |
| `/implantacao/tarefas` | `TarefasComponent` |
| `/implantacao/tarefas/novo` | `TarefaFormComponent`; aceita `?projetoId=` e `?tarefaId=` |
| `/implantacao/tarefas/:id/editar` | `TarefaFormComponent`; o Projeto não é alterável |

A ordem de `projetos/:id/editar` antes de `projetos/:id` faz a rota de edição ser reconhecida antes do detalhe paramétrico.

`TarefaFormComponent` resolve o modo pelo snapshot da rota: `:id/editar` entra em edição, `/novo` permanece em create e, ainda em create, `?tarefaId=` carrega o detalhe da tarefa como formulário de duplicação (o `id` não é adotado, portanto o envio continua sendo `POST`). `?projetoId=` apenas pré-seleciona o projeto. A duplicação é disparada por `KanbanComponent.duplicarTarefa`.

### 4.5 Rotas de Database

| URL | Componente/redirect |
|---|---|
| `/database/visao-geral` | `DbVisaoGeralComponent` |
| `/database/explorador` | `DbExploradorComponent` |
| `/database/relacionamentos` | `DbRelacionamentosComponent` |
| `/database/consultas` | `DbConsultasComponent` |
| `/database/diferencas` | `DbDiferencasComponent` |
| `/database/configuracao` | `DbConfiguracaoComponent` |
| `/database/tabela/:schema/:tabela` | `TableDetailComponent` |

As seis primeiras telas são hijas de `DatabaseShellComponent`. O detalhe de tabela é lazy e fica fora do shell.

### 4.6 Redirects ativos

| Origem | Destino | Regra no router |
|---|---|---|
| `/ferramentas/contra-senha` | `/ferramentas` | `pathMatch: full` |
| `/ferramentas/modelos` | `/modelo-chamados` | `pathMatch: full` |
| `/whatsapp-flow` | `/fraseologia` | `pathMatch: full` |
| `/empresa` | `/empresa/onboarding` | `pathMatch: full` |
| `/implantacao` | `/implantacao/dashboard` | `pathMatch: full` |
| `/implantacao/relatorio` | `/implantacao/dashboard` | `pathMatch: full` |
| `/implantacao/agenda` | `/agenda` | `pathMatch: full` |
| `/database` | `/database/visao-geral` | `pathMatch: full` |
| `/database/query-builder` | `/database/consultas` | redirecionamento de um segmento |
| `/admin` | `/admin/cadastros` | `pathMatch: full` |
| `/admin/cadastros` | `/admin/cadastros/tipos-projeto` | `pathMatch: full` |
| `/**` | `/` | redirect global |

A rota comentada `/administrativo` em [`features.routes.ts`](../frontend/src/app/features.routes.ts) não está registrada. O mesmo `KanbanComponent` continua ativo em `/implantacao/kanban` e `/admin/kanban`.

## 5. Features e status de uso

| Diretório em `features` | Status confirmado |
|---|---|
| `acessos` | Ativa por `/ferramentas/acessos` |
| `admin` | Ativa por `/admin`; contém um componente de dashboard sem rota |
| `agenda` | Ativa por `/agenda` |
| `auth` | Ativa por `/login` |
| `chat` | Ativa sem URL própria; `JotaWidgetComponent` é incorporado ao `MainLayoutComponent` |
| `conhecimento` | Ativa por `/conhecimento` |
| `cursos` | Ativa por `/cursos` e detalhe |
| `database` | Ativa por `loadChildren` em `/database` |
| `empresa` | Ativa por `/empresa/onboarding` e capítulos |
| `faq` | Ativa como filha de `/ferramentas/faq` |
| `ferramentas` | Ativa por lista e detalhe |
| `fraseologia` | Ativa por `/fraseologia` |
| `home` | Ativa na rota `/` |
| `implantacao` | Ativa por `loadChildren` em `/implantacao` |
| `modelo-chamados` | Ativa por `/modelo-chamados` |
| `politica` | Ativa por `/politica` |
| `services` | Ativa como camada de serviços de acervos locais |
| `stack` | Ativa por `/stack` |
| `trilha-infra` | Ativa por `/trilhas/infra` |
| `trilha-rede` | Ativa por `/trilhas/rede` |
| `trilha-sql` | Ativa por `/trilhas/sql` |
| `trilhas` | Ativa por `/trilhas/resolver` e como composição de `/conhecimento` |
| `visao-adm` | Ativa por lista e detalhe de procedimentos |

## 6. Componentes standalone

Os componentes Angular localizados declaram `standalone: true`; não há componente de aplicação com `standalone: false`. Não existe um `NgModule` que declare componentes da aplicação. `NgbModule` é importado como coleção de providers, não como declarations.

### 6.1 Componentes roteados

Os componentes roteados e suas URLs estão consolidados nas seções 4.2 a 4.5. `LoginComponent`, `MainLayoutComponent` e `AdminLayoutComponent` são os três componentes diretamente registrados nas rotas raiz.

### 6.2 Componentes internos, modais e dinâmicos

| Componente | Como entra em execução |
|---|---|
| `HeaderComponent`, `SidebarComponent`, `FooterComponent`, `BreadcrumbComponent` | Imports do `MainLayoutComponent` |
| `JotaWidgetComponent` | Import do `MainLayoutComponent`; ativo em todas as telas do shell principal |
| `GlobalSearchComponent` | Import de `HeaderComponent` e `HomeComponent` |
| `PageHeaderComponent` | Import em várias páginas e no shell do Database |
| `UsuarioDropdownComponent` | Import de `KanbanComponent` e `TarefaFormComponent` |
| `ChamadoDropdownComponent` | Import de `TarefaFormComponent` |
| `ProjetoCardComponent` | Import de `ProjetosComponent`; incorpora `ProjetoEtapaCardComponent` |
| `ProjetoEtapaCardComponent` | Componente interno de cards do Projeto |
| `ProjetoEtapaModalComponent` | Import e template de `ProjetoDetalheComponent` |
| `ProjetoRetornoDialogComponent` | Import e template de `ProjetoDetalheComponent` |
| `OnboardingSectionComponent` | Import de `OnboardingCapituloComponent` |
| `DbGlobalSearchComponent` | Import de `DatabaseShellComponent` |
| `DbQueryBuilderComponent` | Import de `DbConsultasComponent` |
| `DbSincronizacaoComponent` | Import de `DbDiferencasComponent` |
| `DbScriptsCorrecaoComponent` | Import de `DbSincronizacaoComponent` (aba de comparação) |
| `DbProceduresResultadoComponent` | Import de `DbSincronizacaoComponent` (modo procedures) |
| `AgendaEventoModalComponent` | `import()` dinâmico e `NgbModal.open` |
| `DbProcedureModalComponent` | `import()` dinâmico e `NgbModal.open` |
| `DbTriggerModalComponent` | `import()` dinâmico e `NgbModal.open` |

### 6.3 Componente existente sem rota ativa

`AdminDashboardComponent`, em [`admin-dashboard.component.ts`](../frontend/src/app/features/admin/pages/dashboard/admin-dashboard.component.ts), é standalone e consome `AdminDashboardService`, mas não aparece em `admin.routes.ts` nem foi encontrado em outro `imports`. Portanto, o arquivo e o serviço existem, mas o componente não é alcançável pela router config atual.

`JotaWidgetComponent` é o caso contrário: não tem rota, porém está ativamente montado pelo layout principal.

## 7. Serviços do frontend

Todos os serviços Angular de aplicação localizados usam `providedIn: 'root'`.

### 7.1 `core`

| Serviço | Responsabilidade | Dependências/estado |
|---|---|---|
| `AuthService` | Login, refresh single-flight, usuário, logout e estado de inicialização | `HttpClient`, `TokenStorageService`, `Router`; cookie HttpOnly |
| `TokenStorageService` | Access token e usuário somente em memória | Campos privados; sem local/session storage de token |
| `BuscaService` | Estado compartilhado de abertura, origem e consulta da busca | `BehaviorSubject` |
| `BuscaIndexService` | Índice local de páginas e acervos estáticos | Importa dados de ferramentas, cursos, SQL, procedimentos, utilitários, políticas e onboarding |
| `RecentesService` | Aprende rotas acessadas e ordena recentes/mais usados | `Router`, `NavigationEnd`, `localStorage` |
| `PapelUsuarioService` | Deriva `gestor` ou `operador` do perfil autenticado | `AuthService` |
| `OperadoresService` | Lista operadores ativos | `HttpClient`, `/agenda/operadores` |

### 7.2 Features

| Serviço | Responsabilidade | Fonte/dependências |
|---|---|---|
| `AcessosService` | Empresas, validação de senha e detalhe de acesso | API `/acessos` |
| `CursosService` | Lista, categorias, busca e detalhe | Arrays estáticos de `cursos-novos.data.ts` |
| `FerramentasService` | Lista, categorias, busca e detalhe | `ferramentas.data.ts` + `texto.helper.ts` |
| `ProcedimentosService` | Lista, busca por setor e detalhe | `procedimentos.data.ts` + `texto.helper.ts` |
| `UtilidadesService` | Busca, favoritos e estatísticas de uso | `utilidades.data.ts`, normalização e `localStorage` |
| `AgendaService` | CRUD, movimentação, lote, tipos, funções e operadores | API `/agenda`; delega operadores a `OperadoresService` |
| `ProjetosService` | CRUD de Projetos, cards, clientes, tipos e colunas; documentos por URL, sem upload binário | API `/implantacao/projetos` e serviços auxiliares |
| `TarefasService` | CRUD, Kanban, arquivamento, chamados, apontamentos e histórico | API `/implantacao/tarefas`; delega operadores |
| `DashboardService` | KPI e agregados do dashboard de Implantação | API `/implantacao/dashboard` |
| `ColunasKanbanService` | Leitura das colunas do Kanban | API `/implantacao/colunas-kanban` |
| `TiposProjetoService` | CRUD administrativo de tipos de Projeto | API `/implantacao/tipos-projeto` |
| `DatabaseService` | Metadados, busca, relações, procedures, triggers, query builder, comparação (schemas, bulk e procedures) e scripts de correção (`gerarScripts`, `gerarScriptsBulk`, `validarScript`, `compararProcedures`) | API `/database` |
| `JotaChatService` | Chat RAG e métodos de sessão/mensagens | `/api/rag-proxy`; ver seções 10.4 e 12 |
| `ChatContextoService` | Contexto da tarefa, abertura do widget e histórico por tarefa | Signals, `Subject`, `sessionStorage` |
| `AdminDashboardService` | Consulta do dashboard administrativo | API `/admin/dashboard`; somente o componente sem rota ativa o consome |

## 8. Autenticação, guards e interceptor

### 8.1 Armazenamento

| Item | Comportamento |
|---|---|
| Access token | Somente em `TokenStorageService.accessToken`, em memória |
| Usuário | Em memória no storage e propagado por `BehaviorSubject` em `AuthService` |
| Refresh token | Não é salvo pelo Angular; o backend o envia em cookie HttpOnly `cc_refresh` |
| Recuperação após F5 | O guard aguarda `authInitialized$` e o Angular chama `/auth/refresh` com credenciais |
| Persistência visual da expiração | `sessionStorage.sessaoExpirada`, somente uma flag de mensagem |

### 8.2 Fluxo de login

1. `LoginComponent` valida campos obrigatórios com Reactive Forms.
2. `AuthService.login()` envia `usuario`, `senha` e `lembrarAcesso` para `/auth/login`.
3. A resposta contém access token e usuário; o frontend ignora qualquer conteúdo de refresh token porque ele é gerenciado por cookie.
4. `persistSession()` guarda access token e usuário em memória e inicia a verificação periódica.
5. O login respeita `returnUrl`; sem deep link, navega para `/`.

### 8.3 Refresh e interceptor

[`auth.interceptor.ts`](../frontend/src/app/core/interceptors/auth.interceptor.ts):

1. aplica `withCredentials: true` a toda requisição;
2. não adiciona Bearer quando a URL contém `/auth/`;
3. nas demais, adiciona `Authorization: Bearer <access token>` quando disponível;
4. em resposta 401, chama `AuthService.refreshTokenSingleFlight()`;
5. com novo token, repete a requisição original uma vez; sem token, propaga o erro.

O refresh usa uma Promise compartilhada para impedir múltiplas renovações simultâneas. A tela de login não chama `GET /auth/me`; depois do refresh, o usuário vem no próprio corpo da resposta ou é reconstruído a partir das claims do JWT.

### 8.4 Guards

| Guard | Browser | Servidor/SSR |
|---|---|---|
| `authGuard` | Aguarda auth inicializada, aceita access válido ou tenta refresh; em falha manda para `/login` com `returnUrl` | Retorna `true`; a proteção real ocorre no cliente |
| `adminGuard` | Exige perfil `Administrador`; perfil não administrador vai para `/` | Retorna `true` |

A proteção de API continua sendo aplicada pelo backend JWT. No cliente, `isAuthenticated()` verifica somente presença do token e `exp`; assinatura, issuer e audience não são validados no navegador. `AuthService.hasRole()` também reconhece administrador e o perfil F em filtros de UI, mas `adminGuard` é estrito.

### 8.5 Logout e sessão expirada

`logout()` envia `POST /auth/logout` sem aguardar a resposta, limpa token/usuário em memória e navega para `/login`. Como o interceptor exclui todas as URLs `/auth/` do Bearer, essa chamada é feita apenas com credenciais/cookie, embora o endpoint exija JWT; o estado local é limpo independentemente da resposta. Define `sessionStorage.sessaoExpirada` quando há redirecionamento. A verificação periódica roda a cada cinco minutos; se o access token estiver expirado, encerra a sessão, e se ainda estiver válido, tenta renovar.

## 9. Design system

### 9.1 Fundamentos

[`styles.scss`](../frontend/src/styles.scss) importa apenas módulos Bootstrap usados: reboot, grid, containers, botões, alerts, nav, dropdown, badge, forms, modal e utilities. Ele define:

- variáveis de marca, superfícies, texto, bordas, erros, overlays, spinners e shadows;
- tokens `Space Grotesk`, `Inter` e `IBM Plex Mono`;
- raios `sm`, `md` e `lg`, ring de foco e tokens do “Console de operações”;
- tema claro no `:root` e tema escuro em `[data-theme='dark']`;
- utilitários compartilhados como `.eyebrow`, `.section-rail`, `.chip`, `.meta-mono` e a família `.adm-*`.

### 9.2 Shell e responsividade

| Camada | Comportamento |
|---|---|
| Header | Barra fixa no fluxo superior, busca central, menu de usuário e alternância de tema |
| Sidebar | 17,5 rem expandida, 4,5 rem recolhida, grupos configuráveis e indicador de papel |
| Conteúdo | Coluna flexível com scroll próprio, breadcrumb e outlet |
| Footer | Ano corrente, navegação e versão exibida |
| Página | `PageHeaderComponent` alinha título, descrição e ações projetadas |

O header usa skeleton durante a inicialização da autenticação. O shell principal e o administrativo são visualmente separados; o administrativo não usa sidebar.

### 9.3 Layout compacto de Projetos

[`projetos.component.scss`](../frontend/src/app/features/implantacao/pages/projetos/projetos.component.scss) implementa o layout vigente de Projetos:

| Elemento | Implementação |
|---|---|
| Grade | Filtros 15 rem, conteúdo flexível e resumo 16,5 rem; classes `sem-filtros`/`sem-resumo` removem colunas |
| Laterais | Começam abertas por signals; podem ser ocultadas e viram drawers fixos nos breakpoints de 1.400 px e 1.024 px |
| Lista | Projetos ativos no topo e concluídos abaixo; cartões em coluna vertical, de largura total |
| Cartão | [`projeto-card.component.scss`](../frontend/src/app/features/implantacao/components/projeto-card/projeto-card.component.scss) e [`projeto-etapa-card.component.scss`](../frontend/src/app/features/implantacao/components/projeto-etapa-card/projeto-etapa-card.component.scss) usam gaps, paddings e metadados compactos; a escala global ainda transforma `rem` em 80% fora do login |
| Responsivo | Em até 768 px, a página e os cabeçalhos de grupo reduzem padding e tipografia |

A fonte de dados da lista é `ProjetosService.listarComEtapas()`, portanto cada item carrega Projeto e seus nove cards em uma resposta composta.

### 9.4 Tema e escala

- `HeaderComponent` alterna `data-theme` em `document.documentElement` e persiste apenas `localStorage.theme`.
- `AppComponent` controla a classe `html.scaled`; a escala não depende do tema.
- Valores em `rem` acompanham a escala; bordas e sombras declaradas em pixels permanecem unidades absolutas, conforme o comentário e a implementação do stylesheet.
- A folha global também contém regras de impressão que ocultam header, sidebar e footer.

## 10. Fluxos de dados

### 10.1 Fluxo geral

```text
bootstrapApplication
  -> appRoutes
  -> authGuard
  -> MainLayout/AdminLayout
  -> componente standalone
  -> serviço root
  -> HttpClient + authInterceptor
  -> API
```

### 10.2 Sessão e dados assíncronos

- Componentes de formulário e páginas chamam serviços injetados.
- Serviços HTTP devolvem `Observable`; serviços locais devolvem arrays/síncrono ou observables conforme o caso.
- Páginas mantêm estado em signals, properties ou `BehaviorSubject` conforme o módulo.
- Falhas de APIs são tratadas localmente nos componentes; o interceptor apenas executa refresh/replay e não regra de negócio.
- Busca global e Home compartilham `BuscaService`; a fonte do índice é o bundle estático do frontend.

### 10.3 Busca e acervos locais

`BuscaIndexService` agrega páginas, ferramentas, cursos, trilhas, consultas SQL, procedimentos, utilitárias, políticas e capítulos de onboarding. A filtragem remove acentos, exige todos os termos com mais de um caractere e navega para a rota do resultado. Não há chamada de busca ao backend nesse fluxo.

### 10.4 JOTA

```text
KanbanComponent
  -> ChatContextoService
  -> JotaWidgetComponent
  -> JotaChatService
  -> POST /api/rag-proxy/chat
```

O contexto de tarefa é incorporado à mensagem e o histórico é mantido por tarefa em `sessionStorage`. A chamada usa a URL relativa `/api/rag-proxy`; em origens separadas, isso depende de reverse proxy ou URL absoluta. Quando o backend aciona o fallback padrão, a resposta recebida é **simulada**, embora o payload não traga marcador de origem. O widget está presente apenas no `MainLayoutComponent`; o shell administrativo não o inclui.

### 10.5 Database

`DatabaseShellComponent` carrega status e informações gerais. Páginas e componentes internos chamam `DatabaseService` para metadados, relações, busca, procedures, triggers, consultas geradas, comparação de schemas e de procedures e scripts de correção. O estado visual fica nos componentes; o serviço é a única porta HTTP do módulo.

`DbSincronizacaoComponent` executa a comparação em três modos — `Tabela única`, `Banco inteiro` e `Procedures` — e monta o resumo com **5 abas** (`ABAS_RELATORIO`/`abaDeCategoria`): `TABELAS FALTANTES` (somente no modo banco inteiro), `COLUNAS FALTANTES`, `TAMANHOS DIVERGENTES` (agrupa as categorias `Tipo` + `Nullable`), `ÍNDICES DIVERGENTES OU FALTANTES` e `CHAVES FK E PK DIVERGENTES E FALTANTES` (categorias `Fk` + `Pk`). Cada aba tem badge de contagem e a inicial é a primeira com contagem > 0 (`tabelas` no banco / `colunas` na tabela). Ao lado das abas ficam **2 cards fixos, sem filtro**: `compatíveis` (apenas contagem — `oks` na tabela única, `tabelasOk` no banco) e `match` (percentual); a severidade vira só cor de item. No modo banco inteiro os itens são achatados por aba com tag da tabela, e os chips (ok / com diferenças / só no arquivo / só no banco) aparecem dentro da aba `TABELAS FALTANTES`; os filtros/expanders antigos por severidade foram removidos (`filtro`, `filtroBulk`, `tabelaExpandida`). Itens `Ok` continuam fora das listagens e do CSV (somente contadores e %). O export CSV client-side traz as colunas `aba` e `numero` (numeração das críticas, local por tabela no banco inteiro) nos dois modos de schema. O componente também gera o script de exportação JSON (schemas — agora com o campo `pk` em cada tabela, com `FOR XML PATH` compatível com SQL Server 2005+) ou T-SQL de 1 linha por procedure (procedures) para o SSMS; no modo procedures há um script próprio (`scriptSqlProcedures`, com escaping de `\`, aspas, quebras de linha e tabs) e o CSV/ação de scripts fica indisponível. A geração de correção chama `gerarScripts`/`gerarScriptsBulk` **sem** corpo de opções.

`DbScriptsCorrecaoComponent` recebe o resultado da comparação (tabela única ou bulk) com `filtroSeveridade` fixo em `null` (o painel de scripts não é mais filtrado pela aba ativa) e expõe três abas (Criação, Alterações, Índices e FKs) com badges de contagem por aba, cards por script (severidade, badge de `tabela` no modo bulk, SQL com realce próprio, copiar, validar (estático) e consulta de verificação). Os scripts são somente criações vindas do arquivo (o banco JCA é a fonte da verdade), cada um com `severidadeOrigem` (usada pelo filtro interno quando `filtroSeveridade` não é nulo — hoje a tela principal envia `null`, então nenhum filtro é aplicado). O rodapé mostra resumo/impacto e `RevisaoManual`; as ações exportam o conjunto como arquivo `.sql` (Blob) ou copiam tudo. Não há checkboxes de backup/modo estrito (as opções saíram da UI). Ele é montado dentro de `DbSincronizacaoComponent` e limpa os scripts gerados sempre que a comparação muda.

`DbProceduresResultadoComponent` recebe `ProceduresComparisonResult` no modo procedures: chips de contagem por `status` (`Compativel`, `Divergente`, `SomenteBanco`, `SomenteArquivo`), pills de filtro por status, busca por nome e a listagem com os corpos lado a lado (lado único quando só existe um dos lados), botão copiar por lado com fallback `execCommand` e export CSV (`schema,nome,status,tamanhoJca,tamanhoArquivo`). Não há geração de scripts neste modo.

### 10.6 Formulário de Tarefa — Projeto e etapa do projeto

`TarefaFormComponent` mantém `projetoId` e `projetoEtapaId` em signals e resolve o contrato de etapa sem sair do componente:

- O campo **Etapa do projeto (card)** é renderizado nos dois modos. Sem projeto ele fica desabilitado, com placeholder "Selecione um projeto primeiro" (ou "Tarefa sem projeto" na edição) e a dica de que é preciso escolher um projeto; com projeto ele mostra o placeholder de carregamento, o de erro ou a lista das nove etapas. O `required` é condicional (`[required]="temProjeto()"`).
- `carregarEtapasFixas` zera lista e etapa antes de cada chamada, marca `etapasLoading` e usa um contador de requisição: a resposta só é aplicada quando a sequência e o `projetoId` ainda conferem, portanto trocar ou remover o projeto descarta respostas antigas, inclusive quando a resposta obsoleta chega por `error`.
- Estados separados: `etapasError` (falha de comunicação, mensagem `Não foi possível carregar as etapas do projeto.`) e `etapasVazia` (projeto sem nenhum card cadastrado, `Nenhuma etapa cadastrada para este projeto.`). Projeto sem etapas não vira erro de comunicação e, nos dois casos, `podeSalvar` fica falso porque a etapa obrigatória não existe.
- Recuperação: com projeto, erro e carga parada, o campo `podeTentarEtapas` exibe o botão **Tentar novamente**, que chama `tentarNovamenteEtapas` e repete o `GET` do mesmo projeto. Ele existe também na edição, onde o seletor de Projeto está desabilitado — é o único caminho de recuperação quando a carga inicial falha ali.
- Default com projeto, isolado em `escolherEtapaPadrao`: etapa preservada se pertencer à lista, senão `EmAndamento` → primeira não concluída → primeira disponível.
- Reuso: ao preencher o formulário (carga inicial, duplicação e retorno do `PUT`), `preencherFormulario` só chama `carregarEtapasFixas` quando o projeto mudou ou a lista ainda não foi carregada; com etapas em memória — inclusive o estado vazio já conhecido — reaproveita a lista e reaplica o default **sem novo `GET`**.
- `podeSalvar` exige etapa válida (presente na lista, sem erro e sem carregamento) sempre que há projeto; sem projeto, a etapa não é exigida.
- Payload: o create envia `projetoId` e `projetoEtapaId`; o update envia `projetoEtapaId` e **não** envia `projetoId`. O select de Projeto é desabilitado na edição, com a dica de que o projeto não pode ser alterado, e a Etapa permanece habilitada. Tarefa sem projeto não envia etapa alguma no create.
- Acessibilidade: o select recebe `aria-busy` durante o carregamento e `aria-describedby="etapaFixa-mensagem"` sempre que há mensagem; a mensagem tem `role="alert"` no erro e `role="status"` nos demais casos (carregando, vazio, sem projeto).
- Ciclo de vida: a assinatura de etapas usa `takeUntilDestroyed(this.destroyRef)`; a classe implementa `OnDestroy` para limpar o temporizador do toast.
- O comportamento é coberto por [`tarefa-form.component.spec.ts`](../frontend/src/app/features/implantacao/pages/tarefas/tarefa-form.component.spec.ts); a suíte não foi executada nesta revisão.

## 11. Recursos removidos e código dormente

### 11.1 Etapas Globais removidas

No working tree atual não existem componentes, serviços, tipos ou rotas administrativas de Etapas Globais. Também não foi localizada chamada ao endpoint global `/implantacao/etapas`.

Os únicos componentes de etapa do frontend são `ProjetoEtapaCardComponent` e `ProjetoEtapaModalComponent`. Eles trabalham com cards por Projeto e não devem ser confundidos com uma coleção global de etapas.

### 11.2 Outros itens sem uso roteado

| Item | Situação |
|---|---|
| `AdminDashboardComponent` | Arquivo existente, sem rota/import ativo |
| `AdminDashboardService` | Consumido apenas pelo componente acima |
| rota comentada `/administrativo` | Não registrada; o Kanban continua ativo em outras URLs |
| `environment.useMockAuth` | Campo existe como `false` nos dois ambientes, mas não é consultado pelo código |
| métodos de sessão em `JotaChatService` | Existem no frontend; o backend atual expõe somente `POST /api/rag-proxy/chat` |

## 12. Limitações atuais e riscos confirmados

Esta seção separa o que o código executa do risco que permanece no estado atual. Não é uma lista de práticas recomendadas.

| ID | Comportamento implementado | Limitação/risco atual |
|---|---|---|
| 1 | `AuthService.logout()` chama `POST /auth/logout`; o interceptor exclui URLs `/auth/` do Bearer. | O endpoint exige `[Authorize]`, portanto a chamada feita pelo frontend não leva o token; o estado local é limpo, mas a revogação/limpeza do cookie pode falhar, especialmente com access expirado. |
| 2 | `JotaChatService` usa `apiUrl = '/api/rag-proxy'`; o backend expõe `RagProxyController` nesse mesmo caminho sem versionamento. | O [`web.config`](../frontend/public/web.config) versionado contém somente o fallback da SPA, sem regra `/api`; em front e backend de origens distintas, há necessidade de reverse proxy ou URL absoluta. `RagProxyService` habilita fallback simulado por padrão; respostas nesse caminho são **simuladas**, embora hoje não carreguem marcador de origem. |
| 3 | `ProjetosController` e `TarefasController` exigem JWT; quando o cliente envia campos de autoria/responsável, os controllers preservam os valores não vazios e `TarefasController` só os substitui quando chegam vazios. | Não há autorização uniforme por proprietário ou papel (`role`) nas rotas; a autoria pode ser preenchida pelo cliente em vez de ser derivada da sessão. |
| 4 | O Kanban monta `TarefaAtualizarRequest` para edição inline e ações em lote, em vez de um PATCH dedicado. | Campos omitidos podem ser materializados como nulos pelo preenchimento do modelo e gravados pelo serviço; a edição inline envia `descricao: undefined`, a reatribuição não envia `colunaKanbanId`, `dataEntrega` nem `chamadoLegadoId`, e as ações em lote enviam título vazio, tipo/ordem zero e `bloqueada=false`. O comentário, o campo de alteração e o filtro “apenas minhas” usam identidade fixa `admin`. |
| 5 | O formulário de Agenda envia participantes e SLA no payload de atualização. | A edição pode limpar participantes/SLA conforme o backend; a verificação de conflito considera apenas o responsável, não todos os participantes. |
| 6 | O frontend consulta status, metadados, procedures, triggers e configuração do Database Explorer. | Os endpoints são protegidos apenas por JWT; podem revelar definições, e a conexão pode operar sem `Encrypt` conforme a configuração. |
| 7 | O modal de etapa carrega o detalhe, fecha pelo `NgbActiveModal` (inclusive em erro de carga), o pai recarrega os cards e o diálogo de retorno confirma uma chamada ao backend. | O retorno envia `usuarioAlteracao: 'admin'`; o upload cria `blob:` com `URL.createObjectURL` e persiste essa URL como documento, sem upload real. A URL é temporária e a exclusão de documento ainda é TODO no frontend. |
| 8 | Não há tipo, rota ou controller `Backup` no frontend; formulários e serviços possuem apenas validações específicas. | Não é possível afirmar um recurso de backup ou uma camada uniforme de validação sem código adicional; as validações documentadas são apenas as implementadas em cada tela/serviço. |
| 9 | `TarefaFormComponent` sempre exibe a etapa do projeto, a desabilita sem projeto, limpa lista e etapa ao trocar/remover o projeto, ignora respostas de etapas obsoletas, separa erro de comunicação de projeto sem etapas, oferece **Tentar novamente** e envia `projetoEtapaId` no create e no update; o Projeto fica desabilitado na edição. | Não há troca de projeto na edição: o `PUT` de Tarefa não transporta `projetoId` e o serviço mantém o projeto persistido, portanto mudar o projeto da tarefa exige sair do formulário. Caminho de recuperação previsto no componente: o botão **Tentar novamente** refaz a carga de etapas do mesmo projeto (inclusive na edição, com o Projeto desabilitado); para projeto sem etapas cadastradas não há recuperação, porque a etapa é obrigatória e o envio fica bloqueado. |

As limitações correspondentes no backend estão detalhadas em [`07-SERVICES-BACKEND.md`](./07-SERVICES-BACKEND.md).

## 13. Incertezas remanescentes

- Não foi executado build Angular nem teste de navegador; o documento comprova a configuração estática, não a renderização integrada.
- A suíte frontend tem cinco arquivos `*.spec.ts` e 31 casos, dos quais 12 no formulário de Tarefa; eles não foram executados nesta revisão, portanto a cobertura é um inventário do repositório, não um resultado. A classificação por história está em [`08-HISTORIAS-TELAS.md`](./08-HISTORIAS-TELAS.md).
- O estado do ambiente publicado e das migrações de banco não foi verificado.
- A disponibilidade e os resultados reais do Database Explorer, Google Sheets e AnythingLLM dependem da configuração e dos serviços externos em execução.
- Há duas constantes de versão com valores diferentes: `package.json`/`APP_VERSION` estão em 0.7.0, enquanto `APP_CONFIG.versao` está em 0.8.0. A intenção de versionamento não foi definida no código consultado.
- A intenção de produto para o `AdminDashboardComponent` sem rota não está registrada; não foi presumida uma correção.
- O backend expõe `GET /auth/me`, mas o frontend atual não o consome; os métodos de sessão do JOTA ainda não têm controller correspondente no backend, como detalhado em [`07-SERVICES-BACKEND.md`](./07-SERVICES-BACKEND.md).
