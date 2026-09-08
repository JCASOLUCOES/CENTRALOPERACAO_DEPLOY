using System.Security.Claims;
using Asp.Versioning;
using Central_BackEnd.Models.Acessos;
using Central_BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Central_BackEnd.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/acessos")]
public class AcessosController : ControllerBase
{
    private readonly IGoogleSheetsService _googleSheetsService;
    private readonly IPasswordValidationService _passwordValidationService;
    private readonly ILogger<AcessosController> _logger;

    public AcessosController(
        IGoogleSheetsService googleSheetsService,
        IPasswordValidationService passwordValidationService,
        ILogger<AcessosController> logger)
    {
        _googleSheetsService = googleSheetsService;
        _passwordValidationService = passwordValidationService;
        _logger = logger;
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<EmpresaResumo>>> ListarEmpresas()
    {
        try
        {
            var empresas = await _googleSheetsService.ObterEmpresasAsync();
            return Ok(empresas.Select(MapearParaResumo).ToList());
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Google Sheets API error");
            return StatusCode(502, new { mensagem = "Erro ao acessar o Google Sheets. Tente novamente mais tarde." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Configuration error");
            return StatusCode(500, new { mensagem = "Servico temporariamente indisponivel." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing empresas");
            return StatusCode(500, new { mensagem = "Erro ao obter lista de empresas. Tente novamente mais tarde." });
        }
    }

    [HttpPost("validar-senha")]
    [Authorize]
    [EnableRateLimiting("validacao")]
    public ActionResult<PasswordValidationResponse> ValidarSenha([FromBody] PasswordValidationRequest request)
    {
        var operadorId = ObterOperadorId();
        if (string.IsNullOrEmpty(operadorId))
            return Unauthorized(new { mensagem = "Token invalido." });

        if (string.IsNullOrWhiteSpace(request.Usuario))
            return BadRequest(new PasswordValidationResponse { Valid = false, Message = "Usuario e obrigatorio." });

        if (string.IsNullOrWhiteSpace(request.Senha))
            return BadRequest(new PasswordValidationResponse { Valid = false, Message = "Senha e obrigatoria." });

        var valid = _passwordValidationService.ValidateAndCache(operadorId, request.Senha);
        if (!valid)
            return Ok(new PasswordValidationResponse { Valid = false, Message = "Credenciais incorretas." });

        return Ok(new PasswordValidationResponse
        {
            Valid = true,
            Message = "Senha validada com sucesso.",
            ValidatedAt = DateTime.UtcNow
        });
    }

    [HttpPost("visualizar")]
    [Authorize]
    [EnableRateLimiting("validacao")]
    public async Task<ActionResult<EmpresaDetalheResponse>> VisualizarEmpresa(
        [FromQuery] int empresaId,
        [FromBody] PasswordValidationRequest? request)
    {
        var operadorId = ObterOperadorId();
        if (string.IsNullOrEmpty(operadorId))
            return Unauthorized(new { mensagem = "Token invalido." });

        if (!_passwordValidationService.IsRecentlyValidated(operadorId))
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Senha))
                return StatusCode(403, new { mensagem = "Validacao expirada. Informe a senha novamente." });

            if (!_passwordValidationService.ValidateAndCache(operadorId, request.Senha))
                return StatusCode(403, new { mensagem = "Senha incorreta." });
        }

        var empresas = await _googleSheetsService.ObterEmpresasAsync();
        var empresa = empresas.FirstOrDefault(e => e.Id == empresaId);
        if (empresa is null)
            return NotFound(new { mensagem = "Empresa nao encontrada." });

        var response = MapearParaDetalhe(empresa);
        await RegistrarAuditoria(operadorId, empresa.NomeEmpresa, "visualizar", HttpContext);

        return Ok(response);
    }

    private string? ObterOperadorId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    }

    private static EmpresaResumo MapearParaResumo(EmpresaAcesso empresa)
    {
        return new EmpresaResumo
        {
            Id = empresa.Id,
            NomeEmpresa = empresa.NomeEmpresa
        };
    }

    private static EmpresaDetalheResponse MapearParaDetalhe(EmpresaAcesso empresa)
    {
        return new EmpresaDetalheResponse
        {
            Id = empresa.Id,
            NomeEmpresa = empresa.NomeEmpresa,
            TsAcesso = empresa.TsAcesso,
            TsEndereco = empresa.TsIP,
            TsUsuarioSenha = empresa.TsCredenciais,
            BancoNome = empresa.BancoNome,
            BancoIP = empresa.BancoIP,
            BancoUsuarioSenha = empresa.BancoCredenciais,
            Vpn = empresa.VpnTipo,
            VpnNome = empresa.VpnNome,
            VpnGateway = empresa.VpnGateway,
            VpnUsuarioSenha = empresa.VpnCredenciais,
            VersaoCob = empresa.Versao,
            AcessoConfigActyonCob = empresa.Rede,
            AcessoActyonWeb = empresa.AcessoActyonWeb,
            AnyDesk = empresa.AnyDesk,
            Observacoes = empresa.Observacoes
        };
    }

    private async Task RegistrarAuditoria(string operadorId, string empresa, string tipoInformacao, HttpContext httpContext)
    {
        try
        {
            var auditoria = new AuditoriaAcesso
            {
                Usuario = operadorId,
                Empresa = empresa,
                TipoInformacao = tipoInformacao,
                DataAcesso = DateTime.UtcNow.Date,
                HoraAcesso = DateTime.UtcNow.TimeOfDay,
                EnderecoIP = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                Navegador = httpContext.Request.Headers.UserAgent.ToString()
            };

            var context = httpContext.RequestServices.GetRequiredService<Data.AppDbContext>();
            context.AuditoriaAcessos.Add(auditoria);
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering audit for {OperadorId} on {Empresa}", operadorId, empresa);
        }
    }
}
