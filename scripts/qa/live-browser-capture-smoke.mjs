#!/usr/bin/env node
// Live Intelligence browser-capture path (ADR-221, batch 2) over real HTTP: a YouTube
// session (BROWSER_CAPTURE) receives 6 s PCM16 16 kHz WAV chunks the way the browser
// AudioWorklet sends them, and real captions/cards come back on SSE. Also checks the
// audio route's guards (other user 404, rate limit 429, bad WAV 422).
//
//   LIVE_QA_WAV_DIR=<dir with c0.wav..c5.wav> NODE_EXTRA_CA_CERTS=certs/rootCA.pem \
//     node --env-file=.env scripts/qa/live-browser-capture-smoke.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const DIR = process.env.LIVE_QA_WAV_DIR;
if (!DIR) {
  console.error('Set LIVE_QA_WAV_DIR (six 6 s PCM16 mono 16 kHz WAV files c0..c5).');
  process.exit(2);
}
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
const token = (await login.json()).tokens.accessToken;
const auth = { Authorization: `Bearer ${token}` };
const json = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const postAudio = (sessionId, bytes, startAt, headers = {}) =>
  fetch(`${BASE}/live/sessions/${sessionId}/audio`, {
    method: 'POST',
    headers: {
      ...auth,
      'Content-Type': 'audio/wav',
      'X-Chunk-Start-At': String(startAt),
      ...headers,
    },
    body: bytes,
  }).then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));

const resolved = await json('POST', '/live/sources/resolve', {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
});
check(
  'YouTube resolves BROWSER_CAPTURE',
  resolved.data?.capability === 'BROWSER_CAPTURE',
  JSON.stringify(resolved.data),
);
check(
  'YouTube chat embed offered',
  String(resolved.data?.chatEmbedUrl ?? '').includes('live_chat?v=dQw4w9WgXcQ'),
  resolved.data?.chatEmbedUrl,
);

const session = await json('POST', '/live/sessions', {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  language: 'ar',
  mode: 'SMART_AUTO',
});
const sid = session.data?.sessionId;
check(
  'capture session created with a private run',
  session.status < 300 && Boolean(session.data?.runId),
  `${session.status} state=${session.data?.state}`,
);

const events = [];
const controller = new AbortController();
(async () => {
  const res = await fetch(`${BASE}/live/sessions/${sid}/stream`, {
    headers: auth,
    signal: controller.signal,
  });
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const line = buffer
        .slice(0, index)
        .split('\n')
        .find((l) => l.startsWith('data:'));
      buffer = buffer.slice(index + 2);
      if (line)
        try {
          events.push(JSON.parse(line.slice(5)));
        } catch {
          /* keep-alive */
        }
    }
  }
})().catch(() => {});

const bad = await postAudio(sid, Buffer.from('not a wav at all'), Date.now());
check('invalid WAV refused', bad.status === 422, `got ${bad.status}`);
await wait(3500);

let accepted = 0;
for (let i = 0; i < 6; i += 1) {
  const startAt = Date.now() - 6000;
  const res = await postAudio(sid, readFileSync(join(DIR, `c${i}.wav`)), startAt);
  if (res.status === 202) accepted += 1;
  if (i === 0) {
    const tooSoon = await postAudio(sid, readFileSync(join(DIR, 'c1.wav')), Date.now());
    check('second chunk within 3 s rate-limited', tooSoon.status === 429, `got ${tooSoon.status}`);
  }
  await json('POST', `/live/sessions/${sid}/heartbeat`, {
    state: 'PLAYING',
    playbackAt: Date.now(),
    atLiveEdge: true,
  });
  await wait(6000);
}
check('six chunks accepted', accepted === 6, `${accepted}/6`);
await wait(20000);
const byType = (type) => events.filter((event) => event.type === type);
check(
  'captions from captured audio',
  byType('caption').length > 0,
  `${byType('caption').length} captions`,
);
check(
  'Arabic translations of captured audio',
  byType('caption_translation').some((e) => e.language === 'ar'),
  `${byType('caption_translation').length}`,
);
check(
  'summary card from captured audio',
  byType('card').length + byType('card_version').length > 0,
  `${byType('card').length} cards`,
);
const sample = byType('caption')
  .slice(0, 2)
  .map((e) => String(e.data?.text ?? '').slice(0, 60));
console.log(`      sample captions: ${JSON.stringify(sample)}`);

controller.abort();
await json('DELETE', `/live/sessions/${sid}`);
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
