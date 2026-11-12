export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheck {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  database: HealthStatus;
}
