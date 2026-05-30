#!/usr/bin/env node
// scripts/local-runtime-probes/probe-ollama.mjs
//
// Stream a single chat/generate request against a local Ollama runtime and
// capture:
//   * raw NDJSON stream output       -> .local-runtime-probes/ollama/<ts>.raw.jsonl
//   * normalized ClawRuntimeProgressEvent stream -> .local-runtime-probes/ollama/<ts>.normalized.jsonl
//
// Usage:
//   node scripts/local-runtime-probes/probe-ollama.mjs \
//        --model qwen3:1.7b \
//        --prompt "What is 17 x 23? Think step by step." \
//        --mode chat \
//        --think true \
//        --num-predict 256 \
//        --url http://localhost:11434

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
    model: 'qwen3:1.7b',
    prompt: 'What is 17 x 23? Think step by step.',
    mode: 'chat',
    think: true,
    'num-predict': 256,
    url: 'http://localhost:11434',
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
  if (typeof args.think === 'string') args.think = args.think === 'true';
  if (typeof args['num-predict'] === 'string') {
    args['num-predict'] = Number.parseInt(args['num-predict'], 10);
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
  const raw = await open(rawPath, 'a');
  const norm = await open(normPath, 'a');
  return { raw, norm, rawPath, normPath };
}

async function writeJsonl(handle, obj) {
  await handle.write(`${JSON.stringify(obj)}\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = args.url.replace(/\/$/, '');
  const endpoint = args.mode === 'generate' ? '/api/generate' : '/api/chat';
  const url = `${baseUrl}${endpoint}`;

  const runId = randomUUID();
  const startedAtMs = Date.now();
  const nextSeq = createSequenceCounter();

  let raw;
  let norm;
  let rawPath;
  let normPath;
  try {
    ({ raw, norm, rawPath, normPath } = await openOutputFiles('ollama'));
  } catch (err) {
    process.stderr.write(`probe-ollama: failed to open output files: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `probe-ollama: runId=${runId} mode=${args.mode} model=${args.model} url=${url}\n`,
  );

  // Emit a synthetic CONNECTING lifecycle event for the normalized stream.
  await writeJsonl(
    norm,
    buildEnvelope({
      runId,
      provider: Provider.OLLAMA,
      modality: Modality.TEXT,
      eventType: EventType.LIFECYCLE,
      stage: Stage.CONNECTING,
      sequence: nextSeq(),
      modelId: args.model,
      runtimeUrl: url,
      metrics: buildMetrics({
        startedAtMs,
        elapsedMs: 0,
        progressConfidence: Confidence.STAGE_ESTIMATED,
      }),
    }),
  );

  const body =
    args.mode === 'generate'
      ? {
          model: args.model,
          prompt: args.prompt,
          stream: true,
          think: args.think,
          options: { num_predict: args['num-predict'] },
        }
      : {
          model: args.model,
          messages: [{ role: 'user', content: args.prompt }],
          stream: true,
          think: args.think,
          options: { num_predict: args['num-predict'] },
        };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    process.stderr.write(`probe-ollama: connection failed: ${err.message}\n`);
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.OLLAMA,
        modality: Modality.TEXT,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        modelId: args.model,
        runtimeUrl: url,
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
      `probe-ollama: HTTP ${response.status} ${response.statusText} ${text.slice(0, 200)}\n`,
    );
    await writeJsonl(
      norm,
      buildEnvelope({
        runId,
        provider: Provider.OLLAMA,
        modality: Modality.TEXT,
        eventType: EventType.ERROR,
        stage: Stage.ERROR,
        sequence: nextSeq(),
        modelId: args.model,
        runtimeUrl: url,
        errorType: ErrorType.RUNTIME_UNREACHABLE,
        errorMessage: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      }),
    );
    await raw.close();
    await norm.close();
    process.exit(1);
  }

  let firstByteAt;
  let firstTokenAt;
  let firstThinkingAt;
  let tokenCount = 0;
  let lastChunk;
  let contentBuffer = '';
  let thinkingBuffer = '';

  const decoder = new TextDecoder();
  let buf = '';

  for await (const chunk of response.body) {
    if (firstByteAt === undefined) firstByteAt = Date.now();
    buf += decoder.decode(chunk, { stream: true });
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
      lastChunk = parsed;

      // Ollama chat returns message.content/message.thinking;
      // Ollama generate returns response/thinking at top level.
      const content =
        parsed?.message?.content !== undefined
          ? parsed.message.content
          : parsed?.response;
      const thinking =
        parsed?.message?.thinking !== undefined
          ? parsed.message.thinking
          : parsed?.thinking;

      if (typeof thinking === 'string' && thinking.length > 0) {
        if (firstThinkingAt === undefined) firstThinkingAt = Date.now();
        thinkingBuffer += thinking;
        await writeJsonl(
          norm,
          buildEnvelope({
            runId,
            provider: Provider.OLLAMA,
            modality: Modality.TEXT,
            eventType: EventType.REASONING_DELTA,
            stage: Stage.THINKING,
            sequence: nextSeq(),
            modelId: args.model,
            runtimeUrl: url,
            reasoningDelta: thinking,
            visibleReasoningSource: VisibleReasoning.OLLAMA_THINKING_FIELD,
            rawProviderEventType: args.mode === 'chat' ? 'chat.thinking' : 'generate.thinking',
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
        contentBuffer += content;
        tokenCount += 1;
        await writeJsonl(
          norm,
          buildEnvelope({
            runId,
            provider: Provider.OLLAMA,
            modality: Modality.TEXT,
            eventType: EventType.CONTENT_DELTA,
            stage: Stage.GENERATING,
            sequence: nextSeq(),
            modelId: args.model,
            runtimeUrl: url,
            contentDelta: content,
            rawProviderEventType: args.mode === 'chat' ? 'chat.message' : 'generate.response',
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

      if (parsed?.done === true) {
        const nsToMs = (n) => (typeof n === 'number' ? n / 1e6 : undefined);
        const modelLoadMs = nsToMs(parsed.load_duration);
        const promptEvalMs = nsToMs(parsed.prompt_eval_duration);
        const generationMs = nsToMs(parsed.eval_duration);
        const totalMs = nsToMs(parsed.total_duration) ?? Date.now() - startedAtMs;
        const evalCount = parsed.eval_count ?? tokenCount;
        const promptEvalCount = parsed.prompt_eval_count;
        const tokensPerSecond =
          generationMs && generationMs > 0
            ? evalCount / (generationMs / 1000)
            : undefined;

        // Pick the slowest reported stage as the bottleneck.
        const stageDurations = [
          { stage: Stage.MODEL_LOADING, ms: modelLoadMs ?? 0 },
          { stage: Stage.PROMPT_EVAL, ms: promptEvalMs ?? 0 },
          { stage: Stage.GENERATING, ms: generationMs ?? 0 },
        ];
        stageDurations.sort((a, b) => b.ms - a.ms);
        const bottleneck = stageDurations[0].ms > 0 ? stageDurations[0].stage : undefined;

        await writeJsonl(
          norm,
          buildEnvelope({
            runId,
            provider: Provider.OLLAMA,
            modality: Modality.TEXT,
            eventType: EventType.METRICS,
            stage: Stage.DONE,
            sequence: nextSeq(),
            modelId: args.model,
            runtimeUrl: url,
            rawProviderEventType: 'done',
            metrics: buildMetrics({
              startedAtMs,
              elapsedMs: Date.now() - startedAtMs,
              timeToFirstByteMs:
                firstByteAt !== undefined ? firstByteAt - startedAtMs : undefined,
              timeToFirstTokenMs:
                firstTokenAt !== undefined ? firstTokenAt - startedAtMs : undefined,
              timeToFirstThinkingMs:
                firstThinkingAt !== undefined ? firstThinkingAt - startedAtMs : undefined,
              modelLoadMs,
              promptEvalMs,
              generationMs,
              promptTokens: promptEvalCount,
              outputTokens: evalCount,
              totalTokens:
                promptEvalCount !== undefined ? promptEvalCount + evalCount : evalCount,
              tokensPerSecond,
              bottleneckStage: bottleneck,
              progressConfidence: Confidence.EXACT,
            }),
          }),
        );

        await writeJsonl(
          norm,
          buildEnvelope({
            runId,
            provider: Provider.OLLAMA,
            modality: Modality.TEXT,
            eventType: EventType.LIFECYCLE,
            stage: Stage.DONE,
            sequence: nextSeq(),
            modelId: args.model,
            runtimeUrl: url,
            rawProviderEventType: 'done',
            metrics: buildMetrics({
              startedAtMs,
              elapsedMs: totalMs,
              progressConfidence: Confidence.EXACT,
            }),
          }),
        );

        process.stdout.write(
          [
            'probe-ollama: SUMMARY',
            `  model=${args.model}`,
            `  mode=${args.mode}`,
            `  totalTokens=${
              promptEvalCount !== undefined ? promptEvalCount + evalCount : evalCount
            }`,
            `  outputTokens=${evalCount}`,
            `  tokensPerSecond=${tokensPerSecond ? tokensPerSecond.toFixed(2) : 'n/a'}`,
            `  bottleneckStage=${bottleneck ?? 'n/a'}`,
            `  totalMs=${totalMs.toFixed(0)}`,
            `  raw=${rawPath}`,
            `  normalized=${normPath}`,
          ].join('\n') + '\n',
        );
      }
    }
  }

  if (!lastChunk || lastChunk.done !== true) {
    process.stderr.write('probe-ollama: stream ended without done=true\n');
  }

  await raw.close();
  await norm.close();
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`probe-ollama: ${err.message}\n`);
  process.exit(1);
});
