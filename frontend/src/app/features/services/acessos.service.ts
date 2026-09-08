import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EmpresaResumo {
  id: number;
  nomeEmpresa: string;
}

export interface EmpresaDetalhe {
  id: number;
  nomeEmpresa: string;
  tsAcesso: string;
  tsEndereco: string;
  tsUsuarioSenha: string;
  bancoNome: string;
  bancoIP: string;
  bancoUsuarioSenha: string;
  vpn: string;
  vpnNome: string;
  vpnGateway: string;
  vpnUsuarioSenha: string;
  versaoCob: string;
  acessoConfigActyonCob: string;
  acessoActyonWeb: string;
  anyDesk: string;
  observacoes: string;
}

export interface PasswordValidationResponse {
  valid: boolean;
  message: string;
  validatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AcessosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/acessos`;

  listarEmpresas(): Observable<EmpresaResumo[]> {
    return this.http.get<EmpresaResumo[]>(this.baseUrl);
  }

  validarSenha(usuario: string, senha: string): Observable<PasswordValidationResponse> {
    return this.http.post<PasswordValidationResponse>(`${this.baseUrl}/validar-senha`, { usuario, senha });
  }

  obterDetalhe(empresaId: number, senha: string): Observable<EmpresaDetalhe> {
    return this.http.post<EmpresaDetalhe>(`${this.baseUrl}/visualizar?empresaId=${empresaId}`, { senha });
  }
}