import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProcedureDetalhe } from '../models/database.model';

@Component({
  selector: 'app-db-procedure-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="modal-header">
  <h5 class="modal-title">
    <i class="bi bi-lightning-charge-fill"></i>
    {{ procedure.nomeCompleto }}
    <small class="text-muted ms-2" style="font-weight: 400; font-size: 0.85rem;">{{ procedure.tipo }}</small>
  </h5>
  <button type="button" class="btn-close" aria-label="Fechar" (click)="fechar()"></button>
</div>
<div class="modal-body">

  <h6 class="db-proc-modal__titulo"><i class="bi bi-list-ul"></i> Parâmetros ({{ procedure.parametros.length }})</h6>
  <div *ngIf="procedure.parametros.length === 0" class="db-proc-modal__vazio">
    Esta procedure não recebe parâmetros.
  </div>
  <div *ngIf="procedure.parametros.length > 0" class="adm-table-wrap">
    <table class="adm-table">
      <thead>
        <tr><th>#</th><th>Nome</th><th>Tipo</th><th>Direção</th><th>Default</th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let p of procedure.parametros">
          <td>{{ p.ordem }}</td>
          <td><strong>{{ p.nome || '(sem nome)' }}</strong></td>
          <td><code>{{ p.tipo }}</code></td>
          <td>
            <span class="db-proc-modal__dir" [class.db-proc-modal__dir--out]="p.isOutput">
              <i class="bi" [ngClass]="p.isOutput ? 'bi-arrow-up-right' : 'bi-arrow-down-left'"></i>
              {{ p.isOutput ? 'OUTPUT' : 'INPUT' }}
            </span>
          </td>
          <td>
            <code *ngIf="p.hasDefault">{{ p.valorDefault }}</code>
            <span *ngIf="!p.hasDefault" class="text-muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <h6 class="db-proc-modal__titulo"><i class="bi bi-file-earmark-code"></i> Corpo (definition)</h6>
  <pre *ngIf="procedure.corpo" class="db-code db-code--corpo">{{ procedure.corpo }}</pre>
  <div *ngIf="!procedure.corpo" class="db-proc-modal__vazio">
    <i class="bi bi-info-circle"></i> Corpo não disponível (procedure criptografada ou assembly CLR).
  </div>

</div>
<div class="modal-footer">
  <button type="button" class="btn btn-light" (click)="fechar()">Fechar</button>
  <button type="button" class="btn btn-primary" (click)="irParaSql()">
    <i class="bi bi-terminal"></i> Ir para SQL
  </button>
</div>
  `,
  styles: [`
    .db-proc-modal__titulo {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #475569;
      margin: 0.75rem 0 0.5rem;
    }
    .db-proc-modal__vazio {
      padding: 0.75rem 1rem;
      background: #f8fafc; color: #64748b;
      border-radius: 0.4rem; font-size: 0.88rem;
    }
    .db-proc-modal__dir {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.1rem 0.4rem; border-radius: 0.25rem;
      font-size: 0.72rem; font-weight: 600;
      background: #dbeafe; color: #1e40af;
    }
    .db-proc-modal__dir--out {
      background: #f3e8ff; color: #6b21a8;
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
  `]
})
export class DbProcedureModalComponent {
  private readonly activeModal = inject(NgbActiveModal);

  @Input() procedure!: ProcedureDetalhe;

  fechar(): void { this.activeModal.close(); }

  irParaSql(): void {
    sessionStorage.setItem('db-procedure-prefill', this.procedure.nomeCompleto);
    this.activeModal.close();
    location.assign('/database/consultas');
  }
}
