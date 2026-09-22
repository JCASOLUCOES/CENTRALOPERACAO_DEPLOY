import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GestorMetricasResponse } from '../models/gestor.models';

@Injectable({ providedIn: 'root' })
export class GestorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/gestor`;

  obterMetricasCeo(funcaoId?: number, periodo = '30d'): Observable<GestorMetricasResponse> {
    return this.http.get<GestorMetricasResponse>(`${this.baseUrl}/ceo/metricas`, {
      params: this.buildParams(funcaoId, periodo)
    });
  }

  obterMetricasCto(funcaoId?: number, periodo = '30d'): Observable<GestorMetricasResponse> {
    return this.http.get<GestorMetricasResponse>(`${this.baseUrl}/cto/metricas`, {
      params: this.buildParams(funcaoId, periodo)
    });
  }

  obterMetricasCoo(funcaoId?: number, periodo = '30d'): Observable<GestorMetricasResponse> {
    return this.http.get<GestorMetricasResponse>(`${this.baseUrl}/coo/metricas`, {
      params: this.buildParams(funcaoId, periodo)
    });
  }

  obterMetricas(painel: 'ceo' | 'cto' | 'coo', funcaoId?: number, periodo = '30d'): Observable<GestorMetricasResponse> {
    return this.http.get<GestorMetricasResponse>(`${this.baseUrl}/metricas`, {
      params: this.buildParams(funcaoId, periodo).set('painel', painel)
    });
  }

  private buildParams(funcaoId: number | undefined, periodo: string): HttpParams {
    let params = new HttpParams().set('periodo', periodo);
    if (funcaoId != null) params = params.set('funcaoId', funcaoId);
    return params;
  }
}