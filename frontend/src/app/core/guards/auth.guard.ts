import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, of, switchMap, filter, take, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state): Observable<boolean | import('@angular/router').UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // SSR: permite renderização estática; a proteção real ocorre no client
  if (!isPlatformBrowser(platformId)) {
    return of(true);
  }

  return authService.authInitialized$.pipe(
    filter(initialized => initialized),
    take(1),
    switchMap(() => {
      if (authService.isAuthenticated()) {
        return of(true);
      }

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
    })
  );
};