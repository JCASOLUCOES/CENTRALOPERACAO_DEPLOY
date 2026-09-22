import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjetosService } from '../../services/projetos.service';
import { TarefasService } from '../../services/tarefas.service';
import { ProjetoDetalhe, ProjetoEtapaResumo, ProjetoEtapaDetalhe, ProjetoEtapaRetornoRequest } from '../../models/projeto.model';
import { TarefaResumo, TarefaFiltro } from '../../models/tarefa.model';
import { ProjetoEtapaCardComponent } from '../../components/projeto-etapa-card/projeto-etapa-card.component';
import { ProjetoEtapaModalComponent } from '../../components/projeto-etapa-modal/projeto-etapa-modal.component';
import { ProjetoRetornoDialogComponent } from '../../components/projeto-retorno-dialog/projeto-retorno-dialog.component';

@Component({
  selector: 'app-implantacao-projeto-detalhe',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    ProjetoEtapaCardComponent,
    ProjetoEtapaModalComponent,
    ProjetoRetornoDialogComponent
  ],
  styleUrl: './projeto-detalhe.component.scss',
  template: `
    <div class="imp-page" *ngIf="projeto() as p">
      <a [routerLink]="['..']" class="imp-detail__back">
        <i class="bi bi-arrow-left"></i> Voltar para projetos
      </a>

      <div *ngIf="erroAcao()" class="imp-alert imp-alert--error">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>{{ erroAcao() }}</span>
      </div>

      <div *ngIf="toastMessage()" class="imp-toast" [class.imp-toast--success]="toastType() === 'success'" [class.imp-toast--error]="toastType() === 'error'" role="alert">
        <i class="bi" [ngClass]="toastType() === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
        <span>{{ toastMessage() }}</span>
      </div>

      <section class="imp-detail__hero">
        <div class="imp-detail__hero-actions">
          <a [routerLink]="['/implantacao/projetos', p.id, 'editar']" class="imp-btn imp-btn--ghost">
            <i class="bi bi-pencil-square"></i> Editar
          </a>
          <button type="button" class="imp-btn imp-btn--danger" (click)="excluirProjeto()" [disabled]="excluindo()">
            <i class="bi" [ngClass]="excluindo() ? 'bi-hourglass-split' : 'bi-trash'"></i>
            {{ excluindo() ? 'Excluindo...' : 'Excluir' }}
          </button>
        </div>
        <span class="imp-detail__hero-code">{{ p.codigo }}</span>
        <h1 class="imp-detail__hero-title">{{ p.nome }}</h1>
        <div class="imp-detail__hero-sub">
          <span>{{ p.tipoProjetoNome }}</span>
          <span *ngIf="p.clienteNome">·</span>
          <span *ngIf="p.clienteNome"><i class="bi bi-building" style="margin-right: 0.25rem;"></i>{{ p.clienteNome }}</span>
        </div>

        <div class="imp-detail__hero-progress">
          <div class="imp-detail__hero-progress-bar" [style.width.%]="p.progresso"></div>
        </div>
        <div class="imp-detail__hero-progress-text">
          <span>Progresso</span>
          <span>{{ p.progresso }}% ({{ etapasConcluidas() }} de 9 etapas)</span>
        </div>
      </section>

      <!-- 9 Etapas Fixas - Cards Horizontais -->
      <section class="imp-etapas" *ngIf="etapas().length">
        <header class="imp-etapas__head">
          <h2 class="imp-detail__section-title">Etapas da Implantação</h2>
          <span class="imp-etapas__legenda">
            <span class="legenda-item concluida"><i class="bi bi-check-circle-fill"></i> Concluída</span>
            <span class="legenda-item em-andamento"><i class="bi bi-play-circle-fill"></i> Em Andamento</span>
            <span class="legenda-item bloqueada"><i class="bi bi-lock-fill"></i> Bloqueada</span>
            <span class="legenda-item pendente"><i class="bi bi-circle"></i> Pendente</span>
          </span>
        </header>
        <div class="imp-etapas__scroll" [class.horizontal-scroll]="true">
          <app-projeto-etapa-card
            *ngFor="let e of etapasOrdenadas()"
            [etapa]="e"
            [projetoId]="p.id"
            [clicavel]="true"
            (clicou)="abrirModalEtapa($event)">
          </app-projeto-etapa-card>
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
        <div class="imp-detail__tarefas-acoes">
          <a [routerLink]="['/implantacao/tarefas/novo']" [queryParams]="{ projetoId: p.id }" class="imp-btn imp-btn--primary">
            <i class="bi bi-plus-lg"></i> Nova tarefa
          </a>
        </div>
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
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of tarefas()">
                <td><span class="imp-task-row__id">T{{ t.id }}</span></td>
                <td class="imp-task-row__title">{{ t.titulo }}</td>
                <td>{{ t.responsavelNome || '—' }}</td>
                <td><span class="imp-status" [ngClass]="classeStatus(t.status)">{{ formatarStatus(t.status) }}</span></td>
                <td><span style="font: 500 0.8125rem/1 'IBM Plex Mono', monospace; color: var(--imp-ink-soft);">{{ t.dataPrevisao ? (t.dataPrevisao | date:'dd/MM/yyyy') : '—' }}</span></td>
                <td>
                  <a [routerLink]="['/implantacao/tarefas', t.id, 'editar']" class="imp-table__acao">
                    <i class="bi bi-pencil-square"></i> Editar
                  </a>
                  <button
                    *ngIf="!t.arquivada && t.status === 'Concluida'"
                    type="button"
                    class="imp-table__acao"
                    (click)="arquivarTarefa(t)"
                  >
                    <i class="bi bi-archive"></i> Arquivar
                  </button>
                  <button
                    *ngIf="t.arquivada"
                    type="button"
                    class="imp-table__acao"
                    (click)="desarquivarTarefa(t)"
                  >
                    <i class="bi bi-archive-fill"></i> Desarquivar
                  </button>
                </td>
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

    <!-- Modal de Etapa -->
    <app-projeto-etapa-modal
      *ngIf="etapaModalAberta()"
      [projetoId]="projetoId()"
      [ordem]="etapaModalOrdem()"
      (fechado)="fecharModalEtapa()">
    </app-projeto-etapa-modal>

    <!-- Dialog de Retorno de Etapa -->
    <app-projeto-retorno-dialog
      *ngIf="retornoDialogAberto()"
      [etapaAtual]="retornoEtapaAtual()"
      [ordemAlvo]="retornoOrdemAlvo()"
      [nomeEtapaAlvo]="retornoNomeEtapaAlvo()"
      [etapasComChecklist]="etapasComChecklistPreenchido()"
      (confirmado)="onRetornoConfirmado($event)">
    </app-projeto-retorno-dialog>
  `,
})
export class ProjetoDetalheComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projSvc = inject(ProjetosService);
  private readonly tarSvc = inject(TarefasService);
  private readonly modalService = inject(NgbModal);

  projeto = signal<ProjetoDetalhe | null>(null);
  tarefas = signal<TarefaResumo[]>([]);
  jornada = signal<any>(null);
  loading = signal(true);
  loadingTarefas = signal(false);
  excluindo = signal(false);
  erroAcao = signal<string | null>(null);
  tab = signal<'visao' | 'tarefas' | 'historico'>('visao');

  // Etapas fixas (9 etapas)
  etapas = signal<any[]>([]);
  etapaModalAberta = signal(false);
  etapaModalOrdem = signal<number>(0);
  retornoDialogAberto = signal(false);
  retornoEtapaAtual = signal(0);
  retornoOrdemAlvo = signal(0);
  retornoNomeEtapaAlvo = signal('');

  readonly projetoId = computed(() => this.projeto()?.id ?? 0);

  readonly ETAPAS_NOMES = [
    'KICKOFF', 'LEVANTAMENTO', 'DESENVOLVIMENTO', 'HOMOLOGAÇÃO',
    'TREINAMENTO', 'GO LIVE', 'PÓS-IMPLANTAÇÃO', 'PASSAR PARA O SUPORTE', 'CONCLUÍDO'
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarProjeto(id);
    this.carregarTarefas(id);
  }

  carregarProjeto(id: number): void {
    this.loading.set(true);
    this.projSvc.obter(id).subscribe({
      next: (p) => {
        this.projeto.set(p);
        this.loading.set(false);
        this.carregarEtapas(id);
      },
      error: () => this.loading.set(false)
    });
  }

  carregarEtapas(projetoId: number): void {
    this.projSvc.obterEtapasProjeto(projetoId).subscribe({
      next: (etapas) => this.etapas.set(etapas),
      error: () => this.etapas.set([])
    });
  }

  etapasOrdenadas = computed(() => {
    const etapas = this.etapas();
    return this.ETAPAS_NOMES.map((nome, i) => {
      const encontrada = etapas.find((e: any) => e.nome === nome || e.ordem === i + 1);
      if (encontrada) return encontrada;
      return {
        ordem: i + 1,
        nome: nome,
        estado: 'Pendente',
        percentual: 0,
        checklistTotal: 0,
        checklistConcluidos: 0,
        dataInicio: undefined,
        dataFimPrevista: undefined,
        dataFimReal: undefined,
        atrasoDias: undefined,
        responsavelNome: undefined
      };
    });
  });

  etapasConcluidas = computed(() => 
    this.etapasOrdenadas().filter((e: any) => e.estado === 'Concluida').length
  );

  etapasComChecklistPreenchido = computed(() => 
    this.etapasOrdenadas()
      .filter((e: any) => e.checklistTotal > 0 && e.checklistConcluidos > 0)
      .map((e: any) => e.ordem)
  );

  setTab(t: 'visao' | 'tarefas' | 'historico'): void { this.tab.set(t); }

  excluirProjeto(): void {
    const projeto = this.projeto();
    if (!projeto || this.excluindo()) return;
    if (!confirm(`Excluir o projeto ${projeto.codigo} permanentemente?`)) return;

    this.excluindo.set(true);
    this.erroAcao.set(null);
    this.projSvc.excluir(projeto.id).subscribe({
      next: () => this.router.navigate(['/implantacao/projetos']),
      error: (err) => {
        this.excluindo.set(false);
        this.erroAcao.set(err.error?.mensagem || 'Erro ao excluir projeto');
      }
    });
  }

  carregarTarefas(projetoId: number): void {
    this.loadingTarefas.set(true);
    const f: TarefaFiltro = { projetoId };
    this.tarSvc.listar(f).subscribe({
      next: (t) => { this.tarefas.set(t); this.loadingTarefas.set(false); },
      error: () => this.loadingTarefas.set(false)
    });
  }

  abrirModalEtapa(etapa: any): void {
    this.etapaModalOrdem.set(etapa.ordem);
    this.etapaModalAberta.set(true);
  }

  fecharModalEtapa(): void {
    this.etapaModalAberta.set(false);
    this.carregarEtapas(this.projetoId());
  }

  onRetornoConfirmado(confirmado: boolean): void {
    this.retornoDialogAberto.set(false);
    if (confirmado) {
      const p = this.projeto();
      if (p) {
        this.projSvc.retornarEtapa(p.id, {
          ordemAlvo: this.retornoOrdemAlvo(),
          motivo: 'Retorno via dialog',
          usuarioAlteracao: 'admin'
        }).subscribe({
          next: () => this.carregarEtapas(p.id),
          error: () => {}
        });
      }
    }
  }

  solicitarRetornoEtapa(etapa: any): void {
    // Verifica se a etapa clicada é anterior à etapa atual
    const etapaAtual = this.etapasOrdenadas().find(e => e.estado === 'EmAndamento' || e.estado === 'Concluida');
    if (etapaAtual && etapa.ordem < etapaAtual.ordem) {
      this.retornoEtapaAtual.set(etapaAtual.ordem);
      this.retornoOrdemAlvo.set(etapa.ordem);
      this.retornoNomeEtapaAlvo.set(etapa.nome);
      this.retornoDialogAberto.set(true);
    }
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

  arquivarTarefa(t: TarefaResumo): void {
    if (t.status !== 'Concluida') {
      this.toastErro('Apenas tarefas concluídas podem ser arquivadas.');
      return;
    }
    this.tarSvc.arquivar(t.id).subscribe({
      next: (atualizada) => {
        this.tarefas.update(arr => arr.map(x => x.id === t.id ? atualizada : x));
        this.toastSucesso('Tarefa arquivada');
      },
      error: (err) => this.toastErro(err.error?.mensagem || 'Erro ao arquivar tarefa')
    });
  }

  desarquivarTarefa(t: TarefaResumo): void {
    this.tarSvc.desarquivar(t.id).subscribe({
      next: (atualizada) => {
        this.tarefas.update(arr => arr.map(x => x.id === t.id ? atualizada : x));
        this.toastSucesso('Tarefa desarquivada');
      },
      error: (err) => this.toastErro(err.error?.mensagem || 'Erro ao desarquivar tarefa')
    });
  }

  // Toast helpers
  private toastTimeout: any = null;
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error' | 'info'>('info');

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