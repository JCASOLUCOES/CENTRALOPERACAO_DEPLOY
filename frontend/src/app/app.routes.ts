import { Routes } from '@angular/router';
import { LoginComponent } from '@features/auth/pages/login/login.component';
import { authGuard } from '@core/guards/auth.guard';
import { MainLayoutComponent } from '@layout/main-layout/main-layout.component';
import { featuresRoutes } from './features.routes';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: featuresRoutes
  },
  { path: '**', redirectTo: '' }
];
