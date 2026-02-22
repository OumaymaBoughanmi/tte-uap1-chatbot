import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  ChartType,
  ChartDataset,
  registerables
} from 'chart.js';
import { ChartConfig } from '../../models/chat.model';

Chart.register(...registerables);

@Component({
  selector: 'app-chart-renderer',
  templateUrl: './chart-renderer.component.html',
  styleUrls: ['./chart-renderer.component.scss']
})
export class ChartRendererComponent implements OnChanges, OnDestroy {

  @Input() type: string = 'bar';
  @Input() data: Record<string, any>[] = [];
  @Input() chartConfig!: ChartConfig;

  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chartInstance: Chart | null = null;

  private readonly COLORS = [
    '#0056a2', '#388e3c', '#f57c00', '#7b1fa2',
    '#c62828', '#00838f', '#558b2f', '#4527a0',
    '#d84315', '#00695c'
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (this.data?.length && this.chartConfig) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private renderChart(): void {
    this.destroyChart();

    let config: ChartConfiguration;

    switch (this.type) {
      case 'scatter':
        config = this.buildScatterConfig();
        break;
      case 'radar':
        config = this.buildRadarConfig();
        break;
      case 'mixed':
        config = this.buildMixedConfig();
        break;
      case 'horizontalBar':
        config = this.buildHorizontalBarConfig();
        break;
      default:
        config = this.buildStandardConfig();
        break;
    }

    this.chartInstance = new Chart(this.chartCanvas.nativeElement, config);
  }

  // ─── Standard: bar, line, pie, doughnut ───────────────────────────────────
  private buildStandardConfig(): ChartConfiguration {
    const labels = this.data.map(row => String(row[this.chartConfig.labelColumn] ?? ''));
    const datasets: ChartDataset[] = this.chartConfig.valueColumns.map((col, idx) => ({
      label: col,
      data: this.data.map(row => Number(row[col]) || 0),
      backgroundColor: this.getBackgroundColors(idx),
      borderColor: this.COLORS[idx % this.COLORS.length],
      borderWidth: 2,
      fill: false,
      tension: 0.4
    }));

    return {
      type: this.type as ChartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: this.chartConfig.title || 'Chart',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: this.isCartesian(this.type)
          ? {
              x: { ticks: { maxRotation: 45 } },
              y: { beginAtZero: true }
            }
          : undefined
      }
    };
  }

  // ─── Horizontal Bar ───────────────────────────────────────────────────────
  private buildHorizontalBarConfig(): ChartConfiguration {
    const labels = this.data.map(row => String(row[this.chartConfig.labelColumn] ?? ''));
    const datasets: ChartDataset[] = this.chartConfig.valueColumns.map((col, idx) => ({
      label: col,
      data: this.data.map(row => Number(row[col]) || 0),
      backgroundColor: this.COLORS[idx % this.COLORS.length] + 'CC',
      borderColor: this.COLORS[idx % this.COLORS.length],
      borderWidth: 2
    }));

    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: this.chartConfig.title || 'Chart',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: { beginAtZero: true },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    };
  }

  // ─── Scatter ──────────────────────────────────────────────────────────────
  private buildScatterConfig(): ChartConfiguration {
    const xCol = this.chartConfig.labelColumn;
    const datasets: ChartDataset<'scatter'>[] = this.chartConfig.valueColumns.map((col, idx) => ({
      label: `${xCol} vs ${col}`,
      data: this.data.map(row => ({
        x: Number(row[xCol]) || 0,
        y: Number(row[col]) || 0
      })),
      backgroundColor: this.COLORS[idx % this.COLORS.length] + 'BB',
      borderColor: this.COLORS[idx % this.COLORS.length],
      borderWidth: 1,
      pointRadius: 6,
      pointHoverRadius: 8
    }));

    return {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: this.chartConfig.title || 'Scatter Chart',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `(${ctx.parsed.x}, ${ctx.parsed.y})`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: xCol },
            beginAtZero: true
          },
          y: {
            title: { display: true, text: this.chartConfig.valueColumns[0] },
            beginAtZero: true
          }
        }
      }
    };
  }

  // ─── Radar ────────────────────────────────────────────────────────────────
  private buildRadarConfig(): ChartConfiguration {
    const labels = this.data.map(row => String(row[this.chartConfig.labelColumn] ?? ''));
    const datasets: ChartDataset<'radar'>[] = this.chartConfig.valueColumns.map((col, idx) => ({
      label: col,
      data: this.data.map(row => Number(row[col]) || 0),
      backgroundColor: this.COLORS[idx % this.COLORS.length] + '44',
      borderColor: this.COLORS[idx % this.COLORS.length],
      borderWidth: 2,
      pointBackgroundColor: this.COLORS[idx % this.COLORS.length],
      pointRadius: 4
    }));

    return {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: this.chartConfig.title || 'Radar Chart',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            ticks: { font: { size: 10 } }
          }
        }
      }
    };
  }

  // ─── Mixed: bar + line ────────────────────────────────────────────────────
  private buildMixedConfig(): ChartConfiguration {
    const labels = this.data.map(row => String(row[this.chartConfig.labelColumn] ?? ''));
    const datasets: ChartDataset[] = this.chartConfig.valueColumns.map((col, idx) => ({
      type: idx === 0 ? 'bar' : 'line',
      label: col,
      data: this.data.map(row => Number(row[col]) || 0),
      backgroundColor: this.COLORS[idx % this.COLORS.length] + 'CC',
      borderColor: this.COLORS[idx % this.COLORS.length],
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      yAxisID: idx === 0 ? 'y' : 'y1'
    }));

    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: this.chartConfig.title || 'Mixed Chart',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: { ticks: { maxRotation: 45 } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: this.chartConfig.valueColumns[0] || 'Value'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: this.chartConfig.valueColumns[1] || 'Value 2'
            }
          }
        }
      }
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private getBackgroundColors(datasetIndex: number): string | string[] {
    if (['pie', 'doughnut'].includes(this.type)) {
      return this.data.map((_, i) => this.COLORS[i % this.COLORS.length]);
    }
    return this.COLORS[datasetIndex % this.COLORS.length] + 'CC';
  }

  private isCartesian(type: string): boolean {
    return ['bar', 'line', 'horizontalBar'].includes(type);
  }

  private destroyChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}
