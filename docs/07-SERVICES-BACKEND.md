---
title: "07 — Serviços, controllers e persistência do backend"
description: "Arquitetura real da API, controllers, DI, serviços, modelos, DTOs, DbContext, migrações, autenticação, Acessos, Agenda, Implantação, Database e RagProxy."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# 07 — Serviços, controllers e persistência do backend

> Documento derivado do working tree em 2026-09-25. A raiz real é `backend/Central_BackEnd`; `backend/src/...` não pertence à solução atual. Valores de conexão, chaves, credenciais e seeds sensíveis foram omitidos. Não foram executados build, testes, migrações ou integração com serviços externos.

## Índice

1. Escopo e ambiente de execução
2. Pipeline, DI, autenticação e limitação de requisições
3. Controllers e endpoints
4. Serviços principais
5. Modelos, DbContext e relacionamentos
6. DTOs e contratos
7. Migrações e persistência
8. Fluxos integrados
9. Recursos removidos e código dormente
10. Limitações atuais e riscos confirmados
11. Incertezas remanescentes

## 1. Escopo e ambiente de execução

### 1.1 Fontes principais

| Fonte | Papel factual |
|---|---|
| [`backend/Central_BackEnd/Central_BackEnd.csproj`](../backend/Central_BackEnd/Central_BackEnd.csproj) | .NET 8, nullable, EF Core SQL Server/InMemory e JWT |
| [`backend/Central_BackEnd/Program.cs`](../backend/Central_BackEnd/Program.cs) | Composition root, DI, autenticação, middleware, seeds e pipeline |
| [`backend/Central_BackEnd/Data/AppDbContext.cs`](../backend/Central_BackEnd/Data/AppDbContext.cs) | DbSets, chaves, índices e relacionamentos EF |
| [`backend/Central_BackEnd/Controllers`](../backend/Central_BackEnd/Controllers) | Controllers versionados e RagProxy |
| [`backend/Central_BackEnd/Services`](../backend/Central_BackEnd/Services) | Serviços de domínio, segurança, integração e Database Explorer |
| [`backend/Central_BackEnd/Models`](../backend/Central_BackEnd/Models) | Entidades EF, espelhos legados e contratos sem persistência |
| [`backend/Central_BackEnd/Dtos`](../backend/Central_BackEnd/Dtos) | Requests e responses versionados |
| [`backend/Central_BackEnd/Migrations`](../backend/Central_BackEnd/Migrations) | Histórico EF e snapshot atual |

### 1.2 Stack

| Item | Estado no código |
|---|---|
| Runtime | ASP.NET Core 8 / C# com nullable habilitado |
| Persistência principal | EF Core 8 com SQL Server |
| Desenvolvimento | Provider InMemory quando `Database:UseSqlServer` é falso |
| Versionamento de API | Segmento de URL ou cabeçalho; versão padrão 1.0 |
| Autenticação | JWT Bearer HMAC SHA-256 |
| Integrações | Google Sheets e AnythingLLM/RAG |
| Banco explorador | `Microsoft.Data.SqlClient` em conexão separada |
| OpenAPI | Swagger condicional por configuração |
| Testes | Não foi localizado projeto de testes backend no escopo consultado |

## 2. Pipeline, DI, autenticação e limitação de requisições

### 2.1 Pipeline HTTP

Fora de Development, o tratador global de exceções e HSTS são habilitados antes. A ordem comum do pipeline em [`Program.cs`](../backend/Central_BackEnd/Program.cs) é:

1. `UseRouting()`;
2. `UseRateLimiter()`;
3. `UseCors("Angular")`;
4. Swagger, quando habilitado;
5. `UseAuthentication()`;
6. `UseAuthorization()`;
7. `MapControllers()`.

O tratador global de exceções devolve 500 genérico. A política CORS `Angular` permite cabeçalhos e métodos configurados, credenciais e somente as origens cadastradas no código. Não há `MapFallbackToFile` nem chamada automática a `Database.Migrate()` na raiz de composição.

### 2.2 DbContext

`AppDbContext` é scoped. Em Development, `Database:UseSqlServer` seleciona SQL Server ou InMemory; nos demais ambientes o provider é SQL Server. A design-time factory usa SQL Server local para permitir geração de migrações.

### 2.3 Dependências de autenticação

| Configuração | Aplicação |
|---|---|
| Chave JWT | Variável de ambiente tem precedência sobre `Jwt:Key` |
| Issuer/audience/lifetime | Configuração `Jwt` |
| Algoritmo | HMAC SHA-256 |
| Validação | Issuer, audience, expiração e assinatura; clock skew de um minuto |
| Credencial de acesso | Bearer token; o refresh token não é Bearer |

### 2.4 Lifetimes do DI

| Lifetime | Registrations |
|---|---|
| Scoped | `AppDbContext`, `IAuthService`, `IRagProxyService`, `IPasswordValidationService` |
| Scoped | Todos os serviços de Implantação: tipos, colunas, projetos, cards, jornada, tarefas, dashboards, agenda e auditoria |
| Scoped | Serviços do Database Explorer, exceto a conexão |
| Singleton | `IGoogleSheetsService`, `BruteForceGuard`, `IDatabaseConnectionService` |
| Infraestrutura | `IHttpClientFactory` por `AddHttpClient()` |
| Estático | `SegurancaHelper`, `TimeZoneHelper` e extensão de atraso |

O cache de validação de senha é estático mesmo com o serviço scoped.

### 2.5 Limitação de requisições

| Política | Chave | Limite |
|---|---|---|
| `login` | IP remoto | 5/min fora de Development; 50/min em Development |
| `validacao` | Política: usuário se `User` já estiver autenticado; caso contrário, IP | 50/min fora de Development; 100/min em Development |
| `leitura` | Política: usuário se `User` já estiver autenticado; caso contrário, IP | 100/min |

Como `UseRateLimiter()` vem antes de `UseAuthentication()` no pipeline atual, a política não encontra o principal preenchido por esse middleware e usa o IP. Não há fila; a rejeição usa HTTP 429.

## 3. Controllers e endpoints

### 3.1 Convenções

- Controllers de domínio usam `api/v{version:apiVersion}` e `[ApiVersion("1.0")]`.
- A versão pode vir do segmento de URL ou de `X-Api-Version`; a versão padrão configurada é 1.0, mas todos os controllers versionados usam uma rota que contém o segmento versionado.
- `RagProxyController` é a exceção: usa `/api/rag-proxy`, sem versionamento.
- “JWT” significa `[Authorize]`; “Admin” significa `[Authorize(Roles = "Administrador")]`; “Público” significa ausência de `[Authorize]`.
- Os corpos abaixo são resumos; os campos completos estão nos DTOs citados.

### 3.2 Auth, Acessos e RagProxy

| Método e caminho | Corpo/parâmetros | Autorização | Comportamento |
|---|---|---|---|
| `POST /api/v1/auth/login` | `LoginRequest`: `usuario`, `senha`, `lembrarAcesso` | Público | Valida campos, autentica e grava cookie de refresh |
| `POST /api/v1/auth/refresh` | Sem parâmetro; frontend envia `{}` | Público | Rotaciona refresh pelo cookie `cc_refresh` |
| `POST /api/v1/auth/logout` | Sem corpo | JWT | Quando autorizado, revoga o refresh atual e apaga cookies; a chamada atual do frontend não envia Bearer |
| `GET /api/v1/auth/me` | Sem corpo | JWT | Obtém o operador pelo claim e devolve `UsuarioResponse` |
| `GET /api/v1/acessos` | Sem corpo | JWT | Lista resumos vindos do Google Sheets |
| `POST /api/v1/acessos/validar-senha` | `PasswordValidationRequest` | JWT | Valida a senha do operador autenticado e cria cache temporário |
| `POST /api/v1/acessos/visualizar?empresaId={id}` | `PasswordValidationRequest` opcional | JWT | Exige validação recente ou senha e audita a visualização |
| `POST /api/rag-proxy/chat` | `RagChatRequest` | JWT | Encaminha ao destino RAG; em falha/status não sucesso com fallback habilitado, devolve **resposta simulada** sem marcador de origem |

O controller de autenticação define [`LoginRequest`](../backend/Central_BackEnd/Dtos/LoginRequest.cs), [`TokenResponse`](../backend/Central_BackEnd/Dtos/TokenResponse.cs) e [`UsuarioResponse`](../backend/Central_BackEnd/Dtos/UsuarioResponse.cs).

O cookie `cc_refresh` é criado com `HttpOnly`, `SameSite=Strict`, `Secure=false` e `Path=/`. Com `lembrarAcesso=true`, recebe `MaxAge` de quatro horas e o controller cria o marcador `cc_lembrar=1`; sem persistência, o cookie de refresh é de sessão. A expiração da linha persistida em `RefreshTokens` vem de `Jwt:RefreshTokenHours`; `lembrarAcesso` altera a persistência do cookie, não esse campo. O campo `RefreshToken` é esvaziado no corpo antes da resposta.

### 3.3 Agenda

Todos os endpoints usam JWT. Leituras usam a política `leitura`; mutações usam `validacao`.

| Método e caminho | Corpo/parâmetros | Resultado principal |
|---|---|---|
| `GET /api/v1/agenda/eventos` | `inicio`, `fim`, `responsavelId?`, `funcaoId?` | Eventos no intervalo, convertidos para Brasília |
| `GET /api/v1/agenda/eventos/{id}` | Sem corpo | Detalhe e participantes |
| `POST /api/v1/agenda/eventos` | `AgendaCriarRequest` | Cria evento após regras de tipo e conflito do responsável |
| `POST /api/v1/agenda/eventos/lote` | `AgendaCriarLoteRequest` | Cria recorrência diária, semanal ou mensal após regras de tipo e conflito do responsável |
| `PUT /api/v1/agenda/eventos/{id}` | `AgendaAtualizarRequest` | Atualiza responsável ou evento conforme permissão; participantes e SLA podem ser substituídos |
| `DELETE /api/v1/agenda/eventos/{id}` | Sem corpo | Exclui quando permitido |
| `PATCH /api/v1/agenda/eventos/{id}/mover` | `AgendaMoverRequest` | Move e verifica conflito do responsável |
| `GET /api/v1/agenda/tipos` | Sem corpo | Tipos ativos |
| `GET /api/v1/agenda/funcoes` | Sem corpo | Funções ligadas a funcionários legados ativos |
| `GET /api/v1/agenda/operadores` | Sem corpo | Operadores ativos |

Os contratos estão em [`AgendaDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/AgendaDtos.cs).

### 3.4 Database Explorer

Todos os endpoints usam JWT. Os três de comparação (schemas, banco inteiro e procedures) e os três de scripts de correção também usam `validacao` e limite de requisição.

| Método e caminho | Corpo/parâmetros | Serviço |
|---|---|---|
| `GET /api/v1/database/status` | Sem corpo | Testa `SELECT 1` |
| `GET /api/v1/database/info` | Sem corpo | Versão e contadores de objetos |
| `GET /api/v1/database/tables` | `schema?`, `filtro?` | Lista tabelas e contagem de registros |
| `GET /api/v1/database/tables/{schema}/{nome}` | Sem corpo | Detalhe da tabela |
| `GET /api/v1/database/tables/{schema}/{nome}/columns` | Sem corpo | Colunas e valores padrão |
| `GET /api/v1/database/tables/{schema}/{nome}/indexes` | Sem corpo | Índices |
| `GET /api/v1/database/relationships` | `schema?`, `tabela?`, `incluirPossiveis?`, `take?` | FKs confirmadas e inferidas |
| `GET /api/v1/database/graph` | `tabela`, `profundidade?`, `incluirPossiveis?` | Grafo por percurso BFS |
| `GET /api/v1/database/column-usage` | `coluna` | Ocorrências exatas do nome da coluna |
| `GET /api/v1/database/search` | `termo`, `take?` | Busca em tabelas, colunas, views, procedures, functions e triggers |
| `GET /api/v1/database/procedures` | `schema?`, `busca?`, `take?` | Procedures resumidas |
| `GET /api/v1/database/procedures/{schema}/{nome}` | Sem corpo | Procedure, parâmetros e corpo da definição |
| `GET /api/v1/database/triggers` | `schema?`, `tabela?` | Triggers e eventos inferidos do corpo |
| `GET /api/v1/database/triggers/{schema}/{nome}` | Sem corpo | Trigger específica e corpo da definição |
| `GET /api/v1/database/tables/{schema}/{nome}/dependencies` | Sem corpo | Dependências por busca textual e metadados |
| `GET /api/v1/database/procedures/{schema}/{nome}/analysis` | Sem corpo | Análise textual da procedure |
| `POST /api/v1/database/query-builder-advanced` | `QueryBuilderAdvancedRequest` | Gera SQL; não executa a consulta |
| `GET /api/v1/database/config` | Sem corpo | Retorna servidor, porta, banco, usuário e flags; o controller substitui a senha configurada por `***` |
| `POST /api/v1/database/compare-schemas` | Multipart: `schema`, `tabela`, `arquivo` | Compara uma tabela; upload vazio rejeitado |
| `POST /api/v1/database/compare-schemas-bulk` | Multipart: `arquivo` | Compara várias tabelas; upload vazio rejeitado |
| `POST /api/v1/database/compare-procedures` | Multipart: `arquivo` | `DatabaseSchemaComparisonService.CompararProceduresAsync`; compara corpos de procedures (20 MB), não gera script |
| `POST /api/v1/database/generate-correction-scripts` | `GerarScriptsRequest` | `SqlScriptGeneratorService.GerarScripts`; gera somente criações, não executa |
| `POST /api/v1/database/generate-correction-scripts-bulk` | `GerarScriptsBulkRequest` | `SqlScriptGeneratorService.GerarScriptsBulk`; gera scripts, não executa |
| `POST /api/v1/database/validate-script` | `ValidarScriptRequest` | `SqlScriptGeneratorService.ValidarScriptAsync`; validação estática, não executa |

Os DTOs do módulo estão em [`DatabaseDtos.cs`](../backend/Central_BackEnd/Dtos/Database/DatabaseDtos.cs). A comparação de schemas devolve `SchemaArquivo` e `SchemaJca` (quando disponíveis), que a geração de scripts usa para classificar a compatibilidade dos tipos; a comparação de procedures devolve `ProceduresComparisonResultDto` (`status` `Compativel`/`Divergente`/`SomenteBanco`/`SomenteArquivo`, com os dois corpos quando existem) e não passa pela geração de scripts.

#### SqlScriptGeneratorService

[`SqlScriptGeneratorService.cs`](../backend/Central_BackEnd/Services/Database/SqlScriptGeneratorService.cs) (scoped, registrado em `Program.cs` junto aos demais serviços do módulo) transforma o resultado da comparação — enviado como JSON pronto, sem novo upload — em `SqlScriptResultDto`:

- **Tipos de script:** somente criações — `CREATE_TABLE`, `ADD_COLUMN`, `CREATE_INDEX` e `ALTER_FK`. No modo banco inteiro a saída é ordenada por tabela (ordem de processamento da comparação) e, dentro da tabela, por tipo (criação → coluna → índice/FK).
- **Direção:** o banco JCA é a fonte da verdade. Divergência, tabela/coluna só no JCA ou ausente no arquivo não geram script (seguem o padrão do banco); só o que existe no arquivo e falta no JCA vira script, montado a partir do schema do arquivo.
- **Metadados por script:** cada `SqlScriptDto` carrega `tabela` e `severidadeOrigem` (critico para criação de tabela/coluna; severidade da diferença de origem para índice e FK), usados pelo filtro das abas no frontend. `ScriptsGenOpcoesDto` (`gerarBackup`/`modoEstrito`) continua no contrato por compatibilidade, mas não tem efeito.
- **`resumo`:** totais por categoria, impacto estimado (`Low` sem criar tabela, `Medium` com `CREATE_TABLE`), contagem de avisos e `revisaoManual` (apenas tabelas sem definição no arquivo, que impedem a montagem).
- **`ValidarScriptAsync`:** validação **estática** (nunca executa no SQL Server): limpa comentários/strings, aplica allowlist de verbos e objetos, emite avisos para `DROP TABLE/COLUMN`, `TRUNCATE` e `DELETE`/`UPDATE` sem `WHERE`, e confere a existência de tabelas por consulta leve em `INFORMATION_SCHEMA.TABLES` apenas quando a conexão está disponível.

### 3.5 Projetos e cards de etapa

Todos os endpoints usam JWT. O controller aplica `validacao`; a listagem de clientes também declara a política `leitura` no método.

| Método e caminho | Corpo/parâmetros | Autorização/efeito |
|---|---|---|
| `GET /api/v1/implantacao/projetos` | Filtros de tipo, status, cliente, responsável, busca e perfil | Lista até 500 Projetos |
| `GET /api/v1/implantacao/projetos/com-etapas` | Mesmos filtros | Lista Projeto com cards; pode inicializar cards ausentes |
| `GET /api/v1/implantacao/projetos/{id}` | Sem corpo | Detalhe e contadores de Tarefas |
| `GET /api/v1/implantacao/projetos/etapas-padrao` | Sem corpo | Nove nomes padrão |
| `GET /api/v1/implantacao/projetos/{id}/etapas` | Sem corpo | Cards e contadores dinâmicos |
| `GET /api/v1/implantacao/projetos/{id}/etapas/{ordem}` | Sem corpo | Card com checklist, documentos, histórico e comentários |
| `GET /api/v1/implantacao/projetos/proximo-codigo` | Sem corpo | Próximo código `PRJ-####` calculado |
| `GET /api/v1/implantacao/projetos/clientes` | Sem corpo | Clientes ativos de `tbcliente` |
| `POST /api/v1/implantacao/projetos` | `ProjetoCriarRequest` | Cria Projeto e nove cards; etapa anterior pode nascer concluída |
| `PUT /api/v1/implantacao/projetos/{id}` | `ProjetoAtualizarRequest` | Atualiza e audita |
| `PUT /api/v1/implantacao/projetos/{id}/etapas/{ordem}` | `ProjetoEtapaAtualizarRequest` | Atualiza checklist/estado e recalcula Projeto |
| `POST /api/v1/implantacao/projetos/{id}/etapas/retornar` | `ProjetoEtapaRetornoRequest` | Retorna a jornada e reseta cards posteriores |
| `POST .../{id}/etapas/{ordem}/checklist` | `ProjetoEtapaChecklistItemRequest` | Acrescenta item |
| `POST .../{id}/etapas/{ordem}/documentos` | `ProjetoEtapaDocumentoRequest` | Acrescenta documento e histórico; recebe URL, sem upload binário |
| `POST .../{id}/etapas/{ordem}/comentarios` | `ProjetoEtapaComentarioRequest` | Acrescenta comentário |
| `DELETE /api/v1/implantacao/projetos/{id}` | Sem corpo | Exclui Projeto e cards pelo cascade configurado |

Os contratos estão em [`ProjetoDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/ProjetoDtos.cs).

### 3.6 Tarefas

Todos os endpoints usam JWT e `validacao`.

| Método e caminho | Corpo/parâmetros | Autorização/efeito |
|---|---|---|
| `GET /api/v1/implantacao/tarefas` | Filtros de Projeto, responsável, status, datas, perfil, função e arquivamento | Lista até 500; arquivadas excluídas por padrão |
| `GET /api/v1/implantacao/tarefas/{id}` | Sem corpo | Detalhe completo |
| `POST /api/v1/implantacao/tarefas` | `TarefaCriarRequest` | Cria tarefa, vínculos e auditoria; `projetoEtapaId` sem `projetoId` é rejeitado com mensagem explícita |
| `PUT /api/v1/implantacao/tarefas/{id}` | `TarefaAtualizarRequest` | Atualiza os campos enviados, sincroniza card/coluna e audita; não é um PATCH de campos parciais; não troca `projetoId` e valida/zera `projetoEtapaId` |
| `PATCH /api/v1/implantacao/tarefas/{id}/coluna` | `TarefaMudarColunaRequest` | Move, aplica WIP e sincroniza estado |
| `PATCH .../{id}/arquivar` | Corpo `{}` | Arquiva somente Tarefa concluída |
| `PATCH .../{id}/desarquivar` | Corpo `{}` | Desarquiva e volta para coluna de concluídas |
| `DELETE /api/v1/implantacao/tarefas/{id}` | Sem corpo | Exclui, audita e recalcula jornada |
| `POST .../{id}/comentarios` | `ComentarioCriarRequest` | Acrescenta comentário |
| `GET /api/v1/implantacao/tarefas/chamados/busca` | `buscar?`, `take?` | Consulta `tbchamado` |
| `POST .../{id}/chamados` | `TarefaChamadoRequest` | Vincula chamado legado |
| `DELETE .../{id}/chamados/{chamadoId}` | Sem corpo | Desvincula e limpa referência legada quando aplicável |
| `POST .../{id}/apontamentos` | `ApontamentoCriarRequest` | Cria apontamento e recalcula horas |
| `PUT .../apontamentos/{id}` | `ApontamentoAtualizarRequest` | JWT; o controller calcula admin por role/claim, mas o token emitido atualmente não satisfaz esse teste; na prática, fica limitado ao próprio apontamento |
| `DELETE .../apontamentos/{id}` | Sem corpo | JWT; o controller calcula admin por role/claim, mas o token emitido atualmente não satisfaz esse teste; na prática, fica limitado ao próprio apontamento |
| `GET /api/v1/implantacao/tarefas/{id}/historico` | Sem corpo | Histórico derivado de `IMPL_Auditoria` |
| `GET /api/v1/implantacao/dashboard` | `equipe?`, `projetoId?` | Agregados do dashboard |

Os DTOs estão em [`TarefaDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/TarefaDtos.cs). Para apontamentos, o controller calcula `ehAdmin` com role `Admin` ou claim `PerfilId=A`; `AuthService` emite role `Administrador` e claim `perfil=Administrador`, sem `PerfilId`. Assim, para os JWTs emitidos pelo serviço atual, o controller delega ao service sem marcar admin, e a regra efetivo é “próprio apontamento”.

A regra de etapa do projeto é aplicada no serviço, não no controller. `TarefaService.ValidarEtapaFixaAsync` exige `ProjetoEtapaId` quando a tarefa tem projeto (`Etapa do projeto é obrigatória para tarefas de projeto`) e confirma que a etapa pertence a esse projeto (`Etapa do projeto inválida para esta tarefa`). Sem projeto, a validação é ignorada. Na criação, `CriarAsync` rejeita etapa sem projeto (`Não é possível informar uma etapa do projeto sem informar o projeto.`); na atualização, `AtualizarAsync` valida a etapa contra o projeto já persistido, mantém `t.ProjetoId` inalterado — `TarefaAtualizarRequest` não transporta projeto — e grava `t.ProjetoEtapaId = null` quando a tarefa é sem projeto.

### 3.7 Catálogos e dashboard administrativo

| Método e caminho | Corpo/parâmetros | Autorização |
|---|---|---|
| `GET /api/v1/implantacao/tipos-projeto` | `apenasAtivos?` | JWT |
| `GET /api/v1/implantacao/tipos-projeto/{id}` | Sem corpo | JWT |
| `POST /api/v1/implantacao/tipos-projeto` | `TipoProjetoCriarRequest` | Admin |
| `PUT /api/v1/implantacao/tipos-projeto/{id}` | `TipoProjetoAtualizarRequest` | Admin |
| `DELETE /api/v1/implantacao/tipos-projeto/{id}` | Sem corpo | Admin |
| `GET /api/v1/implantacao/colunas-kanban` | `apenasAtivas?` | JWT |
| `POST /api/v1/implantacao/colunas-kanban` | `ColunaKanbanCriarRequest` | Admin |
| `PUT /api/v1/implantacao/colunas-kanban/{id}` | `ColunaKanbanAtualizarRequest` | Admin |
| `DELETE /api/v1/implantacao/colunas-kanban/{id}` | Sem corpo | Admin |
| `POST /api/v1/implantacao/colunas-kanban/reordenar` | `ColunaKanbanReordenarRequest` | Admin |
| `GET /api/v1/admin/dashboard` | `funcaoId?`, `diasRetro?` | Admin |

Os contratos de catálogo estão em [`TipoProjetoEtapaColunaDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/TipoProjetoEtapaColunaDtos.cs).

## 4. Serviços principais

### 4.1 Autenticação, Acessos e RAG

| Serviço | Responsabilidade | Dependências | Validações confirmadas | Efeitos colaterais confirmados |
|---|---|---|---|---|
| `AuthService` | Login, refresh, revogação e usuário | `AppDbContext`, `IConfiguration`, `BruteForceGuard` | Operador por id/email, ativo, senha SHA-256, refresh não revogado e não expirado | Cria hash de refresh no banco, revoga o anterior, grava substituição e emite JWT |
| `BruteForceGuard` | Bloqueio em memória por chave | `ConcurrentDictionary` | Cinco falhas em cinco minutos bloqueiam por quinze minutos | Mantém contadores apenas no processo |
| `PasswordValidationService` | Revalidação para Acessos | `AppDbContext`, logger, `BruteForceGuard` | Operador autenticado, ativo e senha; cache válido por cinco minutos | Registra sucesso/falha e mantém cache estático; não grava no banco |
| `GoogleSheetsService` | Lê e interpreta empresas da planilha | `IHttpClientFactory`, `IConfiguration`, logger | `SpreadsheetId` obrigatório; alternativa da API para CSV; ignora primeira linha e linhas sem nome | Mantém cache singleton por dez minutos; não escreve no banco |
| `RagProxyService` | Encaminha chat ao AnythingLLM | `IConfiguration`, `AppDbContext`; cria `HttpClient` por chamada | Usa workspace padrão quando `workspaceId` vem vazio | Efetua chamada externa; em falha/status fora da faixa de sucesso com alternativa habilitada, devolve **resposta simulada** e consulta contagem de operadores |

`AcessosController` usa o ID do claim em `PasswordValidationService`; o campo `usuario` da requisição é validado como obrigatório, mas a busca da senha é pelo operador autenticado. A visualização bem-sucedida adiciona `AuditoriaAcesso` com usuário, empresa, tipo, data, hora, IP e user-agent.

### 4.2 Implantação

| Serviço | Responsabilidade | Dependências | Validações confirmadas | Efeitos colaterais confirmados |
|---|---|---|---|---|
| `TipoProjetoService` | CRUD de tipos | `AppDbContext` | Projetos vinculados bloqueiam exclusão; código tem índice único | Cria, altera ou exclui tipo |
| `ColunaKanbanService` | CRUD e ordem das colunas | `AppDbContext` | Coluna padrão não é excluída; coluna com Tarefas não é excluída | Cria coluna não padrão, altera, exclui ou reordena |
| `ProjetoService` | CRUD, filtro, cliente e progresso do Projeto | `AppDbContext`, auditoria | Prioridade definida, tipo ativo, cliente legado ativo; lista até 500 | Gera código, grava Projeto, audita; exclusão cascateia cards e Tarefas |
| `ProjetoEtapaService` | Nove cards, checklist, documentos, comentários, retorno e progresso | `AppDbContext`, auditoria, logger | Card precisa existir; concluída exige 100%; retorno aceita ordem 1–8 e apenas para trás | Um GET pode criar cards ausentes; conclude/desbloqueia, reseta, grava histórico e recalcula Projeto |
| `ProjetoJornadaService` | Progresso da jornada baseado em tarefas | `AppDbContext` | Não recalcula quando o Projeto não tem cards | Persiste média simples dos percentuais dos cards |
| `TarefaService` | CRUD, Kanban, responsáveis, chamados, apontamentos e histórico | DbContext, auditoria, jornada, cards, logger | Tarefa com Projeto exige `projetoEtapaId` do mesmo Projeto (etapa sem projeto é rejeitada na criação; em tarefa sem projeto a etapa é zerada na atualização) e o Projeto não é trocado pelo `PUT`; enums, coluna, responsáveis e chamados são validados; WIP e motivo de bloqueio; apontamento > 0; atualização/exclusão de apontamento ficam restritas ao próprio para os JWTs emitidos atualmente | Audita, recalcula jornada/cards e pode criar/atualizar evento de Agenda em colunas especiais |
| `DashboardService` | KPIs e agregados de Implantação | `AppDbContext` | Filtra opcionalmente por `projetoId`; `equipe` é recebido, mas não filtra a consulta | Somente leitura; `porEquipe` contém uma linha “Geral” zerada e o tempo de ciclo copia o tempo de lead |
| `AdminDashboardService` | Visão administrativa de Tarefas e funções | `AppDbContext` | `funcaoId` filtra funções/operadores; `diasRetro` é recebido, mas não participa dos cálculos | Somente leitura |
| `AgendaService` | Eventos, participantes, recorrência e conflitos | `AppDbContext`, logger | Tipo ativo, responsável ativo, datas, prioridade, SLA, regras por tipo, conflito do responsável e propriedade/admin | Cria, altera, move ou exclui; participantes são intersecção com operadores ativos |
| `AuditoriaImplantacaoService` | Instantâneo JSON e histórico | `AppDbContext`, logger | Serializa ignorando ciclos e nulos | Grava auditoria; falha de auditoria é capturada e não interrompe a operação principal |

As nove etapas são: KICKOFF, LEVANTAMENTO, DESENVOLVIMENTO, HOMOLOGAÇÃO, TREINAMENTO, GO LIVE, PÓS-IMPLANTAÇÃO, PASSAR PARA O SUPORTE e CONCLUÍDO.

### 4.3 Database Explorer

| Serviço | Responsabilidade | Dependências | Validações/efeitos |
|---|---|---|---|
| `DatabaseConnectionService` | Configuração e abertura de conexão SQL independente | `IConfiguration`, logger; singleton | Variáveis `DB_EXPLORER_*` têm precedência; exige servidor, banco e usuário; `Encrypt` e `TrustServerCertificate` são lidos da configuração, com padrões `false` e `true`; a configuração não é gravada em runtime |
| `DatabaseMetadataService` | Tabelas, colunas, índices, FKs, procedures, triggers, dependências e extração de schemas | `IDatabaseConnectionService`, logger | Consultas de metadados/SELECT; devolve corpos de procedures/triggers e a listagem de corpos usada pela comparação de procedures (`ListarCorposProceduresAsync`, só objetos do usuário); contagem sem permissão retorna `-1`; nenhuma escrita de dados |
| `DatabaseSearchService` | Busca unificada de objetos | Conexão | Termo vazio retorna vazio; `take` limitado a 1–500; somente leitura |
| `DatabaseRelationshipInferenceService` | FKs confirmadas, candidatas, uso de coluna e grafo | Conexão, logger | Candidatas usam nome, tipo, PK e índice; grafo limita profundidade a 1–5; somente leitura |
| `DatabaseQueryBuilderService` | Monta SQL a partir de metadados e relacionamentos | Conexão, metadata, inferência, logger | Limita a cinco tabelas, valida tabelas e `HAVING`; gera texto SQL, não executa a consulta |
| `DatabaseSchemaComparisonService` | Compara tabelas com JSON e compara corpos de procedures | `IDatabaseMetadataService`, logger | Exige arquivo não vazio, extensão `.json`, 5 MB por tabela, 20 MB no bulk ou nas procedures; ordem das colunas **não** é considerada diferença; nas procedures a chave é `schema.nome` (sem distinção de caixa), o corpo é normalizado só em quebras de linha/espaço à direita e a comparação é somente leitura (sem scripts) |
| `SqlScriptGeneratorService` | Gera e valida estaticamente scripts de correção a partir do resultado da comparação | `IDatabaseConnectionService`, logger | Scoped; não executa SQL nem persiste nada; gera somente criações vindas do arquivo (o banco JCA é a fonte da verdade) |

## 5. Modelos, DbContext e relacionamentos

### 5.1 DbSets atuais

| Domínio | DbSets/tabelas |
|---|---|
| Identidade | `Operadores`/`TBOPERADOR`, `Funcoes`/`CC_Funcao`, `RefreshTokens`, `AuditoriaAcessos` |
| Cadastros | `Clientes`/`IMPL_Cliente`, `TiposProjeto`, `ColunasKanban` |
| Projetos | `Projetos`, `ProjetoEtapas`, `ProjetoEtapaChecklists`, `ProjetoEtapaDocumentos`, `ProjetoEtapaHistoricos`, `ProjetoEtapaComentarios` |
| Tarefas | `Tarefas`, `ComentariosTarefa`, `TarefaResponsaveis`, `TarefaChamados`, `TarefaApontamentos` |
| Agenda | `Agenda`, `TiposEvento`, `AgendaParticipantes` |
| Auditoria | `AuditoriaImplantacao`/`IMPL_Auditoria` |
| Legadas | `ChamadosLegado`/`tbchamado`, `FuncionariosLegado`/`tbfuncionario`, `ClientesLegado`/`tbcliente` |

`Cliente` continua registrado em `IMPL_Cliente`, mas `ProjetoService.ListarClientesAsync` usa `ClientesLegado`; a fonte efetiva do dropdown é `tbcliente`.

### 5.2 Entidades e enums por arquivo

| Arquivo | Conteúdo persistente ou de domínio |
|---|---|
| [`Operador.cs`](../backend/Central_BackEnd/Models/Operador.cs) | Operador, flags, perfil e vínculo com função |
| [`Funcao.cs`](../backend/Central_BackEnd/Models/Funcao.cs) | Função e classificação |
| [`RefreshToken.cs`](../backend/Central_BackEnd/Models/RefreshToken.cs) | Hash, expiração, revogação e substituição |
| [`Projeto.cs`](../backend/Central_BackEnd/Models/Implantacao/Projeto.cs) | Projeto e enums de status/prioridade |
| [`ProjetoEtapa.cs`](../backend/Central_BackEnd/Models/Implantacao/ProjetoEtapa.cs) | Card e quatro coleções 1:N |
| [`Tarefa.cs`](../backend/Central_BackEnd/Models/Implantacao/Tarefa.cs) | Tarefa, comentário e enums de status/prioridade/tipo |
| [`TarefaResponsavel.cs`](../backend/Central_BackEnd/Models/Implantacao/TarefaResponsavel.cs) | N:N Tarefa–Operador |
| [`TarefaChamado.cs`](../backend/Central_BackEnd/Models/Implantacao/TarefaChamado.cs) | N:N Tarefa–Chamado legado |
| [`TarefaApontamento.cs`](../backend/Central_BackEnd/Models/Implantacao/TarefaApontamento.cs) | Apontamento decimal de horas |
| [`AgendaItem.cs`](../backend/Central_BackEnd/Models/Implantacao/AgendaItem.cs) | Agenda, prioridade e recorrência |
| [`AgendaParticipante.cs`](../backend/Central_BackEnd/Models/Implantacao/AgendaParticipante.cs) | N:N Agenda–Participante |
| [`TipoEvento.cs`](../backend/Central_BackEnd/Models/Implantacao/TipoEvento.cs) | Tipo de evento ativo |
| [`TipoProjeto.cs`](../backend/Central_BackEnd/Models/Implantacao/TipoProjeto.cs) | Tipo de Projeto |
| [`ColunaKanban.cs`](../backend/Central_BackEnd/Models/Implantacao/ColunaKanban.cs) | Coluna, ordem, WIP e flags |
| [`AuditoriaImplantacao.cs`](../backend/Central_BackEnd/Models/Implantacao/AuditoriaImplantacao.cs) | Entidade, ação, antes/depois, usuário e observação |
| [`ClienteLegado.cs`](../backend/Central_BackEnd/Models/Implantacao/ClienteLegado.cs) | Espelho somente leitura de `tbcliente` |
| [`FuncionarioLegado.cs`](../backend/Central_BackEnd/Models/Implantacao/FuncionarioLegado.cs) | Espelho somente leitura de `tbfuncionario` |
| [`ChamadoLegado.cs`](../backend/Central_BackEnd/Models/Implantacao/ChamadoLegado.cs) | Espelho somente leitura de `tbchamado` |

### 5.3 Relações críticas

- Projeto → TipoProjeto usa `Restrict`; Projeto → Cliente legado usa `SetNull`.
- Projeto → cards usa `Cascade`; índice único garante uma linha por `(ProjetoId, Ordem)`.
- Checklist, documentos, histórico e comentários de card usam `Cascade`.
- Tarefa → Projeto usa `Cascade`; Tarefa → card de Projeto usa `Restrict`; coluna do Kanban usa `SetNull`.
- Tarefa–responsável, Tarefa–chamado e apontamentos usam chaves compostas/chave própria e `Cascade` a partir da Tarefa.
- Agenda → Projeto e TipoEvento usam `SetNull`; Agenda → participantes usa `Cascade`; participante → Operador usa `Restrict`.
- As três tabelas legadas são marcadas com `ExcludeFromMigrations()`.

### 5.4 Modelos sem DbSet

`EmpresaAcesso`, resumos e requisições/respostas de Acessos, assim como `RagChatRequest` e `RagChatResponse`, são DTOs/projeções em `Models`; não são entidades de `AppDbContext`.

## 6. DTOs e contratos

| Arquivo | Família |
|---|---|
| [`LoginRequest.cs`](../backend/Central_BackEnd/Dtos/LoginRequest.cs) | Login |
| [`TokenResponse.cs`](../backend/Central_BackEnd/Dtos/TokenResponse.cs) | Tokens e usuário |
| [`UsuarioResponse.cs`](../backend/Central_BackEnd/Dtos/UsuarioResponse.cs) | Perfil, função e flag de implantador |
| [`ProjetoDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/ProjetoDtos.cs) | Projetos, clientes e nove cards |
| [`TarefaDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/TarefaDtos.cs) | Tarefas, filtros, chamados e apontamentos |
| [`AgendaDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/AgendaDtos.cs) | Agenda, participantes e recorrência |
| [`TipoProjetoEtapaColunaDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/TipoProjetoEtapaColunaDtos.cs) | Tipos e colunas |
| [`DashboardDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/DashboardDtos.cs) | KPIs e agregados de Implantação |
| [`AdminDashboardDtos.cs`](../backend/Central_BackEnd/Dtos/Implantacao/AdminDashboardDtos.cs) | Resumo administrativo |
| [`DatabaseDtos.cs`](../backend/Central_BackEnd/Dtos/Database/DatabaseDtos.cs) | Metadados, query builder e comparação |

## 7. Migrações e persistência

### 7.1 Histórico EF

| Migration | Efeito principal |
|---|---|
| `20260904194350_ImplantacaoInit` | Tabelas iniciais de autenticação, Auditoria, Implantação,Equipe e Etapa global legada |
| `20260905195554_AddLegadoLinks` | IDs de Cliente e Chamado legado em Projeto/Tarefa |
| `20260905203422_AddAgendaAndPerfis` | Tabela base da Agenda e índices |
| `20260906033406_AddAuditoriaImplantacao` | Tabela `IMPL_Auditoria` e índices |
| `20260910163216_AddFuncao` | `CC_Funcao`, FK e coluna em `TBOPERADOR` |
| `20260911215943_AgendaV2_Ajuste` | Tipo de evento, participantes e `AGD_TipoId` |
| `20260912173928_RemoveEquipes` | Remove Equipe/Membros e campos de equipe; adiciona auditoria de cadastro |
| `20260914144751_AgendaConflitoHorarios` | Índice composto da Agenda por operador e intervalo |
| `20260915132751_ClienteApontaTbCliente` | FK de `PRJ_ClienteId` passa a `tbcliente` |
| `20260915134729_AgendaPrioridadeSLA` | Prioridade e SLA da Agenda |
| `20260916001540_KanbanCustomizavelEArquivamento` | Arquivamento, índice e duas colunas padrão |
| `20260917170249_TarefaEvolucaoResponsaveisChamadosHoras` | Data de entrega, tipo, apontamentos e vínculos N:N |
| `20260917202045_TarefaProjetoOpcional` | `TRF_ProjetoId` passa a nullable |
| `20260918211919_AddProjetoEtapas` | Cinco tabelas `tbprojetoEtapa*` e índice único por Projeto/ordem |
| `20260920185734_TarefaProjetoEtapaId` | Adiciona `TRF_ProjetoEtapaId` e backfill a partir da etapa global |
| `20260922154202_RemoveEtapaAntiga` | Remove `IMPL_Etapa`, `TRF_EtapaId` e FKs legadas; mantém FK do card com `Restrict` |

O snapshot atual contém `tbprojetoEtapa*` e `TRF_ProjetoEtapaId`; não contém `IMPL_Etapa` nem `TRF_EtapaId`. Referências em migrações anteriores são histórico, não API ou modelo atual.

### 7.2 Execução e seeds

- Não há aplicação automática de migrações nem `EnsureCreated()` em `Program.cs`; o source não cria o schema InMemory durante o startup.
- Em Development, o seed estrutural cria operadores apenas se `Operadores` estiver vazio, funções, sete colunas, quatro tipos de Projeto e sete tipos de evento; valores de credenciais não são reproduzidos aqui.
- Seeds de Projetos/Tarefas e cinco eventos de Agenda estão dentro de `#if false`.
- Não há seed de Etapas Globais; os nove cards são por Projeto.
- [`Migrations/Sql`](../backend/Central_BackEnd/Migrations/Sql) contém 13 scripts auxiliares, inclusive `AllMigrations.sql`; eles são artefatos adicionais ao histórico EF.

## 8. Fluxos integrados

### 8.1 Autenticação

```text
login/refresh
  -> AuthController
  -> IAuthService
  -> TBOPERADOR + RefreshTokens
  -> access JWT em resposta
  -> refresh em cookie HttpOnly cc_refresh
```

No refresh, o hash antigo é revogado e o novo recebe o hash em `SubstituidoPor`. Quando o logout chega com JWT válido, o controller revoga o cookie atual, apaga `cc_refresh` e `cc_lembrar` e devolve 204. O interceptor Angular atual não anexa Bearer a URLs `/auth/`; por isso a chamada de logout feita pelo frontend pode não alcançar essa revogação, especialmente quando o access expirou, embora o frontend limpe o estado local.

### 8.2 Acessos e Google Sheets

```text
GET /acessos
  -> GoogleSheetsService
  -> API/CSV + cache de 10 minutos

POST /acessos/visualizar
  -> validação recente ou senha do operador
  -> GoogleSheetsService
  -> AuditoriaAcessos
```

A resposta de lista contém apenas id e nome. O detalhe só é montado após a etapa de validação e contém os campos de acesso mapeados pelo modelo de planilha; valores reais não pertencem à documentação.

### 8.3 Agenda

Eventos são armazenados com operador responsável, tipo, prioridade, SLA, projeto e participantes. Saídas convertem UTC para `America/Sao_Paulo`. Férias exigem período; Treinamento/Daily e Reunião/Atendimento têm regras específicas de horário, duração e recorrência. Sobreposição do mesmo responsável produz `ConflictException` e HTTP 409; a consulta de conflito não inclui a coleção de participantes.

### 8.4 Projetos, cards e Tarefas

Ao criar um Projeto, o controller chama `ProjetoService` e depois `ProjetoEtapaService.InicializarEtapasPadraoAsync`. Alterações de Tarefas recalculam a jornada e sincronizam cards com tarefas não arquivadas. Cards concluídos podem desbloquear o próximo; uma tarefa reaberta em card concluído reabre somente esse card. Toda tarefa com projeto nasce e permanece ligada a um card do mesmo projeto: a criação sem etapa é recusada, a etapa de outro projeto é recusada e a atualização não move a tarefa entre projetos.

### 8.5 Database e RAG

O Database Explorer não usa o `AppDbContext`; abre a conexão configurada em `IDatabaseConnectionService` e consulta o banco alvo. O RAG usa `AppDbContext` apenas no fallback local, que produz **resposta simulada**; o caminho normal é uma chamada HTTP ao destino configurado.

## 9. Recursos removidos e código dormente

### 9.1 Etapas Globais

Não há modelo `Etapa`, `IETapaService`, controller `/api/v1/implantacao/etapas` nem tabela `IMPL_Etapa` no snapshot atual. A API vigente é subconjunto de `/api/v1/implantacao/projetos/.../etapas`. A migração `RemoveEtapaAntiga` formaliza a remoção.

### 9.2 Itens existentes sem consumidor de endpoint

| Item | Situação |
|---|---|
| `IAuditoriaImplantacaoService.ObterHistoricoAsync` | Implementado, mas o histórico de Tarefas consulta `IMPL_Auditoria` diretamente |
| filtro `equipe` em Tarefas | Parâmetro permanece no DTO/controller, mas não é aplicado em `TarefaService` |
| cliente de sessões JOTA | Métodos existem no frontend; o backend atual só expõe `POST /api/rag-proxy/chat` |

## 10. Limitações atuais e riscos confirmados

Esta seção separa o que o código implementa do risco que permanece no estado atual. As entradas não são recomendações; registram o contrato efetivo e suas lacunas.

| ID | Comportamento implementado | Limitação/risco atual |
|---|---|---|
| 1 | `AuthController.Logout()` exige `[Authorize]`, revoga o refresh associado ao cookie e apaga os cookies. | O interceptor do frontend exclui URLs `/auth/` do Bearer; portanto a chamada de logout chega sem o access token quando vem do cliente atual. O estado local é limpo, mas a revogação/limpeza do cookie pode falhar, especialmente com token expirado. |
| 2 | `RagProxyController` expõe `POST /api/rag-proxy/chat`; `RagProxyService` usa `AppDbContext` somente no fallback local. | A rota não é versionada. O frontend chama a URL relativa; o [`web.config`](../frontend/public/web.config) versionado não tem regra `/api`, então origens separadas têm necessidade de reverse proxy ou URL absoluta. `EnableMockFallback` é `true` por padrão; falhas/status fora do sucesso devolvem **resposta simulada**, mas o payload não traz marcador que distinga a origem. |
| 3 | Não existe `ProposalController` no código; os controllers equivalentes são `ProjetosController` e `TarefasController`, ambos com `[Authorize]`. `TarefasController` substitui autor/criador/usuário somente quando o campo chega vazio. | Os controllers não aplicam regra uniforme de proprietário ou papel (`role`) no CRUD. `ProjetoService` usa `CriadorId`/`UsuarioAlteracao` do request, e Tarefas preserva valores não vazios enviados pelo cliente; a permissão específica de atribuir a terceiros não equivale a autorização de propriedade para todo o CRUD. |
| 4 | O Kanban usa `PUT` com `TarefaAtualizarRequest` para edição inline, reatribuição e lote; o backend grava os campos do request no registro. | Não é um PATCH dedicado: campos omitidos podem ser preenchidos como nulos pelo preenchimento do modelo e limpar/sobrescrever dados; a edição inline envia `descricao: undefined`, a reatribuição não envia `colunaKanbanId`, `dataEntrega` nem `chamadoLegadoId`. O lote envia título vazio, tipo/ordem zero e `bloqueada=false`; comentário, campo de alteração e filtro “apenas minhas” usam valores fixos de `admin`. |
| 5 | `AgendaService.AtualizarEventoAsync` valida o responsável e as regras do tipo antes de atualizar; `QueryConflito` consulta eventos do operador responsável. | O método limpa `evento.Participantes` antes de reidratar a coleção, portanto uma lista vazia/ausente pode removê-los; `SLAMinutos` recebe o valor nullable do request e pode ser limpo. A verificação de conflito não consulta `AgendaParticipantes`, então não detecta sobreposição de todos os participantes. |
| 6 | `DatabaseController` protege o módulo com `[Authorize]`; metadados, procedimentos, triggers e configuração usam a conexão separada. `GetConfig` mascara a senha. | Não há papel específico para o Database Explorer. Corpos de procedures/triggers podem ser expostos a qualquer JWT válido; a configuração padrão de `DatabaseConnectionConfig` é `Encrypt=false` e `TrustServerCertificate=true`, embora possa ser sobrescrita por configuração/ambiente. |
| 7 | O modal de etapa carrega o detalhe, fecha pelo `NgbActiveModal` (inclusive em erro de carga); o pai recarrega os cards após o fechamento, e o diálogo de retorno confirma uma operação de retorno. | O frontend cria `blob:` com `URL.createObjectURL` e envia essa URL ao serviço de documentos; não existe upload binário nesse fluxo, e o backend persiste o texto da URL. A URL é temporária, a exclusão está marcada como TODO e o retorno do Projeto envia `usuarioAlteracao: 'admin'`. |
| 8 | Não foi localizado tipo, modelo, DTO, serviço, controller ou rota `Backup` no código consultado. | Não há uma funcionalidade de backup documentável. As validações confirmadas são apenas as checagens explícitas de cada controller/serviço, DataAnnotations existentes e limites de arquivo; não existe uma validação uniforme de propriedade/papel para todos os DTOs. |

## 11. Incertezas remanescentes

- Não foi executado build, suíte backend, smoke ou aplicação das migrações; o documento representa o código atual, não o estado de um banco publicado.
- Valores e disponibilidade das configurações de SQL, Google Sheets, AnythingLLM e JWT não foram inspecionados nem reproduzidos.
- `equipe` em Tarefas/Dashboard, `diasRetro` no dashboard administrativo e campos legados de Cliente não são aplicados integralmente pelos serviços atuais.
- Não foi possível inferir se a divergência de `APP_VERSION` do frontend tem efeito no versionamento do backend; ela está registrada em [`06-COMPONENTES-FRONTEND.md`](./06-COMPONENTES-FRONTEND.md).
- A existência dos scripts SQL auxiliares não comprova que foram aplicados em algum ambiente.
- Não há teste backend localizado para confirmar contratos, concorrência de refresh, conflitos de agenda ou compatibilidade SQL em tempo de execução. Em particular, a regra de etapa do projeto não tem suíte no backend: o spec do frontend cobre apenas o gating e o payload do cliente, e não foi executado nesta revisão.
