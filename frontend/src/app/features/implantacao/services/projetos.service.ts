import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ProjetoResumo,
  ProjetoDetalhe,
  ProjetoCriarRequest,
  ProjetoAtualizarRequest,
  ProjetoMudarStatusRequest,
  ProjetoFiltro
} from '../models/projeto.model';

@Injectable({ providedIn: 'root' })
export class ProjetosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/projetos`;

  listar(filtro: ProjetoFiltro): Observable<ProjetoResumo[]> {
    let params = new HttpParams();
    if (filtro.equipe) params = params.set('equipe', filtro.equipe);
    if (filtro.tipo) params = params.set('tipo', filtro.tipo);
    if (filtro.status) params = params.set('status', filtro.status);
    if (filtro.clienteId != null) params = params.set('clienteId', String(filtro.clienteId));
    if (filtro.responsavelId) params = params.set('responsavelId', filtro.responsavelId);
    if (filtro.buscar) params = params.set('buscar', filtro.buscar);
    return this.http.get<ProjetoResumo[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<ProjetoDetalhe> {
    return this.http.get<ProjetoDetalhe>(`${this.baseUrl}/${id}`);
  }

  proximoCodigo(equipeId: number): Observable<string> {
    const params = new HttpParams().set('equipeId', String(equipeId));
    return this.http.get<{ codigo: string }>(`${this.baseUrl}/proximo-codigo`, { params })
      .pipe(map(r => r.codigo));
  }

  criar(req: ProjetoCriarRequest): Observable<ProjetoDetalhe> {
    return this.http.post<ProjetoDetalhe>(this.baseUrl, req);
  }

  atualizar(id: number, req: ProjetoAtualizarRequest): Observable<ProjetoDetalhe> {
    return this.http.put<ProjetoDetalhe>(`${this.baseUrl}/${id}`, req);
  }

  mudarStatus(id: number, req: ProjetoMudarStatusRequest): Observable<ProjetoDetalhe> {
    return this.http.patch<ProjetoDetalhe>(`${this.baseUrl}/${id}/status`, req);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

import { map } from 'rxjs/operators';
