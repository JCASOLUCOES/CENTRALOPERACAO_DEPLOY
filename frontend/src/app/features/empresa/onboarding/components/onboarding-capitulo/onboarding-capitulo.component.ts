import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OnboardingSectionComponent } from '../onboarding-section/onboarding-section.component';
import { CAPITULOS, CapituloOnboarding } from '../../onboarding-data';

@Component({
  selector: 'app-onboarding-capitulo',
  standalone: true,
  imports: [CommonModule, RouterLink, OnboardingSectionComponent],
  templateUrl: './onboarding-capitulo.component.html',
  styleUrl: './onboarding-capitulo.component.scss'
})
export class OnboardingCapituloComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly capitulos = CAPITULOS;
  readonly total = CAPITULOS.length;

  capitulo: CapituloOnboarding | null = null;
  ehUltimo = false;
  animacao = false;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      const cap = CAPITULOS.find((c) => c.id === id);

      if (!cap) {
        this.router.navigateByUrl('/empresa/onboarding', { replaceUrl: true });
        return;
      }

      this.capitulo = cap;
      this.ehUltimo = this.proximoCapitulo(cap.id) === null;
      this.animacao = true;
    });
  }

  isAtual(id: number): boolean {
    return this.capitulo?.id === id;
  }

  irPara(id: number): void {
    this.animacao = false;
    this.router.navigate(['/empresa/onboarding/capitulo', id]);
  }

  voltar(): void {
    if (!this.capitulo) return;
    const anterior = this.capituloAnterior(this.capitulo.id);
    if (anterior) {
      this.irPara(anterior);
    } else {
      this.router.navigateByUrl('/empresa/onboarding', { replaceUrl: true });
    }
  }

  avancar(): void {
    if (!this.capitulo) return;
    const proximo = this.proximoCapitulo(this.capitulo.id);
    if (proximo) {
      this.irPara(proximo);
    } else {
      this.router.navigateByUrl('/empresa/onboarding', { replaceUrl: true });
    }
  }

  private proximoCapitulo(id: number): number | null {
    const index = CAPITULOS.findIndex((c) => c.id === id);
    const proximo = CAPITULOS[index + 1];
    return proximo ? proximo.id : null;
  }

  private capituloAnterior(id: number): number | null {
    const index = CAPITULOS.findIndex((c) => c.id === id);
    const anterior = CAPITULOS[index - 1];
    return anterior ? anterior.id : null;
  }

  trackByIndex(index: number): number {
    return index;
  }
}