export interface ResponsavelResumo {
  operadorId: string;
  nome: string;
}

export interface ChamadoResumo {
  chamadoId: number;
  titulo?: string;
  status?: string;
  dataPrevisao?: string;
}

export interface ApontamentoResumo {
  id: number;
  operadorId: string;
  operadorNome: string;
  data: string;
  horas: number;
  observacao?: string;
}

export interface HistoricoMovimentacao {
  tarefaId: number;
  statusAnterior?: string;
  statusNovo?: string;
  usuario?: string;
  data: string;
  observacao?: string;
}

export interface TarefaResumo {
  id: number;
  projetoId?: number;
  projetoCodigo: string;
  projetoNome: string;
  titulo: string;
  responsavelId?: string;
  responsavelNome?: string;
  status: string;
  prioridade: number;
  colunaKanbanId?: number;
  chamadoLegadoId?: number;
  ordem: number;
  dataPrevisao?: string;
  dataEntrega?: string;
  tipo: number;
  dataConclusao?: string;
  bloqueada: boolean;
  bloqueadaMotivo?: string;
  horasEstimadas?: number;
  horasRealizadas?: number;
  responsaveis: ResponsavelResumo[];
  dataInclusao: string;
  arquivada: boolean;
  etapaId?: number;
  etapaNome?: string;
  projetoEtapaId?: number;
  projetoEtapaNome?: string;
}

export interface ComentarioTarefaResumo {
  id: number;
  autorId: string;
  autorNome: string;
  texto: string;
  dataInclusao: string;
}

export interface TarefaDetalhe {
  id: number;
  projetoId?: number;
  projetoCodigo: string;
  projetoNome: string;
  chamadoLegadoId?: number;
  etapaId?: number;
  etapaNome?: string;
  projetoEtapaId?: number;
  projetoEtapaNome?: string;
  colunaKanbanId?: number;
  colunaKanbanNome?: string;
  titulo: string;
  descricao?: string;
  responsavelId?: string;
  responsavelNome?: string;
  criadorId: string;
  criadorNome: string;
  status: string;
  prioridade: number;
  ordem: number;
  dataPrevisao?: string;
  dataEntrega?: string;
  tipo: number;
  dataConclusao?: string;
  horasEstimadas?: number;
  horasRealizadas?: number;
  bloqueada: boolean;
  motivoBloqueio?: string;
  arquivada: boolean;
  responsaveis: ResponsavelResumo[];
  chamados: ChamadoResumo[];
  apontamentos: ApontamentoResumo[];
  comentarios: ComentarioTarefaResumo[];
  dataInclusao: string;
  usuarioInclusao: string;
  dataAlteracao?: string;
  usuarioAlteracao?: string;
}

export interface TarefaCriarRequest {
  projetoId?: number;
  etapaId?: number;
  projetoEtapaId?: number;
  colunaKanbanId?: number;
  chamadoLegadoId?: number;
  titulo: string;
  descricao?: string;
  responsavelId?: string;
  responsavelIds?: string[];
  criadorId: string;
  prioridade: number;
  tipo: number;
  ordem: number;
  dataPrevisao?: string;
  dataEntrega?: string;
  horasEstimadas?: number;
}

export interface TarefaAtualizarRequest {
  etapaId?: number;
  projetoEtapaId?: number;
  colunaKanbanId?: number;
  chamadoLegadoId?: number;
  titulo: string;
  descricao?: string;
  responsavelId?: string;
  responsavelIds?: string[];
  status?: string;
  prioridade: number;
  tipo: number;
  ordem: number;
  dataPrevisao?: string;
  dataEntrega?: string;
  dataConclusao?: string;
  horasEstimadas?: number;
  horasRealizadas?: number;
  bloqueada: boolean;
  motivoBloqueio?: string;
  usuarioAlteracao: string;
}

export interface TarefaMudarColunaRequest {
  colunaKanbanId?: number;
  novaOrdem: number;
  motivoBloqueio?: string;
}

export interface ComentarioCriarRequest {
  autorId: string;
  texto: string;
}

export interface ApontamentoCriarRequest {
  operadorId: string;
  data: string;
  horas: number;
  observacao?: string;
}

export interface ApontamentoAtualizarRequest {
  data: string;
  horas: number;
  observacao?: string;
  usuarioAlteracao: string;
}

export interface TarefaFiltro {
  projetoId?: number;
  responsavelId?: string;
  status?: string;
  prioridade?: number;
  tipo?: number;
  buscar?: string;
  apenasAtrasadas?: boolean;
  apenasEmAndamento?: boolean;
  apenasConcluidas?: boolean;
  apenasVenceHoje?: boolean;
  perfilId?: string;
  incluirArquivadas?: boolean;
  etapaId?: number;
}
