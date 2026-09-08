import { Routes } from '@angular/router';

export const databaseRoutes: Routes = [
  { path: '', redirectTo: 'visao-geral', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./database-shell.component').then(m => m.DatabaseShellComponent),
    children: [
      { path: 'visao-geral', loadComponent: () => import('./pages/db-visao-geral.component').then(m => m.DbVisaoGeralComponent) },
      { path: 'explorador', loadComponent: () => import('./pages/db-explorador.component').then(m => m.DbExploradorComponent) },
      { path: 'relacionamentos', loadComponent: () => import('./pages/db-relacionamentos.component').then(m => m.DbRelacionamentosComponent) },
      { path: 'diagrama', loadComponent: () => import('./pages/db-diagrama.component').then(m => m.DbDiagramaComponent) },
      { path: 'consultas', loadComponent: () => import('./pages/db-consultas.component').then(m => m.DbConsultasComponent) },
      { path: 'diferencas', loadComponent: () => import('./pages/db-diferencas.component').then(m => m.DbDiferencasComponent) },
      { path: 'configuracao', loadComponent: () => import('./pages/db-configuracao.component').then(m => m.DbConfiguracaoComponent) }
    ]
  }
];
