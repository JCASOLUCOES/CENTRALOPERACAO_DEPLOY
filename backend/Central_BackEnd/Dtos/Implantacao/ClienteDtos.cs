namespace Central_BackEnd.Dtos.Implantacao;

public record ClienteResumo(
    int Id,
    string Nome,
    string? Cnpj,
    bool Ativo);

public record ClienteDetalhe(
    int Id,
    string Nome,
    string? Cnpj,
    string? Contato,
    string? Observacao,
    bool Ativo,
    int TotalProjetos,
    DateTime DataInclusao,
    string UsuarioInclusao);

public record ClienteCriarRequest(
    string Nome,
    string? Cnpj,
    string? Contato,
    string? Observacao,
    string UsuarioInclusao);

public record ClienteAtualizarRequest(
    string Nome,
    string? Cnpj,
    string? Contato,
    string? Observacao,
    bool Ativo,
    string UsuarioAlteracao);
