# Central de Operação — Aplicação Frontend (módulos)

> Extraído de `DOCUMENTACAO-COMPLETA.md` §7. Módulo Central Executiva e Módulo Gestor **removidos** do repo em 24/09/2026 (`e87d763`).

---

## 7. Aplicação Frontend (módulos)

| Módulo | Descrição |
|---|---|
| Autenticação | Login, guard de rotas, interceptor com `withCredentials: true` e **refresh token em cookie HttpOnly** (`cc_refresh`). Access token + usuário ficam **somente em memória**; após F5 ou 401, o refresh single-flight também **repopula o usuário** (`restaurarSessao`), mantendo o perfil do header visível. "Lembrar meu acesso" torna o cookie persistente por 4h. **Verificação periódica** (5 min) detecta expiração proativamente; logout por timeout exibe "Sessão expirada. Faça login para retornar à operação." no login |
| Layout | Header (nav Início / Fraseologias / Ferramentas / Acessos / Cursos, breadcrumb com `/agenda`, `/implantacao/*`, `/admin/*`, busca local compartilhada via `<app-global-search origem="header">` com placeholder **"Pesquisar qualquer conteúdo..."** e atalho `Ctrl+K`/`Cmd+K`, dropdown do usuário com BEM `user-nav__*`) + sidebar com 7 seções de links diretos (Início, Atendimento, Implantação, Ferramentas, Conhecimento, JCA, Administração; sem links JOTA, sem grupos em uso; Central Executiva removida) + JOTA flutuante (`<app-jota-widget>` no `MainLayout`: FAB + painel, proxy real, erro honesto) |
| Home | Saudação com primeiro nome, input local **"Buscar na Central..."** via `<app-global-search origem="home">` (painel próprio, sem foco no Header), 6 acessos rápidos, "Continue de onde parou"/"Mais utilizados" (`RecentesService`: `localStorage cc.recentes.v1`, `NavigationEnd`, partem vazios sem mock) + agenda real de 7 dias (`AgendaService.listarEventos`, top 5) |
| Busca / Recentes (core, sem backend) | `GlobalSearchComponent` standalone, reutilizado pelo Header e Home, renderiza `combobox`/`listbox`, sugestões, zero resultados, navegação por clique/setas/Enter, `Escape`/`Tab` e shortcut do Header; foco/click-outside/focusout com guard SSR, `preventScroll` e `prefers-reduced-motion`. `BuscaService` — sessão `{ aberta, origem: 'header' | 'home' | null, consulta }`, uma origem/um painel, consulta compartilhada e `buscaAberta$` booleano compatível. `BuscaIndexService.buscar(termo, limite = 8)` — índice local síncrono, multi-termo sem acento, com até 8 resultados. `RecentesService` — `recentes()`/`maisUtilizados()`/`mudancas$` |
| JOTA transversal | `JotaWidgetComponent` (`features/chat/jota-widget/`: FAB + painel em todo o `MainLayout`, `JotaChatService.chat()` → `POST /api/rag-proxy/chat` com `workspaceId: 'suporte'`; falha → "JOTA indisponível..."); página `/chat` **removida** em 24/09/2026 |
| Cursos | Catálogo de cursos por plataforma (Alura, YouTube, Curso em Vídeo, Microsoft Learn, Cisco, Fundação Bradesco, Postman Academy, Documentação/sites) e por área de conhecimento (9 trilhas), com detalhe e player embutido para YouTube. Canais/handles validados; cursos com canal inexistente foram removidos |
| Ferramentas | Central de utilidades, busca e filtro por categoria |
| Acessos | Cards de empresas, busca (controlada por `BuscaService`), modal de senha (aberto via `abrirSenhaModal()`, que fecha a busca com `buscaService.fecharBusca()` antes de abrir e garante **instância única** do modal — dismiss em `ngOnDestroy()`) → modal de detalhe; credenciais TS/Banco/VPN |
| Trilhas | "Como resolver esse problema?" (8 seções em acordeão, redesign `.tdh`), dicas de SQL / Rede / Infra — seção Atendimento da sidebar; Resolver tem filtro de seções (`secoesVisiveis()`), 3 exemplos rápidos (CTA `/chat` removido) |
| Visão ADM | Procedimentos administrativos por setor (Financeiro, RH, Comercial) com busca, detalhe e impressão + **Central de Utilidades** (favoritos, últimos utilizados, busca, categorias, grade/lista e contador de acessos) |
| Fraseologia | Fluxo de atendimento e fraseologias; copiar mensagem para área de transferência (clipboard API + fallback `execCommand`) |
| **Implantação / Projetos** | Gerenciador de **Projetos e Tarefas** com nove cards fixos por Projeto em `tbprojetoEtapa`; os cards são carregados por `ProjetosService.obterEtapasProjeto()`/`listarEtapasPadrao()`. O módulo de Etapas Globais e o de Equipes foram removidos; a API global não deve ser recriada. Código sequencial global `PRJ-0001` e dashboard com `porEquipe = Geral`. Ver [`implantacao.md`](./implantacao.md). |
| **Agenda** (MVP) | Calendário compartilhado com visões Dia/Semana/Mês, CRUD de eventos, tipos configuráveis, participantes, filtro por responsável, drag-drop para mover eventos. Rota `/agenda` (lazy loading), API `/api/v1/agenda`. Ver [seção 7.1](#71-módulo-agenda-mvp) |
| **Central Executiva** | **REMOVIDA** em 24/09/2026 (`e87d763`) — `features/executivo/` excluído; ver §7.2 (histórico) |

**Padrões e convenções:**
- Componentes **standalone**; rotas filhas em `wiki.routes.ts` (ex.: `/ferramentas/acessos` → `AcessosComponent`,
  além de `stack`, `cursos`, `trilhas/*`, `visao-adm`, `fraseologia`, `modelo-chamados` e `empresa/onboarding`).
- Dados de cursos ficam em `src/app/wiki/pages/cursos/cursos-novos.data.ts`
  (arrays por plataforma + `todosCursos`, categorias e trilhas). Para adicionar
  um curso, ver o `README.md`.
- **Persistência de sessão**: o refresh token fica **somente em cookie HttpOnly** no backend
  (`cc_refresh`; 4h com "Lembrar meu acesso" ou cookie de sessão). Access token e usuário ficam
  **em memória** no front, restaurados via **refresh silencioso** no guard após reload — o refresh
  também devolve o objeto `user`, repopulado por `restaurarSessao()` (perfil do header volta a
  renderizar). **Verificação periódica** (5 min) detecta expiração proativamente e redireciona para o
  login com mensagem de sessão expirada. Nada de credenciais em `localStorage` — o restante do
  `localStorage` (tema, favoritos/contador da Central de Utilidades) são preferências — **nunca**
  credenciais.
- Links externos usam `window.open()` (evita interferência do roteamento Angular).
- Logout usa `Router.navigate` (não `window.location.href`).
- Tema escuro via atributo `[data-theme="dark"]` no `body`.

---

### 7.1 Módulo Agenda (MVP)

**Visão geral:** Calendário compartilhado para as equipes de suporte, implantação e CIAA. Implementado como feature standalone em `/agenda` com API dedicada em `/api/v1/agenda`.

#### 7.1.1 Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **3 Visões** | Dia (24h), Semana (7 dias), Mês (grade calendário) |
| **CRUD Eventos** | Criar, editar, excluir, mover (drag-drop via PATCH `/mover`) |
| **Tipos de Evento** | Configuráveis via `CC_TipoEvento` (nome, cor hex, ativo) — seed sugerido em Development |
| **Participantes** | N:N evento ↔ operador (`CC_AgendaParticipante`) — responsável + participantes adicionais |
| **Filtro por Responsável** | Dropdown com operadores ativos (`TBOPERADOR.SeAtivo = 'S'`) |
| **Filtro por Função** | Dropdown com funções ativas que têm operadores ativos (`CC_Funcao` + `TBOPERADOR.SeAtivo = 'S'`, via `GET /funcoes`; `GET /eventos?...&funcaoId=N` filtra por `Operador.FuncaoId` via subquery) |
| **Escopo Meus/Geral** | Segmentado Meus (só eventos do operador logado — `responsavelEfetivo()` usa `AuthService.getOperadorLogado()` quando `escopo==='meus'` e nenhum Responsável selecionado) / Geral (`alternarEscopo('todos')` **limpa Responsável e Função** para não manter filtro fantasma no request); barra "Filtrando:" (`.ag-filtros-ativos`) com chips clicáveis de Responsável/Função para limpar |
| **Projeto Opcional** | Vinculação a `IMPL_Projeto` (código exibido no card) |
| **Evento Dia Inteiro** | Flag `DiaInteiro` renderiza no topo do dia (FÉRIAS força `true` como período simples com span via `cobreDia()`; TREINAMENTO/DAILY/REUNIÃO/ATENDIMENTO proíbem) |
| **Regras rígidas por tipo** | `RegraTipoEvento` no backend (`AgendaService.cs:185-203`) + espelho no modal (`regraFerias/regraComHorario/regraDiaUnico/regraPermitePadrao`, `aoAlterarTipo()` limpa repetição ao escolher Férias); FÉRIAS = período simples dia-inteiro com `DataFim.Date > DataInicio.Date` obrigatória ("defina a data de retorno"), sem repetição; modal mínimo (Título + Data início + Data fim retorno full-width + Responsável; linha "Dia inteiro" oculta, `diaInteiro` implícito forçado `true`); TREINAMENTO/DAILY = com horário + span + semanal/mensal; REUNIÃO/ATENDIMENTO = com horário + dia único; Pessoal/Outro/sem tipo = livres; violação → 400 `{ mensagem }` PT-BR (criar, atualizar e lote) |
| **Recorrência (lote)** | `POST /eventos/lote` (`AgendaCriarLoteRequest`: `dataRepeticaoFim*` + `padraoRecorrencia` 1=Diária/2=Semanal/3=Mensal, default 1); gera N ocorrências por padrão até a data fim e grava `Recorrente`/`PadraoRecorrencia` (`AGD_Recorrente`, `AGD_PadraoRecorrencia`); **Férias NÃO usa lote** (400 "não usa repetição") — é linha única com span; multi-dia em lote (N linhas) vale só p/ Treinamento/Daily; conflito validado por dia (409) |

#### 7.1.2 Frontend (`/agenda`)

**Componentes:**
- `AgendaComponent` (`features/agenda/agenda.component.ts`) — shell principal, grid temporal, navegação, modais
- `AgendaEventoModalComponent` (`features/agenda/agenda-evento-modal.component.ts`) — create/edit modal (lazy loaded)

**Services:**
- `AgendaService` (`features/agenda/services/agenda.service.ts`) — HTTP client tipado para `/api/v1/agenda`

**Models:** todos os DTOs (Request/Response) em `features/agenda/services/agenda.service.ts` (`models/agenda.model.ts` removido em 2026-09-14, era duplicata)

**Roteamento:** Lazy loading em `features.routes.ts:36-37`
```typescript
{ path: 'agenda', loadComponent: () => import('@features/agenda/agenda.component').then(m => m.AgendaComponent) }
```

**Sidebar:** Link "Agenda" com ícone `bi-calendar-week-fill` em `layout/sidebar/sidebar.component.ts:47`

**Correção visual (v0.8.0):** Adicionado `position: relative` ao `.agenda-shell` + limpeza de `.modal-backdrop` e `modal-open` no `ngOnDestroy` (evita overlay residual ao navegar).

**Estado vazio (sem overlay):** quando `!carregando() && eventos().length === 0`, exibe barra inline `.agenda-empty-inline` (`role="status"`) entre a legenda e a grade ("Nenhum evento no período..."); `.agenda-calendario` é sempre renderizado mesmo com `[]` (`agenda.component.html:61-66`); apenas `.agenda-loading` permanece como overlay absoluto transitório — o aviso não bloqueia cliques nas células (`agenda.component.scss:484-505`). Sem mudança em `agenda.component.ts` — `carregar()` e helpers `eventosDoDia`/`eventosPorHora` já tratam `[]`.

#### 7.1.3 Backend (`/api/v1/agenda`)

**Controller:** `Controllers/AgendaController.cs`
- `[ApiVersion("1.0")]`, `[Route("api/v{version:apiVersion}/agenda")]`
- `[Authorize]`, `[EnableRateLimiting("validacao")]` (5/min por usuário)

**Endpoints:**
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N` | Lista eventos no intervalo (filtros opcionais: responsável e/ou função) |
| GET | `/eventos/{id}` | Detalhe completo |
| POST | `/eventos` | Cria evento (regras por tipo + conflito; 400/409) |
| POST | `/eventos/lote` | Cria N ocorrências até `dataRepeticaoFim` por padrão (1/2/3; grava `Recorrente`/`PadraoRecorrencia`; conflito por dia; Férias rejeitada — não usa repetição) |
| PUT | `/eventos/{id}` | Atualiza evento (regras por tipo + conflito; 400/409) |
| DELETE | `/eventos/{id}` | Exclui evento |
| PATCH | `/eventos/{id}/mover` | Move evento (drag-drop) |
| GET | `/tipos` | Tipos ativos (`CC_TipoEvento`) |
| GET | `/operadores` | Operadores ativos para responsável/participantes |
| GET | `/funcoes` | Funções ativas com operadores ativos (`CC_Funcao` + `TBOPERADOR`) |

**Service:** `Services/Implantacao/AgendaService.cs` (`IAgendaService`)
- Validações: título obrigatório, data fim > início, tipo ativo, responsável ativo, participantes ativos (+ regras rígidas por tipo → 400)
- **Regras rígidas por tipo (`RegraTipoEvento`, `:185-203`):** `NormalizarNomeTipo()` (case/acentos-insensível) + `ObterRegraTipo()` + `ResolverRegraTipoAsync(tipoId)` (nome via `CC_TipoEvento`) + `AplicarRegraEventoUnico()`; FÉRIAS = período simples dia-inteiro (horas ignoradas, **exige `DataFim.Date > DataInicio.Date`**, 400 "defina a data de retorno"); TREINAMENTO/DAILY proíbem dia inteiro, exigem `DataFim`, permitem span + semanal/mensal; REUNIÃO/ATENDIMENTO proíbem dia inteiro, exigem `DataFim`, dia único (sem span); Pessoal/Outro/sem tipo livres; aplicadas em criar, atualizar e lote (`ArgumentException` → 400 `{ mensagem }` PT-BR); lote REJEITA Férias com span>0 ou padrão não-diário (400 "não usa repetição")
- **Lote (`CriarEventosLoteAsync`):** `PadraoRecorrencia` (`2 → Semanal`, `3 → Mensal`, demais → Diário), gera ocorrências por padrão até `dataRepeticaoFim` (`AddDays(1)/AddDays(7)/AddMonths(1)`), grava `Recorrente = dias.Count > 1` e `PadraoRecorrencia = recorrente ? padrao : Nenhuma`; conflito validado por dia; Férias fora do lote (linha única com span, render via `cobreDia()`); multi-dia em lote = N linhas só p/ Treinamento/Daily
- **Filtro por função:** `ListarEventosAsync(..., funcaoId?)` filtra por `Operador.FuncaoId` via subquery correlata (sem `Contains` local/OPENJSON); `ListarFuncoesAsync()` retorna funções ativas com operadores ativos, ordem por descrição
- **Conflito de horários (Fase 1):** `ValidarSemConflitoAsync()` chamada em `CriarEventoAsync`, `AtualizarEventoAsync`, `MoverEventoAsync` e por ocorrência em `CriarEventosLoteAsync`; sobreposição por `OperadorId` (`DataInicio < fimEfetivo && fimEfetivoExistente > inicio`, excluindo o próprio `id` em edição/mover); `FimEfetivo()`: `DataFim` informada, senão dia inteiro até `inicio.Date.AddDays(1)`, senão evento pontual (`fim = início`); `ObterConflitosAsync()` expõe a lista (uso interno, sem endpoint GET próprio); erro via `ConflictException` (`Code` + `List<AgendaResumo>`, padrão `CONFLICT_HORARIOS`) → controller retorna **409** `{ mensagem, conflitos, code }` em POST, POST `/lote`, PUT e PATCH `/mover`
- `ObterOperadorId()` via claims JWT (`NameIdentifier` / `sub`)

**Models:** `Models/Implantacao/`
- `AgendaItem.cs` — entidade principal (`IMPL_Agenda`), enums `AgendaTipo`, `AgendaVisibilidade`, `AgendaRecorrencia`
- `TipoEvento.cs` — `CC_TipoEvento`
- `AgendaParticipante.cs` — `CC_AgendaParticipante` (N:N)

**DTOs:** `Dtos/Implantacao/AgendaDtos.cs` — records `AgendaResumo`, `AgendaDetalhe`, `AgendaCriarRequest`, `AgendaAtualizarRequest`, `AgendaMoverRequest`, `AgendaCriarLoteRequest` (`+ dataRepeticaoFim*`, `padraoRecorrencia = 1`: 0/1=Diária, 2=Semanal, 3=Mensal), `AgendaLoteResponse` (`totalCriados`, `eventos`), `TipoEventoResponse`, `OperadorResumo`, `FuncaoResumo`, `AgendaParticipanteResponse`

**Banco de Dados:**
- `IMPL_Agenda` (AGD_) — eventos
- `CC_TipoEvento` — tipos configuráveis
- `CC_AgendaParticipante` — participantes (unique AgendaId+ParticipanteId)
- `TBOPERADOR` — responsável + participantes (coluna `FuncaoId` usada no filtro por função)
- `CC_Funcao` — funções do filtro Função (leitura; Agenda nunca escreve)
- `IMPL_Projeto` — projeto opcional

**Migration:** `20260911215943_AgendaV2_Ajuste` — adiciona `AGD_TipoId` FK, cria `CC_AgendaParticipante`, cria `CC_TipoEvento`
- **Fase 1 (2026-09-14):** `20260914144751_AgendaConflitoHorarios` — índice composto `IX_IMPL_Agenda_Operador_DataInicio_DataFim` em `IMPL_Agenda` (`AGD_OperadorId`, `AGD_DataInicio`, `AGD_DataFim`); script idempotente `Migrations/Sql/AgendaConflitoHorarios_Idempotente.sql` (**aplicação manual — deploy não aplica migrations**)
- **Frontend:** `agenda.service.ts` exporta `ErroConflito` (`{ mensagem, conflitos, code }`) + `AgendaCriarLoteRequest.padraoRecorrencia?`; `AgendaEventoModalComponent` trata 409 via `conflitos` signal + `extrairConflitos()`/`tratarErroSalvar()` (exibe `alert-warning` com a lista) e 400 exibindo `body.mensagem` no modal; regras por tipo espelhadas (`regraFerias/regraComHorario/regraDiaUnico/regraPermitePadrao`, `aoAlterarTipo()` força `diaInteiro = true` e limpa repetição ao escolher Férias), **Férias = formulário mínimo (Título* + Data início* + Data fim* retorno full-width `col-md-12` + Responsável*; sem horas, sem repetição; linha "Dia inteiro" oculta via `*ngIf="!regraFerias()"` — dia inteiro implícito, forçado `true` no payload),** Repetir oculto p/ Férias e p/ dia único, Data fim obrigatória com hint "Data de retorno (obrigatório). Dia inteiro, sem horário e sem repetição." p/ Férias, select de Padrão (Diária/Semanal/Mensal) quando há repetição em tipo permitido, validação Férias ("defina a data de retorno") isenta da regra "Para vários dias, use Repetir até" (só Treinamento/Daily); grade com `cobreDia()` p/ span dia-inteiro (Férias linha única)

#### 7.1.4 Segurança
- Access token em memória (4h), refresh token em cookie HttpOnly `cc_refresh` (4h, rotativo)
- Rate limiting `validacao` (5/min por usuário) em todos endpoints
- `[Authorize]` obrigatório
- Validação server-side em todas operações de escrita (inclui sem sobreposição de horários do responsável — 409)

#### 7.1.5 Política de Autorização (Owner + Admin)
**Regra:** **Dono (`OperadorId` == JWT `sub`) OU Administrador (`perfil` = "Administrador")** podem editar, excluir ou mover eventos. Criar permanece permissivo (pode criar para terceiros). Participantes são somente leitura.

| Endpoint | Regra de Autorização | Resposta se negado |
|----------|---------------------|-------------------|
| `PUT /eventos/{id}` (Atualizar) | `isAdmin || evento.OperadorId === usuarioId` | **403** `ForbiddenException` ("Sem permissão para alterar este evento") |
| `DELETE /eventos/{id}` (Excluir) | `isAdmin || evento.OperadorId === usuarioId` | **403** `ForbiddenException` |
| `PATCH /eventos/{id}/mover` (Mover) | `isAdmin || evento.OperadorId === usuarioId` | **403** `ForbiddenException` |
| `POST /eventos` (Criar) | **Permissivo** — pode criar para terceiros | — |

**Detalhes adicionais:**
- `AtualizarEventoAsync` também impede transferir responsabilidade para terceiro: se `request.ResponsavelId !== evento.OperadorId && !== usuarioId` → 403.
- `IsAdmin()` helper verifica claim `perfil` = "Administrador" (ou role `Administrador`).
- Nova exception `ForbiddenException` (`Exceptions/ForbiddenException.cs`) para respostas 403 padronizadas.

**Frontend (reflete a mesma política):**
- `AgendaComponent`: sinal `isAdmin` (computed → `auth.getCurrentUser()?.perfil === 'Administrador'`); método `podeEditar(e)` retorna `true` se `e.operadorId === usuarioLogado || isAdmin()`; cards recebem classe `.agenda-evento--somente-leitura` quando `!podeEditar(e)` (cursor not-allowed, opacity 0.75, grayscale 0.4); clique abre edição só se `podeEditar(e)`.
- `AgendaEventoModalComponent`: `@Input() isAdmin`, `@Input() somenteLeitura`; `salvar()`/`excluir()` fazem early return se `somenteLeitura`; exibe banner "Somente leitura: apenas o responsável X ou um administrador pode editar este evento"; inputs desabilitados; botões "Salvar"/"Excluir" ocultos; `tratarErroSalvar()` trata 403 → "Sem permissão para alterar este evento".

#### 7.1.6 Roadmap Agenda
- **v1.x (atual):** CRUD completo, 3 visões, tipos/participantes, drag-drop mover, **regras rígidas por tipo + recorrência Diária/Semanal/Mensal via lote** (com `Recorrente`/`PadraoRecorrencia` gravados; Férias fora do lote — período simples linha única com span via `cobreDia()`)
- **v2.x (futuro):** integração Google Calendar (OAuth + ICS), notificações, MCP server para Agente IA

---

### 7.2 Módulo Central Executiva (Dashboard Executivo) — ~~REMOVIDO~~

> **Status (2026-09-24):** **removido** do repo em `e87d763` — pasta `features/executivo/` excluída (rota já estava comentada antes). **Módulo Gestor** também excluído (`features/gestor/` + backend Gestor/4 endpoints); login sem deep-link → `/` (ver `telas/07-gestao.md` §§20–21).
> Conteúdo abaixo mantido como referência histórica para reativação futura.

**Visão geral (histórica):** Painel do Diretor para gestores (`Administrador`), que consolida Implantação, equipes e pontos críticos. **Nenhum endpoint novo no backend** — `ExecutivoDashboardService` (facade `forkJoin` com `catchError` por fonte) reutiliza 5 GETs existentes.

#### 7.2.1 Roteamento e autorização

- `features.routes.ts` — `path: 'executivo'` **comentado** (não carrega `executivo.routes`).
- `executivo.routes.ts` — `''` → `redirectTo: 'dashboard'`; `'dashboard'` → `ExecutivoDashboardComponent` (`title: 'Central Executiva'`).
- `admin.guard.ts` — sem sessão tenta refresh silencioso; `perfil !== 'Administrador'` → `'/'`; sem sessão válida → `/login?returnUrl=`.
- **Login (`login.component.ts`):** `resolverDestino()` — deep-link (`returnUrl` ≠ `'/'`/vazio) sempre respeitado; senão → **`/`** (Home; `e87d763`).
- **Sidebar:** item `/executivo` **removido** do menu (não há link na sidebar).

#### 7.2.2 Frontend (`/executivo/dashboard`)

**Arquivos:** `features/executivo/models/executivo.model.ts` · `features/executivo/data/modulos.registry.ts` · `features/executivo/services/executivo-dashboard.service.ts` · `features/executivo/pages/executivo-dashboard/` (`.ts`|`.html`|`.scss`)

| Bloco | Conteúdo (confirmado no código) |
|---|---|
| **Header (`app-page-header`, Lote B)** | `titulo="Painel do Diretor"`, `icone="bi-speedometer2"` (mantido), eyebrow removido; slot `actions` (`.executivo__controls`) com select de função + Limpar + Atualizar |
| **KPIs (6, clicáveis)** | total, em andamento (`?apenasEmAndamento=true`), concluídas (`?apenasConcluidas=true`), atrasadas (`?apenasAtrasadas=true`) → `/implantacao/tarefas`; bloqueadas → `/implantacao/kanban`; urgentes → `/implantacao/tarefas` |
| **Projetos em andamento (`projetosTop[]`, top 6)** | Cards com código, status (`corStatus()`/`rotuloStatus()`), badge "Atrasado" (`estaAtrasado()`), progresso, responsável, previsão; links Detalhe (`/implantacao/projetos/:id`) + Kanban (`/implantacao/kanban?projetoId=:id`) |
| **Kanban Total embutido** | `<app-implantacao-kanban>` (mesmo `KanbanComponent` da Implantação) + "Abrir em tela cheia" (`/implantacao/kanban`); SCSS anti-sobreposição (`overflow-x: auto`, `min-width: 0`, `ellipsis`/`overflow-wrap`) |
| **Gráficos (Chart.js)** | Barra "Tarefas por equipe" (top 6 funções: em andamento/atrasadas/concluídas) + doughnut "Panorama das tarefas" + linha "`N` projetos ativos · `N` atrasados · `N`h apontadas" |
| **Visão por módulo** | Implantação = real (`/implantacao/dashboard`, "`N` projetos ativos"); Financeiro = placeholder `emBreve` → `/visao-adm` ("Conteúdo interno · sem pendências operacionais"). Suporte/Compras/CRM removidos do `MODULOS_REGISTRY` (só módulos reais; novos voltam com entidade/endpoints próprios) |
| **Atenção imediata** | Bloqueadas (`/implantacao/kanban`), atrasadas (`/implantacao/tarefas?apenasAtrasadas=true`), urgentes (`/implantacao/tarefas`); vazio → "Tudo em dia" (`/implantacao/dashboard`) |
| **Tarefas críticas (até 6)** | Bloqueadas + urgentes não-bloqueadas por `dataPrevisao` (badge Bloqueada/Urgente, link Kanban) |
| **Próximas entregas (até 4) + agenda da semana (até 6, janela +7 dias)** | `geral.proximosPrazo[]` + `GET /agenda/eventos?inicio=agora&fim=+7d&funcaoId=N` |
| **Visão por equipe via `Funcao`** | Cards por função (`admin.funcoes[]` + `percentualConclusao` = concluídas/total; total, andamento, atrasadas, concluídas, progresso, até 3 responsáveis) |
| **Atalhos (6)** | Kanban Total, Kanban ADM (`/administrativo`), Agenda, Projetos, Cadastros, Admin (`/admin/dashboard`) |
| **Auto-refresh 30s** | `setInterval(() => carregar(true), 30000)` silencioso + botão Atualizar; timer e charts destruídos no `ngOnDestroy` |
| **Filtro por função** | `select` (Todas + `funcaoId`) no slot `actions` do header → `obter(funcaoId)`; `limparFiltro()` volta a `null` |

#### 7.2.3 Fontes de dados (reutilizadas, sem backend novo)

| Método | Rota | Uso na Central |
|---|---|---|
| `AdminDashboardService.obter(funcaoId?)` | `GET /api/v1/admin/dashboard?funcaoId=N` | Totais, `funcoes[]` (equipes), `atualizadoEm` |
| `DashboardService.obter()` (implantação) | `GET /api/v1/implantacao/dashboard` | Projetos ativos/atrasados, horas apontadas, `proximosPrazo[]` |
| `ProjetosService.listar({})` | `GET /api/v1/implantacao/projetos` | `projetosTop[]` (top 6 ativos, atrasados primeiro) |
| `TarefasService.listar({})` | `GET /api/v1/implantacao/tarefas` | Bloqueadas (`bloqueada`), urgentes (`prioridade === 3`), críticas |
| `AgendaService.listarEventos(agora, +7d, undefined, funcaoId)` | `GET /api/v1/agenda/eventos` | Agenda da semana |

Status final local (`STATUS_FINAL`): `Concluida/Concluido/Cancelada/Cancelado`. `ResumoExecutivo` inclui `projetosTop: ProjetoResumo[]` (não-finais, atrasados primeiro, top 6). Registro enxuto: só Implantação (real) + Financeiro (placeholder → `/visao-adm`); novos módulos só entram em `MODULOS_REGISTRY` com entidade/endpoints próprios. O `KanbanComponent` lê `?projetoId` no `ngOnInit` (`ActivatedRoute`) para pré-selecionar o projeto (deep-link da Central Executiva).

---
