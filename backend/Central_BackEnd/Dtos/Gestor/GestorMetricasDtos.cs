namespace Central_BackEnd.Dtos.Gestor;

public record MetricaCardDto(
    string Chave,
    string Rotulo,
    decimal Valor,
    string? Unidade,
    string? Icone,
    string? Cor,
    string? Fundo,
    string? Rota,
    Dictionary<string, string>? QueryParams
);

public record MetricaGraficoDto(
    string Chave,
    string Rotulo,
    string Tipo, // "bar" | "doughnut" | "line"
    List<string> Labels,
    List<DatasetDto> Datasets,
    Dictionary<string, object>? Options
);

public record DatasetDto(
    string Label,
    List<decimal> Data,
    string BackgroundColor,
    string? BorderColor = null,
    int? BorderWidth = null
);

public record GestorMetricasResponseDto(
    List<MetricaCardDto> Cards,
    List<MetricaGraficoDto> Graficos,
    DateTime AtualizadoEm
);

public record GestorFuncaoDto(
    int FuncaoId,
    string Nome,
    string Classificacao,
    int TotalTarefas,
    int EmAndamento,
    int Atrasadas,
    int Concluidas,
    List<GestorResponsavelDto> Responsaveis
);

public record GestorResponsavelDto(
    string OperadorId,
    string Nome,
    int Count
);

public record GestorProjetoDto(
    int Id,
    string Codigo,
    string Nome,
    string TipoProjetoNome,
    string? ClienteNome,
    string Status,
    int Progresso,
    string? ResponsavelNome,
    string? DataPrevisao,
    int AtrasoDias
);

public record GestorTarefaCriticaDto(
    int Id,
    string Titulo,
    string ProjetoCodigo,
    string? ResponsavelNome,
    string? DataPrevisao,
    bool Bloqueada,
    int Prioridade,
    string Status
);

public record GestorAlertaDto(
    string Tipo, // "bloqueada" | "atrasada" | "urgente" | "ok"
    string Titulo,
    string Detalhe,
    int Quantidade,
    string Rota,
    Dictionary<string, string>? QueryParams
);

public record GestorEquipeDto(
    int FuncaoId,
    string Nome,
    string Classificacao,
    int Total,
    int EmAndamento,
    int Atrasadas,
    int Concluidas,
    int PercentualConclusao,
    List<GestorResponsavelDto> Responsaveis
);

public record GestorKpiDto(
    string Chave,
    string Rotulo,
    decimal Valor,
    string Icone,
    string Cor,
    string Fundo,
    string Rota,
    Dictionary<string, string>? QueryParams
);