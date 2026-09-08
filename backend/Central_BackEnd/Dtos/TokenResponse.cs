namespace Central_BackEnd.Dtos;

public class TokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiraEmSegundos { get; set; }
    public UsuarioResponse User { get; set; } = null!;
}
