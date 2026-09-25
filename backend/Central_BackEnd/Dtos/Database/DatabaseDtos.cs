namespace Central_BackEnd.Dtos.Database;

/// <summary>
/// Visao geral do banco conectado. NUNCA contem senha ou connection string.
/// </summary>
public record DatabaseInfoDto(
    bool Conectado,
    string Servidor,
    string Banco,
    string? VersaoSqlServer,
    int QuantidadeTabelas,
    int QuantidadeColunas,
    int QuantidadePks,
    int QuantidadeFks,
    int QuantidadeIndices,
    int QuantidadeViews,
    int QuantidadeProcedures,
    int QuantidadeFunctions,
    int QuantidadeTriggers,
    string? Usuario,
    DateTime UltimaConsulta,
    int DuracaoMs,
    string? MensagemErro);

public record TableDto(
    string Schema,
    string Nome,
    string NomeCompleto,
    int QuantidadeRegistros,
    DateTime? DataCriacao,
    DateTime? DataAlteracao,
    int QuantidadeColunas,
    int QuantidadeIndices,
    int QuantidadeRelacionamentos);

public record ColumnDto(
    string Tabela,
    string Coluna,
    int Ordem,
    string Tipo,
    bool Nulo,
    int? Tamanho,
    int? Precisao,
    int? Escala,
    bool IsPrimaryKey,
    bool IsForeignKey,
    bool IsIdentity,
    string? ValorDefault,
    string? Collation);

public record IndexDto(
    string Tabela,
    string Nome,
    string Tipo,
    bool Unique,
    List<string> Colunas);

public record ForeignKeyDto(
    string Nome,
    string TabelaOrigem,
    string ColunaOrigem,
    string TabelaDestino,
    string ColunaDestino,
    string? AcaoUpdate,
    string? AcaoDelete);

public record RelationshipDto(
    string Tipo,                // "Confirmada" | "Possivel"
    string TabelaOrigem,
    string ColunaOrigem,
    string TabelaDestino,
    string ColunaDestino,
    int Score,                  // 0-100
    List<string> Motivos);

public record DatabaseConnectionConfigDto(
    string Servidor,
    int Porta,
    string Banco,
    string Usuario,
    string? Senha,
    bool Encrypt,
    bool TrustServerCertificate);

public record DatabaseStatusDto(
    bool Conectado,
    string Servidor,
    string Banco,
    string? Mensagem,
    DateTime UltimaConsulta,
    int DuracaoMs);

public record QueryBuilderRequest(
    List<string> Tabelas,
    List<string> Colunas,
    List<RelationshipDto> Relacionamentos);

public record DatabaseQueryBuilderResult(
    string SqlGerado,
    List<string> TabelasUsadas,
    List<RelationshipDto> JoinsUtilizados,
    string? Aviso);

/// <summary>
/// Procedure / Function resumida. Preview e apenas os primeiros 200 chars do corpo.
/// </summary>
public record ProcedureResumoDto(
    string Schema,
    string Nome,
    string NomeCompleto,
    string Tipo,                   // "Procedure" | "Function" | "AssemblyProcedure"
    DateTime? DataCriacao,
    DateTime? DataAlteracao,
    string? Preview,               // primeiros 200 chars do corpo
    int QuantidadeParametros);

public record ProcedureParametroDto(
    string Nome,
    string Tipo,
    bool IsOutput,
    int Ordem,
    bool HasDefault,
    string? ValorDefault);

public record ProcedureDetalheDto(
    string Schema,
    string Nome,
    string NomeCompleto,
    string Tipo,
    DateTime? DataCriacao,
    DateTime? DataAlteracao,
    string? Corpo,                 // corpo completo (definition) - pode ser grande
    List<ProcedureParametroDto> Parametros);

public record TriggerDto(
    string Schema,
    string Nome,
    string Tabela,
    string Evento,          // INSERT, UPDATE, DELETE
    string Momento,         // BEFORE, AFTER, INSTEAD OF
    string Corpo,
    List<string>? Acoes,
    List<string>? TabelasAfetadas);

public record DependencyDto(
    string Tipo,            // Procedure, Trigger, View, ForeignKey, Function
    string Schema,
    string Nome,
    string Descricao);

public record ProcedureAnalysisDto(
    List<ProcedureParametroDto> Parametros,
    List<string> TabelasUtilizadas,
    List<string> ProceduresChamadas,
    string Explicacao,
    List<string> FluxoIdentificado);

// WHERE condition DTO
public record WhereConditionDto(
    string Coluna,
    string Operador,     // =, <>, >, <, >=, <=, LIKE, IN, IS NULL, IS NOT NULL, BETWEEN
    string? Valor,
    string? Valor2,      // para BETWEEN
    string Logica = "AND"); // AND, OR

// ORDER BY DTO
public record OrderByDto(
    string Coluna,
    bool Ascendente = true);

// GROUP BY DTO
public record GroupByDto(
    string Coluna,
    string? Agregacao = null); // COUNT, SUM, AVG, MIN, MAX

// CTE DTO
public record CteDto(
    string Nome,
    string Sql);

// Request atualizado com WHERE, ORDER BY, GROUP BY, HAVING, CTEs
public record QueryBuilderAdvancedRequest(
    List<string> Tabelas,
    List<string> Colunas,
    List<RelationshipDto> Relacionamentos,
    List<WhereConditionDto>? WhereConditions,
    List<OrderByDto>? OrderBy,
    List<GroupByDto>? GroupBy,
    int? Limite,
    List<CteDto>? Ctes,
    string? Having = null);

/// <summary>
/// Coluna de schema extraido (JCA ou arquivo externo).
/// </summary>
public record SchemaColumnInfoDto(
    string Nome,
    string Tipo,
    bool Nulo,
    int Ordem,
    int? Tamanho = null,
    int? Precisao = null,
    int? Escala = null,
    string? ValorDefault = null);

/// <summary>
/// Indice de schema extraido.
/// </summary>
public record SchemaIndexInfoDto(
    string Nome,
    bool Unique,
    List<string> Colunas);

/// <summary>
/// Foreign key de schema extraido.
/// </summary>
public record SchemaFkInfoDto(
    string Nome,
    string ColunaOrigem,
    string TabelaDestino,
    string ColunaDestino);

/// <summary>
/// Schema completo de uma tabela (lado JCA ou lado arquivo externo).
/// </summary>
public record SchemaInfoDto(
    string Tabela,
    List<SchemaColumnInfoDto> Colunas,
    List<SchemaIndexInfoDto> Indices,
    List<SchemaFkInfoDto> Fks);

/// <summary>
/// Uma diferenca individual na comparacao de schemas.
/// </summary>
public record SchemaDifferenceDto(
    string Severidade,     // "Critico" | "Aviso" | "Ok"
    string Categoria,      // "Coluna" | "Tipo" | "Nullable" | "Indice" | "Fk" | "Tabela"
    string Campo,
    string? Esperado,      // lado JCA
    string? Encontrado,    // lado arquivo
    string Descricao);

/// <summary>
/// Resultado consolidado da comparacao de schemas.
/// </summary>
public record SchemaComparisonResultDto(
    DateTime GeradoEm,
    string Tabela,
    string? ArquivoNome,
    int TotalColunasJca,
    int TotalColunasArquivo,
    int Criticos,
    int Avisos,
    int Oks,
    decimal PercentualMatch,
    List<SchemaDifferenceDto> Diferencas,
    SchemaInfoDto? SchemaArquivo = null,
    SchemaInfoDto? SchemaJca = null);

/// <summary>
/// Comparacao de uma tabela no modo banco inteiro.
/// Status: "Ok" | "Diferencas" | "SomenteArquivo" | "SomenteBanco".
/// </summary>
public record BulkTableComparisonDto(
    string Tabela,
    string Status,
    int Criticos,
    int Avisos,
    int Oks,
    decimal PercentualMatch,
    int TotalColunasJca,
    int TotalColunasArquivo,
    List<SchemaDifferenceDto> Diferencas,
    SchemaInfoDto? SchemaArquivo = null,
    SchemaInfoDto? SchemaJca = null);

/// <summary>
/// Resultado consolidado da comparacao de banco inteiro (arquivo x banco conectado).
/// </summary>
public record BulkSchemaComparisonResultDto(
    DateTime GeradoEm,
    string? ArquivoNome,
    int TotalTabelasArquivo,
    int TotalTabelasBanco,
    int TabelasOk,
    int TabelasComDiferenca,
    int SomenteArquivo,
    int SomenteBanco,
    int Criticos,
    int Avisos,
    int Oks,
    decimal PercentualMatch,
    List<BulkTableComparisonDto> Tabelas);

/// <summary>
/// Um script SQL de correcao gerado.
/// Tipo: CREATE_TABLE | ADD_COLUMN | ALTER_COLUMN | ALTER_TYPE | DROP_COLUMN |
///       DROP_TABLE | CREATE_INDEX | DROP_INDEX | ALTER_FK
/// Severidade: "Info" | "Aviso" | "Critico"
/// </summary>
public record SqlScriptDto(
    string Id,
    string Tipo,
    string Severidade,
    string Sql,
    string SqlFormatado,
    string Descricao,
    string CampoRelacionado,
    bool BackupSugerido,
    List<SqlScriptDto>? Opcoes = null,
    string? ConsultaValidacao = null);

/// <summary>
/// Resumo executivo dos scripts gerados.
/// ImpactoEstimado: "Low" | "Medium" | "High" | "Critical"
/// </summary>
public record SqlScriptResumoDto(
    int TotalCriacoes,
    int TotalAlteracoes,
    int TotalIndices,
    string ImpactoEstimado,
    int QtdAvisos,
    List<string> RevisaoManual);

/// <summary>
/// Resultado da geracao de scripts de correcao (3 abas + resumo).
/// </summary>
public record SqlScriptResultDto(
    List<SqlScriptDto> ScriptsCriacao,
    List<SqlScriptDto> ScriptsAlteracao,
    List<SqlScriptDto> ScriptsIndiceConstraint,
    SqlScriptResumoDto Resumo);

/// <summary>
/// Opcoes de geracao de scripts.
/// GerarBackup: inclui SELECT INTO backup em operacoes destrutivas.
/// ModoEstrito: somente scripts seguros (os destrutivos vao para RevisaoManual).
/// </summary>
public record ScriptsGenOpcoesDto(
    bool GerarBackup = true,
    bool ModoEstrito = false);

/// <summary>
/// Entrada do endpoint de geracao (modo tabela unica).
/// </summary>
public record GerarScriptsRequest(
    SchemaComparisonResultDto Resultado,
    ScriptsGenOpcoesDto? Opcoes = null);

/// <summary>
/// Entrada do endpoint de geracao (modo banco inteiro).
/// </summary>
public record GerarScriptsBulkRequest(
    BulkSchemaComparisonResultDto Resultado,
    ScriptsGenOpcoesDto? Opcoes = null);

/// <summary>
/// Entrada da validacao estatica de um script SQL (nada e executado no banco).
/// </summary>
public record ValidarScriptRequest(string Sql);

/// <summary>
/// Resultado da validacao estatica de um script SQL.
/// </summary>
public record ValidarScriptResultDto(
    bool Valido,
    List<string> Erros,
    List<string> Avisos);
