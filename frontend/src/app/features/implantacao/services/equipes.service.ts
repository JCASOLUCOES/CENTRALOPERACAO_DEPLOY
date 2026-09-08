import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  EquipeResumo,
  EquipeDetalhe,
  EquipeCriarRequest,
  EquipeAtualizarRequest,
  MembroAdicionarRequest
} from '../models/equipe-tipo-etapa-coluna.model';

@Injectable({ providedIn: 'root' })
export class EquipesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/equipes`;

  listar(apenasAtivas = true): Observable<EquipeResumo[]> {
    const params = new HttpParams().set('apenasAtivas', String(apenasAtivas));
    return this.http.get<EquipeResumo[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<EquipeDetalhe> {
    return this.http.get<EquipeDetalhe>(`${this.baseUrl}/${id}`);
  }

  criar(req: EquipeCriarRequest): Observable<EquipeDetalhe> {
    return this.http.post<EquipeDetalhe>(this.baseUrl, req);
  }

  atualizar(id: number, req: EquipeAtualizarRequest): Observable<EquipeDetalhe> {
    return this.http.put<EquipeDetalhe>(`${this.baseUrl}/${id}`, req);
  }

  adicionarMembro(equipeId: number, req: MembroAdicionarRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${equipeId}/membros`, req);
  }

  removerMembro(equipeId: number, membroId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${equipeId}/membros/${membroId}`);
  }
}
