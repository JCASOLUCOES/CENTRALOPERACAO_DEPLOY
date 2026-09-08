export interface EquipeResumo {
  id: number;
  nome: string;
  prefixoCodigo: string;
  ativa: boolean;
  membrosCount: number;
}

export interface MembroEquipeResumo {
  id: number;
  operadorId: string;
  operadorNome: string;
  dataInclusao: string;
}

export interface EquipeDetalhe {
  id: number;
  nome: string;
  descricao?: string;
  prefixoCodigo: string;
  ativa: boolean;
  membros: MembroEquipeResumo[];
  dataInclusao: string;
}

export interface EquipeCriarRequest {
  nome: string;
  descricao?: string;
  prefixoCodigo: string;
  usuarioInclusao: string;
}

export interface EquipeAtualizarRequest {
  nome: string;
  descricao?: string;
  prefixoCodigo: string;
  ativa: boolean;
}

export interface MembroAdicionarRequest {
  operadorId: string;
}

export interface TipoProjetoResumo {
  id: number;
  codigo: string;
  nome: string;
  equipeId?: number;
  equipeNome?: string;
  clienteObrigatorio: boolean;
  ordem: number;
  ativo: boolean;
}

export interface TipoProjetoCriarRequest {
  codigo: string;
  nome: string;
  equipeId?: number;
  clienteObrigatorio: boolean;
  ordem: number;
  usuarioInclusao: string;
}

export interface TipoProjetoAtualizarRequest {
  codigo: string;
  nome: string;
  equipeId?: number;
  clienteObrigatorio: boolean;
  ordem: number;
  ativo: boolean;
}

export interface EtapaResumo {
  id: number;
  nome: string;
  ordem: number;
  tipoProjetoId?: number;
  cor?: string;
  concluida: boolean;
  ativa: boolean;
}

export interface EtapaCriarRequest {
  nome: string;
  ordem: number;
  tipoProjetoId?: number;
  cor?: string;
  usuarioInclusao: string;
}

export interface EtapaAtualizarRequest {
  nome: string;
  ordem: number;
  tipoProjetoId?: number;
  cor?: string;
  concluida: boolean;
  ativa: boolean;
}

export interface ColunaKanbanResumo {
  id: number;
  nome: string;
  ordem: number;
  cor?: string;
  padrao: boolean;
  ativa: boolean;
  limiteWip?: number;
}

export interface ColunaKanbanCriarRequest {
  nome: string;
  ordem: number;
  cor?: string;
  limiteWip?: number;
  usuarioInclusao: string;
}

export interface ColunaKanbanAtualizarRequest {
  nome: string;
  ordem: number;
  cor?: string;
  ativa: boolean;
  limiteWip?: number;
}

export interface ColunaKanbanReordenarRequest {
  idsEmOrdem: number[];
}
