import { Routes } from '@angular/router';
import { KanbanComponent } from '../implantacao/pages/kanban/kanban.component';
import { TarefasComponent } from '../implantacao/pages/tarefas/tarefas.component';
import { ProjetosComponent } from '../implantacao/pages/projetos/projetos.component';
import { TiposProjetoComponent } from './pages/cadastros/tipos-projeto.component';
import { TipoProjetoFormComponent } from './pages/cadastros/tipo-projeto-form.component';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'cadastros',
    pathMatch: 'full',
  },
  {
    path: 'cadastros',
    children: [
      { path: '', redirectTo: 'tipos-projeto', pathMatch: 'full' },
      { path: 'tipos-projeto', component: TiposProjetoComponent },
      { path: 'tipos-projeto/novo', component: TipoProjetoFormComponent },
      { path: 'tipos-projeto/editar/:id', component: TipoProjetoFormComponent },
    ]
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