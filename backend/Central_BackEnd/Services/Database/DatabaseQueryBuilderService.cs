using System.Linq;
using System.Text.RegularExpressions;
using Central_BackEnd.Dtos.Database;
using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseQueryBuilderService
{
    Task<DatabaseQueryBuilderResult> MontarConsultaAsync(List<string> tabelas, List<string> colunas, List<RelationshipDto> relacionamentos, CancellationToken ct = default);
    Task<DatabaseQueryBuilderResult> MontarConsultaAvancadaAsync(QueryBuilderAdvancedRequest req, CancellationToken ct = default);
}

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

    public async Task<DatabaseQueryBuilderResult> MontarConsultaAvancadaAsync(
        QueryBuilderAdvancedRequest req, CancellationToken ct = default)
    {
        if (req.Tabelas == null || req.Tabelas.Count == 0)
            return new DatabaseQueryBuilderResult("", new(), new(), "Nenhuma tabela selecionada");

        if (req.Tabelas.Count > 5)
            return new DatabaseQueryBuilderResult("", new(), new(), "Máximo de 5 tabelas permitidas por consulta");

        var tabelasValidas = await ValidarTabelasAsync(req.Tabelas, ct);
        if (tabelasValidas.Count == 0)
            return new DatabaseQueryBuilderResult("", new(), new(), "Nenhuma tabela válida encontrada");

        var sqlBuilder = new System.Text.StringBuilder();
        var joinsUsados = new List<RelationshipDto>();
        var tabelasAlias = new Dictionary<string, string>();

        // Gerar aliases para cada tabela
        for (int i = 0; i < tabelasValidas.Count; i++)
            tabelasAlias[tabelasValidas[i]] = $"t{i + 1}";

        // 1. CTEs (WITH ...)
        if (req.Ctes != null && req.Ctes.Count > 0)
        {
            sqlBuilder.Append("WITH ");
            for (int i = 0; i < req.Ctes.Count; i++)
            {
                var cte = req.Ctes[i];
                sqlBuilder.Append($"[{cte.Nome}] AS ({cte.Sql})");
                if (i < req.Ctes.Count - 1)
                    sqlBuilder.Append(", ");
            }
            sqlBuilder.AppendLine();
        }

        // 2. SELECT com colunas
        var colunasSelect = req.Colunas?.Count > 0
            ? string.Join(", ", req.Colunas.Select(c =>
            {
                var alias = tabelasAlias.Values.FirstOrDefault(a =>
                    tabelasAlias.Any(kvp => kvp.Value == a && kvp.Key.EndsWith("." + c) || kvp.Key == c));
                return $"[{alias ?? tabelasAlias[tabelasValidas[0]]}].[{c}]";
            }))
            : string.Join(", ", tabelasValidas.Select(t => $"[{tabelasAlias[t]}].*"));
        sqlBuilder.Append($"SELECT {colunasSelect}");

        // 3. FROM com JOINs
        sqlBuilder.Append($"\nFROM [{tabelasValidas[0]}] AS [{tabelasAlias[tabelasValidas[0]]}]");

        if (req.Tabelas.Count > 1 && req.Relacionamentos != null && req.Relacionamentos.Count > 0)
        {
            var (joinsSql, joinsUsadosResult) = await MontarSelectComJoinsAsync(
                tabelasValidas, req.Colunas ?? new List<string>(), req.Relacionamentos, ct);
            // Extrair apenas a parte dos JOINs do SQL gerado
            var joinLinhas = new List<string>();
            var linhas = joinsSql.Split('\n');
            foreach (var linha in linhas)
            {
                if (linha.TrimStart().StartsWith("INNER JOIN") || linha.TrimStart().StartsWith("LEFT JOIN") ||
                    linha.TrimStart().StartsWith("RIGHT JOIN") || linha.TrimStart().StartsWith("CROSS JOIN"))
                    joinLinhas.Add(linha.TrimStart());
            }
            foreach (var jl in joinLinhas)
                sqlBuilder.Append($"\n  {jl}");
            joinsUsados = joinsUsadosResult;
        }

        // 4. WHERE com condições
        if (req.WhereConditions != null && req.WhereConditions.Count > 0)
        {
            sqlBuilder.Append("\nWHERE ");
            var whereParts = new List<string>();
            foreach (var wc in req.WhereConditions)
            {
                whereParts.Add(MontarCondicaoWhereDetalhada(wc, tabelasAlias));
            }
            sqlBuilder.Append(string.Join(" ", whereParts));
        }

        // 5. GROUP BY com agregações
        if (req.GroupBy != null && req.GroupBy.Count > 0)
        {
            sqlBuilder.Append("\nGROUP BY ");
            var groupParts = new List<string>();
            foreach (var gb in req.GroupBy)
            {
                var tabelaRef = req.Tabelas.FirstOrDefault(t => t.EndsWith("." + gb.Coluna) || t == gb.Coluna);
                var alias = tabelaRef != null && tabelasAlias.ContainsKey(tabelaRef) 
                    ? tabelasAlias[tabelaRef] 
                    : tabelasAlias[req.Tabelas[0]];
                groupParts.Add($"[{alias}].[{gb.Coluna}]");
            }
            sqlBuilder.Append(string.Join(", ", groupParts));
        }

        // 6. HAVING (se houver agregações com filtro no GROUP BY)
        // Se o usuário especificou GROUP BY com agregações implícitas, HAVING pode ser adicionado
        // Aqui suportamos HAVING básico via GroupByDto.Agregacao não nula (exemplo simples)

        // 7. ORDER BY
        if (req.OrderBy != null && req.OrderBy.Count > 0)
        {
            sqlBuilder.Append("\nORDER BY ");
            var orderParts = new List<string>();
            foreach (var ob in req.OrderBy)
            {
                var tabelaRef = req.Tabelas.FirstOrDefault(t => t.EndsWith("." + ob.Coluna) || t == ob.Coluna);
                var alias = tabelaRef != null ? tabelasAlias[tabelaRef] : tabelasAlias[req.Tabelas[0]];
                orderParts.Add($"[{alias}].[{ob.Coluna}] {(ob.Ascendente ? "ASC" : "DESC")}");
            }
            sqlBuilder.Append(string.Join(", ", orderParts));
        }

        // 8. TOP/LIMIT
        if (req.Limite.HasValue && req.Limite.Value > 0)
        {
            sqlBuilder.Append($"\nTOP {req.Limite.Value}");
        }

        var sqlFinal = sqlBuilder.ToString().Trim();
        return new DatabaseQueryBuilderResult(sqlFinal, tabelasValidas, joinsUsados, null);
    }

    private string MontarCondicaoWhere(WhereConditionDto wc, Dictionary<string, string> tabelasAlias)
    {
        // Determinar de qual tabela a coluna vem (pode estar qualificada como tabela.coluna)
        string tabelaAlias;
        string coluna;
        if (wc.Coluna.Contains("."))
        {
            var partes = wc.Coluna.Split('.');
            var nomeTabela = partes[0];
            coluna = partes[1];
            tabelaAlias = tabelasAlias.FirstOrDefault(kvp => kvp.Key.EndsWith("." + nomeTabela) || kvp.Key == nomeTabela).Value;
        }
        else
        {
            tabelaAlias = tabelasAlias.Values.First(); // Primeira tabela por padrão
            coluna = wc.Coluna;
        }

        return wc.Logica switch
        {
            "OR" => $"OR ",
            _ => string.Empty // "AND" é o padrão, mas o primeiro elemento não precisa de AND
        };
    }

    private string MontarCondicaoWhereDetalhada(WhereConditionDto wc, Dictionary<string, string> tabelasAlias)
    {
        string tabelaAlias;
        string coluna;
        if (wc.Coluna.Contains("."))
        {
            var partes = wc.Coluna.Split('.');
            var nomeTabela = partes[0];
            coluna = partes[1];
            tabelaAlias = tabelasAlias.FirstOrDefault(kvp =>
                kvp.Key.EndsWith("." + nomeTabela) || kvp.Key == nomeTabela).Value;
        }
        else
        {
            tabelaAlias = tabelasAlias.Values.First();
            coluna = wc.Coluna;
        }

        var colunaRef = $"[{tabelaAlias}].[{coluna}]";
        var logica = wc.Logica?.ToUpper() == "OR" ? "OR " : "";

        return wc.Operador?.ToUpper() switch
        {
            "=" => $"{logica}{colunaRef} = '{EscaparSql(wc.Valor)}'",
            "<>" => $"{logica}{colunaRef} <> '{EscaparSql(wc.Valor)}'",
            ">" => $"{logica}{colunaRef} > {EscaparSql(wc.Valor)}",
            "<" => $"{logica}{colunaRef} < {EscaparSql(wc.Valor)}",
            ">=" => $"{logica}{colunaRef} >= {EscaparSql(wc.Valor)}",
            "<=" => $"{logica}{colunaRef} <= {EscaparSql(wc.Valor)}",
            "LIKE" => $"{logica}{colunaRef} LIKE '{EscaparSql(wc.Valor)}'",
            "IN" => $"{logica}{colunaRef} IN ({EscaparSql(wc.Valor)})",
            "IS NULL" => $"{logica}{colunaRef} IS NULL",
            "IS NOT NULL" => $"{logica}{colunaRef} IS NOT NULL",
            "BETWEEN" => $"{logica}{colunaRef} BETWEEN {EscaparSql(wc.Valor)} AND {EscaparSql(wc.Valor2)}",
            _ => $"{logica}{colunaRef} = '{EscaparSql(wc.Valor)}'"
        };
    }

    private static string EscaparSql(string? valor)
    {
        if (string.IsNullOrEmpty(valor)) return "NULL";
        // Escapar aspas simples para segurança
        return $"'{valor.Replace("'", "''")}'";
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