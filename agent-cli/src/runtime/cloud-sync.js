/**
 * V2 Stream 05 — Activity memory cloud sync loop.
 *
 * Background poll that drains local activity-memory rows flagged
 * `syncedToCloud=false` from the on-device store and POSTs them to
 * the cloud mirror endpoint at /api/v1/agent/activity-memory.
 *
 * Local-first defaults preserved:
 *   - Cloud sync is OFF unless `CLAW_ACTIVITY_CLOUD_SYNC=true` is set.
 *     Without that env var, the loop never starts. This honors the
 *     "local-first-by-default" rule in CLAUDE.md.
 *   - When ON, every existing unsynced row is drained — there is no
 *     per-row opt-in flag in v1. The user trades full sync for full
 *     local-only. Per-row opt-in is a follow-up (UI work).
 *   - If the cloud endpoint is unreachable, this loop logs a single
 *     WARN and backs off; it NEVER blocks the capability runner.
 *
 * Wired into the `start` command alongside runCapabilityLoop().
 */

import * as activity from '../activity-memory/local-store.js';
import { request } from '../api/client.js';
import * as log from '../utils/logger.js';

const ACTIVITY_SYNC_INTERVAL_MS = 60_000; // 60s
const ACTIVITY_SYNC_BACKOFF_MS = 300_000; // 5min on hard error
const ACTIVITY_BATCH_SIZE = 50;
const CLOUD_SYNC_ENV = 'CLAW_ACTIVITY_CLOUD_SYNC';

export function cloudSyncEnabled() {
  const raw = process.env[CLOUD_SYNC_ENV];
  return typeof raw === 'string' && raw.toLowerCase() === 'true';
}

export async function runCloudSyncLoop({ stopSignal, deviceId } = {}) {
  if (!cloudSyncEnabled()) {
    log.info(
      `Cloud sync: disabled (set ${CLOUD_SYNC_ENV}=true to enable; local-first by default).`,
    );
    return;
  }
  log.info(`Cloud sync: starting (interval=${String(ACTIVITY_SYNC_INTERVAL_MS / 1000)}s)`);
  while (stopSignal === undefined || !stopSignal.aborted) {
    const tickResult = await tick(deviceId);
    if (tickResult === 'backoff') {
      await sleep(ACTIVITY_SYNC_BACKOFF_MS);
    } else {
      await sleep(ACTIVITY_SYNC_INTERVAL_MS);
    }
  }
  log.info('Cloud sync: stop signal received, exiting');
}

async function tick(deviceId) {
  let unsynced;
  try {
    unsynced = await activity.listUnsynced({ limit: ACTIVITY_BATCH_SIZE });
  } catch (err) {
    log.warn(`Cloud sync: local listUnsynced failed — ${err instanceof Error ? err.message : 'unknown'}`);
    return 'backoff';
  }
  if (unsynced.length === 0) return 'ok';
  log.info(`Cloud sync: posting ${unsynced.length} unsynced rows`);
  const synced = [];
  for (const row of unsynced) {
    try {
      await request('/api/v1/agent/activity-memory', {
        method: 'POST',
        body: {
          deviceId: row.deviceId ?? deviceId ?? null,
          kind: row.kind,
          summary: row.summary,
          occurredAt: row.occurredAt,
          syncedToCloud: true,
          metadata: row.metadata ?? {},
        },
      });
      synced.push(row.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      log.warn(`Cloud sync: entry ${row.id} failed — ${msg}`);
      if (msg.includes('401') || msg.includes('403')) {
        return 'backoff'; // auth issue — stop hammering
      }
      // other errors (server 500, network) — continue with next entry,
      // failed row stays unsynced and will retry on next tick.
    }
  }
  if (synced.length > 0) {
    try {
      await activity.markSynced(synced);
      log.info(`Cloud sync: ${synced.length} rows marked synced locally`);
    } catch (err) {
      log.warn(
        `Cloud sync: markSynced failed — entries will resync next tick: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
  return 'ok';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
