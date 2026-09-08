import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CAPITULOS } from '../../onboarding-data';

@Component({
  selector: 'app-onboarding-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './onboarding-home.component.html',
  styleUrl: './onboarding-home.component.scss'
})
export class OnboardingHomeComponent {
  private readonly router = inject(Router);

  readonly capitulos = CAPITULOS;

  iniciar(): void {
    this.router.navigateByUrl(`/empresa/onboarding/capitulo/${CAPITULOS[0].id}`);
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }
}