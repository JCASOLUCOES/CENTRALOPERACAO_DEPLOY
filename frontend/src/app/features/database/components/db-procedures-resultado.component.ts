import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ProcedureComparison, ProcedureStatus, ProceduresComparisonResult
} from '../models/database.model';

type FiltroProc = 'todos' | ProcedureStatus;

@Component({
  selector: 'app-db-procedures-resultado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div *ngIf="resultado() as r" class="db-procs">
    <div class="db-procs__header">
      <h5><i class="bi bi-diagram-3"></i> Procedures — comparação de corpos</h5>
      <p class="text-muted">
        Comparação <strong>somente leitura</strong>: o corpo de cada procedure do arquivo é
        comparado com o banco JCA (sensível a caixa, com normalização de fim de linha).
        Divergências seguem o <strong>banco JCA</strong> — nenhum script é gerado neste modo.
      </p>
    </div>

    <div class="db-procs__resumo">
      <span class="db-procs__chip">{{ r.totalBanco }} no banco</span>
      <span class="db-procs__chip">{{ r.totalArquivo }} no arquivo</span>
      <span class="db-procs__chip db-procs__chip--ok">{{ r.compativeis }} compatíveis</span>
      <span class="db-procs__chip db-procs__chip--dif">{{ r.divergentes }} divergentes</span>
      <span class="db-procs__chip db-procs__chip--sb">{{ r.somenteBanco }} só no banco</span>
      <span class="db-procs__chip db-procs__chip--sa">{{ r.somenteArquivo }} só no arquivo</span>
      <span *ngIf="r.arquivoNome" class="db-procs__chip db-procs__chip--arq">
        <i class="bi bi-file-earmark-text"></i> {{ r.arquivoNome }}
      </span>
    </div>

    <div class="db-procs__filtros">
      <button type="button" class="db-procs__pill"
              [class.db-procs__pill--on]="filtro() === 'todos'"
              (click)="filtro.set('todos')">Todos ({{ r.itens.length }})</button>
      <button type="button" class="db-procs__pill db-procs__pill--dif"
              [class.db-procs__pill--on]="filtro() === 'Divergente'"
              (click)="filtro.set('Divergente')">Divergentes ({{ r.divergentes }})</button>
      <button type="button" class="db-procs__pill db-procs__pill--sb"
              [class.db-procs__pill--on]="filtro() === 'SomenteBanco'"
              (click)="filtro.set('SomenteBanco')">Só no banco ({{ r.somenteBanco }})</button>
      <button type="button" class="db-procs__pill db-procs__pill--sa"
              [class.db-procs__pill--on]="filtro() === 'SomenteArquivo'"
              (click)="filtro.set('SomenteArquivo')">Só no arquivo ({{ r.somenteArquivo }})</button>
      <button type="button" class="db-procs__pill db-procs__pill--ok"
              [class.db-procs__pill--on]="filtro() === 'Compativel'"
              (click)="filtro.set('Compativel')">Compatíveis ({{ r.compativeis }})</button>

      <input type="text" class="form-control form-control-sm db-procs__busca"
             placeholder="Buscar procedure…"
             [ngModel]="busca()" (ngModelChange)="busca.set($event)"
             aria-label="Buscar procedure">

      <button type="button" class="btn btn-sm btn-outline-secondary" (click)="exportarCsv()">
        <i class="bi bi-download"></i> Exportar CSV
      </button>
    </div>

    <div class="db-procs__lista">
      <div *ngIf="visiveis().length === 0" class="adm-empty">
        Nenhuma procedure com o filtro atual.
      </div>

      <div *ngFor="let p of visiveis()" class="db-procs__card"
           [ngClass]="'db-procs__card--' + statusClass(p.status)">
        <div class="db-procs__topo">
          <span class="db-procs__status" [ngClass]="'db-procs__status--' + statusClass(p.status)">
            {{ rotuloStatus(p.status) }}
          </span>
          <strong class="db-procs__nome">{{ p.schema }}.{{ p.nome }}</strong>
          <span class="db-procs__tam">
            JCA: {{ corpo(p.corpoJca).length }} car. · arquivo: {{ corpo(p.corpoArquivo).length }} car.
          </span>
        </div>

        <div class="db-procs__corpos" [ngClass]="temDoisLados(p) ? '' : 'db-corpos--um'">
          <div class="db-procs__lado" *ngIf="p.status !== 'SomenteArquivo'">
            <div class="db-procs__lado-topo">
              <span>Banco JCA</span>
              <button *ngIf="corpo(p.corpoJca)" type="button" class="btn btn-sm btn-outline-secondary"
                      (click)="copiar(corpo(p.corpoJca), chaveLado(p, 'jca'))">
                <i class="bi" [ngClass]="copiadoId() === chaveLado(p, 'jca') ? 'bi-check-lg' : 'bi-clipboard'"></i>
                {{ copiadoId() === chaveLado(p, 'jca') ? 'Copiado' : 'Copiar' }}
              </button>
            </div>
            <pre class="db-procs__pre"><ng-container *ngIf="corpo(p.corpoJca); else semJca">{{ corpo(p.corpoJca) }}</ng-container><ng-template #semJca>— ausente no banco JCA —</ng-template></pre>
          </div>

          <div class="db-procs__lado" *ngIf="temDoisLados(p) || p.status === 'SomenteArquivo'">
            <div class="db-procs__lado-topo">
              <span>Arquivo</span>
              <button *ngIf="corpo(p.corpoArquivo)" type="button" class="btn btn-sm btn-outline-secondary"
                      (click)="copiar(corpo(p.corpoArquivo), chaveLado(p, 'arq'))">
                <i class="bi" [ngClass]="copiadoId() === chaveLado(p, 'arq') ? 'bi-check-lg' : 'bi-clipboard'"></i>
                {{ copiadoId() === chaveLado(p, 'arq') ? 'Copiado' : 'Copiar' }}
              </button>
            </div>
            <pre class="db-procs__pre"><ng-container *ngIf="corpo(p.corpoArquivo); else semArq">{{ corpo(p.corpoArquivo) }}</ng-container><ng-template #semArq>— ausente no arquivo —</ng-template></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .db-procs { margin-top: 1.25rem; border-top: 1px dashed #cbd5e1; padding-top: 1rem; }
    .db-procs__header h5 { font-weight: 600; margin-bottom: 0.25rem; }
    .db-procs__header p { font-size: 0.85rem; margin-bottom: 0.75rem; }
    .db-procs__resumo { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
    .db-procs__chip {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px;
      background: #f1f5f9; color: #334155;
    }
    .db-procs__chip--ok { background: #d1fae5; color: #065f46; }
    .db-procs__chip--dif { background: #fee2e2; color: #991b1b; }
    .db-procs__chip--sb { background: #fef3c7; color: #92400e; }
    .db-procs__chip--sa { background: #fee2e2; color: #991b1b; }
    .db-procs__chip--arq { background: #e0e7ff; color: #3730a3; }
    .db-procs__filtros {
      display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.85rem;
    }
    .db-procs__pill {
      border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 999px;
      padding: 0.3rem 0.7rem; font-size: 0.78rem; font-weight: 600; color: #475569;
      cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .db-procs__pill:hover { border-color: #cbd5e1; color: #1e3a8a; }
    .db-procs__pill--on { background: #1e3a8a; border-color: #1e3a8a; color: #fff; }
    .db-procs__pill--dif { color: #991b1b; }
    .db-procs__pill--sb { color: #92400e; }
    .db-procs__pill--sa { color: #991b1b; }
    .db-procs__pill--ok { color: #065f46; }
    .db-procs__busca { min-width: 12rem; flex: 1; max-width: 18rem; }
    .db-procs__lista { display: flex; flex-direction: column; gap: 0.6rem; }
    .db-procs__card {
      border: 1px solid #e2e8f0; border-left: 4px solid #94a3b8;
      border-radius: 0.45rem; background: #fff; padding: 0.7rem 0.85rem;
    }
    .db-procs__card--Compativel { border-left-color: #16a34a; }
    .db-procs__card--Divergente { border-left-color: #dc2626; }
    .db-procs__card--SomenteBanco { border-left-color: #d97706; }
    .db-procs__card--SomenteArquivo { border-left-color: #dc2626; }
    .db-procs__topo { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .db-procs__status {
      font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px;
    }
    .db-procs__status--Compativel { background: #d1fae5; color: #065f46; }
    .db-procs__status--Divergente { background: #fee2e2; color: #991b1b; }
    .db-procs__status--SomenteBanco { background: #fef3c7; color: #92400e; }
    .db-procs__status--SomenteArquivo { background: #fee2e2; color: #991b1b; }
    .db-procs__nome { font-size: 0.88rem; }
    .db-procs__tam { font-size: 0.75rem; color: #64748b; margin-left: auto; }
    .db-procs__corpos {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-top: 0.55rem;
    }
    .db-procs__corpos.db-corpos--um { grid-template-columns: 1fr; }
    .db-procs__lado-topo {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 0.3rem;
    }
    .db-procs__pre {
      margin: 0; padding: 0.6rem; max-height: 16rem; overflow: auto;
      font-size: 0.72rem; line-height: 1.45; background: #0f172a; color: #e2f0f0;
      border-radius: 0.4rem; white-space: pre;
    }
    @media (max-width: 768px) {
      .db-procs__corpos { grid-template-columns: 1fr; }
      .db-procs__filtros { flex-direction: column; align-items: stretch; }
      .db-procs__busca { max-width: none; }
    }
  `]
})
export class DbProceduresResultadoComponent {
  readonly resultado = input<ProceduresComparisonResult | null>(null);

  readonly filtro = signal<FiltroProc>('todos');
  readonly busca = signal('');
  readonly copiadoId = signal<string | null>(null);

  readonly visiveis = computed(() => {
    const r = this.resultado();
    if (!r) return [] as ProcedureComparison[];
    const f = this.filtro();
    const q = this.busca().trim().toLowerCase();
    return r.itens.filter(p =>
      (f === 'todos' || p.status === f) &&
      (!q || `${p.schema}.${p.nome}`.toLowerCase().includes(q)));
  });

  temDoisLados(p: ProcedureComparison): boolean {
    return p.status === 'Divergente';
  }

  chaveLado(p: ProcedureComparison, lado: 'jca' | 'arq'): string {
    return `${p.schema}.${p.nome}:${lado}`;
  }

  corpo(c: string | null | undefined): string {
    return c ?? '';
  }

  statusClass(s: ProcedureStatus): string {
    switch (s) {
      case 'Compativel': return 'Compativel';
      case 'Divergente': return 'Divergente';
      case 'SomenteBanco': return 'SomenteBanco';
      default: return 'SomenteArquivo';
    }
  }

  rotuloStatus(s: ProcedureStatus): string {
    switch (s) {
      case 'Compativel': return 'COMPATÍVEL';
      case 'Divergente': return 'DIVERGENTE';
      case 'SomenteBanco': return 'SÓ NO BANCO';
      default: return 'SÓ NO ARQUIVO';
    }
  }

  copiar(texto: string, id: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => this.marcarCopia(id))
        .catch(() => {
          if (this.copiarFallback(texto)) this.marcarCopia(id);
        });
      return;
    }
    if (this.copiarFallback(texto)) this.marcarCopia(id);
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

  private marcarCopia(id: string): void {
    this.copiadoId.set(id);
    setTimeout(() => {
      if (this.copiadoId() === id) this.copiadoId.set(null);
    }, 2000);
  }

  exportarCsv(): void {
    const r = this.resultado();
    if (!r || typeof document === 'undefined') return;
    const header = 'schema,nome,status,tamanhoJca,tamanhoArquivo';
    const linhas = r.itens.map(p =>
      [p.schema, p.nome, p.status, (p.corpoJca ?? '').length, (p.corpoArquivo ?? '').length]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...linhas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procedures-comparacao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
