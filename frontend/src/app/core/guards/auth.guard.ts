import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state): Observable<boolean | import('@angular/router').UrlTree> => {
  // Durante o prerender (SSR) não há sessão no navegador;
  // as rotas são geradas estaticamente e a proteção ocorre no client.
  if (typeof window === 'undefined') {
    return of(true);
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return of(true);
  }

  // Access token expirado/ausente → tenta refresh silencioso.
  // O refresh token está no cookie HttpOnly e é enviado automaticamente.
  return authService.refreshTokenSingleFlight().pipe(
    switchMap(novoToken => {
      if (novoToken) {
        return of(true);
      }
      return of(router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      }));
    })
  );
};