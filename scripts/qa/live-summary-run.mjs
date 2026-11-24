#!/usr/bin/env node
// One-click "Summarize video" end to end (ADR-221 batch 6, 2026-11-24) against a running stack: creates
// a summary session for a recorded video, keeps it open with heartbeats, reads the SSE stream until the
// FINAL card (or the timeout), and prints what the report holds and what was billed. PASS/FAIL lines.
//
//   LIVE_QA_URL=<recorded video> [LIVE_QA_LANGUAGE=en] [LIVE_QA_MODE=AUDIO] \
//     node --env-file=.env scripts/qa/live-summary-run.mjs
//
// Credentials: LIVE_QA_EMAIL/LIVE_QA_PASSWORD, else ADMIN_EMAIL/ADMIN_PASSWORD (never printed).
import { readFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const EMAIL = process.env.LIVE_QA_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.LIVE_QA_PASSWORD ?? process.env.ADMIN_PASSWORD;
const URL_TO_SUMMARIZE = process.env.LIVE_QA_URL;
const LANGUAGE = process.env.LIVE_QA_LANGUAGE ?? 'en';
const MODE = process.env.LIVE_QA_MODE ?? 'AUDIO';
const TIMEOUT_SECONDS = Number(process.env.LIVE_QA_TIMEOUT_SECONDS ?? 420);

if (!EMAIL || !PASSWORD || !URL_TO_SUMMARIZE) {
  console.error('Set LIVE_QA_URL and LIVE_QA_EMAIL/LIVE_QA_PASSWORD (or ADMIN_*).');
  process.exit(2);
}
try {
  setGlobalDispatcher(new Agent({ connect: { ca: readFileSync('certs/rootCA.pem') } }));
} catch {
  // Fall back to the system trust store.
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function openSse(path, token, events) {
  const controller = new AbortController();
  (async () => {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let index;
      while ((index = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
        if (!dataLine) continue;
        try {
          events.push(JSON.parse(dataLine.slice(5).trim()));
        } catch {
          // keep-alive frame
        }
      }
    }
  })().catch(() => {});
  return () => controller.abort();
}

async function main() {
  const login = await call('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
  if (login.status >= 300) throw new Error(`login failed ${login.status}`);
  const token = login.data.tokens.accessToken;

  const resolved = await call('POST', '/live/sources/resolve', token, { url: URL_TO_SUMMARIZE });
  check('link resolves to a recorded video', resolved.data?.capability === 'RECORDED', resolved.data?.capability);
  console.log(`      length: ${String(resolved.data?.durationSeconds)} s, platform ${resolved.data?.platform}`);

  const started = Date.now();
  const created = await call('POST', '/live/sessions', token, {
    url: URL_TO_SUMMARIZE,
    language: LANGUAGE,
    mode: MODE,
    attestRights: false,
    summarize: true,
  });
  check('summary session created', created.status < 300 && created.data?.summary === true, String(created.status));
  if (created.status >= 300) return;
  const { sessionId, mediaStartAt } = created.data;
  check('summary session names its media start', typeof mediaStartAt === 'number');

  const events = [];
  const stop = openSse(`/live/sessions/${sessionId}/stream`, token, events);
  let finalCard = null;
  let lastUsage = null;
  while (Date.now() - started < TIMEOUT_SECONDS * 1000) {
    const beat = await call('POST', `/live/sessions/${sessionId}/heartbeat`, token, {
      state: 'PLAYING',
      playbackAt: Date.now(),
      atLiveEdge: true,
    });
    lastUsage = beat.data?.usage ?? lastUsage;
    finalCard = events.find((event) => ['card', 'card_version'].includes(event.type) && event.data?.kind === 'FINAL');
    const ended = events.some((event) => event.type === 'status' && ['ENDED', 'COMPLETED'].includes(event.data?.code));
    if (finalCard || ended) break;
    await wait(4000);
  }
  // One more heartbeat after the end so the last processed seconds are accrued.
  const after = await call('POST', `/live/sessions/${sessionId}/heartbeat`, token, {
    state: 'PLAYING',
    playbackAt: Date.now(),
    atLiveEdge: true,
  });
  lastUsage = after.data?.usage ?? lastUsage;
  stop();
  await call('DELETE', `/live/sessions/${sessionId}`, token);
  const seconds = Math.round((Date.now() - started) / 1000);

  const captions = events.filter((event) => event.type === 'caption');
  const cards = events.filter((event) => ['card', 'card_version'].includes(event.type) && event.language === undefined);
  const highlights = events.filter((event) => event.type === 'highlight' && event.language === undefined);
  check('the report finished (FINAL card)', finalCard !== null && finalCard !== undefined, `${seconds}s`);
  check('captions (the transcript) arrived', captions.length > 0, `${captions.length}`);
  check('summary cards arrived', cards.length > 0, `${cards.length} cards, ${highlights.length} highlights`);
  const offsets = captions.map((event) => Math.round(((event.startAt ?? event.data?.startAt) - mediaStartAt) / 1000));
  check('caption times are offsets into the video', offsets.every((value) => value >= 0 && value < 4 * 3600), offsets.slice(0, 5).join(','));
  console.log(`      usage: ${JSON.stringify(lastUsage && { billedSeconds: lastUsage.billedSeconds, pendingSeconds: lastUsage.pendingSeconds })}`);
  if (finalCard) console.log(`      FINAL: ${finalCard.data?.title} — ${String(finalCard.data?.body).slice(0, 400)}`);
  for (const event of highlights.slice(0, 3)) {
    const at = Math.round(((event.startAt ?? event.data?.startAt) - mediaStartAt) / 1000);
    console.log(`      highlight @${at}s: ${event.data?.title}`);
  }
}

main()
  .catch((error) => check('summary ran to the end', false, String(error)))
  .finally(() => {
    const failed = results.filter((ok) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  });
