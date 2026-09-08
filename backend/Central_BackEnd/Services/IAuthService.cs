using Central_BackEnd.Dtos;

namespace Central_BackEnd.Services;

public interface IAuthService
{
    Task<TokenResponse?> LoginAsync(LoginRequest request);
    Task<TokenResponse?> RefreshAsync(string refreshToken);
    Task RevogarRefreshTokenAsync(string refreshToken);
    Task<UsuarioResponse?> ObterUsuarioAsync(string operadorId);
}
