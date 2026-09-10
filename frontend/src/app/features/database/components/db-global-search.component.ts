import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { GlobalSearchResult, DatabaseSearchResult } from '../models/database.model';

type GlobalSearchTab = 'global' | 'tabelas' | 'colunas' | 'procedures' | 'triggers' | 'views';

interface SearchResultItem {
  tipo: string;
  schema: string;
  objeto: string;
  coluna?: string;
  detalhe?: string;
  rota?: string;
  icone: string;
}

@Component({
  selector: 'app-db-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="db-search">
    <!-- Input de busca -->
    <div class="db-search__input-wrap">
      <i class="bi bi-search db-search__icone"></i>
      <input
        type="text"
        class="db-search__input"
        placeholder="Pesquisar tabela, coluna, procedure, trigger, view…"
        [(ngModel)]="termo"
        (ngModelChange)="onTermoChange()"
        (keyup.enter)="buscar()"
        [disabled]="carregando()"
        autocomplete="off">
      <button *ngIf="termo().trim()" class="db-search__clear" (click)="limpar()" aria-label="Limpar">
        <i class="bi bi-x"></i>
      </button>
      <div *ngIf="carregando()" class="db-search__spinner">
        <div class="spinner-border spinner-border-sm" role="status"></div>
      </div>
    </div>

    <!-- Tabs de categoria -->
    <div class="db-search__categorias" *ngIf="resultadosFiltrados().length > 0 || termo().trim()">
      <button *ngFor="let cat of categorias"
        class="db-search__cat"
        [class.active]="categoriaAtiva() === cat.id"
        (click)="categoriaAtiva.set(cat.id)">
        {{ cat.rotulo }}
        <span *ngIf="cat.contador > 0" class="db-search__cat-count">{{ cat.contador }}</span>
      </button>
    </div>

    <!-- Resultados -->
    <div class="db-search__resultados" *ngIf="resultadosFiltrados().length > 0">
      <div class="db-search__grupo" *ngFor="let grupo of resultadosAgrupados()">
        <div class="db-search__grupo-titulo">
          <i class="bi" [ngClass]="grupo.icone"></i>
          {{ grupo.tipo }} <span class="db-search__grupo-count">{{ grupo.itens.length }}</span>
        </div>
        <div class="db-search__lista">
          <button *ngFor="let item of grupo.itens"
            class="db-search__item"
            (click)="navegar(item)"
            [title]="item.detalhe">
            <div class="db-search__item-main">
              <i class="bi" [ngClass]="item.icone"></i>
              <div class="db-search__item-info">
                <strong>{{ item.schema }}.{{ item.objeto }}</strong>
                <small *ngIf="item.coluna" class="text-muted">{{ item.coluna }}</small>
              </div>
            </div>
            <div *ngIf="item.detalhe" class="db-search__item-detalhe">{{ item.detalhe }}</div>
          </button>
        </div>
      </div>
    </div>

    <!-- Estado vazio -->
    <div *ngIf="!carregando() && termo().trim() && resultadosFiltrados().length === 0" class="db-search__vazio">
      <i class="bi bi-search"></i>
      <p>Nenhum resultado para "<strong>{{ termo() }}</strong>"</p>
      <small class="text-muted">Tente termos mais genéricos ou verifique a ortografia</small>
    </div>

    <!-- Estado inicial -->
    <div *ngIf="!termo().trim()" class="db-search__inicial">
      <div class="db-search__dica">
        <i class="bi bi-lightbulb"></i>
        <span>Digite para buscar em tabelas, colunas, procedures, triggers, views e funções</span>
      </div>
      <div class="db-search__exemplos">
        <span class="db-search__exemplo" (click)="termo.set('IDDEVEDOR'); buscar()">IDDEVEDOR</span>
        <span class="db-search__exemplo" (click)="termo.set('TBTITULO'); buscar()">TBTITULO</span>
        <span class="db-search__exemplo" (click)="termo.set('PRC_'); buscar()">PRC_</span>
        <span class="db-search__exemplo" (click)="termo.set('TR_'); buscar()">TR_</span>
      </div>
      <div class="db-search__atalhos">
        <kbd>Enter</kbd> busca &nbsp;|&nbsp; <kbd>Esc</kbd> limpa
      </div>
    </div>
  </div>
  `,
  styles: [`
    .db-search {
      background: var(--adm-card-bg, #fff);
      border: 1px solid var(--adm-border, #e2e8f0);
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .db-search__input-wrap {
      position: relative;
      margin-bottom: 0.75rem;
    }

    .db-search__icone {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--adm-text-muted, #6c757d);
      font-size: 1rem;
      pointer-events: none;
    }

    .db-search__input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.5rem;
      font-size: 0.9rem;
      border: 1px solid var(--adm-border, #e2e8f0);
      border-radius: 0.4rem;
      background: var(--adm-input-bg, #fff);
      color: var(--adm-text, #1e293b);
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .db-search__input:focus {
      outline: none;
      border-color: var(--adm-primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .db-search__clear {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--adm-text-muted, #6c757d);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .db-search__clear:hover {
      color: var(--adm-text, #1e293b);
    }

    .db-search__spinner {
      position: absolute;
      right: 2rem;
      top: 50%;
      transform: translateY(-50%);
    }

    .db-search__categorias {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--adm-border, #e2e8f0);
    }

    .db-search__cat {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--adm-text-muted, #6c757d);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .db-search__cat:hover {
      background: var(--adm-hover-bg, #f1f5f9);
      color: var(--adm-text, #1e293b);
    }

    .db-search__cat.active {
      background: var(--adm-primary, #3b82f6);
      color: #fff;
      border-color: var(--adm-primary, #3b82f6);
    }

    .db-search__cat-count {
      background: rgba(255,255,255,.2);
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      font-size: 0.65rem;
    }

    .db-search__cat.active .db-search__cat-count {
      background: rgba(255,255,255,.3);
    }

    .db-search__grupo {
      margin-bottom: 0.75rem;
    }

    .db-search__grupo-titulo {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--adm-text-muted, #6c757d);
      margin-bottom: 0.35rem;
    }

    .db-search__grupo-count {
      background: var(--adm-primary-light, #dbeafe);
      color: var(--adm-primary, #3b82f6);
      font-size: 0.65rem;
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
    }

    .db-search__lista {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .db-search__item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.5rem 0.6rem;
      background: var(--adm-hover-bg, #f8fafc);
      border: 1px solid var(--adm-border, #e2e8f0);
      border-radius: 0.4rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
    }

    .db-search__item:hover {
      background: var(--adm-primary-light, #dbeafe);
      border-color: var(--adm-primary, #3b82f6);
    }

    .db-search__item-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .db-search__item-main i {
      font-size: 1rem;
      color: var(--adm-primary, #3b82f6);
      flex-shrink: 0;
    }

    .db-search__item-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }

    .db-search__item-info strong {
      font-size: 0.82rem;
      color: var(--adm-text, #1e293b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .db-search__item-info small {
      font-size: 0.7rem;
    }

    .db-search__item-detalhe {
      font-size: 0.7rem;
      color: var(--adm-text-muted, #6c757d);
      padding-left: 1.75rem;
    }

    .db-search__vazio,
    .db-search__inicial {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem 1rem;
      color: var(--adm-text-muted, #6c757d);
      text-align: center;
    }

    .db-search__vazio i,
    .db-search__inicial i {
      font-size: 2rem;
      color: var(--adm-border, #e2e8f0);
    }

    .db-search__vazio p {
      margin: 0;
      font-size: 0.85rem;
    }

    .db-search__dica {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--adm-text-muted, #6c757d);
    }

    .db-search__dica i {
      color: #f59e0b;
    }

    .db-search__exemplos {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.35rem;
    }

    .db-search__exemplo {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.5rem;
      font-size: 0.72rem;
      font-family: 'IBM Plex Mono', monospace;
      background: var(--adm-code-bg, #f1f5f9);
      color: var(--adm-primary, #3b82f6);
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .db-search__exemplo:hover {
      background: var(--adm-primary, #3b82f6);
      color: #fff;
    }

    .db-search__atalhos {
      font-size: 0.7rem;
      color: var(--adm-text-muted, #6c757d);
    }

    .db-search__atalhos kbd {
      background: var(--adm-code-bg, #f1f5f9);
      padding: 0.1rem 0.35rem;
      border-radius: 0.2rem;
      font-family: inherit;
      font-size: 0.65rem;
    }

    @media (max-width: 768px) {
      .db-search__categorias { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 0.75rem; }
      .db-search__cat { flex-shrink: 0; }
    }
  `]
})
export class DbGlobalSearchComponent implements OnInit, OnDestroy {
  private readonly db = inject(DatabaseService);
  private readonly router = inject(Router);

  readonly termo = signal('');
  readonly carregando = signal(false);
  readonly categoriaAtiva = signal<GlobalSearchTab>('global');

  private resultadosCache = signal<SearchResultItem[]>([]);
  private buscaTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly categorias = [
    { id: 'global' as GlobalSearchTab, rotulo: 'Todas', contador: 0 },
    { id: 'tabelas' as GlobalSearchTab, rotulo: 'Tabelas', contador: 0, icone: 'bi-table' },
    { id: 'colunas' as GlobalSearchTab, rotulo: 'Colunas', contador: 0, icone: 'bi-list-columns' },
    { id: 'procedures' as GlobalSearchTab, rotulo: 'Procedures', contador: 0, icone: 'bi-lightning-charge-fill' },
    { id: 'triggers' as GlobalSearchTab, rotulo: 'Triggers', contador: 0, icone: 'bi-lightning-charge' },
    { id: 'views' as GlobalSearchTab, rotulo: 'Views', contador: 0, icone: 'bi-eye' }
  ];

  readonly resultadosFiltrados = computed(() => {
    const cat = this.categoriaAtiva();
    if (cat === 'global') return this.resultadosCache();
    return this.resultadosCache().filter(r => this.getTipoCategoria(r.tipo) === cat);
  });

  readonly resultadosAgrupados = computed(() => {
    const grupos = new Map<string, { tipo: string; icone: string; itens: SearchResultItem[] }>();
    for (const item of this.resultadosFiltrados()) {
      const key = item.tipo;
      if (!grupos.has(key)) {
        grupos.set(key, { tipo: key, icone: item.icone, itens: [] });
      }
      grupos.get(key)!.itens.push(item);
    }
    return [...grupos.values()];
  });

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.buscaTimeout) clearTimeout(this.buscaTimeout);
  }

  onTermoChange(): void {
    if (this.buscaTimeout) clearTimeout(this.buscaTimeout);
    this.buscaTimeout = setTimeout(() => this.buscar(), 250);
  }

  buscar(): void {
    const q = this.termo().trim();
    if (!q) {
      this.resultadosCache.set([]);
      this.atualizarContadores();
      return;
    }
    this.carregando.set(true);

    // Busca global (tudo)
    this.db.buscarGlobal(q, 50).subscribe({
      next: (res: GlobalSearchResult[]) => {
        const itens = this.mapearResultadosGlobais(res);
        this.resultadosCache.set(itens);
        this.atualizarContadores();
        this.carregando.set(false);
      },
      error: () => {
        // Fallback: busca simples
        this.db.buscar(q, 50).subscribe({
          next: (res: DatabaseSearchResult[]) => {
            const itens = this.mapearResultadosSimples(res);
            this.resultadosCache.set(itens);
            this.atualizarContadores();
            this.carregando.set(false);
          },
          error: () => {
            this.resultadosCache.set([]);
            this.atualizarContadores();
            this.carregando.set(false);
          }
        });
      }
    });
  }

  private mapearResultadosGlobais(res: GlobalSearchResult[]): SearchResultItem[] {
    return res.map(r => ({
      tipo: r.tipo,
      schema: r.schema,
      objeto: r.objeto,
      coluna: r.coluna,
      detalhe: r.detalhe,
      icone: this.iconePorTipo(r.tipo),
      rota: this.rotaPorTipo(r.tipo, r.schema, r.objeto)
    }));
  }

  private mapearResultadosSimples(res: DatabaseSearchResult[]): SearchResultItem[] {
    return res.map(r => ({
      tipo: r.tipo,
      schema: r.schema || 'dbo',
      objeto: r.objeto,
      coluna: r.coluna,
      detalhe: r.detalhe,
      icone: this.iconePorTipo(r.tipo),
      rota: this.rotaPorTipo(r.tipo, r.schema || 'dbo', r.objeto)
    }));
  }

  private iconePorTipo(tipo: string): string {
    const map: Record<string, string> = {
      'Tabela': 'bi-table',
      'View': 'bi-eye',
      'Procedure': 'bi-lightning-charge-fill',
      'Function': 'bi-function',
      'Trigger': 'bi-lightning-charge',
      'Coluna': 'bi-list-columns'
    };
    return map[tipo] || 'bi-question-circle';
  }

  private getTipoCategoria(tipo: string): GlobalSearchTab {
    const map: Record<string, GlobalSearchTab> = {
      'Tabela': 'tabelas',
      'View': 'views',
      'Procedure': 'procedures',
      'Function': 'procedures',
      'Trigger': 'triggers',
      'Coluna': 'colunas'
    };
    return map[tipo] || 'global';
  }

  private rotaPorTipo(tipo: string, schema: string, objeto: string): string | undefined {
    if (tipo === 'Tabela') return `/database/tabela/${schema}/${objeto}`;
    if (tipo === 'Procedure') return `/database/explorador`;
    return undefined;
  }

  private atualizarContadores(): void {
    const itens = this.resultadosCache();
    const cats = this.categorias.map(c => ({
      ...c,
      contador: c.id === 'global' ? itens.length : itens.filter(i => this.getTipoCategoria(i.tipo) === c.id).length
    }));
    // Note: can't easily update the array in place, but template reads from computed
  }

  navegar(item: SearchResultItem): void {
    if (item.rota) {
      this.router.navigateByUrl(item.rota);
    } else if (item.tipo === 'Procedure') {
      // Para procedures, abre o explorador com filtro
      this.router.navigate(['/database/explorador'], { queryParams: { proc: `${item.schema}.${item.objeto}` } });
    }
  }

  limpar(): void {
    this.termo.set('');
    this.resultadosCache.set([]);
  }
}