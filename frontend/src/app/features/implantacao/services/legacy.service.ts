import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ClienteLegadoResumo,
  ChamadoLegadoResumo,
  IndicacaoLegadoResumo,
  FuncionarioLegadoResumo
} from '../models/legacy.model';

@Injectable({ providedIn: 'root' })
export class LegacyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/legacy`;

  listarClientes(buscar?: string, take = 100): Observable<ClienteLegadoResumo[]> {
    let params = new HttpParams().set('take', String(take));
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<ClienteLegadoResumo[]>(`${this.baseUrl}/clientes`, { params });
  }

  obterCliente(id: number): Observable<ClienteLegadoResumo> {
    return this.http.get<ClienteLegadoResumo>(`${this.baseUrl}/clientes/${id}`);
  }

  listarChamados(clienteId?: number, buscar?: string, take = 100): Observable<ChamadoLegadoResumo[]> {
    let params = new HttpParams().set('take', String(take));
    if (clienteId != null) params = params.set('clienteId', String(clienteId));
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<ChamadoLegadoResumo[]>(`${this.baseUrl}/chamados`, { params });
  }

  listarIndicacoes(): Observable<IndicacaoLegadoResumo[]> {
    return this.http.get<IndicacaoLegadoResumo[]>(`${this.baseUrl}/indicacoes`);
  }

  listarFuncionarios(buscar?: string, take = 100): Observable<FuncionarioLegadoResumo[]> {
    let params = new HttpParams().set('take', String(take));
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<FuncionarioLegadoResumo[]>(`${this.baseUrl}/funcionarios`, { params });
  }
}
