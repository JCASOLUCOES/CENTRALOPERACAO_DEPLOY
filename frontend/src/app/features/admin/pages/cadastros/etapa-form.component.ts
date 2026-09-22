import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TiposProjetoService, EtapasService, TipoProjetoResumo, EtapaResumo, EtapaCriarRequest, EtapaAtualizarRequest } from '@features/implantacao/services/cadastros.service';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-etapa-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  styleUrl: './etapa-form.component.scss',
  template: `
    <div class="adm-page adm-form-page">
      <app-page-header
        [titulo]="titulo()"
        [descricao]="isEdit() ? 'Atualize as informações da etapa global.' : 'Crie uma nova etapa global para uso em projetos.'"
        icone="bi-flag-fill">
        <div actions class="adm-header__actions">
          <a [routerLink]="['../']" class="adm-btn adm-btn--ghost">
            <i class="bi bi-arrow-left"></i> Voltar
          </a>
        </div>
      </app-page-header>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>{{ isEdit() ? 'Carregando...' : 'Preparando formulário...' }}</p>
      </div>

      <form *ngIf="!loading()" (ngSubmit)="salvar()" class="adm-form" novalidate>
        <div class="adm-form__grid">

          <div class="adm-form__group">
            <label for="nome" class="adm-form__label">Nome <span class="required">*</span></label>
            <input
              type="text"
              id="nome"
              class="adm-form__input"
              [value]="nome()"
              (input)="nome.set($any($event.target).value)"
              required
              maxlength="100"
              placeholder="Ex: Levantamento de Requisitos"
            />
          </div>

          <div class="adm-form__group">
            <label for="ordem" class="adm-form__label">Ordem <span class="required">*</span></label>
            <input
              type="number"
              id="ordem"
              class="adm-form__input"
              [value]="ordem()"
              (input)="ordem.set(Number($any($event.target).value) || 0)"
              required
              min="0"
              max="999"
            />
            <span class="adm-form__hint">Define a ordem de exibição no fluxo.</span>
          </div>

          <div class="adm-form__group">
            <label for="tipoProjetoId" class="adm-form__label">Tipo de Projeto (opcional)</label>
            <select
              id="tipoProjetoId"
              class="adm-form__select"
              [value]="tipoProjetoId() ?? ''"
              (change)="tipoProjetoId.set($any($event.target).value ? Number($any($event.target).value) : null)"
            >
              <option value="">Global (todos os tipos)</option>
              <option *ngFor="let t of tiposProjeto()" [value]="t.id">{{ t.codigo }} — {{ t.nome }}</option>
            </select>
            <span class="adm-form__hint">Deixe vazio para etapa global. Selecione para restringir a um tipo específico.</span>
          </div>

          <div class="adm-form__group">
            <label for="cor" class="adm-form__label">Cor (hex)</label>
            <input
              type="color"
              id="cor"
              class="adm-form__input adm-form__input--color"
              [value]="cor()"
              (input)="cor.set($any($event.target).value)"
            />
            <span class="adm-form__hint">Cor para identificação visual no Kanban e timeline.</span>
          </div>

          <div class="adm-form__group adm-form__group--full">
            <label class="adm-form__label">Marcar como etapa de conclusão</label>
            <div class="adm-form__checkbox-group">
              <input
                type="checkbox"
                id="concluida"
                class="adm-form__checkbox"
                [checked]="concluida()"
                (change)="concluida.set($any($event.target).checked)"
              />
              <label for="concluida" class="adm-form__checkbox-label">Esta etapa representa a conclusão do projeto</label>
            </div>
          </div>

          <div class="adm-form__group adm-form__group--full" *ngIf="isEdit()">
            <label class="adm-form__label">Ativo</label>
            <div class="adm-form__checkbox-group">
              <input
                type="checkbox"
                id="ativo"
                class="adm-form__checkbox"
                [checked]="ativo()"
                (change)="ativo.set($any($event.target).checked)"
              />
              <label for="ativo" class="adm-form__checkbox-label">Etapa disponível para novos projetos</label>
            </div>
          </div>

        </div>

        <div *ngIf="error()" class="adm-alert adm-alert--danger">
          <i class="bi bi-exclamation-triangle-fill"></i>
          {{ error() }}
        </div>

        <div class="adm-form__actions">
          <a [routerLink]="['../']" class="adm-btn adm-btn--ghost">
            <i class="bi bi-x"></i> Cancelar
          </a>
          <button
            type="submit"
            class="adm-btn adm-btn--primary"
            [disabled]="saving() || !podeSalvar()">
            <i class="bi" [ngClass]="saving() ? 'bi-hourglass-split' : 'bi-check-lg'"></i>
            {{ saving() ? 'Salvando...' : (isEdit() ? 'Atualizar' : 'Criar') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class EtapaFormComponent implements OnInit {
  private readonly service = inject(EtapasService);
  private readonly tiposService = inject(TiposProjetoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly Number = Number;

  readonly modo = signal<'create' | 'edit'>('create');
  readonly etapaId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Form fields
  readonly nome = signal('');
  readonly ordem = signal(0);
  readonly tipoProjetoId = signal<number | null>(null);
  readonly cor = signal('#0f4c81');
  readonly concluida = signal(false);
  readonly ativo = signal(true);

  readonly tiposProjeto = signal<TipoProjetoResumo[]>([]);

  readonly isEdit = computed(() => this.modo() === 'edit');
  readonly titulo = computed(() => this.isEdit() ? 'Editar Etapa Global' : 'Nova Etapa Global');

  readonly podeSalvar = computed(() =>
    this.nome().trim().length >= 2 &&
    this.ordem() >= 0
  );

  async ngOnInit(): Promise<void> {
    await this.carregarTiposProjeto();
    await this.verificarModoEdicao();
  }

  private async carregarTiposProjeto(): Promise<void> {
    try {
      const data = await this.tiposService.listar(false).toPromise();
      this.tiposProjeto.set(data ?? []);
    } catch (e) {
      console.error('Erro ao carregar tipos de projeto:', e);
    }
  }

  private async verificarModoEdicao(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modo.set('edit');
      this.etapaId.set(Number(id));
      await this.carregarEtapa(Number(id));
    } else {
      this.modo.set('create');
      this.ativo.set(true);
      this.ordem.set(await this.proximaOrdem());
    }
  }

  private async proximaOrdem(): Promise<number> {
    try {
      const etapas = await this.service.listar(undefined, false).toPromise();
      const max = Math.max(0, ...(etapas ?? []).map(e => e.ordem));
      return max + 1;
    } catch {
      return 1;
    }
  }

  private async carregarEtapa(id: number): Promise<void> {
    this.loading.set(true);
    try {
      const etapa = await this.service.obter(id).toPromise();
      if (etapa) {
        this.nome.set(etapa.nome);
        this.ordem.set(etapa.ordem);
        this.tipoProjetoId.set(etapa.tipoProjetoId ?? null);
        this.cor.set(etapa.cor ?? '#0f4c81');
        this.concluida.set(etapa.concluida);
        this.ativo.set(etapa.ativa);
      } else {
        this.error.set('Etapa não encontrada.');
      }
    } catch (e) {
      console.error('Erro ao carregar etapa:', e);
      this.error.set('Erro ao carregar etapa.');
    } finally {
      this.loading.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (!this.podeSalvar()) return;
    this.saving.set(true);
    this.error.set(null);

    const usuario = this.auth.getOperadorLogado() || 'system';

    try {
      if (this.isEdit()) {
        const id = this.etapaId()!;
        const req: EtapaAtualizarRequest = {
          nome: this.nome().trim(),
          ordem: this.ordem(),
          tipoProjetoId: this.tipoProjetoId() ?? undefined,
          cor: this.cor() || undefined,
          concluida: this.concluida(),
          ativa: this.ativo(),
          usuarioAlteracao: usuario
        };
        await this.service.atualizar(id, req).toPromise();
      } else {
        const req: EtapaCriarRequest = {
          nome: this.nome().trim(),
          ordem: this.ordem(),
          tipoProjetoId: this.tipoProjetoId() ?? undefined,
          cor: this.cor() || undefined,
          usuarioInclusao: usuario
        };
        await this.service.criar(req).toPromise();
      }
      this.router.navigate(['/admin/cadastros/etapas']);
    } catch (e: any) {
      console.error('Erro ao salvar:', e);
      this.error.set(e.error?.mensagem || 'Erro ao salvar.');
    } finally {
      this.saving.set(false);
    }
  }
}