import { type AggregatedHealth } from './health.types';

/** One Prometheus sample: a value, and the labels that identify it. */
export interface PrometheusSample {
  value: number;
  labels?: Record<string, string>;
}

/** One metric family, as the text exposition format writes it. */
export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'gauge' | 'counter';
  samples: PrometheusSample[];
}

/** A health snapshot and when it was taken, so a scrape can report its age. */
export interface HealthSnapshot {
  health: AggregatedHealth;
  takenAtMs: number;
}
