export interface ClienteLegadoResumo {
  id: number;
  cnpj: string;
  razaoSocial: string;
  fantasia?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  ativo: boolean;
}

export interface ChamadoLegadoResumo {
  id: number;
  clienteId?: number;
  contratoId?: number;
  titulo?: string;
  tipo?: string;
  status?: string;
  dataInclusao?: string;
  dataFechamento?: string;
  dataPrevisao?: string;
}

export interface IndicacaoLegadoResumo {
  id: number;
  nome: string;
  responsavel?: string;
}

export interface FuncionarioLegadoResumo {
  id: number;
  nome: string;
  operadorId?: string;
  funcao?: string;
}
