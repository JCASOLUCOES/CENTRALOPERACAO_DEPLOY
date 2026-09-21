import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjetosService } from '../../services/projetos.service';

type Aba = 'checklist' | 'documentos' | 'historico' | 'comentarios';

@Component({
  selector: 'app-projeto-etapa-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-etapa">
      <header class="modal-header">
        <div class="header-left">
          <span class="etapa-numero">{{ etapa().ordem }}</span>
          <h2 class="modal-title">{{ etapa().nome }}</h2>
          <span class="badge" [ngClass]="classeBadge()">{{ labelEstado() }}</span>
        </div>
        <button class="btn-close" (click)="fechar()" aria-label="Fechar"></button>
      </header>

      <div class="modal-progress">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="etapa().percentual" [ngClass]="'progress-' + estadoProgresso()"></div>
        </div>
        <span class="progress-text">{{ etapa().percentual }}%</span>
        <span class="atraso-badge" *ngIf="etapa().atrasoDias && etapa().atrasoDias > 0">
          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> {{ etapa().atrasoDias }} dias atrasado
        </span>
      </div>

      <div class="modal-tabs">
        <button 
          *ngFor="let aba of abas" 
          class="tab-btn" 
          [class.active]="abaAtiva() === aba.id"
          (click)="abaAtiva.set(aba.id)">
          {{ aba.label }}
        </button>
      </div>

      <div class="tab-content" [ngSwitch]="abaAtiva()">
        <!-- CHECKLIST -->
        <div *ngSwitchCase="'checklist'" class="tab-pane">
          <div class="checklist-list">
            <div *ngFor="let item of etapa().checklist; let i = index" class="checklist-item" [class.concluido]="item.concluido">
              <input 
                type="checkbox" 
                [checked]="item.concluido" 
                (change)="toggleChecklist(item)"
                [id]="'check-' + item.id"
              >
              <label [for]="'check-' + item.id" class="checklist-label">
                <span class="checklist-descricao">{{ item.descricao }}</span>
                <span class="checklist-meta" *ngIf="item.dataConclusao">
                  <i class="bi bi-check-lg" aria-hidden="true"></i> {{ item.dataConclusao | date:'dd/MM/yyyy' }} por {{ item.usuarioConclusao }}
                </span>
              </label>
            </div>
          </div>
          <div class="checklist-actions">
            <input 
              type="text" 
              [(ngModel)]="novoItemChecklist" 
              placeholder="Adicionar novo item ao checklist..."
              (keydown.enter)="adicionarChecklistItem()"
              class="form-control"
            >
            <button class="btn btn-primary btn-sm" (click)="adicionarChecklistItem()" [disabled]="!novoItemChecklist().trim()">
              <i class="bi bi-plus-lg"></i> Adicionar
            </button>
          </div>
        </div>

        <!-- DOCUMENTOS -->
        <div *ngSwitchCase="'documentos'" class="tab-pane">
          <div class="documentos-list">
            <div *ngFor="let doc of etapa().documentos" class="documento-item">
              <a [href]="doc.url" target="_blank" class="documento-link">
                <i class="bi bi-file-earmark-text"></i>
                <span class="doc-nome">{{ doc.nome }}</span>
              </a>
              <span class="doc-meta">{{ doc.dataInclusao | date:'dd/MM/yyyy' }} por {{ doc.usuarioInclusao }}</span>
              <button class="btn-icon" (click)="excluirDocumento(doc.id)" title="Excluir">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          <div class="documento-upload">
            <input type="file" #fileInput (change)="onFileSelect($event)" hidden>
            <button class="btn btn-outline-primary" (click)="fileInput.click()">
              <i class="bi bi-upload"></i> Adicionar Documento
            </button>
          </div>
        </div>

        <!-- HISTÓRICO -->
        <div *ngSwitchCase="'historico'" class="tab-pane">
          <div class="historico-list" *ngIf="etapa().historico.length; else semHistorico">
            <div *ngFor="let h of etapa().historico" class="historico-item">
              <div class="historico-header">
                <span class="historico-data">{{ h.data | date:'dd/MM/yyyy HH:mm' }}</span>
                <span class="historico-usuario">{{ h.usuario }}</span>
              </div>
              <div class="historico-acao">{{ h.acao }}</div>
              <div class="historico-detalhes" *ngIf="h.detalhes">{{ h.detalhes }}</div>
            </div>
          </div>
          <ng-template #semHistorico>
            <p class="text-muted text-center py-3">Nenhum histórico disponível.</p>
          </ng-template>
        </div>

        <!-- COMENTÁRIOS -->
        <div *ngSwitchCase="'comentarios'" class="tab-pane">
          <div class="comentarios-list">
            <div *ngFor="let c of etapa().comentarios" class="comentario-item">
              <div class="comentario-header">
                <strong>{{ c.usuario }}</strong>
                <span class="comentario-data">{{ c.data | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <p class="comentario-texto">{{ c.texto }}</p>
            </div>
          </div>
          <div class="comentario-novo">
            <textarea 
              [(ngModel)]="novoComentario" 
              placeholder="Adicionar comentário..."
              rows="3"
              class="form-control"
            ></textarea>
            <button class="btn btn-primary btn-sm mt-2" (click)="enviarComentario()" [disabled]="!novoComentario().trim()">
              <i class="bi bi-send"></i> Enviar
            </button>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <button class="btn btn-secondary" (click)="fechar()">Cancelar</button>
        <button class="btn btn-primary" (click)="fechar()" [disabled]="salvando()">
          <i class="bi bi-check-lg"></i> {{ salvando() ? 'Salvando...' : 'Fechar' }}
        </button>
        <button 
          *ngIf="podeConcluir()" 
          class="btn btn-success" 
          (click)="concluirEtapa()"
          [disabled]="salvando()">
          <i class="bi bi-check-circle-fill"></i> Marcar como 100% Concluído
        </button>
      </footer>
    </div>
  `,
  styleUrls: ['./projeto-etapa-modal.component.scss']
})
export class ProjetoEtapaModalComponent implements OnInit {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly projetosSvc = inject(ProjetosService);

  @Input({ required: true }) projetoId!: number;
  @Input({ required: true }) ordem!: number;

  readonly etapa = signal<any>(null);
  readonly salvando = signal(false);
  readonly abaAtiva = signal<'checklist' | 'documentos' | 'historico' | 'comentarios'>('checklist');
  readonly novoItemChecklist = signal('');
  readonly novoComentario = signal('');
  readonly arquivoSelecionado = signal<File | null>(null);

  readonly abas = [
    { id: 'checklist' as const, label: 'Checklist' },
    { id: 'documentos' as const, label: 'Documentos' },
    { id: 'historico' as const, label: 'Histórico' },
    { id: 'comentarios' as const, label: 'Comentários' }
  ];

  ngOnInit(): void {
    this.carregarEtapa();
  }

  carregarEtapa(): void {
    this.projetosSvc.obterEtapaDetalhe(this.projetoId, this.ordem).subscribe({
      next: (etapa) => this.etapa.set(etapa),
      error: () => this.fechar()
    });
  }

  readonly estadoProgresso = computed(() => {
    const e = this.etapa();
    if (!e) return '';
    if (e.estado === 'Concluida') return 'concluida';
    if (e.estado === 'EmAndamento') return 'em-andamento';
    if (e.estado === 'Bloqueada') return 'bloqueada';
    return 'pendente';
  });

  classeBadge(): string {
    const e = this.etapa();
    if (!e) return '';
    switch (e.estado) {
      case 'Concluida': return 'badge bg-success';
      case 'EmAndamento': return 'badge bg-primary';
      case 'Bloqueada': return 'badge bg-warning';
      default: return 'badge bg-secondary';
    }
  }

  labelEstado(): string {
    const e = this.etapa();
    if (!e) return '';
    switch (e.estado) {
      case 'Concluida': return 'Concluída';
      case 'EmAndamento': return 'Em Andamento';
      case 'Bloqueada': return 'Bloqueada';
      default: return 'Pendente';
    }
  }

  podeConcluir(): boolean {
    const e = this.etapa();
    return e && e.estado === 'EmAndamento' && e.percentual >= 100;
  }

  toggleChecklist(item: any): void {
    const atualizado = { ...item, concluido: !item.concluido };
    // Atualiza localmente primeiro para feedback visual imediato
    this.etapa.update(e => ({
      ...e,
      checklist: e.checklist.map((c: any) => c.id === item.id ? { ...c, concluido: !c.concluido } : c)
    }));
    
    // Envia para o backend
    this.projetosSvc.atualizarEtapa(this.projetoId, this.ordem, {
      percentual: this.calcularPercentual(),
      checklist: this.etapa().checklist.map((c: any) => ({
        id: c.id,
        descricao: c.descricao,
        concluido: c.concluido
      }))
    }).subscribe({
      next: (etapaAtualizada) => this.etapa.set(etapaAtualizada),
      error: () => {
        // Reverte em caso de erro
        this.etapa.update(e => ({
          ...e,
          checklist: e.checklist.map((c: any) => c.id === item.id ? { ...c, concluido: !c.concluido } : c)
        }));
      }
    });
  }

  calcularPercentual(): number {
    const e = this.etapa();
    if (!e || e.checklist.length === 0) return e.percentual;
    const total = e.checklist.length;
    const concluidos = e.checklist.filter((c: any) => c.concluido).length;
    return Math.round((concluidos / total) * 100);
  }

  async adicionarChecklistItem(): Promise<void> {
    const descricao = this.novoItemChecklist().trim();
    if (!descricao) return;

    this.projetosSvc.adicionarChecklistItem(this.projetoId, this.ordem, { descricao, concluido: false }).subscribe({
      next: (etapaAtualizada) => {
        this.etapa.set(etapaAtualizada);
        this.novoItemChecklist.set('');
      }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      // Simular upload - em produção faria upload para storage
      const file = input.files[0];
      const url = URL.createObjectURL(file); // Temporário
      
      this.projetosSvc.adicionarDocumento(this.projetoId, this.ordem, {
        nome: file.name,
        url: url,
        descricao: ''
      }).subscribe({
        next: (etapaAtualizada) => this.etapa.set(etapaAtualizada)
      });
    }
  }

  excluirDocumento(docId: number): void {
    if (!confirm('Excluir este documento?')) return;
    // TODO: Implementar exclusão no backend
  }

  enviarComentario(): void {
    const texto = this.novoComentario().trim();
    if (!texto) return;

    this.projetosSvc.adicionarComentario(this.projetoId, this.ordem, { texto }).subscribe({
      next: (etapaAtualizada) => {
        this.etapa.set(etapaAtualizada);
        this.novoComentario.set('');
      }
    });
  }

  concluirEtapa(): void {
    if (!this.podeConcluir()) return;

    this.projetosSvc.atualizarEtapa(this.projetoId, this.ordem, {
      percentual: 100,
      checklist: this.etapa().checklist.map((c: any) => ({ id: c.id, descricao: c.descricao, concluido: true })),
      estado: 'Concluida',
      dataFimReal: new Date().toISOString()
    }).subscribe({
      next: (etapaAtualizada) => {
        this.etapa.set(etapaAtualizada);
        // O projeto pai recarregará automaticamente via evento
      }
    });
  }

  fechar(): void {
    this.activeModal.close();
  }
}