import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DatabaseService } from './services/database.service';

interface DbTab {
  rota: string;
  rotulo: string;
  icone: string;
  admin?: boolean;
}

@Component({
  selector: 'app-database-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './database-shell.component.html',
  styleUrl: './database-shell.component.scss'
})
export class DatabaseShellComponent {
  private readonly db = inject(DatabaseService);
  private readonly router = inject(Router);

  readonly status = signal<{ conectado: boolean; servidor?: string; banco?: string; mensagem?: string }>({ conectado: false });
  readonly contadores = signal<{ tabelas: number; procedures: number; views: number }>({ tabelas: 0, procedures: 0, views: 0 });

  readonly tabs: DbTab[] = [
    { rota: 'visao-geral',  rotulo: 'Visão Geral',     icone: 'bi-speedometer2' },
    { rota: 'explorador',   rotulo: 'Explorador',      icone: 'bi-diagram-3-fill' },
    { rota: 'relacionamentos', rotulo: 'Relacionamentos', icone: 'bi-share' },
    { rota: 'diagrama',     rotulo: 'Diagrama',        icone: 'bi-grid-3x3' },
    { rota: 'consultas',    rotulo: 'Consultas',       icone: 'bi-terminal' },
    { rota: 'diferencas',   rotulo: 'Diferenças',      icone: 'bi-arrow-left-right' },
    { rota: 'configuracao', rotulo: 'Configuração',    icone: 'bi-gear-fill' }
  ];

  ngOnInit(): void {
    this.db.status().subscribe({
      next: s => this.status.set({ conectado: s.conectado, servidor: s.servidor, banco: s.banco, mensagem: s.mensagem }),
      error: () => this.status.set({ conectado: false, mensagem: 'Backend indisponível' })
    });
    // Carrega contadores para o banner (silencioso se falhar)
    this.db.info().subscribe({
      next: i => this.contadores.set({
        tabelas: i.quantidadeTabelas,
        procedures: i.quantidadeProcedures + i.quantidadeFunctions,
        views: i.quantidadeViews
      }),
      error: () => {}
    });
  }

  irParaConfigSeDesconectado(): void {
    if (!this.status().conectado) {
      this.router.navigate(['/database/configuracao']);
    }
  }
}
