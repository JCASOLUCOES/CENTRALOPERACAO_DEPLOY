using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/tarefas")]
[Authorize]
[EnableRateLimiting("validacao")]
public class TarefasController : ControllerBase
{
    private readonly ITarefaService _service;
    public TarefasController(ITarefaService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<List<TarefaResumo>>> Listar(
        [FromQuery] int? projetoId, [FromQuery] string? equipe,
        [FromQuery] string? responsavelId, [FromQuery] string? status,
        [FromQuery] int? prioridade, [FromQuery] string? buscar,
        [FromQuery] bool? apenasAtrasadas, [FromQuery] bool? apenasEmAndamento, [FromQuery] bool? apenasConcluidas,
        CancellationToken ct = default)
    {
        var f = new TarefaFiltro(projetoId, equipe, responsavelId, status, prioridade, buscar, apenasAtrasadas, apenasEmAndamento, apenasConcluidas);
        var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Ok(await _service.ListarAsync(f, operador, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TarefaDetalhe>> Obter(int id, CancellationToken ct = default)
    {
        var t = await _service.ObterAsync(id, ct);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpPost]
    public async Task<ActionResult<TarefaDetalhe>> Criar([FromBody] TarefaCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.CriarAsync(req, ct);
            return CreatedAtAction(nameof(Obter), new { id = t.Id }, t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TarefaDetalhe>> Atualizar(int id, [FromBody] TarefaAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.AtualizarAsync(id, req, ct);
            return t == null ? NotFound() : Ok(t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPatch("{id:int}/coluna")]
    public async Task<ActionResult<TarefaDetalhe>> MudarColuna(int id, [FromBody] TarefaMudarColunaRequest req, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.MudarColunaAsync(id, req, ct);
            return t == null ? NotFound() : Ok(t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Excluir(int id, CancellationToken ct = default)
    {
        var ok = await _service.ExcluirAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:int}/comentarios")]
    public async Task<ActionResult<ComentarioTarefaResumo>> AdicionarComentario(int id, [FromBody] ComentarioCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var c = await _service.AdicionarComentarioAsync(id, req, ct);
            return Ok(c);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }
}

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;
    public DashboardController(IDashboardService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<DashboardGeral>> Obter([FromQuery] string? equipe, CancellationToken ct = default)
        => Ok(await _service.ObterGeralAsync(equipe, ct));
}
