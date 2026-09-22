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
  status?: string;
  dataConclusao?: string;
  bloqueada?: boolean;
  motivoBloqueio?: string;
  chamadoIds?: number[];
}

export interface TarefaAtualizarRequest {
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
  bloqueada: boolean;
  motivoBloqueio?: string;
  usuarioAlteracao: string;
  chamadoIds?: number[];
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
  perfilModo?: 'incluir' | 'excluir';
  incluirArquivadas?: boolean;
}

/**
 * Regra única de atraso (espelha o backend):
 * prazo = dataEntrega ?? dataPrevisao; atrasada se o prazo já passou,
 * exceto Concluída dentro do prazo (dataConclusao ≤ prazo). Cancelada nunca conta.
 */
export function ehAtrasada(t: {
  status: string;
  dataEntrega?: string;
  dataPrevisao?: string;
  dataConclusao?: string;
}): boolean {
  if (t.status === 'Cancelada') return false;
  const ref = t.dataEntrega ?? t.dataPrevisao;
  if (!ref) return false;
  const hoje = new Date(new Date().toDateString()).getTime();
  const prazo = new Date(new Date(ref).toDateString()).getTime();
  if (prazo >= hoje) return false;
  if (t.status === 'Concluida' && t.dataConclusao) {
    return new Date(new Date(t.dataConclusao).toDateString()).getTime() > prazo;
  }
  return true;
}
