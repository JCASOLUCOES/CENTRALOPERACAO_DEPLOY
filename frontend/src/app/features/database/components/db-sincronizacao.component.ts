import { CommonModule } from '@angular/common';
import { Component, inject, signal, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import {
  DatabaseTable, SchemaComparisonBatchResult, SchemaComparisonResult, SchemaDifference
} from '../models/database.model';

@Component({
  selector: 'app-db-sincronizacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="adm-card p-3">
    <h3 class="adm-card__title">Comparação de Schemas</h3>
    <p class="adm-card__desc">
      Envie um arquivo <strong>CSV</strong> ou <strong>JSON</strong> com a estrutura esperada
      e compare com o <strong>schema real do banco JCA</strong> (colunas, tipos, nullable, índices e FKs).
    </p>

    <div class="db-sync__modo mb-3" role="group" aria-label="Modo de comparação">
      <button type="button" class="btn btn-sm"
              [class.btn-primary]="modo() === 'unica'"
              [class.btn-outline-secondary]="modo() !== 'unica'"
              (click)="setModo('unica')">
        <i class="bi bi-table"></i> Uma tabela
      </button>
      <button type="button" class="btn btn-sm"
              [class.btn-primary]="modo() === 'lote'"
              [class.btn-outline-secondary]="modo() !== 'lote'"
              (click)="setModo('lote')">
        <i class="bi bi-collection"></i> Lote (várias tabelas)
      </button>
    </div>

    <div class="db-sync__controles">
      <label *ngIf="modo() === 'unica'">Tabela JCA:
        <select class="form-select form-select-sm" [(ngModel)]="tabelaSelecionada"
                (ngModelChange)="onTabelaJcaChange($event)" [disabled]="carregando()">
          <option value="">Selecione…</option>
          <option *ngFor="let t of tabelas()" [value]="t.schema + '|' + t.nome">
            {{ t.nomeCompleto }} ({{ t.quantidadeColunas }} colunas)
          </option>
        </select>
      </label>

      <label *ngIf="modo() === 'lote'" class="db-sync__lote-info">
        <span class="db-sync__lote-placeholder">
          <i class="bi bi-collection"></i>
          JSON de lote com array de tabelas (schema.table + colunas/índices/FKs)
        </span>
      </label>

      <label class="db-sync__file">
        <input type="file" [accept]="modo() === 'lote' ? '.json' : '.csv,.json'" (change)="onArquivo($event)" [disabled]="carregando()">
        <span *ngIf="!arquivo()" class="db-sync__file-placeholder">
          <i class="bi bi-upload"></i>
          {{ modo() === 'lote' ? 'Escolher JSON de lote' : 'Escolher CSV ou JSON' }}
        </span>
        <span *ngIf="arquivo()" class="db-sync__file-name">
          <i class="bi bi-file-earmark-text"></i> {{ arquivo()!.name }}
        </span>
      </label>

      <button class="btn btn-primary" (click)="comparar()"
        [disabled]="carregando() || !arquivo() || (modo() === 'unica' && !tabelaSelecionada)">
        <i class="bi bi-arrow-left-right"></i>
        {{ carregando() ? 'Comparando…' : 'Comparar' }}
      </button>

      <button *ngIf="resultado()" class="btn btn-outline-secondary" (click)="exportarCsv()">
        <i class="bi bi-download"></i> Exportar CSV
      </button>
    </div>

    <div class="db-sync__script mb-3">
      <div class="db-sync__script-header">
        <strong>
          Script de exportação (JSON)
          <span class="db-sync__modo-tag">{{ modo() === 'lote' ? 'lote · várias tabelas' : 'uma tabela' }}</span>
        </strong>
        <div class="db-sync__script-acoes">
          <input class="form-control form-control-sm db-sync__script-input"
                 type="text" placeholder="schema" [(ngModel)]="scriptSchema"
                 aria-label="Schema no banco externo">
          <input *ngIf="modo() === 'unica'"
                 class="form-control form-control-sm db-sync__script-input"
                 type="text" placeholder="tabela" [(ngModel)]="scriptTabela"
                 aria-label="Nome da tabela no banco externo">
          <input *ngIf="modo() === 'lote'"
                 class="form-control form-control-sm db-sync__script-input db-wide"
                 type="text" placeholder="tabelas: Tab1, Tab2 (opcional)" [(ngModel)]="scriptTabelasLote"
                 aria-label="Lista de tabelas no banco externo (opcional)">
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="copiarScript()">
            <i class="bi" [ngClass]="scriptCopiado() ? 'bi-check-lg' : 'bi-clipboard'"></i>
            {{ scriptCopiado() ? 'Copiado' : 'Copiar script' }}
          </button>
        </div>
      </div>
      <pre class="db-sync__script-pre">{{ scriptSql() }}</pre>
      <small class="text-muted db-sync__script-dica">
        1. Rode no SSMS do banco externo · 2. Clique na célula do resultado e copie o JSON inteiro ·
        3. Cole em um arquivo <code>.json</code> e envie acima.
        <ng-container *ngIf="modo() === 'unica'">
          O script gera colunas, índices e FKs no formato aceito pelo sistema.
        </ng-container>
        <ng-container *ngIf="modo() === 'lote'">
          O script gera um <code>array</code> JSON com todas as tabelas (ou só as listadas em
          <code>tabelas:</code>) — cada item com <code>tabela</code>, <code>colunas</code>,
          <code>indices</code> e <code>fks</code>.
        </ng-container>
        Compatível com SQL Server 2005+ (usa <code>FOR XML PATH</code>, sem <code>FOR JSON</code>).
        Se o SSMS/Excel embrulhar o valor em aspas, o backend desembrulha automaticamente —
        prefira colar o JSON limpo começando por <code>[</code> (lote) ou <code>&#123;</code> (uma tabela).
      </small>
    </div>

    <div *ngIf="erro()" class="adm-aviso adm-aviso--erro mb-3">
      <i class="bi bi-exclamation-triangle"></i>
      <span>{{ erro() }}</span>
    </div>

    <div *ngIf="!carregando() && !resultado() && !erro()" class="adm-empty">
      <ng-container *ngIf="modo() === 'unica'">
        Selecione uma tabela, envie o arquivo e clique em <strong>Comparar</strong>.
        <br><small class="text-muted">
          CSV: cabeçalho com <code>nome,tipo,nulo</code> (opcionais: ordem, tamanho, precisao, escala, valorDefault).
          JSON: objeto com <code>colunas[]</code>, <code>indices[]</code>, <code>fks[]</code> — ou apenas array de colunas.
        </small>
      </ng-container>
      <ng-container *ngIf="modo() === 'lote'">
        Envie o <strong>JSON de lote</strong> gerado pelo script e clique em <strong>Comparar</strong>.
        <br><small class="text-muted">
          Array de objetos <code>&#123; tabela, colunas, indices, fks &#125;</code>.
          Cada <code>tabela</code> no formato <code>schema.nome</code> é comparada com o JCA
          e as críticas são numeradas de forma global (1, 2, 3…).
        </small>
      </ng-container>
    </div>

    <div *ngIf="resultado() as r" class="db-sync__resultado">
      <h5>
        Resumo
        <span *ngIf="r.totalTabelas > 1"> — {{ r.totalTabelas }} tabelas</span>
        <span *ngIf="r.totalTabelas === 1 && r.resultados[0]"> — {{ r.resultados[0].tabela }}</span>
      </h5>
      <p class="text-muted mb-2" *ngIf="r.arquivoNome">
        Arquivo: <strong>{{ r.arquivoNome }}</strong> ·
        <span *ngIf="r.totalTabelas === 1 && r.resultados[0] as one">
          {{ one.totalColunasJca }} colunas JCA × {{ one.totalColunasArquivo }} no arquivo ·
          Match: <strong>{{ one.percentualMatch }}%</strong>
        </span>
        <span *ngIf="r.totalTabelas > 1">
          {{ r.totalTabelas }} tabelas comparadas
        </span>
      </p>

      <div class="adm-stats">
        <div class="adm-stat">
          <strong class="db-sync__num text-danger">{{ r.totalCriticos }}</strong>
          <span>críticos</span>
        </div>
        <div class="adm-stat">
          <strong class="db-sync__num text-warning">{{ r.totalAvisos }}</strong>
          <span>avisos</span>
        </div>
        <div class="adm-stat">
          <strong class="db-sync__num text-success">{{ r.totalOks }}</strong>
          <span>compatíveis</span>
        </div>
        <div class="adm-stat" *ngIf="r.totalTabelas === 1 && r.resultados[0] as one">
          <strong class="db-sync__num">{{ one.percentualMatch }}%</strong>
          <span>match</span>
        </div>
      </div>

      <div class="form-check mb-2 mt-3">
        <input class="form-check-input" type="checkbox" id="soDiferencas" [(ngModel)]="soDiferencas">
        <label class="form-check-label" for="soDiferencas">Mostrar apenas diferenças</label>
      </div>

      <div *ngIf="totalVisiveis() === 0" class="adm-empty">
        Nenhuma diferença encontrada. Os schemas estão compatíveis.
      </div>

      <div class="db-sync__blocos">
        <div *ngFor="let bloco of r.resultados" class="db-sync__bloco">
          <div class="db-sync__bloco-head" *ngIf="r.totalTabelas > 1">
            <strong>{{ bloco.tabela }}</strong>
            <span class="db-sync__pill db-sync__pill--Critico" *ngIf="bloco.criticos">{{ bloco.criticos }} crít.</span>
            <span class="db-sync__pill db-sync__pill--Aviso" *ngIf="bloco.avisos">{{ bloco.avisos }} aviso</span>
            <span class="db-sync__pill db-sync__pill--Ok" *ngIf="bloco.oks">{{ bloco.oks }} ok</span>
            <span class="db-sync__pill" *ngIf="!bloco.criticos && !bloco.avisos">match {{ bloco.percentualMatch }}%</span>
          </div>

          <div class="db-sync__lista">
            <div *ngFor="let d of diferencasDe(bloco)"
                 class="db-sync__item"
                 [ngClass]="'db-sync__item--' + severidadeClass(d.severidade)">
              <span *ngIf="d.numeroCritico" class="db-sync__badge" [attr.data-critico]="d.numeroCritico">
                {{ d.numeroCritico }}
              </span>
              <span class="db-sync__dot" [ngClass]="'db-sync__dot--' + severidadeClass(d.severidade)"></span>
              <span class="db-sync__cat">{{ d.categoria }}</span>
              <strong>{{ d.campo }}</strong>
              <span *ngIf="d.esperado" class="db-sync__val">
                JCA: <code>{{ d.esperado }}</code>
              </span>
              <span *ngIf="d.encontrado" class="db-sync__val">
                Arquivo: <code>{{ d.encontrado }}</code>
              </span>
              <small class="db-sync__desc">{{ d.descricao }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .db-sync__modo { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .db-sync__modo-tag {
      font-size: 0.7rem; font-weight: 600; color: #1e3a8a;
      background: #eff6ff; border-radius: 0.25rem; padding: 0.1rem 0.4rem; margin-left: 0.35rem;
      vertical-align: middle;
    }
    .db-sync__lote-info { display: flex !important; }
    .db-sync__lote-placeholder {
      display: inline-flex; align-items: center; gap: 0.4rem;
      border: 1px dashed #94a3b8; border-radius: 0.4rem;
      padding: 0.45rem 0.85rem; background: #f8fafc; font-weight: 400; color: #475569;
    }
    .db-sync__controles { display: flex; gap: 1rem; align-items: flex-end; margin: 1rem 0; flex-wrap: wrap; }
    .db-sync__controles label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 600; }
    .db-sync__controles select { min-width: 16rem; }
    .db-sync__file { position: relative; cursor: pointer; }
    .db-sync__file input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .db-sync__file-placeholder,
    .db-sync__file-name {
      display: inline-flex; align-items: center; gap: 0.4rem;
      border: 1px dashed #94a3b8; border-radius: 0.4rem;
      padding: 0.45rem 0.85rem; font-size: 0.85rem; background: #f8fafc;
    }
    .db-sync__file-name { border-style: solid; border-color: #2563eb; color: #1e3a8a; background: #eff6ff; }
    .db-sync__resultado h5 { font-weight: 600; }
    .db-sync__num { font-size: 1.4rem; display: block; line-height: 1.2; }
    .adm-stat span { font-size: 0.75rem; color: #64748b; }
    .db-sync__blocos { display: flex; flex-direction: column; gap: 1rem; }
    .db-sync__bloco-head {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.4rem 0.6rem; background: #f1f5f9; border-radius: 0.4rem; margin-bottom: 0.4rem;
      font-size: 0.9rem;
    }
    .db-sync__pill {
      font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 999px;
      background: #e2e8f0; color: #334155;
    }
    .db-sync__pill--Critico { background: #fee2e2; color: #991b1b; }
    .db-sync__pill--Aviso { background: #fef3c7; color: #92400e; }
    .db-sync__pill--Ok { background: #d1fae5; color: #065f46; }
    .db-sync__lista { display: flex; flex-direction: column; gap: 0.35rem; }
    .db-sync__item {
      display: flex; gap: 0.55rem; align-items: baseline; flex-wrap: wrap;
      padding: 0.5rem 0.75rem; border-radius: 0.4rem; font-size: 0.88rem;
    }
    .db-sync__item--Critico { background: #fee2e2; color: #991b1b; }
    .db-sync__item--Aviso { background: #fef3c7; color: #92400e; }
    .db-sync__item--Ok { background: #d1fae5; color: #065f46; }
    .db-sync__badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 1.35rem; height: 1.35rem; padding: 0 0.3rem;
      border-radius: 999px; background: #991b1b; color: #fff;
      font-size: 0.72rem; font-weight: 700; flex-shrink: 0; align-self: center;
      line-height: 1;
    }
    .db-sync__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; flex-shrink: 0; align-self: center; }
    .db-sync__dot--Critico { background: #ef4444; }
    .db-sync__dot--Aviso { background: #eab308; }
    .db-sync__dot--Ok { background: #22c55e; }
    .db-sync__cat {
      background: rgba(0,0,0,0.1); padding: 0.1rem 0.4rem;
      border-radius: 0.25rem; font-size: 0.7rem; font-weight: 600;
    }
    .db-sync__val code { font-size: 0.8rem; }
    .db-sync__desc { margin-left: auto; opacity: 0.85; }
    .db-sync__script { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem; background: #f8fafc; }
    .db-sync__script-header {
      display: flex; justify-content: space-between; align-items: center;
      gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; font-size: 0.9rem;
    }
    .db-sync__script-acoes { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .db-sync__script-input { width: 9rem; }
    .db-sync__script-input.db-wide { width: 16rem; }
    .db-sync__script-pre {
      margin: 0; padding: 0.75rem; max-height: 16rem; overflow: auto;
      font-size: 0.75rem; line-height: 1.4; background: #0f172a; color: #e2e8f0;
      border-radius: 0.4rem; white-space: pre;
    }
    .db-sync__script-dica { display: block; margin-top: 0.5rem; font-size: 0.78rem; }
    @media (max-width: 768px) {
      .db-sync__controles { flex-direction: column; align-items: stretch; }
      .db-sync__controles select { min-width: 0; width: 100%; }
      .db-sync__desc { margin-left: 0; width: 100%; }
      .db-sync__script-header { flex-direction: column; align-items: stretch; }
      .db-sync__script-input,
      .db-sync__script-input.db-wide { width: 100%; }
    }
  `]
})
export class DbSincronizacaoComponent {
  private readonly db = inject(DatabaseService);

  readonly tabelas = input<DatabaseTable[]>([]);
  readonly fechado = output<void>();

  readonly modo = signal<'unica' | 'lote'>('unica');
  readonly resultado = signal<SchemaComparisonBatchResult | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly arquivo = signal<File | null>(null);
  readonly scriptCopiado = signal(false);
  soDiferencas = true;

  tabelaSelecionada = '';
  scriptSchema = 'dbo';
  scriptTabela = '';
  scriptTabelasLote = '';

  setModo(m: 'unica' | 'lote'): void {
    if (this.modo() === m) return;
    this.modo.set(m);
    this.erro.set(null);
    this.resultado.set(null);
    this.arquivo.set(null);
    this.scriptCopiado.set(false);
  }

  onTabelaJcaChange(valor: string): void {
    if (!valor) return;
    const [schema, tabela] = valor.split('|');
    if (schema) this.scriptSchema = schema;
    if (tabela) this.scriptTabela = tabela;
  }

  scriptSql(): string {
    return this.modo() === 'lote' ? this.scriptSqlLote() : this.scriptSqlUnica();
  }

  private scriptSqlUnica(): string {
    const schema = this.litarSql(this.scriptSchema || 'SEU_SCHEMA');
    const tabela = this.litarSql(this.scriptTabela || 'SUA_TABELA');
    return `DECLARE @schema sysname = N'${schema}';
DECLARE @tabela sysname = N'${tabela}';
DECLARE @objId int = OBJECT_ID(QUOTENAME(@schema) + N'.' + QUOTENAME(@tabela));

IF @objId IS NULL
BEGIN
    RAISERROR('Tabela nao encontrada. Ajuste @schema / @tabela.', 16, 1);
    RETURN;
END

;WITH colunas AS (
    SELECT
        c.name AS nome,
        ty.name AS tipo,
        CAST(c.is_nullable AS bit) AS nulo,
        c.column_id AS ordem,
        CAST(CASE WHEN c.max_length = -1 THEN NULL ELSE c.max_length END AS int) AS tamanho,
        CAST(c.precision AS int) AS precisao,
        CAST(c.scale AS int) AS escala,
        NULLIF(dc.definition, N'') AS valorDefault
    FROM sys.columns c
    JOIN sys.types ty ON c.user_type_id = ty.user_type_id
    LEFT JOIN sys.default_constraints dc
        ON dc.parent_object_id = c.object_id
       AND dc.parent_column_id = c.column_id
    WHERE c.object_id = @objId
),
indices AS (
    SELECT
        i.name AS nome,
        CAST(i.is_unique AS bit) AS [unique],
        N'[' + ISNULL(
            STUFF((
                SELECT N',"' + REPLACE(REPLACE(c.name, N'\\', N'\\\\'), N'"', N'\\"') + N'"'
                FROM sys.index_columns ic
                JOIN sys.columns c
                    ON c.object_id = ic.object_id
                   AND c.column_id = ic.column_id
                WHERE ic.object_id = i.object_id
                  AND ic.index_id = i.index_id
                  AND ic.is_included_column = 0
                ORDER BY ic.key_ordinal
                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'), 1, 1, N''),
            N''
        ) + N']' AS colunasJson
    FROM sys.indexes i
    WHERE i.object_id = @objId
      AND i.is_hypothetical = 0
      AND i.name IS NOT NULL
),
fks AS (
    SELECT
        fk.name AS nome,
        cp.name AS colunaOrigem,
        SCHEMA_NAME(rt.schema_id) + N'.' + rt.name AS tabelaDestino,
        cr.name AS colunaDestino
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc
        ON fkc.constraint_object_id = fk.object_id
    JOIN sys.columns cp
        ON cp.object_id = fkc.parent_object_id
       AND cp.column_id = fkc.parent_column_id
    JOIN sys.tables rt
        ON rt.object_id = fkc.referenced_object_id
    JOIN sys.columns cr
        ON cr.object_id = fkc.referenced_object_id
       AND cr.column_id = fkc.referenced_column_id
    WHERE fk.parent_object_id = @objId
),
colunasJson AS (
    SELECT N'[' + ISNULL(
        STUFF((
            SELECT N',{"nome":"' + REPLACE(REPLACE(c.nome, N'\\', N'\\\\'), N'"', N'\\"')
                 + N'","tipo":"' + REPLACE(REPLACE(c.tipo, N'\\', N'\\\\'), N'"', N'\\"')
                 + N'","nulo":' + CASE WHEN c.nulo = 1 THEN N'true' ELSE N'false' END
                 + N',"ordem":' + CAST(c.ordem AS nvarchar(20))
                 + N',"tamanho":' + CASE WHEN c.tamanho IS NULL THEN N'null' ELSE CAST(c.tamanho AS nvarchar(20)) END
                 + N',"precisao":' + CASE WHEN c.precisao IS NULL THEN N'null' ELSE CAST(c.precisao AS nvarchar(20)) END
                 + N',"escala":' + CASE WHEN c.escala IS NULL THEN N'null' ELSE CAST(c.escala AS nvarchar(20)) END
                 + N',"valorDefault":' + CASE WHEN c.valorDefault IS NULL THEN N'null'
                    ELSE N'"' + REPLACE(REPLACE(c.valorDefault, N'\\', N'\\\\'), N'"', N'\\"') + N'"' END
                 + N'}'
            FROM colunas c
            ORDER BY c.ordem
            FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 1, N''),
        N''
    ) + N']' AS v
)
SELECT
    N'{"tabela":"' + REPLACE(REPLACE(@schema + N'.' + @tabela, N'\\', N'\\\\'), N'"', N'\\"')
  + N'","colunas":' + (SELECT v FROM colunasJson)
  + N',"indices":[' + ISNULL(STUFF((
        SELECT N',{"nome":"' + REPLACE(REPLACE(i.nome, N'\\', N'\\\\'), N'"', N'\\"')
             + N'","unique":' + CASE WHEN i.[unique] = 1 THEN N'true' ELSE N'false' END
             + N',"colunas":' + i.colunasJson + N'}'
        FROM indices i
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']'
  + N',"fks":[' + ISNULL(STUFF((
        SELECT N',{"nome":"' + REPLACE(REPLACE(f.nome, N'\\', N'\\\\'), N'"', N'\\"')
             + N'","colunaOrigem":"' + REPLACE(REPLACE(f.colunaOrigem, N'\\', N'\\\\'), N'"', N'\\"')
             + N'","tabelaDestino":"' + REPLACE(REPLACE(f.tabelaDestino, N'\\', N'\\\\'), N'"', N'\\"')
             + N'","colunaDestino":"' + REPLACE(REPLACE(f.colunaDestino, N'\\', N'\\\\'), N'"', N'\\"')
             + N'"}'
        FROM fks f
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']}';`;
  }

  private scriptSqlLote(): string {
    const schema = this.litarSql(this.scriptSchema || 'SEU_SCHEMA');
    const lista = this.scriptTabelasLote
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const filtro = lista.length
      ? '      AND t.name IN (' + lista.map(n => `N'${this.litarSql(n)}'`).join(', ') + ')\n'
      : '';
    return `DECLARE @schema sysname = N'${schema}';

IF SCHEMA_ID(@schema) IS NULL
BEGIN
    RAISERROR('Schema nao encontrado. Ajuste @schema.', 16, 1);
    RETURN;
END

;WITH tabelas AS (
    SELECT t.object_id,
           SCHEMA_NAME(t.schema_id) AS sch,
           t.name AS nm
    FROM sys.tables t
    WHERE t.schema_id = SCHEMA_ID(@schema)
      AND t.is_ms_shipped = 0
${filtro}     ),
colunas AS (
    SELECT
        c.object_id,
        c.name AS nome,
        ty.name AS tipo,
        CAST(c.is_nullable AS bit) AS nulo,
        c.column_id AS ordem,
        CAST(CASE WHEN c.max_length = -1 THEN NULL ELSE c.max_length END AS int) AS tamanho,
        CAST(c.precision AS int) AS precisao,
        CAST(c.scale AS int) AS escala,
        NULLIF(dc.definition, N'') AS valorDefault
    FROM sys.columns c
    JOIN sys.types ty ON c.user_type_id = ty.user_type_id
    LEFT JOIN sys.default_constraints dc
        ON dc.parent_object_id = c.object_id
       AND dc.parent_column_id = c.column_id
    WHERE c.object_id IN (SELECT object_id FROM tabelas)
),
indices AS (
    SELECT
        i.object_id,
        i.name AS nome,
        CAST(i.is_unique AS bit) AS [unique],
        N'[' + ISNULL(
            STUFF((
                SELECT N',"' + REPLACE(REPLACE(c.name, N'\\', N'\\\\'), N'"', N'\\"') + N'"'
                FROM sys.index_columns ic
                JOIN sys.columns c
                    ON c.object_id = ic.object_id
                   AND c.column_id = ic.column_id
                WHERE ic.object_id = i.object_id
                  AND ic.index_id = i.index_id
                  AND ic.is_included_column = 0
                ORDER BY ic.key_ordinal
                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'), 1, 1, N''),
            N''
        ) + N']' AS colunasJson
    FROM sys.indexes i
    WHERE i.object_id IN (SELECT object_id FROM tabelas)
      AND i.is_hypothetical = 0
      AND i.name IS NOT NULL
),
fks AS (
    SELECT
        fk.parent_object_id AS object_id,
        fk.name AS nome,
        cp.name AS colunaOrigem,
        SCHEMA_NAME(rt.schema_id) + N'.' + rt.name AS tabelaDestino,
        cr.name AS colunaDestino
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc
        ON fkc.constraint_object_id = fk.object_id
    JOIN sys.columns cp
        ON cp.object_id = fkc.parent_object_id
       AND cp.column_id = fkc.parent_column_id
    JOIN sys.tables rt
        ON rt.object_id = fkc.referenced_object_id
    JOIN sys.columns cr
        ON cr.object_id = fkc.referenced_object_id
       AND cr.column_id = fkc.referenced_column_id
    WHERE fk.parent_object_id IN (SELECT object_id FROM tabelas)
),
colunasJson AS (
    SELECT
        c.object_id,
        N'[' + ISNULL(
            STUFF((
                SELECT N',{"nome":"' + REPLACE(REPLACE(c2.nome, N'\\', N'\\\\'), N'"', N'\\"')
                     + N'","tipo":"' + REPLACE(REPLACE(c2.tipo, N'\\', N'\\\\'), N'"', N'\\"')
                     + N'","nulo":' + CASE WHEN c2.nulo = 1 THEN N'true' ELSE N'false' END
                     + N',"ordem":' + CAST(c2.ordem AS nvarchar(20))
                     + N',"tamanho":' + CASE WHEN c2.tamanho IS NULL THEN N'null' ELSE CAST(c2.tamanho AS nvarchar(20)) END
                     + N',"precisao":' + CASE WHEN c2.precisao IS NULL THEN N'null' ELSE CAST(c2.precisao AS nvarchar(20)) END
                     + N',"escala":' + CASE WHEN c2.escala IS NULL THEN N'null' ELSE CAST(c2.escala AS nvarchar(20)) END
                     + N',"valorDefault":' + CASE WHEN c2.valorDefault IS NULL THEN N'null'
                        ELSE N'"' + REPLACE(REPLACE(c2.valorDefault, N'\\', N'\\\\'), N'"', N'\\"') + N'"' END
                     + N'}'
                FROM colunas c2
                WHERE c2.object_id = c.object_id
                ORDER BY c2.ordem
                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'), 1, 1, N''),
            N''
        ) + N']' AS v
    FROM colunas c
    GROUP BY c.object_id
),
indicesJson AS (
    SELECT
        i.object_id,
        N'[' + ISNULL(
            STUFF((
                SELECT N',{"nome":"' + REPLACE(REPLACE(i2.nome, N'\\', N'\\\\'), N'"', N'\\"')
                     + N'","unique":' + CASE WHEN i2.[unique] = 1 THEN N'true' ELSE N'false' END
                     + N',"colunas":' + i2.colunasJson + N'}'
                FROM indices i2
                WHERE i2.object_id = i.object_id
                ORDER BY i2.nome
                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'), 1, 1, N''),
            N''
        ) + N']' AS v
    FROM indices i
    GROUP BY i.object_id
),
fksJson AS (
    SELECT
        f.object_id,
        N'[' + ISNULL(
            STUFF((
                SELECT N',{"nome":"' + REPLACE(REPLACE(f2.nome, N'\\', N'\\\\'), N'"', N'\\"')
                     + N'","colunaOrigem":"' + REPLACE(REPLACE(f2.colunaOrigem, N'\\', N'\\\\'), N'"', N'\\"')
                     + N'","tabelaDestino":"' + REPLACE(REPLACE(f2.tabelaDestino, N'\\', N'\\\\'), N'"', N'\\"')
                     + N'","colunaDestino":"' + REPLACE(REPLACE(f2.colunaDestino, N'\\', N'\\\\'), N'"', N'\\"')
                     + N'"}'
                FROM fks f2
                WHERE f2.object_id = f.object_id
                ORDER BY f2.nome
                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'), 1, 1, N''),
            N''
        ) + N']' AS v
    FROM fks f
    GROUP BY f.object_id
)
SELECT N'[' + ISNULL(STUFF((
    SELECT N',{"tabela":"' + REPLACE(REPLACE(t.sch + N'.' + t.nm, N'\\', N'\\\\'), N'"', N'\\"')
         + N'","colunas":' + ISNULL(cj.v, N'[]')
         + N',"indices":' + ISNULL(ij.v, N'[]')
         + N',"fks":' + ISNULL(fj.v, N'[]')
         + N'}'
    FROM tabelas t
    LEFT JOIN colunasJson cj ON cj.object_id = t.object_id
    LEFT JOIN indicesJson ij ON ij.object_id = t.object_id
    LEFT JOIN fksJson fj ON fj.object_id = t.object_id
    ORDER BY t.sch, t.nm
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']';`;
  }

  private litarSql(v: string): string {
    return v.replace(/'/g, "''");
  }

  copiarScript(): void {
    if (typeof window === 'undefined') return;
    const sql = this.scriptSql();
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(sql).then(() => {
        this.sucessoCopia();
      }).catch(() => {
        if (this.copiarFallback(sql)) {
          this.sucessoCopia();
        } else {
          this.erro.set('Não foi possível copiar o script automaticamente.');
        }
      });
      return;
    }
    if (this.copiarFallback(sql)) {
      this.sucessoCopia();
    } else {
      this.erro.set('Não foi possível copiar o script automaticamente.');
    }
  }

  private sucessoCopia(): void {
    this.erro.set(null);
    this.scriptCopiado.set(true);
    setTimeout(() => this.scriptCopiado.set(false), 2000);
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

  diferencasDe(r: SchemaComparisonResult): SchemaDifference[] {
    if (!this.soDiferencas) return r.diferencas;
    return r.diferencas.filter(d => d.severidade !== 'Ok');
  }

  totalVisiveis(): number {
    const r = this.resultado();
    if (!r) return 0;
    return r.resultados.reduce((acc, bloco) => acc + this.diferencasDe(bloco).length, 0);
  }

  onArquivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    const ext = f.name.toLowerCase().split('.').pop();
    if (this.modo() === 'lote' && ext !== 'json') {
      this.erro.set('No modo lote, envie apenas um arquivo .json (array de tabelas).');
      this.arquivo.set(null);
      return;
    }
    if (ext !== 'csv' && ext !== 'json') {
      this.erro.set('Apenas arquivos .csv ou .json são aceitos.');
      this.arquivo.set(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.erro.set('Arquivo excede o limite de 5 MB.');
      this.arquivo.set(null);
      return;
    }
    this.erro.set(null);
    this.arquivo.set(f);
  }

  comparar(): void {
    const arquivo = this.arquivo();
    if (!arquivo) return;

    if (this.modo() === 'lote') {
      this.compararLote();
      return;
    }

    if (!this.tabelaSelecionada) return;
    const [schema, tabela] = this.tabelaSelecionada.split('|');
    this.carregando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    this.db.compararSchemas(schema, tabela, arquivo).subscribe({
      next: r => {
        this.resultado.set(this.paraLote(r));
        this.carregando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao comparar schemas.');
        this.carregando.set(false);
      }
    });
  }

  private compararLote(): void {
    const arquivo = this.arquivo();
    if (!arquivo) return;
    this.carregando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    this.db.compararSchemasLote(arquivo).subscribe({
      next: lote => {
        this.marcarNumeros(lote);
        this.resultado.set(lote);
        this.carregando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao comparar schemas em lote.');
        this.carregando.set(false);
      }
    });
  }

  private paraLote(r: SchemaComparisonResult): SchemaComparisonBatchResult {
    const lote: SchemaComparisonBatchResult = {
      arquivoNome: r.arquivoNome,
      totalTabelas: 1,
      totalCriticos: r.criticos,
      totalAvisos: r.avisos,
      totalOks: r.oks,
      resultados: [r]
    };
    this.marcarNumeros(lote);
    return lote;
  }

  private marcarNumeros(lote: SchemaComparisonBatchResult): void {
    let n = 0;
    for (const r of lote.resultados) {
      for (const d of r.diferencas) {
        if (d.severidade === 'Critico') {
          n++;
          d.numeroCritico = n;
        } else {
          d.numeroCritico = undefined;
        }
      }
    }
  }

  exportarCsv(): void {
    const lote = this.resultado();
    if (!lote) return;
    const header = 'tabela,numero,severidade,categoria,campo,esperado,encontrado,descricao';
    const linhas: string[] = [];
    for (const r of lote.resultados) {
      for (const d of r.diferencas) {
        if (this.soDiferencas && d.severidade === 'Ok') continue;
        linhas.push(
          [r.tabela, d.numeroCritico ?? '', d.severidade, d.categoria, d.campo,
           d.esperado ?? '', d.encontrado ?? '', d.descricao]
            .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      }
    }
    const csv = [header, ...linhas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nome = lote.totalTabelas === 1 && lote.resultados[0]
      ? lote.resultados[0].tabela.replace(/[^\w-]/g, '_')
      : `lote-${lote.totalTabelas}-tabelas`;
    a.download = `schema-comparacao-${nome}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  severidadeClass(s: string): string {
    return s;
  }
}
