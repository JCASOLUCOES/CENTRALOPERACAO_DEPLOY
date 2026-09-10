import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Trigger } from '../models/database.model';

@Component({
  selector: 'app-db-trigger-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="modal-header">
  <h5 class="modal-title">
    <i class="bi bi-lightning-charge-fill"></i>
    {{ trigger.nome }}
    <small class="text-muted ms-2" style="font-weight: 400; font-size: 0.85rem;">{{ trigger.tabela }}</small>
  </h5>
  <button type="button" class="btn-close" aria-label="Fechar" (click)="fechar()"></button>
</div>
<div class="modal-body">

  <div class="row g-3 mb-3">
    <div class="col-md-4">
      <label class="form-label small text-muted">Tabela</label>
      <div class="fw-medium">{{ trigger.tabela }}</div>
    </div>
    <div class="col-md-4">
      <label class="form-label small text-muted">Evento</label>
      <span class="badge bg-info">{{ trigger.evento }}</span>
    </div>
    <div class="col-md-4">
      <label class="form-label small text-muted">Momento</label>
      <span class="badge bg-secondary">{{ trigger.momento }}</span>
    </div>
  </div>

  <div class="row g-3 mb-3" *ngIf="trigger.schema">
    <div class="col-md-6">
      <label class="form-label small text-muted">Schema</label>
      <div class="fw-medium">{{ trigger.schema }}</div>
    </div>
    <div class="col-md-6">
      <label class="form-label small text-muted">Schema da Tabela</label>
      <div class="fw-medium">{{ trigger.tabela }}</div>
    </div>
  </div>

  <h6 class="db-trigger-modal__titulo"><i class="bi bi-list-check"></i> Ações / Tabelas Afetadas</h6>
  <div *ngIf="trigger.acoes && trigger.acoes.length > 0" class="adm-table-wrap">
    <table class="adm-table">
      <thead>
        <tr><th>#</th><th>Ação</th><th>Tabelas Afetadas</th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let a of trigger.acoes; let i = index">
          <td>{{ i + 1 }}</td>
          <td><code>{{ a }}</code></td>
          <td>
            <ng-container *ngIf="trigger.tabelasAfetadas && trigger.tabelasAfetadas.length > 0">
              <span class="badge bg-light text-dark me-1" *ngFor="let c of trigger.tabelasAfetadas">{{ c }}</span>
            </ng-container>
            <span *ngIf="!trigger.tabelasAfetadas || trigger.tabelasAfetadas.length === 0" class="text-muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div *ngIf="!trigger.acoes || trigger.acoes.length === 0" class="db-trigger-modal__vazio">
    <i class="bi bi-info-circle"></i> Informação de ações/tabelas não disponível via metadados padrão.
  </div>

  <h6 class="db-trigger-modal__titulo"><i class="bi bi-file-earmark-code"></i> Código da Trigger (definition)</h6>
  <pre *ngIf="trigger.corpo" class="db-code db-code--corpo">{{ trigger.corpo }}</pre>
  <div *ngIf="!trigger.corpo" class="db-trigger-modal__vazio">
    <i class="bi bi-info-circle"></i> Corpo não disponível (trigger criptografada ou assembly CLR).
  </div>

</div>
<div class="modal-footer">
  <button type="button" class="btn btn-light" (click)="fechar()">Fechar</button>
</div>
  `,
  styles: [`
    .db-trigger-modal__titulo {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #475569;
      margin: 0.75rem 0 0.5rem;
    }
    .db-trigger-modal__vazio {
      padding: 0.75rem 1rem;
      background: #f8fafc; color: #64748b;
      border-radius: 0.4rem; font-size: 0.88rem;
    }
    .db-code {
      background: #0f172a; color: #e2e8f0;
      padding: 0.75rem 1rem; border-radius: 0.4rem;
      font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
      font-size: 0.78rem; line-height: 1.45;
      max-height: 50vh; overflow: auto;
      white-space: pre-wrap; word-break: break-word;
      margin: 0;
    }
    .db-code--corpo { max-height: 50vh; }
    .adm-table-wrap {
      border-radius: 0.4rem;
      overflow: hidden;
      border: 1px solid var(--adm-border, #e2e8f0);
    }
    .adm-table {
      width: 100%;
      margin: 0;
      font-size: 0.82rem;
    }
    .adm-table th {
      background: var(--adm-table-th-bg, #f8fafc);
      color: var(--adm-text-muted, #6c757d);
      font-weight: 600;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--adm-border, #e2e8f0);
      white-space: nowrap;
    }
    .adm-table td {
      padding: 0.5rem 0.75rem;
      vertical-align: middle;
      border-bottom: 1px solid var(--adm-border, #e2e8f0);
    }
    .adm-table tbody tr:hover {
      background: var(--adm-hover-bg, #f1f5f9);
    }
    .adm-table code {
      font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
      font-size: 0.78rem;
      background: var(--adm-code-bg, #f1f5f9);
      padding: 0.1rem 0.3rem;
      border-radius: 0.2rem;
    }
  `]
})
export class DbTriggerModalComponent {
  private readonly activeModal = inject(NgbActiveModal);

  @Input() trigger!: Trigger;

  fechar(): void { this.activeModal.close(); }
}