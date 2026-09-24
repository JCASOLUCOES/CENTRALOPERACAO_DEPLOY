import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

interface BreadcrumbItem {
  label: string;
  route?: string;
}

const BREADCRUMB_LABELS: Record<string, string> = {
  '/': 'Início',
  '/stack': 'Stack',
  '/fraseologia': 'Fraseologias',
  '/ferramentas': 'Ferramentas',
  '/ferramentas/acessos': 'Acessos',
  '/ferramentas/faq': 'FAQ',
  '/cursos': 'Cursos',
  '/modelo-chamados': 'Modelos de Chamados',
  '/trilhas/resolver': 'Como resolver esse problema?',
  '/trilhas/sql': 'Dicas de SQL',
  '/trilhas/rede': 'Dicas de Rede',
  '/trilhas/infra': 'Dicas de Infra',
  '/visao-adm': 'Visão ADM',
  '/agenda': 'Agenda',
  '/conhecimento': 'Conhecimento',
  '/implantacao': 'Implantação',
  '/implantacao/dashboard': 'Visão geral',
  '/implantacao/kanban': 'Kanban',
  '/implantacao/projetos': 'Projetos',
  '/implantacao/projetos/novo': 'Novo Projeto',
  '/implantacao/tarefas': 'Tarefas',
  '/implantacao/tarefas/novo': 'Nova Tarefa',
  '/admin': 'Administração',
  '/admin/cadastros': 'Cadastros',
  '/admin/cadastros/tipos-projeto': 'Tipos de Projeto',
  '/admin/cadastros/tipos-projeto/novo': 'Novo Tipo de Projeto',
  '/admin/kanban': 'Kanban',
  '/admin/tarefas': 'Tarefas',
  '/admin/projetos': 'Projetos',
  '/empresa': 'Empresa',
  '/empresa/onboarding': 'Onboarding Corporativo',
  '/politica': 'Política Interna',
  '/database': 'Banco de Dados',
  '/database/visao-geral': 'Visão Geral',
  '/database/explorador': 'Explorador',
  '/database/relacionamentos': 'Relacionamentos',
  '/database/consultas': 'Consultas',
  '/database/diferencas': 'Diferenças',
  '/database/configuracao': 'Configuração',
};

const BREADCRUMB_PATTERNS: { pattern: string; label: string }[] = [
  { pattern: '/ferramentas/detalhe/:id', label: 'Detalhe da Ferramenta' },
  { pattern: '/cursos/detalhe/:id', label: 'Detalhe do Curso' },
  { pattern: '/visao-adm/detalhe/:id', label: 'Detalhe do Procedimento' },
  { pattern: '/empresa/onboarding/capitulo/:id', label: 'Capítulo' },
  { pattern: '/implantacao/projetos/:id/editar', label: 'Editar Projeto' },
  { pattern: '/implantacao/projetos/:id', label: 'Detalhe do Projeto' },
  { pattern: '/implantacao/tarefas/:id/editar', label: 'Editar Tarefa' },
  { pattern: '/admin/cadastros/tipos-projeto/editar/:id', label: 'Editar Tipo de Projeto' },
  { pattern: '/database/tabela/:schema/:tabela', label: '' },
];

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="breadcrumb" aria-label="Trilha de navegação" *ngIf="items.length > 1">
      <ng-container *ngFor="let item of items; let last = last; let i = index; trackBy: trackByIndex">
        <a
          *ngIf="!last && item.route"
          class="breadcrumb-link"
          [routerLink]="item.route"
        >{{ item.label }}</a>
        <span *ngIf="!last && item.route" class="breadcrumb-sep" aria-hidden="true">›</span>
        <span *ngIf="last" class="breadcrumb-current" aria-current="page">{{ item.label }}</span>
        <span *ngIf="!last && !item.route" class="breadcrumb-sep" aria-hidden="true">›</span>
      </ng-container>
    </nav>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-muted);
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }

    .breadcrumb-link {
      color: var(--text-muted);
      text-decoration: none;
      white-space: nowrap;
      transition: color 0.2s ease;

      &:hover {
        color: var(--primary-color);
        text-decoration: underline;
      }
    }

    .breadcrumb-sep {
      color: var(--text-muted);
      flex-shrink: 0;
      opacity: 0.6;
    }

    .breadcrumb-current {
      color: var(--text-strong);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  items: BreadcrumbItem[] = [{ label: 'Início', route: '/' }];

  ngOnInit(): void {
    this.buildBreadcrumb(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        this.buildBreadcrumb(nav.urlAfterRedirects || nav.url);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildBreadcrumb(url: string): void {
    const path = (url.split('?')[0] ?? '/').replace(/\/+$/, '') || '/';

    if (path === '/') {
      this.items = [{ label: 'Início', route: '/' }];
      return;
    }

    const segments = path.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: 'Início', route: '/' }];

    let leafLabel: string | null = null;
    let leafRoute: string | undefined;

    if (BREADCRUMB_LABELS[path]) {
      leafLabel = BREADCRUMB_LABELS[path];
      leafRoute = path;
    } else {
      const pattern = this.matchPattern(path);
      if (pattern) {
        if (pattern.pattern === '/database/tabela/:schema/:tabela') {
          const schema = segments[segments.length - 2] ?? '';
          const tabela = segments[segments.length - 1] ?? '';
          leafLabel = `${schema}.${tabela}`;
        } else {
          leafLabel = pattern.label;
        }
        leafRoute = undefined;
      }
    }

    let prefix = '';
    for (let i = 0; i < segments.length - 1; i++) {
      prefix += '/' + segments[i];
      if (/^\d+$/.test(segments[i])) continue;

      const label = BREADCRUMB_LABELS[prefix] ?? this.humanize(segments[i]);
      if (label === 'Início') continue;
      items.push({ label, route: BREADCRUMB_LABELS[prefix] ? prefix : undefined });
    }

    if (!leafLabel) {
      const last = segments[segments.length - 1] ?? '';
      leafLabel = /^\d+$/.test(last) ? 'Detalhe' : this.humanize(last);
    }

    if (items.length > 1 && items[items.length - 1].label === leafLabel) {
      items.pop();
    }

    items.push({ label: leafLabel, route: leafRoute });
    this.items = items;
  }

  private matchPattern(path: string): { pattern: string; label: string } | null {
    const pathSegs = path.split('/').filter(Boolean);
    for (const entry of BREADCRUMB_PATTERNS) {
      const patSegs = entry.pattern.split('/').filter(Boolean);
      if (patSegs.length !== pathSegs.length) continue;
      let ok = true;
      for (let i = 0; i < patSegs.length; i++) {
        if (patSegs[i].startsWith(':')) continue;
        if (patSegs[i] !== pathSegs[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return entry;
    }
    return null;
  }

  private humanize(segmento: string): string {
    const texto = segmento.replace(/[-_]+/g, ' ').trim();
    if (!texto) return segmento;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
