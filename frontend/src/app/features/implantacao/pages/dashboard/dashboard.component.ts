import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardGeral } from '../../models/dashboard.model';

Chart.register(...registerables);

@Component({
  selector: 'app-implantacao-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="adm-page imp-dashboard">
      <header>
        <h1 class="adm-header__title">
          <i class="bi bi-speedometer2"></i> Dashboard
        </h1>
        <p class="adm-header__desc">
          Visão geral da operação de implantação em tempo real.
        </p>
      </header>

      <div class="adm-pills">
        <button type="button" class="adm-pill"
                [class.adm-pill--ativa]="equipe() === 'Todas'"
                (click)="setEquipe('Todas')">
          Todas as equipes
        </button>
        <button type="button" class="adm-pill"
                [class.adm-pill--ativa]="equipe() === 'IMPLANTACAO'"
                (click)="setEquipe('IMPLANTACAO')">
          <i class="bi bi-building"></i> Implantação
        </button>
        <button type="button" class="adm-pill"
                [class.adm-pill--ativa]="equipe() === 'CIAA'"
                (click)="setEquipe('CIAA')">
          <i class="bi bi-cpu"></i> CIAA
        </button>
      </div>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>Carregando indicadores...</p>
      </div>

      <ng-container *ngIf="dados() as d">
        <div class="adm-stats">
          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/projetos']" [queryParams]="{equipe: equipe() === 'Todas' ? null : equipe()}">
            <span class="adm-stat__icone" style="background: rgba(37, 99, 235, 0.12); color: #2563eb;">
              <i class="bi bi-kanban"></i>
            </span>
            <div>
              <strong>{{ d.kpis.projetosAtivos }}</strong>
              <span>Projetos Ativos</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/projetos']" [queryParams]="{equipe: equipe() === 'Todas' ? null : equipe(), status: 'Atrasado'}">
            <span class="adm-stat__icone" style="background: rgba(220, 38, 38, 0.12); color: #dc2626;">
              <i class="bi bi-exclamation-triangle"></i>
            </span>
            <div>
              <strong>{{ d.kpis.projetosAtrasados }}</strong>
              <span>Projetos Atrasados</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/projetos']" [queryParams]="{equipe: equipe() === 'Todas' ? null : equipe(), status: 'Concluido'}">
            <span class="adm-stat__icone" style="background: rgba(22, 163, 74, 0.12); color: #16a34a;">
              <i class="bi bi-check-circle"></i>
            </span>
            <div>
              <strong>{{ d.kpis.projetosConcluidos }}</strong>
              <span>Projetos Finalizados</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/tarefas']">
            <span class="adm-stat__icone" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed;">
              <i class="bi bi-clock-history"></i>
            </span>
            <div>
              <strong>{{ totalHoras() }}</strong>
              <span>Horas Apontadas</span>
            </div>
          </a>
        </div>

        <div class="imp-dashboard__charts">
          <article class="adm-card imp-dashboard__chart-card">
            <h2 class="adm-section-title">
              <i class="bi bi-bar-chart-line"></i> Projetos por Status
            </h2>
            <div class="imp-dashboard__chart-wrap">
              <canvas #barChart></canvas>
            </div>
            <div class="imp-dashboard__legend">
              <span *ngFor="let s of statusList" class="imp-dashboard__legend-item">
                <span class="imp-dashboard__legend-swatch" [style.background]="s.color"></span>
                {{ s.label }}
              </span>
            </div>
          </article>

          <article class="adm-card imp-dashboard__chart-card">
            <h2 class="adm-section-title">
              <i class="bi bi-pie-chart"></i> Distribuição por Equipe
            </h2>
            <div class="imp-dashboard__chart-wrap imp-dashboard__chart-wrap--donut">
              <canvas #donutChart></canvas>
            </div>
            <ul class="imp-dashboard__legend imp-dashboard__legend--list">
              <li *ngFor="let e of d.porEquipe">
                <span class="imp-dashboard__legend-swatch" [style.background]="corEquipe(e.equipe)"></span>
                <span class="imp-dashboard__legend-name">{{ e.equipe }}</span>
                <span class="imp-dashboard__legend-value">{{ e.ativos + e.concluidos + e.bloqueados + e.atrasados }}</span>
              </li>
            </ul>
          </article>
        </div>

        <div class="imp-dashboard__lower">
          <article class="adm-card">
            <header class="imp-dashboard__section-head">
              <h2 class="adm-section-title">
                <i class="bi bi-calendar-event"></i> Próximas Entregas
              </h2>
              <a [routerLink]="['/implantacao/projetos']" [queryParams]="{equipe: equipe() === 'Todas' ? null : equipe()}" class="adm-btn adm-btn--ghost adm-btn--icon">
                Ver todas <i class="bi bi-arrow-right"></i>
              </a>
            </header>
            <div class="imp-dashboard__empty" *ngIf="!d.proximosPrazo.length">
              <i class="bi bi-inbox"></i>
              <p>Nenhum projeto com prazo próximo.</p>
            </div>
            <ul class="imp-dashboard__entregas" *ngIf="d.proximosPrazo.length">
              <li *ngFor="let p of d.proximosPrazo.slice(0, 4)" class="adm-card adm-card--link imp-dashboard__entrega">
                <a [routerLink]="['/implantacao/projetos', p.id]" class="imp-dashboard__entrega-link">
                  <span class="adm-card__icone" [style.background]="corEquipeBg(p.equipeNome)" [style.color]="corEquipe(p.equipeNome)">
                    <i class="bi bi-calendar3"></i>
                  </span>
                  <div class="imp-dashboard__entrega-info">
                    <strong class="adm-card__title">{{ p.nome }}</strong>
                    <span class="adm-card__desc">{{ p.codigo }} &middot; {{ p.equipeNome }}<span *ngIf="p.clienteNome"> &middot; {{ p.clienteNome }}</span></span>
                  </div>
                  <span class="adm-card__meta">{{ p.dataPrevisao | date:'dd/MM' }}</span>
                </a>
              </li>
            </ul>
          </article>

          <article class="adm-card">
            <header class="imp-dashboard__section-head">
              <h2 class="adm-section-title">
                <i class="bi bi-bell"></i> Alertas e Pendências
              </h2>
            </header>
            <ul class="imp-dashboard__alertas">
              <li *ngIf="d.kpis.projetosAtrasados > 0" class="imp-dashboard__alerta" style="background: rgba(220, 38, 38, 0.06); border-left: 3px solid #dc2626;">
                <i class="bi bi-exclamation-triangle" style="color: #dc2626;"></i>
                <div>
                  <strong>{{ d.kpis.projetosAtrasados }} projeto(s) atrasado(s)</strong>
                  <span>Revise os prazos e prioridades com a equipe.</span>
                </div>
              </li>
              <li *ngIf="d.kpis.tarefasAtrasadas > 0" class="imp-dashboard__alerta" style="background: rgba(217, 119, 6, 0.06); border-left: 3px solid #d97706;">
                <i class="bi bi-clock-history" style="color: #d97706;"></i>
                <div>
                  <strong>{{ d.kpis.tarefasAtrasadas }} tarefa(s) atrasada(s)</strong>
                  <span>Verifique a coluna Kanban e reatribua se necessário.</span>
                </div>
              </li>
              <li *ngIf="d.kpis.tarefasAbertas > 0" class="imp-dashboard__alerta" style="background: rgba(37, 99, 235, 0.06); border-left: 3px solid #2563eb;">
                <i class="bi bi-list-check" style="color: #2563eb;"></i>
                <div>
                  <strong>{{ d.kpis.tarefasAbertas }} tarefa(s) em aberto</strong>
                  <span>Total acumulado de tarefas não concluídas.</span>
                </div>
              </li>
              <li *ngIf="!d.kpis.projetosAtrasados && !d.kpis.tarefasAtrasadas" class="imp-dashboard__alerta imp-dashboard__alerta--ok" style="background: rgba(22, 163, 74, 0.06); border-left: 3px solid #16a34a;">
                <i class="bi bi-check-circle" style="color: #16a34a;"></i>
                <div>
                  <strong>Tudo em dia</strong>
                  <span>Nenhum projeto ou tarefa atrasada no momento.</span>
                </div>
              </li>
            </ul>
          </article>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .imp-dashboard__charts {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.25rem;
      margin: 1.5rem 0;
    }
    @media (max-width: 900px) {
      .imp-dashboard__charts { grid-template-columns: 1fr; }
    }
    .imp-dashboard__chart-card { padding: 1.5rem; }
    .imp-dashboard__chart-card .adm-section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .imp-dashboard__chart-card .adm-section-title i {
      color: var(--primary-color);
      opacity: 0.7;
    }
    .imp-dashboard__chart-wrap {
      position: relative;
      height: 220px;
    }
    .imp-dashboard__chart-wrap--donut { height: 200px; }
    .imp-dashboard__legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: var(--text-color);
      opacity: 0.85;
    }
    .imp-dashboard__legend--list {
      list-style: none;
      padding: 0;
      margin: 1rem 0 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .imp-dashboard__legend--list li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .imp-dashboard__legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .imp-dashboard__legend-swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      display: inline-block;
    }
    .imp-dashboard__legend-name {
      flex: 1;
      font-weight: 500;
    }
    .imp-dashboard__legend-value {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-color);
      opacity: 0.7;
    }
    .imp-dashboard__lower {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 900px) {
      .imp-dashboard__lower { grid-template-columns: 1fr; }
    }
    .imp-dashboard__section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .imp-dashboard__section-head .adm-section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    .imp-dashboard__section-head .adm-section-title i {
      color: var(--primary-color);
      opacity: 0.7;
    }
    .imp-dashboard__entregas {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .imp-dashboard__entrega {
      padding: 0.75rem 1rem;
      display: block;
    }
    .imp-dashboard__entrega-link {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      text-decoration: none;
      color: inherit;
    }
    .imp-dashboard__entrega-info {
      flex: 1;
      min-width: 0;
    }
    .imp-dashboard__entrega-info .adm-card__title {
      font-size: 0.9rem;
      margin: 0 0 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .imp-dashboard__entrega-info .adm-card__desc {
      font-size: 0.75rem;
      color: var(--text-color);
      opacity: 0.7;
    }
    .imp-dashboard__alertas {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .imp-dashboard__alerta {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
    }
    .imp-dashboard__alerta i {
      font-size: 1.1rem;
      margin-top: 0.1rem;
    }
    .imp-dashboard__alerta strong {
      display: block;
      font-size: 0.875rem;
      margin-bottom: 0.15rem;
    }
    .imp-dashboard__alerta span {
      font-size: 0.75rem;
      color: var(--text-color);
      opacity: 0.75;
    }
    .imp-dashboard__empty {
      padding: 1.5rem;
      text-align: center;
      color: var(--text-color);
      opacity: 0.6;
    }
    .imp-dashboard__empty p {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
    }
    .imp-dashboard__empty i {
      font-size: 2rem;
      opacity: 0.5;
    }
    .adm-stat--clickable {
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, transform 0.15s;
    }
    .adm-stat--clickable:hover {
      border-color: var(--primary-color);
      transform: translateY(-1px);
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly svc = inject(DashboardService);
  dados = signal<DashboardGeral | null>(null);
  loading = signal(true);
  equipe = signal<string>('Todas');

  barCanvas = viewChild<ElementRef<HTMLCanvasElement>>('barChart');
  donutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('donutChart');

  private barChartInstance?: Chart;
  private donutChartInstance?: Chart;

  // Mapping status com cor (paleta do sistema)
  readonly statusList = [
    { key: 'Backlog',         label: 'Backlog',        color: '#94a3b8' },
    { key: 'AFazer',          label: 'A Fazer',         color: '#60a5fa' },
    { key: 'EmAndamento',     label: 'Em Andamento',    color: '#fbbf24' },
    { key: 'Homologacao',     label: 'Homologação',     color: '#a78bfa' },
    { key: 'Concluido',       label: 'Concluído',       color: '#16a34a' },
    { key: 'Bloqueado',       label: 'Bloqueado',       color: '#dc2626' }
  ];

  totalHoras = computed(() => {
    const d = this.dados();
    if (!d) return 0;
    return d.kpis.horasApontadas;
  });

  ngOnInit(): void { this.carregar(); }

  ngOnDestroy(): void {
    this.barChartInstance?.destroy();
    this.donutChartInstance?.destroy();
  }

  setEquipe(eq: string): void {
    this.equipe.set(eq);
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.svc.obter(this.equipe() === 'Todas' ? undefined : this.equipe()).subscribe({
      next: (d) => {
        this.dados.set(d);
        this.loading.set(false);
        // Render charts after view updates
        queueMicrotask(() => this.renderCharts(d));
      },
      error: () => this.loading.set(false)
    });
  }

  corEquipe(nome?: string): string {
    if (nome === 'IMPLANTACAO') return '#0f4c81';
    if (nome === 'CIAA') return '#7c3aed';
    return '#94a3b8';
  }

  corEquipeBg(nome?: string): string {
    if (nome === 'IMPLANTACAO') return 'rgba(15, 76, 129, 0.12)';
    if (nome === 'CIAA') return 'rgba(124, 58, 237, 0.12)';
    return 'rgba(148, 163, 184, 0.15)';
  }

  private renderCharts(d: DashboardGeral): void {
    this.renderBarChart(d);
    this.renderDonutChart(d);
  }

  private renderBarChart(d: DashboardGeral): void {
    const el = this.barCanvas()?.nativeElement;
    if (!el) return;

    // Contagem por status (do kpis + tarefasPorStatus)
    const contagem = this.statusList.map(s => {
      const found = d.tarefasPorStatus?.find(t => t.status === s.key);
      return found ? found.total : 0;
    });

    this.barChartInstance?.destroy();
    this.barChartInstance = new (Chart as any)(el, {
      type: 'bar',
      data: {
        labels: this.statusList.map(s => s.label),
        datasets: [{
          data: contagem,
          backgroundColor: this.statusList.map(s => s.color),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 48
        }]
      },
      options: this.barOptions
    });
  }

  private renderDonutChart(d: DashboardGeral): void {
    const el = this.donutCanvas()?.nativeElement;
    if (!el) return;

    const labels = d.porEquipe.map(e => e.equipe);
    const values = d.porEquipe.map(e => e.ativos + e.concluidos + e.bloqueados + e.atrasados);
    const colors = labels.map(l => this.corEquipe(l));

    this.donutChartInstance?.destroy();
    this.donutChartInstance = new (Chart as any)(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: this.donutOptions
    });
  }

  private readonly barOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: "'Inter', sans-serif", size: 12 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#475569' }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(15, 23, 42, 0.06)' },
        border: { display: false },
        ticks: { font: { family: "'IBM Plex Mono', monospace", size: 11 }, color: '#64748b', stepSize: 1 }
      }
    }
  };

  private readonly donutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: "'Inter', sans-serif", size: 12 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false
      }
    }
  };
}
