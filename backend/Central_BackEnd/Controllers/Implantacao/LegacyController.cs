using Asp.Versioning;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Central_BackEnd.Controllers.Implantacao;

/// <summary>
/// Endpoints read-only para consulta de dados legados do dbBUSINESS_HML.
/// Populam dropdowns no frontend (clientes, chamados, indicacoes, funcionarios).
/// Nenhuma escrita aqui - tabelas legadas nao sao alteradas pelo modulo IMPL.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/legacy")]
[Authorize]
public class LegacyController : ControllerBase
{
    private readonly ILegacyDataService _legacy;
    public LegacyController(ILegacyDataService legacy) { _legacy = legacy; }

    [HttpGet("clientes")]
    public async Task<ActionResult<List<ClienteLegadoResumo>>> ListarClientes(
        [FromQuery] string? buscar,
        [FromQuery] int take = 100,
        CancellationToken ct = default)
    {
        var t = Math.Clamp(take, 1, 500);
        return Ok(await _legacy.ListarClientesAsync(buscar, t, ct));
    }

    [HttpGet("clientes/{id:int}")]
    public async Task<ActionResult<ClienteLegadoResumo>> ObterCliente(int id, CancellationToken ct = default)
    {
        var c = await _legacy.ObterClienteAsync(id, ct);
        return c == null ? NotFound() : Ok(c);
    }

    [HttpGet("chamados")]
    public async Task<ActionResult<List<ChamadoLegadoResumo>>> ListarChamados(
        [FromQuery] int? clienteId,
        [FromQuery] string? buscar,
        [FromQuery] int take = 100,
        CancellationToken ct = default)
    {
        var t = Math.Clamp(take, 1, 500);
        return Ok(await _legacy.ListarChamadosAsync(clienteId, buscar, t, ct));
    }

    [HttpGet("indicacoes")]
    public async Task<ActionResult<List<IndicacaoLegadoResumo>>> ListarIndicacoes(CancellationToken ct = default)
        => Ok(await _legacy.ListarIndicacoesAsync(ct));

    [HttpGet("funcionarios")]
    public async Task<ActionResult<List<FuncionarioLegadoResumo>>> ListarFuncionarios(
        [FromQuery] string? buscar,
        [FromQuery] int take = 100,
        CancellationToken ct = default)
    {
        var t = Math.Clamp(take, 1, 500);
        return Ok(await _legacy.ListarFuncionariosAsync(buscar, t, ct));
    }
}
