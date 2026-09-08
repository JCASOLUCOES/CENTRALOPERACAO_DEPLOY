using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

public record DatabaseSearchResult(
    string Tipo,        // "Tabela" | "Coluna" | "Procedure" | "View" | "Function" | "Trigger"
    string Objeto,
    string? Coluna,
    string? Schema,
    string? Detalhe);

public interface IDatabaseSearchService
{
    Task<List<DatabaseSearchResult>> BuscarAsync(string termo, int take, CancellationToken ct = default);
}

public class DatabaseSearchService : IDatabaseSearchService
{
    private readonly IDatabaseConnectionService _conn;
    public DatabaseSearchService(IDatabaseConnectionService conn) { _conn = conn; }

    public async Task<List<DatabaseSearchResult>> BuscarAsync(string termo, int take, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(termo)) return new List<DatabaseSearchResult>();
        var t = Math.Clamp(take, 1, 500);
        var like = $"%{termo}%";
        var sql = @"
-- Tabelas
SELECT 'Tabela' AS Tipo, s.name + '.' + t.name AS Objeto, NULL AS Coluna, s.name AS [Schema], NULL AS Detalhe
FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.is_ms_shipped = 0 AND t.name LIKE @like
UNION ALL
-- Colunas
SELECT 'Coluna' AS Tipo, s.name + '.' + t.name AS Objeto, c.name AS Coluna, s.name, ty.name AS Detalhe
FROM sys.columns c JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE t.is_ms_shipped = 0 AND c.name LIKE @like
UNION ALL
-- Views
SELECT 'View' AS Tipo, s.name + '.' + v.name AS Objeto, NULL, s.name, NULL
FROM sys.views v JOIN sys.schemas s ON v.schema_id = s.schema_id
WHERE v.is_ms_shipped = 0 AND v.name LIKE @like
UNION ALL
-- Procedures
SELECT 'Procedure' AS Tipo, s.name + '.' + p.name AS Objeto, NULL, s.name, NULL
FROM sys.procedures p JOIN sys.schemas s ON p.schema_id = s.schema_id
WHERE p.is_ms_shipped = 0 AND p.name LIKE @like
UNION ALL
-- Functions
SELECT 'Function' AS Tipo, s.name + '.' + o.name AS Objeto, NULL, s.name, o.type_desc
FROM sys.objects o JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE o.type IN ('FN','IF','TF') AND o.is_ms_shipped = 0 AND o.name LIKE @like
UNION ALL
-- Triggers
SELECT 'Trigger' AS Tipo, s.name + '.' + tr.name AS Objeto, NULL, s.name, NULL
FROM sys.triggers tr LEFT JOIN sys.tables t ON tr.parent_id = t.object_id
LEFT JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE tr.is_ms_shipped = 0 AND tr.name LIKE @like
ORDER BY Tipo, Objeto";

        var lista = new List<DatabaseSearchResult>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@like", like);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct) && lista.Count < t)
        {
            lista.Add(new DatabaseSearchResult(
                r.GetString(0),
                r.IsDBNull(1) ? "" : r.GetString(1),
                r.IsDBNull(2) ? null : r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.IsDBNull(4) ? null : r.GetString(4)));
        }
        return lista;
    }
}
