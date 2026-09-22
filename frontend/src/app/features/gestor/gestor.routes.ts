import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { GestorPermissionService } from './services/gestor-permission.service';
import { GestorLayoutComponent } from './components/gestor-layout/gestor-layout.component';

export const gestorRoutes: Routes = [
  // Tela de escolha (entrada) fica em app.routes.ts (full-screen, fora do MainLayout).
  // Painéis CEO/COO/CTO - com layout wrapper e navegação interna
  {
    path: '',
    component: GestorLayoutComponent,
    canActivate: [() => inject(GestorPermissionService).podeAcessarGestor()],
    children: [
      { path: '', redirectTo: 'ceo', pathMatch: 'full' },
      { path: 'ceo', loadComponent: () => import('./pages/ceo-dashboard/ceo-dashboard.component').then(m => m.CeoDashboardComponent), canActivate: [() => inject(GestorPermissionService).podeAcessarPainel('ceo')] },
      { path: 'cto', loadComponent: () => import('./pages/cto-dashboard/cto-dashboard.component').then(m => m.CtoDashboardComponent), canActivate: [() => inject(GestorPermissionService).podeAcessarPainel('cto')] },
      { path: 'coo', loadComponent: () => import('./pages/coo-dashboard/coo-dashboard.component').then(m => m.CooDashboardComponent), canActivate: [() => inject(GestorPermissionService).podeAcessarPainel('coo')] }
    ]
  }
];