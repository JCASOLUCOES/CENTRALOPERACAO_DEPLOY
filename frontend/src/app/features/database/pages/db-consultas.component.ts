import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { DatabaseFavoritosService, FavoritoQuery } from '../services/database-favoritos.service';
import { JotaChatService } from '@features/chat/jota-chat.service';
import { DatabaseQueryResult } from '../models/database.model';
import { DbQueryBuilderComponent } from '../components/db-query-builder.component';

type AbaConsulta = 'sql' | 'builder' | 'favoritos';

/** Corretor #6 Passo 3: entrada de histórico com metadados (tempo, status, linhas). */
interface HistoricoConsulta {
  sql: string;
  data: string;
  duracaoMs?: number;
  sucesso?: boolean;
  registros?: number;
}

@Component({
  selector: 'app-db-consultas',
  standalone: true,
  imports: [CommonModule, FormsModule, DbQueryBuilderComponent],
  template: `
  <ul class="nav nav-tabs mb-3">
    <li class="nav-item">
      <button type="button" class="nav-link" [class.active]="abaInterna() === 'sql'" (click)="abaInterna.set('sql')">
        <i class="bi bi-terminal"></i> SQL
      </button>
    </li>
    <li class="nav-item">
      <button type="button" class="nav-link" [class.active]="abaInterna() === 'builder'" (click)="abaInterna.set('builder')">
        <i class="bi bi-diagram-3"></i> Criador de Consultas
      </button>
    </li>
    <li class="nav-item">
      <button type="button" class="nav-link" [class.active]="abaInterna() === 'favoritos'" (click)="abaInterna.set('favoritos')">
        <i class="bi bi-star"></i> Favoritos <span class="badge text-bg-secondary" *ngIf="favoritosSvc.favoritos().length">{{ favoritosSvc.favoritos().length }}</span>
      </button>
    </li>
  </ul>

  <div *ngIf="abaInterna() === 'sql'">
  <div class="adm-aviso adm-aviso--info mb-3">
    <i class="bi bi-shield-check"></i>
    <span>Apenas <strong>SELECT</strong> (e <strong>WITH</strong> para CTEs) são permitidos. Comandos destrutivos são bloqueados server-side. Limite: {{ limite }} registros · Timeout: {{ timeout }}s.</span>
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
      <button class="btn btn-outline-warning" (click)="salvarFavorito()" [disabled]="!sql.trim()" title="Salvar SQL atual como favorito">
        <i class="bi bi-star"></i> Salvar favorito
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
      <div *ngFor="let h of historico()" class="db-consultas__historico-item">
        <button class="db-consultas__historico-abrir" (click)="restaurarHistorico(h.sql)" title="Carregar no editor">
          <span class="db-consultas__historico-sql">{{ h.sql }}</span>
          <small class="text-muted">{{ formatarHistoricoMeta(h) }}</small>
        </button>
        <span class="db-consultas__historico-acoes">
          <button class="btn btn-sm btn-outline-primary" (click)="repetirHistorico(h)" title="Executar novamente">
            <i class="bi bi-play-fill"></i> Repetir
          </button>
          <button class="btn btn-sm btn-outline-warning" (click)="favoritarHistorico(h)" title="Salvar como favorito">
            <i class="bi bi-star"></i>
          </button>
        </span>
      </div>
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
        <button class="btn btn-sm btn-outline-primary ms-auto" (click)="perguntarJotaSql('Explique o que esta query faz e o que ela retorna.')">
          <i class="bi bi-robot"></i> Explicar com JOTA
        </button>
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

  <!-- JOTA SQL Assistant (Corretor #6 Passo 4) -->
  <div class="adm-card mt-3 p-3">
    <h6 class="mb-2"><i class="bi bi-robot"></i> JOTA SQL Assistant</h6>
    <div class="db-consultas__botoes mb-2">
      <button class="btn btn-sm btn-outline-secondary" (click)="perguntarJotaSql('Explique o que esta query faz.')" [disabled]="jotaEnviando() || !sql.trim()">Explicar query</button>
      <button class="btn btn-sm btn-outline-secondary" (click)="perguntarJotaSql('Como otimizar a performance desta query? Sugira índices e reescrita se aplicável.')" [disabled]="jotaEnviando() || !sql.trim()">Otimizar</button>
      <button class="btn btn-sm btn-outline-secondary" (click)="perguntarJotaSql('Quais índices CREATE INDEX você sugere para acelerar esta query? Responda com o script pronto.')" [disabled]="jotaEnviando() || !sql.trim()">Sugerir índices</button>
    </div>
    <div class="db-consultas__botoes">
      <input type="text" class="form-control" placeholder="Pergunte sobre a query atual..."
        [ngModel]="jotaPergunta()" (ngModelChange)="jotaPergunta.set($event)"
        (keydown.enter)="perguntarJotaSql()" [disabled]="jotaEnviando()">
      <button class="btn btn-primary btn-sm" (click)="perguntarJotaSql()" [disabled]="jotaEnviando() || (!jotaPergunta().trim() && !sql.trim())">
        <i class="bi bi-send"></i> {{ jotaEnviando() ? 'Perguntando...' : 'Perguntar' }}
      </button>
    </div>
    <div *ngIf="jotaErro()" class="alert alert-warning mt-2 mb-0">{{ jotaErro() }}</div>
    <div *ngIf="jotaResposta()" class="alert alert-light mt-2 mb-0" style="white-space: pre-wrap;">{{ jotaResposta() }}</div>
  </div>
  </div><!-- /aba SQL -->

  <div *ngIf="abaInterna() === 'builder'">
    <app-db-query-builder></app-db-query-builder>
  </div>

  <div *ngIf="abaInterna() === 'favoritos'">
    <div class="adm-aviso adm-aviso--info mb-3">
      <i class="bi bi-star"></i>
      <span>Queries salvas neste navegador. Clique em <strong>Executar</strong> para rodar em 1 clique.</span>
    </div>
    <div class="db-consultas__botoes mb-3">
      <input type="text" class="form-control" style="max-width: 20rem" placeholder="Filtrar por nome ou tag..."
        [ngModel]="buscaFavoritos()" (ngModelChange)="buscaFavoritos.set($event)">
    </div>
    <div *ngIf="!favoritosFiltrados().length" class="alert alert-light">
      <i class="bi bi-inbox"></i> Nenhum favorito{{ buscaFavoritos().trim() ? ' para este filtro' : ' ainda' }}.
      {{ buscaFavoritos().trim() ? '' : 'Execute uma query na aba SQL e clique em "Salvar favorito".' }}
    </div>
    <div class="db-consultas__historico-lista">
      <div *ngFor="let f of favoritosFiltrados()" class="db-consultas__historico-item">
        <button class="db-consultas__historico-abrir" (click)="carregarFavorito(f)" title="Carregar no editor">
          <span class="db-consultas__historico-sql"><i class="bi bi-star-fill text-warning"></i> {{ f.nome }}</span>
          <small class="text-muted">
            {{ f.tags.length ? '#' + f.tags.join(' #') + ' · ' : '' }}{{ formatarDataCurta(f.ultimoUso ?? f.dataCriacao) }}
          </small>
        </button>
        <span class="db-consultas__historico-acoes">
          <button class="btn btn-sm btn-primary" (click)="executarFavorito(f)" title="Carregar e executar">
            <i class="bi bi-play-fill"></i> Executar
          </button>
          <button class="btn btn-sm btn-outline-secondary" (click)="favoritosSvc.duplicar(f.id)" title="Duplicar">
            <i class="bi bi-copy"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" (click)="excluirFavorito(f)" title="Excluir">
            <i class="bi bi-trash"></i>
          </button>
        </span>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .db-consultas__editor { display: flex; flex-direction: column; gap: 0.5rem; }
    .db-consultas__sql { font-family: 'IBM Plex Mono', monospace; font-size: 0.85rem; }
    .db-consultas__botoes { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .db-consultas__meta { display: flex; gap: 1.5rem; color: #475569; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .db-consultas__historico-lista { display: flex; flex-direction: column; gap: 0.35rem; }
    .db-consultas__historico-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.5rem 0.75rem;
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 0.4rem; text-align: left; cursor: pointer;
      transition: all 0.15s;
    }
    .db-consultas__historico-item:hover { background: #dbeafe; border-color: #3b82f6; }
    .db-consultas__historico-item {
      display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
    }
    .db-consultas__historico-abrir {
      flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem;
      background: transparent; border: 0; text-align: left; cursor: pointer; padding: 0;
    }
    .db-consultas__historico-acoes { display: flex; gap: 0.35rem; flex-shrink: 0; }
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
  private readonly jota = inject(JotaChatService);
  readonly favoritosSvc = inject(DatabaseFavoritosService);

  readonly resultado = signal<DatabaseQueryResult | null>(null);
  readonly carregando = signal(false);
  /** Aba interna: editor SQL livre, Query Builder visual ou Favoritos (mesmo componente, sem duplicação). */
  readonly abaInterna = signal<AbaConsulta>('sql');
  readonly buscaFavoritos = signal('');

  // JOTA SQL Assistant (Corretor #6 Passo 4)
  readonly jotaPergunta = signal('');
  readonly jotaEnviando = signal(false);
  readonly jotaResposta = signal('');
  readonly jotaErro = signal('');

  sql = '';
  limite = 100;
  timeout = 30;

  ngOnInit(): void {
    // Aba vinda por query param (ex.: TableDetail → Query Builder com tabelas pré-carregadas)
    this.route.queryParams.subscribe(params => {
      if (params['aba'] === 'builder' || params['builder'] === 'true') {
        this.abaInterna.set('builder');
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

    // 3. Tabelas vindas do TableDetail são consumidas pelo Query Builder embutido (aba Builder)
    // 4. Carrega histórico do localStorage
    this.carregarHistorico();
  }

  executar(): void {
    if (!this.sql.trim()) return;
    this.carregando.set(true);
    const inicio = Date.now();
    this.db.executarQuery({ sql: this.sql, limite: this.limite, timeoutSegundos: this.timeout }).subscribe({
      next: r => {
        this.resultado.set(r);
        this.carregando.set(false);
        this.adicionarHistorico(this.sql, { duracaoMs: Date.now() - inicio, sucesso: r.sucesso, registros: r.quantidadeRegistros });
      },
      error: () => {
        this.resultado.set({ sucesso: false, colunas: [], linhas: [], quantidadeRegistros: 0, duracaoMs: 0, mensagemErro: 'Falha ao executar consulta.' });
        this.carregando.set(false);
        this.adicionarHistorico(this.sql, { duracaoMs: Date.now() - inicio, sucesso: false, registros: 0 });
      }
    });
  }

  limpar(): void {
    this.sql = '';
    this.resultado.set(null);
  }

  // Favoritos (Corretor #6 Passos 1-2)
  favoritosFiltrados(): FavoritoQuery[] {
    return this.favoritosSvc.listar(this.buscaFavoritos());
  }

  salvarFavorito(): void {
    if (!this.sql.trim()) return;
    const nome = prompt('Nome do favorito:', this.favoritosSvc.sugerirNome());
    if (nome === null) return;
    const tagsRaw = prompt('Tags (separadas por vírgula, opcional):', '') ?? '';
    this.favoritosSvc.adicionar(nome, this.sql, tagsRaw.split(','));
  }

  favoritarHistorico(h: HistoricoConsulta): void {
    this.favoritosSvc.adicionar(this.favoritosSvc.sugerirNome(), h.sql);
    this.abaInterna.set('favoritos');
  }

  carregarFavorito(f: FavoritoQuery): void {
    this.sql = f.sql;
    this.abaInterna.set('sql');
  }

  executarFavorito(f: FavoritoQuery): void {
    this.sql = f.sql;
    this.favoritosSvc.registrarUso(f.id);
    this.abaInterna.set('sql');
    this.executar();
  }

  excluirFavorito(f: FavoritoQuery): void {
    if (!confirm(`Excluir o favorito "${f.nome}"?`)) return;
    this.favoritosSvc.excluir(f.id);
  }

  formatarDataCurta(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  perguntarJotaSql(perguntaPronta?: string): void {
    const pergunta = (perguntaPronta ?? this.jotaPergunta()).trim();
    if (!pergunta || !this.sql.trim() || this.jotaEnviando()) return;
    this.jotaPergunta.set('');
    this.jotaErro.set('');
    this.jotaResposta.set('');
    this.jotaEnviando.set(true);
    const mensagem = `Analise esta query SQL Server e responda: ${pergunta}\n\nQuery:\n${this.sql}\n\nResponda em português, de forma concisa.`;
    this.jota.chat({ message: mensagem, workspaceId: 'suporte', mode: 'query' }).subscribe({
      next: res => {
        this.jotaEnviando.set(false);
        this.jotaResposta.set(res?.resposta || 'Sem resposta do JOTA.');
      },
      error: () => {
        this.jotaEnviando.set(false);
        this.jotaErro.set('JOTA indisponível no momento. Tente novamente.');
      }
    });
  }

  // Histórico
  private readonly HISTORICO_KEY = 'db_consultas_historico';
  private readonly MAX_HISTORICO = 30;

  historico = signal<HistoricoConsulta[]>([]);

  private carregarHistorico(): void {
    try {
      const dados = localStorage.getItem(this.HISTORICO_KEY);
      if (dados) {
        const parsed: unknown = JSON.parse(dados);
        if (Array.isArray(parsed)) {
          // Migra formato antigo (string[]) para o formato com metadados
          const migrado: HistoricoConsulta[] = (parsed as Array<string | HistoricoConsulta>).map(item =>
            typeof item === 'string' ? { sql: item, data: '' } : item
          );
          this.historico.set(migrado.slice(0, this.MAX_HISTORICO));
        }
      }
    } catch {}
  }

  private adicionarHistorico(sql: string, meta?: { duracaoMs?: number; sucesso?: boolean; registros?: number }): void {
    const atual = this.historico();
    const entrada: HistoricoConsulta = {
      sql,
      data: new Date().toISOString(),
      duracaoMs: meta?.duracaoMs,
      sucesso: meta?.sucesso,
      registros: meta?.registros
    };
    const novo = [entrada, ...atual.filter(h => h.sql !== sql)].slice(0, this.MAX_HISTORICO);
    this.historico.set(novo);
    try {
      localStorage.setItem(this.HISTORICO_KEY, JSON.stringify(novo));
    } catch {}
  }

  restaurarHistorico(sql: string): void {
    this.sql = sql;
  }

  repetirHistorico(h: HistoricoConsulta): void {
    this.sql = h.sql;
    this.executar();
  }

  formatarHistoricoMeta(h: HistoricoConsulta): string {
    const partes: string[] = [];
    if (h.data) {
      const d = new Date(h.data);
      if (!Number.isNaN(d.getTime())) partes.push(d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    }
    if (h.duracaoMs != null) partes.push(`${h.duracaoMs} ms`);
    if (h.registros != null && h.sucesso) partes.push(`${h.registros} linhas`);
    if (h.sucesso === false) partes.push('erro');
    return partes.join(' · ');
  }

  limparHistorico(): void {
    this.historico.set([]);
    localStorage.removeItem(this.HISTORICO_KEY);
  }
}