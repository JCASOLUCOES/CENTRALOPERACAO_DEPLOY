import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbDropdown, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subject, takeUntil, map } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { BuscaService } from '@core/services/busca.service';
import { BuscaIndexService, ResultadoBusca } from '@core/services/busca-index.service';
import { Usuario } from '@core/models/auth.model';
import { APP_VERSION } from '@shared/meta/app-version';
import { APP_CONFIG } from '@shared/config/app-config';
import { HEADER_NAV_ITEMS } from '@shared/config/header-nav.config';

interface HeaderNavItem {
  label: string;
  route: string;
  icone: string;
  exact?: boolean;
  children?: HeaderNavItem[];
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbDropdownModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  @ViewChild('searchInput', { static: false }) searchInput?: ElementRef<HTMLInputElement>;

  readonly currentUser$: Observable<Usuario | null>;
  currentUser: Usuario | null = null;
  readonly authInitialized$: Observable<boolean>;
  readonly versao = APP_VERSION;
  readonly appConfig = APP_CONFIG;
  readonly navItems = HEADER_NAV_ITEMS;

  private readonly destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private buscaCloseTimer: ReturnType<typeof setTimeout> | null = null;

  isDark = false;

  termoBusca = '';
  buscaAberta = false;
  resultadosBusca: ResultadoBusca[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly buscaService: BuscaService,
    private readonly indiceBusca: BuscaIndexService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.authInitialized$ = this.authService.authInitialized$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.applySavedTheme();
    }

    // Assinar currentUser$ e garantir que o template sempre reflita o valor atual
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.cdr.markForCheck();
      });

    // Ouvir mudanças no serviço de busca compartilhado
    this.buscaService.buscaAberta$
      .pipe(takeUntil(this.destroy$))
      .subscribe(aberta => {
        this.buscaAberta = aberta;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.buscaCloseTimer) {
      clearTimeout(this.buscaCloseTimer);
    }
  }

  getIniciais(user: Usuario): string {
    const nomes = user.nome.trim().split(/\s+/);
    const primeira = nomes[0]?.charAt(0) ?? '';
    const ultima = nomes.length > 1 ? nomes[nomes.length - 1].charAt(0) : '';
    return (primeira + ultima).toUpperCase();
  }

  formatNome(nome: string): string {
    return nome
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  toggleTheme(): void {
    if (!this.isBrowser) return;

    this.isDark = !this.isDark;
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
  }

  logout(): void {
    this.authService.logout();
  }

  abrirBusca(): void {
    this.buscaService.abrirBusca();
    this.resultadosBusca = this.indiceBusca.buscar(this.termoBusca);
    if (this.buscaCloseTimer) {
      clearTimeout(this.buscaCloseTimer);
      this.buscaCloseTimer = null;
    }
    if (this.isBrowser) {
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
    }
    this.cdr.markForCheck();
  }

  onBuscaInput(): void {
    this.buscaService.abrirBusca();
    this.resultadosBusca = this.indiceBusca.buscar(this.termoBusca);
    this.cdr.markForCheck();
  }

  onBuscaBlur(): void {
    if (this.buscaCloseTimer) {
      clearTimeout(this.buscaCloseTimer);
    }
    this.buscaCloseTimer = setTimeout(() => this.fecharBusca(), 160);
  }

  fecharBusca(): void {
    this.buscaService.fecharBusca();
    if (this.buscaCloseTimer) {
      clearTimeout(this.buscaCloseTimer);
      this.buscaCloseTimer = null;
    }
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K')) {
      event.preventDefault();
      this.abrirBusca();
    }
  }

  private applySavedTheme(): void {
    const savedTheme = localStorage.getItem('theme') ?? 'light';
    this.isDark = savedTheme === 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  @ViewChild('userDropdownEl') userDropdownElement?: ElementRef<HTMLElement>;
  @ViewChild('userDropdown') userDropdown?: NgbDropdown;

  isOpen = false;

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const target = event.target as Node;
    if (this.userDropdownElement && !this.userDropdownElement.nativeElement.contains(target)) {
      this.closeUserMenu();
    }
  }

  closeUserMenu(): void {
    this.isOpen = false;
    this.userDropdown?.close();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
