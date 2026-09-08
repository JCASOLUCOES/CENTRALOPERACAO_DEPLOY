using System.Collections.Concurrent;
using Central_BackEnd.Data;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services;

public class PasswordValidationService : IPasswordValidationService
{
    private readonly AppDbContext _context;
    private readonly ILogger<PasswordValidationService> _logger;
    private readonly BruteForceGuard _bruteForceGuard;
    private static readonly ConcurrentDictionary<string, DateTime> _validationCache = new();
    private static readonly TimeSpan _validationWindow = TimeSpan.FromMinutes(5);

    public PasswordValidationService(AppDbContext context, ILogger<PasswordValidationService> logger, BruteForceGuard bruteForceGuard)
    {
        _context = context;
        _logger = logger;
        _bruteForceGuard = bruteForceGuard;
    }

    public bool ValidateAndCache(string operadorId, string password)
    {
        if (_bruteForceGuard.EstaBloqueado(operadorId))
        {
            _logger.LogWarning("Password validation blocked by brute force guard for {OperadorId}", operadorId);
            return false;
        }

        var operador = _context.Operadores.FirstOrDefault(o => o.OperadorId == operadorId);
        if (operador is null || operador.SeAtivo == "N")
        {
            _logger.LogWarning("Password validation failed: user {OperadorId} not found or inactive", operadorId);
            return false;
        }

        if (!SegurancaHelper.SenhasIguais(operador.Senha, password))
        {
            _bruteForceGuard.RegistrarFalha(operadorId);
            _logger.LogWarning("Password validation failed: wrong password for {OperadorId}", operadorId);
            return false;
        }

        _bruteForceGuard.Limpar(operadorId);
        _validationCache[operadorId] = DateTime.UtcNow;
        _logger.LogInformation("Password validated and cached for {OperadorId}", operadorId);
        return true;
    }

    public bool IsRecentlyValidated(string operadorId)
    {
        if (_validationCache.TryGetValue(operadorId, out var validatedAt))
        {
            if (DateTime.UtcNow - validatedAt < _validationWindow)
            {
                return true;
            }
            _validationCache.TryRemove(operadorId, out _);
        }
        return false;
    }
}
