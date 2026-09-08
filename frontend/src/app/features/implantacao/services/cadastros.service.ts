import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TipoProjetoResumo,
  TipoProjetoCriarRequest,
  TipoProjetoAtualizarRequest,
  EtapaResumo,
  EtapaCriarRequest,
  EtapaAtualizarRequest,
  ColunaKanbanResumo,
  ColunaKanbanCriarRequest,
  ColunaKanbanAtualizarRequest,
  ColunaKanbanReordenarRequest
} from '../models/equipe-tipo-etapa-coluna.model';

@Injectable({ providedIn: 'root' })
export class TiposProjetoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/tipos-projeto`;

  listar(equipeId?: number, apenasAtivos = true): Observable<TipoProjetoResumo[]> {
    let params = new HttpParams().set('apenasAtivos', String(apenasAtivos));
    if (equipeId != null) params = params.set('equipeId', String(equipeId));
    return this.http.get<TipoProjetoResumo[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<TipoProjetoResumo> {
    return this.http.get<TipoProjetoResumo>(`${this.baseUrl}/${id}`);
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

@Injectable({ providedIn: 'root' })
export class EtapasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/etapas`;

  listar(tipoProjetoId?: number): Observable<EtapaResumo[]> {
    let params = new HttpParams();
    if (tipoProjetoId != null) params = params.set('tipoProjetoId', String(tipoProjetoId));
    return this.http.get<EtapaResumo[]>(this.baseUrl, { params });
  }

  criar(req: EtapaCriarRequest): Observable<EtapaResumo> {
    return this.http.post<EtapaResumo>(this.baseUrl, req);
  }

  atualizar(id: number, req: EtapaAtualizarRequest): Observable<EtapaResumo> {
    return this.http.put<EtapaResumo>(`${this.baseUrl}/${id}`, req);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ColunasKanbanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/colunas-kanban`;

  listar(apenasAtivas = true): Observable<ColunaKanbanResumo[]> {
    const params = new HttpParams().set('apenasAtivas', String(apenasAtivas));
    return this.http.get<ColunaKanbanResumo[]>(this.baseUrl, { params });
  }

  criar(req: ColunaKanbanCriarRequest): Observable<ColunaKanbanResumo> {
    return this.http.post<ColunaKanbanResumo>(this.baseUrl, req);
  }

  atualizar(id: number, req: ColunaKanbanAtualizarRequest): Observable<ColunaKanbanResumo> {
    return this.http.put<ColunaKanbanResumo>(`${this.baseUrl}/${id}`, req);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  reordenar(idsEmOrdem: number[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reordenar`, { idsEmOrdem });
  }
}
