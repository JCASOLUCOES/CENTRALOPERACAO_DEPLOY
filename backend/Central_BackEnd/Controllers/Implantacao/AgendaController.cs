using System.Security.Claims;
using Asp.Versioning;
using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/agenda")]
[Authorize]
[EnableRateLimiting("validacao")]
public class AgendaController : ControllerBase
{
    private readonly IAgendaService _service;
    private readonly AppDbContext _db;
    public AgendaController(IAgendaService service, AppDbContext db)
    {
        _service = service;
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<AgendaResumo>>> Listar(
        [FromQuery] DateTime? inicio,
        [FromQuery] DateTime? fim,
        [FromQuery] string? operadorId,
        [FromQuery] string? visibilidade,
        [FromQuery] int? projetoId,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
    {
        var usuarioLogado = ObterOperadorId();
        if (string.IsNullOrEmpty(usuarioLogado)) return Unauthorized();
        return Ok(await _service.ListarAsync(inicio, fim, operadorId, visibilidade, projetoId, take, usuarioLogado, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AgendaDetalhe>> Obter(int id, CancellationToken ct = default)
    {
        var usuarioLogado = ObterOperadorId();
        if (string.IsNullOrEmpty(usuarioLogado)) return Unauthorized();
        var isAdmin = await EhAdmin(usuarioLogado, ct);
        var a = await _service.ObterAsync(id, usuarioLogado, isAdmin, ct);
        return a == null ? NotFound() : Ok(a);
    }

    [HttpPost]
    public async Task<ActionResult<AgendaDetalhe>> Criar([FromBody] AgendaCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var a = await _service.CriarAsync(req, ct);
            return CreatedAtAction(nameof(Obter), new { id = a.Id }, a);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AgendaDetalhe>> Atualizar(int id, [FromBody] AgendaAtualizarRequest req, CancellationToken ct = default)
    {
        var usuarioLogado = ObterOperadorId();
        if (string.IsNullOrEmpty(usuarioLogado)) return Unauthorized();
        var isAdmin = await EhAdmin(usuarioLogado, ct);
        try
        {
            var a = await _service.AtualizarAsync(id, req, usuarioLogado, isAdmin, ct);
            return a == null ? NotFound() : Ok(a);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Excluir(int id, CancellationToken ct = default)
    {
        var usuarioLogado = ObterOperadorId();
        if (string.IsNullOrEmpty(usuarioLogado)) return Unauthorized();
        var isAdmin = await EhAdmin(usuarioLogado, ct);
        var ok = await _service.ExcluirAsync(id, usuarioLogado, isAdmin, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("ics/{operadorId}")]
    public async Task<IActionResult> ExportarIcs(string operadorId,
        [FromQuery] DateTime? inicio, [FromQuery] DateTime? fim, CancellationToken ct = default)
    {
        var usuarioLogado = ObterOperadorId();
        if (string.IsNullOrEmpty(usuarioLogado)) return Unauthorized();
        var itens = await _service.ListarAsync(inicio, fim, operadorId, null, null, 1000, usuarioLogado, ct);
        var bytes = _service.ExportarIcs(operadorId, itens);
        return File(bytes, "text/calendar", $"agenda-{operadorId}.ics");
    }

    private string? ObterOperadorId()
        => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

    private async Task<bool> EhAdmin(string operadorId, CancellationToken ct)
    {
        var op = await _db.Operadores.AsNoTracking()
            .Where(o => o.OperadorId == operadorId)
            .Select(o => o.SeAdmin)
            .FirstOrDefaultAsync(ct);
        return op == true;
    }
}
