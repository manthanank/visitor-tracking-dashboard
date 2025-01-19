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
  // Existing signals
  visitorCounts = signal<VisitorCount[]>([]);
  selectedProject = signal<string>('');
  visitorTrend = signal<any[]>([]);
  visitorStats = signal<VisitorStatistics | null>(null);
  period = signal<Period>('daily');
  isDarkMode = signal<boolean>(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // New signals for filters
  filteredVisitors = signal<Visitor[]>([]);
  // Get first day of current month
  private getLocaleDateString(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  }

  // Update getFirstDayOfMonth method
  private getFirstDayOfMonth(): string {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return this.getLocaleDateString(firstDay);
  }

  // Initialize filters with current month
  filters = signal<VisitorFilters>({
    startDate: this.getFirstDayOfMonth(),
    endDate: this.getLocaleDateString(new Date()),
    browser: '',
  });

  trendChart: Chart | null = null;

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
      this.visitorCounts.set(data);
      if (data.length > 0) {
        this.selectedProject.set(data[0].projectName);
        this.loadProjectData();
      }
    });
  }

  loadProjectData() {
    const currentProject = this.selectedProject();
    if (!currentProject) return;

    // Load visitor trend
    this.visitorService
      .getVisitorTrend(currentProject, this.period())
      .subscribe((data) => {
        this.visitorTrend.set(data);
        this.updateTrendChart();
      });

    // Load visitor statistics
    this.visitorService
      .getVisitorStatistics(currentProject)
      .subscribe((data) => {
        this.visitorStats.set(data);
      });

    // Load visitor count for specific project
    this.visitorService.getVisitorCount(currentProject).subscribe((data) => {
      const counts = [...this.visitorCounts()];
      const index = counts.findIndex((c) => c.projectName === currentProject);
      if (index !== -1) {
        counts[index] = data;
        this.visitorCounts.set(counts);
      }
    });

    // Load filtered visitors
    this.loadFilteredVisitors();
  }

  loadFilteredVisitors() {
    const currentFilters: VisitorFilters = {
      projectName: this.selectedProject(),
      ...this.filters(),
    };

    this.visitorService.filterVisitors(currentFilters).subscribe((data) => {
      this.filteredVisitors.set(data);
    });
  }

  // Add new computed property
  hasValidDateRange = computed(() => {
    const { startDate, endDate } = this.filters();
    return startDate && endDate;
  });

  // Add to component class
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

  // Add methods to update filters
  updateFilters(newFilters: Partial<VisitorFilters>) {
    this.filters.update((current) => ({
      ...current,
      ...newFilters,
    }));

    // Only load visitors if both dates are set
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
