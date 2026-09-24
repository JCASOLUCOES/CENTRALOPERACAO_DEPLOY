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

// Request atualizado com WHERE, ORDER BY, GROUP BY, CTEs
public record QueryBuilderAdvancedRequest(
    List<string> Tabelas,
    List<string> Colunas,
    List<RelationshipDto> Relacionamentos,
    List<WhereConditionDto>? WhereConditions,
    List<OrderByDto>? OrderBy,
    List<GroupByDto>? GroupBy,
    int? Limite,
    List<CteDto>? Ctes);

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
    string Categoria,      // "Coluna" | "Tipo" | "Nullable" | "Indice" | "Fk" | "Ordem"
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
    List<SchemaDifferenceDto> Diferencas);

/// <summary>
/// Resultado consolidado da comparacao em lote (varias tabelas).
/// </summary>
public record SchemaComparisonBatchResultDto(
    string? ArquivoNome,
    int TotalTabelas,
    int TotalCriticos,
    int TotalAvisos,
    int TotalOks,
    List<SchemaComparisonResultDto> Resultados);
