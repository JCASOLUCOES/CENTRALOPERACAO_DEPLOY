import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GestorPermissionService } from '../../services/gestor-permission.service';
import { GestorService } from '../../services/gestor.service';
import { ProjetosService } from '@features/implantacao/services/projetos.service';
import { AgendaService, AgendaResumo } from '@features/agenda/services/agenda.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { GestorKpiCardComponent } from '../../components/gestor-kpi-card/gestor-kpi-card.component';
import { GestorChartComponent } from '../../components/gestor-chart/gestor-chart.component';
import {
  GestorMetricasResponse,
  MetricaCard,
  MetricaGrafico,
  GestorProjeto,
  GestorAlerta
} from '../../models/gestor.models';
import { ProjetoResumo } from '@features/implantacao/models/projeto.model';

@Component({
  selector: 'app-ceo-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    GestorKpiCardComponent,
    GestorChartComponent
  ],
  templateUrl: './ceo-dashboard.component.html',
  styleUrl: './ceo-dashboard.component.scss'
})
export class CeoDashboardComponent implements OnInit, OnDestroy {
  private readonly perm = inject(GestorPermissionService);
  private readonly router = inject(Router);
  private readonly gestorService = inject(GestorService);
  private readonly projetosService = inject(ProjetosService);
  private readonly agendaService = inject(AgendaService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private destroy$ = new Subject<void>();
  private refreshTimer?: ReturnType<typeof setInterval>;

  readonly loading = signal(true);
  readonly erro = signal('');
  readonly dados = signal<GestorMetricasResponse | null>(null);
  readonly projetos = signal<GestorProjeto[]>([]);
  readonly agenda = signal<AgendaResumo[]>([]);
  readonly carregandoProjetos = signal(false);
  readonly carregandoAgenda = signal(false);

  ngOnInit(): void {
    if (!this.perm.podeAcessarPainel('ceo')) {
      this.router.navigate(['/gestor/entrada']);
      return;
    }
    this.carregar();
    if (this.isBrowser) {
      this.refreshTimer = setInterval(() => this.carregar(), 30000);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.erro.set('');

    this.gestorService.obterMetricasCeo().subscribe({
      next: (res) => {
        this.dados.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.erro.set('Não foi possível carregar os indicadores estratégicos.');
        this.loading.set(false);
        console.error('[CEO Dashboard] Erro ao carregar métricas:', err);
      }
    });

    this.carregarProjetos();
    this.carregarAgenda();
  }

  private carregarProjetos(): void {
    this.carregandoProjetos.set(true);
    this.projetosService.listar({ status: 'EmAndamento' }).subscribe({
      next: (res: ProjetoResumo[]) => {
        const top6 = res.slice(0, 6).map(this.mapearProjetoParaGestor);
        this.projetos.set(top6);
        this.carregandoProjetos.set(false);
      },
      error: () => {
        this.projetos.set([]);
        this.carregandoProjetos.set(false);
      }
    });
  }

  private carregarAgenda(): void {
    this.carregandoAgenda.set(true);
    const hoje = new Date();
    const inicioSemana = this.formatarDataISO(hoje);
    const fimSemana = this.formatarDataISO(this.adicionarDias(hoje, 7));

    this.agendaService.listarEventos(inicioSemana, fimSemana).subscribe({
      next: (res: AgendaResumo[]) => {
        this.agenda.set(res.slice(0, 5));
        this.carregandoAgenda.set(false);
      },
      error: () => {
        this.agenda.set([]);
        this.carregandoAgenda.set(false);
      }
    });
  }

  private mapearProjetoParaGestor = (p: ProjetoResumo): GestorProjeto => {
    const hoje = new Date();
    const previsao = p.dataPrevisao ? new Date(p.dataPrevisao) : null;
    const atrasoDias = previsao && previsao < hoje
      ? Math.ceil((hoje.getTime() - previsao.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      tipoProjetoNome: p.tipoProjetoNome,
      clienteNome: p.clienteNome,
      status: p.status,
      progresso: p.progresso,
      responsavelNome: p.responsavelNome,
      dataPrevisao: p.dataPrevisao,
      atrasoDias
    };
  };

  // Utilitários
  private formatarDataISO(data: Date): string {
    return data.toISOString().split('T')[0];
  }

  private adicionarDias(data: Date, dias: number): Date {
    const resultado = new Date(data);
    resultado.setDate(resultado.getDate() + dias);
    return resultado;
  }

  formatarHora(dataISO: string | null | undefined): string {
    if (!dataISO) return '';
    try {
      const d = new Date(dataISO);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  formatarValor(valor: number, unidade?: string): string {
    if (valor >= 1000000) return (valor / 1000000).toFixed(1) + 'M' + (unidade ? ' ' + unidade : '');
    if (valor >= 1000) return (valor / 1000).toFixed(1) + 'k' + (unidade ? ' ' + unidade : '');
    return valor.toString() + (unidade ? ' ' + unidade : '');
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

  corStatus(status: string): string {
    const cores: Record<string, string> = {
      'Backlog': '#94a3b8',
      'AFazer': '#60a5fa',
      'EmAndamento': '#d97706',
      'Homologacao': '#a78bfa',
      'Concluida': '#16a34a',
      'Concluido': '#16a34a',
      'Bloqueado': '#dc2626',
      'Cancelado': '#64748b'
    };
    return cores[status] ?? '#94a3b8';
  }

  rotuloStatus(status: string): string {
    const map: Record<string, string> = {
      'Backlog': 'Backlog',
      'AFazer': 'A Fazer',
      'EmAndamento': 'Em Andamento',
      'Homologacao': 'Homologação',
      'Concluida': 'Concluído',
      'Concluido': 'Concluído',
      'Bloqueado': 'Bloqueado',
      'Cancelado': 'Cancelado'
    };
    return map[status] ?? status;
  }

  estaAtrasado(data?: string): boolean {
    if (!data) return false;
    return new Date(data) < new Date();
  }
}