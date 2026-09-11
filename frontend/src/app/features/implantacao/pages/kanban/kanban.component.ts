import { Component, OnInit, inject, signal, computed, effect, viewChildren, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ProjetosService } from '../../services/projetos.service';
import { TarefasService } from '../../services/tarefas.service';
import { ColunasKanbanService } from '../../services/cadastros.service';
import { TarefaResumo, TarefaDetalhe, TarefaFiltro, TarefaCriarRequest, ComentarioCriarRequest, TarefaAtualizarRequest } from '../../models/tarefa.model';
import { ColunaKanbanResumo, ColunaKanbanAtualizarRequest } from '../../models/equipe-tipo-etapa-coluna.model';
import { ProjetoResumo } from '../../models/projeto.model';

interface Coluna {
  id: number | null;
  nome: string;
  tarefas: TarefaResumo[];
  cor: string;
  limiteWip?: number;
}

interface QuickFilters {
  assignee: string;
  prioridade: number | null;
  buscar: string;
  apenasMinhas: boolean;
}

type SwimlaneMode = 'none' | 'assignee' | 'prioridade';

interface Swimlane {
  key: string;
  label: string;
  tarefas: TarefaResumo[];
}

interface ColunaComSwimlanes {
  id: number | null;
  nome: string;
  cor: string;
  limiteWip?: number;
  swimlanes: Swimlane[];
  tarefas: TarefaResumo[]; // flattened for drag-drop
}

interface InlineEditState {
  tarefaId: number;
  field: 'titulo' | 'prioridade' | 'responsavel';
  value: string | number;
  originalValue: string | number;
}

@Component({
  selector: 'app-implantacao-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule, ScrollingModule],
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

      <!-- Quick Filters Bar -->
      <div class="imp-kanban__filters">
        <div class="imp-kanban__filter-group">
          <input
            type="text"
            class="imp-kanban__filter-input"
            placeholder="Buscar tarefas..."
            [(ngModel)]="quickFilters().buscar"
            (ngModelChange)="onQuickFilterChange('buscar', $event)"
            (keydown.enter)="aplicarFiltros()"
          >
        </div>
        <div class="imp-kanban__filter-group">
          <input
            type="text"
            class="imp-kanban__filter-input"
            placeholder="Responsável..."
            [(ngModel)]="quickFilters().assignee"
            (ngModelChange)="onQuickFilterChange('assignee', $event)"
          >
        </div>
        <div class="imp-kanban__filter-group">
          <select class="imp-kanban__filter-select" [(ngModel)]="quickFilters().prioridade" (ngModelChange)="onQuickFilterChange('prioridade', $event)">
            <option [value]="null">Todas prioridades</option>
            <option [value]="1">Baixa</option>
            <option [value]="2">Média</option>
            <option [value]="3">Alta</option>
            <option [value]="4">Urgente</option>
          </select>
        </div>
        <div class="imp-kanban__filter-group">
          <label class="imp-kanban__filter-checkbox">
            <input type="checkbox" [(ngModel)]="quickFilters().apenasMinhas" (ngModelChange)="onQuickFilterChange('apenasMinhas', $event)">
            <span>Minhas tarefas</span>
          </label>
        </div>
        <div class="imp-kanban__filter-group">
          <select class="imp-kanban__filter-select" [(ngModel)]="swimlaneMode" (ngModelChange)="onSwimlaneChange($event)">
            <option value="none">Agrupar: Nenhum</option>
            <option value="assignee">Agrupar: Responsável</option>
            <option value="prioridade">Agrupar: Prioridade</option>
          </select>
        </div>
        <button class="imp-kanban__filter-clear" (click)="limparFiltros()" *ngIf="temFiltrosAtivos()">
          <i class="bi bi-x-circle"></i> Limpar
        </button>
      </div>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>Carregando kanban...</p>
      </div>

      <div *ngIf="!loading() && colunasComSwimlanes().length" class="imp-kanban__board">
        <div *ngFor="let coluna of colunasComSwimlanes(); let colIdx = index; trackBy: trackByColuna"
             class="imp-kanban__coluna"
             [class.imp-kanban__coluna--wip-exceeded]="coluna.limiteWip && coluna.limiteWip > 0 && coluna.tarefas.length > coluna.limiteWip"
             cdkDropList
             [cdkDropListData]="coluna.tarefas"
             [cdkDropListConnectedTo]="connectedTo()"
             (cdkDropListDropped)="onDrop($event, coluna)"
             (cdkDropListEntered)="onDragEntered(coluna)"
             (cdkDropListExited)="onDragExited(coluna)">
          <header class="imp-kanban__coluna-head">
            <div class="imp-kanban__coluna-title">
              <span class="imp-kanban__dot" [style.background]="coluna.cor"></span>
              <span>{{ coluna.nome }}</span>
              <span class="imp-kanban__count">{{ coluna.tarefas.length }}</span>
              <span class="imp-kanban__wip-badge" *ngIf="coluna.limiteWip && coluna.limiteWip > 0">
                {{ coluna.tarefas.length }}/{{ coluna.limiteWip }}
              </span>
            </div>
            <button class="imp-kanban__coluna-menu" type="button" title="Opções da coluna" (click)="toggleColumnMenu(coluna.id!)">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
          </header>
          <div class="imp-kanban__cards">
            <ng-container *ngFor="let swimlane of coluna.swimlanes; let slIdx = index">
              <div class="imp-kanban__swimlane" *ngIf="swimlaneMode() !== 'none' && swimlane.tarefas.length">
                <div class="imp-kanban__swimlane-header">
                  <span class="imp-kanban__swimlane-label">{{ swimlane.label }}</span>
                  <span class="imp-kanban__swimlane-count">{{ swimlane.tarefas.length }}</span>
                </div>
              </div>
              <article *ngFor="let t of swimlane.tarefas; trackBy: trackByTarefa"
class="imp-kanban__card"
                        [class.imp-kanban__card--selected]="selectedTarefa()?.id === t.id"
                        [class.imp-kanban__card--editing]="inlineEdit()?.tarefaId === t.id"
                        [class.imp-kanban__card--bulk-selected]="selectedTarefas().has(t.id)"
                        cdkDrag
                        [cdkDragData]="t"
                        (click)="onCardClick(t, $event)"
                        (dblclick)="iniciarInlineEdit(t, 'titulo', $event)"
                        (keydown)="onCardKeydown(t, $event)"
                        #cardRef
                        tabindex="0"
                        role="listitem"
                        [attr.aria-label]="'Tarefa ' + t.id + ': ' + t.titulo"
                        [attr.aria-selected]="selectedTarefas().has(t.id)">
                <div class="imp-kanban__card-head">
<div class="imp-kanban__card-select" *ngIf="bulkActionMode()">
                    <input
                      type="checkbox"
                      [checked]="selectedTarefas().has(t.id)"
                      (change)="toggleTarefaSelection(t.id, $event)"
                      (click)="$event.stopPropagation()"
                      [attr.aria-label]="'Selecionar tarefa ' + t.id">
                    >
                  </div>
                  <h3 class="imp-kanban__card-title">
                    <i class="bi bi-grip-vertical imp-kanban__drag-handle" aria-hidden="true"></i>
                    <span *ngIf="inlineEdit()?.tarefaId !== t.id || inlineEdit()?.field !== 'titulo'">{{ t.titulo }}</span>
                    <input *ngIf="inlineEdit()?.tarefaId === t.id && inlineEdit()?.field === 'titulo'"
                            type="text"
                            class="imp-kanban__inline-edit-input"
                            [ngModel]="inlineEdit()?.value ?? ''"
                            (ngModelChange)="onInlineEditValueChange($event)"
                            (blur)="salvarInlineEdit(t, 'titulo')"
                            (keydown.enter)="salvarInlineEdit(t, 'titulo')"
                            (keydown.escape)="cancelarInlineEdit()"
                            #tituloInput
                            autofocus
                            aria-label="Editar título">
                  </h3>
                  <button class="imp-kanban__card-menu" type="button" title="Mais ações" (click)="$event.stopPropagation(); abrirMenuTarefa(t, $event)">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                </div>
                <a [routerLink]="['/implantacao/projetos', t.projetoId]" class="imp-kanban__card-projeto">
                  <span class="imp-code">{{ t.projetoCodigo }}</span>
                  <span class="imp-kanban__card-cliente">{{ t.projetoNome }}</span>
                </a>
                <div class="imp-kanban__card-meta" *ngIf="t.responsavelNome || t.dataPrevisao">
                  <span class="imp-kanban__assignee" *ngIf="t.responsavelNome">
                    <i class="bi bi-person"></i> {{ t.responsavelNome }}
                  </span>
                  <span class="imp-kanban__due" *ngIf="t.dataPrevisao" [class.imp-kanban__due--overdue]="isOverdue(t)">
                    <i class="bi bi-calendar"></i> {{ t.dataPrevisao | date:'dd/MM' }}
                  </span>
                </div>
                <div class="imp-kanban__card-foot">
                  <div class="imp-kanban__prio-wrapper">
                    <span *ngIf="inlineEdit()?.tarefaId !== t.id || inlineEdit()?.field !== 'prioridade'"
                          class="imp-kanban__prio"
                          [ngClass]="classePrioridade(t.prioridade)"
                          (dblclick)="iniciarInlineEdit(t, 'prioridade', $event)">
                      {{ prioridade(t.prioridade) }}
                    </span>
                    <select *ngIf="inlineEdit()?.tarefaId === t.id && inlineEdit()?.field === 'prioridade'"
                            class="imp-kanban__inline-edit-select"
                            [ngModel]="inlineEdit()?.value ?? 2"
                            (ngModelChange)="onInlineEditValueChange($event)"
                            (blur)="salvarInlineEdit(t, 'prioridade')"
                            (keydown.escape)="cancelarInlineEdit()"
                            (change)="salvarInlineEdit(t, 'prioridade')"
                            #prioridadeSelect
                            aria-label="Editar prioridade">
                      <option [value]="1">Baixa</option>
                      <option [value]="2">Média</option>
                      <option [value]="3">Alta</option>
                      <option [value]="4">Urgente</option>
                    </select>
                  </div>
                  <span class="imp-kanban__horas">
                    <i class="bi bi-clock"></i>
                    {{ formatHoras(t.horasEstimadas, t.horasRealizadas) }}
                  </span>
                </div>
              </article>
            </ng-container>

            <!-- Add Card Form -->
            <div class="imp-kanban__add-card" *ngIf="showingAddForm() === coluna.id">
              <form (ngSubmit)="criarTarefa(coluna.id!)" class="imp-kanban__add-form">
                <input
                  type="text"
                  class="imp-kanban__add-input"
                  placeholder="Título da tarefa..."
                  [(ngModel)]="novaTarefaTitulo"
                  name="titulo"
                  required
                  autofocus
                  (keydown.escape)="cancelarNovaTarefa()"
                >
                <div class="imp-kanban__add-row">
                  <select class="imp-kanban__add-select" [(ngModel)]="novaTarefaPrioridade" name="prioridade">
                    <option [value]="1">Baixa</option>
                    <option [value]="2">Média</option>
                    <option [value]="3">Alta</option>
                    <option [value]="4">Urgente</option>
                  </select>
                  <input
                    type="text"
                    class="imp-kanban__add-input imp-kanban__add-input--small"
                    placeholder="Responsável (opcional)"
                    [(ngModel)]="novaTarefaResponsavel"
                    name="responsavel"
                  >
                </div>
                <div class="imp-kanban__add-actions">
                  <button type="submit" class="imp-kanban__btn imp-kanban__btn--primary" [disabled]="!novaTarefaTitulo().trim()">
                    <i class="bi bi-plus"></i> Adicionar
                  </button>
                  <button type="button" class="imp-kanban__btn imp-kanban__btn--ghost" (click)="cancelarNovaTarefa()">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </form>
            </div>

            <!-- Add Card Trigger -->
            <button
              type="button"
              class="imp-kanban__add-trigger"
              *ngIf="showingAddForm() !== coluna.id"
              (click)="mostrarFormNovaTarefa(coluna.id!)">
              <i class="bi bi-plus"></i>
              <span>Adicionar tarefa</span>
            </button>

            <div *ngIf="!coluna.tarefas.length && showingAddForm() !== coluna.id" class="imp-kanban__vazio">
              <i class="bi bi-inbox"></i>
              <span>Sem tarefas</span>
            </div>
          </div>

          <!-- Column Menu Dropdown -->
          <div class="imp-kanban__coluna-dropdown" *ngIf="openColumnMenu() === coluna.id" (clickOutside)="fecharColumnMenu()">
            <div class="imp-kanban__dropdown-item" (click)="editarColuna(coluna)">
              <i class="bi bi-pencil"></i> Editar coluna
            </div>
            <div class="imp-kanban__dropdown-item" (click)="definirWip(coluna)">
              <i class="bi bi-speedometer"></i> Definir WIP Limit
            </div>
            <div class="imp-kanban__dropdown-item" (click)="ocultarColuna(coluna)">
              <i class="bi bi-eye-slash"></i> Ocultar coluna
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Action Bar -->
      <div class="imp-kanban__bulk-bar" *ngIf="bulkActionMode() && selectedTarefas().size > 0">
        <div class="imp-kanban__bulk-info">
          <strong>{{ selectedTarefas().size }}</strong> tarefa(s) selecionada(s)
        </div>
        <div class="imp-kanban__bulk-actions">
          <button class="imp-kanban__btn imp-kanban__btn--ghost" (click)="bulkMoverParaColuna()">
            <i class="bi bi-arrows-move"></i> Mover para...
          </button>
          <button class="imp-kanban__btn imp-kanban__btn--ghost" (click)="bulkAlterarPrioridade()">
            <i class="bi bi-flag"></i> Prioridade
          </button>
          <button class="imp-kanban__btn imp-kanban__btn--ghost" (click)="bulkAtribuirResponsavel()">
            <i class="bi bi-person-plus"></i> Responsável
          </button>
          <button class="imp-kanban__btn imp-kanban__btn--danger" (click)="bulkExcluir()">
            <i class="bi bi-trash"></i> Excluir
          </button>
          <button class="imp-kanban__btn imp-kanban__btn--ghost" (click)="sairModoBulk()">
            <i class="bi bi-x"></i> Cancelar
          </button>
        </div>
      </div>

      <div *ngIf="!loading() && !colunas().length" class="adm-empty">
        <i class="bi bi-inbox"></i>
        <p>Nenhuma coluna configurada.</p>
      </div>

      <!-- Card Detail Drawer -->
      <div class="imp-kanban__drawer-overlay" *ngIf="selectedTarefa()" (click)="fecharDrawer()"></div>
      <aside class="imp-kanban__drawer" *ngIf="selectedTarefa() as t" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header class="imp-kanban__drawer-header">
          <h2 id="drawer-title" class="imp-kanban__drawer-title">
            <span class="imp-kanban__drawer-id">T{{ t.id }}</span>
            {{ t.titulo }}
          </h2>
          <button class="imp-kanban__drawer-close" (click)="fecharDrawer()" aria-label="Fechar">
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <div class="imp-kanban__drawer-content" *ngIf="!drawerLoading()">
          <div class="imp-kanban__drawer-section">
            <div class="imp-kanban__drawer-field">
              <label>Projeto</label>
              <a [routerLink]="['/implantacao/projetos', t.projetoId]" class="imp-kanban__drawer-link">
                <span class="imp-code">{{ t.projetoCodigo }}</span> {{ t.projetoNome }}
              </a>
            </div>
            <div class="imp-kanban__drawer-field">
              <label>Status</label>
              <span class="imp-kanban__prio" [ngClass]="classePrioridadeStatus(t.status)">{{ formatarStatus(t.status) }}</span>
            </div>
            <div class="imp-kanban__drawer-field">
              <label>Prioridade</label>
              <span class="imp-kanban__prio" [ngClass]="classePrioridade(t.prioridade)">{{ prioridade(t.prioridade) }}</span>
            </div>
            <div class="imp-kanban__drawer-field">
              <label>Responsável</label>
              <span>{{ t.responsavelNome || '—' }}</span>
            </div>
            <div class="imp-kanban__drawer-field">
              <label>Previsão</label>
              <span [class.imp-kanban__due--overdue]="isOverdue(t)">{{ t.dataPrevisao ? (t.dataPrevisao | date:'dd/MM/yyyy') : '—' }}</span>
            </div>
            <div class="imp-kanban__drawer-field">
              <label>Horas</label>
              <span>{{ formatHoras(t.horasEstimadas, t.horasRealizadas) }}</span>
            </div>
          </div>

          <div class="imp-kanban__drawer-section">
            <h3>Descrição</h3>
            <p class="imp-kanban__drawer-desc">{{ t.descricao || 'Sem descrição.' }}</p>
          </div>

          <div class="imp-kanban__drawer-section" *ngIf="t.comentarios?.length">
            <h3>Comentários ({{ t.comentarios.length }})</h3>
            <div class="imp-kanban__comments">
              <div *ngFor="let c of t.comentarios" class="imp-kanban__comment">
                <div class="imp-kanban__comment-header">
                  <strong>{{ c.autorNome }}</strong>
                  <span class="imp-kanban__comment-time">{{ c.dataInclusao | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <p>{{ c.texto }}</p>
              </div>
            </div>
          </div>

          <div class="imp-kanban__drawer-section">
            <h3>Adicionar comentário</h3>
            <textarea
              class="imp-kanban__comment-input"
              placeholder="Escreva um comentário..."
              [(ngModel)]="novoComentario"
              rows="3"
            ></textarea>
            <button class="imp-kanban__btn imp-kanban__btn--primary" (click)="adicionarComentario(t.id)" [disabled]="!novoComentario().trim() || drawerLoading()">
              <i class="bi bi-send"></i> Comentar
            </button>
          </div>
        </div>

        <div *ngIf="drawerLoading()" class="imp-kanban__drawer-loading">
          <i class="bi bi-arrow-clockwise"></i> Carregando detalhes...
        </div>
      </aside>

      <!-- Toast Notification -->
      <div class="imp-kanban__toast" *ngIf="toastMessage()" [class.imp-kanban__toast--success]="toastType() === 'success'" [class.imp-kanban__toast--error]="toastType() === 'error'" [class.imp-kanban__toast--info]="toastType() === 'info'" role="alert" aria-live="polite">
        <i class="bi" [ngClass]="toastType() === 'success' ? 'bi-check-circle-fill' : toastType() === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'"></i>
        <span>{{ toastMessage() }}</span>
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

  // Quick Filters
  quickFilters = signal<QuickFilters>({
    assignee: '',
    prioridade: null,
    buscar: '',
    apenasMinhas: false
  });

  // Card Detail Drawer
  selectedTarefa = signal<TarefaDetalhe | null>(null);
  drawerLoading = signal(false);
  novoComentario = signal('');

  // Add Card Inline
  showingAddForm = signal<number | null>(null);
  novaTarefaTitulo = signal('');
  novaTarefaDescricao = signal('');
  novaTarefaPrioridade = signal(2);
  novaTarefaResponsavel = signal('');

  // Bulk Selection
  selectedTarefas = signal<Set<number>>(new Set());
  bulkActionMode = signal(false);

  // Swimlanes
  swimlaneMode = signal<SwimlaneMode>('none');
  colunasComSwimlanes = computed<ColunaComSwimlanes[]>(() => {
    const cols = this.colunasOriginais();
    const tar = this.tarefasFiltradas();
    const mode = this.swimlaneMode();
    
    if (!cols.length) return [];
    
    return cols.map(c => {
      const tarefasColuna = tar
        .filter(t => t.colunaKanbanId === c.id)
        .sort((a, b) => a.ordem - b.ordem);
      
      if (mode === 'none') {
        return {
          id: c.id,
          nome: c.nome,
          cor: c.cor || '#94a3b8',
          limiteWip: c.limiteWip,
          swimlanes: [{ key: 'all', label: '', tarefas: tarefasColuna }],
          tarefas: tarefasColuna
        };
      }
      
      // Agrupar por swimlane
      const grupos = new Map<string, Swimlane>();
      
      tarefasColuna.forEach(t => {
        let key = 'sem-grupo';
        let label = 'Sem grupo';
        
        if (mode === 'assignee') {
          key = t.responsavelId || 'sem-responsavel';
          label = t.responsavelNome || 'Sem responsável';
        } else if (mode === 'prioridade') {
          key = String(t.prioridade || 0);
          label = this.prioridade(t.prioridade);
        }
        
        if (!grupos.has(key)) {
          grupos.set(key, { key, label, tarefas: [] });
        }
        grupos.get(key)!.tarefas.push(t);
      });
      
      const swimlanes = Array.from(grupos.values()).sort((a, b) => {
        if (mode === 'prioridade') return Number(b.key) - Number(a.key); // Urgente primeiro
        return a.label.localeCompare(b.label);
      });
      
      return {
        id: c.id,
        nome: c.nome,
        cor: c.cor || '#94a3b8',
        limiteWip: c.limiteWip,
        swimlanes,
        tarefas: tarefasColuna
      };
    });
  });

  // Inline Edit
  inlineEdit = signal<InlineEditState | null>(null);
  cardElements = viewChildren<CdkDrag<TarefaResumo>>('cardRef');

  // Keyboard Navigation
  focusedCardIndex = signal<number>(-1);
  focusedColumnIndex = signal<number>(-1);

  // IDs das listas conectadas (drag entre colunas)
  connectedTo = computed(() => this.colunasOriginais().map(c => 'col-' + (c.id ?? 'backlog')));

  colunas = computed<Coluna[]>(() => {
    const cols = this.colunasOriginais();
    const tar = this.tarefasFiltradas();
    if (!cols.length) return [];

    return cols.map(c => ({
      id: c.id,
      nome: c.nome,
      cor: c.cor || '#94a3b8',
      limiteWip: c.limiteWip,
      tarefas: tar
        .filter(t => t.colunaKanbanId === c.id)
        .sort((a, b) => a.ordem - b.ordem)
    }));
  });

  // Tarefas filtradas por quick filters
  tarefasFiltradas = computed(() => {
    const tar = this.tarefas();
    const f = this.quickFilters();
    let result = tar;

    if (f.buscar) {
      const busca = f.buscar.toLowerCase();
      result = result.filter(t =>
        t.titulo.toLowerCase().includes(busca) ||
        t.projetoCodigo.toLowerCase().includes(busca) ||
        t.projetoNome.toLowerCase().includes(busca)
      );
    }

    if (f.assignee) {
      result = result.filter(t => t.responsavelNome?.toLowerCase().includes(f.assignee!.toLowerCase()));
    }

    if (f.prioridade !== null) {
      result = result.filter(t => t.prioridade === f.prioridade);
    }

    if (f.apenasMinhas) {
      // TODO: obter usuario logado do auth service
      const currentUser = 'admin'; // placeholder
      result = result.filter(t => t.responsavelId === currentUser);
    }

    return result;
  });

  // WIP Limit exceeded columns
  colunasComWipExcedido = computed(() => {
    return this.colunas().filter(c => c.limiteWip && c.limiteWip > 0 && c.tarefas.length > c.limiteWip);
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

  // Column menu state
  openColumnMenu = signal<number | null>(null);

  // Quick Filters
  onQuickFilterChange(key: keyof QuickFilters, value: string | number | boolean): void {
    this.quickFilters.update(f => ({ ...f, [key]: value }));
  }

  temFiltrosAtivos(): boolean {
    const f = this.quickFilters();
    return !!f.buscar || !!f.assignee || f.prioridade !== null || f.apenasMinhas;
  }

  limparFiltros(): void {
    this.quickFilters.set({ assignee: '', prioridade: null, buscar: '', apenasMinhas: false });
  }

  aplicarFiltros(): void {
    // Trigger change detection via signal update
    this.quickFilters.update(f => ({ ...f }));
  }

  // Card Detail Drawer
  abrirDrawer(tarefaId: number): void {
    if (this.drawerLoading()) return;
    this.drawerLoading.set(true);
    this.tarefasService.obter(tarefaId).subscribe({
      next: (t) => {
        this.selectedTarefa.set(t);
        this.novoComentario.set('');
        this.drawerLoading.set(false);
      },
      error: () => this.drawerLoading.set(false)
    });
  }

  fecharDrawer(): void {
    this.selectedTarefa.set(null);
    this.novoComentario.set('');
  }

  adicionarComentario(tarefaId: number): void {
    const texto = this.novoComentario().trim();
    if (!texto) return;
    this.drawerLoading.set(true);
    this.tarefasService.adicionarComentario(tarefaId, { autorId: 'admin', texto }).subscribe({
      next: () => {
        this.novoComentario.set('');
        // Recarregar detalhes para mostrar o novo comentário
        this.tarefasService.obter(tarefaId).subscribe(t => this.selectedTarefa.set(t));
        this.drawerLoading.set(false);
      },
      error: () => this.drawerLoading.set(false)
    });
  }

  isOverdue(t: TarefaResumo | TarefaDetalhe): boolean {
    if (!t.dataPrevisao) return false;
    if (t.status === 'Concluida' || t.status === 'Concluido' || t.status === 'Cancelada' || t.status === 'Cancelado') return false;
    return new Date(t.dataPrevisao) < new Date(new Date().toDateString());
  }

  classePrioridadeStatus(status: string): string {
    const map: Record<string, string> = {
      'Backlog': 'imp-kanban__prio--baixa',
      'AFazer': 'imp-kanban__prio--media',
      'EmAndamento': 'imp-kanban__prio--alta',
      'EmHomologacao': 'imp-kanban__prio--media',
      'Concluida': 'imp-kanban__prio--baixa',
      'Concluido': 'imp-kanban__prio--baixa',
      'Bloqueada': 'imp-kanban__prio--urgente',
      'Bloqueado': 'imp-kanban__prio--urgente',
      'Cancelada': 'imp-kanban__prio--baixa',
      'Cancelado': 'imp-kanban__prio--baixa'
    };
    return map[status] ?? 'imp-kanban__prio--baixa';
  }

  formatarStatus(s: string): string {
    const map: Record<string, string> = {
      'Backlog': 'Backlog', 'AFazer': 'A Fazer', 'EmAndamento': 'Em andamento',
      'EmHomologacao': 'Homologação', 'Concluida': 'Concluída', 'Concluido': 'Concluído',
      'Cancelada': 'Cancelada', 'Cancelado': 'Cancelado',
      'Bloqueada': 'Bloqueada', 'Bloqueado': 'Bloqueado'
    };
    return map[s] ?? s;
  }

  // Drag visual feedback
  onDragEntered(coluna: Coluna): void {
    // Visual feedback handled by CSS .cdk-drop-list-dragging
  }

  onDragExited(coluna: Coluna): void {
    // Visual feedback handled by CSS
  }

  // Column Menu
  toggleColumnMenu(colunaId: number): void {
    this.openColumnMenu.update(current => current === colunaId ? null : colunaId);
  }

  fecharColumnMenu(): void {
    this.openColumnMenu.set(null);
  }

  editarColuna(coluna: Coluna): void {
    this.fecharColumnMenu();
    const novoNome = prompt(`Editar nome da coluna "${coluna.nome}":`, coluna.nome);
    if (novoNome !== null && novoNome.trim() !== '' && novoNome.trim() !== coluna.nome) {
      const colunaOriginal = this.colunasOriginais().find(c => c.id === coluna.id);
      const req: ColunaKanbanAtualizarRequest = {
        nome: novoNome.trim(),
        ordem: colunaOriginal?.ordem || 0,
        cor: coluna.cor,
        ativa: true,
        limiteWip: coluna.limiteWip
      };
      this.colunasService.atualizar(coluna.id!, req).subscribe({
        next: () => {
          this.colunasOriginais.update(arr => arr.map(c => c.id === coluna.id ? { ...c, nome: novoNome.trim() } : c));
          this.toastSucesso('Coluna renomeada');
        },
        error: (err) => this.toastErro('Erro ao renomear: ' + (err.error?.mensagem || err.message))
      });
    }
  }

  definirWip(coluna: Coluna): void {
    this.fecharColumnMenu();
    const novoWip = prompt(`Definir WIP Limit para "${coluna.nome}" (atual: ${coluna.limiteWip || 'sem limite'}):`, String(coluna.limiteWip || ''));
    if (novoWip !== null) {
      const wip = novoWip.trim() ? Number(novoWip) : undefined;
      const req: ColunaKanbanAtualizarRequest = {
        nome: coluna.nome,
        ordem: 0, // placeholder
        cor: coluna.cor,
        ativa: true,
        limiteWip: wip
      };
      this.colunasService.atualizar(coluna.id!, req).subscribe({
        next: () => {
          this.colunasOriginais.update(arr => arr.map(c => c.id === coluna.id ? { ...c, limiteWip: wip } : c));
          this.toastSucesso(wip ? `WIP Limit definido para ${wip}` : 'WIP Limit removido');
        },
        error: (err) => this.toastErro('Erro ao definir WIP: ' + (err.error?.mensagem || err.message))
      });
    }
  }

  ocultarColuna(coluna: Coluna): void {
    this.fecharColumnMenu();
    if (confirm(`Ocultar coluna "${coluna.nome}"?`)) {
      const req: ColunaKanbanAtualizarRequest = {
        nome: coluna.nome,
        ordem: 0,
        cor: coluna.cor,
        ativa: false,
        limiteWip: coluna.limiteWip
      };
      this.colunasService.atualizar(coluna.id!, req).subscribe({
        next: () => {
          this.colunasOriginais.update(arr => arr.map(c => c.id === coluna.id ? { ...c, ativa: false } : c));
          this.toastSucesso('Coluna ocultada');
        },
        error: (err) => this.toastErro('Erro ao ocultar coluna: ' + (err.error?.mensagem || err.message))
      });
    }
  }

  // Add Card Inline
  mostrarFormNovaTarefa(colunaId: number): void {
    this.showingAddForm.set(colunaId);
    this.novaTarefaTitulo.set('');
    this.novaTarefaDescricao.set('');
    this.novaTarefaPrioridade.set(2);
    this.novaTarefaResponsavel.set('');
    // Focus no input na próxima tick
    setTimeout(() => {
      const input = document.querySelector('.imp-kanban__add-input') as HTMLInputElement;
      input?.focus();
    }, 0);
  }

  cancelarNovaTarefa(): void {
    this.showingAddForm.set(null);
    this.novaTarefaTitulo.set('');
    this.novaTarefaDescricao.set('');
    this.novaTarefaResponsavel.set('');
  }

  criarTarefa(colunaId: number): void {
    const titulo = this.novaTarefaTitulo().trim();
    if (!titulo) return;

    const projetoSelecionado = this.projetos().find(p => p.id === Number(this.projetoId()));
    if (!projetoSelecionado && this.projetoId()) {
      alert('Selecione um projeto válido');
      return;
    }

    const req: TarefaCriarRequest = {
      projetoId: projetoSelecionado?.id || 0,
      colunaKanbanId: colunaId,
      titulo,
      descricao: this.novaTarefaDescricao() || undefined,
      responsavelId: this.novaTarefaResponsavel() || undefined,
      criadorId: 'admin', // TODO: obter do auth
      prioridade: this.novaTarefaPrioridade(),
      ordem: this.colunas().find(c => c.id === colunaId)?.tarefas.length || 0,
      horasEstimadas: undefined
    };

    this.tarefasService.criar(req).subscribe({
      next: (t) => {
        this.tarefas.update(arr => [...arr, {
          id: t.id,
          projetoId: t.projetoId,
          projetoCodigo: t.projetoCodigo,
          projetoNome: t.projetoNome,
          titulo: t.titulo,
          responsavelId: t.responsavelId,
          responsavelNome: t.responsavelNome,
          status: t.status,
          prioridade: t.prioridade,
          colunaKanbanId: t.colunaKanbanId,
          ordem: t.ordem,
          dataPrevisao: t.dataPrevisao,
          dataConclusao: t.dataConclusao,
          bloqueada: t.bloqueada,
          bloqueadaMotivo: t.motivoBloqueio,
          horasEstimadas: t.horasEstimadas,
          horasRealizadas: t.horasRealizadas,
          chamadoLegadoId: undefined,
          dataInclusao: t.dataInclusao
        }]);
        this.cancelarNovaTarefa();
      },
      error: (err) => {
        console.error('Erro ao criar tarefa:', err);
        alert('Erro ao criar tarefa: ' + (err.error?.mensagem || err.message));
      }
    });
  }

  // Task menu (placeholder)
  abrirMenuTarefa(tarefa: TarefaResumo, event: MouseEvent): void {
    event.stopPropagation();
    // TODO: implementar dropdown de ações da tarefa (editar, excluir, mover, duplicar)
    console.log('Menu tarefa:', tarefa);
  }

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

  // Swimlane
  onSwimlaneChange(mode: SwimlaneMode): void {
    this.swimlaneMode.set(mode);
  }

  // Inline Edit
  private clickTimeout: any = null;

  onCardClick(tarefa: TarefaResumo, event: MouseEvent): void {
    // Delay para distinguir click de double-click
    this.clickTimeout = setTimeout(() => {
      if (!this.inlineEdit()) {
        this.abrirDrawer(tarefa.id);
      }
    }, 200);
  }

  iniciarInlineEdit(tarefa: TarefaResumo, field: 'titulo' | 'prioridade' | 'responsavel', event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    clearTimeout(this.clickTimeout);
    
    let value: string | number = '';
    if (field === 'titulo') value = tarefa.titulo;
    else if (field === 'prioridade') value = tarefa.prioridade;
    else if (field === 'responsavel') value = tarefa.responsavelId || '';
    
    this.inlineEdit.set({
      tarefaId: tarefa.id,
      field,
      value,
      originalValue: value
    });
    
    // Focus no input na próxima tick
    setTimeout(() => {
      const input = document.querySelector('.imp-kanban__inline-edit-input, .imp-kanban__inline-edit-select') as HTMLInputElement;
      input?.focus();
      if (input && field === 'titulo') {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 0);
  }

  salvarInlineEdit(tarefa: TarefaResumo, field: 'titulo' | 'prioridade' | 'responsavel'): void {
    const edit = this.inlineEdit();
    if (!edit || edit.tarefaId !== tarefa.id || edit.field !== field) return;
    
    const newValue = edit.value;
    if (field === 'titulo' && (!newValue || String(newValue).trim() === '')) {
      this.cancelarInlineEdit();
      return;
    }
    
    if (String(newValue).trim() === String(edit.originalValue).trim()) {
      this.cancelarInlineEdit();
      return;
    }
    
    const req: TarefaAtualizarRequest = {
      titulo: tarefa.titulo,
      descricao: undefined, // TarefaResumo não tem descricao
      responsavelId: tarefa.responsavelId,
      prioridade: tarefa.prioridade,
      ordem: tarefa.ordem,
      dataPrevisao: tarefa.dataPrevisao,
      dataConclusao: tarefa.dataConclusao,
      horasEstimadas: tarefa.horasEstimadas,
      horasRealizadas: tarefa.horasRealizadas,
      bloqueada: tarefa.bloqueada,
      motivoBloqueio: tarefa.bloqueadaMotivo,
      usuarioAlteracao: 'admin'
    };
    
    if (field === 'titulo') req.titulo = String(newValue).trim();
    else if (field === 'prioridade') req.prioridade = Number(newValue);
    else if (field === 'responsavel') req.responsavelId = String(newValue).trim() || undefined;
    
    this.tarefasService.atualizar(tarefa.id, req).subscribe({
      next: (t) => {
        this.tarefas.update(arr => arr.map(item => 
          item.id === t.id ? { ...item, [field]: field === 'prioridade' ? Number(newValue) : newValue } : item
        ));
        this.toastSucesso(`${field === 'titulo' ? 'Título' : field === 'prioridade' ? 'Prioridade' : 'Responsável'} atualizado`);
        this.inlineEdit.set(null);
      },
      error: (err) => {
        console.error('Erro ao atualizar tarefa:', err);
        this.toastErro('Erro ao atualizar: ' + (err.error?.mensagem || err.message));
        this.cancelarInlineEdit();
      }
    });
  }

  cancelarInlineEdit(): void {
    this.inlineEdit.set(null);
    clearTimeout(this.clickTimeout);
  }

  onInlineEditValueChange(value: string | number): void {
    this.inlineEdit.update(edit => edit ? { ...edit, value } : null);
  }

  // Keyboard Navigation
  onCardKeydown(tarefa: TarefaResumo, event: KeyboardEvent): void {
    const cols = this.colunasComSwimlanes();
    const currentColIdx = this.focusedColumnIndex();
    const currentCardIdx = this.focusedCardIndex();
    
    // Encontrar a coluna e índice do card atual
    let foundColIdx = -1;
    let foundCardIdx = -1;
    
    for (let ci = 0; ci < cols.length; ci++) {
      const flatTasks = cols[ci].swimlanes.flatMap(s => s.tarefas);
      const idx = flatTasks.findIndex(t => t.id === tarefa.id);
      if (idx >= 0) {
        foundColIdx = ci;
        foundCardIdx = idx;
        break;
      }
    }
    
    if (foundColIdx === -1) return;
    
    const currentCol = cols[foundColIdx];
    const flatTasks = currentCol.swimlanes.flatMap(s => s.tarefas);
    
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.focarProximoCard(foundColIdx, foundCardIdx, 1, cols);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.focarProximoCard(foundColIdx, foundCardIdx, -1, cols);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focarCardNaMesmaColuna(foundColIdx, foundCardIdx, 1, flatTasks);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focarCardNaMesmaColuna(foundColIdx, foundCardIdx, -1, flatTasks);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.abrirDrawer(tarefa.id);
        break;
      case 'Escape':
        event.preventDefault();
        this.fecharDrawer();
        this.cancelarInlineEdit();
        this.cancelarNovaTarefa();
        this.fecharColumnMenu();
        this.limparFoco();
        break;
      case 'F2':
        event.preventDefault();
        this.iniciarInlineEdit(tarefa, 'titulo', event as unknown as MouseEvent);
        break;
      case 'Tab':
        // Deixar o browser gerenciar Tab natural, mas atualizar estado interno
        setTimeout(() => this.atualizarFocoDoDOM(), 0);
        break;
    }
  }

  private focarProximoCard(colIdx: number, cardIdx: number, direction: number, cols: ColunaComSwimlanes[]): void {
    const nextColIdx = colIdx + direction;
    if (nextColIdx < 0 || nextColIdx >= cols.length) return;
    
    const nextCol = cols[nextColIdx];
    const nextFlatTasks = nextCol.swimlanes.flatMap(s => s.tarefas);
    if (nextFlatTasks.length === 0) {
      // Tentar próxima coluna
      this.focarProximoCard(nextColIdx, 0, direction, cols);
      return;
    }
    
    // Tentar manter posição relativa
    const targetIdx = Math.min(cardIdx, nextFlatTasks.length - 1);
    this.focusedColumnIndex.set(nextColIdx);
    this.focusedCardIndex.set(targetIdx);
    this.focarElemento(nextColIdx, targetIdx);
  }

  private focarCardNaMesmaColuna(colIdx: number, cardIdx: number, direction: number, flatTasks: TarefaResumo[]): void {
    const nextIdx = cardIdx + direction;
    if (nextIdx < 0 || nextIdx >= flatTasks.length) return;
    
    this.focusedCardIndex.set(nextIdx);
    this.focarElemento(colIdx, nextIdx);
  }

  private focarElemento(colIdx: number, cardIdx: number): void {
    setTimeout(() => {
      const cards = document.querySelectorAll('.imp-kanban__card[tabindex="0"]');
      const colCards = Array.from(cards).filter((_, i) => {
        // Encontrar cards da coluna correta
        return true; // Simplificado - na prática precisaria mapear melhor
      });
      if (colCards[cardIdx]) {
        (colCards[cardIdx] as HTMLElement).focus();
      }
    }, 0);
  }

  private atualizarFocoDoDOM(): void {
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl?.classList.contains('imp-kanban__card')) {
      // Atualizar índices internos baseado no elemento focado
    }
  }

  limparFoco(): void {
    this.focusedColumnIndex.set(-1);
    this.focusedCardIndex.set(-1);
  }

  // Toast notifications (simples)
  private toastTimeout: any = null;
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error' | 'info'>('info');

  toastSucesso(msg: string): void {
    this.toastMessage.set(msg);
    this.toastType.set('success');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 3000);
  }

  toastErro(msg: string): void {
    this.toastMessage.set(msg);
    this.toastType.set('error');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 5000);
  }

  // Bulk Selection
  toggleTarefaSelection(tarefaId: number, event: Event): void {
    event.stopPropagation();
    this.selectedTarefas.update(set => {
      const newSet = new Set(set);
      if (newSet.has(tarefaId)) {
        newSet.delete(tarefaId);
      } else {
        newSet.add(tarefaId);
      }
      this.bulkActionMode.set(newSet.size > 0);
      return newSet;
    });
  }

  sairModoBulk(): void {
    this.selectedTarefas.set(new Set());
    this.bulkActionMode.set(false);
  }

  bulkMoverParaColuna(): void {
    const ids = Array.from(this.selectedTarefas());
    if (ids.length === 0) return;
    
    const cols = this.colunasComSwimlanes().map(c => c.nome);
    const destino = prompt(`Mover ${ids.length} tarefa(s) para qual coluna?\n${cols.join('\n')}`);
    if (!destino) return;
    
    const colunaDestino = this.colunasComSwimlanes().find(c => c.nome === destino);
    if (!colunaDestino) {
      this.toastErro('Coluna não encontrada');
      return;
    }
    
    ids.forEach(id => {
      this.tarefasService.mudarColuna(id, {
        colunaKanbanId: colunaDestino.id ?? undefined,
        novaOrdem: 0
      }).subscribe({
        error: (err) => console.error('Erro ao mover:', err)
      });
    });
    
    this.sairModoBulk();
    this.toastSucesso(`${ids.length} tarefa(s) movida(s) para "${destino}"`);
    setTimeout(() => this.carregar(), 500);
  }

  bulkAlterarPrioridade(): void {
    const ids = Array.from(this.selectedTarefas());
    if (ids.length === 0) return;
    
    const prioridade = prompt(`Definir prioridade para ${ids.length} tarefa(s):\n1 - Baixa\n2 - Média\n3 - Alta\n4 - Urgente`, '2');
    if (!prioridade) return;
    
    const p = Number(prioridade);
    if (p < 1 || p > 4) {
      this.toastErro('Prioridade inválida');
      return;
    }
    
    ids.forEach(id => {
      this.tarefasService.atualizar(id, {
        titulo: '',
        descricao: undefined,
        responsavelId: undefined,
        prioridade: p,
        ordem: 0,
        dataPrevisao: undefined,
        dataConclusao: undefined,
        horasEstimadas: undefined,
        horasRealizadas: undefined,
        bloqueada: false,
        motivoBloqueio: undefined,
        usuarioAlteracao: 'admin'
      }).subscribe({
        error: (err) => console.error('Erro ao atualizar:', err)
      });
    });
    
    this.sairModoBulk();
    this.toastSucesso(`Prioridade alterada para ${this.prioridade(p)} em ${ids.length} tarefa(s)`);
    setTimeout(() => this.carregar(), 500);
  }

  bulkAtribuirResponsavel(): void {
    const ids = Array.from(this.selectedTarefas());
    if (ids.length === 0) return;
    
    const responsavel = prompt(`Atribuir responsável para ${ids.length} tarefa(s) (ID do operador):`);
    if (!responsavel) return;
    
    ids.forEach(id => {
      this.tarefasService.atualizar(id, {
        titulo: '',
        descricao: undefined,
        responsavelId: responsavel.trim(),
        prioridade: 0,
        ordem: 0,
        dataPrevisao: undefined,
        dataConclusao: undefined,
        horasEstimadas: undefined,
        horasRealizadas: undefined,
        bloqueada: false,
        motivoBloqueio: undefined,
        usuarioAlteracao: 'admin'
      }).subscribe({
        error: (err) => console.error('Erro ao atribuir:', err)
      });
    });
    
    this.sairModoBulk();
    this.toastSucesso(`Responsável atribuído em ${ids.length} tarefa(s)`);
    setTimeout(() => this.carregar(), 500);
  }

  bulkExcluir(): void {
    const ids = Array.from(this.selectedTarefas());
    if (ids.length === 0) return;
    
    if (!confirm(`Excluir ${ids.length} tarefa(s) permanentemente?`)) return;
    
    ids.forEach(id => {
      this.tarefasService.excluir(id).subscribe({
        error: (err) => console.error('Erro ao excluir:', err)
      });
    });
    
    this.sairModoBulk();
    this.toastSucesso(`${ids.length} tarefa(s) excluída(s)`);
    setTimeout(() => this.carregar(), 500);
  }
}
