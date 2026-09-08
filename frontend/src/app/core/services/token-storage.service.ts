import { Injectable } from '@angular/core';
import { Usuario } from '../models/auth.model';

/**
 * Armazenamento de acesso SOMENTE em memória.
 *
 * - Access token e usuário ficam apenas na memória da aplicação
 *   (perdidos ao recarregar a página).
 * - O refresh token NUNCA fica no navegador: vive em cookie HttpOnly
 *   no backend, que também controla a persistência ("Lembrar meu acesso"
 *   = cookie com validade de 4h; caso contrário cookie de sessão).
 */
@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private accessToken: string | null = null;
  private usuario: Usuario | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getUsuario(): Usuario | null {
    return this.usuario;
  }

  setUsuario(usuario: Usuario | null): void {
    this.usuario = usuario;
  }

  clear(): void {
    this.accessToken = null;
    this.usuario = null;
  }
}