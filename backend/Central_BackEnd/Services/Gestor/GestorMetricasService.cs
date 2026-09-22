using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Gestor;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Gestor;

public class GestorMetricasService : IGestorMetricasService
{
    private readonly AppDbContext _db;
    private readonly IProjetoService _projetoService;
    private readonly ITarefaService _tarefaService;
    private readonly IAgendaService _agendaService;
    private readonly IDashboardService _dashboardService;

    public GestorMetricasService(
        AppDbContext db,
        IProjetoService projetoService,
        ITarefaService tarefaService,
        IAgendaService agendaService,
        IDashboardService dashboardService)
    {
        _db = db;
        _projetoService = projetoService;
        _tarefaService = tarefaService;
        _agendaService = agendaService;
        _dashboardService = dashboardService;
    }

    public async Task<GestorMetricasResponseDto> ObterMetricasCeoAsync(int? funcaoId = null, string periodo = "30d", CancellationToken ct = default)
    {
        var cards = new List<MetricaCardDto>();
        var graficos = new List<MetricaGraficoDto>();

        // 1. Projetos Ativos
        var projetosAtivos = await _db.Projetos.AsNoTracking()
            .CountAsync(p => p.Status != StatusProjeto.Concluido && p.Status != StatusProjeto.Cancelado, ct);
        cards.Add(new MetricaCardDto(
            "projetos_ativos", "Projetos Ativos", projetosAtivos,
            null, "bi-folder2-open", "#0f4c81",
            "rgba(15, 76, 129, 0.12)", "/implantacao/projetos", null));

        // 2. Licenças Atuais (placeholder - sem endpoint financeiro)
        cards.Add(new MetricaCardDto(
            "licencas_atuais", "Licenças Atuais", 0,
            null, "bi-key", "#6c757d",
            "rgba(108, 117, 125, 0.12)", "/visao-adm", null));

        // 3. Faturamento Mensal (placeholder)
        cards.Add(new MetricaCardDto(
            "faturamento_mensal", "Faturamento Mensal", 0,
            "R$", "bi-currency-dollar", "#16a34a",
            "rgba(22, 163, 74, 0.12)", "/visao-adm", null));

        // 4. Faturas em Atraso (placeholder)
        cards.Add(new MetricaCardDto(
            "faturas_atraso", "Faturas em Atraso", 0,
            null, "bi-exclamation-triangle", "#dc2626",
            "rgba(220, 38, 38, 0.12)", "/visao-adm", null));

        // 5. Valor em Atraso (placeholder)
        cards.Add(new MetricaCardDto(
            "valor_atraso", "Valor em Atraso", 0,
            "R$", "bi-cash-coin", "#ea580c",
            "rgba(234, 88, 12, 0.12)", "/visao-adm", null));

        // 6. Orçamentos Cobrados no Mês (placeholder)
        cards.Add(new MetricaCardDto(
            "orcamentos_cobrados_mes", "Orçamentos Cobrados no Mês", 0,
            null, "bi-file-earmark-text", "#7c3aed",
            "rgba(124, 58, 237, 0.12)", "/visao-adm", null));

        // Gráfico: Panorama de Projetos por Status (doughnut)
        var projetosPorStatus = await _db.Projetos.AsNoTracking()
            .Where(p => p.Status != StatusProjeto.Cancelado)
            .GroupBy(p => p.Status)
            .Select(g => new { Status = g.Key.ToString(), Total = g.Count() })
            .ToListAsync(ct);

        var statusLabels = projetosPorStatus.Select(x => x.Status).ToList();
        var statusData = projetosPorStatus.Select(x => (decimal)x.Total).ToList();
        var statusColors = statusLabels.Select(s => s switch
        {
            "Backlog" => "#94a3b8",
            "AFazer" => "#60a5fa",
            "EmAndamento" => "#d97706",
            "Homologacao" => "#a78bfa",
            "Concluido" => "#16a34a",
            "Bloqueado" => "#dc2626",
            _ => "#6b7280"
        }).ToList();

        graficos.Add(new MetricaGraficoDto(
            "panorama_projetos", "Panorama dos Projetos", "doughnut",
            statusLabels,
            [new DatasetDto("Quantidade", statusData, string.Join(",", statusColors), "#fff", 2)],
            new Dictionary<string, object> { { "cutout", "65%" } }));

        // Gráfico: Tarefas por Função (bar stacked)
        var tarefasPorFuncao = await _db.Tarefas.AsNoTracking()
            .Where(t => t.Status != StatusTarefa.Cancelada && !t.Arquivada)
            .Join(_db.FuncionariosLegado.AsNoTracking().Where(f => f.Ativo == "S"),
                t => t.ResponsavelId, f => f.OperadorId, (t, f) => new { t.Tipo, f.FuncaoId })
            .Where(x => x.FuncaoId.HasValue)
            .Join(_db.Funcoes.AsNoTracking().Where(f => f.Ativo),
                x => x.FuncaoId!.Value, f => f.Id, (x, f) => new { x.Tipo, Funcao = f.Descricao })
            .GroupBy(x => new { x.Funcao, x.Tipo })
            .Select(g => new { g.Key.Funcao, g.Key.Tipo, Total = g.Count() })
            .ToListAsync(ct);

        var funcoes = tarefasPorFuncao.Select(x => x.Funcao).Distinct().OrderBy(x => x).ToList();
        var tipos = tarefasPorFuncao.Select(x => x.Tipo.ToString()).Distinct().OrderBy(x => x).ToList();

        var datasetsFuncao = tipos.Select((tipo, i) =>
        {
            var data = funcoes.Select(f =>
            {
                var item = tarefasPorFuncao.FirstOrDefault(x => x.Funcao == f && x.Tipo.ToString() == tipo);
                return item != null ? (decimal)item.Total : 0m;
            }).ToList();
            var colors = new[] { "#0f4c81", "#dc2626", "#7c3aed", "#16a34a", "#f59e0b" };
            return new DatasetDto(tipo, data, colors[i % colors.Length]);
        }).ToList();

        graficos.Add(new MetricaGraficoDto(
            "tarefas_por_funcao", "Tarefas por Função", "bar",
            funcoes,
            datasetsFuncao,
            new Dictionary<string, object> { { "scales", new { y = new { stacked = true, beginAtZero = true }, x = new { stacked = true } } } }));

        return new GestorMetricasResponseDto(cards, graficos, DateTime.Now);
    }

    public async Task<GestorMetricasResponseDto> ObterMetricasCtoAsync(int? funcaoId = null, string periodo = "30d", CancellationToken ct = default)
    {
        var cards = new List<MetricaCardDto>();
        var graficos = new List<MetricaGraficoDto>();

        // 1. Incidentes Abertos (tarefas tipo Bug + bloqueadas)
        var incidentesAbertos = await _db.Tarefas.AsNoTracking()
            .CountAsync(t => (t.Tipo == TipoTarefa.Bug || t.Bloqueada) && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && !t.Arquivada, ct);
        cards.Add(new MetricaCardDto(
            "incidentes_abertos", "Incidentes Abertos", incidentesAbertos,
            null, "bi-exclamation-triangle", "#dc2626",
            "rgba(220, 38, 38, 0.12)", "/implantacao/tarefas", new Dictionary<string, string> { { "equipe", "ti" } }));

        // 2. MTTR Médio (placeholder - precisa histórico de status)
        cards.Add(new MetricaCardDto(
            "mttr_medio", "MTTR Médio (h)", 0,
            "h", "bi-clock", "#0f4c81",
            "rgba(15, 76, 129, 0.12)", "/implantacao/tarefas", null));

        // 3. Chamados Críticos (prioridade 3 = Urgente)
        var chamadosCriticos = await _db.Tarefas.AsNoTracking()
            .CountAsync(t => (int)t.Prioridade == 3 && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && !t.Arquivada, ct);
        cards.Add(new MetricaCardDto(
            "chamados_criticos", "Chamados Críticos", chamadosCriticos,
            null, "bi-lightning-charge", "#ea580c",
            "rgba(234, 88, 12, 0.12)", "/implantacao/tarefas", null));

        // 4. Chamados Prioridade Alta (prioridade 2)
        var chamadosAlta = await _db.Tarefas.AsNoTracking()
            .CountAsync(t => (int)t.Prioridade == 2 && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && !t.Arquivada, ct);
        cards.Add(new MetricaCardDto(
            "chamados_alta", "Chamados Prioridade Alta", chamadosAlta,
            null, "bi-exclamation-triangle-fill", "#f59e0b",
            "rgba(245, 158, 11, 0.12)", "/implantacao/tarefas", null));

        // 5. Backlog Técnico (tarefas tipo Feature em Backlog/AFazer)
        var backlogTecnico = await _db.Tarefas.AsNoTracking()
            .CountAsync(t => t.Tipo == TipoTarefa.Feature && (t.Status == StatusTarefa.Backlog || t.Status == StatusTarefa.AFazer) && !t.Arquivada, ct);
        cards.Add(new MetricaCardDto(
            "backlog_tecnico", "Backlog Técnico", backlogTecnico,
            null, "bi-archive", "#7c3aed",
            "rgba(124, 58, 237, 0.12)", "/implantacao/tarefas", null));

        // 6. Custo Infraestrutura (placeholder)
        cards.Add(new MetricaCardDto(
            "custo_infra", "Custo Infraestrutura (R$)", 0,
            "R$", "bi-cash", "#16a34a",
            "rgba(22, 163, 74, 0.12)", "/visao-adm", null));

        // Gráfico: Chamados por Prioridade (doughnut)
        var prioridadeData = new[]
        {
            await _db.Tarefas.AsNoTracking().CountAsync(t => (int)t.Prioridade == 3 && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && !t.Arquivada, ct),
            await _db.Tarefas.AsNoTracking().CountAsync(t => (int)t.Prioridade == 2 && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && !t.Arquivada, ct),
            await _db.Tarefas.AsNoTracking().CountAsync(t => (int)t.Prioridade == 1 && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && !t.Arquivada, ct),
            await _db.Tarefas.AsNoTracking().CountAsync(t => (int)t.Prioridade == 0 && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada && !t.Arquivada, ct)
        };
        graficos.Add(new MetricaGraficoDto(
            "prioridade", "Chamados por Prioridade", "doughnut",
            ["Urgente", "Alta", "Média", "Baixa"],
            [new DatasetDto("Quantidade", prioridadeData.Select(d => (decimal)d).ToList(),
                "#ea580c,#f59e0b,#fbbf24,#6b7280", "#fff", 2)],
            new Dictionary<string, object> { { "cutout", "65%" } }));

        // Gráfico: Incidentes por Status (bar)
        var incidentesPorStatus = await _db.Tarefas.AsNoTracking()
            .Where(t => (t.Tipo == TipoTarefa.Bug || t.Bloqueada) && t.Status != StatusTarefa.Cancelada && !t.Arquivada)
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key.ToString(), Total = g.Count() })
            .ToListAsync(ct);

        var statusLabelsInc = incidentesPorStatus.Select(x => x.Status).ToList();
        var statusDataInc = incidentesPorStatus.Select(x => (decimal)x.Total).ToList();
        graficos.Add(new MetricaGraficoDto(
            "status", "Incidentes por Status", "bar",
            statusLabelsInc,
            [new DatasetDto("Quantidade", statusDataInc, "#0f4c81")],
            new Dictionary<string, object> { { "scales", new { y = new { beginAtZero = true } } } }));

        return new GestorMetricasResponseDto(cards, graficos, DateTime.Now);
    }

    public async Task<GestorMetricasResponseDto> ObterMetricasCooAsync(int? funcaoId = null, string periodo = "30d", CancellationToken ct = default)
    {
        var cards = new List<MetricaCardDto>();
        var graficos = new List<MetricaGraficoDto>();

        // Filtrar por função se informado
        var tarefasBase = _db.Tarefas.AsNoTracking()
            .Where(t => t.Status != StatusTarefa.Cancelada && !t.Arquivada);

        if (funcaoId.HasValue)
        {
            tarefasBase = tarefasBase
                .Where(t => (t.ResponsavelId != null && _db.FuncionariosLegado.Any(f => f.OperadorId == t.ResponsavelId && f.FuncaoId == funcaoId.Value && f.Ativo == "S"))
                    || t.Responsaveis.Any(r => _db.FuncionariosLegado.Any(f => f.OperadorId == r.OperadorId && f.FuncaoId == funcaoId.Value && f.Ativo == "S")));
        }

        // 1. Volume de Atendimentos
        var volumeAtendimentos = await tarefasBase.CountAsync(ct);
        cards.Add(new MetricaCardDto(
            "volume_atendimentos", "Volume de Atendimentos", volumeAtendimentos,
            null, "bi-chat-dots", "#0f4c81",
            "rgba(15, 76, 129, 0.12)", "/implantacao/tarefas", null));

        // 2. SLA Cumprido (aproximação: tarefas concluídas no prazo)
        var tarefasComPrazo = await tarefasBase.Where(t => (t.DataEntrega ?? t.DataPrevisao).HasValue).ToListAsync(ct);
        var noPrazo = tarefasComPrazo.Count(t =>
        {
            var prazo = t.DataEntrega ?? t.DataPrevisao;
            return t.Status == StatusTarefa.Concluida && t.DataConclusao.HasValue && t.DataConclusao <= prazo;
        });
        var slaPerc = tarefasComPrazo.Count > 0 ? Math.Round((double)noPrazo / tarefasComPrazo.Count * 100, 1) : 0;
        cards.Add(new MetricaCardDto(
            "sla_cumprido", "SLA Cumprido", (decimal)slaPerc,
            "%", "bi-check-circle", "#16a34a",
            "rgba(22, 163, 74, 0.12)", "/implantacao/tarefas", null));

        // 3. TMA Médio (Tempo Médio de Atendimento - placeholder)
        cards.Add(new MetricaCardDto(
            "tma_medio", "TMA Médio (min)", 0,
            "min", "bi-clock", "#0f4c81",
            "rgba(15, 76, 129, 0.12)", "/implantacao/tarefas", null));

        // 4. Taxa de Abandono (placeholder)
        cards.Add(new MetricaCardDto(
            "taxa_abandono", "Taxa de Abandono", 0,
            "%", "bi-x-circle", "#dc2626",
            "rgba(220, 38, 38, 0.12)", "/implantacao/tarefas", null));

        // 5. Produtividade/Equipe (tarefas concluídas / responsáveis ativos)
        var concluidas = await tarefasBase.CountAsync(t => t.Status == StatusTarefa.Concluida, ct);
        var responsaveisAtivos = await tarefasBase
            .Where(t => t.Status == StatusTarefa.Concluida)
            .Select(t => t.ResponsavelId)
            .Distinct()
            .CountAsync(ct);
        var prod = responsaveisAtivos > 0 ? Math.Round((double)concluidas / responsaveisAtivos, 1) : 0;
        cards.Add(new MetricaCardDto(
            "produtividade_equipe", "Produtividade/Equipe", (decimal)prod,
            null, "bi-people", "#7c3aed",
            "rgba(124, 58, 237, 0.12)", "/implantacao/tarefas", null));

        // 6. Absenteísmo (placeholder)
        cards.Add(new MetricaCardDto(
            "absenteismo", "Absenteísmo", 0,
            "%", "bi-person-x", "#dc2626",
            "rgba(220, 38, 38, 0.12)", "/implantacao/tarefas", null));

        // Gráfico: Volume por Prioridade (bar)
        var volumePorPrioridade = await tarefasBase
            .GroupBy(t => t.Prioridade)
            .Select(g => new { Prioridade = (int)g.Key, Total = g.Count() })
            .ToListAsync(ct);

        var prioridades = new[] { "Baixa", "Média", "Alta", "Urgente" };
        var prioridadeDataCoo = prioridades.Select((p, i) =>
        {
            var item = volumePorPrioridade.FirstOrDefault(x => x.Prioridade == i);
            return item != null ? (decimal)item.Total : 0m;
        }).ToList();

        graficos.Add(new MetricaGraficoDto(
            "volume_prioridade", "Volume por Prioridade", "bar",
            prioridades.ToList(),
            [new DatasetDto("Quantidade", prioridadeDataCoo, string.Join(",", prioridades.Select(_ => "#fdd36a")))],
            new Dictionary<string, object> { { "scales", new { y = new { beginAtZero = true } } } }));

        // Gráfico: SLA por Equipe (função) - bar stacked
        var slaPorFuncao = await _db.Tarefas.AsNoTracking()
            .Where(t => t.Status != StatusTarefa.Cancelada && !t.Arquivada)
            .Join(_db.FuncionariosLegado.AsNoTracking().Where(f => f.Ativo == "S"),
                t => t.ResponsavelId, f => f.OperadorId, (t, f) => new { t.Status, f.FuncaoId })
            .Where(x => x.FuncaoId.HasValue)
            .Join(_db.Funcoes.AsNoTracking().Where(f => f.Ativo),
                x => x.FuncaoId!.Value, f => f.Id, (x, f) => new { x.Status, Funcao = f.Descricao })
            .GroupBy(x => new { x.Funcao, x.Status })
            .Select(g => new { g.Key.Funcao, g.Key.Status, Total = g.Count() })
            .ToListAsync(ct);

        var funcoesCoo = slaPorFuncao.Select(x => x.Funcao).Distinct().OrderBy(x => x).ToList();
        var statuses = slaPorFuncao.Select(x => x.Status).Distinct().OrderBy(x => x).ToList();

        var datasetsSla = statuses.Select((status, i) =>
        {
            var data = funcoesCoo.Select(f =>
            {
                var item = slaPorFuncao.FirstOrDefault(x => x.Funcao == f && x.Status == status);
                return item != null ? (decimal)item.Total : 0m;
            }).ToList();
            var colors = new[] { "#94a3b8", "#60a5fa", "#d97706", "#a78bfa", "#16a34a", "#dc2626" };
            return new DatasetDto(status.ToString(), data, colors[i % colors.Length]);
        }).ToList();

        graficos.Add(new MetricaGraficoDto(
            "sla_equipe", "SLA por Equipe", "bar",
            funcoesCoo,
            datasetsSla,
            new Dictionary<string, object> { { "scales", new { y = new { stacked = true, beginAtZero = true }, x = new { stacked = true } } } }));

        return new GestorMetricasResponseDto(cards, graficos, DateTime.Now);
    }

    public async Task<GestorMetricasResponseDto> ObterMetricasAsync(string painel, int? funcaoId = null, string periodo = "30d", CancellationToken ct = default)
    {
        return painel.ToLower() switch
        {
            "ceo" => await ObterMetricasCeoAsync(funcaoId, periodo, ct),
            "cto" => await ObterMetricasCtoAsync(funcaoId, periodo, ct),
            "coo" => await ObterMetricasCooAsync(funcaoId, periodo, ct),
            _ => throw new ArgumentException($"Painel inválido: {painel}. Use 'ceo', 'cto' ou 'coo'.")
        };
    }
}