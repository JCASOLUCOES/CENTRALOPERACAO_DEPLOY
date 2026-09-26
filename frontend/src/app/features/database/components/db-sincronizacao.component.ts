import { CommonModule } from '@angular/common';
import { Component, inject, signal, input, output, computed, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import { DbScriptsCorrecaoComponent } from './db-scripts-correcao.component';
import { DbProceduresResultadoComponent } from './db-procedures-resultado.component';
import {
  DatabaseTable, SchemaComparisonResult, SchemaDifference,
  BulkSchemaComparisonResult,
  ProceduresComparisonResult,
  ABAS_RELATORIO, AbaRelatorio, abaDeCategoria
} from '../models/database.model';

type Modo = 'tabela' | 'banco' | 'procedures';

@Component({
  selector: 'app-db-sincronizacao',
  standalone: true,
  imports: [CommonModule, FormsModule, DbScriptsCorrecaoComponent, DbProceduresResultadoComponent],
  template: `
  <div class="adm-card p-3">
    <h3 class="adm-card__title">Comparação de Schemas</h3>
    <p class="adm-card__desc">
      Envie um arquivo <strong>JSON</strong> com a estrutura esperada de uma tabela
      e compare com o <strong>schema real do banco JCA</strong> (colunas, tipos e tamanhos,
      nullable, índices, FKs e PK).
    </p>

    <div class="db-sync__modo" role="group" aria-label="Modo de comparacao">
      <button type="button" class="db-sync__modo-btn"
              [class.db-sync__modo-btn--on]="modo() === 'tabela'"
              (click)="setModo('tabela')">
        <i class="bi bi-table"></i> Tabela unica
      </button>
      <button type="button" class="db-sync__modo-btn"
              [class.db-sync__modo-btn--on]="modo() === 'banco'"
              (click)="setModo('banco')">
        <i class="bi bi-database"></i> Banco inteiro
      </button>
      <button type="button" class="db-sync__modo-btn"
              [class.db-sync__modo-btn--on]="modo() === 'procedures'"
              (click)="setModo('procedures')">
        <i class="bi bi-diagram-3"></i> Procedures
      </button>
    </div>

    <div class="db-sync__controles">
      <label *ngIf="modo() === 'tabela'">Tabela JCA:
        <input type="text" class="form-control form-control-sm db-sync__busca"
               placeholder="Pesquisar tabela…"
               [ngModel]="buscaTabela()"
               (ngModelChange)="buscaTabela.set($event)"
               [disabled]="carregando()"
               aria-label="Pesquisar tabela">
        <select class="form-select form-select-sm" [ngModel]="tabelaSelecionada()"
                (ngModelChange)="onTabelaJcaChange($event)" [disabled]="carregando()">
          <option value="">Selecione… ({{ tabelasFiltradas().length }})</option>
          <option *ngFor="let t of tabelasFiltradas()" [value]="t.schema + '|' + t.nome">
            {{ t.nomeCompleto }} ({{ t.quantidadeColunas }} colunas)
          </option>
        </select>
        <small *ngIf="buscaTabela() && tabelasFiltradas().length === 0" class="text-muted">
          Nenhuma tabela encontrada para "{{ buscaTabela() }}".
        </small>
      </label>

      <label *ngIf="modo() === 'banco'" class="db-sync__modo-info">
        Comparação
        <span class="db-sync__modo-info-val">arquivo × banco conectado (todas as tabelas)</span>
      </label>

      <label *ngIf="modo() === 'procedures'" class="db-sync__modo-info">
        Comparação
        <span class="db-sync__modo-info-val">procedures × banco conectado (somente leitura, sem scripts)</span>
      </label>

      <label class="db-sync__file">
        <input type="file" accept=".json" #arquivoInput (change)="onArquivo($event)" [disabled]="carregando()">
        <span *ngIf="!arquivo()" class="db-sync__file-placeholder">
          <i class="bi bi-upload"></i> Escolher JSON{{ modo() !== 'tabela' ? ' (até 20 MB)' : '' }}
        </span>
        <span *ngIf="arquivo()" class="db-sync__file-name">
          <i class="bi bi-file-earmark-text"></i> {{ arquivo()!.name }}
        </span>
      </label>

      <button class="btn btn-primary" (click)="comparar()"
              [disabled]="carregando() || !arquivo() || (modo() === 'tabela' && !tabelaSelecionada())">
        <i class="bi bi-arrow-left-right"></i>
        {{ carregando() ? 'Comparando…' : 'Comparar' }}
      </button>

      <button *ngIf="modo() !== 'procedures' && (modo() === 'tabela' ? resultado() : resultadoBulk())"
              class="btn btn-outline-secondary" (click)="exportarCsv()">
        <i class="bi bi-download"></i> Exportar CSV
      </button>

      <button *ngIf="resultado() || resultadoBulk() || resultadoProcedures() || arquivo() || tabelaSelecionada()"
              class="btn btn-outline-danger"
              (click)="limparTudo()" [disabled]="carregando()">
        <i class="bi bi-eraser"></i> Limpar
      </button>
    </div>

    <div class="db-sync__script mb-3">
      <div class="db-sync__script-header">
        <strong>Script de exportação (JSON) — {{ rotuloModo() }}</strong>
        <div class="db-sync__script-acoes">
          <input class="form-control form-control-sm db-sync__script-input"
                 type="text" placeholder="schema" [(ngModel)]="scriptSchema"
                 aria-label="Schema da tabela no banco externo">
          <input *ngIf="modo() === 'tabela'"
                 class="form-control form-control-sm db-sync__script-input"
                 type="text" placeholder="tabela" [(ngModel)]="scriptTabela"
                 aria-label="Nome da tabela no banco externo">
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="copiarScript()">
            <i class="bi" [ngClass]="scriptCopiado() ? 'bi-check-lg' : 'bi-clipboard'"></i>
            {{ scriptCopiado() ? 'Copiado' : 'Copiar script' }}
          </button>
        </div>
      </div>
      <pre class="db-sync__script-pre">{{ scriptVisivel() }}</pre>
      <small *ngIf="modo() === 'tabela'" class="text-muted db-sync__script-dica">
        1. Rode no SSMS do banco externo · 2. Clique na célula do resultado e copie o JSON inteiro ·
        3. Cole em um arquivo <code>.json</code> e envie acima. O script gera colunas, índices, FKs e PK
        no formato aceito pelo sistema. Compatível com SQL Server 2005+
        (usa <code>FOR XML PATH</code>, sem <code>FOR JSON</code>).
        Se o SSMS/Excel embrulhar o valor em aspas, o backend desembrulha automaticamente —
        prefira colar o JSON limpo começando por <code>&#123;</code>.
      </small>
      <small *ngIf="modo() === 'banco'" class="text-muted db-sync__script-dica">
        1. Deixe o schema <strong>vazio</strong> para exportar todos os schemas (ou informe 1 schema) ·
        2. Rode no SSMS do banco externo · 3. Selecione <strong>todas as linhas</strong> (uma por tabela) e copie ·
        4. Cole em um arquivo <code>.json</code> e envie acima. O sistema compara cada tabela com o banco
        conectado (colunas, tamanhos, índices, FKs e PK); tabelas ausentes de <strong>qualquer lado</strong>
        contam como crítico. Uma linha por tabela evita truncamento de célula no SSMS.
      </small>
      <small *ngIf="modo() === 'procedures'" class="text-muted db-sync__script-dica">
        1. Deixe o schema <strong>vazio</strong> para exportar todas as procedures (ou informe 1 schema) ·
        2. Rode no SSMS do banco externo · 3. Selecione <strong>todas as linhas</strong> (uma por procedure) e copie ·
        4. Cole em um arquivo <code>.json</code> e envie acima. Cada linha traz
        <code>&#123;"schema","nome","corpo"&#125;</code>; os corpos são comparados com o banco conectado
        (sensível a caixa). <strong>Somente leitura</strong>: nenhum script é gerado neste modo.
      </small>
    </div>

    <div *ngIf="erro()" class="adm-aviso adm-aviso--erro mb-3">
      <i class="bi bi-exclamation-triangle"></i>
      <span>{{ erro() }}</span>
    </div>

    <div *ngIf="!carregando() && !resultado() && !resultadoBulk() && !resultadoProcedures() && !erro()" class="adm-empty">
      <ng-container *ngIf="modo() === 'tabela'; else emptyBulk">
        Selecione uma tabela, envie o arquivo <strong>JSON</strong> e clique em <strong>Comparar</strong>.
        <br><small class="text-muted">
          JSON: objeto com <code>colunas[]</code>, <code>indices[]</code>, <code>fks[]</code> e <code>pk</code> — ou apenas array de colunas.
        </small>
      </ng-container>
      <ng-template #emptyBulk>
        <ng-container *ngIf="modo() === 'procedures'; else emptyBanco">
          Envie o arquivo <strong>JSON</strong> com as procedures exportadas pelo script
          e clique em <strong>Comparar</strong>.
          <br><small class="text-muted">
            Uma linha por procedure: <code>&#123;"schema","nome","corpo"&#125;</code> (JSON Lines),
            <code>&#123;"procedures":[...]&#125;</code> ou array de objetos.
          </small>
        </ng-container>
        <ng-template #emptyBanco>
          Envie o arquivo <strong>JSON</strong> com as tabelas exportadas pelo script de banco inteiro
          e clique em <strong>Comparar</strong>.
          <br><small class="text-muted">
            Aceita <code>&#123;"tabelas":[...]&#125;</code>, array de objetos de tabela ou JSON Lines (uma linha por tabela).
          </small>
        </ng-template>
      </ng-template>
    </div>

    <div *ngIf="resultado() as r" class="db-sync__resultado">
      <h5>Resumo — {{ r.tabela }}</h5>
      <p class="text-muted mb-2" *ngIf="r.arquivoNome">
        Arquivo: <strong>{{ r.arquivoNome }}</strong> ·
        {{ r.totalColunasJca }} colunas JCA × {{ r.totalColunasArquivo }} no arquivo ·
        Match: <strong>{{ r.percentualMatch }}%</strong>
      </p>

      <div class="db-sync__relatorio">
        <div class="db-sync__abas" role="tablist" aria-label="Abas do relatorio">
          <button *ngFor="let a of abasVisiveis()" type="button" role="tab"
                  class="db-sync__aba"
                  [class.db-sync__aba--on]="abaRelatorio() === a.key"
                  [attr.aria-selected]="abaRelatorio() === a.key"
                  (click)="abaRelatorio.set(a.key)">
            <i class="bi" [ngClass]="a.icone"></i> {{ a.rotulo }}
            <span class="db-sync__aba-n"
                  [class.db-sync__aba-n--zero]="contagemAba(a.key) === 0">{{ contagemAba(a.key) }}</span>
          </button>
        </div>

        <div class="adm-stats db-sync__fixos" role="group" aria-label="Resumo da comparacao">
          <div class="adm-stat db-sync__stat db-sync__stat--estatico">
            <strong class="db-sync__num text-success">{{ r.oks }}</strong>
            <span>compatíveis · só contagem</span>
          </div>
          <div class="adm-stat db-sync__stat db-sync__stat--estatico">
            <strong class="db-sync__num">{{ r.percentualMatch }}%</strong>
            <span>match</span>
          </div>
        </div>
      </div>

      <div *ngIf="itensAba().length === 0" class="adm-empty">{{ vazioAba() }}</div>

      <div class="db-sync__lista">
        <div *ngFor="let it of itensAba(); let idx = index"
             class="db-sync__item"
             [ngClass]="'db-sync__item--' + severidadeClass(it.dif.severidade)">
          <span class="db-sync__badge" [attr.data-sev]="severidadeClass(it.dif.severidade)">
            {{ idx + 1 }}
          </span>
          <span class="db-sync__dot" [ngClass]="'db-sync__dot--' + severidadeClass(it.dif.severidade)"></span>
          <span class="db-sync__cat">{{ it.dif.categoria }}</span>
          <strong>{{ it.dif.campo }}</strong>
          <span *ngIf="it.dif.esperado" class="db-sync__val">
            JCA: <code>{{ it.dif.esperado }}</code>
          </span>
          <span *ngIf="it.dif.encontrado" class="db-sync__val">
            Arquivo: <code>{{ it.dif.encontrado }}</code>
          </span>
          <small class="db-sync__desc">{{ it.dif.descricao }}</small>
        </div>
      </div>
    </div>

    <div *ngIf="resultadoBulk() as rb" class="db-sync__resultado">
      <h5>Resumo — banco inteiro</h5>
      <p class="text-muted mb-2" *ngIf="rb.arquivoNome">
        Arquivo: <strong>{{ rb.arquivoNome }}</strong> ·
        {{ rb.totalTabelasArquivo }} tabelas no arquivo × {{ rb.totalTabelasBanco }} no banco ·
        Match: <strong>{{ rb.percentualMatch }}%</strong>
      </p>

      <div class="db-sync__relatorio">
        <div class="db-sync__abas" role="tablist" aria-label="Abas do relatorio">
          <button *ngFor="let a of abasVisiveis()" type="button" role="tab"
                  class="db-sync__aba"
                  [class.db-sync__aba--on]="abaRelatorio() === a.key"
                  [attr.aria-selected]="abaRelatorio() === a.key"
                  (click)="abaRelatorio.set(a.key)">
            <i class="bi" [ngClass]="a.icone"></i> {{ a.rotulo }}
            <span class="db-sync__aba-n"
                  [class.db-sync__aba-n--zero]="contagemAba(a.key) === 0">{{ contagemAba(a.key) }}</span>
          </button>
        </div>

        <div class="adm-stats db-sync__fixos" role="group" aria-label="Resumo da comparacao">
          <div class="adm-stat db-sync__stat db-sync__stat--estatico">
            <strong class="db-sync__num text-success">{{ rb.tabelasOk }}</strong>
            <span>tabelas compatíveis · só contagem</span>
          </div>
          <div class="adm-stat db-sync__stat db-sync__stat--estatico">
            <strong class="db-sync__num">{{ rb.percentualMatch }}%</strong>
            <span>match</span>
          </div>
        </div>
      </div>

      <p class="db-sync__bulk-resumo" *ngIf="abaRelatorio() === 'tabelas'">
        <span class="db-sync__bulk-chip db-sync__bulk-chip--ok">{{ rb.tabelasOk }} ok</span>
        <span class="db-sync__bulk-chip db-sync__bulk-chip--dif">{{ rb.tabelasComDiferenca }} com diferenças</span>
        <span class="db-sync__bulk-chip db-sync__bulk-chip--so">{{ rb.somenteArquivo }} só no arquivo</span>
        <span class="db-sync__bulk-chip db-sync__bulk-chip--sb">{{ rb.somenteBanco }} só no banco</span>
      </p>

      <div *ngIf="itensAba().length === 0" class="adm-empty">{{ vazioAba() }}</div>

      <div class="db-sync__lista">
        <div *ngFor="let it of itensAba(); let idx = index"
             class="db-sync__item"
             [ngClass]="'db-sync__item--' + severidadeClass(it.dif.severidade)">
          <span class="db-sync__badge" [attr.data-sev]="severidadeClass(it.dif.severidade)">
            {{ idx + 1 }}
          </span>
          <span class="db-sync__dot" [ngClass]="'db-sync__dot--' + severidadeClass(it.dif.severidade)"></span>
          <span *ngIf="it.tabela" class="db-sync__tag">
            <i class="bi bi-table"></i> {{ it.tabela }}
          </span>
          <span class="db-sync__cat">{{ it.dif.categoria }}</span>
          <strong>{{ it.dif.campo }}</strong>
          <span *ngIf="it.dif.esperado" class="db-sync__val">
            JCA: <code>{{ it.dif.esperado }}</code>
          </span>
          <span *ngIf="it.dif.encontrado" class="db-sync__val">
            Arquivo: <code>{{ it.dif.encontrado }}</code>
          </span>
          <small class="db-sync__desc">{{ it.dif.descricao }}</small>
        </div>
      </div>
    </div>

    <app-db-procedures-resultado [resultado]="resultadoProcedures()" />

    <app-db-scripts-correcao
      [resultado]="resultado()"
      [resultadoBulk]="resultadoBulk()"
      [filtroSeveridade]="null" />
  </div>
  `,
  styles: [`
    .db-sync__controles { display: flex; gap: 1rem; align-items: flex-end; margin: 1rem 0; flex-wrap: wrap; }
    .db-sync__modo {
      display: inline-flex; gap: 0.25rem; padding: 0.2rem;
      background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 0.5rem;
      margin-top: 1rem;
    }
    .db-sync__modo-btn {
      display: inline-flex; align-items: center; gap: 0.4rem;
      border: 1px solid transparent; background: transparent; border-radius: 0.4rem;
      padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: 600; color: #475569;
      cursor: pointer; transition: background 0.15s, color 0.15s;
    }
    .db-sync__modo-btn:hover { color: #1e3a8a; }
    .db-sync__modo-btn--on { background: #fff; color: #1e3a8a; border-color: #2563eb; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .db-sync__modo-info-val { font-weight: 500; color: #334155; }
    .db-sync__controles label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 600; }
    .db-sync__controles select { min-width: 16rem; }
    .db-sync__busca { min-width: 16rem; }
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
    .db-sync__stat {
      border: 2px solid transparent; background: transparent;
      text-align: left; padding: 0.5rem 0.65rem;
      border-radius: 0.5rem; font: inherit; color: inherit;
    }
    .db-sync__stat--estatico { cursor: default; }
    .db-sync__relatorio { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-start; justify-content: space-between; }
    .db-sync__abas {
      display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.2rem;
      background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 0.5rem;
    }
    .db-sync__aba {
      display: inline-flex; align-items: center; gap: 0.4rem;
      border: 1px solid transparent; background: transparent; border-radius: 0.4rem;
      padding: 0.55rem 0.9rem; font-size: 0.95rem; font-weight: 600; color: #475569;
      cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .db-sync__aba:hover { color: #1e3a8a; background: rgba(255,255,255,0.6); }
    .db-sync__aba--on { background: #fff; color: #1e3a8a; border-color: #2563eb; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .db-sync__aba-n {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 1.5rem; height: 1.5rem; padding: 0 0.4rem;
      border-radius: 999px; background: #dc2626; color: #fff;
      font-size: 0.78rem; font-weight: 700; line-height: 1;
    }
    .db-sync__aba-n--zero { background: #cbd5e1; color: #475569; }
    .db-sync__fixos { flex-shrink: 0; }
    .db-sync__tag {
      display: inline-flex; align-items: center; gap: 0.3rem;
      background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe;
      padding: 0.1rem 0.45rem; border-radius: 0.25rem;
      font-size: 0.72rem; font-weight: 600; align-self: center;
    }
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
    .db-sync__badge[data-sev="Aviso"] { background: #b45309; }
    .db-sync__badge[data-sev="Ok"] { background: #047857; }
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
    .db-sync__bulk-resumo { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 0.75rem; }
    .db-sync__bulk-chip {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 999px;
    }
    .db-sync__bulk-chip--ok { background: #d1fae5; color: #065f46; }
    .db-sync__bulk-chip--dif { background: #fef3c7; color: #92400e; }
    .db-sync__bulk-chip--so { background: #fee2e2; color: #991b1b; }
    .db-sync__bulk-chip--sb { background: #fee2e2; color: #991b1b; }
    .db-sync__script { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem; background: #f8fafc; }
    .db-sync__script-header {
      display: flex; justify-content: space-between; align-items: center;
      gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; font-size: 0.9rem;
    }
    .db-sync__script-acoes { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .db-sync__script-input { width: 9rem; }
    .db-sync__script-pre {
      margin: 0; padding: 0.75rem; max-height: 16rem; overflow: auto;
      font-size: 0.75rem; line-height: 1.4; background: #0f172a; color: #e2f0f0;
      border-radius: 0.4rem; white-space: pre;
    }
    .db-sync__script-dica { display: block; margin-top: 0.5rem; font-size: 0.78rem; }
    @media (max-width: 768px) {
      .db-sync__controles { flex-direction: column; align-items: stretch; }
      .db-sync__controles select,
      .db-sync__busca { min-width: 0; width: 100%; }
      .db-sync__desc { margin-left: 0; width: 100%; }
      .db-sync__relatorio { flex-direction: column; }
      .db-sync__abas { width: 100%; }
      .db-sync__script-header { flex-direction: column; align-items: stretch; }
      .db-sync__script-input { width: 100%; }
    }
  `]
})
export class DbSincronizacaoComponent {
  private readonly db = inject(DatabaseService);

  @ViewChild('arquivoInput') arquivoInput?: ElementRef<HTMLInputElement>;

  readonly tabelas = input<DatabaseTable[]>([]);
  readonly fechado = output<void>();

  readonly resultado = signal<SchemaComparisonResult | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly arquivo = signal<File | null>(null);
  readonly scriptCopiado = signal(false);
  readonly tabelaSelecionada = signal('');
  readonly buscaTabela = signal('');
  readonly modo = signal<Modo>('tabela');
  readonly resultadoBulk = signal<BulkSchemaComparisonResult | null>(null);
  readonly resultadoProcedures = signal<ProceduresComparisonResult | null>(null);
  readonly abaRelatorio = signal<AbaRelatorio>('colunas');

  scriptSchema = 'dbo';
  scriptTabela = '';

  readonly abasVisiveis = computed(() =>
    ABAS_RELATORIO.filter(a => !a.somenteBulk || this.modo() === 'banco'));

  readonly tabelasFiltradas = computed(() => {
    const q = this.buscaTabela().trim().toLowerCase();
    const lista = this.tabelas();
    if (!q) return lista;
    const filtradas = lista.filter(t =>
      t.nome.toLowerCase().includes(q) ||
      (t.nomeCompleto ?? '').toLowerCase().includes(q) ||
      t.schema.toLowerCase().includes(q));
    const sel = this.tabelaSelecionada();
    if (sel && !filtradas.some(t => t.schema + '|' + t.nome === sel)) {
      const item = lista.find(t => t.schema + '|' + t.nome === sel);
      if (item) return [item, ...filtradas];
    }
    return filtradas;
  });

  onTabelaJcaChange(valor: string): void {
    this.tabelaSelecionada.set(valor);
    if (!valor) return;
    const [schema, tabela] = valor.split('|');
    if (schema) this.scriptSchema = schema;
    if (tabela) this.scriptTabela = tabela;
  }

  setModo(m: Modo): void {
    if (this.modo() === m) return;
    this.modo.set(m);
    if ((m === 'banco' || m === 'procedures') && this.scriptSchema === 'dbo') this.scriptSchema = '';
    if (m === 'tabela' && !this.scriptSchema) this.scriptSchema = 'dbo';
    this.erro.set(null);
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.resultadoProcedures.set(null);
    this.resetAba();
    this.arquivo.set(null);
    if (this.arquivoInput) this.arquivoInput.nativeElement.value = '';
  }

  limparTudo(): void {
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.resultadoProcedures.set(null);
    this.arquivo.set(null);
    this.erro.set(null);
    this.resetAba();
    this.tabelaSelecionada.set('');
    this.buscaTabela.set('');
    this.scriptTabela = '';
    if (this.arquivoInput) this.arquivoInput.nativeElement.value = '';
  }

  private resetAba(): void {
    this.abaRelatorio.set(this.modo() === 'banco' ? 'tabelas' : 'colunas');
  }

  /**
   * Escolhe a primeira aba visível com diferenças; sem nenhuma,
   * cai na aba padrão do modo atual.
   */
  private definirAbaInicial(): void {
    const visiveis = this.abasVisiveis();
    const alvo = visiveis.find(a => this.contagemAba(a.key) > 0);
    this.abaRelatorio.set(alvo ? alvo.key : (visiveis[0]?.key ?? 'colunas'));
  }

  contagemAba(k: AbaRelatorio): number {
    const def = ABAS_RELATORIO.find(a => a.key === k);
    if (!def) return 0;
    const conta = (d: SchemaDifference) =>
      d.severidade !== 'Ok' && def.categorias.includes(d.categoria);

    if (this.modo() === 'banco') {
      const rb = this.resultadoBulk();
      if (!rb) return 0;
      let n = 0;
      for (const t of rb.tabelas)
        for (const d of t.diferencas)
          if (conta(d)) n++;
      return n;
    }
    const r = this.resultado();
    if (!r) return 0;
    return r.diferencas.filter(conta).length;
  }

  itensAba(): { tabela?: string; dif: SchemaDifference }[] {
    const aba = this.abaRelatorio();
    const mesmaAba = (d: SchemaDifference) =>
      d.severidade !== 'Ok' && abaDeCategoria(d.categoria) === aba;

    if (this.modo() === 'banco') {
      const rb = this.resultadoBulk();
      if (!rb) return [];
      const out: { tabela?: string; dif: SchemaDifference }[] = [];
      for (const t of rb.tabelas)
        for (const d of t.diferencas)
          if (mesmaAba(d))
            out.push({ tabela: aba === 'tabelas' ? undefined : t.tabela, dif: d });
      return out;
    }

    const r = this.resultado();
    if (!r) return [];
    return r.diferencas.filter(mesmaAba).map(d => ({ dif: d }));
  }

  vazioAba(): string {
    const def = ABAS_RELATORIO.find(a => a.key === this.abaRelatorio());
    const rotulo = def ? def.rotulo.toLowerCase() : 'esta aba';
    const temAlguma = this.abasVisiveis().some(a => this.contagemAba(a.key) > 0);
    if (!temAlguma) {
      return this.modo() === 'banco'
        ? 'Todas as tabelas estão 100% compatíveis.'
        : 'Nenhuma diferença encontrada. Os schemas estão compatíveis.';
    }
    if (this.modo() === 'banco' && this.abaRelatorio() === 'tabelas') {
      return 'Nenhuma tabela faltante em nenhum dos dois lados.';
    }
    return `Nenhuma diferença em ${rotulo} nesta comparação.`;
  }

  scriptSql(): string {
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
                SELECT N',"' + REPLACE(REPLACE(c.name, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"') + N'"'
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
pk AS (
    SELECT kc.name AS nome,
        N'[' + ISNULL(
            STUFF((
                SELECT N',"' + REPLACE(REPLACE(c.name, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"') + N'"'
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
    FROM sys.key_constraints kc
    JOIN sys.indexes i
        ON i.object_id = kc.parent_object_id
       AND i.index_id = kc.unique_index_id
    WHERE kc.type = 'PK'
      AND kc.parent_object_id = @objId
),
colunasJson AS (
    SELECT N'[' + ISNULL(
        STUFF((
            SELECT N',{"nome":"' + REPLACE(REPLACE(c.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
                 + N'","tipo":"' + REPLACE(REPLACE(c.tipo, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
                 + N'","nulo":' + CASE WHEN c.nulo = 1 THEN N'true' ELSE N'false' END
                 + N',"ordem":' + CAST(c.ordem AS nvarchar(20))
                 + N',"tamanho":' + CASE WHEN c.tamanho IS NULL THEN N'null' ELSE CAST(c.tamanho AS nvarchar(20)) END
                 + N',"precisao":' + CASE WHEN c.precisao IS NULL THEN N'null' ELSE CAST(c.precisao AS nvarchar(20)) END
                 + N',"escala":' + CASE WHEN c.escala IS NULL THEN N'null' ELSE CAST(c.escala AS nvarchar(20)) END
                 + N',"valorDefault":' + CASE WHEN c.valorDefault IS NULL THEN N'null'
                    ELSE N'"' + REPLACE(REPLACE(c.valorDefault, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"') + N'"' END
                 + N'}'
            FROM colunas c
            ORDER BY c.ordem
            FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 1, N''),
        N''
    ) + N']' AS v
)
SELECT
    N'{"tabela":"' + REPLACE(REPLACE(@schema + N'.' + @tabela, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
  + N'","colunas":' + (SELECT v FROM colunasJson)
  + N',"indices":[' + ISNULL(STUFF((
        SELECT N',{"nome":"' + REPLACE(REPLACE(i.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","unique":' + CASE WHEN i.[unique] = 1 THEN N'true' ELSE N'false' END
             + N',"colunas":' + i.colunasJson + N'}'
        FROM indices i
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']'
  + N',"fks":[' + ISNULL(STUFF((
        SELECT N',{"nome":"' + REPLACE(REPLACE(f.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","colunaOrigem":"' + REPLACE(REPLACE(f.colunaOrigem, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","tabelaDestino":"' + REPLACE(REPLACE(f.tabelaDestino, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","colunaDestino":"' + REPLACE(REPLACE(f.colunaDestino, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'"}'
        FROM fks f
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']'
  + N',"pk":' + ISNULL((
        SELECT N'{"nome":"' + REPLACE(REPLACE(p.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","colunas":' + p.colunasJson + N'}'
        FROM pk p), N'null') + N'}';`;
  }

  scriptSqlBulk(): string {
    const schema = this.litarSql(this.scriptSchema || '');
    const declSchema = schema
      ? `DECLARE @schema sysname = N'${schema}';`
      : `DECLARE @schema sysname = NULL;  -- NULL = todos os schemas`;
    return `${declSchema}

;WITH tabelas AS (
    SELECT t.object_id, SCHEMA_NAME(t.schema_id) AS schemaNome, t.name AS nome
    FROM sys.tables t
    WHERE t.is_ms_shipped = 0
      AND (@schema IS NULL OR SCHEMA_NAME(t.schema_id) = @schema)
),
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
),
indices AS (
    SELECT
        i.object_id,
        i.name AS nome,
        CAST(i.is_unique AS bit) AS [unique],
        N'[' + ISNULL(
            STUFF((
                SELECT N',"' + REPLACE(REPLACE(c.name, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"') + N'"'
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
    WHERE i.is_hypothetical = 0
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
),
pk AS (
    SELECT kc.parent_object_id AS object_id,
        kc.name AS nome,
        N'[' + ISNULL(
            STUFF((
                SELECT N',"' + REPLACE(REPLACE(c.name, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"') + N'"'
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
    FROM sys.key_constraints kc
    JOIN sys.indexes i
        ON i.object_id = kc.parent_object_id
       AND i.index_id = kc.unique_index_id
    WHERE kc.type = 'PK'
),
colunasJson AS (
    SELECT
        cj.object_id,
        N'[' + ISNULL(
            STUFF((
                SELECT N',{"nome":"' + REPLACE(REPLACE(c.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
                     + N'","tipo":"' + REPLACE(REPLACE(c.tipo, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
                     + N'","nulo":' + CASE WHEN c.nulo = 1 THEN N'true' ELSE N'false' END
                     + N',"ordem":' + CAST(c.ordem AS nvarchar(20))
                     + N',"tamanho":' + CASE WHEN c.tamanho IS NULL THEN N'null' ELSE CAST(c.tamanho AS nvarchar(20)) END
                     + N',"precisao":' + CASE WHEN c.precisao IS NULL THEN N'null' ELSE CAST(c.precisao AS nvarchar(20)) END
                     + N',"escala":' + CASE WHEN c.escala IS NULL THEN N'null' ELSE CAST(c.escala AS nvarchar(20)) END
                     + N',"valorDefault":' + CASE WHEN c.valorDefault IS NULL THEN N'null'
                        ELSE N'"' + REPLACE(REPLACE(c.valorDefault, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"') + N'"' END
                     + N'}'
                FROM colunas c
                WHERE c.object_id = cj.object_id
                ORDER BY c.ordem
                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'), 1, 1, N''),
            N''
        ) + N']' AS v
    FROM (SELECT DISTINCT object_id FROM colunas) cj
)
SELECT
    N'{"tabela":"' + REPLACE(REPLACE(tb.schemaNome + N'.' + tb.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
  + N'","colunas":' + ISNULL((SELECT v FROM colunasJson cj WHERE cj.object_id = tb.object_id), N'[]')
  + N',"indices":[' + ISNULL(STUFF((
        SELECT N',{"nome":"' + REPLACE(REPLACE(i.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","unique":' + CASE WHEN i.[unique] = 1 THEN N'true' ELSE N'false' END
             + N',"colunas":' + i.colunasJson + N'}'
        FROM indices i
        WHERE i.object_id = tb.object_id
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']'
  + N',"fks":[' + ISNULL(STUFF((
        SELECT N',{"nome":"' + REPLACE(REPLACE(f.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","colunaOrigem":"' + REPLACE(REPLACE(f.colunaOrigem, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","tabelaDestino":"' + REPLACE(REPLACE(f.tabelaDestino, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","colunaDestino":"' + REPLACE(REPLACE(f.colunaDestino, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'"}'
        FROM fks f
        WHERE f.object_id = tb.object_id
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']'
  + N',"pk":' + ISNULL((
        SELECT N'{"nome":"' + REPLACE(REPLACE(p.nome, N'\\\\', N'\\\\\\\\'), N'"', N'\\\\"')
             + N'","colunas":' + p.colunasJson + N'}'
        FROM pk p
        WHERE p.object_id = tb.object_id), N'null') + N'}'
FROM tabelas tb
ORDER BY tb.schemaNome, tb.nome;`;
  }

  private litarSql(v: string): string {
    return v.replace(/'/g, "''");
  }

  rotuloModo(): string {
    switch (this.modo()) {
      case 'tabela': return 'tabela única';
      case 'banco': return 'banco inteiro';
      default: return 'procedures';
    }
  }

  scriptVisivel(): string {
    switch (this.modo()) {
      case 'tabela': return this.scriptSql();
      case 'banco': return this.scriptSqlBulk();
      default: return this.scriptSqlProcedures();
    }
  }

  scriptSqlProcedures(): string {
    const schema = this.litarSql(this.scriptSchema || '');
    const declSchema = schema
      ? `DECLARE @schema sysname = N'${schema}';`
      : `DECLARE @schema sysname = NULL;  -- NULL = todos os schemas`;
    return `${declSchema}

SELECT
    N'{"schema":"' + REPLACE(REPLACE(SCHEMA_NAME(p.schema_id), N'\\', N'\\\\'), N'"', N'\\"')
  + N'","nome":"' + REPLACE(REPLACE(p.name, N'\\', N'\\\\'), N'"', N'\\"')
  + N'","corpo":"' + REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(nvarchar(max), ISNULL(m.definition, N'')),
        N'\\', N'\\\\'),
        N'"', N'\\"'),
        NCHAR(13) + NCHAR(10), N'\\n'),
        NCHAR(10), N'\\n'),
        NCHAR(9), N'\\t')
  + N'"}'
FROM sys.procedures p
LEFT JOIN sys.sql_modules m ON m.object_id = p.object_id
WHERE p.is_ms_shipped = 0
  AND (@schema IS NULL OR SCHEMA_NAME(p.schema_id) = @schema)
ORDER BY SCHEMA_NAME(p.schema_id), p.name;`;
  }

  copiarScript(): void {
    if (typeof window === 'undefined') return;
    const sql = this.scriptVisivel();
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

  onArquivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    const ext = f.name.toLowerCase().split('.').pop();
    if (ext !== 'json') {
      this.erro.set('Apenas arquivos .json são aceitos.');
      this.arquivo.set(null);
      input.value = '';
      return;
    }
    const limiteMb = this.modo() === 'tabela' ? 5 : 20;
    if (f.size > limiteMb * 1024 * 1024) {
      this.erro.set(`Arquivo excede o limite de ${limiteMb} MB.`);
      this.arquivo.set(null);
      input.value = '';
      return;
    }
    this.erro.set(null);
    this.arquivo.set(f);
  }

  comparar(): void {
    if (!this.arquivo()) return;
    if (this.modo() === 'banco') {
      this.compararBanco();
      return;
    }
    if (this.modo() === 'procedures') {
      this.compararProcedures();
      return;
    }
    const sel = this.tabelaSelecionada();
    if (!sel) return;
    const [schema, tabela] = sel.split('|');
    this.carregando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.db.compararSchemas(schema, tabela, this.arquivo()!).subscribe({
      next: r => {
        this.resultado.set(r);
        this.definirAbaInicial();
        this.carregando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao comparar schemas.');
        this.carregando.set(false);
      }
    });
  }

  private compararBanco(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.db.compararBancoInteiro(this.arquivo()!).subscribe({
      next: rb => {
        this.resultadoBulk.set(rb);
        this.definirAbaInicial();
        this.carregando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao comparar o banco inteiro.');
        this.carregando.set(false);
      }
    });
  }

  private compararProcedures(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.resultadoProcedures.set(null);
    this.db.compararProcedures(this.arquivo()!).subscribe({
      next: rp => {
        this.resultadoProcedures.set(rp);
        this.carregando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao comparar procedures.');
        this.carregando.set(false);
      }
    });
  }

  exportarCsv(): void {
    const numeros = new Map<string, number>();
    const proximoNumero = (aba: string): number => {
      const n = (numeros.get(aba) ?? 0) + 1;
      numeros.set(aba, n);
      return n;
    };
    const rb = this.resultadoBulk();
    if (this.modo() === 'banco' && rb) {
      const header = 'tabela,status,aba,numero,severidade,categoria,campo,esperado,encontrado,descricao';
      const linhas: string[] = [];
      for (const t of rb.tabelas) {
        for (const d of t.diferencas) {
          if (d.severidade === 'Ok') continue;
          const aba = this.rotuloAba(d.categoria);
          linhas.push([t.tabela, t.status, aba, proximoNumero(aba), d.severidade, d.categoria, d.campo, d.esperado ?? '', d.encontrado ?? '', d.descricao]
            .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        }
      }
      const csv = [header, ...linhas].join('\r\n');
      this.baixarCsv(csv, 'schema-banco-inteiro');
      return;
    }
    const r = this.resultado();
    if (!r) return;
    const header = 'aba,numero,severidade,categoria,campo,esperado,encontrado,descricao';
    const linhas = r.diferencas.filter(d => d.severidade !== 'Ok').map(d => {
      const aba = this.rotuloAba(d.categoria);
      return [aba, proximoNumero(aba), d.severidade, d.categoria, d.campo, d.esperado ?? '', d.encontrado ?? '', d.descricao]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header, ...linhas].join('\r\n');
    this.baixarCsv(csv, `schema-comparacao-${r.tabela.replace(/[^\w-]/g, '_')}`);
  }

  private rotuloAba(cat: SchemaDifference['categoria']): string {
    return ABAS_RELATORIO.find(a => a.categorias.includes(cat))?.rotulo ?? cat;
  }

  private baixarCsv(csv: string, nomeBase: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  severidadeClass(s: string): string {
    return s;
  }
}
