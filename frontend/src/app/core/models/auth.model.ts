export type PerfilUsuario = 'Usuario' | 'Editor' | 'Administrador' | 'Suporte';

export interface LoginRequest {
  usuario: string;
  senha: string;
  lembrarAcesso?: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiraEmSegundos: number;
  user: Usuario;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiraEmSegundos: number;
  user?: Usuario;
}

export interface TokenPayload {
  sub?: string;
  name?: string;
  email?: string;
  perfil?: string;
  exp?: number;
  iat?: number;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}
