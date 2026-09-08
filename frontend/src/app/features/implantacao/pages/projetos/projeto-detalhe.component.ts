import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjetosService } from '../../services/projetos.service';
import { TarefasService } from '../../services/tarefas.service';
import { ProjetoDetalhe } from '../../models/projeto.model';
import { TarefaResumo, TarefaFiltro } from '../../models/tarefa.model';

@Component({
  selector: 'app-implantacao-projeto-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styleUrl: './projeto-detalhe.component.scss',
  template: `
    <div class="imp-page" *ngIf="projeto() as p">
      <a [routerLink]="['..']" class="imp-detail__back">
        <i class="bi bi-arrow-left"></i> Voltar para projetos
      </a>

      <section class="imp-detail__hero"
               [class.imp-detail__hero--ciaa]="p.equipeNome === 'CIAA'">
        <span class="imp-detail__hero-code">{{ p.codigo }}</span>
        <h1 class="imp-detail__hero-title">{{ p.nome }}</h1>
        <div class="imp-detail__hero-sub">
          <span class="imp-team" [class.imp-team--impl]="p.equipeNome === 'IMPLANTACAO'" [class.imp-team--ciaa]="p.equipeNome === 'CIAA'" style="background: rgba(255,255,255,0.18); color: #fff;">
            {{ p.equipeNome }}
          </span>
          <span>·</span>
          <span>{{ p.tipoProjetoNome }}</span>
          <span *ngIf="p.clienteNome">·</span>
          <span *ngIf="p.clienteNome"><i class="bi bi-building" style="margin-right: 0.25rem;"></i>{{ p.clienteNome }}</span>
        </div>

        <div class="imp-detail__hero-progress">
          <div class="imp-detail__hero-progress-bar" [style.width.%]="p.progresso"></div>
        </div>
        <div class="imp-detail__hero-progress-text">
          <span>Progresso</span>
          <span>{{ p.progresso }}%</span>
        </div>
      </section>

      <div class="imp-tabs">
        <button class="imp-tab" [class.imp-tab--active]="tab() === 'visao'" (click)="setTab('visao')">Visão geral</button>
        <button class="imp-tab" [class.imp-tab--active]="tab() === 'tarefas'" (click)="setTab('tarefas')">
          Tarefas <span class="imp-tab__badge" *ngIf="tarefas().length">{{ tarefas().length }}</span>
        </button>
        <button class="imp-tab" [class.imp-tab--active]="tab() === 'historico'" (click)="setTab('historico')">Histórico</button>
      </div>

      <ng-container *ngIf="tab() === 'visao'">
        <div class="imp-detail-grid">
          <section class="imp-detail__section">
            <h2 class="imp-detail__section-title">Sobre o projeto</h2>
            <p class="imp-detail__descricao">{{ p.descricao || 'Sem descrição cadastrada.' }}</p>
          </section>
          <section class="imp-detail__section">
            <h2 class="imp-detail__section-title">Detalhes</h2>
            <dl class="imp-detail__dl">
              <dt class="imp-detail__dt">Status</dt>
              <dd class="imp-detail__dd">
                <span class="imp-status" [ngClass]="classeStatus(p.status)">{{ formatarStatus(p.status) }}</span>
              </dd>
              <dt class="imp-detail__dt">Responsável</dt>
              <dd class="imp-detail__dd">{{ p.responsavelNome || 'Não definido' }}</dd>
              <dt class="imp-detail__dt">Criado por</dt>
              <dd class="imp-detail__dd">{{ p.criadorNome }}</dd>
              <dt class="imp-detail__dt">Início</dt>
              <dd class="imp-detail__dd">{{ p.dataInicio ? (p.dataInicio | date:'dd/MM/yyyy') : '—' }}</dd>
              <dt class="imp-detail__dt">Previsão</dt>
              <dd class="imp-detail__dd">{{ p.dataPrevisao ? (p.dataPrevisao | date:'dd/MM/yyyy') : '—' }}</dd>
              <dt class="imp-detail__dt">Conclusão</dt>
              <dd class="imp-detail__dd">{{ p.dataConclusao ? (p.dataConclusao | date:'dd/MM/yyyy') : '—' }}</dd>
              <dt class="imp-detail__dt">Go Live</dt>
              <dd class="imp-detail__dd">{{ p.dataGoLiveReal ? (p.dataGoLiveReal | date:'dd/MM/yyyy') : (p.dataGoLivePrevista ? ('prev. ' + (p.dataGoLivePrevista | date:'dd/MM/yyyy')) : '—') }}</dd>
              <dt class="imp-detail__dt">Horas planejadas</dt>
              <dd class="imp-detail__dd">{{ p.horasPlanejadas || '—' }}</dd>
              <dt class="imp-detail__dt">Horas realizadas</dt>
              <dd class="imp-detail__dd">{{ p.horasRealizadas || '—' }}</dd>
            </dl>
          </section>
          <section class="imp-detail__section">
            <h2 class="imp-detail__section-title">Tarefas</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
              <div class="imp-kpi" style="padding: 0.875rem;">
                <span class="imp-kpi__label">Total</span>
                <span class="imp-kpi__value" style="font-size: 1.75rem;">{{ p.totalTarefas }}</span>
              </div>
              <div class="imp-kpi imp-kpi--ok" style="padding: 0.875rem;">
                <span class="imp-kpi__label">Concluídas</span>
                <span class="imp-kpi__value" style="font-size: 1.75rem;">{{ p.tarefasConcluidas }}</span>
              </div>
              <div class="imp-kpi imp-kpi--err" style="padding: 0.875rem;">
                <span class="imp-kpi__label">Atrasadas</span>
                <span class="imp-kpi__value" style="font-size: 1.75rem;">{{ p.tarefasAtrasadas }}</span>
              </div>
            </div>
          </section>
          <section class="imp-detail__section" *ngIf="p.observacao">
            <h2 class="imp-detail__section-title">Observação</h2>
            <p class="imp-detail__descricao">{{ p.observacao }}</p>
          </section>
        </div>
      </ng-container>

      <ng-container *ngIf="tab() === 'tarefas'">
        <div *ngIf="loadingTarefas()" class="imp-loading">Carregando tarefas…</div>
        <div *ngIf="!loadingTarefas() && !tarefas().length" class="imp-empty">
          <h3 class="imp-empty__title">Nenhuma tarefa cadastrada</h3>
          <p class="imp-empty__hint">Adicione tarefas para acompanhar a execução deste projeto.</p>
        </div>
        <div class="imp-table-wrap" *ngIf="tarefas().length">
          <table class="imp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tarefa</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of tarefas()">
                <td><span class="imp-task-row__id">T{{ t.id }}</span></td>
                <td class="imp-task-row__title">{{ t.titulo }}</td>
                <td>{{ t.responsavelNome || '—' }}</td>
                <td><span class="imp-status" [ngClass]="classeStatus(t.status)">{{ formatarStatus(t.status) }}</span></td>
                <td><span style="font: 500 0.8125rem/1 'IBM Plex Mono', monospace; color: var(--imp-ink-soft);">{{ t.dataPrevisao ? (t.dataPrevisao | date:'dd/MM/yyyy') : '—' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <ng-container *ngIf="tab() === 'historico'">
        <div class="imp-detail__section">
          <h2 class="imp-detail__section-title">Histórico de alterações</h2>
          <p class="imp-detail__descricao">Em breve. Aqui aparecerão as principais mudanças do projeto (criação, mudanças de status, reatribuições).</p>
        </div>
      </ng-container>
    </div>

    <div *ngIf="loading() && !projeto()" class="imp-loading">Carregando projeto…</div>
  `,
})
export class ProjetoDetalheComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projSvc = inject(ProjetosService);
  private readonly tarSvc = inject(TarefasService);

  projeto = signal<ProjetoDetalhe | null>(null);
  tarefas = signal<TarefaResumo[]>([]);
  loading = signal(true);
  loadingTarefas = signal(false);
  tab = signal<'visao' | 'tarefas' | 'historico'>('visao');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.projSvc.obter(id).subscribe({
      next: (p) => {
        this.projeto.set(p);
        this.loading.set(false);
        this.carregarTarefas(id);
      },
      error: () => this.loading.set(false)
    });
  }

  setTab(t: 'visao' | 'tarefas' | 'historico'): void { this.tab.set(t); }

  carregarTarefas(projetoId: number): void {
    this.loadingTarefas.set(true);
    const f: TarefaFiltro = { projetoId };
    this.tarSvc.listar(f).subscribe({
      next: (t) => { this.tarefas.set(t); this.loadingTarefas.set(false); },
      error: () => this.loadingTarefas.set(false)
    });
  }

  classeStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'imp-status--backlog', 'AFazer': 'imp-status--afazer',
      'EmAndamento': 'imp-status--em-andamento', 'EmHomologacao': 'imp-status--em-homologacao',
      'Concluida': 'imp-status--concluida', 'Concluido': 'imp-status--concluido',
      'Bloqueada': 'imp-status--bloqueada', 'Bloqueado': 'imp-status--bloqueado',
      'Cancelada': 'imp-status--cancelada', 'Cancelado': 'imp-status--cancelado'
    };
    return m[s] ?? 'imp-status--backlog';
  }

  formatarStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'Backlog', 'AFazer': 'A Fazer', 'EmAndamento': 'Em Andamento',
      'EmHomologacao': 'Em Homologação', 'Concluida': 'Concluída', 'Concluido': 'Concluído',
      'Cancelada': 'Cancelada', 'Cancelado': 'Cancelado',
      'Bloqueada': 'Bloqueada', 'Bloqueado': 'Bloqueado'
    };
    return m[s] ?? s;
  }
}
