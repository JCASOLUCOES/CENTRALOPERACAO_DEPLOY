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

### 20.2 `ExecutivoDashboardService` + `MODULOS_REGISTRY` (Frontend)

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

