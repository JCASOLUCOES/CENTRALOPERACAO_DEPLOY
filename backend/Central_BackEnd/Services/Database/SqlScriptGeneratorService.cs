using System.Text;
using System.Text.RegularExpressions;
using Central_BackEnd.Dtos.Database;
using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

/// <summary>
/// Gera scripts SQL de correcao a partir da comparacao de schemas.
/// DIRECAO: somente CRIACOES definidas pelo ARQUIVO (tabela/coluna/indice/FK que
/// existem no arquivo e nao no banco JCA). Divergencias de definicao e objetos
/// presentes apenas no banco seguem o PADRAO DO BANCO CONECTADO: nenhum script.
/// NUNCA executa nada no banco; apenas monta, classifica o risco e valida estaticamente.
/// </summary>
public interface ISqlScriptGeneratorService
{
    /// <summary>Geracao no modo tabela unica.</summary>
    SqlScriptResultDto GerarScripts(SchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null);

    /// <summary>Geracao no modo banco inteiro (bulk).</summary>
    SqlScriptResultDto GerarScriptsBulk(BulkSchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null);

    /// <summary>Validacao estatica de um script: nada e executado no SQL Server.</summary>
    Task<ValidarScriptResultDto> ValidarScriptAsync(string? sql, CancellationToken ct = default);
}

public class SqlScriptGeneratorService : ISqlScriptGeneratorService
{
    private readonly IDatabaseConnectionService _conn;
    private readonly ILogger<SqlScriptGeneratorService> _logger;

    public SqlScriptGeneratorService(
        IDatabaseConnectionService conn,
        ILogger<SqlScriptGeneratorService> logger)
    {
        _conn = conn;
        _logger = logger;
    }

    // =====================================================================
    // Geracao
    // =====================================================================

    public SqlScriptResultDto GerarScripts(SchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null)
    {
        if (resultado == null)
            throw new ArgumentException("Resultado da comparacao e obrigatorio.");
        if (string.IsNullOrWhiteSpace(resultado.Tabela))
            throw new ArgumentException("Tabela do resultado da comparacao e obrigatoria.");

        var acc = new Acc();
        acc.RegistrarTabela(resultado.Tabela);
        ProcessarTabela(acc, resultado.Tabela, resultado.Diferencas,
            resultado.SchemaArquivo, resultado.SchemaJca);
        return Finalizar(acc);
    }

    public SqlScriptResultDto GerarScriptsBulk(BulkSchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null)
    {
        if (resultado == null)
            throw new ArgumentException("Resultado da comparacao e obrigatorio.");
        if (resultado.Tabelas == null || resultado.Tabelas.Count == 0)
            throw new ArgumentException("Resultado da comparacao nao contem tabelas para gerar scripts.");

        var acc = new Acc();
        foreach (var t in resultado.Tabelas)
        {
            acc.RegistrarTabela(t.Tabela);
            switch (t.Status)
            {
                case "SomenteArquivo":
                    GerarCriacaoTabela(acc, t.Tabela, t.SchemaArquivo);
                    break;
                case "Diferencas":
                    ProcessarTabela(acc, t.Tabela, t.Diferencas, t.SchemaArquivo, t.SchemaJca);
                    break;
                // "SomenteBanco": padrao do banco conectado - nenhuma acao gerada.
            }
        }
        return Finalizar(acc);
    }

    // =====================================================================
    // Processamento de uma tabela com diferencas
    // =====================================================================

    private void ProcessarTabela(Acc a, string tabela, List<SchemaDifferenceDto>? difs,
        SchemaInfoDto? arquivo, SchemaInfoDto? jca)
    {
        difs ??= new List<SchemaDifferenceDto>();

        var uteis = difs
            .Where(d => d.Severidade != "Ok" && !EhDuplicada(d))
            .ToList();

        // Sem o schema do arquivo nao da para montar criacoes com seguranca.
        if (arquivo == null || arquivo.Colunas.Count == 0)
        {
            a.RevisaoManual.Add(
                $"'{tabela}': sem definicao no arquivo; nenhuma criacao foi gerada. " +
                "Divergencias e itens presentes apenas no banco seguem o padrao do banco conectado.");
            return;
        }

        var jcaPorNome = jca != null ? PorNome(jca.Colunas, c => c.Nome) : null;

        // 1) ADD COLUMN: coluna no arquivo ausente no banco JCA
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var col in arquivo.Colunas)
        {
            if (!vistos.Add(col.Nome)) continue; // coluna duplicada no arquivo: usa so a primeira
            bool existeNoBanco = jcaPorNome != null
                ? jcaPorNome.ContainsKey(col.Nome)
                : uteis.Any(d => d.Categoria == "Coluna"
                    && d.Campo.Equals(col.Nome, StringComparison.OrdinalIgnoreCase)
                    && d.Esperado != null);
            if (!existeNoBanco)
                GerarAddColuna(a, tabela, col);
        }

        // 2) Indices novos: somente os que existem no arquivo e nao no banco.
        //    Indice divergente ou presente apenas no banco segue o padrao do banco (sem script).
        if (arquivo.Indices.Count > 0)
        {
            foreach (var d in uteis.Where(x => x.Categoria == "Indice"))
            {
                if (d.Esperado != null || d.Encontrado == null) continue;
                var alvoIdx = arquivo.Indices.FirstOrDefault(i =>
                    i.Nome.Equals(d.Campo, StringComparison.OrdinalIgnoreCase));
                if (alvoIdx != null)
                    GerarIndice(a, tabela, d.Campo, alvoIdx, d.Severidade);
            }
        }

        // 3) Foreign keys novas: somente as que existem no arquivo e nao no banco.
        if (arquivo.Fks.Count > 0)
        {
            foreach (var d in uteis.Where(x => x.Categoria == "Fk"))
            {
                if (d.Esperado != null || d.Encontrado == null) continue;
                var alvoFk = arquivo.Fks.FirstOrDefault(f =>
                    f.Nome.Equals(d.Campo, StringComparison.OrdinalIgnoreCase));
                if (alvoFk != null)
                    GerarFk(a, tabela, d.Campo, alvoFk, d.Severidade);
            }
        }
    }

    // =====================================================================
    // Criacao de tabela (somente no arquivo)
    // =====================================================================

    private void GerarCriacaoTabela(Acc a, string tabela, SchemaInfoDto? arquivo)
    {
        if (arquivo == null || arquivo.Colunas.Count == 0)
        {
            a.RevisaoManual.Add(
                $"'{tabela}': existe apenas no arquivo, mas o resultado nao trouxe as colunas; " +
                "refaca a comparacao para gerar o CREATE TABLE.");
            return;
        }

        var nome = Qualificar(tabela);
        var pk = arquivo.Indices.FirstOrDefault(i =>
            i.Nome.StartsWith("PK", StringComparison.OrdinalIgnoreCase) && i.Colunas.Count > 0);

        var comentarios = new List<string>
        {
            $"-- Cria a tabela {nome} (existe apenas no arquivo; nao existe no banco conectado).",
            "-- Ajuste manualmente IDENTITY/DEFAULT se a origem os possuir: o JSON de origem nao os exporta."
        };

        var linhas = new List<string>();
        bool padraoUsado = false;
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var col in arquivo.Colunas.OrderBy(c => c.Ordem))
        {
            if (!vistos.Add(col.Nome))
                continue;
            var (def, padrao) = DefinicaoColuna(col);
            padraoUsado |= padrao;
            linhas.Add($"    {Bracket(col.Nome)} {def}");
        }
        if (padraoUsado)
            comentarios.Add("-- Tamanho/precisao nao informados no arquivo em alguma coluna: valores padrao aplicados (ajuste manualmente).");
        if (vistos.Count < arquivo.Colunas.Count)
            comentarios.Add("-- O arquivo traz colunas duplicadas; apenas a primeira ocorrencia foi usada.");
        if (pk != null && pk.Colunas.Count > 0)
            linhas.Add($"    CONSTRAINT {Bracket(pk.Nome)} PRIMARY KEY CLUSTERED ({string.Join(", ", pk.Colunas.Select(Bracket))})");

        var stmt = $"CREATE TABLE {nome} (\n{string.Join(",\n", linhas)}\n);";
        var partes = new List<string>(comentarios) { stmt };
        var dto = Montar("CREATE_TABLE", "Info", tabela,
            $"Cria a tabela {nome} no banco JCA (somente no arquivo).",
            partes, ConsultaTabela(tabela), tabela, "Critico");
        Adicionar(a, dto);

        // Indices (alem da PK) e FKs da nova tabela
        foreach (var idx in arquivo.Indices)
        {
            if (ReferenceEquals(idx, pk)) continue;
            GerarIndice(a, tabela, idx.Nome, idx, "Critico", novaTabela: true);
        }
        foreach (var fk in arquivo.Fks)
            GerarFk(a, tabela, fk.Nome, fk, "Critico", novaTabela: true);
    }

    // =====================================================================
    // Colunas: ADD
    // =====================================================================

    private void GerarAddColuna(Acc a, string tabela, SchemaColumnInfoDto col)
    {
        var nome = Qualificar(tabela);
        var (def, padrao) = DefinicaoColuna(col);
        var comentarios = new List<string>
        {
            $"-- Adiciona a coluna '{col.Nome}' em {nome} conforme o arquivo: {def}.",
            "-- Execute apos a criacao da tabela, se ela tambem entrar neste lote."
        };
        if (padrao)
            comentarios.Add("-- Tamanho/precisao nao informado no arquivo: valor padrao aplicado (ajuste manualmente).");
        if (!col.Nulo)
            comentarios.Add("-- Atencao: NOT NULL em tabela ja populada exige valores preenchidos; trate os nulos antes de executar.");

        var stmt = $"ALTER TABLE {nome} ADD {Bracket(col.Nome)} {def};";
        var partes = new List<string>(comentarios) { stmt };
        var sev = col.Nulo ? "Info" : "Aviso";
        var dto = Montar("ADD_COLUMN", sev, col.Nome,
            $"Adiciona a coluna '{col.Nome}' em {nome} com a definicao do arquivo.",
            partes, ConsultaColuna(tabela, col.Nome), tabela, "Critico");
        Adicionar(a, dto);
    }

    // =====================================================================
    // Indices
    // =====================================================================

    private void GerarIndice(Acc a, string tabela, string nomeIndice,
        SchemaIndexInfoDto alvo, string severidadeOrigem, bool novaTabela = false)
    {
        var nome = Qualificar(tabela);
        var criar = SqlIndice(alvo, nome);
        var cabecalho = new List<string>
        {
            $"-- Cria o indice '{nomeIndice}' em {nome} conforme o arquivo.",
            "-- clustered/nonclustered nao exportado no JSON: padrao NONCLUSTERED."
        };
        if (novaTabela)
            cabecalho.Add("-- Execute apos o CREATE TABLE desta tabela.");
        else
            cabecalho.Add("-- Execute apos os scripts de coluna (aba Alteracoes).");

        var partes = new List<string>(cabecalho) { criar };
        var dto = Montar("CREATE_INDEX", "Info", nomeIndice,
            $"Cria o indice '{nomeIndice}' em {nome} (existe no arquivo, nao no banco).",
            partes, ConsultaIndice(tabela, nomeIndice), tabela, severidadeOrigem);
        Adicionar(a, dto);
    }

    private static string SqlIndice(SchemaIndexInfoDto idx, string tabela)
    {
        var uniq = idx.Unique ? "UNIQUE " : "";
        var cols = string.Join(", ", idx.Colunas.Select(Bracket));
        return $"CREATE {uniq}NONCLUSTERED INDEX {Bracket(idx.Nome)} ON {tabela} ({cols});";
    }

    // =====================================================================
    // Foreign keys
    // =====================================================================

    private void GerarFk(Acc a, string tabela, string nomeFk,
        SchemaFkInfoDto alvo, string severidadeOrigem, bool novaTabela = false)
    {
        var nome = Qualificar(tabela);
        var destino = Qualificar(alvo.TabelaDestino);
        var criar = $"ALTER TABLE {nome} ADD CONSTRAINT {Bracket(alvo.Nome)} " +
                    $"FOREIGN KEY ({Bracket(alvo.ColunaOrigem)}) " +
                    $"REFERENCES {destino} ({Bracket(alvo.ColunaDestino)});";

        var cabecalho = new List<string>
        {
            $"-- Cria a FK '{alvo.Nome}' em {nome}: {alvo.ColunaOrigem} -> {destino}.{alvo.ColunaDestino}.",
            $"-- Confirme que a tabela destino {destino} existe no banco alvo."
        };
        if (novaTabela)
            cabecalho.Add("-- Execute apos o CREATE TABLE desta tabela e da tabela destino.");
        else
            cabecalho.Add("-- Execute apos os scripts de coluna (aba Alteracoes).");

        var partes = new List<string>(cabecalho) { criar };
        var dto = Montar("ALTER_FK", "Info", nomeFk,
            $"Cria a FK '{nomeFk}' em {nome} (existe no arquivo, nao no banco).",
            partes, ConsultaFk(nomeFk), tabela, severidadeOrigem);
        Adicionar(a, dto);
    }

    // =====================================================================
    // Montagem / acumulador
    // =====================================================================

    private sealed class Acc
    {
        public readonly List<SqlScriptDto> Criacao = new();
        public readonly List<SqlScriptDto> Alteracao = new();
        public readonly List<SqlScriptDto> IndiceConstraint = new();
        public readonly List<string> RevisaoManual = new();
        public readonly Dictionary<string, int> OrdemTabelas = new(StringComparer.OrdinalIgnoreCase);

        public void RegistrarTabela(string tabela)
        {
            if (string.IsNullOrWhiteSpace(tabela) || OrdemTabelas.ContainsKey(tabela)) return;
            OrdemTabelas[tabela] = OrdemTabelas.Count;
        }

        public int OrdemDaTabela(string? tabela)
            => tabela != null && OrdemTabelas.TryGetValue(tabela, out var i) ? i : int.MaxValue;
    }

    private static SqlScriptDto Montar(string tipo, string severidade, string campo,
        string descricao, List<string> partes, string? consulta,
        string? tabela = null, string? severidadeOrigem = null)
    {
        var sql = string.Join("\n", partes);
        var sqlFormatado = string.Join("\n\n", partes);
        return new SqlScriptDto(NovoId(tipo), tipo, severidade, sql, sqlFormatado,
            descricao, campo, consulta, tabela, severidadeOrigem);
    }

    private static void Adicionar(Acc a, SqlScriptDto dto)
    {
        switch (dto.Tipo)
        {
            case "CREATE_TABLE":
                a.Criacao.Add(dto);
                break;
            case "CREATE_INDEX":
            case "ALTER_FK":
                a.IndiceConstraint.Add(dto);
                break;
            default:
                a.Alteracao.Add(dto);
                break;
        }
    }

    private SqlScriptResultDto Finalizar(Acc a)
    {
        var criacao = Ordenar(a, a.Criacao).ToList();
        var alteracao = Ordenar(a, a.Alteracao).ToList();
        var indices = Ordenar(a, a.IndiceConstraint).ToList();
        var todos = criacao.Concat(alteracao).Concat(indices).ToList();

        var impacto = Impacto(todos);
        var avisos = todos.Count(s => s.Severidade != "Info");

        _logger.LogInformation(
            "Scripts SQL gerados: {Criacoes} criacoes, {Alteracoes} alteracoes, {Indices} indices/FKs, impacto {Impacto}",
            criacao.Count, alteracao.Count, indices.Count, impacto);

        return new SqlScriptResultDto(criacao, alteracao, indices,
            new SqlScriptResumoDto(criacao.Count, alteracao.Count, indices.Count,
                impacto, avisos, a.RevisaoManual));
    }

    // Ordem: tabelas na sequencia de processamento (primeiro a tbA, depois a tbB...)
    // e, dentro da mesma tabela, por tipo de script (criacao -> adicao -> indice/FK).
    private static IEnumerable<SqlScriptDto> Ordenar(Acc a, List<SqlScriptDto> lista)
        => lista.OrderBy(s => a.OrdemDaTabela(s.Tabela)).ThenBy(s => Ordem(s.Tipo));

    private static int Ordem(string tipo) => tipo switch
    {
        "CREATE_TABLE" => 1,
        "ADD_COLUMN" => 2,
        "ALTER_COLUMN" => 3,
        "ALTER_TYPE" => 4,
        "DROP_COLUMN" => 5,
        "DROP_TABLE" => 6,
        "CREATE_INDEX" => 7,
        "DROP_INDEX" => 8,
        "ALTER_FK" => 9,
        _ => 99
    };

    private static string Impacto(List<SqlScriptDto> todos)
    {
        if (todos.Any(s => s.Tipo == "CREATE_TABLE")) return "Medium";
        return "Low";
    }

    private static string NovoId(string tipo)
        => $"{tipo.ToLowerInvariant()}-{Guid.NewGuid().ToString("N")[..8]}";

    // =====================================================================
    // Definicao de coluna / tipos
    // =====================================================================

    private static (string Sql, bool Padrao) DefinicaoColuna(SchemaColumnInfoDto col)
    {
        var tipo = TipoSql(col, out bool padrao);
        var partes = new List<string> { tipo };
        var def = DefaultTexto(col);
        if (def != null)
            partes.Add("DEFAULT " + def);
        partes.Add(col.Nulo ? "NULL" : "NOT NULL");
        return (string.Join(" ", partes), padrao);
    }

    /// <summary>
    /// Monta o tipo SQL de uma coluna. Usa sempre os campos estruturados
    /// (Tamanho/Precisao/Escala) - nunca a string descricao, que pode ter
    /// dois grupos de parenteses (ex.: varchar(255)(255,0)).
    /// </summary>
    private static string TipoSql(SchemaColumnInfoDto c, out bool padrao)
    {
        padrao = false;
        var tipo = (c.Tipo ?? "").Trim();
        if (tipo.Length == 0) return "int";
        if (tipo.Contains('('))
            return tipo.ToLowerInvariant();

        var b = tipo.ToLowerInvariant();
        switch (b)
        {
            case "char" or "nchar" or "binary":
                if (c.Tamanho is > 0) return $"{b}({c.Tamanho})";
                padrao = true;
                return b switch
                {
                    "char" => "char(1)",
                    "nchar" => "nchar(1)",
                    _ => "binary(1)"
                };
            case "varchar" or "nvarchar" or "varbinary":
                if (c.Tamanho is -1) return $"{b}(max)";
                if (c.Tamanho is > 0) return $"{b}({c.Tamanho})";
                padrao = true;
                return $"{b}(max)";
            case "decimal" or "numeric":
                if (c.Precisao is > 0) return $"{b}({c.Precisao},{c.Escala ?? 0})";
                padrao = true;
                return $"{b}(18,0)";
            default:
                return b;
        }
    }

    private static string? DefaultTexto(SchemaColumnInfoDto c)
    {
        var v = (c.ValorDefault ?? "").Trim();
        if (v.Length == 0) return null;
        if (v.StartsWith("DEFAULT ", StringComparison.OrdinalIgnoreCase))
            v = v["DEFAULT ".Length..].Trim();
        if (v.Length == 0) return null;
        if (v.StartsWith("(") || v.StartsWith("'")) return v;
        if (double.TryParse(v, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out _)) return v;
        if (v.Equals("getdate", StringComparison.OrdinalIgnoreCase)
            || v.Equals("getutcdate", StringComparison.OrdinalIgnoreCase)
            || v.Equals("newid", StringComparison.OrdinalIgnoreCase)
            || v.Equals("sysdatetime", StringComparison.OrdinalIgnoreCase))
            return $"({v}())";
        return $"'{v.Replace("'", "''")}'";
    }

    // =====================================================================
    // Qualificacao de identificadores
    // =====================================================================

    private static string Bracket(string ident) => "[" + (ident ?? "").Replace("]", "]]") + "]";

    private static string Qualificar(string tabela)
    {
        var t = (tabela ?? "").Trim();
        var p = t.IndexOf('.');
        if (p >= 0) return $"{Bracket(t[..p].Trim())}.{Bracket(t[(p + 1)..].Trim())}";
        return $"[dbo].{Bracket(t)}";
    }

    private static string IdTabela(string tabela)
    {
        var t = (tabela ?? "").Trim();
        var p = t.IndexOf('.');
        if (p >= 0) return $"{t[..p].Trim()}.{t[(p + 1)..].Trim()}";
        return $"dbo.{t}";
    }

    private static string ExtrairNome(string tabela)
    {
        var t = (tabela ?? "").Trim();
        var p = t.IndexOf('.');
        return p >= 0 ? t[(p + 1)..].Trim() : t;
    }

    private static string Esc(string? s) => (s ?? "").Replace("'", "''");

    private static bool EhDuplicada(SchemaDifferenceDto d)
        => d.Descricao != null && d.Descricao.Contains("duplicad", StringComparison.OrdinalIgnoreCase);

    private static Dictionary<string, T> PorNome<T>(IEnumerable<T> itens, Func<T, string> nomeDe)
    {
        var mapa = new Dictionary<string, T>(StringComparer.OrdinalIgnoreCase);
        foreach (var i in itens)
        {
            var n = nomeDe(i);
            if (!mapa.ContainsKey(n)) mapa[n] = i;
        }
        return mapa;
    }

    // =====================================================================
    // Consultas de validacao (o usuario roda depois do script)
    // =====================================================================

    private static string ConsultaColuna(string tabela, string coluna)
        => "SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH " +
           $"FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{Esc(ExtrairNome(tabela))}' " +
           $"AND COLUMN_NAME = '{Esc(coluna)}';";

    private static string ConsultaTabela(string tabela)
        => $"SELECT CASE WHEN OBJECT_ID(N'{Esc(IdTabela(tabela))}', N'U') IS NULL " +
           "THEN 'REMOVIDA' ELSE 'AINDA EXISTE' END AS Situacao;";

    private static string ConsultaIndice(string tabela, string indice)
        => $"SELECT name FROM sys.indexes WHERE name = N'{Esc(indice)}' " +
           $"AND object_id = OBJECT_ID(N'{Esc(IdTabela(tabela))}');";

    private static string ConsultaFk(string fk)
        => $"SELECT name FROM sys.foreign_keys WHERE name = N'{Esc(fk)}';";

    // =====================================================================
    // Validacao estatica (nada e executado no banco)
    // =====================================================================

    private static readonly HashSet<string> Verbos = new(StringComparer.OrdinalIgnoreCase)
    {
        "SELECT", "INSERT", "UPDATE", "DELETE", "MERGE", "CREATE", "ALTER", "DROP",
        "TRUNCATE", "EXEC", "EXECUTE", "WITH", "BEGIN", "END", "IF", "ELSE", "WHILE",
        "RETURN", "PRINT", "DECLARE", "SET", "USE", "GRANT", "DENY", "REVOKE", "GO",
        "DBCC", "BULK", "VALUES", "OPEN", "FETCH", "CLOSE", "DEALLOCATE", "EXPLAIN"
    };

    private static readonly HashSet<string> Objetos = new(StringComparer.OrdinalIgnoreCase)
    {
        "TABLE", "INDEX", "VIEW", "PROCEDURE", "PROC", "FUNCTION", "TRIGGER", "SCHEMA",
        "DATABASE", "UNIQUE", "STATISTICS", "TYPE", "DEFAULT", "RULE", "SEQUENCE",
        "FULLTEXT", "CONSTRAINT", "FOREIGN"
    };

    private static readonly HashSet<string> SchemasIgnorados = new(StringComparer.OrdinalIgnoreCase)
    {
        "sys", "INFORMATION_SCHEMA", "guest"
    };

    public async Task<ValidarScriptResultDto> ValidarScriptAsync(string? sql, CancellationToken ct = default)
    {
        var erros = new List<string>();
        var avisos = new List<string>();

        if (string.IsNullOrWhiteSpace(sql))
        {
            erros.Add("Script vazio: informe o SQL para validar.");
            return new ValidarScriptResultDto(false, erros, avisos);
        }

        var (limpo, erroLex) = LimparSql(sql);
        if (erroLex != null) erros.Add(erroLex);
        if (erros.Count > 0) return new ValidarScriptResultDto(false, erros, avisos);

        if (limpo.Trim().Length == 0)
        {
            avisos.Add("Script contem apenas comentarios: nenhuma instrucao sera executada.");
            return new ValidarScriptResultDto(true, erros, avisos);
        }

        var instrucoes = limpo.Split(';')
            .Select(s => Regex.Replace(s.Trim(), @"\s+", " "))
            .Where(s => s.Length > 0 && !s.Equals("GO", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (instrucoes.Count == 0)
        {
            avisos.Add("Script contem apenas comentarios: nenhuma instrucao sera executada.");
            return new ValidarScriptResultDto(true, erros, avisos);
        }

        foreach (var inst in instrucoes)
            ValidarInstrucao(inst, erros, avisos);

        if (erros.Count == 0)
            await ChecarTabelasAsync(limpo, avisos, ct);

        return new ValidarScriptResultDto(erros.Count == 0, erros, avisos);
    }

    /// <summary>Remove comentarios e literais; acusa comentarios/aspas/parenteses mal fechados.</summary>
    private static (string Limpo, string? Erro) LimparSql(string sql)
    {
        var sb = new StringBuilder(sql.Length);
        int parenteses = 0;

        for (int i = 0; i < sql.Length; i++)
        {
            char c = sql[i];

            if (c == '-' && i + 1 < sql.Length && sql[i + 1] == '-')
            {
                while (i < sql.Length && sql[i] != '\n') i++;
                if (i < sql.Length) sb.Append('\n');
                continue;
            }

            if (c == '/' && i + 1 < sql.Length && sql[i + 1] == '*')
            {
                int fim = sql.IndexOf("*/", i + 2, StringComparison.Ordinal);
                if (fim < 0)
                    return (sb.ToString(), "Comentario de bloco '/*' nao foi fechado.");
                for (int k = i; k < fim + 2; k++)
                    if (sql[k] == '\n') sb.Append('\n');
                i = fim + 1;
                continue;
            }

            if (c == '\'' || c == '"')
            {
                char aspa = c;
                int j = i + 1;
                bool fechada = false;
                while (j < sql.Length)
                {
                    if (sql[j] == aspa)
                    {
                        if (j + 1 < sql.Length && sql[j + 1] == aspa) { j += 2; continue; }
                        fechada = true;
                        break;
                    }
                    j++;
                }
                if (!fechada)
                    return (sb.ToString(), aspa == '\''
                        ? "Literal de texto (aspas simples) nao fechado."
                        : "Identificador entre aspas duplas nao fechado.");
                sb.Append(aspa).Append(aspa);
                i = j;
                continue;
            }

            if (c == '(') parenteses++;
            else if (c == ')')
            {
                parenteses--;
                if (parenteses < 0)
                    return (sb.ToString(), "Parentesen ')' sem abrir correspondente.");
            }

            sb.Append(c);
        }

        if (parenteses > 0)
            return (sb.ToString(), $"Parenteses aberto(s) sem fechamento: {parenteses}.");
        return (sb.ToString(), null);
    }

    private static void ValidarInstrucao(string inst, List<string> erros, List<string> avisos)
    {
        var partes = inst.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (partes.Length == 0) return;
        var primeiro = partes[0];

        if (primeiro.StartsWith("sp_", StringComparison.OrdinalIgnoreCase)
            || primeiro.StartsWith("xp_", StringComparison.OrdinalIgnoreCase))
            return;

        if (!Verbos.Contains(primeiro))
        {
            erros.Add($"Instrucao nao reconhecida: '{Curtir(inst, 60)}'. Verifique o comando.");
            return;
        }

        if (primeiro is "CREATE" or "ALTER" or "DROP")
        {
            if (partes.Length < 2)
            {
                erros.Add($"'{primeiro}' sem objeto especificado (ex.: {primeiro} TABLE ...).");
                return;
            }
            if (!Objetos.Contains(partes[1]))
                erros.Add($"Objeto '{partes[1]}' nao reconhecido apos '{primeiro}' " +
                          "(esperado TABLE, INDEX, VIEW, PROCEDURE, CONSTRAINT ...).");
        }

        var alto = " " + inst.ToUpperInvariant() + " ";
        if (alto.Contains("DROP TABLE "))
            avisos.Add($"DROP TABLE em '{Curtir(inst, 70)}': remove a tabela e TODOS os dados.");
        if (alto.Contains("DROP COLUMN "))
            avisos.Add("Exclusao de coluna: os dados da coluna serao perdidos.");
        if (alto.Contains("TRUNCATE "))
            avisos.Add("TRUNCATE TABLE apaga todos os dados da tabela.");
        if ((alto.StartsWith(" DELETE ") || alto.StartsWith(" UPDATE "))
            && !alto.Contains(" WHERE "))
            avisos.Add($"'{primeiro}' sem clausula WHERE: afetara todos os registros da tabela.");
    }

    private static string Curtir(string s, int max)
        => s.Length <= max ? s : s[..max] + "...";

    private async Task ChecarTabelasAsync(string sqlLimpo, List<string> avisos, CancellationToken ct)
    {
        HashSet<string> existentes;
        try
        {
            existentes = await CarregarTabelasAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Validacao sem checagem de tabelas (banco indisponivel)");
            avisos.Add("Checagem de tabelas ignorada: banco conectado indisponivel.");
            return;
        }

        var jaAvisadas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in RefTabelaRx.Matches(sqlLimpo))
        {
            var bruto = m.Groups["ref"].Value
                .Replace("[", "").Replace("]", "").Replace("\"", "");
            var partes = bruto.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (partes.Length == 0) continue;

            string? chave = null;
            if (partes.Length >= 2)
            {
                if (SchemasIgnorados.Contains(partes[0])) continue;
                chave = $"{partes[0]}.{partes[1]}";
                if (!existentes.Contains(chave) && existentes.Contains(partes[1]))
                    chave = partes[1]; // schema diferente do padrao mas a tabela existe
            }
            else
            {
                var unica = partes[0];
                if (unica.StartsWith('#') || unica.StartsWith('@')) continue;
                chave = unica;
            }

            if (existentes.Contains(chave) || !jaAvisadas.Add(chave)) continue;
            avisos.Add($"Tabela '{chave}' nao encontrada no banco conectado " +
                       "(confirme se e CTE, tabela temporaria ou outro schema).");
        }
    }

    private static readonly Regex RefTabelaRx = new(
        @"\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?<ref>(?:\[[^\]]+\]|""[^""]+""|[A-Za-z_][\w$#]*)" +
        @"(?:\s*\.\s*(?:\[[^\]]+\]|""[^""]+""|[A-Za-z_][\w$#]*))*)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private async Task<HashSet<string>> CarregarTabelasAsync(CancellationToken ct)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(
            "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES " +
            "WHERE TABLE_TYPE = 'BASE TABLE'", c);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            set.Add(r.GetString(1));
            set.Add($"{r.GetString(0)}.{r.GetString(1)}");
        }
        return set;
    }
}
