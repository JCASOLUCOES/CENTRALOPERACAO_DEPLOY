using System.IO;
using System.Text.RegularExpressions;
using Central_BackEnd.Dtos.Database;
using Microsoft.Extensions.Configuration;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseSchemaDiffService
{
    Task<SchemaDiffDto> CompararAsync(int limite = 100, CancellationToken ct = default);
}

public class DatabaseSchemaDiffService : IDatabaseSchemaDiffService
{
    private readonly IDatabaseMetadataService _metadata;
    private readonly ILogger<DatabaseSchemaDiffService> _logger;
    private readonly string _docsPath;

    public DatabaseSchemaDiffService(
        IDatabaseMetadataService metadata,
        ILogger<DatabaseSchemaDiffService> logger,
        IConfiguration config)
    {
        _metadata = metadata;
        _logger = logger;
        _docsPath = config["Database:DocsPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "docs", "database");
    }

    public async Task<SchemaDiffDto> CompararAsync(int limite, CancellationToken ct)
    {
        var ini = DateTime.Now;
        var itens = new List<SchemaDiffItemDto>();
        var tabelasDb = await _metadata.ListarTabelasAsync(null, ct);
        var tabelasDbNome = tabelasDb.Select(t => t.Nome.ToLowerInvariant()).ToHashSet();

        // Simular documentacao Markdown: procurar arquivos .md no diretorio de docs
        var tabelasDoc = await ListarTabelasDocumentadasAsync(ct);
        var tabelasDocNome = tabelasDoc.ToHashSet();

        int tabelasIguais = 0, tabelasNovas = 0, tabelasRemovidas = 0;
        int colunasNovas = 0, colunasRemovidas = 0, colunasAlteradas = 0;
        int fksNovas = 0, fksRemovidas = 0;

        // Tabelas que existem no banco mas nao na documentacao -> "Nao documentado"
        foreach (var t in tabelasDb)
        {
            if (tabelasDocNome.Contains(t.Nome.ToLowerInvariant()))
            {
                tabelasIguais++;
                // Comparar colunas (simulado)
                var colsDb = await _metadata.ListarColunasAsync(t.Schema, t.Nome, ct);
                var colDoc = ObterColunasDocumentadas(t.Nome);
                foreach (var c in colsDb)
                {
                    if (!colDoc.Contains(c.Coluna.ToLowerInvariant()))
                    {
                        colunasNovas++;
                        itens.Add(new SchemaDiffItemDto("Coluna", $"{t.Nome}.{c.Coluna}", "Nova",
                            $"Coluna encontrada no banco mas nao na documentacao"));
                    }
                }
                foreach (var cn in colDoc)
                {
                    if (!colsDb.Any(c => c.Coluna.Equals(cn, StringComparison.OrdinalIgnoreCase)))
                    {
                        colunasRemovidas++;
                        itens.Add(new SchemaDiffItemDto("Coluna", $"{t.Nome}.{cn}", "Removida",
                            $"Coluna na documentacao mas nao encontrada no banco"));
                    }
                }
            }
            else
            {
                tabelasNovas++;
                itens.Add(new SchemaDiffItemDto("Tabela", t.NomeCompleto, "Nova",
                    "Tabela existente no banco mas nao documentada em Markdown"));
            }

            if (itens.Count >= limite) break;
        }

        // Tabelas na documentacao mas nao no banco
        foreach (var dn in tabelasDocNome)
        {
            if (!tabelasDbNome.Contains(dn))
            {
                tabelasRemovidas++;
                itens.Add(new SchemaDiffItemDto("Tabela", dn, "Removida",
                    "Tabela documentada mas nao encontrada no banco"));
            }
        }

        return new SchemaDiffDto(
            GeradoEm: DateTime.Now,
            TabelasIguais: tabelasIguais,
            TabelasNovas: tabelasNovas,
            TabelasRemovidas: tabelasRemovidas,
            ColunasNovas: colunasNovas,
            ColunasRemovidas: colunasRemovidas,
            ColunasAlteradas: colunasAlteradas,
            FksNovas: fksNovas,
            FksRemovidas: fksRemovidas,
            Itens: itens.Take(limite).ToList()
        );
    }

    private async Task<List<string>> ListarTabelasDocumentadasAsync(CancellationToken ct)
    {
        var tabelas = new List<string>();
        try
        {
            if (!Directory.Exists(_docsPath))
            {
                _logger.LogInformation("Diretorio de documentacao nao encontrado: {Path}", _docsPath);
                return tabelas;
            }

            var files = Directory.GetFiles(_docsPath, "*.md", SearchOption.AllDirectories);
            foreach (var file in files)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    var content = await File.ReadAllTextAsync(file, ct);
                    // Extrair nomes de tabelas de headings Markdown (## TabelaNome ou ### TabelaNome)
                    var matches = Regex.Matches(content, @"^#{1,6}\s+(?:Tabela\s+)?(.+)$", RegexOptions.Multiline);
                    foreach (Match m in matches)
                    {
                        var nome = m.Groups[1].Value.Trim();
                        if (!string.IsNullOrEmpty(nome))
                            tabelas.Add(nome);
                    }

                    // Tambem tenta inferir do nome do arquivo
                    if (tabelas.Count == 0)
                    {
                        var fileName = Path.GetFileNameWithoutExtension(file);
                        tabelas.Add(fileName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Erro ao ler arquivo de documentacao: {File}", file);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao listar documentacao de tabelas");
        }
        return tabelas.Distinct().ToList();
    }

    private List<string> ObterColunasDocumentadas(string tabelaNome)
    {
        var cols = new List<string>();
        try
        {
            if (!Directory.Exists(_docsPath)) return cols;

            var files = Directory.GetFiles(_docsPath, "*.md", SearchOption.AllDirectories);
            foreach (var file in files)
            {
                try
                {
                    var content = File.ReadAllText(file);
                    // Buscar seção da tabela específica
                    var tableSectionRegex = new Regex(
                        $@"^#{{1,6}}\s+(?:Tabela\s+)?{Regex.Escape(tabelaNome)}.*$",
                        RegexOptions.Multiline | RegexOptions.IgnoreCase);
                    if (tableSectionRegex.IsMatch(content))
                    {
                        // Extrair colunas de tabelas markdown (linhas com | coluna | )
                        var colMatches = Regex.Matches(content, @"^\|\s*(\w+)\s*\|", RegexOptions.Multiline);
                        foreach (Match m in colMatches)
                        {
                            var col = m.Groups[1].Value;
                            if (!string.IsNullOrEmpty(col) && col != "Coluna")
                                cols.Add(col);
                        }
                    }
                }
                catch { }
            }
        }
        catch { }
        return cols;
    }
}
