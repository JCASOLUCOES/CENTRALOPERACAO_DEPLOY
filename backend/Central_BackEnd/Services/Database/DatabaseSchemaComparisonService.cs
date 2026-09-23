using System.Globalization;
using System.Text;
using System.Text.Json;
using Central_BackEnd.Dtos.Database;
using Microsoft.AspNetCore.Http;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseSchemaComparisonService
{
    Task<SchemaComparisonResultDto> CompararComArquivoAsync(
        string schema, string tabela, IFormFile arquivo, CancellationToken ct = default);
}

public class DatabaseSchemaComparisonService : IDatabaseSchemaComparisonService
{
    private readonly IDatabaseMetadataService _metadata;
    private readonly ILogger<DatabaseSchemaComparisonService> _logger;

    private static readonly string[] ExtencoesAceitas = { ".csv", ".json" };
    private const long TamanhoMaximoBytes = 5 * 1024 * 1024; // 5 MB

    public DatabaseSchemaComparisonService(
        IDatabaseMetadataService metadata,
        ILogger<DatabaseSchemaComparisonService> logger)
    {
        _metadata = metadata;
        _logger = logger;
    }

    public async Task<SchemaComparisonResultDto> CompararComArquivoAsync(
        string schema, string tabela, IFormFile arquivo, CancellationToken ct = default)
    {
        if (arquivo == null || arquivo.Length == 0)
            throw new ArgumentException("Arquivo e obrigatorio.");
        if (arquivo.Length > TamanhoMaximoBytes)
            throw new ArgumentException("Arquivo excede o limite de 5 MB.");
        var ext = Path.GetExtension(arquivo.FileName ?? "").ToLowerInvariant();
        if (!ExtencoesAceitas.Contains(ext))
            throw new ArgumentException("Apenas arquivos .csv ou .json sao aceitos.");

        var jca = await ExtrairSchemaJcaAsync(schema, tabela, ct);
        var externo = await LerArquivoAsync(arquivo, ext, ct);
        return Comparar(jca, externo, arquivo.FileName);
    }

    private async Task<SchemaInfoDto> ExtrairSchemaJcaAsync(string schema, string tabela, CancellationToken ct)
    {
        var tabelas = await _metadata.ListarTabelasAsync(schema, ct);
        var alvo = tabelas.FirstOrDefault(t =>
            string.Equals(t.Nome, tabela, StringComparison.OrdinalIgnoreCase));
        if (alvo == null)
            throw new ArgumentException($"Tabela '{schema}.{tabela}' nao encontrada.");

        var cols = await _metadata.ListarColunasAsync(alvo.Schema, alvo.Nome, ct);
        var idxs = await _metadata.ListarIndicesAsync(alvo.Schema, alvo.Nome, ct);
        var fks = await _metadata.ListarForeignKeysAsync(alvo.Schema, alvo.Nome, ct);

        return new SchemaInfoDto(
            $"{alvo.Schema}.{alvo.Nome}",
            cols.Select(c => new SchemaColumnInfoDto(
                c.Coluna, c.Tipo, c.Nulo, c.Ordem, c.Tamanho, c.Precisao, c.Escala, c.ValorDefault)).ToList(),
            idxs.Select(i => new SchemaIndexInfoDto(i.Nome, i.Unique, i.Colunas)).ToList(),
            fks.Select(f => new SchemaFkInfoDto(f.Nome, f.ColunaOrigem, f.TabelaDestino, f.ColunaDestino)).ToList());
    }

    private async Task<SchemaInfoDto> LerArquivoAsync(IFormFile arquivo, string ext, CancellationToken ct)
    {
        using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);
        var conteudo = await reader.ReadToEndAsync(ct);

        if (ext == ".json")
            return ParseJson(conteudo, arquivo.FileName ?? "arquivo.json");
        return ParseCsv(conteudo, arquivo.FileName ?? "arquivo.csv");
    }

    private static SchemaInfoDto ParseJson(string json, string nomeArquivo)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Formato: { "tabela": "...", "colunas": [...], "indices": [...], "fks": [...] }
        // ou apenas um array de colunas.
        string tabela = nomeArquivo;
        var colunas = new List<SchemaColumnInfoDto>();
        var indices = new List<SchemaIndexInfoDto>();
        var fks = new List<SchemaFkInfoDto>();

        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var el in root.EnumerateArray())
                colunas.Add(ParseColunaJson(el));
        }
        else
        {
            if (root.TryGetProperty("tabela", out var t))
                tabela = t.GetString() ?? tabela;

            if (root.TryGetProperty("colunas", out var cols) && cols.ValueKind == JsonValueKind.Array)
                foreach (var el in cols.EnumerateArray())
                    colunas.Add(ParseColunaJson(el));

            if (root.TryGetProperty("indices", out var idx) && idx.ValueKind == JsonValueKind.Array)
                foreach (var el in idx.EnumerateArray())
                    indices.Add(ParseIndiceJson(el));

            if (root.TryGetProperty("fks", out var fkEl) && fkEl.ValueKind == JsonValueKind.Array)
                foreach (var el in fkEl.EnumerateArray())
                    fks.Add(ParseFkJson(el));
        }

        return new SchemaInfoDto(tabela, colunas, indices, fks);
    }

    private static SchemaColumnInfoDto ParseColunaJson(JsonElement el)
    {
        string nome = GetString(el, "nome") ?? GetString(el, "name") ?? "";
        string tipo = GetString(el, "tipo") ?? GetString(el, "type") ?? "";
        bool nulo = GetBool(el, "nulo") ?? GetBool(el, "nullable") ?? false;
        int ordem = GetInt(el, "ordem") ?? GetInt(el, "order") ?? 0;
        int? tam = GetInt(el, "tamanho") ?? GetInt(el, "length");
        int? prec = GetInt(el, "precisao") ?? GetInt(el, "precision");
        int? esc = GetInt(el, "escala") ?? GetInt(el, "scale");
        string? def = GetString(el, "valorDefault") ?? GetString(el, "default");
        return new SchemaColumnInfoDto(nome, tipo, nulo, ordem, tam, prec, esc, def);
    }

    private static SchemaIndexInfoDto ParseIndiceJson(JsonElement el)
    {
        string nome = GetString(el, "nome") ?? GetString(el, "name") ?? "";
        bool unique = GetBool(el, "unique") ?? false;
        var colunas = new List<string>();
        if (el.TryGetProperty("colunas", out var c) && c.ValueKind == JsonValueKind.Array)
            foreach (var x in c.EnumerateArray())
                colunas.Add(x.GetString() ?? "");
        else if (el.TryGetProperty("columns", out var c2) && c2.ValueKind == JsonValueKind.Array)
            foreach (var x in c2.EnumerateArray())
                colunas.Add(x.GetString() ?? "");
        return new SchemaIndexInfoDto(nome, unique, colunas);
    }

    private static SchemaFkInfoDto ParseFkJson(JsonElement el)
    {
        string nome = GetString(el, "nome") ?? GetString(el, "name") ?? "";
        string colOrig = GetString(el, "colunaOrigem") ?? GetString(el, "sourceColumn") ?? "";
        string tabDest = GetString(el, "tabelaDestino") ?? GetString(el, "targetTable") ?? "";
        string colDest = GetString(el, "colunaDestino") ?? GetString(el, "targetColumn") ?? "";
        return new SchemaFkInfoDto(nome, colOrig, tabDest, colDest);
    }

    private static string? GetString(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static bool? GetBool(JsonElement el, string prop)
    {
        if (!el.TryGetProperty(prop, out var v)) return null;
        return v.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => bool.TryParse(v.GetString(), out var b) ? b : null,
            _ => null
        };
    }

    private static int? GetInt(JsonElement el, string prop)
    {
        if (!el.TryGetProperty(prop, out var v)) return null;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n)) return n;
        if (v.ValueKind == JsonValueKind.String && int.TryParse(v.GetString(), out var s)) return s;
        return null;
    }

    private static SchemaInfoDto ParseCsv(string conteudo, string nomeArquivo)
    {
        var linhas = conteudo
            .Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.TrimEnd('\r'))
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();
        if (linhas.Count == 0)
            throw new ArgumentException("CSV vazio.");

        var header = SplitCsvLine(linhas[0]);
        var mapa = header
            .Select((h, i) => (h: Normalizar(h), i))
            .ToDictionary(x => x.h, x => x.i, StringComparer.OrdinalIgnoreCase);

        int ColIdx(params string[] nomes)
        {
            foreach (var n in nomes)
                if (mapa.TryGetValue(Normalizar(n), out var idx)) return idx;
            return -1;
        }

        int iNome = ColIdx("nome", "name", "coluna", "column");
        int iTipo = ColIdx("tipo", "type", "datatype");
        int iNulo = ColIdx("nulo", "nullable", "null", "permite_nulo");
        int iOrdem = ColIdx("ordem", "order", "ordinal");
        int iTam = ColIdx("tamanho", "length", "max_length");
        int iPrec = ColIdx("precisao", "precision");
        int iEsc = ColIdx("escala", "scale");
        int iDef = ColIdx("valorDefault", "default", "default_value");

        if (iNome < 0)
            throw new ArgumentException("CSV precisa de coluna 'nome' (ou 'name'/'column').");

        var colunas = new List<SchemaColumnInfoDto>();
        for (int li = 1; li < linhas.Count; li++)
        {
            var campos = SplitCsvLine(linhas[li]);
            string nome = iNome < campos.Length ? campos[iNome].Trim() : "";
            if (string.IsNullOrWhiteSpace(nome)) continue;
            string tipo = iTipo >= 0 && iTipo < campos.Length ? campos[iTipo].Trim() : "";
            bool nulo = iNulo >= 0 && iNulo < campos.Length && ParseBool(campos[iNulo]);
            int ordem = iOrdem >= 0 && iOrdem < campos.Length && int.TryParse(campos[iOrdem], out var o) ? o : colunas.Count + 1;
            int? tam = iTam >= 0 && iTam < campos.Length && int.TryParse(campos[iTam], out var t) ? t : null;
            int? prec = iPrec >= 0 && iPrec < campos.Length && int.TryParse(campos[iPrec], out var p) ? p : null;
            int? esc = iEsc >= 0 && iEsc < campos.Length && int.TryParse(campos[iEsc], out var e) ? e : null;
            string? def = iDef >= 0 && iDef < campos.Length ? campos[iDef].Trim() : null;
            colunas.Add(new SchemaColumnInfoDto(nome, tipo, nulo, ordem, tam, prec, esc,
                string.IsNullOrWhiteSpace(def) ? null : def));
        }

        if (colunas.Count == 0)
            throw new ArgumentException("CSV nao contem colunas validas.");

        return new SchemaInfoDto(nomeArquivo, colunas, new List<SchemaIndexInfoDto>(), new List<SchemaFkInfoDto>());
    }

    private static string Normalizar(string s)
        => new string(s.Trim().ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());

    private static bool ParseBool(string s)
    {
        s = s.Trim().ToLowerInvariant();
        return s is "true" or "1" or "sim" or "s" or "y" or "yes" or "not null" or "notnull";
    }

    private static string[] SplitCsvLine(string linha)
    {
        var result = new List<string>();
        var sb = new StringBuilder();
        bool inQuotes = false;
        for (int i = 0; i < linha.Length; i++)
        {
            char ch = linha[i];
            if (ch == '"')
            {
                if (inQuotes && i + 1 < linha.Length && linha[i + 1] == '"')
                {
                    sb.Append('"');
                    i++;
                }
                else inQuotes = !inQuotes;
            }
            else if (ch == ',' && !inQuotes)
            {
                result.Add(sb.ToString());
                sb.Clear();
            }
            else sb.Append(ch);
        }
        result.Add(sb.ToString());
        return result.ToArray();
    }

    private static SchemaComparisonResultDto Comparar(SchemaInfoDto jca, SchemaInfoDto externo, string? nomeArquivo)
    {
        var difs = new List<SchemaDifferenceDto>();

        var jcaPorNome = jca.Colunas.ToDictionary(c => c.Nome, StringComparer.OrdinalIgnoreCase);
        var extPorNome = externo.Colunas.ToDictionary(c => c.Nome, StringComparer.OrdinalIgnoreCase);

        // Colunas presentes no JCA mas ausentes no arquivo
        foreach (var col in jca.Colunas)
        {
            if (!extPorNome.TryGetValue(col.Nome, out var extCol))
            {
                difs.Add(new SchemaDifferenceDto("Critico", "Coluna", col.Nome,
                    DescreverColuna(col), null,
                    "Coluna existe no banco JCA mas nao foi encontrada no arquivo."));
                continue;
            }

            // Tipo
            if (!TiposIguais(col.Tipo, extCol.Tipo))
            {
                difs.Add(new SchemaDifferenceDto("Critico", "Tipo", col.Nome,
                    col.Tipo, extCol.Tipo,
                    $"Tipo divergente: JCA '{col.Tipo}' x arquivo '{extCol.Tipo}'."));
            }

            // Nullable
            if (col.Nulo != extCol.Nulo)
            {
                difs.Add(new SchemaDifferenceDto("Aviso", "Nullable", col.Nome,
                    col.Nulo ? "NULL" : "NOT NULL",
                    extCol.Nulo ? "NULL" : "NOT NULL",
                    "Nullable divergente."));
            }

            // Tamanho / precisao / escala (quando aplicavel)
            if (col.Tamanho.HasValue && extCol.Tamanho.HasValue && col.Tamanho != extCol.Tamanho)
            {
                difs.Add(new SchemaDifferenceDto("Aviso", "Tipo", col.Nome,
                    $"tamanho={col.Tamanho}", $"tamanho={extCol.Tamanho}",
                    "Tamanho divergente."));
            }
            if (col.Precisao.HasValue && extCol.Precisao.HasValue && col.Precisao != extCol.Precisao)
            {
                difs.Add(new SchemaDifferenceDto("Aviso", "Tipo", col.Nome,
                    $"precisao={col.Precisao}", $"precisao={extCol.Precisao}",
                    "Precisao divergente."));
            }
            if (col.Escala.HasValue && extCol.Escala.HasValue && col.Escala != extCol.Escala)
            {
                difs.Add(new SchemaDifferenceDto("Aviso", "Tipo", col.Nome,
                    $"escala={col.Escala}", $"escala={extCol.Escala}",
                    "Escala divergente."));
            }

            // Ordem (apenas informativo; so gera aviso se ambos tem ordem definida)
            if (col.Ordem > 0 && extCol.Ordem > 0 && col.Ordem != extCol.Ordem)
            {
                difs.Add(new SchemaDifferenceDto("Aviso", "Ordem", col.Nome,
                    col.Ordem.ToString(), extCol.Ordem.ToString(),
                    "Ordem da coluna divergente."));
            }

            if (!difs.Any(d => d.Campo.Equals(col.Nome, StringComparison.OrdinalIgnoreCase)
                               && d.Severidade != "Ok"))
            {
                difs.Add(new SchemaDifferenceDto("Ok", "Coluna", col.Nome,
                    DescreverColuna(col), DescreverColuna(extCol),
                    "Coluna compativel."));
            }
        }

        // Colunas no arquivo ausentes no JCA
        foreach (var col in externo.Colunas)
        {
            if (!jcaPorNome.ContainsKey(col.Nome))
            {
                difs.Add(new SchemaDifferenceDto("Critico", "Coluna", col.Nome,
                    null, DescreverColuna(col),
                    "Coluna existe no arquivo mas nao existe no banco JCA."));
            }
        }

        // Indices (so compara se o arquivo trouxer indices)
        if (externo.Indices.Count > 0)
        {
            var extIdxPorNome = externo.Indices.ToDictionary(i => i.Nome, StringComparer.OrdinalIgnoreCase);
            foreach (var idx in jca.Indices)
            {
                if (!extIdxPorNome.TryGetValue(idx.Nome, out var extIdx))
                {
                    difs.Add(new SchemaDifferenceDto("Aviso", "Indice", idx.Nome,
                        DescreverIndice(idx), null,
                        "Indice existe no JCA mas nao no arquivo."));
                    continue;
                }
                if (idx.Unique != extIdx.Unique)
                {
                    difs.Add(new SchemaDifferenceDto("Aviso", "Indice", idx.Nome,
                        idx.Unique ? "UNIQUE" : "NONUNIQUE",
                        extIdx.Unique ? "UNIQUE" : "NONUNIQUE",
                        "Unicidade do indice divergente."));
                }
                var jcaCols = string.Join(",", idx.Colunas.Select(c => c.ToLowerInvariant()).OrderBy(c => c));
                var extCols = string.Join(",", extIdx.Colunas.Select(c => c.ToLowerInvariant()).OrderBy(c => c));
                if (jcaCols != extCols)
                {
                    difs.Add(new SchemaDifferenceDto("Aviso", "Indice", idx.Nome,
                        jcaCols, extCols,
                        "Colunas do indice divergentes."));
                }
                if (!difs.Any(d => d.Campo == idx.Nome && d.Severidade != "Ok"))
                    difs.Add(new SchemaDifferenceDto("Ok", "Indice", idx.Nome,
                        DescreverIndice(idx), DescreverIndice(extIdx),
                        "Indice compativel."));
            }
            foreach (var idx in externo.Indices)
            {
                if (!jca.Indices.Any(j => string.Equals(j.Nome, idx.Nome, StringComparison.OrdinalIgnoreCase)))
                    difs.Add(new SchemaDifferenceDto("Aviso", "Indice", idx.Nome,
                        null, DescreverIndice(idx),
                        "Indice existe no arquivo mas nao no JCA."));
            }
        }

        // FKs (so compara se o arquivo trouxer fks)
        if (externo.Fks.Count > 0)
        {
            foreach (var fk in jca.Fks)
            {
                var extFk = externo.Fks.FirstOrDefault(f =>
                    string.Equals(f.Nome, fk.Nome, StringComparison.OrdinalIgnoreCase));
                if (extFk == null)
                {
                    difs.Add(new SchemaDifferenceDto("Aviso", "Fk", fk.Nome,
                        DescreverFk(fk), null,
                        "FK existe no JCA mas nao no arquivo."));
                    continue;
                }
                bool igual = string.Equals(fk.ColunaOrigem, extFk.ColunaOrigem, StringComparison.OrdinalIgnoreCase)
                          && string.Equals(fk.TabelaDestino, extFk.TabelaDestino, StringComparison.OrdinalIgnoreCase)
                          && string.Equals(fk.ColunaDestino, extFk.ColunaDestino, StringComparison.OrdinalIgnoreCase);
                if (!igual)
                {
                    difs.Add(new SchemaDifferenceDto("Critico", "Fk", fk.Nome,
                        DescreverFk(fk), DescreverFk(extFk),
                        "Definicao da FK divergente."));
                }
                else
                {
                    difs.Add(new SchemaDifferenceDto("Ok", "Fk", fk.Nome,
                        DescreverFk(fk), DescreverFk(extFk),
                        "FK compativel."));
                }
            }
            foreach (var fk in externo.Fks)
            {
                if (!jca.Fks.Any(j => string.Equals(j.Nome, fk.Nome, StringComparison.OrdinalIgnoreCase)))
                    difs.Add(new SchemaDifferenceDto("Critico", "Fk", fk.Nome,
                        null, DescreverFk(fk),
                        "FK existe no arquivo mas nao no JCA."));
            }
        }

        int criticos = difs.Count(d => d.Severidade == "Critico");
        int avisos = difs.Count(d => d.Severidade == "Aviso");
        int oks = difs.Count(d => d.Severidade == "Ok");
        int total = criticos + avisos + oks;
        decimal match = total == 0 ? 100m : Math.Round((decimal)oks / total * 100m, 1);

        return new SchemaComparisonResultDto(
            DateTime.UtcNow,
            jca.Tabela,
            nomeArquivo,
            jca.Colunas.Count,
            externo.Colunas.Count,
            criticos, avisos, oks, match, difs);
    }

    private static bool TiposIguais(string a, string b)
    {
        static string Norm(string s)
        {
            s = s.Trim().ToLowerInvariant();
            s = s.Replace("identity", "").Replace("auto_increment", "").Trim();
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\s+", " ");
            return s;
        }
        return Norm(a) == Norm(b);
    }

    private static string DescreverColuna(SchemaColumnInfoDto c)
    {
        var sb = new StringBuilder(c.Tipo);
        if (c.Tamanho.HasValue) sb.Append($"({c.Tamanho})");
        if (c.Precisao.HasValue) sb.Append($"({c.Precisao},{c.Escala ?? 0})");
        sb.Append(c.Nulo ? " NULL" : " NOT NULL");
        return sb.ToString();
    }

    private static string DescreverIndice(SchemaIndexInfoDto i)
        => $"{(i.Unique ? "UNIQUE " : "")}{i.Nome} ({string.Join(", ", i.Colunas)})";

    private static string DescreverFk(SchemaFkInfoDto f)
        => $"{f.ColunaOrigem} -> {f.TabelaDestino}.{f.ColunaDestino}";
}
