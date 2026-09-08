namespace Central_BackEnd.Dtos.Implantacao;

public record TarefaResumo(
    int Id,
    int ProjetoId,
    string ProjetoCodigo,
    string ProjetoNome,
    string Titulo,
    string? ResponsavelId,
    string? ResponsavelNome,
    string Status,
    int Prioridade,
    int? ColunaKanbanId,
    int? ChamadoLegadoId,
    int Ordem,
    DateTime? DataPrevisao,
    DateTime? DataConclusao,
    bool Bloqueada,
    string? BloqueadaMotivo,
    int? HorasEstimadas,
    int? HorasRealizadas,
    DateTime DataInclusao);

public record TarefaDetalhe(
    int Id,
    int ProjetoId,
    string ProjetoCodigo,
    string ProjetoNome,
    int? EtapaId,
    string? EtapaNome,
    int? ColunaKanbanId,
    string? ColunaKanbanNome,
    string Titulo,
    string? Descricao,
    string? ResponsavelId,
    string? ResponsavelNome,
    string CriadorId,
    string CriadorNome,
    string Status,
    int Prioridade,
    int Ordem,
    DateTime? DataPrevisao,
    DateTime? DataConclusao,
    int? HorasEstimadas,
    int? HorasRealizadas,
    bool Bloqueada,
    string? MotivoBloqueio,
    List<ComentarioTarefaResumo> Comentarios,
    DateTime DataInclusao,
    string UsuarioInclusao,
    DateTime? DataAlteracao,
    string? UsuarioAlteracao);

public record TarefaCriarRequest(
    int ProjetoId,
    int? EtapaId,
    int? ColunaKanbanId,
    int? ChamadoLegadoId,
    string Titulo,
    string? Descricao,
    string? ResponsavelId,
    string CriadorId,
    int Prioridade,
    int Ordem,
    DateTime? DataPrevisao,
    int? HorasEstimadas);

public record TarefaAtualizarRequest(
    int? EtapaId,
    int? ColunaKanbanId,
    int? ChamadoLegadoId,
    string Titulo,
    string? Descricao,
    string? ResponsavelId,
    int Prioridade,
    int Ordem,
    DateTime? DataPrevisao,
    DateTime? DataConclusao,
    int? HorasEstimadas,
    int? HorasRealizadas,
    bool Bloqueada,
    string? MotivoBloqueio,
    string UsuarioAlteracao);

public record TarefaMudarColunaRequest(
    int? ColunaKanbanId,
    int NovaOrdem);

public record ComentarioTarefaResumo(
    int Id,
    string AutorId,
    string AutorNome,
    string Texto,
    DateTime DataInclusao);

public record ComentarioCriarRequest(
    string AutorId,
    string Texto);

public record TarefaFiltro(
    int? ProjetoId,
    string? Equipe,
    string? ResponsavelId,
    string? Status,
    int? Prioridade,
    string? Buscar,
    bool? ApenasAtrasadas = null,
    bool? ApenasEmAndamento = null,
    bool? ApenasConcluidas = null);
