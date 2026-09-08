import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CapituloGlossario {
  numero: number;
  titulo: string;
  disponivel?: boolean;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  capituloSelecionado = 1;

  capitulos: CapituloGlossario[] = [
    { numero: 1, titulo: 'Conceitos Gerais', disponivel: true },
    { numero: 2, titulo: 'Financeiro', disponivel: true },
    { numero: 3, titulo: 'Importações', disponivel: true },
    { numero: 4, titulo: 'Atendimento', disponivel: true },
    { numero: 5, titulo: 'Integrações', disponivel: true },
    { numero: 6, titulo: 'Banco de Dados', disponivel: true },
    { numero: 7, titulo: 'Infraestrutura', disponivel: true }
  ];

  selecionarCapitulo(numero: number): void {
    this.capituloSelecionado = numero;
  }

  capituloDisponivel(numero: number): boolean {
    return this.capitulos.find(c => c.numero === numero)?.disponivel === true;
  }

  tituloCapituloAtual(): string {
    const capitulo = this.capitulos.find(c => c.numero === this.capituloSelecionado);
    return capitulo?.titulo ?? '';
  }

  trackById(_index: number, item: { numero: number }): number {
    return item.numero;
  }
}
