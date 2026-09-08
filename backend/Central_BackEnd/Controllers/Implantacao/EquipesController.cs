using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/equipes")]
[Authorize]
[EnableRateLimiting("validacao")]
public class EquipesController : ControllerBase
{
    private readonly IEquipeService _service;
    public EquipesController(IEquipeService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<List<EquipeResumo>>> Listar([FromQuery] bool apenasAtivas = true, CancellationToken ct = default)
        => Ok(await _service.ListarAsync(apenasAtivas, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EquipeDetalhe>> Obter(int id, CancellationToken ct = default)
    {
        var e = await _service.ObterAsync(id, ct);
        return e == null ? NotFound() : Ok(e);
    }

    [HttpPost]
    public async Task<ActionResult<EquipeDetalhe>> Criar([FromBody] EquipeCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var e = await _service.CriarAsync(req, ct);
            return CreatedAtAction(nameof(Obter), new { id = e.Id }, e);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EquipeDetalhe>> Atualizar(int id, [FromBody] EquipeAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var e = await _service.AtualizarAsync(id, req, ct);
            return e == null ? NotFound() : Ok(e);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPost("{id:int}/membros")]
    public async Task<ActionResult> AdicionarMembro(int id, [FromBody] MembroAdicionarRequest req, CancellationToken ct = default)
    {
        try
        {
            var ok = await _service.AdicionarMembroAsync(id, req, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpDelete("{id:int}/membros/{membroId:int}")]
    public async Task<ActionResult> RemoverMembro(int id, int membroId, CancellationToken ct = default)
    {
        var ok = await _service.RemoverMembroAsync(id, membroId, ct);
        return ok ? NoContent() : NotFound();
    }
}
