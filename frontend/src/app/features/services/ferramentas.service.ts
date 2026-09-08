import { Injectable } from '@angular/core';
import { buscarMultiTerm } from '@shared/utils/texto.helper';
import {
  Ferramenta,
  FerramentaCategoria,
  categoriasFerramentas,
  ferramentas
} from '../ferramentas/ferramentas.data';

@Injectable({
  providedIn: 'root'
})
export class FerramentasService {
  listarFerramentas(): Ferramenta[] {
    return [...ferramentas].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  listarCategorias(): FerramentaCategoria[] {
    return categoriasFerramentas;
  }

  buscarFerramenta(id: string): Ferramenta | undefined {
    return ferramentas.find(ferramenta => ferramenta.id === id);
  }

  buscar(termo: string, categoriaId?: string): Ferramenta[] {
    return ferramentas
      .filter(f => {
        if (categoriaId && f.categoria !== categoriaId) return false;
        if (!termo.trim()) return true;
        return buscarMultiTerm(termo, f.nome, f.descricao, ...f.tags);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  listarPorCategoria(categoriaId: string): Ferramenta[] {
    return ferramentas
      .filter(ferramenta => ferramenta.categoria === categoriaId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }
}
