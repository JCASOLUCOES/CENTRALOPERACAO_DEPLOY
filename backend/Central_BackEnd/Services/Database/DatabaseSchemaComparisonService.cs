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

    private static readonly string[] ExtencoesAceitas = { ".json" };
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
        ValidarArquivo(arquivo);

        var jca = await ExtrairSchemaJcaAsync(schema, tabela, ct);
        var externo = await LerArquivoAsync(arquivo, ct);
        return Comparar(jca, externo, arquivo.FileName);
    }

    private static void ValidarArquivo(IFormFile arquivo)
    {
        if (arquivo == null || arquivo.Length == 0)
            throw new ArgumentException("Arquivo e obrigatorio.");
        if (arquivo.Length > TamanhoMaximoBytes)
            throw new ArgumentException("Arquivo excede o limite de 5 MB.");
        var ext = Path.GetExtension(arquivo.FileName ?? "").ToLowerInvariant();
        if (!ExtencoesAceitas.Contains(ext))
            throw new ArgumentException("Apenas arquivos .json sao aceitos.");
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

    private async Task<SchemaInfoDto> LerArquivoAsync(IFormFile arquivo, CancellationToken ct)
    {
        using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);
        var conteudo = await reader.ReadToEndAsync(ct);
        return ParseJson(conteudo, arquivo.FileName ?? "arquivo.json");
    }

    private static SchemaInfoDto ParseJson(string json, string nomeArquivo)
    {
        var root = ExtrairRootJson(json);

        if (root.ValueKind == JsonValueKind.Array)
        {
            var colunas = new List<SchemaColumnInfoDto>();
            foreach (var el in root.EnumerateArray())
                colunas.Add(ParseColunaJson(el));
            if (colunas.Count == 0)
                throw new ArgumentException("JSON nao contem colunas validas (propriedade 'colunas' vazia ou ausente).");
            return new SchemaInfoDto(nomeArquivo, colunas,
                new List<SchemaIndexInfoDto>(), new List<SchemaFkInfoDto>());
        }

        if (root.ValueKind == JsonValueKind.Object)
            return ParseJsonObject(root, nomeArquivo);

        throw new ArgumentException(
            "JSON invalido: esperado objeto { tabela, colunas, indices, fks } ou array de colunas.");
    }

    private static SchemaInfoDto ParseJsonObject(JsonElement root, string nomeArquivo)
    {
        string tabela = nomeArquivo;
        if (root.TryGetProperty("tabela", out var t))
            tabela = t.GetString() ?? tabela;

        var colunas = new List<SchemaColumnInfoDto>();
        var indices = new List<SchemaIndexInfoDto>();
        var fks = new List<SchemaFkInfoDto>();

        if (root.TryGetProperty("colunas", out var cols) && cols.ValueKind == JsonValueKind.Array)
            foreach (var el in cols.EnumerateArray())
                colunas.Add(ParseColunaJson(el));

        if (root.TryGetProperty("indices", out var idx) && idx.ValueKind == JsonValueKind.Array)
            foreach (var el in idx.EnumerateArray())
                indices.Add(ParseIndiceJson(el));

        if (root.TryGetProperty("fks", out var fkEl) && fkEl.ValueKind == JsonValueKind.Array)
            foreach (var el in fkEl.EnumerateArray())
                fks.Add(ParseFkJson(el));

        if (colunas.Count == 0)
            throw new ArgumentException("JSON nao contem colunas validas (propriedade 'colunas' vazia ou ausente).");

        return new SchemaInfoDto(tabela, colunas, indices, fks);
    }

    /// <summary>
    /// Aceita JSON "limpo", JSON duplo (string com JSON dentro) e envoltório
    /// estilo CSV/SSMS ("…""…""…"), comuns ao copiar o resultado do FOR JSON.
    /// </summary>
    private static JsonElement ExtrairRootJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            throw new ArgumentException("Arquivo JSON vazio.");

        JsonElement root;
        foreach (var candidato in VariantesConteudoJson(json))
        {
            if (TentarParseJson(candidato, out root))
                return DesembrulharJsonSeNecessario(root);
        }

        throw new ArgumentException(
            "JSON invalido. Esperado objeto { tabela, colunas, indices, fks } ou array de colunas. " +
            "Se o SSMS/Excel embrulhou o valor em aspas ou quebrou a linha no meio, copie o JSON limpo começando por '{'.");
    }

    private static IEnumerable<string> VariantesConteudoJson(string json)
    {
        var base0 = RemoverBom(json.Trim());
        yield return base0;

        // Quebras de linha no meio do JSON (copia quebrada em coluna do SSMS/Excel)
        var semQuebra = RetirarQuebrasForaDeString(base0);
        if (!ReferenceEquals(semQuebra, base0) && semQuebra != base0)
            yield return semQuebra;

        // Artefato: string contendo só CRLF entre ':' e valor literal ("nulo":"\r\n"true)
        var semAspasQuebra = System.Text.RegularExpressions.Regex.Replace(
            semQuebra, "\"[\\r\\n]+\"", "");
        if (semAspasQuebra != semQuebra)
            yield return semAspasQuebra;

        // Envoltório CSV/SSMS: "…""propriedade"":…""…"
        if (base0.Length >= 2 && base0[0] == '"' && base0[^1] == '"')
        {
            var interno = base0
                .Substring(1, base0.Length - 2)
                .Replace("\"\"", "\"");
            yield return interno;

            var internoLimpo = RetirarQuebrasForaDeString(interno);
            yield return internoLimpo;

            var internoSemArtefato = System.Text.RegularExpressions.Regex.Replace(
                internoLimpo, "\"[\\r\\n]+\"", "");
            yield return internoSemArtefato;
        }
    }

    private static string RetirarQuebrasForaDeString(string s)
    {
        var sb = new StringBuilder(s.Length);
        bool emString = false;
        for (int i = 0; i < s.Length; i++)
        {
            var ch = s[i];
            if (ch == '"' && (i == 0 || s[i - 1] != '\\'))
                emString = !emString;
            if (!emString && (ch == '\r' || ch == '\n'))
                continue;
            sb.Append(ch);
        }
        return sb.ToString();
    }

    private static JsonElement DesembrulharJsonSeNecessario(JsonElement root)
    {
        // JSON duplo: root é string contendo outro JSON
        if (root.ValueKind != JsonValueKind.String)
            return root;

        var interno = root.GetString() ?? "";
        if (string.IsNullOrWhiteSpace(interno))
            throw new ArgumentException("JSON invalido: conteudo string vazio.");

        interno = RemoverBom(interno.Trim());
        if (TentarParseJson(interno, out var filho))
            return DesembrulharJsonSeNecessario(filho);

        if (interno.Length >= 2 && interno[0] == '"' && interno[^1] == '"')
        {
            var desescapado = interno
                .Substring(1, interno.Length - 2)
                .Replace("\"\"", "\"");
            if (TentarParseJson(desescapado, out filho))
                return DesembrulharJsonSeNecessario(filho);
        }

        throw new ArgumentException(
            "JSON invalido: o arquivo contem uma string em vez de objeto/array. " +
            "Salve o resultado do SSMS sem aspas envoltorias.");
    }

    private static bool TentarParseJson(string conteudo, out JsonElement root)
    {
        root = default;
        try
        {
            using var doc = JsonDocument.Parse(conteudo);
            root = doc.RootElement.Clone();
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string RemoverBom(string s)
        => s.Length > 0 && s[0] == '﻿' ? s.TrimStart('﻿') : s;

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

    private static SchemaComparisonResultDto Comparar(SchemaInfoDto jca, SchemaInfoDto externo, string? nomeArquivo)
    {
        var difs = new List<SchemaDifferenceDto>();

        var jcaPorNome = IndexarPorNome(jca.Colunas, c => c.Nome, out _);
        var extPorNome = IndexarPorNome(externo.Colunas, c => c.Nome, out var extDups);

        foreach (var (nome, qtd) in extDups)
            difs.Add(new SchemaDifferenceDto("Aviso", "Coluna", nome,
                null, $"{qtd} ocorrencias",
                $"Coluna '{nome}' duplicada no arquivo ({qtd} ocorrencias); comparada apenas a primeira."));

        // Colunas presentes no JCA mas ausentes no arquivo
        foreach (var col in jcaPorNome.Values)
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
        foreach (var col in extPorNome.Values)
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
            var extIdxPorNome = IndexarPorNome(externo.Indices, i => i.Nome, out var extIdxDups);
            foreach (var (nome, qtd) in extIdxDups)
                difs.Add(new SchemaDifferenceDto("Aviso", "Indice", nome,
                    null, $"{qtd} ocorrencias",
                    $"Indice '{nome}' duplicado no arquivo ({qtd} ocorrencias); comparado apenas o primeiro."));
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
            foreach (var idx in extIdxPorNome.Values)
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
            var extFkPorNome = IndexarPorNome(externo.Fks, f => f.Nome, out var extFkDups);
            foreach (var (nome, qtd) in extFkDups)
                difs.Add(new SchemaDifferenceDto("Aviso", "Fk", nome,
                    null, $"{qtd} ocorrencias",
                    $"FK '{nome}' duplicada no arquivo ({qtd} ocorrencias); comparada apenas a primeira."));

            foreach (var fk in jca.Fks)
            {
                if (!extFkPorNome.TryGetValue(fk.Nome, out var extFk))
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
            foreach (var fk in extFkPorNome.Values)
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

    private static Dictionary<string, T> IndexarPorNome<T>(
        IEnumerable<T> itens, Func<T, string> nomeDe, out List<(string Nome, int Qtd)> duplicados)
    {
        var mapa = new Dictionary<string, T>(StringComparer.OrdinalIgnoreCase);
        var contagem = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var ordem = new List<string>();
        duplicados = new List<(string, int)>();

        foreach (var item in itens)
        {
            var nome = nomeDe(item);
            if (mapa.ContainsKey(nome))
            {
                contagem[nome]++;
                continue;
            }
            mapa[nome] = item;
            contagem[nome] = 1;
            ordem.Add(nome);
        }

        foreach (var nome in ordem)
            if (contagem[nome] > 1)
                duplicados.Add((nome, contagem[nome]));

        return mapa;
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
