import { Injectable } from '@angular/core';
import { buscarSingleTerm } from '@shared/utils/texto.helper';
import {
  Procedimento,
  SetorProcedimento,
  todosProcedimentos
} from './data/procedimentos.data';

export interface SetorInfo {
  id: SetorProcedimento;
  nome: string;
  icone: string;
  cor: string;
}

const SETORES: SetorInfo[] = [
  { id: 'financeiro', nome: 'Financeiro', icone: 'bi-cash-coin', cor: '#16a34a' },
  { id: 'rh', nome: 'Recursos Humanos', icone: 'bi-people-fill', cor: '#2563eb' },
  { id: 'comercial', nome: 'Comercial', icone: 'bi-briefcase-fill', cor: '#f59e0b' }
];

@Injectable({ providedIn: 'root' })
export class ProcedimentosService {
  listarTodos(): Procedimento[] {
    return todosProcedimentos;
  }

  buscarPorId(id: string): Procedimento | undefined {
    return todosProcedimentos.find(p => p.id === id);
  }

  listarPorSetor(setor: SetorProcedimento | 'todos'): Procedimento[] {
    if (setor === 'todos') return todosProcedimentos;
    return todosProcedimentos.filter(p => p.setor === setor);
  }

  buscar(termo: string, setor: SetorProcedimento | 'todos'): Procedimento[] {
    const lista = this.listarPorSetor(setor);
    if (!termo.trim()) return lista;
    return lista.filter(p =>
      buscarSingleTerm(termo, p.titulo, p.resumo, p.categoria, ...p.tags)
    );
  }

  setores(): SetorInfo[] {
    return SETORES;
  }

  setorInfo(setor: SetorProcedimento): SetorInfo {
    return SETORES.find(s => s.id === setor) ?? SETORES[0];
  }
}
