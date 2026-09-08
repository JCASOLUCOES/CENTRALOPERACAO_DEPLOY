import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trilha-infra',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trilha-infra.component.html',
  styleUrls: ['./trilha-infra.component.scss']
})
export class TrilhaInfraComponent {
  secaoAbertaId: string | null = null;

  toggleSecao(id: string): void {
    this.secaoAbertaId = this.secaoAbertaId === id ? null : id;
  }
}