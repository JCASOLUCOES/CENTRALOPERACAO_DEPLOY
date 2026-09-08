import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TarefaResumo,
  TarefaDetalhe,
  TarefaCriarRequest,
  TarefaAtualizarRequest,
  TarefaMudarColunaRequest,
  ComentarioCriarRequest,
  TarefaFiltro
} from '../models/tarefa.model';

@Injectable({ providedIn: 'root' })
export class TarefasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/tarefas`;

  listar(filtro: TarefaFiltro): Observable<TarefaResumo[]> {
    let params = new HttpParams();
    if (filtro.projetoId != null) params = params.set('projetoId', String(filtro.projetoId));
    if (filtro.equipe) params = params.set('equipe', filtro.equipe);
    if (filtro.responsavelId) params = params.set('responsavelId', filtro.responsavelId);
    if (filtro.status) params = params.set('status', filtro.status);
    if (filtro.prioridade != null) params = params.set('prioridade', String(filtro.prioridade));
    if (filtro.buscar) params = params.set('buscar', filtro.buscar);
    if (filtro.apenasAtrasadas) params = params.set('apenasAtrasadas', 'true');
    if (filtro.apenasEmAndamento) params = params.set('apenasEmAndamento', 'true');
    if (filtro.apenasConcluidas) params = params.set('apenasConcluidas', 'true');
    return this.http.get<TarefaResumo[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<TarefaDetalhe> {
    return this.http.get<TarefaDetalhe>(`${this.baseUrl}/${id}`);
  }

  criar(req: TarefaCriarRequest): Observable<TarefaDetalhe> {
    return this.http.post<TarefaDetalhe>(this.baseUrl, req);
  }

  atualizar(id: number, req: TarefaAtualizarRequest): Observable<TarefaDetalhe> {
    return this.http.put<TarefaDetalhe>(`${this.baseUrl}/${id}`, req);
  }

  mudarColuna(id: number, req: TarefaMudarColunaRequest): Observable<TarefaDetalhe> {
    return this.http.patch<TarefaDetalhe>(`${this.baseUrl}/${id}/coluna`, req);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  adicionarComentario(tarefaId: number, req: ComentarioCriarRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${tarefaId}/comentarios`, req);
  }
}
