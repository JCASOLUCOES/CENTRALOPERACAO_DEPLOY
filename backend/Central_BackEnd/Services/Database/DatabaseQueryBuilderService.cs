using Central_BackEnd.Dtos.Database;
using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseQueryBuilderService
{
    Task<DatabaseQueryBuilderResult> MontarConsultaAsync(List<string> tabelas, List<string> colunas, List<RelationshipDto> relacionamentos, CancellationToken ct = default);
}

public record DatabaseQueryBuilderResult(
    string SqlGerado,
    List<string> TabelasUsadas,
    List<RelationshipDto> JoinsUtilizados,
    string? Aviso);

public class DatabaseQueryBuilderService : IDatabaseQueryBuilderService
{
    private readonly IDatabaseConnectionService _conn;
    private readonly IDatabaseMetadataService _metadata;
    private readonly IDatabaseRelationshipInferenceService _inference;
    private readonly ILogger<DatabaseQueryBuilderService> _logger;

    public DatabaseQueryBuilderService(
        IDatabaseConnectionService conn,
        IDatabaseMetadataService metadata,
        IDatabaseRelationshipInferenceService inference,
        ILogger<DatabaseQueryBuilderService> logger)
    {
        _conn = conn;
        _metadata = metadata;
        _inference = inference;
        _logger = logger;
    }

    public async Task<DatabaseQueryBuilderResult> MontarConsultaAsync(
        List<string> tabelas,
        List<string> colunas,
        List<RelationshipDto> relacionamentos,
        CancellationToken ct = default)
    {
        if (tabelas == null || tabelas.Count == 0)
            return new DatabaseQueryBuilderResult("", new(), new(), "Nenhuma tabela selecionada");

        if (tabelas.Count > 5)
            return new DatabaseQueryBuilderResult("", new(), new(), "Máximo de 5 tabelas permitidas por consulta");

        // Validar que as tabelas existem
        var tabelasValidas = await ValidarTabelasAsync(tabelas, ct);
        if (tabelasValidas.Count == 0)
            return new DatabaseQueryBuilderResult("", new(), new(), "Nenhuma tabela válida encontrada");

        // Se só uma tabela, não precisa de JOIN
        if (tabelasValidas.Count == 1)
        {
            var sqlSimples = GerarSelectSimples(tabelasValidas[0], colunas);
            return new DatabaseQueryBuilderResult(sqlSimples, tabelasValidas, new(), null);
        }

        // Múltiplas tabelas: montar JOINs usando relacionamentos
        var (sql, joinsUsados) = await MontarSelectComJoinsAsync(tabelasValidas, colunas, relacionamentos, ct);
        
        var avisos = new List<string>();
        if (joinsUsados.Any(j => j.Tipo == "Possivel"))
            avisos.Add("⚠️ Alguns JOINs usam relacionamentos POSSÍVEIS (não confirmados por FK). Verifique antes de executar.");

        return new DatabaseQueryBuilderResult(sql, tabelasValidas, joinsUsados, string.Join(" ", avisos));
    }

    private async Task<List<string>> ValidarTabelasAsync(List<string> tabelas, CancellationToken ct)
    {
        var validas = new List<string>();
        foreach (var t in tabelas)
        {
            var partes = t.Split('.');
            string schema = "dbo", nome = t;
            if (partes.Length == 2) { schema = partes[0]; nome = partes[1]; }
            
            var tabela = await _metadata.ObterTabelaAsync(schema, nome, CancellationToken.None);
            if (tabela != null)
                validas.Add($"{schema}.{nome}");
        }
        return validas;
    }

    private string GerarSelectSimples(string tabelaCompleta, List<string> colunas)
    {
        var cols = colunas?.Count > 0 ? string.Join(", ", colunas.Select(c => $"[{c}]")) : "*";
        return $"SELECT {cols} FROM [{tabelaCompleta}]";
    }

    private async Task<(string sql, List<RelationshipDto> joins)> MontarSelectComJoinsAsync(
        List<string> tabelas, List<string> colunas, List<RelationshipDto> relacionamentos, CancellationToken ct)
    {
        // Construir grafo de tabelas conectadas
        var grafo = new Dictionary<string, List<(string destino, string colOrigem, string colDestino, string tipo)>>();
        foreach (var t in tabelas) grafo[t] = new List<(string, string, string, string)>();

        // Usar relacionamentos confirmados primeiro, depois possíveis
        var todosRels = relacionamentos
            .Where(r => tabelas.Contains(r.TabelaOrigem) && tabelas.Contains(r.TabelaDestino))
            .OrderBy(r => r.Tipo == "Confirmada" ? 0 : 1)
            .ThenByDescending(r => r.Score)
            .ToList();

        var joinsUsados = new List<RelationshipDto>();
        var tabelasConectadas = new HashSet<string> { tabelas[0] }; // Começa da primeira tabela
        var joins = new List<(string origem, string destino, string colOrigem, string colDestino, string tipo)>();

        // BFS para conectar todas as tabelas
        var fila = new Queue<string>();
        fila.Enqueue(tabelas[0]);

        while (fila.Count > 0 && tabelasConectadas.Count < tabelas.Count)
        {
            var atual = fila.Dequeue();
            
            foreach (var rel in todosRels.Where(r => r.TabelaOrigem == atual && tabelas.Contains(r.TabelaDestino) && !tabelasConectadas.Contains(r.TabelaDestino)))
            {
                tabelasConectadas.Add(rel.TabelaDestino);
                joins.Add((rel.TabelaOrigem, rel.TabelaDestino, rel.ColunaOrigem, rel.ColunaDestino, rel.Tipo));
                joinsUsados.Add(rel);
                fila.Enqueue(rel.TabelaDestino);
            }

            // Também verificar relacionamentos inversos
            foreach (var rel in todosRels.Where(r => r.TabelaDestino == atual && tabelas.Contains(r.TabelaOrigem) && !tabelasConectadas.Contains(r.TabelaOrigem)))
            {
                tabelasConectadas.Add(rel.TabelaOrigem);
                joins.Add((rel.TabelaOrigem, rel.TabelaDestino, rel.ColunaOrigem, rel.ColunaDestino, rel.Tipo));
                joinsUsados.Add(rel);
                fila.Enqueue(rel.TabelaOrigem);
            }
        }

        // Se não conseguiu conectar todas, tentar relacionamentos possíveis restantes
        if (tabelasConectadas.Count < tabelas.Count)
        {
            var faltando = tabelas.Where(t => !tabelasConectadas.Contains(t)).ToList();
            foreach (var t in faltando)
            {
                // Tentar conectar a qualquer tabela já conectada
                foreach (var conectada in tabelasConectadas)
                {
                    var rel = todosRels.FirstOrDefault(r => 
                        (r.TabelaOrigem == conectada && r.TabelaDestino == t) ||
                        (r.TabelaOrigem == t && r.TabelaDestino == conectada));
                    
                    if (rel != null)
                    {
                        if (rel.TabelaOrigem == conectada)
                        {
                            joins.Add((rel.TabelaOrigem, rel.TabelaDestino, rel.ColunaOrigem, rel.ColunaDestino, rel.Tipo));
                        }
                        else
                        {
                            joins.Add((rel.TabelaDestino, rel.TabelaOrigem, rel.ColunaDestino, rel.ColunaOrigem, rel.Tipo));
                        }
                        joinsUsados.Add(rel);
                        tabelasConectadas.Add(t);
                        break;
                    }
                }
            }
        }

        // Montar SQL
        var colunasSelect = colunas?.Count > 0 
            ? string.Join(", ", colunas.Select(c => $"[{GetAlias(tabelas, c)}].[{c}]"))
            : string.Join(", ", tabelas.SelectMany(t => 
                // Por simplicidade, usar * para cada tabela
                new[] { $"[{GetAlias(tabelas, t)}].*" }));

        var sqlGerado = $"SELECT {colunasSelect} FROM [{tabelas[0]}] AS [{GetAlias(tabelas, tabelas[0])}]";

        foreach (var j in joins)
        {
            var tipoJoin = j.tipo == "Confirmada" ? "INNER JOIN" : "LEFT JOIN";
            sqlGerado += $"\n  {tipoJoin} [{j.destino}] AS [{GetAlias(tabelas, j.destino)}] ON [{GetAlias(tabelas, j.origem)}].[{j.colOrigem}] = [{GetAlias(tabelas, j.destino)}].[{j.colDestino}]";
        }

        return (sqlGerado, joinsUsados.DistinctBy(r => (r.TabelaOrigem, r.ColunaOrigem, r.TabelaDestino, r.ColunaDestino)).ToList());
    }

    private string GetAlias(List<string> tabelas, string tabelaOuColuna)
    {
        // Gerar alias curto baseado no nome da tabela
        var partes = tabelaOuColuna.Split('.');
        var nome = partes[^1];
        var idx = tabelas.FindIndex(t => t.EndsWith("." + nome) || t == nome);
        return $"t{idx + 1}";
    }
}