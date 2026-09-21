import type { AdminDashboardDto, AdminFuncaoResumo } from '@features/admin/services/admin-dashboard.service';
import type { DashboardGeral } from '@features/implantacao/models/dashboard.model';
import type { ProjetoResumo } from '@features/implantacao/models/projeto.model';
import type { TarefaResumo } from '@features/implantacao/models/tarefa.model';
import type { AgendaResumo } from '@features/agenda/services/agenda.service';

export interface KpiResumo {
  chave: 'total' | 'andamento' | 'concluidas' | 'atrasadas' | 'bloqueadas' | 'urgentes';
  rotulo: string;
  valor: number;
  icone: string;
  cor: string;
  fundo: string;
  rota: string;
  queryParams?: Record<string, string>;
}

export interface ModuloResumo {
  chave: string;
  titulo: string;
  descricao: string;
  icone: string;
  cor: string;
  tarefas: number;
  atrasadas: number;
  bloqueadas: number;
  extra?: string;
  rota: string;
  botao: string;
  emBreve?: boolean;
}

export interface EquipeResumo extends AdminFuncaoResumo {
  percentualConclusao: number;
}

export interface AlertaCritico {
  tipo: 'bloqueada' | 'atrasada' | 'urgente' | 'ok';
  titulo: string;
  detalhe: string;
  quantidade: number;
  rota: string;
  queryParams?: Record<string, string>;
}

export interface ResumoExecutivo {
  kpis: KpiResumo[];
  modulos: ModuloResumo[];
  equipes: EquipeResumo[];
  alertas: AlertaCritico[];
  proximasEntregas: DashboardGeral['proximosPrazo'];
  projetosTop: ProjetoResumo[];
  tarefasCriticas: TarefaResumo[];
  agendaSemana: AgendaResumo[];
  atualizadoEm: string;
  projetosAtivos: number;
  projetosAtrasados: number;
  horasApontadas: number;
}

export type { AdminDashboardDto, DashboardGeral, ProjetoResumo, TarefaResumo, AgendaResumo };
