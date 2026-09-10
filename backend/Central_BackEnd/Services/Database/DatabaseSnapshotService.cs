using System.IO;
using System.Text.Json;
using Central_BackEnd.Dtos.Database;
using Microsoft.Extensions.Configuration;

namespace Central_BackEnd.Services.Database;

public interface IDatabaseSnapshotService
{
    Task SalvarSnapshotAsync(string nome, CancellationToken ct = default);
    Task<SchemaDiffDto> CompararSnapshotAsync(string nome, CancellationToken ct = default);
    Task<List<string>> ListarSnapshotsAsync(CancellationToken ct = default);
}

public class DatabaseSnapshotService : IDatabaseSnapshotService
{
    private readonly IDatabaseMetadataService _metadata;
    private readonly ILogger<DatabaseSnapshotService> _logger;
    private readonly string _snapshotsPath;
    private readonly Dictionary<string, string> _snapshotsInMemory = new();

    public DatabaseSnapshotService(
        IDatabaseMetadataService metadata,
        ILogger<DatabaseSnapshotService> logger,
        IConfiguration config)
    {
        _metadata = metadata;
        _logger = logger;
        _snapshotsPath = config["Database:SnapshotsPath"]
            ?? Path.Combine(Path.GetTempPath(), "central-snapshots");

        if (!Directory.Exists(_snapshotsPath))
            Directory.CreateDirectory(_snapshotsPath);
    }

    public async Task SalvarSnapshotAsync(string nome, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new ArgumentException("Nome do snapshot nao pode ser vazio.", nameof(nome));

        _logger.LogInformation("Salvando snapshot: {Nome}", nome);

        var tables = await _metadata.ListarTabelasAsync(null, ct);
        var snapshot = new Dictionary<string, object>
        {
            ["Nome"] = nome,
            ["DataCriacao"] = DateTime.Now,
            ["Tabelas"] = await Task.WhenAll(tables.Select(async t =>
            {
                var cols = await _metadata.ListarColunasAsync(t.Schema, t.Nome, ct);
                return new
                {
                    t.Schema,
                    t.Nome,
                    t.NomeCompleto,
                    t.QuantidadeRegistros,
                    t.DataCriacao,
                    t.DataAlteracao,
                    t.QuantidadeColunas,
                    t.QuantidadeIndices,
                    t.QuantidadeRelacionamentos,
                    Colunas = cols.Select(c => new
                    {
                        c.Coluna,
                        c.Tipo,
                        c.Tamanho,
                        c.IsPrimaryKey,
                        c.IsForeignKey,
                        c.IsIdentity,
                        c.ValorDefault
                    }).ToList()
                };
            }))
        };

        var json = JsonSerializer.Serialize(snapshot, new JsonSerializerOptions { WriteIndented = true });

        var filePath = Path.Combine(_snapshotsPath, $"{nome}.json");
        await File.WriteAllTextAsync(filePath, json, ct);
        _snapshotsInMemory[nome] = json;

        _logger.LogInformation("Snapshot salvo com sucesso: {Nome} ({Tabelas} tabelas)", nome, tables.Count);
    }

    public async Task<SchemaDiffDto> CompararSnapshotAsync(string nome, CancellationToken ct)
    {
        var ini = DateTime.Now;
        var itens = new List<SchemaDiffItemDto>();
        var tabelasDb = await _metadata.ListarTabelasAsync(null, ct);
        var tabelasDbNome = tabelasDb.Select(t => t.Nome.ToLowerInvariant()).ToHashSet();

        var snapshotJson = await ObterSnapshotJsonAsync(nome, ct);
        if (snapshotJson == null)
        {
            return new SchemaDiffDto(
                GeradoEm: DateTime.Now,
                TabelasIguais: 0, TabelasNovas: 0, TabelasRemovidas: 0,
                ColunasNovas: 0, ColunasRemovidas: 0, ColunasAlteradas: 0,
                FksNovas: 0, FksRemovidas: 0,
                Itens: new List<SchemaDiffItemDto> { new SchemaDiffItemDto("Snapshot", nome, "Erro", "Snapshot nao encontrado.") });
        }

        using var doc = JsonDocument.Parse(snapshotJson);
        var root = doc.RootElement;
        var snapshotTables = root.GetProperty("Tabelas").EnumerateArray().ToList();
        var snapshotTabelasNome = new HashSet<string>();

        int tabelasIguais = 0, tabelasNovas = 0, tabelasRemovidas = 0;
        int colunasNovas = 0, colunasRemovidas = 0, colunasAlteradas = 0;
        int fksNovas = 0, fksRemovidas = 0;

        foreach (var st in snapshotTables)
        {
            var sNome = st.GetProperty("Nome").GetString()!.ToLowerInvariant();
            snapshotTabelasNome.Add(sNome);

            if (tabelasDbNome.Contains(sNome))
            {
                tabelasIguais++;

                var snapCols = st.TryGetProperty("Colunas", out var sc) ?
                    sc.EnumerateArray().Select(c => c.GetProperty("Coluna").GetString()!.ToLowerInvariant()).ToHashSet() :
                    new HashSet<string>();

                var dbTable = tabelasDb.FirstOrDefault(t => t.Nome.Equals(sNome, StringComparison.OrdinalIgnoreCase));
                if (dbTable != null)
                {
                    var dbCols = await _metadata.ListarColunasAsync(dbTable.Schema, dbTable.Nome, ct);
                    foreach (var dc in dbCols)
                    {
                        if (!snapCols.Contains(dc.Coluna.ToLowerInvariant()))
                        {
                            colunasNovas++;
                            itens.Add(new SchemaDiffItemDto("Coluna", $"{dbTable.Nome}.{dc.Coluna}", "Nova",
                                "Coluna existente no banco mas nao no snapshot"));
                        }
                    }
                    foreach (var sn in snapCols)
                    {
                        if (!dbCols.Any(c => c.Coluna.Equals(sn, StringComparison.OrdinalIgnoreCase)))
                        {
                            colunasRemovidas++;
                            itens.Add(new SchemaDiffItemDto("Coluna", $"{dbTable.Nome}.{sn}", "Removida",
                                "Coluna no snapshot mas nao encontrada no banco"));
                        }
                    }
                }
            }
            else
            {
                tabelasNovas++;
                itens.Add(new SchemaDiffItemDto("Tabela", st.GetProperty("Nome").GetString()!, "Nova",
                    "Tabela no snapshot mas nao encontrada no banco"));
            }
        }

        foreach (var tn in tabelasDbNome)
        {
            if (!snapshotTabelasNome.Contains(tn))
            {
                tabelasRemovidas++;
                itens.Add(new SchemaDiffItemDto("Tabela", tn, "Removida",
                    "Tabela no banco mas nao no snapshot"));
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
            Itens: itens.ToList()
        );
    }

    public async Task<List<string>> ListarSnapshotsAsync(CancellationToken ct)
    {
        var nomes = new List<string>(_snapshotsInMemory.Keys);

        try
        {
            if (Directory.Exists(_snapshotsPath))
            {
                var files = Directory.GetFiles(_snapshotsPath, "*.json");
                foreach (var file in files)
                {
                    var name = Path.GetFileNameWithoutExtension(file);
                    if (!nomes.Contains(name))
                        nomes.Add(name);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao listar snapshots");
        }

        return nomes.OrderBy(n => n).ToList();
    }

    private async Task<string?> ObterSnapshotJsonAsync(string nome, CancellationToken ct)
    {
        if (_snapshotsInMemory.TryGetValue(nome, out var json))
            return json;

        var filePath = Path.Combine(_snapshotsPath, $"{nome}.json");
        if (File.Exists(filePath))
            return await File.ReadAllTextAsync(filePath, ct);

        return null;
    }
}
