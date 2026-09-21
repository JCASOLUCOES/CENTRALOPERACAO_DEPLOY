using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/colunas-kanban")]
[Authorize]
public class ColunasKanbanController : ControllerBase
{
    private readonly IColunaKanbanService _service;
    public ColunasKanbanController(IColunaKanbanService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<List<ColunaKanbanResumo>>> Listar([FromQuery] bool apenasAtivas = true, CancellationToken ct = default)
        => Ok(await _service.ListarAsync(apenasAtivas, ct));

    // Colunas do Kanban são FIXAS (7 colunas via seed). Escrita restrita a Administrador.
    [HttpPost]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<ColunaKanbanResumo>> Criar([FromBody] ColunaKanbanCriarRequest req, CancellationToken ct = default)
    {
        try { return Ok(await _service.CriarAsync(req, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { mensagem = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<ColunaKanbanResumo>> Atualizar(int id, [FromBody] ColunaKanbanAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var c = await _service.AtualizarAsync(id, req, ct);
            return c == null ? NotFound() : Ok(c);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult> Excluir(int id, CancellationToken ct = default)
    {
        try
        {
            var ok = await _service.ExcluirAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPost("reordenar")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult> Reordenar([FromBody] ColunaKanbanReordenarRequest req, CancellationToken ct = default)
    {
        await _service.ReordenarAsync(req, ct);
        return NoContent();
    }
}
