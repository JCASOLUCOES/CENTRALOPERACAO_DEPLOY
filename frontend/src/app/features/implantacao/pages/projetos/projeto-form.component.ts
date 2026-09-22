import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProjetosService } from '../../services/projetos.service';
import {
  ProjetoCriarRequest,
  ProjetoAtualizarRequest,
  ProjetoDetalhe,
  TipoProjetoResumo,
  ClienteResumo
} from '../../models/projeto.model';
import { OperadorResumo } from '@core/services/operadores.service';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-implantacao-projeto-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './projeto-form.component.html',
  styleUrl: './projeto-form.component.scss'
})
export class ProjetoFormComponent implements OnInit {
  protected readonly Number = Number;
  private readonly projSvc = inject(ProjetosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  // Form state
  modo = signal<'create' | 'edit'>('create');
  projetoId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Form fields
  codigo = signal('');
  nome = signal('');
  descricao = signal('');
  tipoProjetoId = signal<number | null>(null);
  clienteId = signal<number | null>(null);
  clienteLegadoId = signal<number | null>(null);
  responsavelId = signal<string>('');
  prioridade = signal(1);
  etapaInicialOrdem = signal(1);
  dataInicio = signal<string>('');
  dataPrevisao = signal<string>('');
  dataConclusao = signal<string>('');
  dataGoLivePrevista = signal<string>('');
  dataGoLiveReal = signal<string>('');
  horasPlanejadas = signal<number | null>(null);
  horasRealizadas = signal<number | null>(null);
  observacao = signal('');

  // Lookups
  tiposProjeto = signal<TipoProjetoResumo[]>([]);
  clientes = signal<ClienteResumo[]>([]);
  operadores = signal<OperadorResumo[]>([]);
  etapasPadrao = signal<{ ordem: number; nome: string }[]>([]);
  proximoCodigo = signal<string>('');

  // Computed
  isEdit = computed(() => this.modo() === 'edit');
  titulo = computed(() => this.isEdit() ? 'Editar Projeto' : 'Novo Projeto');
  podeSalvar = computed(() =>
    this.nome().trim().length >= 3 &&
    this.tipoProjetoId() !== null &&
    this.responsavelId().trim() !== ''
  );

  async ngOnInit(): Promise<void> {
    await this.carregarLookups();
    this.verificarModoEdicao();
  }

  private async carregarLookups(): Promise<void> {
    const [tipos, clientes, operadores, etapas, codigo] = await Promise.allSettled([
      this.projSvc.listarTipos().toPromise(),
      this.projSvc.listarClientes().toPromise(),
      this.projSvc.listarOperadores().toPromise(),
      this.projSvc.listarEtapasPadrao().toPromise(),
      this.projSvc.obterProximoCodigo().toPromise()
    ]);

    this.tiposProjeto.set(tipos.status === 'fulfilled' ? tipos.value ?? [] : []);
    this.clientes.set(clientes.status === 'fulfilled' ? clientes.value ?? [] : []);
    this.operadores.set(operadores.status === 'fulfilled' ? operadores.value ?? [] : []);
    this.etapasPadrao.set(etapas.status === 'fulfilled' ? etapas.value ?? [] : []);

    const proximo = codigo.status === 'fulfilled' ? codigo.value?.trim() : '';
    this.proximoCodigo.set(proximo ? proximo : '');

    if ([tipos, clientes, operadores, etapas, codigo].some(r => r.status === 'rejected')) {
      this.error.set('Alguns dados auxiliares não puderam ser carregados. Verifique a conexão e tente novamente.');
    }
  }

  /** Seleção de cliente: preenche automaticamente o ID legado (tbcliente.CLIENTE_ID). */
  onClienteChange(valor: number | null | ''): void {
    const id = valor === null || valor === '' ? null : Number(valor);
    this.clienteId.set(id);
    this.clienteLegadoId.set(id);
  }

  private verificarModoEdicao(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modo.set('edit');
      this.projetoId.set(Number(id));
      this.carregarProjeto(Number(id));
    } else {
      this.modo.set('create');
      this.codigo.set(this.proximoCodigo());
      if (!this.responsavelId()) {
        this.responsavelId.set(this.auth.getOperadorLogado());
      }
    }
  }

  private carregarProjeto(id: number): void {
    this.loading.set(true);
    this.projSvc.obter(id).subscribe({
      next: (p) => {
        if (p) {
          this.preencherFormulario(p);
        } else {
          this.router.navigate(['/implantacao/projetos']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/implantacao/projetos']);
      }
    });
  }

  private preencherFormulario(p: ProjetoDetalhe): void {
    this.codigo.set(p.codigo);
    this.nome.set(p.nome);
    this.descricao.set(p.descricao ?? '');
    this.tipoProjetoId.set(p.tipoProjetoId);
    this.clienteId.set(p.clienteId ?? null);
    this.clienteLegadoId.set(p.clienteLegadoId ?? p.clienteId ?? null);
    this.responsavelId.set(p.responsavelId ?? '');
    this.prioridade.set(p.prioridade);
    this.dataInicio.set(this.formatarData(p.dataInicio));
    this.dataPrevisao.set(this.formatarData(p.dataPrevisao));
    this.dataConclusao.set(this.formatarData(p.dataConclusao));
    this.dataGoLivePrevista.set(this.formatarData(p.dataGoLivePrevista));
    this.dataGoLiveReal.set(this.formatarData(p.dataGoLiveReal));
    this.horasPlanejadas.set(p.horasPlanejadas ?? null);
    this.horasRealizadas.set(p.horasRealizadas ?? null);
    this.observacao.set(p.observacao ?? '');
  }

  private formatarData(valor?: string): string {
    if (!valor) return '';
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '' : data.toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (!this.podeSalvar()) {
      this.error.set('Preencha os campos obrigatórios: Nome, Tipo de Projeto, Responsável');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.atualizarProjeto();
    } else {
      this.criarProjeto();
    }
  }

  private criarProjeto(): void {
    let req: ProjetoCriarRequest;
    try {
      req = this.buildRequest() as ProjetoCriarRequest;
    } catch {
      this.saving.set(false);
      this.error.set('Preencha os campos obrigatórios: Nome, Tipo de Projeto, Responsável');
      return;
    }
    this.projSvc.criar(req).subscribe({
      next: (p) => {
        this.toastSucesso('Projeto criado com sucesso');
        this.router.navigate(['/implantacao/projetos', p.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.mensagem || 'Erro ao criar projeto');
      }
    });
  }

  private atualizarProjeto(): void {
    const id = this.projetoId();
    if (!id) {
      this.saving.set(false);
      this.error.set('Projeto inválido para atualização.');
      return;
    }

    const req = this.buildRequest(true) as ProjetoAtualizarRequest;
    this.projSvc.atualizar(id, req).subscribe({
      next: (p) => {
        this.toastSucesso('Projeto atualizado com sucesso');
        this.router.navigate(['/implantacao/projetos', p.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.mensagem || 'Erro ao atualizar projeto');
      }
    });
  }

  private buildRequest(isUpdate = false): ProjetoCriarRequest | ProjetoAtualizarRequest {
    const tipoProjetoId = this.tipoProjetoId();
    if (tipoProjetoId === null) {
      throw new Error('Tipo de projeto é obrigatório.');
    }

    const base = {
      nome: this.nome().trim(),
      descricao: this.descricao().trim() || undefined,
      tipoProjetoId,
      clienteId: this.clienteId() ?? undefined,
      clienteLegadoId: this.clienteLegadoId() ?? undefined,
      responsavelId: this.responsavelId().trim() || undefined,
      prioridade: this.prioridade(),
      dataInicio: this.dataInicio() || undefined,
      dataPrevisao: this.dataPrevisao() || undefined,
      dataGoLivePrevista: this.dataGoLivePrevista() || undefined,
      horasPlanejadas: this.horasPlanejadas() ?? undefined,
      observacao: this.observacao().trim() || undefined
    };

    if (isUpdate) {
      return {
        ...base,
        dataConclusao: this.dataConclusao() || undefined,
        dataGoLiveReal: this.dataGoLiveReal() || undefined,
        horasRealizadas: this.horasRealizadas() ?? undefined,
        criadorId: this.auth.getOperadorLogado(),
        usuarioAlteracao: this.auth.getOperadorLogado()
      };
    }

    return {
      ...base,
      criadorId: this.auth.getOperadorLogado(),
      etapaInicialOrdem: this.etapaInicialOrdem()
    };
  }

  cancelar(): void {
    if (this.isEdit()) {
      this.router.navigate(['/implantacao/projetos', this.projetoId()]);
    } else {
      this.router.navigate(['/implantacao/projetos']);
    }
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