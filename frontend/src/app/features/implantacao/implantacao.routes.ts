import { Routes } from '@angular/router';

export const implantacaoRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'kanban',
    loadComponent: () => import('./pages/kanban/kanban.component').then(m => m.KanbanComponent)
  },
  {
    path: 'projetos',
    loadComponent: () => import('./pages/projetos/projetos.component').then(m => m.ProjetosComponent)
  },
  {
    path: 'projetos/:id',
    loadComponent: () => import('./pages/projetos/projeto-detalhe.component').then(m => m.ProjetoDetalheComponent)
  },
  {
    path: 'tarefas',
    loadComponent: () => import('./pages/tarefas/tarefas.component').then(m => m.TarefasComponent)
  },
  {
    path: 'agenda',
    redirectTo: '/agenda',
    pathMatch: 'full'
  },
  {
    path: 'cadastros',
    loadComponent: () => import('./pages/cadastros/cadastros.component').then(m => m.CadastrosComponent)
  }
];
