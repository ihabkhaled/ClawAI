/**
 * V2 Stream 03 — `claw-agent run-recipe <recipeId>`.
 *
 * Triggers a recipe run from the CLI without going through the web UI.
 * Useful for: scripted automation, CI smoke runs, local testing, and
 * for verifying the runner end-to-end before recipe-builder lands.
 *
 * Flags:
 *   --device <id>    Device to execute on (default: this device)
 *   --param k=v      Repeatable; supplied to the recipe parameter map
 *   --dry-run        Use V2 Stream 01e dry-run mode (no capabilities created)
 *   --json           Machine-readable output
 *   --watch          Poll for status every 2s until the run reaches a
 *                    terminal state, then exit with code matching the
 *                    run's success (0 = SUCCEEDED, 1 = FAILED/CANCELLED)
 *
 * Exit codes:
 *   0  run started (or terminal SUCCEEDED with --watch)
 *   1  run failed / cancelled / timed out (only with --watch)
 *   2  recipe not found
 *   3  missing required parameter
 *   4  authentication missing
 */

import { request } from '../api/client.js';
import { readSecrets } from '../auth/auth-store.js';
import { readConfig } from '../config/config-store.js';
import * as log from '../utils/logger.js';

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT']);
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_TICKS = 300; // 10 minutes — matches RecipeTimeoutSweeperManager

function parseParams(flags) {
  const params = {};
  const raw = flags['--param'];
  if (raw === undefined) return params;
  const list = Array.isArray(raw) ? raw : [raw];
  for (const entry of list) {
    const eq = entry.indexOf('=');
    if (eq === -1) {
      throw new Error(`--param must be key=value, got "${entry}"`);
    }
    params[entry.slice(0, eq)] = entry.slice(eq + 1);
  }
  return params;
}

async function resolveDeviceId(flags) {
  const explicit = flags['--device'];
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;
  // Fall back to the CLI-paired device's deviceId (stored in secrets)
  const secrets = readSecrets();
  if (secrets === null || typeof secrets.deviceId !== 'string') {
    throw new Error(
      'No --device flag provided and this CLI is not paired. Run `claw-agent login` first.',
    );
  }
  return secrets.deviceId;
}

async function waitForTerminal(runId, asJson) {
  for (let i = 0; i < POLL_MAX_TICKS; i += 1) {
    const run = await request(`/api/v1/agent/recipe-runs/${encodeURIComponent(runId)}`);
    if (!asJson) {
      log.info(`tick ${String(i + 1)} — run ${runId} status=${run.status}`);
    }
    if (TERMINAL_STATUSES.has(run.status)) {
      return run;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`run ${runId} did not reach terminal state within ${String(POLL_MAX_TICKS * POLL_INTERVAL_MS / 1000)}s`);
}

export async function runRunRecipe(flags, positional) {
  const recipeId = positional[0];
  if (typeof recipeId !== 'string' || recipeId.length === 0) {
    log.error('Usage: claw-agent run-recipe <recipeId> [--device <id>] [--param k=v]... [--dry-run] [--watch] [--json]');
    process.exitCode = 1;
    return;
  }

  let secretsOk = true;
  try {
    if (readSecrets() === null) secretsOk = false;
  } catch {
    secretsOk = false;
  }
  if (!secretsOk) {
    log.error('Not authenticated — run `claw-agent login` first.');
    process.exitCode = 4;
    return;
  }

  const asJson = flags['--json'] === true;
  const dryRun = flags['--dry-run'] === true;
  const watch = flags['--watch'] === true;

  let deviceId;
  let params;
  try {
    deviceId = await resolveDeviceId(flags);
    params = parseParams(flags);
  } catch (err) {
    log.error(err instanceof Error ? err.message : 'flag parse failed');
    process.exitCode = 1;
    return;
  }

  const cfg = readConfig();
  if (!asJson) {
    log.info(`Starting recipe ${recipeId} on ${cfg.apiUrl} (device=${deviceId}, dryRun=${String(dryRun)})`);
  }

  let run;
  try {
    run = await request(`/api/v1/agent/recipes/${encodeURIComponent(recipeId)}/runs`, {
      method: 'POST',
      body: { deviceId, params, dryRun },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      log.error(`Recipe ${recipeId} not found.`);
      process.exitCode = 2;
      return;
    }
    if (msg.includes('400') || msg.toLowerCase().includes('required')) {
      log.error(`Missing required parameter: ${msg}`);
      process.exitCode = 3;
      return;
    }
    log.error(`Run start failed: ${msg}`);
    process.exitCode = 1;
    return;
  }

  if (!asJson) {
    log.success(`Run created: ${run.id} (status=${run.status})`);
  }

  if (!watch) {
    if (asJson) console.log(JSON.stringify(run, null, 2));
    return;
  }

  let terminal;
  try {
    terminal = await waitForTerminal(run.id, asJson);
  } catch (err) {
    log.error(err instanceof Error ? err.message : 'watch failed');
    process.exitCode = 1;
    return;
  }

  if (asJson) {
    console.log(JSON.stringify(terminal, null, 2));
  } else {
    const ok = terminal.status === 'SUCCEEDED';
    if (ok) {
      log.success(`Run ${run.id} ${terminal.status}`);
    } else {
      log.error(`Run ${run.id} ${terminal.status} — ${terminal.errorMessage ?? 'no message'}`);
    }
  }
  process.exitCode = terminal.status === 'SUCCEEDED' ? 0 : 1;
}
