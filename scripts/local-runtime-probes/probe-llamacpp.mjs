#!/usr/bin/env node
// scripts/local-runtime-probes/probe-llamacpp.mjs
//
// Two modes:
//   1. Default: via claw-llamacpp-service (requires admin JWT).
//      - GET /api/v1/llamacpp/runtime-progress/probe  -> capability/probe report
//      - POST /api/v1/llamacpp/v1/chat/completions    -> OpenAI-compatible SSE stream
//   2. --direct-url <url>: direct llama-server.
//      - POST /completion stream:true return_progress:true timings_per_token:true
//
// Usage:
//   node scripts/local-runtime-probes/probe-llamacpp.mjs \
//        --service-url https://localhost \
//        --prompt "Solve 14*23. Show your reasoning."
//
//   node scripts/local-runtime-probes/probe-llamacpp.mjs \
//        --direct-url http://localhost:8080 \
//        --prompt "Solve 14*23." \
//        --mode completion
//
// Env: QA_ADMIN_EMAIL, QA_ADMIN_PASS (defaults admin@claw.local / ClawAdmin123!)

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
  VisibleReasoning,
} from './lib/normalize.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = resolve(SCRIPT_DIR, '..', '..');

function parseArgs(argv) {
  const args = {
    'service-url': 'https://localhost',
    'direct-url': undefined,
    prompt: 'Solve 14*23. Show your reasoning.',
    mode: 'chat',
    model: 'gpt-3.5-turbo', // ignored by llama.cpp OpenAI proxy
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

// fetch wrapper that tolerates self-signed certs on https://localhost.
// claw.sh up issues a mkcert-signed leaf cert that node's built-in trust
// store doesn't know about; rather than wire up undici Agents we scope
// NODE_TLS_REJECT_UNAUTHORIZED=0 to this process only (operator diagnostic,
// never propagates to the rest of the system).
async function fetchLocal(url, init) {
  if (url.startsWith('https:') && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  return fetch(url, init);
}

async function login(serviceUrl, email, password) {
  const res = await fetchLocal(`${serviceUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`login failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const token = json?.accessToken ?? json?.token ?? json?.data?.accessToken;
  if (!token) throw new Error('login response missing accessToken');
  return token;
}

async function runViaService(args) {
  const serviceUrl = args['service-url'].replace(/\/$/, '');
  const email = process.env.QA_ADMIN_EMAIL ?? 'admin@claw.local';
  const password = process.env.QA_ADMIN_PASS ?? 'ClawAdmin123!';
  const runId = randomUUID();
  const startedAtMs = Date.now();
  const nextSeq = createSequenceCounter();

  const { raw, norm, rawPath, normPath } = await openOutputFiles('llamacpp');

  process.stdout.write(
    `probe-llamacpp: runId=${runId} mode=service service=${serviceUrl}\n`,
  );

  await writeJsonl(
    norm,
    buildEnvelope({
      runId,
      provider: Provider.LLAMACPP,
      modality: Modality.TEXT,
      eventType: EventType.LIFECYCLE,
      stage: Stage.CONNECTING,
      sequence: nextSeq(),
      runtimeUrl: serviceUrl,
      metrics: buildMetrics({
        startedAtMs,
        elapsedMs: 0,
        progressConfidence: Confidence.STAGE_ESTIMATED,
      }),
    }),
  );

  let token;
  try {
    token = await login(serviceUrl, email, password);
  } catch (err) {
    process.stderr.write(`probe-llamacpp: ${err.message}\n`);
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: err.message,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  // Step 1: probe report.
  try {
    const probeRes = await fetchLocal(
      `${serviceUrl}/api/v1/llamacpp/runtime-progress/probe`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const probeJson = await probeRes.json().catch(() => ({}));
    await writeJsonl(raw, {
      timestampMs: Date.now(),
      kind: 'probe-report',
      status: probeRes.status,
      body: probeJson,
    });
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.LIFECYCLE,
        stage: Stage.HEALTH_CHECK,
        sequence: nextSeq(),
        runtimeUrl: serviceUrl,
        rawProviderEventType: 'probe-report',
        metrics: buildMetrics({
          startedAtMs,
          elapsedMs: Date.now() - startedAtMs,
          progressConfidence: Confidence.RUNTIME_REPORTED,
        }),
      }),
    );
  } catch (err) {
    process.stderr.write(`probe-llamacpp: probe-report fetch failed: ${err.message}\n`);
  }

  // Step 2: stream chat completion.
  const completionUrl = `${serviceUrl}/api/v1/llamacpp/v1/chat/completions`;
  let response;
  try {
    response = await fetchLocal(completionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: args.model,
        messages: [{ role: 'user', content: args.prompt }],
        stream: true,
      }),
    });
  } catch (err) {
    process.stderr.write(`probe-llamacpp: chat-completions failed: ${err.message}\n`);
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: err.message,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    process.stderr.write(
      `probe-llamacpp: HTTP ${response.status} ${response.statusText} ${text.slice(0, 200)}\n`,
    );
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  await consumeSseStream({
    body: response.body,
    raw,
    norm,
    runId,
    nextSeq,
    startedAtMs,
    runtimeUrl: completionUrl,
    modelId: args.model,
    isDirect: false,
  });

  process.stdout.write(
    [
      'probe-llamacpp: SUMMARY (service mode)',
      `  raw=${rawPath}`,
      `  normalized=${normPath}`,
    ].join('\n') + '\n',
  );

  await raw.close();
  await norm.close();
  process.exit(0);
}

async function runDirect(args) {
  const directUrl = args['direct-url'].replace(/\/$/, '');
  const runId = randomUUID();
  const startedAtMs = Date.now();
  const nextSeq = createSequenceCounter();

  const { raw, norm, rawPath, normPath } = await openOutputFiles('llamacpp');

  process.stdout.write(
    `probe-llamacpp: runId=${runId} mode=direct url=${directUrl}\n`,
  );

  await writeJsonl(
    norm,
    buildEnvelope({
      runId,
      provider: Provider.LLAMACPP,
      modality: Modality.TEXT,
      eventType: EventType.LIFECYCLE,
      stage: Stage.CONNECTING,
      sequence: nextSeq(),
      runtimeUrl: directUrl,
      metrics: buildMetrics({
        startedAtMs,
        elapsedMs: 0,
        progressConfidence: Confidence.STAGE_ESTIMATED,
      }),
    }),
  );

  const url = `${directUrl}/completion`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: args.prompt,
        stream: true,
        return_progress: true,
        timings_per_token: true,
      }),
    });
  } catch (err) {
    process.stderr.write(`probe-llamacpp: direct connection failed: ${err.message}\n`);
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: err.message,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    process.stderr.write(
      `probe-llamacpp: HTTP ${response.status} ${response.statusText} ${text.slice(0, 200)}\n`,
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  await consumeSseStream({
    body: response.body,
    raw,
    norm,
    runId,
    nextSeq,
    startedAtMs,
    runtimeUrl: url,
    modelId: undefined,
    isDirect: true,
  });

  process.stdout.write(
    [
      'probe-llamacpp: SUMMARY (direct mode)',
      `  raw=${rawPath}`,
      `  normalized=${normPath}`,
    ].join('\n') + '\n',
  );

  await raw.close();
  await norm.close();
  process.exit(0);
}

async function consumeSseStream({
  body,
  raw,
  norm,
  runId,
  nextSeq,
  startedAtMs,
  runtimeUrl,
  modelId,
  isDirect,
}) {
  const decoder = new TextDecoder();
  let buf = '';
  let firstTokenAt;
  let firstThinkingAt;
  let tokenCount = 0;

  for await (const chunk of body) {
    buf += decoder.decode(chunk, { stream: true });

    if (isDirect) {
      // llama-server direct /completion returns NDJSON (one JSON object per line).
      let nl;
      // eslint-disable-next-line no-cond-assign
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        await writeJsonl(raw, { timestampMs: Date.now(), line });
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue;
        }
        await handleLlamaDirectChunk({
          parsed,
          norm,
          runId,
          nextSeq,
          startedAtMs,
          runtimeUrl,
          modelId,
          state: { firstTokenAt, firstThinkingAt, tokenCount },
        });
        // Update state.
        if (
          parsed?.prompt_progress &&
          typeof parsed.prompt_progress.total === 'number'
        ) {
          // tracked in handler
        }
        if (typeof parsed?.content === 'string' && parsed.content.length > 0) {
          if (firstTokenAt === undefined) firstTokenAt = Date.now();
          tokenCount += 1;
        }
        if (parsed?.stop === true) {
          return;
        }
      }
      continue;
    }

    // Service mode: SSE framing (data: ... \n\n).
    let frameEnd;
    // eslint-disable-next-line no-cond-assign
    while ((frameEnd = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, frameEnd);
      buf = buf.slice(frameEnd + 2);
      const dataLines = frame
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim());
      for (const dataStr of dataLines) {
        if (!dataStr) continue;
        await writeJsonl(raw, { timestampMs: Date.now(), line: dataStr });
        if (dataStr === '[DONE]') {
          await writeJsonl(
            norm,
            buildEnvelope({
              runId,
              provider: Provider.LLAMACPP,
              modality: Modality.TEXT,
              eventType: EventType.LIFECYCLE,
              stage: Stage.DONE,
              sequence: nextSeq(),
              runtimeUrl,
              modelId,
              rawProviderEventType: '[DONE]',
              metrics: buildMetrics({
                startedAtMs,
                elapsedMs: Date.now() - startedAtMs,
                outputTokens: tokenCount,
                progressConfidence: Confidence.RUNTIME_REPORTED,
              }),
            }),
          );
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(dataStr);
        } catch {
          continue;
        }
        const delta = parsed?.choices?.[0]?.delta ?? {};
        const content = delta.content;
        const reasoning = delta.reasoning_content;
        if (typeof reasoning === 'string' && reasoning.length > 0) {
          if (firstThinkingAt === undefined) firstThinkingAt = Date.now();
          await writeJsonl(
            norm,
            buildEnvelope({
              runId,
              provider: Provider.LLAMACPP,
              modality: Modality.TEXT,
              eventType: EventType.REASONING_DELTA,
              stage: Stage.THINKING,
              sequence: nextSeq(),
              runtimeUrl,
              modelId,
              reasoningDelta: reasoning,
              visibleReasoningSource: VisibleReasoning.LLAMACPP_REASONING_CONTENT,
              rawProviderEventType: 'chat.completion.chunk.reasoning',
              metrics: buildMetrics({
                startedAtMs,
                elapsedMs: Date.now() - startedAtMs,
                timeToFirstThinkingMs: firstThinkingAt - startedAtMs,
                progressConfidence: Confidence.RUNTIME_REPORTED,
              }),
            }),
          );
        }
        if (typeof content === 'string' && content.length > 0) {
          if (firstTokenAt === undefined) firstTokenAt = Date.now();
          tokenCount += 1;
          await writeJsonl(
            norm,
            buildEnvelope({
              runId,
              provider: Provider.LLAMACPP,
              modality: Modality.TEXT,
              eventType: EventType.CONTENT_DELTA,
              stage: Stage.GENERATING,
              sequence: nextSeq(),
              runtimeUrl,
              modelId,
              contentDelta: content,
              rawProviderEventType: 'chat.completion.chunk',
              metrics: buildMetrics({
                startedAtMs,
                elapsedMs: Date.now() - startedAtMs,
                timeToFirstTokenMs: firstTokenAt - startedAtMs,
                outputTokens: tokenCount,
                progressConfidence: Confidence.RUNTIME_REPORTED,
              }),
            }),
          );
        }
      }
    }
  }
}

async function handleLlamaDirectChunk({
  parsed,
  norm,
  runId,
  nextSeq,
  startedAtMs,
  runtimeUrl,
  modelId,
  state,
}) {
  // prompt_progress
  if (
    parsed?.prompt_progress &&
    typeof parsed.prompt_progress.total === 'number' &&
    typeof parsed.prompt_progress.processed === 'number'
  ) {
    const pp = parsed.prompt_progress;
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.PROMPT_EVAL_PROGRESS,
        stage: Stage.PROMPT_EVAL,
        sequence: nextSeq(),
        runtimeUrl,
        modelId,
        rawProviderEventType: 'prompt_progress',
        metrics: buildMetrics({
          startedAtMs,
          elapsedMs: Date.now() - startedAtMs,
          promptTokens: pp.total,
          currentStep: pp.processed,
          totalSteps: pp.total,
          progressPercent: pp.total > 0 ? (pp.processed / pp.total) * 100 : undefined,
          progressConfidence: Confidence.RUNTIME_REPORTED,
        }),
      }),
    );
  }

  if (typeof parsed?.content === 'string' && parsed.content.length > 0) {
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.CONTENT_DELTA,
        stage: Stage.GENERATING,
        sequence: nextSeq(),
        runtimeUrl,
        modelId,
        contentDelta: parsed.content,
        rawProviderEventType: 'completion.content',
        metrics: buildMetrics({
          startedAtMs,
          elapsedMs: Date.now() - startedAtMs,
          progressConfidence: Confidence.RUNTIME_REPORTED,
        }),
      }),
    );
  }

  if (parsed?.stop === true) {
    const timings = parsed.timings ?? {};
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.METRICS,
        stage: Stage.DONE,
        sequence: nextSeq(),
        runtimeUrl,
        modelId,
        rawProviderEventType: 'stop',
        metrics: buildMetrics({
          startedAtMs,
          elapsedMs: Date.now() - startedAtMs,
          promptEvalMs: timings.prompt_ms,
          generationMs: timings.predicted_ms,
          promptTokens: timings.prompt_n,
          outputTokens: timings.predicted_n,
          tokensPerSecond: timings.predicted_per_second,
          progressConfidence: Confidence.EXACT,
        }),
      }),
    );
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.LLAMACPP,
        modality: Modality.TEXT,
        eventType: EventType.LIFECYCLE,
        stage: Stage.DONE,
        sequence: nextSeq(),
        runtimeUrl,
        modelId,
        rawProviderEventType: 'stop',
        metrics: buildMetrics({
          startedAtMs,
          elapsedMs: Date.now() - startedAtMs,
          progressConfidence: Confidence.EXACT,
        }),
      }),
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args['direct-url']) {
    await runDirect(args);
  } else {
    await runViaService(args);
  }
}

main().catch((err) => {
  process.stderr.write(`probe-llamacpp: ${err.message}\n`);
  process.exit(1);
});
