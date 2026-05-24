import { CapabilityInvocationStatus } from '../../../../common/enums/capability-invocation-status.enum';
import { CapabilityDualWriteMetricsService } from '../capability-dual-write-metrics.service';

/**
 * V2 Stream 01 — unit tests for the in-memory dual-write metrics service.
 *
 * Coverage:
 *   - empty status defaults
 *   - single matching decision → 0 divergence
 *   - single divergent decision → 1 divergence + 1 recent entry
 *   - capability path error → counted as divergence with errorMessage
 *   - retirementReady gating (flag + min decisions + zero divergences)
 *   - reset() clears state
 *   - ring buffer caps at 50
 */
describe('CapabilityDualWriteMetricsService', () => {
  function makeService(): CapabilityDualWriteMetricsService {
    const svc = new CapabilityDualWriteMetricsService();
    return svc;
  }

  it('reports zero counters on a fresh service', () => {
    const svc = makeService();
    const status = svc.status();
    expect(status.totalDecisions).toBe(0);
    expect(status.divergentDecisions).toBe(0);
    expect(status.divergenceRate).toBe(0);
    expect(status.recentDivergences).toHaveLength(0);
    expect(status.retirementReady).toBe(false);
  });

  it('records a matching decision without divergence', () => {
    const svc = makeService();
    svc.recordDecision({
      commandPreview: 'ls -la',
      legacyDecision: CapabilityInvocationStatus.PENDING_APPROVAL,
      capabilityDecision: CapabilityInvocationStatus.PENDING_APPROVAL,
      legacyPolicyName: null,
      capabilityPolicyName: null,
    });
    const status = svc.status();
    expect(status.totalDecisions).toBe(1);
    expect(status.divergentDecisions).toBe(0);
    expect(status.recentDivergences).toHaveLength(0);
  });

  it('records a divergent decision and adds it to the recent ring', () => {
    const svc = makeService();
    svc.recordDecision({
      commandPreview: 'rm -rf /',
      legacyDecision: CapabilityInvocationStatus.DENIED,
      capabilityDecision: CapabilityInvocationStatus.PENDING_APPROVAL,
      legacyPolicyName: 'Block destructive ops',
      capabilityPolicyName: 'Default approval',
    });
    const status = svc.status();
    expect(status.totalDecisions).toBe(1);
    expect(status.divergentDecisions).toBe(1);
    expect(status.divergenceRate).toBe(1);
    expect(status.recentDivergences).toHaveLength(1);
    expect(status.recentDivergences[0]).toMatchObject({
      legacyDecision: CapabilityInvocationStatus.DENIED,
      capabilityDecision: CapabilityInvocationStatus.PENDING_APPROVAL,
      legacyPolicyName: 'Block destructive ops',
      capabilityPolicyName: 'Default approval',
    });
  });

  it('records a capability path error as a divergence with errorMessage', () => {
    const svc = makeService();
    svc.recordCapabilityPathError('echo hi', 'connection refused');
    const status = svc.status();
    expect(status.totalDecisions).toBe(1);
    expect(status.divergentDecisions).toBe(1);
    expect(status.recentDivergences[0]).toMatchObject({
      legacyDecision: 'OK',
      capabilityDecision: 'ERROR',
      errorMessage: 'connection refused',
    });
  });

  it('rejects retirementReady until 500 matching decisions accumulate', () => {
    const svc = makeService();
    // 499 matching → not ready
    for (let i = 0; i < 499; i += 1) {
      svc.recordDecision({
        commandPreview: `cmd-${String(i)}`,
        legacyDecision: CapabilityInvocationStatus.AUTO_APPROVED,
        capabilityDecision: CapabilityInvocationStatus.AUTO_APPROVED,
        legacyPolicyName: 'p',
        capabilityPolicyName: 'p',
      });
    }
    expect(svc.status().retirementReady).toBe(false);
    // 500th matching → ready (flag is default-on in tests since env unset)
    svc.recordDecision({
      commandPreview: 'cmd-500',
      legacyDecision: CapabilityInvocationStatus.AUTO_APPROVED,
      capabilityDecision: CapabilityInvocationStatus.AUTO_APPROVED,
      legacyPolicyName: 'p',
      capabilityPolicyName: 'p',
    });
    expect(svc.status().retirementReady).toBe(true);
  });

  it('does NOT flip retirementReady to true if any divergence occurred', () => {
    const svc = makeService();
    // 1 divergence
    svc.recordDecision({
      commandPreview: 'sudo bad',
      legacyDecision: CapabilityInvocationStatus.DENIED,
      capabilityDecision: CapabilityInvocationStatus.PENDING_APPROVAL,
      legacyPolicyName: null,
      capabilityPolicyName: null,
    });
    // + 500 matches
    for (let i = 0; i < 500; i += 1) {
      svc.recordDecision({
        commandPreview: `cmd-${String(i)}`,
        legacyDecision: CapabilityInvocationStatus.AUTO_APPROVED,
        capabilityDecision: CapabilityInvocationStatus.AUTO_APPROVED,
        legacyPolicyName: 'p',
        capabilityPolicyName: 'p',
      });
    }
    const status = svc.status();
    expect(status.divergentDecisions).toBe(1);
    expect(status.retirementReady).toBe(false);
  });

  it('reports flag=false when CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE is set to false', () => {
    const original = process.env.CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE;
    process.env.CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE = 'false';
    try {
      const svc = makeService();
      const status = svc.status();
      expect(status.enabled).toBe(false);
      expect(status.retirementReady).toBe(false); // gated on enabled=true
    } finally {
      if (original === undefined) {
        delete process.env.CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE;
      } else {
        process.env.CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE = original;
      }
    }
  });

  it('caps the recent ring at 50 entries (FIFO, newest first)', () => {
    const svc = makeService();
    for (let i = 0; i < 75; i += 1) {
      svc.recordDecision({
        commandPreview: `cmd-${String(i)}`,
        legacyDecision: CapabilityInvocationStatus.DENIED,
        capabilityDecision: CapabilityInvocationStatus.PENDING_APPROVAL,
        legacyPolicyName: null,
        capabilityPolicyName: null,
      });
    }
    const status = svc.status();
    expect(status.divergentDecisions).toBe(75);
    expect(status.recentDivergences).toHaveLength(50);
    // newest first — index 0 is cmd-74, index 49 is cmd-25
    expect(status.recentDivergences[0]?.commandPreview).toBe('cmd-74');
    expect(status.recentDivergences[49]?.commandPreview).toBe('cmd-25');
  });

  it('reset() clears all counters and starts a fresh window', async () => {
    const svc = makeService();
    svc.recordDecision({
      commandPreview: 'x',
      legacyDecision: CapabilityInvocationStatus.DENIED,
      capabilityDecision: CapabilityInvocationStatus.AUTO_APPROVED,
      legacyPolicyName: 'a',
      capabilityPolicyName: 'b',
    });
    const before = svc.status();
    // Wait at least 5ms so the new startedAt is strictly later than the
    // first one (some test environments tick at 1ms granularity).
    await new Promise((r) => setTimeout(r, 5));
    svc.reset();
    const after = svc.status();
    expect(after.totalDecisions).toBe(0);
    expect(after.divergentDecisions).toBe(0);
    expect(after.recentDivergences).toHaveLength(0);
    expect(new Date(after.startedAt).getTime()).toBeGreaterThan(new Date(before.startedAt).getTime());
  });
});
