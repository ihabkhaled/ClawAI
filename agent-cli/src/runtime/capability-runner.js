/**
 * Capability runner (Stream 10 — desktop-agent flagship).
 *
 * Polls /agent/cli-capabilities/pending — the new generalised pipeline
 * that replaces the per-class flow. Each invocation carries a typed
 * capabilityClass + capabilityOperation; we look up the provider in
 * `providers/index.js`, call its `execute(input)` method, then POST
 * the result + undoPlan to /agent/cli-capabilities/:id/complete.
 *
 * For Stream 10 we ship the `TERMINAL` provider stub that delegates to
 * the existing spawn-manager so the round-trip works end-to-end before
 * filesystem / process / browser / etc. providers (streams 11-24)
 * land.
 *
 * NOT testing this in the current session — runs only on a paired
 * device. The skeleton is plumbed into the runtime registry but the
 * `start` CLI command still drives the legacy /agent/commands/pending
 * loop until the dual-write soak completes.
 */

import { request } from '../api/client.js';
import * as log from '../utils/logger.js';
import { providerRegistry } from '../capability-providers/index.js';
import * as activity from '../activity-memory/local-store.js';

const POLL_INTERVAL_MS = 3_000;
const POLL_BACKOFF_ON_ERROR_MS = 10_000;

export async function runCapabilityLoop({ stopSignal } = {}) {
  log.info('Capability runner: starting poll loop');
  while (stopSignal === undefined || !stopSignal.aborted) {
    try {
      const pending = await fetchPending();
      if (pending.length > 0) {
        log.info(`Capability runner: ${pending.length} invocation(s) to execute`);
        await Promise.all(pending.map((inv) => executeOne(inv)));
      }
    } catch (err) {
      log.warn(`Capability runner poll failed: ${err instanceof Error ? err.message : 'unknown'}`);
      await sleep(POLL_BACKOFF_ON_ERROR_MS);
      continue;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  log.info('Capability runner: stop signal received, exiting');
}

async function fetchPending() {
  const result = await request('/api/v1/agent/cli-capabilities/pending', { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

async function executeOne(invocation) {
  const provider = providerRegistry.get(invocation.capabilityClass);
  if (provider === undefined) {
    log.warn(`Capability runner: no provider for class=${invocation.capabilityClass}; failing`);
    await postComplete(invocation.id, {
      success: false,
      errorMessage: `NO_PROVIDER:${invocation.capabilityClass}`,
    });
    return;
  }
  try {
    const result = await provider.execute({
      operation: invocation.capabilityOperation,
      target: invocation.targetDescriptor,
      payload: invocation.payload,
      invocationId: invocation.id,
    });
    await postComplete(invocation.id, {
      success: true,
      result: result.output ?? {},
      undoPlan: result.undoPlan,
      noUndoReason: result.noUndoReason,
    });
    void recordActivity(invocation, 'success', null);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    log.warn(`Capability ${invocation.id} failed: ${message}`);
    await postComplete(invocation.id, {
      success: false,
      errorMessage: message,
    });
    void recordActivity(invocation, 'failure', message);
  }
}

async function recordActivity(invocation, outcome, errorMessage) {
  try {
    await activity.recordEntry({
      kind: `capability_${invocation.capabilityClass.toLowerCase()}_${outcome}`,
      summary: `${invocation.capabilityClass}.${invocation.capabilityOperation} ${outcome}`,
      occurredAt: new Date(),
      syncedToCloud: false,
      metadata: {
        invocationId: invocation.id,
        target: invocation.targetDescriptor,
        errorMessage,
      },
    });
  } catch (err) {
    // Activity logging is best-effort; failures must never break the runner.
    log.warn(`Activity record failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

async function postComplete(invocationId, body) {
  try {
    await request(`/api/v1/agent/cli-capabilities/${encodeURIComponent(invocationId)}/complete`, {
      method: 'POST',
      body,
    });
  } catch (err) {
    log.warn(`Failed to post complete for ${invocationId}: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
