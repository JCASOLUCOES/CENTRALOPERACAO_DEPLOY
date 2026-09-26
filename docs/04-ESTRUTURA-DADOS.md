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
| histórico do esquema | [AppDbContextModelSnapshot.cs](../backend/Central_BackEnd/Migrations/AppDbContextModelSnapshot.cs) e os 18 arquivos de migração, o mais recente [20260926022906_RenomeiaIndicesPkTb.cs](../backend/Central_BackEnd/Migrations/20260926022906_RenomeiaIndicesPkTb.cs) |
| autenticação e refresh | [Operador.cs](../backend/Central_BackEnd/Models/Operador.cs), [RefreshToken.cs](../backend/Central_BackEnd/Models/RefreshToken.cs) |
| projetos, tarefas e etapas | [Projeto.cs](../backend/Central_BackEnd/Models/Implantacao/Projeto.cs), [Tarefa.cs](../backend/Central_BackEnd/Models/Implantacao/Tarefa.cs), [ProjetoEtapa.cs](../backend/Central_BackEnd/Models/Implantacao/ProjetoEtapa.cs) |
| agenda | [AgendaItem.cs](../backend/Central_BackEnd/Models/Implantacao/AgendaItem.cs), [AgendaParticipante.cs](../backend/Central_BackEnd/Models/Implantacao/AgendaParticipante.cs) |
| legadas | [ClienteLegado.cs](../backend/Central_BackEnd/Models/Implantacao/ClienteLegado.cs), [ChamadoLegado.cs](../backend/Central_BackEnd/Models/Implantacao/ChamadoLegado.cs), [FuncionarioLegado.cs](../backend/Central_BackEnd/Models/Implantacao/FuncionarioLegado.cs) |
| Google Sheets | [GoogleSheetsService.cs](../backend/Central_BackEnd/Services/GoogleSheetsService.cs) |
| Database Explorer | [DatabaseConnectionService.cs](../backend/Central_BackEnd/Services/Database/DatabaseConnectionService.cs), [DatabaseMetadataService.cs](../backend/Central_BackEnd/Services/Database/DatabaseMetadataService.cs) |
| padrão de nomes `tb*` | [20260926010406_PadraoTabelasTb.cs](../backend/Central_BackEnd/Migrations/20260926010406_PadraoTabelasTb.cs) e [20260926022906_RenomeiaIndicesPkTb.cs](../backend/Central_BackEnd/Migrations/20260926022906_RenomeiaIndicesPkTb.cs) |
| conferência antes/depois | [conferencia-padrao-tb.sql](../scripts/db/conferencia-padrao-tb.sql) |
| aplicação em produção | [renomear-tabelas-tb-idempotente.sql](../scripts/db/renomear-tabelas-tb-idempotente.sql) (tabelas, PKs, índices e AK) |

## Padrão de nomenclatura (canônico)

### Tabela

Nome de tabela = `tb` + nome da entidade em minúsculas, **colado, sem underscore**. Exemplos: `tbprojeto`, `tbtarefa`, `tbagenda`, `tboperador`, `tbrefreshtoken`, `tbprojetoetapa`.

- **Exceção — sub-entidades:** `tb<entidade>_<sub>`, com um único underscore separando o agregado pai da sub-entidade. É o padrão já presente no legado (`tbcliente_contato`, `tbchamado_itens`).
- A tabela de colunas do Kanban **segue a regra**: `tb` + `ColunaKanban`.ToLower() = 14 caracteres (`tbcolunakanban`), exatamente o que `ColunaKanban.cs` e os três snapshots declaram.
- Nomes de tabela não levam prefixo de módulo: o prefixo `tb` é único e substituiu `IMPL_`/`CC_`.

### Colunas (padrão anterior, inalterado)

A padronização afeta **apenas nomes de tabela**. As colunas seguem como antes:

| Elemento | Padrão |
|---|---|
| Chave primária | `Id` na coluna; nas legadas o nome é o próprio identificador (`OPERADOR_ID`, `CLIENTE_ID`, `FUNCAO_ID`). |
| Prefixo de coluna | Prefixo curto da entidade + `_`: `PRJ_` (projeto), `TRF_` (tarefa), `AGD_` (agenda), `TPP_`, `CLK_`, `CMT_`, `APT_`, `PEP_`, `PEC_`, `PED_`, `PEH_`, `AUD_`. O prefixo `CLI_` saiu do modelo junto com a tabela `IMPL_Cliente`. |
| Caixa | Nas tabelas novas é PascalCase (`PRJ_Id`); nas legadas é UPPER (`OPERADOR_ID`, `CHAMADO_ID`). |
| Chaves compostas N:N | Usam o nome da entidade singular + `Id`, sem prefixo (`TRF_Id`, `CHAMADO_ID`, `OPERADOR_ID`). |

### Chaves primárias

- `Id` simples por padrão.
- Chave **composta** apenas nas tabelas N:N: `tbtarefareponsavel` (`TarefaId`, `OperadorId`) e `tbtarefachamado` (`TarefaId`, `ChamadoId`).
- Nomes de PK acompanham o nome novo da tabela (`PK_tbprojeto`, `PK_tbfuncao`, …).

### Chaves estrangeiras

| Ação | Quando |
|---|---|
| `Cascade` | Tabela filha cujo ciclo de vida acompanha o pai (comentários, responsáveis, chamados, apontamentos, participantes, as quatro coleções de etapa). |
| `SetNull` | Vínculo opcional (`Projeto.ClienteId`, `Projeto.ColunaKanbanId`, `Tarefa.ColunaKanbanId`, `AgendaItem.ProjetoId`, `AgendaItem.TipoId`, `Operador.FuncaoId`). |
| `Restrict` | Quando o SQL Server rejeitaria cascata por múltiplos caminhos (`Projeto.TipoProjetoId`, `Tarefa.ProjetoEtapaId`) ou quando a referência precisa existir (`AgendaParticipante.ParticipanteId`). |

### Nomes de PK, FK e índice

- **PKs e o índice composto de conflito da agenda foram renomeados** para acompanhar o prefixo `tb`.
- **As FKs NÃO foram renomeadas.** Constraints como `FK_IMPL_Projeto_IMPL_ColunaKanban_PRJ_ColunaKanbanId` continuam com o prefixo antigo mesmo apontando para `tbcolunakanban`. **Isso é cosmético, não é bug**: `sp_rename` de tabela já reescreve internamente o objeto referenciado, e renomear a constraint exigiria derrubá-la e recriá-la. Nunca concluir que uma FK "quebrou" pelo nome antigo.
- Exceção criada na fusão da função: `FK_tboperador_tbfuncao_FUNCAO_ID` já nasce com o nome novo, porque a constraint antiga caiu junto com a tabela `CC_Funcao`.
- **Índices** seguem a convenção do EF `IX_<tabela>_<colunas>`; **chave alternativa** (unique constraint) segue `AK_<tabela>_<colunas>`. Os 33 índices com prefixo antigo e a unique constraint `AK_tbtipoevento_Nome` foram renomeados pela `RenomeiaIndicesPkTb`.
- **Índice de conflito da agenda (divergência encerrada):** o nome final é `IX_tbagenda_AGD_OperadorId_AGD_DataInicio_AGD_DataFim`, derivado por convenção. O `HasDatabaseName("IX_IMPL_Agenda_Operador_DataInicio_DataFim")` foi **removido** do `AppDbContext` (bloco `Entity<AgendaItem>`); o `AppDbContext` não fixa mais nome de índice, e modelo, snapshot e banco concordam.

### Fluxo de criação de tabela

1. Modelo/entidade em `backend/Central_BackEnd/Models/`.
2. `DbSet` e bloco de mapeamento em [AppDbContext.cs](../backend/Central_BackEnd/Data/AppDbContext.cs) (`HasKey`, `HasIndex`, `HasOne`/`OnDelete`). Tabela legada somente leitura recebe `ToTable(... , t => t.ExcludeFromMigrations())`.
3. `dotnet ef migrations add <Nome> -o Migrations`.
4. **Aplicação manual** no ambiente alvo — o backend não executa `Migrate()` no startup e `scripts/deploy/deploy.ps1` não aplica migrations. Para renomeação em massa, o caminho de produção é [renomear-tabelas-tb-idempotente.sql](../scripts/db/renomear-tabelas-tb-idempotente.sql).

## Contagens confirmadas

| Medida | Total | Observação |
|---|---:|---|
| `DbSet` em `AppDbContext` | 24 | Inclui três espelhos legados de leitura; saiu `DbSet<Cliente>`. |
| Entidades no snapshot final | 24 | Confere com os `DbSet` mapeados. |
| Tabelas gerenciadas pelas migrações | 21 | As três legadas usam `ExcludeFromMigrations()`. |
| Tabelas legadas somente leitura | 3 | `tbcliente`, `tbchamado` e `tbfuncionario`. |
| Classes de migração presentes | 18 | 16 originais + `PadraoTabelasTb` + `RenomeiaIndicesPkTb`. A presença do arquivo não prova que foi aplicada no banco alvo. |
| Operações de controller | 82 | Recalculada a partir dos atributos `[Http*]`; detalhada no catálogo de endpoints. |
| DTOs de acesso persistidos no `AppDbContext` | 0 | `EmpresaAcesso` é projeção externa; os demais modelos de requisição/resposta não são `DbSet`. |

## Fontes de verdade

| Fonte | Papel confirmado |
|---|---|
| `AppDbContext`, modelos e snapshot | Fonte do estado ORM atual; o snapshot representa o modelo final gerado pelas migrações. |
| `tboperador` | Fonte de operadores, perfil, estado, função e dados usados na autenticação. O campo de senha é sensível. |
| `tbfuncao` | Fonte das funções/descrições usadas por perfil e filtros. A relação de `tboperador.FUNCAO_ID` pode ser nula. |
| `tbcliente` | Fonte de clientes do módulo de Implantação; `ProjetoService` consulta `ClienteLegado` e a migração `ClienteApontaTbCliente` aponta `PRJ_ClienteId` para essa tabela. Somente leitura no código de negócio. |
| `tbchamado` | Fonte de chamados legados para busca e vínculo com tarefas; a tabela é espelhada sem escrita. |
| `tbfuncionario` | Fonte da relação operador–função para filtros de agenda; não substitui o campo possivelmente não preenchido em `tboperador`. |
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
| `Operadores` / `Operador` | `tboperador` | `OperadorId` | Gerida | Identidade, estado, perfil, função e referência de auditoria. |
| `Funcoes` / `Funcao` | `tbfuncao` | `Id` (`FUNCAO_ID`) | Gerida | Descrição, classificação e ativo; tabela legada unificada. |
| `RefreshTokens` / `RefreshToken` | `tbrefreshtoken` | `Id` | Gerida | Hash do refresh, expiração, revogação, substituição e operador. |
| `AuditoriaAcessos` / `AuditoriaAcesso` | `tbauditoriaacesso` | `Id` | Gerida | Evento de visualização de acesso: operador, empresa, IP, data/hora e user-agent. |
| `TiposProjeto` / `TipoProjeto` | `tbtipoprojeto` | `Id` | Gerida | Código único, nome, obrigatoriedade de cliente, ordem e ativo. |
| `ColunasKanban` / `ColunaKanban` | `tbcolunakanban` | `Id` | Gerida | Ordem, cor, padrão, ativo e limite WIP. |
| `Projetos` / `Projeto` | `tbprojeto` | `Id` | Gerida | Código global, cliente, tipo, responsável, datas, progresso, horas e go-live. |
| `ProjetoEtapas` / `ProjetoEtapa` | `tbprojetoetapa` | `Id` | Gerida | Jornada de nove etapas por projeto; `ProjetoId + Ordem` é único. |
| `ProjetoEtapaChecklists` / `ProjetoEtapaChecklist` | `tbprojetoetapachecklist` | `Id` | Gerida | Itens de checklist e conclusão. |
| `ProjetoEtapaDocumentos` / `ProjetoEtapaDocumento` | `tbprojetoetapadocumento` | `Id` | Gerida | Nome, URL, descrição e autoria do documento. |
| `ProjetoEtapaHistoricos` / `ProjetoEtapaHistorico` | `tbprojetoetahistorico` | `Id` | Gerida | Histórico textual das alterações da etapa. |
| `ProjetoEtapaComentarios` / `ProjetoEtapaComentario` | `tbprojetoetapacomentario` | `Id` | Gerida | Comentário, usuário e data. |
| `Tarefas` / `Tarefa` | `tbtarefa` | `Id` | Gerida | Projeto/etapa opcionais, status, prazo, entrega, bloqueio, responsável, horas e arquivamento. |
| `ComentariosTarefa` / `ComentarioTarefa` | `tbcomentariotarefa` | `Id` | Gerida | Comentário de tarefa e autor lógico. |
| `TarefaResponsaveis` / `TarefaResponsavel` | `tbtarefareponsavel` | `(TarefaId, OperadorId)` | Gerida | Responsáveis adicionais em N:N. |
| `TarefaChamados` / `TarefaChamado` | `tbtarefachamado` | `(TarefaId, ChamadoId)` | Gerida | Ligação N:N entre tarefa e chamado legado. |
| `TarefaApontamentos` / `TarefaApontamento` | `tbtarefaapontamento` | `Id` | Gerida | Horas, operador lógico, data e observação. |
| `ChamadosLegado` / `ChamadoLegado` | `tbchamado` | `Id` | Legada | Espelho somente leitura; colunas ignoradas pelo modelo. |
| `Agenda` / `AgendaItem` | `tbagenda` | `Id` | Gerida | Responsável, intervalo, tipo, prioridade, SLA, projeto, recorrência e participantes. |
| `TiposEvento` / `TipoEvento` | `tbtipoevento` | `Id` | Gerida | Nome único, cor e ativo. |
| `AgendaParticipantes` / `AgendaParticipante` | `tbagendaparticipante` | `Id` | Gerida | Participante do evento; par evento/participante é único. |
| `AuditoriaImplantacao` / `AuditoriaImplantacao` | `tbauditoriaimplantacao` | `Id` | Gerida | Entidade, ação, usuário, data, observação e JSON antes/depois. |
| `FuncionariosLegado` / `FuncionarioLegado` | `tbfuncionario` | `FuncionarioId` | Legada | Operador, função e ativo para filtros de agenda. |
| `ClientesLegado` / `ClienteLegado` | `tbcliente` | `Id` | Legada | CNPJ, razão social, fantasia e ativo; fonte de clientes do módulo. |

O antigo `DbSet<Cliente>` / `IMPL_Cliente` **não existe mais**: a entidade `Cliente` foi apagada junto com o `DbSet` e o bloco de mapeamento. A fonte única de clientes é a legada `tbcliente`.

### Modelos que não são tabelas

`EmpresaAcesso`, `EmpresaResumo`, `EmpresaDetalheResponse`, `RagChatRequest`, `RagChatResponse` e os DTOs de requisição/resposta não têm `[Table]` nem `DbSet`. `EmpresaAcesso` é preenchido pelo Google Sheets e usado em memória.

## Relacionamentos confirmados

| Origem | Destino | Chave / ação no banco | Observação |
|---|---|---|---|
| `Operador` | `Funcao` | `FUNCAO_ID`, `SetNull` | Relação opcional. |
| `RefreshToken` | `Operador` | `OperadorId`, `Cascade` | Exclusão do operador remove refresh tokens. |
| `Projeto` | `TipoProjeto` | `TipoProjetoId`, `Restrict` | O banco impede a exclusão de tipo com projeto vinculado; o serviço lança `InvalidOperationException` e o controller atual não a trata, podendo resultar em `500` (limitação). |
| `Projeto` | `ClienteLegado` | `ClienteId`, `SetNull` | A FK aponta para a legada `tbcliente`; não existe mais tabela `IMPL_Cliente`. |
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
- `FuncionarioLegado.FuncaoId` não possui FK para `tbfuncao`; a consulta da agenda usa a correspondência por `OperadorId`, função e ativo.
- `ComentarioTarefa.AutorId` e campos de auditoria também não têm FK para `tboperador`.

`ClienteLegado` é a única entidade de cliente do modelo: a entidade `Cliente` e a tabela `IMPL_Cliente` foram removidas, e a migração `ClienteApontaTbCliente` aponta `Projeto.ClienteId` para `tbcliente`. O código do serviço usa `ClientesLegado` para listar clientes.

## Migrations e tabelas históricas

Há 18 classes de migração no diretório, nesta ordem de arquivo:

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
| `20260926010406_PadraoTabelasTb` | Padroniza os nomes de tabela em `tb*`, funde `CC_Funcao` na legada `tbfuncao`, remove as tabelas órfãs e renomeia 20 PKs. |
| `20260926022906_RenomeiaIndicesPkTb` | Alinha os **nomes** de índice, PK e unique constraint: 33 índices para `IX_<tabela>_<colunas>`, as 5 PKs que o EF deixou com nome automático e a unique constraint para `AK_tbtipoevento_Nome`. |

`IMPL_Equipe`, `IMPL_MembroEquipe` e `IMPL_Etapa` são históricos, não entidades do `AppDbContext` atual. A existência de uma migração não permite afirmar que o banco de destino foi atualizado; é necessário consultar o histórico aplicado no ambiente.

### `20260926010406_PadraoTabelasTb` em detalhe

Migration **escrita à mão** (o scaffold do EF não serviria) com três motivos: `tbfuncao` já existe como legada, então o EF geraria `RenameTable` e falharia; as tabelas órfãs da Agenda não pertencem ao modelo, então o EF nunca as removeria; e o scaffold emitiria `Drop`/`Add` de todas as PKs, FKs e índices, o que é desnecessário porque `sp_rename` só mexe em metadados.

| Grupo | O que faz |
|---|---|
| Renomeações (14) | `IMPL_Projeto`→`tbprojeto`, `IMPL_Tarefa`→`tbtarefa`, `IMPL_ComentarioTarefa`→`tbcomentariotarefa`, `IMPL_TarefaResponsavel`→`tbtarefareponsavel`, `IMPL_TarefaChamado`→`tbtarefachamado`, `IMPL_TarefaApontamento`→`tbtarefaapontamento`, `IMPL_TipoProjeto`→`tbtipoprojeto`, `IMPL_Agenda`→`tbagenda`, `IMPL_Auditoria`→`tbauditoriaimplantacao`, `CC_TipoEvento`→`tbtipoevento`, `CC_AgendaParticipante`→`tbagendaparticipante`, `RefreshTokens`→`tbrefreshtoken`, `AuditoriaAcessos`→`tbauditoriaacesso` e `IMPL_ColunaKanban`→`tbcolunakanban`. |
| Normalização de caixa (6) | `tbprojetoEtapa`→`tbprojetoetapa`, `tbprojetoEtapaChecklist`→`tbprojetoetapachecklist`, `tbprojetoEtapaDocumento`→`tbprojetoetapadocumento`, `tbprojetoEtapaHistorico`→`tbprojetoetahistorico`, `tbprojetoEtapaComentario`→`tbprojetoetapacomentario`, `TBOPERADOR`→`tboperador`. |
| Constraints | 20 PKs renomeadas por `sp_rename` (`PK_tbprojeto`, `PK_tboperador`, `PK_tbprojetoetapa*`, …), mais a `PK_tbfuncao` recriada em `ALTER TABLE` durante a fusão. **Nenhum índice foi renomeado aqui** e 5 PKs ficaram com o nome automático do EF: ambos ficaram para a `RenomeiaIndicesPkTb`. **As FKs não foram renomeadas** (cosmético; ver a seção de nomenclatura). |
| Fusão da função | `CC_Funcao` descartada; `tbfuncao` legada enriquecida (ver seção própria abaixo). |
| Remoções | `IMPL_Cliente`, `CC_Funcao`, `AgendaEvento` e `AgendaEventoParticipante`. |
| Preservadas de propósito | `chamado_bkp`, `chamado_itens_bkp`, `funcionarios` e `tb_testes` — não pertencem ao projeto. |

O `Down` é best-effort: devolve os nomes antigos e recria `CC_Funcao` a partir da `tbfuncao` enriquecida, mas **não** recria `IMPL_Cliente`, `AgendaEvento` nem `AgendaEventoParticipante` (devolver schema, não os dados de um cadastro morto).

### `20260926022906_RenomeiaIndicesPkTb` em detalhe

Complemento da anterior: alinha os **nomes** de índice, PK e unique constraint ao padrão `tb*`. Escrita à mão, com dois helpers (`RenameIndex` e `RenameConstraint`) que emitem `sp_rename` guardado por `IF EXISTS`/`IF NOT EXISTS`, portanto idempotentes.

| Grupo | Quantidade | Resultado |
|---|---:|---|
| Índices | 33 | Todos para a convenção do EF `IX_<tabela>_<colunas>`, entre eles `IX_IMPL_Agenda_Operador_DataInicio_DataFim`→`IX_tbagenda_AGD_OperadorId_AGD_DataInicio_AGD_DataFim`, `IX_IMPL_Projeto_PRJ_Codigo`→`IX_tbprojeto_PRJ_Codigo`, `IX_TBOPERADOR_FUNCAO_ID`→`IX_tboperador_FUNCAO_ID` e `IX_RefreshTokens_TokenHash`→`IX_tbrefreshtoken_TokenHash`. |
| PKs | 5 | As que o EF deixou com nome automático (`PK__IMPL_Age__…` e afins): `PK_tbagenda`, `PK_tbagendaparticipante`, `PK_tbauditoriaacesso`, `PK_tbrefreshtoken`, `PK_tbtipoevento`. |
| Unique constraint | 1 | `UQ__CC_TipoE__7D8FE3B22A85213B`→`AK_tbtipoevento_Nome`, pela convenção do EF para chave alternativa (`AK_<tabela>_<colunas>`). |

**Duas armadilhas do `sp_rename` que causaram falha silenciosa** (o motivo de a `PadraoTabelasTb` ter saído com 33 índices e 5 PKs pendentes, apesar de ter sido aplicada sem erro):

1. **Índice exige o itemtype `'INDEX'`.** Sem esse argumento, `OBJECT_ID('dbo.<índice>')` devolve `NULL`, porque índice não vive no namespace de schema. O guard `IF NOT EXISTS` então passava e o `sp_rename` era **pulado sem erro** — falha silenciosa. Constraint (PK/UQ), ao contrário, é objeto de schema (tipo `PK`/`UQ`): o guard por `OBJECT_ID` funciona e o itemtype default basta.
2. **O nome do índice precisa ser qualificado com a tabela**, no formato `"tabela.índice"`. Tanto `"dbo.índice"` quanto `"índice"` falham com o erro **15248** (*@objname é ambíguo ou o @objtype INDEX reivindicado está errado*).

⚠️ **Lacuna no `Down`:** o `Down` desta migration repete as mesmas chamadas de renomeação do `Up` (não reverte para os nomes antigos). Reverter exige um ajuste manual antes de qualquer uso.

Conferência após a aplicação no banco alvo: 0 tabelas, 0 índices e 0 constraints de PK/AK fora do padrão, com as 24 tabelas do snapshot presentes.

## Fusão de `CC_Funcao` na legada `tbfuncao`

A entidade `Funcao` passou a mapear a tabela legada `tbfuncao` (antes apontava `CC_Funcao`, criada pela migration `AddFuncao`).

| Coluna | Antes | Agora |
|---|---|---|
| `FUNCAO_ID` | `smallint` (legada) | `int NOT NULL` — **widening necessário** porque `tboperador.FUNCAO_ID` é `int`. Exige derrubar e recriar a PK. |
| `DESCRICAO` | legada | inalterada (limite 100) |
| `CLASSIFICACAO` | inexistente na legada | `varchar(50) NULL` |
| `ATIVO` | inexistente na legada | `bit NOT NULL DEFAULT 1` |

Conteúdo preservado: `FUNCAO_ID` 1, 2 e 3, com `DESCRICAO` da base legada (Analista de Sistemas, Suporte, Programador) e `CLASSIFICACAO` preenchida pela migration como `Implantador`, `Atendimento` e `Desenvolvimento`; todas com `ATIVO = 1`. Nenhuma FK de outro sistema referenciava `tbfuncao` antes da alteração.

A FK `tboperador.FUNCAO_ID` foi recriada com `ON DELETE SET NULL` e nome novo `FK_tboperador_tbfuncao_FUNCAO_ID` — a única FK que acompanha o padrão, porque a constraint antiga caiu junto com a tabela `CC_Funcao`.

## Tabelas removidas e correção factual

| Removida | Motivo |
|---|---|
| `IMPL_Cliente` | Entidade `Cliente` morta: nenhum serviço ou controller a usava. O fonte de clientes é a legada `tbcliente`. Entidade, `DbSet<Cliente>` e o bloco de mapeamento foram apagados. |
| `CC_Funcao` | Substituída pela legada `tbfuncao` enriquecida. |
| `AgendaEvento` e `AgendaEventoParticipante` | Órfãs do rollback da Agenda, 0 linhas, com FK ativa para o que era `IMPL_Projeto`. |

> ⚠️ **Correção factual:** documentos antigos afirmavam que as órfãs da Agenda eram `CC_Agenda`, `CC_Perfil` e `CC_Auditoria`. **Isso estava errado.** As tabelas órfãs reais eram `AgendaEvento` e `AgendaEventoParticipante`, e ambas foram removidas. `CC_TipoEvento` e `CC_AgendaParticipante` nunca foram órfãs — foram apenas renomeadas para `tbtipoevento` e `tbagendaparticipante` e continuam em uso pela Agenda. A afirmação antiga estava nos documentos de projeto da Agenda, removidos do repositório.

## Migrations carimbadas manualmente e armadilhas de histórico

Rodar `dotnet ef database update` num ambiente já tratado por scripts manuais pode falhar ou tentar reexecutar trabalho. Registrar o que foi carimbado à mão:

| Migration | Situação |
|---|---|
| `20260914144751_AgendaConflitoHorarios` | Já aplicada fisicamente via script manual; inserida manualmente em `__EFMigrationsHistory`. |
| `20260917202045_TarefaProjetoOpcional` | Idem. |
| `20260920185734_TarefaProjetoEtapaId` | Idem. |
| `20260922154202_RemoveEtapaAntiga` | Aplicada normalmente (sem carimbo manual). |

**Armadilha `AgendaGeral`:** o banco tem o registro `20260910183240_AgendaGeral` em `__EFMigrationsHistory`, mas **não existe** o arquivo `.cs` correspondente no repositório (roll-back da Agenda). O EF ignora linhas desconhecidas do histórico, então não há erro — mas comparar ambientes pela contagem/ordem do histórico pode confundir. O snapshot atual é a fonte autoritativa do modelo.

Os scripts auxiliares usados nesse processo ficam em `scripts/db/` e em `Migrations/Sql/`. Hoje existe **um único** script de produção: [renomear-tabelas-tb-idempotente.sql](../scripts/db/renomear-tabelas-tb-idempotente.sql), gerado a partir das duas migrations já corrigidas. Ele é idempotente e cobre o conjunto inteiro — tabelas, PKs, índices e a unique constraint — equivalendo a `PadraoTabelasTb` + `RenomeiaIndicesPkTb` (necessário porque `scripts/deploy/deploy.ps1` **não** aplica migrations). Os 33 `sp_rename` de índice usam o formato correto (`sp_rename N'<tabela>.IX_…', N'IX_…', N'INDEX'`), sem a forma defeituosa `sp_rename N'dbo.IX_…'`, e o script carimba 11 migrations em `__EFMigrationsHistory`. [migracao-tarefa-projeto-etapa-id.sql](../scripts/db/migracao-tarefa-projeto-etapa-id.sql) está marcado como **obsoleto — não executar**; foi substituído pelo script único. Para auditar, [conferencia-padrao-tb.sql](../scripts/db/conferencia-padrao-tb.sql) aceita nomes antigos e novos: rode antes e depois e compare as seções 1 e 2 (contagens não podem mudar).

## Refresh tokens e auditoria

### `tbrefreshtoken` (`RefreshTokens`)

- A tabela guarda `TokenHash`, não o token bruto. O operador é FK e a remoção do operador remove os tokens.
- `ExpiraEm`, `CriadoEm`, `Revogado` e `SubstituidoPor` suportam expiração, rotação e auditoria de uso.
- O hash usa SHA-256 do token. O token em claro só existe no cookie temporário e no retorno interno do serviço; o controlador não o remove do JSON: o campo é serializado como `refreshToken: ""` no login e no refresh.
- Não há endpoint de consulta de tokens; as operações de login, refresh e logout são as operações expostas.

### `tbauditoriaimplantacao` (`IMPL_Auditoria`)

- `AuditoriaImplantacaoService` serializa estado anterior/posterior em JSON, com `camelCase`, remoção de nulos e ignora ciclos.
- Falha ao registrar auditoria é apenas logada e não desfaz a operação principal.
- A cobertura é por serviço: criação/alteração/exclusão de projeto e tarefa, movimentação de tarefa, vínculo de chamado e criação de apontamento; não é um registro universal de todas as alterações de etapa/agenda.
- `HistoricoAsync` da tarefa lê essa auditoria e monta `HistoricoMovimentacao`; não há endpoint geral de auditoria no conjunto atual de controllers.

### `tbauditoriaacesso` (`AuditoriaAcessos`)

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
- O serviço consulta tabelas, colunas, índices, FKs, PKs (`ListarPkAsync`), procedimentos, funções, gatilhos, dependências e relacionamentos no SQL Server configurado.
- Relacionamentos confirmados vêm de FKs reais; relacionamentos possíveis são inferidos por nomes/tipos/índices e carregam pontuação. A inferência não é uma FK.
- `DatabaseQueryBuilderService` valida até cinco tabelas, monta SELECT/CTE/joins/filtros/ordenações e devolve SQL; não foi localizado endpoint que execute esse SQL.
- `DatabaseConnectionConfigDto` mascara a senha no controller. Entretanto, todos os endpoints do controller exigem apenas `Authorize`, e os DTOs de procedimento/gatilho podem conter o corpo completo do objeto. A exposição deve ser considerada em função do perfil do usuário.
- `SqlScriptGeneratorService` consome o resultado da comparação (com `SchemaArquivo`/`SchemaJca`) e devolve `SqlScriptResultDto` (`SqlScriptDto` com `tabela`/`severidadeOrigem`, `SqlScriptResumoDto`), somente com criações vindas do arquivo; os contratos de geração/validação ficam em `DatabaseDtos.cs` e não são persistidos em nenhuma tabela (sem EF/migração). A comparação de procedures usa `ProceduresComparisonResultDto` também em `DatabaseDtos.cs`, sem persistência.
- A comparação de schemas carrega a chave primária em `SchemaInfoDto.Pk` (`SchemaPkInfoDto`: `nome` + `colunas`) e classifica as diferenças em `SchemaDifferenceDto.Categoria` (`Coluna`, `Tipo`, `Nullable`, `Indice`, `Fk`, `Pk` e `Tabela`); tudo é contrato de API, sem tabela própria.

## Segurança e dados sensíveis

| Dado | Onde aparece | Tratamento confirmado / lacuna |
|---|---|---|
| Senha do operador | `tboperador.Senha` e comparador de autenticação | É dado sensível; comparação SHA-256 estática, sem hash adaptativo encontrado. |
| Refresh token | `tbrefreshtoken.TokenHash` e cookie `cc_refresh` | Banco guarda hash; cookie é HttpOnly, mas está com `Secure=false`. |
| Credenciais de empresas | `EmpresaAcesso` e `EmpresaDetalheResponse` | Google Sheets é a fonte; resposta de Acessos não mascara os campos. |
| IP/user-agent | `tbauditoriaacesso` | Registrados para rastreabilidade; não substitui controle de acesso. |
| JSON antes/depois | `tbauditoriaimplantacao` | Serializado sem mascaramento explícito; pode carregar conteúdo operacional. |
| Senha do Explorer | `DatabaseExplorer:*` / `DB_EXPLORER_*` | Configuração mascarada no DTO; valores não são documentados aqui. |
| Definições de procedimentos/gatilhos | DTOs do Database Explorer | Podem ser completas e são acessíveis a qualquer usuário autenticado. |
| Chave de AnythingLLM | `AnythingLLM:ApiKey` | Usada no proxy; nunca deve ser retornada ou registrada em resposta. |

O arquivo [appsettings.Development.json](../backend/Central_BackEnd/appsettings.Development.json) contém valores preenchidos de desenvolvimento, inclusive chaves e dados sensíveis. Nenhum valor é reproduzido aqui; antes de compartilhar o repositório, mover esses valores para ambiente/user-secrets e rotacionar os que forem reais.

## Contagens e fatos confirmados no baseline

- 24 `DbSet`; 21 entidades incluídas nas migrações e 3 espelhos legados somente leitura.
- 18 classes de migração presentes; última por nome/arquivo é `RenomeiaIndicesPkTb`.
- `tbrefreshtoken` e as duas tabelas de auditoria são persistidas no `AppDbContext`.
- `tbcliente`, `tbchamado` e `tbfuncionario` são fontes legadas de leitura; `EmpresaAcesso` e os dados do Explorer não são tabelas do `AppDbContext`.
- A listagem de clientes de projeto usa `tbcliente`; não existe mais `IMPL_Cliente` nem entidade `Cliente` no modelo.
- Nomes de tabela seguem o padrão `tb*`; nomes de coluna, PKs e FKs seguem as regras descritas na seção de nomenclatura.
