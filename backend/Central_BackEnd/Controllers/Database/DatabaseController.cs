using Asp.Versioning;
using Central_BackEnd.Dtos.Database;
using Central_BackEnd.Services.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Diagnostics;

namespace Central_BackEnd.Controllers.Database;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/database")]
[Authorize]
public class DatabaseController : ControllerBase
{
    private readonly IDatabaseConnectionService _conn;
    private readonly IDatabaseMetadataService _meta;
    private readonly IDatabaseRelationshipInferenceService _rels;
    private readonly IDatabaseSearchService _search;
    private readonly IDatabaseQueryBuilderService _queryBuilder;
    private readonly IDatabaseSchemaComparisonService _comparison;

    public DatabaseController(
        IDatabaseConnectionService conn,
        IDatabaseMetadataService meta,
        IDatabaseRelationshipInferenceService rels,
        IDatabaseSearchService search,
        IDatabaseQueryBuilderService queryBuilder,
        IDatabaseSchemaComparisonService comparison)
    {
        _conn = conn;
        _meta = meta;
        _rels = rels;
        _search = search;
        _queryBuilder = queryBuilder;
        _comparison = comparison;
    }

    private async Task<(bool Ok, string? Msg, int Ms)> TestarConexaoAsync(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await using var c = await _conn.OpenAsync(ct);
            await using var cmd = c.CreateCommand();
            cmd.CommandText = "SELECT 1";
            await cmd.ExecuteScalarAsync(ct);
            sw.Stop();
            return (true, "Conexão OK", (int)sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            return (false, ex.Message, (int)sw.ElapsedMilliseconds);
        }
    }

    [HttpGet("status")]
    public async Task<ActionResult<DatabaseStatusDto>> GetStatus(CancellationToken ct = default)
    {
        var cfg = _conn.GetConfig();
        var (ok, msg, ms) = await TestarConexaoAsync(ct);
        return Ok(new DatabaseStatusDto(ok, cfg.Servidor, cfg.Banco, msg, DateTime.UtcNow, ms));
    }

    [HttpGet("info")]
    public async Task<ActionResult<DatabaseInfoDto>> GetInfo(CancellationToken ct = default)
    {
        return Ok(await _meta.ObterInfoAsync(ct));
    }

    [HttpGet("tables")]
    public async Task<ActionResult<List<TableDto>>> GetTables(
        [FromQuery] string? schema = null,
        [FromQuery] string? filtro = null,
        CancellationToken ct = default)
    {
        var tabelas = await _meta.ListarTabelasAsync(schema, ct);
        if (!string.IsNullOrWhiteSpace(filtro))
        {
            tabelas = tabelas
                .Where(t => t.NomeCompleto.Contains(filtro, StringComparison.OrdinalIgnoreCase)
                         || t.Nome.Contains(filtro, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }
        return Ok(tabelas);
    }

    [HttpGet("tables/{schema}/{nome}")]
    public async Task<ActionResult<TableDto>> GetTable(
        string schema, string nome,
        CancellationToken ct = default)
    {
        var tabela = await _meta.ObterTabelaAsync(schema, nome, ct);
        if (tabela == null) return NotFound();
        return Ok(tabela);
    }

    [HttpGet("tables/{schema}/{nome}/columns")]
    public async Task<ActionResult<List<ColumnDto>>> GetColumns(
        string schema, string nome,
        CancellationToken ct = default)
    {
        return Ok(await _meta.ListarColunasAsync(schema, nome, ct));
    }

    [HttpGet("tables/{schema}/{nome}/indexes")]
    public async Task<ActionResult<List<IndexDto>>> GetIndexes(
        string schema, string nome,
        CancellationToken ct = default)
    {
        return Ok(await _meta.ListarIndicesAsync(schema, nome, ct));
    }

    [HttpGet("relationships")]
    public async Task<ActionResult<List<RelationshipDto>>> GetRelationships(
        [FromQuery] string? schema = null,
        [FromQuery] string? tabela = null,
        [FromQuery] bool incluirPossiveis = false,
        [FromQuery] int take = 500,
        CancellationToken ct = default)
    {
        var lista = await _rels.ListarConfirmadasAsync(schema, ct);
        if (incluirPossiveis)
            lista.AddRange(await _rels.ListarPossiveisAsync(schema, take, ct));
        if (!string.IsNullOrWhiteSpace(tabela))
        {
            var filtro = tabela.Trim();
            lista = lista.Where(r =>
                r.TabelaOrigem.Contains(filtro, StringComparison.OrdinalIgnoreCase) ||
                r.TabelaDestino.Contains(filtro, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }
        return Ok(lista);
    }

    [HttpGet("graph")]
    public async Task<ActionResult<List<RelationshipDto>>> GetGraph(
        [FromQuery] string tabela,
        [FromQuery] int profundidade = 2,
        [FromQuery] bool incluirPossiveis = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(tabela))
            return BadRequest(new { mensagem = "Parâmetro 'tabela' é obrigatório" });
        return Ok(await _rels.ListarGrafoAsync(tabela, profundidade, incluirPossiveis, ct));
    }

    [HttpGet("column-usage")]
    public async Task<ActionResult<List<RelationshipDto>>> GetColumnUsage(
        [FromQuery] string coluna,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(coluna))
            return BadRequest(new { mensagem = "Parâmetro 'coluna' é obrigatório" });
        return Ok(await _rels.OndeColunaUsadaAsync(coluna, ct));
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<DatabaseSearchResult>>> Search(
        [FromQuery] string termo,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(termo))
            return Ok(new List<DatabaseSearchResult>());
        return Ok(await _search.BuscarAsync(termo, take, ct));
    }

    [HttpGet("procedures")]
    public async Task<ActionResult<List<ProcedureResumoDto>>> GetProcedures(
        [FromQuery] string? schema = null,
        [FromQuery] string? busca = null,
        [FromQuery] int take = 5000,
        CancellationToken ct = default)
    {
        return Ok(await _meta.ListarProceduresAsync(schema, busca, take, ct));
    }

    [HttpGet("procedures/{schema}/{nome}")]
    public async Task<ActionResult<ProcedureDetalheDto>> GetProcedure(
        string schema, string nome,
        CancellationToken ct = default)
    {
        var proc = await _meta.ObterProcedureAsync(schema, nome, ct);
        if (proc == null) return NotFound();
        return Ok(proc);
    }

    [HttpGet("triggers")]
    public async Task<ActionResult<List<TriggerDto>>> GetTriggers(
        [FromQuery] string? schema = null,
        [FromQuery] string? tabela = null,
        CancellationToken ct = default)
    {
        return Ok(await _meta.ListarTriggersAsync(schema, tabela, ct));
    }

    [HttpGet("triggers/{schema}/{nome}")]
    public async Task<ActionResult<TriggerDto>> GetTrigger(
        string schema, string nome,
        CancellationToken ct = default)
    {
        var trigger = await _meta.ObterTriggerAsync(schema, nome, ct);
        if (trigger == null) return NotFound();
        return Ok(trigger);
    }

    [HttpGet("tables/{schema}/{nome}/dependencies")]
    public async Task<ActionResult<List<DependencyDto>>> GetDependencies(
        string schema, string nome,
        CancellationToken ct = default)
    {
        return Ok(await _meta.ListarDependenciasAsync(schema, nome, ct));
    }

    [HttpGet("procedures/{schema}/{nome}/analysis")]
    public async Task<ActionResult<ProcedureAnalysisDto>> GetProcedureAnalysis(
        string schema, string nome,
        CancellationToken ct = default)
    {
        var analysis = await _meta.AnalisarProcedureAsync(schema, nome, ct);
        if (analysis == null) return NotFound();
        return Ok(analysis);
    }

    [HttpGet("search/global")]
    public async Task<ActionResult<List<GlobalSearchResultDto>>> GlobalSearch(
        [FromQuery] string termo,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(termo))
            return Ok(new List<GlobalSearchResultDto>());
        var resultados = await _search.BuscarAsync(termo, take, ct);
        return Ok(resultados
            .Select(r => new GlobalSearchResultDto(r.Tipo, r.Schema ?? "", r.Objeto, r.Coluna, r.Detalhe))
            .ToList());
    }

    [HttpPost("query-builder-advanced")]
    public async Task<ActionResult<Central_BackEnd.Dtos.Database.DatabaseQueryBuilderResult>> QueryBuilderAdvanced(
        [FromBody] QueryBuilderAdvancedRequest req,
        CancellationToken ct = default)
    {
        if (req == null || req.Tabelas == null || req.Tabelas.Count == 0)
            return BadRequest(new { mensagem = "Pelo menos uma tabela deve ser selecionada" });

        var resultado = await _queryBuilder.MontarConsultaAvancadaAsync(req, ct);
        return Ok(resultado);
    }

    [HttpGet("config")]
    public ActionResult<DatabaseConnectionConfigDto> GetConfig()
    {
        var c = _conn.GetConfig();
        return Ok(new DatabaseConnectionConfigDto(
            c.Servidor, c.Porta, c.Banco, c.Usuario,
            string.IsNullOrEmpty(c.Senha) ? null : "***",
            c.Encrypt, c.TrustServerCertificate));
    }

    [HttpPost("test-connection")]
    public async Task<ActionResult<DatabaseStatusDto>> TestConnection(CancellationToken ct = default)
    {
        var cfg = _conn.GetConfig();
        var (ok, msg, ms) = await TestarConexaoAsync(ct);
        return Ok(new DatabaseStatusDto(ok, cfg.Servidor, cfg.Banco, msg, DateTime.UtcNow, ms));
    }

    [HttpPost("compare-schemas")]
    [EnableRateLimiting("validacao")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<SchemaComparisonResultDto>> CompareSchemas(
        [FromForm] string schema,
        [FromForm] string tabela,
        IFormFile arquivo,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(schema))
            return BadRequest(new { mensagem = "Schema e obrigatorio" });
        if (string.IsNullOrWhiteSpace(tabela))
            return BadRequest(new { mensagem = "Tabela e obrigatoria" });
        if (arquivo == null || arquivo.Length == 0)
            return BadRequest(new { mensagem = "Arquivo e obrigatorio" });

        try
        {
            var resultado = await _comparison.CompararComArquivoAsync(schema, tabela, arquivo, ct);
            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (System.Text.Json.JsonException ex)
        {
            return BadRequest(new { mensagem = $"JSON invalido no arquivo: {ex.Message}" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }
}
