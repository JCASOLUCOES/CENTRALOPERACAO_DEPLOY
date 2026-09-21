import { Routes } from '@angular/router';
import { KanbanComponent } from '../implantacao/pages/kanban/kanban.component';
import { TarefasComponent } from '../implantacao/pages/tarefas/tarefas.component';
import { ProjetosComponent } from '../implantacao/pages/projetos/projetos.component';
import { AdminDashboardComponent } from './pages/dashboard/admin-dashboard.component';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
  },
  {
    path: 'kanban',
    component: KanbanComponent,
  },
  {
    path: 'tarefas',
    component: TarefasComponent,
  },
  {
    path: 'projetos',
    component: ProjetosComponent,
  },
];