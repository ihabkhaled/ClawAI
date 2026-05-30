#!/usr/bin/env node
// scripts/local-runtime-probes/probe-comfyui.mjs
//
// Probe a ComfyUI instance via its WebSocket + REST API.
//   1. Open WS ws://<host>/ws?clientId=<id>.
//   2. POST /prompt {workflow, client_id}. Capture prompt_id.
//   3. Log every WS message to .raw.jsonl; emit normalized
//      ClawRuntimeProgressEvent for executing / progress / executed /
//      execution_cached / execution_error / status messages.
//   4. On execution complete: GET /history/<prompt_id>. Write metadata-only
//      summary + emit ARTIFACT_SAVED.
//
// Usage:
//   node scripts/local-runtime-probes/probe-comfyui.mjs \
//        --url http://localhost:8188 \
//        --workflow-file scripts/local-runtime-probes/fixtures/comfyui-minimal-workflow.json

import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildEnvelope,
  buildMetrics,
  Confidence,
  createSequenceCounter,
  ErrorType,
  EventType,
  Modality,
  Provider,
  Stage,
} from './lib/normalize.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = resolve(SCRIPT_DIR, '..', '..');

function parseArgs(argv) {
  const args = {
    url: 'http://localhost:8188',
    'workflow-file': resolve(SCRIPT_DIR, 'fixtures', 'comfyui-minimal-workflow.json'),
    'client-id': `clawai-probe-${randomUUID()}`,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function tsStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function openOutputFiles(runtimeName) {
  const stamp = tsStamp();
  const outDir = resolve(WORKTREE_ROOT, '.local-runtime-probes', runtimeName);
  await mkdir(outDir, { recursive: true });
  const rawPath = resolve(outDir, `${stamp}.raw.jsonl`);
  const normPath = resolve(outDir, `${stamp}.normalized.jsonl`);
  return {
    raw: await open(rawPath, 'a'),
    norm: await open(normPath, 'a'),
    rawPath,
    normPath,
  };
}

async function writeJsonl(handle, obj) {
  await handle.write(`${JSON.stringify(obj)}\n`);
}

async function getWebSocketCtor() {
  if (typeof globalThis.WebSocket === 'function') {
    return { Ctor: globalThis.WebSocket, isGlobal: true };
  }
  try {
    const wsMod = await import('ws');
    return { Ctor: wsMod.WebSocket ?? wsMod.default, isGlobal: false };
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = args.url.replace(/\/$/, '');
  const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/ws?clientId=${encodeURIComponent(
    args['client-id'],
  )}`;

  const runId = randomUUID();
  const startedAtMs = Date.now();
  const nextSeq = createSequenceCounter();

  const { raw, norm, rawPath, normPath } = await openOutputFiles('comfyui');

  process.stdout.write(
    `probe-comfyui: runId=${runId} clientId=${args['client-id']} url=${baseUrl}\n`,
  );

  const wsCtorResult = await getWebSocketCtor();
  if (!wsCtorResult) {
    process.stderr.write(
      'probe-comfyui: no WebSocket implementation available. Use Node 22+ for global WebSocket, or install the `ws` package.\n',
    );
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.COMFYUI,
        modality: Modality.IMAGE,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        runtimeUrl: baseUrl,
        errorType: ErrorType.BINARY_NOT_INSTALLED,
        errorMessage: 'WebSocket implementation unavailable',
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }
  const { Ctor: WebSocketCtor } = wsCtorResult;

  // Load workflow.
  let workflowText;
  try {
    workflowText = await readFile(args['workflow-file'], 'utf8');
  } catch (err) {
    process.stderr.write(
      `probe-comfyui: cannot read workflow ${args['workflow-file']}: ${err.message}\n`,
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }
  let workflow;
  try {
    workflow = JSON.parse(workflowText);
  } catch (err) {
    process.stderr.write(`probe-comfyui: invalid workflow JSON: ${err.message}\n`);
    await raw.close();
    await norm.close();
    process.exit(1);
  }
  if (workflow.client_id !== undefined) workflow.client_id = args['client-id'];

  await writeJsonl(
    norm,
    buildEnvelope({
      runId,
      provider: Provider.COMFYUI,
      modality: Modality.IMAGE,
      eventType: EventType.LIFECYCLE,
      stage: Stage.CONNECTING,
      sequence: nextSeq(),
      runtimeUrl: wsUrl,
      metrics: buildMetrics({
        startedAtMs,
        elapsedMs: 0,
        progressConfidence: Confidence.STAGE_ESTIMATED,
      }),
    }),
  );

  // Open WS.
  let ws;
  try {
    ws = new WebSocketCtor(wsUrl);
  } catch (err) {
    process.stderr.write(`probe-comfyui: WS connect failed: ${err.message}\n`);
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.COMFYUI,
        modality: Modality.IMAGE,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        runtimeUrl: wsUrl,
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: err.message,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  const nodesExecuted = new Set();
  const cachedNodes = new Set();
  const nodeStartTimes = new Map();
  const nodeDurations = new Map();
  let promptId;
  let done = false;
  let exitCode = 0;
  let errorMsg;

  // Wait for WS open.
  await new Promise((res, rej) => {
    const onOpen = () => {
      ws.removeEventListener?.('error', onErr);
      res();
    };
    const onErr = (err) => {
      ws.removeEventListener?.('open', onOpen);
      rej(err?.error ?? new Error('WS error'));
    };
    if (ws.readyState === 1) {
      res();
      return;
    }
    if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('open', onOpen, { once: true });
      ws.addEventListener('error', onErr, { once: true });
    } else {
      ws.on('open', onOpen);
      ws.on('error', onErr);
    }
  }).catch(async (err) => {
    process.stderr.write(`probe-comfyui: WS open failed: ${err.message}\n`);
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.COMFYUI,
        modality: Modality.IMAGE,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        runtimeUrl: wsUrl,
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: err.message,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  });

  const messageHandler = async (event) => {
    const data = typeof event === 'object' && event !== null && 'data' in event ? event.data : event;
    if (typeof data !== 'string') {
      // Binary preview frame — capture length only.
      const len = data?.byteLength ?? data?.length ?? 0;
      await writeJsonl(raw, {
        timestampMs: Date.now(),
        kind: 'ws-binary',
        bytes: len,
      });
      return;
    }
    await writeJsonl(raw, { timestampMs: Date.now(), kind: 'ws-text', line: data });
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    const type = parsed?.type;
    const d = parsed?.data ?? {};

    if (type === 'status') {
      const queueRemaining = d?.status?.exec_info?.queue_remaining;
      await writeJsonl(
        norm,
        buildEnvelope({
          runId,
          provider: Provider.COMFYUI,
          modality: Modality.IMAGE,
          eventType: EventType.METRICS,
          stage: queueRemaining > 0 ? Stage.QUEUED : Stage.IDLE,
          sequence: nextSeq(),
          runtimeUrl: wsUrl,
          rawProviderEventType: 'status',
          metrics: buildMetrics({
            startedAtMs,
            elapsedMs: Date.now() - startedAtMs,
            queuePosition: queueRemaining,
            progressConfidence: Confidence.RUNTIME_REPORTED,
          }),
        }),
      );
      return;
    }

    if (type === 'execution_cached') {
      for (const n of d?.nodes ?? []) cachedNodes.add(n);
      await writeJsonl(
        norm,
        buildEnvelope({
          runId,
          provider: Provider.COMFYUI,
          modality: Modality.IMAGE,
          eventType: EventType.LIFECYCLE,
          stage: Stage.MODEL_WARMING_UP,
          sequence: nextSeq(),
          runtimeUrl: wsUrl,
          rawProviderEventType: 'execution_cached',
          metrics: buildMetrics({
            startedAtMs,
            elapsedMs: Date.now() - startedAtMs,
            progressConfidence: Confidence.RUNTIME_REPORTED,
          }),
        }),
      );
      return;
    }

    if (type === 'executing') {
      const nodeId = d?.node;
      // node===null AND prompt_id matches -> finished.
      if (nodeId === null) {
        done = true;
        await writeJsonl(
          norm,
          buildEnvelope({
            runId,
            provider: Provider.COMFYUI,
            modality: Modality.IMAGE,
            eventType: EventType.LIFECYCLE,
            stage: Stage.FINALIZING,
            sequence: nextSeq(),
            runtimeUrl: wsUrl,
            rawProviderEventType: 'executing.null',
            metrics: buildMetrics({
              startedAtMs,
              elapsedMs: Date.now() - startedAtMs,
              progressConfidence: Confidence.RUNTIME_REPORTED,
            }),
          }),
        );
        return;
      }
      nodesExecuted.add(nodeId);
      nodeStartTimes.set(nodeId, Date.now());
      await writeJsonl(
        norm,
        buildEnvelope({
          runId,
          provider: Provider.COMFYUI,
          modality: Modality.IMAGE,
          eventType: EventType.NODE_PROGRESS,
          stage: Stage.EXECUTING_NODE,
          sequence: nextSeq(),
          runtimeUrl: wsUrl,
          nodeId: String(nodeId),
          rawProviderEventType: 'executing',
          metrics: buildMetrics({
            startedAtMs,
            elapsedMs: Date.now() - startedAtMs,
            progressConfidence: Confidence.RUNTIME_REPORTED,
          }),
        }),
      );
      return;
    }

    if (type === 'progress') {
      const value = d?.value;
      const max = d?.max;
      const nodeId = d?.node;
      await writeJsonl(
        norm,
        buildEnvelope({
          runId,
          provider: Provider.COMFYUI,
          modality: Modality.IMAGE,
          eventType: EventType.NODE_PROGRESS,
          stage: Stage.EXECUTING_NODE,
          sequence: nextSeq(),
          runtimeUrl: wsUrl,
          nodeId: nodeId !== undefined ? String(nodeId) : undefined,
          rawProviderEventType: 'progress',
          metrics: buildMetrics({
            startedAtMs,
            elapsedMs: Date.now() - startedAtMs,
            currentStep: typeof value === 'number' ? value : undefined,
            totalSteps: typeof max === 'number' ? max : undefined,
            progressPercent:
              typeof value === 'number' && typeof max === 'number' && max > 0
                ? (value / max) * 100
                : undefined,
            progressConfidence: Confidence.RUNTIME_REPORTED,
          }),
        }),
      );
      return;
    }

    if (type === 'executed') {
      const nodeId = d?.node;
      if (nodeId !== undefined && nodeStartTimes.has(nodeId)) {
        nodeDurations.set(nodeId, Date.now() - nodeStartTimes.get(nodeId));
      }
      await writeJsonl(
        norm,
        buildEnvelope({
          runId,
          provider: Provider.COMFYUI,
          modality: Modality.IMAGE,
          eventType: EventType.NODE_PROGRESS,
          stage: Stage.NODE_COMPLETED,
          sequence: nextSeq(),
          runtimeUrl: wsUrl,
          nodeId: nodeId !== undefined ? String(nodeId) : undefined,
          rawProviderEventType: 'executed',
          metrics: buildMetrics({
            startedAtMs,
            elapsedMs: Date.now() - startedAtMs,
            progressConfidence: Confidence.RUNTIME_REPORTED,
          }),
        }),
      );
      return;
    }

    if (type === 'execution_error') {
      errorMsg = d?.exception_message ?? d?.error ?? 'execution_error';
      exitCode = 1;
      done = true;
      await writeJsonl(
        norm,
        buildEnvelope({
          runId,
          provider: Provider.COMFYUI,
          modality: Modality.IMAGE,
          eventType: EventType.ERROR,
          stage: Stage.ERROR,
          sequence: nextSeq(),
          runtimeUrl: wsUrl,
          rawProviderEventType: 'execution_error',
          errorType: ErrorType.DECODER_ERROR,
          errorMessage: String(errorMsg).slice(0, 500),
        }),
      );
    }
  };

  if (typeof ws.addEventListener === 'function') {
    ws.addEventListener('message', (e) => void messageHandler(e));
  } else {
    ws.on('message', (data) => void messageHandler(data));
  }

  // POST /prompt
  let promptRes;
  try {
    promptRes = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    });
  } catch (err) {
    process.stderr.write(`probe-comfyui: POST /prompt failed: ${err.message}\n`);
    try {
      ws.close?.();
    } catch {
      /* ignore */
    }
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.COMFYUI,
        modality: Modality.IMAGE,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        runtimeUrl: baseUrl,
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: err.message,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  if (!promptRes.ok) {
    const text = await promptRes.text().catch(() => '');
    process.stderr.write(
      `probe-comfyui: HTTP ${promptRes.status} ${text.slice(0, 200)}\n`,
    );
    try {
      ws.close?.();
    } catch {
      /* ignore */
    }
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.COMFYUI,
        modality: Modality.IMAGE,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        runtimeUrl: baseUrl,
        errorType: ErrorType.WORKFLOW_INVALID,
        errorMessage: `HTTP ${promptRes.status}: ${text.slice(0, 200)}`,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  const promptJson = await promptRes.json();
  promptId = promptJson?.prompt_id;
  await writeJsonl(raw, {
    timestampMs: Date.now(),
    kind: 'prompt-response',
    body: promptJson,
  });

  // Wait until done or timeout (max 5 minutes).
  const maxWaitMs = 5 * 60 * 1000;
  const deadline = Date.now() + maxWaitMs;
  while (!done && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!done) {
    process.stderr.write('probe-comfyui: timeout waiting for completion\n');
    exitCode = 1;
  }

  try {
    ws.close?.();
  } catch {
    /* ignore */
  }

  // Pull history metadata-only summary.
  if (promptId && exitCode === 0) {
    try {
      const histRes = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`);
      if (histRes.ok) {
        const histJson = await histRes.json();
        const entry = histJson?.[promptId];
        // Metadata only: outputs node ids and counts of items, no base64.
        const outputs = entry?.outputs ?? {};
        const outputSummary = {};
        for (const [nodeId, out] of Object.entries(outputs)) {
          const images = Array.isArray(out?.images) ? out.images.length : 0;
          outputSummary[nodeId] = { images };
        }
        await writeJsonl(raw, {
          timestampMs: Date.now(),
          kind: 'history-summary',
          promptId,
          outputs: outputSummary,
          statusStr: entry?.status?.status_str,
        });
        const artifactId = randomUUID();
        await writeJsonl(
          norm,
          buildEnvelope({
            runId,
            provider: Provider.COMFYUI,
            modality: Modality.IMAGE,
            eventType: EventType.ARTIFACT_SAVED,
            stage: Stage.SAVING,
            sequence: nextSeq(),
            runtimeUrl: baseUrl,
            artifactId,
            rawProviderEventType: 'history',
            metrics: buildMetrics({
              startedAtMs,
              elapsedMs: Date.now() - startedAtMs,
              progressConfidence: Confidence.EXACT,
            }),
          }),
        );
      }
    } catch (err) {
      await writeJsonl(raw, {
        timestampMs: Date.now(),
        kind: 'history-error',
        message: err.message,
      });
    }

    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.COMFYUI,
        modality: Modality.IMAGE,
        eventType: EventType.LIFECYCLE,
        stage: Stage.DONE,
        sequence: nextSeq(),
        runtimeUrl: baseUrl,
        metrics: buildMetrics({
          startedAtMs,
          elapsedMs: Date.now() - startedAtMs,
          progressConfidence: Confidence.EXACT,
        }),
      }),
    );
  }

  // Summary.
  let slowestNode = 'n/a';
  let slowestMs = 0;
  for (const [nodeId, ms] of nodeDurations.entries()) {
    if (ms > slowestMs) {
      slowestMs = ms;
      slowestNode = String(nodeId);
    }
  }
  const totalMs = Date.now() - startedAtMs;
  process.stdout.write(
    [
      'probe-comfyui: SUMMARY',
      `  nodesExecuted=${nodesExecuted.size}`,
      `  cachedNodes=${cachedNodes.size}`,
      `  slowestNode=${slowestNode} (${slowestMs}ms)`,
      `  totalMs=${totalMs}`,
      errorMsg ? `  error=${errorMsg}` : null,
      `  raw=${rawPath}`,
      `  normalized=${normPath}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n',
  );

  await raw.close();
  await norm.close();
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`probe-comfyui: ${err.message}\n`);
  process.exit(1);
});
