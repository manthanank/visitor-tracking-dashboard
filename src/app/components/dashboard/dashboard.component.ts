import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  inject,
} from '@angular/core';
import {
  Visitor,
  VisitorCount,
  VisitorStatistics,
  Period,
  VisitorFilters,
  VisitorGrowth,
  DailyStat,
  DailyStats,
} from '../../models/visitor.model';
import { VisitorService } from '../../services/visitor.service';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, DatePipe, FooterComponent, HeaderComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  visitorCounts = signal<VisitorCount[]>([]);
  selectedProject = signal<string>('');
  selectedLocation = signal<string>('All');
  selectedBrowser = signal<string>('All');
  selectedDevice = signal<string>('All');
  selectedPage = signal<number>(1);
  selectedLimit = signal<number>(10);
  totalVisitorsCount = signal<number>(0);
  totalPages = signal<number>(0);
  currentPage = signal<number>(1);
  visitorTrend = signal<any[]>([]);
  visitorStats = signal<VisitorStatistics | null>(null);
  period = signal<Period>('daily');
  isDarkMode = signal<boolean>(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  filteredVisitors = signal<Visitor[]>([]);
  visitorLocations = signal<any[]>([]);
  visitorDevices = signal<any[]>([]);
  trendChart: Chart | null = null;
  browserStats = signal<any[]>([]);
  osStats = signal<any[]>([]);
  browserChart: Chart | null = null;
  osChart: Chart | null = null;
  visitorGrowth = signal<VisitorGrowth[]>([]);
  growthChart: Chart | null = null;
  dailyStatsData = signal<DailyStats | null>(null);
  dailyStats = signal<DailyStat[]>([]);
  selectedDays = signal<number>(7);
  dailyStatsChart: Chart | null = null;
  private subscriptions: Subscription = new Subscription();
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  activeVisitors = signal<number>(0);
  private visitorService = inject(VisitorService);

  private getLocaleDateString(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  }

  private getFirstDayOfMonth(): string {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return this.getLocaleDateString(firstDay);
  }

  filters = signal<VisitorFilters>({
    projectName: this.selectedProject(),
    location: this.selectedLocation(),
    startDate: this.getFirstDayOfMonth(),
    endDate: this.getLocaleDateString(new Date()),
    browser: this.selectedBrowser(),
    device: this.selectedDevice(),
    page: this.selectedPage(),
    limit: this.selectedLimit(),
  });

  totalVisitors = computed(() => {
    return (
      this.visitorCounts().find((v) => v.projectName === this.selectedProject())
        ?.uniqueVisitors || 0
    );
  });

  mostUsedBrowser = computed(() => {
    return this.visitorStats()?.mostUsedBrowser || '';
  });

  mostUsedDevice = computed(() => {
    return this.visitorStats()?.mostUsedDevice || '';
  });

  mostVisitedLocation = computed(() => {
    return this.visitorStats()?.mostVisitedLocation || '';
  });

  constructor() {
    effect(() => {
      this.applyTheme();
    });
  }

  ngOnInit() {
    this.loadVisitorCounts();
    this.loadActiveVisitors();
    this.loadDailyStats();

    // Refresh active visitors count every minute
    const intervalId = setInterval(() => this.loadActiveVisitors(), 60000);

    // Clear interval on component destroy
    this.subscriptions.add({
      unsubscribe: () => clearInterval(intervalId),
    } as Subscription);
  }

  ngOnDestroy() {
    if (this.trendChart) {
      this.trendChart.destroy();
    }
    if (this.dailyStatsChart) {
      this.dailyStatsChart.destroy();
    }
    if (this.browserChart) {
      this.browserChart.destroy();
    }
    if (this.osChart) {
      this.osChart.destroy();
    }
    if (this.growthChart) {
      this.growthChart.destroy();
    }
    this.subscriptions.unsubscribe();
  }

  loadVisitorCounts() {
    this.loading.set(true);
    this.error.set(null);
    const sub = this.visitorService.getTotalVisitors().subscribe({
      next: (data) => {
        const allOption = { projectName: 'All', uniqueVisitors: 0 };
        this.visitorCounts.set([allOption, ...data]);
        this.selectedProject.set('All');
        this.loadProjectData();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load visitor counts');
        this.loading.set(false);
      },
    });
    this.subscriptions.add(sub);
  }

  loadProjectData() {
    const currentProject = this.selectedProject();
    if (!currentProject) return;

    this.loading.set(true);
    this.error.set(null);

    this.loadDailyStats();

    const trendSub = this.visitorService
      .getVisitorTrend(currentProject, this.period())
      .subscribe({
        next: (data) => {
          this.visitorTrend.set(data);
          this.updateTrendChart();
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load visitor trend');
          this.loading.set(false);
        },
      });
    this.subscriptions.add(trendSub);

    const statsSub = this.visitorService
      .getVisitorStatistics(currentProject)
      .subscribe({
        next: (data) => {
          this.visitorStats.set(data);
        },
        error: (err) => {
          this.error.set('Failed to load visitor statistics');
        },
      });
    this.subscriptions.add(statsSub);

    const countSub = this.visitorService
      .getVisitorCount(currentProject)
      .subscribe({
        next: (data) => {
          const counts = [...this.visitorCounts()];
          const index = counts.findIndex(
            (c) => c.projectName === currentProject
          );
          if (index !== -1) {
            counts[index] = data;
            this.visitorCounts.set(counts);
          }
        },
        error: (err) => {
          this.error.set('Failed to load visitor count');
        },
      });
    this.subscriptions.add(countSub);

    this.loadFilteredVisitors();
    this.loadVisitorLocations();
    this.loadVisitorDevices();
    this.loadBrowserOsStats();
    this.loadVisitorGrowth();
  }

  loadVisitorLocations() {
    this.loading.set(true);
    this.error.set(null);

    const sub = this.visitorService.getLocations().subscribe({
      next: (data) => {
        const allOption = { location: 'All', visitorCount: 0 };
        data = data.filter((loc) => loc.location);
        this.visitorLocations.set([allOption, ...data]);
        this.selectedLocation.set('All');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load visitor locations');
        this.loading.set(false);
      },
    });
    this.subscriptions.add(sub);
  }

  loadVisitorDevices() {
    this.loading.set(true);
    this.error.set(null);

    const sub = this.visitorService.getDevices().subscribe({
      next: (data) => {
        const allOption = { device: 'All', visitorCount: 0 };
        data = data.filter((dev) => dev.device);
        this.visitorDevices.set([allOption, ...data]);
        this.selectedDevice.set('All');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load visitor devices');
        this.loading.set(false);
      },
    });
    this.subscriptions.add(sub);
  }

  loadFilteredVisitors() {
    const currentFilters: VisitorFilters = {
      projectName: this.selectedProject(),
      location: this.selectedLocation(),
      startDate: this.filters().startDate,
      endDate: this.filters().endDate,
      browser: this.filters().browser,
      device: this.selectedDevice(),
      page: this.selectedPage(),
      limit: this.selectedLimit(),
    };

    this.loading.set(true);
    this.error.set(null);

    const sub = this.visitorService.filterVisitors(currentFilters).subscribe({
      next: (data) => {
        this.filteredVisitors.set(data.visitors);
        this.totalVisitorsCount.set(data.totalVisitors); // Ensure totalVisitorsCount is set
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load filtered visitors');
        this.loading.set(false);
      },
    });
    this.subscriptions.add(sub);
  }

  hasValidDateRange = computed(() => {
    const { startDate, endDate } = this.filters();
    return startDate && endDate;
  });

  setDateRange(range: 'today' | 'week' | 'month' | 'year') {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate: string;

    switch (range) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(today.setDate(today.getDate() - 7));
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today.setDate(today.getDate() - 30));
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        startDate = `${today.getFullYear()}-01-01`;
        break;
    }

    this.updateFilters({ startDate, endDate });
  }

  updateFilters(newFilters: Partial<VisitorFilters>) {
    this.filters.update((current) => ({
      ...current,
      ...newFilters,
    }));

    if (this.hasValidDateRange()) {
      this.loadFilteredVisitors();
    }
  }

  updateTrendChart() {
    if (this.trendChart) {
      this.trendChart.destroy();
    }

    const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
    const isDark = this.isDarkMode();

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.visitorTrend().map((item) => item._id),
        datasets: [
          {
            label: 'Visitors',
            data: this.visitorTrend().map((item) => item.count),
            borderColor: isDark ? 'rgb(147, 197, 253)' : 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              color: isDark ? '#fff' : '#666',
            },
          },
          x: {
            grid: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              color: isDark ? '#fff' : '#666',
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: isDark ? '#fff' : '#666',
            },
          },
        },
      },
    });
  }

  onProjectChange(project: string) {
    this.selectedProject.set(project);
    this.loadProjectData();
  }

  onPeriodChange(newPeriod: Period) {
    this.period.set(newPeriod);
    this.loadProjectData();
  }

  onLocationChange(location: string) {
    this.selectedLocation.set(location);
    this.loadFilteredVisitors();
  }

  onDeviceChange(device: string) {
    this.selectedDevice.set(device);
    this.loadFilteredVisitors();
  }

  previousPage() {
    this.selectedPage.update((current) => current - 1);
    this.updateFilters({ page: this.selectedPage() });
  }

  nextPage() {
    this.selectedPage.update((current) => current + 1);
    this.updateFilters({ page: this.selectedPage() });
  }

  hasPreviousPage = computed(() => {
    return this.selectedPage() > 1;
  });

  hasNextPage = computed(() => {
    const { page, limit } = this.filters();
    const total = this.totalVisitorsCount();
    return total > (page ?? 0) * (limit ?? 0);
  });

  toggleDarkMode() {
    this.isDarkMode.update((current) => !current);
    this.updateTrendChart();
    this.updateBrowserChart();
    this.updateOsChart();
    this.updateGrowthChart();
    this.updateDailyStatsChart();
  }

  private applyTheme() {
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  exportData(format: 'json' | 'csv') {
    this.loading.set(true);

    const sub = this.visitorService.exportVisitors(format).subscribe({
      next: (data) => {
        if (format === 'csv') {
          // For CSV, create a blob and download it
          const blob = new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `visitor-data-${
            new Date().toISOString().split('T')[0]
          }.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          // For JSON, create a blob and download it
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `visitor-data-${
            new Date().toISOString().split('T')[0]
          }.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(`Failed to export data as ${format.toUpperCase()}`);
        this.loading.set(false);
      },
    });

    this.subscriptions.add(sub);
  }

  loadActiveVisitors() {
    const sub = this.visitorService.getActiveVisitors(5).subscribe({
      next: (data) => {
        // Check if data is an array (API returning directly an array instead of object with activeVisitors property)
        if (Array.isArray(data)) {
          this.activeVisitors.set(data.length);
        }
        // Check for the expected object structure
        else if (data && data.activeVisitors) {
          this.activeVisitors.set(data.activeVisitors.length);
        }
        // Fallback to 0 if neither format is available
        else {
          this.activeVisitors.set(0);
          console.warn(
            'Received unexpected data format for active visitors:',
            data
          );
        }
      },
      error: (err) => {
        console.error('Failed to load active visitors', err);
        this.activeVisitors.set(0);
      },
    });
    this.subscriptions.add(sub);
  }

  loadBrowserOsStats() {
    this.loading.set(true);
    const sub = this.visitorService.getBrowserOsStats().subscribe({
      next: (data) => {
        if (data) {
          this.browserStats.set(data.browserStats || []);
          this.osStats.set(data.osStats || []);
          this.updateBrowserChart();
          this.updateOsChart();
        } else {
          console.warn('Received unexpected data format for browser/OS stats');
          this.browserStats.set([]);
          this.osStats.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load browser/OS statistics');
        this.loading.set(false);
        this.browserStats.set([]);
        this.osStats.set([]);
      },
    });
    this.subscriptions.add(sub);
  }

  updateBrowserChart() {
    if (this.browserChart) {
      this.browserChart.destroy();
    }

    const ctx = document.getElementById('browserChart') as HTMLCanvasElement;
    const isDark = this.isDarkMode();

    this.browserChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.browserStats().map((item) => item._id),
        datasets: [
          {
            data: this.browserStats().map((item) => item.count),
            backgroundColor: [
              'rgb(255, 99, 132)',
              'rgb(54, 162, 235)',
              'rgb(255, 206, 86)',
              'rgb(75, 192, 192)',
              'rgb(153, 102, 255)',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: isDark ? '#fff' : '#666',
            },
          },
        },
      },
    });
  }

  updateOsChart() {
    if (this.osChart) {
      this.osChart.destroy();
    }

    const ctx = document.getElementById('osChart') as HTMLCanvasElement;
    const isDark = this.isDarkMode();

    this.osChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.osStats().map((item) => item._id),
        datasets: [
          {
            data: this.osStats().map((item) => item.count),
            backgroundColor: [
              'rgb(255, 99, 132)',
              'rgb(54, 162, 235)',
              'rgb(255, 206, 86)',
              'rgb(75, 192, 192)',
              'rgb(153, 102, 255)',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: isDark ? '#fff' : '#666',
            },
          },
        },
      },
    });
  }

  loadVisitorGrowth() {
    const sub = this.visitorService.getVisitorGrowth().subscribe({
      next: (data) => {
        this.visitorGrowth.set(data);
        this.updateGrowthChart();
      },
      error: (err) => {
        this.error.set('Failed to load visitor growth data');
      },
    });
    this.subscriptions.add(sub);
  }

  updateGrowthChart() {
    if (this.growthChart) {
      this.growthChart.destroy();
    }

    const ctx = document.getElementById('growthChart') as HTMLCanvasElement;
    const isDark = this.isDarkMode();

    this.growthChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.visitorGrowth().map((item) => item._id),
        datasets: [
          {
            label: 'Monthly Growth',
            data: this.visitorGrowth().map((item) => item.count),
            backgroundColor: isDark
              ? 'rgba(147, 197, 253, 0.7)'
              : 'rgba(75, 192, 192, 0.7)',
            borderColor: isDark ? 'rgb(147, 197, 253)' : 'rgb(75, 192, 192)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              color: isDark ? '#fff' : '#666',
            },
          },
          x: {
            grid: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              color: isDark ? '#fff' : '#666',
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: isDark ? '#fff' : '#666',
            },
          },
        },
      },
    });
  }

  loadDailyStats() {
    this.loading.set(true);
    this.error.set(null);

    const sub = this.visitorService
      .getDailyStats(this.selectedProject() || 'All', this.selectedDays())
      .subscribe({
        next: (data) => {
          this.dailyStatsData.set(data);
          this.dailyStats.set(data.dailyStats);
          this.updateDailyStatsChart();
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load daily statistics');
          this.loading.set(false);
        },
      });

    this.subscriptions.add(sub);
  }

  onDaysChange(days: number) {
    this.selectedDays.set(days);
    this.loadDailyStats();
  }

  updateDailyStatsChart() {
    if (this.dailyStatsChart) {
      this.dailyStatsChart.destroy();
    }

    const ctx = document.getElementById('dailyStatsChart') as HTMLCanvasElement;
    if (!ctx) return;

    const isDark = this.isDarkMode();
    const data = this.dailyStats();

    this.dailyStatsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.date),
        datasets: [
          {
            label: 'Unique Visitors',
            data: data.map((item) => item.uniqueVisitors),
            backgroundColor: isDark
              ? 'rgba(54, 162, 235, 0.7)'
              : 'rgba(54, 162, 235, 0.7)',
            borderColor: isDark ? 'rgb(54, 162, 235)' : 'rgb(54, 162, 235)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              color: isDark ? '#fff' : '#666',
            },
          },
          x: {
            grid: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              color: isDark ? '#fff' : '#666',
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: isDark ? '#fff' : '#666',
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y || 0;
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    });
  }
}
