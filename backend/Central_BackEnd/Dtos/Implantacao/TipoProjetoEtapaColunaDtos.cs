namespace Central_BackEnd.Dtos.Implantacao;

public record TipoProjetoResumo(
    int Id,
    string Codigo,
    string Nome,
    int? EquipeId,
    string? EquipeNome,
    bool ClienteObrigatorio,
    int Ordem,
    bool Ativo);

public record TipoProjetoCriarRequest(
    string Codigo,
    string Nome,
    int? EquipeId,
    bool ClienteObrigatorio,
    int Ordem,
    string UsuarioInclusao);

public record TipoProjetoAtualizarRequest(
    string Codigo,
    string Nome,
    int? EquipeId,
    bool ClienteObrigatorio,
    int Ordem,
    bool Ativo);

public record EtapaResumo(
    int Id,
    string Nome,
    int Ordem,
    int? TipoProjetoId,
    string? Cor,
    bool Concluida,
    bool Ativa);

public record EtapaCriarRequest(
    string Nome,
    int Ordem,
    int? TipoProjetoId,
    string? Cor,
    string UsuarioInclusao);

public record EtapaAtualizarRequest(
    string Nome,
    int Ordem,
    int? TipoProjetoId,
    string? Cor,
    bool Concluida,
    bool Ativa);

public record ColunaKanbanResumo(
    int Id,
    string Nome,
    int Ordem,
    string? Cor,
    bool Padrao,
    bool Ativa,
    int? LimiteWip);

public record ColunaKanbanCriarRequest(
    string Nome,
    int Ordem,
    string? Cor,
    int? LimiteWip,
    string UsuarioInclusao);

public record ColunaKanbanAtualizarRequest(
    string Nome,
    int Ordem,
    string? Cor,
    bool Ativa,
    int? LimiteWip);

public record ColunaKanbanReordenarRequest(
    List<int> IdsEmOrdem);
