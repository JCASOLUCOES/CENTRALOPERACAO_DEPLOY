namespace Central_BackEnd.Dtos.Implantacao;

public record DashboardKpis(
    int ProjetosAtivos,
    int ProjetosConcluidos,
    int ProjetosBloqueados,
    int ProjetosAtrasados,
    int TarefasAbertas,
    int TarefasAtrasadas,
    int TotalClientes,
    int HorasApontadas,
    int HorasPlanejadas);

public record DashboardPorEquipe(
    string Equipe,
    int Ativos,
    int Concluidos,
    int Bloqueados,
    int Atrasados);

public record DashboardImplantacao(
    int Clientes,
    int Carteiras,
    int Integracoes,
    int CarteirasImplementadas,
    int IntegracoesImplementadas);

public record DashboardCiaa(
    int ProjetosAtivos,
    int ProjetosConcluidos,
    int ProjetosBloqueados,
    int TarefasAbertas,
    int TarefasAtrasadas);

public record DashboardProjetosPorResponsavel(
    string ResponsavelId,
    string ResponsavelNome,
    int TotalProjetos,
    int ProjetosAtrasados);

public record DashboardTarefasPorStatus(
    string Status,
    int Total);

public record DashboardGeral(
    DashboardKpis Kpis,
    List<DashboardPorEquipe> PorEquipe,
    DashboardImplantacao? Implantacao,
    DashboardCiaa? Ciaa,
    List<DashboardProjetosPorResponsavel> ProjetosPorResponsavel,
    List<DashboardTarefasPorStatus> TarefasPorStatus,
    List<ProjetoResumo> ProximosPrazo);
