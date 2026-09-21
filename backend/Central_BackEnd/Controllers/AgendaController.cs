using System.Security.Claims;
using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Exceptions;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Central_BackEnd.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/agenda")]
[Authorize]
public class AgendaController : ControllerBase
{
    private readonly IAgendaService _service;
    private readonly ILogger<AgendaController> _logger;
    private readonly IHostEnvironment _env;

    public AgendaController(IAgendaService service, ILogger<AgendaController> logger, IHostEnvironment env)
    {
        _service = service;
        _logger = logger;
        _env = env;
    }

    [HttpGet("eventos")]
    [EnableRateLimiting("leitura")]
    public async Task<ActionResult<List<AgendaResumo>>> ListarEventos(
        [FromQuery] DateTime inicio,
        [FromQuery] DateTime fim,
        [FromQuery] string? responsavelId = null,
        [FromQuery] int? funcaoId = null,
        CancellationToken ct = default)
    {
        try
        {
            var eventos = await _service.ListarEventosAsync(inicio, fim, responsavelId, funcaoId, ct);
            return Ok(eventos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AgendaController.ListarEventos] inicio={Inicio} fim={Fim}", inicio, fim);
            if (_env.IsDevelopment())
                return StatusCode(500, new { mensagem = "Erro ao listar eventos", detalhe = ex.Message });
            return StatusCode(500, new { mensagem = "Erro ao listar eventos" });
        }
    }

    [HttpGet("eventos/{id:int}")]
    [EnableRateLimiting("leitura")]
    public async Task<ActionResult<AgendaDetalhe>> ObterEvento(int id, CancellationToken ct = default)
    {
        try
        {
            var evento = await _service.ObterEventoAsync(id, ct);
            return evento == null ? NotFound(new { mensagem = "Evento não encontrado" }) : Ok(evento);
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao obter evento" });
        }
    }

    [HttpPost("eventos")]
    [EnableRateLimiting("validacao")]
    public async Task<ActionResult<AgendaDetalhe>> CriarEvento([FromBody] AgendaCriarRequest request, CancellationToken ct = default)
    {
        try
        {
            var usuarioId = ObterOperadorId();
            if (string.IsNullOrEmpty(usuarioId)) return Unauthorized();

            var evento = await _service.CriarEventoAsync(request, usuarioId, ct);
            return CreatedAtAction(nameof(ObterEvento), new { id = evento.Id }, evento);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { mensagem = ex.Message, conflitos = ex.Conflitos, code = ex.Code });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao criar evento" });
        }
    }

    [HttpPost("eventos/lote")]
    [EnableRateLimiting("validacao")]
    public async Task<ActionResult<AgendaLoteResponse>> CriarEventosLote(
        [FromBody] AgendaCriarLoteRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var usuarioId = ObterOperadorId();
            if (string.IsNullOrEmpty(usuarioId)) return Unauthorized();

            var resultado = await _service.CriarEventosLoteAsync(request, usuarioId, ct);
            return CreatedAtAction(nameof(ObterEvento), new { id = resultado.Eventos.FirstOrDefault()?.Id }, resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { mensagem = ex.Message, conflitos = ex.Conflitos, code = ex.Code });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao criar eventos em lote" });
        }
    }

    [HttpPut("eventos/{id:int}")]
    [EnableRateLimiting("validacao")]
    public async Task<ActionResult<AgendaDetalhe>> AtualizarEvento(
        int id,
        [FromBody] AgendaAtualizarRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var usuarioId = ObterOperadorId();
            if (string.IsNullOrEmpty(usuarioId)) return Unauthorized();

            var isAdmin = IsAdmin();
            var evento = await _service.AtualizarEventoAsync(id, request, usuarioId, isAdmin, ct);
            return evento == null ? NotFound(new { mensagem = "Evento não encontrado" }) : Ok(evento);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { mensagem = ex.Message, conflitos = ex.Conflitos, code = ex.Code });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { mensagem = ex.Message, code = ex.Code });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao atualizar evento" });
        }
    }

    [HttpDelete("eventos/{id:int}")]
    [EnableRateLimiting("validacao")]
    public async Task<ActionResult> ExcluirEvento(int id, CancellationToken ct = default)
    {
        try
        {
            var usuarioId = ObterOperadorId();
            if (string.IsNullOrEmpty(usuarioId)) return Unauthorized();

            var isAdmin = IsAdmin();
            var ok = await _service.ExcluirEventoAsync(id, usuarioId, isAdmin, ct);
            return ok ? NoContent() : NotFound(new { mensagem = "Evento não encontrado" });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { mensagem = ex.Message, code = ex.Code });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao excluir evento" });
        }
    }

    [HttpPatch("eventos/{id:int}/mover")]
    [EnableRateLimiting("validacao")]
    public async Task<ActionResult<AgendaDetalhe>> MoverEvento(
        int id,
        [FromBody] AgendaMoverRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var usuarioId = ObterOperadorId();
            if (string.IsNullOrEmpty(usuarioId)) return Unauthorized();

            var isAdmin = IsAdmin();
            var evento = await _service.MoverEventoAsync(id, request, usuarioId, isAdmin, ct);
            return evento == null ? NotFound(new { mensagem = "Evento não encontrado" }) : Ok(evento);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { mensagem = ex.Message, conflitos = ex.Conflitos, code = ex.Code });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { mensagem = ex.Message, code = ex.Code });
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao mover evento" });
        }
    }

    [HttpGet("tipos")]
    [EnableRateLimiting("leitura")]
    public async Task<ActionResult<List<TipoEventoResponse>>> ListarTipos(CancellationToken ct = default)
    {
        try
        {
            var tipos = await _service.ListarTiposAsync(ct);
            return Ok(tipos);
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao listar tipos" });
        }
    }

    [HttpGet("funcoes")]
    [EnableRateLimiting("leitura")]
    public async Task<ActionResult<List<FuncaoResumo>>> ListarFuncoes(CancellationToken ct = default)
    {
        try
        {
            var funcoes = await _service.ListarFuncoesAsync(ct);
            return Ok(funcoes);
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao listar funções" });
        }
    }

    [HttpGet("operadores")]
    [EnableRateLimiting("leitura")]
    public async Task<ActionResult<List<OperadorResumo>>> ListarOperadores(CancellationToken ct = default)
    {
        try
        {
            var operadores = await _service.ListarOperadoresAtivosAsync(ct);
            return Ok(operadores);
        }
        catch (Exception)
        {
            return StatusCode(500, new { mensagem = "Erro ao listar operadores" });
        }
    }

    private string? ObterOperadorId()
        => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

    private bool IsAdmin()
        => User.IsInRole("Administrador") || User.FindFirst("perfil")?.Value == "Administrador";
}