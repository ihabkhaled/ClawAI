// Sessions under races, lost responses and replay (ADR-106).
//
// Users were signed out at random with two tabs open, and the VS Code
// extension signed itself out: two refreshes of one token looked like theft
// and the server revoked the session everywhere. This drives the refresh
// endpoint the way two tabs, two VS Code windows, a lost response and a thief
// do, and checks "Remember me" and the refusal paths.
//
//   export QA_LAB_BASE=https://claw.local/api/v1
//   export NODE_EXTRA_CA_CERTS=./certs/rootCA.pem
//   export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…
//   node scripts/qa-lab/session-refresh-experiment.mjs
//
// It takes about 35 s: one check waits past the 30 s grace window. Exits 1 on
// any failure. Tokens are never printed.
import { BASE, EMAIL, PASSWORD, sleep } from './client.mjs';

const results = [];
const check = (name, ok, detail = '') =>
  results.push({ name, ok, detail: String(detail) });

const post = (pathname, body, token) =>
  fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

async function login(extra = {}) {
  const response = await post('/auth/login', { email: EMAIL, password: PASSWORD, ...extra });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, tokens: body.tokens };
}

async function refresh(refreshToken) {
  const response = await post('/auth/refresh', { refreshToken });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, tokens: body.tokens, raw: JSON.stringify(body) };
}

async function races() {
  for (const clientKind of ['WEB', 'VSCODE']) {
    for (let round = 1; round <= 3; round += 1) {
      const { tokens } = await login({ clientKind });
      const [first, second] = await Promise.all([refresh(tokens.refreshToken), refresh(tokens.refreshToken)]);
      const next = await Promise.all([first, second].map((r) => refresh(r.tokens?.refreshToken ?? 'x')));
      check(
        `${clientKind} round ${round}: two concurrent refreshes both work, and so do their tokens`,
        [first, second, ...next].every((r) => r.status === 200),
        [first, second, ...next].map((r) => r.status).join('/'),
      );
    }
  }
  const { tokens } = await login();
  const used = await refresh(tokens.refreshToken);
  const retried = await refresh(tokens.refreshToken);
  const after = await refresh(used.tokens.refreshToken);
  check('a retry after a lost response works and keeps the session', retried.status === 200 && after.status === 200, `${retried.status}/${after.status}`);
}

async function rememberMe() {
  const on = await login({ rememberMe: true });
  const off = await login({ rememberMe: false });
  const legacy = await login();
  check('remember me on → 7 d', on.tokens?.refreshExpiresIn === 604_800, on.tokens?.refreshExpiresIn);
  check('remember me off → 12 h', off.tokens?.refreshExpiresIn === 43_200, off.tokens?.refreshExpiresIn);
  check('not sent (VS Code, old clients) → 7 d', legacy.tokens?.refreshExpiresIn === 604_800, legacy.tokens?.refreshExpiresIn);
  const rotated = await refresh(off.tokens.refreshToken);
  check('remember me off stays 12 h after rotation', rotated.tokens?.refreshExpiresIn === 43_200, rotated.tokens?.refreshExpiresIn);
  for (const bad of ['true', 1, null]) {
    const r = await login({ rememberMe: bad });
    check(`rememberMe=${JSON.stringify(bad)} is refused`, r.status === 400, r.status);
  }
}

async function refusals() {
  for (const token of ['', 'x', 'a'.repeat(5000), "' OR 1=1 --", '{"$ne":null}']) {
    const r = await refresh(token);
    check(`bogus refresh token ${JSON.stringify(token.slice(0, 10))} → 4xx`, r.status >= 400 && r.status < 500, r.status);
  }
  const echoed = await refresh('marker-value-that-must-not-echo');
  check('a refusal never echoes the token', !echoed.raw.includes('marker-value'));
  const { tokens } = await login();
  await post('/auth/logout', {}, tokens.accessToken);
  const afterLogout = await refresh(tokens.refreshToken);
  check('logout ends the refresh token at once, even inside the grace window', afterLogout.status === 401, afterLogout.status);
}

async function theft() {
  const { tokens } = await login();
  const legit = await refresh(tokens.refreshToken);
  await sleep(32_000);
  const replay = await refresh(tokens.refreshToken);
  const victim = await refresh(legit.tokens.refreshToken);
  check('a replay after the 30 s grace is refused', replay.status === 401, replay.status);
  check('…and revokes the whole family', victim.status === 401, victim.status);
}

if (EMAIL === '' || PASSWORD === '') {
  console.error('Set QA_LAB_EMAIL and QA_LAB_PASSWORD.');
  process.exit(2);
}
await races();
await rememberMe();
await refusals();
await theft();
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
