import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  TarefasService,
  TarefaDetalhe,
  TarefaCriarRequest,
  TarefaAtualizarRequest,
  ChamadoResumo
} from '../../services/tarefas.service';
import { ProjetosService } from '../../services/projetos.service';
import { ColunasKanbanService } from '../../services/cadastros.service';
import { AuthService } from '@core/services/auth.service';
import { UsuarioDropdownComponent } from '@shared/components/usuario-dropdown/usuario-dropdown.component';
import { ChamadoDropdownComponent } from '@shared/components/chamado-dropdown/chamado-dropdown.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-implantacao-tarefa-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    UsuarioDropdownComponent,
    ChamadoDropdownComponent,
    PageHeaderComponent
  ],
  templateUrl: './tarefa-form.component.html',
  styleUrl: './tarefa-form.component.scss'
})
export class TarefaFormComponent implements OnInit {
  protected readonly Number = Number;
  // Form state
  modoAtual = signal<'create' | 'edit'>('create');
  tarefaId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Form fields - ordem conforme CORRECAO.MD:
  // 1. Título, 2. Descrição, 3. Tipo + Data Entrega, 4. Responsável, 5. Projeto (opcional), 6. Chamados
  titulo = signal('');
  descricao = signal('');
  tipo = signal(0);
  dataEntrega = signal<string>('');
  responsavelIds = signal<string[]>([]);
  projetoId = signal<number | null>(null);
  chamadoIds = signal<number[]>([]);

  // Campos extras (seção "Mais opções" ou edit)
  etapaId = signal<number | null>(null);
  /** Etapa FIXA do projeto (card de 9 etapas; alimenta o contador dinâmico). */
  projetoEtapaId = signal<number | null>(null);
  colunaKanbanId = signal<number | null>(null);
  prioridade = signal(1);
  ordem = signal(0);
  dataPrevisao = signal<string>('');
  dataConclusao = signal<string>('');
  horasEstimadas = signal<number | null>(null);
  horasRealizadas = signal<number | null>(null);
  bloqueada = signal(false);
  motivoBloqueio = signal('');
  chamadoLegadoId = signal<number | null>(null);
  status = signal<string>('AFazer');

  // Lookups
  projetos = signal<{ id: number; codigo: string; nome: string }[]>([]);
  etapas = signal<{ id: number; nome: string }[]>([]);
  etapasFixas = signal<{ id: number; ordem: number; nome: string; estado: string }[]>([]);
  colunasKanban = signal<{ id: number; nome: string; cor: string }[]>([]);

  // Static options
  prioridades = [
    { value: 0, label: 'Baixa' },
    { value: 1, label: 'Média' },
    { value: 2, label: 'Alta' },
    { value: 3, label: 'Urgente' }
  ];

  statusOptions = [
    { value: 'Backlog', label: 'Backlog' },
    { value: 'AFazer', label: 'A Fazer' },
    { value: 'EmAndamento', label: 'Em Andamento' },
    { value: 'EmHomologacao', label: 'Em Homologação' },
    { value: 'Concluida', label: 'Concluída' },
    { value: 'Cancelada', label: 'Cancelada' }
  ];

  tipoOptions = [
    { value: 0, label: 'Feature' },
    { value: 1, label: 'Bug' }
  ];

  // Computed
  isEdit = computed(() => this.modoAtual() === 'edit');
  tituloPagina = computed(() => this.isEdit() ? 'Editar Tarefa' : 'Nova Tarefa');
  temProjeto = computed(() => this.projetoId() !== null);
  podeSalvar = computed(() =>
    this.titulo().trim().length >= 3 &&
    this.responsavelIds().length > 0 &&
    this.dataEntrega() !== '' &&
    this.tipo() >= 0 &&
    this.tipo() <= 1 &&
    this.prioridade() >= 0 &&
    this.prioridade() <= 3 &&
    (!this.temProjeto() || this.etapaId() !== null) &&
    (!this.bloqueada() || this.motivoBloqueio().trim().length > 0)
  );

  // Toast
  private toastTimeout: any = null;
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error' | 'info'>('info');

  // UI state
  maisOpcoesAbertas = signal(false);

  constructor(
    private readonly tarSvc: TarefasService,
    private readonly projSvc: ProjetosService,
    private readonly colSvc: ColunasKanbanService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    await this.carregarLookups();
    this.verificarModoEdicao();
  }

  private async carregarLookups(): Promise<void> {
    const [projetos, colunas] = await Promise.allSettled([
      this.projSvc.listar({}).toPromise(),
      this.colSvc.listar(false).toPromise()
    ]);

    this.projetos.set(
      projetos.status === 'fulfilled'
        ? (projetos.value ?? []).map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome }))
        : []
    );
    this.colunasKanban.set(
      colunas.status === 'fulfilled'
        ? (colunas.value ?? []).map(c => ({ id: c.id, nome: c.nome, cor: c.cor ?? '#94a3b8' }))
        : []
    );

    if ([projetos, colunas].some(r => r.status === 'rejected')) {
      this.error.set('Alguns dados auxiliares não puderam ser carregados. Verifique a conexão e tente novamente.');
    }
  }

  /** Carrega as etapas do fluxo do projeto (tipoProjeto) ou limpa se sem projeto. */
  private carregarEtapasFluxo(preservarEtapaId?: number | null): void {
    const pid = this.projetoId();
    if (pid == null) {
      this.etapas.set([]);
      this.etapaId.set(null);
      return;
    }
    this.projSvc.obter(pid).subscribe({
      next: (p) => {
        this.tarSvc.listarEtapas(p.tipoProjetoId).subscribe({
          next: (lista) => {
            const fluxo = (lista ?? []).map(e => ({ id: e.id, nome: e.nome }));
            // Preserva etapa salva mesmo fora do fluxo atual (ex.: fluxo mudou).
            if (preservarEtapaId != null && !fluxo.some(e => e.id === preservarEtapaId)) {
              this.tarSvc.listarEtapas().subscribe({
                next: (todas) => {
                  const achada = (todas ?? []).find(e => e.id === preservarEtapaId);
                  this.etapas.set(achada ? [...fluxo, { id: achada.id, nome: achada.nome }] : fluxo);
                  this.etapaId.set(preservarEtapaId);
                },
                error: () => { this.etapas.set(fluxo); this.etapaId.set(preservarEtapaId); }
              });
            } else {
              this.etapas.set(fluxo);
              this.etapaId.set(preservarEtapaId ?? null);
            }
          },
          error: () => { this.etapas.set([]); this.etapaId.set(preservarEtapaId ?? null); }
        });
      },
      error: () => { this.etapas.set([]); this.etapaId.set(preservarEtapaId ?? null); }
    });
  }

  private verificarModoEdicao(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoAtual.set('edit');
      this.tarefaId.set(Number(id));
      this.carregarTarefa(Number(id));
    } else {
      this.modoAtual.set('create');
      const projetoIdParam = this.route.snapshot.queryParamMap.get('projetoId');
      if (projetoIdParam) this.projetoId.set(Number(projetoIdParam));
      this.carregarEtapasFluxo();
      this.carregarEtapasFixas();
      // Pre-fill responsavel with logged user
      const operador = this.auth.getOperadorLogadoCompleto();
      if (operador) {
        this.responsavelIds.set([operador.id]);
      }
    }
  }

  private carregarTarefa(id: number): void {
    this.loading.set(true);
    this.tarSvc.obter(id).subscribe({
      next: (t) => {
        if (t) {
          this.preencherFormulario(t);
        } else {
          this.router.navigate(['/implantacao/tarefas']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/implantacao/tarefas']);
      }
    });
  }

  private preencherFormulario(t: TarefaDetalhe): void {
    this.titulo.set(t.titulo);
    this.descricao.set(t.descricao ?? '');
    this.tipo.set(t.tipo ?? 0);
    this.dataEntrega.set(this.formatarData(t.dataEntrega));
    this.responsavelIds.set(t.responsaveis?.map(r => r.operadorId) ?? []);
    this.projetoId.set(t.projetoId ?? null);
    this.carregarEtapasFluxo(t.etapaId ?? null);
    this.carregarEtapasFixas(t.projetoEtapaId ?? null);
    this.chamadoIds.set(t.chamados?.map(c => c.chamadoId) ?? []);
    this.etapaId.set(t.etapaId ?? null);
    this.projetoEtapaId.set(t.projetoEtapaId ?? null);
    this.colunaKanbanId.set(t.colunaKanbanId ?? null);
    this.prioridade.set(t.prioridade);
    this.ordem.set(t.ordem);
    this.dataPrevisao.set(this.formatarData(t.dataPrevisao));
    this.dataConclusao.set(this.formatarData(t.dataConclusao));
    this.horasEstimadas.set(t.horasEstimadas ?? null);
    this.horasRealizadas.set(t.horasRealizadas ?? null);
    this.bloqueada.set(t.bloqueada);
    this.motivoBloqueio.set(t.motivoBloqueio ?? '');
    this.chamadoLegadoId.set(t.chamadoLegadoId ?? null);
    this.status.set(t.status ?? 'AFazer');
  }

  private formatarData(valor?: string): string {
    if (!valor) return '';
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '' : data.toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (!this.podeSalvar()) {
      this.error.set('Preencha os campos obrigatórios: Título, Responsável, Data de Entrega, Etapa (quando há projeto), Prioridade válida e motivo do bloqueio, quando aplicável.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.atualizarTarefa();
    } else {
      this.criarTarefa();
    }
  }

  private criarTarefa(): void {
    let req: TarefaCriarRequest;
    try {
      req = this.buildRequest() as TarefaCriarRequest;
    } catch {
      this.saving.set(false);
      this.error.set('Preencha os campos obrigatórios.');
      return;
    }
    this.tarSvc.criar(req).pipe(
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: (t) => {
        this.preencherFormulario(t);
        this.modoAtual.set('edit');
        this.tarefaId.set(t.id);
        this.toastSucesso('Tarefa criada com sucesso');
        this.router.navigate(['/implantacao/tarefas', t.id, 'editar']);
      },
      error: (err) => {
        this.error.set(err.error?.mensagem || 'Erro ao criar tarefa');
      }
    });
  }

  private atualizarTarefa(): void {
    const id = this.tarefaId();
    if (!id) {
      this.saving.set(false);
      this.error.set('Tarefa inválida para atualização.');
      return;
    }

    let req: TarefaAtualizarRequest;
    try {
      req = this.buildRequest(true) as TarefaAtualizarRequest;
    } catch {
      this.saving.set(false);
      this.error.set('Preencha os campos obrigatórios.');
      return;
    }
    this.tarSvc.atualizar(id, req).pipe(
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: (t) => {
        this.preencherFormulario(t);
        this.toastSucesso('Tarefa atualizada com sucesso');
        this.router.navigate(['/implantacao/tarefas', t.id, 'editar']);
      },
      error: (err) => {
        this.error.set(err.error?.mensagem || 'Erro ao atualizar tarefa');
      }
    });
  }

  private buildRequest(isUpdate = false): TarefaCriarRequest | TarefaAtualizarRequest {
    const projetoId = this.projetoId(); // pode ser null (sem projeto)
    const responsavelPrincipal = this.responsavelIds().length > 0 ? this.responsavelIds()[0] : undefined;

    const dadosComuns = {
      titulo: this.titulo().trim(),
      descricao: this.descricao().trim() || undefined,
      projetoId: projetoId ?? undefined,
      etapaId: this.etapaId() ?? undefined,
      projetoEtapaId: this.projetoEtapaId() ?? undefined,
      colunaKanbanId: this.colunaKanbanId() ?? undefined,
      responsavelId: responsavelPrincipal,
      responsavelIds: this.responsavelIds().length > 0 ? this.responsavelIds() : undefined,
      prioridade: this.prioridade(),
      tipo: this.tipo(),
      ordem: this.ordem() ?? 0,
      dataPrevisao: this.dataPrevisao() || undefined,
      dataEntrega: this.dataEntrega() || undefined,
      horasEstimadas: this.horasEstimadas() ?? undefined,
      chamadoLegadoId: this.chamadoLegadoId() ?? undefined
    };

    if (isUpdate) {
      return {
        ...dadosComuns,
        status: this.status() || undefined,
        dataConclusao: this.dataConclusao() || undefined,
        horasRealizadas: this.horasRealizadas() ?? undefined,
        bloqueada: this.bloqueada(),
        motivoBloqueio: this.motivoBloqueio().trim() || undefined,
        usuarioAlteracao: this.auth.getOperadorLogado()
      };
    }

    return {
      ...dadosComuns,
      criadorId: this.auth.getOperadorLogado()
    };
  }

  cancelar(): void {
    if (this.isEdit()) {
      this.router.navigate(['/implantacao/tarefas']);
    } else {
      this.router.navigate(['/implantacao/tarefas']);
    }
  }

  aoMudarProjeto(valor: string | number | null): void {
    this.projetoId.set(valor === null || valor === '' || valor === 'sem-projeto' ? null : Number(valor));
    this.carregarEtapasFluxo();
    this.carregarEtapasFixas();
  }

  /** Carrega as 9 etapas fixas do projeto; default = etapa em andamento. */
  private carregarEtapasFixas(preservarId?: number | null): void {
    const pid = this.projetoId();
    if (pid == null) {
      this.etapasFixas.set([]);
      this.projetoEtapaId.set(null);
      return;
    }
    this.projSvc.obterEtapasProjeto(pid).subscribe({
      next: (lista) => {
        const fixas = (lista ?? [])
          .filter(e => e.id != null)
          .map(e => ({ id: e.id as number, ordem: e.ordem, nome: e.nome, estado: e.estado }));
        this.etapasFixas.set(fixas);
        if (preservarId != null && fixas.some(f => f.id === preservarId)) {
          this.projetoEtapaId.set(preservarId);
        } else {
          this.projetoEtapaId.set(
            fixas.find(f => f.estado === 'EmAndamento')?.id
            ?? fixas.find(f => f.estado !== 'Concluida')?.id
            ?? null);
        }
      },
      error: () => { this.etapasFixas.set([]); this.projetoEtapaId.set(preservarId ?? null); }
    });
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