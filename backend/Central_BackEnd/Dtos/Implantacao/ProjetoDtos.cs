namespace Central_BackEnd.Dtos.Implantacao;

public record ProjetoResumo(
    int Id,
    string Codigo,
    string Nome,
    string TipoProjetoNome,
    int? ClienteId,
    string? ClienteNome,
    int? ClienteLegadoId,
    string? ClienteLegadoNome,
    string Status,
    int Prioridade,
    int Progresso,
    string? ResponsavelId,
    string? ResponsavelNome,
    DateTime? DataPrevisao,
    DateTime? DataConclusao,
    DateTime DataInclusao);

public record ProjetoDetalhe(
    int Id,
    string Codigo,
    string Nome,
    string? Descricao,
    int TipoProjetoId,
    string TipoProjetoNome,
    int? ClienteId,
    string? ClienteNome,
    int? ClienteLegadoId,
    string? ClienteLegadoNome,
    string? ClienteLegadoCnpj,
    string? ResponsavelId,
    string? ResponsavelNome,
    string CriadorId,
    string CriadorNome,
    string Status,
    int? ColunaKanbanId,
    string? ColunaKanbanNome,
    int Prioridade,
    int Progresso,
    DateTime? DataInicio,
    DateTime? DataPrevisao,
    DateTime? DataConclusao,
    DateTime? DataGoLivePrevista,
    DateTime? DataGoLiveReal,
    int? HorasPlanejadas,
    int? HorasRealizadas,
    string? Observacao,
    int TotalTarefas,
    int TarefasConcluidas,
    int TarefasAtrasadas,
    DateTime DataInclusao,
    string UsuarioInclusao,
    DateTime? DataAlteracao,
    string? UsuarioAlteracao);

public record ProjetoCriarRequest(
    string Nome,
    string? Descricao,
    int TipoProjetoId,
    int? ClienteId,
    int? ClienteLegadoId,
    string? ResponsavelId,
    string CriadorId,
    int? ColunaKanbanId,
    int Prioridade,
    DateTime? DataInicio,
    DateTime? DataPrevisao,
    DateTime? DataGoLivePrevista,
    int? HorasPlanejadas,
    string? Observacao,
    int? EtapaInicialOrdem = null);

public record ProjetoAtualizarRequest(
    string? Nome,
    string? Descricao,
    int? TipoProjetoId,
    int? ClienteId,
    int? ClienteLegadoId,
    string? ResponsavelId,
    int? ColunaKanbanId,
    int? Prioridade,
    int? Progresso,
    DateTime? DataInicio,
    DateTime? DataPrevisao,
    DateTime? DataConclusao,
    DateTime? DataGoLivePrevista,
    DateTime? DataGoLiveReal,
    int? HorasPlanejadas,
    int? HorasRealizadas,
    string? Observacao,
    string? Status,
    string UsuarioAlteracao);

public record ProjetoFiltro(
    string? Tipo,
    string? Status,
    int? ClienteId,
    string? ResponsavelId,
    string? Buscar,
    string? PerfilId = null);

public record ClienteResumo(
    int Id,
    string Nome,
    string? Cnpj,
    bool Ativo);

// ===== NOVOS DTOs PARA ETAPAS FIXAS (9 ETAPAS) =====

public record ProjetoEtapaResumo(
    int Ordem,
    string Nome,
    string Estado,
    int Percentual,
    int ChecklistTotal,
    int ChecklistConcluidos,
    DateTime? DataInicio,
    DateTime? DataFimPrevista,
    DateTime? DataFimReal,
    int? AtrasoDias,
    string? ResponsavelNome,
    int TarefasTotal = 0,
    int TarefasConcluidas = 0,
    int? Id = null);

public record ProjetoEtapaChecklistItem(
    int Id,
    string Descricao,
    bool Concluido,
    DateTime? DataConclusao,
    string? UsuarioConclusao);

public record ProjetoEtapaDocumentoItem(
    int Id,
    string Nome,
    string Url,
    string? Descricao,
    DateTime DataInclusao,
    string UsuarioInclusao);

public record ProjetoEtapaHistoricoItem(
    int Id,
    string Acao,
    string? Detalhes,
    string Usuario,
    DateTime Data);

public record ProjetoEtapaComentarioItem(
    int Id,
    string Texto,
    string Usuario,
    DateTime Data);

public record ProjetoEtapaDetalhe(
    int Ordem,
    string Nome,
    string Estado,
    int Percentual,
    List<ProjetoEtapaChecklistItem> Checklist,
    List<ProjetoEtapaDocumentoItem> Documentos,
    List<ProjetoEtapaHistoricoItem> Historico,
    List<ProjetoEtapaComentarioItem> Comentarios,
    DateTime? DataInicio,
    DateTime? DataFimPrevista,
    DateTime? DataFimReal,
    int? AtrasoDias,
    string? ResponsavelId,
    string? ResponsavelNome);

public record ProjetoEtapaChecklistItemRequest(
    int? Id,
    string Descricao,
    bool Concluido);

public record ProjetoEtapaAtualizarRequest(
    int Percentual,
    List<ProjetoEtapaChecklistItemRequest> Checklist,
    string? Estado,
    DateTime? DataFimReal,
    string? ResponsavelId);

public record ProjetoEtapaRetornoRequest(
    int OrdemAlvo,
    string Motivo,
    string UsuarioAlteracao);

public record ProjetoEtapaDocumentoRequest(
    string Nome,
    string Url,
    string? Descricao);

public record ProjetoEtapaComentarioRequest(
    string Texto);

public record ProjetoComEtapasResumo(
    ProjetoResumo Projeto,
    List<ProjetoEtapaResumo> Etapas);
