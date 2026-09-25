import { environment } from "@env/environment";

export interface OperadorResumo {
  id: string;
  nome: string;
  email: string | null;
}

export interface ClienteResumo {
  id: number;
  nome: string;
  cnpj?: string;
  ativo: boolean;
}

export interface TipoProjetoResumo {
  id: number;
  codigo: string;
  nome: string;
  clienteObrigatorio: boolean;
  ordem: number;
  ativo: boolean;
}

export interface ProjetoResumo {
  id: number;
  codigo: string;
  nome: string;
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
  tipoProjetoId: number;
  clienteId?: number;
  clienteLegadoId?: number;
  responsavelId?: string;
  criadorId: string;
  prioridade: number;
  dataInicio?: string;
  dataPrevisao?: string;
  dataGoLivePrevista?: string;
  horasPlanejadas?: number;
  observacao?: string;
  /** Ordem (1–9) da etapa em que o projeto inicia; anteriores nascem Concluídas. */
  etapaInicialOrdem?: number;
}

export interface ProjetoAtualizarRequest extends ProjetoCriarRequest {
  dataConclusao?: string;
  dataGoLiveReal?: string;
  horasRealizadas?: number;
  usuarioAlteracao: string;
}

export interface EtapaPadraoResumo {
  ordem: number;
  nome: string;
}

export interface ProjetoFiltro {
  tipo?: string;
  status?: string;
  clienteId?: number;
  responsavelId?: string;
  buscar?: string;
  perfilId?: string;
}

// ===== NOVOS TYPES PARA ETAPAS FIXAS (9 ETAPAS) =====

export type ProjetoEtapaEstado = "Concluida" | "EmAndamento" | "Bloqueada" | "Pendente";

export interface ProjetoEtapaResumo {
  ordem: number;
  nome: string;
  estado: "Concluida" | "EmAndamento" | "Bloqueada" | "Pendente";
  percentual: number;
  checklistTotal: number;
  checklistConcluidos: number;
  dataInicio?: string;
  dataFimPrevista?: string;
  dataFimReal?: string;
  atrasoDias?: number;
  responsavelNome?: string;
  /** Contador dinâmico de tarefas vinculadas (via Tarefa.ProjetoEtapaId). */
  tarefasTotal?: number;
  tarefasConcluidas?: number;
  id?: number;
}

export interface ProjetoEtapaChecklistItem {
  id: number;
  descricao: string;
  concluido: boolean;
  dataConclusao?: string;
  usuarioConclusao?: string;
}

export interface ProjetoEtapaDocumentoItem {
  id: number;
  nome: string;
  url: string;
  descricao?: string;
  dataInclusao: string;
  usuarioInclusao: string;
}

export interface ProjetoEtapaHistoricoItem {
  id: number;
  acao: string;
  detalhes?: string;
  usuario: string;
  data: string;
}

export interface ProjetoEtapaComentarioItem {
  id: number;
  texto: string;
  usuario: string;
  data: string;
}

export interface ProjetoEtapaDetalhe {
  ordem: number;
  nome: string;
  estado: "Concluida" | "EmAndamento" | "Bloqueada" | "Pendente";
  percentual: number;
  checklist: ProjetoEtapaChecklistItem[];
  documentos: ProjetoEtapaDocumentoItem[];
  historico: ProjetoEtapaHistoricoItem[];
  comentarios: ProjetoEtapaComentarioItem[];
  dataInicio?: string;
  dataFimPrevista?: string;
  dataFimReal?: string;
  atrasoDias?: number;
  responsavelId?: string;
  responsavelNome?: string;
}

export interface ProjetoEtapaChecklistItemRequest {
  id?: number;
  descricao: string;
  concluido: boolean;
}

export interface ProjetoEtapaAtualizarRequest {
  percentual: number;
  checklist: ProjetoEtapaChecklistItemRequest[];
  estado?: string;
  dataFimReal?: string;
  responsavelId?: string;
}

export interface ProjetoEtapaRetornoRequest {
  ordemAlvo: number;
  motivo: string;
  usuarioAlteracao: string;
}

export interface ProjetoEtapaDocumentoRequest {
  nome: string;
  url: string;
  descricao?: string;
}

export interface ProjetoEtapaComentarioRequest {
  texto: string;
}

export interface ProjetoComEtapasResumo {
  projeto: ProjetoResumo;
  etapas: ProjetoEtapaResumo[];
}

interface ProximoCodigoResponse {
  codigo: string;
}
