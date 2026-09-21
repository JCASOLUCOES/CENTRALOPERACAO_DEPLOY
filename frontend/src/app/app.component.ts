import { Component, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Subject, takeUntil, filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (!this.isBrowser) return;
    // Aplica a escala global de 80% (html.scaled) em todas as telas,
    // exceto /login que permanece em 100%.
    this.aplicarEscala(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(e => this.aplicarEscala(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private aplicarEscala(url: string): void {
    const ehLogin = url.split('?')[0].split('#')[0].replace(/\/+$/, '') === '/login';
    document.documentElement.classList.toggle('scaled', !ehLogin);
  }
}
