namespace Central_BackEnd.Services;

public interface IPasswordValidationService
{
    bool ValidateAndCache(string operadorId, string password);
    bool IsRecentlyValidated(string operadorId);
}
