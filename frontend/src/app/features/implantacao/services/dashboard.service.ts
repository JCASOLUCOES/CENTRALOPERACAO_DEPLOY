import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardGeral } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/dashboard`;

  obter(equipe?: string): Observable<DashboardGeral> {
    let params = new HttpParams();
    if (equipe && equipe !== 'Todas') params = params.set('equipe', equipe);
    return this.http.get<DashboardGeral>(this.baseUrl, { params });
  }
}
