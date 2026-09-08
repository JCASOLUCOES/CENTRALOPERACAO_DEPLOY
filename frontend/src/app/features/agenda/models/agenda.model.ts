export type AgendaTipo = 'Reuniao' | 'Treinamento' | 'Atendimento' | 'Pessoal' | 'Outro';
export type AgendaVisibilidade = 'Publico' | 'Equipe' | 'Privado';
export type AgendaRecorrencia = 'Nenhuma' | 'Diario' | 'Semanal' | 'Mensal';

export interface AgendaItem {
  id: number;
  operadorId: string;
  operadorNome?: string;
  titulo: string;
  dataInicio: string;
  dataFim?: string;
  diaInteiro: boolean;
  cor?: string;
  tipo: AgendaTipo;
  visibilidade: AgendaVisibilidade;
  projetoId?: number;
  projetoCodigo?: string;
  recorrente: boolean;
  padraoRecorrencia: AgendaRecorrencia;
}

export interface AgendaDetalhe extends AgendaItem {
  descricao?: string;
  local?: string;
  usuarioInclusao?: string;
  dataInclusao: string;
  usuarioAlteracao?: string;
  dataAlteracao?: string;
}

export interface AgendaCriarRequest {
  titulo: string;
  descricao?: string;
  local?: string;
  dataInicio: string;
  dataFim?: string;
  diaInteiro: boolean;
  cor?: string;
  tipo: AgendaTipo;
  visibilidade: AgendaVisibilidade;
  projetoId?: number;
  recorrente: boolean;
  padraoRecorrencia: AgendaRecorrencia;
  usuarioInclusao: string;
}

export type AgendaAtualizarRequest = Omit<AgendaCriarRequest, 'usuarioInclusao'> & {
  usuarioAlteracao: string;
};

export interface AgendaFiltro {
  inicio?: string;
  fim?: string;
  operadorId?: string;
  visibilidade?: string;
  projetoId?: number;
}
