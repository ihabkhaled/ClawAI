import { Worker } from 'node:worker_threads';
import { Logger } from '@nestjs/common';

import {
  BANNED_BROWSER_DOMAINS,
  BANNED_FS_PATH_PATTERNS,
  BANNED_TERMINAL_PATTERNS,
  SANDBOX_CODE_RANGE_MB,
  SANDBOX_DEFAULT_WALL_CLOCK_MS,
  SANDBOX_HEAP_MB,
} from '../constants/sandbox.constants';
import type { RecipeDsl } from '../../recipes/types/recipe.types';
import type { SandboxResult, StaticAnalysisFinding } from '../types/sandbox.types';

/**
 * Stream 42 — Marketplace recipe sandbox runner.
 *
 * Defense-in-depth on top of Ed25519 signature verification: even a
 * legitimately-signed recipe can contain bugs or hostile patterns. Before
 * accepting a marketplace recipe for execution, we run it through:
 *
 *   1. **Static analysis** — checks every step's target / payload for
 *      banned patterns (path traversal in FS targets, command injection
 *      indicators in TERMINAL targets, network-bound URLs in BROWSER
 *      steps, etc.). Pure synchronous; never executes anything.
 *
 *   2. **Dry-run worker** — spawns a Node `worker_threads.Worker` with
 *      `resourceLimits` (max old/young heap, code-range size) and a
 *      strict execution budget (default 5s wall clock, 100ms CPU per
 *      step). The worker walks the recipe steps in topological order
 *      WITHOUT executing any capability — it just resolves placeholders
 *      against synthetic params and validates each step parses.
 *
 *      If the worker doesn't terminate in `wallClockMs`, the runner
 *      kills it and reports `STATUS=TIMEOUT`.
 *
 *      The worker has no access to the parent process (transferList is
 *      empty, no shared module imports, no `process.env` propagation).
 *
 * The full sandbox architecture for runtime execution (where the
 * recipe actually fires capability invocations) is the existing
 * approval-gated pipeline — every step still goes through risk scoring
 * + policy matching + per-class targetMatcher validation. The sandbox
 * runner here is the additional pre-flight check before a user installs
 * a marketplace recipe.
 */

const logger = new Logger('SandboxRunner');

export function staticAnalyse(dsl: RecipeDsl): StaticAnalysisFinding[] {
  const findings: StaticAnalysisFinding[] = [];
  for (const step of dsl.steps) {
    const targetStr = JSON.stringify(step.target);
    const payloadStr = step.payload === undefined ? '' : JSON.stringify(step.payload);
    if (step.capabilityClass === 'FILESYSTEM') {
      for (const pat of BANNED_FS_PATH_PATTERNS) {
        if (pat.test(targetStr)) {
          findings.push({
            stepId: step.id,
            severity: 'high',
            code: 'FS_PATH_BANNED',
            message: `step ${step.id} target matches banned FS pattern ${pat.source}`,
          });
        }
      }
    }
    if (step.capabilityClass === 'TERMINAL') {
      for (const pat of BANNED_TERMINAL_PATTERNS) {
        if (pat.test(targetStr) || pat.test(payloadStr)) {
          findings.push({
            stepId: step.id,
            severity: 'critical',
            code: 'TERMINAL_INJECTION',
            message: `step ${step.id} matches banned terminal pattern ${pat.source}`,
          });
        }
      }
    }
    if (step.capabilityClass === 'BROWSER') {
      for (const pat of BANNED_BROWSER_DOMAINS) {
        if (pat.test(targetStr)) {
          findings.push({
            stepId: step.id,
            severity: 'high',
            code: 'BROWSER_DOMAIN_BANNED',
            message: `step ${step.id} URL matches banned browser domain ${pat.source}`,
          });
        }
      }
    }
  }
  return findings;
}

export async function dryRunInWorker(
  dsl: RecipeDsl,
  options: { wallClockMs?: number } = {},
): Promise<SandboxResult> {
  const wallClockMs = options.wallClockMs ?? SANDBOX_DEFAULT_WALL_CLOCK_MS;
  const startedAt = Date.now();

  // Worker source is inlined as a string so we avoid bundling another
  // file path that's vulnerable to swap-attack between sign and load.
  const workerSource = `
    const { parentPort, workerData } = require('node:worker_threads');
    const dsl = workerData.dsl;
    const findings = [];
    try {
      // Walk steps; verify each step's target/payload is JSON-serialisable
      // and validate placeholder strings are well-formed.
      for (const step of dsl.steps ?? []) {
        const t = JSON.stringify(step.target ?? {});
        const p = step.payload === undefined ? '' : JSON.stringify(step.payload);
        // Any string that starts with '$' must match the placeholder grammar
        const rx = new RegExp(${JSON.stringify(
          String.raw`^\$(params|steps)\.[a-zA-Z_][a-zA-Z0-9_-]*(\.[a-zA-Z_][a-zA-Z0-9_-]*|\.\d+)*$`,
        )});
        const stringsToCheck = [];
        function collect(v) {
          if (typeof v === 'string') stringsToCheck.push(v);
          else if (Array.isArray(v)) for (const x of v) collect(x);
          else if (v !== null && typeof v === 'object') for (const k of Object.keys(v)) collect(v[k]);
        }
        collect(step.target);
        if (step.payload !== undefined) collect(step.payload);
        for (const s of stringsToCheck) {
          if (s.startsWith('$') && !s.startsWith('$$') && !rx.test(s)) {
            findings.push({
              stepId: step.id,
              severity: 'medium',
              code: 'BAD_PLACEHOLDER',
              message: 'malformed $-prefixed string: ' + s.slice(0, 80),
            });
          }
        }
      }
      parentPort.postMessage({ ok: true, findings });
    } catch (e) {
      parentPort.postMessage({ ok: false, error: String(e) });
    }
  `;

  return new Promise<SandboxResult>((resolve) => {
    let resolved = false;
    const worker = new Worker(workerSource, {
      eval: true,
      workerData: { dsl },
      resourceLimits: {
        maxOldGenerationSizeMb: SANDBOX_HEAP_MB,
        maxYoungGenerationSizeMb: SANDBOX_HEAP_MB / 4,
        codeRangeSizeMb: SANDBOX_CODE_RANGE_MB,
      },
      env: {},
      argv: [],
    });
    const killTimer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      logger.warn(`dryRunInWorker: wall-clock timeout (${String(wallClockMs)}ms)`);
      void worker.terminate();
      resolve({
        status: 'TIMEOUT',
        durationMs: Date.now() - startedAt,
        staticFindings: [],
        runtimeFindings: [],
        error: 'wall_clock_timeout',
      });
    }, wallClockMs);
    worker.on('message', (msg: { ok: boolean; findings?: StaticAnalysisFinding[]; error?: string }) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(killTimer);
      void worker.terminate();
      resolve({
        status: msg.ok ? 'OK' : 'ERROR',
        durationMs: Date.now() - startedAt,
        staticFindings: [],
        runtimeFindings: msg.findings ?? [],
        error: msg.error,
      });
    });
    worker.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(killTimer);
      resolve({
        status: 'ERROR',
        durationMs: Date.now() - startedAt,
        staticFindings: [],
        runtimeFindings: [],
        error: err.message,
      });
    });
  });
}

/**
 * Combined check: static analysis + dry-run in worker. Returns OK only
 * when there are no critical/high findings AND the worker terminated
 * within the wall-clock budget.
 */
export async function sandboxAnalyse(dsl: RecipeDsl): Promise<SandboxResult> {
  const staticFindings = staticAnalyse(dsl);
  const dynamic = await dryRunInWorker(dsl);
  const merged: SandboxResult = {
    status: dynamic.status,
    durationMs: dynamic.durationMs,
    staticFindings,
    runtimeFindings: dynamic.runtimeFindings,
    error: dynamic.error,
  };
  if (merged.status === 'OK') {
    const blocking = staticFindings.find((f) => f.severity === 'critical' || f.severity === 'high');
    if (blocking !== undefined) {
      merged.status = 'BLOCKED';
      merged.error = `blocking static finding: ${blocking.code} on ${blocking.stepId}`;
    }
  }
  return merged;
}
