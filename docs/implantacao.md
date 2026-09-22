# Central de Operação — Módulo Implantação / Projetos

> Extraído de `DOCUMENTACAO-COMPLETA.md` §6.5. Fonte única do módulo de implantação.

---

## 6.5. Módulo IMPLANTAÇÃO / PROJETOS (v1.1.0)

Gerenciador de **projetos, tarefas e clientes**. Desde 2026-09-12 o módulo
**Equipes foi removido** (migration `20260912173928_RemoveEquipes`, Fases 2–3
de `PLANO-IMPLEMENTACAO-FASES.md`, deploy em produção 192.168.2.130 OK com
backup `Backup_IIS/20260912-163535`): não há mais filtro por equipe, e o
dashboard retorna `porEquipe` com item único stub `Geral`.

### 6.5.1. Entidades principais

| Entidade | Descrição |
|---|---|
| `IMPL_Cliente` | Cadastro de clientes (vinculado a implantações). |
| `IMPL_TipoProjeto` | `CLIENTE`, `CARTEIRA`, `INTEGRACAO` (cliente obrigatório); `PROJETO_CIAA` (cliente opcional). Sem `EquipeId` desde 2026-09-12. |
| `IMPL_Etapa` | Etapas configuráveis (vinculadas opcionalmente a um `TipoProjeto`). Ex.: KICKOFF, PARAMETRIZAÇÃO, GO LIVE; LEVANTAMENTO, DESENVOLVIMENTO, PUBLICAÇÃO. |
| `IMPL_ColunaKanban` | Colunas do Kanban. Padrão: BACKLOG, A FAZER, EM ANDAMENTO, HOMOLOGAÇÃO, CONCLUÍDO. Limite: 8 colunas. |
| `IMPL_Projeto` | Projeto principal. Tem `codigo` sequencial global (`PRJ-0001`, prefixo fixo `PRJ`). Sem `EquipeId` desde 2026-09-12. |
| `IMPL_Tarefa` | Unidade de execução dentro de um projeto. Tem status, prioridade, ordem, coluna Kanban, **tipo (Feature/Bug)**, **data de entrega**, **responsáveis N:N**, **apontamentos**, **etapa fixa do projeto (`TRF_ProjetoEtapaId` → `tbprojetoEtapa.PEP_Id`, NULL, `NO ACTION` — SQL Server barra múltiplos caminhos em cascata (IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa); migration `20260920185734_TarefaProjetoEtapaId` de 20/09/2026 + script `scripts/db/migracao-tarefa-projeto-etapa-id.sql`)**. |
| `IMPL_ComentarioTarefa` | Comentários / histórico da tarefa. |
| `IMPL_TarefaResponsavel` | Vínculo N:N tarefa↔operador (responsáveis múltiplos). PK: TRF_Id + OPERADOR_ID. |
| `IMPL_TarefaChamado` | Vínculo N:N tarefa↔chamado legado (`tbchamado.CHAMADO_ID`). PK: TRF_Id + CHAMADO_ID. |
| `IMPL_TarefaApontamento` | Apontamentos de horas (APT_Horas decimal(5,2)). Índice: IX on (TRF_Id, APT_Data). `TRF_HorasRealizadas` é **derivado** (SUM). |
| `tbchamado` (legado, somente-leitura) | Espelho `ChamadoLegado` (`CHAMADO_ID`, `CLIENTE_ID`, `TITULO`, `STATUS`, `DATA_PREVISAO`, `DATA_FECHAMENTO`); `ExcludeFromMigrations`, escrita proibida. |
| `tbfuncionario` / `tbcliente` (legado, somente-leitura) | Espelhos `FuncionarioLegado` / `ClienteLegado` (`FANTASIA` A–Z no dropdown); `ExcludeFromMigrations`. |

> **DTOs Detalhe (19/09/2026):** `TipoProjetoDetalhe`, `EtapaDetalhe` e
> `ColunaKanbanDetalhe` em `Dtos/Implantacao/TipoProjetoEtapaColunaDtos.cs`
> (Resumo + auditoria `UsuarioInclusao/DataInclusao/UsuarioAlteracao/DataAlteracao`);
> services `TipoProjeto/Etapa/ColunaKanban` retornam Detalhe em obter/criar/atualizar.

> **Removidas em 2026-09-12:** `IMPL_Equipe` (equipes `IMPLANTACAO`/`CIAA` com
> prefixo de código `IMP`/`CIAA`) e `IMPL_MembroEquipe` (vínculo N:N operador↔equipe).

> **Removidas em 2026-09-12:** `IMPL_Equipe` (equipes `IMPLANTACAO`/`CIAA` com
> prefixo de código `IMP`/`CIAA`) e `IMPL_MembroEquipe` (vínculo N:N operador↔equipe).

### 6.5.2. Tabelas IMPL_* necessárias no SQL Server de homolog

> ⚠️ **AÇÃO MANUAL NECESSÁRIA** — o `scripts/deploy/deploy.ps1` **não** aplica migrations.
> Em ambiente de homologação (192.168.2.154 / dbBUSINESS_HML), criar
> manualmente as tabelas abaixo antes de subir o backend para a v1.1.0.
> Os scripts DDL estão em `backend/Central_BackEnd/Migrations/20260904194350_ImplantacaoInit.cs`
> (método `Up`) ou podem ser gerados via
> `dotnet ef migrations script --idempotent -o ImplantacaoInit.sql`.
> **Em 2026-09-12** a migration `20260912173928_RemoveEquipes` removeu
> `IMPL_Equipe`/`IMPL_MembroEquipe` e as colunas `PRJ_EquipeId`/`TPP_EquipeId` —
> bancos provisionados pelo script antigo precisam aplicar essa migration
> (ou remover manualmente esses objetos).
> **Incidente 2026-09-14 (homolog .154):** o script idempotente original recriava
> `FK_IMPL_Projeto_IMPL_TipoProjeto` com `ON DELETE CASCADE` e foi rejeitado pelo
> SQL Server (**erro 1785/1750 + 3902**, múltiplos caminhos CASCADE — `Etapa→TipoProjeto`
> já é `Cascade`). Correção confirmada no código: `AppDbContext.cs` (bloco `Projeto`)
> com `.OnDelete(DeleteBehavior.Restrict)`, `Up` da migration com
> `onDelete: ReferentialAction.Restrict` e `Migrations/Sql/RemoveEquipes_Idempotente.sql`
> regenerado (`ON DELETE NO ACTION`). Detalhe em `docs/telas/06-backend.md` §18.3.1.
> **Aplicação manual — checagem pós-falha obrigatória:** o deploy **não** aplica
> migrations; após qualquer falha, conferir `SELECT MigrationId FROM __EFMigrationsHistory`
> contra o schema real e **NUNCA** considerar "aplicada" só pela mensagem de erro
> (ver `docs/DEPLOY.md` §6.2).

| # | Tabela | Prefixo | Propósito |
|---|---|---|---|
| 1 | `IMPL_Cliente` | `CLI_` | Cadastro de clientes (CNPJ, contato, observacao, ativo, auditoria) |
| 2 | `IMPL_TipoProjeto` | `TPP_` | Tipos: `CLIENTE`/`CARTEIRA`/`INTEGRACAO`/`PROJETO_CIAA` (sem `EquipeId`) |
| 3 | `IMPL_Etapa` | `ETP_` | Etapas configuráveis (vinculadas a um tipo de projeto) |
| 4 | `IMPL_ColunaKanban` | `CLK_` | Colunas do Kanban (limite 8; 5 padrão já seeded) |
| 5 | `IMPL_Projeto` | `PRJ_` | Projeto principal (código `PRJ-0001`, tipo, cliente opcional, status, prioridade) |
| 6 | `IMPL_Tarefa` | `TRF_` | Tarefas (titulo, projeto, etapa, coluna Kanban, responsavel, status) |
| 7 | `IMPL_ComentarioTarefa` | `CMT_` | Comentários / histórico da tarefa |

Após criar, validar:

```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'IMPL_%' ORDER BY TABLE_NAME;
-- esperado: 7 linhas (IMPL_Equipe/IMPL_MembroEquipe removidas em 2026-09-12)
```

### 6.5.3. Geração automática de código de projeto

O `ProjetoService.ProximoCodigoAsync()` (sem parâmetros desde 2026-09-12)
gera o próximo número sequencial global com prefixo fixo `PRJ`:

- `PRJ-0001`, `PRJ-0002`, ...

Endpoint: `GET /api/v1/implantacao/projetos/proximo-codigo` (sem query params;
o antigo `?equipeId=N` e os prefixos por equipe `IMP`/`CIAA` foram removidos).

### 6.5.4. Regras de validação

- `CLIENTE`, `CARTEIRA`, `INTEGRACAO` → **cliente obrigatório** (`clienteObrigatorio = true` no seed)
- `PROJETO_CIAA` → **cliente opcional** (`clienteObrigatorio = false`)
- Kanban: **máximo 8 colunas** ativas
- Colunas com `padrao = true` **não podem ser excluídas**
- **Projetos:** `PrioridadeProjeto` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`) validada via `Enum.IsDefined` no create (`Prioridade`) e no update (`Prioridade?`); `StatusProjeto` (`Backlog`, `AFazer`, `EmAndamento`, `Homologacao`, `Concluido`, `Cancelado`, `Bloqueado`) via `Enum.TryParse` no update/status; tipo/cliente validados (ativo/existente); erros retornam `400 { mensagem }`
- **Tarefas:** título obrigatório; `PrioridadeTarefa` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`) validada via `Enum.IsDefined` no create e no update; `Status` do update é opcional e validado via `Enum.TryParse<StatusTarefa>` (`Backlog`, `AFazer`, `EmAndamento`, `EmHomologacao`, `Concluida`, `Cancelada`) — `400 { mensagem: "Status inválido" }` quando desconhecido; projeto/responsável/coluna validados (existência); `ChamadoLegadoId` opcional (`TRF_ChamadoLegadoId`, FK lógica p/ `tbchamado.CHAMADO_ID`); **`TipoTarefa`** (`Feature = 0`, `Bug = 1`) validada via `Enum.IsDefined` no create e no update (`400 { mensagem: "Tipo de tarefa inválido" }`); **`DataEntrega`** (datetime2, nullable) — base oficial do cálculo de atraso: `DataEntrega < hoje AND Status ∉ {Concluida, Cancelada}`; **`ResponsavelIds`** (lista N:N, opcional) — substitui todos os vínculos de responsável na atualização; **`HorasRealizadas`** é derivado de `IMPL_TarefaApontamento` (SUM) e sincronizado pelo service a cada apontamento; **`ProjetoEtapaId`** (opcional, 20/09/2026) — etapa fixa do mesmo projeto validada por `TarefaService.ValidarEtapaFixaAsync` (`400 "Etapa do projeto inválida para esta tarefa"`; `NULL` = sem card fixo, conta só nos totais).

### 6.5.5. Endpoints backend (`/api/v1/implantacao/`)

| Verbo | Rota | Descrição |
|---|---|---|
| GET/POST/PUT/DELETE | `/clientes` | CRUD de clientes |
| GET/POST/PUT/DELETE | `/tipos-projeto` | CRUD de tipos (lista com `?apenasAtivos=true`; lookup do form de projeto com `clienteObrigatorio`) |
| GET/POST/PUT/DELETE | `/etapas` | CRUD de etapas (lista com `?projetoId=`; lookup do form de tarefa) |
| GET/POST/PUT/DELETE | `/colunas-kanban` | CRUD de colunas (lista com `?apenasAtivas=true`/`?apenasAtivos=` conforme o service; lookup dos forms) |
| POST | `/colunas-kanban/reordenar` | Reordenar colunas (drag-drop) |
| GET/POST/PUT/DELETE | `/projetos` | CRUD de projetos (lista com `tipo`, `status`, `clienteId`, `responsavelId`, `buscar`; detalhe com KPIs de tarefas) |
| GET | `/projetos/proximo-codigo` | Gera o próximo código (`PRJ-XXXX`, retorna `{ codigo }`, sem `equipeId`) |
| GET | `/projetos/clientes` | Lookup de clientes ativos (`ClienteResumo { id, nome, cnpj, ativo }`) |
| PATCH | `/projetos/{id}/status` | Mudar status (Backlog/AFazer/EmAndamento/Homologacao/Concluido/Cancelado/Bloqueado) |
| GET/POST/PUT/DELETE | `/tarefas` | CRUD de tarefas (lista com `projetoId`, `responsavelId`, `status`, `prioridade`, `tipo`, `buscar`, `apenasAtrasadas`, `apenasEmAndamento`, `apenasConcluidas`, `apenasVenceHoje`, `incluirArquivadas`, `funcaoId`; create/update com `projetoEtapaId?` + retorno `projetoEtapaId/projetoEtapaNome`; update com `Status` opcional, `Tipo`, `DataEntrega`, `ResponsavelIds` N:N, `ChamadoLegadoId`) |
| PATCH | `/tarefas/{id}/coluna` | Mover tarefa entre colunas (drag-drop backend, com ajuste de `Status` e `SincronizarAgendaAsync`) |
| POST | `/tarefas/{id}/comentarios` | Adicionar comentário |
| GET | `/dashboard` | KPIs agregados (`porEquipe` = stub `Geral`) |
| **GET** | **`/tarefas/chamados/busca`** | **Busca chamados legados (`tbchamado`) para dropdown (take=20)** |
| **POST** | **`/tarefas/{id}/chamados`** | **Vincular chamado legado à tarefa** |
| **DELETE** | **`/tarefas/{id}/chamados/{chamadoId}`** | **Desvincular chamado legado da tarefa** |
| **POST** | **`/tarefas/{id}/apontamentos`** | **Adicionar apontamento (cria + recalcula `HorasRealizadas`)** |
| **PUT** | **`/tarefas/apontamentos/{apontamentoId}`** | **Atualizar apontamento (só dono ou admin; recalcula `HorasRealizadas`)** |
| **DELETE** | **`/tarefas/apontamentos/{apontamentoId}`** | **Excluir apontamento (só dono ou admin; recalcula `HorasRealizadas`)** |
| GET | `/tarefas/{id}/historico` | Histórico de movimentações (auditoria) |

> **Removidos em 2026-09-12:** `GET/POST/PUT/DELETE /equipes` e
> `POST/DELETE /equipes/{id}/membros` (módulo Equipes).

Todos com `[Authorize]`. Rate limiting `validacao` (5/min por usuário)
para escrita. Padrão: `api/v{version:apiVersion}/...` com versionamento.

### 6.5.6. Páginas frontend (`/implantacao/*`)

| Rota | Componente | Função |
|---|---|---|
| `/implantacao/dashboard` | `DashboardComponent` | KPIs gerais, próximos prazos, gráfico por categoria (stub `Geral`, sem filtro por equipe desde 2026-09-12) + filtro por projeto no header (optgroups Ativos/Concluídos → `?projetoId=`) + seção "Produtividade" (fusão do Relatório: seletor de período Este mês/Próximo mês/Últimos 3 meses na seção, client-side; CSV/Imprimir removidos em 22/09/2026; 4 stats taxa/tempo médio/SLA/atrasadas; grids Conclusões por dia via Chart.js, Produtividade por pessoa, Por prioridade, Top 10 atrasadas com link de edição; cálculo client-side via `TarefasService.listar()`, sem endpoint novo) |
| `/implantacao/kanban` | `KanbanComponent` | Quadro visual (drag-drop), menu do cartão (editar/comentar/duplicar/mover/excluir), drawer com comentários/edição/exclusão, edição inline e ações em lote com preservação de campos; header via `app-page-header` (`titulo="Kanban"`, `icone="bi-kanban"`, select de projeto no slot `actions`; CSS `.imp-kanban__header` removido); form inline com dropdown "Etapa do projeto (card)" (default = etapa `EmAndamento`, `NULL` = "Sem card (só totais)"; payload `projetoEtapaId`) |
| `/implantacao/projetos` | `ProjetosComponent` | LAYOUT 3 COLUNAS (20/09/2026) + IDENTIDADE CLEAN (21/09/2026) + `PageHeaderComponent` (21/09/2026): header via `app-page-header` (`PageHeaderComponent` reutilizável, 21/09/2026, espelho do Kanban: `titulo="Projetos"`, nova descrição, ações Filtros/Resumo/Novo; busca só na sidebar, sem eyebrow/subtítulo) + aside filtros (busca/status server, responsável server com "Meus projetos" via `AuthService.getOperadorLogado`, período vencimento client-side sobre `dataPrevisao`, ordenar, Limpar) + conteúdo (abas Todos/Ativos/Concluídos/Atrasados + grupos colapsáveis Ativos azul/Concluídos verde) + aside resumo (Análise rápida, Próximos vencimentos top 5, Etapas atuais, Meus projetos com atalho); toggles `filtrosAbertos`/`resumoAberto`; redimensionado ao padrão Kanban (sem `max-width`, `padding: 1.5rem`, gaps `1rem` em layout/conteúdo/sides/lista/abas/grupos; grid `15rem/1fr/16.5rem`), drawers <1400px/<1024px; sem mudança de API (`listarComEtapas`/`listarOperadores` existentes) |
| `/implantacao/projetos/novo` | `ProjetoFormComponent` (Fase 2 — working tree; validação pendente) | Form create com lookups (tipos/clientes/operadores/colunas/próximo código) e payload `ProjetoCriarRequest`; header via `app-page-header` (Lote B): título dinâmico por binding (`[titulo]="titulo()"` → `Editar Projeto`/`Novo Projeto`), `icone="bi-file-earmark-plus"`, Cancelar no slot `actions` |
| `/implantacao/projetos/:id/editar` | `ProjetoFormComponent` (Fase 2 — working tree; validação pendente) | Form edit pré-preenchido (`GET /projetos/{id}`), payload `ProjetoAtualizarRequest` + `usuarioAlteracao`; header via `app-page-header` (Lote B, título dinâmico) |
| `/implantacao/projetos/:id` | `ProjetoDetalheComponent` | Hero com código/título/progresso + ações Editar/Excluir, breadcrumb back, abas (Visão/Tarefas/Histórico — Histórico em placeholder), aba Tarefas com Nova tarefa (`?projetoId=`) e Editar por linha |
| `/implantacao/tarefas` | `TarefasComponent` | Grid de cards com ID mono (T123), atalhos (Todas/Atrasadas/Em andamento/Concluídas), filtros (projeto/busca, `?projetoId=`), ações Editar/Excluir por card |
| `/implantacao/tarefas/novo` | `TarefaFormComponent` (working tree; validação pendente) | Form create (aceita `?projetoId=`), payload `TarefaCriarRequest` (com `chamadoLegadoId?`, `tipo`, `dataEntrega`, `responsavelIds?`, **`projetoEtapaId?`** via dropdown "Etapa do projeto (card)", default = etapa `EmAndamento`); header via `app-page-header` (Lote B): título dinâmico por binding (`[titulo]="tituloPagina()"` → `Editar Tarefa`/`Nova Tarefa`), `icone="bi-file-earmark-text"`, Cancelar no slot `actions` |
| `/implantacao/tarefas/:id/editar` | `TarefaFormComponent` (working tree; validação pendente) | Form edit pré-preenchido, payload `TarefaAtualizarRequest` (com `Status?`, `chamadoLegadoId?`, `tipo`, `dataEntrega`, `responsavelIds?`, `usuarioAlteracao`, **`projetoEtapaId?`** preservado no editar); header via `app-page-header` (Lote B, título dinâmico) |
| `/implantacao/clientes` | `ClientesComponent` | Formulário inline com máscara de CNPJ, tabela com badge de status Ativo/Inativo |
| `/implantacao/cadastros` | `CadastrosComponent` | 3 abas (Tipos/Etapas/Colunas) com formulários inline (aba Equipes removida em 2026-09-12) |

> **Removida em 2026-09-12:** rota `/implantacao/equipe` (`EquipeComponent`,
> Diretório de Equipe v1.3.0) junto com o módulo Equipes.
>
> **Removida (fundida no Dashboard):** rota `/implantacao/relatorio`
> (`RelatorioComponent`, pasta `pages/relatorio/` deletada, link "Relatório"
> removido do sidebar) — funcionalidade de SLA/produtividade absorvida pela
> seção "Produtividade" do `DashboardComponent` (cálculo client-side via
> `TarefasService.listar()`, sem endpoint novo). A rota segue existindo apenas
> como `redirectTo: 'dashboard'` (`implantacao.routes.ts:42-44`) para
> compatibilidade de bookmarks/deep-links. Sem mudança de backend.

### 6.5.6.1. Design system do módulo (frontend)

CSS próprio em `frontend/src/app/wiki/pages/implantacao/implantacao.styles.scss`
(importado via `styleUrl` em cada componente).

> **Nota (2026-09-12):** com a remoção do módulo Equipes, não há mais
> identidade visual por equipe (cores `#0f4c81`/`#7c3aed`, borda lateral de
> cards, gradiente de progresso e chips de filtro). Os helpers
> `corEquipe()`/`corEquipeBg()` permanecem no `DashboardComponent` apenas
> como stub (sempre `'Geral'`). O restante do design system segue válido:

**Tipografia**:
- Display: **Space Grotesk** 800 (títulos de seção e KPIs)
- Body: **Inter** 500-600 (textos corridos)
- Data: **IBM Plex Mono** (códigos de projeto, IDs de tarefa, prazos)

**Signature element**: **barra de progresso** com 8px de altura e % sobreposta
em mono. É o dado mais importante de um projeto e aparece em cards e no hero
do detalhe.

**Status colors** (chips com bolinha à esquerda):
- Backlog: cinza / A Fazer: azul / Em Andamento: âmbar / Homologação: violeta /
  Concluído: verde / Bloqueado: vermelho / Cancelado: slate

KPIs no topo viram **números grandes** (2.5rem, Space Grotesk 800)
com label pequena em uppercase. Empty states são orientados ("Crie o primeiro projeto…") em vez de mudos.

### 6.5.6.2. Seed de dados (em `Development`)

O backend tem seed automático em `Program.cs` quando `IsDevelopment()`:

- **1 operador**: `admin` (com perfil `A`)
- **3 funções** (`CC_Funcao`), **7 colunas Kanban padrão**: BACKLOG, A FAZER, EM DESENVOLVIMENTO, EM ANDAMENTO, HOMOLOGACAO, BLOQUEADO, CONCLUIDO
- **4 tipos de projeto**: CLIENTE/CARTEIRA/INTEGRACAO (cliente obrigatório) + PROJETO_CIAA (cliente opcional) — sem `EquipeId` desde 2026-09-12
- **13 etapas**: 6 (KICKOFF, PARAMETRIZACAO, TREINAMENTO, HOMOLOGACAO, GO LIVE, ACEITE) + 7 (LEVANTAMENTO, DESENHO, DESENVOLVIMENTO, TESTES, HOMOLOGACAO, PUBLICACAO, MONITORAMENTO)
- **7 tipos de evento** (`CC_TipoEvento`)
- Clientes: somente leitura da legada `tbcliente` (sem seed próprio)

> ⚠️ **Seeds de exemplo DESABILITADOS** (limpeza total para testes):
> `Seed IMPL_Projeto` (projetos **IMP-0001** — *Implantação Tech Solutions S/A* —
> e **CIAA-0001** — *Agente IA — Classificação de Chamados* — com tarefas e
> comentários) e `Seed IMPL_Agenda` (5 eventos de exemplo, que referenciavam
> esses códigos) estão sob `#if false` em `Program.cs` e **não são mais criados**.
> A descrição histórica desses dados permanece abaixo apenas como referência.
> A base de testes (SQL Server `Central_Conhecimento`) parte limpa via
> `scripts/db/wipe-test-data.sql` (DELETEs FK-seguros + `RESEED 0`; preserva
> tipos, etapas-base, colunas, tipos de evento, operadores, funções, clientes,
> legadas e auth; `ProximoCodigoAsync()` é MAX-based, então o próximo código
> volta a `PRJ-0001` sozinho). Procedimento: backup antes, rodar via
> SSMS/`sqlcmd`, reiniciar o backend, conferir telas vazias.

<details>
<summary>Referência histórica — dados de exemplo desabilitados (não são mais criados)</summary>

- **IMP-0001** — *Implantação Tech Solutions S/A* (60% concluído, Em Andamento, prioridade Alta, 7 tarefas distribuídas pelas colunas, 1 tarefa BLOQUEADA aguardando retorno do banco sobre layout CNAB, 2 comentários de contexto)
- **CIAA-0001** — *Agente IA — Classificação de Chamados* (35% concluído, Em Andamento, 6 tarefas, 1 comentário sobre acurácia do prompt)

</details>

Esses dados ficam em memória (InMemory) e somem ao reiniciar o backend.
Em produção (SQL Server), as tabelas precisam ser criadas via
`Migrations/Sql/ImplantacaoInit.sql` — ver § 6.5.2.

### 6.5.6.3. Contador dinâmico de tarefas por etapa + transição automática (20/09/2026)

**Backend (confirmado no código):** `Tarefa.ProjetoEtapaId` (`TRF_ProjetoEtapaId`,
FK NULL p/ `tbprojetoEtapa.PEP_Id`, `NO ACTION` — SQL Server barra múltiplos caminhos em cascata (IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa)) + navegação `ProjetoEtapa`
(`Models/Implantacao/Tarefa.cs`); relationship em `AppDbContext.cs` (bloco `Tarefa`);
migration `20260920185734_TarefaProjetoEtapaId` (AddColumn + índice + FK + backfill SQL
por nome conhecido, `HOMOLOGACAO→HOMOLOGAÇÃO`, demais `NULL`) + script manual
equivalente `scripts/db/migracao-tarefa-projeto-etapa-id.sql` (idempotente);
DTOs `TarefaResumo/Detalhe/Criar/Atualizar` com `ProjetoEtapaId(+Nome)`;
`ProjetoEtapaResumo` com `TarefasTotal/TarefasConcluidas/Id` (GROUP BY em
`ObterEtapasAsync`, excluindo arquivadas).
`TarefaService.ValidarEtapaFixaAsync` (etapa fixa deve ser do mesmo projeto);
sets no Criar/Atualizar; includes + projeções em Listar/Obter; injeção de
`IProjetoEtapaService`; `RecalcularJornadaAsync` chama
`SincronizarEtapasPorTarefasAsync` após o recalc da jornada (cobre
criar/atualizar/mover-coluna/concluir/arquivar/excluir) — `Projeto.Progresso`
termina no fórmula-fixa.
`ProjetoEtapaService.SincronizarEtapasPorTarefasAsync`: por linha fixa conta tarefas
(`!Arquivada`, `ProjetoEtapaId`); sem tarefas não toca (manual/checklist intacto);
com tarefas atualiza Percentual task-based; tudo-concluído + não-concluída →
`Concluida` + `DataFimReal` + histórico "Conclusão automática por tarefas" +
`DesbloquearProximaEtapaAsync` (reuso); `Concluida` congela Percentual em 100 e
nunca reabre sozinha (retorno é manual).

**Frontend (confirmado no código):** `projeto.model.ts`/`tarefa.model.ts`
estendidos (`ProjetoEtapaResumo.tarefasTotal/tarefasConcluidas/id`,
`Tarefa*.projetoEtapaId/projetoEtapaNome`); `projeto-etapa-card` mostra
"X/Y tarefas" (`.etapa-tarefas`, com tooltips) quando há tarefas, senão checklist;
`tarefa-form` e Kanban inline com dropdown "Etapa do projeto (card)"
(default = `EmAndamento`, `NULL` = "Sem card (só totais)"); payloads enviam
`projetoEtapaId`.

**Deploy:** sem auto-migrate no startup — aplicar a migration (`dotnet ef database update`)
ou o script SQL no servidor antes do deploy. Builds: dotnet 0 erros; `ng build` sem erros.

### 6.5.7. ~~Agenda compartilhada (v1.3.0 — REMOVIDA)~~

> ⚠️ **Feature removida no rollback de 10/09/2026** (commit `8956c57`).
> 
> A Agenda V1 (`IMPL_Agenda`, `IMPL_MembroPerfil`, migrations `AddAgendaAndPerfis`/`AddAuditoria`) foi removida por conflitos sistêmicos (CSS/JS, z-index, dark mode, performance). As tabelas `CC_Agenda`, `CC_AgendaParticipante`, `CC_Perfil`, `CC_Auditoria` permanecem no banco como órfãs (ver `docs/AGENDA-REIMPLEMENTACAO.md` para plano de reimplementação segura).
> 
> **Endpoints removidos:** `/api/v1/implantacao/agenda` (GET/POST/PUT/DELETE/ICS)
> **Rota frontend removida:** `/implantacao/agenda`
> **Branch de backup:** `backup-master-pre-agenda-rollback` (commit `c3fec9c`)

### 6.5.8. ~~Diretório de Equipe (v1.3.0 — REMOVIDO em 2026-09-12)~~

> ⚠️ **Removido junto com o módulo Equipes em 2026-09-12**
> (migration `20260912173928_RemoveEquipes`).
>
> Registro histórico: existiu a tabela `IMPL_MembroPerfil` (descrição, telefone,
> ramal) cruzada com `tbfuncionario` e `IMPL_MembroEquipe`, com endpoints
> `GET /equipe/diretorio`, `GET /equipe/perfil/{funcionarioId}` e
> `PUT /equipe/perfil/{funcionarioId}`, e UI em `/implantacao/equipe`
> (grid de cards + drawer lateral). Nada disso existe mais no código.

### 6.5.9. Roadmap do módulo

- **v1.0.0 (entregue)**: Dashboard, Projetos, Tarefas, Clientes, Cadastros.
- **v1.1.0 (entregue, tag)** — Kanban UI com `@angular/cdk` drag-drop, seed de 2 projetos fakes.
- **v1.2.0 (entregue, backend)** — Legacy data service + FKs lógicas para `tbcliente` e `tbchamado`.
- **v1.3.0 (planejada)** — Dropdowns de legado. Migration `AddAgendaAndPerfis` já aplicada em produção (tabelas órfãs mantidas). **Agenda movida para reimplementação futura** — ver `docs/AGENDA-REIMPLEMENTACAO.md`. **Diretório de Equipe cancelado** (módulo Equipes removido em 2026-09-12).
- **2026-09-12 (entregue, produção)** — **Remoção do módulo Equipes** (Fases 2–3 de `PLANO-IMPLEMENTACAO-FASES.md`): migration `20260912173928_RemoveEquipes`, `AgendaVisibilidade` = `Publico|Privado`, código de projeto `PRJ-0001` global, `DashboardPorEquipe` stub `Geral`, deploy 192.168.2.130 OK (backup `20260912-163535`, front + swagger 200).
- **Fases 2 e 3 do módulo Implantação (working tree 15/09/2026)** — **implementação em andamento no working tree; validação pendente (sem validação runtime):** Fase 2 = forms create/edit de Projeto (`/implantacao/projetos/novo`, `/implantacao/projetos/:id/editar`), ações editar/excluir no detalhe, lookups (`GET /projetos/clientes`, `GET /tipos-projeto?apenasAtivos=true`, `GET /agenda/operadores`, `GET /projetos/proximo-codigo`, `GET /colunas-kanban?apenasAtivas=true`), payloads `ProjetoCriarRequest`/`ProjetoAtualizarRequest`, prioridades do enum `PrioridadeProjeto`; Fase 3 = CRUD de Tarefas com forms create/edit (`/implantacao/tarefas/novo`, `/implantacao/tarefas/:id/editar`, `?projetoId=`), ações na listagem e no detalhe do projeto, integração Kanban↔Tarefas (menu editar/comentar/duplicar/mover/excluir, drawer com comentários/edição/exclusão, edição inline e lote com preservação de campos), `TarefaDetalhe.ChamadoLegadoId`, `TarefaAtualizarRequest.Status` opcional, validação server-side de prioridade/status.
- **v2.x (futuro)**: integração com Google Calendar (OAuth + ICS), recorrência funcional com expansão de eventos, MCP server para Agente IA.

### 6.5.10. Branch `projeto-implantacao`

Branch **futura** (criada a partir de `developer` via `scripts/git/branch-todos.ps1`
quando o módulo voltar a desenvolvimento ativo). Para subir manualmente, ver seção 8.

### 6.5.11. Smoke test executado (histórico, pré-remoção de Equipes)

> Registro anterior a 2026-09-12 — endpoints `/implantacao/equipes` e
> `/projetos/proximo-codigo?equipeId=` não existem mais.

| # | Endpoint | Resultado |
|---|---|---|
| 1 | POST `/auth/login` (admin/admin123) | ✅ 200 |
| 2 | GET `/implantacao/equipes` | ✅ 2 equipes (IMPLANTACAO, CIAA) |
| 3 | GET `/implantacao/tipos-projeto` | ✅ 4 tipos (CLIENTE, CARTEIRA, INTEGRACAO, PROJETO_CIAA) |
| 4 | GET `/implantacao/colunas-kanban` | ✅ 5 colunas padrão |
| 5 | GET `/implantacao/dashboard` | ✅ 200 (KPIs zerados) |
| 6 | POST `/implantacao/clientes` | ❌ 500 (bug `Include(x => x.Nome)` no ClienteService.ObterAsync — **corrigido** nesta release) |
| 7 | GET `/implantacao/projetos/proximo-codigo?equipeId=1` | ✅ `IMP-0001` |
| 8 | POST `/implantacao/projetos` | ⚠️ 429 rate limit (cliente/projeto foram criados; smoke test parou no limite de 5/min) |

> **Bugs corrigidos no smoke test**:
> 1. `ClienteService.ObterAsync` tinha `.Include(x => x.Nome)` (scalar property,
>    sem sentido para Include). Removido. Cliente ID 1 foi criado antes do
>    erro — o seed fica para próxima execução.

