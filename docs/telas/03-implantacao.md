> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 13. Implantação / Projetos

### 14.1 `DashboardComponent` (Implantação)

**Componente:** `src/app/features/implantacao/pages/dashboard/dashboard.component.ts`

### O que faz
Dashboard KPIs da operação de implantação. Cards de totais (projetos/tarefas), próximos prazos com link para o projeto e 4 gráficos (status, features vs bugs, horas por tipo, top responsáveis). Estados de erro ("Tentar novamente" via `tentarNovamente()`) e vazios por gráfico (`temDadosStatus()`/`temDadosTipo()`). Desde 2026-09-12 (remoção do módulo Equipes) não há filtro por equipe: o endpoint retorna `porEquipe` com item único stub `Geral`.

**Seção "Produtividade" (fusão do Relatório, confirmado no código):** o antigo `RelatorioComponent` foi absorvido pelo Dashboard — pasta `pages/relatorio/` deletada, link "Relatório" removido do sidebar (`sidebar.component.ts:102-107`, seção Implantação só com Visão geral/Projetos/Kanban/Tarefas) e rota `implantacao/relatorio` virou `redirectTo: 'dashboard'` (`implantacao.routes.ts:42-44`, sem mudança de backend). O Dashboard tem no header um **filtro por projeto** (select "Todos os projetos" agrupado em optgroups Ativos/Concluídos, alimentado por `ProjetosService.listar({})`; recarrega KPIs + Produtividade); a seção Produtividade tem seletor de período com presets **Este mês | Próximo mês | Últimos 3 meses** (client-side), 4 stats (taxa de conclusão, tempo médio criação→conclusão em dias, % dentro do SLA, atrasadas) e 4 grids: Conclusões por dia (Chart.js, barras), Produtividade por pessoa (top 8 por concluídas, % da média com barra), Por prioridade (Baixa/Média/Alta/Urgente: concluídas de total) e Tarefas com atraso top 10 (link `['/implantacao/tarefas', t.id, 'editar']` + dias de atraso). Cálculo 100% client-side via `TarefasService.listar({ projetoId? })` (`linhasProd` → `recalcularProd()` filtra `dataInclusao` entre `intervaloPeriodoProd()` início/fim; série de conclusões itera os dias do período, máx. 100). **Botões CSV e Imprimir/PDF removidos (22/09/2026)** junto com `exportarCsv()`/`imprimir()`.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DashboardService` | `obter(projetoId?)` | KPIs e dados do dashboard (opcionalmente filtrados por projeto) |
| `ProjetosService` | `listar()` | Lookup de projetos do filtro do header (optgroup Ativos/Concluídos) |
| `TarefasService` | `listar()` | Base da seção Produtividade (tudo client-side, sem endpoint novo) |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/dashboard?projetoId=N` | `DashboardService.obter(projetoId?)` | KPIs agregados (`porEquipe` = stub `Geral`); `projetoId` opcional filtra projetos, tarefas, horas, apontamentos e próximos prazos no backend |
| GET | `/api/v1/implantacao/tarefas?projetoId=N` | `TarefasService.listar()` | Tarefas para cálculo client-side da Produtividade (filtro de período por `dataInclusao` no intervalo do preset; série de conclusões por `dataConclusao` dia a dia do período; atraso = `dataEntrega ?? dataPrevisao` passada e status ≠ Concluída/Cancelada) |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `IMPL_Projeto`, `IMPL_Tarefa`

### Dependências Externas
- `Chart.js` (gráficos de barras e donut)
- Design system: Space Grotesk, Inter, IBM Plex Mono

### Observações Técnicas
- Helpers `corEquipe()`/`corEquipeBg()` mantidos no componente, sempre chamados com `'Geral'` (stub pós-remoção de Equipes, 2026-09-12)
- `statusList` usa as chaves reais do enum `StatusTarefa` do backend (`Backlog, AFazer, EmAndamento, EmHomologacao, Concluida`); "Bloqueado" não é status (é a flag `Bloqueada`) e saiu do gráfico em 2026-09-18
- Charts aguardam os `<canvas>` via `agendarRenderCharts()` (retry, pois ficam dentro de `*ngIf`); erro de API vira `erro()` com mensagem por status (0/401/403) em vez de tela vazia
- KPIs em números grandes (2.5rem, Space Grotesk 800)
- IDENTIDADE CLEAN (21/09/2026, confirmado no código) + `app-page-header` (21/09/2026, confirmado no código): header via componente reutilizável `PageHeaderComponent` (`dashboard.component.ts` — `titulo="Visão Geral"`, `descricao="Acompanhe o progresso geral, métricas e o status consolidado do projeto."`, `icone="bi-bar-chart-fill"`; slot `actions` com select de projeto em optgroups Ativos/Concluídos; **CSV/Imprimir removidos em 22/09/2026**); overrides inline antigos removidos; título com `<i class="bi bi-bar-chart-fill">`, sem emoji
- **Produtividade (fusão do Relatório):** sinais `periodoProd` (`'ultimos-3-meses'` default; presets `'este-mes' | 'proximo-mes' | 'ultimos-3-meses'`)/`linhasProd`/`totalProd`/`concluidasProd`/`taxaProd`/`tempoMedioProd`/`slaProd`/`pessoasProd`/`porPrioridadeProd`/`atrasadasProd`/`evolucaoProd`; seletor de período no cabeçalho da seção (`.imp-dashboard__prod-controls`); métodos `aoMudarPeriodoProd()`/`recalcularProd()`/`intervaloPeriodoProd()`/`renderGraficoProd()`/`diasAtraso()`/`barraPessoa()`/`aoMudarProjeto()`; `FormsModule` importado para os `ngModel`; gráfico de evolução (`#evolucaoChart`, barras Chart.js, `temEvolucao()` para empty state) com `destroy()` antes de recriar; série = dias do intervalo do preset (até 100) por `toDateString()` de `dataConclusao`
- Container `section.adm-page.imp-dashboard` com `padding: 1.5rem` (`dashboard.component.ts:374-376`), alinhando o offset do título ao padrão Kanban/Projetos (2.5rem da borda do cartão)

---

### 14.2 `KanbanComponent`

**Componente:** `src/app/features/implantacao/pages/kanban/kanban.component.ts`

### O que faz
View Kanban com drag-and-drop (`@angular/cdk`), colunas configuráveis, reordenamento de tarefas entre colunas, criação rápida inline por coluna ("Adicionar tarefa" → form com título*, descrição, prioridade 1–4, data de entrega*, responsável via `app-usuario-dropdown` e projeto pré-preenchido com o filtro atual, com validação inline `erroNovaTarefa` e estado `criandoTarefa`), menu do cartão (⋮), drawer de detalhe com comentários, edição inline e ações em lote. Integração Kanban↔Tarefas: mover no Kanban persiste via `PATCH /tarefas/{id}/coluna` (com ajuste de `Status` por nome da coluna, exigência de `motivoBloqueio` na coluna BLOQUEADO e sincronização com a Agenda via `SincronizarAgendaAsync`); edição/inline/bulk preservam campos via `obter()` + `requisicaoAtualizacao()`/`atualizarPreservandoCampos()`. **DnD corrigido (22/09/2026):** board usa `cdkDropListGroup` (antes `connectedTo` apontava para IDs `col-*` inexistentes, quebrando drag entre colunas); `onDrop()` atualiza o signal `tarefas` (mutação do array do computed não persistia), envia `motivoBloqueio` via `prompt` ao soltar em coluna com nome contendo BLOQUEAD, mostra `toastSucesso`/`toastErro` e reverte + `carregar()` no erro; **na sucesso, aplica `status`/`bloqueada`/`dataConclusao`/`colunaKanbanId`/`ordem` retornados pelo backend** (sincronia coluna↔status nos dois sentidos). Métricas/`isOverdue`/`slaInfo` usam o helper `ehAtrasada()` de `tarefa.model.ts` (regra única de atraso); drawer exibe prazo = `dataEntrega ?? dataPrevisao`. **Contador dinâmico (20/09/2026):** form inline com dropdown "Etapa do projeto (card)" (`novaTarefaProjetoEtapaId`, `etapasFixasCriacao` via `GET /projetos/{id}/etapas`, default = etapa `EmAndamento`, `NULL` = "Sem card (só totais)"); payload de criar/duplicar envia `projetoEtapaId` (`criarTarefa()` + fallback `t.projetoEtapaId ?? novaTarefaProjetoEtapaId`).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `TarefasService` | `listar()`, `obter()`, `criar()`, `atualizar()`, `mudarColuna()`, `excluir()`, `adicionarComentario()`, `listarEtapas()`, `listarOperadores()` | CRUD + movimento + comentários + lookups |
| `ProjetosService` | `listar()` | Filtro por projeto |
| `ColunasKanbanService` | `listar()`, `atualizar()` | Colunas, WIP, renomear/ocultar |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/tarefas` | `TarefasService.listar()` | Tarefas (filtros `projetoId`, `responsavelId`, `status`, `prioridade`, `buscar`, `apenasAtrasadas`, `apenasEmAndamento`, `apenasConcluidas`) |
| GET | `/api/v1/implantacao/tarefas/{id}` | `TarefasService.obter()` | Detalhe (base para edição preservando campos e para duplicar) |
| POST | `/api/v1/implantacao/tarefas` | `TarefasService.criar()` | Cria tarefa (inline por coluna e duplicação com `(cópia)`) |
| PUT | `/api/v1/implantacao/tarefas/{id}` | `TarefasService.atualizar()` | Atualização completa (`TarefaAtualizarRequest`, com `Status` opcional e `ChamadoLegadoId`) |
| PATCH | `/api/v1/implantacao/tarefas/{id}/coluna` | `TarefasService.mudarColuna()` | Move tarefa entre colunas (`colunaKanbanId`, `novaOrdem`) |
| DELETE | `/api/v1/implantacao/tarefas/{id}` | `TarefasService.excluir()` | Exclusão (unitária e em lote) |
| POST | `/api/v1/implantacao/tarefas/{id}/comentarios` | `TarefasService.adicionarComentario()` | Adiciona comentário (`autorId`, `texto`) |
| GET | `/api/v1/implantacao/projetos` | `ProjetosService.listar()` | Opções do filtro por projeto |
| GET | `/api/v1/implantacao/etapas` | `TarefasService.listarEtapas()` | Lookup de etapas (filtro opcional `projetoId`) |
| GET | `/api/v1/agenda/operadores` | `TarefasService.listarOperadores()` | Lookup de operadores |
| GET/PUT | `/api/v1/implantacao/colunas-kanban` | `ColunasKanbanService` | Colunas (renomear, WIP, ocultar) |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `IMPL_ColunaKanban`, `IMPL_Tarefa`, `IMPL_Projeto`

### Dependências Externas
- `@angular/cdk/drag-drop` (drag-and-drop)
- `ColunaKanban` (limite 8, 5 padrão seeded)

### Observações Técnicas
- Lazy loading em `implantacao.routes.ts:10`
- Colunas com `padrao = true` não podem ser excluídas
- Criação rápida inline por coluna (2026-09-18): form com título*, descrição, prioridade 0–3 (escala do backend `PrioridadeTarefa`), data de entrega*, responsável (validado contra `/agenda/operadores`) e projeto pré-preenchido; validação inline `erroNovaTarefa` + estado `criandoTarefa`
- Card com borda lateral por prioridade (`data-prioridade` 1–4), badge "Exibindo X de Y" com filtros ativos e SLA graduado (`slaInfo()`: vencida / vence hoje / vence amanhã / vence em Nd / sem prazo; usa `dataEntrega ?? dataPrevisao`)
- Botão "Perguntar ao JOTA sobre esta tarefa" no drawer (Corretor #1, via `ChatContextoService`)
- Faixa de métricas do quadro (Corretor #5): total, concluídas, atrasadas, urgentes abertas e sem responsável (`metricas()`)
- Seção "Responsáveis" no drawer com `app-usuario-dropdown` + "Salvar responsáveis" (Corretor #5, preserva demais campos via `atualizar()` + recarrega detalhe)
- Deep-link `?projetoId=X` (`kanban.component.ts:695-698`, via `ActivatedRoute.snapshot.queryParamMap` no `ngOnInit`): pré-seleciona o projeto no filtro (só aceita valor numérico `/^\d+$/`), usado pelos links "Kanban" de cada card de projeto da Central Executiva (`/implantacao/kanban?projetoId={id}`)
- IDENTIDADE CLEAN (21/09/2026, confirmado no código) + `app-page-header` (confirmado no código): header via componente reutilizável `PageHeaderComponent` (`kanban.component.ts:63-73` — `titulo="Kanban"`, `descricao="Visualize e mova tarefas entre colunas. Atualizações sincronizam com o backend."`, `icone="bi-kanban"`; slot `actions` com select de projeto no contêiner `.imp-kanban__controls`); CSS local de header `.imp-kanban__header` removido (sem ocorrência no frontend); título com `<i class="bi bi-kanban">`, sem emoji

### Fluxo de Persistência e Comunicação com o Banco de Dados

1. **Consulta e Renderização Inicial (SELECT)**
   - Ao acessar a tela, o frontend faz uma chamada GET à API `/api/v1/implantacao/tarefas`.
   - O backend executa consultas SQL (`SELECT`) com JOINs nas tabelas `IMPL_Tarefa`, `IMPL_Projeto`, `IMPL_ColunaKanban`, `IMPL_Etapa` para buscar as tarefas organizadas por coluna e renderizar o estado inicial do Kanban.
2. **Criação e Registro de Novos Dados (INSERT)**
   - O operador cria uma nova tarefa preenchendo os campos e aciona a confirmação.
   - A aplicação envia os dados via POST para `/api/v1/implantacao/tarefas`.
   - O banco grava os dados na tabela `IMPL_Tarefa` (`INSERT INTO ...`) com chaves estrangeiras para `ProjetoId`, `EtapaId`, `ColunaKanbanId`, `ResponsavelId`.

3. **Atualização e Alterações (UPDATE) — Drag & Drop**
   - A alteração do status, coluna ou fase das tarefas é realizada **exclusivamente arrastando e soltando os cards** na interface (listas conectadas via `cdkDropListGroup` no board).
   - Ao soltar um card, o frontend atualiza otimistamente o signal `tarefas` e dispara PATCH para `/api/v1/implantacao/tarefas/{id}/coluna` com `{ colunaKanbanId, novaOrdem, motivoBloqueio? }`; coluna de destino com nome contendo "BLOQUEAD" exige `prompt` de motivo antes do envio; sucesso mostra toast, erro reverte e recarrega.
   - O banco executa um `UPDATE` na tabela `IMPL_Tarefa`, atualizando as colunas `ColunaKanbanId`, `Ordem`, `Status` e `DataAlteracao`; valida coluna inexistente, limite WIP e motivo obrigatório para BLOQUEADO. **Mapa coluna→status (22/09/2026, `TarefaService.StatusDaColuna`):** `BACKLOG→Backlog`, `A FAZER→AFazer`, `HOMOLOG→EmHomologacao`, `DESENVOLVIMENTO/ANDAMENTO→EmAndamento`, `CONCLUID→Concluida` (seta `DataConclusao ??= Now`); sair de Concluida limpa `DataConclusao`; `BLOQUEADO` mantém o status + flag `Bloqueada`.

4. **Remoção ou Inativação (DELETE / Soft Delete)**
   - Ao remover uma tarefa, a aplicação executa um `DELETE` na tabela `IMPL_Tarefa` (remoção física), preservando o histórico via tabela de auditoria `IMPL_AuditoriaImplantacao`.

---

### 14.3 `ProjetosComponent`

**Componente:** `src/app/features/implantacao/pages/projetos/projetos.component.ts`

### O que faz
Lista vertical agrupada de projetos (LAYOUT 3 COLUNAS, 20/09/2026 — substitui o layout vertical agrupado full-width; antes grid 2 colunas de 19/09/2026): header via `app-page-header` (componente reutilizável `PageHeaderComponent`, 21/09/2026 — espelho do Kanban, sem CSS local de header: `titulo="Projetos"`, `descricao="Gerencie a lista de projetos, datas de entrega e atribuições da equipe."`, `icone="bi-folder2-open"`, `projetos.component.ts:17-32`; busca só na sidebar, sem busca no header) + `.imp-layout` com aside filtros + seção conteúdo + aside resumo. Header: título + descrição fixa, slot `actions` com Filtros/Resumo/Novo Projeto (toggles `filtrosAbertos`/`resumoAberto`); eyebrow "TAREFAS & PROJETOS" e linha de subtítulo removidos; headers/CSS antigos locais removidos (só o contêiner `.imp-header__actions` do slot permanece, `projetos.component.scss:219`). Aside filtros (server-side via `listarComEtapas`): busca textual, status (select), responsável (select via signal `responsavelId()` com opção "Meus projetos" mapeada p/ operador logado via `AuthService.getOperadorLogado`), período vencimento de/até (client-side sobre `dataPrevisao`), ordenar, botão Limpar que reseta tudo; seção conteúdo com abas [Todos|Ativos|Concluídos|Atrasados] (`abaGrupo`) + dois grupos colapsáveis (Ativos no topo, Concluídos embaixo) mantidos; aside resumo com Análise rápida, Próximos vencimentos (top 5), Etapas atuais (por 1ª etapa não-concluída) e Meus projetos (com atalho "Ver meus projetos"). Signals `filtrosAbertos`/`resumoAberto` com toggles no header (`toggleFiltros()`/`toggleResumo()`). Código em mono (`PRJ-XXXX`, sequencial global via `GET /projetos/proximo-codigo`), progresso, meta com responsável e prazo. Ponto de entrada da Fase 2 (working tree): navega para `/implantacao/projetos/novo` (create) e `/implantacao/projetos/:id/editar` (edit); o detalhe (`/implantacao/projetos/:id`) expõe editar/excluir. **Backend: sem mudança (seções 17/18 inalteradas — nenhum endpoint novo/alterado; filtros usam `listarComEtapas`/`listarOperadores` existentes).**

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `ProjetosService` | `listarComEtapas()`, `listarOperadores()` | Lista projetos com etapas para a tela (filtros server-side `status`, `buscar`, `responsavelId`; ordenação client-side via `projetosOrdenados`; período vencimento de/até client-side sobre `dataPrevisao`) + lookup de operadores p/ filtro de responsável |
| `AuthService` | `getOperadorLogado()` | Resolve o operador logado p/ opção "Meus projetos" (`__MEUS__` → `meuId()`) e contador `meusProjetos()` |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/projetos` | `ProjetosService.listar()` | Lista projetos (`tipo`, `status`, `clienteId`, `responsavelId`, `buscar`) |
| GET | `/api/v1/implantacao/projetos/{id}` | `ProjetosService.obter()` | Detalhe do projeto |
| GET | `/api/v1/implantacao/projetos/proximo-codigo` | `ProjetosService.obterProximoCodigo()` | Gera próximo código sequencial global (`{ codigo: "PRJ-XXXX" }`, prefixo fixo `PRJ`) |
| GET | `/api/v1/implantacao/projetos/clientes` | `ProjetosService.listarClientes()` | Lookup de clientes ativos **de `tbcliente`** (`ClienteResumo { id, nome, cnpj, ativo }`, `nome` = `FANTASIA`, ordem alfabética) |
| GET | `/api/v1/implantacao/tipos-projeto?apenasAtivos=true` | `ProjetosService.listarTipos()` | Lookup de tipos (`TipoProjetoResumo { id, codigo, nome, clienteObrigatorio, ordem, ativo }`) |
| GET | `/api/v1/agenda/operadores` | `ProjetosService.listarOperadores()` | Lookup de operadores (`OperadorResumo { id, nome, email }`) |
| GET | `/api/v1/implantacao/colunas-kanban?apenasAtivas=true` | `ProjetosService.listarColunasKanban()` | Lookup de colunas Kanban ativas |
| POST | `/api/v1/implantacao/projetos` | `ProjetosService.criar()` | Cria projeto (`ProjetoCriarRequest`; `400 { mensagem }` em validação) |
| PUT | `/api/v1/implantacao/projetos/{id}` | `ProjetosService.atualizar()` | Atualização (`ProjetoAtualizarRequest` + `usuarioAlteracao`) |
| PATCH | `/api/v1/implantacao/projetos/{id}/status` | `ProjetosService.mudarStatus()` | Muda status (`ProjetoMudarStatusRequest`) |
| DELETE | `/api/v1/implantacao/projetos/{id}` | `ProjetosService.excluir()` | Exclusão (204; 404 se inexistente) |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `IMPL_Projeto`, `IMPL_TipoProjeto` + leitura de `tbcliente` (clientes, `FANTASIA` A–Z; `IMPL_Cliente` descontinuada como fonte)

### Dependências Externas
- `ProjetoService`
- Design system (cards, barramento)
- Código automático sequencial global (`PRJ-0001`, prefixo fixo `PRJ` em `ProjetoService.ProximoCodigoAsync()`)

### Observações Técnicas
- Lazy loading em `implantacao.routes.ts:14`
- Detalhe via `/implantacao/projetos/:id`
- Validação `clienteObrigatorio` por tipo de projeto

### Layout (LAYOUT 3 COLUNAS — 20/09/2026; substitui o layout vertical agrupado full-width; antes grid 2 colunas de 19/09/2026)
- Header via `app-page-header` (`PageHeaderComponent` reutilizável, 21/09/2026 — espelho do Kanban; `projetos.component.ts:17-32`): `titulo="Projetos"` com `<i class="bi bi-folder2-open">` à esquerda + `descricao` fixa ("Gerencie a lista de projetos, datas de entrega e atribuições da equipe."); estilo no `page-header.component.scss` (título 800 1.5rem, subtítulo 400 0.875rem, `min-height: 4.25rem`), sem CSS local de header (só o contêiner do slot `.imp-header__actions`, `projetos.component.scss:219`); busca só na sidebar (campo `#busca` no aside filtros, sem busca no header); ações Filtros/Resumo (`toggleFiltros()`/`toggleResumo()` com `aria-expanded`) + Novo Projeto (`[routerLink]="['novo']"`); sem eyebrow "TAREFAS & PROJETOS".
- `.imp-page--3col`: `max-width: none`, `padding: 1.5rem` (padrão Kanban, `projetos.component.scss:9-12`); `.imp-layout` grid `15rem minmax(0, 1fr) 16.5rem` (`scss:14-19`) com variações `.sem-filtros` (`1fr 16.5rem`), `.sem-resumo` (`15rem 1fr`) e `.sem-filtros.sem-resumo` (`1fr`); `align-items: start`, `gap: 1rem`; conteúdo `.imp-conteudo` (`min-width: 0`, coluna, `gap: 1rem`); sides `.imp-side` (`gap: 1rem`); lista vertical `.imp-projetos-lista--vertical` (`gap: 1rem`); abas/grupos com espaçamento `1rem` (`.abas-grupo`/`imp-grupo`/`grupo-header` com `margin-bottom: 1rem`).
- Asides `.imp-side` (filtros/resumo): card sticky (`top: 0.75rem`, `max-height: calc(100vh - 8rem)`, scroll próprio), `.fechado { display: none }`; header `.imp-side__head` com título + botão close (`toggleFiltros()`/`toggleResumo()`); toggles também no header da página (botões Filtros/Resumo com `aria-expanded`).
- Aside filtros (`.imp-side--filtros`): busca (`#busca`, server-side), status (select server-side), responsável (select server-side via `responsavelId()` + `operadores()` de `listarOperadores()`; opção `__MEUS__` "Meus projetos" resolvida p/ `meuId()` em `onResponsavel()`), período vencimento de/até (`type="date"`, client-side em `projetosOrdenados` sobre `dataPrevisao`), ordenar (recente/progresso/início/prazo/atrasados), Limpar (`limparFiltros()`: reseta status/busca/responsável/período/aba + `carregar()`).
- Aside resumo (`.imp-side--resumo`): 4 `stat-card` — Análise rápida (total/ativos/concluídos/atrasados), Próximos vencimentos (top 5 ativos por `dataPrevisao` com `dd/MM · código` + rótulo `rotuloDias()`), Etapas atuais (agrupado por 1ª etapa não-concluída via `etapaAtual()`), Meus projetos (contador por `responsavelId === meuId()` + atalho "Ver meus projetos" → `filtrarMeus()`).
- Responsivo: `<1400px` resumo vira drawer fixo (`right: 1rem`, `width: 17rem`, `z-index: 60`); `<1024px` filtros viram drawer fixo (`left: 1rem`) e grid colapsa p/ 1 coluna; bloco `.imp-filtros` (layout antigo) removido do SCSS de Projetos.
- Abas de grupo (`.abas-grupo`, `role="tablist"`): [Todos|Ativos|Concluídos|Atrasados] com contadores (`total()`, `ativos().length`, `concluidos().length`, `atrasados().length`), `role="tab"` + `aria-selected` (`projetos.component.ts:77-82`).
- Signals: `abaGrupo ('todos'|'ativos'|'concluidos'|'atrasados')`, `grupoAtivosAberto`, `grupoConcluidosAberto`; computeds `ativos/concluidos/atrasados/ativosFiltrados/concluidosFiltrados/mostrarGrupoAtivos/mostrarGrupoConcluidos` + `projetosOrdenados` (client-side: recente/progresso/início/prazo/atrasados).
- Regras de agrupamento: concluído = `projeto.status === 'Concluido'` (`ehConcluido()`); Cancelado/Bloqueado ficam em Ativos; atraso = alguma etapa com `atrasoDias > 0` (`temAtraso()`); aba Atrasados filtra `ativos()` com atraso; `mostrarGrupoAtivos = abaGrupo() !== 'concluidos'`, `mostrarGrupoConcluidos = todos|concluidos`.
- Group-headers (`projetos.component.ts:94-144`): `<button aria-expanded aria-controls>` colapsáveis (`toggleAtivos()/toggleConcluidos()`, chevron down/right, "Colapsar/Expandir"); Ativos gradiente azul `#0066cc→#004080`, Concluídos gradiente verde `#0ca30c→#089009` (`projetos.component.scss:138/144`); empty states por grupo ("Nenhum projeto ativo/concluído com este filtro").
- Listas verticais: `.imp-projetos-lista--vertical` (`display: flex; flex-direction: column; gap: 1rem; max-width: 100%; align-items: stretch`) — 1 coluna full-width; o grid legado `.imp-projetos-lista` (`repeat(auto-fit, minmax(31.25rem, 1fr))`) permanece no SCSS mas sem uso na tela.
- Card (`projeto-card.component.ts:115-121`, `.scss:30-58`): novo computed `estadoClasse()` → `is-concluido` / `is-atraso` / `is-atraso-critico` (quando `maxAtraso > 3`) + `is-atraso` / `is-ativo`; borda esquerda 4px por estado (ativo `#0066cc`, atraso `#e34948` + fundo `#fef2f2`, concluído `#0ca30c` + `opacity: .92`); animação `pulse-borda` 1.5s só no crítico, desligada com `prefers-reduced-motion`; progresso com gradiente `#0066cc→#0ca30c`. Estrutura do card inalterada: âncora clicável `[routerLink]="[projeto.id]"`, 9 etapa-cards em scroll horizontal, meta (responsável/prazo/`maxAtraso`) — sem botões Ver/Editar/Relatório.
- Card compacto mantido: `padding: 0.75rem 0.875rem`, `gap: 0.375rem`, `radius: 0.75rem`, título `1rem`; mini-cards de etapa `9rem`.
- Unidades em `rem` (escala junto com `html.scaled` 80%); bordas/hairlines em `px`.
- Build dev (`npx ng build --configuration development`) passou; warnings restantes são pré-existentes em `dashboard.component` (NG8102), não relacionados.

---

### 14.4 `ProjetoDetalheComponent`

**Componente:** `src/app/features/implantacao/pages/projetos/projeto-detalhe.component.ts`

### O que faz
Hero com código, título, progresso e breadcrumb back (hero do detalhe mantido na IDENTIDADE CLEAN 21/09/2026 — sem alteração); abas (Visão/Tarefas/Histórico); grid com detalhes e KPIs de tarefas. Fase 2 (working tree): hero com ações **Editar** (`/implantacao/projetos/:id/editar`) e **Excluir** (`confirm()` + `DELETE`, com estado `excluindo()` e `erroAcao()`); aba Tarefas com **Nova tarefa** (`/implantacao/tarefas/novo?projetoId=:id`), tabela com ação **Editar** por linha (`/implantacao/tarefas/:id/editar`) e badge de quantidade; aba Histórico em placeholder ("Em breve").

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `ProjetosService` | `obter()`, `excluir()` | Detalhe e exclusão do projeto |
| `TarefasService` | `listar()` | Tarefas do projeto (`TarefaFiltro { projetoId }`) |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/projetos/{id}` | `ProjetosService.obter()` | Detalhe do projeto (com `totalTarefas`, `tarefasConcluidas`, `tarefasAtrasadas`) |
| GET | `/api/v1/implantacao/tarefas?projetoId={id}` | `TarefasService.listar()` | Tarefas do projeto (aba Tarefas) |
| DELETE | `/api/v1/implantacao/projetos/{id}` | `ProjetosService.excluir()` | Exclusão via botão do hero (volta para `/implantacao/projetos`) |

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_Projeto`, `IMPL_Tarefa`, `IMPL_Etapa`, `IMPL_ColunaKanban`

### Dependências Externas
- `ProjetoService`, `TarefaService`
- Design system (hero gradiente, abas, grid 2 colunas)
- Barra de progresso com gradiente

### Observações Técnicas
- Lazy loading em `implantacao.routes.ts:18`
- Tarefas por coluna Kanban

---

### 14.5 `TarefasComponent`

**Componente:** `src/app/features/implantacao/pages/tarefas/tarefas.component.ts`

### O que faz
Grid de cards de tarefas com atalhos (Todas/Atrasadas/Em andamento/Concluídas), filtros (projeto via select + busca textual), contadores (total listadas + atrasadas/bloqueadas) e ações por card. IDENTIDADE CLEAN (21/09/2026, confirmado no código) + `app-page-header` (21/09/2026, confirmado no código): header via `PageHeaderComponent` reutilizável (`tarefas.component.ts:19-33` — `titulo="Tarefas"`, `descricao="Liste, filtre e acompanhe o detalhamento de todas as tarefas cadastradas."`, `icone="bi-list-check"`; slot `actions` com contêiner `.tar-header__stats` — badge de atrasadas + **Nova tarefa**; CSS local de header removido, só o contêiner do slot permanece em `tarefas.component.scss:9`); eyebrow "EXECUÇÃO" removido; atraso sinalizado com `<i class="bi bi-exclamation-triangle-fill">`, sem emoji. Fase 3 (working tree): header com **Nova tarefa** (`/implantacao/tarefas/novo`); cada card com **Editar** (`/implantacao/tarefas/:id/editar`) e **Excluir** (`confirm()` + `DELETE`, com `excluindoId()`); query param `?projetoId=` pré-seleciona o filtro de projeto (usado pelo detalhe do projeto); título do card linka para o projeto (`/implantacao/projetos/:projetoId`). **Toast pós-criação (22/09/2026):** `ngOnInit` lê `history.state.mensagem` (enviado pelo `TarefaFormComponent` via router state), exibe `.tar-toast` (estilo `tarefas.component.scss`, auto-dismiss 3s) e limpa o state com `history.replaceState` (guard `typeof history === 'undefined'` p/ SSR). **Atraso (22/09/2026):** `atrasada()` delega ao helper `ehAtrasada(t)` de `tarefa.model.ts` (regra única: prazo = `dataEntrega ?? dataPrevisao`; atrasada se prazo < hoje, exceto Concluída com `dataConclusao ≤ prazo`; Cancelada nunca conta); card exibe prazo = `dataEntrega ?? dataPrevisao`.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `TarefasService` | `listar()`, `excluir()` | Lista com filtros + exclusão |
| `ProjetosService` | `listar()` | Opções do filtro por projeto (`{ id, codigo, nome }`) |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/tarefas` | `TarefasService.listar()` | Lista tarefas (`projetoId`, `buscar`, `apenasAtrasadas`, `apenasEmAndamento`, `apenasConcluidas`) |
| DELETE | `/api/v1/implantacao/tarefas/{id}` | `TarefasService.excluir()` | Exclusão por card (remove da lista sem reload) |
| GET | `/api/v1/implantacao/projetos` | `ProjetosService.listar()` | Opções do select de projetos |

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_Tarefa`, `IMPL_Projeto`, `IMPL_ColunaKanban`, `IMPL_ComentarioTarefa`

### Dependências Externas
- `TarefaService`
- ID mono (T123)
- Atalhos de status
- Prioridade colorida por nível

### Observações Técricas
- Lazy loading em `implantacao.routes.ts:22`
- Rate limiting `validacao` (5/min por usuário) para escrita
- Container `.tar-shell` com `padding: 1.5rem` (`tarefas.component.scss:3-8`), alinhando o offset do título ao padrão Kanban/Projetos (2.5rem da borda do cartão)

---

### 14.6 `CadastrosComponent`

**Componente:** `src/app/features/implantacao/pages/cadastros/cadastros.component.ts`

### O que faz
3 abas (Tipos/Etapas/Colunas) com formulários inline e tabelas. CRUD completo para cadastros do módulo IMPLANTAÇÃO (aba Equipes removida em 2026-09-12 com o módulo Equipes).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `TipoProjetoService` | `listar()`, `criar()`, `atualizar()`, `excluir()` | CRUD tipos |
| `EtapaService` | `listar()`, `criar()`, `atualizar()`, `excluir()` | CRUD etapas |
| `ColunasKanbanService` | `listar()`, `criar()`, `atualizar()`, `excluir()`, `reordenar()` | CRUD colunas |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET/POST/PUT/DELETE | `/api/v1/implantacao/tipos-projeto` | `TipoProjetoService` | CRUD tipos |
| GET/POST/PUT/DELETE | `/api/v1/implantacao/etapas` | `EtapaService` | CRUD etapas |
| GET/POST/PUT/DELETE | `/api/v1/implantacao/colunas-kanban` | `ColunasKanbanService` | CRUD colunas |
| POST | `/api/v1/implantacao/colunas-kanban/reordenar` | `ColunasKanbanService` | Reordenar colunas |

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_TipoProjeto`, `IMPL_Etapa`, `IMPL_ColunaKanban`

### Dependências Externas
- 3 services de cadastro (`services/cadastros.service.ts`: `TiposProjetoService`, `EtapasService`, `ColunasKanbanService`)
- Models em `models/cadastros.model.ts` (`TipoProjetoResumo/Criar/AtualizarRequest`, `EtapaResumo/Criar/AtualizarRequest`, `ColunaKanbanResumo/Criar/Atualizar/ReordenarRequest` — sem Equipe)
- Formulários inline
- 13 etapas seeded (6 IMPL + 7 CIAA)
- 4 tipos de projeto seeded

### Observações Técricas
- Lazy loading em `implantacao.routes.ts:31`
- Seed em Development sem `IMPL_Equipe` (`TipoProjeto` sem `EquipeId`)
- Todas com `[Authorize]` + rate limiting `validacao`

---

### 14.7 `ProjetoFormComponent` (ver `projeto-form.component.ts`)

**Componente:** `src/app/features/implantacao/pages/projetos/projeto-form.component.ts` + `projeto-form.component.html`

### O que faz
Formulário create/edit de Projeto. `create` em `/implantacao/projetos/novo`; `edit` em `/implantacao/projetos/:id/editar` (detectado via `route.snapshot.paramMap.get('id')`). Código exibido `readonly` (sugerido via `obterProximoCodigo()`; o código efetivo é gerado no backend em `ProximoCodigoAsync()`). Validação client-side (`podeSalvar()`: nome ≥ 3, `tipoProjetoId` obrigatório, `responsavelId` obrigatório, `progresso` 0–100 no edit). Erros de lookup parcial exibem alerta ("Alguns dados auxiliares não puderam ser carregados..."). Sucesso navega para o detalhe (`/implantacao/projetos/:id`); cancelar volta para detalhe (edit) ou listagem (create).

### Lookups (paralelos via `Promise.allSettled`)
| Campo | Endpoint | Service |
|-------|----------|---------|
| Tipos de projeto | `GET /api/v1/implantacao/tipos-projeto?apenasAtivos=true` | `ProjetosService.listarTipos()` |
| Clientes | `GET /api/v1/implantacao/projetos/clientes` | `ProjetosService.listarClientes()` |
| Responsáveis | `GET /api/v1/agenda/operadores` | `ProjetosService.listarOperadores()` |
| Colunas Kanban | `GET /api/v1/implantacao/colunas-kanban?apenasAtivas=true` | `ProjetosService.listarColunasKanban()` |
| Próximo código | `GET /api/v1/implantacao/projetos/proximo-codigo` | `ProjetosService.obterProximoCodigo()` |

### Payloads
- **Create** → `POST /api/v1/implantacao/projetos` (`ProjetoCriarRequest`: `nome*`, `descricao?`, `tipoProjetoId*`, `clienteId?`, `clienteLegadoId?`, `responsavelId?`, `criadorId*` via `AuthService.getOperadorLogado()`, `colunaKanbanId?`, `prioridade`, `dataInicio?`, `dataPrevisao?`, `dataGoLivePrevista?`, `horasPlanejadas?`, `observacao?`).
- **Edit** → `PUT /api/v1/implantacao/projetos/{id}` (`ProjetoAtualizarRequest`: base do create + `status?`, `progresso?`, `dataConclusao?`, `dataGoLiveReal?`, `horasRealizadas?`, `usuarioAlteracao*`).
- **Status (edit):** `Backlog`, `AFazer`, `EmAndamento`, `Homologacao`, `Concluido`, `Bloqueado`, `Cancelado`.
- **Prioridades:** alinhadas ao enum do backend `PrioridadeProjeto` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`); backend rejeita fora do enum (`400 { mensagem: "Prioridade inválida" }`).

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_Projeto` (+ leituras `IMPL_TipoProjeto`, `tbcliente` — cliente via `FANTASIA` —, `TBOPERADOR`, `IMPL_ColunaKanban`); código `PRJ-XXXX` gerado server-side.

### Identidade (IDENTIDADE CLEAN 21/09/2026 + Lote B, confirmado no código)
- Header via `app-page-header` (`PageHeaderComponent` reutilizável, `projeto-form.component.html:2-11`): título dinâmico via binding (`[titulo]="titulo()"`, `computed` em `projeto-form.component.ts:77-78` → `isEdit() ? 'Editar Projeto' : 'Novo Projeto'`), `descricao` dinâmica (edit: "Atualize as informações do projeto" / create: "Preencha os dados para criar um novo projeto"), `icone="bi-file-earmark-plus"`; slot `actions` (`.imp-form-header-actions`) com Cancelar; CSS `.imp-form-header`/`.imp-form-title`/`.imp-form-subtitle` removido do scss (resta só o contêiner do slot; regra responsiva órfã `.imp-form-header` em `projeto-form.component.scss:189` sem elemento correspondente).

---

### 14.8 `TarefaFormComponent` (ver `tarefa-form.component.ts`)

**Componente:** `src/app/features/implantacao/pages/tarefas/tarefa-form.component.ts` + `tarefa-form.component.html`

### O que faz
Formulário create/edit **unificado** (22/09/2026): todos os campos **visíveis desde o início**, sem `*ngIf="isEdit()"`. `create` em `/implantacao/tarefas/novo` (aceita `?projetoId=`); `edit` em `/implantacao/tarefas/:id/editar` (pré-preenche via `obter()`). Validação client-side (`podeSalvar()`: título ≥ 3, `projetoId` obrigatório, `prioridade` 0–3, `ordem` ≥ 0, motivo obrigatório se `bloqueada`). **Após create:** navega para a lista `/implantacao/tarefas` com toast "Tarefa criada com sucesso" (router state); **após atualização:** permanece na tela de edição com toast de sucesso. **Seção 3 redesenhada (22/09/2026):** "Mais opções" (colapsável com botão) substituída por seção fixa **"Cronograma e acompanhamento"**, sem colapso, em 3 subcartões: **Prazos** (Previsão de Conclusão + Data de Conclusão Real, com hints), **Esforço** (Horas Estimadas + Ordem no quadro), **Bloqueio** (switch `.imp-form__switch` + Motivo via `@if (bloqueada())`, não mais input `disabled`). **Select Status removido do form** — status deriva da Coluna Kanban (hint "Define o status da tarefa no quadro"); signals `status`/`statusOptions`/`maisOpcoesAbertas` removidos; payload não envia mais `status`. Hints novos: Data de Entrega ("Prazo oficial — base do cálculo de atraso"), Previsão (estimativa interna), Conclusão Real (auto-preenchida), Ordem no quadro.

### Lookups (paralelos via `Promise.allSettled`)
| Campo | Endpoint | Service |
|-------|----------|---------|
| Projetos | `GET /api/v1/implantacao/projetos` | `ProjetosService.listar()` |
| Etapas | `GET /api/v1/implantacao/etapas` (`projetoId` opcional) | `TarefasService.listarEtapas()` |
| Colunas Kanban | `GET /api/v1/implantacao/colunas-kanban` | `ColunasKanbanService.listar()` |
| Responsáveis | `GET /api/v1/agenda/operadores` | `TarefasService.listarOperadores()` |

### Payloads
- **Create** → `POST /api/v1/implantacao/tarefas` (`TarefaCriarRequest`: `projetoId*`, `etapaId?`, `projetoEtapaId?`, `colunaKanbanId?`, `titulo*`, `descricao?`, `responsavelId?`, `criadorId*`, `prioridade`, `ordem`, `dataPrevisao?`, `horasEstimadas?`, `chamadoLegadoId?`, `chamadoIds?`, `dataConclusao?`, `bloqueada?`, `motivoBloqueio?` — **`status` não é mais enviado pelo form**, o backend deriva da coluna).
- **Edit** → `PUT /api/v1/implantacao/tarefas/{id}` (`TarefaAtualizarRequest`: `etapaId?`, `projetoEtapaId?`, `colunaKanbanId?`, `chamadoLegadoId?`, `chamadoIds?`, `titulo*`, `descricao?`, `responsavelId?`, `prioridade`, `ordem`, `dataPrevisao?`, `dataConclusao?`, `horasEstimadas?`, `bloqueada`, `motivoBloqueio?`, `usuarioAlteracao*`; **`horasRealizadas` removido** — horas realizadas só via apontamentos; **`status` não enviado** — sincronia coluna↔status no backend).
- **`buildRequest()` envia `chamadoIds`** (create e update) — corrige o bug em que os chamados relacionados selecionados no dropdown não persistiam (antes o N-N só era gravado via `ChamadoLegadoId`).
- **Form expõe:** projeto*, prioridade*, etapa, **etapa do projeto (card)** (`projetoEtapaId`, dropdown das 9 fixas via `GET /projetos/{id}/etapas`, default = `EmAndamento`, `NULL` = "Sem card (só totais)"), coluna Kanban (hint: define o status), responsável, **seção fixa "Cronograma e acompanhamento"** (Prazos: previsão + conclusão real; Esforço: horas estimadas + ordem no quadro; Bloqueio: switch + motivo via `@if`), lista de **chamados relacionados** (dropdown `chamadoIds`). **Removidos do form:** "Horas Realizadas", "Chamado Legado (ID)", **select Status** e a seção colapsável "Mais opções" (22/09/2026).
- **Backend:** `TarefaDetalhe.ChamadoLegadoId` (`TRF_ChamadoLegadoId`, FK lógica p/ `tbchamado.CHAMADO_ID`) presente em resumo/detalhe/create/update; `ChamadoIds` sincroniza o N-N (no update, lista enviada é fonte da verdade; no create, grava na criação); `Status` opcional no create e no update (`Enum.TryParse<StatusTarefa>`; `StatusTarefa`: `Backlog`, `AFazer`, `EmAndamento`, `EmHomologacao`, `Concluida`, `Cancelada`); prioridade validada via `Enum.IsDefined(typeof(PrioridadeTarefa))` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`) no create e no update (`400 { mensagem }` quando inválida).

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_Tarefa` (+ `IMPL_Projeto`, `IMPL_Etapa`, `IMPL_ColunaKanban`, `TBOPERADOR`, `IMPL_ComentarioTarefa` na leitura do detalhe).

### Identidade (IDENTIDADE CLEAN 21/09/2026 + Lote B, confirmado no código)
- Header via `app-page-header` (`PageHeaderComponent` reutilizável, `tarefa-form.component.html:2-11`): título dinâmico via binding (`[titulo]="tituloPagina()"`, `computed` em `tarefa-form.component.ts:98-99` → `isEdit() ? 'Editar Tarefa' : 'Nova Tarefa'`), `descricao` dinâmica (edit: "Atualize as informações da tarefa" / create: "Preencha os dados para criar uma nova tarefa"), `icone="bi-file-earmark-text"`; slot `actions` (`.imp-form-header-actions`) com Cancelar; CSS `.imp-form-header`/`.imp-form-title`/`.imp-form-subtitle` removido do scss.

### Observações Técnicas (Kanban↔Tarefas — Fase 3)
- **Menu do cartão (⋮):** Editar (→ `/implantacao/tarefas/:id/editar`), Comentar (abre o drawer), Duplicar (lê o detalhe e recria com `(cópia)`, preservando `etapaId`, `colunaKanbanId`, `chamadoLegadoId`, `prioridade`, `ordem + 1`), Mover de coluna, Excluir (com `confirm()`).
- **Drawer:** abre via `obter()`; exibe projeto/status/prioridade/responsável/previsão/horas/descrição; thread de comentários (`t.comentarios`) + `POST /tarefas/{id}/comentarios`; ações **Editar tarefa** e **Excluir**.
- **Edição inline (título F2, prioridade duplo clique, responsável):** valida prioridade 0–3; persiste via `obter()` + `PUT` com `requisicaoAtualizacao()` (preserva todos os demais campos, incluindo `chamadoLegadoId` e `status`).
- **Ações em lote:** mover (via `PATCH /coluna`), prioridade/responsável (via `atualizarPreservandoCampos()` + `PUT`, preservando campos), excluir (via `DELETE`); orquestradas com `forkJoin`.

### 14.4 `RelatorioComponent` — REMOVIDO (fundido no `DashboardComponent`, ver § 14.1)

**Status:** pasta `src/app/features/implantacao/pages/relatorio/` **deletada**; link "Relatório" **removido** do sidebar (seção Implantação só com Visão geral/Projetos/Kanban/Tarefas); rota `/implantacao/relatorio` mantida apenas como `redirectTo: 'dashboard'` (`implantacao.routes.ts:42-44`) para compatibilidade de bookmarks/deep-links. Sem mudança de backend.

**Onde está a funcionalidade agora:** seção "Produtividade" do Dashboard (`dashboard.component.ts` — seletor de período na seção com presets Este mês/Próximo mês/Últimos 3 meses; header da tela com filtro por projeto em optgroups; 4 stats: taxa de conclusão, tempo médio criação→conclusão, % dentro do SLA, atrasadas; grids Conclusões por dia via Chart.js, Produtividade por pessoa, Por prioridade e Top 10 atrasadas com link de edição). Cálculo client-side via `TarefasService.listar({ projetoId? })` (`periodoProd`/`linhasProd`/`recalcularProd()`/`intervaloPeriodoProd()`/`renderGraficoProd()`, `FormsModule` importado); botões CSV/Imprimir removidos em 22/09/2026. **Atraso:** `vencidaAberta()` delega ao helper `ehAtrasada(t)` de `tarefa.model.ts`. Histórico da implementação original (Corretor #8): relatório de SLA/produtividade calculado no frontend a partir de `GET /implantacao/tarefas` (sem endpoint novo), IDENTIDADE CLEAN 21/09/2026.

### 14.5 `AdminDashboardComponent` em abas (Corretor #2)

**Componente:** `src/app/features/admin/pages/dashboard/admin-dashboard.component.ts` (+ `.html`)

### O que faz
Gestão da Central (`/admin/dashboard`, só Administrador, refresh 30s) em 3 abas internas na mesma URL: **Visão Geral** (KPIs + filtro por função + cards por função), **Kanban** (`<app-implantacao-kanban>` embutido, sem navegar para `/admin/kanban` — a rota segue existindo para deep-link) e **Alertas** (com badge de contagem e botão "Ver Kanban" que troca para a aba Kanban). Corrigido em 2026-09-18: `GroupBy` sem agregação + `Contains` em lista capturada quebravam no banco de produção (compat 100). Header via `app-page-header` — Lote B (confirmado no código, `admin-dashboard.component.html:2-9`): `titulo="Dashboard Administrativo"`, `descricao="Indicadores administrativos da central, atualizados automaticamente."`, `icone="bi-speedometer2"`; meta de refresh ("Atualizado automaticamente a cada 30s", `.admin-dashboard__refresh`) no slot `actions`.

### 14.6 Jornada da implantação (Projeto → Etapas → Tarefas)

**Backend:** `IProjetoJornadaService/ProjetoJornadaService` + `GET /implantacao/projetos/{id}/jornada` → `{projetoId, etapas[{etapaId,nome,cor,ordem,totalTarefas,tarefasConcluidas,percentual,estado}], progressoGeral, etapaAtualId}`. Fluxo = etapas ativas do `TipoProjeto` do projeto + globais, na `Ordem` cadastrada (sem tabela nova). Estados derivados: `Concluida` (100% com tarefas), `EmAndamento` (primeira incompleta com tarefas), `Bloqueada` (anterior < 100%), `Pendente` (sem tarefas; vazia não bloqueia). Geral = média simples das etapas com tarefas (persistido em `PRJ_Progresso` via `RecalcularProgressoAsync`, chamado em criar/atualizar/mover/excluir/arquivar/desarquivar sem quebrar a operação em caso de falha).

**Regra:** tarefa com `ProjetoId` exige `EtapaId` do fluxo (400 `Etapa obrigatória...`/`Etapa não pertence ao fluxo...`); sem projeto, etapa opcional e campo oculto no form.

**Frontend:** `projeto-detalhe` tem a timeline de cards (cores/ícones por estado + % geral); clique navega para `/implantacao/kanban?projetoId=X&etapaId=Y` (chip removível no Kanban); `tarefa-form` exige etapa com projeto (select filtrado pelo fluxo via `GET /etapas?tipoProjetoId=`); Kanban exibe badge de etapa no card/drawer e exige etapa no criar inline; lista de tarefas mostra etiqueta de etapa. `GET /tarefas` aceita `?etapaId=`; `TarefaResumo` inclui `etapaId/etapaNome`.

### 14.6.1 Contador dinâmico de tarefas por etapa + transição automática (20/09/2026)

**Backend (confirmado no código):** `Tarefa.ProjetoEtapaId` (`TRF_ProjetoEtapaId`, FK NULL p/ `tbprojetoEtapa.PEP_Id`, `NO ACTION` — SQL Server barra múltiplos caminhos em cascata (IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa)) + nav `ProjetoEtapa`; relationship em `AppDbContext.cs` (bloco `Tarefa`); migration `20260920185734_TarefaProjetoEtapaId` (AddColumn + índice `IX_IMPL_Tarefa_TRF_ProjetoEtapaId` + FK + backfill SQL por nome conhecido, `HOMOLOGACAO→HOMOLOGAÇÃO`, demais `NULL`) + script manual `scripts/db/migracao-tarefa-projeto-etapa-id.sql` (idempotente); DTOs `TarefaResumo/Detalhe/Criar/Atualizar` com `ProjetoEtapaId(+Nome)`; `ProjetoEtapaResumo` com `TarefasTotal/TarefasConcluidas/Id` (GROUP BY em `ObterEtapasAsync`, excluindo arquivadas). `TarefaService.ValidarEtapaFixaAsync` (etapa fixa deve ser do mesmo projeto, senão `400 "Etapa do projeto inválida para esta tarefa"`); sets no Criar/Atualizar; includes + projeções em Listar/Obter; injeção de `IProjetoEtapaService`; `RecalcularJornadaAsync` chama `SincronizarEtapasPorTarefasAsync` após o recalc (cobre criar/atualizar/mover-coluna/concluir/arquivar/excluir) — `Projeto.Progresso` termina no fórmula-fixa. `ProjetoEtapaService.SincronizarEtapasPorTarefasAsync`: conta tarefas por linha fixa (`!Arquivada`, `ProjetoEtapaId`); sem tarefas não toca (manual/checklist intacto); com tarefas atualiza Percentual task-based; tudo-concluído + não-concluída → `Concluida` + `DataFimReal` + histórico "Conclusão automática por tarefas" + `DesbloquearProximaEtapaAsync` (reuso); etapa `Concluida` **completa** congela em 100; etapa `Concluida` **incompleta** (tarefa reabriu) → **reabre SÓ ela** (`EmAndamento`, % recalculado, `DataFimReal=null`, histórico "Reabertura automática por tarefas"; etapas posteriores intactas — 22/09/2026).

**Frontend (confirmado no código):** `projeto.model.ts` (`ProjetoEtapaResumo.tarefasTotal/tarefasConcluidas/id`) e `tarefa.model.ts` (`projetoEtapaId/projetoEtapaNome` em Resumo/Detalhe/Criar/Atualizar) estendidos; `projeto-etapa-card` (`projeto-etapa-card.component.ts`) mostra "X/Y tarefas" (`.etapa-tarefas`, tooltips `tooltipTarefas()`) quando há tarefas, senão checklist (`tooltipChecklist()`); `tarefa-form` e Kanban inline com dropdown "Etapa do projeto (card)" (default = `EmAndamento`, `NULL` = "Sem card (só totais)"); payloads enviam `projetoEtapaId`. Builds: dotnet 0 erros; `ng build` sem erros. Sem auto-migrate no startup — aplicar migration ou script SQL no servidor.
- IDENTIDADE CLEAN (21/09/2026, confirmado no código — remoção de emojis do visual, sidebar mantida): `projeto-etapa-card` com badge numérico CSS (`.etapa-numero`) + `<i class="bi bi-exclamation-triangle-fill">` no atraso (sem emoji); `projeto-etapa-modal` com badge de estado + ícones Bootstrap (`bi-check-lg`, `bi-check-circle-fill`, sem emoji); `projeto-retorno-dialog` sem o ✅ (lista de consequências com `bi-check-circle-fill`, aviso com `bi-info-circle-fill`); `db-diferencas` com labels em texto puro + dots CSS via `getBadgeClass()` (os cases `🟢🟡🔴` restantes são comparação do valor `badge` vindo da API, não exibição — o union type `'🟢' | '🟡' | '🔴'` em `database.model.ts:243` é contrato de dados). Restam só comentários HTML invisíveis.
