import { PerfilUsuario } from '@core/models/auth.model';

export interface NavItem {
  label: string;
  route: string;
  icone: string;
  exact?: boolean;
  roles?: PerfilUsuario[];
  children?: NavItem[];
  grupo?: string;
  dica?: string;
  badge?: string;
  queryParams?: Record<string, string>;
}

export type SidebarLink = NavItem;

export const HEADER_NAV_ITEMS: NavItem[] = [
  { label: 'Início', route: '/', icone: 'bi-house-fill', exact: true },
  { label: 'Fraseologias', route: '/fraseologia', icone: 'bi-diagram-3-fill' },
  {
    label: 'Ferramentas',
    route: '/ferramentas',
    icone: 'bi-tools',
    children: [
      { label: 'Central de Utilidades', route: '/ferramentas', icone: 'bi-grid-fill' },
      { label: 'Acessos', route: '/ferramentas/acessos', icone: 'bi-building' },
      { label: 'FAQ', route: '/ferramentas/faq', icone: 'bi-question-circle-fill' },
    ]
  },
  { label: 'Cursos', route: '/cursos', icone: 'bi-mortarboard-fill' },
];

export const SIDEBAR_SECTIONS: NavItem[] = [
  {
    label: 'Início',
    route: '',
    icone: 'bi-house-fill',
    grupo: 'inicio',
    children: [
      { label: 'Visão Geral', route: '/', icone: 'bi-house-fill' },
      { label: 'Agenda', route: '/agenda', icone: 'bi-calendar-week-fill' },
    ]
  },
  {
    label: 'SUPORTE',
    route: '',
    icone: 'bi-headset',
    grupo: 'suporte',
    children: [
      {
        label: 'Atendimento',
        route: '',
        icone: 'bi-headset',
        children: [
          { label: 'Modelo de Chamados', route: '/modelo-chamados', icone: 'bi-file-earmark-text-fill', dica: 'Modelos para registrar chamados' },
          { label: 'Fraseologias', route: '/fraseologia', icone: 'bi-diagram-3-fill', dica: 'Respostas prontas de atendimento' },
        ]
      },
      {
        label: 'Conhecimento Rápido',
        route: '',
        icone: 'bi-mortarboard-fill',
        children: [
          { label: 'Como resolver esse problema?', route: '/trilhas/resolver', icone: 'bi-book-fill', dica: 'Diagnóstico guiado e resolução de incidentes' },
          { label: 'SQL', route: '/trilhas/sql', icone: 'bi-database-fill', dica: 'Guias e consultas SQL' },
          { label: 'Rede', route: '/trilhas/rede', icone: 'bi-diagram-3-fill', dica: 'Guias de rede' },
          { label: 'Infra', route: '/trilhas/infra', icone: 'bi-hdd-network-fill', dica: 'Guias de infraestrutura' },
        ]
      },
    ]
  },
  {
    label: 'Implantação',
    route: '',
    icone: 'bi-kanban-fill',
    grupo: 'implantacao',
    children: [
      { label: 'Visão geral', route: '/implantacao/dashboard', icone: 'bi-bar-chart-fill', dica: 'Indicadores da operação de implantação' },
      { label: 'Projetos', route: '/implantacao/projetos', icone: 'bi-folder2-open', dica: 'Gerenciar projetos — planejar e acompanhar entregas' },
      { label: 'Kanban', route: '/implantacao/kanban', icone: 'bi-kanban-fill', dica: 'Quadro de tarefas — arrastar, criar e mover' },
      { label: 'Tarefas', route: '/implantacao/tarefas', icone: 'bi-list-check', dica: 'Lista de tarefas com filtros' },
    ]
  },
  {
    label: 'Ferramentas',
    route: '',
    icone: 'bi-tools',
    grupo: 'ferramentas',
    children: [
      { label: 'Banco de Dados', route: '/database', icone: 'bi-hdd-network-fill' },
      { label: 'Acessos', route: '/ferramentas/acessos', icone: 'bi-building' },
      { label: 'Central de Utilidades', route: '/ferramentas', icone: 'bi-grid-fill' },
    ]
  },
  {
    label: 'Conhecimento',
    route: '',
    icone: 'bi-book-fill',
    grupo: 'conhecimento',
    children: [
      { label: 'Cursos', route: '/cursos', icone: 'bi-mortarboard-fill' },
      { label: 'FAQ', route: '/ferramentas/faq', icone: 'bi-question-circle-fill' },
      { label: 'Stack', route: '/stack', icone: 'bi-stack' },
    ]
  },
  {
    label: 'JCA - Administração Interna',
    route: '',
    icone: 'bi-building',
    grupo: 'jca-admin',
    children: [
      { label: 'Empresa', route: '/empresa', icone: 'bi-building' },
      { label: 'Onboarding', route: '/empresa/onboarding', icone: 'bi-rocket-takeoff' },
      { label: 'Políticas', route: '/politica', icone: 'bi-file-earmark-text-fill' },
      { label: 'Procedimentos', route: '/visao-adm', icone: 'bi-clipboard-data-fill' },
      { label: 'Kanban ADM', route: '/implantacao/kanban', icone: 'bi-kanban-fill', roles: ['F'], queryParams: { perfil: 'F' } },
    ]
  },
];