using System.Security.Claims;
using Asp.Versioning;
using Central_BackEnd.Dtos;
using Central_BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Central_BackEnd.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
public class AuthController : ControllerBase
{
    private const string CookieRefresh = "cc_refresh";
    private const string CookieLembrar = "cc_lembrar";

    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<TokenResponse>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Usuario) || string.IsNullOrWhiteSpace(request.Senha))
        {
            return BadRequest(new { mensagem = "Campos obrigatorios ausentes." });
        }

        var resultado = await _authService.LoginAsync(request);

        if (resultado is null)
        {
            return Unauthorized(new { mensagem = "Usuario ou senha invalidos." });
        }

        GravarCookieRefresh(resultado.RefreshToken, request.LembrarAcesso);
        resultado.RefreshToken = string.Empty;

        return Ok(resultado);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<TokenResponse>> Refresh()
    {
        var refreshToken = Request.Cookies[CookieRefresh];
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(new { mensagem = "Refresh token invalido ou expirado." });
        }

        var resultado = await _authService.RefreshAsync(refreshToken);

        if (resultado is null)
        {
            LimparCookieRefresh();
            return Unauthorized(new { mensagem = "Refresh token invalido ou expirado." });
        }

        var persistente = Request.Cookies[CookieLembrar] == "1";
        GravarCookieRefresh(resultado.RefreshToken, persistente);
        resultado.RefreshToken = string.Empty;

        return Ok(resultado);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies[CookieRefresh];
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            await _authService.RevogarRefreshTokenAsync(refreshToken);
        }

        LimparCookieRefresh();
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UsuarioResponse>> Me()
    {
        var operadorId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? User.FindFirstValue("sub");

        if (string.IsNullOrEmpty(operadorId))
        {
            return Unauthorized(new { mensagem = "Token invalido." });
        }

        var usuario = await _authService.ObterUsuarioAsync(operadorId);

        if (usuario is null)
        {
            return NotFound(new { mensagem = "Usuario nao encontrado." });
        }

        return Ok(usuario);
    }

    private void GravarCookieRefresh(string refreshToken, bool persistente)
    {
        var opcoes = new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = false,
            Path = "/"
        };

        if (persistente)
        {
            opcoes.MaxAge = TimeSpan.FromHours(4);
            Response.Cookies.Append(CookieLembrar, "1", new CookieOptions
            {
                HttpOnly = false,
                SameSite = SameSiteMode.Strict,
                Secure = false,
                Path = "/"
            });
        }
        else
        {
            Response.Cookies.Delete(CookieLembrar);
        }

        Response.Cookies.Append(CookieRefresh, refreshToken, opcoes);
    }

    private void LimparCookieRefresh()
    {
        var opcoes = new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = false,
            Path = "/"
        };
        Response.Cookies.Delete(CookieRefresh, opcoes);
        Response.Cookies.Delete(CookieLembrar, new CookieOptions { Path = "/" });
    }
}