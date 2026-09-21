import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-projeto-retorno-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="retorno-dialog">
      <div class="dialog-header">
        <h3><i class="bi bi-exclamation-triangle-fill text-warning"></i> Atenção: Retorno de Etapa</h3>
        <button class="btn-close" (click)="cancelar()" aria-label="Fechar"></button>
      </div>

      <div class="dialog-body">
        <div class="alerta-icone">
          <i class="bi bi-arrow-return-left"></i>
        </div>

        <p class="mensagem-principal">
          <strong>O projeto já passou da etapa <span class="destaque">{{ nomeEtapaAlvo }}</span> (está na etapa {{ etapaAtual }}).</strong>
        </p>

        <p class="mensagem-detalhe">
          Você quer retornar para <strong>{{ nomeEtapaAlvo }}</strong>?
        </p>

        <div class="consequencias">
          <p class="consequencias-titulo">Isto vai:</p>
          <ul>
            <li><i class="bi bi-check-circle-fill text-success"></i> Mudar status do projeto de volta para <strong>{{ nomeEtapaAlvo }}</strong></li>
            <li><i class="bi bi-check-circle-fill text-success"></i> Resetar etapa atual e posteriores para 0% (bloqueadas novamente)</li>
            <li><i class="bi bi-check-circle-fill text-success"></i> Manter as etapas anteriores</li>
          </ul>
        </div>

        <div class="aviso-adicional" *ngIf="temChecklistPreenchido">
          <i class="bi bi-info-circle-fill"></i>
          <span>Os checklists das etapas que serão resetadas <strong>serão preservados</strong>, mas as etapas voltarão para 0% e status "Pendente".</span>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" (click)="cancelar()">
          <i class="bi bi-x-lg"></i> Não, continuar
        </button>
        <button class="btn btn-danger" (click)="confirmar()">
          <i class="bi bi-arrow-return-left"></i> Sim, retornar para {{ nomeEtapaAlvo }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./projeto-retorno-dialog.component.scss']
})
export class ProjetoRetornoDialogComponent {
  private readonly activeModal = inject(NgbActiveModal);

  @Input({ required: true }) etapaAtual!: number;
  @Input({ required: true }) ordemAlvo!: number;
  @Input({ required: true }) nomeEtapaAlvo!: string;
  @Input() etapasComChecklist: number[] = [];

  @Output() confirmado = new EventEmitter<boolean>();

  get temChecklistPreenchido(): boolean {
    return this.etapasComChecklist.some(e => e > this.ordemAlvo && e <= this.etapaAtual);
  }

  confirmar(): void {
    this.confirmado.emit(true);
    this.activeModal.close(true);
  }

  cancelar(): void {
    this.confirmado.emit(false);
    this.activeModal.close(false);
  }
}