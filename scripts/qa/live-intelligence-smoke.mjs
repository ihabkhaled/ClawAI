#!/usr/bin/env node
// Live Intelligence (ADR-221) API smoke against a running stack: the real
// fixture stream, real STT, real summary/translation models. Nothing is mocked.
//
//   node --env-file=.env scripts/qa/live-intelligence-smoke.mjs
//
// Credentials come from LIVE_QA_EMAIL/LIVE_QA_PASSWORD, else ADMIN_EMAIL/ADMIN_PASSWORD.
// They are never printed. Uses the dev CA in certs/rootCA.pem when NODE_EXTRA_CA_CERTS is unset.
import { readFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const EMAIL = process.env.LIVE_QA_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.LIVE_QA_PASSWORD ?? process.env.ADMIN_PASSWORD;
const WATCH_SECONDS = Number(process.env.LIVE_QA_WATCH_SECONDS ?? 130);
const LANGUAGE = process.env.LIVE_QA_LANGUAGE ?? 'ar';

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
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
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
  const type = res.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await res.json().catch(() => null) : await res.arrayBuffer();
  return { status: res.status, type, data };
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
          // ignore keep-alive frames
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

  // 1. Source resolution and SSRF refusals.
  const anon = await call('GET', '/live/usage', null);
  check('anonymous usage -> 401', anon.status === 401, `got ${anon.status}`);
  const yt = await call('POST', '/live/sources/resolve', token, {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  });
  check(
    'YouTube resolves BROWSER_CAPTURE (analysed from the viewer tab audio)',
    yt.status < 300 && yt.data.capability === 'BROWSER_CAPTURE' && yt.data.platform === 'YOUTUBE',
    JSON.stringify(yt.data),
  );
  for (const url of [
    'https://127.0.0.1/live.m3u8',
    'https://169.254.169.254/latest.m3u8',
    'http://example.com/live.m3u8',
    'https://user:pw@example.com/live.m3u8',
  ]) {
    const refused = await call('POST', '/live/sources/resolve', token, { url });
    check(
      `unsafe source refused: ${url}`,
      refused.status === 422 || refused.status === 400,
      `got ${refused.status}`,
    );
  }
  const unattested = await call('POST', '/live/sessions', token, {
    url: 'https://example.com/live/stream.m3u8',
    language: 'en',
    mode: 'AUDIO',
    attestRights: false,
  });
  check(
    'HLS without rights attestation refused',
    unattested.status === 422,
    `got ${unattested.status}`,
  );

  // 2. A real session on the fixture stream.
  const created = await call('POST', '/live/sessions', token, {
    url: 'fixture:live-demo',
    language: LANGUAGE,
    mode: 'AUDIO',
    attestRights: false,
  });
  check(
    'fixture session created',
    created.status < 300 && Boolean(created.data?.sessionId),
    `got ${created.status} ${JSON.stringify(created.data).slice(0, 200)}`,
  );
  const session = created.data;
  const playlist = await call('GET', session.playbackUrl.replace('/api/v1', ''), token);
  check('HLS playlist served through the proxy', playlist.status === 200, `got ${playlist.status}`);
  const otherUserPlaylist = await call('GET', session.playbackUrl.replace('/api/v1', ''), null);
  check(
    'HLS proxy refuses an anonymous caller',
    otherUserPlaylist.status === 401 || otherUserPlaylist.status === 404,
    `got ${otherUserPlaylist.status}`,
  );

  const events = { list: [], status: 0 };
  const stopSse = openSse(`/live/sessions/${session.sessionId}/stream`, token, events);

  // 3. Watch: heartbeat every 10 s while "playing" at the live edge.
  const started = Date.now();
  let last = null;
  while (Date.now() - started < WATCH_SECONDS * 1000) {
    last = await call('POST', `/live/sessions/${session.sessionId}/heartbeat`, token, {
      state: 'PLAYING',
      playbackAt: Date.now(),
      atLiveEdge: true,
    });
    await wait(10_000);
  }
  const byType = (type) => events.list.filter((event) => event.type === type);
  check(
    'SSE stream opened',
    events.status === 200,
    `status ${events.status} ${events.error ?? ''}`,
  );
  check('captions arrived', byType('caption').length > 0, `${byType('caption').length} captions`);
  check(
    `captions translated into ${LANGUAGE}`,
    byType('caption_translation').some((event) => event.language === LANGUAGE),
    `${byType('caption_translation').length} translations`,
  );
  check(
    'summary cards arrived',
    byType('card').length + byType('card_version').length > 0,
    `${byType('card').length} cards, ${byType('card_version').length} versions`,
  );
  check(
    'heartbeat accrues free seconds',
    (last?.data?.usage?.billedSeconds ?? 0) + (last?.data?.usage?.pendingSeconds ?? 0) > 0,
    JSON.stringify(last?.data?.usage ?? {}),
  );

  // 4. Pause stops billing.
  const beforePause = await call('POST', `/live/sessions/${session.sessionId}/heartbeat`, token, {
    state: 'PAUSED',
    playbackAt: Date.now(),
  });
  await wait(12_000);
  const afterPause = await call('POST', `/live/sessions/${session.sessionId}/heartbeat`, token, {
    state: 'PAUSED',
    playbackAt: Date.now(),
  });
  const total = (view) =>
    (view?.data?.usage?.billedSeconds ?? 0) + (view?.data?.usage?.pendingSeconds ?? 0);
  check(
    'paused viewer accrues nothing',
    total(afterPause) === total(beforePause),
    `${total(beforePause)} -> ${total(afterPause)}`,
  );
  check('paused state reported', afterPause.data?.state === 'PAUSED', afterPause.data?.state);

  // 5. Close, then the run stops (last viewer left).
  const closed = await call('DELETE', `/live/sessions/${session.sessionId}`, token);
  check('explicit close', closed.status < 300, `got ${closed.status}`);
  stopSse();

  // 6. History, versions, export.
  const history = await call('GET', '/live/history?limit=5', token);
  const items = history.data?.items ?? [];
  check(
    'history lists the session',
    items.some((item) => (item.id ?? item.sessionId) === session.sessionId),
    `got ${history.status}`,
  );
  const feed = await call(
    'GET',
    `/live/history/${session.sessionId}/events?limit=50&language=${LANGUAGE}`,
    token,
  );
  const feedItems = feed.data?.items ?? [];
  check(
    'history feed has analysed cards',
    feed.status === 200 && feedItems.length > 0,
    `${feedItems.length} items`,
  );
  const card = feedItems.find((item) => item.kind === 'SUMMARY');
  if (card) {
    const versions = await call('GET', `/live/events/${card.id}/versions`, token);
    check('card version history readable', versions.status === 200, `got ${versions.status}`);
  }
  for (const [format, type] of [
    ['MARKDOWN', 'text/markdown'],
    ['TXT', 'text/plain'],
    ['PDF', 'application/pdf'],
  ]) {
    const exported = await call('POST', `/live/history/${session.sessionId}/export`, token, {
      format,
    });
    const size = exported.data instanceof ArrayBuffer ? exported.data.byteLength : 0;
    check(
      `export ${format}`,
      exported.status < 300 && exported.type.startsWith(type) && size > 0,
      `${exported.status} ${exported.type} ${size} B`,
    );
  }

  // 7. Admin.
  const overview = await call('GET', '/live/admin/overview?days=1', token);
  check('admin overview', overview.status === 200, `got ${overview.status}`);
  const policy = await call('GET', '/live/admin/policy', token);
  check('admin policy readable', policy.status === 200, `got ${policy.status}`);

  // 8. Deletion.
  const deleted = await call('DELETE', `/live/history/${session.sessionId}`, token);
  check(
    'history entry deleted',
    deleted.status < 300,
    `got ${deleted.status} ${JSON.stringify(deleted.data)}`,
  );
  const gone = await call('GET', `/live/history/${session.sessionId}/events`, token);
  check('deleted history is gone', gone.status === 404, `got ${gone.status}`);

  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`smoke aborted: ${error.message}`);
  process.exit(1);
});
