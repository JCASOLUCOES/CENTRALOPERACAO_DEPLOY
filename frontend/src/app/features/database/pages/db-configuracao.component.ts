import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { DatabaseConnectionConfig, DatabaseStatus } from '../models/database.model';

@Component({
  selector: 'app-db-configuracao',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="adm-card db-cfg">
    <div class="db-cfg__head">
      <i class="bi bi-shield-lock-fill"></i>
      <div>
        <h3 class="adm-card__title">Conexão SQL Server</h3>
        <p class="db-cfg__sub">
          Configuração gerenciada pelo administrador (variáveis de ambiente / user-secrets).
          <strong>Não editável</strong> pela interface — sempre aponta para o banco padrão do Actyon.
        </p>
      </div>
    </div>

    <div class="db-cfg__grid" *ngIf="cfg() as c">
      <div class="db-cfg__campo">
        <label>Servidor / IP</label>
        <div class="db-cfg__valor">
          <i class="bi bi-hdd-network"></i>
          <code>{{ c.servidor }}</code>
        </div>
      </div>
      <div class="db-cfg__campo">
        <label>Porta</label>
        <div class="db-cfg__valor">
          <i class="bi bi-ethernet"></i>
          <code>{{ c.porta }}</code>
        </div>
      </div>
      <div class="db-cfg__campo db-cfg__campo--full">
        <label>Banco de dados</label>
        <div class="db-cfg__valor">
          <i class="bi bi-database-fill"></i>
          <code>{{ c.banco }}</code>
        </div>
      </div>
      <div class="db-cfg__campo">
        <label>Usuário</label>
        <div class="db-cfg__valor">
          <i class="bi bi-person-fill"></i>
          <code>{{ c.usuario }}</code>
        </div>
      </div>
      <div class="db-cfg__campo">
        <label>Senha</label>
        <div class="db-cfg__valor">
          <i class="bi bi-key-fill"></i>
          <code>{{ c.senha || '•••••••• (env var / user-secrets)' }}</code>
        </div>
      </div>
      <div class="db-cfg__campo">
        <label>Conexão segura</label>
        <div class="db-cfg__valor">
          <i class="bi" [ngClass]="c.encrypt ? 'bi-shield-check' : 'bi-shield'"></i>
          <code>{{ c.encrypt ? 'Encrypt ON' : 'Encrypt OFF' }} · Trust {{ c.trustServerCertificate ? 'ON' : 'OFF' }}</code>
        </div>
      </div>
    </div>

    <div class="db-cfg__acoes">
      <button type="button" class="adm-btn adm-btn--primary" (click)="testar()" [disabled]="testando()">
        <i class="bi bi-broadcast"></i> {{ testando() ? 'Testando…' : 'Testar conexão' }}
      </button>
    </div>

    <div *ngIf="status() as s" class="alert mt-3" [class.alert-success]="s.conectado" [class.alert-danger]="!s.conectado">
      <strong>
        <i class="bi" [ngClass]="s.conectado ? 'bi-check-circle-fill' : 'bi-x-octagon-fill'"></i>
        {{ s.conectado ? 'Conexão bem-sucedida' : 'Falha na conexão' }}
      </strong>
      <div *ngIf="s.mensagem" class="mt-1">{{ s.mensagem }}</div>
      <small *ngIf="s.conectado" class="d-block mt-1">
        Última verificação: {{ s.ultimaConsulta | date:'dd/MM/yyyy HH:mm:ss' }} · {{ s.duracaoMs }} ms
      </small>
    </div>

    <div class="db-cfg__info">
      <h6><i class="bi bi-info-circle"></i> Como a senha chega no servidor</h6>
      <p>A senha <strong>não é digitada pela interface</strong> e não fica em <code>appsettings.json</code>. Ela é lida na ordem:</p>
      <ol>
        <li>Variável de ambiente <code>DB_EXPLORER_SENHA</code> (produção - IIS Application Pool)</li>
        <li>Seção <code>DatabaseExplorer:Senha</code> do <code>appsettings.Development.json</code> (dev)</li>
        <li>User-secrets do <code>dotnet</code> (dev local): <code>dotnet user-secrets set "DatabaseExplorer:Senha" "..."</code></li>
      </ol>
      <p class="db-cfg__info-foot">
        Para setar no IIS: <strong>IIS Manager → Application Pools → Suporte_Back → Advanced Settings → Environment Variables</strong> → adicionar <code>DB_EXPLORER_SENHA</code> com a senha real. Reciclar o pool.
      </p>
    </div>
  </div>
  `,
  styles: [`
    .db-cfg { padding: 1.5rem 1.75rem; }
    .db-cfg__head {
      display: flex; gap: 0.75rem; align-items: flex-start;
      margin-bottom: 1.5rem; padding-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .db-cfg__head > i {
      font-size: 1.6rem; color: #0f4c81;
      padding: 0.3rem; background: #eff6ff; border-radius: 0.5rem;
    }
    .db-cfg__sub { color: #64748b; font-size: 0.88rem; margin: 0.25rem 0 0; }
    .db-cfg__grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem 1.25rem;
      margin-bottom: 1rem;
    }
    .db-cfg__campo--full { grid-column: 1 / -1; }
    .db-cfg__campo label {
      display: block; font-size: 0.7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #64748b; margin-bottom: 0.2rem;
    }
    .db-cfg__valor {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.4rem;
      font-size: 0.9rem;
    }
    .db-cfg__valor i { color: #64748b; }
    .db-cfg__valor code { font-family: 'IBM Plex Mono', monospace; font-size: 0.85rem; color: #1e293b; }
    .db-cfg__acoes {
      display: flex; gap: 0.5rem; margin: 1rem 0 0;
    }
    .db-cfg__info {
      margin-top: 1.5rem; padding: 1rem 1.25rem;
      background: #eff6ff; border-radius: 0.5rem; border: 1px solid #bfdbfe;
    }
    .db-cfg__info h6 {
      display: flex; align-items: center; gap: 0.4rem;
      font-weight: 700; color: #1e40af; margin: 0 0 0.5rem;
    }
    .db-cfg__info p { font-size: 0.85rem; color: #1e3a8a; margin: 0.3rem 0; }
    .db-cfg__info ol { font-size: 0.85rem; color: #1e3a8a; padding-left: 1.4rem; }
    .db-cfg__info code { background: rgba(255,255,255,0.5); padding: 0 0.25rem; border-radius: 0.2rem; }
    .db-cfg__info-foot { font-size: 0.82rem !important; }

    .adm-btn {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.5rem 0.9rem; font-size: 0.88rem; font-weight: 500;
      border-radius: 0.4rem; border: 1px solid #cbd5e1; background: #fff; color: #1e293b;
      cursor: pointer; transition: background 0.12s;
    }
    .adm-btn:hover:not(:disabled) { background: #f1f5f9; }
    .adm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .adm-btn--primary { background: #0f4c81; color: #fff; border-color: #0f4c81; }
    .adm-btn--primary:hover:not(:disabled) { background: #0c3d68; border-color: #0c3d68; }

    @media (max-width: 768px) { .db-cfg__grid { grid-template-columns: 1fr; } }
  `]
})
export class DbConfiguracaoComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  cfg = signal<DatabaseConnectionConfig | null>(null);
  readonly status = signal<DatabaseStatus | null>(null);
  readonly testando = signal(false);

  ngOnInit(): void {
    this.db.obterConfig().subscribe({
      next: c => this.cfg.set(c),
      error: () => {}
    });
  }

  testar(): void {
    this.testando.set(true);
    this.status.set(null);
    this.db.testarConexao().subscribe({
      next: s => { this.status.set(s); this.testando.set(false); },
      error: () => { this.testando.set(false); }
    });
  }
}
