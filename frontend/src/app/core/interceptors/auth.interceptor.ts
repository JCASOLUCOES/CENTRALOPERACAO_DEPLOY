import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

function adicionarToken(
  request: HttpRequest<unknown>,
  token: string | null
): HttpRequest<unknown> {
  if (!token) {
    return request;
  }
  return request.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Habilita o envio/recebimento de cookies nas requisições cross-origin
 * (front na porta 1010, backend na 1009). Necessário para o refresh token
 * armazenado em cookie HttpOnly.
 */
function comCredenciais(request: HttpRequest<unknown>): HttpRequest<unknown> {
  return request.clone({ withCredentials: true });
}

/**
 * Interceptor de autenticação:
 * 1. Anexa o token Bearer em todas as requisições (exceto /auth/).
 * 2. Ao receber 401, tenta renovar a sessão via refresh token (single-flight)
 *    e repete a requisição original. Se a renovação falhar, a sessão é encerrada.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const reqComCredenciais = comCredenciais(req);

  // Não anexa token nas próprias chamadas de autenticação.
  if (req.url.includes('/auth/')) {
    return next(reqComCredenciais);
  }

  return next(adicionarToken(reqComCredenciais, authService.getAccessToken())).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      return authService.refreshTokenSingleFlight().pipe(
        switchMap(novoToken => {
          if (!novoToken) {
            return throwError(() => error);
          }
          return next(adicionarToken(reqComCredenciais, novoToken));
        })
      );
    })
  );
};