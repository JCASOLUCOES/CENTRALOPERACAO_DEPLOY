import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-gestor-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './gestor-nav.component.html',
  styleUrl: './gestor-nav.component.scss'
})
export class GestorNavComponent {
  private readonly router = inject(Router);

  readonly paineis = [
    { id: 'ceo', label: 'CEO', icone: 'bi-gem' },
    { id: 'coo', label: 'COO', icone: 'bi-clipboard-check' },
    { id: 'cto', label: 'CTO', icone: 'bi-cpu' }
  ] as const;

  isActive(id: string): boolean {
    return this.router.url.includes(`/gestor/${id}`);
  }
}