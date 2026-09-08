using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Data;

namespace Central_BackEnd.Services.Implantacao;

/// <summary>
/// DTOs para dados legados do dbBUSINESS_HML.
/// </summary>
public record ClienteLegadoResumo(
    int Id,
    string Cnpj,
    string RazaoSocial,
    string? Fantasia,
    string? Cidade,
    string? Uf,
    string? Telefone,
    bool Ativo);

public record ChamadoLegadoResumo(
    int Id,
    int? ClienteId,
    int? ContratoId,
    string? Titulo,
    string? Tipo,
    string? Status,
    DateTime? DataInclusao,
    DateTime? DataFechamento,
    DateTime? DataPrevisao);

public record IndicacaoLegadoResumo(
    int Id,
    string Nome,
    string? Responsavel);

public record FuncionarioLegadoResumo(
    int Id,
    string Nome,
    string? OperadorId,
    string? Funcao);

public interface ILegacyDataService
{
    Task<List<ClienteLegadoResumo>> ListarClientesAsync(string? buscar, int take = 100, CancellationToken ct = default);
    Task<ClienteLegadoResumo?> ObterClienteAsync(int id, CancellationToken ct = default);
    Task<List<ChamadoLegadoResumo>> ListarChamadosAsync(int? clienteId, string? buscar, int take = 100, CancellationToken ct = default);
    Task<List<IndicacaoLegadoResumo>> ListarIndicacoesAsync(CancellationToken ct = default);
    Task<List<FuncionarioLegadoResumo>> ListarFuncionariosAsync(string? buscar, int take = 100, CancellationToken ct = default);
}

public class LegacyDataService : ILegacyDataService
{
    private readonly string _connectionString;
    public LegacyDataService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection nao configurada");
    }

    public async Task<List<ClienteLegadoResumo>> ListarClientesAsync(string? buscar, int take = 100, CancellationToken ct = default)
    {
        var sql = @"SELECT TOP (@take) CLIENTE_ID, CNPJ, RAZAO_SOCIAL, FANTASIA, CIDADE, UF,
                          (SELECT TOP 1 TELEFONE FROM tbcliente_contato WHERE CLIENTE_ID = c.CLIENTE_ID) AS TELEFONE,
                          ATIVO
                  FROM tbcliente c
                  WHERE (@buscar IS NULL OR RAZAO_SOCIAL LIKE @like OR FANTASIA LIKE @like OR CNPJ LIKE @like)
                    AND (ATIVO = 'S' OR ATIVO IS NULL)
                  ORDER BY RAZAO_SOCIAL";

        var like = string.IsNullOrWhiteSpace(buscar) ? null : $"%{buscar}%";
        return await QueryAsync<ClienteLegadoResumo>(sql, new[]
        {
            ("@take", take),
            ("@buscar", (object?)like ?? DBNull.Value),
            ("@like", (object?)like ?? DBNull.Value)
        });
    }

    public async Task<ClienteLegadoResumo?> ObterClienteAsync(int id, CancellationToken ct = default)
    {
        var list = await ListarClientesAsync(null, 1, ct);
        if (list.Count == 0 || list[0].Id != id) {
            // Busca direta
            var sql = @"SELECT TOP 1 CLIENTE_ID, CNPJ, RAZAO_SOCIAL, FANTASIA, CIDADE, UF,
                              (SELECT TOP 1 TELEFONE FROM tbcliente_contato WHERE CLIENTE_ID = c.CLIENTE_ID) AS TELEFONE,
                              ATIVO
                      FROM tbcliente c
                      WHERE CLIENTE_ID = @id";
            var list2 = await QueryAsync<ClienteLegadoResumo>(sql, new[] { ("@id", (object)id) });
            return list2.FirstOrDefault();
        }
        return list[0];
    }

    public async Task<List<ChamadoLegadoResumo>> ListarChamadosAsync(int? clienteId, string? buscar, int take = 100, CancellationToken ct = default)
    {
        var sql = @"SELECT TOP (@take) CHAMADO_ID, CLIENTE_ID, CONTRATO_ID, TITULO, TIPO, STATUS,
                          DATA_INCLUSAO, DATA_FECHAMENTO, DATA_PREVISAO
                  FROM tbchamado
                  WHERE (@clienteId IS NULL OR CLIENTE_ID = @clienteId)
                    AND (@buscar IS NULL OR CAST(CHAMADO_ID AS VARCHAR) LIKE @like OR TITULO LIKE @like)
                  ORDER BY CHAMADO_ID DESC";

        var like = string.IsNullOrWhiteSpace(buscar) ? null : $"%{buscar}%";
        return await QueryAsync<ChamadoLegadoResumo>(sql, new[]
        {
            ("@take", take),
            ("@clienteId", (object?)clienteId ?? DBNull.Value),
            ("@buscar", (object?)like ?? DBNull.Value),
            ("@like", (object?)like ?? DBNull.Value)
        });
    }

    public async Task<List<IndicacaoLegadoResumo>> ListarIndicacoesAsync(CancellationToken ct = default)
    {
        var sql = @"SELECT INDICACAO_ID, NOME, RESPONSAVEL FROM tbindicacao ORDER BY NOME";
        return await QueryAsync<IndicacaoLegadoResumo>(sql, Array.Empty<(string, object)>());
    }

    public async Task<List<FuncionarioLegadoResumo>> ListarFuncionariosAsync(string? buscar, int take = 100, CancellationToken ct = default)
    {
        var sql = @"SELECT TOP (@take) FUNCIONARIO_ID, NOME, OPERADOR_ID, NULL AS FUNCAO
                  FROM tbfuncionario
                  WHERE (@buscar IS NULL OR NOME LIKE @like)
                  ORDER BY NOME";

        var like = string.IsNullOrWhiteSpace(buscar) ? null : $"%{buscar}%";
        return await QueryAsync<FuncionarioLegadoResumo>(sql, new[]
        {
            ("@take", take),
            ("@buscar", (object?)like ?? DBNull.Value),
            ("@like", (object?)like ?? DBNull.Value)
        });
    }

    private async Task<List<T>> QueryAsync<T>(string sql, (string Name, object Value)[] parameters)
    {
        var list = new List<T>();
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        foreach (var (name, value) in parameters)
            cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var item = MapRow<T>(reader);
            if (item != null) list.Add(item);
        }
        return list;
    }

    private static T? MapRow<T>(IDataReader reader)
    {
        var props = typeof(T).GetProperties();
        var obj = Activator.CreateInstance<T>();
        for (int i = 0; i < reader.FieldCount; i++)
        {
            var colName = reader.GetName(i);
            var prop = props.FirstOrDefault(p => string.Equals(p.Name, colName, StringComparison.OrdinalIgnoreCase));
            if (prop != null && !reader.IsDBNull(i))
            {
                var val = reader.GetValue(i);
                prop.SetValue(obj, val);
            }
        }
        return obj;
    }
}
