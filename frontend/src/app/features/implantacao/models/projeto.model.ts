export interface ProjetoResumo {
  id: number;
  codigo: string;
  nome: string;
  equipeNome: string;
  tipoProjetoNome: string;
  clienteId?: number;
  clienteNome?: string;
  clienteLegadoId?: number;
  clienteLegadoNome?: string;
  clienteLegadoCnpj?: string;
  status: string;
  prioridade: number;
  progresso: number;
  responsavelId?: string;
  responsavelNome?: string;
  dataPrevisao?: string;
  dataConclusao?: string;
  dataInclusao: string;
}

export interface ProjetoDetalhe extends ProjetoResumo {
  descricao?: string;
  equipeId: number;
  tipoProjetoId: number;
  criadorId: string;
  criadorNome: string;
  colunaKanbanId?: number;
  colunaKanbanNome?: string;
  dataInicio?: string;
  dataGoLivePrevista?: string;
  dataGoLiveReal?: string;
  horasPlanejadas?: number;
  horasRealizadas?: number;
  observacao?: string;
  totalTarefas: number;
  tarefasConcluidas: number;
  tarefasAtrasadas: number;
  dataAlteracao?: string;
  usuarioAlteracao?: string;
}

export interface ProjetoCriarRequest {
  nome: string;
  descricao?: string;
  equipeId: number;
  tipoProjetoId: number;
  clienteId?: number;
  clienteLegadoId?: number;
  responsavelId?: string;
  criadorId: string;
  colunaKanbanId?: number;
  prioridade: number;
  dataInicio?: string;
  dataPrevisao?: string;
  dataGoLivePrevista?: string;
  horasPlanejadas?: number;
  observacao?: string;
}

export interface ProjetoAtualizarRequest extends ProjetoCriarRequest {
  progresso: number;
  dataConclusao?: string;
  dataGoLiveReal?: string;
  horasRealizadas?: number;
  usuarioAlteracao: string;
}

export interface ProjetoMudarStatusRequest {
  status: string;
  colunaKanbanId?: number;
  usuarioAlteracao: string;
}

export interface ProjetoFiltro {
  equipe?: string;
  tipo?: string;
  status?: string;
  clienteId?: number;
  responsavelId?: string;
  buscar?: string;
}
