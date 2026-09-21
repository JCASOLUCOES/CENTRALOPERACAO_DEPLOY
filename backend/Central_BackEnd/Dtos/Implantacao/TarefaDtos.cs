namespace Central_BackEnd.Dtos.Implantacao;

public record TarefaResumo(
    int Id,
    int? ProjetoId,
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
    DateTime? DataEntrega,
    int Tipo,
    DateTime? DataConclusao,
    bool Bloqueada,
    string? BloqueadaMotivo,
    int? HorasEstimadas,
    int? HorasRealizadas,
    List<ResponsavelResumo> Responsaveis,
    DateTime DataInclusao,
    bool Arquivada,
    int? EtapaId = null,
    string? EtapaNome = null,
    int? ProjetoEtapaId = null,
    string? ProjetoEtapaNome = null);

public record TarefaDetalhe(
    int Id,
    int? ProjetoId,
    string ProjetoCodigo,
    string ProjetoNome,
    int? ChamadoLegadoId,
    int? EtapaId,
    string? EtapaNome,
    int? ProjetoEtapaId,
    string? ProjetoEtapaNome,
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
    DateTime? DataEntrega,
    int Tipo,
    DateTime? DataConclusao,
    int? HorasEstimadas,
    int? HorasRealizadas,
    bool Bloqueada,
    string? MotivoBloqueio,
    bool Arquivada,
    List<ResponsavelResumo> Responsaveis,
    List<ChamadoResumo> Chamados,
    List<ApontamentoResumo> Apontamentos,
    List<ComentarioTarefaResumo> Comentarios,
    DateTime DataInclusao,
    string UsuarioInclusao,
    DateTime? DataAlteracao,
    string? UsuarioAlteracao);

public record TarefaCriarRequest(
    int? ProjetoId,
    int? EtapaId,
    int? ProjetoEtapaId,
    int? ColunaKanbanId,
    int? ChamadoLegadoId,
    string Titulo,
    string? Descricao,
    string? ResponsavelId,
    List<string>? ResponsavelIds,
    string CriadorId,
    int Prioridade,
    int Tipo,
    int Ordem,
    DateTime? DataPrevisao,
    DateTime? DataEntrega,
    int? HorasEstimadas);

public record TarefaAtualizarRequest(
    int? EtapaId,
    int? ProjetoEtapaId,
    int? ColunaKanbanId,
    int? ChamadoLegadoId,
    string Titulo,
    string? Descricao,
    string? ResponsavelId,
    List<string>? ResponsavelIds,
    string? Status,
    int Prioridade,
    int Tipo,
    int Ordem,
    DateTime? DataPrevisao,
    DateTime? DataEntrega,
    DateTime? DataConclusao,
    int? HorasEstimadas,
    int? HorasRealizadas,
    bool Bloqueada,
    string? MotivoBloqueio,
    string UsuarioAlteracao);

public record TarefaMudarColunaRequest(
    int? ColunaKanbanId,
    int NovaOrdem,
    string? MotivoBloqueio = null);

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
    int? Tipo,
    string? Buscar,
    bool? ApenasAtrasadas = null,
    bool? ApenasEmAndamento = null,
    bool? ApenasConcluidas = null,
    bool? ApenasVenceHoje = null,
    bool? IncluirArquivadas = null,
    int? FuncaoId = null,
    string? FuncaoClassificacao = null,
    string? PerfilId = null,
    int? EtapaId = null);

public record ResponsavelResumo(
    string OperadorId,
    string Nome);

public record ChamadoResumo(
    int ChamadoId,
    string? Titulo,
    string? Status);

public record ChamadoLegadoResumo(
    int ChamadoId,
    string? Titulo,
    string? Status,
    DateTime? DataPrevisao);

public record ApontamentoResumo(
    int Id,
    string OperadorId,
    string OperadorNome,
    DateTime Data,
    decimal Horas,
    string? Observacao);

public record ApontamentoCriarRequest(
    string OperadorId,
    DateTime Data,
    decimal Horas,
    string? Observacao);

public record ApontamentoAtualizarRequest(
    DateTime Data,
    decimal Horas,
    string? Observacao,
    string UsuarioAlteracao);

public record TarefaChamadoRequest(
    int ChamadoId);

public record HistoricoMovimentacao(
    int TarefaId,
    string? StatusAnterior,
    string? StatusNovo,
    string? Usuario,
    DateTime Data,
    string? Observacao);
