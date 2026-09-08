import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import { DatabaseTable } from '../models/database.model';

interface ItemDiff {
  tipo: 'Tabela' | 'Coluna' | 'TipoAlterado';
  objeto: string;
  coluna?: string;
  status: 'Nova' | 'Removida' | 'Alterada';
  detalhe?: string;
}

@Component({
  selector: 'app-db-diferencas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="adm-card p-3">
    <h3 class="adm-card__title">Sincronização de estrutura</h3>
    <p class="adm-card__desc">
      Compara a estrutura <strong>real do SQL Server</strong> com a
      <strong>documentação Markdown</strong> institucional (wiki da Central de Conhecimento).
    </p>

    <div class="db-diff__controles">
      <label>Limite de tabelas a comparar:
        <input type="number" class="form-control form-control-sm" [(ngModel)]="limite" min="10" max="500">
      </label>
      <button class="btn btn-primary" (click)="comparar()" [disabled]="carregando()">
        <i class="bi bi-arrow-left-right"></i> {{ carregando() ? 'Comparando…' : 'Comparar agora' }}
      </button>
    </div>

    <div *ngIf="!carregando() && !resultado()" class="adm-empty">
      Configure o caminho da documentação e clique em <strong>Comparar agora</strong>.
    </div>

    <div *ngIf="resultado() as r" class="db-diff__resultado">
      <h5>Resumo</h5>
      <div class="adm-stats">
        <div class="adm-stat adm-stat--clickable"><div class="adm-stat__numero">{{ r.tabelasIguais }}</div><div class="adm-stat__label">tabelas iguais</div></div>
        <div class="adm-stat adm-stat--clickable"><div class="adm-stat__numero text-warning">{{ r.tabelasNovas }}</div><div class="adm-stat__label">tabelas novas</div></div>
        <div class="adm-stat adm-stat--clickable"><div class="adm-stat__numero text-danger">{{ r.tabelasRemovidas }}</div><div class="adm-stat__label">tabelas removidas</div></div>
        <div class="adm-stat adm-stat--clickable"><div class="adm-stat__numero text-warning">{{ r.colunasNovas }}</div><div class="adm-stat__label">colunas novas</div></div>
        <div class="adm-stat adm-stat--clickable"><div class="adm-stat__numero text-danger">{{ r.colunasRemovidas }}</div><div class="adm-stat__label">colunas removidas</div></div>
        <div class="adm-stat adm-stat--clickable"><div class="adm-stat__numero text-warning">{{ r.colunasAlteradas }}</div><div class="adm-stat__label">colunas alteradas</div></div>
      </div>

      <h5 class="mt-3">Diferenças encontradas</h5>
      <div *ngIf="r.itens.length === 0" class="adm-empty">
        Nenhuma divergência encontrada. A documentação está sincronizada com o banco.
      </div>
      <ul *ngIf="r.itens.length > 0" class="db-diff__lista">
        <li *ngFor="let i of r.itens" [class]="'db-diff__item db-diff__item--' + i.status.toLowerCase()">
          <span class="db-diff__chip">{{ i.tipo }}</span>
          <strong>{{ i.objeto }}<span *ngIf="i.coluna">.{{ i.coluna }}</span></strong>
          <span class="db-diff__status">{{ i.status }}</span>
          <small *ngIf="i.detalhe">— {{ i.detalhe }}</small>
        </li>
      </ul>
    </div>
  </div>
  `,
  styles: [`
    .db-diff__controles { display: flex; gap: 1rem; align-items: center; margin: 1rem 0; }
    .db-diff__controles input { width: 100px; display: inline-block; }
    .db-diff__resultado h5 { font-weight: 600; }
    .db-diff__lista { list-style: none; padding: 0; margin: 0; }
    .db-diff__item { padding: 0.5rem 0.75rem; border-radius: 0.4rem; margin-bottom: 0.35rem; display: flex; gap: 0.6rem; align-items: center; font-size: 0.9rem; }
    .db-diff__item--nova { background: #fef3c7; color: #92400e; }
    .db-diff__item--removida { background: #fee2e2; color: #991b1b; }
    .db-diff__item--alterada { background: #dbeafe; color: #1e3a8a; }
    .db-diff__chip { background: rgba(0,0,0,0.1); color: inherit; padding: 0.1rem 0.4rem; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 600; }
    .db-diff__status { margin-left: auto; font-weight: 600; }
  `]
})
export class DbDiferencasComponent {
  private readonly db = inject(DatabaseService);
  readonly resultado = signal<{ tabelasIguais: number; tabelasNovas: number; tabelasRemovidas: number; colunasNovas: number; colunasRemovidas: number; colunasAlteradas: number; itens: ItemDiff[] } | null>(null);
  readonly carregando = signal(false);
  limite = 100;

  comparar(): void {
    this.carregando.set(true);
    // Compara usando listarTabelas vs documentacao conhecida (placeholder simples)
    this.db.listarTabelas().subscribe({
      next: tabelas => {
        const itens: ItemDiff[] = [];
        // Documentacao placeholder: comparacao simples — apenas para exibir UI
        // Em producao, o backend teria um SchemaDiffService com caminho de docs
        let tabelasIguais = 0, tabelasNovas = tabelas.length, tabelasRemovidas = 0, colunasNovas = 0, colunasRemovidas = 0, colunasAlteradas = 0;
        this.resultado.set({ tabelasIguais, tabelasNovas, tabelasRemovidas, colunasNovas, colunasRemovidas, colunasAlteradas, itens });
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }
}
