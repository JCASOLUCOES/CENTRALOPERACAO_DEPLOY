import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface StackResumo {
  icone: string;
  valor: string;
  rotulo: string;
  cor: string;
}

@Component({
  selector: 'app-stack',
  imports: [CommonModule],
  templateUrl: './stack.component.html',
  styleUrls: ['./stack.component.scss'],
  standalone: true,
})
export class StackComponent {
  secaoAbertaId: string | null = 'actyoncob';

  toggleSecao(id: string): void {
    this.secaoAbertaId = this.secaoAbertaId === id ? null : id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  resumos: StackResumo[] = [
    {
      icone: 'bi-boxes',
      valor: '3',
      rotulo: 'Aplicações no ecossistema',
      cor: '#2563eb'
    },
    {
      icone: 'bi-display',
      valor: '2',
      rotulo: 'Front-ends (VCL e Angular)',
      cor: '#7c3aed'
    },
    {
      icone: 'bi-server',
      valor: '2',
      rotulo: 'Back-ends (Delphi e .NET)',
      cor: '#16a34a'
    },
    {
      icone: 'bi-database-fill',
      valor: '1',
      rotulo: 'Banco de dados (SQL Server)',
      cor: '#f59e0b'
    }
  ];
}
