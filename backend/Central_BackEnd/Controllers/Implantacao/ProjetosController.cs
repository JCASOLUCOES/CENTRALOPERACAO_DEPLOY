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
    private readonly IProjetoEtapaService _etapa;
    public ProjetosController(IProjetoService service, IProjetoEtapaService etapa) { _service = service; _etapa = etapa; }

    [HttpGet]
    public async Task<ActionResult<List<ProjetoResumo>>> Listar(
        [FromQuery] string? tipo, [FromQuery] string? status,
        [FromQuery] int? clienteId, [FromQuery] string? responsavelId, [FromQuery] string? buscar,
        [FromQuery] string? perfilId,
        CancellationToken ct = default)
    {
        var filtro = new ProjetoFiltro(tipo, status, clienteId, responsavelId, buscar, perfilId);
        return Ok(await _service.ListarAsync(filtro, ct));
    }

    [HttpGet("com-etapas")]
    public async Task<ActionResult<List<ProjetoComEtapasResumo>>> ListarComEtapas(
        [FromQuery] string? tipo, [FromQuery] string? status,
        [FromQuery] int? clienteId, [FromQuery] string? responsavelId, [FromQuery] string? buscar,
        [FromQuery] string? perfilId,
        CancellationToken ct = default)
    {
        var filtro = new ProjetoFiltro(tipo, status, clienteId, responsavelId, buscar, perfilId);
        var projetos = await _service.ListarAsync(filtro, ct);
        
        var resultado = new List<ProjetoComEtapasResumo>();
        foreach (var p in projetos)
        {
            var etapas = await _etapa.ObterEtapasAsync(p.Id, ct);
            resultado.Add(new ProjetoComEtapasResumo(p, etapas));
        }
        
        return Ok(resultado);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProjetoDetalhe>> Obter(int id, CancellationToken ct = default)
    {
        var p = await _service.ObterAsync(id, ct);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpGet("etapas-padrao")]
    public ActionResult<List<object>> ObterEtapasPadrao()
        => Ok(ProjetoEtapaService.NomesEtapasPadrao
            .Select((nome, i) => (object)new { ordem = i + 1, nome })
            .ToList());

    [HttpGet("{id:int}/etapas")]
    public async Task<ActionResult<List<ProjetoEtapaResumo>>> ObterEtapas(int id, CancellationToken ct = default)
    {
        var etapas = await _etapa.ObterEtapasAsync(id, ct);
        return Ok(etapas);
    }

    [HttpGet("{id:int}/etapas/{ordem:int}")]
    public async Task<ActionResult<ProjetoEtapaDetalhe>> ObterEtapaDetalhe(int id, int ordem, CancellationToken ct = default)
    {
        var etapa = await _etapa.ObterEtapaDetalheAsync(id, ordem, ct);
        return etapa == null ? NotFound() : Ok(etapa);
    }

    [HttpGet("proximo-codigo")]
    public async Task<ActionResult<object>> ProximoCodigo(CancellationToken ct = default)
        => Ok(new { codigo = await _service.ProximoCodigoAsync(ct) });

    [HttpGet("clientes")]
    [EnableRateLimiting("leitura")]
    public async Task<ActionResult<List<ClienteResumo>>> ListarClientes(CancellationToken ct = default)
        => Ok(await _service.ListarClientesAsync(ct));

    [HttpPost]
    public async Task<ActionResult<ProjetoDetalhe>> Criar([FromBody] ProjetoCriarRequest req, CancellationToken ct = default)
    {
        try
        {
            var p = await _service.CriarAsync(req, ct);
            // Inicializar etapas padrão (etapas anteriores à inicial já nascem Concluídas)
            await _etapa.InicializarEtapasPadraoAsync(p.Id, ct, req.EtapaInicialOrdem ?? 1);
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

    [HttpPut("{id:int}/etapas/{ordem:int}")]
    public async Task<ActionResult<ProjetoEtapaDetalhe>> AtualizarEtapa(int id, int ordem, [FromBody] ProjetoEtapaAtualizarRequest req, CancellationToken ct = default)
    {
        try
        {
            var usuario = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var etapa = await _etapa.AtualizarEtapaAsync(id, ordem, req, usuario, ct);
            return Ok(etapa);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPost("{id:int}/etapas/retornar")]
    public async Task<ActionResult<ProjetoEtapaDetalhe>> RetornarEtapa(int id, [FromBody] ProjetoEtapaRetornoRequest req, CancellationToken ct = default)
    {
        try
        {
            var usuario = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var etapa = await _etapa.RetornarEtapaAsync(id, req, ct);
            return Ok(etapa);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPost("{id:int}/etapas/{ordem:int}/checklist")]
    public async Task<ActionResult<ProjetoEtapaDetalhe>> AdicionarChecklistItem(int id, int ordem, [FromBody] ProjetoEtapaChecklistItemRequest item, CancellationToken ct = default)
    {
        try
        {
            var usuario = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var etapa = await _etapa.AdicionarChecklistItemAsync(id, ordem, item, usuario, ct);
            return Ok(etapa);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPost("{id:int}/etapas/{ordem:int}/documentos")]
    public async Task<ActionResult<ProjetoEtapaDetalhe>> AdicionarDocumento(int id, int ordem, [FromBody] ProjetoEtapaDocumentoRequest req, CancellationToken ct = default)
    {
        try
        {
            var usuario = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var etapa = await _etapa.AdicionarDocumentoAsync(id, ordem, req, usuario, ct);
            return Ok(etapa);
        }
        catch (ArgumentException ex) { return BadRequest(new { mensagem = ex.Message }); }
    }

    [HttpPost("{id:int}/etapas/{ordem:int}/comentarios")]
    public async Task<ActionResult<ProjetoEtapaDetalhe>> AdicionarComentario(int id, int ordem, [FromBody] ProjetoEtapaComentarioRequest req, CancellationToken ct = default)
    {
        try
        {
            var usuario = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
            var etapa = await _etapa.AdicionarComentarioAsync(id, ordem, req, usuario, ct);
            return Ok(etapa);
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