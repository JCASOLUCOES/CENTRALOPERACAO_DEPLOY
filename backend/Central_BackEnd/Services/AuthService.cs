using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Central_BackEnd.Data;
using Central_BackEnd.Dtos;
using Central_BackEnd.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Central_BackEnd.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly BruteForceGuard _bruteForceGuard;

    public AuthService(AppDbContext context, IConfiguration configuration, BruteForceGuard bruteForceGuard)
    {
        _context = context;
        _configuration = configuration;
        _bruteForceGuard = bruteForceGuard;
    }

    public async Task<TokenResponse?> LoginAsync(LoginRequest request)
    {
        var chave = request.Usuario?.Trim() ?? string.Empty;
        if (_bruteForceGuard.EstaBloqueado(chave))
        {
            return null;
        }

        var operador = await _context.Operadores
            .FirstOrDefaultAsync(o => o.OperadorId == request.Usuario || o.Email == request.Usuario);

        if (operador is null)
        {
            _bruteForceGuard.RegistrarFalha(chave);
            return null;
        }

        if (operador.SeAtivo == "N")
        {
            _bruteForceGuard.RegistrarFalha(chave);
            return null;
        }

        if (!SegurancaHelper.SenhasIguais(operador.Senha, request.Senha))
        {
            _bruteForceGuard.RegistrarFalha(chave);
            return null;
        }

        _bruteForceGuard.Limpar(chave);

        var perfil = MapearPerfil(operador);
        var usuario = new UsuarioResponse
        {
            Id = operador.OperadorId,
            Nome = operador.Nome,
            Email = operador.Email,
            Perfil = perfil
        };

        var accessToken = GerarJwt(usuario);
        var refreshToken = await GerarRefreshTokenAsync(operador.OperadorId);

        return new TokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiraEmSegundos = int.Parse(_configuration["Jwt:AccessTokenMinutes"]!) * 60,
            User = usuario
        };
    }

    public async Task<TokenResponse?> RefreshAsync(string refreshToken)
    {
        var tokenHash = HashToken(refreshToken);
        var tokenEntity = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (tokenEntity is null || tokenEntity.Revogado || tokenEntity.ExpiraEm < DateTime.UtcNow)
            return null;

        var operador = await _context.Operadores
            .FirstOrDefaultAsync(o => o.OperadorId == tokenEntity.OperadorId);

        if (operador is null || operador.SeAtivo == "N")
            return null;

        tokenEntity.Revogado = true;

        var perfil = MapearPerfil(operador);
        var usuario = new UsuarioResponse
        {
            Id = operador.OperadorId,
            Nome = operador.Nome,
            Email = operador.Email,
            Perfil = perfil
        };

        var newAccessToken = GerarJwt(usuario);
        var newRefreshToken = await GerarRefreshTokenAsync(operador.OperadorId);

        tokenEntity.SubstituidoPor = HashToken(newRefreshToken);
        await _context.SaveChangesAsync();

        return new TokenResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiraEmSegundos = int.Parse(_configuration["Jwt:AccessTokenMinutes"]!) * 60,
            User = usuario
        };
    }

    public async Task RevogarRefreshTokenAsync(string refreshToken)
    {
        var tokenHash = HashToken(refreshToken);
        var tokenEntity = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (tokenEntity is not null)
        {
            tokenEntity.Revogado = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<UsuarioResponse?> ObterUsuarioAsync(string operadorId)
    {
        var operador = await _context.Operadores
            .FirstOrDefaultAsync(o => o.OperadorId == operadorId);

        if (operador is null || operador.SeAtivo == "N")
            return null;

        return new UsuarioResponse
        {
            Id = operador.OperadorId,
            Nome = operador.Nome,
            Email = operador.Email,
            Perfil = MapearPerfil(operador)
        };
    }

    private string GerarJwt(UsuarioResponse usuario)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Id),
            new Claim(ClaimTypes.Role, usuario.Perfil),
            new Claim(JwtRegisteredClaimNames.Name, usuario.Nome),
            new Claim("email", usuario.Email ?? string.Empty),
            new Claim("perfil", usuario.Perfil),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expires = DateTime.UtcNow.AddMinutes(int.Parse(jwtSettings["AccessTokenMinutes"]!));

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> GerarRefreshTokenAsync(string operadorId)
    {
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var tokenHash = HashToken(refreshToken);
        var horasExpiracao = int.Parse(_configuration["Jwt:RefreshTokenHours"]!);

        var entity = new RefreshToken
        {
            TokenHash = tokenHash,
            OperadorId = operadorId,
            ExpiraEm = DateTime.UtcNow.AddHours(horasExpiracao),
            CriadoEm = DateTime.UtcNow,
            Revogado = false
        };

        _context.RefreshTokens.Add(entity);
        await _context.SaveChangesAsync();

        return refreshToken;
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    private static string MapearPerfil(Operador operador)
    {
        if (operador.SeAdmin == true)
            return "Administrador";

        return operador.PerfilId switch
        {
            "A" => "Administrador",
            "S" => "Suporte",
            _ => "Usuario"
        };
    }
}
