using Asp.Versioning;
using Central_BackEnd.Dtos.Gestor;
using Central_BackEnd.Services.Gestor;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Central_BackEnd.Controllers.Gestor;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/gestor")]
[Authorize(Roles = "Administrador")]
public class GestorController : ControllerBase
{
    private readonly IGestorMetricasService _service;

    public GestorController(IGestorMetricasService service) => _service = service;

    [HttpGet("metricas")]
    public async Task<ActionResult<GestorMetricasResponseDto>> ObterMetricas(
        [FromQuery] string painel = "ceo",
        [FromQuery] int? funcaoId = null,
        [FromQuery] string periodo = "30d",
        CancellationToken ct = default)
    {
        try
        {
            var resultado = await _service.ObterMetricasAsync(painel, funcaoId, periodo, ct);
            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }

    [HttpGet("ceo/metricas")]
    public async Task<ActionResult<GestorMetricasResponseDto>> ObterMetricasCeo(
        [FromQuery] int? funcaoId = null,
        [FromQuery] string periodo = "30d",
        CancellationToken ct = default)
    {
        var resultado = await _service.ObterMetricasCeoAsync(funcaoId, periodo, ct);
        return Ok(resultado);
    }

    [HttpGet("cto/metricas")]
    public async Task<ActionResult<GestorMetricasResponseDto>> ObterMetricasCto(
        [FromQuery] int? funcaoId = null,
        [FromQuery] string periodo = "30d",
        CancellationToken ct = default)
    {
        var resultado = await _service.ObterMetricasCtoAsync(funcaoId, periodo, ct);
        return Ok(resultado);
    }

    [HttpGet("coo/metricas")]
    public async Task<ActionResult<GestorMetricasResponseDto>> ObterMetricasCoo(
        [FromQuery] int? funcaoId = null,
        [FromQuery] string periodo = "30d",
        CancellationToken ct = default)
    {
        var resultado = await _service.ObterMetricasCooAsync(funcaoId, periodo, ct);
        return Ok(resultado);
    }
}