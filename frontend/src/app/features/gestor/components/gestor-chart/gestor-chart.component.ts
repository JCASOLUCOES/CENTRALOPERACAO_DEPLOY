import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { MetricaGrafico } from '../../models/gestor.models';

@Component({
  selector: 'app-gestor-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestor-chart.component.html',
  styleUrl: './gestor-chart.component.scss'
})
export class GestorChartComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) config!: MetricaGrafico;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.canvasRef) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private async render(): Promise<void> {
    this.destroyChart();

    if (!this.config?.labels?.length || !this.config?.datasets?.length) {
      return;
    }

    try {
      const { Chart, registerables } = await import('chart.js/auto');
      Chart.register(...registerables);

      const ctx = this.canvasRef.nativeElement.getContext('2d');
      if (!ctx) return;

      this.chart = new Chart(ctx, {
        type: this.config.tipo,
        data: {
          labels: this.config.labels,
          datasets: this.config.datasets.map(d => ({
            label: d.label,
            data: d.data,
            backgroundColor: d.backgroundColor,
            borderColor: d.borderColor,
            borderWidth: d.borderWidth ?? 1
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { usePointStyle: true, padding: 16, font: { size: 11 } }
            },
            tooltip: { padding: 10, titleFont: { size: 12 }, bodyFont: { size: 11 } }
          },
          ...this.config.options
        }
      });
    } catch {
      // Chart.js não disponível (ex.: SSR) - ignora silenciosamente
    }
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}