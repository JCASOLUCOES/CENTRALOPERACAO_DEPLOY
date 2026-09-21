import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ExecutivoDashboardService } from '../../services/executivo-dashboard.service';
import { KanbanComponent } from '@features/implantacao/pages/kanban/kanban.component';
import type { ResumoExecutivo } from '../../models/executivo.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

Chart.register(...registerables);

interface Atalho {
  rotulo: string;
  icone: string;
  rota: string;
  cor: string;
}

const ATALHOS: Atalho[] = [
  { rotulo: 'Kanban Total', icone: 'bi-kanban-fill', rota: '/implantacao/kanban', cor: '#0f4c81' },
  { rotulo: 'Kanban ADM', icone: 'bi-kanban', rota: '/administrativo', cor: '#7c3aed' },
  { rotulo: 'Agenda', icone: 'bi-calendar-week', rota: '/agenda', cor: '#0284c7' },
  { rotulo: 'Projetos', icone: 'bi-folder2-open', rota: '/implantacao/projetos', cor: '#d97706' },
  { rotulo: 'Admin', icone: 'bi-shield-lock', rota: '/admin/dashboard', cor: '#16a34a' }
];

const STATUS_COR: Record<string, string> = {
  'Backlog': '#94a3b8',
  'AFazer': '#60a5fa',
  'EmAndamento': '#d97706',
  'Homologacao': '#a78bfa',
  'Concluido': '#16a34a',
  'Bloqueado': '#dc2626',
  'Cancelado': '#64748b'
};

const STATUS_ROTULO: Record<string, string> = {
  'Backlog': 'Backlog',
  'AFazer': 'A Fazer',
  'EmAndamento': 'Em Andamento',
  'Homologacao': 'Homologação',
  'Concluido': 'Concluído',
  'Bloqueado': 'Bloqueado',
  'Cancelado': 'Cancelado'
};

@Component({
  selector: 'app-executivo-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, KanbanComponent, PageHeaderComponent],
  templateUrl: './executivo-dashboard.component.html',
  styleUrl: './executivo-dashboard.component.scss'
})
export class ExecutivoDashboardComponent implements OnInit, OnDestroy {
  private readonly svc = inject(ExecutivoDashboardService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  dados = signal<ResumoExecutivo | null>(null);
  loading = signal(true);
  erro = signal('');
  funcaoSelecionada: number | null = null;

  readonly atalhos = ATALHOS;

  equipesCanvas = viewChild<ElementRef<HTMLCanvasElement>>('equipesChart');
  panoramaCanvas = viewChild<ElementRef<HTMLCanvasElement>>('panoramaChart');

  private equipesChart?: Chart;
  private panoramaChart?: Chart;
  private timerRef: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // SSR/prerender: só hidrata o shell (sem HTTP); dados carregam no browser.
    if (!this.isBrowser) return;
    this.carregar();
    this.timerRef = setInterval(() => this.carregar(true), 30000);
  }

  ngOnDestroy(): void {
    if (this.timerRef) clearInterval(this.timerRef);
    this.equipesChart?.destroy();
    this.panoramaChart?.destroy();
  }

  carregar(silencioso = false): void {
    if (!silencioso) this.loading.set(true);
    this.erro.set('');
    this.svc.obter(this.funcaoSelecionada ?? undefined).subscribe({
      next: (d) => {
        this.dados.set(d);
        this.loading.set(false);
        queueMicrotask(() => this.renderCharts(d));
      },
      error: () => {
        this.loading.set(false);
        this.erro.set('Não foi possível carregar a Central Executiva. Tente novamente.');
      }
    });
  }

  aoTrocarFuncao(): void {
    this.carregar();
  }

  limparFiltro(): void {
    this.funcaoSelecionada = null;
    this.carregar();
  }

  corAlerta(tipo: string): string {
    if (tipo === 'bloqueada') return '#7c3aed';
    if (tipo === 'atrasada') return '#dc2626';
    if (tipo === 'urgente') return '#ea580c';
    return '#16a34a';
  }

  iconeAlerta(tipo: string): string {
    if (tipo === 'bloqueada') return 'bi-lock-fill';
    if (tipo === 'atrasada') return 'bi-exclamation-triangle-fill';
    if (tipo === 'urgente') return 'bi-lightning-charge-fill';
    return 'bi-check-circle-fill';
  }

  nomesResponsaveis(eq: { responsaveis?: { nome: string }[] }): string {
    const lista = eq.responsaveis ?? [];
    const primeiros = lista.slice(0, 3).map(r => r.nome).join(', ');
    return lista.length > 3 ? `${primeiros} e mais ${lista.length - 3}` : primeiros;
  }

  corStatus(status: string): string {
    return STATUS_COR[status] ?? '#94a3b8';
  }

  rotuloStatus(status: string): string {
    return STATUS_ROTULO[status] ?? status;
  }

  estaAtrasado(dataPrevisao?: string): boolean {
    if (!dataPrevisao) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(dataPrevisao) < hoje;
  }

  private renderCharts(d: ResumoExecutivo): void {
    this.renderEquipes(d);
    this.renderPanorama(d);
  }

  private renderEquipes(d: ResumoExecutivo): void {
    const el = this.equipesCanvas()?.nativeElement;
    if (!el) return;
    const top = d.equipes.slice(0, 6);
    this.equipesChart?.destroy();
    this.equipesChart = new (Chart as any)(el, {
      type: 'bar',
      data: {
        labels: top.map(e => e.nome),
        datasets: [
          { label: 'Em andamento', data: top.map(e => e.emAndamento), backgroundColor: '#fbbf24', borderRadius: 4, maxBarThickness: 28 },
          { label: 'Atrasadas', data: top.map(e => e.atrasadas), backgroundColor: '#dc2626', borderRadius: 4, maxBarThickness: 28 },
          { label: 'Concluídas', data: top.map(e => e.concluidas), backgroundColor: '#16a34a', borderRadius: 4, maxBarThickness: 28 }
        ]
      },
      options: this.barOptions
    });
  }

  private renderPanorama(d: ResumoExecutivo): void {
    const el = this.panoramaCanvas()?.nativeElement;
    if (!el) return;
    const porChave = new Map(d.kpis.map(k => [k.chave, k.valor]));
    const labels = ['Em andamento', 'Concluídas', 'Atrasadas', 'Bloqueadas', 'Urgentes'];
    const values = [
      porChave.get('andamento') ?? 0,
      porChave.get('concluidas') ?? 0,
      porChave.get('atrasadas') ?? 0,
      porChave.get('bloqueadas') ?? 0,
      porChave.get('urgentes') ?? 0
    ];
    this.panoramaChart?.destroy();
    this.panoramaChart = new (Chart as any)(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: ['#fbbf24', '#16a34a', '#dc2626', '#7c3aed', '#ea580c'],
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
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: "'Inter', sans-serif", size: 11 } } },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: "'Inter', sans-serif", size: 12 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#475569',
          autoSkip: true,
          maxTicksLimit: 6,
          maxRotation: 45,
          minRotation: 0,
          callback: function (this: any, valor: string | number): string {
            const rotulo = String(this.getLabelForValue(Number(valor)));
            return rotulo.length > 14 ? rotulo.slice(0, 13) + '…' : rotulo;
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(15, 23, 42, 0.06)' },
        border: { display: false },
        ticks: { font: { family: "'IBM Plex Mono', monospace", size: 11 }, color: '#64748b', precision: 0 }
      }
    }
  };

  private readonly donutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: "'Inter', sans-serif", size: 11 } } },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: "'Inter', sans-serif", size: 12 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        padding: 10,
        cornerRadius: 6
      }
    }
  };
}
