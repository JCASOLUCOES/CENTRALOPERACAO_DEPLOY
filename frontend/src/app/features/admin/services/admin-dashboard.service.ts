import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminAlertaResumo {
  tipo: string;
  descricao: string;
  quantidade: number;
}

export interface AdminResponsavelResumo {
  operadorId: string;
  nome: string;
  count: number;
}

export interface AdminFuncaoResumo {
  funcaoId: number;
  nome: string;
  classificacao: string;
  total: number;
  emAndamento: number;
  atrasadas: number;
  concluidas: number;
  responsaveis: AdminResponsavelResumo[];
}

export interface AdminDashboardDto {
  totalTarefas: number;
  emAndamento: number;
  atrasadas: number;
  concluidas: number;
  funcoes: AdminFuncaoResumo[];
  alertas: AdminAlertaResumo[];
  atualizadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/dashboard`;

  obter(funcaoId?: number, diasRetro?: number): Observable<AdminDashboardDto> {
    const params = new URLSearchParams();
    if (funcaoId) params.set('funcaoId', String(funcaoId));
    if (diasRetro) params.set('diasRetro', String(diasRetro));
    const qs = params.toString();
    return this.http.get<AdminDashboardDto>(qs ? `${this.baseUrl}?${qs}` : this.baseUrl);
  }
}