namespace Central_BackEnd.Dtos.Implantacao;

public sealed record DashboardKpis
{
    public int ProjetosAtivos { get; set; }
    public int ProjetosAtrasados { get; set; }
    public int ProjetosConcluidos { get; set; }
    public int TarefasAbertas { get; set; }
    public int TarefasAtrasadas { get; set; }
    public int TarefasConcluidas { get; set; }
    public int HorasApontadas { get; set; }
    
    // Novos KPIs Fase 3
    public int TarefasFeatures { get; set; }
    public int TarefasBugs { get; set; }
    public int HorasFeatures { get; set; }
    public int HorasBugs { get; set; }
    public double PercentualRetrabalho { get; set; }
    public double LeadTimeMedioDias { get; set; }
    public double CycleTimeMedioDias { get; set; }
}

public sealed record DashboardPorEquipe
{
    public string Equipe { get; set; } = "Geral";
    public int Ativos { get; set; }
    public int Concluidos { get; set; }
    public int Bloqueados { get; set; }
    public int Atrasados { get; set; }
}

public sealed record TarefasPorStatus
{
    public string Status { get; set; } = "";
    public int Total { get; set; }
}

public sealed record TarefasPorTipo
{
    public string Tipo { get; set; } = "";
    public int Total { get; set; }
    public int HorasEstimadas { get; set; }
    public int HorasRealizadas { get; set; }
}

public sealed record HorasPorResponsavel
{
    public string ResponsavelId { get; set; } = "";
    public string ResponsavelNome { get; set; } = "";
    public int HorasEstimadas { get; set; }
    public int HorasRealizadas { get; set; }
    public int TotalTarefas { get; set; }
}

public sealed record ProjetoProximoPrazo
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";
    public string Nome { get; set; } = "";
    public string EquipeNome { get; set; } = "Geral";
    public string? ClienteNome { get; set; }
    public DateTime? DataPrevisao { get; set; }
}

public sealed record DashboardGeral
{
    public DashboardKpis Kpis { get; set; } = new();
    public List<TarefasPorStatus> TarefasPorStatus { get; set; } = new();
    public List<TarefasPorTipo> TarefasPorTipo { get; set; } = new();
    public List<HorasPorResponsavel> HorasPorResponsavel { get; set; } = new();
    public List<DashboardPorEquipe> PorEquipe { get; set; } = new();
    public List<ProjetoProximoPrazo> ProximosPrazo { get; set; } = new();
}
