---
title: "Catálogo de endpoints"
description: "Catálogo completo das APIs, contratos, autorização, respostas e limitações dos controllers atuais."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# Catálogo de endpoints

Catálogo derivado dos `Controllers`, DTOs e do registro de autenticação/limite de requisições no código atual. Os exemplos foram montados a partir dos DTOs; eles não ampliam o contrato e não substituem a validação do servidor.

## Índice e contagem

| Controller / módulo | Operações `[Http*]` | Rota-base |
|---|---:|---|
| `AuthController` / autenticação | 4 | `/api/v1/auth` |
| `AcessosController` / acessos | 3 | `/api/v1/acessos` |
| `AgendaController` / agenda | 10 | `/api/v1/agenda` |
| `RagProxyController` / RAG | 1 | `/api/rag-proxy` |
| `TiposProjetoController` / Implantação | 5 | `/api/v1/implantacao/tipos-projeto` |
| `ColunasKanbanController` / Implantação | 5 | `/api/v1/implantacao/colunas-kanban` |
| `ProjetosController` / Implantação | 16 | `/api/v1/implantacao/projetos` |
| `TarefasController` / Implantação | 16 | `/api/v1/implantacao/tarefas` |
| `DashboardController` / Implantação | 1 | `/api/v1/implantacao/dashboard` |
| `AdminDashboardController` / administração | 1 | `/api/v1/admin/dashboard` |
| `DatabaseController` / Database Explorer | 24 | `/api/v1/database` |
| **Total** | **86** | — |

O `DashboardController` é uma classe separada declarada no mesmo arquivo de `TarefasController.cs`. A contagem é de métodos de ação com atributo HTTP, não de rotas Swagger ou de endpoints gerados pelo framework.

## Versão, autorização e limite de requisições

- A API habilita versionamento com versão padrão `1.0`; as rotas dos controllers versionados são acessadas por `/api/v1`. A versão também pode ser informada pelo header `X-Api-Version`.
- `JWT` significa `[Authorize]` com Bearer. `JWT + Administrador` significa `[Authorize(Roles = "Administrador")]` no método, combinado com a autorização do controller.
- `Público` significa que não há `[Authorize]` no método/controller para a rota. `—` na coluna de limite significa que não foi encontrado `EnableRateLimiting` naquele controller/método; não significa que outra camada não possa proteger a aplicação.
- `login` usa uma janela fixa de cinco requisições por minuto fora de Development e cinquenta em Development, com chave pelo IP remoto.
- `validacao` usa cinquenta por minuto fora de Development e cem em Development; `leitura` usa cem por minuto. As duas políticas tentam identificar o usuário autenticado, mas `UseRateLimiter()` é registrado antes de `UseAuthentication()` no pipeline atual; por isso o limitador observa a requisição antes da autenticação e a chave efetiva é o IP remoto. A rejeição é `429 Too Many Requests`.
- Todas as tabelas abaixo usam Bearer, exceto login e refresh. O refresh é público no controller porque a autenticação é feita pelo cookie `cc_refresh`.

Fonte de referência: [Program.cs](../backend/Central_BackEnd/Program.cs).

## Autenticação

Fonte: [AuthController.cs](../backend/Central_BackEnd/Controllers/AuthController.cs).

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Público | `login` | Body `LoginRequest`: `usuario`, `senha`, `lembrarAcesso` | `200 TokenResponse`; o campo `refreshToken` permanece no JSON como `refreshToken: ""`. `400` para campos ausentes e `401` para credenciais inválidas. |
| `POST` | `/api/v1/auth/refresh` | Público | — | Sem body necessário; o frontend envia `{}` | `200 TokenResponse`; renova e rotaciona o cookie, mantendo no JSON `refreshToken: ""`. `401` se o cookie estiver ausente, revogado ou expirado. |
| `POST` | `/api/v1/auth/logout` | JWT | — | Sem body | `204`; revoga o refresh enviado e limpa os cookies. |
| `GET` | `/api/v1/auth/me` | JWT | — | Sem body | `200 UsuarioResponse`; `401` para token sem operador e `404` para usuário não encontrado. |

O login aceita `Usuario` como `OperadorId` ou `Email`. A resposta inclui `AccessToken`, `ExpiraEmSegundos` e `User`; o refresh bruto não deve ser tratado como campo de resposta utilizável.

## Acessos

Fonte: [AcessosController.cs](../backend/Central_BackEnd/Controllers/AcessosController.cs).

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `GET` | `/api/v1/acessos` | JWT | — | Sem body | `200 List<EmpresaResumo>`; somente `id` e `nomeEmpresa`. Falhas do Google Sheets retornam `502` ou `500` conforme o tratamento do controller. |
| `POST` | `/api/v1/acessos/validar-senha` | JWT | `validacao` | Body `PasswordValidationRequest`: `usuario`, `senha` | `200 PasswordValidationResponse`; `400` para campo obrigatório ausente e `401` para claim inválido. |
| `POST` | `/api/v1/acessos/visualizar?empresaId={id}` | JWT | `validacao` | Query `empresaId`; body opcional `PasswordValidationRequest` | `200 EmpresaDetalheResponse` com dados de acesso, banco, VPN e observações. `403` quando a revalidação não foi feita ou falhou; `404` para empresa inexistente. |

A revalidação é por operador e dura cinco minutos no serviço. A listagem não exige a senha; a visualização exige a revalidação ou uma senha no body.

## Agenda

Fonte: [AgendaController.cs](../backend/Central_BackEnd/Controllers/AgendaController.cs).

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `GET` | `/api/v1/agenda/eventos` | JWT | `leitura` | Query `inicio`, `fim`, `responsavelId?`, `funcaoId?` | `200 List<AgendaResumo>`. |
| `GET` | `/api/v1/agenda/eventos/{id}` | JWT | `leitura` | Path `id`; sem body | `200 AgendaDetalhe` ou `404`. |
| `POST` | `/api/v1/agenda/eventos` | JWT | `validacao` | Body `AgendaCriarRequest` | `201 AgendaDetalhe`; `400` para regras de data/tipo e `409` para conflito. |
| `POST` | `/api/v1/agenda/eventos/lote` | JWT | `validacao` | Body `AgendaCriarLoteRequest` | `201 AgendaLoteResponse` com `totalCriados` e `eventos`; `400`/`409` conforme validações. |
| `PUT` | `/api/v1/agenda/eventos/{id}` | JWT | `validacao` | Body `AgendaAtualizarRequest` | `200 AgendaDetalhe`; `403` para responsável/transferência não autorizada, `404` se ausente e `409` para conflito. |
| `DELETE` | `/api/v1/agenda/eventos/{id}` | JWT | `validacao` | Path `id`; sem body | `204` ou `404`; `403` para não responsável não administrador. |
| `PATCH` | `/api/v1/agenda/eventos/{id}/mover` | JWT | `validacao` | Body `AgendaMoverRequest` | `200 AgendaDetalhe`; `400` para intervalo, `403` para responsabilidade não autorizada e `409` para conflito. |
| `GET` | `/api/v1/agenda/tipos` | JWT | `leitura` | Sem body | `200 List<TipoEventoResponse>` de tipos ativos. |
| `GET` | `/api/v1/agenda/funcoes` | JWT | `leitura` | Sem body | `200 List<FuncaoResumo>`; filtra funções ligadas a funcionários legados ativos. |
| `GET` | `/api/v1/agenda/operadores` | JWT | `leitura` | Sem body | `200 List<OperadorResumo>` de operadores ativos. |

O conflito é devolvido com `mensagem`, `conflitos` e `code`. O tipo de evento pode impor horário, dia inteiro e regras de recorrência; essas regras estão descritas em [AgendaService.cs](../backend/Central_BackEnd/Services/Implantacao/AgendaService.cs).

**Limitação de leitura:** `GET /eventos` não filtra `AgendaItem.Visibilidade`, e `GET /eventos/{id}` não verifica visibilidade nem propriedade. A persistência de `Visibilidade` não impede que um usuário autenticado liste/obtenha um evento privado; a checagem de responsável/administrador existe nas mutações. Essa é uma limitação de segurança, não uma regra desejada.

## RagProxy

Fonte: [RagProxyController.cs](../backend/Central_BackEnd/Controllers/RagProxyController.cs).

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `POST` | `/api/rag-proxy/chat` | JWT | — | Body `RagChatRequest` | `200 RagChatResponse` com `resposta`, `documentos`, `tempoProcessamento` e `sessionId`. |

Esta é a exceção de versionamento: a rota não contém `/api/v1` e o controller não tem `[ApiVersion]`. O proxy pode usar o AnythingLLM externo ou a resposta simulada configurada; isso não transforma o endpoint em uma API pública.

## Tipos de projeto

Fonte: [TiposProjetoController.cs](../backend/Central_BackEnd/Controllers/Implantacao/TiposProjetoController.cs).

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `GET` | `/api/v1/implantacao/tipos-projeto` | JWT | — | Query `apenasAtivos=true` | `200 List<TipoProjetoResumo>`. |
| `GET` | `/api/v1/implantacao/tipos-projeto/{id}` | JWT | — | Path `id`; sem body | `200 TipoProjetoDetalhe` efetivo ou `404`. A assinatura do controller declara `ActionResult<TipoProjetoResumo>`, mas o serviço retorna detalhe. |
| `POST` | `/api/v1/implantacao/tipos-projeto` | JWT + Administrador | — | Body `TipoProjetoCriarRequest` | `201` com o detalhe retornado pelo serviço; `400` para argumento inválido. |
| `PUT` | `/api/v1/implantacao/tipos-projeto/{id}` | JWT + Administrador | — | Body `TipoProjetoAtualizarRequest` | `200` com o detalhe retornado pelo serviço ou `404`. |
| `DELETE` | `/api/v1/implantacao/tipos-projeto/{id}` | JWT + Administrador | — | Path `id`; sem body | `204` ou `404`; se houver projeto vinculado, o `InvalidOperationException` do serviço não é tratado pelo controller e pode resultar em `500`. |

## Colunas Kanban

Fonte: [ColunasKanbanController.cs](../backend/Central_BackEnd/Controllers/Implantacao/ColunasKanbanController.cs).

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `GET` | `/api/v1/implantacao/colunas-kanban` | JWT | — | Query `apenasAtivas=true` | `200 List<ColunaKanbanResumo>`. |
| `POST` | `/api/v1/implantacao/colunas-kanban` | JWT + Administrador | — | Body `ColunaKanbanCriarRequest` | `200 ColunaKanbanDetalhe` efetivo; a assinatura declara resumo. |
| `PUT` | `/api/v1/implantacao/colunas-kanban/{id}` | JWT + Administrador | — | Body `ColunaKanbanAtualizarRequest` | `200 ColunaKanbanDetalhe` efetivo ou `404`. |
| `DELETE` | `/api/v1/implantacao/colunas-kanban/{id}` | JWT + Administrador | — | Path `id`; sem body | `204` ou `404`; coluna padrão ou com tarefas pode retornar `400`. |
| `POST` | `/api/v1/implantacao/colunas-kanban/reordenar` | JWT + Administrador | — | Body `ColunaKanbanReordenarRequest` | `204` após atualizar a ordem. |

## Projetos

Fonte: [ProjetosController.cs](../backend/Central_BackEnd/Controllers/Implantacao/ProjetosController.cs). O controller tem `[Authorize]` e `validacao` no nível de classe; a ação de clientes usa `leitura`.

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `GET` | `/api/v1/implantacao/projetos` | JWT | `validacao` (controller) | Query `tipo`, `status`, `clienteId?`, `responsavelId?`, `buscar?`, `perfilId?` | `200 List<ProjetoResumo>`; corte de 500 registros. |
| `GET` | `/api/v1/implantacao/projetos/com-etapas` | JWT | `validacao` (controller) | Mesmos filtros da listagem | `200 List<ProjetoComEtapasResumo>`, com resumo e etapas; corte de 500 projetos. |
| `GET` | `/api/v1/implantacao/projetos/{id}` | JWT | `validacao` (controller) | Path `id`; sem body | `200 ProjetoDetalhe` ou `404`. |
| `GET` | `/api/v1/implantacao/projetos/etapas-padrao` | JWT | `validacao` (controller) | Sem body | `200 List<object>` com `ordem` e `nome` das nove etapas. |
| `GET` | `/api/v1/implantacao/projetos/{id}/etapas` | JWT | `validacao` (controller) | Path `id`; sem body | `200 List<ProjetoEtapaResumo>`. |
| `GET` | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}` | JWT | `validacao` (controller) | Path `id`, `ordem`; sem body | `200 ProjetoEtapaDetalhe` ou `404`. |
| `GET` | `/api/v1/implantacao/projetos/proximo-codigo` | JWT | `validacao` (controller) | Sem body | `200 { codigo }` com a prévia `PRJ-####`. |
| `GET` | `/api/v1/implantacao/projetos/clientes` | JWT | `leitura` (ação) | Sem body | `200 List<ClienteResumo>` de clientes legados ativos. |
| `POST` | `/api/v1/implantacao/projetos` | JWT | `validacao` (controller) | Body `ProjetoCriarRequest` | `201 ProjetoDetalhe`; o controller inicializa as etapas depois de criar. |
| `PUT` | `/api/v1/implantacao/projetos/{id}` | JWT | `validacao` (controller) | Body `ProjetoAtualizarRequest` | `200 ProjetoDetalhe` ou `404`. |
| `PUT` | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}` | JWT | `validacao` (controller) | Body `ProjetoEtapaAtualizarRequest` | `200 ProjetoEtapaDetalhe`. |
| `POST` | `/api/v1/implantacao/projetos/{id}/etapas/retornar` | JWT | `validacao` (controller) | Body `ProjetoEtapaRetornoRequest` | `200 ProjetoEtapaDetalhe`. |
| `POST` | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}/checklist` | JWT | `validacao` (controller) | Body `ProjetoEtapaChecklistItemRequest` | `200 ProjetoEtapaDetalhe`. |
| `POST` | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}/documentos` | JWT | `validacao` (controller) | Body `ProjetoEtapaDocumentoRequest` | `200 ProjetoEtapaDetalhe`. |
| `POST` | `/api/v1/implantacao/projetos/{id}/etapas/{ordem}/comentarios` | JWT | `validacao` (controller) | Body `ProjetoEtapaComentarioRequest` | `200 ProjetoEtapaDetalhe`. |
| `DELETE` | `/api/v1/implantacao/projetos/{id}` | JWT | `validacao` (controller) | Path `id`; sem body | `204` ou `404`. |

## Tarefas

Fonte: [TarefasController.cs](../backend/Central_BackEnd/Controllers/Implantacao/TarefasController.cs). Todas as operações abaixo usam `[Authorize]` e `validacao` no nível de classe.

| Método | Rota | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|
| `GET` | `/api/v1/implantacao/tarefas` | `validacao` | Query equivalente a `TarefaFiltro`: `projetoId`, `equipe`, `responsavelId`, `status`, `prioridade`, `tipo`, `buscar`, `apenasAtrasadas`, `apenasEmAndamento`, `apenasConcluidas`, `apenasVenceHoje`, `incluirArquivadas`, `funcaoId`, `funcaoClassificacao`, `perfilId`, `perfilModo` | `200 List<TarefaResumo>`; corte de 500 registros. |
| `GET` | `/api/v1/implantacao/tarefas/{id}` | `validacao` | Path `id`; sem body | `200 TarefaDetalhe` ou `404`. |
| `POST` | `/api/v1/implantacao/tarefas` | `validacao` | Body `TarefaCriarRequest` | `201 TarefaDetalhe`; tarefa com projeto exige `ProjetoEtapaId` do mesmo projeto. |
| `PUT` | `/api/v1/implantacao/tarefas/{id}` | `validacao` | Body `TarefaAtualizarRequest` | `200 TarefaDetalhe` ou `404`. |
| `PATCH` | `/api/v1/implantacao/tarefas/{id}/coluna` | `validacao` | Body `TarefaMudarColunaRequest` | `200 TarefaDetalhe`; aplica WIP e sincronizações internas. |
| `PATCH` | `/api/v1/implantacao/tarefas/{id}/arquivar` | `validacao` | Sem body | `200 TarefaDetalhe`; somente concluídas. |
| `PATCH` | `/api/v1/implantacao/tarefas/{id}/desarquivar` | `validacao` | Sem body | `200 TarefaDetalhe`; retorna para concluída. |
| `DELETE` | `/api/v1/implantacao/tarefas/{id}` | `validacao` | Path `id`; sem body | `204` ou `404`. |
| `POST` | `/api/v1/implantacao/tarefas/{id}/comentarios` | `validacao` | Body `ComentarioCriarRequest` | `200 ComentarioTarefaResumo`. |
| `GET` | `/api/v1/implantacao/tarefas/chamados/busca` | `validacao` | Query `buscar?`, `take=20` | `200 List<ChamadoLegadoResumo>`. |
| `POST` | `/api/v1/implantacao/tarefas/{id}/chamados` | `validacao` | Body `TarefaChamadoRequest` | `200 TarefaDetalhe` ou `404`. |
| `DELETE` | `/api/v1/implantacao/tarefas/{id}/chamados/{chamadoId}` | `validacao` | Path `id`, `chamadoId` | `200 TarefaDetalhe`; desvincula o chamado. |
| `POST` | `/api/v1/implantacao/tarefas/{id}/apontamentos` | `validacao` | Body `ApontamentoCriarRequest` | `200 ApontamentoResumo`. |
| `PUT` | `/api/v1/implantacao/tarefas/apontamentos/{apontamentoId}` | `validacao` | Body `ApontamentoAtualizarRequest` | `200 ApontamentoResumo` ou `404`; `403` para apontamento de outro operador quando o controller não identifica admin. |
| `DELETE` | `/api/v1/implantacao/tarefas/apontamentos/{apontamentoId}` | `validacao` | Path `apontamentoId`; sem body | `204` ou `404`; `403` para apontamento de outro operador nas mesmas condições. |
| `GET` | `/api/v1/implantacao/tarefas/{id}/historico` | `validacao` | Path `id`; sem body | `200 List<HistoricoMovimentacao>` derivado da auditoria. |

**Autorização de responsáveis:** criação e edição verificam o responsável principal; os itens de `ResponsavelIds` não seguem uma regra uniforme entre os fluxos. Na criação, cada item é apenas consultado quanto à existência e os inexistentes são ignorados; na atualização, quando enviada, cada responsável adicional passa pela autorização de atribuição. O parâmetro não deve ser tratado como uma regra uniforme de propriedade.

## Dashboard de Implantação

A classe abaixo é `DashboardController`, declarada no mesmo arquivo de tarefas.

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `GET` | `/api/v1/implantacao/dashboard` | JWT | — | Query `equipe?`, `projetoId?` | `200 DashboardGeral` com KPIs, agrupamentos e prazos; `equipe` é aceito, mas não altera o cálculo. |

Fonte: [TarefasController.cs](../backend/Central_BackEnd/Controllers/Implantacao/TarefasController.cs).

## Dashboard administrativo

Fonte: [AdminDashboardController.cs](../backend/Central_BackEnd/Controllers/Implantacao/AdminDashboardController.cs).

| Método | Rota | Autorização | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | JWT + Administrador | — | Query `funcaoId?`, `diasRetro=7` | `200 AdminDashboardDto` com totais, funções, responsáveis e alertas; `diasRetro` é aceito, mas não participa dos cálculos. |

## Database Explorer

Fonte: [DatabaseController.cs](../backend/Central_BackEnd/Controllers/Database/DatabaseController.cs). Todas as operações exigem JWT; as comparações (schemas, banco inteiro e procedures) e os endpoints de scripts de correção usam `validacao`.

| Método | Rota | Limite | Entrada | Resposta resumida |
|---|---|---|---|---|
| `GET` | `/api/v1/database/status` | — | Sem body | `200 DatabaseStatusDto` com teste de conexão, servidor, banco, mensagem e duração. |
| `GET` | `/api/v1/database/info` | — | Sem body | `200 DatabaseInfoDto` com contagens de objetos SQL Server; pode retornar `Conectado=false` e mensagem. |
| `GET` | `/api/v1/database/tables` | — | Query `schema?`, `filtro?` | `200 List<TableDto>`. |
| `GET` | `/api/v1/database/tables/{schema}/{nome}` | — | Path `schema`, `nome` | `200 TableDto` ou `404`. |
| `GET` | `/api/v1/database/tables/{schema}/{nome}/columns` | — | Path `schema`, `nome` | `200 List<ColumnDto>`. |
| `GET` | `/api/v1/database/tables/{schema}/{nome}/indexes` | — | Path `schema`, `nome` | `200 List<IndexDto>`. |
| `GET` | `/api/v1/database/relationships` | — | Query `schema?`, `tabela?`, `incluirPossiveis=false`, `take=500` | `200 List<RelationshipDto>`, com confirmadas e inferidas. |
| `GET` | `/api/v1/database/graph` | — | Query `tabela`, `profundidade=2`, `incluirPossiveis=false` | `200 List<RelationshipDto>`; `400` se `tabela` ausente. |
| `GET` | `/api/v1/database/column-usage` | — | Query `coluna` | `200 List<RelationshipDto>`; `400` se `coluna` ausente. |
| `GET` | `/api/v1/database/search` | — | Query `termo`, `take=200` | `200 List<DatabaseSearchResult>`; termo vazio devolve lista vazia. |
| `GET` | `/api/v1/database/procedures` | — | Query `schema?`, `busca?`, `take=5000` | `200 List<ProcedureResumoDto>`. O `take` é limitado por `Math.Clamp` no serviço, mas não aplicado à consulta. |
| `GET` | `/api/v1/database/procedures/{schema}/{nome}` | — | Path `schema`, `nome` | `200 ProcedureDetalheDto` ou `404`. |
| `GET` | `/api/v1/database/triggers` | — | Query `schema?`, `tabela?` | `200 List<TriggerDto>`. |
| `GET` | `/api/v1/database/triggers/{schema}/{nome}` | — | Path `schema`, `nome` | `200 TriggerDto` ou `404`. |
| `GET` | `/api/v1/database/tables/{schema}/{nome}/dependencies` | — | Path `schema`, `nome` | `200 List<DependencyDto>`. |
| `GET` | `/api/v1/database/procedures/{schema}/{nome}/analysis` | — | Path `schema`, `nome` | `200 ProcedureAnalysisDto` ou `404`. |
| `POST` | `/api/v1/database/query-builder-advanced` | — | Body `QueryBuilderAdvancedRequest` | `200 DatabaseQueryBuilderResult`; gera SQL para até cinco tabelas, não o executa. `400` se nenhuma tabela for enviada. |
| `GET` | `/api/v1/database/config` | — | Sem body | `200 DatabaseConnectionConfigDto`; senha preenchida é substituída por `***`. |
| `POST` | `/api/v1/database/compare-schemas` | `validacao` | Form `schema`, `tabela`, arquivo JSON | `200 SchemaComparisonResultDto` (schemas com `SchemaInfoDto.Pk` e diferenças de categoria incluindo `Pk`); limite de 5 MB e erros de arquivo/JSON retornam `400`. |
| `POST` | `/api/v1/database/compare-schemas-bulk` | `validacao` | Form com arquivo JSON | `200 BulkSchemaComparisonResultDto` (mesmo contrato, com PK por tabela); limite de 20 MB e erros de arquivo/JSON retornam `400`. |
| `POST` | `/api/v1/database/compare-procedures` | `validacao` | Form com arquivo JSON | `200 ProceduresComparisonResultDto` (itens com `status` `Compativel`/`Divergente`/`SomenteBanco`/`SomenteArquivo` e corpos); limite de 20 MB; somente leitura, nenhum script é gerado. |
| `POST` | `/api/v1/database/generate-correction-scripts` | `validacao` | Body `GerarScriptsRequest` (resultado da comparação; `opcoes?` aceito mas sem efeito) | `200 SqlScriptResultDto` só com **criações** vindas do arquivo (`CREATE_TABLE`, `ADD_COLUMN`, `CREATE_INDEX`, `ALTER_FK`), cada script com `tabela` e `severidadeOrigem` (a PK do `CREATE TABLE` vem de `arquivo.Pk`, com fallback para índice `PK*`); limite de 25 MB; nunca executa SQL. |
| `POST` | `/api/v1/database/generate-correction-scripts-bulk` | `validacao` | Body `GerarScriptsBulkRequest` (resultado bulk; `opcoes?` aceito mas sem efeito) | `200 SqlScriptResultDto`; mesmo contrato do modo tabela única, ordenado por tabela; limite de 25 MB; nunca executa SQL. |
| `POST` | `/api/v1/database/validate-script` | `validacao` | Body `ValidarScriptRequest` (`sql`) | `200 ValidarScriptResultDto` com `valido`, `erros` e `avisos` (validação estática, sem execução); limite de 2 MB. |

O `DatabaseConnectionService` prioriza `DB_EXPLORER_*` sobre `DatabaseExplorer:*`; nenhuma senha ou string de conexão deve ser incluída em exemplo. A consulta avançada é um construtor de SQL: não foi localizada uma rota que execute o resultado. Os endpoints de scripts recebem o JSON da comparação pronto (sem novo upload) e apenas geram/validam texto SQL.

## Limitações confirmadas de consulta e cálculo

- `ProjetoService.ListarAsync` aplica corte `.Take(500)`; `GET /implantacao/projetos/com-etapas` parte dessa mesma listagem e herda o corte.
- `TarefaService.ListarAsync` aplica corte `.Take(500)`.
- `equipe` é aceito no dashboard e na listagem de tarefas, mas não participa dos filtros ou cálculos; `funcaoClassificacao` é aceito na listagem de tarefas e também não altera a consulta. `funcaoId` continua sendo um filtro efetivo.
- `diasRetro` é aceito no dashboard administrativo, mas não participa dos cálculos.
- Em `GET /api/v1/database/procedures`, `take` é limitado por `Math.Clamp` no serviço, mas o valor não é aplicado à consulta SQL; portanto o parâmetro não corta a lista retornada.

## Exemplos mínimos confirmados

Os placeholders abaixo não são segredos nem valores de configuração.

### Login e cookie

```http
POST /api/v1/auth/login
Content-Type: application/json

{"usuario":"operador.exemplo","senha":"<valor-nao-real>","lembrarAcesso":true}
```

O token de acesso é devolvido no corpo e deve ficar em memória no cliente. O refresh token não deve ser copiado para armazenamento local; o backend o envia em `cc_refresh` HttpOnly.

```http
Authorization: Bearer <token-em-memória>
```

```http
POST /api/v1/auth/refresh
Cookie: cc_refresh=<cookie-http-only>
```

### Tarefa sem projeto

Uma tarefa pode ser criada sem `projetoId`; nesse caso a validação não exige `projetoEtapaId`. Com projeto, o mesmo `projetoEtapaId` precisa pertencer ao projeto. A criação atual atribui o valor recebido mesmo sem projeto; a atualização zera a etapa quando não há projeto.

```json
{
  "projetoId": null,
  "projetoEtapaId": null,
  "colunaKanbanId": null,
  "chamadoLegadoId": null,
  "titulo": "Ajustar importação de dados",
  "descricao": "Tarefa de exemplo",
  "responsavelId": "operador.exemplo",
  "responsavelIds": ["operador.exemplo"],
  "criadorId": "operador.exemplo",
  "prioridade": 1,
  "tipo": 0,
  "ordem": 0,
  "dataPrevisao": "2026-09-30",
  "dataEntrega": null,
  "horasEstimadas": 4
}
```

### Apontamento

```json
{
  "operadorId": "operador.exemplo",
  "data": "2026-09-24T13:00:00",
  "horas": 1.5,
  "observacao": "Análise inicial"
}
```

### Agenda

```json
{
  "titulo": "Reunião de acompanhamento",
  "descricao": "Evento de exemplo",
  "local": "Sala interna",
  "dataInicio": "2026-09-24T13:00:00",
  "dataFim": "2026-09-24T14:00:00",
  "diaInteiro": false,
  "tipoId": null,
  "responsavelId": "operador.exemplo",
  "projetoId": null,
  "participantesIds": [],
  "prioridade": 0,
  "slaMinutos": 60
}
```

## Erros confirmados

| Situação | Retorno explicitamente tratado |
|---|---|
| Login sem `usuario`/`senha` | `400 {"mensagem":"Campos obrigatorios ausentes."}` |
| Login inválido | `401 {"mensagem":"Usuario ou senha invalidos."}` |
| Refresh ausente, revogado ou expirado | `401 {"mensagem":"Refresh token invalido ou expirado."}` |
| Tarefa com projeto sem etapa válida | `400 {"mensagem":"Etapa do projeto é obrigatória para tarefas de projeto"}` ou mensagem de etapa inválida. |
| Conflito de agenda | `409` com `mensagem`, `conflitos` e `code="CONFLICT_HORARIOS"`. |
| Comparação de schema sem arquivo/JSON inválido | `400` com mensagem específica do Database Explorer. |

Não se deve transformar uma mensagem de erro textual em novo contrato; o código pode mudar.

## O que o smoke prova

O arquivo [scripts/smoke.ps1](../scripts/smoke.ps1) chama `Test-Url` para o frontend e para `/swagger`. Ele não envia Bearer, não chama os endpoints de negócio, não valida DTOs, não testa refresh e não comprova que a API funciona. Portanto, não se deve afirmar que o smoke valida a API; ele valida somente a resposta HTTP dessas duas URLs.

## Limitações e divergências com documentos arquivados

Os documentos abaixo estão preservados apenas como contexto histórico em `backup/2026-09-24/`. As diferenças abaixo são limitações ou descrições desatualizadas, não regras desejadas:

| Documento arquivado | Divergência confirmada no código | Correção sugerida |
|---|---|---|
| [ENDPOINTS-AUDITORIA.md](./backup/2026-09-24/ENDPOINTS-AUDITORIA.md) | Declara total 81 e `DatabaseController` com 19 operações; a busca atual encontra 86 e 24. | Recalcular o total e a linha do Database Controller. |
| [04-database.md](./backup/2026-09-24/telas/04-database.md) | Lista `POST /api/v1/database/procedures/{schema}/{name}`; o controller atual só expõe `GET` nessa rota. | Remover a linha ou corrigir o método no documento. |
| [06-backend.md](./backup/2026-09-24/telas/06-backend.md) | Descreve `validacao` como 5/min e afirma validação de `ClienteObrigatorio`; o código atual define 50/100 por minuto e não aplica esse sinalizador no cadastro. | Corrigir limite e separar o campo persistido da regra efetivamente validada. |
| [06-backend.md](./backup/2026-09-24/telas/06-backend.md) | Repete a contagem de 19 operações do Database Explorer. | Usar a contagem recalculada de 24. |

## Limitações de contrato a corrigir

As observações abaixo são limitações confirmadas, não regras desejadas:

- [Limitação] `TiposProjetoController` e os métodos de escrita de `ColunasKanbanController` declaram respostas resumidas, mas os serviços retornam DTOs detalhados. O catálogo registra o tipo efetivamente serializado; as assinaturas devem ser alinhadas.
- [Limitação] A detecção de administrador para apontamentos usa `Admin`/`PerfilId`, enquanto a autenticação emite `Administrador`/`perfil`. O comportamento administrativo precisa ser testado no código.
- [Limitação] O Database Explorer não possui um controller de execução de SQL; não documentar o SQL gerado como se tivesse sido executado.
- [Limitação] A documentação de rotas deve preservar a exceção de versionamento do RagProxy e as 86 operações contadas no baseline.
- [Limitação] A Agenda persiste `Visibilidade`, mas as leituras não a filtram; `ResponsavelIds` não tem regra uniforme e `equipe`, `funcaoClassificacao` e `diasRetro` são aceitos sem efeito nas consultas ou cálculos correspondentes.
- [Limitação] A exclusão de tipo com projeto vinculado pode gerar `500` por `InvalidOperationException` não tratado; isso é comportamento atual, não uma resposta de negócio desejada.

## Contagens e fatos confirmados

- 11 classes de controller e 86 operações HTTP na árvore de trabalho atual.
- 10 controllers usam rota versionada `/api/v1`; `RagProxyController` usa a rota sem versão `/api/rag-proxy`.
- Auth possui 4 operações; Acessos 3; Agenda 10; RAG 1; TiposProjeto 5; ColunasKanban 5; Projetos 16; Tarefas 16; Dashboard 1; AdminDashboard 1; Database 24.
- O smoke não valida a API de negócio.
- Nenhum segredo, token real, senha real ou string de conexão foi incluído neste documento.
