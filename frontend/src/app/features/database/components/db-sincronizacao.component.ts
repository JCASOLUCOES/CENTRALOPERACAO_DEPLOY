import { CommonModule } from '@angular/common';
import { Component, inject, signal, input, output, computed, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import {
  DatabaseTable, SchemaComparisonResult, SchemaDifference,
  BulkSchemaComparisonResult, BulkTableComparison, BulkTableStatus
} from '../models/database.model';

type FiltroSeveridade = 'Critico' | 'Aviso' | 'Ok' | null;

@Component({
  selector: 'app-db-sincronizacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="adm-card p-3">
    <h3 class="adm-card__title">Comparação de Schemas</h3>
    <p class="adm-card__desc">
      Envie um arquivo <strong>JSON</strong> com a estrutura esperada de uma tabela
      e compare com o <strong>schema real do banco JCA</strong> (colunas, tipos, nullable, índices e FKs).
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

      <label class="db-sync__file">
        <input type="file" accept=".json" #arquivoInput (change)="onArquivo($event)" [disabled]="carregando()">
        <span *ngIf="!arquivo()" class="db-sync__file-placeholder">
          <i class="bi bi-upload"></i> Escolher JSON{{ modo() === 'banco' ? ' (até 20 MB)' : '' }}
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

      <button *ngIf="(modo() === 'tabela' ? resultado() : resultadoBulk())" class="btn btn-outline-secondary" (click)="exportarCsv()">
        <i class="bi bi-download"></i> Exportar CSV
      </button>

      <button *ngIf="resultado() || resultadoBulk() || arquivo() || tabelaSelecionada()" class="btn btn-outline-danger"
              (click)="limparTudo()" [disabled]="carregando()">
        <i class="bi bi-eraser"></i> Limpar
      </button>
    </div>

    <div class="db-sync__script mb-3">
      <div class="db-sync__script-header">
        <strong>Script de exportação (JSON) — {{ modo() === 'tabela' ? 'tabela única' : 'banco inteiro' }}</strong>
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
      <pre class="db-sync__script-pre">{{ modo() === 'tabela' ? scriptSql() : scriptSqlBulk() }}</pre>
      <small *ngIf="modo() === 'tabela'" class="text-muted db-sync__script-dica">
        1. Rode no SSMS do banco externo · 2. Clique na célula do resultado e copie o JSON inteiro ·
        3. Cole em um arquivo <code>.json</code> e envie acima. O script gera colunas, índices e FKs
        no formato aceito pelo sistema. Compatível com SQL Server 2005+
        (usa <code>FOR XML PATH</code>, sem <code>FOR JSON</code>).
        Se o SSMS/Excel embrulhar o valor em aspas, o backend desembrulha automaticamente —
        prefira colar o JSON limpo começando por <code>&#123;</code>.
      </small>
      <small *ngIf="modo() === 'banco'" class="text-muted db-sync__script-dica">
        1. Deixe o schema <strong>vazio</strong> para exportar todos os schemas (ou informe 1 schema) ·
        2. Rode no SSMS do banco externo · 3. Selecione <strong>todas as linhas</strong> (uma por tabela) e copie ·
        4. Cole em um arquivo <code>.json</code> e envie acima. O sistema compara cada tabela com o banco
        conectado; tabelas ausentes de <strong>qualquer lado</strong> contam como crítico.
        Uma linha por tabela evita truncamento de célula no SSMS.
      </small>
    </div>

    <div *ngIf="erro()" class="adm-aviso adm-aviso--erro mb-3">
      <i class="bi bi-exclamation-triangle"></i>
      <span>{{ erro() }}</span>
    </div>

    <div *ngIf="!carregando() && !resultado() && !resultadoBulk() && !erro()" class="adm-empty">
      <ng-container *ngIf="modo() === 'tabela'; else emptyBulk">
        Selecione uma tabela, envie o arquivo <strong>JSON</strong> e clique em <strong>Comparar</strong>.
        <br><small class="text-muted">
          JSON: objeto com <code>colunas[]</code>, <code>indices[]</code>, <code>fks[]</code> — ou apenas array de colunas.
        </small>
      </ng-container>
      <ng-template #emptyBulk>
        Envie o arquivo <strong>JSON</strong> com as tabelas exportadas pelo script de banco inteiro
        e clique em <strong>Comparar</strong>.
        <br><small class="text-muted">
          Aceita <code>&#123;"tabelas":[...]&#125;</code>, array de objetos de tabela ou JSON Lines (uma linha por tabela).
        </small>
      </ng-template>
    </div>

    <div *ngIf="resultado() as r" class="db-sync__resultado">
      <h5>Resumo — {{ r.tabela }}</h5>
      <p class="text-muted mb-2" *ngIf="r.arquivoNome">
        Arquivo: <strong>{{ r.arquivoNome }}</strong> ·
        {{ r.totalColunasJca }} colunas JCA × {{ r.totalColunasArquivo }} no arquivo ·
        Match: <strong>{{ r.percentualMatch }}%</strong>
      </p>

      <div class="adm-stats" role="group" aria-label="Filtrar por severidade">
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtro() === 'Critico'"
                [class.db-sync__stat--critico]="filtro() === 'Critico'"
                (click)="alternarFiltro('Critico')">
          <strong class="db-sync__num text-danger">{{ r.criticos }}</strong>
          <span>críticos</span>
        </button>
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtro() === 'Aviso'"
                [class.db-sync__stat--aviso]="filtro() === 'Aviso'"
                (click)="alternarFiltro('Aviso')">
          <strong class="db-sync__num text-warning">{{ r.avisos }}</strong>
          <span>avisos</span>
        </button>
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtro() === 'Ok'"
                [class.db-sync__stat--ok]="filtro() === 'Ok'"
                (click)="alternarFiltro('Ok')">
          <strong class="db-sync__num text-success">{{ r.oks }}</strong>
          <span>compatíveis</span>
        </button>
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtro() === null"
                (click)="alternarFiltro(null)">
          <strong class="db-sync__num">{{ r.percentualMatch }}%</strong>
          <span>match · tudo</span>
        </button>
      </div>

      <p class="text-muted db-sync__filtro-dica" *ngIf="filtro()">
        Filtrado por <strong>{{ rotuloFiltro() }}</strong> · clique de novo no card ou em
        <strong>match · tudo</strong> para limpar.
      </p>

      <div *ngIf="diferencasVisiveis().length === 0" class="adm-empty">
        <ng-container *ngIf="filtro() === 'Critico'">
          Nenhum crítico. Clique em <strong>avisos</strong> ou <strong>match · tudo</strong>.
        </ng-container>
        <ng-container *ngIf="filtro() === 'Aviso'">
          Nenhum aviso. Clique em <strong>críticos</strong> ou <strong>match · tudo</strong>.
        </ng-container>
        <ng-container *ngIf="filtro() === 'Ok'">
          Nenhuma coluna compatível no filtro atual.
        </ng-container>
        <ng-container *ngIf="filtro() === null">
          Nenhuma diferença encontrada. Os schemas estão compatíveis.
        </ng-container>
      </div>

      <div class="db-sync__lista">
        <div *ngFor="let d of diferencasVisiveis()"
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

    <div *ngIf="resultadoBulk() as rb" class="db-sync__resultado">
      <h5>Resumo — banco inteiro</h5>
      <p class="text-muted mb-2" *ngIf="rb.arquivoNome">
        Arquivo: <strong>{{ rb.arquivoNome }}</strong> ·
        {{ rb.totalTabelasArquivo }} tabelas no arquivo × {{ rb.totalTabelasBanco }} no banco ·
        Match: <strong>{{ rb.percentualMatch }}%</strong>
      </p>

      <div class="adm-stats" role="group" aria-label="Filtrar tabelas por severidade">
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtroBulk() === 'Critico'"
                [class.db-sync__stat--critico]="filtroBulk() === 'Critico'"
                (click)="alternarFiltroBulk('Critico')">
          <strong class="db-sync__num text-danger">{{ rb.criticos }}</strong>
          <span>críticos</span>
        </button>
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtroBulk() === 'Aviso'"
                [class.db-sync__stat--aviso]="filtroBulk() === 'Aviso'"
                (click)="alternarFiltroBulk('Aviso')">
          <strong class="db-sync__num text-warning">{{ rb.avisos }}</strong>
          <span>avisos</span>
        </button>
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtroBulk() === 'Ok'"
                [class.db-sync__stat--ok]="filtroBulk() === 'Ok'"
                (click)="alternarFiltroBulk('Ok')">
          <strong class="db-sync__num text-success">{{ rb.tabelasOk }}</strong>
          <span>tabelas ok</span>
        </button>
        <button type="button" class="adm-stat db-sync__stat"
                [class.db-sync__stat--on]="filtroBulk() === null"
                (click)="alternarFiltroBulk(null)">
          <strong class="db-sync__num">{{ rb.percentualMatch }}%</strong>
          <span>match · tudo</span>
        </button>
      </div>

      <p class="text-muted db-sync__filtro-dica" *ngIf="filtroBulk()">
        Filtrado por <strong>{{ rotuloFiltroBulk() }}</strong> · clique de novo no card ou em
        <strong>match · tudo</strong> para limpar.
      </p>

      <p class="db-sync__bulk-resumo">
        <span class="db-sync__bulk-chip db-sync__bulk-chip--ok">{{ rb.tabelasOk }} ok</span>
        <span class="db-sync__bulk-chip db-sync__bulk-chip--dif">{{ rb.tabelasComDiferenca }} com diferenças</span>
        <span class="db-sync__bulk-chip db-sync__bulk-chip--so">{{ rb.somenteArquivo }} só no arquivo</span>
        <span class="db-sync__bulk-chip db-sync__bulk-chip--sb">{{ rb.somenteBanco }} só no banco</span>
      </p>

      <div *ngIf="tabelasBulkVisiveis().length === 0" class="adm-empty">
        <ng-container *ngIf="filtroBulk() === 'Critico'">
          Nenhuma tabela com críticos. Clique em <strong>avisos</strong> ou <strong>match · tudo</strong>.
        </ng-container>
        <ng-container *ngIf="filtroBulk() === 'Aviso'">
          Nenhuma tabela com avisos. Clique em <strong>críticos</strong> ou <strong>match · tudo</strong>.
        </ng-container>
        <ng-container *ngIf="filtroBulk() === 'Ok'">
          Nenhuma tabela 100% compatível no filtro atual.
        </ng-container>
        <ng-container *ngIf="filtroBulk() === null">
          Nenhuma tabela encontrada no resultado.
        </ng-container>
      </div>

      <div class="db-sync__lista db-sync__lista--bulk">
        <ng-container *ngFor="let t of tabelasBulkVisiveis()">
          <button type="button" class="db-sync__bulk-linha"
                  [attr.aria-expanded]="tabelaExpandida() === t.tabela"
                  (click)="toggleExpand(t.tabela)">
            <span class="db-sync__dot" [ngClass]="'db-sync__dot--' + statusDotClass(t)"></span>
            <span class="db-sync__badge db-sync__bulk-badge" [ngClass]="'db-sync__bulk-badge--' + t.status">
              {{ rotuloStatus(t.status) }}
            </span>
            <strong class="db-sync__bulk-nome">{{ t.tabela }}</strong>
            <span class="db-sync__bulk-cols">{{ t.totalColunasArquivo }} arq × {{ t.totalColunasJca }} JCA</span>
            <span class="db-sync__bulk-counts">
              <span *ngIf="t.criticos" class="db-sync__bulk-c text-danger">{{ t.criticos }} crít.</span>
              <span *ngIf="t.avisos" class="db-sync__bulk-c text-warning">{{ t.avisos }} av.</span>
            </span>
            <span class="db-sync__bulk-match">{{ t.percentualMatch }}%</span>
            <i class="bi db-sync__bulk-chevron"
               [ngClass]="tabelaExpandida() === t.tabela ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
          </button>
          <div *ngIf="tabelaExpandida() === t.tabela" class="db-sync__bulk-diffs">
            <div *ngIf="t.diferencas.length === 0" class="db-sync__bulk-sem">
              Tabela 100% compatível — nenhuma diferença.
            </div>
            <div *ngFor="let d of t.diferencas" class="db-sync__item"
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
        </ng-container>
      </div>
    </div>
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
      cursor: pointer; text-align: left; padding: 0.5rem 0.65rem;
      border-radius: 0.5rem; transition: border-color 0.15s, background 0.15s;
      font: inherit; color: inherit;
    }
    .db-sync__stat:hover { background: rgba(15, 23, 42, 0.04); }
    .db-sync__stat--on { background: #f1f5f9; border-color: #334155; }
    .db-sync__stat--on.db-sync__stat--critico { background: #fee2e2; border-color: #dc2626; }
    .db-sync__stat--on.db-sync__stat--aviso { background: #fef3c7; border-color: #d97706; }
    .db-sync__stat--on.db-sync__stat--ok { background: #d1fae5; border-color: #16a34a; }
    .db-sync__stat--on span { color: #0f172a; font-weight: 700; }
    .db-sync__filtro-dica { font-size: 0.8rem; margin: 0.35rem 0 0.75rem; }
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
    .db-sync__bulk-resumo { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 0.75rem; }
    .db-sync__bulk-chip {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 999px;
    }
    .db-sync__bulk-chip--ok { background: #d1fae5; color: #065f46; }
    .db-sync__bulk-chip--dif { background: #fef3c7; color: #92400e; }
    .db-sync__bulk-chip--so { background: #fee2e2; color: #991b1b; }
    .db-sync__bulk-chip--sb { background: #fee2e2; color: #991b1b; }
    .db-sync__lista--bulk { gap: 0.3rem; }
    .db-sync__bulk-linha {
      display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;
      width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 0.4rem;
      padding: 0.5rem 0.75rem; transition: background 0.15s, border-color 0.15s;
    }
    .db-sync__bulk-linha:hover { background: #f8fafc; border-color: #cbd5e1; }
    .db-sync__bulk-badge { min-width: 0; height: auto; padding: 0.15rem 0.5rem; font-size: 0.7rem; flex-shrink: 0; }
    .db-sync__bulk-badge--Ok { background: #16a34a; }
    .db-sync__bulk-badge--Diferencas { background: #b45309; }
    .db-sync__bulk-badge--SomenteArquivo { background: #dc2626; }
    .db-sync__bulk-badge--SomenteBanco { background: #dc2626; }
    .db-sync__bulk-nome { font-size: 0.86rem; }
    .db-sync__bulk-cols { font-size: 0.75rem; color: #64748b; }
    .db-sync__bulk-counts { display: inline-flex; gap: 0.5rem; font-size: 0.75rem; font-weight: 600; }
    .db-sync__bulk-match { margin-left: auto; font-size: 0.82rem; font-weight: 700; color: #334155; }
    .db-sync__bulk-chevron { font-size: 0.8rem; color: #94a3b8; }
    .db-sync__bulk-diffs {
      display: flex; flex-direction: column; gap: 0.3rem;
      padding: 0.35rem 0 0.6rem 1.4rem;
    }
    .db-sync__bulk-sem { font-size: 0.8rem; color: #475569; background: #f1f5f9; border-radius: 0.4rem; padding: 0.5rem 0.75rem; }
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
      .db-sync__bulk-match { margin-left: 0; }
      .db-sync__bulk-linha { font-size: 0.85rem; }
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
  readonly filtro = signal<FiltroSeveridade>('Critico');
  readonly tabelaSelecionada = signal('');
  readonly buscaTabela = signal('');
  readonly modo = signal<'tabela' | 'banco'>('tabela');
  readonly resultadoBulk = signal<BulkSchemaComparisonResult | null>(null);
  readonly filtroBulk = signal<FiltroSeveridade>('Critico');
  readonly tabelaExpandida = signal<string | null>(null);

  scriptSchema = 'dbo';
  scriptTabela = '';

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

  setModo(m: 'tabela' | 'banco'): void {
    if (this.modo() === m) return;
    this.modo.set(m);
    if (m === 'banco' && this.scriptSchema === 'dbo') this.scriptSchema = '';
    if (m === 'tabela' && !this.scriptSchema) this.scriptSchema = 'dbo';
    this.erro.set(null);
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.filtro.set('Critico');
    this.filtroBulk.set('Critico');
    this.tabelaExpandida.set(null);
    this.arquivo.set(null);
    if (this.arquivoInput) this.arquivoInput.nativeElement.value = '';
  }

  limparTudo(): void {
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.arquivo.set(null);
    this.erro.set(null);
    this.filtro.set('Critico');
    this.filtroBulk.set('Critico');
    this.tabelaExpandida.set(null);
    this.tabelaSelecionada.set('');
    this.buscaTabela.set('');
    this.scriptTabela = '';
    if (this.arquivoInput) this.arquivoInput.nativeElement.value = '';
  }

  alternarFiltro(f: FiltroSeveridade): void {
    this.filtro.set(this.filtro() === f ? null : f);
  }

  rotuloFiltro(): string {
    switch (this.filtro()) {
      case 'Critico': return 'críticos';
      case 'Aviso': return 'avisos';
      case 'Ok': return 'compatíveis';
      default: return 'tudo';
    }
  }

  alternarFiltroBulk(f: FiltroSeveridade): void {
    this.filtroBulk.set(this.filtroBulk() === f ? null : f);
  }

  rotuloFiltroBulk(): string {
    switch (this.filtroBulk()) {
      case 'Critico': return 'tabelas com críticos';
      case 'Aviso': return 'tabelas com avisos';
      case 'Ok': return 'tabelas compatíveis';
      default: return 'todas as tabelas';
    }
  }

  tabelasBulkVisiveis(): BulkTableComparison[] {
    const rb = this.resultadoBulk();
    if (!rb) return [];
    const f = this.filtroBulk();
    let lista = rb.tabelas;
    if (f === 'Critico') {
      lista = lista.filter(t => t.criticos > 0 || t.status === 'SomenteArquivo' || t.status === 'SomenteBanco');
    } else if (f === 'Aviso') {
      lista = lista.filter(t => t.avisos > 0);
    } else if (f === 'Ok') {
      lista = lista.filter(t => t.status === 'Ok');
    }
    const ordem: Record<string, number> = { SomenteArquivo: 0, SomenteBanco: 1, Diferencas: 2, Ok: 3 };
    return [...lista].sort((a, b) =>
      (ordem[a.status] ?? 9) - (ordem[b.status] ?? 9) ||
      b.criticos - a.criticos ||
      a.tabela.localeCompare(b.tabela));
  }

  toggleExpand(nome: string): void {
    this.tabelaExpandida.set(this.tabelaExpandida() === nome ? null : nome);
  }

  statusDotClass(t: BulkTableComparison): string {
    if (t.status === 'Ok') return 'Ok';
    if (t.status === 'Diferencas') return t.criticos > 0 ? 'Critico' : 'Aviso';
    return 'Critico';
  }

  rotuloStatus(s: BulkTableStatus): string {
    switch (s) {
      case 'Ok': return 'OK';
      case 'Diferencas': return 'Diferenças';
      case 'SomenteArquivo': return 'Só no arquivo';
      case 'SomenteBanco': return 'Só no banco';
      default: return s;
    }
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
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']}';`;
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
    ).value('.', 'nvarchar(max)'), 1, 1, N''), N'') + N']}'
FROM tabelas tb
ORDER BY tb.schemaNome, tb.nome;`;
  }

  private litarSql(v: string): string {
    return v.replace(/'/g, "''");
  }

  copiarScript(): void {
    if (typeof window === 'undefined') return;
    const sql = this.modo() === 'banco' ? this.scriptSqlBulk() : this.scriptSql();
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

  diferencasVisiveis(): SchemaDifference[] {
    const r = this.resultado();
    if (!r) return [];
    const f = this.filtro();
    if (f === null) return r.diferencas;
    return r.diferencas.filter(d => d.severidade === f);
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
    const limiteMb = this.modo() === 'banco' ? 20 : 5;
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
    const sel = this.tabelaSelecionada();
    if (!sel) return;
    const [schema, tabela] = sel.split('|');
    this.carregando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    this.resultadoBulk.set(null);
    this.tabelaExpandida.set(null);
    this.filtro.set('Critico');
    this.db.compararSchemas(schema, tabela, this.arquivo()!).subscribe({
      next: r => {
        this.marcarNumeros(r);
        this.resultado.set(r);
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
    this.tabelaExpandida.set(null);
    this.filtroBulk.set('Critico');
    this.db.compararBancoInteiro(this.arquivo()!).subscribe({
      next: rb => {
        this.marcarBulkNumeros(rb);
        this.resultadoBulk.set(rb);
        this.carregando.set(false);
      },
      error: (err: any) => {
        this.erro.set(err?.error?.mensagem || 'Falha ao comparar o banco inteiro.');
        this.carregando.set(false);
      }
    });
  }

  private marcarBulkNumeros(rb: BulkSchemaComparisonResult): void {
    let n = 0;
    for (const t of rb.tabelas) {
      for (const d of t.diferencas) {
        if (d.severidade === 'Critico') {
          n++;
          d.numeroCritico = n;
        } else {
          d.numeroCritico = undefined;
        }
      }
    }
  }

  private marcarNumeros(r: SchemaComparisonResult): void {
    let n = 0;
    for (const d of r.diferencas) {
      if (d.severidade === 'Critico') {
        n++;
        d.numeroCritico = n;
      } else {
        d.numeroCritico = undefined;
      }
    }
  }

  exportarCsv(): void {
    const rb = this.resultadoBulk();
    if (this.modo() === 'banco' && rb) {
      const header = 'tabela,status,severidade,categoria,campo,esperado,encontrado,descricao';
      const linhas: string[] = [];
      for (const t of rb.tabelas) {
        for (const d of t.diferencas) {
          linhas.push([t.tabela, t.status, d.severidade, d.categoria, d.campo, d.esperado ?? '', d.encontrado ?? '', d.descricao]
            .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        }
      }
      const csv = [header, ...linhas].join('\r\n');
      this.baixarCsv(csv, 'schema-banco-inteiro');
      return;
    }
    const r = this.resultado();
    if (!r) return;
    const header = 'numero,severidade,categoria,campo,esperado,encontrado,descricao';
    const linhas = r.diferencas.map(d =>
      [d.numeroCritico ?? '', d.severidade, d.categoria, d.campo, d.esperado ?? '', d.encontrado ?? '', d.descricao]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...linhas].join('\r\n');
    this.baixarCsv(csv, `schema-comparacao-${r.tabela.replace(/[^\w-]/g, '_')}`);
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
