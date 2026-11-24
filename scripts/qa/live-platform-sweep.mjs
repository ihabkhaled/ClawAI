#!/usr/bin/env node
// Live Intelligence platform sweep (ADR-221 batch 6, 2026-11-24): resolves real links on every
// supported platform through POST /live/sources/resolve and prints what each became (SERVER_PULL for
// a readable live stream, RECORDED for a readable recorded video, BROWSER_CAPTURE / LINK_ONLY when
// the server cannot read it, or the refusal code). Each case names what it expects; the run fails
// when a case does not match.
//
//   node --env-file=.env scripts/qa/live-platform-sweep.mjs [cases.json]
//
// cases.json: [{ "url": "...", "expect": "RECORDED" | "SERVER_PULL" | "<error code>" | "ANY" }].
// Credentials: LIVE_QA_EMAIL/LIVE_QA_PASSWORD, else ADMIN_EMAIL/ADMIN_PASSWORD (never printed).
import { readFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const EMAIL = process.env.LIVE_QA_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.LIVE_QA_PASSWORD ?? process.env.ADMIN_PASSWORD;
const PARALLEL = Number(process.env.LIVE_QA_PARALLEL ?? 3);
const casesFile = process.argv[2];

if (!EMAIL || !PASSWORD || !casesFile) {
  console.error('Pass a cases file and set LIVE_QA_EMAIL/LIVE_QA_PASSWORD (or ADMIN_*).');
  process.exit(2);
}
try {
  setGlobalDispatcher(new Agent({ connect: { ca: readFileSync('certs/rootCA.pem') } }));
} catch {
  // Fall back to the system trust store.
}

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

function outcomeOf({ status, data }) {
  if (status < 300) return data?.capability ?? 'NO_CAPABILITY';
  const text = JSON.stringify(data ?? {});
  return /LIVE_[A-Z_]+/u.exec(text)?.[0] ?? `HTTP_${status}`;
}

async function main() {
  const cases = JSON.parse(readFileSync(casesFile, 'utf8'));
  const login = await call('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
  if (login.status >= 300) throw new Error(`login failed ${login.status}`);
  const token = login.data.tokens.accessToken;
  const results = [];
  for (let index = 0; index < cases.length; index += PARALLEL) {
    const batch = cases.slice(index, index + PARALLEL);
    results.push(
      ...(await Promise.all(
        batch.map(async (entry) => {
          const started = Date.now();
          const reply = await call('POST', '/live/sources/resolve', token, { url: entry.url });
          const outcome = outcomeOf(reply);
          const ok = entry.expect === 'ANY' || entry.expect === outcome;
          const seconds = ((Date.now() - started) / 1000).toFixed(1);
          console.log(
            `${ok ? 'PASS' : 'FAIL'}  ${String(reply.data?.platform ?? '-').padEnd(12)} ${outcome.padEnd(26)} ${seconds}s  ${entry.url}`,
          );
          return ok;
        }),
      )),
    );
  }
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} as expected`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
