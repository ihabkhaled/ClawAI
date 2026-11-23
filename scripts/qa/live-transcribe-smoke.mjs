#!/usr/bin/env node
// Live check of the billed media read (POST /files/transcribe-text) against the
// dev stack. Every case here is refused BEFORE the paid step, so nothing is
// billed and no provider is called: no auth, empty bytes, an unsupported type,
// an unreadable container (ffprobe runs), and the per-replica busy limit.
//   NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/live-transcribe-smoke.mjs
const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${detail})`);
};
const call = async (token, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const login = async (email, password) =>
  (await call(null, 'POST', '/auth/login', { email, password })).data.tokens.accessToken;
const errorCode = (data) => data?.code ?? data?.error?.code ?? data?.errorCode ?? '';

const token = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const read = (body, bearer = token) => call(bearer, 'POST', '/files/transcribe-text', body);
// Not media: ffprobe must run and refuse it, without any provider call.
const garbage = Buffer.from('this is not a video container '.repeat(64)).toString('base64');

const anon = await read({ fileName: 'a.mp4', mimeType: 'video/mp4', contentBase64: garbage }, null);
check('no token is refused', anon.status === 401, `got ${anon.status}`);

const empty = await read({ fileName: 'a.mp3', mimeType: 'audio/mpeg', contentBase64: '' });
check(
  'empty bytes are refused',
  empty.status === 400,
  `got ${empty.status} ${errorCode(empty.data)}`,
);

const unsupported = await read({
  fileName: 'a.exe',
  mimeType: 'application/x-msdownload',
  contentBase64: garbage,
});
check(
  'an unsupported type is refused',
  unsupported.status === 422 &&
    errorCode(unsupported.data) === 'TRANSCRIBE_READ_UNSUPPORTED_MEDIA_TYPE',
  `got ${unsupported.status} ${errorCode(unsupported.data)}`,
);

const unreadable = await read({
  fileName: 'clip.mp4',
  mimeType: 'video/mp4',
  contentBase64: garbage,
});
check(
  'an unreadable container is refused after ffprobe',
  unreadable.status === 422 && errorCode(unreadable.data) === 'TRANSCRIBE_READ_MEDIA_UNREADABLE',
  `got ${unreadable.status} ${errorCode(unreadable.data)}`,
);

// A burst wider than the per-replica limit: every answer is a refusal, a busy
// answer is 429 with its own code, and nothing is a 5xx.
const burst = await Promise.all(
  Array.from({ length: 12 }, () =>
    read({ fileName: 'clip.mp4', mimeType: 'video/mp4', contentBase64: garbage }),
  ),
);
const statuses = burst.map((r) => r.status);
const busy = burst.filter((r) => r.status === 429);
check(
  'a burst never answers 5xx',
  statuses.every((s) => s < 500),
  `statuses ${statuses.join(',')}`,
);
check(
  'a busy answer carries TRANSCRIBE_READ_BUSY',
  busy.every((r) => errorCode(r.data) === 'TRANSCRIBE_READ_BUSY'),
  `${busy.length} busy of ${burst.length}`,
);

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
