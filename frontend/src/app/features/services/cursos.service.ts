import { Injectable } from '@angular/core';
import {
  Curso,
  categoriasCursos,
  todosCursos,
  buscarCursos as buscarCursosNovos,
  buscarCursoPorId
} from '../cursos/cursos-novos.data';

@Injectable({
  providedIn: 'root'
})
export class CursosService {
  listarCursos(): Curso[] {
    return todosCursos;
  }

  listarCategorias(): { id: string; nome: string; icone: string; cor: string; descricao: string }[] {
    return categoriasCursos;
  }

  buscarCurso(id: string): Curso | undefined {
    return buscarCursoPorId(id);
  }

  buscar(termo: string, categoriaId?: string, nivel?: string | null): Curso[] {
    let resultado = termo ? buscarCursosNovos(termo) : [...todosCursos];

    if (categoriaId) {
      resultado = resultado.filter(c => c.categoria === categoriaId);
    }

    if (nivel && nivel !== 'Todos') {
      resultado = resultado.filter(c => c.nivel === nivel);
    }

    return resultado;
  }

  listarPorCategoria(categoriaId: string): Curso[] {
    return todosCursos.filter(curso => curso.categoria === categoriaId);
  }
}
