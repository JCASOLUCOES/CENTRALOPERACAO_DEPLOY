import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { DatabaseQueryResult } from '../models/database.model';

@Component({
  selector: 'app-db-consultas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="adm-aviso adm-aviso--info mb-3">
    <i class="bi bi-shield-check"></i>
    <span>Apenas <strong>SELECT</strong> (e <strong>WITH</strong> para CTEs) são permitidos. Comandos destrutivos são bloqueados server-side. Limite: {{ limite }} registros · Timeout: {{ timeout }}s.</span>
  </div>

  <!-- Query Builder Mode Indicator -->
  <div *ngIf="queryBuilderMode()" class="db-consultas__builder-banner adm-aviso adm-aviso--warning mb-3">
    <i class="bi bi-diagram-3"></i>
    <strong>Modo Query Builder:</strong> tabelas pré-carregadas: {{ tabelasBuilder().join(', ') }}
    <button class="btn btn-sm btn-outline-secondary ms-3" (click)="sairQueryBuilder()">Sair do Query Builder</button>
  </div>

  <div class="db-consultas__editor">
    <textarea class="form-control db-consultas__sql" rows="8" spellcheck="false"
      placeholder="SELECT TOP 100 * FROM dbo.TBDEVEDOR WHERE ..."
      [(ngModel)]="sql"></textarea>
    <div class="db-consultas__botoes">
      <label>Pagina:
        <select class="form-select form-select-sm" [(ngModel)]="limite">
          <option [ngValue]="25">25</option>
          <option [ngValue]="50">50</option>
          <option [ngValue]="100">100</option>
          <option [ngValue]="500">500</option>
        </select>
      </label>
      <label>Timeout (s):
        <select class="form-select form-select-sm" [(ngModel)]="timeout">
          <option [ngValue]="5">5</option>
          <option [ngValue]="15">15</option>
          <option [ngValue]="30">30</option>
          <option [ngValue]="60">60</option>
        </select>
      </label>
      <button class="btn btn-primary" (click)="executar()" [disabled]="carregando() || !sql.trim()">
        <i class="bi bi-play-fill"></i> {{ carregando() ? 'Executando…' : 'Executar' }}
      </button>
      <button class="btn btn-outline-secondary" (click)="limpar()">
        <i class="bi bi-trash"></i> Limpar
      </button>
    </div>
  </div>

  <!-- Histórico de consultas recentes -->
  <div *ngIf="historico().length > 0 && !carregando()" class="db-consultas__historico mt-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0"><i class="bi bi-clock-history"></i> Consultas Recentes</h6>
      <button class="btn btn-sm btn-outline-secondary" (click)="limparHistorico()">
        <i class="bi bi-trash"></i> Limpar histórico
      </button>
    </div>
    <div class="db-consultas__historico-lista">
      <button *ngFor="let h of historico()" class="db-consultas__historico-item" (click)="restaurarHistorico(h)">
        <span class="db-consultas__historico-sql">{{ h }}</span>
        <small class="text-muted">{{ h.length > 80 ? '...' : '' }}</small>
      </button>
    </div>
  </div>

  <div *ngIf="resultado() as r">
    <div *ngIf="!r.sucesso" class="alert alert-danger">
      <strong>Erro:</strong> {{ r.mensagemErro }}
    </div>
    <div *ngIf="r.sucesso" class="adm-card mt-3 p-3">
      <div class="db-consultas__meta">
        <span><i class="bi bi-list-ol"></i> {{ r.quantidadeRegistros }} registros</span>
        <span><i class="bi bi-clock"></i> {{ r.duracaoMs }} ms</span>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr><th *ngFor="let c of r.colunas">{{ c }}</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let linha of r.linhas">
              <td *ngFor="let celula of linha">{{ celula === null ? '—' : celula }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .db-consultas__editor { display: flex; flex-direction: column; gap: 0.5rem; }
    .db-consultas__sql { font-family: 'IBM Plex Mono', monospace; font-size: 0.85rem; }
    .db-consultas__botoes { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .db-consultas__meta { display: flex; gap: 1.5rem; color: #475569; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .db-consultas__builder-banner { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .db-consultas__historico-lista { display: flex; flex-direction: column; gap: 0.35rem; }
    .db-consultas__historico-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.5rem 0.75rem;
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 0.4rem; text-align: left; cursor: pointer;
      transition: all 0.15s;
    }
    .db-consultas__historico-item:hover { background: #dbeafe; border-color: #3b82f6; }
    .db-consultas__historico-sql {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.75rem;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
  `]
})
export class DbConsultasComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly resultado = signal<DatabaseQueryResult | null>(null);
  readonly carregando = signal(false);
  readonly queryBuilderMode = signal(false);
  readonly tabelasBuilder = signal<string[]>([]);

  sql = '';
  limite = 100;
  timeout = 30;

  ngOnInit(): void {
    // Verifica query param para modo query builder
    this.route.queryParams.subscribe(params => {
      if (params['builder'] === 'true') {
        this.queryBuilderMode.set(true);
        const builderData = sessionStorage.getItem('db-query-builder-tables');
        if (builderData) {
          try {
            this.tabelasBuilder.set(JSON.parse(builderData));
          } catch {}
        }
      }
    });

    // 1. Prefill de procedure (do modal)
    const prefillProc = sessionStorage.getItem('db-procedure-prefill');
    if (prefillProc) {
      sessionStorage.removeItem('db-procedure-prefill');
      const [schema, nome] = prefillProc.split('.');
      this.sql = `-- Procedure: ${prefillProc}\n-- Para executar procedure use: EXEC ${prefillProc} @params\n-- (Execução de procedures é bloqueada nesta UI - apenas SELECT)\nSELECT TOP 10 * FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = '${schema ?? ''}' AND ROUTINE_NAME = '${nome ?? ''}';`;
      this.adicionarHistorico(this.sql);
      return;
    }

    // 2. Prefill de query simples (do TableDetail "Consultar dados")
    const prefillQuery = sessionStorage.getItem('db-query-prefill');
    if (prefillQuery) {
      sessionStorage.removeItem('db-query-prefill');
      this.sql = prefillQuery;
      this.adicionarHistorico(this.sql);
      return;
    }

    // 3. Query Builder - tenta gerar SQL básico
    if (this.queryBuilderMode() && this.tabelasBuilder().length > 0) {
      this.gerarSQLBuilder();
      return;
    }

    // 4. Carrega histórico do localStorage
    this.carregarHistorico();
  }

  private gerarSQLBuilder(): void {
    const tabelas = this.tabelasBuilder();
    if (tabelas.length === 1) {
      this.sql = `SELECT TOP ${this.limite} * FROM [${tabelas[0].replace('.', '].[')}]`;
    } else {
      // Para múltiplas tabelas, mostra comentário orientando
      this.sql = `-- Query Builder: ${tabelas.length} tabelas selecionadas\n-- Use o Query Builder completo (em desenvolvimento) ou escreva o JOIN manualmente\n-- Tabelas: ${tabelas.join(', ')}\n\nSELECT TOP ${this.limite} * FROM [${tabelas[0].replace('.', '].[')}];`;
    }
    this.adicionarHistorico(this.sql);
  }

  executar(): void {
    if (!this.sql.trim()) return;
    this.carregando.set(true);
    this.db.executarQuery({ sql: this.sql, limite: this.limite, timeoutSegundos: this.timeout }).subscribe({
      next: r => { this.resultado.set(r); this.carregando.set(false); this.adicionarHistorico(this.sql); },
      error: () => { this.resultado.set({ sucesso: false, colunas: [], linhas: [], quantidadeRegistros: 0, duracaoMs: 0, mensagemErro: 'Falha ao executar consulta.' }); this.carregando.set(false); }
    });
  }

  limpar(): void {
    this.sql = '';
    this.resultado.set(null);
  }

  sairQueryBuilder(): void {
    this.queryBuilderMode.set(false);
    this.tabelasBuilder.set([]);
    this.router.navigate(['/database/consultas']);
  }

  // Histórico
  private readonly HISTORICO_KEY = 'db_consultas_historico';
  private readonly MAX_HISTORICO = 20;

  historico = signal<string[]>([]);

  private carregarHistorico(): void {
    try {
      const dados = localStorage.getItem(this.HISTORICO_KEY);
      if (dados) {
        this.historico.set(JSON.parse(dados));
      }
    } catch {}
  }

  private adicionarHistorico(sql: string): void {
    const atual = this.historico();
    const novo = [sql, ...atual.filter(s => s !== sql)].slice(0, this.MAX_HISTORICO);
    this.historico.set(novo);
    try {
      localStorage.setItem(this.HISTORICO_KEY, JSON.stringify(novo));
    } catch {}
  }

  restaurarHistorico(sql: string): void {
    this.sql = sql;
  }

  limparHistorico(): void {
    this.historico.set([]);
    localStorage.removeItem(this.HISTORICO_KEY);
  }
}