import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
