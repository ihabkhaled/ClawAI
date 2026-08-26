import { type ModelAuthorizationDenialReason } from '../enums/model-authorization-denial-reason.enum';

export interface ModelAuthorizationLatencySnapshot {
  readonly samples: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly maxMs: number;
}

export interface ModelAuthorizationMetricsSnapshot {
  readonly startedAt: string;
  readonly allowed: number;
  readonly denied: number;
  readonly denialsByReason: Readonly<Record<ModelAuthorizationDenialReason, number>>;
  readonly latency: ModelAuthorizationLatencySnapshot;
}
