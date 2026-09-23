import { type ComponentState } from '../enums/component-state.enum';
import { type StatusComponent } from '../enums/status-component.enum';
import { type UptimeWindow } from '../enums/uptime-window.enum';

/** One status-page component and the services it is made of. */
export interface ComponentMembers {
  component: StatusComponent;
  services: readonly string[];
}

/**
 * One series from a Prometheus range query: its labels, and the bucket
 * timestamps (integer epoch seconds) at which it had a value.
 */
export interface RangeSeries {
  labels: Record<string, string>;
  timestamps: number[];
}

/** What the history is computed from: two range queries over the retention window. */
export interface StatusHistoryInput {
  /** Bucket timestamps at which Prometheus had any health sample. */
  bucketsWithData: readonly number[];
  /** Per service, the bucket timestamps at which at least one check failed. */
  failingByService: ReadonlyMap<string, ReadonlySet<number>>;
  /** The latest bucket timestamp the queries covered. */
  endSeconds: number;
  bucketSeconds: number;
}

/** Uptime over one window, in integer basis points (10,000 = 100 %). */
export interface ComponentUptime {
  window: UptimeWindow;
  /** Null when nothing was measured in the window. */
  uptimeBasisPoints: number | null;
  /** How much of the window was measured at all. */
  coverageBasisPoints: number;
}

/** One stretch of time during which a component was not fully up. */
export interface StatusIncident {
  component: StatusComponent;
  /** The worst state reached during the incident. */
  state: ComponentState;
  startedAt: string;
  /** Null while the incident is still open. */
  endedAt: string | null;
  durationSeconds: number;
}

/** A component's history: its uptime per window. */
export interface ComponentHistory {
  component: StatusComponent;
  uptime: ComponentUptime[];
}

/** Everything the history half of the page needs. */
export interface StatusHistory {
  components: ComponentHistory[];
  incidents: StatusIncident[];
}

/** One row of the status page. */
export interface ComponentStatus {
  component: StatusComponent;
  state: ComponentState;
  uptime: ComponentUptime[];
}

/**
 * The status page response.
 *
 * It carries component keys, states, integers and timestamps, and nothing
 * else: no service name, host, port, version or error message (rules/19).
 * A spec serialises it and asserts exactly that.
 */
export interface StatusPageResponse {
  generatedAt: string;
  overall: ComponentState;
  components: ComponentStatus[];
  incidents: StatusIncident[];
  /** False when Prometheus could not be read; the current state is still live. */
  historyAvailable: boolean;
  bucketSeconds: number;
}

/** A cached history read, and when it stops being reusable. */
export interface CachedHistory {
  history: StatusHistory | null;
  expiresAtMs: number;
}
