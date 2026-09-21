import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjetoEtapaCardComponent } from '../projeto-etapa-card/projeto-etapa-card.component';

@Component({
  selector: 'app-projeto-card',
  standalone: true,
  imports: [CommonModule, RouterLink, ProjetoEtapaCardComponent],
  template: `
    <a
      [routerLink]="[projeto.id]"
      class="imp-card imp-card--clickable"
      [class.imp-card--impl]="ehImplantacao()"
      [class.imp-card--ciaa]="projeto.tipoProjetoNome === 'Projeto CIAA'"
      [ngClass]="estadoClasse()">
      <div class="imp-proj-card">
        <div class="imp-proj-card__top">
          <span class="imp-code">{{ projeto.codigo }}</span>
          <span class="imp-status" [ngClass]="classeStatus(projeto.status)">{{ formatarStatus(projeto.status) }}</span>
        </div>

        <h3 class="imp-proj-card__title">{{ projeto.nome }}</h3>

        <div class="imp-proj-card__tipo">
          <span>{{ projeto.tipoProjetoNome }}</span>
        </div>

        <p *ngIf="projeto.clienteNome" class="imp-proj-card__client">
          <i class="bi bi-building"></i> {{ projeto.clienteNome }}
        </p>

        <!-- Progresso Geral -->
        <div class="imp-proj-progress">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="projeto.progresso"></div>
          </div>
          <div class="progress-info">
            <span class="progress-text">{{ projeto.progresso }}%</span>
            <span class="progress-detalhe">
              {{ etapasConcluidas() }} de 9 etapas
            </span>
          </div>
        </div>

        <!-- 9 Cards de Etapas (Horizontal Scroll) -->
        <div class="etapas-scroll-container">
          <div class="etapas-scroll" [class.horizontal-scroll]="true">
            <app-projeto-etapa-card
              *ngFor="let etapa of etapasOrdenadas()"
              [etapa]="etapa"
              [projetoId]="projeto.id"
              [clicavel]="true"
              (clicou)="abrirModalEtapa($event)">
            </app-projeto-etapa-card>
          </div>
        </div>

        <!-- Meta Info -->
        <div class="imp-proj-card__meta">
          <span *ngIf="projeto.responsavelNome" class="meta-item">
            <i class="bi bi-person"></i> {{ projeto.responsavelNome }}
          </span>
          <span *ngIf="projeto.dataPrevisao" class="meta-item">
            <i class="bi bi-calendar"></i> {{ projeto.dataPrevisao | date:'dd/MM/yyyy' }}
          </span>
          <span *ngIf="maxAtraso() > 0" class="meta-item meta-atraso">
            <i class="bi bi-exclamation-triangle-fill"></i> {{ maxAtraso() }}d atraso
          </span>
        </div>
      </div>
    </a>
  `,
  styleUrl: './projeto-card.component.scss'
})
export class ProjetoCardComponent {
  @Input({ required: true }) projeto!: any;
  @Input() etapas: any[] = [];

  readonly ETAPAS_NOMES = [
    'KICKOFF', 'LEVANTAMENTO', 'DESENVOLVIMENTO', 'HOMOLOGAÇÃO',
    'TREINAMENTO', 'GO LIVE', 'PÓS-IMPLANTAÇÃO', 'PASSAR PARA O SUPORTE', 'CONCLUÍDO'
  ];

  etapasOrdenadas = computed(() => {
    const etapas = this.etapas || [];
    return this.ETAPAS_NOMES.map((nome, i) => {
      const encontrada = etapas.find(e => e.nome === nome || e.ordem === i + 1);
      if (encontrada) return encontrada;
      // Cria etapa padrão se não existir
      return {
        ordem: i + 1,
        nome: nome,
        estado: 'Pendente' as const,
        percentual: 0,
        checklistTotal: 0,
        checklistConcluidos: 0,
        dataInicio: undefined,
        dataFimPrevista: undefined,
        dataFimReal: undefined,
        atrasoDias: undefined,
        responsavelNome: undefined
      };
    });
  });

  etapasConcluidas = computed(() => {
    return this.etapasOrdenadas().filter(e => e.estado === 'Concluida').length;
  });

  maxAtraso = computed(() => {
    return Math.max(0, ...this.etapasOrdenadas().map(e => e.atrasoDias || 0));
  });

  estadoClasse = computed(() => {
    if (this.projeto?.status === 'Concluido') return 'is-concluido';
    const atraso = this.maxAtraso();
    if (atraso > 3) return 'is-atraso-critico is-atraso';
    if (atraso > 0) return 'is-atraso';
    return 'is-ativo';
  });

  ehImplantacao = () => {
    const tipo = this.projeto?.tipoProjetoNome || '';
    return tipo.startsWith('Cliente') || tipo.startsWith('Carteira') || tipo.startsWith('Integração');
  };

  abrirModalEtapa(etapa: any): void {
    // Navegar para detalhes da etapa via query param ou abrir modal
    // Por enquanto, navega para o detalhe do projeto com foco na etapa
    // window.open(`/implantacao/projetos/${this.projeto.id}?etapa=${etapa.ordem}`, '_blank');
  }

  classeStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'imp-status--backlog',
      'AFazer': 'imp-status--afazer',
      'EmAndamento': 'imp-status--em-andamento',
      'Homologacao': 'imp-status--em-homologacao',
      'Concluido': 'imp-status--concluido',
      'Bloqueado': 'imp-status--bloqueado',
      'Cancelado': 'imp-status--cancelado'
    };
    return m[s] ?? 'imp-status--backlog';
  }

  formatarStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'Backlog', 'AFazer': 'A Fazer', 'EmAndamento': 'Em Andamento',
      'Homologacao': 'Homologação', 'Concluido': 'Concluído',
      'Cancelado': 'Cancelado', 'Bloqueado': 'Bloqueado'
    };
    return m[s] ?? s;
  }
}