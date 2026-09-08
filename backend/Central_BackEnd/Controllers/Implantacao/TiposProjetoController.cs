using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/tipos-projeto")]
[Authorize]
public class TiposProjetoController : ControllerBase
{
    private readonly ITipoProjetoService _service;
    public TiposProjetoController(ITipoProjetoService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<List<TipoProjetoResumo>>> Listar([FromQuery] int? equipeId, [FromQuery] bool apenasAtivos = true, CancellationToken ct = default)
        => Ok(await _service.ListarAsync(equipeId, apenasAtivos, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TipoProjetoResumo>> Obter(int id, CancellationToken ct = default)
    {
        var t = await _service.ObterAsync(id, ct);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpPost]
    public async Task<ActionResult<TipoProjetoResumo>> Criar([FromBody] TipoProjetoCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.CriarAsync(req, ct);
            return CreatedAtAction(nameof(Obter), new { id = t.Id }, t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TipoProjetoResumo>> Atualizar(int id, [FromBody] TipoProjetoAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.AtualizarAsync(id, req, ct);
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
}
