import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TiposProjetoService, TipoProjetoResumo, TipoProjetoCriarRequest, TipoProjetoAtualizarRequest } from '@features/implantacao/services/cadastros.service';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-tipo-projeto-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  styleUrl: './tipo-projeto-form.component.scss',
  template: `
    <div class="adm-page adm-form-page">
      <app-page-header
        [titulo]="titulo()"
        [descricao]="isEdit() ? 'Atualize as informações do tipo de projeto.' : 'Crie um novo tipo de projeto para implantação.'"
        icone="bi-tag">
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
            <label for="codigo" class="adm-form__label">Código <span class="required">*</span></label>
            <input
              type="text"
              id="codigo"
              class="adm-form__input"
              [value]="codigo()"
              (input)="codigo.set($any($event.target).value.toUpperCase())"
              [disabled]="isEdit()"
              [class.adm-form__input--disabled]="isEdit()"
              required
              maxlength="10"
              placeholder="Ex: CLIENTE"
            />
            <span class="adm-form__hint" *ngIf="isEdit()">Código não pode ser alterado após criação.</span>
          </div>

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
              placeholder="Ex: Implantação Cliente"
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
            <span class="adm-form__hint">Define a ordem de exibição nas listagens.</span>
          </div>

          <div class="adm-form__group">
            <label class="adm-form__label">Cliente Obrigatório</label>
            <div class="adm-form__checkbox-group">
              <input
                type="checkbox"
                id="clienteObrigatorio"
                class="adm-form__checkbox"
                [checked]="clienteObrigatorio()"
                (change)="clienteObrigatorio.set($any($event.target).checked)"
              />
              <label for="clienteObrigatorio" class="adm-form__checkbox-label">Este tipo exige cliente vinculado</label>
            </div>
          </div>

          <div class="adm-form__group" *ngIf="isEdit()">
            <label class="adm-form__label">Ativo</label>
            <div class="adm-form__checkbox-group">
              <input
                type="checkbox"
                id="ativo"
                class="adm-form__checkbox"
                [checked]="ativo()"
                (change)="ativo.set($any($event.target).checked)"
              />
              <label for="ativo" class="adm-form__checkbox-label">Tipo disponível para novos projetos</label>
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
export class TipoProjetoFormComponent implements OnInit {
  private readonly service = inject(TiposProjetoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly Number = Number;

  readonly modo = signal<'create' | 'edit'>('create');
  readonly projetoId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Form fields
  readonly codigo = signal('');
  readonly nome = signal('');
  readonly ordem = signal(0);
  readonly clienteObrigatorio = signal(false);
  readonly ativo = signal(true);

  readonly isEdit = computed(() => this.modo() === 'edit');
  readonly titulo = computed(() => this.isEdit() ? 'Editar Tipo de Projeto' : 'Novo Tipo de Projeto');

  readonly podeSalvar = computed(() =>
    this.nome().trim().length >= 2 &&
    this.codigo().trim().length >= 2 &&
    this.ordem() >= 0
  );

  async ngOnInit(): Promise<void> {
    await this.verificarModoEdicao();
  }

  private async verificarModoEdicao(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modo.set('edit');
      this.projetoId.set(Number(id));
      await this.carregarTipo(Number(id));
    } else {
      this.modo.set('create');
      this.ativo.set(true);
      this.ordem.set(await this.proximaOrdem());
    }
  }

  private async proximaOrdem(): Promise<number> {
    try {
      const tipos = await this.service.listar(false).toPromise();
      const max = Math.max(0, ...(tipos ?? []).map(t => t.ordem));
      return max + 1;
    } catch {
      return 1;
    }
  }

  private async carregarTipo(id: number): Promise<void> {
    this.loading.set(true);
    try {
      const tipo = await this.service.obter(id).toPromise();
      if (tipo) {
        this.codigo.set(tipo.codigo);
        this.nome.set(tipo.nome);
        this.ordem.set(tipo.ordem);
        this.clienteObrigatorio.set(tipo.clienteObrigatorio);
        this.ativo.set(tipo.ativo);
      } else {
        this.error.set('Tipo de projeto não encontrado.');
      }
    } catch (e) {
      console.error('Erro ao carregar tipo:', e);
      this.error.set('Erro ao carregar tipo de projeto.');
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
        const id = this.projetoId()!;
        const req: TipoProjetoAtualizarRequest = {
          nome: this.nome().trim(),
          ordem: this.ordem(),
          clienteObrigatorio: this.clienteObrigatorio(),
          ativo: this.ativo(),
          usuarioAlteracao: usuario
        };
        await this.service.atualizar(id, req).toPromise();
      } else {
        const req: TipoProjetoCriarRequest = {
          codigo: this.codigo().trim().toUpperCase(),
          nome: this.nome().trim(),
          ordem: this.ordem(),
          clienteObrigatorio: this.clienteObrigatorio(),
          usuarioInclusao: usuario
        };
        await this.service.criar(req).toPromise();
      }
      this.router.navigate(['/admin/cadastros/tipos-projeto']);
    } catch (e: any) {
      console.error('Erro ao salvar:', e);
      this.error.set(e.error?.mensagem || 'Erro ao salvar. Verifique se o código já existe.');
    } finally {
      this.saving.set(false);
    }
  }
}