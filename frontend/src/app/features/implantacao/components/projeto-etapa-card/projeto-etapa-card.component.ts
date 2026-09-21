import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ProjetoEtapaResumo } from '../../models/projeto.model';

@Component({
  selector: 'app-projeto-etapa-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="etapa-card" [ngClass]="classeEstado()" (click)="onClick()" [title]="tooltip()">
      <div class="etapa-header">
        <span class="etapa-numero">{{ etapa.ordem }}</span>
        <span class="etapa-icone" [ngClass]="iconeEstado()"></span>
      </div>
      <div class="etapa-nome">{{ etapa.nome }}</div>
      <div class="etapa-progress" *ngIf="etapa.estado !== 'Pendente'">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="etapa.percentual"></div>
        </div>
        <span class="progress-text">{{ etapa.percentual }}%</span>
      </div>
      <div class="etapa-status">{{ labelEstado() }}</div>
      <div class="etapa-tarefas" *ngIf="(etapa.tarefasTotal ?? 0) > 0" [title]="tooltipTarefas()">
        <span class="checklist-done">{{ etapa.tarefasConcluidas ?? 0 }}</span>
        <span class="checklist-sep">/</span>
        <span class="checklist-total">{{ etapa.tarefasTotal }}</span>
        <span class="tarefas-label">tarefas</span>
      </div>
      <div class="etapa-checklist" *ngIf="!((etapa.tarefasTotal ?? 0) > 0) && etapa.checklistTotal > 0" [title]="tooltipChecklist()">
        <span class="checklist-done">{{ etapa.checklistConcluidos }}</span>
        <span class="checklist-sep">/</span>
        <span class="checklist-total">{{ etapa.checklistTotal }}</span>
      </div>
      <div class="etapa-atraso" *ngIf="etapa.atrasoDias && etapa.atrasoDias > 0">
        <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> {{ etapa.atrasoDias }}d
      </div>
      <div class="etapa-responsavel" *ngIf="etapa.responsavelNome">
        {{ etapa.responsavelNome }}
      </div>
    </div>
  `,
  styleUrls: ['./projeto-etapa-card.component.scss']
})
export class ProjetoEtapaCardComponent {
  @Input({ required: true }) etapa!: ProjetoEtapaResumo;
  @Input() projetoId!: number;
  @Input() clicavel = true;

  @Output() clicou = new EventEmitter<ProjetoEtapaResumo>();

  readonly ETAPAS_NOMES = [
    'KICKOFF', 'LEVANTAMENTO', 'DESENVOLVIMENTO', 'HOMOLOGAÇÃO',
    'TREINAMENTO', 'GO LIVE', 'PÓS-IMPLANTAÇÃO', 'PASSAR PARA O SUPORTE', 'CONCLUÍDO'
  ];

  onClick(): void {
    if (this.clicavel) {
      this.clicou.emit(this.etapa);
    }
  }

  classeEstado(): string {
    const base = 'etapa-card';
    switch (this.etapa.estado) {
      case 'Concluida': return `${base} estado-concluida`;
      case 'EmAndamento': return `${base} estado-em-andamento`;
      case 'Bloqueada': return `${base} estado-bloqueada`;
      case 'Pendente': return `${base} estado-pendente`;
      default: return base;
    }
  }

  iconeEstado(): string {
    switch (this.etapa.estado) {
      case 'Concluida': return 'bi bi-check-circle-fill icone-concluida';
      case 'EmAndamento': return 'bi bi-play-circle-fill icone-em-andamento';
      case 'Bloqueada': return 'bi bi-lock-fill icone-bloqueada';
      case 'Pendente': return 'bi bi-circle icone-pendente';
      default: return 'bi bi-circle';
    }
  }

  labelEstado(): string {
    switch (this.etapa.estado) {
      case 'Concluida': return 'Concluída';
      case 'EmAndamento': return 'Em Andamento';
      case 'Bloqueada': return 'Bloqueada';
      case 'Pendente': return 'Pendente';
      default: return this.etapa.estado;
    }
  }

  tooltipTarefas(): string {
    return `${this.etapa.tarefasConcluidas ?? 0} de ${this.etapa.tarefasTotal ?? 0} tarefas concluídas`;
  }

  tooltipChecklist(): string {
    return `${this.etapa.checklistConcluidos} de ${this.etapa.checklistTotal} itens de checklist concluídos`;
  }

  tooltip(): string {
    if (this.etapa.estado === 'Bloqueada') {
      return `Aguardando etapa anterior (${this.etapa.ordem - 1}) ser finalizada`;
    }
    if (this.etapa.estado === 'Pendente') {
      return 'Aguardando etapa anterior ser finalizada';
    }
    return '';
  }
}