export interface ModuloRegistro {
  chave: string;
  titulo: string;
  descricao: string;
  icone: string;
  cor: string;
  rota: string;
  botao: string;
  emBreve?: boolean;
  destinoEmBreve?: string;
}

/**
 * Registro de módulos da Central Executiva.
 * Só entram aqui módulos reais. Novos módulos voltam
 * a aparecer quando tiverem entidade e endpoints próprios.
 */
export const MODULOS_REGISTRY: ModuloRegistro[] = [
  {
    chave: 'implantacao',
    titulo: 'Implantação',
    descricao: 'Projetos, tarefas e kanban da operação.',
    icone: 'bi-kanban',
    cor: '#0f4c81',
    rota: '/implantacao/dashboard',
    botao: 'Abrir Implantação'
  },
  {
    chave: 'financeiro',
    titulo: 'Financeiro',
    descricao: 'Procedimentos e rotinas financeiras (conteúdo interno).',
    icone: 'bi-cash-coin',
    cor: '#16a34a',
    rota: '/visao-adm',
    botao: 'Abrir Financeiro',
    emBreve: true,
    destinoEmBreve: '/visao-adm'
  }
];
