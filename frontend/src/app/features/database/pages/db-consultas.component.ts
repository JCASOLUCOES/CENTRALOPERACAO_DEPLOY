import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import { DatabaseQueryResult } from '../models/database.model';

@Component({
  selector: 'app-db-consultas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="adm-aviso adm-aviso--info mb-3">
    <i class="bi bi-shield-check"></i>
    <span>Apenas <strong>SELECT</strong> (e <strong>WITH</strong> para CTEs) sao permitidos. Comandos destrutivos sao bloqueados server-side. Limite: {{ limite }} registros · Timeout: {{ timeout }}s.</span>
  </div>

  <div class="db-consultas__editor">
    <textarea class="form-control db-consultas__sql" rows="6" spellcheck="false"
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
    .db-consultas__botoes { display: flex; gap: 1rem; align-items: center; }
    .db-consultas__meta { display: flex; gap: 1.5rem; color: #475569; font-size: 0.85rem; margin-bottom: 0.5rem; }
  `]
})
export class DbConsultasComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  readonly resultado = signal<DatabaseQueryResult | null>(null);
  readonly carregando = signal(false);
  sql = '';
  limite = 100;
  timeout = 30;

  ngOnInit(): void {
    // Se veio do modal de procedure com nome pré-preenchido, monta o SELECT
    const prefill = sessionStorage.getItem('db-procedure-prefill');
    if (prefill) {
      sessionStorage.removeItem('db-procedure-prefill');
      const [schema, nome] = prefill.split('.');
      // Para procedures, gera EXEC (vai ser bloqueado pelo regex).
      // Em vez disso, monta um SELECT na tabela se o nome bater, ou mostra o nome num comentario.
      this.sql = `-- Procedure: ${prefill}\n-- Para executar: CALL via exec (bloqueado nesta UI). Use 'sp_helptext' no SQL Server Management Studio.\nSELECT TOP 10 * FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = '${schema ?? ''}' AND ROUTINE_NAME = '${nome ?? ''}';`;
    }
  }

  executar(): void {
    if (!this.sql.trim()) return;
    this.carregando.set(true);
    this.db.executarQuery({ sql: this.sql, limite: this.limite, timeoutSegundos: this.timeout }).subscribe({
      next: r => { this.resultado.set(r); this.carregando.set(false); },
      error: () => { this.resultado.set({ sucesso: false, colunas: [], linhas: [], quantidadeRegistros: 0, duracaoMs: 0, mensagemErro: 'Falha ao executar consulta.' }); this.carregando.set(false); }
    });
  }
}
