import { Component, OnInit, signal, computed, effect } from '@angular/core';
import {
  Visitor,
  VisitorCount,
  VisitorStatistics,
  Period,
  VisitorFilters,
} from '../../models/visitor.model';
import { VisitorService } from '../../services/visitor.service';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { DatePipe } from '@angular/common';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  visitorCounts = signal<VisitorCount[]>([]);
  selectedProject = signal<string>('');
  selectedLocation = signal<string>('All');
  selectedBrowser = signal<string>('All');
  selectedDevice = signal<string>('All');
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

  currentYear = computed(() => new Date().getFullYear());

  constructor(private visitorService: VisitorService) {
    effect(() => {
      this.applyTheme();
    });
  }

  ngOnInit() {
    this.loadVisitorCounts();
  }

  loadVisitorCounts() {
    this.visitorService.getTotalVisitors().subscribe((data) => {
      const allOption = { projectName: 'All', uniqueVisitors: 0 };
      this.visitorCounts.set([allOption, ...data]);
      this.selectedProject.set('All');
      this.loadProjectData();
    });
  }

  loadProjectData() {
    const currentProject = this.selectedProject();
    if (!currentProject) return;

    this.visitorService
      .getVisitorTrend(currentProject, this.period())
      .subscribe((data) => {
        this.visitorTrend.set(data);
        this.updateTrendChart();
      });

    this.visitorService
      .getVisitorStatistics(currentProject)
      .subscribe((data) => {
        this.visitorStats.set(data);
      });

    this.visitorService.getVisitorCount(currentProject).subscribe((data) => {
      const counts = [...this.visitorCounts()];
      const index = counts.findIndex((c) => c.projectName === currentProject);
      if (index !== -1) {
        counts[index] = data;
        this.visitorCounts.set(counts);
      }
    });

    this.loadFilteredVisitors();
    this.loadVisitorLocations();
    this.loadVisitorDevices();
  }

  loadVisitorLocations() {
    this.visitorService.getLocations().subscribe((data) => {
      const allOption = { location: 'All', visitorCount: 0 };
      data = data.filter((loc) => loc.location);
      this.visitorLocations.set([allOption, ...data]);
      this.selectedLocation.set('All');
    });
  }

  loadVisitorDevices() {
    this.visitorService.getDevices().subscribe((data) => {
      const allOption = { device: 'All', visitorCount: 0 };
      data = data.filter((dev) => dev.device);
      this.visitorDevices.set([allOption, ...data]);
      this.selectedDevice.set('All');
    });
  }

  loadFilteredVisitors() {
    const currentFilters: VisitorFilters = {
      projectName: this.selectedProject(),
      location: this.selectedLocation(),
      startDate: this.filters().startDate,
      endDate: this.filters().endDate,
      browser: this.filters().browser,
      device: this.selectedDevice(),
    };

    this.visitorService.filterVisitors(currentFilters).subscribe((data) => {
      this.filteredVisitors.set(data);
    });
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

  toggleDarkMode() {
    this.isDarkMode.update((current) => !current);
    this.updateTrendChart();
  }

  private applyTheme() {
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
