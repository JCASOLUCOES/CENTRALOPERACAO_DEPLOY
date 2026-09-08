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

public record QueryRequest(
    string Sql,
    int? Limite,
    int? TimeoutSegundos);

public record QueryResultDto(
    bool Sucesso,
    List<string> Colunas,
    List<List<object?>> Linhas,
    int QuantidadeRegistros,
    int DuracaoMs,
    string? MensagemErro);

public record SchemaDiffItemDto(
    string Tipo,                // "Tabela" | "Coluna" | "TipoAlterado" | "Fk"
    string Objeto,
    string Status,              // "Nova" | "Removida" | "Alterada"
    string? Detalhe);

public record SchemaDiffDto(
    DateTime GeradoEm,
    int TabelasIguais,
    int TabelasNovas,
    int TabelasRemovidas,
    int ColunasNovas,
    int ColunasRemovidas,
    int ColunasAlteradas,
    int FksNovas,
    int FksRemovidas,
    List<SchemaDiffItemDto> Itens);

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
