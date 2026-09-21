import { Routes } from '@angular/router';

export const executivoRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/executivo-dashboard/executivo-dashboard.component').then(
        m => m.ExecutivoDashboardComponent
      ),
    title: 'Central Executiva'
  }
];
