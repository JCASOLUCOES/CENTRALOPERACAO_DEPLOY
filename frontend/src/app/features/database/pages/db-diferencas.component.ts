import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import { DiffResult, DiffItem } from '../models/database.model';

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
      <label>Limite de itens:
        <input type="number" class="form-control form-control-sm d-inline-block w-auto" [(ngModel)]="limite" min="10" max="500">
      </label>
      <button class="btn btn-primary" (click)="comparar()" [disabled]="carregando()">
        <i class="bi bi-arrow-left-right"></i> {{ carregando() ? 'Comparando…' : 'Comparar agora' }}
      </button>
      <button class="btn btn-outline-secondary" (click)="salvarSnapshot()" [disabled]="carregando()">
        <i class="bi bi-download"></i> Salvar Snapshot
      </button>
    </div>

    <div *ngIf="!carregando() && !resultado()" class="adm-empty">
      Clique em <strong>Comparar agora</strong> para sincronizar banco × documentação.
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
        <li *ngFor="let i of r.itens" [class]="'db-diff__item db-diff__item--' + getItemStatusClass(i)">
          <span class="db-diff__chip">{{ i.tipo }}</span>
          <strong>{{ i.objeto }}<span *ngIf="i.coluna">.{{ i.coluna }}</span></strong>
          <span class="db-diff__status">{{ getStatusLabel(i.status) }}</span>
          <span class="db-diff__badge ms-2">{{ i.badge }}</span>
          <small *ngIf="i.detalhe">— {{ i.detalhe }}</small>
        </li>
      </ul>
    </div>

    <!-- Snapshot actions -->
    <div class="mt-3 pt-3 border-top" *ngIf="resultado()">
      <h6><i class="bi bi-download"></i> Snapshots</h6>
      <div class="db-diff__controles">
        <input type="text" class="form-control form-control-sm d-inline-block w-auto" [(ngModel)]="snapshotNome" placeholder="Nome do snapshot">
        <button class="btn btn-outline-primary" (click)="salvarSnapshot()" [disabled]="carregando() || !snapshotNome.trim()">
          <i class="bi bi-save"></i> Salvar
        </button>
        <button class="btn btn-outline-secondary" (click)="listarSnapshots()" [disabled]="carregando()">
          <i class="bi bi-list"></i> Listar
        </button>
      </div>
      <ul *ngIf="snapshots().length > 0" class="list-group mt-2">
        <li *ngFor="let s of snapshots()" class="list-group-item d-flex justify-content-between align-items-center">
          {{ s }}
          <button class="btn btn-sm btn-outline-primary" (click)="compararSnapshot(s)">
            <i class="bi bi-arrow-left-right"></i> Comparar
          </button>
        </li>
      </ul>
    </div>
  </div>
  `,
  styles: [`
    .db-diff__controles { display: flex; gap: 1rem; align-items: center; margin: 1rem 0; flex-wrap: wrap; }
    .db-diff__controles input { width: 100px; display: inline-block; }
    .db-diff__resultado h5 { font-weight: 600; }
    .db-diff__lista { list-style: none; padding: 0; margin: 0; }
    .db-diff__item { padding: 0.5rem 0.75rem; border-radius: 0.4rem; margin-bottom: 0.35rem; display: flex; gap: 0.6rem; align-items: center; font-size: 0.9rem; }
    .db-diff__item--nova { background: #fef3c7; color: #92400e; }
    .db-diff__item--removida { background: #fee2e2; color: #991b1b; }
    .db-diff__item--alterada { background: #dbeafe; color: #1e3a8a; }
    .db-diff__item--atualizado { background: #d1fae5; color: #065f46; }
    .db-diff__item--nao-documentado { background: #fef3c7; color: #92400e; }
    .db-diff__chip { background: rgba(0,0,0,0.1); color: inherit; padding: 0.1rem 0.4rem; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 600; }
    .db-diff__status { margin-left: auto; font-weight: 600; }
    .db-diff__badge { font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 0.25rem; background: rgba(0,0,0,0.1); }
  `]
})
export class DbDiferencasComponent {
  private readonly db = inject(DatabaseService);
  readonly resultado = signal<DiffResult | null>(null);
  readonly carregando = signal(false);
  readonly snapshots = signal<string[]>([]);
  limite = 100;
  snapshotNome = '';

  comparar(): void {
    this.carregando.set(true);
    this.db.diferencarSchema(this.limite).subscribe({
      next: (r: DiffResult) => {
        this.resultado.set(r);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  salvarSnapshot(): void {
    if (!this.snapshotNome.trim()) return;
    this.carregando.set(true);
    this.db.salvarSnapshot(this.snapshotNome.trim()).subscribe({
      next: () => {
        this.snapshotNome = '';
        this.carregando.set(false);
        this.listarSnapshots();
      },
      error: () => this.carregando.set(false)
    });
  }

  listarSnapshots(): void {
    this.db.listarSnapshots().subscribe({
      next: (s: string[]) => this.snapshots.set(s),
      error: () => {}
    });
  }

  compararSnapshot(nome: string): void {
    this.carregando.set(true);
    this.db.compararSnapshot(nome).subscribe({
      next: (r: any) => {
        this.resultado.set(r);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  getItemStatusClass(item: DiffItem): string {
    switch (item.status) {
      case 'Nova': return 'nova';
      case 'Removida': return 'removida';
      case 'Alterada': return 'alterada';
      case 'Atualizado': return 'atualizado';
      default: return 'nao-documentado';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Atualizado': return '🟢 Atualizado';
      case 'Nova': return '🟡 Nova';
      case 'Removida': return '🔴 Removida';
      case 'Alterada': return '🟡 Alterada';
      default: return status;
    }
  }
}
