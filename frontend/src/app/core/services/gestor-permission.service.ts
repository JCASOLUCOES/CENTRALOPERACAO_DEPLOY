import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Serviço centralizado para validação de acesso ao Módulo Gestor.
 * Concentra a regra "quem acessa o Módulo Gestor" em um único ponto.
 */
@Injectable({ providedIn: 'root' })
export class GestorPermissionService {
  private readonly auth = inject(AuthService);

  /** Verifica se o usuário atual pode acessar o Módulo Gestor (apenas ADMIN). */
  podeAcessarGestor(): boolean {
    return this.auth.getCurrentUser()?.perfil === 'Administrador';
  }

  /** Verifica se pode acessar um painel específico do Módulo Gestor.
   *  Hoje todos ADMIN veem todos os painéis. Futuramente pode ser granular. */
  podeAcessarPainel(painel: 'ceo' | 'cto' | 'coo'): boolean {
    return this.podeAcessarGestor();
  }
}