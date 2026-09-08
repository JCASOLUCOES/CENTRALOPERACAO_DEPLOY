using System.Text.Json;
using Central_BackEnd.Data;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IAuditoriaImplantacaoService
{
    Task RegistrarAsync(string entidade, int entidadeId, string acao, object? antes, object? depois, string usuario, string? observacao = null, CancellationToken ct = default);
    Task<List<AuditoriaImplantacao>> ObterHistoricoAsync(string entidade, int entidadeId, CancellationToken ct = default);
}

public class AuditoriaImplantacaoService : IAuditoriaImplantacaoService
{
    private readonly AppDbContext _db;
    private readonly ILogger<AuditoriaImplantacaoService> _logger;
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public AuditoriaImplantacaoService(AppDbContext db, ILogger<AuditoriaImplantacaoService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RegistrarAsync(string entidade, int entidadeId, string acao, object? antes, object? depois, string usuario, string? observacao = null, CancellationToken ct = default)
    {
        try
        {
            var antesJson = antes != null ? JsonSerializer.Serialize(antes, _jsonOptions) : null;
            var depoisJson = depois != null ? JsonSerializer.Serialize(depois, _jsonOptions) : null;

            var auditoria = new AuditoriaImplantacao
            {
                Entidade = entidade,
                EntidadeId = entidadeId,
                Acao = acao.ToUpperInvariant(),
                AntesJson = antesJson,
                DepoisJson = depoisJson,
                Usuario = usuario,
                Observacao = observacao,
                Data = DateTime.Now
            };

            _db.AuditoriaImplantacao.Add(auditoria);
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao registrar auditoria: {Entidade} {EntidadeId} {Acao}", entidade, entidadeId, acao);
            // Não lança exceção para não quebrar a operação principal
        }
    }

    public async Task<List<AuditoriaImplantacao>> ObterHistoricoAsync(string entidade, int entidadeId, CancellationToken ct = default)
    {
        return await _db.AuditoriaImplantacao
            .AsNoTracking()
            .Where(a => a.Entidade == entidade && a.EntidadeId == entidadeId)
            .OrderByDescending(a => a.Data)
            .ToListAsync(ct);
    }
}