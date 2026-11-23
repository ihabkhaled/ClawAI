#!/usr/bin/env node
// Live Intelligence server pull (ADR-221 addendum 2026-11-23) against a running stack and REAL
// live streams on several platforms (Twitch natively, YouTube/Kick/… via yt-dlp): resolve ->
// SERVER_PULL, a session whose run the server reads itself, real captions over SSE, device audio
// refused, offline fallback (player platform -> capture, link-only platform -> link).
//
//   node --env-file=.env scripts/qa/live-server-pull-smoke.mjs
//
// Credentials: LIVE_QA_EMAIL/LIVE_QA_PASSWORD, else ADMIN_EMAIL/ADMIN_PASSWORD (never printed).
// LIVE_QA_TWITCH=<login> pins the Twitch channel; LIVE_QA_URLS pins the other live streams.
import { readFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const EMAIL = process.env.LIVE_QA_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.LIVE_QA_PASSWORD ?? process.env.ADMIN_PASSWORD;
const WATCH_SECONDS = Number(process.env.LIVE_QA_WATCH_SECONDS ?? 75);
// LIVE_QA_URLS=<url,url,…> pins the live streams to test (any platform). Otherwise: the first live
// Twitch channel of a popular list, plus YouTube and Kick streams that were live when this was written.
const TWITCH_CANDIDATES = (
  process.env.LIVE_QA_TWITCH
    ? [process.env.LIVE_QA_TWITCH]
    : ['kaicenat', 'xqc', 'jynxzi', 'caseoh_', 'ibai', 'zackrawrr', 'shroud', 'summit1g', 'tarik']
).map((login) => `https://www.twitch.tv/${login}`);
const PINNED_URLS = process.env.LIVE_QA_URLS?.split(',').map((url) => url.trim()) ?? [
  'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
  'https://kick.com/classybeef',
];
const OFFLINE_CHANNEL = 'clawai_qa_never_live_0';

if (!EMAIL || !PASSWORD) {
  console.error('Set LIVE_QA_EMAIL/LIVE_QA_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD.');
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

async function call(method, path, token, body, extraHeaders = {}) {
  const raw = body instanceof Uint8Array;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined || raw ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
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

async function main() {
  const login = await call('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
  if (login.status >= 300) throw new Error(`login failed ${login.status}`);
  const token = login.data.tokens.accessToken;
  const resolve = (url) => call('POST', '/live/sources/resolve', token, { url });

  // 1. Offline streams fall back, saying why: a player platform to device capture, a link-only one stays a link.
  const offline = await resolve(`https://www.twitch.tv/${OFFLINE_CHANNEL}`);
  check(
    'offline Twitch -> BROWSER_CAPTURE + SERVER_PULL_UNAVAILABLE',
    offline.data?.capability === 'BROWSER_CAPTURE' &&
      offline.data?.reasonCode === 'SERVER_PULL_UNAVAILABLE',
    `${offline.data?.capability}/${offline.data?.reasonCode}`,
  );
  const offlineTiktok = await resolve(`https://www.tiktok.com/@${OFFLINE_CHANNEL}/live`);
  check(
    'offline TikTok -> LINK_ONLY',
    offlineTiktok.data?.capability === 'LINK_ONLY',
    `${offlineTiktok.data?.capability}/${offlineTiktok.data?.reasonCode}`,
  );

  // 2. Every pinned live URL, plus the first live Twitch channel, resolves SERVER_PULL (PUBLIC).
  const live = [];
  for (const url of PINNED_URLS) {
    const r = await resolve(url);
    check(`${url} -> SERVER_PULL`, r.data?.capability === 'SERVER_PULL', r.data?.reasonCode);
    if (r.data?.capability === 'SERVER_PULL') live.push(url);
  }
  if (!process.env.LIVE_QA_URLS) {
    const twitch = await firstLive(resolve, TWITCH_CANDIDATES);
    check('a live Twitch channel resolves SERVER_PULL', twitch !== null, TWITCH_CANDIDATES.length);
    if (twitch) live.push(twitch);
  }

  // 3. Each one: a session the server reads (device audio refused), real captions, close.
  for (const url of live) await watch(token, url);
}

async function firstLive(resolve, urls) {
  for (const url of urls) {
    const r = await resolve(url);
    if (r.data?.capability === 'SERVER_PULL') return url;
  }
  return null;
}

async function watch(token, url) {
  const created = await call('POST', '/live/sessions', token, {
    url,
    language: 'en',
    mode: 'AUDIO',
    attestRights: false,
  });
  check(
    `${url}: SERVER_PULL session created`,
    created.status < 300 && created.data?.capability === 'SERVER_PULL',
    `${created.status} ${created.data?.capability ?? JSON.stringify(created.data).slice(0, 160)}`,
  );
  const session = created.data;
  if (!session?.sessionId) return;
  const upload = await call(
    'POST',
    `/live/sessions/${session.sessionId}/audio`,
    token,
    new Uint8Array(64),
    { 'Content-Type': 'audio/wav', 'X-Chunk-Start-At': String(Date.now()) },
  );
  check(`${url}: device audio refused (422)`, upload.status === 422, `got ${upload.status}`);

  const events = { list: [], status: 0 };
  const stopSse = openSse(`/live/sessions/${session.sessionId}/stream`, token, events);
  const started = Date.now();
  let firstCaptionMs = null;
  let last = null;
  while (Date.now() - started < WATCH_SECONDS * 1000) {
    last = await call('POST', `/live/sessions/${session.sessionId}/heartbeat`, token, {
      state: 'PLAYING',
      playbackAt: Date.now(),
      atLiveEdge: true,
    });
    if (firstCaptionMs === null && events.list.some((event) => event.type === 'caption')) {
      firstCaptionMs = Date.now() - started;
    }
    await wait(5_000);
  }
  stopSse();
  const captions = events.list.filter((event) => event.type === 'caption');
  check(
    `${url}: real captions from the server-pulled stream`,
    events.status === 200 && captions.length > 0,
    `SSE ${events.status}, ${captions.length} captions, first after ${firstCaptionMs ?? '-'} ms`,
  );
  if (captions[0]) {
    console.log(
      `      sample: ${JSON.stringify(captions[0].data?.text ?? captions[0]).slice(0, 140)}`,
    );
  }
  check(`${url}: heartbeat accepted`, last !== null && last.status < 300, `last ${last?.status}`);
  const closed = await call('DELETE', `/live/sessions/${session.sessionId}`, token);
  check(`${url}: session closed`, closed.status < 300, `got ${closed.status}`);
}

main()
  .catch((error) => {
    check('smoke ran to the end', false, String(error));
  })
  .finally(() => {
    const failed = results.filter((ok) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  });
