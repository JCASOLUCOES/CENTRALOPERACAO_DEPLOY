import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  PerfilUsuario,
  RefreshTokenResponse,
  TokenPayload,
  TokenResponse,
  Usuario
} from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authUserSubject = new BehaviorSubject<Usuario | null>(null);
  readonly currentUser$ = this.authUserSubject.asObservable();
  private readonly authInitializedSubject = new BehaviorSubject<boolean>(false);
  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  getOperadorLogado(): string {
    return this.authUserSubject.value?.id ?? 'sistema';
  }

  getOperadorLogadoCompleto(): { id: string; nome: string; perfil: PerfilUsuario } | null {
    const user = this.authUserSubject.value;
    if (!user) return null;
    return { id: user.id, nome: user.nome, perfil: user.perfil };
  }

  isAuthInitialized(): boolean {
    return this.authInitializedSubject.value;
  }

  private refreshTokenPromise: Promise<string | null> | null = null;
  private verificacaoPeriodicaId: ReturnType<typeof setInterval> | null = null;
  private readonly INTERVALO_VERIFICACAO = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly http: HttpClient) {
    if (isPlatformBrowser(this.platformId)) {
      this.inicializarAuth();
    }
  }

  private async inicializarAuth(): Promise<void> {
    if (this.isAuthenticated()) {
      this.authInitializedSubject.next(true);
      this.iniciarVerificacaoPeriodica();
      return;
    }

    try {
      await firstValueFrom(this.refreshTokenSingleFlight());
      this.iniciarVerificacaoPeriodica();
    } catch {
      // ignora - authInitialized será true mesmo sem login
    } finally {
      this.authInitializedSubject.next(true);
    }
  }

  // ===================== LOGIN =====================

  login(credentials: LoginRequest): Observable<Usuario> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => this.persistSession(response)),
      map(response => response.user)
    );
  }

  // ===================== REFRESH TOKEN =====================

  refreshToken(): Observable<RefreshTokenResponse> {
    // O refresh token vive no cookie HttpOnly "cc_refresh", enviado automaticamente.
    return this.http.post<RefreshTokenResponse>(`${this.baseUrl}/refresh`, {});
  }

  refreshTokenSingleFlight(): Observable<string | null> {
    if (!this.refreshTokenPromise) {
      const fluxo$ = this.refreshToken().pipe(
        tap(response => this.restaurarSessao(response)),
        map(response => response.accessToken),
        catchError(() => {
          this.logout(false);
          return of(null);
        })
      );

      this.refreshTokenPromise = firstValueFrom(fluxo$);
      this.refreshTokenPromise.then(() => {
        this.refreshTokenPromise = null;
      });
    }

    return from(this.refreshTokenPromise);
  }

  // ===================== SESSAO =====================

  logout(redirecionar: boolean = true): void {
    // Parar verificação periódica
    this.pararVerificacaoPeriodica();

    // Fire-and-forget: o cookie é revogado/apagado no servidor.
    this.http.post(`${this.baseUrl}/logout`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();

    this.tokenStorage.clear();
    this.authUserSubject.next(null);

    if (redirecionar) {
      this.authInitializedSubject.next(false);
      if (typeof window !== 'undefined') {
        // Armazenar flag para componente de login mostrar mensagem
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('sessaoExpirada', 'true');
        }
        this.router.navigate(['/login']);
      }
    }
  }

  getCurrentUser(): Usuario | null {
    return this.authUserSubject.value;
  }

  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  isAuthenticated(): boolean {
    const token = this.tokenStorage.getAccessToken();
    if (!token) {
      return false;
    }
    const payload = this.decodificarToken(token);
    if (!payload?.exp) {
      return false;
    }
    return payload.exp * 1000 > Date.now();
  }

  hasRole(perfil: string): boolean {
    const user = this.authUserSubject.value;
    if (!user) {
      return false;
    }
    return user.perfil === 'Administrador' || user.perfil === perfil || user.perfil === 'F';
  }

  // ===================== VERIFICACAO PERIODICA =====================

  private iniciarVerificacaoPeriodica(): void {
    if (typeof window === 'undefined') return;
    
    // Limpar intervalo anterior se existir
    if (this.verificacaoPeriodicaId) {
      clearInterval(this.verificacaoPeriodicaId);
    }
    
    this.verificacaoPeriodicaId = setInterval(() => {
      this.verificarSessao();
    }, this.INTERVALO_VERIFICACAO);
  }

  private verificarSessao(): void {
    if (!this.isAuthenticated()) {
      this.logout(true);
      return;
    }

    this.refreshTokenSingleFlight().subscribe({
      error: () => {
        this.logout(true);
      }
    });
  }

  pararVerificacaoPeriodica(): void {
    if (this.verificacaoPeriodicaId) {
      clearInterval(this.verificacaoPeriodicaId);
      this.verificacaoPeriodicaId = null;
    }
  }

  // ===================== PRIVADOS =====================

  /**
   * Restaura o estado oficial do usuário a partir da resposta do refresh.
   * O backend já devolve o objeto `user` em /auth/refresh; caso não venha,
   * reconstrói a partir das claims do próprio JWT emitido pela autenticação.
   * Essencial para sobreviver ao F5, quando o storage em memória é zerado.
   */
  private restaurarSessao(response: RefreshTokenResponse): void {
    this.tokenStorage.setAccessToken(response.accessToken);

    let usuario = response.user ?? null;

    if (!usuario) {
      const payload = this.decodificarToken(response.accessToken);
      if (payload?.sub && payload.name) {
        usuario = {
          id: payload.sub,
          nome: payload.name,
          email: payload.email ?? '',
          perfil: (payload.perfil as PerfilUsuario) ?? 'Usuario'
        };
      }
    }

    if (usuario) {
      this.tokenStorage.setUsuario(usuario);
      this.authUserSubject.next(usuario);
    }
  }

  private persistSession(response: TokenResponse): void {
    this.tokenStorage.setAccessToken(response.accessToken);
    this.tokenStorage.setUsuario(response.user);
    this.authUserSubject.next(response.user);
    this.iniciarVerificacaoPeriodica();
  }

  private decodificarToken(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json) as TokenPayload;
    } catch {
      return null;
    }
  }
}