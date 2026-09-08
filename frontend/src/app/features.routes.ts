import { Routes } from '@angular/router';

export const featuresRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('@features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'ferramentas',
    children: [
      {
        path: '',
        loadComponent: () => import('@features/ferramentas/ferramentas.component').then(m => m.FerramentasComponent)
      },
      {
        path: 'detalhe/:id',
        loadComponent: () => import('@features/ferramentas/ferramenta-detalhe.component').then(m => m.FerramentaDetalheComponent)
      },
      {
        path: 'acessos',
        loadComponent: () => import('@features/acessos/acessos.component').then(m => m.AcessosComponent)
      },
      { path: 'contra-senha', redirectTo: '', pathMatch: 'full' },
      { path: 'modelos', redirectTo: '/modelo-chamados', pathMatch: 'full' },
      {
        path: 'faq',
        loadComponent: () => import('@features/faq/faq.component').then(m => m.FaqComponent)
      }
    ]
  },
  {
    path: 'stack',
    loadComponent: () => import('@features/stack/stack.component').then(m => m.StackComponent)
  },
  {
    path: 'agenda',
    loadComponent: () => import('@features/agenda/agenda.component').then(m => m.AgendaComponent)
  },
  {
    path: 'cursos',
    loadComponent: () => import('@features/cursos/cursos.component').then(m => m.CursosComponent)
  },
  {
    path: 'cursos/detalhe/:id',
    loadComponent: () => import('@features/cursos/curso-detalhe.component').then(m => m.CursoDetalheComponent)
  },
  {
    path: 'trilhas/resolver',
    loadComponent: () => import('@features/trilhas/trilhas.component').then(m => m.TrilhasComponent)
  },
  {
    path: 'trilhas/sql',
    loadComponent: () => import('@features/trilha-sql/trilha-sql.component').then(m => m.TrilhaSqlComponent)
  },
  {
    path: 'trilhas/rede',
    loadComponent: () => import('@features/trilha-rede/trilha-rede.component').then(m => m.TrilhaRedeComponent)
  },
  {
    path: 'trilhas/infra',
    loadComponent: () => import('@features/trilha-infra/trilha-infra.component').then(m => m.TrilhaInfraComponent)
  },
  {
    path: 'visao-adm',
    loadComponent: () => import('@features/visao-adm/visao-adm.component').then(m => m.VisaoAdmComponent)
  },
  {
    path: 'visao-adm/detalhe/:id',
    loadComponent: () => import('@features/visao-adm/visao-adm-detalhe.component').then(m => m.VisaoAdmDetalheComponent)
  },
  {
    path: 'fraseologia',
    loadComponent: () => import('@features/fraseologia/fraseologia.component').then(m => m.FraseologiaComponent)
  },
  {
    path: 'modelo-chamados',
    loadComponent: () => import('@features/modelo-chamados/modelo-chamados.component').then(m => m.ModeloChamadosComponent)
  },
  {
    path: 'politica',
    loadComponent: () => import('@features/politica/politica.component').then(m => m.PoliticaComponent)
  },
  { path: 'whatsapp-flow', redirectTo: 'fraseologia', pathMatch: 'full' },
  {
    path: 'implantacao',
    loadChildren: () => import('@features/implantacao/implantacao.routes').then(m => m.implantacaoRoutes)
  },
  {
    path: 'database',
    loadChildren: () => import('@features/database/database.routes').then(m => m.databaseRoutes)
  },
  {
    path: 'empresa',
    children: [
      { path: '', redirectTo: 'onboarding', pathMatch: 'full' },
      {
        path: 'onboarding',
        loadComponent: () => import('@features/empresa/onboarding/components/onboarding-home/onboarding-home.component').then(m => m.OnboardingHomeComponent)
      },
      {
        path: 'onboarding/capitulo/:id',
        loadComponent: () => import('@features/empresa/onboarding/components/onboarding-capitulo/onboarding-capitulo.component').then(m => m.OnboardingCapituloComponent)
      }
    ]
  }
];
