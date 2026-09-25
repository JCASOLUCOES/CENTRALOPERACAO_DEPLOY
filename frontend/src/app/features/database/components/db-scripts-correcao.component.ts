import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DatabaseService } from '../services/database.service';
import {
  SchemaComparisonResult, BulkSchemaComparisonResult,
  SqlScript, SqlScriptResult, SqlScriptTipo, ValidarScriptResult
} from '../models/database.model';

type Aba = 'criacao' | 'alteracao' | 'indice';

const PALAVRAS_SQL = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX',
  'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'CONSTRAINT', 'FOREIGN', 'KEY',
  'REFERENCES', 'PRIMARY', 'UNIQUE', 'CLUSTERED', 'NONCLUSTERED', 'COLUMN', 'ADD',
  'FROM', 'WHERE', 'INTO', 'VALUES', 'NOT', 'NULL', 'AND', 'OR', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'AS', 'ON', 'JOIN', 'GROUP', 'ORDER', 'BY', 'EXEC',
  'DECLARE', 'SET', 'USE', 'WITH', 'TRY_CONVERT', 'SP_RENAME', 'ISNULL', 'COUNT'
].join('|');

@Component({
  selector: 'app-db-scripts-correcao',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div *ngIf="temResultado()" class="db-scripts">
    <div class="db-scripts__header">
      <h5><i class="bi bi-code-square"></i> Scripts de correção SQL</h5>
      <p class="text-muted">
        Os scripts <strong>só criam o que existe no arquivo e falta no banco JCA</strong>
        (tabelas, colunas, índices e FKs novos). Divergências entre os dois lados seguem o
        <strong>padrão do banco JCA</strong> — nenhum script é gerado para alterar o que já existe.
        Nada é executado pelo sistema: copie, revise no SSMS e execute por sua conta e risco.
      </p>
    </div>

    <div class="db-scripts__barra">
      <button type="button" class="btn btn-primary" (click)="gerar()" [disabled]="gerando()">
        <i class="bi" [ngClass]="gerando() ? 'bi-hourglass-split' : 'bi-code-slash'"></i>
        {{ gerando() ? 'Gerando…' : (scripts() ? 'Atualizar scripts' : 'Gerar scripts') }}
      </button>
      <button *ngIf="scripts()" type="button" class="btn btn-outline-secondary" (click)="copiarTodos()">
        <i class="bi" [ngClass]="todosCopiado() ? 'bi-check-lg' : 'bi-clipboard'"></i>
        {{ todosCopiado() ? 'Copiado' : 'Copiar todos' }}
      </button>
      <button *ngIf="scripts()" type="button" class="btn btn-outline-secondary" (click)="exportarSql()">
        <i class="bi bi-file-earmark-arrow-down"></i> Exportar .sql
      </button>
    </div>

    <div *ngIf="erro()" class="adm-aviso adm-aviso--erro db-scripts__erro">
      <i class="bi bi-exclamation-triangle"></i>
      <span>{{ erro() }}</span>
    </div>

    <div *ngIf="scripts() as s" class="db-scripts__corpo">
      <div class="db-scripts__resumo">
        <span class="db-scripts__chip db-scripts__chip--criar">{{ s.resumo.totalCriacoes }} criações</span>
        <span class="db-scripts__chip db-scripts__chip--alterar">{{ s.resumo.totalAlteracoes }} alterações</span>
        <span class="db-scripts__chip db-scripts__chip--indice">{{ s.resumo.totalIndices }} índices/FKs</span>
        <span class="db-scripts__chip" [ngClass]="'db-scripts__chip--impacto--' + s.resumo.impactoEstimado.toLowerCase()">
          impacto: {{ rotuloImpacto(s.resumo.impactoEstimado) }}
        </span>
        <span *ngIf="s.resumo.qtdAvisos" class="db-scripts__chip db-scripts__chip--aviso">
          {{ s.resumo.qtdAvisos }} com aviso/crítico
        </span>
      </div>

      <div *ngIf="s.resumo.revisaoManual.length" class="db-scripts__revisao">
        <strong><i class="bi bi-exclamation-circle"></i>
          Revisão manual necessária ({{ s.resumo.revisaoManual.length }})</strong>
        <ul>
          <li *ngFor="let item of s.resumo.revisaoManual">{{ item }}</li>
        </ul>
      </div>

      <p class="text-muted db-scripts__filtro-info" *ngIf="filtroSeveridade()">
        <i class="bi bi-funnel"></i>
        Abas filtradas pela origem em <strong>{{ rotuloFiltroOrigem() }}</strong>
        (severidade da diferença que originou o script).
      </p>

      <div class="db-scripts__abas" role="tablist" aria-label="Abas de scripts">
        <button type="button" role="tab" class="db-scripts__aba"
                [class.db-scripts__aba--on]="aba() === 'criacao'"
                [attr.aria-selected]="aba() === 'criacao'"
                (click)="aba.set('criacao')">
          Criação <span class="db-scripts__aba-n">{{ contagem('criacao') }}</span>
        </button>
        <button type="button" role="tab" class="db-scripts__aba"
                [class.db-scripts__aba--on]="aba() === 'alteracao'"
                [attr.aria-selected]="aba() === 'alteracao'"
                (click)="aba.set('alteracao')">
          Alterações <span class="db-scripts__aba-n">{{ contagem('alteracao') }}</span>
        </button>
        <button type="button" role="tab" class="db-scripts__aba"
                [class.db-scripts__aba--on]="aba() === 'indice'"
                [attr.aria-selected]="aba() === 'indice'"
                (click)="aba.set('indice')">
          Índices e FKs <span class="db-scripts__aba-n">{{ contagem('indice') }}</span>
        </button>
      </div>

      <div class="db-scripts__lista">
        <div *ngIf="abaScripts().length === 0" class="adm-empty">
          <ng-container *ngIf="filtroSeveridade(); else semFiltro">
            Nenhum script desta aba com origem em <strong>{{ rotuloFiltroOrigem() }}</strong>.
          </ng-container>
          <ng-template #semFiltro>Nenhum script nesta aba.</ng-template>
        </div>

        <div *ngFor="let sc of abaScripts()" class="db-scripts__card"
             [ngClass]="'db-scripts__card--' + sc.severidade.toLowerCase()">
          <div class="db-scripts__card-topo">
            <span class="db-scripts__tipo">{{ rotuloTipo(sc.tipo) }}</span>
            <span class="db-scripts__sev" [ngClass]="'db-scripts__sev--' + sc.severidade.toLowerCase()">
              {{ rotuloSeveridade(sc.severidade) }}
            </span>
            <span *ngIf="sc.tabela && ehBulk()" class="db-scripts__tag">
              <i class="bi bi-table"></i> {{ sc.tabela }}
            </span>
            <span class="db-scripts__campo">{{ sc.campoRelacionado }}</span>
            <div class="db-scripts__acoes">
              <button type="button" class="btn btn-sm btn-outline-secondary"
                      (click)="copiar(sc)" [title]="'Copiar script'">
                <i class="bi" [ngClass]="copiadoId() === sc.id ? 'bi-check-lg' : 'bi-clipboard'"></i>
                {{ copiadoId() === sc.id ? 'Copiado' : 'Copiar' }}
              </button>
              <button type="button" class="btn btn-sm btn-outline-primary"
                      (click)="validar(sc)" [disabled]="validandoId() === sc.id"
                      title="Validação estática (nada é executado no banco)">
                <i class="bi bi-check2-circle"></i>
                {{ validandoId() === sc.id ? 'Validando…' : 'Validar' }}
              </button>
            </div>
          </div>

          <p class="db-scripts__desc">{{ sc.descricao }}</p>

          <pre class="db-scripts__pre"><code [innerHTML]="realcar(sc.sqlFormatado)"></code></pre>

          <div *ngIf="validacao(sc.id) as v" class="db-scripts__validacao"
               [ngClass]="v.valido ? 'db-scripts__validacao--ok' : 'db-scripts__validacao--erro'">
            <strong>
              <i class="bi" [ngClass]="v.valido ? 'bi-check-circle' : 'bi-x-circle'"></i>
              {{ v.valido ? 'Script válido (análise estática)' : 'Problemas encontrados na análise estática' }}
            </strong>
            <ul *ngIf="v.erros.length">
              <li *ngFor="let e of v.erros" class="db-scripts__v-erro">{{ e }}</li>
            </ul>
            <ul *ngIf="v.avisos.length">
              <li *ngFor="let a of v.avisos" class="db-scripts__v-aviso">{{ a }}</li>
            </ul>
            <small *ngIf="!v.erros.length && !v.avisos.length" class="text-muted">
              Nenhum erro ou aviso detectado. Nada foi executado no banco.
            </small>
          </div>

          <div *ngIf="sc.consultaValidacao" class="db-scripts__consulta">
            <span class="db-scripts__consulta-label">Validar após executar:</span>
            <code>{{ sc.consultaValidacao }}</code>
            <button type="button" class="btn btn-sm btn-outline-secondary"
                    (click)="copiarTexto(sc.consultaValidacao, 'consulta')">
              <i class="bi" [ngClass]="copiadoId() === 'consulta' ? 'bi-check-lg' : 'bi-clipboard'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .db-scripts { margin-top: 1.25rem; border-top: 1px dashed #cbd5e1; padding-top: 1rem; }
    .db-scripts__header h5 { font-weight: 600; margin-bottom: 0.25rem; }
    .db-scripts__header p { font-size: 0.85rem; margin-bottom: 0.75rem; }
    .db-scripts__barra {
      display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.85rem;
    }
    .db-scripts__erro { margin-bottom: 0.75rem; }
    .db-scripts__filtro-info {
      font-size: 0.8rem; margin: 0 0 0.5rem;
    }
    .db-scripts__resumo { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
    .db-scripts__chip {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px;
      background: #f1f5f9; color: #334155;
    }
    .db-scripts__chip--criar { background: #dbeafe; color: #1e40af; }
    .db-scripts__chip--alterar { background: #fef3c7; color: #92400e; }
    .db-scripts__chip--indice { background: #ede9fe; color: #5b21b6; }
    .db-scripts__chip--aviso { background: #fee2e2; color: #991b1b; }
    .db-scripts__chip--impacto--low { background: #d1fae5; color: #065f46; }
    .db-scripts__chip--impacto--medium { background: #fef3c7; color: #92400e; }
    .db-scripts__chip--impacto--high { background: #ffedd5; color: #9a3412; }
    .db-scripts__chip--impacto--critical { background: #fee2e2; color: #991b1b; }
    .db-scripts__revisao {
      background: #fffbeb; border: 1px solid #fcd34d; border-radius: 0.4rem;
      padding: 0.6rem 0.85rem; font-size: 0.82rem; color: #92400e; margin-bottom: 0.85rem;
    }
    .db-scripts__revisao ul { margin: 0.4rem 0 0; padding-left: 1.1rem; }
    .db-scripts__revisao li { margin-bottom: 0.15rem; }
    .db-scripts__abas { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .db-scripts__aba {
      display: inline-flex; align-items: center; gap: 0.4rem;
      border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0.4rem;
      padding: 0.4rem 0.8rem; font-size: 0.83rem; font-weight: 600; color: #475569;
      cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .db-scripts__aba:hover { color: #1e3a8a; border-color: #cbd5e1; }
    .db-scripts__aba--on { background: #1e3a8a; border-color: #1e3a8a; color: #fff; }
    .db-scripts__aba-n {
      background: rgba(0,0,0,0.08); border-radius: 999px; padding: 0 0.45rem;
      font-size: 0.72rem;
    }
    .db-scripts__aba--on .db-scripts__aba-n { background: rgba(255,255,255,0.2); }
    .db-scripts__lista { display: flex; flex-direction: column; gap: 0.6rem; }
    .db-scripts__card {
      border: 1px solid #e2e8f0; border-left: 4px solid #94a3b8;
      border-radius: 0.45rem; background: #fff; padding: 0.7rem 0.85rem;
    }
    .db-scripts__card--info { border-left-color: #2563eb; }
    .db-scripts__card--aviso { border-left-color: #d97706; }
    .db-scripts__card--critico { border-left-color: #dc2626; }
    .db-scripts__card-topo {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
    }
    .db-scripts__tipo {
      background: #0f172a; color: #e2e8f0; font-size: 0.7rem; font-weight: 700;
      padding: 0.15rem 0.5rem; border-radius: 0.3rem; letter-spacing: 0.02em;
    }
    .db-scripts__sev {
      font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px;
    }
    .db-scripts__sev--info { background: #dbeafe; color: #1e40af; }
    .db-scripts__sev--aviso { background: #fef3c7; color: #92400e; }
    .db-scripts__sev--critico { background: #fee2e2; color: #991b1b; }
    .db-scripts__tag { font-size: 0.72rem; color: #334155; background: #e2e8f0; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .db-scripts__campo { font-size: 0.82rem; font-weight: 700; color: #334155; }
    .db-scripts__acoes { margin-left: auto; display: flex; gap: 0.4rem; }
    .db-scripts__desc { font-size: 0.83rem; color: #475569; margin: 0.4rem 0 0.5rem; }
    .db-scripts__pre {
      margin: 0; padding: 0.7rem; max-height: 18rem; overflow: auto;
      font-size: 0.75rem; line-height: 1.45; background: #0f172a; color: #e2f0f0;
      border-radius: 0.4rem; white-space: pre;
    }
    .db-scripts__pre .sql-c { color: #64748b; font-style: italic; }
    .db-scripts__pre .sql-k { color: #93c5fd; font-weight: 600; }
    .db-scripts__pre .sql-s { color: #86efac; }
    .db-scripts__pre .sql-n { color: #f0abfc; }
    .db-scripts__validacao {
      margin-top: 0.5rem; padding: 0.5rem 0.7rem; border-radius: 0.4rem; font-size: 0.8rem;
    }
    .db-scripts__validacao--ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .db-scripts__validacao--erro { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .db-scripts__validacao ul { margin: 0.35rem 0 0; padding-left: 1.1rem; }
    .db-scripts__validacao li { margin-bottom: 0.1rem; }
    .db-scripts__v-aviso { color: #92400e; }
    .db-scripts__consulta {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      margin-top: 0.5rem; font-size: 0.78rem; background: #f8fafc;
      border: 1px dashed #cbd5e1; border-radius: 0.4rem; padding: 0.4rem 0.6rem;
    }
    .db-scripts__consulta-label { font-weight: 700; color: #475569; }
    .db-scripts__consulta code { font-size: 0.74rem; color: #0f172a; word-break: break-all; }
    @media (max-width: 768px) {
      .db-scripts__barra { flex-direction: column; align-items: stretch; }
      .db-scripts__acoes { margin-left: 0; width: 100%; }
      .db-scripts__campo { width: 100%; }
    }
  `]
})
export class DbScriptsCorrecaoComponent {
  private readonly db = inject(DatabaseService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly resultado = input<SchemaComparisonResult | null>(null);
  readonly resultadoBulk = input<BulkSchemaComparisonResult | null>(null);
  /** Filtro de origem das abas (modo tabela única): severidade da diferença que gerou o script. */
  readonly filtroSeveridade = input<string | null>(null);

  readonly scripts = signal<SqlScriptResult | null>(null);
  readonly gerando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aba = signal<Aba>('criacao');
  readonly copiadoId = signal<string | null>(null);
  readonly todosCopiado = signal(false);
  readonly validandoId = signal<string | null>(null);
  readonly validacoes = signal<Record<string, ValidarScriptResult>>({});

  private readonly rxRealce = new RegExp(
    `(--[^\\n]*)|(\\/\\*[\\s\\S]*?\\*\\/)|('(?:[^']|'')*')|\\b(${PALAVRAS_SQL})\\b|\\b(\\d+(?:\\.\\d+)?)\\b`,
    'gi');

  constructor() {
    // Trocou a comparacao (ou limpou): descarta os scripts ja gerados.
    effect(() => {
      this.resultado();
      this.resultadoBulk();
      this.scripts.set(null);
      this.validacoes.set({});
      this.erro.set(null);
      this.aba.set('criacao');
    }, { allowSignalWrites: true });
  }

  temResultado(): boolean {
    return !!(this.resultado() || this.resultadoBulk());
  }

  gerar(): void {
    const r = this.resultado();
    const rb = this.resultadoBulk();
    if (!r && !rb) return;

    this.gerando.set(true);
    this.erro.set(null);
    this.validacoes.set({});

    const req = r ? this.db.gerarScripts(r) : this.db.gerarScriptsBulk(rb!);
    req.subscribe({
      next: res => {
        this.scripts.set(res);
        this.aba.set(
          res.scriptsCriacao.length ? 'criacao' :
          res.scriptsAlteracao.length ? 'alteracao' : 'indice');
        this.gerando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao gerar os scripts de correção.');
        this.gerando.set(false);
      }
    });
  }

  abaScripts(): SqlScript[] {
    return this.filtrar(this.listaAba(this.aba()));
  }

  contagem(a: Aba): number {
    return this.filtrar(this.listaAba(a)).length;
  }

  ehBulk(): boolean {
    return !!this.resultadoBulk();
  }

  rotuloFiltroOrigem(): string {
    switch (this.filtroSeveridade()) {
      case 'Critico': return 'críticos';
      case 'Aviso': return 'avisos';
      case 'Info': return 'informativos';
      default: return '';
    }
  }

  private listaAba(a: Aba): SqlScript[] {
    const s = this.scripts();
    if (!s) return [];
    switch (a) {
      case 'criacao': return s.scriptsCriacao;
      case 'alteracao': return s.scriptsAlteracao;
      default: return s.scriptsIndiceConstraint;
    }
  }

  private filtrar(lista: SqlScript[]): SqlScript[] {
    const f = this.filtroSeveridade();
    if (!f) return lista;
    return lista.filter(sc => (sc.severidadeOrigem ?? sc.severidade) === f);
  }

  validar(sc: SqlScript): void {
    this.validandoId.set(sc.id);
    this.db.validarScript(sc.sql).subscribe({
      next: v => {
        this.validacoes.set({ ...this.validacoes(), [sc.id]: v });
        this.validandoId.set(null);
      },
      error: () => {
        this.erro.set('Falha ao validar o script.');
        this.validandoId.set(null);
      }
    });
  }

  validacao(id: string): ValidarScriptResult | null {
    return this.validacoes()[id] ?? null;
  }

  copiar(sc: SqlScript): void {
    this.copiarTexto(sc.sql, sc.id);
  }

  copiarTexto(texto: string, id: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => this.marcarCopia(id))
        .catch(() => {
          if (this.copiarFallback(texto)) this.marcarCopia(id);
          else this.erro.set('Não foi possível copiar o script automaticamente.');
        });
      return;
    }
    if (this.copiarFallback(texto)) this.marcarCopia(id);
    else this.erro.set('Não foi possível copiar o script automaticamente.');
  }

  private marcarCopia(id: string): void {
    this.erro.set(null);
    this.copiadoId.set(id);
    setTimeout(() => {
      if (this.copiadoId() === id) this.copiadoId.set(null);
    }, 2000);
  }

  private copiarFallback(texto: string): boolean {
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  copiarTodos(): void {
    const texto = this.montarArquivo();
    if (!texto) return;
    this.copiarTexto(texto, '__todos__');
    this.todosCopiado.set(true);
    setTimeout(() => this.todosCopiado.set(false), 2000);
  }

  exportarSql(): void {
    const texto = this.montarArquivo();
    if (!texto || typeof document === 'undefined') return;
    const blob = new Blob([texto], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correcao-schemas-${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private montarArquivo(): string | null {
    const s = this.scripts();
    if (!s) return null;
    const grupos: [string, SqlScript[]][] = [
      ['1. CRIAÇÃO (CREATE TABLE)', s.scriptsCriacao],
      ['2. ALTERAÇÕES (colunas)', s.scriptsAlteracao],
      ['3. ÍNDICES E FOREIGN KEYS', s.scriptsIndiceConstraint]
    ];

    const cabecalho = [
      '-- ============================================================',
      '-- Scripts de correção de schemas — Central de Conhecimento',
      `-- Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '-- Direção: cria apenas o que existe no arquivo e falta no banco JCA.',
      '-- Divergências seguem o padrão do banco JCA (nenhum script gerado).',
      '-- Nada é executado pelo sistema; revise no SSMS antes de executar.',
      '-- ============================================================',
      ''
    ].join('\n');

    const blocos: string[] = [];
    let n = 0;
    for (const [rotulo, lista] of grupos) {
      if (!lista.length) continue;
      blocos.push(`-- ------------------------------------------------------------`);
      blocos.push(`-- ${rotulo}`);
      blocos.push(`-- ------------------------------------------------------------`);
      for (const sc of lista) {
        n++;
        blocos.push(`-- [${n}] ${this.rotuloTipo(sc.tipo)} — ${sc.descricao}`);
        blocos.push(sc.sql);
        blocos.push('');
      }
    }

    const r = s.resumo;
    const rodape = [
      '-- ============================================================',
      `-- Resumo: ${r.totalCriacoes} criações, ${r.totalAlteracoes} alterações, ` +
        `${r.totalIndices} índices/FKs — impacto ${this.rotuloImpacto(r.impactoEstimado)}.`,
      ...(r.revisaoManual.length
        ? ['-- Revisão manual pendente:', ...r.revisaoManual.map(i => `--   * ${i}`)]
        : []),
      '-- ============================================================',
      ''
    ].join('\n');

    return cabecalho + blocos.join('\n') + rodape;
  }

  realcar(sql: string): SafeHtml {
    const esc = (sql || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    this.rxRealce.lastIndex = 0;
    const html = esc.replace(this.rxRealce, (m, com, bloco, str, kw, num) => {
      if (com) return `<span class="sql-c">${com}</span>`;
      if (bloco) return `<span class="sql-c">${bloco}</span>`;
      if (str) return `<span class="sql-s">${str}</span>`;
      if (kw) return `<span class="sql-k">${kw}</span>`;
      if (num) return `<span class="sql-n">${num}</span>`;
      return m;
    });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  rotuloTipo(t: SqlScriptTipo): string {
    switch (t) {
      case 'CREATE_TABLE': return 'CRIAR TABELA';
      case 'ADD_COLUMN': return 'ADICIONAR COLUNA';
      case 'CREATE_INDEX': return 'CRIAR ÍNDICE';
      case 'ALTER_FK': return 'FOREIGN KEY';
      default: return t;
    }
  }

  rotuloSeveridade(s: string): string {
    switch (s) {
      case 'Info': return 'INFORMATIVO';
      case 'Aviso': return 'AVISO';
      case 'Critico': return 'CRÍTICO';
      default: return s;
    }
  }

  rotuloImpacto(i: string): string {
    switch (i) {
      case 'Low': return 'baixo';
      case 'Medium': return 'médio';
      case 'High': return 'alto';
      case 'Critical': return 'crítico';
      default: return i;
    }
  }
}
