namespace Central_BackEnd.Dtos.Implantacao;

public record TipoProjetoResumo(
    int Id,
    string Codigo,
    string Nome,
    bool ClienteObrigatorio,
    int Ordem,
    bool Ativo);

public record TipoProjetoCriarRequest(
    string Codigo,
    string Nome,
    bool ClienteObrigatorio,
    int Ordem,
    string UsuarioInclusao);

public record TipoProjetoAtualizarRequest(
    string? Codigo,
    string? Nome,
    bool? ClienteObrigatorio,
    int? Ordem,
    bool? Ativo,
    string UsuarioAlteracao);

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
    string? Nome,
    int? Ordem,
    string? Cor,
    bool? Ativa,
    int? LimiteWip,
    string UsuarioAlteracao);

public record ColunaKanbanReordenarRequest(
    List<int> IdsEmOrdem);

public record TipoProjetoDetalhe(
    int Id,
    string Codigo,
    string Nome,
    bool ClienteObrigatorio,
    bool Ativo,
    int Ordem,
    string UsuarioInclusao,
    DateTime DataInclusao,
    string? UsuarioAlteracao,
    DateTime? DataAlteracao);

public record ColunaKanbanDetalhe(
    int Id,
    string Nome,
    int Ordem,
    string? Cor,
    bool Padrao,
    bool Ativa,
    int? LimiteWip,
    string UsuarioInclusao,
    DateTime DataInclusao,
    string? UsuarioAlteracao,
    DateTime? DataAlteracao);
