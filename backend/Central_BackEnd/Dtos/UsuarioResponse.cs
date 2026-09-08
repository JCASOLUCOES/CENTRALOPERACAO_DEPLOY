namespace Central_BackEnd.Dtos;

public class UsuarioResponse
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Perfil { get; set; } = string.Empty;
}
