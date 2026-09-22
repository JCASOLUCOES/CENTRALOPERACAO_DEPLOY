export interface MetricaCard {
  chave: string;
  rotulo: string;
  valor: number;
  unidade?: string;
  icone?: string;
  cor?: string;
  fundo?: string;
  rota?: string;
  queryParams?: Record<string, string>;
}

export interface Dataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface MetricaGrafico {
  chave: string;
  rotulo: string;
  tipo: 'bar' | 'doughnut' | 'line';
  labels: string[];
  datasets: Dataset[];
  options?: Record<string, unknown>;
}

export interface GestorProjeto {
  id: number;
  codigo: string;
  nome: string;
  tipoProjetoNome: string;
  clienteNome?: string;
  status: string;
  progresso: number;
  responsavelNome?: string;
  dataPrevisao?: string;
  atrasoDias: number;
}

export interface GestorAlerta {
  tipo: 'bloqueada' | 'atrasada' | 'urgente' | 'ok';
  titulo: string;
  detalhe: string;
  quantidade: number;
  rota: string;
  queryParams?: Record<string, string>;
}

export interface GestorEquipe {
  funcaoId: number;
  nome: string;
  classificacao: string;
  total: number;
  emAndamento: number;
  atrasadas: number;
  concluidas: number;
  percentualConclusao: number;
  responsaveis: { operadorId: string; nome: string; count: number }[];
}

export interface GestorTarefaCritica {
  id: number;
  titulo: string;
  projetoCodigo: string;
  responsavelNome?: string;
  dataPrevisao?: string;
  bloqueada: boolean;
  prioridade: number;
  status: string;
}

export interface GestorMetricasResponse {
  cards: MetricaCard[];
  graficos: MetricaGrafico[];
  projetosTop?: GestorProjeto[];
  alertas?: GestorAlerta[];
  equipes?: GestorEquipe[];
  qualidade?: any[];
  incidentes?: GestorTarefaCritica[];
  backlog?: GestorTarefaCritica[];
  atualizadoEm: string;
}