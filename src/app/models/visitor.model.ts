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
}

export interface VisitorFilters {
  projectName?: string;
  startDate?: string;
  endDate?: string;
  browser?: string;
  device?: string;
}

export type Period = 'daily' | 'weekly' | 'monthly';