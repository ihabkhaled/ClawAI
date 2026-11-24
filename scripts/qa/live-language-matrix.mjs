#!/usr/bin/env node
// Live Intelligence language + context matrix (2026-11-24) against a running stack and REAL live
// streams: for each (stream, viewer language) pair it watches the server-pulled run and reports
// the spoken language of each caption, whether captions were translated only when the viewer's
// language differs, and the cards/highlights the viewer would read. Verdicts are printed as
// PASS/FAIL lines; the card text is printed so a person can judge context quality.
//
//   LIVE_QA_CASES="<url>|<lang>;<url>|<lang>" node --env-file=.env scripts/qa/live-language-matrix.mjs
//
// LIVE_QA_MODE (AUDIO | AUDIO_VISION, default AUDIO_VISION), LIVE_QA_WATCH_SECONDS (default 150).
// Credentials: LIVE_QA_EMAIL/LIVE_QA_PASSWORD, else ADMIN_EMAIL/ADMIN_PASSWORD (never printed).
import { readFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const EMAIL = process.env.LIVE_QA_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.LIVE_QA_PASSWORD ?? process.env.ADMIN_PASSWORD;
const WATCH_SECONDS = Number(process.env.LIVE_QA_WATCH_SECONDS ?? 150);
const MODE = process.env.LIVE_QA_MODE ?? 'AUDIO_VISION';
const CASES = (process.env.LIVE_QA_CASES ?? '')
  .split(';')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [url, language] = entry.split('|');
    return { url: url.trim(), language: (language ?? 'en').trim() };
  });

if (!EMAIL || !PASSWORD || CASES.length === 0) {
  console.error(
    'Set LIVE_QA_CASES and LIVE_QA_EMAIL/LIVE_QA_PASSWORD (or ADMIN_EMAIL/ADMIN_PASSWORD).',
  );
  process.exit(2);
}
try {
  setGlobalDispatcher(new Agent({ connect: { ca: readFileSync('certs/rootCA.pem') } }));
} catch {
  // Fall back to the system trust store.
}

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = (value) => (value ?? '').toLowerCase().split(/[-_]/u)[0];

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
    events.status = res.status;
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
          events.list.push(JSON.parse(dataLine.slice(5).trim()));
        } catch {
          // keep-alive frame
        }
      }
    }
  })().catch((error) => {
    if (error.name !== 'AbortError') events.error = String(error);
  });
  return () => controller.abort();
}

async function runCase(token, { url, language }) {
  const label = `${url} [viewer ${language}]`;
  const created = await call('POST', '/live/sessions', token, {
    url,
    language,
    mode: MODE,
    attestRights: false,
  });
  if (created.status >= 300 || !created.data?.sessionId) {
    check(
      `${label}: session`,
      false,
      `${created.status} ${JSON.stringify(created.data).slice(0, 160)}`,
    );
    return;
  }
  const session = created.data;
  check(`${label}: session ${session.capability}`, session.capability === 'SERVER_PULL');
  const events = { list: [], status: 0 };
  const stop = openSse(`/live/sessions/${session.sessionId}/stream`, token, events);
  const started = Date.now();
  while (Date.now() - started < WATCH_SECONDS * 1000) {
    await call('POST', `/live/sessions/${session.sessionId}/heartbeat`, token, {
      state: 'PLAYING',
      playbackAt: Date.now(),
      atLiveEdge: true,
    });
    await wait(5_000);
  }
  stop();
  await call('DELETE', `/live/sessions/${session.sessionId}`, token);

  const captions = events.list.filter((event) => event.type === 'caption');
  const translated = events.list.filter(
    (event) => event.type === 'caption_translation' && base(event.language) === base(language),
  );
  const cards = events.list.filter((event) => ['card', 'card_version'].includes(event.type));
  const highlights = events.list.filter((event) => event.type === 'highlight');
  const spoken = captions.map((event) => event.data?.language ?? null);
  const known = spoken.filter((value) => value !== null);
  const counts = Object.entries(
    spoken.reduce(
      (acc, value) => ({ ...acc, [value ?? 'null']: (acc[value ?? 'null'] ?? 0) + 1 }),
      {},
    ),
  );
  check(`${label}: captions arrive`, captions.length > 0, `${captions.length} captions`);
  check(
    `${label}: spoken language detected`,
    captions.length > 0 && known.length / captions.length >= 0.8,
    counts.map(([key, count]) => `${key}=${count}`).join(' '),
  );
  const sameLanguage = captions.filter((event) => base(event.data?.language) === base(language));
  const sameIds = new Set(sameLanguage.map((event) => event.data?.segmentId));
  const needless = translated.filter((event) => sameIds.has(event.data?.segmentId));
  check(
    `${label}: no translation of same-language speech`,
    needless.length === 0,
    `${needless.length}`,
  );
  const foreign = captions.filter((event) => base(event.data?.language) !== base(language));
  check(
    `${label}: other-language speech is translated`,
    foreign.length === 0 || translated.length >= Math.ceil(foreign.length * 0.6),
    `${translated.length}/${foreign.length}`,
  );
  check(
    `${label}: summary cards`,
    cards.length > 0,
    `${cards.length} cards, ${highlights.length} highlights`,
  );
  for (const event of captions.slice(0, 3)) {
    console.log(
      `      caption[${event.data?.language}]: ${String(event.data?.text).slice(0, 120)}`,
    );
  }
  for (const event of translated.slice(0, 2)) {
    console.log(`      translated: ${String(event.data?.text).slice(0, 120)}`);
  }
  const viewerCards = events.list.filter(
    (event) =>
      ['card', 'card_version', 'highlight'].includes(event.type) &&
      (event.language === undefined || base(event.language) === base(language)),
  );
  for (const event of viewerCards.slice(-4)) {
    const tag = event.language === undefined ? 'source' : event.language;
    console.log(
      `      ${event.type}[${tag}]: ${String(event.data?.title)} — ${String(event.data?.body ?? event.data?.text).slice(0, 300)}`,
    );
  }
}

async function main() {
  const login = await call('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
  if (login.status >= 300) throw new Error(`login failed ${login.status}`);
  const token = login.data.tokens.accessToken;
  await Promise.all(CASES.map((entry) => runCase(token, entry)));
}

main()
  .catch((error) => check('matrix ran to the end', false, String(error)))
  .finally(() => {
    const failed = results.filter((ok) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  });
