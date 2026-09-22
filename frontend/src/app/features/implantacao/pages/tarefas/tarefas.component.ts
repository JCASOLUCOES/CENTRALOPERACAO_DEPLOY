import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TarefasService } from '../../services/tarefas.service';
import { TarefaResumo, TarefaFiltro, ehAtrasada } from '../../models/tarefa.model';
import { ProjetosService } from '../../services/projetos.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

type Atalho = 'Todas' | 'Atrasadas' | 'EmAndamento' | 'Concluidas' | 'Bugs' | 'Features';

@Component({
  selector: 'app-implantacao-tarefas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  styleUrl: './tarefas.component.scss',
  template: `
    <section class="tar-shell">
      <app-page-header
        titulo="Tarefas"
        descricao="Liste, filtre e acompanhe o detalhamento de todas as tarefas cadastradas."
        icone="bi-list-check">
        <div actions class="tar-header__stats">
          <div class="tar-stat tar-stat--atraso" *ngIf="contagemAtrasadas() > 0">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <strong>{{ contagemAtrasadas() }}</strong>
            <span>atrasada(s)</span>
          </div>
          <a [routerLink]="['/implantacao/tarefas/novo']" class="tar-btn tar-btn--primary">
            <i class="bi bi-plus-lg"></i> Nova tarefa
          </a>
        </div>
      </app-page-header>

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
        <select class="tar-select" [ngModel]="projetoId()" (ngModelChange)="onProjeto($event)">
          <option value="">Todos projetos</option>
          <option value="sem-projeto">Sem projeto</option>
          <option *ngFor="let p of projetos()" [value]="p.id">{{ p.codigo }} — {{ p.nome }}</option>
        </select>
        <label class="tar-checkbox">
          <input type="checkbox" [ngModel]="incluirArquivadas()" (ngModelChange)="incluirArquivadas.set($event)" (change)="carregar()">
          <span>Mostrar arquivadas</span>
        </label>
      </div>

      <div *ngIf="loading()" class="tar-loading">Carregando tarefas…</div>

      <div *ngIf="erro()" class="tar-alert tar-alert--error">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>{{ erro() }}</span>
      </div>

      <div *ngIf="toastMessage()" class="tar-toast" role="alert">
        <i class="bi bi-check-circle-fill"></i>
        <span>{{ toastMessage() }}</span>
      </div>

      <div *ngIf="!loading() && !tarefas().length" class="tar-empty">
        <i class="bi bi-clipboard2-x"></i>
        <h3>Nenhuma tarefa encontrada</h3>
        <p>Ajuste os filtros acima ou crie uma nova tarefa dentro de um projeto.</p>
      </div>

      <div *ngIf="!loading() && tarefas().length" class="tar-grid">
        <article *ngFor="let t of tarefas()" class="tar-card"
          [class.tar-card--bloqueada]="t.bloqueada"
          [class.tar-card--atrasada]="t.bloqueada || atrasada(t)">
          <header class="tar-card__head">
            <span class="tar-card__id">T{{ t.id }}</span>
            <span class="tar-prio" [attr.title]="prioridade(t.prioridade)" [attr.aria-label]="prioridade(t.prioridade)">
              <i class="bi bi-bar-chart-fill" *ngFor="let _ of [].constructor(t.prioridade || 0)"></i>
            </span>
            <span class="tar-tipo" [ngClass]="tipoClass(t.tipo)">{{ tipoLabel(t.tipo) }}</span>
            <span class="tar-status" [ngClass]="classeStatus(t.status)">
              <i class="bi" [ngClass]="iconeStatus(t.status)"></i>
              {{ formatarStatus(t.status) }}
            </span>
          </header>

          <h3 class="tar-card__titulo">
            <a [routerLink]="getProjetoLink(t)">{{ t.titulo }}</a>
          </h3>

          <div class="tar-card__meta">
            <ng-container *ngIf="t.projetoId; else semProjetoTar">
              <a [routerLink]="getProjetoLink(t)" class="tar-card__projeto">
                <i class="bi bi-folder2-open"></i>
                <span class="tar-mono">{{ t.projetoCodigo }}</span>
              </a>
            </ng-container>
            <ng-template #semProjetoTar>
              <span class="tar-card__projeto tar-card__projeto--sem">
                <i class="bi bi-folder2-open"></i>
                <span class="tar-mono">Sem projeto</span>
              </span>
            </ng-template>
            <span class="tar-card__etapa" *ngIf="t.projetoEtapaNome" [title]="'Etapa: ' + t.projetoEtapaNome">
              <i class="bi bi-flag"></i> {{ t.projetoEtapaNome }}
            </span>
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
              <span>{{ (t.dataEntrega ?? t.dataPrevisao) ? ((t.dataEntrega ?? t.dataPrevisao) | date:'dd/MM') : '—' }}</span>
            </div>
          </div>

          <div *ngIf="t.bloqueada" class="tar-card__bloqueio">
            <i class="bi bi-lock-fill"></i>
            <span>{{ t.bloqueadaMotivo || 'Tarefa bloqueada' }}</span>
          </div>

          <div *ngIf="t.arquivada" class="tar-card__arquivada">
            <i class="bi bi-archive-fill"></i> Arquivada
          </div>

          <div class="tar-card__acoes">
            <a [routerLink]="['/implantacao/tarefas', t.id, 'editar']" class="tar-acao">
              <i class="bi bi-pencil-square"></i> Editar
            </a>
            <button
              type="button"
              class="tar-acao tar-acao--danger"
              (click)="excluir(t)"
              [disabled]="excluindoId() === t.id"
            >
              <i class="bi" [ngClass]="excluindoId() === t.id ? 'bi-hourglass-split' : 'bi-trash'"></i>
              {{ excluindoId() === t.id ? 'Excluindo...' : 'Excluir' }}
            </button>
            <button
              *ngIf="!t.arquivada && t.status === 'Concluida'"
              type="button"
              class="tar-acao tar-acao--archive"
              (click)="arquivar(t)"
              [disabled]="arquivandoId() === t.id"
            >
              <i class="bi" [ngClass]="arquivandoId() === t.id ? 'bi-hourglass-split' : 'bi-archive'"></i>
              {{ arquivandoId() === t.id ? 'Arquivando...' : 'Arquivar' }}
            </button>
            <button
              *ngIf="t.arquivada"
              type="button"
              class="tar-acao tar-acao--archive"
              (click)="desarquivar(t)"
              [disabled]="arquivandoId() === t.id"
            >
              <i class="bi" [ngClass]="arquivandoId() === t.id ? 'bi-hourglass-split' : 'bi-archive-fill'"></i>
              {{ arquivandoId() === t.id ? 'Desarquivando...' : 'Desarquivar' }}
            </button>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class TarefasComponent implements OnInit {
  private readonly tarSvc = inject(TarefasService);
  private readonly projSvc = inject(ProjetosService);
  private readonly route = inject(ActivatedRoute);

  tarefas = signal<TarefaResumo[]>([]);
  projetos = signal<{ id: number; codigo: string; nome: string }[]>([]);
  loading = signal(true);
  erro = signal<string | null>(null);
  excluindoId = signal<number | null>(null);
  arquivandoId = signal<number | null>(null);

  atalho = signal<Atalho>('Todas');
  projetoId = signal<string>('');
  buscar = signal('');
  incluirArquivadas = signal(false);

  readonly atalhos: { id: Atalho; rotulo: string; icone: string }[] = [
    { id: 'Todas',        rotulo: 'Todas',        icone: 'bi-list-ul' },
    { id: 'Atrasadas',    rotulo: 'Atrasadas',    icone: 'bi-exclamation-triangle' },
    { id: 'EmAndamento',  rotulo: 'Em andamento', icone: 'bi-play-circle' },
    { id: 'Concluidas',   rotulo: 'Concluídas',   icone: 'bi-check-circle' },
    { id: 'Bugs',         rotulo: 'Bugs',         icone: 'bi-bug-fill' },
    { id: 'Features',     rotulo: 'Features',     icone: 'bi-sparkles' }
  ];

  readonly contagemAtrasadas = computed(() => this.tarefas().filter(t => this.atrasada(t) || t.bloqueada).length);

  readonly toastMessage = signal<string>('');
  readonly toastType = signal<'success' | 'error' | 'info'>('info');
  private toastTimeout: any = null;

  ngOnInit(): void {
    this.projSvc.listar({}).subscribe(p => this.projetos.set(p.map(x => ({ id: x.id, codigo: x.codigo, nome: x.nome }))));

    const qp = this.route.snapshot.queryParamMap.get('projetoId');
    if (qp) this.projetoId.set(qp);
    this.carregar();
    this.exibirToastNavegacao();
  }

  /** Exibe toast enviado via router state (ex.: "Tarefa criada com sucesso"). */
  private exibirToastNavegacao(): void {
    if (typeof history === 'undefined') return;
    const mensagem = history.state as { mensagem?: string } | null;
    if (!mensagem?.mensagem) return;
    this.toastMessage.set(mensagem.mensagem);
    history.replaceState({}, '');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 3000);
  }

  setAtalho(a: Atalho): void { this.atalho.set(a); this.carregar(); }
  onBuscar(v: string): void { this.buscar.set(v); this.carregar(); }
  onProjeto(v: string | number): void { 
    const val = String(v);
    this.projetoId.set(val === 'sem-projeto' ? 'null' : val);
    this.carregar(); 
  }

  carregar(): void {
    this.loading.set(true);
    this.erro.set(null);
    const f: TarefaFiltro = {};
    const projId = this.projetoId();
    if (projId && projId !== 'null') f.projetoId = Number(projId);
    else if (projId === 'null') f.projetoId = undefined; // explicitamente sem projeto
    if (this.buscar()) f.buscar = this.buscar();
    if (this.atalho() === 'Atrasadas') f.apenasAtrasadas = true;
    if (this.atalho() === 'EmAndamento') f.apenasEmAndamento = true;
    if (this.atalho() === 'Concluidas') f.apenasConcluidas = true;
    if (this.atalho() === 'Bugs') f.tipo = 1;
    if (this.atalho() === 'Features') f.tipo = 0;
    if (this.incluirArquivadas()) f.incluirArquivadas = true;

    this.tarSvc.listar(f).subscribe({
      next: t => { this.tarefas.set(t); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.erro.set(err.error?.mensagem || 'Erro ao carregar tarefas');
      }
    });
  }

  excluir(tarefa: TarefaResumo): void {
    if (this.excluindoId() !== null) return;
    if (!confirm(`Excluir a tarefa T${tarefa.id} permanentemente?`)) return;

    this.excluindoId.set(tarefa.id);
    this.erro.set(null);
    this.tarSvc.excluir(tarefa.id).subscribe({
      next: () => {
        this.tarefas.update(tarefas => tarefas.filter(t => t.id !== tarefa.id));
        this.excluindoId.set(null);
      },
      error: (err) => {
        this.excluindoId.set(null);
        this.erro.set(err.error?.mensagem || 'Erro ao excluir tarefa');
      }
    });
  }

  arquivar(tarefa: TarefaResumo): void {
    if (this.arquivandoId() !== null) return;
    if (tarefa.status !== 'Concluida') {
      this.toastErro('Apenas tarefas concluídas podem ser arquivadas.');
      return;
    }
    if (!confirm(`Arquivar a tarefa T${tarefa.id}? Ela desaparecerá das listas e do Kanban.`)) return;

    this.arquivandoId.set(tarefa.id);
    this.erro.set(null);
    this.tarSvc.arquivar(tarefa.id).subscribe({
      next: (t) => {
        this.tarefas.update(tarefas => tarefas.map(x => x.id === tarefa.id ? t : x));
        this.arquivandoId.set(null);
        this.toastSucesso('Tarefa arquivada');
      },
      error: (err) => {
        this.arquivandoId.set(null);
        this.erro.set(err.error?.mensagem || 'Erro ao arquivar tarefa');
      }
    });
  }

  desarquivar(tarefa: TarefaResumo): void {
    if (this.arquivandoId() !== null) return;
    if (!confirm(`Desarquivar a tarefa T${tarefa.id}? Ela voltará a aparecer nas listas e no Kanban.`)) return;

    this.arquivandoId.set(tarefa.id);
    this.erro.set(null);
    this.tarSvc.desarquivar(tarefa.id).subscribe({
      next: (t) => {
        this.tarefas.update(tarefas => tarefas.map(x => x.id === tarefa.id ? t : x));
        this.arquivandoId.set(null);
        this.toastSucesso('Tarefa desarquivada');
      },
      error: (err) => {
        this.arquivandoId.set(null);
        this.erro.set(err.error?.mensagem || 'Erro ao desarquivar tarefa');
      }
    });
  }

  atrasada(t: TarefaResumo): boolean {
    return ehAtrasada(t);
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

  tipoLabel(t: number): string {
    return t === 1 ? 'Bug' : 'Feature';
  }

  tipoClass(t: number): string {
    return t === 1 ? 'tar-tipo--bug' : 'tar-tipo--feature';
  }

  getProjetoLink(t: TarefaResumo): string[] {
    return t.projetoId ? ['/implantacao/projetos', String(t.projetoId)] : [];
  }

  // Toast helpers
  toastSucesso(msg: string): void {
    this.toastMessage.set(msg);
    this.toastType.set('success');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 3000);
  }

  toastErro(msg: string): void {
    this.toastMessage.set(msg);
    this.toastType.set('error');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 5000);
  }
}