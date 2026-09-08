using Central_BackEnd.Models.Implantacao;

namespace Central_BackEnd.Dtos.Implantacao;

public record AgendaResumo(
    int Id,
    string OperadorId,
    string? OperadorNome,
    string Titulo,
    DateTime DataInicio,
    DateTime? DataFim,
    bool DiaInteiro,
    string? Cor,
    AgendaTipo Tipo,
    AgendaVisibilidade Visibilidade,
    int? ProjetoId,
    string? ProjetoCodigo,
    bool Recorrente,
    AgendaRecorrencia PadraoRecorrencia);

public record AgendaDetalhe(
    int Id,
    string OperadorId,
    string? OperadorNome,
    string Titulo,
    string? Descricao,
    string? Local,
    DateTime DataInicio,
    DateTime? DataFim,
    bool DiaInteiro,
    string? Cor,
    AgendaTipo Tipo,
    AgendaVisibilidade Visibilidade,
    int? ProjetoId,
    string? ProjetoCodigo,
    bool Recorrente,
    AgendaRecorrencia PadraoRecorrencia,
    string? UsuarioInclusao,
    DateTime DataInclusao,
    string? UsuarioAlteracao,
    DateTime? DataAlteracao);

public record AgendaCriarRequest(
    string Titulo,
    string? Descricao,
    string? Local,
    DateTime DataInicio,
    DateTime? DataFim,
    bool DiaInteiro,
    string? Cor,
    AgendaTipo Tipo,
    AgendaVisibilidade Visibilidade,
    int? ProjetoId,
    bool Recorrente,
    AgendaRecorrencia PadraoRecorrencia,
    string UsuarioInclusao);

public record AgendaAtualizarRequest(
    string Titulo,
    string? Descricao,
    string? Local,
    DateTime DataInicio,
    DateTime? DataFim,
    bool DiaInteiro,
    string? Cor,
    AgendaTipo Tipo,
    AgendaVisibilidade Visibilidade,
    int? ProjetoId,
    bool Recorrente,
    AgendaRecorrencia PadraoRecorrencia,
    string UsuarioAlteracao);
