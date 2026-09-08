using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IDashboardService
{
    Task<DashboardGeral> ObterGeralAsync(string? equipe, CancellationToken ct = default);
}

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    public DashboardService(AppDbContext db) { _db = db; }

    public async Task<DashboardGeral> ObterGeralAsync(string? equipe, CancellationToken ct = default)
    {
        var hoje = DateTime.Today;
        var projQuery = _db.Projetos.AsNoTracking().Include(p => p.Equipe).AsQueryable();
        var tarQuery = _db.Tarefas.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(equipe) && equipe != "Todas")
            projQuery = projQuery.Where(p => p.Equipe != null && p.Equipe.Nome == equipe);
        if (!string.IsNullOrWhiteSpace(equipe) && equipe != "Todas")
            tarQuery = tarQuery.Where(t => t.Projeto != null && t.Projeto.Equipe != null && t.Projeto.Equipe.Nome == equipe);

        var ativos = await projQuery.CountAsync(p => p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado, ct);
        var concluidos = await projQuery.CountAsync(p => p.Status == StatusProjeto.Concluido, ct);
        var bloqueados = await projQuery.CountAsync(p => p.Status == StatusProjeto.Bloqueado, ct);
        var atrasados = await projQuery.CountAsync(p =>
            p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado &&
            p.DataPrevisao != null && p.DataPrevisao.Value.Date < hoje, ct);

        var tarefasAbertas = await tarQuery.CountAsync(t => t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada, ct);
        var tarefasAtrasadas = await tarQuery.CountAsync(t =>
            t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada &&
            t.DataPrevisao != null && t.DataPrevisao.Value.Date < hoje, ct);

        // Horas: soma das horas das tarefas (estimadas vs realizadas)
        var horasApontadas = await tarQuery.SumAsync(t => (int?)t.HorasRealizadas ?? 0, ct);
        var horasPlanejadas = await tarQuery.SumAsync(t => (int?)t.HorasEstimadas ?? 0, ct);

        var totalClientes = await _db.Clientes.CountAsync(c => c.Ativo, ct);

        // Por equipe
        var porEquipe = await _db.Equipes.AsNoTracking()
            .Where(e => e.Ativa)
            .OrderBy(e => e.Nome)
            .Select(e => new DashboardPorEquipe(
                e.Nome,
                _db.Projetos.Count(p => p.EquipeId == e.Id &&
                    p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado),
                _db.Projetos.Count(p => p.EquipeId == e.Id && p.Status == StatusProjeto.Concluido),
                _db.Projetos.Count(p => p.EquipeId == e.Id && p.Status == StatusProjeto.Bloqueado),
                _db.Projetos.Count(p => p.EquipeId == e.Id &&
                    p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado &&
                    p.DataPrevisao != null && p.DataPrevisao.Value.Date < hoje)))
            .ToListAsync(ct);

        // Detalhes por tipo de projeto
        DashboardImplantacao? impl = null;
        if (string.IsNullOrEmpty(equipe) || equipe == "Todas" || equipe == "IMPLANTACAO")
        {
            impl = new DashboardImplantacao(
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "CLIENTE" && p.Status != StatusProjeto.Concluido, ct),
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "CARTEIRA" && p.Status != StatusProjeto.Concluido, ct),
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "INTEGRACAO" && p.Status != StatusProjeto.Concluido, ct),
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "CARTEIRA" && p.Status == StatusProjeto.Concluido, ct),
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "INTEGRACAO" && p.Status == StatusProjeto.Concluido, ct));
        }

        DashboardCiaa? ciaa = null;
        if (string.IsNullOrEmpty(equipe) || equipe == "Todas" || equipe == "CIAA")
        {
            ciaa = new DashboardCiaa(
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "PROJETO_CIAA" && p.Status != StatusProjeto.Concluido, ct),
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "PROJETO_CIAA" && p.Status == StatusProjeto.Concluido, ct),
                await _db.Projetos.CountAsync(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == "PROJETO_CIAA" && p.Status == StatusProjeto.Bloqueado, ct),
                await _db.Tarefas.CountAsync(t => t.Projeto != null && t.Projeto.TipoProjeto != null && t.Projeto.TipoProjeto.Codigo == "PROJETO_CIAA" && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada, ct),
                await _db.Tarefas.CountAsync(t => t.Projeto != null && t.Projeto.TipoProjeto != null && t.Projeto.TipoProjeto.Codigo == "PROJETO_CIAA" && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && t.DataPrevisao != null && t.DataPrevisao.Value.Date < hoje, ct));
        }

        var projPorResp = await _db.Projetos.AsNoTracking()
            .Where(p => p.ResponsavelId != null && p.Status != StatusProjeto.Cancelado)
            .GroupBy(p => p.ResponsavelId)
            .Select(g => new
            {
                ResponsavelId = g.Key!,
                TotalProjetos = g.Count(),
                Atrasados = g.Count(p => p.Status != StatusProjeto.Concluido && p.DataPrevisao != null && p.DataPrevisao.Value.Date < hoje)
            })
            .OrderByDescending(x => x.TotalProjetos).Take(10)
            .Join(_db.Operadores, x => x.ResponsavelId, o => o.OperadorId, (x, o) =>
                new DashboardProjetosPorResponsavel(o.OperadorId, o.Nome, x.TotalProjetos, x.Atrasados))
            .ToListAsync(ct);

        var tarPorStatus = await _db.Tarefas.AsNoTracking()
            .GroupBy(t => t.Status)
            .Select(g => new DashboardTarefasPorStatus(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);

        var prox = await _db.Projetos.AsNoTracking()
            .Where(p => p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado &&
                        p.DataPrevisao != null && p.DataPrevisao.Value.Date >= hoje)
            .OrderBy(p => p.DataPrevisao)
            .Take(10)
            .Select(p => new ProjetoResumo(
                p.Id, p.Codigo, p.Nome,
                p.Equipe != null ? p.Equipe.Nome : "",
                p.TipoProjeto != null ? p.TipoProjeto.Nome : "",
                p.ClienteId, p.Cliente != null ? p.Cliente.Nome : null,
                p.ClienteLegadoId, null,
                p.Status.ToString(), (int)p.Prioridade, p.Progresso,
                p.ResponsavelId,
                _db.Operadores.Where(o => o.OperadorId == p.ResponsavelId).Select(o => o.Nome).FirstOrDefault(),
                p.DataPrevisao, p.DataConclusao, p.DataInclusao))
            .ToListAsync(ct);

        return new DashboardGeral(
            new DashboardKpis(ativos, concluidos, bloqueados, atrasados, tarefasAbertas, tarefasAtrasadas, totalClientes, horasApontadas, horasPlanejadas),
            porEquipe, impl, ciaa, projPorResp, tarPorStatus, prox);
    }
}
