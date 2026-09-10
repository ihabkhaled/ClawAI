import { describe, expect, it } from 'vitest';

import { CLIENT_LOG_MIN_TRANSPORT_LEVEL } from '@/constants';
import { LogLevel } from '@/enums';
import { passesSeverityGate } from '@/utilities/client-log-severity.utility';

/**
 * The severity gate, which carries most of the telemetry volume.
 *
 * `logger.debug` sits inside `queryFn`s, so it fires on every mount, refetch,
 * retry and invalidation — 45 call sites and the majority of the traffic. The
 * gate stops those at the network in production only; the in-memory store still
 * receives every level, so the developer log view is unaffected.
 */
describe('passesSeverityGate', () => {
  it('keeps debug off the network at an INFO floor', () => {
    expect(passesSeverityGate(LogLevel.DEBUG, LogLevel.INFO)).toBe(false);
  });

  it('passes every level at or above the floor', () => {
    expect(passesSeverityGate(LogLevel.INFO, LogLevel.INFO)).toBe(true);
    expect(passesSeverityGate(LogLevel.WARN, LogLevel.INFO)).toBe(true);
    expect(passesSeverityGate(LogLevel.ERROR, LogLevel.INFO)).toBe(true);
  });

  it('passes debug at a DEBUG floor, as it is outside production', () => {
    expect(passesSeverityGate(LogLevel.DEBUG, LogLevel.DEBUG)).toBe(true);
  });

  it('lets an ERROR floor through only errors', () => {
    expect(passesSeverityGate(LogLevel.WARN, LogLevel.ERROR)).toBe(false);
    expect(passesSeverityGate(LogLevel.ERROR, LogLevel.ERROR)).toBe(true);
  });

  it('compares by rank, which a bare string enum cannot do', () => {
    // 'WARN' < 'debug' as strings and > as severity. Getting this wrong is why
    // there was no gate at all before.
    expect(passesSeverityGate(LogLevel.WARN, LogLevel.DEBUG)).toBe(true);
  });

  it('never lets DEBUG onto the wire in production', () => {
    // The constant is resolved from NODE_ENV at module load. Tests run outside
    // production, so this pins the pair rather than the environment.
    const productionFloor = LogLevel.INFO;
    expect(passesSeverityGate(LogLevel.DEBUG, productionFloor)).toBe(false);
    // And confirms the shipped constant is one of the two intended values.
    expect([LogLevel.DEBUG, LogLevel.INFO]).toContain(CLIENT_LOG_MIN_TRANSPORT_LEVEL);
  });
});
