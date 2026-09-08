using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/projetos")]
[Authorize]
[EnableRateLimiting("validacao")]
public class ProjetosController : ControllerBase
{
    private readonly IProjetoService _service;
    public ProjetosController(IProjetoService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<List<ProjetoResumo>>> Listar(
        [FromQuery] string? equipe, [FromQuery] string? tipo, [FromQuery] string? status,
        [FromQuery] int? clienteId, [FromQuery] string? responsavelId, [FromQuery] string? buscar,
        CancellationToken ct = default)
    {
        var filtro = new ProjetoFiltro(equipe, tipo, status, clienteId, responsavelId, buscar);
        return Ok(await _service.ListarAsync(filtro, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProjetoDetalhe>> Obter(int id, CancellationToken ct = default)
    {
        var p = await _service.ObterAsync(id, ct);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpGet("proximo-codigo")]
    public async Task<ActionResult<object>> ProximoCodigo([FromQuery] int equipeId, CancellationToken ct = default)
        => Ok(new { codigo = await _service.ProximoCodigoAsync(equipeId, ct) });

    [HttpPost]
    public async Task<ActionResult<ProjetoDetalhe>> Criar([FromBody] ProjetoCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var p = await _service.CriarAsync(req, ct);
            return CreatedAtAction(nameof(Obter), new { id = p.Id }, p);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProjetoDetalhe>> Atualizar(int id, [FromBody] ProjetoAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var p = await _service.AtualizarAsync(id, req, ct);
            return p == null ? NotFound() : Ok(p);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ProjetoDetalhe>> MudarStatus(int id, [FromBody] ProjetoMudarStatusRequest req, CancellationToken ct = default)
    {
        try
        {
            var p = await _service.MudarStatusAsync(id, req, ct);
            return p == null ? NotFound() : Ok(p);
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
