import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TiposProjetoService, EtapasService, TipoProjetoResumo, EtapaResumo, EtapaCriarRequest, EtapaAtualizarRequest } from '@features/implantacao/services/cadastros.service';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-etapas',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  styleUrl: './etapas.component.scss',
  template: `
    <div class="adm-page">
      <app-page-header
        titulo="Etapas Globais"
        descricao="Gerencie as etapas globais que podem ser usadas em qualquer tipo de projeto."
        icone="bi-flag-fill">
        <div actions class="adm-header__actions">
          <a [routerLink]="['novo']" class="adm-btn adm-btn--primary">
            <i class="bi bi-plus-lg"></i> Nova Etapa
          </a>
        </div>
      </app-page-header>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>Carregando etapas...</p>
      </div>

      <div *ngIf="!loading() && etapas().length === 0" class="adm-empty">
        <i class="bi bi-flag"></i>
        <p>Nenhuma etapa global cadastrada.</p>
        <a [routerLink]="['novo']" class="adm-btn adm-btn--primary mt-2">
          <i class="bi bi-plus-lg"></i> Criar primeira etapa
        </a>
      </div>

      <div *ngIf="!loading() && etapas().length > 0" class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ordem</th>
              <th>Tipo Projeto</th>
              <th>Cor</th>
              <th>Concluída</th>
              <th>Ativa</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of etapas()">
              <td><strong>{{ e.nome }}</strong></td>
              <td>{{ e.ordem }}</td>
              <td>
                <span *ngIf="e.tipoProjetoId; else semTipo" class="adm-badge adm-badge--neutral">
                  {{ getTipoProjetoNome(e.tipoProjetoId) }}
                </span>
                <ng-template #semTipo>
                  <span class="text-muted">Global</span>
                </ng-template>
              </td>
              <td>
                <span *ngIf="e.cor" class="color-badge" [style.background]="e.cor"></span>
                <span *ngIf="!e.cor" class="text-muted">—</span>
              </td>
              <td><span class="adm-badge" [class.adm-badge--ok]="e.concluida" [class.adm-badge--muted]="!e.concluida">
                {{ e.concluida ? 'Sim' : 'Não' }}
              </span></td>
              <td><span class="adm-badge" [class.adm-badge--ok]="e.ativa" [class.adm-badge--muted]="!e.ativa">
                {{ e.ativa ? 'Sim' : 'Não' }}
              </span></td>
              <td>
                <div class="adm-actions">
                  <a [routerLink]="['editar', e.id]" class="adm-btn adm-btn--ghost adm-btn--sm" title="Editar">
                    <i class="bi bi-pencil"></i>
                  </a>
                  <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm adm-btn--danger" (click)="confirmarExclusao(e)" title="Excluir">
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
          <p>Tem certeza que deseja excluir a etapa <strong>{{ excluirConfirmacao()?.nome }}</strong>?</p>
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
export class EtapasComponent implements OnInit {
  private readonly service = inject(EtapasService);
  private readonly tiposService = inject(TiposProjetoService);
  private readonly auth = inject(AuthService);

  readonly etapas = signal<EtapaResumo[]>([]);
  readonly tiposProjeto = signal<TipoProjetoResumo[]>([]);
  readonly loading = signal(true);
  readonly excluindo = signal(false);
  readonly excluirConfirmacao = signal<EtapaResumo | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.carregarEtapas(), this.carregarTiposProjeto()]);
  }

  async carregarEtapas(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.service.listar(undefined, false).toPromise();
      this.etapas.set(data ?? []);
    } catch (e) {
      console.error('Erro ao carregar etapas:', e);
    } finally {
      this.loading.set(false);
    }
  }

  async carregarTiposProjeto(): Promise<void> {
    try {
      const data = await this.tiposService.listar(false).toPromise();
      this.tiposProjeto.set(data ?? []);
    } catch (e) {
      console.error('Erro ao carregar tipos de projeto:', e);
    }
  }

  getTipoProjetoNome(id: number): string {
    return this.tiposProjeto().find(t => t.id === id)?.nome ?? `ID ${id}`;
  }

  confirmarExclusao(e: EtapaResumo): void {
    this.excluirConfirmacao.set(e);
  }

  cancelarExclusao(): void {
    this.excluirConfirmacao.set(null);
  }

  async excluir(): Promise<void> {
    const e = this.excluirConfirmacao();
    if (!e) return;
    this.excluindo.set(true);
    try {
      await this.service.excluir(e.id).toPromise();
      this.etapas.update(arr => arr.filter(x => x.id !== e.id));
      this.cancelarExclusao();
    } catch (e) {
      console.error('Erro ao excluir:', e);
      alert('Erro ao excluir etapa. Verifique se não há projetos usando esta etapa.');
    } finally {
      this.excluindo.set(false);
    }
  }
}