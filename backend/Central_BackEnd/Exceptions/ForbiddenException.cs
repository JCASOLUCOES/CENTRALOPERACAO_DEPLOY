namespace Central_BackEnd.Exceptions;

/// <summary>
/// Acesso negado — usuário não tem permissão para operar sobre o recurso.
/// Mapeada para HTTP 403 no controller.
/// </summary>
public class ForbiddenException : Exception
{
    public string Code { get; }

    public ForbiddenException(string message, string code = "FORBIDDEN")
        : base(message)
    {
        Code = code;
    }
}