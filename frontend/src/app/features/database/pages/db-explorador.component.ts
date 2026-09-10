import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DatabaseService } from '../services/database.service';
import { DatabaseTable, DatabaseColumn, DatabaseIndex, ProcedureResumo, ProcedureDetalhe } from '../models/database.model';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type ArvoreTipo = 'tabela' | 'procedure';

@Component({
  selector: 'app-db-explorador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="adm-search db-explorador__busca">
    <i class="bi bi-search adm-search__icone"></i>
    <input type="text" class="adm-search__input" placeholder="Buscar tabela, coluna ou procedure…"
      [(ngModel)]="busca" (ngModelChange)="onBuscar()">
  </div>

  <div class="db-explorador__layout">
    <aside class="db-explorador__arvore">
      <div class="db-explorador__grupo">
        <div class="db-explorador__grupo-titulo" (click)="toggleGrupo('tabelas')">
          <i class="bi" [ngClass]="grupoAberto('tabelas') ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
          <i class="bi bi-table"></i> Tabelas
          <span class="db-explorador__count">{{ tabelasFiltradas().length }}</span>
        </div>
        <ul *ngIf="grupoAberto('tabelas')">
          <li *ngFor="let t of tabelasFiltradas()" (click)="selecionarTabela(t)"
            [class.db-explorador__item--ativo]="selecionadoTipo() === 'tabela' && selecionadoTabela()?.nomeCompleto === t.nomeCompleto">
            <i class="bi bi-record-circle"></i>
            <span class="db-explorador__mono">{{ t.nome }}</span>
            <span class="db-explorador__schema">{{ t.schema }}</span>
          </li>
        </ul>
      </div>

      <div class="db-explorador__grupo">
        <div class="db-explorador__grupo-titulo" (click)="toggleGrupo('procedures')">
          <i class="bi" [ngClass]="grupoAberto('procedures') ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
          <i class="bi bi-lightning-charge-fill"></i> Procedures
          <span class="db-explorador__count">{{ proceduresFiltradas().length }}</span>
        </div>
        <ul *ngIf="grupoAberto('procedures')">
          <li *ngFor="let p of proceduresFiltradas()" (click)="selecionarProcedure(p)"
            [class.db-explorador__item--ativo]="selecionadoTipo() === 'procedure' && selecionadoProcedure()?.nomeCompleto === p.nomeCompleto">
            <i class="bi bi-gear-fill"></i>
            <span class="db-explorador__mono">{{ p.nome }}</span>
            <span class="db-explorador__schema">{{ p.schema }}</span>
          </li>
        </ul>
      </div>
    </aside>

    <main class="db-explorador__detalhe">

      <!-- Estado vazio -->
      <div *ngIf="!selecionadoTipo()" class="adm-empty">
        <i class="bi bi-arrow-left-circle"></i>
        <p>Selecione uma tabela ou procedure na árvore à esquerda para ver detalhes.</p>
      </div>

      <!-- Detalhe de TABELA -->
      <div *ngIf="selecionadoTipo() === 'tabela' && selecionadoTabela() as t">
        <header class="db-explorador__detalhe-header">
          <h3><i class="bi bi-table"></i> {{ t.nomeCompleto }}</h3>
          <span class="adm-badge adm-badge--neutral">{{ t.quantidadeRegistros | number }} registros</span>
        </header>

        <div class="db-explorador__meta">
          <div><strong>Schema:</strong> {{ t.schema }}</div>
          <div *ngIf="t.dataCriacao"><strong>Criada em:</strong> {{ t.dataCriacao | date:'dd/MM/yyyy' }}</div>
          <div *ngIf="t.dataAlteracao"><strong>Alterada em:</strong> {{ t.dataAlteracao | date:'dd/MM/yyyy' }}</div>
          <div><strong>Colunas:</strong> {{ t.quantidadeColunas }}</div>
          <div><strong>Índices:</strong> {{ t.quantidadeIndices }}</div>
          <div><strong>Relacionamentos:</strong> {{ t.quantidadeRelacionamentos }}</div>
        </div>

        <div class="db-explorador__acoes">
          <button type="button" class="db-btn db-btn--primary" (click)="investigarTabela(t)">
            <i class="bi bi-search"></i> Investigar
          </button>
          <button type="button" class="db-btn db-btn--secondary" (click)="abrirConsultasTabela(t)">
            <i class="bi bi-terminal"></i> Consultar
          </button>
        </div>

        <h5><i class="bi bi-list-columns"></i> Colunas</h5>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>#</th><th>Coluna</th><th>Tipo</th><th>Nulo</th><th>PK</th><th>FK</th>
                <th>Identity</th><th>Tamanho</th><th>Default</th><th>Collation</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of colunas()">
                <td>{{ c.ordem }}</td>
                <td><strong>{{ c.coluna }}</strong></td>
                <td><code>{{ c.tipo }}<ng-container *ngIf="c.tamanho"> ({{ c.tamanho }})</ng-container></code></td>
                <td>{{ c.nulo ? 'sim' : 'não' }}</td>
                <td>{{ c.isPrimaryKey ? 'PK' : '' }}</td>
                <td>{{ c.isForeignKey ? 'FK' : '' }}</td>
                <td>{{ c.isIdentity ? 'auto' : '' }}</td>
                <td>{{ c.tamanho || '—' }}</td>
                <td><code *ngIf="c.valorDefault">{{ c.valorDefault }}</code><span *ngIf="!c.valorDefault">—</span></td>
                <td><code *ngIf="c.collation">{{ c.collation }}</code><span *ngIf="!c.collation">—</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h5 *ngIf="indices().length > 0" class="mt-4"><i class="bi bi-bookmark-star"></i> Índices</h5>
        <div class="adm-table-wrap" *ngIf="indices().length > 0">
          <table class="adm-table">
            <thead><tr><th>Nome</th><th>Tipo</th><th>Único</th><th>Colunas</th></tr></thead>
            <tbody>
              <tr *ngFor="let i of indices()">
                <td>{{ i.nome }}</td>
                <td>{{ i.tipo }}</td>
                <td>{{ i.unique ? 'sim' : 'não' }}</td>
                <td><code>{{ i.colunas.join(', ') }}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detalhe de PROCEDURE -->
      <div *ngIf="selecionadoTipo() === 'procedure' && selecionadoProcedure() as p">
        <header class="db-explorador__detalhe-header">
          <h3><i class="bi bi-lightning-charge-fill"></i> {{ p.nomeCompleto }}</h3>
          <span class="adm-badge adm-badge--neutral">{{ p.tipo }}</span>
          <span class="adm-badge adm-badge--neutral">{{ p.quantidadeParametros }} parâmetros</span>
          <button type="button" class="db-btn db-btn--primary" (click)="abrirProcedureNoSql(p)">
            <i class="bi bi-terminal"></i> Ir para SQL
          </button>
        </header>

        <div class="db-explorador__meta">
          <div *ngIf="p.dataCriacao"><strong>Criada em:</strong> {{ p.dataCriacao | date:'dd/MM/yyyy HH:mm' }}</div>
          <div *ngIf="p.dataAlteracao"><strong>Alterada em:</strong> {{ p.dataAlteracao | date:'dd/MM/yyyy HH:mm' }}</div>
        </div>

        <h5 *ngIf="p.preview"><i class="bi bi-eye"></i> Preview</h5>
        <pre *ngIf="p.preview" class="db-code db-code--preview">{{ p.preview }}<span *ngIf="p.preview.length >= 200">…</span></pre>

        <h5 *ngIf="carregandoProcedure()"><i class="bi bi-hourglass-split"></i> Carregando corpo completo...</h5>
      </div>

    </main>
  </div>
  `,
  styles: [`
    .db-explorador__busca { margin-bottom: 1rem; }
    .db-explorador__layout { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; }
    .db-explorador__arvore { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.5rem; max-height: 75vh; overflow-y: auto; }

    .db-explorador__grupo { margin-bottom: 0.4rem; }
    .db-explorador__grupo-titulo {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.35rem 0.5rem;
      font-size: 0.82rem; font-weight: 700; color: #1e293b;
      background: #fff; border-radius: 0.3rem;
      cursor: pointer; user-select: none;
      border: 1px solid #e2e8f0;
    }
    .db-explorador__grupo-titulo:hover { background: #f1f5f9; }
    .db-explorador__count {
      margin-left: auto; background: #0f4c81; color: #fff;
      font-size: 0.7rem; font-weight: 700;
      padding: 0.1rem 0.4rem; border-radius: 1rem;
    }

    .db-explorador__arvore ul {
      list-style: none; padding: 0 0 0 0.4rem; margin: 0.25rem 0 0;
    }
    .db-explorador__arvore li {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.3rem 0.5rem;
      font-size: 0.8rem;
      border-radius: 0.25rem;
      cursor: pointer;
    }
    .db-explorador__arvore li:hover { background: #e2e8f0; }
    .db-explorador__item--ativo {
      background: #dbeafe !important;
      color: #1e40af;
      font-weight: 600;
    }
    .db-explorador__mono { font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; }
    .db-explorador__schema {
      margin-left: auto;
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .db-explorador__detalhe {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem;
      padding: 1rem 1.25rem; min-height: 400px;
    }
    .db-explorador__detalhe-header {
      display: flex; justify-content: space-between; align-items: center;
      gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;
    }
    .db-explorador__detalhe-header h3 { margin: 0; font-size: 1.1rem; }
    .db-explorador__meta {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1.5rem;
      margin: 0.5rem 0 1rem; font-size: 0.85rem; color: #475569;
      padding: 0.5rem 0.75rem; background: #f1f5f9; border-radius: 0.4rem;
    }
    .db-explorador__acoes {
      display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;
    }
    h5 { margin-top: 1.25rem; font-weight: 600; }

    .db-code {
      background: #0f172a; color: #e2e8f0;
      padding: 0.75rem 1rem; border-radius: 0.4rem;
      font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
      font-size: 0.8rem; line-height: 1.4;
      overflow-x: auto; max-height: 240px;
      white-space: pre-wrap; word-break: break-word;
      margin: 0.5rem 0 0;
    }
    .db-code--preview { max-height: 160px; }

    .db-btn {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.35rem 0.7rem;
      font-size: 0.82rem; font-weight: 500;
      border-radius: 0.35rem; cursor: pointer; border: 1px solid transparent;
    }
    .db-btn--primary { background: #0f4c81; color: #fff; border-color: #0f4c81; }
    .db-btn--primary:hover { background: #0c3d68; }
    .db-btn--secondary { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .db-btn--secondary:hover { background: #e2e8f0; color: #1e293b; }

    .adm-empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.5rem; color: #64748b; padding: 2.5rem 1rem;
    }
    .adm-empty i { font-size: 2.5rem; color: #cbd5e1; }

    @media (max-width: 768px) { .db-explorador__layout { grid-template-columns: 1fr; } }
  `]
})
export class DbExploradorComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly modalSvc = inject(NgbModal);
  private readonly router = inject(Router);

  readonly tabelas = signal<DatabaseTable[]>([]);
  readonly procedures = signal<ProcedureResumo[]>([]);
  readonly colunas = signal<DatabaseColumn[]>([]);
  readonly indices = signal<DatabaseIndex[]>([]);
  readonly carregandoProcedure = signal(false);

  readonly selecionadoTipo = signal<ArvoreTipo | null>(null);
  readonly selecionadoTabela = signal<DatabaseTable | null>(null);
  readonly selecionadoProcedure = signal<ProcedureResumo | null>(null);

  readonly gruposAbertos = signal<Set<string>>(new Set(['tabelas', 'procedures']));

  busca = '';

  readonly tabelasFiltradas = computed(() => this.filtrar(this.tabelas(), t => t.nome, t => t.nomeCompleto));
  readonly proceduresFiltradas = computed(() => this.filtrar(this.procedures(), p => p.nome, p => p.nomeCompleto));

  private filtrar<T>(lista: T[], getNome: (x: T) => string, getFull: (x: T) => string): T[] {
    const q = (this.busca || '').toLowerCase();
    if (!q) return lista;
    return lista.filter(x => getNome(x).toLowerCase().includes(q) || getFull(x).toLowerCase().includes(q));
  }

  ngOnInit(): void {
    this.db.listarTabelas().pipe(catchError(() => of([] as DatabaseTable[]))).subscribe(l => this.tabelas.set(l));
    this.db.listarProcedures().pipe(catchError(() => of([] as ProcedureResumo[]))).subscribe(l => this.procedures.set(l));
  }

  onBuscar(): void { /* trigga computed */ }

  grupoAberto(g: string): boolean { return this.gruposAbertos().has(g); }

  toggleGrupo(g: string): void {
    const set = new Set(this.gruposAbertos());
    if (set.has(g)) set.delete(g); else set.add(g);
    this.gruposAbertos.set(set);
  }

  selecionarTabela(t: DatabaseTable): void {
    this.selecionadoTipo.set('tabela');
    this.selecionadoTabela.set(t);
    this.selecionadoProcedure.set(null);
    this.db.listarColunas(t.schema, t.nome).pipe(catchError(() => of([] as DatabaseColumn[]))).subscribe(l => this.colunas.set(l));
    this.db.listarIndices(t.schema, t.nome).pipe(catchError(() => of([] as DatabaseIndex[]))).subscribe(l => this.indices.set(l));
  }

  investigarTabela(t: DatabaseTable): void {
    this.router.navigate(['/database/tabela', t.schema, t.nome]);
  }

  abrirConsultasTabela(t: DatabaseTable): void {
    const sql = `SELECT TOP 100 * FROM [${t.schema}].[${t.nome}]`;
    sessionStorage.setItem('db-query-prefill', sql);
    this.router.navigate(['/database/consultas']);
  }

  selecionarProcedure(p: ProcedureResumo): void {
    this.selecionadoTipo.set('procedure');
    this.selecionadoProcedure.set(p);
    this.selecionadoTabela.set(null);
    // Carrega o detalhe em background
    this.carregandoProcedure.set(true);
    this.db.obterProcedure(p.schema, p.nome).subscribe({
      next: d => {
        this.selecionadoProcedure.set({ ...p, preview: d.corpo?.substring(0, 200) ?? p.preview, quantidadeParametros: d.parametros.length });
        this.carregandoProcedure.set(false);
        // Abre modal com corpo completo
        import('./db-procedure-modal.component').then(m => {
          const ref = this.modalSvc.open(m.DbProcedureModalComponent, { size: 'xl', scrollable: true });
          ref.componentInstance.procedure = d;
        });
      },
      error: () => this.carregandoProcedure.set(false)
    });
  }

  abrirProcedureNoSql(p: ProcedureResumo): void {
    // Navega para a aba de consultas com o nome da procedure pré-preenchido
    sessionStorage.setItem('db-procedure-prefill', p.nomeCompleto);
    location.assign('/database/consultas');
  }
}
