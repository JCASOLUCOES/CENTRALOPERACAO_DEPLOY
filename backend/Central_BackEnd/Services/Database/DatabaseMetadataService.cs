using System.Data;
using Central_BackEnd.Dtos.Database;
using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseMetadataService
{
    Task<DatabaseInfoDto> ObterInfoAsync(CancellationToken ct = default);
    Task<List<TableDto>> ListarTabelasAsync(string? schema, CancellationToken ct = default);
    Task<TableDto?> ObterTabelaAsync(string schema, string nome, CancellationToken ct = default);
    Task<List<ColumnDto>> ListarColunasAsync(string schema, string nome, CancellationToken ct = default);
    Task<List<IndexDto>> ListarIndicesAsync(string schema, string nome, CancellationToken ct = default);
    Task<List<ForeignKeyDto>> ListarForeignKeysAsync(string? schema, string? nomeTabela, CancellationToken ct = default);
    Task<List<ProcedureResumoDto>> ListarProceduresAsync(string? schema, string? busca, int take, CancellationToken ct = default);
    Task<ProcedureDetalheDto?> ObterProcedureAsync(string schema, string nome, CancellationToken ct = default);
    Task<List<TriggerDto>> ListarTriggersAsync(string? schema, string? nomeTabela, CancellationToken ct = default);
    Task<TriggerDto?> ObterTriggerAsync(string schema, string nome, CancellationToken ct = default);
    Task<List<DependencyDto>> ListarDependenciasAsync(string schema, string nomeTabela, CancellationToken ct = default);
    Task<ProcedureAnalysisDto?> AnalisarProcedureAsync(string schema, string nome, CancellationToken ct = default);
    Task<List<GlobalSearchResultDto>> BuscarGlobalAsync(string termo, int take, CancellationToken ct = default);
}

public class DatabaseMetadataService : IDatabaseMetadataService
{
    private readonly IDatabaseConnectionService _conn;
    private readonly ILogger<DatabaseMetadataService> _logger;

    public DatabaseMetadataService(IDatabaseConnectionService conn, ILogger<DatabaseMetadataService> logger)
    {
        _conn = conn;
        _logger = logger;
    }

    public async Task<DatabaseInfoDto> ObterInfoAsync(CancellationToken ct = default)
    {
        var ini = DateTime.Now;
        var cfg = _conn.GetConfig();
        try
        {
            await using var c = await _conn.OpenAsync(ct);
            var versao = await ScalarAsync<string>(c, "SELECT @@VERSION", ct);
            var qtdTabelas = await ScalarAsync<int>(c, "SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0", ct);
            var qtdColunas = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.columns c JOIN sys.tables t ON c.object_id = t.object_id WHERE t.is_ms_shipped = 0", ct);
            var qtdPks = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.key_constraints WHERE type = 'PK'", ct);
            var qtdFks = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.foreign_keys", ct);
            var qtdIndices = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.indexes WHERE object_id IN (SELECT object_id FROM sys.tables WHERE is_ms_shipped = 0) AND is_hypothetical = 0", ct);
            var qtdViews = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.views WHERE is_ms_shipped = 0", ct);
            var qtdProcs = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.procedures WHERE is_ms_shipped = 0", ct);
            var qtdFuncs = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.objects WHERE type IN ('FN','IF','TF') AND is_ms_shipped = 0", ct);
            var qtdTriggers = await ScalarAsync<int>(c,
                "SELECT COUNT(*) FROM sys.triggers WHERE is_ms_shipped = 0", ct);
            var usuario = await ScalarAsync<string>(c, "SELECT SUSER_SNAME()", ct);

            return new DatabaseInfoDto(
                Conectado: true,
                Servidor: cfg.Servidor,
                Banco: cfg.Banco,
                VersaoSqlServer: versao,
                QuantidadeTabelas: qtdTabelas,
                QuantidadeColunas: qtdColunas,
                QuantidadePks: qtdPks,
                QuantidadeFks: qtdFks,
                QuantidadeIndices: qtdIndices,
                QuantidadeViews: qtdViews,
                QuantidadeProcedures: qtdProcs,
                QuantidadeFunctions: qtdFuncs,
                QuantidadeTriggers: qtdTriggers,
                Usuario: usuario,
                UltimaConsulta: DateTime.Now,
                DuracaoMs: (int)(DateTime.Now - ini).TotalMilliseconds,
                MensagemErro: null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao obter info do banco");
            return new DatabaseInfoDto(
                Conectado: false,
                Servidor: cfg.Servidor, Banco: cfg.Banco, VersaoSqlServer: null,
                0, 0, 0, 0, 0, 0, 0, 0, 0,
                Usuario: null,
                UltimaConsulta: DateTime.Now,
                DuracaoMs: (int)(DateTime.Now - ini).TotalMilliseconds,
                MensagemErro: "Nao foi possivel conectar ao SQL Server. Verifique servidor, porta, banco, usuario e senha.");
        }
    }

    public async Task<List<TableDto>> ListarTabelasAsync(string? schema, CancellationToken ct = default)
    {
        var sql = @"
SELECT
    s.name AS [Schema],
    t.name AS Nome,
    (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = t.object_id) AS Colunas,
    (SELECT COUNT(*) FROM sys.indexes i WHERE i.object_id = t.object_id AND i.is_hypothetical = 0) AS Indices,
    (SELECT COUNT(*) FROM sys.foreign_keys fk WHERE fk.parent_object_id = t.object_id) AS Relacionamentos,
    t.create_date AS DataCriacao,
    t.modify_date AS DataAlteracao
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.is_ms_shipped = 0
  AND (@schema IS NULL OR s.name = @schema)
ORDER BY s.name, t.name";

        var lista = new List<TableDto>();
        try
        {
            await using var c = await _conn.OpenAsync(ct);
            await using var cmd = new SqlCommand(sql, c);
            cmd.Parameters.AddWithValue("@schema", (object?)schema ?? DBNull.Value);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                var schemaName = r.GetString(0);
                var nome = r.GetString(1);
                var qtdRegistros = await ContarRegistrosAsync(c, schemaName, nome, ct);
                lista.Add(new TableDto(
                    schemaName, nome, $"{schemaName}.{nome}",
                    qtdRegistros,
                    r.IsDBNull(5) ? null : r.GetDateTime(5),
                    r.IsDBNull(6) ? null : r.GetDateTime(6),
                    r.GetInt32(2), r.GetInt32(3), r.GetInt32(4)));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao listar tabelas");
            throw;
        }
        return lista;
    }

    public async Task<TableDto?> ObterTabelaAsync(string schema, string nome, CancellationToken ct = default)
    {
        var lista = await ListarTabelasAsync(schema, ct);
        return lista.FirstOrDefault(t => string.Equals(t.Nome, nome, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<List<ColumnDto>> ListarColunasAsync(string schema, string nome, CancellationToken ct = default)
    {
        var sql = @"
SELECT
    c.column_id AS Ordem,
    c.name AS Coluna,
    ty.name AS Tipo,
    c.is_nullable AS Nulo,
    c.max_length AS Tamanho,
    c.precision AS Precisao,
    c.scale AS Escala,
    c.is_identity AS IsIdentity,
    ISNULL(dc.definition, '') AS ValorDefault,
    c.collation_name AS Collation,
    CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS IsPk,
    CASE WHEN fk.parent_object_id IS NOT NULL THEN 1 ELSE 0 END AS IsFk
FROM sys.columns c
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
LEFT JOIN (
    SELECT ic.object_id, ic.column_id
    FROM sys.index_columns ic
    JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    WHERE i.is_primary_key = 1
) pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
LEFT JOIN (
    SELECT fkc.parent_object_id, fkc.parent_column_id
    FROM sys.foreign_key_columns fkc
) fk ON fk.parent_object_id = c.object_id AND fk.parent_column_id = c.column_id
LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE t.is_ms_shipped = 0
  AND s.name = @schema AND t.name = @tabela
ORDER BY c.column_id";

        var lista = new List<ColumnDto>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", schema);
        cmd.Parameters.AddWithValue("@tabela", nome);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            var tipo = r.GetString(2);
            var tam = r.IsDBNull(4) ? (int?)null : r.GetInt16(4);
            if (tam == -1) tam = null;
            lista.Add(new ColumnDto(
                $"{schema}.{nome}",
                r.GetString(1),
                r.GetInt32(0),
                tipo,
                r.GetBoolean(3),
                tam,
                r.IsDBNull(5) ? null : (int?)r.GetByte(5),
                r.IsDBNull(6) ? null : (int?)r.GetByte(6),
                r.GetInt32(10) == 1,
                r.GetInt32(11) == 1,
                r.GetBoolean(7),
                r.IsDBNull(8) ? null : r.GetString(8),
                r.IsDBNull(9) ? null : r.GetString(9)));
        }
        return lista;
    }

    public async Task<List<IndexDto>> ListarIndicesAsync(string schema, string nome, CancellationToken ct = default)
    {
        var sql = @"
SELECT i.name, i.type_desc, i.is_unique,
    STUFF((SELECT ', ' + c.name
           FROM sys.index_columns ic
           JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
           WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
           ORDER BY ic.key_ordinal
           FOR XML PATH('')), 1, 2, '') AS Colunas
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = @schema AND t.name = @tabela
  AND i.is_hypothetical = 0
  AND i.index_id > 0
ORDER BY i.name";

        var lista = new List<IndexDto>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", schema);
        cmd.Parameters.AddWithValue("@tabela", nome);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            var colunas = r.IsDBNull(3) ? new List<string>() : r.GetString(3).Split(", ").ToList();
            lista.Add(new IndexDto($"{schema}.{nome}", r.GetString(0), r.GetString(1), r.GetBoolean(2), colunas));
        }
        return lista;
    }

    public async Task<List<ForeignKeyDto>> ListarForeignKeysAsync(string? schema, string? nomeTabela, CancellationToken ct = default)
    {
        var sql = @"
SELECT
    fk.name AS FkName,
    sP.name + '.' + tP.name AS Origem,
    cP.name AS ColunaOrigem,
    sR.name + '.' + tR.name AS Destino,
    cR.name AS ColunaDestino,
    fk.delete_referential_action_desc,
    fk.update_referential_action_desc
FROM sys.foreign_keys fk
JOIN sys.tables tP ON fk.parent_object_id = tP.object_id
JOIN sys.schemas sP ON tP.schema_id = sP.schema_id
JOIN sys.tables tR ON fk.referenced_object_id = tR.object_id
JOIN sys.schemas sR ON tR.schema_id = sR.schema_id
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns cP ON cP.object_id = fkc.parent_object_id AND cP.column_id = fkc.parent_column_id
JOIN sys.columns cR ON cR.object_id = fkc.referenced_object_id AND cR.column_id = fkc.referenced_column_id
WHERE (@schema IS NULL OR sP.name = @schema)
  AND (@tabela IS NULL OR tP.name = @tabela)
ORDER BY Origem, FkName";

        var lista = new List<ForeignKeyDto>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", (object?)schema ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tabela", (object?)nomeTabela ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            lista.Add(new ForeignKeyDto(
                r.GetString(0),
                r.GetString(1),
                r.GetString(2),
                r.GetString(3),
                r.GetString(4),
                r.IsDBNull(5) ? null : r.GetString(5),
                r.IsDBNull(6) ? null : r.GetString(6)));
        }
        return lista;
    }

    private async Task<int> ContarRegistrosAsync(SqlConnection c, string schema, string nome, CancellationToken ct)
    {
        try
        {
            var sql = $"SELECT COUNT(*) FROM [{schema}].[{nome}]";
            return await ScalarAsync<int>(c, sql, ct);
        }
        catch
        {
            return -1; // tabelas sem permissao de count retornam -1
        }
    }

    private static async Task<T> ScalarAsync<T>(SqlConnection c, string sql, CancellationToken ct)
    {
        await using var cmd = new SqlCommand(sql, c);
        var result = await cmd.ExecuteScalarAsync(ct);
        if (result == null || result == DBNull.Value) return default!;
        return (T)Convert.ChangeType(result, typeof(T));
    }

    public async Task<List<ProcedureResumoDto>> ListarProceduresAsync(string? schema, string? busca, int take, CancellationToken ct = default)
    {
        // P = SQL Stored Procedure, PC = Assembly (CLR) Procedure, X = Extended Procedure
        // RF = Replication-filter-procedure
        var sql = @"
SELECT
    s.name AS [Schema],
    p.name AS Nome,
    p.type_desc AS Tipo,
    p.create_date AS DataCriacao,
    p.modify_date AS DataAlteracao,
    (SELECT COUNT(*) FROM sys.parameters pm WHERE pm.object_id = p.object_id) AS QtdParams,
    SUBSTRING(REPLACE(REPLACE(ISNULL(m.definition, ''), CHAR(13), ' '), CHAR(10), ' '), 1, 200) AS Preview
FROM sys.procedures p
JOIN sys.schemas s ON p.schema_id = s.schema_id
LEFT JOIN sys.sql_modules m ON m.object_id = p.object_id
WHERE p.is_ms_shipped = 0
  AND (@schema IS NULL OR s.name = @schema)
  AND (@busca IS NULL OR p.name LIKE @like)
ORDER BY s.name, p.name
OFFSET 0 ROWS FETCH NEXT @take ROWS ONLY";

        var takeClamped = Math.Clamp(take, 1, 1000);
        var like = string.IsNullOrWhiteSpace(busca) ? null : $"%{busca}%";

        var lista = new List<ProcedureResumoDto>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", (object?)schema ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@busca", (object?)like ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@like", (object?)like ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@take", takeClamped);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            var tipoDesc = r.GetString(2);
            var tipoRotulo = tipoDesc switch
            {
                "SQL_STORED_PROCEDURE" => "Procedure",
                "CLR_STORED_PROCEDURE" => "AssemblyProcedure",
                "EXTENDED_STORED_PROCEDURE" => "Extended",
                _ => tipoDesc
            };
            lista.Add(new ProcedureResumoDto(
                r.GetString(0),
                r.GetString(1),
                $"{r.GetString(0)}.{r.GetString(1)}",
                tipoRotulo,
                r.IsDBNull(3) ? null : r.GetDateTime(3),
                r.IsDBNull(4) ? null : r.GetDateTime(4),
                r.IsDBNull(6) ? null : r.GetString(6),
                r.GetInt32(5)));
        }
        return lista;
    }

    public async Task<ProcedureDetalheDto?> ObterProcedureAsync(string schema, string nome, CancellationToken ct = default)
    {
        // Pega definition via sys.sql_modules (NVARCHAR(MAX))
        var sqlHead = @"
SELECT
    s.name, p.name, p.type_desc, p.create_date, p.modify_date,
    CONVERT(NVARCHAR(MAX), m.definition) AS Corpo
FROM sys.procedures p
JOIN sys.schemas s ON p.schema_id = s.schema_id
LEFT JOIN sys.sql_modules m ON m.object_id = p.object_id
WHERE p.is_ms_shipped = 0
  AND s.name = @schema AND p.name = @nome";

        var sqlParams = @"
SELECT
    pm.name, ty.name AS Tipo, pm.is_output, pm.parameter_id,
    pm.has_default_value, ISNULL(pm.default_value, '') AS DefaultValue
FROM sys.parameters pm
JOIN sys.procedures p ON pm.object_id = p.object_id
JOIN sys.schemas s ON p.schema_id = s.schema_id
JOIN sys.types ty ON pm.user_type_id = ty.user_type_id
WHERE s.name = @schema AND p.name = @nome
ORDER BY pm.parameter_id";

        await using var c = await _conn.OpenAsync(ct);

        ProcedureDetalheDto? head = null;
        await using (var cmd = new SqlCommand(sqlHead, c))
        {
            cmd.Parameters.AddWithValue("@schema", schema);
            cmd.Parameters.AddWithValue("@nome", nome);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            if (await r.ReadAsync(ct))
            {
                var tipoDesc = r.GetString(2);
                var tipoRotulo = tipoDesc switch
                {
                    "SQL_STORED_PROCEDURE" => "Procedure",
                    "CLR_STORED_PROCEDURE" => "AssemblyProcedure",
                    "EXTENDED_STORED_PROCEDURE" => "Extended",
                    _ => tipoDesc
                };
                head = new ProcedureDetalheDto(
                    r.GetString(0),
                    r.GetString(1),
                    $"{r.GetString(0)}.{r.GetString(1)}",
                    tipoRotulo,
                    r.IsDBNull(3) ? null : r.GetDateTime(3),
                    r.IsDBNull(4) ? null : r.GetDateTime(4),
                    r.IsDBNull(5) ? null : r.GetString(5),
                    new List<ProcedureParametroDto>());
            }
        }

        if (head == null) return null;

        var parametros = new List<ProcedureParametroDto>();
        await using (var cmd = new SqlCommand(sqlParams, c))
        {
            cmd.Parameters.AddWithValue("@schema", schema);
            cmd.Parameters.AddWithValue("@nome", nome);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                parametros.Add(new ProcedureParametroDto(
                    r.IsDBNull(0) ? "" : r.GetString(0),
                    r.GetString(1),
                    r.GetBoolean(2),
                    r.GetInt32(3),
                    r.GetBoolean(4),
                    r.GetString(5)));
            }
        }
        return head with { Parametros = parametros };
    }

    public async Task<List<TriggerDto>> ListarTriggersAsync(string? schema, string? nomeTabela, CancellationToken ct = default)
    {
        var sql = @"
SELECT
    s.name AS SchemaName,
    tr.name AS TriggerName,
    t.name AS Tabela,
    tr.type_desc AS Tipo,
    tr.is_instead_of_trigger AS IsInsteadOf,
    m.definition AS Corpo
FROM sys.triggers tr
JOIN sys.tables t ON tr.parent_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
LEFT JOIN sys.sql_modules m ON m.object_id = tr.object_id
WHERE tr.is_ms_shipped = 0
  AND (@schema IS NULL OR s.name = @schema)
  AND (@tabela IS NULL OR t.name = @tabela)
ORDER BY s.name, t.name, tr.name";

        var lista = new List<TriggerDto>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", (object?)schema ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tabela", (object?)nomeTabela ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            var isInsteadOf = r.GetBoolean(4);
            var tipo = isInsteadOf ? "INSTEAD OF" : "AFTER";
            var eventos = ObterEventosTrigger(r.GetString(5) ?? string.Empty);
            var eventoStr = string.Join(", ", eventos);
            lista.Add(new TriggerDto(
                r.GetString(0),
                r.GetString(1),
                r.GetString(2),
                eventoStr,
                tipo,
                r.IsDBNull(5) ? string.Empty : r.GetString(5),
                null, // Ações - será preenchido por análise posterior se necessário
                null  // Tabelas afetadas - será preenchido por análise posterior
            ));
        }
        return lista;
    }

    private static List<string> ObterEventosTrigger(string corpo)
    {
        var eventos = new List<string>();
        var upper = corpo.ToUpperInvariant();
        if (upper.Contains("FOR INSERT") || upper.Contains("AFTER INSERT")) eventos.Add("INSERT");
        if (upper.Contains("FOR UPDATE") || upper.Contains("AFTER UPDATE")) eventos.Add("UPDATE");
        if (upper.Contains("FOR DELETE") || upper.Contains("AFTER DELETE")) eventos.Add("DELETE");
        if (upper.Contains("INSTEAD OF INSERT")) eventos.Add("INSERT");
        if (upper.Contains("INSTEAD OF UPDATE")) eventos.Add("UPDATE");
        if (upper.Contains("INSTEAD OF DELETE")) eventos.Add("DELETE");
        return eventos.Distinct().ToList();
    }

    public async Task<TriggerDto?> ObterTriggerAsync(string schema, string nome, CancellationToken ct = default)
    {
        var lista = await ListarTriggersAsync(schema, null, ct);
        return lista.FirstOrDefault(t => string.Equals(t.Nome, nome, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<List<DependencyDto>> ListarDependenciasAsync(string schema, string nomeTabela, CancellationToken ct = default)
    {
        var dependencias = new List<DependencyDto>();

        // 1. Procedures que usam a tabela
        var sqlProcs = @"
SELECT DISTINCT s.name AS SchemaName, p.name AS ProcName
FROM sys.procedures p
JOIN sys.schemas s ON p.schema_id = s.schema_id
JOIN sys.sql_modules m ON m.object_id = p.object_id
WHERE p.is_ms_shipped = 0
  AND (m.definition LIKE '%' + @tabela + '%' OR m.definition LIKE '%' + @schema + '.' + @tabela + '%')
ORDER BY s.name, p.name";

        await using (var c = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlProcs, c))
        {
            cmd.Parameters.AddWithValue("@schema", schema);
            cmd.Parameters.AddWithValue("@tabela", nomeTabela);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                dependencias.Add(new DependencyDto("Procedure", r.GetString(0), r.GetString(1),
                    $"Procedure que referencia {schema}.{nomeTabela}"));
            }
        }

        // 2. Triggers da tabela
        var triggers = await ListarTriggersAsync(schema, nomeTabela, ct);
        foreach (var tr in triggers)
        {
            dependencias.Add(new DependencyDto("Trigger", tr.Schema, tr.Nome,
                $"Trigger {tr.Evento} em {tr.Tabela}"));
        }

        // 3. Views que usam a tabela
        var sqlViews = @"
SELECT s.name AS SchemaName, v.name AS ViewName
FROM sys.views v
JOIN sys.schemas s ON v.schema_id = s.schema_id
JOIN sys.sql_modules m ON m.object_id = v.object_id
WHERE v.is_ms_shipped = 0
  AND (m.definition LIKE '%' + @tabela + '%' OR m.definition LIKE '%' + @schema + '.' + @tabela + '%')
ORDER BY s.name, v.name";

        await using (var c = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlViews, c))
        {
            cmd.Parameters.AddWithValue("@schema", schema);
            cmd.Parameters.AddWithValue("@tabela", nomeTabela);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                dependencias.Add(new DependencyDto("View", r.GetString(0), r.GetString(1),
                    $"View que referencia {schema}.{nomeTabela}"));
            }
        }

        // 4. Foreign Keys (tabela como origem ou destino)
        var fks = await ListarForeignKeysAsync(schema, nomeTabela, ct);
        foreach (var fk in fks)
        {
            dependencias.Add(new DependencyDto("ForeignKey", schema, fk.Nome,
                $"FK: {fk.TabelaOrigem}.{fk.ColunaOrigem} -> {fk.TabelaDestino}.{fk.ColunaDestino}"));
        }

        // 5. Foreign Keys onde esta tabela é referenciada (outras tabelas apontam para ela)
        var sqlFksRef = @"
SELECT fk.name, sP.name + '.' + tP.name AS Origem, cP.name AS ColunaOrigem
FROM sys.foreign_keys fk
JOIN sys.tables tP ON fk.parent_object_id = tP.object_id
JOIN sys.schemas sP ON tP.schema_id = sP.schema_id
JOIN sys.tables tR ON fk.referenced_object_id = tR.object_id
JOIN sys.schemas sR ON tR.schema_id = sR.schema_id
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns cP ON cP.object_id = fkc.parent_object_id AND cP.column_id = fkc.parent_column_id
WHERE sR.name = @schema AND tR.name = @tabela
ORDER BY Origem, fk.name";

        await using (var c = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlFksRef, c))
        {
            cmd.Parameters.AddWithValue("@schema", schema);
            cmd.Parameters.AddWithValue("@tabela", nomeTabela);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                dependencias.Add(new DependencyDto("ForeignKey", schema, r.GetString(0),
                    $"FK referenciada por: {r.GetString(1)}.{r.GetString(2)} -> {schema}.{nomeTabela}"));
            }
        }

        // 6. Functions que usam a tabela
        var sqlFuncs = @"
SELECT s.name AS SchemaName, o.name AS FuncName
FROM sys.objects o
JOIN sys.schemas s ON o.schema_id = s.schema_id
JOIN sys.sql_modules m ON m.object_id = o.object_id
WHERE o.type IN ('FN','IF','TF')
  AND o.is_ms_shipped = 0
  AND (m.definition LIKE '%' + @tabela + '%' OR m.definition LIKE '%' + @schema + '.' + @tabela + '%')
ORDER BY s.name, o.name";

        await using (var c = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlFuncs, c))
        {
            cmd.Parameters.AddWithValue("@schema", schema);
            cmd.Parameters.AddWithValue("@tabela", nomeTabela);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                dependencias.Add(new DependencyDto("Function", r.GetString(0), r.GetString(1),
                    $"Function que referencia {schema}.{nomeTabela}"));
            }
        }

        return dependencias.OrderBy(d => d.Tipo).ThenBy(d => d.Nome).ToList();
    }

    public async Task<ProcedureAnalysisDto?> AnalisarProcedureAsync(string schema, string nome, CancellationToken ct = default)
    {
        var proc = await ObterProcedureAsync(schema, nome, ct);
        if (proc == null) return null;

        var corpo = proc.Corpo ?? string.Empty;
        var upper = corpo.ToUpperInvariant();

        // Extrair tabelas referenciadas (busca simples por FROM/JOIN/UPDATE/INSERT INTO/DELETE FROM)
        var tabelas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var regexTabelas = new System.Text.RegularExpressions.Regex(
            @"\b(FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM|MERGE\s+INTO)\s+([\[A-Z0-9_\.]+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        foreach (System.Text.RegularExpressions.Match m in regexTabelas.Matches(corpo))
        {
            var tabela = m.Groups[2].Value.Trim('[', ']');
            if (tabela.Contains('.'))
            {
                tabelas.Add(tabela);
            }
        }

        // Extrair procedures chamadas (EXEC/EXECUTE)
        var procsChamadas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var regexProcs = new System.Text.RegularExpressions.Regex(
            @"\b(EXEC|EXECUTE)\s+([\[A-Z0-9_\.]+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        foreach (System.Text.RegularExpressions.Match m in regexProcs.Matches(corpo))
        {
            var p = m.Groups[2].Value.Trim('[', ']');
            if (p.Contains('.'))
            {
                procsChamadas.Add(p);
            }
        }

        // Gerar explicação baseada no corpo
        var acoes = new List<string>();
        if (upper.Contains("INSERT")) acoes.Add("Insere registros");
        if (upper.Contains("UPDATE")) acoes.Add("Atualiza registros");
        if (upper.Contains("DELETE")) acoes.Add("Remove registros");
        if (upper.Contains("SELECT")) acoes.Add("Consulta dados");
        if (upper.Contains("TRANSACTION") || upper.Contains("BEGIN TRAN")) acoes.Add("Usa transação");
        if (upper.Contains("TRY") && upper.Contains("CATCH")) acoes.Add("Tratamento de erro (TRY/CATCH)");
        if (upper.Contains("CURSOR")) acoes.Add("Usa cursor");
        if (upper.Contains("WHILE")) acoes.Add("Loop (WHILE)");
        if (upper.Contains("IF ")) acoes.Add("Condicional (IF)");

        var explicacao = acoes.Count > 0
            ? $"Esta procedure {string.Join(", ", acoes.Take(5)).ToLowerInvariant()}."
            : "Não foi possível determinar automaticamente as ações principais.";

        var fluxo = new List<string>();
        if (upper.Contains("BEGIN TRAN")) fluxo.Add("1. Inicia transação");
        if (upper.Contains("DECLARE")) fluxo.Add("2. Declara variáveis");
        if (upper.Contains("SELECT") && !upper.Contains("INSERT") && !upper.Contains("UPDATE") && !upper.Contains("DELETE"))
            fluxo.Add("3. Consulta dados iniciais");
        if (upper.Contains("IF ")) fluxo.Add("4. Valida condições");
        if (upper.Contains("INSERT")) fluxo.Add("5. Insere/Atualiza registros");
        if (upper.Contains("UPDATE")) fluxo.Add("5. Atualiza registros");
        if (upper.Contains("DELETE")) fluxo.Add("5. Remove registros");
        if (upper.Contains("COMMIT")) fluxo.Add("6. Confirma transação (COMMIT)");
        if (upper.Contains("ROLLBACK")) fluxo.Add("7. Rollback em caso de erro");
        if (fluxo.Count == 0) fluxo.Add("Não foi possível determinar o fluxo automaticamente.");

        return new ProcedureAnalysisDto(
            proc.Parametros,
            tabelas.OrderBy(t => t).ToList(),
            procsChamadas.OrderBy(p => p).ToList(),
            explicacao,
            fluxo);
    }

    public async Task<List<GlobalSearchResultDto>> BuscarGlobalAsync(string termo, int take, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(termo)) return new List<GlobalSearchResultDto>();

        var takeClamped = Math.Clamp(take, 1, 500);
        var like = $"%{termo}%";

        var resultados = new List<GlobalSearchResultDto>();

        // 1. Tabelas
        var sqlTabelas = @"
SELECT TOP (@take) s.name AS SchemaName, t.name AS TableName, 'Tabela' AS Tipo
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.is_ms_shipped = 0
  AND (t.name LIKE @like OR s.name + '.' + t.name LIKE @like)
ORDER BY s.name, t.name";

        await using (var c = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlTabelas, c))
        {
            cmd.Parameters.AddWithValue("@take", takeClamped);
            cmd.Parameters.AddWithValue("@like", like);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                resultados.Add(new GlobalSearchResultDto(
                    "Tabela", r.GetString(0), r.GetString(1), null,
                    $"{r.GetString(0)}.{r.GetString(1)}"));
            }
        }

        // 2. Colunas
        var sqlColunas = @"
SELECT TOP (@take) s.name AS SchemaName, t.name AS TableName, c.name AS ColumnName, 'Coluna' AS Tipo
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.is_ms_shipped = 0
  AND c.name LIKE @like
ORDER BY s.name, t.name, c.column_id";

        await using (var c = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlColunas, c))
        {
            cmd.Parameters.AddWithValue("@take", takeClamped);
            cmd.Parameters.AddWithValue("@like", like);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                resultados.Add(new GlobalSearchResultDto(
                    "Coluna", r.GetString(0), r.GetString(1), r.GetString(2),
                    $"{r.GetString(0)}.{r.GetString(1)}.{r.GetString(2)}"));
            }
        }

        // 3. Procedures
        var sqlProcs = @"
SELECT TOP (@take) s.name AS SchemaName, p.name AS ProcName, 'Procedure' AS Tipo
FROM sys.procedures p
JOIN sys.schemas s ON p.schema_id = s.schema_id
WHERE p.is_ms_shipped = 0
  AND p.name LIKE @like
ORDER BY s.name, p.name";

        await using (var c2 = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlProcs, c2))
        {
            cmd.Parameters.AddWithValue("@take", takeClamped);
            cmd.Parameters.AddWithValue("@like", like);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                resultados.Add(new GlobalSearchResultDto(
                    "Procedure", r.GetString(0), r.GetString(1), null,
                    $"{r.GetString(0)}.{r.GetString(1)}"));
            }
        }

        // 4. Triggers
        var sqlTriggers = @"
SELECT TOP (@take) s.name AS SchemaName, tr.name AS TriggerName, t.name AS TableName, 'Trigger' AS Tipo
FROM sys.triggers tr
JOIN sys.tables t ON tr.parent_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE tr.is_ms_shipped = 0
  AND tr.name LIKE @like
ORDER BY s.name, t.name, tr.name";

        await using (var c3 = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlTriggers, c3))
        {
            cmd.Parameters.AddWithValue("@take", takeClamped);
            cmd.Parameters.AddWithValue("@like", like);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                resultados.Add(new GlobalSearchResultDto(
                    "Trigger", r.GetString(0), r.GetString(2), null,
                    $"{r.GetString(0)}.{r.GetString(2)} -> {r.GetString(1)}"));
            }
        }

        // 5. Views
        var sqlViews = @"
SELECT TOP (@take) s.name AS SchemaName, v.name AS ViewName, 'View' AS Tipo
FROM sys.views v
JOIN sys.schemas s ON v.schema_id = s.schema_id
WHERE v.is_ms_shipped = 0
  AND v.name LIKE @like
ORDER BY s.name, v.name";

        await using (var c4 = await _conn.OpenAsync(ct))
        await using (var cmd = new SqlCommand(sqlViews, c4))
        {
            cmd.Parameters.AddWithValue("@take", takeClamped);
            cmd.Parameters.AddWithValue("@like", like);
            await using var r = await cmd.ExecuteReaderAsync(ct);
            while (await r.ReadAsync(ct))
            {
                resultados.Add(new GlobalSearchResultDto(
                    "View", r.GetString(0), r.GetString(1), null,
                    $"{r.GetString(0)}.{r.GetString(1)}"));
            }
        }

        return resultados.Take(takeClamped).ToList();
    }
}
