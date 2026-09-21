import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { PerfilUsuario } from '@core/models/auth.model';
import { APP_VERSION } from '@shared/meta/app-version';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements OnInit {
  perfil: PerfilUsuario | null = null;
  currentUser: import('@core/models/auth.model').Usuario | null = null;
  versao: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser() ?? null;
    this.perfil = this.currentUser?.perfil ?? null;
    this.versao = APP_VERSION;
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
}