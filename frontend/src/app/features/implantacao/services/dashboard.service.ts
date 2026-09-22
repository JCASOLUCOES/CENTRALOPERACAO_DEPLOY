import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardGeral } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/dashboard`;

  obter(projetoId?: number | null): Observable<DashboardGeral> {
    let params = new HttpParams();
    if (projetoId != null) params = params.set('projetoId', String(projetoId));
    return this.http.get<DashboardGeral>(this.baseUrl, { params });
  }
}
