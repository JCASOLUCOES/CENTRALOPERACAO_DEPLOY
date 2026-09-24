import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { PerfilUsuario } from '@core/models/auth.model';
import { APP_VERSION } from '@shared/meta/app-version';
import { APP_CONFIG } from '@shared/config/app-config';
import { BreadcrumbComponent } from '@layout/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements OnInit {
  perfil: PerfilUsuario | null = null;
  currentUser: import('@core/models/auth.model').Usuario | null = null;
  readonly versao = APP_VERSION;
  readonly appConfig = APP_CONFIG;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser() ?? null;
    this.perfil = this.currentUser?.perfil ?? null;
  }

  irParaCentral(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    this.authService.logout();
  }

  getIniciais(): string {
    if (!this.currentUser?.nome) return '--';
    const partes = this.currentUser.nome.split(' ');
    const inicial = partes[0]?.charAt(0)?.toUpperCase() ?? '';
    return inicial;
  }

  formatNome(nome: string): string {
    return nome
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }
}