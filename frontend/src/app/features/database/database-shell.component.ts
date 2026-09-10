import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DatabaseService } from './services/database.service';
import { DbGlobalSearchComponent } from './components/db-global-search.component';

interface DbTab {
  rota: string;
  rotulo: string;
  icone: string;
  admin?: boolean;
}

type Ambiente = 'DEV' | 'HML' | 'PROD' | 'DESCONHECIDO';

@Component({
  selector: 'app-database-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, DbGlobalSearchComponent],
  templateUrl: './database-shell.component.html',
  styleUrl: './database-shell.component.scss'
})
export class DatabaseShellComponent {
  private readonly db = inject(DatabaseService);
  private readonly router = inject(Router);

  readonly status = signal<{ conectado: boolean; servidor?: string; banco?: string; mensagem?: string; usuario?: string }>({ conectado: false });
  readonly contadores = signal<{ tabelas: number; procedures: number; views: number }>({ tabelas: 0, procedures: 0, views: 0 });
  readonly conexaoInfo = signal<{ servidor?: string; banco?: string; usuario?: string }>({});

  readonly tabs: DbTab[] = [
    { rota: 'visao-geral',  rotulo: 'Visão Geral',     icone: 'bi-speedometer2' },
    { rota: 'explorador',   rotulo: 'Explorador',      icone: 'bi-diagram-3-fill' },
    { rota: 'relacionamentos', rotulo: 'Relacionamentos', icone: 'bi-share' },
    { rota: 'diagrama',     rotulo: 'Diagrama',        icone: 'bi-grid-3x3' },
    { rota: 'consultas',    rotulo: 'Consultas',       icone: 'bi-terminal' },
    { rota: 'query-builder', rotulo: 'Query Builder',  icone: 'bi-diagram-3' },
    { rota: 'diferencas',   rotulo: 'Diferenças',      icone: 'bi-arrow-left-right' },
    { rota: 'ia-chat',      rotulo: 'IA Chat',         icone: 'bi-robot' },
    { rota: 'configuracao', rotulo: 'Configuração',    icone: 'bi-gear-fill' }
  ];

  readonly ambiente = computed<Ambiente>(() => {
    const banco = this.conexaoInfo().banco?.toLowerCase() || '';
    const servidor = this.conexaoInfo().servidor?.toLowerCase() || '';
    if (banco.includes('dev') || banco.includes('teste') || servidor.includes('dev')) return 'DEV';
    if (banco.includes('hml') || banco.includes('homolog') || servidor.includes('hml')) return 'HML';
    if (banco.includes('prod') || banco.includes('production') || servidor.includes('prod')) return 'PROD';
    return 'DESCONHECIDO';
  });

  readonly ambienteBadgeClass = computed<string>(() => {
    switch (this.ambiente()) {
      case 'DEV': return 'bg-warning text-dark';
      case 'HML': return 'bg-danger';
      case 'PROD': return 'bg-success';
      default: return 'bg-secondary';
    }
  });

  readonly ambienteIcon = computed<string>(() => {
    switch (this.ambiente()) {
      case 'DEV': return 'bi-exclamation-triangle';
      case 'HML': return 'bi-shield-fill-exclamation';
      case 'PROD': return 'bi-shield-check';
      default: return 'bi-question-circle';
    }
  });

  ngOnInit(): void {
    this.db.status().subscribe({
      next: s => {
        this.status.set({ conectado: s.conectado, servidor: s.servidor, banco: s.banco, mensagem: s.mensagem, usuario: s.usuario });
        this.conexaoInfo.set({ servidor: s.servidor, banco: s.banco, usuario: s.usuario });
      },
      error: () => this.status.set({ conectado: false, mensagem: 'Backend indisponível' })
    });
    // Carrega contadores para o banner (silencioso se falhar)
    this.db.info().subscribe({
      next: i => {
        this.contadores.set({
          tabelas: i.quantidadeTabelas,
          procedures: i.quantidadeProcedures + i.quantidadeFunctions,
          views: i.quantidadeViews
        });
        this.conexaoInfo.update(c => ({ ...c, usuario: i.usuario }));
      },
      error: () => {}
    });
  }

  irParaConfigSeDesconectado(): void {
    if (!this.status().conectado) {
      this.router.navigate(['/database/configuracao']);
    }
  }
}
