export interface MetricPoint {
  time: string;
  latency_ms: number;
  error_rate: number;
  availability: number;
}

export interface IncidentReport {
  id: string;
  timestamp: string;
  action: string;
  analysis: string;
}

export interface ThresholdConfig {
  latency: number;
  errorRate: number;
}
