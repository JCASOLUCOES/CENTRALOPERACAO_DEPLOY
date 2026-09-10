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
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { BuscaService } from '@core/services/busca.service';
import { Usuario } from '@core/models/auth.model';
import { APP_VERSION } from '@shared/meta/app-version';

interface HeaderNavItem {
  label: string;
  route: string;
  icone: string;
  exact?: boolean;
}

interface BreadcrumbItem {
  label: string;
  route?: string;
}

interface ResultadoBusca {
  titulo: string;
  tipo: string;
  rota: string;
  icone: string;
}

const BREADCRUMB_LABELS: Record<string, string> = {
  '/': 'Início',
  '/stack': 'Stack',
  '/fraseologia': 'Fluxo Atendimento e Fraseologias',
  '/ferramentas': 'Ferramentas',
  '/ferramentas/acessos': 'Acessos',
  '/ferramentas/faq': 'FAQ',
  '/ferramentas/detalhe': 'Detalhe da Ferramenta',
  '/cursos': 'Cursos',
  '/cursos/detalhe': 'Detalhe do Curso',
  '/modelo-chamados': 'Modelos de Chamados',
  '/trilhas/resolver': 'Como resolver esse problema?',
  '/trilhas/sql': 'Dicas de SQL',
  '/trilhas/rede': 'Dicas de Rede',
  '/trilhas/infra': 'Dicas de Infra',
  '/visao-adm': 'Visão ADM',
  '/visao-adm/detalhe': 'Detalhe do Procedimento',
  '/empresa': 'Empresa',
  '/empresa/onboarding': 'Onboarding Corporativo',
  '/empresa/onboarding/capitulo': 'Capítulo',
  '/empresa/onboarding/concluido': 'Concluído',
  '/politica': 'Política Interna',
  '/suporte': 'Suporte',
  '/database': 'Banco de Dados',
  '/database/visao-geral': 'Visão Geral',
  '/database/explorador': 'Explorador',
  '/database/relacionamentos': 'Relacionamentos',
  '/database/diagrama': 'Diagrama',
  '/database/consultas': 'Consultas',
  '/database/diferencas': 'Diferenças',
  '/database/configuracao': 'Configuração'
};

const RESULTADOS_MOCK: ResultadoBusca[] = [
  { titulo: 'Como criar um chamado de cobrança?', tipo: 'FAQ', rota: '/ferramentas/faq', icone: 'bi-question-circle' },
  { titulo: 'Ferramentas de acesso e rotina', tipo: 'Ferramentas', rota: '/ferramentas', icone: 'bi-tools' },
  { titulo: 'Acessos e senhas de sistemas', tipo: 'Acessos', rota: '/ferramentas/acessos', icone: 'bi-building-lock' },
  { titulo: 'Fraseologias de atendimento', tipo: 'Fluxo', rota: '/fraseologia', icone: 'bi-diagram-3' },
  { titulo: 'Modelo de chamado de atendimento', tipo: 'Modelos', rota: '/modelo-chamados', icone: 'bi-file-earmark-text' },
  { titulo: 'Trilha: Como resolver esse problema?', tipo: 'Trilhas', rota: '/trilhas/resolver', icone: 'bi-compass' },
  { titulo: 'Dicas de SQL', tipo: 'Trilhas', rota: '/trilhas/sql', icone: 'bi-code-slash' },
  { titulo: 'Curso de ativação de serviços', tipo: 'Cursos', rota: '/cursos', icone: 'bi-mortarboard' },
  { titulo: 'Stack de tecnologias da JCA', tipo: 'Stack', rota: '/stack', icone: 'bi-stack' },
  { titulo: 'Procedimentos administrativos (Visão ADM)', tipo: 'Visão ADM', rota: '/visao-adm', icone: 'bi-clipboard-data' }
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, NgbDropdownModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  @ViewChild('searchInput', { static: false }) searchInput?: ElementRef<HTMLInputElement>;

  readonly currentUser$: Observable<Usuario | null>;
  currentUser: Usuario | null = null;
  readonly versao = APP_VERSION;

  private readonly destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private buscaCloseTimer: ReturnType<typeof setTimeout> | null = null;

  isDark = false;

  navItems: HeaderNavItem[] = [
    { label: 'Início', route: '/', icone: 'bi-house-fill', exact: true },
    { label: 'Fluxo Atendimento e Fraseologias', route: '/fraseologia', icone: 'bi-diagram-3-fill' },
    { label: 'Ferramentas', route: '/ferramentas', icone: 'bi-tools' },
    { label: 'Acessos', route: '/ferramentas/acessos', icone: 'bi-building' },
    { label: 'Cursos', route: '/cursos', icone: 'bi-mortarboard-fill' }
  ];

  breadcrumb: BreadcrumbItem[] = [{ label: 'Início', route: '/' }];

  termoBusca = '';
  buscaAberta = false;
  resultadosBusca: ResultadoBusca[] = RESULTADOS_MOCK;

  constructor(
    private readonly authService: AuthService,
    private readonly buscaService: BuscaService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.applySavedTheme();
    }
    this.montarBreadcrumb(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        this.montarBreadcrumb(nav.urlAfterRedirects || nav.url);
        this.cdr.markForCheck();
      });

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
    this.buscaService['buscaAbertaSubject'].next(true);
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
    this.buscaService['buscaAbertaSubject'].next(true);
    const termo = this.termoBusca.trim().toLowerCase();
    this.resultadosBusca = termo
      ? RESULTADOS_MOCK.filter(
          (r) => r.titulo.toLowerCase().includes(termo) || r.tipo.toLowerCase().includes(termo)
        )
      : RESULTADOS_MOCK;
    this.cdr.markForCheck();
  }

  onBuscaBlur(): void {
    if (this.buscaCloseTimer) {
      clearTimeout(this.buscaCloseTimer);
    }
    this.buscaCloseTimer = setTimeout(() => this.fecharBusca(), 160);
  }

  fecharBusca(): void {
    this.buscaService['buscaAbertaSubject'].next(false);
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

  private montarBreadcrumb(url: string): void {
    const path = (url.split('?')[0] ?? '/').replace(/\/+$/, '') || '/';

    if (path === '/') {
      this.breadcrumb = [{ label: 'Início', route: '/' }];
      return;
    }

    // Handle dynamic database table route
    if (path.startsWith('/database/tabela/')) {
      const partes = path.split('/');
      if (partes.length >= 5) {
        const schema = partes[3];
        const tabela = partes[4];
        this.breadcrumb = [
          { label: 'Início', route: '/' },
          { label: 'Banco de Dados', route: '/database' },
          { label: `${schema}.${tabela}` }
        ];
        return;
      }
    }

    const chaves = Object.keys(BREADCRUMB_LABELS).filter((k) => k !== '/');
    const conhecidas = chaves
      .filter((k) => path === k || path.startsWith(k + '/'))
      .sort((a, b) => b.split('/').length - a.split('/').length);

    const maisProfunda = conhecidas[0];
    const itens: BreadcrumbItem[] = [{ label: 'Início', route: '/' }];

    if (maisProfunda) {
      let prefix = '';
      for (const segmento of maisProfunda.split('/').filter(Boolean)) {
        prefix = prefix ? `${prefix}/${segmento}` : `/${segmento}`;
        const label = BREADCRUMB_LABELS[prefix];
        if (label && label !== 'Início') {
          itens.push({ label, route: prefix });
        }
      }
    }

    this.breadcrumb = itens;
  }

  private applySavedTheme(): void {
    const savedTheme = localStorage.getItem('theme') ?? 'light';
    this.isDark = savedTheme === 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
