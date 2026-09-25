> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 17. Backend — Endpoints por Controller

### 17.1 `AuthController`

**Controller:** `Controllers/AuthController.cs`

### O que faz
Autenticação JWT — login, refresh, logout, me. Gerencia tokens de acesso (4h) e refresh (4h, rotativo, HttpOnly cookie).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| POST | `/api/v1/auth/login` | Autentica, retorna accessToken + user | `AuthService.LoginAsync()` |
| POST | `/api/v1/auth/refresh` | Renova tokens via cookie, devolve user | `AuthService.RefreshAsync()` |
| POST | `/api/v1/auth/logout` | Revoga refresh token, remove cookies | `AuthService.RevogarRefreshTokenAsync()` |
| GET | `/api/v1/auth/me` | Dados do usuário da sessão | `AuthService.ObterUsuario()` |

### Banco de Dados
- `RefreshTokens` (hash SHA-256, rotativo)
- `AuditoriaAcessos` (auditoria)
- `TBOPERADOR` (login legado, senha texto puro)

### Segurança
- Rate limiting `login` (5/min por IP)
- Lockout `BruteForceGuard` (5 falhas/5 min → 15 min)
- `SegurancaHelper` (comparação SHA-256 em tempo constante)
- JWT `RequireExpirationTime` + `ValidAlgorithms = HS256`
- `JWT_KEY` via env var (fallback `Jwt:Key`)
- Cookie `cc_refresh` HttpOnly + SameSite=Strict

### Observações Técnicas
- `POST /auth/refresh` devolve objeto `user` (BUG 5 fix)
- Verificação periódica 5 min
- Logout `[Authorize]`

---

### 17.2 `AcessosController`

**Controller:** `Controllers/AcessosController.cs`

### O que faz
Gestão de acessos de empresas via Google Sheets (listagem, validação de senha mestre, visualização de credenciais com auditoria).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| GET | `/api/v1/acessos` | Lista empresas (resumo, sem senhas) | `GoogleSheetsService.ListarEmpresas()` |
| POST | `/api/v1/acessos/validar-senha` | Valida senha mestre | `PasswordValidationService.Validar()` |
| POST | `/api/v1/acessos/visualizar?empresaId=N` | Retorna credenciais + auditoria | `AcessosController.MapearParaDetalhe()` |

### Banco de Dados
- `AuditoriaAcessos` (auditoria de visualização)
- Google Sheets (planilha 16 colunas A–P, fallback CSV)

### Segurança
- Rate limiting `validacao` (5/min por usuário)
- Lockout `BruteForceGuard`
- `SegurancaHelper` (comparação SHA-256)
- Erros genéricos (sem vazamento de `ex.Message`)

### Observações Técnicas
- Cache memória 10 min para planilha
- `EmpresaDetalheResponse` com blocos TS/Banco/VPN/Actyon/AnyDesk/Observacoes
- `MapearParaDetalhe` transforma linhas em blocos de credenciais

---

### 17.3 `Implantacao Controllers` (`/api/v1/implantacao/`)

**Controllers:** `Controllers/Implantacao/*.cs`

### Entidades e recursos gerenciados

| Controller | Rota base | Entidade/recurso | Tabela SQL |
|-----------|-----------|------------------|------------|
| `TiposProjetoController` | `/implantacao/tipos-projeto` | `TipoProjeto` | `IMPL_TipoProjeto` |
| `ColunasKanbanController` | `/implantacao/colunas-kanban` | `ColunaKanban` | `IMPL_ColunaKanban` |
| `ProjetosController` | `/implantacao/projetos` | `Projeto` + 9 cards fixos por projeto | `IMPL_Projeto`, `tbprojetoEtapa*` |
| `TarefasController` | `/implantacao/tarefas` | `Tarefa`, `ComentarioTarefa` e vínculos | `IMPL_Tarefa`, `IMPL_ComentarioTarefa`, `IMPL_Tarefa*` |
| `DashboardController` (classe no arquivo `TarefasController.cs`) | `/implantacao/dashboard` | KPIs agregados (`?equipe=` legado sem efeito; `?projetoId=N` filtra projetos/tarefas/horas/apontamentos/prazos) | `IMPL_Projeto`, `IMPL_Tarefa` |
| — | — | **Etapas Globais removidas** — não há controller, service, model `Etapa` nem tabela `IMPL_Etapa` no source atual | — |

> **Etapas por projeto (arquitetura vigente):** cada projeto recebe nove cards em `tbprojetoEtapa`, com checklists, documentos, histórico e comentários. Os cards são expostos por `/implantacao/projetos/etapas-padrao` e `/implantacao/projetos/{id}/etapas`. A migration `20260922154202_RemoveEtapaAntiga` removeu `IMPL_Etapa`, a FK/coluna legadas `TRF_EtapaId` e deixou `TRF_ProjetoEtapaId → tbprojetoEtapa.PEP_Id` como vínculo válido.
>
> **Diagnóstico 404 anterior e correção frontend:** `GET` e `POST /implantacao/etapas` retornavam 404 no ambiente publicado porque o controller global não existia. A tela capturava a falha e mostrava estado vazio. A funcionalidade frontend foi removida: rotas `/admin/cadastros/etapas*`, componentes/SCSS, `EtapasService`, tipos, `TarefasService.listarEtapas()` e breadcrumb específico saíram do source. A API global não deve ser recriada. A validação registrada foi 19/19 testes, typechecks e build frontend, com gate backend/frontend verde.

### `ProjetosController` — 16 endpoints atuais

Todos exigem `[Authorize]`. A classe aplica rate limit `validacao`; `GET /clientes` usa a política `leitura`. Os nomes dos parâmetros de rota não precisam coincidir literalmente com o frontend: Angular interpola os valores pela posição.

| Método | Rota | Corpo | Resultado/regra |
|--------|------|------|-----------------|
| GET | `/api/v1/implantacao/projetos` | — | Lista com query `tipo`, `status`, `clienteId`, `responsavelId`, `buscar`, `perfilId` |
| GET | `/api/v1/implantacao/projetos/com-etapas` | — | Mesma lista, cada projeto com seus cards fixos |
| GET | `/api/v1/implantacao/projetos/{id}` | — | Detalhe ou 404 |
| GET | `/api/v1/implantacao/projetos/etapas-padrao` | — | Nove nomes/ordens padrão, fonte única no backend |
| GET | `/api/v1/implantacao/projetos/{id}/etapas` | — | Cards do projeto; inicializa os nove apenas se ainda não existirem |
| GET | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}` | — | Detalhe de um card ou 404 |
| GET | `/api/v1/implantacao/projetos/proximo-codigo` | — | `{ codigo }`; sem parâmetros |
| GET | `/api/v1/implantacao/projetos/clientes` | — | Clientes ativos de `tbcliente`; política `leitura` |
| POST | `/api/v1/implantacao/projetos` | `ProjetoCriarRequest` | Cria projeto e automaticamente os nove cards; `etapaInicialOrdem` marca anteriores como concluídas |
| PUT | `/api/v1/implantacao/projetos/{id}` | `ProjetoAtualizarRequest` | Atualização; o contrato backend mantém `Status?` e `UsuarioAlteracao` |
| PUT | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}` | `ProjetoEtapaAtualizarRequest` | Atualiza estado, percentual, datas, responsável e checklist |
| POST | `/api/v1/implantacao/projetos/{id}/etapas/retornar` | `ProjetoEtapaRetornoRequest` | Retorna o projeto a um card anterior |
| POST | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}/checklist` | `ProjetoEtapaChecklistItemRequest` | Adiciona item ao checklist |
| POST | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}/documentos` | `ProjetoEtapaDocumentoRequest` | Adiciona documento ao card |
| POST | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}/comentarios` | `ProjetoEtapaComentarioRequest` | Adiciona comentário ao card |
| DELETE | `/api/v1/implantacao/projetos/{id}` | — | Exclusão física ou 404 |

> **Rotas removidas do source:** `GET /projetos/{id}/jornada`, `POST /projetos/{id}/etapas/inicializar` e `PATCH /projetos/{id}/status`. No IIS, enquanto o backend atual não for publicado, as três ainda podem responder **401** por pertencerem à versão antiga; isso não indica que continuem no source. O cálculo privado de `IProjetoJornadaService` permanece para `TarefaService`, e `IProjetoEtapaService.InicializarEtapasPadraoAsync` permanece para criação/leitura dos cards.

### Endpoints por Controller (resumido)

| Controller | GET | POST | PUT | DELETE | Patch/Especiais |
|-----------|-----|------|-----|--------|-----------------|
| TiposProjeto | ✅ | ✅ | ✅ | ✅ | — |
| ColunasKanban | ✅ | ✅ | ✅ | ✅ | POST `/reordenar` |
| Projetos | ✅ | ✅ | ✅ | ✅ | **16 endpoints no total**; PUT `/{id}` mantém `Status?` no contrato |
| Tarefas | ✅ | ✅ | ✅ | ✅ | GET com filtros; PATCH `/{id}/coluna`, `/{id}/arquivar`, `/{id}/desarquivar`; POST `/{id}/comentarios`; create/update com `projetoEtapaId?` e `ChamadoIds?` |
| Dashboard | ✅ | — | — | — | Query `equipe` opcional (aceita, ignorada — stub `Geral`) |

### Segurança
- Todos com `[Authorize]`
- Rate limiting `validacao` (5/min por usuário) para escrita
- Validação `clienteObrigatorio` por tipo de projeto
- Geração automática de código (`ProjetoService.ProximoCodigoAsync()` — prefixo fixo `PRJ`, sequencial global, sem `equipeId` desde 2026-09-12)
- Validação de enums: `PrioridadeProjeto`/`PrioridadeTarefa` via `Enum.IsDefined` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`); `StatusProjeto`/`StatusTarefa` via `Enum.TryParse` (tarefa aceita `Status` opcional **no create e no update**; o form não envia — sincronia coluna↔status); título/projeto/responsável/coluna validados server-side (`400 { mensagem }`)
- **Regra única de atraso (22/09/2026):** `TarefaAtrasoExtensions.OndeAtrasadas()` (`Services/Implantacao/TarefaAtrasoExtensions.cs`) — prazo = `DataEntrega ?? DataPrevisao`; atrasada se prazo < hoje, **exceto** `Concluida` com `DataConclusao ≤ prazo`; `Cancelada` nunca conta. Aplicado em `TarefaService.ListarAsync` (`apenasAtrasadas`), `DashboardService`, `AdminDashboardService` (KPI atrasadas + alerta urgente) e `ProjetoService.ObterAsync`.
- **Sincronia coluna↔status (22/09/2026, `TarefaService`):** `StatusDaColuna(nome)` + `ColunaPorStatusAsync(status)` — create: coluna enviada vence o status (deriva o status dela); sem coluna, o status busca a coluna canônica (default `A FAZER`). update: status informado move o card p/ coluna canônica se divergente; sem status, a coluna deriva o status (`BLOQUEADO` mantém o atual); `Concluida` seta `DataConclusao ??= Now`; sair de Concluida limpa `DataConclusao`. `MudarColunaAsync` usa o mesmo mapa (`BACKLOG→Backlog`, `A FAZER→AFazer`, `HOMOLOG→EmHomologacao`, `DESENVOLVIMENTO/ANDAMENTO→EmAndamento`, `CONCLUID→Concluida`; `BLOQUEADO` mantém status + flag).
- `TarefaDetalhe.ChamadoLegadoId` (`TRF_ChamadoLegadoId`, FK lógica p/ `tbchamado.CHAMADO_ID`) presente em resumo/detalhe/create/update
- `TarefaCriarRequest`/`TarefaAtualizarRequest.ChamadoIds` (22/09/2026): sincronização N-N de chamados relacionados — no **create**, grava todos os IDs na criação (valida `ChamadoLegado` inexistente → `ArgumentException`/400); no **update**, lista enviada é a fonte da verdade (remove/adiciona; se `ChamadoLegadoId` sair da seleção, `TRF_ChamadoLegadoId` é anulado; payload sem `ChamadoIds` mantém compat antica só garantindo o legado). `TarefaAtualizarRequest.HorasRealizadas` **removido** — horas realizadas derivam só dos apontamentos; `Status` opcional continua no DTO (compat API), mas o form não envia mais — a sincronia coluna↔status é feita no service
- `Tarefa.ProjetoEtapaId` (`TRF_ProjetoEtapaId`, FK NULL p/ `tbprojetoEtapa.PEP_Id`, `NO ACTION` — SQL Server barra múltiplos caminhos em cascata (IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa); migration `20260920185734_TarefaProjetoEtapaId` + script `scripts/db/migracao-tarefa-projeto-etapa-id.sql`, 20/09/2026): `TarefaResumo/Detalhe/Criar/Atualizar` com `ProjetoEtapaId(+Nome)`; validação `ValidarEtapaFixaAsync` (mesmo projeto, senão 400); `RecalcularJornadaAsync` → `SincronizarEtapasPorTarefasAsync` (criar/atualizar/mover/concluir/arquivar/excluir); `ProjetoEtapaResumo` com `TarefasTotal/TarefasConcluidas/Id`; sem auto-migrate no startup; reabertura de etapa fixa via `SincronizarEtapasPorTarefasAsync` (22/09/2026)

### Observações Técnicas
- Versionamento: `Asp.Versioning.Mvc` com `api/v{version:apiVersion}`
- `[ApiVersion("1.0")]` em todos controllers
- Seed em Development: 4 tipos, 7 colunas e 7 tipos de evento; não há seed de Etapas Globais. As nove etapas são cards por projeto, criados por `ProjetoEtapaService.InicializarEtapasPadraoAsync`. Seeds de exemplo — 2 projetos IMP-0001/CIAA-0001 e 5 eventos de agenda — permanecem desabilitados via `#if false` em `Program.cs`; clientes vêm de `tbcliente`.
- Migration `20260912173928_RemoveEquipes.cs` (2026-09-12) remove `IMPL_Equipe`/`IMPL_MembroEquipe`
- `scripts/deploy/deploy.ps1` **não** aplica migrations

---

### 17.4 `DatabaseController`

**Controller:** `Controllers/Database/DatabaseController.cs`

### O que faz
API do Database Explorer — metadados, relacionamentos, busca, config (leitura), procedures, triggers, dependências, análise de procedures, query builder (geração de SQL) e comparação de schema via upload. **19 endpoints** (enxugamento 23/09/2026, `640bbf6`: removidos `POST /query`, `GET /procedures/search`, `PUT /config`, `POST /diff`, `POST /snapshot`, `GET /snapshots`, `POST /snapshot/comparar`; services `DatabaseQueryService`/`DatabaseSchemaDiffService`/`DatabaseSnapshotService` deletados; 24/09/2026: removidos `POST /test-connection` e `GET /search/global` — FE usa `GET /status` e `GET /search`).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| GET | `/api/v1/database/status` | Status de conexão | `DatabaseConnectionService` |
| GET | `/api/v1/database/info` | Info do servidor | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables` | Lista tabelas (`?schema=`, `?filtro=`) | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}` | Detalhe tabela | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}/columns` | Colunas | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}/indexes` | Índices | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}/dependencies` | Dependências da tabela | `DatabaseMetadataService` |
| GET | `/api/v1/database/relationships?tabela=` | Relacionamentos (filtro opcional por tabela, case-insensitive em origem/destino) | `DatabaseRelationshipInferenceService` |
| GET | `/api/v1/database/graph` | Grafo BFS | `DatabaseRelationshipInferenceService` |
| GET | `/api/v1/database/column-usage` | Uso de coluna | `DatabaseRelationshipInferenceService` |
| GET | `/api/v1/database/search` | Busca global | `DatabaseSearchService` |
| GET | `/api/v1/database/procedures` | Lista procedures (`?busca=`) | `DatabaseMetadataService` |
| GET | `/api/v1/database/procedures/{schema}/{name}` | Detalhe procedure | `DatabaseMetadataService` |
| GET | `/api/v1/database/procedures/{schema}/{name}/analysis` | Análise procedure | `DatabaseMetadataService` |
| GET | `/api/v1/database/triggers` | Lista triggers | `DatabaseMetadataService` |
| GET | `/api/v1/database/triggers/{schema}/{name}` | Detalhe trigger | `DatabaseMetadataService` |
| POST | `/api/v1/database/query-builder-advanced` | Gera SQL do Criador (WHERE, ORDER BY, GROUP BY, CTEs) | `DatabaseQueryBuilderService` |
| GET | `/api/v1/database/config` | Configuração (senha mascarada) | `DatabaseConnectionService` |
| POST | `/api/v1/database/compare-schemas` | Upload multipart `FormData` (`schema`, `tabela`, `arquivo` só `.json` ≤ 5 MB; CSV removido em 24/09/2026) → colunas/tipos/nullable/ordem/índices/FKs × schema JCA → `SchemaComparisonResultDto` (`[EnableRateLimiting("validacao")]`, `[RequestSizeLimit(5MB)]`) | `DatabaseSchemaComparisonService` |

### Banco de Dados
- `dbActyon_JCA` (SQL Server 192.168.2.154)
- Metadados via `sys.*` views
- `sys.foreign_keys` para relacionamentos

### Segurança
- Senha via env var `DB_EXPLORER_SENHA`
- User-secrets em Development
- `TrustServerCertificate=false` como default em produção
- `POST /compare-schemas`: rate limit `validacao` (50/min prod), extensão `.json` apenas, 5 MB, parse server-side (não confia em conteúdo do cliente); endpoint de lote `compare-schemas-lote` removido em 24/09/2026; parser CSV removido do serviço
- Sem execução de SQL arbitrário no servidor (endpoint `POST /query` removido; SELECT-only restava só no serviço de query)

### Observações Técnicas
- `AppDbContextDesignTimeFactory` para EF Core migrations com SQL Server
- Configuração via `DatabaseConnectionConfig` (`GetConfig` somente leitura; `UpdateConfig` removido)
- Services: `Connection`, `Metadata`, `RelationshipInference`, `Search`, `QueryBuilder`, `SchemaComparison` (6); `Query`, `SchemaDiff`, `Snapshot` deletados em 23/09/2026
- DI em `Program.cs` enxuta (sem registros de query/diff/snapshot)

---

### 17.5 `LegacyController` — ~~REMOVIDO~~ (arquivo `LegacyController.cs` excluído; sem endpoints)

**Controller:** `Controllers/Implantacao/LegacyController.cs`

### O que faz
Endpoints read-only para consulta de dados legados do `dbBUSINESS_HML`. Popula dropdowns no frontend (clientes, chamados, indicações, funcionários).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| GET | `/api/v1/implantacao/legacy/clientes` | Lista clientes legados | `LegacyDataService.ListarClientesAsync()` |
| GET | `/api/v1/implantacao/legacy/clientes/{id}` | Cliente específico | `LegacyDataService.ObterClienteAsync()` |
| GET | `/api/v1/implantacao/legacy/chamados` | Lista chamados | `LegacyDataService.ListarChamadosAsync()` |
| GET | `/api/v1/implantacao/legacy/indicacoes` | Lista indicações | `LegacyDataService.ListarIndicacoesAsync()` |
| GET | `/api/v1/implantacao/legacy/funcionarios` | Lista funcionários | `LegacyDataService.ListarFuncionariosAsync()` |

### Banco de Dados
- `dbBUSINESS_HML` (legado)
- Tabelas: `tbcliente`, `tbchamado`, `tbfuncionario`, `tbfuncao`

### Segurança
- `[Authorize]` + rate limiting
- Nenhuma escrita

### Observações Técnicas
- Dados legados para dropdowns frontend
- FKs lógicas para `tbcliente` e `tbchamado` (v1.2.0)

---

### 17.6 `AgendaController`

**Controller:** `Controllers/AgendaController.cs`

### O que faz
API da Agenda V2 (MVP) — gerencia eventos, tipos de evento e participantes. Rota base **`/api/v1/agenda`** (fora do prefixo `/implantacao`). Suporta CRUD completo de eventos, listagem com filtro por intervalo, responsável e função, movimentação de eventos (drag-drop), validação de conflito de horários por responsável (Fase 1 — 409), e listas de apoio (tipos, operadores ativos, funções).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| GET | `/api/v1/agenda/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N` | Lista eventos no intervalo (filtros opcionais: responsável e/ou função via tabela legada `tbfuncionario` por `OPERADOR_ID`) | `IAgendaService.ListarEventosAsync()` |
| GET | `/api/v1/agenda/eventos/{id}` | Detalhe do evento (com participantes, tipo, projeto, operador) | `IAgendaService.ObterEventoAsync()` |
| POST | `/api/v1/agenda/eventos` | Cria evento (valida título, datas, tipo, responsável + regras rígidas por tipo + sem conflito; `participantesIds` opcional; 400 `{ mensagem }` em regra violada) | `IAgendaService.CriarEventoAsync()` |
| POST | `/api/v1/agenda/eventos/lote` | Cria N ocorrências até `dataRepeticaoFim` por padrão (1=Diária, 2=Semanal, 3=Mensal; grava `Recorrente`/`PadraoRecorrencia`); valida regras por tipo + conflito **por dia** (409 por ocorrência); 400 `{ mensagem }` em regra violada; **Férias NÃO usa lote** (400 "não usa repetição") | `IAgendaService.CriarEventosLoteAsync()` |
| PUT | `/api/v1/agenda/eventos/{id}` | Atualiza evento (revalida tudo + regras por tipo, reconstrói participantes quando informados + sem conflito, excluindo o próprio id; `participantesIds` opcional; 400 `{ mensagem }`) | `IAgendaService.AtualizarEventoAsync()` |
| DELETE | `/api/v1/agenda/eventos/{id}` | Exclui evento | `IAgendaService.ExcluirEventoAsync()` |
| PATCH | `/api/v1/agenda/eventos/{id}/mover` | Move evento (nova data início/fim) — drag-drop (valida conflito no novo intervalo, excluindo o próprio id) | `IAgendaService.MoverEventoAsync()` |
| GET | `/api/v1/agenda/tipos` | Lista tipos de evento ativos (`CC_TipoEvento`) | `IAgendaService.ListarTiposAsync()` |
| GET | `/api/v1/agenda/operadores` | Lista operadores ativos (`TBOPERADOR` com `SeAtivo = 'S'`) | `IAgendaService.ListarOperadoresAtivosAsync()` |
| GET | `/api/v1/agenda/funcoes` | Lista funções ativas com operadores ativos (`CC_Funcao` + `TBOPERADOR.SeAtivo = 'S'`, ordem por descrição — só a lista de opções; `ListarFuncoesAsync()` inalterada) | `IAgendaService.ListarFuncoesAsync()` |

### Validação de conflito de horários (Fase 1)
- **Regra:** `AgendaService.ValidarSemConflitoAsync()` é chamada em `CriarEventoAsync`, `AtualizarEventoAsync`, `MoverEventoAsync` e **por ocorrência** em `CriarEventosLoteAsync` antes de persistir. Sobreposição é por `OperadorId` (responsável; no mover, o operador atual do evento): `DataInicio < fimEfetivo && fimEfetivoExistente > inicio`, excluindo o próprio `id` em edição/mover via `QueryConflito(..., idExcluir)`.
- **Fim efetivo** (`FimEfetivo()`): usa `DataFim` quando informada; se nula e `DiaInteiro = true`, ocupa até o fim do dia (`inicio.Date.AddDays(1)`); se nula sem dia inteiro, o evento é pontual (`fim = início`).
- **Erro:** `ConflictException` (`Exceptions/ConflictException.cs` — `Code` + `List<AgendaResumo> Conflitos`, `code` padrão `CONFLICT_HORARIOS`) com mensagem `Conflito de horários detectado: 'Título' (dd/MM HH:mm–dd/MM HH:mm ou —); ...`.
- **HTTP:** `AgendaController` captura `ConflictException` nos endpoints POST, POST `/lote`, PUT e PATCH `/mover` e retorna **409** `{ mensagem, conflitos, code }` (`code = "CONFLICT_HORARIOS"`); captura `ArgumentException` (inclui regras por tipo) e retorna **400** `{ mensagem }` PT-BR.
- **Consulta auxiliar:** `IAgendaService.ObterConflitosAsync(operadorId, inicio, fimEfetivo, idExcluir?, ct)` expõe a lista de sobreposições (uso interno da validação; sem endpoint GET próprio).

### Regras rígidas por tipo + recorrência (confirmado em `Services/Implantacao/AgendaService.cs:185-203,499-524`)
- **Infra:** `RegraTipoEvento` (`ExigeDiaInteiro`, `ProibeDiaInteiro`, `ExigeHorario`, `PermiteSpan`, `PermiteSemanalMensal`) + `NormalizarNomeTipo()` (case/acentos-insensível: `Trim().ToUpperInvariant()` + remoção `NonSpacingMark`) + `ObterRegraTipo()` (switch sobre o nome normalizado) + `ResolverRegraTipoAsync(tipoId)` (busca o nome em `CC_TipoEvento` por `TipoId`) + `AplicarRegraEventoUnico()` (evento único). Nome resolvido do banco — não do enum `AgendaTipo`.
- **Tabela de regras por nome do tipo:**

  | Tipo (`CC_TipoEvento.Nome`, normalizado) | Dia inteiro | Horário | Span / Repetir até | Padrão semanal/mensal |
  |---|---|---|---|---|
  | FÉRIAS | **força** `true` (horas ignoradas; **exige `DataFim.Date > DataInicio.Date`**, 400 "defina a data de retorno") | não exige | **PERÍODO simples: linha única com span, sem repetição** (lote com span>0 ou padrão não-diário → 400 "não usa repetição") | não (só Diária) |
  | TREINAMENTO, DAILY | **proíbe** (400 se `true`) | **exige** `DataFim` (400 se ausente) | permite | **permite** (1/2/3) |
  | REUNIÃO, ATENDIMENTO | **proíbe** (400 se `true`) | **exige** `DataFim` (400 se ausente) | **dia único** (400 se `fim.Date > inicio.Date` ou repetição além do dia) | não (só Diária; sem efeito prático — dia único) |
  | Pessoal, Outro, sem tipo | livre | livre | permite | só Diária |
- **Aplicação:** Criar (`CriarEventoAsync`), Atualizar (`AtualizarEventoAsync`) e Lote (`CriarEventosLoteAsync`) — `ArgumentException` → HTTP 400 `{ mensagem }` PT-BR (ex.: `"Férias: defina a data de retorno (após o início)."`, `"Férias não usa repetição: informe Data início e Data fim."`, `"Reunião exige horário específico e não pode ser dia inteiro."`, `"<Tipo>: informe hora de início e fim."`, `"<Tipo> permite apenas um dia."`, `"<Tipo> não permite recorrência semanal/mensal."`). `MoverEventoAsync` não reaplica regra de tipo (só conflito).
- **Lote / recorrência (`AgendaCriarLoteRequest`: `dataRepeticaoFim*` + `padraoRecorrencia = 1`):** `padrao` mapeado `2 → Semanal`, `3 → Mensal`, demais → Diário; gera ocorrências por padrão até `dataRepeticaoFim` (`AddDays(1)` / `AddDays(7)` / `AddMonths(1)`); **agora grava `Recorrente = dias.Count > 1` e `PadraoRecorrencia = recorrente ? padrao : Nenhuma`** (`AGD_Recorrente`, `AGD_PadraoRecorrencia` — antes nunca gravados); cada ocorrência preserva a hora de início/fim do dia base; conflito validado **por dia** antes de persistir; modelo multi-dia via lote (N linhas) vale só p/ Treinamento/Daily — **Férias é linha única com span renderizada via `cobreDia()`** (retrocompatível com linhas de lote antigas).

### DTOs (Request/Response)
| DTO | Finalidade |
|-----|------------|
| `AgendaResumo` | Lista: id, operadorId, operadorNome, titulo, dataInicio, dataFim, diaInteiro, cor, tipo (enum), tipoId, tipoNome, tipoCor, projetoId, projetoCodigo |
| `AgendaDetalhe` | Resumo + descricao, local, participantes[], usuarioInclusao, dataInclusao, usuarioAlteracao, dataAlteracao |
| `AgendaCriarRequest` | titulo*, descricao?, local?, dataInicio*, dataFim?, diaInteiro, tipoId?, responsavelId*, projetoId?, participantesIds? (opcional — ausência/`null` não gera 400) || `AgendaAtualizarRequest` | CriarRequest + usuarioAlteracao* (participantesIds? permanece opcional) |
| `AgendaCriarLoteRequest` | CriarRequest + `dataRepeticaoFim*` + `padraoRecorrencia = 1` (0/1=Diária, 2=Semanal, 3=Mensal — `AgendaRecorrencia`) |
| `AgendaLoteResponse` | `{ totalCriados, eventos: AgendaDetalhe[] }` |
| `AgendaMoverRequest` | novaDataInicio*, novaDataFim* |
| `TipoEventoResponse` | id, nome, cor |
| `OperadorResumo` | id, nome, email |
| `FuncaoResumo` | id, descricao, classificacao? (filtro Função — `Dtos/Implantacao/AgendaDtos.cs:16-19`) |
| `AgendaParticipanteResponse` | participanteId, participanteNome |

### Banco de Dados
- `IMPL_Agenda` (AGD_) — eventos principais
- `CC_TipoEvento` — tipos configuráveis (nome, cor, ativo)
- `CC_AgendaParticipante` — N:N evento ↔ operador (participantes)
- `TBOPERADOR` — responsável + participantes (valida `SeAtivo = 'S'`); coluna `FuncaoId` **não** usada no filtro por função (sem backfill — permanece nula)
- `tbfuncionario` (legada, somente leitura) — **fonte real do filtro por função** via entidade `FuncionarioLegado` (`FUNCIONARIO_ID`, `FUNCAO_ID`, `OPERADOR_ID`, `ATIVO`; resto ignorado; `ToTable("tbfuncionario", t => t.ExcludeFromMigrations())` em `AppDbContext.cs:188-192`, sem migration): `FUNCAO_ID` (1=Analista de Sistemas, 2=Suporte, 3=Programador) ligado a `IMPL_Agenda`/`TBOPERADOR` pelo `OPERADOR_ID` exato, só `ATIVO = 'S'`
- `CC_Funcao` — funções do filtro Função (só `Ativo` com operadores ativos, via `ListarFuncoesAsync()`)
- `IMPL_Projeto` — projeto opcional vinculado ao evento

### Segurança
- `[Authorize]` em todos endpoints
- `[EnableRateLimiting("validacao")]` (5/min por usuário)
- Validação server-side: título obrigatório, data fim > data início, tipo ativo, responsável ativo, participantes ativos quando informados (`participantesIds` opcional), sem sobreposição de horários do responsável (409)
- **Autorização Owner + Admin (novas regras):**
  - `PUT /eventos/{id}` (AtualizarEvento): verifica se `isAdmin` OU `evento.OperadorId === usuarioId`; lança `ForbiddenException` (403) se não for dono nem admin. Também impede transferir responsabilidade para terceiro: `request.ResponsavelId !== evento.OperadorId && !== usuarioId` → 403.
  - `DELETE /eventos/{id}` (ExcluirEvento): verifica se `isAdmin` OU `evento.OperadorId === usuarioId`; lança `ForbiddenException` (403) caso contrário.
  - `PATCH /eventos/{id}/mover` (MoverEvento): verifica se `isAdmin` OU `evento.OperadorId === usuarioId`; lança `ForbiddenException` (403) caso contrário.
  - `POST /eventos` (CriarEvento): **permissivo** — pode criar evento para terceiros (sem restrição de ownership).
  - Helper `IsAdmin()`: verifica claim `perfil` = "Administrador" (ou role `Administrador`).
- Filtro por função via subquery correlata na legada (`_db.FuncionariosLegado.Any(f => f.OperadorId == a.OperadorId && f.FuncaoId == funcaoId && f.Ativo == "S")` — `AgendaService.cs:47-53`, sem `Contains` local/OPENJSON). Motivo: `TBOPERADOR.FUNCAO_ID` foi criado pela migration `AddFuncao` sem `UPDATE` de backfill e está nulo — nunca usar `Operador.FuncaoId` para este filtro
- OperadorId obtido via claims (`ClaimTypes.NameIdentifier` ou `sub`)
- Nova exception `ForbiddenException` (`Exceptions/ForbiddenException.cs`) para respostas 403 padronizadas

### Observações Técnicas
- `[ApiVersion("1.0")]` + `Route("api/v{version:apiVersion}/agenda")`
- `IAgendaService` / `AgendaService` injetado via DI
- `ObterOperadorId()` extrai do JWT claims
- Migration `20260911215943_AgendaV2_Ajuste`: adiciona `AGD_TipoId` FK → `CC_TipoEvento`, cria `CC_AgendaParticipante` (unique AgendaId+ParticipanteId), cria `CC_TipoEvento`
- Migration `20260914144751_AgendaConflitoHorarios` (Fase 1): índice composto `IX_IMPL_Agenda_Operador_DataInicio_DataFim` em `IMPL_Agenda` (`AGD_OperadorId`, `AGD_DataInicio`, `AGD_DataFim`); script idempotente `Migrations/Sql/AgendaConflitoHorarios_Idempotente.sql` para aplicação manual (deploy **não** aplica migrations)
- `participantesIds` opcional (correção 2026-09-14, confirmada no código): `AgendaCriarRequest.ParticipantesIds` e `AgendaAtualizarRequest.ParticipantesIds` são `List<string>?` sem `[Required]` (`Dtos/Implantacao/AgendaDtos.cs:69,81`); `AgendaService` já tratava `null` via `request.ParticipantesIds?.Any() == true` (`Services/Implantacao/AgendaService.cs:225,286`); POST/PUT sem participantes não retorna mais 400 `The ParticipantesIds field is required`
- Seed de tipos de evento sugerido em `Program.cs` (Development)

---

## 18. Backend — Entidades & Banco de Dados

### 18.1 Tabelas do Sistema (Produção — SQL Server)

| Tabela | Descrição | Model |
|--------|-----------|-------|
| `RefreshTokens` | Refresh tokens hasheados (SHA-256), rotativos | `RefreshToken.cs` |
| `AuditoriaAcessos` | Auditoria de login/logout/visualização | `AuditoriaAcesso.cs` |
| `TBOPERADOR` | Operadores do sistema (login, perfil, função) | `Operador.cs` |

### 18.1.1 Cadastro de Operadores — Atribuição Automática por Perfil e Função

**Regra de Negócio**: No cadastro de operadores, **não há campo de seleção manual de equipe**. A equipe e o papel do operador são atribuídos automaticamente a partir do vínculo da **Função** e do **Perfil**.

#### Mapeamento das Tabelas e Regras

##### Tabela: `TBOPERADOR`
- A coluna `PERFIL_ID` estabelece o nível de acesso do operador.
- A coluna `FUNCAO_ID` (FK para `CC_Funcao`) define a função e papel automático.

##### Tabela: `CC_Funcao`
> ⚠️ Não confundir com a tabela legada `tbfuncao` (schema incompatível: `FUNCAO_ID smallint`, sem `CLASSIFICACAO`/`ATIVO`) — o sistema usa exclusivamente `CC_Funcao`.
| FUNCAO_ID | DESCRICAO | Classificação / Regra de Negócio |
| :--- | :--- | :--- |
| **1** | Analista de Sistemas | **Implantador** (Definido automaticamente como responsável por projetos de implantação) |
| **2** | Suporte | Atendimento operacional e resolução de chamados |
| **3** | Programador | Desenvolvimento e engenharia de software |

#### Regra de Processamento
- Ao selecionar a função do operador no cadastro:
  - Caso `FUNCAO_ID = 1` (Analista de Sistemas), a aplicação seta internamente o papel do usuário como **Implantador**, vinculando-o diretamente aos fluxos e projetos do módulo de Implantação.
  - O banco de dados grava o registro na `TBOPERADOR` com a relação de `PERFIL_ID` e `FUNCAO_ID` sem necessidade de escolha manual de equipe.
  - O claim `eh_implantador` é adicionado ao JWT quando `FUNCAO_ID = 1`.

### Fluxo de Persistência e Comunicação com o Banco de Dados (Cadastro de Operador)

1. **Consulta e Renderização Inicial (SELECT)**
   - Ao acessar o cadastro, o backend consulta `CC_Funcao` para popular o dropdown de funções disponíveis.

2. **Criação e Registro de Novos Dados (INSERT)**
   - O administrador preenche os dados do operador e seleciona a Função.
   - A aplicação envia os dados via POST.
   - O banco grava os dados na tabela `TBOPERADOR` (`INSERT INTO ...`) com `PERFIL_ID` e `FUNCAO_ID`.
   - Se `FUNCAO_ID = 1`, o claim `eh_implantador=true` é incluído no JWT gerado no login.

3. **Atualização e Alterações (UPDATE)**
   - Alterações de função ou perfil disparam uma requisição PUT.
   - É executado um comando `UPDATE` na tabela `TBOPERADOR`, atualizando `FUNCAO_ID`, `PERFIL_ID` e `DataAlteracao`.
   - O claim `eh_implantador` no JWT é recalculado no próximo login/refresh.

4. **Remoção ou Inativação (DELETE / Soft Delete)**
   - Ao inativar um operador, a aplicação executa um `UPDATE` alterando `SE_ATIVO = 'N'` para preservar o histórico.

---

### 18.2 Tabelas e modelo vigente do módulo IMPLANTAÇÃO

| Tabela | Prefixo | Descrição | Model |
|--------|---------|-----------|-------|
| `IMPL_Cliente` | `CLI_` | Legada interna — **não é a fonte atual**; a fonte única de clientes é `tbcliente` (somente leitura) | `Cliente.cs` |
| `tbcliente` | — | Fonte de clientes (CNPJ, razão social, fantasia, ativo; somente leitura, fora das migrations) | `ClienteLegado.cs` |
| `IMPL_TipoProjeto` | `TPP_` | Tipos `CLIENTE`/`CARTEIRA`/`INTEGRACAO`/`PROJETO_CIAA` | `TipoProjeto.cs` |
| `IMPL_ColunaKanban` | `CLK_` | Colunas do Kanban; 7 colunas padrão são seedadas | `ColunaKanban.cs` |
| `IMPL_Projeto` | `PRJ_` | Projeto principal; código sequencial global `PRJ-0001` | `Projeto.cs` |
| `tbprojetoEtapa` | `PEP_` | **Nove cards fixos por projeto**; `PEP_ProjetoId` vincula ao projeto | `ProjetoEtapa.cs` |
| `tbprojetoEtapaChecklist` | `PEC_` | Itens de checklist do card | `ProjetoEtapa.cs` |
| `tbprojetoEtapaDocumento` | `PED_` | Documentos do card | `ProjetoEtapa.cs` |
| `tbprojetoEtapaHistorico` | `PEH_` | Histórico do card | `ProjetoEtapa.cs` |
| `tbprojetoEtapaComentario` | `PEC_` | Comentários do card | `ProjetoEtapa.cs` |
| `IMPL_Tarefa` | `TRF_` | Tarefa; vínculo vigente `TRF_ProjetoEtapaId` → `tbprojetoEtapa.PEP_Id`, `NO ACTION`/`Restrict`; não existe mais `TRF_EtapaId` | `Tarefa.cs` |
| `IMPL_ComentarioTarefa` | `CMT_` | Comentários da tarefa | `ComentarioTarefa.cs` |
| `IMPL_TarefaResponsavel` | — | N:N tarefa↔operador | `TarefaResponsavel.cs` |
| `IMPL_TarefaChamado` | — | N:N tarefa↔chamado legado | `TarefaChamado.cs` |
| `IMPL_TarefaApontamento` | `APT_` | Apontamentos de horas | `TarefaApontamento.cs` |

> **Etapas Globais removidas:** a migration `20260922154202_RemoveEtapaAntiga` removeu a tabela `IMPL_Etapa`, a FK e a coluna legadas `IMPL_Tarefa.TRF_EtapaId`, e substituiu a FK do card por `Restrict` para `tbprojetoEtapa`. Não há model `Etapa`, `EtapaService` nem `EtapasController` no source atual. Referências a `IMPL_Etapa` nas migrations anteriores descrevem apenas o histórico do schema.
>
> **Removidas em 2026-09-12** (migration `20260912173928_RemoveEquipes`): `IMPL_Equipe` (`EQP_`) e `IMPL_MembroEquipe` (`MBE_`), além de `PRJ_EquipeId` e `TPP_EquipeId`.

### 18.2.1 Tabelas da Agenda V2 (MVP — `/api/v1/agenda`)

| Tabela | Prefixo | Descrição | Model |
|--------|---------|-----------|-------|
| `IMPL_Agenda` | `AGD_` | Eventos principais (titulo, datas, tipo, responsável, projeto, cor, visibilidade, recorrência) | `AgendaItem.cs` |
| `CC_TipoEvento` | — | Tipos de evento configuráveis (nome, cor, ativo) | `TipoEvento.cs` |
| `CC_AgendaParticipante` | — | N:N evento ↔ operador (participantes adicionais) | `AgendaParticipante.cs` |

> **Índice de conflito (Fase 1):** `IX_IMPL_Agenda_Operador_DataInicio_DataFim` em `IMPL_Agenda` (`AGD_OperadorId`, `AGD_DataInicio`, `AGD_DataFim`) — `AppDbContext.cs:142-143`, migration `20260914144751_AgendaConflitoHorarios`.

> **Nota sobre a Agenda V1 (removida):** As tabelas `IMPL_Agenda` (versão antiga, migration `AddAgendaAndPerfis`) e `IMPL_MembroPerfil` permanecem no banco como órfãs (rollback `8956c57`). A **Agenda V2** usa a mesma tabela `IMPL_Agenda` mas com schema estendido (`AGD_TipoId` FK para `CC_TipoEvento`, nova tabela `CC_AgendaParticipante`). Ver `docs/AGENDA-REIMPLEMENTACAO.md`.

### 18.3 Migrations EF Core

| Migration | Data | Descrição |
|-----------|------|-----------|
| `20260904194350_ImplantacaoInit` | 2026-09-04 | Criação das 9 tabelas `IMPL_*` (v1.0.0) |
| `20260905195554_AddLegadoLinks` | 2026-09-05 | FKs lógicas para `tbcliente` e `tbchamado` (v1.2.0) |
| `20260905203422_AddAgendaAndPerfis` | 2026-09-05 | `IMPL_Agenda`, `IMPL_MembroPerfil` (v1.3.0) — **feature removida no rollback `8956c57`, tabelas órfãs mantidas** |
| `20260906033406_AddAuditoriaImplantacao` | 2026-09-06 | Auditoria do módulo IMPLANTAÇÃO |
| `20260910163216_AddFuncao` | 2026-09-10 | Adiciona `FUNCAO_ID` em `TBOPERADOR` + cria `CC_Funcao` + FK (substitui as migrations `AddFuncaoIdToOperador`/`AddFuncaoTableAndRelation`, nunca aplicadas — a `tbfuncao` legada foi preservada). Script: `Migrations/Sql/AddFuncao.sql` — **aplicado em produção em 2026-09-10** |
| `20260911215943_AgendaV2_Ajuste` | 2026-09-11 | Agenda V2 (MVP): adiciona `AGD_TipoId` FK → `CC_TipoEvento`, cria `CC_AgendaParticipante` (unique AgendaId+ParticipanteId), cria `CC_TipoEvento` |
| `20260912173928_RemoveEquipes` | 2026-09-12 | Remove `IMPL_Equipe` + `IMPL_MembroEquipe`; remove `PRJ_EquipeId` (`IMPL_Projeto`) e `TPP_EquipeId` (`IMPL_TipoProjeto`); adiciona auditoria em `TipoProjeto` (`TPP_UsuarioAlteracao`/`TPP_DataAlteracao`). Criada nas Fases 2–3 (`PLANO-IMPLEMENTACAO-FASES.md`), com deploy em produção 192.168.2.130 OK no mesmo dia. **Incidente 2026-09-14 (homolog .154):** o script idempotente original recriava `FK_IMPL_Projeto_IMPL_TipoProjeto` com `ON DELETE CASCADE` e falhou no SQL Server com erro **1785/1750 + 3902** (múltiplos caminhos CASCADE). **Correção (confirmada no código):** `AppDbContext.cs` (bloco `Projeto`) agora usa `.OnDelete(DeleteBehavior.Restrict)` com comentário explicando o veto do SQL Server (caminho `Etapa→TipoProjeto` já é `Cascade`); `20260912173928_RemoveEquipes.cs` (`Up`, linhas 87–93) recria a FK com `onDelete: ReferentialAction.Restrict` (`Down` já era `Restrict`); `RemoveEquipes.Designer.cs`, `AppDbContextModelSnapshot.cs` e `20260914144751_AgendaConflitoHorarios.Designer.cs` registram `Projeto→TipoProjeto = Restrict` e `Etapa→TipoProjeto = Cascade`; `Migrations/Sql/RemoveEquipes_Idempotente.sql` regenerado com `ON DELETE NO ACTION`. Ver **§18.3.1** (incidente, causa e regra preventiva) |
| `20260914144751_AgendaConflitoHorarios` | 2026-09-14 | Agenda V2 Fase 1: índice composto `IX_IMPL_Agenda_Operador_DataInicio_DataFim` em `IMPL_Agenda` (`AGD_OperadorId`, `AGD_DataInicio`, `AGD_DataFim`). Script idempotente `Migrations/Sql/AgendaConflitoHorarios_Idempotente.sql` (só `CREATE INDEX` + registro em `__EFMigrationsHistory`) — **aplicação manual, deploy não aplica migrations** |
| `20260918211919_AddProjetoEtapas` | 2026-09-18 | Cria `tbprojetoEtapa` e tabelas de checklist, documento, histórico e comentário dos cards fixos por projeto |
| `20260920185734_TarefaProjetoEtapaId` | 2026-09-20 | Contador dinâmico por card: `IMPL_Tarefa.TRF_ProjetoEtapaId` + índice/FK para `tbprojetoEtapa.PEP_Id`; o `Up` histórico ainda fazia backfill por `IMPL_Etapa.ETP_Nome`, portanto a etapa seguinte retirou essa dependência |
| `20260922154202_RemoveEtapaAntiga` | 2026-09-22 | Remove a FK/índice/coluna `TRF_EtapaId` e a tabela `IMPL_Etapa`; recria `FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId` com `Restrict` |

> A limpeza de endpoints posterior não criou migration nem alterou banco. `scripts/deploy/deploy.ps1` continua sem aplicar migrations automaticamente.

#### 18.3.1 Incidente `RemoveEquipes` — CASCADE rejeitado (erro 1785) e correção

> **Escopo desta seção:** fatos de código confirmados nos arquivos citados; trecho de produção (`.154`, `__EFMigrationsHistory` envenenado, migration fantasma `20260910183240_AgendaGeral`) registrado como **relato operacional** fornecido na ocorrência, não verificável no código deste repo.
>
> **Estado posterior:** as menções a `Etapa → TipoProjeto` descrevem o schema de 12/09/2026. A migration `20260922154202_RemoveEtapaAntiga` removeu essa relação e a tabela `IMPL_Etapa`; atualmente o fluxo é `Projeto → tbprojetoEtapa`.

- **O que aconteceu (relato operacional):** em homologação (`.154`), o script `RemoveEquipes_Idempotente.sql` com `ON DELETE CASCADE` na FK `FK_IMPL_Projeto_IMPL_TipoProjeto` falhou com erro **1785/1750** ("não é possível criar a restrição... múltiplos caminhos em cascata") + **3902** (transação abortada). Linhas foram marcadas em `__EFMigrationsHistory` **sem o DDL ter aplicado** (history "envenenado"); o usuário limpou as linhas manualmente (**Fase 0**) antes da reaplicação.
- **Causa (confirmada no código):** convenção do EF — FK obrigatória (`PRJ_TipoProjetoId`, `nullable: false`) sem `OnDelete` explícito gera `Cascade` por padrão. Com dois caminhos `TipoProjeto → Projeto` e `TipoProjeto ← Etapa`, o SQL Server rejeita o segundo `CASCADE`. O `Up` original da migration recriava a FK com `Cascade`, reproduzindo o problema.
- **Correção (confirmada no código):**
  - `backend/Central_BackEnd/Data/AppDbContext.cs` (bloco `Projeto`, linhas ~112–117): `.OnDelete(DeleteBehavior.Restrict)` + comentário "Cascade aqui é rejeitado pelo SQL Server — múltiplos caminhos via `Etapa→TipoProjeto`".
  - `backend/Central_BackEnd/Migrations/20260912173928_RemoveEquipes.cs` (`Up`): `AddForeignKey ... PRJ_TipoProjetoId ... onDelete: ReferentialAction.Restrict` (`Down` já era `Restrict`).
  - `20260912173928_RemoveEquipes.Designer.cs`, `AppDbContextModelSnapshot.cs`, `20260914144751_AgendaConflitoHorarios.Designer.cs`: bloco `Projeto`/`TipoProjeto` com `.OnDelete(DeleteBehavior.Restrict)`; relação `Etapa→TipoProjeto` permanece `Cascade` (correto — único caminho em cascata desse lado).
  - `Migrations/Sql/RemoveEquipes_Idempotente.sql` regenerado: `ADD CONSTRAINT FK_IMPL_Projeto_IMPL_TipoProjeto ... ON DELETE NO ACTION` (antes `CASCADE`).
  - `Migrations/Sql/AgendaConflitoHorarios_Idempotente.sql` regenerado (só `CREATE INDEX` + `history`).
- **Migration fantasma (relato operacional):** linha `20260910183240_AgendaGeral` existe no `history` do banco de produção, mas **não existe** como arquivo em `Migrations/` (criada/aplicada em produção no commit `5e8b5ab`, branch `backup-master-pre-agenda-rollback`, "Agenda V1 FullCalendar"; arquivos deletados no rollback). Tabelas órfãs prováveis: `AgendaEvento`/`AgendaEventoParticipante`. O EF **ignora** linhas desconhecidas do history; o **snapshot atual é autoritativo** (scaffold fantasma veio vazio — sem tabelas a mapear).
- **Regra preventiva (obrigatória):** **toda FK obrigatória exige `OnDelete` explícito** (`Restrict`, `SetNull` ou `Cascade` consciente) em `AppDbContext.cs`; **validar o SQL gerado** (`dotnet ef migrations script`) **antes de rodar em produção**, procurando `ON DELETE CASCADE` duplicado sobre o mesmo principal. **NUNCA** considerar migration "aplicada" só pela mensagem de erro — conferir `SELECT MigrationId FROM __EFMigrationsHistory` contra o schema real (ver `docs/DEPLOY.md` § aplicação manual de migrations).

### 18.4 Serviços Principais do Backend

| Service | Finalidade | Observações |
|---------|------------|-------------|
| `AuthService` | JWT login/refresh/logout/me | Refresh token rotativo, SHA-256 |
| `GoogleSheetsService` | Leitura planilha Google Sheets | API key + fallback CSV, cache 10 min |
| `PasswordValidationService` | Validação senha mestre | Cache 5 min + lockout |
| `BruteForceGuard` | Anti-força bruta | 5 falhas/5 min → 15 min |
| `SegurancaHelper` | Comparação senha em tempo constante | SHA-256 |
| `ProjetoService` | CRUD projetos + geração de código | `ProximoCodigoAsync()` (sem args, prefixo fixo `PRJ`); `AtualizarAsync` ainda aplica `ProjetoAtualizarRequest.Status` quando informado |
| `ProjetoJornadaService` | Cálculo privado e persistência do progresso | Permanece porque `TarefaService` injeta `IProjetoJornadaService` e chama `RecalcularProgressoAsync`; não expõe endpoint próprio |
| `ProjetoEtapaService` | Nove cards fixos por projeto + sincronização por tarefas | `InicializarEtapasPadraoAsync` é chamado ao criar o projeto e também pela leitura de etapas quando o projeto ainda não tem cards; `ObterEtapasAsync`, `SincronizarEtapasPorTarefasAsync` e demais operações dos cards |
| `DashboardService` | KPIs agregados | `porEquipe` = stub único `Geral`; `EquipeNome` = `"Geral"` (pós-remoção de Equipes) |
| `DatabaseService` | Database Explorer endpoints | 19 endpoints (24/09/2026) |
| `LegacyDataService` | Dados legados | Read-only |
| `AgendaService` | CRUD Agenda V2 (eventos, tipos, participantes, funções) + validação de conflito de horários (Fase 1) | `IAgendaService` / `AgendaService` (`FimEfetivo()`, `QueryConflito()`, `ObterConflitosAsync()`, `ValidarSemConflitoAsync()` → `ConflictException`/`CONFLICT_HORROSARIOS`/409; `ListarEventosAsync(..., funcaoId?)` filtra por `Operador.FuncaoId` via subquery; `ListarFuncoesAsync()` retorna funções ativas com operadores ativos) |
| `TarefaService` | CRUD tarefas + progresso do projeto + contador por card + sincronia coluna↔status | `ValidarEtapaFixaAsync`; `RecalcularJornadaAsync` → `IProjetoJornadaService.RecalcularProgressoAsync` e depois `SincronizarEtapasPorTarefasAsync`; `StatusDaColuna`/`ColunaPorStatusAsync`; `OndeAtrasadas()` |

> **Banco de produção (dbBUSINESS_HML): compatibilidade 100 (SQL 2008).** O EF Core traduz `Where(x => listaCapturada.Contains(...))` para `OPENJSON`, que exige compat ≥ 130 → 500 "Sintaxe incorreta próxima a '$'" (Error 102). Regra do código (2026-09-18): **nunca** `Contains` em coleção capturada — usar `EXISTS` correlacionado, carga total de tabelas pequenas + filtro em memória, ou loop por PK. Também proibido `GroupBy` sem agregação antes de materializar. Exceções não tratadas agora são logadas (`GlobalExceptionHandler` no `Program.cs`; ler em `Suporte_Back\logs\stdout*.log` com `stdoutLogEnabled=true`).
> **Migration `20260917202045_TarefaProjetoOpcional` aplicada manualmente em produção em 2026-09-18** (`TRF_ProjetoId` NULL; sem linha em `__EFMigrationsHistory` — um futuro `dotnet ef database update` a registrará sem efeito colateral).

### 18.5 Configuração do Backend (`Program.cs`)

```csharp
// Autenticação JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
            // ...
        };
    });

// Rate Limiting
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// CORS com AllowCredentials()
builder.Services.AddCors(options => {
    options.AddPolicy("Angular", policy => policy
        .WithOrigins("http://192.168.2.130:1010", "http://localhost:4200", "http://localhost:1010")
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});
```

### 18.6 Ambiente de Desenvolvimento vs Produção

| Aspecto | Development | Produção |
|---------|-------------|----------|
| Banco | `Database:UseSqlServer` em `appsettings.Development.json`: `true` → SQL homolog `192.168.2.154`/`dbBUSINESS_HML`; `false` → InMemory (seed) | SQL Server (`appsettings.json` do servidor) |
| Swagger | `SwaggerEnabled: true` | `SwaggerEnabled: false` |
| Senha JWT | Chave fraca de propósito | `JWT_KEY` via env var |
| Seed | 1 operador (admin/admin123), 4 tipos, 7 colunas, 7 tipos de evento; sem seed de Etapas Globais (os nove cards são gerados por projeto); clientes vêm de `tbcliente`; seeds de exemplo desabilitados via `#if false` | Nenhum (dados reais) |
| AppSettings | `appsettings.Development.json` | `appsettings.json` do servidor (preservado) |

---

> ⚠️ **Nota:** Este arquivo é gerado automaticamente. Qualquer alteração em componentes, services, controllers ou models deve ser refletida aqui pelo agente `docs-writer`.
> Para atualizar: invocar `@docs-writer` ou o workflow GitHub Action `docs-sync.yml` executará em PRs para `developer`.
