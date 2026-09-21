import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjetosService } from '../../services/projetos.service';
import { ProjetoResumo, ProjetoFiltro, ProjetoEtapaResumo } from '../../models/projeto.model';
import { ProjetoCardComponent } from '../../components/projeto-card/projeto-card.component';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-implantacao-projetos',
  standalone: true,
  imports: [CommonModule, RouterLink, ProjetoCardComponent, PageHeaderComponent],
  styleUrl: './projetos.component.scss',
  template: `
    <div class="imp-page imp-page--3col">
      <app-page-header
        titulo="Projetos"
        descricao="Gerencie a lista de projetos, datas de entrega e atribuições da equipe."
        icone="bi-folder2-open">
        <div actions class="imp-header__actions">
          <button type="button" class="imp-btn imp-btn--ghost" (click)="toggleFiltros()" [attr.aria-expanded]="filtrosAbertos()">
            <i class="bi bi-funnel"></i> Filtros
          </button>
          <button type="button" class="imp-btn imp-btn--ghost" (click)="toggleResumo()" [attr.aria-expanded]="resumoAberto()">
            <i class="bi bi-bar-chart"></i> Resumo
          </button>
          <a [routerLink]="['novo']" class="imp-btn imp-btn--primary">
            <i class="bi bi-plus-lg"></i> Novo Projeto
          </a>
        </div>
      </app-page-header>

      <div class="imp-layout" [class.sem-filtros]="!filtrosAbertos()" [class.sem-resumo]="!resumoAberto()">
        <aside class="imp-side imp-side--filtros" [class.fechado]="!filtrosAbertos()" aria-label="Filtros">
          <div class="imp-side__head">
            <h2 class="imp-side__title"><i class="bi bi-funnel"></i> Filtros</h2>
            <button type="button" class="imp-side__close" (click)="toggleFiltros()" aria-label="Ocultar filtros">
              <i class="bi bi-chevron-left"></i>
            </button>
          </div>

          <div class="filtro-grupo">
            <label for="busca">Buscar</label>
            <input
              type="text"
              id="busca"
              class="imp-search"
              placeholder="Nome, código ou cliente..."
              [value]="buscar()"
              (input)="onBuscar($any($event.target).value)"
            />
          </div>

          <div class="filtro-grupo">
            <label for="status">Status</label>
            <select
              id="status"
              class="imp-form__select"
              [value]="status()"
              (change)="onStatus($any($event.target).value)">
              <option value="">Todos os status</option>
              <option value="Backlog">Backlog</option>
              <option value="AFazer">A Fazer</option>
              <option value="EmAndamento">Em Andamento</option>
              <option value="Homologacao">Homologação</option>
              <option value="Concluido">Concluído</option>
              <option value="Bloqueado">Bloqueado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div class="filtro-grupo">
            <label for="responsavel">Responsável</label>
            <select
              id="responsavel"
              class="imp-form__select"
              [value]="responsavelId()"
              (change)="onResponsavel($any($event.target).value)">
              <option value="">Todos</option>
              <option value="__MEUS__">Meus projetos</option>
              <option *ngFor="let o of operadores()" [value]="o.id">{{ o.nome }}</option>
            </select>
          </div>

          <div class="filtro-grupo">
            <label for="periodoDe">Vence de</label>
            <input
              type="date"
              id="periodoDe"
              class="imp-form__select"
              [value]="periodoDe()"
              (change)="onPeriodoDe($any($event.target).value)"
            />
          </div>

          <div class="filtro-grupo">
            <label for="periodoAte">Vence até</label>
            <input
              type="date"
              id="periodoAte"
              class="imp-form__select"
              [value]="periodoAte()"
              (change)="onPeriodoAte($any($event.target).value)"
            />
          </div>

          <div class="filtro-grupo">
            <label for="ordenacao">Ordenar</label>
            <select
              id="ordenacao"
              class="imp-form__select"
              [value]="ordenacao()"
              (change)="onOrdenacao($any($event.target).value)">
              <option value="recente">Mais Recentes</option>
              <option value="progresso">Maior Progresso</option>
              <option value="inicio">Data Início</option>
              <option value="prazo">Prazo (vence primeiro)</option>
              <option value="atrasados">Atrasados Primeiro</option>
            </select>
          </div>

          <button type="button" class="imp-btn imp-btn--ghost imp-btn--full" (click)="limparFiltros()">
            <i class="bi bi-x-lg"></i> Limpar filtros
          </button>
        </aside>

        <section class="imp-conteudo">
          <div *ngIf="loading()" class="imp-loading">Carregando projetos…</div>

          <div class="abas-grupo" role="tablist" aria-label="Filtrar por grupo">
            <button type="button" role="tab" class="aba-grupo" [class.aba-grupo--active]="abaGrupo() === 'todos'" [attr.aria-selected]="abaGrupo() === 'todos'" (click)="onAbaGrupo('todos')">Todos ({{ total() }})</button>
            <button type="button" role="tab" class="aba-grupo" [class.aba-grupo--active]="abaGrupo() === 'ativos'" [attr.aria-selected]="abaGrupo() === 'ativos'" (click)="onAbaGrupo('ativos')">Ativos ({{ ativos().length }})</button>
            <button type="button" role="tab" class="aba-grupo" [class.aba-grupo--active]="abaGrupo() === 'concluidos'" [attr.aria-selected]="abaGrupo() === 'concluidos'" (click)="onAbaGrupo('concluidos')">Concluídos ({{ concluidos().length }})</button>
            <button type="button" role="tab" class="aba-grupo" [class.aba-grupo--active]="abaGrupo() === 'atrasados'" [attr.aria-selected]="abaGrupo() === 'atrasados'" (click)="onAbaGrupo('atrasados')">Atrasados ({{ atrasados().length }})</button>
          </div>

          <div *ngIf="!loading() && !projetos().length" class="imp-empty">
            <i class="bi bi-folder-x"></i>
            <h3 class="imp-empty__title">Nenhum projeto encontrado</h3>
            <p class="imp-empty__hint">Ajuste os filtros ou crie um novo projeto.</p>
            <a [routerLink]="['novo']" class="imp-btn imp-btn--primary imp-empty__action">
              <i class="bi bi-plus-lg"></i> Criar projeto
            </a>
          </div>

          <ng-container *ngIf="!loading() && projetos().length">
            <section *ngIf="mostrarGrupoAtivos()" class="imp-grupo" aria-label="Projetos ativos">
              <button
                type="button"
                class="grupo-header grupo-header--ativos"
                (click)="toggleAtivos()"
                [attr.aria-expanded]="grupoAtivosAberto()"
                aria-controls="lista-ativos">
                <span class="grupo-header__info">
                  <i class="bi bi-circle-fill grupo-header__dot" aria-hidden="true"></i>
                  PROJETOS ATIVOS ({{ ativosFiltrados().length }})
                </span>
                <span class="grupo-header__toggle">
                  {{ grupoAtivosAberto() ? 'Colapsar' : 'Expandir' }}
                  <i class="bi" [ngClass]="grupoAtivosAberto() ? 'bi-chevron-down' : 'bi-chevron-right'" aria-hidden="true"></i>
                </span>
              </button>
              <div id="lista-ativos" *ngIf="grupoAtivosAberto()" class="imp-projetos-lista imp-projetos-lista--vertical">
                <app-projeto-card
                  *ngFor="let p of ativosFiltrados(); trackBy: trackByProjeto"
                  [projeto]="p.projeto"
                  [etapas]="p.etapas">
                </app-projeto-card>
                <div *ngIf="!ativosFiltrados().length" class="imp-grupo-empty">Nenhum projeto ativo com este filtro.</div>
              </div>
            </section>

            <section *ngIf="mostrarGrupoConcluidos()" class="imp-grupo" aria-label="Projetos concluídos">
              <button
                type="button"
                class="grupo-header grupo-header--concluidos"
                (click)="toggleConcluidos()"
                [attr.aria-expanded]="grupoConcluidosAberto()"
                aria-controls="lista-concluidos">
                <span class="grupo-header__info">
                  <i class="bi bi-check-circle-fill grupo-header__dot" aria-hidden="true"></i>
                  PROJETOS CONCLUÍDOS ({{ concluidosFiltrados().length }})
                </span>
                <span class="grupo-header__toggle">
                  {{ grupoConcluidosAberto() ? 'Colapsar' : 'Expandir' }}
                  <i class="bi" [ngClass]="grupoConcluidosAberto() ? 'bi-chevron-down' : 'bi-chevron-right'" aria-hidden="true"></i>
                </span>
              </button>
              <div id="lista-concluidos" *ngIf="grupoConcluidosAberto()" class="imp-projetos-lista imp-projetos-lista--vertical">
                <app-projeto-card
                  *ngFor="let p of concluidosFiltrados(); trackBy: trackByProjeto"
                  [projeto]="p.projeto"
                  [etapas]="p.etapas">
                </app-projeto-card>
                <div *ngIf="!concluidosFiltrados().length" class="imp-grupo-empty">Nenhum projeto concluído com este filtro.</div>
              </div>
            </section>
          </ng-container>
        </section>

        <aside class="imp-side imp-side--resumo" [class.fechado]="!resumoAberto()" aria-label="Resumo">
          <div class="imp-side__head">
            <h2 class="imp-side__title"><i class="bi bi-bar-chart"></i> Resumo</h2>
            <button type="button" class="imp-side__close" (click)="toggleResumo()" aria-label="Ocultar resumo">
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>

          <section class="stat-card" aria-label="Análise rápida">
            <h3 class="stat-title">Análise rápida</h3>
            <div class="stat-item"><span>Total</span><strong>{{ total() }}</strong></div>
            <div class="stat-item"><span>Ativos</span><strong>{{ ativos().length }}</strong></div>
            <div class="stat-item"><span>Concluídos</span><strong>{{ concluidos().length }}</strong></div>
            <div class="stat-item stat-item--alerta"><span>Atrasados</span><strong>{{ atrasados().length }}</strong></div>
          </section>

          <section class="stat-card" aria-label="Próximos vencimentos">
            <h3 class="stat-title">Próximos vencimentos</h3>
            <div *ngIf="!proximosVencimentos().length" class="stat-empty">Sem prazos ativos.</div>
            <div *ngFor="let v of proximosVencimentos()" class="stat-item stat-item--col">
              <span class="stat-data">{{ v.dataPrevisao | date:'dd/MM' }} · {{ v.codigo }}</span>
              <span class="stat-sub">{{ v.nome }} ({{ v.rotuloDias }})</span>
            </div>
          </section>

          <section class="stat-card" aria-label="Etapas atuais">
            <h3 class="stat-title">Etapas atuais</h3>
            <div *ngIf="!etapasAtuais().length" class="stat-empty">Sem etapas ativas.</div>
            <div *ngFor="let e of etapasAtuais()" class="stat-item"><span>{{ e.nome }}</span><strong>{{ e.total }}</strong></div>
          </section>

          <section class="stat-card" aria-label="Meus projetos">
            <h3 class="stat-title">Meus projetos</h3>
            <div class="stat-item"><span>Atribuídos a mim</span><strong>{{ meusProjetos() }}</strong></div>
            <button type="button" class="imp-btn imp-btn--ghost imp-btn--full" (click)="filtrarMeus()">
              <i class="bi bi-person-check"></i> Ver meus projetos
            </button>
          </section>
        </aside>
      </div>
    </div>
  `,
})
export class ProjetosComponent implements OnInit {
  private readonly projSvc = inject(ProjetosService);
  private readonly auth = inject(AuthService);

  projetos = signal<any[]>([]);
  loading = signal(true);
  status = signal('');
  buscar = signal('');
  ordenacao = signal<'recente' | 'progresso' | 'inicio' | 'prazo' | 'atrasados'>('recente');
  abaGrupo = signal<'todos' | 'ativos' | 'concluidos' | 'atrasados'>('todos');
  grupoAtivosAberto = signal(true);
  grupoConcluidosAberto = signal(true);
  filtrosAbertos = signal(true);
  resumoAberto = signal(true);
  operadores = signal<{ id: string; nome: string }[]>([]);
  responsavelId = signal('');
  periodoDe = signal('');
  periodoAte = signal('');

  total = computed(() => this.projetos().length);
  meuId = computed(() => this.auth.getOperadorLogado());

  ngOnInit(): void {
    this.carregar();
    this.projSvc.listarOperadores().subscribe({
      next: (ops) => this.operadores.set((ops ?? []).map(o => ({ id: o.id, nome: o.nome }))),
      error: () => this.operadores.set([])
    });
  }

  onStatus(v: string): void { this.status.set(v); this.carregar(); }
  onBuscar(v: string): void { this.buscar.set(v); this.carregar(); }
  onOrdenacao(v: string): void {
    this.ordenacao.set(v as any);
  }
  onResponsavel(v: string): void {
    this.responsavelId.set(v === '__MEUS__' ? this.meuId() : v);
    this.carregar();
  }
  onPeriodoDe(v: string): void { this.periodoDe.set(v); }
  onPeriodoAte(v: string): void { this.periodoAte.set(v); }
  onAbaGrupo(v: 'todos' | 'ativos' | 'concluidos' | 'atrasados'): void { this.abaGrupo.set(v); }
  toggleAtivos(): void { this.grupoAtivosAberto.update(v => !v); }
  toggleConcluidos(): void { this.grupoConcluidosAberto.update(v => !v); }
  toggleFiltros(): void { this.filtrosAbertos.update(v => !v); }
  toggleResumo(): void { this.resumoAberto.update(v => !v); }

  filtrarMeus(): void {
    this.responsavelId.set(this.meuId());
    this.carregar();
  }

  limparFiltros(): void {
    this.status.set('');
    this.buscar.set('');
    this.responsavelId.set('');
    this.periodoDe.set('');
    this.periodoAte.set('');
    this.abaGrupo.set('todos');
    this.carregar();
  }

  ehConcluido(p: any): boolean { return p?.projeto?.status === 'Concluido'; }
  temAtraso(p: any): boolean {
    return (p?.etapas ?? []).some((e: any) => (e?.atrasoDias ?? 0) > 0);
  }
  trackByProjeto(_index: number, item: any): number { return item?.projeto?.id ?? _index; }

  diasParaVencer(iso: string): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alvo = new Date(iso);
    alvo.setHours(0, 0, 0, 0);
    return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  }

  rotuloDias(dias: number): string {
    if (dias < 0) return `VENCIDO +${Math.abs(dias)}d`;
    if (dias === 0) return 'vence hoje';
    return `${dias}d`;
  }

  etapaAtual(p: any): string {
    const etapas = [...(p?.etapas ?? [])].sort((a: any, b: any) => (a?.ordem ?? 0) - (b?.ordem ?? 0));
    return etapas.find((e: any) => e?.estado !== 'Concluida')?.nome ?? '—';
  }

  carregar(): void {
    this.loading.set(true);
    const filtro: any = {};
    if (this.status()) filtro.status = this.status();
    if (this.buscar()) filtro.buscar = this.buscar();
    if (this.responsavelId()) filtro.responsavelId = this.responsavelId();

    this.projSvc.listarComEtapas(filtro).subscribe({
      next: (p) => {
        this.projetos.set(p);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  projetosOrdenados = computed(() => {
    const de = this.periodoDe() ? new Date(this.periodoDe() + 'T00:00:00').getTime() : NaN;
    const ate = this.periodoAte() ? new Date(this.periodoAte() + 'T23:59:59').getTime() : NaN;
    const lista = [...this.projetos()].filter(p => {
      if (!Number.isNaN(de) || !Number.isNaN(ate)) {
        const dp = p.projeto?.dataPrevisao ? new Date(p.projeto.dataPrevisao).getTime() : NaN;
        if (Number.isNaN(dp)) return false;
        if (!Number.isNaN(de) && dp < de) return false;
        if (!Number.isNaN(ate) && dp > ate) return false;
      }
      return true;
    });
    switch (this.ordenacao()) {
      case 'progresso':
        return lista.sort((a, b) => (b.projeto?.progresso ?? 0) - (a.projeto?.progresso ?? 0));
      case 'inicio':
        return lista.sort((a, b) => new Date(a.projeto?.dataInclusao ?? 0).getTime() - new Date(b.projeto?.dataInclusao ?? 0).getTime());
      case 'prazo':
        return lista.sort((a, b) => {
          const da = a.projeto?.dataPrevisao ? new Date(a.projeto.dataPrevisao).getTime() : Infinity;
          const db = b.projeto?.dataPrevisao ? new Date(b.projeto.dataPrevisao).getTime() : Infinity;
          return da - db;
        });
      case 'atrasados':
        return lista.sort((a, b) => {
          const atA = a.etapas?.some((e: any) => e.atrasoDias && e.atrasoDias > 0) ? 0 : 1;
          const atB = b.etapas?.some((e: any) => e.atrasoDias && e.atrasoDias > 0) ? 0 : 1;
          return atA - atB;
        });
      default:
        return lista;
    }
  });

  ativos = computed(() => this.projetosOrdenados().filter(p => !this.ehConcluido(p)));
  concluidos = computed(() => this.projetosOrdenados().filter(p => this.ehConcluido(p)));
  atrasados = computed(() => this.ativos().filter(p => this.temAtraso(p)));

  ativosFiltrados = computed(() => {
    if (this.abaGrupo() === 'atrasados') return this.atrasados();
    return this.ativos();
  });
  concluidosFiltrados = computed(() => this.concluidos());

  mostrarGrupoAtivos = computed(() => this.abaGrupo() !== 'concluidos');
  mostrarGrupoConcluidos = computed(() => this.abaGrupo() === 'todos' || this.abaGrupo() === 'concluidos');

  proximosVencimentos = computed(() =>
    this.ativos()
      .filter(p => p.projeto?.dataPrevisao)
      .sort((a, b) => new Date(a.projeto.dataPrevisao).getTime() - new Date(b.projeto.dataPrevisao).getTime())
      .slice(0, 5)
      .map(p => {
        const dias = this.diasParaVencer(p.projeto.dataPrevisao);
        return {
          id: p.projeto.id,
          codigo: p.projeto.codigo,
          nome: p.projeto.nome,
          dataPrevisao: p.projeto.dataPrevisao,
          rotuloDias: this.rotuloDias(dias)
        };
      })
  );

  etapasAtuais = computed(() => {
    const mapa = new Map<string, number>();
    for (const p of this.ativos()) {
      const nome = this.etapaAtual(p);
      mapa.set(nome, (mapa.get(nome) ?? 0) + 1);
    }
    return [...mapa.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  });

  meusProjetos = computed(() =>
    this.projetos().filter(p => p.projeto?.responsavelId && p.projeto.responsavelId === this.meuId()).length
  );
}
