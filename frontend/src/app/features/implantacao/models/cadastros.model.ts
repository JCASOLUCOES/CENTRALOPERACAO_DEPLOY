/**
 * Colunas do Kanban são FIXAS (7 colunas via seed). Somente leitura.
 * Tipos de projeto vêm do seed (CLIENTE, CARTEIRA, INTEGRACAO, PROJETO_CIAA)
 * e usam o `TipoProjetoResumo` de `projeto.model.ts`.
 */
export interface ColunaKanbanResumo {
  id: number;
  nome: string;
  ordem: number;
  cor?: string;
  padrao: boolean;
  ativa: boolean;
  limiteWip?: number;
}
