import { CommonModule } from '@angular/common';
import { Component, inject, signal, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import { DatabaseTable, SchemaComparisonResult, SchemaDifference } from '../models/database.model';

@Component({
  selector: 'app-db-sincronizacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="adm-card p-3">
    <h3 class="adm-card__title">Comparação de Schemas</h3>
    <p class="adm-card__desc">
      Envie um arquivo <strong>CSV</strong> ou <strong>JSON</strong> com a estrutura esperada de uma tabela
      e compare com o <strong>schema real do banco JCA</strong> (colunas, tipos, nullable, índices e FKs).
    </p>

    <div class="db-sync__controles">
      <label>Tabela JCA:
        <select class="form-select form-select-sm" [(ngModel)]="tabelaSelecionada" [disabled]="carregando()">
          <option value="">Selecione…</option>
          <option *ngFor="let t of tabelas()" [value]="t.schema + '|' + t.nome">
            {{ t.nomeCompleto }} ({{ t.quantidadeColunas }} colunas)
          </option>
        </select>
      </label>

      <label class="db-sync__file">
        <input type="file" accept=".csv,.json" (change)="onArquivo($event)" [disabled]="carregando()">
        <span *ngIf="!arquivo()" class="db-sync__file-placeholder">
          <i class="bi bi-upload"></i> Escolher CSV ou JSON
        </span>
        <span *ngIf="arquivo()" class="db-sync__file-name">
          <i class="bi bi-file-earmark-text"></i> {{ arquivo()!.name }}
        </span>
      </label>

      <button class="btn btn-primary" (click)="comparar()"
        [disabled]="carregando() || !tabelaSelecionada || !arquivo()">
        <i class="bi bi-arrow-left-right"></i>
        {{ carregando() ? 'Comparando…' : 'Comparar' }}
      </button>

      <button *ngIf="resultado()" class="btn btn-outline-secondary" (click)="exportarCsv()">
        <i class="bi bi-download"></i> Exportar CSV
      </button>
    </div>

    <div *ngIf="erro()" class="adm-aviso adm-aviso--erro mb-3">
      <i class="bi bi-exclamation-triangle"></i>
      <span>{{ erro() }}</span>
    </div>

    <div *ngIf="!carregando() && !resultado() && !erro()" class="adm-empty">
      Selecione uma tabela, envie o arquivo e clique em <strong>Comparar</strong>.
      <br><small class="text-muted">
        CSV: cabeçalho com <code>nome,tipo,nulo</code> (opcionais: ordem, tamanho, precisao, escala, valorDefault).
        JSON: objeto com <code>colunas[]</code>, <code>indices[]</code>, <code>fks[]</code> — ou apenas array de colunas.
      </small>
    </div>

    <div *ngIf="resultado() as r" class="db-sync__resultado">
      <h5>Resumo — {{ r.tabela }}</h5>
      <p class="text-muted mb-2" *ngIf="r.arquivoNome">
        Arquivo: <strong>{{ r.arquivoNome }}</strong> ·
        {{ r.totalColunasJca }} colunas JCA × {{ r.totalColunasArquivo }} no arquivo ·
        Match: <strong>{{ r.percentualMatch }}%</strong>
      </p>

      <div class="adm-stats">
        <div class="adm-stat">
          <strong class="db-sync__num text-danger">{{ r.criticos }}</strong>
          <span>críticos</span>
        </div>
        <div class="adm-stat">
          <strong class="db-sync__num text-warning">{{ r.avisos }}</strong>
          <span>avisos</span>
        </div>
        <div class="adm-stat">
          <strong class="db-sync__num text-success">{{ r.oks }}</strong>
          <span>compatíveis</span>
        </div>
        <div class="adm-stat">
          <strong class="db-sync__num">{{ r.percentualMatch }}%</strong>
          <span>match</span>
        </div>
      </div>

      <div class="form-check mb-2 mt-3">
        <input class="form-check-input" type="checkbox" id="soDiferencas" [(ngModel)]="soDiferencas">
        <label class="form-check-label" for="soDiferencas">Mostrar apenas diferenças</label>
      </div>

      <div *ngIf="diferencasVisiveis().length === 0" class="adm-empty">
        Nenhuma diferença encontrada. Os schemas estão compatíveis.
      </div>

      <div class="db-sync__lista">
        <div *ngFor="let d of diferencasVisiveis()"
             class="db-sync__item"
             [ngClass]="'db-sync__item--' + severidadeClass(d.severidade)">
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
  `,
  styles: [`
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
    .db-sync__lista { display: flex; flex-direction: column; gap: 0.35rem; }
    .db-sync__item {
      display: flex; gap: 0.55rem; align-items: baseline; flex-wrap: wrap;
      padding: 0.5rem 0.75rem; border-radius: 0.4rem; font-size: 0.88rem;
    }
    .db-sync__item--Critico { background: #fee2e2; color: #991b1b; }
    .db-sync__item--Aviso { background: #fef3c7; color: #92400e; }
    .db-sync__item--Ok { background: #d1fae5; color: #065f46; }
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
    @media (max-width: 768px) {
      .db-sync__controles { flex-direction: column; align-items: stretch; }
      .db-sync__controles select { min-width: 0; width: 100%; }
      .db-sync__desc { margin-left: 0; width: 100%; }
    }
  `]
})
export class DbSincronizacaoComponent {
  private readonly db = inject(DatabaseService);

  readonly tabelas = input<DatabaseTable[]>([]);
  readonly fechado = output<void>();

  readonly resultado = signal<SchemaComparisonResult | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly arquivo = signal<File | null>(null);
  soDiferencas = true;

  tabelaSelecionada = '';

  get diferencasVisiveis(): () => SchemaDifference[] {
    return () => {
      const r = this.resultado();
      if (!r) return [];
      if (!this.soDiferencas) return r.diferencas;
      return r.diferencas.filter(d => d.severidade !== 'Ok');
    };
  }

  onArquivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    const ext = f.name.toLowerCase().split('.').pop();
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
    if (!this.tabelaSelecionada || !this.arquivo()) return;
    const [schema, tabela] = this.tabelaSelecionada.split('|');
    this.carregando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    this.db.compararSchemas(schema, tabela, this.arquivo()!).subscribe({
      next: r => {
        this.resultado.set(r);
        this.carregando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao comparar schemas.');
        this.carregando.set(false);
      }
    });
  }

  exportarCsv(): void {
    const r = this.resultado();
    if (!r) return;
    const header = 'severidade,categoria,campo,esperado,encontrado,descricao';
    const linhas = r.diferencas.map(d =>
      [d.severidade, d.categoria, d.campo, d.esperado ?? '', d.encontrado ?? '', d.descricao]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...linhas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-comparacao-${r.tabela.replace(/[^\w-]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  severidadeClass(s: string): string {
    return s;
  }
}
