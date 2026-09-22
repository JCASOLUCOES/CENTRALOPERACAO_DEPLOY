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
  '/gestor/entrada': 'Módulo Gestor',
  '/gestor': 'Módulo Gestor',
  '/agenda': 'Agenda',
  '/chat': 'JOTA',
  '/implantacao': 'Implantação',
  '/implantacao/dashboard': 'Visão geral',
  '/implantacao/kanban': 'Kanban',
  '/implantacao/projetos': 'Projetos',
  '/implantacao/tarefas': 'Tarefas',
  '/admin': 'Administração',
  '/admin/dashboard': 'Gestão da Central',
  '/admin/cadastros': 'Cadastros',
  '/admin/cadastros/tipos-projeto': 'Tipos de Projeto',
  '/admin/cadastros/etapas': 'Etapas Globais',
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
  '/database/consultas': 'Consultas',
  '/database/diferencas': 'Diferenças',
  '/database/configuracao': 'Configuração',
};

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

    // Handle dynamic database table route
    if (path.startsWith('/database/tabela/')) {
      const partes = path.split('/');
      if (partes.length >= 5) {
        const schema = partes[3];
        const tabela = partes[4];
        this.items = [
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

    this.items = itens;
  }

  trackByIndex(index: number): number {
    return index;
  }
}