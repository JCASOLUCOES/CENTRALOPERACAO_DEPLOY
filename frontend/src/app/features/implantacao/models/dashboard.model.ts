export interface DashboardKpis {
  projetosAtivos: number;
  projetosConcluidos: number;
  projetosBloqueados: number;
  projetosAtrasados: number;
  tarefasAbertas: number;
  tarefasAtrasadas: number;
  totalClientes: number;
  horasApontadas: number;
  horasPlanejadas: number;
  
  // Novos KPIs Fase 3
  tarefasFeatures: number;
  tarefasBugs: number;
  horasFeatures: number;
  horasBugs: number;
  percentualRetrabalho: number;
  leadTimeMedioDias: number;
  cycleTimeMedioDias: number;
}

export interface DashboardPorEquipe {
  equipe: string;
  ativos: number;
  concluidos: number;
  bloqueados: number;
  atrasados: number;
}

export interface DashboardImplantacao {
  clientes: number;
  carteiras: number;
  integracoes: number;
  carteirasImplementadas: number;
  integracoesImplementadas: number;
}

export interface DashboardCiaa {
  projetosAtivos: number;
  projetosConcluidos: number;
  projetosBloqueados: number;
  tarefasAbertas: number;
  tarefasAtrasadas: number;
}

export interface DashboardProjetosPorResponsavel {
  responsavelId: string;
  responsavelNome: string;
  totalProjetos: number;
  projetosAtrasados: number;
}

export interface DashboardTarefasPorStatus {
  status: string;
  total: number;
}

export interface DashboardTarefasPorTipo {
  tipo: string;
  total: number;
  horasEstimadas: number;
  horasRealizadas: number;
}

export interface DashboardHorasPorResponsavel {
  responsavelId: string;
  responsavelNome: string;
  horasEstimadas: number;
  horasRealizadas: number;
  totalTarefas: number;
}

export interface DashboardGeral {
  kpis: DashboardKpis;
  porEquipe: DashboardPorEquipe[];
  implantacao?: DashboardImplantacao;
  ciaa?: DashboardCiaa;
  projetosPorResponsavel: DashboardProjetosPorResponsavel[];
  tarefasPorStatus: DashboardTarefasPorStatus[];
  tarefasPorTipo: DashboardTarefasPorTipo[];
  horasPorResponsavel: DashboardHorasPorResponsavel[];
  proximosPrazo: import('./projeto.model').ProjetoResumo[];
}
