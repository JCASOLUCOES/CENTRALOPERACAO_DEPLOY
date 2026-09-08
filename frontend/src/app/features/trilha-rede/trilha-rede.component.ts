import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-trilha-rede',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trilha-rede.component.html',
  styleUrl: './trilha-rede.component.scss'
})
export class TrilhaRedeComponent {
  // controle simples de acordeão
  secaoAbertaId: string | null = 'objetivo';

  toggleSecao(id: string): void {
    this.secaoAbertaId = this.secaoAbertaId === id ? null : id;
  }
}