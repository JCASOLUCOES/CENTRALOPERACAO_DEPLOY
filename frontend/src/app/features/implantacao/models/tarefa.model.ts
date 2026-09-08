export interface TarefaResumo {
  id: number;
  projetoId: number;
  projetoCodigo: string;
  projetoNome: string;
  titulo: string;
  responsavelId?: string;
  responsavelNome?: string;
  status: string;
  prioridade: number;
  colunaKanbanId?: number;
  ordem: number;
  dataPrevisao?: string;
  dataConclusao?: string;
  bloqueada: boolean;
  bloqueadaMotivo?: string;
  horasEstimadas?: number;
  horasRealizadas?: number;
  chamadoLegadoId?: number;
  dataInclusao: string;
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
  projetoId: number;
  projetoCodigo: string;
  projetoNome: string;
  etapaId?: number;
  etapaNome?: string;
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
  dataConclusao?: string;
  horasEstimadas?: number;
  horasRealizadas?: number;
  bloqueada: boolean;
  motivoBloqueio?: string;
  comentarios: ComentarioTarefaResumo[];
  dataInclusao: string;
  usuarioInclusao: string;
  dataAlteracao?: string;
  usuarioAlteracao?: string;
}

export interface TarefaCriarRequest {
  projetoId: number;
  etapaId?: number;
  colunaKanbanId?: number;
  titulo: string;
  descricao?: string;
  responsavelId?: string;
  criadorId: string;
  prioridade: number;
  ordem: number;
  dataPrevisao?: string;
  horasEstimadas?: number;
  chamadoLegadoId?: number;
}

export interface TarefaAtualizarRequest {
  etapaId?: number;
  colunaKanbanId?: number;
  titulo: string;
  descricao?: string;
  responsavelId?: string;
  prioridade: number;
  ordem: number;
  dataPrevisao?: string;
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
}

export interface ComentarioCriarRequest {
  autorId: string;
  texto: string;
}

export interface TarefaFiltro {
  projetoId?: number;
  equipe?: string;
  responsavelId?: string;
  status?: string;
  prioridade?: number;
  buscar?: string;
  apenasAtrasadas?: boolean;
  apenasEmAndamento?: boolean;
  apenasConcluidas?: boolean;
}
