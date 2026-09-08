using Central_BackEnd.Dtos.Database;
using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseRelationshipInferenceService
{
    Task<List<RelationshipDto>> ListarPossiveisAsync(string? schema, int take, CancellationToken ct = default);
    Task<List<RelationshipDto>> ListarConfirmadasAsync(string? schema, CancellationToken ct = default);
    Task<List<RelationshipDto>> OndeColunaUsadaAsync(string coluna, CancellationToken ct = default);
    Task<List<RelationshipDto>> ListarGrafoAsync(string tabelaRaiz, int profundidade, bool incluirPossiveis, CancellationToken ct = default);
}

public class DatabaseRelationshipInferenceService : IDatabaseRelationshipInferenceService
{
    private readonly IDatabaseConnectionService _conn;
    private readonly ILogger<DatabaseRelationshipInferenceService> _logger;

    public DatabaseRelationshipInferenceService(IDatabaseConnectionService conn, ILogger<DatabaseRelationshipInferenceService> logger)
    {
        _conn = conn;
        _logger = logger;
    }

    public async Task<List<RelationshipDto>> ListarPossiveisAsync(string? schema, int take, CancellationToken ct = default)
    {
        // Estrategia: encontrar colunas cujo nome termina em "_ID" e cujo tipo bate com a PK de outra tabela.
        var colunas = await ListarColunasComIdAsync(schema, ct);
        var pks = await ListarPksAsync(schema, ct);
        var indice = await ListarIndicesAsync(schema, ct);

        var candidatos = new List<RelationshipDto>();
        foreach (var c in colunas)
        {
            // Nomes classicos: xxx_ID, xxxID
            var colName = c.Coluna;
            string? candidato = null;
            if (colName.EndsWith("_ID", StringComparison.OrdinalIgnoreCase))
                candidato = colName.Substring(0, colName.Length - 3);
            else if (colName.EndsWith("Id", StringComparison.OrdinalIgnoreCase) && colName.Length > 2 && char.IsUpper(colName[colName.Length - 3]))
                candidato = colName.Substring(0, colName.Length - 2);
            else if (colName.StartsWith("COD_", StringComparison.OrdinalIgnoreCase))
                candidato = colName.Substring(4);
            else if (colName.StartsWith("ID_", StringComparison.OrdinalIgnoreCase))
                candidato = colName.Substring(3);

            if (string.IsNullOrEmpty(candidato)) continue;

            // Procurar tabela cujo nome bate com o candidato
            var match = pks.FirstOrDefault(p =>
                string.Equals(p.Tabela, candidato, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.Tabela, candidato + "s", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.Tabela, candidato + "es", StringComparison.OrdinalIgnoreCase));

            if (match == null) continue;
            if (string.Equals(c.Tabela, $"{match.Schema}.{match.Tabela}", StringComparison.OrdinalIgnoreCase)) continue;

            // Calcular score
            var motivos = new List<string>();
            int score = 0;
            if (string.Equals(c.Tipo, match.Tipo, StringComparison.OrdinalIgnoreCase)) { score += 40; motivos.Add("tipos compativeis"); }
            if (c.IsPrimaryKey == false && match.IsPrimaryKey) { score += 25; motivos.Add("coluna destino e PK"); }
            if (indice.Any(i => i.Tabela == c.Tabela && i.Colunas.Any(cc => string.Equals(cc, c.Coluna, StringComparison.OrdinalIgnoreCase)))) { score += 15; motivos.Add("coluna origem indexada"); }
            if (EhFkConfirmadaExiste(c.Tabela, c.Coluna, $"{match.Schema}.{match.Tabela}", match.Coluna).Result) { score += 100; continue; }
            if (c.Tipo.Contains("INT", StringComparison.OrdinalIgnoreCase) || c.Tipo.Contains("UNIQUEIDENTIFIER", StringComparison.OrdinalIgnoreCase)) { score += 10; motivos.Add("tipo comum de FK"); }
            if (score >= 50)
            {
                candidatos.Add(new RelationshipDto("Possivel", c.Tabela, c.Coluna, $"{match.Schema}.{match.Tabela}", match.Coluna, Math.Min(score, 99), motivos));
            }
        }

        return candidatos
            .OrderByDescending(r => r.Score)
            .ThenBy(r => r.TabelaOrigem).ThenBy(r => r.ColunaOrigem)
            .Take(Math.Clamp(take, 1, 2000))
            .ToList();
    }

    public async Task<List<RelationshipDto>> ListarConfirmadasAsync(string? schema, CancellationToken ct = default)
    {
        var fks = await new DatabaseMetadataService(_conn, _logger as ILogger<DatabaseMetadataService> ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<DatabaseMetadataService>.Instance)
            .ListarForeignKeysAsync(schema, null, ct);
        return fks.Select(fk => new RelationshipDto(
            "Confirmada",
            fk.TabelaOrigem, fk.ColunaOrigem,
            fk.TabelaDestino, fk.ColunaDestino,
            100,
            new List<string> { "FK fisica declarada no SQL Server" }
        )).ToList();
    }

    public async Task<List<RelationshipDto>> OndeColunaUsadaAsync(string coluna, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(coluna)) return new List<RelationshipDto>();
        var colunas = await ListarColunasComIdAsync(null, ct);
        return colunas.Where(c => string.Equals(c.Coluna, coluna, StringComparison.OrdinalIgnoreCase))
            .Select(c => new RelationshipDto("Confirmada", c.Tabela, c.Coluna, "(origem)", "(destino)", 50, new List<string> { "uso direto da coluna" }))
            .ToList();
    }

    public async Task<List<RelationshipDto>> ListarGrafoAsync(string tabelaRaiz, int profundidade, bool incluirPossiveis, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(tabelaRaiz)) return new List<RelationshipDto>();
        profundidade = Math.Clamp(profundidade, 1, 5);
        var visitadas = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { tabelaRaiz };
        var arestas = new List<RelationshipDto>();
        var fila = new Queue<(string tabela, int nivel)>();
        fila.Enqueue((tabelaRaiz, 0));

        var fks = await ListarConfirmadasAsync(null, ct);
        var possiveis = incluirPossiveis ? await ListarPossiveisAsync(null, 1000, ct) : new List<RelationshipDto>();
        var todas = fks.Concat(possiveis).ToList();

        while (fila.Count > 0)
        {
            var (atual, nivel) = fila.Dequeue();
            if (nivel >= profundidade) continue;
            var saindo = todas.Where(r => r.TabelaOrigem.Equals(atual, StringComparison.OrdinalIgnoreCase)).ToList();
            foreach (var r in saindo)
            {
                arestas.Add(r);
                if (visitadas.Add(r.TabelaDestino))
                    fila.Enqueue((r.TabelaDestino, nivel + 1));
            }
        }
        return arestas.DistinctBy(r => (r.TabelaOrigem, r.ColunaOrigem, r.TabelaDestino, r.ColunaDestino, r.Tipo)).ToList();
    }

    // ===== helpers =====
    private record ColunaRow(string Tabela, string Coluna, string Tipo, bool IsPrimaryKey);
    private record PkRow(string Schema, string Tabela, string Coluna, string Tipo, bool IsPrimaryKey);
    private record IndiceRow(string Tabela, List<string> Colunas);

    private async Task<List<ColunaRow>> ListarColunasComIdAsync(string? schema, CancellationToken ct)
    {
        var sql = @"
SELECT s.name + '.' + t.name AS Tabela, c.name AS Coluna, ty.name AS Tipo,
       CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS IsPk
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
WHERE t.is_ms_shipped = 0
  AND (@schema IS NULL OR s.name = @schema)
  AND (c.name LIKE '%[_]ID' OR c.name LIKE '%Id' OR c.name LIKE 'COD[_]%' OR c.name LIKE 'ID[_]%')";
        var lista = new List<ColunaRow>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", (object?)schema ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            lista.Add(new ColunaRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetInt32(3) == 1));
        return lista;
    }

    private async Task<List<PkRow>> ListarPksAsync(string? schema, CancellationToken ct)
    {
        var sql = @"
SELECT s.name AS SchemaName, t.name AS TableName, c.name AS ColName, ty.name AS Tipo
FROM sys.key_constraints kc
JOIN sys.tables t ON kc.parent_object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE kc.type = 'PK' AND t.is_ms_shipped = 0
  AND (@schema IS NULL OR s.name = @schema)";
        var lista = new List<PkRow>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", (object?)schema ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            lista.Add(new PkRow(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), true));
        return lista;
    }

    private async Task<List<IndiceRow>> ListarIndicesAsync(string? schema, CancellationToken ct)
    {
        var sql = @"
SELECT s.name + '.' + t.name AS Tabela,
    STUFF((SELECT ', ' + c.name
           FROM sys.index_columns ic
           JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
           WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
           ORDER BY ic.key_ordinal
           FOR XML PATH('')), 1, 2, '') AS Colunas
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE i.is_hypothetical = 0 AND i.index_id > 0 AND t.is_ms_shipped = 0
  AND (@schema IS NULL OR s.name = @schema)";
        var lista = new List<IndiceRow>();
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, c);
        cmd.Parameters.AddWithValue("@schema", (object?)schema ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            var cols = r.IsDBNull(1) ? new List<string>() : r.GetString(1).Split(", ").ToList();
            lista.Add(new IndiceRow(r.GetString(0), cols));
        }
        return lista;
    }

    private async Task<bool> EhFkConfirmadaExiste(string tabelaOrigem, string colunaOrigem, string tabelaDestino, string colunaDestino)
    {
        // shortcut: ja coberto por ListarConfirmadasAsync
        return false;
    }
}
