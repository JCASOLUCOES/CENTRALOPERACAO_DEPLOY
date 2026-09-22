import { Component, OnInit, inject, signal, computed, effect, viewChildren, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CdkDragDrop, DragDropModule, CdkDrag } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ProjetosService } from '../../services/projetos.service';
import { TarefasService } from '../../services/tarefas.service';
import { ColunasKanbanService } from '../../services/cadastros.service';
import { AuthService } from '@core/services/auth.service';
import { TarefaResumo, TarefaDetalhe, TarefaFiltro, TarefaCriarRequest, ComentarioCriarRequest, TarefaAtualizarRequest, ehAtrasada } from '../../models/tarefa.model';
import { ColunaKanbanResumo } from '../../models/cadastros.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ProjetoResumo } from '../../models/projeto.model';
import { UsuarioDropdownComponent } from '@shared/components/usuario-dropdown/usuario-dropdown.component';
import { ChatContextoService } from '@features/chat/chat-contexto.service';

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
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule, ScrollingModule, UsuarioDropdownComponent, PageHeaderComponent],
  template: `
    <section class="adm-page imp-kanban">
      <app-page-header
        titulo="Kanban"
        descricao="Visualize e mova tarefas entre colunas. Atualizações sincronizam com o backend."
        icone="bi-kanban">
        <div actions class="imp-kanban__controls">
          <select class="adm-search__input" [value]="projetoId()" (change)="onProjetoChange($any($event.target).value)">
            <option value="">Todos os projetos</option>
          <option *ngFor="let p of projetos()" [value]="p.id">{{ p.codigo }} — {{ p.nome }}</option>
            </select>
        </div>
      </app-page-header>

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
            <option [value]="0">Baixa</option>
            <option [value]="1">Média</option>
            <option [value]="2">Alta</option>
            <option [value]="3">Urgente</option>
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
        <span class="imp-kanban__filter-count" *ngIf="temFiltrosAtivos()" role="status">
          Exibindo {{ tarefasFiltradas().length }} de {{ tarefas().length }}
        </span>
      </div>

      <!-- Métricas rápidas (Corretor #5 Passo 4) -->
      <div class="imp-kanban__metrics" *ngIf="!loading() && tarefas().length">
        <span class="imp-kanban__metric"><strong>{{ tarefas().length }}</strong> tarefas</span>
        <span class="imp-kanban__metric imp-kanban__metric--ok"><strong>{{ metricas().concluidas }}</strong> concluídas</span>
        <span class="imp-kanban__metric imp-kanban__metric--warn" *ngIf="metricas().atrasadas"><strong>{{ metricas().atrasadas }}</strong> atrasadas</span>
        <span class="imp-kanban__metric imp-kanban__metric--danger" *ngIf="metricas().urgentes"><strong>{{ metricas().urgentes }}</strong> urgentes abertas</span>
        <span class="imp-kanban__metric" *ngIf="metricas().semResponsavel"><strong>{{ metricas().semResponsavel }}</strong> sem responsável</span>
      </div>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>Carregando kanban...</p>
      </div>

      <div *ngIf="!loading() && colunasComSwimlanes().length" class="imp-kanban__board" cdkDropListGroup>
        <div *ngFor="let coluna of colunasComSwimlanes(); let colIdx = index; trackBy: trackByColuna"
             class="imp-kanban__coluna"
             [class.imp-kanban__coluna--wip-exceeded]="coluna.limiteWip && coluna.limiteWip > 0 && coluna.tarefas.length > coluna.limiteWip"
             cdkDropList
             [cdkDropListData]="coluna.tarefas"
             (cdkDropListDropped)="onDrop($event, coluna)">
          <header class="imp-kanban__coluna-head">
            <div class="imp-kanban__coluna-title">
              <span class="imp-kanban__dot" [style.background]="coluna.cor"></span>
              <span>{{ coluna.nome }}</span>
              <span class="imp-kanban__count">{{ coluna.tarefas.length }}</span>
              <span class="imp-kanban__wip-badge" *ngIf="coluna.limiteWip && coluna.limiteWip > 0">
                {{ coluna.tarefas.length }}/{{ coluna.limiteWip }}
              </span>
            </div>
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
                        [attr.data-prioridade]="t.prioridade"
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
                  <div class="imp-kanban__menu-overlay" *ngIf="menuTarefaAberta()?.id === t.id" (click)="fecharMenuTarefa()"></div>
                  <div class="imp-kanban__card-dropdown" *ngIf="menuTarefaAberta()?.id === t.id" [style.top.px]="calcularTopoMenu()" [style.left.px]="calcularEsquerdaMenu()">
                    <button class="imp-kanban__dropdown-item" (click)="editarTarefaDoMenu(t); fecharMenuTarefa()">
                      <i class="bi bi-pencil-square"></i> Editar
                    </button>
                    <button class="imp-kanban__dropdown-item" (click)="duplicarTarefa(t); fecharMenuTarefa()">
                      <i class="bi bi-copy"></i> Duplicar
                    </button>
                    <div class="imp-kanban__dropdown-divider"></div>
                    <button
                      *ngIf="!t.arquivada && t.status === 'Concluida'"
                      class="imp-kanban__dropdown-item"
                      (click)="arquivarTarefaDoMenu(t); fecharMenuTarefa()">
                      <i class="bi bi-archive"></i> Arquivar
                    </button>
                    <button
                      *ngIf="t.arquivada"
                      class="imp-kanban__dropdown-item"
                      (click)="desarquivarTarefaDoMenu(t); fecharMenuTarefa()">
                      <i class="bi bi-archive-fill"></i> Desarquivar
                    </button>
                    <div class="imp-kanban__dropdown-divider"></div>
                    <button class="imp-kanban__dropdown-item imp-kanban__dropdown-item--danger" (click)="excluirTarefaDoMenu(t); fecharMenuTarefa()">
                      <i class="bi bi-trash"></i> Excluir
                    </button>
                  </div>
                </div>
                <a [routerLink]="['/implantacao/projetos', t.projetoId]" class="imp-kanban__card-projeto">
                  <span class="imp-code">{{ t.projetoCodigo }}</span>
                  <span class="imp-kanban__card-cliente">{{ t.projetoNome }}</span>
                </a>
                <div class="imp-kanban__card-meta" *ngIf="t.responsavelNome || t.dataPrevisao || t.projetoEtapaNome">
                  <span class="imp-kanban__assignee" *ngIf="t.responsavelNome">
                    <i class="bi bi-person"></i> {{ t.responsavelNome }}
                  </span>
                  <span class="imp-kanban__etapa" *ngIf="t.projetoEtapaNome" [title]="'Etapa: ' + t.projetoEtapaNome">
                    <i class="bi bi-flag"></i> {{ t.projetoEtapaNome }}
                  </span>
                  <span class="imp-kanban__due" *ngIf="slaInfo(t) as sla" [ngClass]="sla.classe">
                    <i class="bi bi-calendar"></i> {{ sla.texto }}
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
                            [ngModel]="inlineEdit()?.value ?? 1"
                            (ngModelChange)="onInlineEditValueChange($event)"
                            (blur)="salvarInlineEdit(t, 'prioridade')"
                            (keydown.escape)="cancelarInlineEdit()"
                            (change)="salvarInlineEdit(t, 'prioridade')"
                            #prioridadeSelect
                            aria-label="Editar prioridade">
                      <option [value]="0">Baixa</option>
                      <option [value]="1">Média</option>
                      <option [value]="2">Alta</option>
                      <option [value]="3">Urgente</option>
                    </select>
                  </div>
                  <span class="imp-kanban__horas">
                    <i class="bi bi-clock"></i>
                    {{ formatHoras(t.horasEstimadas, t.horasRealizadas) }}
                  </span>
                </div>
              </article>
            </ng-container>

            <!-- Add Card Trigger -->
            <button
              type="button"
              class="imp-kanban__add-trigger"
              *ngIf="showingAddForm() !== coluna.id"
              (click)="mostrarFormNovaTarefa(coluna.id!)">
              <i class="bi bi-plus"></i>
              <span>Adicionar tarefa</span>
            </button>

            <!-- Add Card Inline Form -->
            <div *ngIf="showingAddForm() === coluna.id" class="imp-kanban__add-card">
              <div class="imp-kanban__add-form" (keydown.escape)="cancelarNovaTarefa()">
                <input
                  type="text"
                  class="imp-kanban__add-input"
                  placeholder="Título da tarefa *"
                  [ngModel]="novaTarefaTitulo()"
                  (ngModelChange)="novaTarefaTitulo.set($event ?? '')"
                  (keydown.enter)="criarTarefa(coluna.id!)"
                  aria-label="Título da nova tarefa">
                <textarea
                  class="imp-kanban__add-input"
                  rows="2"
                  placeholder="Descrição (opcional)"
                  [ngModel]="novaTarefaDescricao()"
                  (ngModelChange)="novaTarefaDescricao.set($event ?? '')"
                  aria-label="Descrição da nova tarefa"></textarea>
                <div class="imp-kanban__add-row">
                  <select
                    class="imp-kanban__add-select"
                    [ngModel]="novaTarefaPrioridade()"
                    (ngModelChange)="novaTarefaPrioridade.set(Number($event))"
                    aria-label="Prioridade da nova tarefa">
                    <option [value]="0">Baixa</option>
                    <option [value]="1">Média</option>
                    <option [value]="2">Alta</option>
                    <option [value]="3">Urgente</option>
                  </select>
                  <input
                    type="date"
                    class="imp-kanban__add-input imp-kanban__add-input--small"
                    [ngModel]="novaTarefaDataEntrega()"
                    (ngModelChange)="novaTarefaDataEntrega.set($event ?? '')"
                    aria-label="Data de entrega da nova tarefa"
                    title="Data de entrega *">
                </div>
                <div class="imp-kanban__add-row">
                  <app-usuario-dropdown
                    [selecionados]="novaTarefaResponsavelIds()"
                    (selecaoChange)="novaTarefaResponsavelIds.set($event)">
                  </app-usuario-dropdown>
                </div>
                <div class="imp-kanban__add-row">
                  <select
                    class="imp-kanban__add-select"
                    [ngModel]="novaTarefaProjetoId() ?? ''"
                    (ngModelChange)="aoMudarProjetoNovaTarefa($event)"
                    aria-label="Projeto da nova tarefa">
                    <option [value]="''">Sem projeto</option>
                    <option *ngFor="let p of projetos()" [value]="p.id">{{ p.codigo }} — {{ p.nome }}</option>
                  </select>
                </div>
                <div class="imp-kanban__add-row" *ngIf="novaTarefaProjetoId() !== null && etapasFixasCriacao().length">
                  <select
                    class="imp-kanban__add-select"
                    [ngModel]="novaTarefaProjetoEtapaId() ?? ''"
                    (ngModelChange)="novaTarefaProjetoEtapaId.set($event === '' || $event == null ? null : Number($event))"
                    aria-label="Etapa do projeto (card) da nova tarefa"
                    title="Define o card fixo cujo contador soma esta tarefa"
                    required
                  >
                    <option *ngFor="let e of etapasFixasCriacao()" [value]="e.id">{{ e.ordem }} — {{ e.nome }}</option>
                  </select>
                </div>
                <div class="imp-kanban__add-erro" *ngIf="erroNovaTarefa()">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>{{ erroNovaTarefa() }}</span>
                </div>
                <div class="imp-kanban__add-actions">
                  <button
                    type="button"
                    class="imp-kanban__btn imp-kanban__btn--primary"
                    (click)="criarTarefa(coluna.id!)"
                    [disabled]="!novaTarefaTitulo().trim() || criandoTarefa()">
                    <i class="bi" [ngClass]="criandoTarefa() ? 'bi-hourglass-split' : 'bi-check-lg'"></i>
                    {{ criandoTarefa() ? 'Criando...' : 'Criar' }}
                  </button>
                  <button
                    type="button"
                    class="imp-kanban__btn imp-kanban__btn--ghost"
                    (click)="cancelarNovaTarefa()"
                    [disabled]="criandoTarefa()">
                    <i class="bi bi-x"></i> Cancelar
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="!coluna.tarefas.length && showingAddForm() !== coluna.id" class="imp-kanban__vazio">
              <i class="bi bi-inbox"></i>
              <span>Sem tarefas</span>
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
          <button type="button" class="imp-kanban__btn imp-kanban__btn--ghost imp-kanban__jota-btn" (click)="perguntarJota(t)">
            <i class="bi bi-robot"></i> Perguntar ao JOTA sobre esta tarefa
          </button>
          <div class="imp-kanban__drawer-section imp-kanban__reatribuir">
            <h3>Responsáveis</h3>
            <app-usuario-dropdown
              [selecionados]="reatribuirIds()"
              (selecaoChange)="reatribuirIds.set($event)">
            </app-usuario-dropdown>
            <button type="button" class="imp-kanban__btn imp-kanban__btn--primary" (click)="salvarReatribuicao()" [disabled]="reatribuindo()">
              <i class="bi" [ngClass]="reatribuindo() ? 'bi-hourglass-split' : 'bi-person-check'"></i>
              {{ reatribuindo() ? 'Salvando...' : 'Salvar responsáveis' }}
            </button>
          </div>
          <div class="imp-kanban__drawer-section">
            <div class="imp-kanban__drawer-field">
              <label>Projeto</label>
              <a [routerLink]="['/implantacao/projetos', t.projetoId]" class="imp-kanban__drawer-link">
                <span class="imp-code">{{ t.projetoCodigo }}</span> {{ t.projetoNome }}
              </a>
            </div>
            <div class="imp-kanban__drawer-field" *ngIf="t.projetoEtapaNome">
              <label>Etapa do projeto</label>
              <a [routerLink]="['/implantacao/kanban']" [queryParams]="{ projetoId: t.projetoId, etapaId: t.projetoEtapaId }" class="imp-kanban__drawer-link">
                <i class="bi bi-flag"></i> {{ t.projetoEtapaNome }}
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
              <label>Prazo</label>
              <span [class.imp-kanban__due--overdue]="isOverdue(t)">{{ (t.dataEntrega ?? t.dataPrevisao) ? ((t.dataEntrega ?? t.dataPrevisao) | date:'dd/MM/yyyy') : '—' }}</span>
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
  private readonly auth = inject(AuthService);
  private readonly chatCtx = inject(ChatContextoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tarefas = signal<TarefaResumo[]>([]);
  colunasOriginais = signal<ColunaKanbanResumo[]>([]);
  projetos = signal<ProjetoResumo[]>([]);
  loading = signal(true);
  projetoId = signal<string>('');
  /** Operadores válidos (para validar responsáveis antes do POST). */
  operadores = signal<{ id: string; nome: string }[]>([]);

  /** Filtro por perfil do operador responsável (ex: 'F' para Kanban ADM). */
  perfilFiltro = signal<string | null>(null);

  /** Modo do filtro de perfil: 'excluir' (implantação) ou 'incluir' (admin). */
  perfilModo = signal<'incluir' | 'excluir'>('excluir');

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

  // Reatribuição (Corretor #5: gestor reatribui via dropdown, sem prompt)
  reatribuirIds = signal<string[]>([]);
  reatribuindo = signal(false);

  // Card Action Menu
  menuTarefaAberta = signal<TarefaResumo | null>(null);

  // Add Card Inline
  showingAddForm = signal<number | null>(null);
  novaTarefaTitulo = signal('');
  novaTarefaDescricao = signal('');
  // Prioridade na escala do backend (PrioridadeTarefa): 0 Baixa … 3 Urgente
  novaTarefaPrioridade = signal(1);
  novaTarefaTipo = signal(0);
  novaTarefaResponsavelIds = signal<string[]>([]);
  novaTarefaProjetoId = signal<number | null>(null);
  /** Etapas FIXAS do projeto (cards de 9; alimenta o contador dinâmico). */
  novaTarefaProjetoEtapaId = signal<number | null>(null);
  etapasFixasCriacao = signal<{ id: number; ordem: number; nome: string; estado: string }[]>([]);
  novaTarefaChamadoIds = signal<number[]>([]);
  novaTarefaDataEntregaDate = signal<Date | null>(null);
  novaTarefaDataEntrega = signal('');
  erroNovaTarefa = signal<string | null>(null);
  criandoTarefa = signal(false);
  protected readonly Number = Number;

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

  // Métricas rápidas do quadro (Corretor #5 Passo 4)
  metricas = computed(() => {
    const tar = this.tarefas();
    const aberta = (t: TarefaResumo) => t.status !== 'Concluida' && t.status !== 'Concluido' && t.status !== 'Cancelada' && t.status !== 'Cancelado';
    return {
      concluidas: tar.filter(t => !aberta(t)).length,
      atrasadas: tar.filter(t => ehAtrasada(t)).length,
      urgentes: tar.filter(t => aberta(t) && t.prioridade === 3).length,
      semResponsavel: tar.filter(t => aberta(t) && !t.responsavelId).length
    };
  });

  ngOnInit(): void {
    this.colunasService.listar(false).subscribe(cs => this.colunasOriginais.set(cs));
    this.projetosService.listar({}).subscribe(ps => this.projetos.set(ps));
    this.tarefasService.listarOperadores().subscribe({
      next: ops => this.operadores.set(ops ?? []),
      error: () => this.operadores.set([])
    });
    // Detecta se é Kanban Admin (/admin/kanban) ou Implantação (/implantacao/kanban)
    const isAdminRoute = this.router.url.includes('/admin/kanban');
    this.perfilModo.set(isAdminRoute ? 'incluir' : 'excluir');
    // Deep-link da timeline do projeto (?projetoId=) + Kanban ADM (?perfil=F).
    this.route.queryParams.subscribe(qp => {
      const pid = qp['projetoId'];
      const perfil = qp['perfil'];
      if (pid && /^\d+$/.test(pid)) this.projetoId.set(pid);
      if (perfil) this.perfilFiltro.set(perfil);
    });
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    const filtro: TarefaFiltro = {};
    if (this.projetoId()) filtro.projetoId = Number(this.projetoId());
    const perfil = this.perfilFiltro();
    if (perfil) {
      filtro.perfilId = perfil;
      filtro.perfilModo = this.perfilModo();
    }
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
    const tarefa = event.item.data as TarefaResumo | undefined;
    if (!tarefa) return;

    const origemId = tarefa.colunaKanbanId ?? null;
    const destinoId = colunaDestino.id ?? null;

    // Drop sem mudança real (mesma posição)
    if (origemId === destinoId && event.previousIndex === event.currentIndex) return;

    // Coluna BLOQUEADO exige motivo (validação do backend)
    let motivoBloqueio: string | undefined;
    const nomeDestino = (colunaDestino.nome || '').toUpperCase();
    if (nomeDestino.includes('BLOQUEAD')) {
      const motivo = prompt('Informe o motivo do bloqueio:');
      if (!motivo || !motivo.trim()) {
        this.toastErro('Motivo do bloqueio é obrigatório para mover para BLOQUEADO.');
        return;
      }
      motivoBloqueio = motivo.trim();
    }

    const anterior = { colunaKanbanId: tarefa.colunaKanbanId, ordem: tarefa.ordem };

    // Atualização otimista no signal `tarefas` (o computed de colunas se recria a partir dele)
    this.tarefas.update(arr => {
      const outras = arr.filter(x => x.id !== tarefa.id).map(x => ({ ...x }));
      const destino = outras
        .filter(x => x.colunaKanbanId === destinoId)
        .sort((a, b) => a.ordem - b.ordem);
      destino.splice(Math.min(event.currentIndex, destino.length), 0, {
        ...tarefa,
        colunaKanbanId: destinoId ?? tarefa.colunaKanbanId,
        ordem: event.currentIndex
      });
      destino.forEach((x, i) => { x.ordem = i; });
      const demais = outras.filter(x => x.colunaKanbanId !== destinoId);
      return [...demais, ...destino];
    });

    this.tarefasService.mudarColuna(tarefa.id, {
      colunaKanbanId: colunaDestino.id ?? undefined,
      novaOrdem: event.currentIndex,
      motivoBloqueio
    }).subscribe({
      next: (atualizada) => {
        if (atualizada) {
          this.tarefas.update(arr => arr.map(x => x.id === atualizada.id
            ? {
                ...x,
                status: atualizada.status,
                bloqueada: atualizada.bloqueada,
                bloqueadaMotivo: atualizada.motivoBloqueio ?? x.bloqueadaMotivo,
                dataConclusao: atualizada.dataConclusao,
                colunaKanbanId: atualizada.colunaKanbanId,
                ordem: atualizada.ordem
              }
            : x
          ));
        }
        this.toastSucesso(
          origemId === destinoId
            ? `Ordem atualizada em "${colunaDestino.nome}"`
            : `Tarefa movida para "${colunaDestino.nome}"`
        );
      },
      error: (err) => {
        // Reverter atualização otimista e recarregar do backend
        this.tarefas.update(arr => arr.map(x =>
          x.id === tarefa.id
            ? { ...x, colunaKanbanId: anterior.colunaKanbanId, ordem: anterior.ordem }
            : x
        ));
        this.toastErro('Erro ao mover tarefa: ' + (err.error?.mensagem || err.message));
        this.carregar();
      }
    });
  }

  trackByColuna = (_: number, c: Coluna) => c.id;
  trackByTarefa = (_: number, t: TarefaResumo) => t.id;

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
    this.carregar();
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
        this.reatribuirIds.set(t.responsaveis?.map(r => r.operadorId) ?? (t.responsavelId ? [t.responsavelId] : []));
        this.drawerLoading.set(false);
      },
      error: () => this.drawerLoading.set(false)
    });
  }

  fecharDrawer(): void {
    this.selectedTarefa.set(null);
    this.novoComentario.set('');
    this.reatribuirIds.set([]);
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
    return ehAtrasada(t);
  }

  /** Corretor #3 Passo 3: SLA graduado (vencida / vence hoje / atenção / no prazo). */
  slaInfo(t: TarefaResumo | TarefaDetalhe): { texto: string; classe: string } {
    const ref = t.dataEntrega ?? t.dataPrevisao;
    if (!ref) return { texto: 'Sem prazo', classe: '' };
    const dt = new Date(ref);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const rotulo = `${dd}/${mm}`;
    if (t.status === 'Concluida' || t.status === 'Concluido' || t.status === 'Cancelada' || t.status === 'Cancelado') {
      if (ehAtrasada(t)) return { texto: `Vencida (${rotulo})`, classe: 'imp-kanban__due--overdue' };
      return { texto: rotulo, classe: '' };
    }
    const hoje = new Date(new Date().toDateString());
    const dias = Math.round((new Date(dt.toDateString()).getTime() - hoje.getTime()) / 86400000);
    if (dias < 0) return { texto: `Vencida (${rotulo})`, classe: 'imp-kanban__due--overdue' };
    if (dias === 0) return { texto: 'Vence hoje', classe: 'imp-kanban__due--warning' };
    if (dias === 1) return { texto: 'Vence amanhã', classe: 'imp-kanban__due--warning' };
    if (dias <= 3) return { texto: `Vence em ${dias}d (${rotulo})`, classe: 'imp-kanban__due--attention' };
    return { texto: rotulo, classe: '' };
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

  // Colunas do Kanban são FIXAS (seed): apenas mover tarefas entre elas.

  // Add Card Inline
  mostrarFormNovaTarefa(colunaId: number): void {
    this.showingAddForm.set(colunaId);
    this.novaTarefaTitulo.set('');
    this.novaTarefaDescricao.set('');
    this.novaTarefaPrioridade.set(1);
    this.novaTarefaTipo.set(0);
    this.novaTarefaResponsavelIds.set([]);
    this.novaTarefaChamadoIds.set([]);
    this.novaTarefaDataEntregaDate.set(null);
    this.novaTarefaDataEntrega.set('');
    this.erroNovaTarefa.set(null);

    // Pre-fill projeto com o filtro atual do Kanban
    const filtroProjeto = this.projetoId();
    this.novaTarefaProjetoId.set(filtroProjeto ? Number(filtroProjeto) : null);
    this.carregarEtapasCriacao(this.novaTarefaProjetoId());

    // Pre-fill responsavel with logged user
    const operador = this.auth.getOperadorLogadoCompleto();
    if (operador) {
      this.novaTarefaResponsavelIds.set([operador.id]);
    }

    // Focus no input na próxima tick
    setTimeout(() => {
      const input = document.querySelector('.imp-kanban__add-card .imp-kanban__add-input') as HTMLInputElement;
      input?.focus();
    }, 0);
  }

  /** Etapas fixas do projeto para o form inline (cards de 9 etapas). */
  carregarEtapasCriacao(projetoId: number | null): void {
    if (projetoId == null) {
      this.etapasFixasCriacao.set([]);
      this.novaTarefaProjetoEtapaId.set(null);
      return;
    }
    // Etapas fixas do projeto (default = em andamento).
    this.projetosService.obterEtapasProjeto(projetoId).subscribe({
      next: (lista) => {
        const fixas = (lista ?? []).filter(e => e.id != null)
          .map(e => ({ id: e.id as number, ordem: e.ordem, nome: e.nome, estado: e.estado }));
        this.etapasFixasCriacao.set(fixas);
        this.novaTarefaProjetoEtapaId.set(
          fixas.find(f => f.estado === 'EmAndamento')?.id
          ?? fixas.find(f => f.estado !== 'Concluida')?.id
          ?? null);
      },
      error: () => {
        this.etapasFixasCriacao.set([]);
        this.novaTarefaProjetoEtapaId.set(null);
      }
    });
  }

  aoMudarProjetoNovaTarefa(valor: string | number | null): void {
    const pid = valor === '' || valor == null ? null : Number(valor);
    this.novaTarefaProjetoId.set(pid);
    this.novaTarefaProjetoEtapaId.set(null);
    this.carregarEtapasCriacao(pid);
  }

  cancelarNovaTarefa(): void {
    this.showingAddForm.set(null);
    this.novaTarefaTitulo.set('');
    this.novaTarefaDescricao.set('');
    this.novaTarefaPrioridade.set(1);
    this.novaTarefaTipo.set(0);
    this.novaTarefaResponsavelIds.set([]);
    this.novaTarefaProjetoId.set(null);
    this.novaTarefaProjetoEtapaId.set(null);
    this.etapasFixasCriacao.set([]);
    this.novaTarefaChamadoIds.set([]);
    this.novaTarefaDataEntregaDate.set(null);
    this.novaTarefaDataEntrega.set('');
    this.erroNovaTarefa.set(null);
    this.criandoTarefa.set(false);
  }

  criarTarefa(colunaId: number): void {
    const titulo = this.novaTarefaTitulo().trim();
    if (!titulo) {
      this.erroNovaTarefa.set('Informe o título da tarefa.');
      return;
    }
    if (this.novaTarefaResponsavelIds().length === 0) {
      this.erroNovaTarefa.set('Selecione pelo menos um responsável.');
      return;
    }
    const dataEntregaStr = this.novaTarefaDataEntrega().trim();
    if (!dataEntregaStr) {
      this.erroNovaTarefa.set('Informe a data de entrega.');
      return;
    }
    // Valida responsáveis contra a lista de operadores (evita 400/500 do backend).
    const conhecidos = new Set(this.operadores().map(o => o.id));
    const desconhecidos = this.novaTarefaResponsavelIds().filter(id => conhecidos.size > 0 && !conhecidos.has(id));
    if (desconhecidos.length) {
      this.erroNovaTarefa.set(`Responsável não encontrado no sistema: ${desconhecidos.join(', ')}`);
      return;
    }
    // Com projeto, a etapa fixa (card) é obrigatória (jornada da implantação).
    const pidNova = this.novaTarefaProjetoId();
    if (pidNova !== null && this.novaTarefaProjetoEtapaId() == null) {
      this.erroNovaTarefa.set('Selecione a etapa do projeto (card).');
      return;
    }
    this.erroNovaTarefa.set(null);
    this.criandoTarefa.set(true);

    const responsavelPrincipal = this.novaTarefaResponsavelIds()[0];

    const req: TarefaCriarRequest = {
      projetoId: pidNova ?? undefined,
      projetoEtapaId: this.novaTarefaProjetoEtapaId() ?? undefined,
      colunaKanbanId: colunaId,
      titulo,
      descricao: this.novaTarefaDescricao() || undefined,
      responsavelId: responsavelPrincipal,
      responsavelIds: this.novaTarefaResponsavelIds().length > 0 ? this.novaTarefaResponsavelIds() : undefined,
      criadorId: this.auth.getOperadorLogado(),
      prioridade: this.novaTarefaPrioridade(),
      tipo: this.novaTarefaTipo(),
      ordem: this.colunas().find(c => c.id === colunaId)?.tarefas.length || 0,
      dataEntrega: dataEntregaStr || undefined,
      horasEstimadas: undefined
    };

    this.tarefasService.criar(req).subscribe({
      next: (t) => {
        this.criandoTarefa.set(false);
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
          dataEntrega: t.dataEntrega,
          dataConclusao: t.dataConclusao,
          bloqueada: t.bloqueada,
          bloqueadaMotivo: t.motivoBloqueio,
          horasEstimadas: t.horasEstimadas,
          horasRealizadas: t.horasRealizadas,
          tipo: t.tipo,
          responsaveis: t.responsaveis ?? [],
          arquivada: t.arquivada ?? false,
          chamadoLegadoId: t.chamadoLegadoId,
          dataInclusao: t.dataInclusao,
          projetoEtapaId: t.projetoEtapaId ?? this.novaTarefaProjetoEtapaId() ?? undefined
        }]);
        this.cancelarNovaTarefa();
        this.toastSucesso('Tarefa criada com sucesso');
      },
      error: (err) => {
        this.criandoTarefa.set(false);
        console.error('Erro ao criar tarefa:', err);
        this.erroNovaTarefa.set(err.error?.mensagem || 'Erro ao criar tarefa. Tente novamente.');
        this.toastErro('Erro ao criar tarefa: ' + (err.error?.mensagem || err.message));
      }
    });
  }

  // Task menu
  abrirMenuTarefa(tarefa: TarefaResumo, event: MouseEvent): void {
    event.stopPropagation();
    this.menuTarefaAberta.set(this.menuTarefaAberta()?.id === tarefa.id ? null : tarefa);
    this.menuEvent.set(event);
  }

  fecharMenuTarefa(): void {
    this.menuTarefaAberta.set(null);
    this.menuEvent.set(null);
  }

  private menuEvent = signal<MouseEvent | null>(null);

  calcularTopoMenu(event?: MouseEvent): number {
    const ev = event ?? this.menuEvent();
    return ev?.clientY ?? 0;
  }

  calcularEsquerdaMenu(event?: MouseEvent): number {
    const ev = event ?? this.menuEvent();
    return ev?.clientX ?? 0;
  }

  editarTarefaDoMenu(t: TarefaResumo): void {
    this.router.navigate(['/implantacao/tarefas', t.id, 'editar']);
  }

  duplicarTarefa(t: TarefaResumo): void {
    this.router.navigate(['/implantacao/tarefas/novo'], { queryParams: { tarefaId: t.id } });
  }

  arquivarTarefaDoMenu(t: TarefaResumo): void {
    if (t.status !== 'Concluida') {
      this.toastErro('Apenas tarefas concluídas podem ser arquivadas.');
      return;
    }
    this.tarefasService.arquivar(t.id).subscribe({
      next: (atualizada: TarefaDetalhe) => {
        this.tarefas.update(arr => arr.map(x => x.id === t.id ? atualizada : x));
        this.toastSucesso('Tarefa arquivada');
      },
      error: (err: HttpErrorResponse) => this.toastErro(err.error?.mensagem || 'Erro ao arquivar tarefa')
    });
  }

  desarquivarTarefaDoMenu(t: TarefaResumo): void {
    this.tarefasService.desarquivar(t.id).subscribe({
      next: (atualizada: TarefaDetalhe) => {
        this.tarefas.update(arr => arr.map(x => x.id === t.id ? atualizada : x));
        this.toastSucesso('Tarefa desarquivada');
      },
      error: (err: HttpErrorResponse) => this.toastErro(err.error?.mensagem || 'Erro ao desarquivar tarefa')
    });
  }

  excluirTarefaDoMenu(t: TarefaResumo): void {
    if (!confirm(`Excluir a tarefa T${t.id} permanentemente?`)) return;
    this.tarefasService.excluir(t.id).subscribe({
      next: () => {
        this.tarefas.update(arr => arr.filter(x => x.id !== t.id));
        this.toastSucesso('Tarefa excluída');
      },
      error: (err: HttpErrorResponse) => this.toastErro(err.error?.mensagem || 'Erro ao excluir tarefa')
    });
  }

  /** Corretor #1: abre o JOTA já situado no contexto desta tarefa. */
  perguntarJota(t: TarefaDetalhe): void {
    this.chatCtx.definirContextoTarefa({
      tarefaId: t.id,
      titulo: t.titulo,
      responsavel: t.responsavelNome || undefined,
      prioridade: this.prioridade(t.prioridade),
      status: this.formatarStatus(t.status),
      projeto: t.projetoCodigo ? `${t.projetoCodigo} — ${t.projetoNome}` : (t.projetoNome || undefined),
      descricao: t.descricao || undefined
    });
  }

  /** Corretor #5: reatribui responsáveis preservando os demais campos. */
  salvarReatribuicao(): void {
    const t = this.selectedTarefa();
    if (!t || this.reatribuindo()) return;
    const ids = this.reatribuirIds();
    if (!ids.length) {
      this.toastErro('Selecione pelo menos um responsável');
      return;
    }
    this.reatribuindo.set(true);
    const req: TarefaAtualizarRequest = {
      titulo: t.titulo,
      descricao: t.descricao,
      responsavelId: ids[0],
      responsavelIds: ids,
      prioridade: t.prioridade,
      tipo: t.tipo,
      ordem: t.ordem,
      dataPrevisao: t.dataPrevisao,
      dataConclusao: t.dataConclusao,
      horasEstimadas: t.horasEstimadas,
      bloqueada: t.bloqueada,
      motivoBloqueio: t.motivoBloqueio,
      usuarioAlteracao: this.auth.getOperadorLogado()
    };
    this.tarefasService.atualizar(t.id, req).subscribe({
      next: () => {
        this.tarefasService.obter(t.id).subscribe(d => {
          this.selectedTarefa.set(d);
          this.reatribuirIds.set(d.responsaveis?.map(r => r.operadorId) ?? (d.responsavelId ? [d.responsavelId] : []));
          this.tarefas.update(arr => arr.map(x =>
            x.id === d.id
              ? { ...x, responsavelId: d.responsavelId, responsavelNome: d.responsavelNome, responsaveis: d.responsaveis ?? [] }
              : x
          ));
        });
        this.reatribuindo.set(false);
        this.toastSucesso('Responsáveis atualizados');
      },
      error: (err) => {
        this.reatribuindo.set(false);
        this.toastErro('Erro ao reatribuir: ' + (err.error?.mensagem || err.message));
      }
    });
  }

  classePrioridade(p: number): string {
    return ['imp-kanban__prio--baixa', 'imp-kanban__prio--media', 'imp-kanban__prio--alta', 'imp-kanban__prio--urgente'][p] ?? '';
  }

  prioridade(p: number): string {
    return ['Baixa', 'Média', 'Alta', 'Urgente'][p] ?? '—';
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
      tipo: tarefa.tipo,
      ordem: tarefa.ordem,
      dataPrevisao: tarefa.dataPrevisao,
      dataConclusao: tarefa.dataConclusao,
      horasEstimadas: tarefa.horasEstimadas,
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
    
    const prioridade = prompt(`Definir prioridade para ${ids.length} tarefa(s):\n0 - Baixa\n1 - Média\n2 - Alta\n3 - Urgente`, '1');
    if (!prioridade) return;
    
    const p = Number(prioridade);
    if (!Number.isInteger(p) || p < 0 || p > 3) {
      this.toastErro('Prioridade inválida');
      return;
    }
    
    ids.forEach(id => {
      this.tarefasService.atualizar(id, {
        titulo: '',
        descricao: undefined,
        responsavelId: undefined,
        prioridade: p,
        tipo: 0,
        ordem: 0,
        dataPrevisao: undefined,
        dataConclusao: undefined,
        horasEstimadas: undefined,
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
        tipo: 0,
        ordem: 0,
        dataPrevisao: undefined,
        dataConclusao: undefined,
        horasEstimadas: undefined,
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
