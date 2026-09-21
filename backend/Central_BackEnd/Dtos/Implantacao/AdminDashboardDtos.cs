using Central_BackEnd.Dtos.Implantacao;

namespace Central_BackEnd.Dtos.Implantacao;

public record AdminResponsavelResumo(
    string OperadorId,
    string Nome,
    int Count
);

public record AdminFuncaoResumo(
    int FuncaoId,
    string Nome,
    string Classificacao,
    int Total,
    int EmAndamento,
    int Atrasadas,
    int Concluidas,
    List<AdminResponsavelResumo> Responsaveis
);

public record AdminAlertaResumo(
    string Tipo,
    string Descricao,
    int Quantidade
);

public record AdminDashboardDto(
    int TotalTarefas,
    int EmAndamento,
    int Atrasadas,
    int Concluidas,
    List<AdminFuncaoResumo> Funcoes,
    List<AdminAlertaResumo> Alertas,
    DateTime AtualizadoEm
);