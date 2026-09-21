import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * Cabeçalho padrão de página (referência visual: tela Kanban).
 * Título + descrição fixos à esquerda, ações projetadas à direita.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss'
})
export class PageHeaderComponent {
  @Input({ required: true }) titulo = '';
  @Input() descricao?: string;
  @Input() icone?: string;
}
