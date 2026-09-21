import { Routes } from '@angular/router';
import { RedirectCommand } from '@angular/router';

export const chatRoutes: Routes = [
  {
    path: '',
    canActivate: [() => new RedirectCommand('/')]
  }
];
