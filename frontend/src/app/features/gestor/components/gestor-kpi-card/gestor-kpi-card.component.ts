import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MetricaCard } from '../../models/gestor.models';

@Component({
  selector: 'app-gestor-kpi-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gestor-kpi-card.component.html',
  styleUrl: './gestor-kpi-card.component.scss'
})
export class GestorKpiCardComponent {
  @Input({ required: true }) kpi!: MetricaCard;
  @Input() loading = false;
  @Input() error = '';
  @Input() clickable = true;

  formatarValor(valor: number, unidade?: string): string {
    if (valor >= 1000000) return (valor / 1000000).toFixed(1) + 'M' + (unidade ? ' ' + unidade : '');
    if (valor >= 1000) return (valor / 1000).toFixed(1) + 'k' + (unidade ? ' ' + unidade : '');
    return valor.toString() + (unidade ? ' ' + unidade : '');
  }

  getIcone(): string {
    return this.kpi.icone || 'bi-grid-3x3-gap';
  }

  getCor(): string {
    return this.kpi.cor || '#0f4c81';
  }

  getFundo(): string {
    return this.kpi.fundo || `rgba(${this.hexToRgb(this.getCor())}, 0.12)`;
  }

  private hexToRgb(hex: string): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
}