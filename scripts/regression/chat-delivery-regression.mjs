#!/usr/bin/env node
/**
 * Chat delivery regression: does an answer reach the page without a refresh?
 *
 * Two symptoms were reported and this reproduces both, separately, because they
 * have different causes and different fixes:
 *
 *   STUCK    — no assistant row is ever written. The run died somewhere between
 *              the routed event and the store.
 *   SILENT   — the assistant row IS in the database but no DONE event reached
 *              the client. The page keeps its in-flight state until the poll
 *              lands or the user refreshes, which is how this was reported.
 *
 * The distinction matters: a run that produced an answer nobody was told about
 * is a delivery bug, and a run with no answer at all is an execution bug.
 *
 * The subscribe order is a parameter because the UI races here. It opens the
 * stream from an effect *after* the send mutation fires, so a fast answer can
 * complete before anyone is listening; the server keeps a short replay buffer
 * to cover exactly that. `--order=after` is the honest reproduction of the UI,
 * `--order=before` is the control that removes the race.
 *
 * Usage:
 *   node scripts/regression/chat-delivery-regression.mjs \
 *     --threads=20 --messages=5 --concurrency=4 --order=after
 *
 * Reads CLAW_BASE_URL / CLAW_EMAIL / CLAW_PASSWORD, defaulting to the local
 * stack. Writes a JSON report next to the summary so a failing run can be
 * diffed against a passing one.
 */
import { writeFileSync } from 'node:fs';
import process from 'node:process';

const args = Object.fromEntries(
  process.argv.slice(2).map((raw) => {
    const [key, value = 'true'] = raw.replace(/^--/, '').split('=');
    return [key, value];
  }),
);

const BASE = process.env.CLAW_BASE_URL ?? 'https://claw.local';
const API = `${BASE}/api/v1`;
const EMAIL = process.env.CLAW_EMAIL ?? 'admin@claw.local';
const PASSWORD = process.env.CLAW_PASSWORD ?? 'ClawAdmin123!';

const THREADS = Number(args.threads ?? 20);
const MESSAGES = Number(args.messages ?? 5);
const CONCURRENCY = Number(args.concurrency ?? 4);
// "after" reproduces the UI's race; "before" removes it.
const ORDER = args.order === 'before' ? 'before' : 'after';
const ANSWER_TIMEOUT_MS = Number(args.timeout ?? 180_000);
const REPORT = args.report ?? 'chat-delivery-report.json';

/**
 * The local stack terminates TLS with a mkcert certificate Node does not trust.
 *
 * Verification is relaxed ONLY for the local host, and never on the strength of
 * a flag: a suite that turns verification off unconditionally would keep it off
 * the first time somebody points CLAW_BASE_URL at a staging box, and would then
 * happily talk to whatever answered. Prefer NODE_EXTRA_CA_CERTS with the mkcert
 * root if you need to run this against anything else.
 */
const LOCAL_TLS_HOSTS = new Set(['claw.local', 'localhost', '127.0.0.1']);
const targetHost = new URL(BASE).hostname;
if (LOCAL_TLS_HOSTS.has(targetHost)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else if (process.env.NODE_EXTRA_CA_CERTS === undefined) {
  console.warn(
    `TLS verification stays ON for ${targetHost}. Set NODE_EXTRA_CA_CERTS if its certificate is privately issued.`,
  );
}

/**
 * Prompts are varied on purpose.
 *
 * A hundred copies of one sentence would exercise one prompt shape and one
 * cache path. Length matters especially: a prompt of three words or fewer takes
 * a different branch in context assembly, so a suite made only of long prompts
 * would never touch it.
 */
const PROMPT_SHAPES = [
  (n) => `What is ${n} plus ${n}? Answer with the number only.`,
  (n) => `Name one colour. Ignore the number ${n}.`,
  (n) => `Reply with the single word OK. Reference ${n}.`,
  (n) => `In one short sentence, what is a database index? Question ${n}.`,
  (n) => `List two fruits, comma separated. Batch ${n}.`,
  (n) => `Say hi (${n})`,
  (n) => `Define recursion briefly, item ${n}.`,
  (n) => `What colour is the sky on a clear day? Item ${n}.`,
];

function prompt(threadIndex, messageIndex) {
  const n = threadIndex * 1000 + messageIndex;
  const shape = PROMPT_SHAPES[(threadIndex + messageIndex) % PROMPT_SHAPES.length];
  return shape(n);
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`login failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.tokens.accessToken;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function createThread(token, title) {
  const res = await fetch(`${API}/chat-threads`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`createThread failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).id;
}

async function countAssistantMessages(token, threadId) {
  const res = await fetch(`${API}/chat-messages/thread/${threadId}?page=1&limit=100`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    return -1;
  }
  const body = await res.json();
  const items = Array.isArray(body) ? body : (body.data ?? body.messages ?? []);
  return items.filter((m) => m.role === 'ASSISTANT').length;
}

/**
 * Watches one thread's stream until DONE, ERROR, or the deadline.
 *
 * Returns the terminal event rather than throwing on timeout: a run that never
 * terminates is a result, not an exception, and the caller needs the timing
 * either way.
 */
function watchStream(token, threadId, deadlineMs) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const seen = [];
  let resolveOuter;
  const settled = new Promise((resolve) => {
    resolveOuter = resolve;
  });

  const timer = setTimeout(() => {
    controller.abort();
    resolveOuter({ terminal: null, seen, elapsedMs: Date.now() - startedAt, timedOut: true });
  }, deadlineMs);

  void (async () => {
    try {
      const res = await fetch(`${API}/chat-messages/stream/${threadId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        clearTimeout(timer);
        resolveOuter({
          terminal: null,
          seen,
          elapsedMs: Date.now() - startedAt,
          streamStatus: res.status,
        });
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          for (const line of frame.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (raw.length === 0) continue;
            let parsed;
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }
            seen.push(parsed.type);
            // The wire values are lowercase (`StreamEventType.DONE = 'done'`).
            // Compared case-insensitively so a suite that guessed the casing
            // reports a delivery failure that is really its own bug — which is
            // exactly what the first run of this file did.
            const terminalType = String(parsed.type).toLowerCase();
            if (terminalType === 'done' || terminalType === 'error') {
              clearTimeout(timer);
              controller.abort();
              resolveOuter({
                terminal: terminalType,
                seen,
                elapsedMs: Date.now() - startedAt,
              });
              return;
            }
          }
        }
      }
      clearTimeout(timer);
      resolveOuter({ terminal: null, seen, elapsedMs: Date.now() - startedAt, closed: true });
    } catch (error) {
      clearTimeout(timer);
      if (!controller.signal.aborted) {
        resolveOuter({
          terminal: null,
          seen,
          elapsedMs: Date.now() - startedAt,
          error: String(error),
        });
      }
    }
  })();

  return { settled, close: () => controller.abort() };
}

async function sendMessage(token, threadId, content) {
  const res = await fetch(`${API}/chat-messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ threadId, content, role: 'USER' }),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? await res.json() : await res.text() };
}

/** Waits for the assistant row to appear, which is what a refresh would show. */
async function waitForAssistantRow(token, threadId, expected, deadlineMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < deadlineMs) {
    const count = await countAssistantMessages(token, threadId);
    if (count >= expected) {
      return { arrived: true, elapsedMs: Date.now() - startedAt, count };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { arrived: false, elapsedMs: Date.now() - startedAt };
}

async function runThread(token, threadIndex, results) {
  const threadId = await createThread(token, `regression-${threadIndex}`);
  for (let messageIndex = 0; messageIndex < MESSAGES; messageIndex += 1) {
    const content = prompt(threadIndex, messageIndex);
    const record = { threadId, threadIndex, messageIndex, content, order: ORDER };

    let watcher = null;
    if (ORDER === 'before') {
      watcher = watchStream(token, threadId, ANSWER_TIMEOUT_MS);
      // Give the subscription a moment to attach before the send.
      await new Promise((r) => setTimeout(r, 150));
    }

    const sentAt = Date.now();
    const sent = await sendMessage(token, threadId, content);
    record.sendStatus = sent.status;
    if (!sent.ok) {
      record.outcome = 'SEND_REJECTED';
      record.detail = String(sent.body).slice(0, 200);
      results.push(record);
      continue;
    }

    if (ORDER === 'after') {
      // The UI opens the stream from an effect after the mutation fires.
      watcher = watchStream(token, threadId, ANSWER_TIMEOUT_MS);
    }

    const stream = await watcher.settled;
    record.terminal = stream.terminal;
    record.streamMs = stream.elapsedMs;
    record.eventTypes = [...new Set(stream.seen)];

    const row = await waitForAssistantRow(
      token,
      threadId,
      messageIndex + 1,
      stream.terminal ? 15_000 : 30_000,
    );
    record.rowArrived = row.arrived;
    record.rowMs = row.elapsedMs;
    record.totalMs = Date.now() - sentAt;

    if (!row.arrived) {
      record.outcome = 'STUCK';
    } else if (stream.terminal === null) {
      // The answer exists but nobody was told. This is the refresh symptom.
      record.outcome = 'SILENT';
    } else if (stream.terminal === 'error') {
      record.outcome = 'STREAM_ERROR';
    } else {
      record.outcome = 'OK';
    }
    results.push(record);
    process.stdout.write(
      `${record.outcome === 'OK' ? '.' : `[${record.outcome}]`}${(results.length % 50 === 0) ? `\n` : ''}`,
    );
  }
}

async function main() {
  const token = await login();
  const results = [];
  const queue = Array.from({ length: THREADS }, (_, i) => i);
  const startedAt = Date.now();

  console.log(
    `chat delivery regression: ${THREADS} threads x ${MESSAGES} messages, concurrency ${CONCURRENCY}, subscribe ${ORDER}`,
  );

  const workers = Array.from({ length: Math.min(CONCURRENCY, THREADS) }, async () => {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) return;
      try {
        await runThread(token, index, results);
      } catch (error) {
        results.push({ threadIndex: index, outcome: 'THREAD_ERROR', detail: String(error) });
      }
    }
  });
  await Promise.all(workers);

  const byOutcome = results.reduce((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
    return acc;
  }, {});
  const okTimes = results.filter((r) => r.outcome === 'OK').map((r) => r.totalMs).sort((a, b) => a - b);
  const report = {
    config: { THREADS, MESSAGES, CONCURRENCY, ORDER, ANSWER_TIMEOUT_MS },
    total: results.length,
    byOutcome,
    durationMs: Date.now() - startedAt,
    medianOkMs: okTimes.length > 0 ? okTimes[Math.floor(okTimes.length / 2)] : null,
    p95OkMs: okTimes.length > 0 ? okTimes[Math.floor(okTimes.length * 0.95)] : null,
    failures: results.filter((r) => r.outcome !== 'OK'),
    results,
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));

  console.log(`\n\n--- ${results.length} messages in ${Math.round(report.durationMs / 1000)}s ---`);
  for (const [outcome, count] of Object.entries(byOutcome).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${outcome.padEnd(14)} ${count}`);
  }
  console.log(`  median OK ${report.medianOkMs}ms  p95 ${report.p95OkMs}ms`);
  console.log(`  report -> ${REPORT}`);

  // STUCK and SILENT are the reported bugs; a non-zero count is a failed run.
  const failed = (byOutcome.STUCK ?? 0) + (byOutcome.SILENT ?? 0) + (byOutcome.THREAD_ERROR ?? 0);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
