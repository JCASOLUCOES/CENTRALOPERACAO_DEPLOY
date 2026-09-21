import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, state): Observable<boolean | import('@angular/router').UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (typeof window === 'undefined') {
    return of(true);
  }

  if (!authService.isAuthenticated()) {
    return authService.refreshTokenSingleFlight().pipe(
      switchMap(novoToken => {
        if (novoToken) {
          const perfil = authService.getCurrentUser()?.perfil;
          return of(perfil === 'Administrador' ? true : router.createUrlTree(['/']));
        }
        return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
      })
    );
  }

  const perfil = authService.getCurrentUser()?.perfil;
  if (perfil === 'Administrador') {
    return of(true);
  }

  return of(router.createUrlTree(['/']));
};