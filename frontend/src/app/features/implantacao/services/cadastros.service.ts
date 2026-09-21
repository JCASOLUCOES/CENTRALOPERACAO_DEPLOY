import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ColunaKanbanResumo } from '../models/cadastros.model';

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
