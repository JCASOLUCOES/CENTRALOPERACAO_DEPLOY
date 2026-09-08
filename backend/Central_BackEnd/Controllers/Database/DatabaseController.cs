using Asp.Versioning;
using Central_BackEnd.Dtos.Database;
using Central_BackEnd.Services.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Central_BackEnd.Controllers.Database;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/database")]
[Authorize]
[EnableRateLimiting("validacao")]
public class DatabaseController : ControllerBase
{
    private readonly IDatabaseMetadataService _meta;
    private readonly IDatabaseRelationshipInferenceService _inference;
    private readonly IDatabaseQueryService _query;
    private readonly IDatabaseSearchService _search;
    private readonly IDatabaseConnectionService _conn;
    private readonly IDatabaseQueryBuilderService _queryBuilder;
    private readonly ILogger<DatabaseController> _logger;

    public DatabaseController(
        IDatabaseMetadataService meta,
        IDatabaseRelationshipInferenceService inference,
        IDatabaseQueryService query,
        IDatabaseSearchService search,
        IDatabaseConnectionService conn,
        IDatabaseQueryBuilderService queryBuilder,
        ILogger<DatabaseController> logger)
    {
        _meta = meta;
        _inference = inference;
        _query = query;
        _search = search;
        _conn = conn;
        _queryBuilder = queryBuilder;
        _logger = logger;
    }

    [HttpGet("status")]
    public async Task<ActionResult<DatabaseStatusDto>> Status(CancellationToken ct)
    {
        var ini = DateTime.Now;
        try
        {
            await using var c = await _conn.OpenAsync(ct);
            return Ok(new DatabaseStatusDto(true, _conn.GetConfig().Servidor, _conn.GetConfig().Banco, null, DateTime.Now, (int)(DateTime.Now - ini).TotalMilliseconds));
        }
        catch (Exception ex)
        {
            return Ok(new DatabaseStatusDto(false, _conn.GetConfig().Servidor, _conn.GetConfig().Banco, ex.Message, DateTime.Now, (int)(DateTime.Now - ini).TotalMilliseconds));
        }
    }

    [HttpGet("info")]
    public async Task<ActionResult<DatabaseInfoDto>> Info(CancellationToken ct)
        => Ok(await _meta.ObterInfoAsync(ct));

    [HttpGet("tables")]
    public async Task<ActionResult<List<TableDto>>> Tables([FromQuery] string? schema, CancellationToken ct)
        => Ok(await _meta.ListarTabelasAsync(schema, ct));

    [HttpGet("tables/{schema}/{nome}")]
    public async Task<ActionResult<TableDto>> Table(string schema, string nome, CancellationToken ct)
    {
        var t = await _meta.ObterTabelaAsync(schema, nome, ct);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpGet("tables/{schema}/{nome}/columns")]
    public async Task<ActionResult<List<ColumnDto>>> Columns(string schema, string nome, CancellationToken ct)
        => Ok(await _meta.ListarColunasAsync(schema, nome, ct));

    [HttpGet("tables/{schema}/{nome}/indexes")]
    public async Task<ActionResult<List<IndexDto>>> Indexes(string schema, string nome, CancellationToken ct)
        => Ok(await _meta.ListarIndicesAsync(schema, nome, ct));

    [HttpGet("relationships")]
    public async Task<ActionResult<List<RelationshipDto>>> Relationships(
        [FromQuery] string? schema,
        [FromQuery] bool incluirPossiveis = false,
        [FromQuery] int take = 500,
        CancellationToken ct = default)
    {
        var confirmadas = await _inference.ListarConfirmadasAsync(schema, ct);
        var lista = new List<RelationshipDto>(confirmadas);
        if (incluirPossiveis)
        {
            var possiveis = await _inference.ListarPossiveisAsync(schema, take, ct);
            // Possiveis vem sem relacao cruzada com confirmadas; mesclamos
            foreach (var p in possiveis)
            {
                if (!confirmadas.Any(c => c.TabelaOrigem == p.TabelaOrigem && c.ColunaOrigem == p.ColunaOrigem && c.TabelaDestino == p.TabelaDestino))
                    lista.Add(p);
            }
        }
        return Ok(lista.OrderByDescending(r => r.Score).Take(take).ToList());
    }

    [HttpGet("column-usage")]
    public async Task<ActionResult<List<RelationshipDto>>> ColumnUsage([FromQuery] string coluna, CancellationToken ct)
        => Ok(await _inference.OndeColunaUsadaAsync(coluna, ct));

    [HttpGet("graph")]
    public async Task<ActionResult<List<RelationshipDto>>> Graph(
        [FromQuery] string tabela,
        [FromQuery] int profundidade = 2,
        [FromQuery] bool incluirPossiveis = false,
        CancellationToken ct = default)
        => Ok(await _inference.ListarGrafoAsync(tabela, profundidade, incluirPossiveis, ct));

    [HttpGet("search")]
    public async Task<ActionResult<List<DatabaseSearchResult>>> Search(
        [FromQuery] string termo,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
        => Ok(await _search.BuscarAsync(termo, take, ct));

    [HttpPost("query")]
    public async Task<ActionResult<QueryResultDto>> Query([FromBody] QueryRequest req, CancellationToken ct = default)
    {
        if (req == null) return BadRequest(new { mensagem = "Requisicao vazia" });
        return Ok(await _query.ExecutarAsync(req, ct));
    }

    [HttpPost("test-connection")]
    public async Task<ActionResult<DatabaseStatusDto>> TestConnection(CancellationToken ct)
    {
        var ini = DateTime.Now;
        try
        {
            await using var c = await _conn.OpenAsync(ct);
            return Ok(new DatabaseStatusDto(true, _conn.GetConfig().Servidor, _conn.GetConfig().Banco, null, DateTime.Now, (int)(DateTime.Now - ini).TotalMilliseconds));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha no teste de conexao");
            return Ok(new DatabaseStatusDto(false, _conn.GetConfig().Servidor, _conn.GetConfig().Banco, ex.Message, DateTime.Now, (int)(DateTime.Now - ini).TotalMilliseconds));
        }
    }

    [HttpGet("procedures")]
    public async Task<ActionResult<List<ProcedureResumoDto>>> Procedures(
        [FromQuery] string? schema,
        [FromQuery] string? busca,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
        => Ok(await _meta.ListarProceduresAsync(schema, busca, take, ct));

    [HttpGet("procedures/{schema}/{nome}")]
    public async Task<ActionResult<ProcedureDetalheDto>> Procedure(string schema, string nome, CancellationToken ct = default)
    {
        var p = await _meta.ObterProcedureAsync(schema, nome, ct);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpGet("procedures/search")]
    public async Task<ActionResult<List<ProcedureResumoDto>>> ProceduresSearch(
        [FromQuery] string termo,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
        => Ok(await _meta.ListarProceduresAsync(null, termo, take, ct));

    [HttpPost("query-builder")]
    public async Task<ActionResult<Central_BackEnd.Dtos.Database.DatabaseQueryBuilderResult>> QueryBuilder(
        [FromBody] QueryBuilderRequest req,
        CancellationToken ct = default)
    {
        if (req == null || req.Tabelas == null || req.Tabelas.Count == 0)
            return BadRequest(new { mensagem = "Pelo menos uma tabela deve ser selecionada" });
        
        var resultado = await _queryBuilder.MontarConsultaAsync(req.Tabelas, req.Colunas ?? new(), req.Relacionamentos ?? new(), ct);
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

    [HttpPut("config")]
    public ActionResult UpdateConfig([FromBody] DatabaseConnectionConfigDto req)
    {
        if (req == null) return BadRequest(new { mensagem = "Requisicao vazia" });
        _conn.UpdateConfig(new DatabaseConnectionConfig
        {
            Servidor = req.Servidor,
            Porta = req.Porta,
            Banco = req.Banco,
            Usuario = req.Usuario,
            Senha = req.Senha ?? string.Empty,
            Encrypt = req.Encrypt,
            TrustServerCertificate = req.TrustServerCertificate
        });
        return NoContent();
    }
}
