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
        [FromQuery] int? prioridade, [FromQuery] int? tipo, [FromQuery] string? buscar,
        [FromQuery] bool? apenasAtrasadas, [FromQuery] bool? apenasEmAndamento, [FromQuery] bool? apenasConcluidas,
        [FromQuery] bool? apenasVenceHoje, [FromQuery] bool? incluirArquivadas,
        [FromQuery] int? funcaoId, [FromQuery] string? funcaoClassificacao, [FromQuery] string? perfilId,
        [FromQuery] string? perfilModo,
        CancellationToken ct = default)
    {
        var f = new TarefaFiltro(projetoId, equipe, responsavelId, status, prioridade, tipo, buscar, apenasAtrasadas, apenasEmAndamento, apenasConcluidas, apenasVenceHoje, incluirArquivadas, funcaoId, funcaoClassificacao, perfilId, perfilModo);
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
            var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var reqComUsuario = req with { CriadorId = string.IsNullOrEmpty(req.CriadorId) ? operador : req.CriadorId };
            var t = await _service.CriarAsync(reqComUsuario, operador, ct);
            return CreatedAtAction(nameof(Obter), new { id = t.Id }, t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TarefaDetalhe>> Atualizar(int id, [FromBody] TarefaAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var reqComUsuario = req with { UsuarioAlteracao = string.IsNullOrEmpty(req.UsuarioAlteracao) ? operador : req.UsuarioAlteracao };
            var t = await _service.AtualizarAsync(id, reqComUsuario, operador, ct);
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

    [HttpPatch("{id:int}/arquivar")]
    public async Task<ActionResult<TarefaDetalhe>> Arquivar(int id, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.ArquivarAsync(id, ct);
            return t == null ? NotFound() : Ok(t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPatch("{id:int}/desarquivar")]
    public async Task<ActionResult<TarefaDetalhe>> Desarquivar(int id, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.DesarquivarAsync(id, ct);
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
            var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var reqComAutor = req with { AutorId = string.IsNullOrEmpty(req.AutorId) ? operador : req.AutorId };
            var c = await _service.AdicionarComentarioAsync(id, reqComAutor, ct);
            return Ok(c);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpGet("chamados/busca")]
    public async Task<ActionResult<List<ChamadoLegadoResumo>>> BuscarChamados([FromQuery] string? buscar, [FromQuery] int take = 20, CancellationToken ct = default)
    {
        return Ok(await _service.BuscarChamadosAsync(buscar, take, ct));
    }

    [HttpPost("{id:int}/chamados")]
    public async Task<ActionResult<TarefaDetalhe>> VincularChamado(int id, [FromBody] TarefaChamadoRequest req, CancellationToken ct = default)
    {
        try
        {
            var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var t = await _service.VincularChamadoAsync(id, req.ChamadoId, operador, ct);
            return t == null ? NotFound() : Ok(t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpDelete("{id:int}/chamados/{chamadoId:int}")]
    public async Task<ActionResult<TarefaDetalhe>> DesvincularChamado(int id, int chamadoId, CancellationToken ct = default)
    {
        try
        {
            var t = await _service.DesvincularChamadoAsync(id, chamadoId, ct);
            return t == null ? NotFound() : Ok(t);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPost("{id:int}/apontamentos")]
    public async Task<ActionResult<ApontamentoResumo>> AdicionarApontamento(int id, [FromBody] ApontamentoCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var apt = await _service.AdicionarApontamentoAsync(id, req, operador, ct);
            return Ok(apt);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPut("apontamentos/{apontamentoId:int}")]
    public async Task<ActionResult<ApontamentoResumo>> AtualizarApontamento(int apontamentoId, [FromBody] ApontamentoAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var ehAdmin = User.IsInRole("Admin") || User.FindFirst("PerfilId")?.Value == "A";
            var apt = await _service.AtualizarApontamentoAsync(apontamentoId, req, operador, ehAdmin, ct);
            return apt == null ? NotFound() : Ok(apt);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { mensagem = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpDelete("apontamentos/{apontamentoId:int}")]
    public async Task<ActionResult> ExcluirApontamento(int apontamentoId, CancellationToken ct = default)
    {
        try
        {
            var operador = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var ehAdmin = User.IsInRole("Admin") || User.FindFirst("PerfilId")?.Value == "A";
            var ok = await _service.ExcluirApontamentoAsync(apontamentoId, operador, ehAdmin, ct);
            return ok ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { mensagem = ex.Message }); }
    }

    [HttpGet("{id:int}/historico")]
    public async Task<ActionResult<List<HistoricoMovimentacao>>> Historico(int id, CancellationToken ct = default)
    {
        return Ok(await _service.HistoricoAsync(id, ct));
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
    public async Task<ActionResult<DashboardGeral>> Obter([FromQuery] string? equipe, [FromQuery] int? projetoId, CancellationToken ct = default)
        => Ok(await _service.ObterAsync(equipe, projetoId, ct));
}
