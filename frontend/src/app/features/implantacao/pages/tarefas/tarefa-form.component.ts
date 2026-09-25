import { Component, OnInit, OnDestroy, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

interface EtapaOpcao {
  id: number;
  ordem: number;
  nome: string;
  estado: string;
}

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
export class TarefaFormComponent implements OnInit, OnDestroy {
  protected readonly Number = Number;
  // Form state
  modoAtual = signal<'create' | 'edit'>('create');
  tarefaId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  etapasLoading = signal(false);
  etapasError = signal<string | null>(null);
  etapasVazia = signal(false);

  // Form fields - ordem conforme CORRECAO.MD:
  // 1. Título, 2. Descrição, 3. Tipo + Data Entrega, 4. Responsável, 5. Projeto (opcional), 6. Chamados
  titulo = signal('');
  descricao = signal('');
  tipo = signal(0);
  dataEntrega = signal<string>('');
  responsavelIds = signal<string[]>([]);
  projetoId = signal<number | null>(null);
  chamadoIds = signal<number[]>([]);

  /** Etapa FIXA do projeto (card de 9 etapas; alimenta o contador dinâmico). */
  projetoEtapaId = signal<number | null>(null);
  colunaKanbanId = signal<number | null>(null);
  prioridade = signal(1);
  ordem = signal(0);
  dataPrevisao = signal<string>('');
  dataConclusao = signal<string>('');
  horasEstimadas = signal<number | null>(null);
  bloqueada = signal(false);
  motivoBloqueio = signal('');
  chamadoLegadoId = signal<number | null>(null);

  // Lookups
  projetos = signal<{ id: number; codigo: string; nome: string }[]>([]);
  etapasFixas = signal<EtapaOpcao[]>([]);
  colunasKanban = signal<{ id: number; nome: string; cor: string }[]>([]);

  // Static options
  prioridades = [
    { value: 0, label: 'Baixa' },
    { value: 1, label: 'Média' },
    { value: 2, label: 'Alta' },
    { value: 3, label: 'Urgente' }
  ];

  tipoOptions = [
    { value: 0, label: 'Feature' },
    { value: 1, label: 'Bug' }
  ];

  // Computed
  isEdit = computed(() => this.modoAtual() === 'edit');
  tituloPagina = computed(() => this.isEdit() ? 'Editar Tarefa' : 'Nova Tarefa');
  temProjeto = computed(() => this.projetoId() !== null);
  podeSalvar = computed(() => {
    const etapaId = this.projetoEtapaId();
    const etapaValida = !this.temProjeto() || (
      !this.etapasLoading() &&
      this.etapasError() === null &&
      etapaId !== null &&
      this.etapasFixas().some(etapa => etapa.id === etapaId)
    );

    return this.titulo().trim().length >= 3 &&
      this.responsavelIds().length > 0 &&
      this.dataEntrega() !== '' &&
      this.tipo() >= 0 &&
      this.tipo() <= 1 &&
      this.prioridade() >= 0 &&
      this.prioridade() <= 3 &&
      etapaValida &&
      (!this.bloqueada() || this.motivoBloqueio().trim().length > 0);
  });

  readonly placeholderEtapa = computed(() => {
    if (this.etapasLoading()) return 'Carregando etapas...';
    if (this.etapasError()) return 'Etapas indisponíveis';
    if (!this.temProjeto()) return this.isEdit() ? 'Tarefa sem projeto' : 'Selecione um projeto primeiro';
    return 'Selecione a etapa...';
  });

  readonly mensagemEtapa = computed<string | null>(() => {
    if (this.etapasLoading()) return 'Carregando etapas do projeto selecionado...';
    if (this.etapasError()) return this.etapasError();
    if (this.etapasVazia()) return 'Nenhuma etapa cadastrada para este projeto.';
    if (!this.temProjeto()) {
      return this.isEdit()
        ? 'Esta tarefa não está vinculada a um projeto.'
        : 'Selecione um projeto para carregar e escolher uma etapa válida.';
    }
    return null;
  });

  readonly mensagemEtapaPapel = computed(() => (this.etapasError() ? 'alert' : 'status'));

  readonly podeTentarEtapas = computed(() =>
    this.temProjeto() && this.etapasError() !== null && !this.etapasLoading()
  );

  private etapasRequestSequence = 0;
  private readonly destroyRef = inject(DestroyRef);

  // Toast
  private toastTimeout: any = null;
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error' | 'info'>('info');

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

  ngOnDestroy(): void {
    clearTimeout(this.toastTimeout);
    this.toastTimeout = null;
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

  private verificarModoEdicao(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoAtual.set('edit');
      this.tarefaId.set(Number(id));
      this.carregarTarefa(Number(id));
      return;
    }

    this.modoAtual.set('create');
    const projetoIdParam = this.route.snapshot.queryParamMap.get('projetoId');
    if (projetoIdParam) this.projetoId.set(Number(projetoIdParam));

    const tarefaIdParam = this.route.snapshot.queryParamMap.get('tarefaId');
    if (tarefaIdParam) {
      this.carregarTarefa(Number(tarefaIdParam));
      return;
    }

    this.carregarEtapasFixas();
    const operador = this.auth.getOperadorLogadoCompleto();
    if (operador) {
      this.responsavelIds.set([operador.id]);
    }
  }

  private carregarTarefa(id: number): void {
    this.loading.set(true);
    this.tarSvc.obter(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const projetoAnterior = this.projetoId();
    const projetoCarregado = t.projetoId ?? null;
    const etapaPreservada = t.projetoEtapaId ?? null;

    this.titulo.set(t.titulo);
    this.descricao.set(t.descricao ?? '');
    this.tipo.set(t.tipo ?? 0);
    this.dataEntrega.set(this.formatarData(t.dataEntrega));
    this.responsavelIds.set(t.responsaveis?.map(r => r.operadorId) ?? []);
    this.projetoId.set(projetoCarregado);
    if (projetoAnterior !== projetoCarregado || !this.reaproveitarEtapasCarregadas(etapaPreservada)) {
      this.carregarEtapasFixas(etapaPreservada);
    }
    this.chamadoIds.set(t.chamados?.map(c => c.chamadoId) ?? []);
    this.colunaKanbanId.set(t.colunaKanbanId ?? null);
    this.prioridade.set(t.prioridade);
    this.ordem.set(t.ordem);
    this.dataPrevisao.set(this.formatarData(t.dataPrevisao));
    this.dataConclusao.set(this.formatarData(t.dataConclusao));
    this.horasEstimadas.set(t.horasEstimadas ?? null);
    this.bloqueada.set(t.bloqueada);
    this.motivoBloqueio.set(t.motivoBloqueio ?? '');
    this.chamadoLegadoId.set(t.chamadoLegadoId ?? null);
  }

  private formatarData(valor?: string): string {
    if (!valor) return '';
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '' : data.toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (!this.podeSalvar()) {
      this.error.set('Preencha os campos obrigatórios: Título, Responsável, Data de Entrega, Etapa do projeto (quando há projeto), Prioridade válida e motivo do bloqueio, quando aplicável.');
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
      next: () => {
        this.router.navigate(['/implantacao/tarefas'], {
          state: { mensagem: 'Tarefa criada com sucesso' }
        });
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
      chamadoLegadoId: this.chamadoLegadoId() ?? undefined,
      chamadoIds: this.chamadoIds()
    };

    if (isUpdate) {
      return {
        ...dadosComuns,
        dataConclusao: this.dataConclusao() || undefined,
        bloqueada: this.bloqueada(),
        motivoBloqueio: this.motivoBloqueio().trim() || undefined,
        usuarioAlteracao: this.auth.getOperadorLogado()
      };
    }

    return {
      ...dadosComuns,
      projetoId: projetoId ?? undefined,
      dataConclusao: this.dataConclusao() || undefined,
      bloqueada: this.bloqueada(),
      motivoBloqueio: this.motivoBloqueio().trim() || undefined,
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
    this.carregarEtapasFixas();
  }

  aoMudarEtapa(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.projetoEtapaId.set(valor === '' ? null : Number(valor));
  }

  tentarNovamenteEtapas(): void {
    if (this.projetoId() == null) return;
    this.carregarEtapasFixas(this.projetoEtapaId());
  }

  private reaproveitarEtapasCarregadas(preservarId: number | null): boolean {
    const fixas = this.etapasFixas();
    if (fixas.length === 0) return this.etapasVazia();

    this.projetoEtapaId.set(this.escolherEtapaPadrao(fixas, preservarId));
    return true;
  }

  private escolherEtapaPadrao(fixas: EtapaOpcao[], preservarId: number | null): number | null {
    if (preservarId != null && fixas.some(f => f.id === preservarId)) return preservarId;

    return fixas.find(f => f.estado === 'EmAndamento')?.id
      ?? fixas.find(f => f.estado !== 'Concluida')?.id
      ?? fixas[0]?.id
      ?? null;
  }

  /** Carrega as 9 etapas fixas do projeto; default = etapa em andamento. */
  private carregarEtapasFixas(preservarId?: number | null): void {
    const requestSequence = ++this.etapasRequestSequence;
    const pid = this.projetoId();

    this.etapasFixas.set([]);
    this.projetoEtapaId.set(null);
    this.etapasLoading.set(false);
    this.etapasError.set(null);
    this.etapasVazia.set(false);

    if (pid == null) return;

    this.etapasLoading.set(true);
    this.projSvc.obterEtapasProjeto(pid).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (lista) => {
        if (requestSequence !== this.etapasRequestSequence || pid !== this.projetoId()) return;

        const fixas = (lista ?? [])
          .filter(e => e.id != null)
          .map(e => ({ id: e.id as number, ordem: e.ordem, nome: e.nome, estado: e.estado }));

        this.etapasFixas.set(fixas);
        this.etapasLoading.set(false);
        this.etapasVazia.set(fixas.length === 0);
        this.projetoEtapaId.set(fixas.length === 0 ? null : this.escolherEtapaPadrao(fixas, preservarId ?? null));
      },
      error: () => {
        if (requestSequence !== this.etapasRequestSequence || pid !== this.projetoId()) return;

        this.etapasFixas.set([]);
        this.projetoEtapaId.set(null);
        this.etapasLoading.set(false);
        this.etapasVazia.set(false);
        this.etapasError.set('Não foi possível carregar as etapas do projeto.');
      }
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