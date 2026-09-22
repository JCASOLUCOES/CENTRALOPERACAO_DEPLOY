using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IDashboardService
{
    Task<DashboardGeral> ObterAsync(string? equipe = null, int? projetoId = null, CancellationToken ct = default);
}

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardGeral> ObterAsync(string? equipe = null, int? projetoId = null, CancellationToken ct = default)
    {
        var q = _db.Projetos.AsNoTracking()
            .Include(p => p.TipoProjeto)
            .Include(p => p.Cliente)
            .Include(p => p.ColunaKanban)
            .Where(p => p.Status != StatusProjeto.Cancelado);

        if (projetoId.HasValue)
            q = q.Where(p => p.Id == projetoId.Value);

        var projetos = await q.ToListAsync(ct);

        // Base queries para tarefas (arquivadas excluídas — mesma regra dos contadores de etapa)
        var tarefasBase = _db.Tarefas.AsNoTracking()
            .Where(t => t.Status != StatusTarefa.Cancelada && !t.Arquivada);

        var tarefasConcluidasQ = _db.Tarefas.AsNoTracking()
            .Where(t => t.Status == StatusTarefa.Concluida && t.DataConclusao.HasValue && !t.Arquivada);

        var tarefasComHorasQ = _db.Tarefas.AsNoTracking()
            .Where(t => t.HorasRealizadas.HasValue && t.HorasRealizadas > 0 && !t.Arquivada);

        var horasApontadasQ = _db.Tarefas.Where(t => t.HorasRealizadas.HasValue && !t.Arquivada);

        if (projetoId.HasValue)
        {
            var pid = projetoId.Value;
            tarefasBase = tarefasBase.Where(t => t.ProjetoId == pid);
            tarefasConcluidasQ = tarefasConcluidasQ.Where(t => t.ProjetoId == pid);
            tarefasComHorasQ = tarefasComHorasQ.Where(t => t.ProjetoId == pid);
            horasApontadasQ = horasApontadasQ.Where(t => t.ProjetoId == pid);
        }

        var tarefasConcluidas = await tarefasConcluidasQ.ToListAsync(ct);
        var tarefasComHoras = await tarefasComHorasQ.ToListAsync(ct);

        // KPIs básicos
        var kpis = new DashboardKpis
        {
            ProjetosAtivos = projetos.Count(p => p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado),
            ProjetosAtrasados = projetos.Count(p => p.DataPrevisao.HasValue && p.DataPrevisao < DateTime.Today && p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado),
            ProjetosConcluidos = projetos.Count(p => p.Status == StatusProjeto.Concluido),
            TarefasAbertas = await tarefasBase.CountAsync(t => t.Status != StatusTarefa.Concluida, ct),
            TarefasAtrasadas = await tarefasBase.OndeAtrasadas(DateTime.Today).CountAsync(ct),
            TarefasConcluidas = await tarefasBase.CountAsync(t => t.Status == StatusTarefa.Concluida, ct),
            HorasApontadas = await horasApontadasQ.SumAsync(t => t.HorasRealizadas ?? 0, ct),
            
            // Novos KPIs Fase 3
            TarefasFeatures = await tarefasBase.CountAsync(t => t.Tipo == TipoTarefa.Feature, ct),
            TarefasBugs = await tarefasBase.CountAsync(t => t.Tipo == TipoTarefa.Bug, ct),
            HorasFeatures = tarefasComHoras.Where(t => t.Tipo == TipoTarefa.Feature).Sum(t => t.HorasRealizadas ?? 0),
            HorasBugs = tarefasComHoras.Where(t => t.Tipo == TipoTarefa.Bug).Sum(t => t.HorasRealizadas ?? 0),
        };

        // Calcular % Retrabalho
        var totalHoras = kpis.HorasFeatures + kpis.HorasBugs;
        kpis.PercentualRetrabalho = totalHoras > 0 ? Math.Round((double)kpis.HorasBugs / totalHoras * 100, 1) : 0;

        // Lead Time médio (Criação -> Conclusão)
        if (tarefasConcluidas.Count > 0)
        {
            kpis.LeadTimeMedioDias = Math.Round(tarefasConcluidas
                .Where(t => t.DataConclusao.HasValue)
                .Average(t => (t.DataConclusao!.Value - t.DataInclusao).TotalDays), 1);
        }

        // Cycle Time médio (AFazer -> Concluída) - aproximado: tempo desde primeira movimentação para "Em Andamento" até conclusão
        // Como não temos histórico de status por data exata, usamos DataInclusao -> DataConclusao como proxy
        kpis.CycleTimeMedioDias = kpis.LeadTimeMedioDias;

        // Tarefas por Status
        var tarefasPorStatus = await tarefasBase
            .GroupBy(t => t.Status)
            .Select(g => new TarefasPorStatus { Status = g.Key.ToString(), Total = g.Count() })
            .ToListAsync(ct);

        // Tarefas por Tipo (Feature/Bug) com horas
        var tarefasPorTipo = await tarefasBase
            .GroupBy(t => t.Tipo)
            .Select(g => new TarefasPorTipo
            {
                Tipo = g.Key.ToString(),
                Total = g.Count(),
                HorasEstimadas = g.Sum(t => t.HorasEstimadas ?? 0),
                HorasRealizadas = g.Sum(t => t.HorasRealizadas ?? 0)
            })
            .ToListAsync(ct);

        // Horas por Responsável (considera múltiplos responsáveis via IMPL_TarefaResponsavel)
        var apontamentosQ = _db.TarefaApontamentos.AsNoTracking()
            .Include(a => a.Tarefa)
            .Where(a => a.Tarefa != null);

        if (projetoId.HasValue)
        {
            var pid = projetoId.Value;
            apontamentosQ = apontamentosQ.Where(a => a.Tarefa!.ProjetoId == pid);
        }

        var apontamentos = await apontamentosQ.ToListAsync(ct);

        var responsavelIds = new HashSet<string>(apontamentos.Select(a => a.OperadorId).Distinct());
        // Compatibilidade SQL 2008 (compat 100): sem Contains em lista capturada (OPENJSON).
        var operadoresMap = (await _db.Operadores.AsNoTracking()
            .Select(o => new { o.OperadorId, o.Nome })
            .ToListAsync(ct))
            .Where(o => responsavelIds.Contains(o.OperadorId))
            .ToDictionary(o => o.OperadorId, o => o.Nome);

        var horasPorResponsavel = apontamentos
            .GroupBy(a => a.OperadorId)
            .Select(g => new HorasPorResponsavel
            {
                ResponsavelId = g.Key,
                ResponsavelNome = operadoresMap.TryGetValue(g.Key, out var nome) ? nome : g.Key,
                HorasRealizadas = (int)Math.Ceiling(g.Sum(a => a.Horas)),
                TotalTarefas = g.Select(a => a.TarefaId).Distinct().Count()
            })
            .OrderByDescending(h => h.HorasRealizadas)
            .Take(20)
            .ToList();

        // Adicionar horas estimadas por responsável (baseado nas tarefas onde é responsável principal ou na lista)
        var tarefaResponsaveisQ = _db.TarefaResponsaveis.AsNoTracking()
            .Include(tr => tr.Tarefa)
            .Where(tr => tr.Tarefa != null);

        if (projetoId.HasValue)
        {
            var pid = projetoId.Value;
            tarefaResponsaveisQ = tarefaResponsaveisQ.Where(tr => tr.Tarefa!.ProjetoId == pid);
        }

        var tarefasResponsaveis = await tarefaResponsaveisQ.ToListAsync(ct);

        var estimadasPorResp = tarefasResponsaveis
            .GroupBy(tr => tr.OperadorId)
            .ToDictionary(g => g.Key, g => g.Sum(tr => tr.Tarefa?.HorasEstimadas ?? 0));

        foreach (var h in horasPorResponsavel)
        {
            h.HorasEstimadas = estimadasPorResp.TryGetValue(h.ResponsavelId, out var est) ? est : 0;
        }

        var porEquipe = new List<DashboardPorEquipe>
        {
            new DashboardPorEquipe { Equipe = "Geral", Ativos = 0, Concluidos = 0, Bloqueados = 0, Atrasados = 0 }
        };

        var proximosPrazoQ = _db.Projetos
            .Where(p => p.DataPrevisao.HasValue && p.DataPrevisao > DateTime.Today && p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado);

        if (projetoId.HasValue)
            proximosPrazoQ = proximosPrazoQ.Where(p => p.Id == projetoId.Value);

        var proximosPrazo = await proximosPrazoQ
            .OrderBy(p => p.DataPrevisao)
            .Take(10)
            .Select(p => new ProjetoProximoPrazo
            {
                Id = p.Id,
                Codigo = p.Codigo,
                Nome = p.Nome,
                EquipeNome = "Geral",
                ClienteNome = p.Cliente != null ? p.Cliente.Fantasia : null,
                DataPrevisao = p.DataPrevisao
            })
            .ToListAsync(ct);

        return new DashboardGeral
        {
            Kpis = kpis,
            TarefasPorStatus = tarefasPorStatus,
            TarefasPorTipo = tarefasPorTipo,
            HorasPorResponsavel = horasPorResponsavel,
            PorEquipe = porEquipe,
            ProximosPrazo = proximosPrazo
        };
    }
}