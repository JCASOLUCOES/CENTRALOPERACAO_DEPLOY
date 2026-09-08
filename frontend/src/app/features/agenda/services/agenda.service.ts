import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AgendaItem,
  AgendaDetalhe,
  AgendaCriarRequest,
  AgendaAtualizarRequest,
  AgendaFiltro
} from '../models/agenda.model';

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/agenda`;

  listar(filtro: AgendaFiltro, take = 200): Observable<AgendaItem[]> {
    let params = new HttpParams().set('take', String(take));
    if (filtro.inicio) params = params.set('inicio', filtro.inicio);
    if (filtro.fim) params = params.set('fim', filtro.fim);
    if (filtro.operadorId) params = params.set('operadorId', filtro.operadorId);
    if (filtro.visibilidade) params = params.set('visibilidade', filtro.visibilidade);
    if (filtro.projetoId != null) params = params.set('projetoId', String(filtro.projetoId));
    return this.http.get<AgendaItem[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<AgendaDetalhe> {
    return this.http.get<AgendaDetalhe>(`${this.baseUrl}/${id}`);
  }

  criar(req: AgendaCriarRequest): Observable<AgendaDetalhe> {
    return this.http.post<AgendaDetalhe>(this.baseUrl, req);
  }

  atualizar(id: number, req: AgendaAtualizarRequest): Observable<AgendaDetalhe> {
    return this.http.put<AgendaDetalhe>(`${this.baseUrl}/${id}`, req);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  urlIcs(operadorId: string): string {
    return `${this.baseUrl}/ics/${encodeURIComponent(operadorId)}`;
  }
}
