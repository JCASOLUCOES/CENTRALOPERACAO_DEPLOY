import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GestorPermissionService } from '../../services/gestor-permission.service';
import { GestorService } from '../../services/gestor.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { GestorKpiCardComponent } from '../../components/gestor-kpi-card/gestor-kpi-card.component';
import { GestorChartComponent } from '../../components/gestor-chart/gestor-chart.component';
import { GestorMetricasResponse, MetricaCard, MetricaGrafico, GestorTarefaCritica } from '../../models/gestor.models';

@Component({
  selector: 'app-cto-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    GestorKpiCardComponent,
    GestorChartComponent
  ],
  templateUrl: './cto-dashboard.component.html',
  styleUrl: './cto-dashboard.component.scss'
})
export class CtoDashboardComponent implements OnInit, OnDestroy {
  private readonly perm = inject(GestorPermissionService);
  private readonly router = inject(Router);
  private readonly gestorService = inject(GestorService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private destroy$ = new Subject<void>();
  private refreshTimer?: ReturnType<typeof setInterval>;

  readonly loading = signal(true);
  readonly erro = signal('');
  readonly dados = signal<GestorMetricasResponse | null>(null);

  ngOnInit(): void {
    if (!this.perm.podeAcessarPainel('cto')) {
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

    this.gestorService.obterMetricasCto().subscribe({
      next: (res) => {
        this.dados.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.erro.set('Não foi possível carregar os indicadores tecnológicos.');
        this.loading.set(false);
        console.error('[CTO Dashboard] Erro ao carregar métricas:', err);
      }
    });
  }

  atualizar(): void {
    this.carregar();
  }

  // Helpers para template
  corPrioridade(p: number): string {
    if (p === 3) return '#ea580c';
    if (p === 2) return '#f59e0b';
    if (p === 1) return '#fbbf24';
    return '#6b7280';
  }

  rotuloPrioridade(p: number): string {
    return ['Baixa', 'Média', 'Alta', 'Urgente'][p] ?? '';
  }
}