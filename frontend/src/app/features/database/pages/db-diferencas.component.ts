import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { DatabaseTable } from '../models/database.model';
import { DbSincronizacaoComponent } from '../components/db-sincronizacao.component';

@Component({
  selector: 'app-db-diferencas',
  standalone: true,
  imports: [CommonModule, DbSincronizacaoComponent],
  template: `
    <app-db-sincronizacao [tabelas]="tabelas()"></app-db-sincronizacao>
  `
})
export class DbDiferencasComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  readonly tabelas = signal<DatabaseTable[]>([]);

  ngOnInit(): void {
    this.db.listarTabelas().subscribe({
      next: t => this.tabelas.set(t),
      error: () => {}
    });
  }
}
