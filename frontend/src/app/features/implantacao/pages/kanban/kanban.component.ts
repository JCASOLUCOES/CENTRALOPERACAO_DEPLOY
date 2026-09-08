import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ProjetosService } from '../../services/projetos.service';
import { TarefasService } from '../../services/tarefas.service';
import { ColunasKanbanService } from '../../services/cadastros.service';
import { TarefaResumo, TarefaFiltro } from '../../models/tarefa.model';
import { ColunaKanbanResumo } from '../../models/equipe-tipo-etapa-coluna.model';
import { ProjetoResumo } from '../../models/projeto.model';

interface Coluna {
  id: number | null;
  nome: string;
  tarefas: TarefaResumo[];
  cor: string;
}

@Component({
  selector: 'app-implantacao-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule],
  template: `
    <section class="adm-page imp-kanban">
      <header class="imp-kanban__header">
        <div>
          <h1 class="adm-header__title">
            <i class="bi bi-kanban"></i> Kanban
          </h1>
          <p class="adm-header__desc">
            Visualize e mova tarefas entre colunas. Atualizações sincronizam com o backend.
          </p>
        </div>
        <div class="imp-kanban__controls">
          <select class="adm-search__input" [value]="projetoId()" (change)="onProjetoChange($any($event.target).value)">
            <option value="">Todos os projetos</option>
            <option *ngFor="let p of projetos()" [value]="p.id">{{ p.codigo }} — {{ p.nome }}</option>
          </select>
        </div>
      </header>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>Carregando kanban...</p>
      </div>

      <div *ngIf="!loading() && colunas().length" class="imp-kanban__board">
        <div *ngFor="let coluna of colunas(); trackBy: trackByColuna"
             class="imp-kanban__coluna"
             cdkDropList
             [cdkDropListData]="coluna.tarefas"
             [cdkDropListConnectedTo]="connectedTo()"
             (cdkDropListDropped)="onDrop($event, coluna)">
          <header class="imp-kanban__coluna-head">
            <div class="imp-kanban__coluna-title">
              <span class="imp-kanban__dot" [style.background]="coluna.cor"></span>
              <span>{{ coluna.nome }}</span>
              <span class="imp-kanban__count">{{ coluna.tarefas.length }}</span>
            </div>
          </header>
          <div class="imp-kanban__cards">
            <article *ngFor="let t of coluna.tarefas; trackBy: trackByTarefa"
                     class="imp-kanban__card"
                     cdkDrag
                     [cdkDragData]="t">
              <div class="imp-kanban__card-head">
                <h3 class="imp-kanban__card-title">
                  <i class="bi bi-grip-vertical imp-kanban__drag-handle"></i>
                  {{ t.titulo }}
                </h3>
                <button class="imp-kanban__card-menu" type="button" title="Mais ações">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
              </div>
              <a [routerLink]="['/implantacao/projetos', t.projetoId]" class="imp-kanban__card-projeto">
                <span class="imp-code">{{ t.projetoCodigo }}</span>
                <span class="imp-kanban__card-cliente">{{ t.projetoNome }}</span>
              </a>
              <div class="imp-kanban__card-foot">
                <span class="imp-kanban__prio" [ngClass]="classePrioridade(t.prioridade)">
                  {{ prioridade(t.prioridade) }}
                </span>
                <span class="imp-kanban__horas">
                  <i class="bi bi-clock"></i>
                  {{ formatHoras(t.horasEstimadas, t.horasRealizadas) }}
                </span>
              </div>
            </article>
            <div *ngIf="!coluna.tarefas.length" class="imp-kanban__vazio">
              <i class="bi bi-inbox"></i>
              <span>Sem tarefas</span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading() && !colunas().length" class="adm-empty">
        <i class="bi bi-inbox"></i>
        <p>Nenhuma tarefa encontrada com o filtro atual.</p>
      </div>
    </section>
  `,
  styleUrl: './kanban.component.scss'
})
export class KanbanComponent implements OnInit {
  private readonly tarefasService = inject(TarefasService);
  private readonly projetosService = inject(ProjetosService);
  private readonly colunasService = inject(ColunasKanbanService);

  tarefas = signal<TarefaResumo[]>([]);
  colunasOriginais = signal<ColunaKanbanResumo[]>([]);
  projetos = signal<ProjetoResumo[]>([]);
  loading = signal(true);
  projetoId = signal<string>('');

  // IDs das listas conectadas (drag entre colunas)
  connectedTo = computed(() => this.colunasOriginais().map(c => 'col-' + (c.id ?? 'backlog')));

  colunas = computed<Coluna[]>(() => {
    const cols = this.colunasOriginais();
    const tar = this.tarefas();
    if (!cols.length) return [];

    return cols.map(c => ({
      id: c.id,
      nome: c.nome,
      cor: c.cor || '#94a3b8',
      tarefas: tar
        .filter(t => t.colunaKanbanId === c.id)
        .sort((a, b) => a.ordem - b.ordem)
    }));
  });

  ngOnInit(): void {
    this.colunasService.listar(false).subscribe(cs => this.colunasOriginais.set(cs));
    this.projetosService.listar({}).subscribe(ps => this.projetos.set(ps));
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    const filtro: TarefaFiltro = {};
    if (this.projetoId()) filtro.projetoId = Number(this.projetoId());
    this.tarefasService.listar(filtro).subscribe({
      next: (t) => { this.tarefas.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onProjetoChange(v: string): void {
    this.projetoId.set(v);
    this.carregar();
  }

  onDrop(event: CdkDragDrop<TarefaResumo[]>, colunaDestino: Coluna): void {
    if (event.previousContainer === event.container) {
      // Reordenar dentro da mesma coluna
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Mover para outra coluna
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }

    // Atualizar ordem/status no backend
    const tarefaMovida = colunaDestino.tarefas[event.currentIndex];
    const novaColunaId = colunaDestino.id;
    const novaOrdem = event.currentIndex;
    this.tarefasService.mudarColuna(tarefaMovida.id, {
      colunaKanbanId: novaColunaId ?? undefined,
      novaOrdem
    }).subscribe({
      error: (err) => {
        console.error('Erro ao mover tarefa:', err);
        // Reverter
        this.carregar();
      }
    });
  }

  trackByColuna = (_: number, c: Coluna) => c.id;
  trackByTarefa = (_: number, t: TarefaResumo) => t.id;

  classePrioridade(p: number): string {
    return ['', 'imp-kanban__prio--baixa', 'imp-kanban__prio--media', 'imp-kanban__prio--alta', 'imp-kanban__prio--urgente'][p] ?? '';
  }

  prioridade(p: number): string {
    return ['', 'Baixa', 'Média', 'Alta', 'Urgente'][p] ?? '—';
  }

  formatHoras(estimadas?: number, realizadas?: number): string {
    if (estimadas == null) return '—';
    if (realizadas == null) return `${estimadas}h`;
    return `${realizadas}h / ${estimadas}h`;
  }
}
