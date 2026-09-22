using Central_BackEnd.Dtos.Gestor;

namespace Central_BackEnd.Services.Gestor;

public interface IGestorMetricasService
{
    Task<GestorMetricasResponseDto> ObterMetricasCeoAsync(int? funcaoId = null, string periodo = "30d", CancellationToken ct = default);
    Task<GestorMetricasResponseDto> ObterMetricasCtoAsync(int? funcaoId = null, string periodo = "30d", CancellationToken ct = default);
    Task<GestorMetricasResponseDto> ObterMetricasCooAsync(int? funcaoId = null, string periodo = "30d", CancellationToken ct = default);
    Task<GestorMetricasResponseDto> ObterMetricasAsync(string painel, int? funcaoId = null, string periodo = "30d", CancellationToken ct = default);
}