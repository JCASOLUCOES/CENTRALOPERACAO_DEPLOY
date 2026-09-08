namespace Central_BackEnd.Models.Acessos;

public class PasswordValidationRequest
{
    public string Usuario { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}
