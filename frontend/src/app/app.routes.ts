import { Routes } from '@angular/router';
import { LoginComponent } from '@features/auth/pages/login/login.component';
import { authGuard } from '@core/guards/auth.guard';
import { adminGuard } from '@core/guards/admin.guard';
import { MainLayoutComponent } from '@layout/main-layout/main-layout.component';
import { AdminLayoutComponent } from '@features/admin/layout/admin-layout.component';
import { featuresRoutes } from './features.routes';
import { adminRoutes } from '@features/admin/admin.routes';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: featuresRoutes
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    component: AdminLayoutComponent,
    children: adminRoutes
  },
  { path: '**', redirectTo: '' }
];
