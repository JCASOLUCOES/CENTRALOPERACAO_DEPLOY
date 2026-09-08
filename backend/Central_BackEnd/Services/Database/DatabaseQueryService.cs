using System.Data;
using System.Text.RegularExpressions;
using Central_BackEnd.Dtos.Database;
using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseQueryService
{
    Task<QueryResultDto> ExecutarAsync(QueryRequest req, CancellationToken ct = default);
}

public class DatabaseQueryService : IDatabaseQueryService
{
    // Bloqueio de comandos destrutivos server-side (regex case-insensitive, com separador de palavra)
    private static readonly Regex[] ComandosBloqueados = new[]
    {
        new Regex(@"\bINSERT\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bUPDATE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bDELETE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bDROP\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bALTER\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bTRUNCATE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bCREATE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bEXEC\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bEXECUTE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bGRANT\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bREVOKE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bMERGE\b", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"\bBULK\b", RegexOptions.IgnoreCase | RegexOptions.Compiled)
    };

    private readonly IDatabaseConnectionService _conn;
    private readonly ILogger<DatabaseQueryService> _logger;
    public DatabaseQueryService(IDatabaseConnectionService conn, ILogger<DatabaseQueryService> logger)
    {
        _conn = conn;
        _logger = logger;
    }

    public async Task<QueryResultDto> ExecutarAsync(QueryRequest req, CancellationToken ct = default)
    {
        var ini = DateTime.Now;
        var sql = (req.Sql ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(sql))
            return new QueryResultDto(false, new(), new(), 0, 0, "Consulta vazia.");

        // So permite SELECT ou WITH (CTE). Comandos perigosos sao bloqueados server-side.
        if (!ComecaComSelectOuWith(sql))
            return new QueryResultDto(false, new(), new(), 0, 0, "Apenas consultas SELECT (ou CTE comeca com WITH) sao permitidas.");

        foreach (var rx in ComandosBloqueados)
        {
            // Permite SELECT com INTO em CTE inicial; checa resto
            if (rx.IsMatch(sql))
                return new QueryResultDto(false, new(), new(), 0, 0, $"Comando nao permitido: {rx.Match(sql).Value.ToUpper()}");
        }

        var timeoutSeg = Math.Clamp(req.TimeoutSegundos ?? 30, 1, 120);
        var limite = Math.Clamp(req.Limite ?? 500, 1, 5000);

        // Envelopar com TOP para limitar registros
        var sqlComLimite = EnveloparSelectComTop(sql, limite);

        await using var c = await _conn.OpenAsync(ct);
        // Garantir transacao read-only e rollback explicito (defesa em profundidade)
        await using var tx = c.BeginTransaction(IsolationLevel.ReadUncommitted);
        try
        {
            await using var cmd = new SqlCommand(sqlComLimite, c, tx) { CommandTimeout = timeoutSeg };
            await using var r = await cmd.ExecuteReaderAsync(ct);
            var colNames = new List<string>();
            for (int i = 0; i < r.FieldCount; i++) colNames.Add(r.GetName(i));

            var linhas = new List<List<object?>>();
            int count = 0;
            while (await r.ReadAsync(ct))
            {
                var linha = new List<object?>();
                for (int i = 0; i < r.FieldCount; i++)
                    linha.Add(r.IsDBNull(i) ? null : TratarValor(r.GetValue(i)));
                linhas.Add(linha);
                count++;
                if (count >= limite) break;
            }

            await tx.RollbackAsync(ct);
            return new QueryResultDto(true, colNames, linhas, count, (int)(DateTime.Now - ini).TotalMilliseconds, null);
        }
        catch (SqlException ex) when (ex.Number == -2)
        {
            return new QueryResultDto(false, new(), new(), 0, (int)(DateTime.Now - ini).TotalMilliseconds,
                $"A consulta excedeu o tempo maximo permitido. Tempo limite: {timeoutSeg} segundos.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao executar consulta");
            return new QueryResultDto(false, new(), new(), 0, (int)(DateTime.Now - ini).TotalMilliseconds, ex.Message);
        }
    }

    private static bool ComecaComSelectOuWith(string sql)
    {
        var norm = sql.TrimStart('(', ' ', '\t', '\n', '\r');
        return norm.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase) ||
               norm.StartsWith("WITH", StringComparison.OrdinalIgnoreCase);
    }

    private static string EnveloparSelectComTop(string sql, int limite)
    {
        // Se ja tem TOP, nao envelopa
        if (Regex.IsMatch(sql, @"\bSELECT\s+TOP\s+\d+", RegexOptions.IgnoreCase))
            return sql;
        // Inserir TOP apos SELECT
        return Regex.Replace(sql, @"\bSELECT\b", $"SELECT TOP {limite}", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
    }

    private static object? TratarValor(object? v)
    {
        if (v is DateTime dt) return dt.ToString("yyyy-MM-dd HH:mm:ss");
        if (v is byte[] bytes) return Convert.ToBase64String(bytes);
        return v;
    }
}
