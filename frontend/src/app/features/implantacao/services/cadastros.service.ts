import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ColunaKanbanResumo } from '../models/cadastros.model';
import { TipoProjetoResumo } from '../models/projeto.model';

export type { TipoProjetoResumo } from '../models/projeto.model';

/**
 * Colunas do Kanban são FIXAS (7 colunas via seed): BACKLOG, A FAZER,
 * EM DESENVOLVIMENTO, EM ANDAMENTO, HOMOLOGACAO, BLOQUEADO, CONCLUIDO.
 * Este service expõe apenas leitura. Gestão via seed/migration.
 */
@Injectable({ providedIn: 'root' })
export class ColunasKanbanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/colunas-kanban`;

  listar(apenasAtivas = true): Observable<ColunaKanbanResumo[]> {
    const params = new HttpParams().set('apenasAtivas', String(apenasAtivas));
    return this.http.get<ColunaKanbanResumo[]>(this.baseUrl, { params });
  }
}

export interface TipoProjetoCriarRequest {
  codigo: string;
  nome: string;
  clienteObrigatorio: boolean;
  ordem: number;
  usuarioInclusao: string;
}

export interface TipoProjetoAtualizarRequest {
  codigo?: string;
  nome?: string;
  clienteObrigatorio?: boolean;
  ordem?: number;
  ativo?: boolean;
  usuarioAlteracao: string;
}

@Injectable({ providedIn: 'root' })
export class TiposProjetoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/tipos-projeto`;

  listar(apenasAtivos = true): Observable<TipoProjetoResumo[]> {
    const params = new HttpParams().set('apenasAtivos', String(apenasAtivos));
    return this.http.get<TipoProjetoResumo[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<TipoProjetoResumo | null> {
    return this.http.get<TipoProjetoResumo | null>(`${this.baseUrl}/${id}`);
  }

  criar(req: TipoProjetoCriarRequest): Observable<TipoProjetoResumo> {
    return this.http.post<TipoProjetoResumo>(this.baseUrl, req);
  }

  atualizar(id: number, req: TipoProjetoAtualizarRequest): Observable<TipoProjetoResumo> {
    return this.http.put<TipoProjetoResumo>(`${this.baseUrl}/${id}`, req);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
