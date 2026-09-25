---
title: "Estrutura de dados"
description: "Entidades, tabelas, relacionamentos, migrations e integrações de dados do monorepo atual."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# Estrutura de dados

Inventário calculado a partir de [AppDbContext.cs](../backend/Central_BackEnd/Data/AppDbContext.cs), dos modelos e do [AppDbContextModelSnapshot.cs](../backend/Central_BackEnd/Migrations/AppDbContextModelSnapshot.cs). Não reproduz DDL, strings de conexão, senhas, chaves ou qualquer valor de configuração.

## Índice para busca

| Tema | Fonte |
|---|---|
| entidades e DbSets | [AppDbContext.cs](../backend/Central_BackEnd/Data/AppDbContext.cs) |
| esquema final | [AppDbContextModelSnapshot.cs](../backend/Central_BackEnd/Migrations/AppDbContextModelSnapshot.cs) |
| histórico do esquema | [20260922154202_RemoveEtapaAntiga.cs](../backend/Central_BackEnd/Migrations/20260922154202_RemoveEtapaAntiga.cs) e os demais arquivos de migração |
| autenticação e refresh | [Operador.cs](../backend/Central_BackEnd/Models/Operador.cs), [RefreshToken.cs](../backend/Central_BackEnd/Models/RefreshToken.cs) |
| projetos, tarefas e etapas | [Projeto.cs](../backend/Central_BackEnd/Models/Implantacao/Projeto.cs), [Tarefa.cs](../backend/Central_BackEnd/Models/Implantacao/Tarefa.cs), [ProjetoEtapa.cs](../backend/Central_BackEnd/Models/Implantacao/ProjetoEtapa.cs) |
| agenda | [AgendaItem.cs](../backend/Central_BackEnd/Models/Implantacao/AgendaItem.cs), [AgendaParticipante.cs](../backend/Central_BackEnd/Models/Implantacao/AgendaParticipante.cs) |
| legadas | [ClienteLegado.cs](../backend/Central_BackEnd/Models/Implantacao/ClienteLegado.cs), [ChamadoLegado.cs](../backend/Central_BackEnd/Models/Implantacao/ChamadoLegado.cs), [FuncionarioLegado.cs](../backend/Central_BackEnd/Models/Implantacao/FuncionarioLegado.cs) |
| Google Sheets | [GoogleSheetsService.cs](../backend/Central_BackEnd/Services/GoogleSheetsService.cs) |
| Database Explorer | [DatabaseConnectionService.cs](../backend/Central_BackEnd/Services/Database/DatabaseConnectionService.cs), [DatabaseMetadataService.cs](../backend/Central_BackEnd/Services/Database/DatabaseMetadataService.cs) |

## Contagens confirmadas

| Medida | Total | Observação |
|---|---:|---|
| `DbSet` em `AppDbContext` | 25 | Inclui três espelhos legados de leitura. |
| Entidades no snapshot final | 25 | Confere com os `DbSet` mapeados. |
| Tabelas gerenciadas pelas migrações | 22 | As três legadas usam `ExcludeFromMigrations()`. |
| Tabelas legadas somente leitura | 3 | `tbcliente`, `tbchamado` e `tbfuncionario`. |
| Classes de migração presentes | 16 | A presença do arquivo não prova que foi aplicada no banco alvo. |
| Operações de controller | 82 | Recalculada a partir dos atributos `[Http*]`; detalhada no catálogo de endpoints. |
| DTOs de acesso persistidos no `AppDbContext` | 0 | `EmpresaAcesso` é projeção externa; os demais modelos de requisição/resposta não são `DbSet`. |

## Fontes de verdade

| Fonte | Papel confirmado |
|---|---|
| `AppDbContext`, modelos e snapshot | Fonte do estado ORM atual; o snapshot representa o modelo final gerado pelas migrações. |
| `TBOPERADOR` | Fonte de operadores, perfil, estado, função e dados usados na autenticação. O campo de senha é sensível. |
| `CC_Funcao` | Fonte das funções/descrições usadas por perfil e filtros. A relação de `TBOPERADOR.FUNCAO_ID` pode ser nula. |
| `tbcliente` | Fonte de clientes do módulo de Implantação; `ProjetoService` consulta `ClienteLegado` e a migração `ClienteApontaTbCliente` aponta `PRJ_ClienteId` para essa tabela. Somente leitura no código de negócio. |
| `tbchamado` | Fonte de chamados legados para busca e vínculo com tarefas; a tabela é espelhada sem escrita. |
| `tbfuncionario` | Fonte da relação operador–função para filtros de agenda; não substitui o campo possivelmente não preenchido em `TBOPERADOR`. |
| Google Sheets | Fonte externa de empresas e credenciais de acesso; não há `DbSet` nem tabela local para `EmpresaAcesso`. |
| Database Explorer | Fonte externa de metadados do SQL Server configurado em `DatabaseExplorer`; não é o `AppDbContext` da aplicação. |
| AnythingLLM | Fonte externa opcional para o proxy RAG; não é uma entidade local. |

## Provider de persistência

- Em `Development`, [Program.cs](../backend/Central_BackEnd/Program.cs) usa SQL Server quando `Database:UseSqlServer=true`; caso contrário, usa InMemory `CentralDev`, cujos dados não sobrevivem ao fechamento do processo.
- Fora de `Development`, o provider selecionado é SQL Server. A configuração de conexão e as flags do provider são externas a este inventário e não são reproduzidas aqui.

## Inventário de entidades e tabelas

`Gerida` significa que a entidade está incluída no modelo de migrações. `Legada` significa `ExcludeFromMigrations()` e uso somente leitura no código de negócio.

| `DbSet` / entidade | Tabela | Chave | Gestão | Função / campos de controle |
|---|---|---|---|---|
| `Operadores` / `Operador` | `TBOPERADOR` | `OperadorId` | Gerida | Identidade, estado, perfil, função e referência de auditoria. |
| `Funcoes` / `Funcao` | `CC_Funcao` | `Id` | Gerida | Descrição, classificação e ativo. |
| `RefreshTokens` / `RefreshToken` | `RefreshTokens` | `Id` | Gerida | Hash do refresh, expiração, revogação, substituição e operador. |
| `AuditoriaAcessos` / `AuditoriaAcesso` | `AuditoriaAcessos` | `Id` | Gerida | Evento de visualização de acesso: operador, empresa, IP, data/hora e user-agent. |
| `Clientes` / `Cliente` | `IMPL_Cliente` | `Id` | Gerida | Cliente nativo do modelo inicial; o serviço de projetos atual usa a tabela legada `tbcliente`. |
| `TiposProjeto` / `TipoProjeto` | `IMPL_TipoProjeto` | `Id` | Gerida | Código único, nome, obrigatoriedade de cliente, ordem e ativo. |
| `ColunasKanban` / `ColunaKanban` | `IMPL_ColunaKanban` | `Id` | Gerida | Ordem, cor, padrão, ativo e limite WIP. |
| `Projetos` / `Projeto` | `IMPL_Projeto` | `Id` | Gerida | Código global, cliente, tipo, responsável, datas, progresso, horas e go-live. |
| `ProjetoEtapas` / `ProjetoEtapa` | `tbprojetoEtapa` | `Id` | Gerida | Jornada de nove etapas por projeto; `ProjetoId + Ordem` é único. |
| `ProjetoEtapaChecklists` / `ProjetoEtapaChecklist` | `tbprojetoEtapaChecklist` | `Id` | Gerida | Itens de checklist e conclusão. |
| `ProjetoEtapaDocumentos` / `ProjetoEtapaDocumento` | `tbprojetoEtapaDocumento` | `Id` | Gerida | Nome, URL, descrição e autoria do documento. |
| `ProjetoEtapaHistoricos` / `ProjetoEtapaHistorico` | `tbprojetoEtapaHistorico` | `Id` | Gerida | Histórico textual das alterações da etapa. |
| `ProjetoEtapaComentarios` / `ProjetoEtapaComentario` | `tbprojetoEtapaComentario` | `Id` | Gerida | Comentário, usuário e data. |
| `Tarefas` / `Tarefa` | `IMPL_Tarefa` | `Id` | Gerida | Projeto/etapa opcionais, status, prazo, entrega, bloqueio, responsável, horas e arquivamento. |
| `ComentariosTarefa` / `ComentarioTarefa` | `IMPL_ComentarioTarefa` | `Id` | Gerida | Comentário de tarefa e autor lógico. |
| `TarefaResponsaveis` / `TarefaResponsavel` | `IMPL_TarefaResponsavel` | `(TarefaId, OperadorId)` | Gerida | Responsáveis adicionais em N:N. |
| `TarefaChamados` / `TarefaChamado` | `IMPL_TarefaChamado` | `(TarefaId, ChamadoId)` | Gerida | Ligação N:N entre tarefa e chamado legado. |
| `TarefaApontamentos` / `TarefaApontamento` | `IMPL_TarefaApontamento` | `Id` | Gerida | Horas, operador lógico, data e observação. |
| `ChamadosLegado` / `ChamadoLegado` | `tbchamado` | `Id` | Legada | Espelho somente leitura; colunas ignoradas pelo modelo. |
| `Agenda` / `AgendaItem` | `IMPL_Agenda` | `Id` | Gerida | Responsável, intervalo, tipo, prioridade, SLA, projeto, recorrência e participantes. |
| `TiposEvento` / `TipoEvento` | `CC_TipoEvento` | `Id` | Gerida | Nome único, cor e ativo. |
| `AgendaParticipantes` / `AgendaParticipante` | `CC_AgendaParticipante` | `Id` | Gerida | Participante do evento; par evento/participante é único. |
| `AuditoriaImplantacao` / `AuditoriaImplantacao` | `IMPL_Auditoria` | `Id` | Gerida | Entidade, ação, usuário, data, observação e JSON antes/depois. |
| `FuncionariosLegado` / `FuncionarioLegado` | `tbfuncionario` | `FuncionarioId` | Legada | Operador, função e ativo para filtros de agenda. |
| `ClientesLegado` / `ClienteLegado` | `tbcliente` | `Id` | Legada | CNPJ, razão social, fantasia e ativo; fonte de clientes do módulo. |

### Modelos que não são tabelas

`EmpresaAcesso`, `EmpresaResumo`, `EmpresaDetalheResponse`, `RagChatRequest`, `RagChatResponse` e os DTOs de requisição/resposta não têm `[Table]` nem `DbSet`. `EmpresaAcesso` é preenchido pelo Google Sheets e usado em memória.

## Relacionamentos confirmados

| Origem | Destino | Chave / ação no banco | Observação |
|---|---|---|---|
| `Operador` | `Funcao` | `FUNCAO_ID`, `SetNull` | Relação opcional. |
| `RefreshToken` | `Operador` | `OperadorId`, `Cascade` | Exclusão do operador remove refresh tokens. |
| `Projeto` | `TipoProjeto` | `TipoProjetoId`, `Restrict` | O banco impede a exclusão de tipo com projeto vinculado; o serviço lança `InvalidOperationException` e o controller atual não a trata, podendo resultar em `500` (limitação). |
| `Projeto` | `ClienteLegado` | `ClienteId`, `SetNull` | A FK final aponta para `tbcliente`, não para `IMPL_Cliente`. |
| `Projeto` | `ColunaKanban` | `ColunaKanbanId`, `SetNull` | Coluna pode ser removida do projeto. |
| `Projeto` | `ProjetoEtapa` | `ProjetoId`, `Cascade` | Etapas e dependentes são removidos em cascata. |
| `ProjetoEtapa` | checklist/documento/histórico/comentário | `ProjetoEtapaId`, `Cascade` | Quatro coleções filhas. |
| `Tarefa` | `Projeto` | `ProjetoId`, `Cascade` | Tarefa pode existir sem projeto porque a coluna é anulável. |
| `Tarefa` | `ProjetoEtapa` | `ProjetoEtapaId`, `Restrict` | Vínculo de etapa do mesmo projeto é validado no serviço. |
| `Tarefa` | `ColunaKanban` | `ColunaKanbanId`, `SetNull` | Coluna é opcional. |
| `Tarefa` | comentários/responsáveis/chamados/apontamentos | `TarefaId`, `Cascade` | Quatro tabelas filhas. |
| `AgendaItem` | `Projeto` | `ProjetoId`, `SetNull` | Evento continua sem projeto se o projeto for removido. |
| `AgendaItem` | `TipoEvento` | `TipoId`, `SetNull` | Tipo é opcional. |
| `AgendaItem` | `AgendaParticipante` | `AgendaId`, `Cascade` | Participantes são filhos do evento. |
| `AgendaParticipante` | `Operador` | `ParticipanteId`, `Restrict` | Participante precisa existir. |

### IDs lógicos sem FK declarada

O modelo não cria FK para vários identificadores usados como referência de negócio. Isso não deve ser tratado como integridade referencial garantida pelo banco:

- `Projeto.ClienteLegadoId` e `Tarefa.ChamadoLegadoId` foram adicionados como colunas indexadas sem FK, para não bloquear inserções quando o legado mudar. O serviço valida `ChamadoLegadoId` em vários fluxos, mas a validação de `Projeto.ClienteLegadoId` não é equivalente à de `ClienteId`.
- `TarefaChamado.ChamadoId`, `TarefaResponsavel.OperadorId`, `TarefaApontamento.OperadorId`, `AgendaItem.OperadorId`, `Projeto.ResponsavelId` e `Tarefa.ResponsavelId` são referências lógicas; algumas são verificadas no serviço, outras não.
- `FuncionarioLegado.FuncaoId` não possui FK para `CC_Funcao`; a consulta da agenda usa a correspondência por `OperadorId`, função e ativo.
- `ComentarioTarefa.AutorId` e campos de auditoria também não têm FK para `TBOPERADOR`.

A distinção entre `Cliente` e `ClienteLegado` é importante: `IMPL_Cliente` continua no snapshot, mas o modelo de `Projeto` e a migração `ClienteApontaTbCliente` apontam o campo `ClienteId` para `tbcliente`. O código do serviço usa `ClientesLegado` para listar clientes.

## Migrations e tabelas históricas

Há 16 migrações no diretório, nesta ordem de arquivo:

| Migration | Mudança estrutural confirmada |
|---|---|
| `20260904194350_ImplantacaoInit` | Tabelas iniciais de Implantação, operador, refresh, auditoria e etapa antiga. |
| `20260905195554_AddLegadoLinks` | Colunas escalares `TRF_ChamadoLegadoId` e `PRJ_ClienteLegadoId`, sem FK. |
| `20260905203422_AddAgendaAndPerfis` | Agenda inicial e índices. |
| `20260906033406_AddAuditoriaImplantacao` | Auditoria de alterações de Implantação. |
| `20260910163216_AddFuncao` | Tabela `CC_Funcao` e vínculo de função do operador. |
| `20260911215943_AgendaV2_Ajuste` | Ajustes de tipos/participantes da agenda. |
| `20260912173928_RemoveEquipes` | Remove `IMPL_Equipe` e `IMPL_MembroEquipe` do modelo atual. |
| `20260914144751_AgendaConflitoHorarios` | Colunas de conflito na agenda. |
| `20260915132751_ClienteApontaTbCliente` | Redireciona a FK de cliente do projeto para `tbcliente`. |
| `20260915134729_AgendaPrioridadeSLA` | Prioridade e SLA da agenda. |
| `20260916001540_KanbanCustomizavelEArquivamento` | Arquivamento e colunas de Kanban. |
| `20260917170249_TarefaEvolucaoResponsaveisChamadosHoras` | Apontamentos, responsáveis, chamados e `DataEntrega`. |
| `20260917202045_TarefaProjetoOpcional` | Tarefa sem projeto passa a ser permitida. |
| `20260918211919_AddProjetoEtapas` | Tabelas da jornada de nove etapas e dependentes. |
| `20260920185734_TarefaProjetoEtapaId` | Adiciona vínculo de tarefa com etapa fixa do projeto. |
| `20260922154202_RemoveEtapaAntiga` | Remove `IMPL_Etapa` e `TRF_EtapaId`; mantém `TRF_ProjetoEtapaId`. |

`IMPL_Equipe`, `IMPL_MembroEquipe` e `IMPL_Etapa` são históricos, não entidades do `AppDbContext` atual. A existência de uma migração não permite afirmar que o banco de destino foi atualizado; é necessário consultar o histórico aplicado no ambiente.

## Refresh tokens e auditoria

### `RefreshTokens`

- A tabela guarda `TokenHash`, não o token bruto. O operador é FK e a remoção do operador remove os tokens.
- `ExpiraEm`, `CriadoEm`, `Revogado` e `SubstituidoPor` suportam expiração, rotação e auditoria de uso.
- O hash usa SHA-256 do token. O token em claro só existe no cookie temporário e no retorno interno do serviço; o controlador não o remove do JSON: o campo é serializado como `refreshToken: ""` no login e no refresh.
- Não há endpoint de consulta de tokens; as operações de login, refresh e logout são as operações expostas.

### `IMPL_Auditoria`

- `AuditoriaImplantacaoService` serializa estado anterior/posterior em JSON, com `camelCase`, remoção de nulos e ignora ciclos.
- Falha ao registrar auditoria é apenas logada e não desfaz a operação principal.
- A cobertura é por serviço: criação/alteração/exclusão de projeto e tarefa, movimentação de tarefa, vínculo de chamado e criação de apontamento; não é um registro universal de todas as alterações de etapa/agenda.
- `HistoricoAsync` da tarefa lê essa auditoria e monta `HistoricoMovimentacao`; não há endpoint geral de auditoria no conjunto atual de controllers.

### `AuditoriaAcessos`

- É uma auditoria separada para consulta de dados de empresas.
- Armazena IP, navegador, operador, empresa, data e hora. A auditoria registra o evento; ela não mascara os campos da resposta, que continuam sem mascaramento no controller.

## Google Sheets

- [GoogleSheetsService.cs](../backend/Central_BackEnd/Services/GoogleSheetsService.cs) lê a planilha configurada em `GoogleSheets:SpreadsheetId` e `GoogleSheets:Range`.
- Se `GoogleSheets:ApiKey` estiver presente, tenta a API; em falha, tenta CSV. Sem chave, usa CSV. O primeiro registro é ignorado e as linhas seguintes viram `EmpresaAcesso`.
- O cache em memória dura dez minutos. Não há `DbSet`, migração ou método de escrita para Google Sheets.
- Os campos de rede, banco, VPN e observações são tratados como dados de acesso; não devem ser reproduzidos em documentação, logs de suporte ou exemplos.

## Database Explorer

- [DatabaseConnectionService.cs](../backend/Central_BackEnd/Services/Database/DatabaseConnectionService.cs) lê `DB_EXPLORER_*` com precedência sobre `DatabaseExplorer:*`. A senha nunca deve entrar em documentação ou resposta de configuração.
- A classe `DatabaseConnectionConfig` declara `Encrypt=false` e `TrustServerCertificate=true`; `FromConfiguration` recalcula as duas opções e, sem valor booleano configurável, obtém `false`. A configuração efetiva do ambiente precisa ser verificada separadamente.
- O serviço consulta tabelas, colunas, índices, FKs, procedimentos, funções, gatilhos, dependências e relacionamentos no SQL Server configurado.
- Relacionamentos confirmados vêm de FKs reais; relacionamentos possíveis são inferidos por nomes/tipos/índices e carregam pontuação. A inferência não é uma FK.
- `DatabaseQueryBuilderService` valida até cinco tabelas, monta SELECT/CTE/joins/filtros/ordenações e devolve SQL; não foi localizado endpoint que execute esse SQL.
- `DatabaseConnectionConfigDto` mascara a senha no controller. Entretanto, todos os endpoints do controller exigem apenas `Authorize`, e os DTOs de procedimento/gatilho podem conter o corpo completo do objeto. A exposição deve ser considerada em função do perfil do usuário.
- `SqlScriptGeneratorService` consome o resultado da comparação (com `SchemaArquivo`/`SchemaJca`) e devolve `SqlScriptResultDto` (`SqlScriptDto`, `SqlScriptResumoDto`); os contratos de geração/validação ficam em `DatabaseDtos.cs` e não são persistidos em nenhuma tabela (sem EF/migração).

## Segurança e dados sensíveis

| Dado | Onde aparece | Tratamento confirmado / lacuna |
|---|---|---|
| Senha do operador | `TBOPERADOR.Senha` e comparador de autenticação | É dado sensível; comparação SHA-256 estática, sem hash adaptativo encontrado. |
| Refresh token | `RefreshTokens.TokenHash` e cookie `cc_refresh` | Banco guarda hash; cookie é HttpOnly, mas está com `Secure=false`. |
| Credenciais de empresas | `EmpresaAcesso` e `EmpresaDetalheResponse` | Google Sheets é a fonte; resposta de Acessos não mascara os campos. |
| IP/user-agent | `AuditoriaAcessos` | Registrados para rastreabilidade; não substitui controle de acesso. |
| JSON antes/depois | `IMPL_Auditoria` | Serializado sem mascaramento explícito; pode carregar conteúdo operacional. |
| Senha do Explorer | `DatabaseExplorer:*` / `DB_EXPLORER_*` | Configuração mascarada no DTO; valores não são documentados aqui. |
| Definições de procedimentos/gatilhos | DTOs do Database Explorer | Podem ser completas e são acessíveis a qualquer usuário autenticado. |
| Chave de AnythingLLM | `AnythingLLM:ApiKey` | Usada no proxy; nunca deve ser retornada ou registrada em resposta. |

O arquivo [appsettings.Development.json](../backend/Central_BackEnd/appsettings.Development.json) contém valores preenchidos de desenvolvimento, inclusive chaves e dados sensíveis. Nenhum valor é reproduzido aqui; antes de compartilhar o repositório, mover esses valores para ambiente/user-secrets e rotacionar os que forem reais.

## Contagens e fatos confirmados no baseline

- 25 `DbSet`; 22 entidades incluídas nas migrações e 3 espelhos legados somente leitura.
- 16 migrações presentes; última por nome/arquivo é `RemoveEtapaAntiga`.
- `RefreshTokens` e as duas tabelas de auditoria são persistidas no `AppDbContext`.
- `tbcliente`, `tbchamado` e `tbfuncionario` são fontes legadas de leitura; `EmpresaAcesso` e os dados do Explorer não são tabelas do `AppDbContext`.
- A listagem de clientes de projeto usa `tbcliente`; `IMPL_Cliente` permanece no snapshot, mas não é a fonte usada pelo serviço atual.
- Nenhuma migração, entidade ou endpoint foi alterado por este trabalho.
