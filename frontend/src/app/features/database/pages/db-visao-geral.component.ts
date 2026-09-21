import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatabaseService } from '../services/database.service';
import { DatabaseInfo } from '../models/database.model';

interface StatCard {
  titulo: string;
  icone: string;
  cor: string;
  valor: (i: DatabaseInfo) => number;
}

interface Atalho {
  rota: string;
  icone: string;
  titulo: string;
  desc: string;
}

@Component({
  selector: 'app-db-visao-geral',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <!-- 1. STATUS DA CONEXÃO (compacto) -->
  <div class="db-visao__status" [class.db-visao__status--ok]="info()?.conectado" *ngIf="info() as i">
    <span class="db-visao__dot" [class.db-visao__dot--ok]="i.conectado"></span>
    <strong>{{ i.conectado ? 'CONECTADO' : 'DESCONECTADO' }}</strong>
    <span class="db-visao__status-sep">·</span>
    <span><i class="bi bi-hdd-network"></i> {{ i.servidor }}</span>
    <span class="db-visao__status-sep">·</span>
    <span><i class="bi bi-database"></i> {{ i.banco }}</span>
    <span class="db-visao__status-sep" *ngIf="i.versaoSqlServer">·</span>
    <span *ngIf="i.versaoSqlServer" class="db-visao__status-muted">{{ i.versaoSqlServer }}</span>
    <a class="db-visao__config-link" routerLink="../configuracao" title="Abrir configuração da conexão">
      <i class="bi bi-gear-fill"></i> Configuração
    </a>
  </div>
  <div class="db-visao__status" *ngIf="!info()">
    <span class="db-visao__dot"></span>
    <strong>DESCONECTADO</strong>
    <span class="db-visao__status-muted">— verifique a configuração da conexão</span>
    <a class="db-visao__config-link" routerLink="../configuracao">
      <i class="bi bi-gear-fill"></i> Configuração
    </a>
  </div>

  <!-- 2. CARDS DE ESTATÍSTICAS (dados reais do SQL Server) -->
  <div class="db-visao__stats" *ngIf="info() as i">
    <article class="db-visao__stat" *ngFor="let c of cards">
      <div class="db-visao__stat-icone" [style.background]="c.cor">
        <i class="bi" [ngClass]="c.icone"></i>
      </div>
      <div>
        <span class="db-visao__stat-titulo">{{ c.titulo }}</span>
        <strong class="db-visao__stat-valor">{{ c.valor(i) | number }}</strong>
      </div>
    </article>
  </div>

  <div class="db-visao__duas-colunas">
    <div>
      <!-- 3. RELACIONAMENTOS (resumo real) -->
      <section class="adm-card db-visao__bloco" *ngIf="relCarregado()">
        <h3 class="db-visao__bloco-titulo"><i class="bi bi-share"></i> Relacionamentos</h3>
        <div class="db-visao__rel-linha">
          <span class="adm-badge adm-badge--success" title="Existe FK física no SQL Server">{{ relConfirmadas() | number }} FKs confirmadas</span>
          <span class="adm-badge adm-badge--warning" *ngIf="relPossiveis() > 0"
            title="Sem FK física, mas com indícios de relacionamento">{{ relPossiveis() | number }} possíveis identificados</span>
        </div>
        <a routerLink="../relacionamentos" class="db-visao__ver-tudo">Explorar relacionamentos <i class="bi bi-arrow-right"></i></a>
      </section>

      <!-- 4. ACESSO RÁPIDO -->
      <section class="adm-card db-visao__bloco">
        <h3 class="db-visao__bloco-titulo"><i class="bi bi-lightning-charge"></i> Acesso rápido</h3>
        <div class="db-visao__atalhos">
          <a *ngFor="let a of atalhos" class="db-visao__atalho" [routerLink]="a.rota">
            <i class="bi" [ngClass]="a.icone"></i>
            <div>
              <strong>{{ a.titulo }}</strong>
              <small>{{ a.desc }}</small>
            </div>
          </a>
        </div>
      </section>
    </div>

    <!-- 5. CONEXÃO (card compacto, sem credenciais) -->
    <aside class="adm-card db-visao__bloco db-visao__conexao" *ngIf="info() as i">
      <h3 class="db-visao__bloco-titulo"><i class="bi bi-plug-fill"></i> Conexão</h3>
      <p class="db-visao__conexao-estado">
        <span class="db-visao__dot" [class.db-visao__dot--ok]="i.conectado"></span>
        {{ i.conectado ? 'Conectado' : 'Desconectado' }}
      </p>
      <dl class="db-visao__conexao-lista">
        <div><dt>Servidor</dt><dd>{{ i.servidor }}</dd></div>
        <div><dt>Banco</dt><dd>{{ i.banco }}</dd></div>
        <div *ngIf="i.usuario"><dt>Usuário</dt><dd>{{ i.usuario }}</dd></div>
        <div *ngIf="i.versaoSqlServer"><dt>Versão</dt><dd>{{ i.versaoSqlServer }}</dd></div>
        <div><dt>Última atualização</dt><dd>{{ i.ultimaConsulta | date:'dd/MM HH:mm' }}</dd></div>
        <div><dt>Tempo de resposta</dt><dd>{{ i.duracaoMs }} ms</dd></div>
      </dl>
      <p *ngIf="i.mensagemErro" class="text-danger small">{{ i.mensagemErro }}</p>
      <p *ngIf="testeMsg()" class="small" [class.text-success]="testeOk()" [class.text-danger]="!testeOk()">{{ testeMsg() }}</p>
      <div class="db-visao__conexao-acoes">
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="testar()" [disabled]="testando()">
          <i class="bi bi-arrow-repeat"></i> {{ testando() ? 'Testando…' : 'Testar conexão' }}
        </button>
        <a class="btn btn-sm btn-outline-secondary" routerLink="../configuracao">
          <i class="bi bi-gear-fill"></i> Configuração
        </a>
      </div>
    </aside>
  </div>
  `,
  styles: [`
    .db-visao__status {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem;
      padding: 0.5rem 0.9rem; margin-bottom: 0.75rem; font-size: 0.85rem;
    }
    .db-visao__status--ok { border-left: 4px solid #16a34a; }
    .db-visao__dot { width: 0.65rem; height: 0.65rem; border-radius: 50%; background: #dc2626; flex: 0 0 auto; }
    .db-visao__dot--ok { background: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18); }
    .db-visao__status-sep { color: #cbd5e1; }
    .db-visao__status-muted { color: #64748b; font-size: 0.8rem; }
    .db-visao__config-link { margin-left: auto; font-size: 0.82rem; white-space: nowrap; }

    .db-visao__stats {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.6rem; margin-bottom: 0.75rem;
    }
    .db-visao__stat {
      display: flex; align-items: center; gap: 0.6rem;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem;
      padding: 0.55rem 0.7rem; min-width: 0;
    }
    .db-visao__stat-icone {
      display: flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem; border-radius: 0.4rem; color: #fff; flex: 0 0 auto;
    }
    .db-visao__stat-titulo { display: block; font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
    .db-visao__stat-valor { font-size: 1.25rem; font-weight: 700; color: #0f172a; line-height: 1.2; }

    .db-visao__duas-colunas { display: grid; grid-template-columns: 1fr 300px; gap: 0.75rem; align-items: start; }
    .db-visao__bloco { padding: 0.9rem 1rem; margin-bottom: 0.75rem; }
    .db-visao__bloco-titulo { font-size: 0.95rem; font-weight: 700; margin: 0 0 0.6rem; color: #0f172a; }
    .db-visao__rel-linha { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .db-visao__ver-tudo { font-size: 0.82rem; }

    .db-visao__atalhos { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.5rem; }
    .db-visao__atalho {
      display: flex; align-items: flex-start; gap: 0.6rem;
      border: 1px solid #e2e8f0; border-radius: 0.45rem; padding: 0.55rem 0.7rem;
      color: inherit; text-decoration: none; transition: border-color 0.12s, background 0.12s;
    }
    .db-visao__atalho:hover { border-color: #0f4c81; background: #f0f7ff; }
    .db-visao__atalho > i { font-size: 1.15rem; color: #0f4c81; }
    .db-visao__atalho strong { display: block; font-size: 0.85rem; }
    .db-visao__atalho small { color: #64748b; font-size: 0.76rem; }

    .db-visao__conexao-estado { display: flex; align-items: center; gap: 0.45rem; font-weight: 600; margin: 0 0 0.5rem; }
    .db-visao__conexao-lista { margin: 0 0 0.6rem; font-size: 0.82rem; }
    .db-visao__conexao-lista > div { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.2rem 0; border-bottom: 1px dashed #f1f5f9; }
    .db-visao__conexao-lista dt { color: #64748b; font-weight: 500; }
    .db-visao__conexao-lista dd { margin: 0; font-weight: 600; text-align: right; word-break: break-all; }
    .db-visao__conexao-acoes { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    @media (max-width: 992px) { .db-visao__duas-colunas { grid-template-columns: 1fr; } }
  `]
})
export class DbVisaoGeralComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  readonly info = signal<DatabaseInfo | null>(null);
  readonly relConfirmadas = signal(0);
  readonly relPossiveis = signal(0);
  readonly relCarregado = signal(false);
  readonly testando = signal(false);
  readonly testeMsg = signal('');
  readonly testeOk = signal(false);

  readonly cards: StatCard[] = [
    { titulo: 'Tabelas', icone: 'bi-table', cor: '#16a34a', valor: i => i.quantidadeTabelas },
    { titulo: 'Colunas', icone: 'bi-list-columns', cor: '#7c3aed', valor: i => i.quantidadeColunas },
    { titulo: 'PKs', icone: 'bi-key-fill', cor: '#d97706', valor: i => i.quantidadePks },
    { titulo: 'FKs', icone: 'bi-link-45deg', cor: '#0f4c81', valor: i => i.quantidadeFks },
    { titulo: 'Índices', icone: 'bi-bookmark-star', cor: '#0891b2', valor: i => i.quantidadeIndices },
    { titulo: 'Views', icone: 'bi-eye', cor: '#be185d', valor: i => i.quantidadeViews },
    { titulo: 'Procedures', icone: 'bi-lightning-charge-fill', cor: '#475569', valor: i => i.quantidadeProcedures },
    { titulo: 'Functions', icone: 'bi-funnel-fill', cor: '#5b21b6', valor: i => i.quantidadeFunctions },
    { titulo: 'Triggers', icone: 'bi-exclamation-triangle-fill', cor: '#b91c1c', valor: i => i.quantidadeTriggers }
  ];

  readonly atalhos: Atalho[] = [
    { rota: '../explorador', icone: 'bi-search', titulo: 'Explorar', desc: 'Encontrar tabelas, colunas e objetos.' },
    { rota: '../relacionamentos', icone: 'bi-share', titulo: 'Relacionamentos', desc: 'Explorar relacionamentos entre tabelas.' },
    { rota: '../consultas', icone: 'bi-terminal', titulo: 'Consultas', desc: 'Executar consultas SELECT.' },
    { rota: '../diferencas', icone: 'bi-arrow-left-right', titulo: 'Diferenças', desc: 'Comparar banco atual com documentação.' }
  ];

  ngOnInit(): void {
    this.db.info().subscribe({
      next: i => this.info.set(i),
      error: () => this.info.set(null)
    });
    // Resumo de relacionamentos (dados reais; seção oculta se falhar)
    this.db.relacionamentos(undefined, true, 5000).pipe(catchError(() => of([]))).subscribe(lista => {
      if (lista.length > 0) {
        this.relConfirmadas.set(lista.filter(r => r.tipo === 'Confirmada').length);
        this.relPossiveis.set(lista.filter(r => r.tipo !== 'Confirmada').length);
        this.relCarregado.set(true);
      }
    });
  }

  testar(): void {
    this.testando.set(true);
    this.testeMsg.set('');
    this.db.testarConexao().subscribe({
      next: s => {
        this.testeOk.set(s.conectado);
        this.testeMsg.set(s.conectado
          ? `Conexão OK (${s.servidor ?? ''} / ${s.banco ?? ''}).`
          : `Falha: ${s.mensagem ?? 'sem resposta do servidor'}.`);
        this.testando.set(false);
      },
      error: () => {
        this.testeOk.set(false);
        this.testeMsg.set('Falha: backend indisponível.');
        this.testando.set(false);
      }
    });
  }
}
