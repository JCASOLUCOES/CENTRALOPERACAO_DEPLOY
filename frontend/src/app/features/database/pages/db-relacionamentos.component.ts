import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import { DatabaseRelationship } from '../models/database.model';

@Component({
  selector: 'app-db-relacionamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="db-rel__filtros adm-pills">
    <button class="adm-pill" [class.adm-pill--ativa]="filtro() === 'todas'" (click)="filtro.set('todas'); recarregar()">Todas</button>
    <button class="adm-pill" [class.adm-pill--ativa]="filtro() === 'confirmadas'" (click)="filtro.set('confirmadas'); recarregar()">Apenas confirmadas</button>
    <button class="adm-pill" [class.adm-pill--ativa]="filtro() === 'possiveis'" (click)="filtro.set('possiveis'); recarregar()">Apenas possíveis</button>
  </div>

  <div class="db-rel__busca">
    <div class="adm-search">
      <i class="bi bi-search adm-search__icone"></i>
      <input type="text" class="adm-search__input" placeholder="Onde esta coluna e usada? (ex: DEVEDOR_ID)"
        [(ngModel)]="buscaColuna" (keyup.enter)="buscarColuna()">
    </div>
    <button class="adm-btn adm-btn--primary" (click)="buscarColuna()">
      <i class="bi bi-search"></i> Buscar
    </button>
  </div>

  <div *ngIf="carregando()" class="adm-empty">Carregando…</div>

  <div *ngIf="!carregando() && listaFiltrada().length === 0" class="adm-empty">
    Nenhum relacionamento encontrado com os filtros atuais.
  </div>

  <div *ngIf="!carregando() && listaFiltrada().length > 0" class="adm-table-wrap">
    <table class="adm-table">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Origem</th>
          <th></th>
          <th>Destino</th>
          <th>Score</th>
          <th>Motivos</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let r of listaFiltrada()">
          <td>
            <span class="db-rel__chip"
              [class.db-rel__chip--confirmada]="r.tipo === 'Confirmada'"
              [class.db-rel__chip--possivel]="r.tipo === 'Possivel'">
              <i class="bi" [ngClass]="r.tipo === 'Confirmada' ? 'bi-link-45deg' : 'bi-link-45deg'"></i>
              {{ r.tipo }}
            </span>
          </td>
          <td>
            <code>{{ r.tabelaOrigem }}.{{ r.colunaOrigem }}</code>
          </td>
          <td class="text-center">
            <i class="bi bi-arrow-right"></i>
          </td>
          <td>
            <code>{{ r.tabelaDestino }}.{{ r.colunaDestino }}</code>
          </td>
          <td>
            <div class="db-rel__score" [style.--score]="r.score + '%'">
              <div class="db-rel__score-barra" [class.db-rel__score-barra--alta]="r.score >= 80"
                [class.db-rel__score-barra--media]="r.score >= 50 && r.score < 80"
                [class.db-rel__score-barra--baixa]="r.score < 50">
              </div>
              <span class="db-rel__score-num">{{ r.score }}%</span>
            </div>
          </td>
          <td>
            <ul class="db-rel__motivos">
              <li *ngFor="let m of r.motivos"><i class="bi bi-check2"></i> {{ m }}</li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  `,
  styles: [`
    .db-rel__filtros { margin-bottom: 1rem; }
    .db-rel__busca { display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center; }
    .db-rel__busca .adm-search { flex: 1; }
    .db-rel__chip {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0.2rem 0.55rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600;
    }
    .db-rel__chip--confirmada { background: #dbeafe; color: #1e40af; }
    .db-rel__chip--possivel { background: #f3e8ff; color: #6b21a8; }
    .db-rel__score { position: relative; width: 80px; height: 18px; background: #e2e8f0; border-radius: 0.3rem; overflow: hidden; }
    .db-rel__score-barra { position: absolute; left: 0; top: 0; bottom: 0; width: var(--score, 0%); }
    .db-rel__score-barra--alta { background: #16a34a; }
    .db-rel__score-barra--media { background: #d97706; }
    .db-rel__score-barra--baixa { background: #94a3b8; }
    .db-rel__score-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #0f172a; font-weight: 600; }
    .db-rel__motivos { list-style: none; padding: 0; margin: 0; font-size: 0.8rem; color: #475569; }
    .db-rel__motivos li { display: flex; align-items: center; gap: 0.25rem; }
  `]
})
export class DbRelacionamentosComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  readonly lista = signal<DatabaseRelationship[]>([]);
  readonly carregando = signal(false);
  readonly filtro = signal<'todas' | 'confirmadas' | 'possiveis'>('todas');
  buscaColuna = '';

  readonly listaFiltrada = computed(() => {
    const f = this.filtro();
    if (f === 'todas') return this.lista();
    return this.lista().filter(r => r.tipo.toLowerCase() === f.slice(0, -1));
  });

  ngOnInit(): void {
    this.recarregar();
  }

  recarregar(): void {
    this.carregando.set(true);
    const inc = this.filtro() !== 'confirmadas';
    this.db.relacionamentos(undefined, inc, 1000).subscribe({
      next: l => { this.lista.set(l); this.carregando.set(false); },
      error: () => this.carregando.set(false)
    });
  }

  buscarColuna(): void {
    if (!this.buscaColuna.trim()) { this.recarregar(); return; }
    this.carregando.set(true);
    this.db.usoColuna(this.buscaColuna.trim()).subscribe({
      next: l => { this.lista.set(l); this.carregando.set(false); },
      error: () => this.carregando.set(false)
    });
  }
}
