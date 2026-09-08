using System.Text.Json;
using Central_BackEnd.Models.Acessos;

namespace Central_BackEnd.Services;

public class GoogleSheetsService : IGoogleSheetsService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleSheetsService> _logger;

    private List<EmpresaAcesso>? _cache;
    private DateTime _cacheExpiraEm = DateTime.MinValue;
    private readonly TimeSpan _cacheTTL = TimeSpan.FromMinutes(10);

    public GoogleSheetsService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GoogleSheetsService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<List<EmpresaAcesso>> ObterEmpresasAsync()
    {
        if (_cache is not null && DateTime.UtcNow < _cacheExpiraEm)
        {
            return _cache;
        }

        var spreadsheetId = _configuration["GoogleSheets:SpreadsheetId"]
            ?? throw new InvalidOperationException("GoogleSheets:SpreadsheetId not configured");
        var range = _configuration["GoogleSheets:Range"] ?? "A1:Z1000";
        var apiKey = _configuration["GoogleSheets:ApiKey"];

        List<List<string>> rows;

        if (!string.IsNullOrEmpty(apiKey))
        {
            rows = await FetchViaApiAsync(spreadsheetId, range, apiKey);
        }
        else
        {
            rows = await FetchViaCsvAsync(spreadsheetId);
        }

        var empresas = ParseEmpresas(rows);
        _cache = empresas;
        _cacheExpiraEm = DateTime.UtcNow.Add(_cacheTTL);

        _logger.LogInformation("Loaded {Count} empresas from Google Sheets", empresas.Count);
        return empresas;
    }

    private async Task<List<List<string>>> FetchViaApiAsync(string spreadsheetId, string range, string apiKey)
    {
        var url = $"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}?key={apiKey}";
        var client = _httpClientFactory.CreateClient();
        var response = await client.GetAsync(url);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("API key method failed ({StatusCode}), falling back to CSV", response.StatusCode);
            return await FetchViaCsvAsync(spreadsheetId);
        }

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("values", out var valuesElement) || valuesElement.GetArrayLength() == 0)
            return new List<List<string>>();

        var rows = new List<List<string>>();
        foreach (var row in valuesElement.EnumerateArray())
        {
            var cells = new List<string>();
            foreach (var cell in row.EnumerateArray())
            {
                cells.Add(cell.GetString() ?? string.Empty);
            }
            rows.Add(cells);
        }
        return rows;
    }

    private async Task<List<List<string>>> FetchViaCsvAsync(string spreadsheetId)
    {
        var url = $"https://docs.google.com/spreadsheets/d/{spreadsheetId}/gviz/tq?tqx=out:csv";
        var client = _httpClientFactory.CreateClient();
        var response = await client.GetAsync(url);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("CSV export failed ({StatusCode}): {Body}", response.StatusCode, body);
            throw new HttpRequestException($"Google Sheets CSV export returned {(int)response.StatusCode}");
        }

        var csv = await response.Content.ReadAsStringAsync();
        return ParseCsv(csv);
    }

    private static List<List<string>> ParseCsv(string csv)
    {
        var rows = new List<List<string>>();
        var current = new List<string>();
        var field = new System.Text.StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < csv.Length; i++)
        {
            char c = csv[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < csv.Length && csv[i + 1] == '"')
                    {
                        field.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    field.Append(c);
                }
            }
            else
            {
                if (c == '"')
                {
                    inQuotes = true;
                }
                else if (c == ',')
                {
                    current.Add(field.ToString().Trim());
                    field.Clear();
                }
                else if (c == '\n' || c == '\r')
                {
                    if (c == '\r' && i + 1 < csv.Length && csv[i + 1] == '\n')
                        i++;

                    current.Add(field.ToString().Trim());
                    field.Clear();

                    if (current.Count > 0 && !string.IsNullOrWhiteSpace(current[0]))
                    {
                        rows.Add(current);
                    }
                    current = new List<string>();
                }
                else
                {
                    field.Append(c);
                }
            }
        }

        if (field.Length > 0 || current.Count > 0)
        {
            current.Add(field.ToString().Trim());
            if (current.Count > 0 && !string.IsNullOrWhiteSpace(current[0]))
            {
                rows.Add(current);
            }
        }

        return rows;
    }

    private static List<EmpresaAcesso> ParseEmpresas(List<List<string>> rows)
    {
        var empresas = new List<EmpresaAcesso>();
        if (rows.Count < 2) return empresas;

        for (int i = 1; i < rows.Count; i++)
        {
            var row = rows[i];
            var nome = GetCell(row, 0);
            if (string.IsNullOrWhiteSpace(nome)) continue;

            empresas.Add(new EmpresaAcesso
            {
                Id = i,
                NomeEmpresa = nome,
                TsAcesso = GetCell(row, 1),
                TsIP = GetCell(row, 2),
                TsCredenciais = GetCell(row, 3),
                BancoIP = GetCell(row, 4),
                BancoCredenciais = GetCell(row, 5),
                VpnTipo = GetCell(row, 6),
                VpnNome = GetCell(row, 7),
                VpnGateway = GetCell(row, 8),
                VpnCredenciais = GetCell(row, 9),
                BancoNome = GetCell(row, 10),
                Versao = GetCell(row, 11),
                Rede = GetCell(row, 12),
                AcessoActyonWeb = GetCell(row, 13),
                AnyDesk = GetCell(row, 14),
                Observacoes = GetCell(row, 15)
            });
        }

        return empresas;
    }

    private static string GetCell(List<string> row, int index)
    {
        if (index < 0 || index >= row.Count) return string.Empty;
        return row[index]?.Trim() ?? string.Empty;
    }
}
