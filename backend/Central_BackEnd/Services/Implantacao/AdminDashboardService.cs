using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IAdminDashboardService
{
    Task<AdminDashboardDto> ObterAsync(int? funcaoId = null, int? diasRetro = 7, CancellationToken ct = default);
}

public class AdminDashboardService : IAdminDashboardService
{
    private readonly AppDbContext _db;

    public AdminDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AdminDashboardDto> ObterAsync(int? funcaoId = null, int? diasRetro = 7, CancellationToken ct = default)
    {
        var hoje = DateTime.Today;

        // --- Total de tarefas (nao arquivadas) ---
        var totalTarefas = await _db.Tarefas.AsNoTracking()
            .Where(t => t.Arquivada != true)
            .CountAsync(ct);

        // --- Em andamento ---
        var emAndamento = await _db.Tarefas.AsNoTracking()
            .Where(t => t.Status == StatusTarefa.EmAndamento || t.Status == StatusTarefa.EmHomologacao)
            .CountAsync(ct);

        // --- Atrasadas ---
        var atrasadas = await _db.Tarefas.AsNoTracking()
            .Where(t => t.DataPrevisao.HasValue && t.DataPrevisao.Value < hoje &&
                        t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada)
            .CountAsync(ct);

        // --- Concluidas ---
        var concluidas = await _db.Tarefas.AsNoTracking()
            .Where(t => t.Status == StatusTarefa.Concluida)
            .CountAsync(ct);

        // --- Funcoes e responsaveis ---
        var funcoes = new List<AdminFuncaoResumo>();

        // 1. Listar ids das funcoes ativas (Value Types: FuncaoId int? — filtra nulos em memória)
        var funcaoIds = (await _db.Operadores.AsNoTracking()
            .Where(o => o.SeAtivo == "S")
            .Select(o => o.FuncaoId)
            .ToListAsync(ct))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
        if (funcaoId.HasValue)
        {
            funcaoIds = funcaoIds.Where(id => id == funcaoId.Value).ToList();
        }

        // Nomes das funções: tabela pequena, carrega tudo e filtra em memória
        // (compat 100: sem Contains em lista capturada; sem GroupBy sem agregação).
        var funcoesMap = (await _db.Funcoes.AsNoTracking().ToListAsync(ct))
            .ToDictionary(f => f.Id);

        foreach (var id in funcaoIds.Distinct())
        {
            // Responsáveis: carrega operadores ativos da função (ou todos) e agrupa em memória.
            var opsQuery = _db.Operadores.AsNoTracking().Where(o => o.SeAtivo == "S");
            if (funcaoId.HasValue)
                opsQuery = opsQuery.Where(o => o.FuncaoId == funcaoId.Value);
            var opsLista = await opsQuery
                .Select(o => new { o.OperadorId, o.Nome })
                .ToListAsync(ct);

            var responsaveis = new List<AdminResponsavelResumo>();
            foreach (var grupo in opsLista.GroupBy(o => o.OperadorId))
            {
                var count = await _db.Tarefas.CountAsync(
                    t => t.ResponsavelId != null && t.ResponsavelId == grupo.Key && t.Arquivada != true, ct);
                responsaveis.Add(new AdminResponsavelResumo(grupo.Key, grupo.First().Nome ?? grupo.Key, count));
            }

            // Pegar nome da funcao usando o id - modelo e tabela e chamada correta
            var nomeFuncao = funcoesMap.TryGetValue(id, out var fx) ? (fx.Descricao ?? fx.Classificacao) : null;

            funcoes.Add(new AdminFuncaoResumo(
                id,
                nomeFuncao ?? "Sem funcao",
                nomeFuncao ?? "",
                0, 0, 0, 0,
                responsaveis
            ));
        }

        // --- Alertas ---
        var alertas = new List<AdminAlertaResumo>();
        var bloqueadas = await _db.Tarefas.AsNoTracking()
            .Where(t => t.Status == StatusTarefa.Cancelada || t.Status == StatusTarefa.Backlog || t.Status == StatusTarefa.AFazer)
            .CountAsync(ct);
        if (bloqueadas > 0)
        {
            alertas.Add(new AdminAlertaResumo("Bloqueadas", "Tarefas bloqueadas/canceladas/backlog", bloqueadas));
        }

        var urgentes = await _db.Tarefas.AsNoTracking()
            .Where(t => t.DataPrevisao.HasValue && t.DataPrevisao.Value < hoje &&
                        t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada)
            .CountAsync(ct);
        if (urgentes > 0)
        {
            alertas.Add(new AdminAlertaResumo("Urgentes", "Tarefas atrasadas", urgentes));
        }

        return new AdminDashboardDto(
            totalTarefas,
            emAndamento,
            atrasadas,
            concluidas,
            funcoes,
            alertas,
            DateTime.UtcNow
        );
    }
}