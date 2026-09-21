using Central_BackEnd.Models.Implantacao;
using System.ComponentModel.DataAnnotations;

namespace Central_BackEnd.Dtos.Implantacao;

public record TipoEventoResponse(
    int Id,
    string Nome,
    string? Cor);

public record OperadorResumo(
    string Id,
    string Nome,
    string? Email);

public record FuncaoResumo(
    int Id,
    string Descricao,
    string? Classificacao);

public record AgendaParticipanteResponse(
    string ParticipanteId,
    string? ParticipanteNome);

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
    int? TipoId,
    string? TipoNome,
    string? TipoCor,
    int? ProjetoId,
    string? ProjetoCodigo,
    PrioridadeAgenda Prioridade,
    int? SLAMinutos);

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
    int? TipoId,
    string? TipoNome,
    string? TipoCor,
    int? ProjetoId,
    string? ProjetoCodigo,
    List<AgendaParticipanteResponse> Participantes,
    string? UsuarioInclusao,
    DateTime DataInclusao,
    string? UsuarioAlteracao,
    DateTime? DataAlteracao,
    PrioridadeAgenda Prioridade,
    int? SLAMinutos);

public record AgendaCriarRequest(
    [Required][MaxLength(200)] string Titulo,
    string? Descricao,
    string? Local,
    [Required] DateTime DataInicio,
    DateTime? DataFim,
    bool DiaInteiro,
    int? TipoId,
    [Required][MaxLength(15)] string ResponsavelId,
    int? ProjetoId,
    List<string>? ParticipantesIds,
    int Prioridade,
    int? SLAMinutos);

public record AgendaAtualizarRequest(
    [Required][MaxLength(200)] string Titulo,
    string? Descricao,
    string? Local,
    [Required] DateTime DataInicio,
    DateTime? DataFim,
    bool DiaInteiro,
    int? TipoId,
    [Required][MaxLength(15)] string ResponsavelId,
    int? ProjetoId,
    List<string>? ParticipantesIds,
    string UsuarioAlteracao,
    int Prioridade,
    int? SLAMinutos);

public record AgendaMoverRequest(
    [Required] DateTime NovaDataInicio,
    [Required] DateTime NovaDataFim);

public record AgendaCriarLoteRequest(
    [Required][MaxLength(200)] string Titulo,
    string? Descricao,
    string? Local,
    [Required] DateTime DataInicio,
    DateTime? DataFim,
    bool DiaInteiro,
    int? TipoId,
    [Required][MaxLength(15)] string ResponsavelId,
    int? ProjetoId,
    List<string>? ParticipantesIds,
    int Prioridade,
    int? SLAMinutos,
    [Required] DateTime DataRepeticaoFim,
    /// <summary>Padrão de recorrência: 0/1=Diária, 2=Semanal, 3=Mensal (AgendaRecorrencia).</summary>
    int PadraoRecorrencia = 1);

public record AgendaLoteResponse(
    int TotalCriados,
    List<AgendaDetalhe> Eventos);
