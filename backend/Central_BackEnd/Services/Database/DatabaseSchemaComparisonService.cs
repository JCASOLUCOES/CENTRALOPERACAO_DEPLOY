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
    Task<BulkSchemaComparisonResultDto> CompararBancoInteiroAsync(
        IFormFile arquivo, CancellationToken ct = default);
    Task<ProceduresComparisonResultDto> CompararProceduresAsync(
        IFormFile arquivo, CancellationToken ct = default);
}

public class DatabaseSchemaComparisonService : IDatabaseSchemaComparisonService
{
    private readonly IDatabaseMetadataService _metadata;
    private readonly ILogger<DatabaseSchemaComparisonService> _logger;

    private static readonly string[] ExtencoesAceitas = { ".json" };
    private const long TamanhoMaximoBytes = 5 * 1024 * 1024; // 5 MB
    private const long TamanhoMaximoBulkBytes = 20 * 1024 * 1024; // 20 MB (banco inteiro)

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
        ValidarArquivo(arquivo, TamanhoMaximoBytes);

        var jca = await ExtrairSchemaJcaAsync(schema, tabela, ct);
        var externo = await LerArquivoAsync(arquivo, ct);
        return Comparar(jca, externo, arquivo.FileName) with
        {
            SchemaArquivo = externo,
            SchemaJca = jca
        };
    }

    public async Task<BulkSchemaComparisonResultDto> CompararBancoInteiroAsync(
        IFormFile arquivo, CancellationToken ct = default)
    {
        ValidarArquivo(arquivo, TamanhoMaximoBulkBytes);

        using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);
        var conteudo = await reader.ReadToEndAsync(ct);
        var externas = ParseBulkJson(conteudo, arquivo.FileName ?? "arquivo.json");

        var jcaMap = await _metadata.ExtrairSchemasAsync(ct);

        var porChaveJca = new Dictionary<string, SchemaInfoDto>(StringComparer.OrdinalIgnoreCase);
        var nomesBanco = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in jcaMap)
        {
            porChaveJca[kv.Key] = kv.Value;
            var ponto = kv.Key.IndexOf('.');
            nomesBanco.Add(ponto >= 0 ? kv.Key[(ponto + 1)..] : kv.Key);
        }

        var tabelas = new List<BulkTableComparisonDto>();
        var matchedJca = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int somenteArquivo = 0, somenteBanco = 0, tabelasOk = 0, tabelasDif = 0;

        foreach (var ext in externas)
        {
            var chave = ResolverChaveJca(ext.Tabela, porChaveJca, nomesBanco);
            if (chave == null)
            {
                somenteArquivo++;
                var dif = new SchemaDifferenceDto("Critico", "Tabela", ext.Tabela,
                    null, $"{ext.Colunas.Count} colunas",
                    "Tabela existe no arquivo mas nao existe no banco conectado.");
                tabelas.Add(new BulkTableComparisonDto(ext.Tabela, "SomenteArquivo",
                    1, 0, 0, 0m, 0, ext.Colunas.Count,
                    new List<SchemaDifferenceDto> { dif }, ext));
                continue;
            }

            matchedJca.Add(chave);
            var r = Comparar(jcaMap[chave], ext, ext.Tabela);
            var status = r.Criticos + r.Avisos > 0 ? "Diferencas" : "Ok";
            if (status == "Ok") tabelasOk++; else tabelasDif++;
            tabelas.Add(new BulkTableComparisonDto(r.Tabela, status,
                r.Criticos, r.Avisos, r.Oks, r.PercentualMatch,
                r.TotalColunasJca, r.TotalColunasArquivo, r.Diferencas,
                status == "Ok" ? null : ext,
                status == "Ok" ? null : jcaMap[chave]));
        }

        foreach (var kv in jcaMap)
        {
            if (matchedJca.Contains(kv.Key)) continue;
            somenteBanco++;
            var dif = new SchemaDifferenceDto("Critico", "Tabela", kv.Key,
                $"{kv.Value.Colunas.Count} colunas", null,
                "Tabela existe no banco conectado mas nao existe no arquivo.");
            tabelas.Add(new BulkTableComparisonDto(kv.Key, "SomenteBanco",
                1, 0, 0, 0m, kv.Value.Colunas.Count, 0,
                new List<SchemaDifferenceDto> { dif }));
        }

        int criticos = tabelas.Sum(t => t.Criticos);
        int avisos = tabelas.Sum(t => t.Avisos);
        int oks = tabelas.Sum(t => t.Oks);
        int total = criticos + avisos + oks;
        decimal match = total == 0 ? 100m : Math.Round((decimal)oks / total * 100m, 1);

        return new BulkSchemaComparisonResultDto(
            DateTime.UtcNow,
            arquivo.FileName,
            externas.Count,
            jcaMap.Count,
            tabelasOk,
            tabelasDif,
            somenteArquivo,
            somenteBanco,
            criticos,
            avisos,
            oks,
            match,
            tabelas);
    }

    /// <summary>
    /// Compara o corpo das procedures do banco conectado com o arquivo enviado.
    /// Somente leitura: nao gera scripts de correcao (JCA vence em divergencias;
    /// procedures ausentes no banco sao apenas sinalizadas).
    /// </summary>
    public async Task<ProceduresComparisonResultDto> CompararProceduresAsync(
        IFormFile arquivo, CancellationToken ct = default)
    {
        ValidarArquivo(arquivo, TamanhoMaximoBulkBytes);

        using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);
        var conteudo = await reader.ReadToEndAsync(ct);
        var externas = ParseProceduresJson(conteudo, arquivo.FileName ?? "arquivo.json");

        var banco = await _metadata.ListarCorposProceduresAsync(ct);

        var porChaveBanco = new Dictionary<string, ProcedureCorpoDto>(StringComparer.OrdinalIgnoreCase);
        foreach (var b in banco)
            porChaveBanco.TryAdd($"{b.Schema}.{b.Nome}", b);

        var itens = new List<ProcedureComparisonDto>();
        var processadas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int totalArquivo = 0;

        foreach (var ext in externas)
        {
            var chave = $"{ext.Schema}.{ext.Nome}";
            if (!processadas.Add(chave)) continue;
            totalArquivo++;

            if (porChaveBanco.TryGetValue(chave, out var b))
            {
                var status = NormalizarCorpo(b.Corpo) == NormalizarCorpo(ext.Corpo)
                    ? "Compativel"
                    : "Divergente";
                itens.Add(new ProcedureComparisonDto(b.Schema, b.Nome, status, b.Corpo, ext.Corpo));
            }
            else
            {
                itens.Add(new ProcedureComparisonDto(ext.Schema, ext.Nome,
                    "SomenteArquivo", null, ext.Corpo));
            }
        }

        foreach (var b in banco)
        {
            var chave = $"{b.Schema}.{b.Nome}";
            if (processadas.Contains(chave)) continue;
            itens.Add(new ProcedureComparisonDto(b.Schema, b.Nome, "SomenteBanco", b.Corpo, null));
        }

        itens = itens
            .OrderBy(i => i.Schema, StringComparer.OrdinalIgnoreCase)
            .ThenBy(i => i.Nome, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new ProceduresComparisonResultDto(
            DateTime.UtcNow,
            arquivo.FileName,
            banco.Count,
            totalArquivo,
            itens.Count(i => i.Status == "Compativel"),
            itens.Count(i => i.Status == "Divergente"),
            itens.Count(i => i.Status == "SomenteBanco"),
            itens.Count(i => i.Status == "SomenteArquivo"),
            itens);
    }

    private static string? ResolverChaveJca(
        string tabelaArquivo,
        Dictionary<string, SchemaInfoDto> porChaveJca,
        HashSet<string> nomesBanco)
    {
        if (string.IsNullOrWhiteSpace(tabelaArquivo)) return null;
        var t = tabelaArquivo.Trim();
        if (porChaveJca.ContainsKey(t)) return t;

        var ponto = t.IndexOf('.');
        var nome = ponto >= 0 ? t[(ponto + 1)..] : t;
        var schemaPadrao = ponto >= 0 ? t[..ponto] : "dbo";
        var candidata = $"{schemaPadrao}.{nome}";
        if (porChaveJca.ContainsKey(candidata)) return candidata;

        if (nomesBanco.Contains(nome))
        {
            foreach (var k in porChaveJca.Keys)
            {
                var p = k.IndexOf('.');
                if (p >= 0 && string.Equals(k[(p + 1)..], nome, StringComparison.OrdinalIgnoreCase))
                    return k;
            }
        }
        return null;
    }

    /// <summary>
    /// Parse de arquivo com N tabelas: objeto {tabelas:[...]}, array de objetos
    /// de tabela, embrulho Excel/SSMS ou JSON Lines (uma linha por tabela).
    /// </summary>
    private static List<SchemaInfoDto> ParseBulkJson(string conteudo, string nomeArquivo)
    {
        if (string.IsNullOrWhiteSpace(conteudo))
            throw new ArgumentException("Arquivo JSON vazio.");

        var base0 = RemoverBom(conteudo.Trim());
        if (base0.Length >= 2 && base0[0] == '"' && base0[^1] == '"')
            base0 = base0.Substring(1, base0.Length - 2).Replace("\"\"", "\"");

        if (TentarParseJson(base0, out var root))
        {
            var lista = ExtrairTabelasDeRoot(root, nomeArquivo);
            if (lista.Count > 0) return lista;
        }

        var tabelas = new List<SchemaInfoDto>();
        foreach (var linha in base0.Split('\n'))
        {
            var l = RemoverBom(linha.Trim()).TrimEnd('\r');
            if (l.Length == 0) continue;
            if (l.Length >= 2 && l[0] == '"' && l[^1] == '"')
                l = l.Substring(1, l.Length - 2).Replace("\"\"", "\"");
            if (!TentarParseJson(l, out var el)) continue;
            try
            {
                if (el.ValueKind == JsonValueKind.Object)
                {
                    if (el.TryGetProperty("tabelas", out var filhas) && filhas.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var f in filhas.EnumerateArray())
                            tabelas.Add(ParseJsonObject(f, nomeArquivo));
                        continue;
                    }
                    tabelas.Add(ParseJsonObject(el, nomeArquivo));
                }
                else if (el.ValueKind == JsonValueKind.Array)
                {
                    tabelas.AddRange(ExtrairTabelasDeRoot(el, nomeArquivo));
                }
            }
            catch (ArgumentException)
            {
            }
        }

        if (tabelas.Count == 0)
            throw new ArgumentException(
                "JSON invalido para banco inteiro. Esperado objeto {tabelas:[...]}, " +
                "array de objetos de tabela ou JSON Lines (uma linha por tabela).");
        return tabelas;
    }

    private static List<SchemaInfoDto> ExtrairTabelasDeRoot(JsonElement root, string nomeArquivo)
    {
        var lista = new List<SchemaInfoDto>();
        if (root.ValueKind == JsonValueKind.String)
        {
            var interno = root.GetString() ?? "";
            if (TentarParseJson(interno, out var filho))
                return ExtrairTabelasDeRoot(filho, nomeArquivo);
            return lista;
        }
        if (root.ValueKind == JsonValueKind.Object)
        {
            if (root.TryGetProperty("tabelas", out var filhas) && filhas.ValueKind == JsonValueKind.Array)
            {
                foreach (var f in filhas.EnumerateArray())
                    lista.Add(ParseJsonObject(f, nomeArquivo));
                return lista;
            }
            if (PossuiPropriedade(root, "tabela", "colunas", "columns"))
            {
                lista.Add(ParseJsonObject(root, nomeArquivo));
                return lista;
            }
            var qtdProps = root.EnumerateObject().Count();
            if (qtdProps == 1)
            {
                var interno = DesembrulharArrayEmbrulhado(root, nomeArquivo);
                if (TentarParseJson(interno, out var filho))
                    return ExtrairTabelasDeRoot(filho, nomeArquivo);
            }
            return lista;
        }
        if (root.ValueKind == JsonValueKind.Array)
        {
            if (root.GetArrayLength() == 0) return lista;
            var p0 = root[0];
            if (p0.ValueKind == JsonValueKind.Object
                && !PossuiPropriedade(p0, "nome", "name")
                && !PossuiPropriedade(p0, "colunas", "columns"))
            {
                var interno = DesembrulharArrayEmbrulhado(p0, nomeArquivo);
                if (TentarParseJson(interno, out var filho))
                    return ExtrairTabelasDeRoot(filho, nomeArquivo);
                return lista;
            }
            foreach (var el in root.EnumerateArray())
            {
                if (el.ValueKind != JsonValueKind.Object) continue;
                if (!PossuiPropriedade(el, "tabela", "colunas", "columns"))
                {
                    if (PossuiPropriedade(el, "nome", "name"))
                        throw new ArgumentException(
                            "Arquivo parece conter uma lista de colunas, nao tabelas. " +
                            "Use a comparacao de tabela unica ou exporte com o script de banco inteiro.");
                    continue;
                }
                lista.Add(ParseJsonObject(el, nomeArquivo));
            }
            return lista;
        }
        return lista;
    }

    /// <summary>
    /// Parse de arquivo de procedures: objeto {procedures:[...]}, array de objetos,
    /// objeto unico {schema,nome,corpo}, embrulho Excel/SSMS ou JSON Lines
    /// (uma linha por procedure).
    /// </summary>
    private static List<ProcedureCorpoDto> ParseProceduresJson(string conteudo, string nomeArquivo)
    {
        if (string.IsNullOrWhiteSpace(conteudo))
            throw new ArgumentException("Arquivo JSON vazio.");

        var base0 = RemoverBom(conteudo.Trim());
        if (base0.Length >= 2 && base0[0] == '"' && base0[^1] == '"')
            base0 = base0.Substring(1, base0.Length - 2).Replace("\"\"", "\"");

        var procs = new List<ProcedureCorpoDto>();

        if (TentarParseJson(base0, out var root))
            ExtrairProceduresDeRoot(root, nomeArquivo, procs);

        if (procs.Count == 0)
        {
            foreach (var linha in base0.Split('\n'))
            {
                var l = RemoverBom(linha.Trim()).TrimEnd('\r');
                if (l.Length == 0) continue;
                if (l.Length >= 2 && l[0] == '"' && l[^1] == '"')
                    l = l.Substring(1, l.Length - 2).Replace("\"\"", "\"");
                if (!TentarParseJson(l, out var el)) continue;
                try
                {
                    ExtrairProceduresDeRoot(el, nomeArquivo, procs);
                }
                catch (ArgumentException)
                {
                }
            }
        }

        if (procs.Count == 0)
            throw new ArgumentException(
                "JSON invalido para procedures. Esperado objeto {procedures:[...]}, " +
                "array de objetos de procedure, objeto {schema,nome,corpo} " +
                "ou JSON Lines (uma linha por procedure).");
        return procs;
    }

    private static void ExtrairProceduresDeRoot(
        JsonElement root, string nomeArquivo, List<ProcedureCorpoDto> destino)
    {
        switch (root.ValueKind)
        {
            case JsonValueKind.String:
            {
                var interno = root.GetString() ?? "";
                if (TentarParseJson(interno, out var filho))
                    ExtrairProceduresDeRoot(filho, nomeArquivo, destino);
                break;
            }
            case JsonValueKind.Object:
            {
                if (root.TryGetProperty("procedures", out var filhas)
                    && filhas.ValueKind == JsonValueKind.Array)
                {
                    foreach (var f in filhas.EnumerateArray())
                        destino.Add(ParseProcElement(f, nomeArquivo));
                    break;
                }
                if (PossuiPropriedade(root, "nome", "name"))
                {
                    destino.Add(ParseProcElement(root, nomeArquivo));
                    break;
                }
                if (root.EnumerateObject().Count() == 1)
                {
                    var interno = DesembrulharProc(root, nomeArquivo);
                    if (TentarParseJson(interno, out var filho))
                        ExtrairProceduresDeRoot(filho, nomeArquivo, destino);
                }
                break;
            }
            case JsonValueKind.Array:
            {
                if (root.GetArrayLength() == 0) break;
                var p0 = root[0];
                if (p0.ValueKind == JsonValueKind.Object
                    && !PossuiPropriedade(p0, "nome", "name")
                    && p0.EnumerateObject().Count() == 1)
                {
                    var interno = DesembrulharProc(p0, nomeArquivo);
                    if (TentarParseJson(interno, out var filho))
                    {
                        ExtrairProceduresDeRoot(filho, nomeArquivo, destino);
                        break;
                    }
                }
                foreach (var el in root.EnumerateArray())
                {
                    if (el.ValueKind != JsonValueKind.Object) continue;
                    destino.Add(ParseProcElement(el, nomeArquivo));
                }
                break;
            }
        }
    }

    private static ProcedureCorpoDto ParseProcElement(JsonElement el, string nomeArquivo)
    {
        if (el.ValueKind != JsonValueKind.Object)
            throw new ArgumentException($"Elemento de procedure invalido. (arquivo: {nomeArquivo})");

        var nome = LerTexto(el, "nome", "name", "Nome", "Name");
        if (string.IsNullOrWhiteSpace(nome))
            throw new ArgumentException($"Procedure sem nome. (arquivo: {nomeArquivo})");

        var schema = LerTexto(el, "schema", "Schema", "esquema");
        if (string.IsNullOrWhiteSpace(schema)) schema = "dbo";

        var corpo = LerTexto(el, "corpo", "Corpo", "definition", "Definition", "body", "Body");
        if (corpo == null)
            throw new ArgumentException(
                $"Procedure '{nome}' sem corpo/definition. (arquivo: {nomeArquivo})");

        return new ProcedureCorpoDto(schema.Trim(), nome.Trim(), corpo);
    }

    private static string? LerTexto(JsonElement el, params string[] nomes)
    {
        foreach (var n in nomes)
        {
            if (!el.TryGetProperty(n, out var v)) continue;
            return v.ValueKind switch
            {
                JsonValueKind.String => v.GetString(),
                JsonValueKind.Null => null,
                _ => v.GetRawText()
            };
        }
        return null;
    }

    private static string DesembrulharProc(JsonElement el, string nomeArquivo)
    {
        string? candidato = null;
        foreach (var prop in el.EnumerateObject())
        {
            if (prop.Value.ValueKind != JsonValueKind.String || candidato != null)
                throw new ArgumentException(
                    "JSON de procedures nao reconhecido (propriedade string unica esperada). " +
                    $"(arquivo: {nomeArquivo})");
            candidato = prop.Value.GetString();
        }

        if (string.IsNullOrWhiteSpace(candidato))
            throw new ArgumentException(
                $"JSON de procedures vazio ao desembrulhar. (arquivo: {nomeArquivo})");

        var interno = RemoverBom(candidato.Trim());
        if (interno.Length >= 2 && interno[0] == '"' && interno[^1] == '"')
            interno = interno.Substring(1, interno.Length - 2).Replace("\"\"", "\"");
        try
        {
            using var doc = JsonDocument.Parse(interno);
            return doc.RootElement.GetRawText();
        }
        catch (JsonException)
        {
            throw new ArgumentException(
                "JSON invalido: propriedade string nao contem JSON valido. " +
                $"Cole o JSON limpo comecando por '[' ou '{{'. (arquivo: {nomeArquivo})");
        }
    }

    /// <summary>
    /// Normaliza corpo de procedure para comparacao: fim de linha unico,
    /// trim de espacos a direita por linha e trim final. Comparacao sensivel a caixa.
    /// </summary>
    private static string NormalizarCorpo(string? corpo)
    {
        var s = (corpo ?? "").Replace("\r\n", "\n").Replace('\r', '\n');
        var linhas = s.Split('\n');
        for (var i = 0; i < linhas.Length; i++)
            linhas[i] = linhas[i].TrimEnd();
        return string.Join("\n", linhas).TrimEnd();
    }

    private static void ValidarArquivo(IFormFile arquivo, long tamanhoMaximo)
    {
        if (arquivo == null || arquivo.Length == 0)
            throw new ArgumentException("Arquivo e obrigatorio.");
        if (arquivo.Length > tamanhoMaximo)
            throw new ArgumentException($"Arquivo excede o limite de {tamanhoMaximo / (1024 * 1024)} MB.");
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
        var pk = await _metadata.ListarPkAsync(alvo.Schema, alvo.Nome, ct);

        return new SchemaInfoDto(
            $"{alvo.Schema}.{alvo.Nome}",
            cols.Select(c => new SchemaColumnInfoDto(
                c.Coluna, c.Tipo, c.Nulo, c.Ordem, c.Tamanho, c.Precisao, c.Escala, c.ValorDefault)).ToList(),
            idxs.Select(i => new SchemaIndexInfoDto(i.Nome, i.Unique, i.Colunas)).ToList(),
            fks.Select(f => new SchemaFkInfoDto(f.Nome, f.ColunaOrigem, f.TabelaDestino, f.ColunaDestino)).ToList(),
            pk);
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
            var primeiro = root.GetArrayLength() > 0 ? root[0] : default;

            if (primeiro.ValueKind == JsonValueKind.Object
                && !PossuiPropriedade(primeiro, "nome", "name")
                && !PossuiPropriedade(primeiro, "colunas", "columns"))
            {
                var desembrulhado = DesembrulharArrayEmbrulhado(primeiro, nomeArquivo);
                return ParseJson(desembrulhado, nomeArquivo);
            }

            if (primeiro.ValueKind == JsonValueKind.Object
                && PossuiPropriedade(primeiro, "colunas", "columns"))
            {
                var tabelas = new List<SchemaInfoDto>();
                foreach (var el in root.EnumerateArray())
                    tabelas.Add(ParseJsonObject(el, nomeArquivo));
                if (tabelas.Count == 1)
                    return tabelas[0];
                throw new ArgumentException(
                    $"Arquivo contem {tabelas.Count} tabelas. Use a comparacao de banco inteiro.");
            }

            var colunas = new List<SchemaColumnInfoDto>();
            foreach (var el in root.EnumerateArray())
                colunas.Add(ParseColunaJson(el));
            if (colunas.Count == 0)
                throw new ArgumentException("JSON nao contem colunas validas (propriedade 'colunas' vazia ou ausente).");
            return new SchemaInfoDto(nomeArquivo, colunas,
                new List<SchemaIndexInfoDto>(), new List<SchemaFkInfoDto>());
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            if (root.TryGetProperty("tabelas", out var tabelasEl) && tabelasEl.ValueKind == JsonValueKind.Array)
            {
                if (tabelasEl.GetArrayLength() == 1)
                    return ParseJsonObject(tabelasEl[0], nomeArquivo);
                throw new ArgumentException(
                    $"Arquivo contem {tabelasEl.GetArrayLength()} tabelas. Use a comparacao de banco inteiro.");
            }

            if (!PossuiPropriedade(root, "nome", "name")
                && !PossuiPropriedade(root, "colunas", "columns"))
            {
                var desembrulhado = DesembrulharArrayEmbrulhado(root, nomeArquivo);
                return ParseJson(desembrulhado, nomeArquivo);
            }

            return ParseJsonObject(root, nomeArquivo);
        }

        throw new ArgumentException(
            "JSON invalido: esperado objeto { tabela, colunas, indices, fks } ou array de colunas.");
    }

    private static bool PossuiPropriedade(JsonElement el, params string[] nomes)
    {
        foreach (var n in nomes)
            if (el.TryGetProperty(n, out _))
                return true;
        return false;
    }

    /// <summary>
    /// Desembrulha objeto/array com uma unica propriedade string cujo valor e JSON
    /// interno (artefato Excel/SSMS: [{ "": "{\"tabela\":...}" }]).
    /// </summary>
    private static string DesembrulharArrayEmbrulhado(JsonElement el, string nomeArquivo)
    {
        string? candidato = null;
        foreach (var prop in el.EnumerateObject())
        {
            if (prop.Value.ValueKind != JsonValueKind.String)
                return NotEmbrulhado(el, nomeArquivo);
            if (candidato != null)
                return NotEmbrulhado(el, nomeArquivo);
            candidato = prop.Value.GetString();
        }

        if (string.IsNullOrWhiteSpace(candidato))
            return NotEmbrulhado(el, nomeArquivo);

        var interno = RemoverBom(candidato.Trim());
        if (interno.Length >= 2 && interno[0] == '"' && interno[^1] == '"')
            interno = interno.Substring(1, interno.Length - 2).Replace("\"\"", "\"");
        try
        {
            using var doc = JsonDocument.Parse(interno);
            return doc.RootElement.GetRawText();
        }
        catch (JsonException)
        {
            throw new ArgumentException(
                "JSON invalido: propriedade string nao contem JSON valido. " +
                $"Cole o JSON limpo comecando por '{{'. (arquivo: {nomeArquivo})");
        }
    }

    private static string NotEmbrulhado(JsonElement el, string nomeArquivo)
        => throw new ArgumentException(
            "JSON nao contem colunas validas (propriedade 'colunas' vazia ou ausente). " +
            $"(arquivo: {nomeArquivo}, propriedades: {string.Join(", ", el.EnumerateObject().Select(p => p.Name))})");

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

        // PK: presente no arquivo (mesmo que null = tabela sem PK) habilita a comparacao;
        // ausente (JSON antigo) mantem null e a comparacao de PK e pulada.
        var pk = ParsePkPropriedade(root);

        if (colunas.Count == 0)
            throw new ArgumentException("JSON nao contem colunas validas (propriedade 'colunas' vazia ou ausente).");

        return new SchemaInfoDto(tabela, colunas, indices, fks, pk);
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

    /// <summary>
    /// Le a propriedade de PK do arquivo. Retorna null quando a propriedade nao
    /// existe (JSON antigo - comparacao de PK pulada) e SchemaPkInfoDto sem colunas
    /// quando o arquivo informa explicitamente que a tabela nao possui PK.
    /// </summary>
    private static SchemaPkInfoDto? ParsePkPropriedade(JsonElement root)
    {
        JsonElement? el = null;
        foreach (var nome in new[] { "pk", "primaryKey", "primary_key", "PK" })
        {
            if (root.TryGetProperty(nome, out var v))
            {
                el = v;
                break;
            }
        }
        if (el == null) return null;

        var valor = el.Value;
        if (valor.ValueKind == JsonValueKind.Null)
            return new SchemaPkInfoDto("", new List<string>());

        if (valor.ValueKind == JsonValueKind.Array)
        {
            var colunas = new List<string>();
            foreach (var c in valor.EnumerateArray())
                if (c.ValueKind == JsonValueKind.String)
                    colunas.Add(c.GetString() ?? "");
            return new SchemaPkInfoDto(colunas.Count > 0 ? "PK" : "", colunas);
        }

        if (valor.ValueKind == JsonValueKind.Object)
        {
            var nome = GetString(valor, "nome") ?? GetString(valor, "name") ?? "";
            var colunas = new List<string>();
            foreach (var chave in new[] { "colunas", "columns" })
            {
                if (valor.TryGetProperty(chave, out var cols) && cols.ValueKind == JsonValueKind.Array)
                {
                    foreach (var c in cols.EnumerateArray())
                        if (c.ValueKind == JsonValueKind.String)
                            colunas.Add(c.GetString() ?? "");
                    break;
                }
            }
            if (colunas.Count == 0) return new SchemaPkInfoDto("", new List<string>());
            return new SchemaPkInfoDto(string.IsNullOrWhiteSpace(nome) ? "PK" : nome, colunas);
        }

        return new SchemaPkInfoDto("", new List<string>());
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

            // Ordem das colunas nao e considerada diferenca (SQL Server nao exige ordem identica)

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

        // PK (so compara se o arquivo trouxer a propriedade pk;
        // null = arquivo antigo, sem informacao de PK)
        if (externo.Pk != null)
        {
            bool jcaTemPk = jca.Pk != null && jca.Pk.Colunas.Count > 0;
            bool extTemPk = externo.Pk.Colunas.Count > 0;

            if (jcaTemPk && extTemPk)
            {
                var jcaCols = NormalizarLista(jca.Pk!.Colunas);
                var extCols = NormalizarLista(externo.Pk.Colunas);
                if (jcaCols != extCols)
                {
                    difs.Add(new SchemaDifferenceDto("Critico", "Pk", "PRIMARY KEY",
                        DescreverPk(jca.Pk!), DescreverPk(externo.Pk),
                        "Colunas da PRIMARY KEY divergentes."));
                }
                else
                {
                    difs.Add(new SchemaDifferenceDto("Ok", "Pk", "PRIMARY KEY",
                        DescreverPk(jca.Pk!), DescreverPk(externo.Pk),
                        "PRIMARY KEY compativel."));
                }
            }
            else if (jcaTemPk)
            {
                difs.Add(new SchemaDifferenceDto("Aviso", "Pk", "PRIMARY KEY",
                    DescreverPk(jca.Pk!), null,
                    "PRIMARY KEY existe no JCA mas nao no arquivo."));
            }
            else if (extTemPk)
            {
                difs.Add(new SchemaDifferenceDto("Critico", "Pk", "PRIMARY KEY",
                    null, DescreverPk(externo.Pk),
                    "PRIMARY KEY existe no arquivo mas nao no JCA."));
            }
            else
            {
                difs.Add(new SchemaDifferenceDto("Ok", "Pk", "PRIMARY KEY",
                    null, null,
                    "Tabela sem PRIMARY KEY nos dois lados."));
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

    private static string DescreverPk(SchemaPkInfoDto pk)
        => $"{(string.IsNullOrWhiteSpace(pk.Nome) ? "PRIMARY KEY" : pk.Nome)} ({string.Join(", ", pk.Colunas)})";

    private static string NormalizarLista(IEnumerable<string> cols)
        => string.Join(",", cols.Select(c => c.ToLowerInvariant()).OrderBy(c => c));
}
