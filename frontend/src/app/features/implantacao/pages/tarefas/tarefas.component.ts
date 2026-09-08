import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TarefasService } from '../../services/tarefas.service';
import { TarefaResumo, TarefaFiltro } from '../../models/tarefa.model';
import { ProjetosService } from '../../services/projetos.service';
import { EquipesService } from '../../services/equipes.service';
import { EquipeResumo } from '../../models/equipe-tipo-etapa-coluna.model';

type Atalho = 'Todas' | 'Atrasadas' | 'EmAndamento' | 'Concluidas';

@Component({
  selector: 'app-implantacao-tarefas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrl: './tarefas.component.scss',
  template: `
    <section class="tar-shell">
      <header class="tar-header">
        <div>
          <p class="tar-eyebrow">EXECUÇÃO</p>
          <h1 class="tar-title">Tarefas</h1>
          <p class="tar-sub">{{ tarefas().length }} {{ tarefas().length === 1 ? 'tarefa' : 'tarefas' }} listadas</p>
        </div>
        <div class="tar-header__stats">
          <div class="tar-stat tar-stat--atraso" *ngIf="contagemAtrasadas() > 0">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <strong>{{ contagemAtrasadas() }}</strong>
            <span>atrasada(s)</span>
          </div>
        </div>
      </header>

      <nav class="tar-atalhos" role="tablist">
        <button type="button" class="tar-atalho"
          *ngFor="let a of atalhos"
          [class.tar-atalho--active]="atalho() === a.id"
          (click)="setAtalho(a.id)">
          <i class="bi" [ngClass]="a.icone"></i>
          {{ a.rotulo }}
        </button>
      </nav>

      <div class="tar-filtros">
        <div class="tar-search">
          <i class="bi bi-search"></i>
          <input type="text" placeholder="Buscar tarefa…"
            [ngModel]="buscar()" (ngModelChange)="onBuscar($event)">
        </div>
        <select class="tar-select" [ngModel]="equipe()" (ngModelChange)="onEquipe($event)">
          <option value="">Todas equipes</option>
          <option *ngFor="let e of equipes()" [value]="e.nome">{{ e.nome }}</option>
        </select>
        <select class="tar-select" [ngModel]="projetoId()" (ngModelChange)="onProjeto($event)">
          <option value="">Todos projetos</option>
          <option *ngFor="let p of projetos()" [value]="p.id">{{ p.codigo }} — {{ p.nome }}</option>
        </select>
      </div>

      <div *ngIf="loading()" class="tar-loading">Carregando tarefas…</div>

      <div *ngIf="!loading() && !tarefas().length" class="tar-empty">
        <i class="bi bi-clipboard2-x"></i>
        <h3>Nenhuma tarefa encontrada</h3>
        <p>Ajuste os filtros acima ou crie uma nova tarefa dentro de um projeto.</p>
      </div>

      <div *ngIf="!loading() && tarefas().length" class="tar-grid">
        <article *ngFor="let t of tarefas()" class="tar-card"
          [class.tar-card--bloqueada]="t.bloqueada"
          [class.tar-card--atrasada]="t.bloqueada || (t.dataPrevisao && atrasada(t))">
          <header class="tar-card__head">
            <span class="tar-card__id">T{{ t.id }}</span>
            <span class="tar-prio" [attr.title]="prioridade(t.prioridade)" [attr.aria-label]="prioridade(t.prioridade)">
              <i class="bi bi-bar-chart-fill" *ngFor="let _ of [].constructor(t.prioridade || 0)"></i>
            </span>
            <span class="tar-status" [ngClass]="classeStatus(t.status)">
              <i class="bi" [ngClass]="iconeStatus(t.status)"></i>
              {{ formatarStatus(t.status) }}
            </span>
          </header>

          <h3 class="tar-card__titulo">
            <a [routerLink]="['/implantacao/projetos', t.projetoId]">{{ t.titulo }}</a>
          </h3>

          <div class="tar-card__meta">
            <a [routerLink]="['/implantacao/projetos', t.projetoId]" class="tar-card__projeto">
              <i class="bi bi-folder2-open"></i>
              <span class="tar-mono">{{ t.projetoCodigo }}</span>
            </a>
          </div>

          <div class="tar-card__rodape">
            <div class="tar-card__responsavel" *ngIf="t.responsavelNome">
              <i class="bi bi-person-circle"></i>
              <span>{{ t.responsavelNome }}</span>
            </div>
            <div class="tar-card__responsavel tar-card__responsavel--vazio" *ngIf="!t.responsavelNome">
              <i class="bi bi-person-dash"></i>
              <span>sem responsável</span>
            </div>
            <div class="tar-card__prazo" [class.tar-card__prazo--atrasada]="atrasada(t)">
              <i class="bi" [ngClass]="atrasada(t) ? 'bi-exclamation-triangle-fill' : 'bi-calendar3'"></i>
              <span>{{ t.dataPrevisao ? (t.dataPrevisao | date:'dd/MM') : '—' }}</span>
            </div>
          </div>

          <div *ngIf="t.bloqueada" class="tar-card__bloqueio">
            <i class="bi bi-lock-fill"></i>
            <span>{{ t.bloqueadaMotivo || 'Tarefa bloqueada' }}</span>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class TarefasComponent implements OnInit {
  private readonly tarSvc = inject(TarefasService);
  private readonly projSvc = inject(ProjetosService);
  private readonly eqSvc = inject(EquipesService);
  private readonly route = inject(ActivatedRoute);

  tarefas = signal<TarefaResumo[]>([]);
  equipes = signal<EquipeResumo[]>([]);
  projetos = signal<{ id: number; codigo: string; nome: string }[]>([]);
  loading = signal(true);

  atalho = signal<Atalho>('Todas');
  equipe = signal('');
  projetoId = signal<string>('');
  buscar = signal('');

  readonly atalhos: { id: Atalho; rotulo: string; icone: string }[] = [
    { id: 'Todas',        rotulo: 'Todas',        icone: 'bi-list-ul' },
    { id: 'Atrasadas',    rotulo: 'Atrasadas',    icone: 'bi-exclamation-triangle' },
    { id: 'EmAndamento',  rotulo: 'Em andamento', icone: 'bi-play-circle' },
    { id: 'Concluidas',   rotulo: 'Concluídas',   icone: 'bi-check-circle' }
  ];

  readonly contagemAtrasadas = computed(() => this.tarefas().filter(t => this.atrasada(t) || t.bloqueada).length);

  ngOnInit(): void {
    this.eqSvc.listar().subscribe(e => this.equipes.set(e));
    this.projSvc.listar({}).subscribe(p => this.projetos.set(p.map(x => ({ id: x.id, codigo: x.codigo, nome: x.nome }))));

    const qp = this.route.snapshot.queryParamMap.get('projetoId');
    if (qp) this.projetoId.set(qp);
    this.carregar();
  }

  setAtalho(a: Atalho): void { this.atalho.set(a); this.carregar(); }
  onBuscar(v: string): void { this.buscar.set(v); this.carregar(); }
  onEquipe(v: string): void { this.equipe.set(v); this.carregar(); }
  onProjeto(v: string | number): void { this.projetoId.set(String(v)); this.carregar(); }

  carregar(): void {
    this.loading.set(true);
    const f: TarefaFiltro = {};
    if (this.projetoId()) f.projetoId = Number(this.projetoId());
    if (this.equipe()) f.equipe = this.equipe();
    if (this.buscar()) f.buscar = this.buscar();
    if (this.atalho() === 'Atrasadas') f.apenasAtrasadas = true;
    if (this.atalho() === 'EmAndamento') f.apenasEmAndamento = true;
    if (this.atalho() === 'Concluidas') f.apenasConcluidas = true;

    this.tarSvc.listar(f).subscribe({
      next: t => { this.tarefas.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  atrasada(t: TarefaResumo): boolean {
    if (!t.dataPrevisao) return false;
    if (t.status === 'Concluida' || t.status === 'Cancelada') return false;
    return new Date(t.dataPrevisao) < new Date(new Date().toDateString());
  }

  classeStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'tar-status--backlog', 'AFazer': 'tar-status--afazer',
      'EmAndamento': 'tar-status--andamento', 'EmHomologacao': 'tar-status--homologacao',
      'Concluida': 'tar-status--concluida',
      'Cancelada': 'tar-status--cancelada'
    };
    return m[s] ?? 'tar-status--backlog';
  }

  iconeStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'bi-circle', 'AFazer': 'bi-bookmark',
      'EmAndamento': 'bi-play-fill', 'EmHomologacao': 'bi-shield-check',
      'Concluida': 'bi-check2-circle', 'Cancelada': 'bi-x-circle'
    };
    return m[s] ?? 'bi-circle';
  }

  formatarStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'Backlog', 'AFazer': 'A Fazer', 'EmAndamento': 'Em andamento',
      'EmHomologacao': 'Homologação', 'Concluida': 'Concluída', 'Cancelada': 'Cancelada'
    };
    return m[s] ?? s;
  }

  prioridade(p: number): string {
    return ['', 'Baixa', 'Média', 'Alta', 'Urgente'][p] ?? '—';
  }
}
