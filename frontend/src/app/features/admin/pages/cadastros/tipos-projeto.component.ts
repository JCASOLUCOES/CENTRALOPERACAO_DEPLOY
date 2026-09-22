import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TiposProjetoService, TipoProjetoResumo, TipoProjetoCriarRequest, TipoProjetoAtualizarRequest } from '@features/implantacao/services/cadastros.service';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-tipos-projeto',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  styleUrl: './tipos-projeto.component.scss',
  template: `
    <div class="adm-page">
      <app-page-header
        titulo="Tipos de Projeto"
        descricao="Gerencie os tipos de projeto disponíveis para implantação."
        icone="bi-tags">
        <div actions class="adm-header__actions">
          <a [routerLink]="['novo']" class="adm-btn adm-btn--primary">
            <i class="bi bi-plus-lg"></i> Novo Tipo
          </a>
        </div>
      </app-page-header>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>Carregando tipos de projeto...</p>
      </div>

      <div *ngIf="!loading() && tipos().length === 0" class="adm-empty">
        <i class="bi bi-tag"></i>
        <p>Nenhum tipo de projeto cadastrado.</p>
        <a [routerLink]="['novo']" class="adm-btn adm-btn--primary mt-2">
          <i class="bi bi-plus-lg"></i> Criar primeiro tipo
        </a>
      </div>

      <div *ngIf="!loading() && tipos().length > 0" class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Cliente Obrig.</th>
              <th>Ordem</th>
              <th>Ativo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of tipos()">
              <td><code>{{ t.codigo }}</code></td>
              <td>{{ t.nome }}</td>
              <td><span class="adm-badge" [class.adm-badge--ok]="t.clienteObrigatorio" [class.adm-badge--neutral]="!t.clienteObrigatorio">
                {{ t.clienteObrigatorio ? 'Sim' : 'Não' }}
              </span></td>
              <td>{{ t.ordem }}</td>
              <td><span class="adm-badge" [class.adm-badge--ok]="t.ativo" [class.adm-badge--muted]="!t.ativo">
                {{ t.ativo ? 'Sim' : 'Não' }}
              </span></td>
              <td>
                <div class="adm-actions">
                  <a [routerLink]="['editar', t.id]" class="adm-btn adm-btn--ghost adm-btn--sm" title="Editar">
                    <i class="bi bi-pencil"></i>
                  </a>
                  <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm adm-btn--danger" (click)="confirmarExclusao(t)" title="Excluir">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal de confirmação de exclusão -->
      <div *ngIf="excluirConfirmacao()" class="modal-overlay" (click)="cancelarExclusao()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Confirmar exclusão</h3>
          <p>Tem certeza que deseja excluir o tipo <strong>{{ excluirConfirmacao()?.nome }}</strong> ({{ excluirConfirmacao()?.codigo }})?</p>
          <p class="text-muted small">Esta ação não pode ser desfeita.</p>
          <div class="modal-actions">
            <button type="button" class="adm-btn adm-btn--ghost" (click)="cancelarExclusao()">Cancelar</button>
            <button type="button" class="adm-btn adm-btn--danger" (click)="excluir()" [disabled]="excluindo()">
              <i class="bi" [ngClass]="excluindo() ? 'bi-hourglass-split' : 'bi-trash'"></i>
              {{ excluindo() ? 'Excluindo...' : 'Excluir' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TiposProjetoComponent implements OnInit {
  private readonly service = inject(TiposProjetoService);
  private readonly auth = inject(AuthService);

  readonly tipos = signal<TipoProjetoResumo[]>([]);
  readonly loading = signal(true);
  readonly excluindo = signal(false);
  readonly excluirConfirmacao = signal<TipoProjetoResumo | null>(null);

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  async carregar(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.service.listar().toPromise();
      this.tipos.set(data ?? []);
    } catch (e) {
      console.error('Erro ao carregar tipos de projeto:', e);
    } finally {
      this.loading.set(false);
    }
  }

  confirmarExclusao(t: TipoProjetoResumo): void {
    this.excluirConfirmacao.set(t);
  }

  cancelarExclusao(): void {
    this.excluirConfirmacao.set(null);
  }

  async excluir(): Promise<void> {
    const t = this.excluirConfirmacao();
    if (!t) return;
    this.excluindo.set(true);
    try {
      await this.service.excluir(t.id).toPromise();
      this.tipos.update(arr => arr.filter(x => x.id !== t.id));
      this.cancelarExclusao();
    } catch (e) {
      console.error('Erro ao excluir:', e);
      alert('Erro ao excluir tipo de projeto. Verifique se não há projetos vinculados.');
    } finally {
      this.excluindo.set(false);
    }
  }
}