#!/usr/bin/env node
// scripts/local-runtime-probes/probe-sd-webui.mjs
//
// Probe a Stable Diffusion WebUI (AUTOMATIC1111) instance:
//   1. Fire POST /sdapi/v1/txt2img with stream-like behaviour (single response).
//   2. In parallel, poll /sdapi/v1/progress every <poll-interval-ms> ms and
//      log each progress JSON as raw + emit STEP_PROGRESS normalized events.
//   3. When the txt2img response arrives, log metadata-only summary
//      (image count, info length) — NOT base64 image bytes — and emit
//      ARTIFACT_SAVED normalized event.
//
// Usage:
//   node scripts/local-runtime-probes/probe-sd-webui.mjs \
//        --url http://localhost:7860 \
//        --prompt "a futuristic AI control room" \
//        --steps 12 \
//        --width 256 --height 256 \
//        --poll-interval-ms 1000 \
//        --preview false

import { randomUUID } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
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
    url: 'http://localhost:7860',
    prompt: 'a futuristic AI control room',
    steps: 12,
    width: 256,
    height: 256,
    'poll-interval-ms': 1000,
    preview: false,
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
  for (const k of ['steps', 'width', 'height', 'poll-interval-ms']) {
    if (typeof args[k] === 'string') args[k] = Number.parseInt(args[k], 10);
  }
  if (typeof args.preview === 'string') args.preview = args.preview === 'true';
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = args.url.replace(/\/$/, '');
  const runId = randomUUID();
  const startedAtMs = Date.now();
  const nextSeq = createSequenceCounter();

  const { raw, norm, rawPath, normPath } = await openOutputFiles('sd-webui');

  process.stdout.write(
    `probe-sd-webui: runId=${runId} url=${baseUrl} steps=${args.steps} ${args.width}x${args.height}\n`,
  );

  await writeJsonl(
    norm,
    buildEnvelope({
      runId,
      provider: Provider.STABLE_DIFFUSION_WEBUI,
      modality: Modality.IMAGE,
      eventType: EventType.LIFECYCLE,
      stage: Stage.CONNECTING,
      sequence: nextSeq(),
      runtimeUrl: baseUrl,
      metrics: buildMetrics({
        startedAtMs,
        elapsedMs: 0,
        totalSteps: args.steps,
        progressConfidence: Confidence.STAGE_ESTIMATED,
      }),
    }),
  );

  const stagesObserved = new Set();
  let maxProgress = 0;

  // Kick off txt2img (fire-and-forget; we await separately).
  const txt2imgUrl = `${baseUrl}/sdapi/v1/txt2img`;
  const txt2imgPromise = fetch(txt2imgUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: args.prompt,
      steps: args.steps,
      width: args.width,
      height: args.height,
      batch_size: 1,
    }),
  }).catch((err) => ({ __error: err }));

  // Poll /sdapi/v1/progress in parallel until txt2img resolves.
  let pollingDone = false;
  const skipCurrentImage = args.preview ? 'false' : 'true';
  const progressUrl = `${baseUrl}/sdapi/v1/progress?skip_current_image=${skipCurrentImage}`;

  const pollLoop = (async () => {
    while (!pollingDone) {
      try {
        const res = await fetch(progressUrl);
        if (!res.ok) {
          await writeJsonl(raw, {
            timestampMs: Date.now(),
            kind: 'progress-http-error',
            status: res.status,
          });
          await sleep(args['poll-interval-ms']);
          continue;
        }
        const json = await res.json();
        await writeJsonl(raw, { timestampMs: Date.now(), kind: 'progress', body: json });

        const stateJob = json?.state?.job ?? '';
        const samplingStep = json?.state?.sampling_step ?? 0;
        const samplingSteps = json?.state?.sampling_steps ?? args.steps;
        const progress = typeof json?.progress === 'number' ? json.progress : 0;
        const etaRel = typeof json?.eta_relative === 'number' ? json.eta_relative : undefined;
        maxProgress = Math.max(maxProgress, progress);

        // Derive a stage from the state. AUTOMATIC1111 reports sampling steps
        // primarily; we map any positive progress to GENERATING.
        let stage = Stage.QUEUED;
        if (progress > 0 && progress < 1) stage = Stage.GENERATING;
        else if (progress >= 1) stage = Stage.POST_PROCESSING;
        stagesObserved.add(stage);

        await writeJsonl(
          norm,
          buildEnvelope({
            runId,
            provider: Provider.STABLE_DIFFUSION_WEBUI,
            modality: Modality.IMAGE,
            eventType: EventType.STEP_PROGRESS,
            stage,
            sequence: nextSeq(),
            runtimeUrl: baseUrl,
            rawProviderEventType: stateJob || 'progress',
            metrics: buildMetrics({
              startedAtMs,
              elapsedMs: Date.now() - startedAtMs,
              currentStep: samplingStep,
              totalSteps: samplingSteps,
              progressPercent: progress * 100,
              progressConfidence: Confidence.RUNTIME_REPORTED,
              ...(etaRel !== undefined ? { samplingMs: etaRel * 1000 } : {}),
            }),
          }),
        );
      } catch (err) {
        await writeJsonl(raw, {
          timestampMs: Date.now(),
          kind: 'progress-error',
          message: err.message,
        });
      }
      await sleep(args['poll-interval-ms']);
    }
  })();

  // Wait for txt2img.
  const result = await txt2imgPromise;
  pollingDone = true;
  await pollLoop;

  if (result?.__error) {
    process.stderr.write(`probe-sd-webui: txt2img failed: ${result.__error.message}\n`);
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.STABLE_DIFFUSION_WEBUI,
        modality: Modality.IMAGE,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        runtimeUrl: baseUrl,
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: result.__error.message,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  const response = result;
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    process.stderr.write(
      `probe-sd-webui: HTTP ${response.status} ${text.slice(0, 200)}\n`,
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  const json = await response.json();
  // Metadata-only summary (no base64 bytes).
  const imageCount = Array.isArray(json?.images) ? json.images.length : 0;
  const firstImageLen =
    imageCount > 0 && typeof json.images[0] === 'string' ? json.images[0].length : 0;
  const info = typeof json?.info === 'string' ? json.info : '';

  await writeJsonl(raw, {
    timestampMs: Date.now(),
    kind: 'txt2img-response-summary',
    imageCount,
    firstImageBase64Length: firstImageLen,
    width: args.width,
    height: args.height,
    infoLength: info.length,
    parameters: json?.parameters ?? null,
  });

  const artifactId = randomUUID();
  await writeJsonl(
    norm,
    buildEnvelope({
      runId,
      provider: Provider.STABLE_DIFFUSION_WEBUI,
      modality: Modality.IMAGE,
      eventType: EventType.ARTIFACT_SAVED,
      stage: Stage.SAVING,
      sequence: nextSeq(),
      runtimeUrl: baseUrl,
      artifactId,
      rawProviderEventType: 'txt2img.response',
      metrics: buildMetrics({
        startedAtMs,
        elapsedMs: Date.now() - startedAtMs,
        progressConfidence: Confidence.EXACT,
      }),
    }),
  );

  await writeJsonl(
    norm,
    buildEnvelope({
      runId,
      provider: Provider.STABLE_DIFFUSION_WEBUI,
      modality: Modality.IMAGE,
      eventType: EventType.LIFECYCLE,
      stage: Stage.DONE,
      sequence: nextSeq(),
      runtimeUrl: baseUrl,
      metrics: buildMetrics({
        startedAtMs,
        elapsedMs: Date.now() - startedAtMs,
        currentStep: args.steps,
        totalSteps: args.steps,
        progressPercent: 100,
        progressConfidence: Confidence.EXACT,
      }),
    }),
  );

  const totalMs = Date.now() - startedAtMs;
  process.stdout.write(
    [
      'probe-sd-webui: SUMMARY',
      `  stages=${[...stagesObserved].join(',') || 'none'}`,
      `  maxProgressPercent=${(maxProgress * 100).toFixed(1)}`,
      `  imageCount=${imageCount}`,
      `  totalMs=${totalMs}`,
      `  raw=${rawPath}`,
      `  normalized=${normPath}`,
    ].join('\n') + '\n',
  );

  await raw.close();
  await norm.close();
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`probe-sd-webui: ${err.message}\n`);
  process.exit(1);
});
