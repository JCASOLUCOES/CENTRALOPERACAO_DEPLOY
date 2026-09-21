import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type PapelUsuario = 'gestor' | 'operador';

/**
 * Papel do usuário derivado da sessão (backend mapeia TBOPERADOR.SE_ADMIN
 * para perfil 'Administrador'). Sem escolha manual: se_admin = '1' (ou
 * PerfilId A) → ADMIN e GESTOR; caso contrário, operador normal.
 * Nada é ocultado por papel — só o destaque "comece aqui" da sidebar.
 */
@Injectable({ providedIn: 'root' })
export class PapelUsuarioService {
  private readonly auth = inject(AuthService);

  papel(): PapelUsuario {
    return this.auth.getCurrentUser()?.perfil === 'Administrador' ? 'gestor' : 'operador';
  }

  rotuloPapel(): string {
    return this.papel() === 'gestor' ? 'Gestor' : 'Operador';
  }

  dicaPapel(): string {
    return this.papel() === 'gestor'
      ? 'Você é gestor/admin (tboperador.se_admin). Acompanhe a equipe na seção Implantação (Visão geral, Kanban e Tarefas).'
      : 'Use a seção SUPORTE para suas tarefas diárias (Atendimento e Conhecimento Rápido).';
  }
}
