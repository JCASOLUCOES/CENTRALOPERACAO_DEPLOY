import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { AdminDashboardService, AdminDashboardDto, AdminFuncaoResumo, AdminAlertaResumo } from '../../services/admin-dashboard.service';
import { KanbanComponent } from '@features/implantacao/pages/kanban/kanban.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

type AbaAdmin = 'visao' | 'kanban' | 'alertas';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, KanbanComponent, PageHeaderComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  dashboard?: AdminDashboardDto;
  loading = true;
  erro = '';
  funcoesFiltradas: AdminFuncaoResumo[] = [];
  funcaoSelecionada: number | null = null;
  refreshAtrasoMs = 30000;
  timerRef: any;

  /** Corretor #2: abas internas na mesma URL (sem navegar para /admin/kanban). */
  aba: AbaAdmin = 'visao';

  kpis: { label: string; valor: number; cor: string; icone: string }[] = [];

  constructor(
    private readonly service: AdminDashboardService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.atualizar();
    this.timerRef = setInterval(() => this.atualizar(), this.refreshAtrasoMs);
  }

  ngOnDestroy(): void {
    if (this.timerRef) clearInterval(this.timerRef);
  }

  atualizar(): void {
    this.loading = true;
    this.erro = '';
    this.service.obter(this.funcaoSelecionada ?? undefined).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.funcoesFiltradas = data.funcoes;
        this.atualizarKpis();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar dashboard. Tente novamente.';
        this.loading = false;
      }
    });
  }

  filtrar(): void {
    if (!this.dashboard) return;
    if (this.funcaoSelecionada === null) {
      this.funcoesFiltradas = this.dashboard.funcoes;
    } else {
      this.funcoesFiltradas = this.dashboard.funcoes.filter(f => f.funcaoId === this.funcaoSelecionada);
    }
  }

  private atualizarKpis(): void {
    if (!this.dashboard) return;
    this.kpis = [
      { label: 'Total Tarefas', valor: this.dashboard.totalTarefas, cor: 'blue', icone: 'bi-grid-3x3-gap' },
      { label: 'Em Andamento', valor: this.dashboard.emAndamento, cor: 'orange', icone: 'bi-hourglass-split' },
      { label: 'Atrasadas', valor: this.dashboard.atrasadas, cor: 'red', icone: 'bi-exclamation-triangle' },
      { label: 'Concluídas', valor: this.dashboard.concluidas, cor: 'green', icone: 'bi-check-circle' },
    ];
  }

  irParaKanban(): void {
    this.aba = 'kanban';
  }

  setAba(aba: AbaAdmin): void {
    this.aba = aba;
  }
}