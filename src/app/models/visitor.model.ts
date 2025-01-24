export interface Visitor {
  _id?: string;
  projectName: string;
  ipAddress: string;
  userAgent?: string;
  browser?: string;
  device?: string;
  location?: string;
  lastVisit?: Date;
}

export interface Visitors {
  visitors: Visitor[];
  totalVisitors: number;
  totalPages: number;
  currentPage: number;
}

export interface VisitorCount {
  projectName: string;
  uniqueVisitors: number;
}

export interface VisitorTrend {
  _id: string;
  count: number;
}

export interface VisitorStatistics {
  mostUsedBrowser: string;
  mostUsedDevice: string;
  mostVisitedLocation: string;
}

export interface VisitorFilters {
  projectName?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  browser?: string;
  device?: string;
  page?: number;
  limit?: number;
}

export type Period = 'daily' | 'weekly' | 'monthly';

export type Locations = Location[];

export interface Location {
  location?: string;
  visitorCount: number;
}

export type Devices = Device[];

export interface Device {
  device?: string;
  visitorCount: number;
}
