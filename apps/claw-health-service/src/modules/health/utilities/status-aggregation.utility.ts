import { ServiceStatus } from '@claw/shared-types';

import {
  BASIS_POINTS,
  COMPONENT_MEMBERS,
  INCIDENT_WINDOW_SECONDS,
  MAX_INCIDENTS,
  STATUS_BUCKET_SECONDS,
  UPTIME_WINDOW_SECONDS,
  UPTIME_WINDOWS,
} from '../constants/status-page.constants';
import { ComponentState } from '../enums/component-state.enum';
import { type StatusComponent } from '../enums/status-component.enum';
import { type UptimeWindow } from '../enums/uptime-window.enum';
import { type ServiceHealthResult } from '../types/health.types';
import {
  type ComponentHistory,
  type ComponentMembers,
  type ComponentUptime,
  type StatusHistory,
  type StatusHistoryInput,
  type StatusIncident,
  type StatusPageResponse,
} from '../types/status-page.types';

/**
 * `part / whole` as integer basis points, rounded DOWN, so 99.999 % is never
 * shown as 100 %. Null when there is nothing to divide by.
 */
export function toBasisPoints(part: number, whole: number): number | null {
  return whole <= 0 ? null : Math.floor((part * BASIS_POINTS) / whole);
}

/** UP when nothing failed, DOWN when everything did, DEGRADED in between. */
export function stateFromFailures(failed: number, members: number): ComponentState {
  if (members <= 0) {
    return ComponentState.UNKNOWN;
  }
  if (failed === 0) {
    return ComponentState.UP;
  }
  return failed >= members ? ComponentState.DOWN : ComponentState.DEGRADED;
}

/** The whole platform: UP only if every measured component is, DOWN only if every one is. */
export function overallState(states: readonly ComponentState[]): ComponentState {
  const measured = states.filter((state) => state !== ComponentState.UNKNOWN);
  if (measured.length === 0) {
    return ComponentState.UNKNOWN;
  }
  if (measured.every((state) => state === ComponentState.UP)) {
    return ComponentState.UP;
  }
  return measured.every((state) => state === ComponentState.DOWN) ? ComponentState.DOWN : ComponentState.DEGRADED;
}

/** Each component's state right now, from the live health fan-out. */
export function currentComponentStates(
  services: readonly ServiceHealthResult[],
): Map<StatusComponent, ComponentState> {
  const byName = new Map(services.map((service) => [service.name, service.status]));
  const states = new Map<StatusComponent, ComponentState>();
  for (const { component, services: members } of COMPONENT_MEMBERS) {
    const measured = members.filter((name) => byName.has(name));
    const failed = measured.filter((name) => byName.get(name) !== ServiceStatus.UP).length;
    states.set(component, stateFromFailures(failed, measured.length));
  }
  return states;
}

/** A component's state in one bucket: how many of its services failed a check in it. */
function bucketState(
  group: ComponentMembers,
  bucket: number,
  input: StatusHistoryInput,
): ComponentState {
  const failed = group.services.filter(
    (name) => input.failingByService.get(name)?.has(bucket) === true,
  ).length;
  return stateFromFailures(failed, group.services.length);
}

function uptimeFor(
  states: ReadonlyMap<number, ComponentState>,
  window: UptimeWindow,
  input: StatusHistoryInput,
): ComponentUptime {
  const windowSeconds = UPTIME_WINDOW_SECONDS[window];
  const from = input.endSeconds - windowSeconds;
  let measured = 0;
  let up = 0;
  for (const [bucket, state] of states) {
    if (bucket > from && bucket <= input.endSeconds) {
      measured += 1;
      up += state === ComponentState.UP ? 1 : 0;
    }
  }
  const expected = Math.floor(windowSeconds / input.bucketSeconds);
  return {
    window,
    uptimeBasisPoints: toBasisPoints(up, measured),
    coverageBasisPoints: Math.min(BASIS_POINTS, toBasisPoints(measured, expected) ?? 0),
  };
}

function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

function closeIncident(
  component: StatusComponent,
  run: readonly [number, ComponentState][],
  input: StatusHistoryInput,
): StatusIncident {
  const first = run[0]?.[0] ?? input.endSeconds;
  const last = run.at(-1)?.[0] ?? first;
  const reachedDown = run.some(([, state]) => state === ComponentState.DOWN);
  return {
    component,
    state: reachedDown ? ComponentState.DOWN : ComponentState.DEGRADED,
    // A bucket stamped t covers (t - bucket, t].
    startedAt: toIso(first - input.bucketSeconds),
    endedAt: last >= input.endSeconds ? null : toIso(last),
    durationSeconds: last - first + input.bucketSeconds,
  };
}

/**
 * Contiguous runs of not-UP buckets inside the incident window. A bucket with
 * no data breaks a run: "not measured" is not evidence that it was still down.
 */
function incidentsFor(
  component: StatusComponent,
  states: ReadonlyMap<number, ComponentState>,
  input: StatusHistoryInput,
): StatusIncident[] {
  const from = input.endSeconds - INCIDENT_WINDOW_SECONDS;
  const buckets = [...states.keys()].filter((bucket) => bucket > from).sort((a, b) => a - b);
  const incidents: StatusIncident[] = [];
  let run: [number, ComponentState][] = [];
  for (const bucket of buckets) {
    const state = states.get(bucket) ?? ComponentState.UNKNOWN;
    const previous = run.at(-1)?.[0];
    const continues = previous !== undefined && bucket - previous === input.bucketSeconds;
    if (run.length > 0 && (state === ComponentState.UP || !continues)) {
      incidents.push(closeIncident(component, run, input));
      run = [];
    }
    if (state !== ComponentState.UP) {
      run.push([bucket, state]);
    }
  }
  if (run.length > 0) {
    incidents.push(closeIncident(component, run, input));
  }
  return incidents;
}

/**
 * Uptime per window and the incident list, for every component, from the two
 * Prometheus range queries. Pure integer arithmetic on bucket counts.
 */
export function buildHistory(input: StatusHistoryInput): StatusHistory {
  const components: ComponentHistory[] = [];
  const incidents: StatusIncident[] = [];
  for (const group of COMPONENT_MEMBERS) {
    const states = new Map<number, ComponentState>();
    for (const bucket of input.bucketsWithData) {
      states.set(bucket, bucketState(group, bucket, input));
    }
    components.push({
      component: group.component,
      uptime: UPTIME_WINDOWS.map((window) => uptimeFor(states, window, input)),
    });
    incidents.push(...incidentsFor(group.component, states, input));
  }
  incidents.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return { components, incidents: incidents.slice(0, MAX_INCIDENTS) };
}

/** What the page shows for a window when history could not be read. */
function unmeasuredUptime(): ComponentUptime[] {
  return UPTIME_WINDOWS.map((window) => ({
    window,
    uptimeBasisPoints: null,
    coverageBasisPoints: 0,
  }));
}

/**
 * The response: live state per component plus the history, or no history at
 * all when Prometheus could not be read. Built from enum keys, states and
 * integers only, so there is nothing in it to redact.
 */
export function composeStatusPage(
  current: ReadonlyMap<StatusComponent, ComponentState>,
  history: StatusHistory | null,
  nowMs: number,
): StatusPageResponse {
  const components = COMPONENT_MEMBERS.map(({ component }) => ({
    component,
    state: current.get(component) ?? ComponentState.UNKNOWN,
    uptime:
      history?.components.find((entry) => entry.component === component)?.uptime ??
      unmeasuredUptime(),
  }));
  return {
    generatedAt: new Date(nowMs).toISOString(),
    overall: overallState(components.map((entry) => entry.state)),
    components,
    incidents: history?.incidents ?? [],
    historyAvailable: history !== null,
    bucketSeconds: STATUS_BUCKET_SECONDS,
  };
}
