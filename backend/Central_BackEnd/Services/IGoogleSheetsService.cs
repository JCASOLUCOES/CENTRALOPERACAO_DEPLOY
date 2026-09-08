using Central_BackEnd.Models.Acessos;

namespace Central_BackEnd.Services;

public interface IGoogleSheetsService
{
    Task<List<EmpresaAcesso>> ObterEmpresasAsync();
}
