import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BlocoOnboarding } from '../../onboarding-data';

@Component({
  selector: 'app-onboarding-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-section.component.html',
  styleUrl: './onboarding-section.component.scss'
})
export class OnboardingSectionComponent {
  @Input({ required: true }) bloco!: BlocoOnboarding;
  @Input() cor = '#2563eb';

  acordeoesAbertos = new Set<number>();

  alternarAcordeao(index: number): void {
    if (this.acordeoesAbertos.has(index)) {
      this.acordeoesAbertos.delete(index);
    } else {
      this.acordeoesAbertos.add(index);
    }
  }

  ehAcordeaoAberto(index: number): boolean {
    return this.acordeoesAbertos.has(index);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
