import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Visitor,
  VisitorCount,
  VisitorTrend,
  VisitorStatistics,
  VisitorFilters,
  Period,
  Locations,
  Devices,
  Visitors,
  ActiveVisitors,
  BrowserOsStats,
  VisitorGrowth,
  VisitorsByDateRange,
  VisitorByIp,
  DailyActiveUsers,
  DailyStats,
} from '../models/visitor.model';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class VisitorService {
  private readonly apiUrl = environment.apiUrl;

  private http = inject(HttpClient);

  getTotalVisitors(): Observable<VisitorCount[]> {
    return this.http.get<VisitorCount[]>(`${this.apiUrl}/total-visits`);
  }

  getVisitorCount(projectName: string): Observable<VisitorCount> {
    return this.http.get<VisitorCount>(`${this.apiUrl}/visit/${projectName}`);
  }

  getLocations(): Observable<Locations> {
    return this.http.get<Locations>(`${this.apiUrl}/locations`);
  }

  getDevices(): Observable<Devices> {
    return this.http.get<Devices>(`${this.apiUrl}/devices`);
  }

  getVisitorTrend(
    projectName: string,
    period: Period
  ): Observable<VisitorTrend[]> {
    return this.http.get<VisitorTrend[]>(
      `${this.apiUrl}/visit-trend/${projectName}?period=${period}`
    );
  }

  getVisitorStatistics(projectName: string): Observable<VisitorStatistics> {
    return this.http.get<VisitorStatistics>(
      `${this.apiUrl}/visit-statistics/${projectName}`
    );
  }

  filterVisitors(filters: VisitorFilters): Observable<Visitors> {
    return this.http.get<Visitors>(`${this.apiUrl}/filter-visit`, {
      params: filters as any,
    });
  }

  trackVisitor(projectName: string): Observable<{
    message: string;
    projectName: string;
    uniqueVisitors: number;
  }> {
    return this.http.post<{
      message: string;
      projectName: string;
      uniqueVisitors: number;
    }>(`${this.apiUrl}/visit`, { projectName });
  }

  getAllVisitors(): Observable<Visitor[]> {
    return this.http.get<Visitor[]>(`${this.apiUrl}/visits`);
  }

  updateVisitor(
    id: string,
    visitorData: Partial<Visitor>
  ): Observable<Visitor> {
    return this.http.put<Visitor>(`${this.apiUrl}/visit/${id}`, visitorData);
  }

  deleteVisitor(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/visit/${id}`);
  }

  getVisitorByIp(ipAddress: string): Observable<VisitorByIp> {
    return this.http.get<VisitorByIp>(`${this.apiUrl}/visit-ip/${ipAddress}`);
  }

  getVisitorsByDateRange(
    startDate: string,
    endDate: string
  ): Observable<VisitorsByDateRange> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<VisitorsByDateRange>(`${this.apiUrl}/visits-by-date`, {
      params,
    });
  }

  getUniqueVisitorsDaily(
    projectName: string,
    startDate?: string,
    endDate?: string
  ): Observable<DailyActiveUsers> {
    let params = new HttpParams();

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<DailyActiveUsers>(
      `${this.apiUrl}/unique-visitors-daily/${projectName}`,
      { params }
    );
  }

  getActiveVisitors(minutes: number = 5): Observable<ActiveVisitors> {
    return this.http.get<ActiveVisitors>(
      `${this.apiUrl}/active-visitors?minutes=${minutes}`
    );
  }

  getBrowserOsStats(): Observable<BrowserOsStats> {
    return this.http.get<BrowserOsStats>(`${this.apiUrl}/browser-os-stats`);
  }

  exportVisitors(format: 'json' | 'csv' = 'json'): Observable<any> {
    if (format === 'csv') {
      return this.http.get(`${this.apiUrl}/export-visitors?format=${format}`, {
        responseType: 'text',
      });
    } else {
      return this.http.get<any>(
        `${this.apiUrl}/export-visitors?format=${format}`
      );
    }
  }

  getVisitorGrowth(): Observable<VisitorGrowth[]> {
    return this.http.get<VisitorGrowth[]>(`${this.apiUrl}/visitor-growth`);
  }

  getDailyStats(projectName: string, days: number = 7): Observable<DailyStats> {
    let params = new HttpParams();
    if (days && days !== 7) {
      params = params.set('days', days.toString());
    }
    return this.http.get<DailyStats>(`${this.apiUrl}/daily-stats/${projectName}`, { params });
  }
}
