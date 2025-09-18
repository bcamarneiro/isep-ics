export interface Event {
  start: Date;
  end: Date;
  summary: string;
  location: string;
  description: string;
}

export interface Config {
  baseUrl: string;
  codeUser?: string;
  codeUserCode?: string;
  entidade: string;
  username?: string;
  password?: string;
  weeksBefore: number;
  weeksAfter: number;
  refreshMinutes: number;
  timezone: string;
  port: number;
}

export interface SessionCookies {
  [key: string]: string;
}

export interface WeekEvent {
  codeWeek: string;
  events: Event[];
}

export interface HealthStatus {
  status: 'ok' | 'error';
  cacheExpires: string;
  sessionValid: boolean;
  eventsCount: number;
  lastRefresh?: string;
}

export interface ApiInfo {
  name: string;
  version: string;
  description: string;
  endpoints: {
    calendar: string;
    health: string;
    docs: string;
    openapi: string;
  };
}

export interface ErrorResponse {
  error: string;
  message?: string;
  timestamp: string;
}
