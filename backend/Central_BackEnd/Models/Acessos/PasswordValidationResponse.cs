namespace Central_BackEnd.Models.Acessos;

public class PasswordValidationResponse
{
    public bool Valid { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime? ValidatedAt { get; set; }
}
