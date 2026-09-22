import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GestorPermissionService } from '../../services/gestor-permission.service';
import { GestorService } from '../../services/gestor.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { GestorKpiCardComponent } from '../../components/gestor-kpi-card/gestor-kpi-card.component';
import { GestorChartComponent } from '../../components/gestor-chart/gestor-chart.component';
import { GestorMetricasResponse, MetricaCard, MetricaGrafico } from '../../models/gestor.models';

@Component({
  selector: 'app-coo-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    GestorKpiCardComponent,
    GestorChartComponent
  ],
  templateUrl: './coo-dashboard.component.html',
  styleUrl: './coo-dashboard.component.scss'
})
export class CooDashboardComponent implements OnInit, OnDestroy {
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
    if (!this.perm.podeAcessarPainel('coo')) {
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

    this.gestorService.obterMetricasCoo().subscribe({
      next: (res) => {
        this.dados.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.erro.set('Não foi possível carregar os indicadores operacionais.');
        this.loading.set(false);
        console.error('[COO Dashboard] Erro ao carregar métricas:', err);
      }
    });
  }

  atualizar(): void {
    this.carregar();
  }
}