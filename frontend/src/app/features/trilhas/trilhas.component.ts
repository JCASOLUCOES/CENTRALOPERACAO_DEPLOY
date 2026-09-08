import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-trilhas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trilhas.component.html',
  styleUrl: './trilhas.component.scss'
})
export class TrilhasComponent {
  // Lista de IDs das seções para controle do acordeão
  secoes = [
    'classificacao',
    'diagnostico',
    'documentos',
    'plano-acao',
    'comunicacao',
    'fechamento',
    'fluxo-resumido',
    'exemplos-praticos'
  ];

  // Controle de qual seção está aberta
  secaoAbertaId: string | null = this.secoes[0] ?? null;

  // Alterna abertura/fechamento de seção
  toggleSecao(id: string): void {
    this.secaoAbertaId = this.secaoAbertaId === id ? null : id;
  }
}