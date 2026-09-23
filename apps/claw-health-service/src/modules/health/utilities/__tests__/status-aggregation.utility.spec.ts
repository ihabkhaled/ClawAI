import { ServiceStatus } from '@claw/shared-types';

import { SERVICE_URLS } from '../../constants/health.constants';
import {
  COMPONENT_MEMBERS,
  MAX_INCIDENTS,
  STATUS_BUCKET_SECONDS,
} from '../../constants/status-page.constants';
import { ComponentState } from '../../enums/component-state.enum';
import { StatusComponent } from '../../enums/status-component.enum';
import { UptimeWindow } from '../../enums/uptime-window.enum';
import { type ServiceHealthResult } from '../../types/health.types';
import { type StatusHistoryInput } from '../../types/status-page.types';
import {
  buildHistory,
  composeStatusPage,
  currentComponentStates,
  overallState,
  stateFromFailures,
  toBasisPoints,
} from '../status-aggregation.utility';

const STEP = STATUS_BUCKET_SECONDS;
const END = 1_800_000_000; // a multiple of 300
const DAY_BUCKETS = 86_400 / STEP;

/** The last `count` bucket timestamps ending at END, oldest first. */
const lastBuckets = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => END - (count - 1 - index) * STEP);

const input = (
  failing: Record<string, number[]>,
  bucketsWithData: number[] = lastBuckets(DAY_BUCKETS),
): StatusHistoryInput => ({
  bucketsWithData,
  failingByService: new Map(
    Object.entries(failing).map(([name, buckets]) => [name, new Set(buckets)]),
  ),
  endSeconds: END,
  bucketSeconds: STEP,
});

const result = (name: string, status: ServiceStatus): ServiceHealthResult => ({
  name,
  status,
  responseTimeMs: status === ServiceStatus.UP ? 10 : null,
  error: status === ServiceStatus.UP ? null : `connect ECONNREFUSED https://${name}:4002`,
});

const componentOf = (history: ReturnType<typeof buildHistory>, component: StatusComponent) =>
  history.components.find((entry) => entry.component === component);

describe('toBasisPoints', () => {
  it('is integer basis points, rounded down so 99.99…% is never shown as 100%', () => {
    expect(toBasisPoints(1, 1)).toBe(10_000);
    expect(toBasisPoints(2, 3)).toBe(6_666);
    expect(toBasisPoints(287, 288)).toBe(9_965);
    expect(toBasisPoints(8_639, 8_640)).toBe(9_998);
    expect(Number.isInteger(toBasisPoints(1, 7))).toBe(true);
  });

  it('is null when there is nothing to divide by', () => {
    expect(toBasisPoints(0, 0)).toBeNull();
  });
});

describe('stateFromFailures / overallState', () => {
  it('maps failures to up, degraded and down', () => {
    expect(stateFromFailures(0, 4)).toBe(ComponentState.UP);
    expect(stateFromFailures(1, 4)).toBe(ComponentState.DEGRADED);
    expect(stateFromFailures(4, 4)).toBe(ComponentState.DOWN);
    expect(stateFromFailures(0, 0)).toBe(ComponentState.UNKNOWN);
  });

  it('is up only when every measured component is, down only when every one is', () => {
    expect(overallState([ComponentState.UP, ComponentState.UP])).toBe(ComponentState.UP);
    expect(overallState([ComponentState.UP, ComponentState.DOWN])).toBe(ComponentState.DEGRADED);
    expect(overallState([ComponentState.DOWN, ComponentState.DOWN])).toBe(ComponentState.DOWN);
    expect(overallState([ComponentState.UP, ComponentState.UNKNOWN])).toBe(ComponentState.UP);
    expect(overallState([ComponentState.UNKNOWN])).toBe(ComponentState.UNKNOWN);
  });
});

describe('COMPONENT_MEMBERS', () => {
  // A service missing from every group would silently fall off the page.
  it('puts every checked service in exactly one component', () => {
    const grouped = COMPONENT_MEMBERS.flatMap((group) => [...group.services]).sort();
    expect(grouped).toEqual(Object.keys(SERVICE_URLS).sort());
  });
});

describe('currentComponentStates', () => {
  it('derives each component from its own services only', () => {
    const services = Object.keys(SERVICE_URLS).map((name) =>
      result(
        name,
        name === 'memory-service' || name === 'payment-service'
          ? ServiceStatus.DOWN
          : ServiceStatus.UP,
      ),
    );

    const states = currentComponentStates(services);

    expect(states.get(StatusComponent.CHAT)).toBe(ComponentState.DEGRADED);
    expect(states.get(StatusComponent.PAYMENTS)).toBe(ComponentState.DOWN);
    expect(states.get(StatusComponent.FILES)).toBe(ComponentState.UP);
  });

  it('is unknown for a component none of whose services were measured', () => {
    expect(currentComponentStates([]).get(StatusComponent.ACCOUNTS)).toBe(ComponentState.UNKNOWN);
  });
});

describe('buildHistory', () => {
  it('is 100% with no failure and full coverage over a measured day', () => {
    const accounts = componentOf(buildHistory(input({})), StatusComponent.ACCOUNTS);
    const day = accounts?.uptime.find((entry) => entry.window === UptimeWindow.DAY);

    expect(day).toEqual({
      window: UptimeWindow.DAY,
      uptimeBasisPoints: 10_000,
      coverageBasisPoints: 10_000,
    });
  });

  it('counts a bucket with any failed check against the component', () => {
    const buckets = lastBuckets(DAY_BUCKETS);
    const history = buildHistory(input({ 'auth-service': [buckets[10] ?? 0, buckets[11] ?? 0] }));
    const day = componentOf(history, StatusComponent.ACCOUNTS)?.uptime[0];

    // 286 of 288 buckets up: floor(286 * 10000 / 288) = 9930.
    expect(day?.uptimeBasisPoints).toBe(9_930);
    expect(componentOf(history, StatusComponent.CHAT)?.uptime[0]?.uptimeBasisPoints).toBe(10_000);
  });

  it('leaves unmeasured buckets out of the fraction and reports the coverage', () => {
    const halfDay = lastBuckets(DAY_BUCKETS / 2);
    const week = componentOf(
      buildHistory(input({}, halfDay)),
      StatusComponent.ACCOUNTS,
    )?.uptime.find((entry) => entry.window === UptimeWindow.WEEK);

    expect(week?.uptimeBasisPoints).toBe(10_000);
    // 144 of the 2016 buckets in a week were measured.
    expect(week?.coverageBasisPoints).toBe(714);
  });

  it('is null, not 100%, for a window with no data at all', () => {
    const month = componentOf(buildHistory(input({}, [])), StatusComponent.ACCOUNTS)?.uptime[2];
    expect(month).toEqual({
      window: UptimeWindow.MONTH,
      uptimeBasisPoints: null,
      coverageBasisPoints: 0,
    });
  });

  it('turns a contiguous run of failing buckets into one closed incident', () => {
    const buckets = lastBuckets(DAY_BUCKETS);
    const run = [buckets[100] ?? 0, buckets[101] ?? 0, buckets[102] ?? 0];
    const [incident] = buildHistory(input({ 'payment-service': run })).incidents;

    expect(incident).toEqual({
      component: StatusComponent.PAYMENTS,
      state: ComponentState.DOWN,
      startedAt: new Date(((buckets[100] ?? 0) - STEP) * 1000).toISOString(),
      endedAt: new Date((buckets[102] ?? 0) * 1000).toISOString(),
      durationSeconds: 3 * STEP,
    });
  });

  it('marks an incident degraded when only part of the component failed, and open while it lasts', () => {
    const buckets = lastBuckets(DAY_BUCKETS);
    const [incident] = buildHistory(input({ 'memory-service': buckets.slice(-2) })).incidents;

    expect(incident?.component).toBe(StatusComponent.CHAT);
    expect(incident?.state).toBe(ComponentState.DEGRADED);
    expect(incident?.endedAt).toBeNull();
    expect(incident?.durationSeconds).toBe(2 * STEP);
  });

  it('splits a run at an unmeasured bucket rather than assuming it was still down', () => {
    const buckets = lastBuckets(DAY_BUCKETS);
    const withGap = buckets.filter((_, index) => index !== 51);
    const history = buildHistory(input({ 'image-service': buckets.slice(50, 53) }, withGap));

    expect(history.incidents).toHaveLength(2);
  });

  it('returns at most MAX_INCIDENTS, newest first', () => {
    const buckets = lastBuckets(DAY_BUCKETS);
    const alternating = buckets.filter((_, index) => index % 2 === 0);
    const { incidents } = buildHistory(input({ 'auth-service': alternating }));

    expect(incidents).toHaveLength(MAX_INCIDENTS);
    const starts = incidents.map((incident) => incident.startedAt);
    expect([...starts].sort().reverse()).toEqual(starts);
  });
});

describe('composeStatusPage', () => {
  const failingEverywhere = Object.keys(SERVICE_URLS).map((name) =>
    result(name, ServiceStatus.DOWN),
  );

  it('reports every component, in page order, with no history when Prometheus was unreadable', () => {
    const page = composeStatusPage(currentComponentStates(failingEverywhere), null, END * 1000);

    expect(page.components.map((entry) => entry.component)).toEqual(
      COMPONENT_MEMBERS.map((group) => group.component),
    );
    expect(page.overall).toBe(ComponentState.DOWN);
    expect(page.historyAvailable).toBe(false);
    expect(page.incidents).toEqual([]);
    expect(page.components[0]?.uptime.every((entry) => entry.uptimeBasisPoints === null)).toBe(
      true,
    );
  });

  // rules/19: the status response names components, never infrastructure.
  it('carries no service name, host, port, URL or error message', () => {
    const buckets = lastBuckets(DAY_BUCKETS);
    const history = buildHistory(
      input({ 'chat-service': buckets.slice(-3), 'payment-service': [buckets[5] ?? 0] }),
    );
    const json = JSON.stringify(
      composeStatusPage(currentComponentStates(failingEverywhere), history, END * 1000),
    );

    expect(json).not.toMatch(/-service/);
    expect(json).not.toMatch(/https?:/);
    expect(json).not.toMatch(/:40\d\d/);
    expect(json).not.toMatch(/ECONNREFUSED|prometheus|9090/i);
    for (const name of Object.keys(SERVICE_URLS)) {
      expect(json).not.toContain(name);
    }
  });
});
