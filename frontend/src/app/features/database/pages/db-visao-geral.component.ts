import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { DatabaseInfo } from '../models/database.model';

@Component({
  selector: 'app-db-visao-geral',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="adm-grid">
    <article class="adm-card" *ngIf="info() as i">
      <div class="adm-card__icone" style="background: #0f4c81">
        <i class="bi bi-server"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Banco conectado</h3>
        <p class="adm-card__desc">{{ i.servidor }} / {{ i.banco }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #16a34a">
        <i class="bi bi-columns-gap"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Tabelas</h3>
        <p class="adm-card__desc" style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadeTabelas ?? '—' }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #7c3aed">
        <i class="bi bi-list-columns"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Colunas</h3>
        <p class="adm-card__desc" style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadeColunas ?? '—' }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #d97706">
        <i class="bi bi-key-fill"></i>
      </div>
      <div>
        <h3 class="adm-card__title">PKs · FKs</h3>
        <p class="adm-card__desc" style="font-size: 1.4rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadePks ?? '—' }} · {{ info()?.quantidadeFks ?? '—' }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #0891b2">
        <i class="bi bi-bookmark-star"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Índices</h3>
        <p class="adm-card__desc" style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadeIndices ?? '—' }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #be185d">
        <i class="bi bi-eye"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Views</h3>
        <p class="adm-card__desc" style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadeViews ?? '—' }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #475569">
        <i class="bi bi-gear-fill"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Procedures</h3>
        <p class="adm-card__desc" style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadeProcedures ?? '—' }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #5b21b6">
        <i class="bi bi-funnel-fill"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Functions</h3>
        <p class="adm-card__desc" style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadeFunctions ?? '—' }}</p>
      </div>
    </article>

    <article class="adm-card">
      <div class="adm-card__icone" style="background: #b91c1c">
        <i class="bi bi-lightning-charge-fill"></i>
      </div>
      <div>
        <h3 class="adm-card__title">Triggers</h3>
        <p class="adm-card__desc" style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">{{ info()?.quantidadeTriggers ?? '—' }}</p>
      </div>
    </article>
  </div>

  <div class="adm-card db-visao__detalhes" *ngIf="info() as i">
    <h3 class="adm-card__title">Detalhes da conexão</h3>
    <p><strong>Servidor:</strong> {{ i.servidor }}</p>
    <p><strong>Banco:</strong> {{ i.banco }}</p>
    <p *ngIf="i.versaoSqlServer"><strong>Versão SQL Server:</strong> {{ i.versaoSqlServer }}</p>
    <p *ngIf="i.usuario"><strong>Usuário conectado:</strong> {{ i.usuario }}</p>
    <p><strong>Última consulta:</strong> {{ i.ultimaConsulta | date:'dd/MM/yyyy HH:mm:ss' }}</p>
    <p><strong>Duração da última consulta:</strong> {{ i.duracaoMs }} ms</p>
    <p *ngIf="i.mensagemErro" class="text-danger"><strong>Erro:</strong> {{ i.mensagemErro }}</p>
  </div>
  `,
  styles: [`
    .db-visao__detalhes {
      margin-top: 1.5rem;
      padding: 1.25rem 1.5rem;
    }
    .db-visao__detalhes p { margin: 0.4rem 0; }
  `]
})
export class DbVisaoGeralComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  readonly info = signal<DatabaseInfo | null>(null);

  ngOnInit(): void {
    this.db.info().subscribe({
      next: i => this.info.set(i),
      error: () => this.info.set(null)
    });
  }
}
