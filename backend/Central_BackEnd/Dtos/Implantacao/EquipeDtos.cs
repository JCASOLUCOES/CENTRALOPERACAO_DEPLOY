namespace Central_BackEnd.Dtos.Implantacao;

public record EquipeResumo(
    int Id,
    string Nome,
    string PrefixoCodigo,
    bool Ativa,
    int MembrosCount);

public record EquipeDetalhe(
    int Id,
    string Nome,
    string? Descricao,
    string PrefixoCodigo,
    bool Ativa,
    List<MembroEquipeResumo> Membros,
    DateTime DataInclusao);

public record MembroEquipeResumo(
    int Id,
    string OperadorId,
    string OperadorNome,
    DateTime DataInclusao);

public record EquipeCriarRequest(
    string Nome,
    string? Descricao,
    string PrefixoCodigo,
    string UsuarioInclusao);

public record EquipeAtualizarRequest(
    string Nome,
    string? Descricao,
    string PrefixoCodigo,
    bool Ativa);

public record MembroAdicionarRequest(
    string OperadorId);
