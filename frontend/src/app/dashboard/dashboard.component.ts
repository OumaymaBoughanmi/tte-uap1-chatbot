import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DashboardService } from './dashboard.service';
import { AuthService } from '../auth/auth.service';
import { DashboardData } from '../models/dashboard.model';
import { WidgetConfig } from '../models/dashboard-layout.model';
import { LanguageService } from '../shared/language.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  @ViewChild('leadsetChart')       leadsetChartRef!: ElementRef;
  @ViewChild('stationChart')       stationChartRef!: ElementRef;
  @ViewChild('statusChart')        statusChartRef!: ElementRef;
  @ViewChild('pagodaChart')        pagodaChartRef!: ElementRef;
  @ViewChild('toolLockChart')      toolLockChartRef!: ElementRef;
  @ViewChild('machineStatusChart') machineStatusChartRef!: ElementRef;
  @ViewChild('goodBadPartsChart')  goodBadPartsChartRef!: ElementRef;
  @ViewChild('maintenanceChart')   maintenanceChartRef!: ElementRef;

  data: DashboardData | null = null;
  isLoading = true;
  currentUser = this.authService.getCurrentUser();
  showSettings = false;
  private charts: Chart[] = [];

  private readonly PROFILE_URL = 'http://localhost:8080/api/profile';

  readonly DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: 'kpi-total-bundles',     title: 'Total Bundles',                  type: 'kpi',   visible: true, size: 'small',  order: 0 },
    { id: 'kpi-validated',         title: 'Validated Bundles',              type: 'kpi',   visible: true, size: 'small',  order: 1 },
    { id: 'kpi-not-validated',     title: 'Not Validated',                  type: 'kpi',   visible: true, size: 'small',  order: 2 },
    { id: 'kpi-in-pagoda',         title: 'Still in Pagoda',               type: 'kpi',   visible: true, size: 'small',  order: 3 },
    { id: 'kpi-left-pagoda',       title: 'Left Pagoda',                   type: 'kpi',   visible: true, size: 'small',  order: 4 },
    { id: 'kpi-total-orders',      title: 'Total Orders',                   type: 'kpi',   visible: true, size: 'small',  order: 5 },
    { id: 'kpi-history',           title: 'History Records',                type: 'kpi',   visible: true, size: 'small',  order: 6 },
    { id: 'kpi-total-tools',       title: 'Total Tools',                    type: 'kpi',   visible: true, size: 'small',  order: 7 },
    { id: 'kpi-locked-tools',      title: 'Locked Tools',                   type: 'kpi',   visible: true, size: 'small',  order: 8 },
    { id: 'kpi-total-machines',    title: 'Total Machines',                 type: 'kpi',   visible: true, size: 'small',  order: 9 },
    { id: 'kpi-excluded-machines', title: 'Excluded Machines',              type: 'kpi',   visible: true, size: 'small',  order: 10 },
    { id: 'chart-leadset',         title: 'Bundles per Leadset',            type: 'chart', visible: true, size: 'medium', order: 11 },
    { id: 'chart-station',         title: 'Quantity Produced per Station',  type: 'chart', visible: true, size: 'medium', order: 12 },
    { id: 'chart-status',          title: 'Validation Status',              type: 'chart', visible: true, size: 'small',  order: 13 },
    { id: 'chart-pagoda',          title: 'Pagoda Status',                  type: 'chart', visible: true, size: 'small',  order: 14 },
    { id: 'chart-exit-pagoda',     title: 'Last Exit per Pagoda',           type: 'table', visible: true, size: 'small',  order: 15 },
    { id: 'chart-tool-lock',       title: 'Tool Lock Status',               type: 'chart', visible: true, size: 'small',  order: 16 },
    { id: 'chart-machine-status',  title: 'Machine Status',                 type: 'chart', visible: true, size: 'small',  order: 17 },
    { id: 'chart-good-bad',        title: 'Good vs Bad Parts',              type: 'chart', visible: true, size: 'medium', order: 18 },
    { id: 'chart-maintenance',     title: 'Tools Approaching Maintenance',  type: 'chart', visible: true, size: 'large',  order: 19 },
  ];

  widgets: WidgetConfig[] = [];

  private readonly COLORS = [
    '#0056a2', '#388e3c', '#f57c00', '#7b1fa2',
    '#c62828', '#00838f', '#558b2f', '#4527a0',
    '#d84315', '#00695c'
  ];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private languageService: LanguageService,
    public langService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.loadLayout();
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.data = data;
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        this.isLoading = false;
      }
    });

    this.langService.lang$.subscribe(lang => {
  this.currentLang = lang;
});
  }

  loadLayout(): void {
    this.http.get<any>(`${this.PROFILE_URL}/dashboard-layout`).subscribe({
      next: (res) => {
        if (res.layout && res.layout.length > 0) {
          try {
            const saved: WidgetConfig[] = JSON.parse(res.layout);
            this.widgets = this.DEFAULT_WIDGETS.map(def => {
              const found = saved.find(s => s.id === def.id);
              return found ? { ...def, ...found } : def;
            });
            this.widgets.sort((a, b) => a.order - b.order);
          } catch {
            this.widgets = [...this.DEFAULT_WIDGETS];
          }
        } else {
          this.widgets = [...this.DEFAULT_WIDGETS];
        }
      },
      error: () => {
        this.widgets = [...this.DEFAULT_WIDGETS];
      }
    });
  }

  saveLayout(): void {
    const layout = JSON.stringify(this.widgets);
    this.http.put(`${this.PROFILE_URL}/dashboard-layout`, { layout }).subscribe();
  }

  drop(event: CdkDragDrop<WidgetConfig[]>): void {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    this.widgets.forEach((w, i) => w.order = i);
    this.saveLayout();
    setTimeout(() => this.renderCharts(), 200);
  }

  toggleWidget(widget: WidgetConfig): void {
    widget.visible = !widget.visible;
    this.saveLayout();
    if (widget.visible) setTimeout(() => this.renderCharts(), 100);
  }

  setSize(widget: WidgetConfig, size: 'small' | 'medium' | 'large'): void {
    widget.size = size;
    this.saveLayout();
    setTimeout(() => this.renderCharts(), 100);
  }

  toggleSettings(): void { this.showSettings = !this.showSettings; }

  resetLayout(): void {
    this.widgets = this.DEFAULT_WIDGETS.map(w => ({ ...w }));
    this.saveLayout();
    setTimeout(() => this.renderCharts(), 100);
  }

  isVisible(id: string): boolean {
    return this.widgets.find(w => w.id === id)?.visible ?? true;
  }

  getSize(id: string): string {
    return this.widgets.find(w => w.id === id)?.size ?? 'medium';
  }

  getKpiWidgets(): WidgetConfig[] {
    return this.widgets.filter(w => w.type === 'kpi');
  }

  getChartWidgets(): WidgetConfig[] {
    return this.widgets.filter(w => w.type === 'chart' || w.type === 'table');
  }

  goToChat(): void { this.router.navigate(['/chat']); }
  logout(): void { this.authService.logout(); }

  private renderCharts(): void {
    if (!this.data) return;
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    if (this.isVisible('chart-leadset') && this.leadsetChartRef?.nativeElement && this.data.bundlesPerLeadset?.length) {
      this.charts.push(new Chart(this.leadsetChartRef.nativeElement, {
        type: 'bar',
        data: { labels: this.data.bundlesPerLeadset.map(i => i.label), datasets: [{ label: 'Bundles', data: this.data.bundlesPerLeadset.map(i => i.value), backgroundColor: this.COLORS.map(c => c + 'CC'), borderColor: this.COLORS, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      }));
    }

    if (this.isVisible('chart-station') && this.stationChartRef?.nativeElement && this.data.quantityProducedPerStation?.length) {
      this.charts.push(new Chart(this.stationChartRef.nativeElement, {
        type: 'bar',
        data: { labels: this.data.quantityProducedPerStation.map(i => i.label), datasets: [{ label: 'Qty Produced', data: this.data.quantityProducedPerStation.map(i => i.value), backgroundColor: '#0056a2CC', borderColor: '#0056a2', borderWidth: 2 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
      }));
    }

    if (this.isVisible('chart-status') && this.statusChartRef?.nativeElement && this.data.totalBundles > 0) {
      this.charts.push(new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: { labels: ['Validated', 'Not Validated'], datasets: [{ data: [this.data.validatedBundles, this.data.notValidatedBundles], backgroundColor: ['#388e3c', '#e53935'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      }));
    }

    if (this.isVisible('chart-pagoda') && this.pagodaChartRef?.nativeElement && this.data.totalBundles > 0) {
      this.charts.push(new Chart(this.pagodaChartRef.nativeElement, {
        type: 'doughnut',
        data: { labels: ['Still in Pagoda', 'Left Pagoda'], datasets: [{ data: [this.data.bundlesInPagoda, this.data.bundlesLeftPagoda], backgroundColor: ['#0056a2', '#f57c00'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      }));
    }

    if (this.isVisible('chart-tool-lock') && this.toolLockChartRef?.nativeElement && this.data.toolLockStatus?.length) {
      this.charts.push(new Chart(this.toolLockChartRef.nativeElement, {
        type: 'doughnut',
        data: { labels: this.data.toolLockStatus.map(i => i.label), datasets: [{ data: this.data.toolLockStatus.map(i => i.value), backgroundColor: ['#388e3c', '#e53935'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      }));
    }

    if (this.isVisible('chart-machine-status') && this.machineStatusChartRef?.nativeElement && this.data.machineStatus?.length) {
      this.charts.push(new Chart(this.machineStatusChartRef.nativeElement, {
        type: 'doughnut',
        data: { labels: this.data.machineStatus.map(i => i.label), datasets: [{ data: this.data.machineStatus.map(i => i.value), backgroundColor: ['#0056a2', '#f57c00'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      }));
    }

    if (this.isVisible('chart-good-bad') && this.goodBadPartsChartRef?.nativeElement && this.data.goodVsBadPartsPerTool?.length) {
      this.charts.push(new Chart(this.goodBadPartsChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: this.data.goodVsBadPartsPerTool.map(i => i.label),
          datasets: [
            { label: 'Bad Parts', data: this.data.goodVsBadPartsPerTool.map(i => i.value), backgroundColor: '#e5393599', borderColor: '#e53935', borderWidth: 2 },
            { label: 'Good Parts', data: this.data.goodVsBadPartsPerTool.map(i => Number(i.extra) || 0), backgroundColor: '#388e3c99', borderColor: '#388e3c', borderWidth: 2 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
      }));
    }

    if (this.isVisible('chart-maintenance') && this.maintenanceChartRef?.nativeElement && this.data.toolsApproachingMaintenance?.length) {
      this.charts.push(new Chart(this.maintenanceChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: this.data.toolsApproachingMaintenance.map(i => i.label),
          datasets: [{ label: 'Usage %', data: this.data.toolsApproachingMaintenance.map(i => i.value), backgroundColor: this.data.toolsApproachingMaintenance.map(i => i.value >= 90 ? '#e5393599' : '#f57c0099'), borderColor: this.data.toolsApproachingMaintenance.map(i => i.value >= 90 ? '#e53935' : '#f57c00'), borderWidth: 2 }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } } }
      }));
    }
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

currentLang = this.languageService.current;

toggleLanguage(): void {
  const newLang = this.currentLang === 'fr' ? 'en' : 'fr';
  this.languageService.set(newLang);
  this.currentLang = newLang;
}



}
