using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/etapas")]
[Authorize]
public class EtapasController : ControllerBase
{
    private readonly IEtapaService _service;
    public EtapasController(IEtapaService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<List<EtapaResumo>>> Listar(
        [FromQuery] int? tipoProjetoId, [FromQuery] bool apenasAtivas = true, CancellationToken ct = default)
        => Ok(await _service.ListarAsync(tipoProjetoId, apenasAtivas, ct));

    // Etapas são FIXAS (seed por tipo). Escrita restrita a Administrador.
    // A leitura alimenta o vínculo Tarefa.EtapaId (tarefa-form, kanban).
    [HttpPost]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<EtapaResumo>> Criar([FromBody] EtapaCriarRequest req, CancellationToken ct = default)
    {
        try { return Ok(await _service.CriarAsync(req, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult<EtapaResumo>> Atualizar(int id, [FromBody] EtapaAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var e = await _service.AtualizarAsync(id, req, ct);
            return e == null ? NotFound() : Ok(e);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Administrador")]
    public async Task<ActionResult> Excluir(int id, CancellationToken ct = default)
    {
        var ok = await _service.ExcluirAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }
}
