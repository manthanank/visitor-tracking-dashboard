import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Visitor,
  VisitorCount,
  VisitorTrend,
  VisitorStatistics,
  VisitorFilters,
  Period
} from '../models/visitor.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VisitorService {
  private readonly apiUrl = environment.apiUrl;

  private http = inject(HttpClient);

  getAllVisitors(): Observable<VisitorCount[]> {
    return this.http.get<VisitorCount[]>(`${this.apiUrl}/visits`);
  }

  getVisitorCount(projectName: string): Observable<VisitorCount> {
    return this.http.get<VisitorCount>(`${this.apiUrl}/visit/${projectName}`);
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

  filterVisitors(filters: VisitorFilters): Observable<Visitor[]> {
    return this.http.get<Visitor[]>(`${this.apiUrl}/filter-visit`, {
      params: filters as any,
    });
  }
}