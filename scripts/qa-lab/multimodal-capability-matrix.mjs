// Multimodal capability matrix — per chat model: image native / helper,
// audio → transcript, video native / frames + transcript, image generation,
// TTS voice. Generated from runtime data, never hand-authored (pack §124).
//
// Live (reads the stack):
//   export QA_LAB_BASE=https://claw.local/api/v1
//   export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
//   export QA_LAB_EMAIL=<admin email> QA_LAB_PASSWORD='<admin password>'
//   node scripts/qa-lab/multimodal-capability-matrix.mjs [--source=snapshot|available-models]
//        [--snapshot-url=http://localhost:4003/api/v1/internal/connectors/models-snapshot]
//        [--json] [--out=<file>]
//
//   --source=snapshot (default) reads connector-service's internal
//   models-snapshot — the exact document chat-service and file-service read —
//   on the dev stack's published port. It is NOT proxied by nginx. When it is
//   unreachable, --source=available-models reads the user-facing
//   GET /connectors/available-models through nginx and maps the same flags.
//   Assistant-model roles come from the admin route
//   GET /routing/assistant-models/{VISION_HELPER,TTS_VOICE}.
//
// Offline:
//   node scripts/qa-lab/multimodal-capability-matrix.mjs \
//        --fixture=scripts/qa-lab/multimodal-matrix.fixture.json
//
// Credentials come only from the environment; nothing is written but --out.
// Runbook: skills/verify-multimodal-routing-live.md.
import fs from 'node:fs';

import { ROLE, buildMatrix, fromAvailableModels, renderMatrix } from './multimodal-matrix.mjs';

const REQUEST_TIMEOUT_MS = 20_000;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length === 0 ? 'true' : v.join('=')];
  }),
);

const BASE = process.env.QA_LAB_BASE ?? 'https://claw.local/api/v1';
const EMAIL = process.env.QA_LAB_EMAIL ?? '';
const PASSWORD = process.env.QA_LAB_PASSWORD ?? '';
const SNAPSHOT_URL =
  args['snapshot-url'] ?? 'http://localhost:4003/api/v1/internal/connectors/models-snapshot';

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} → ${String(res.status)} ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

async function adminToken() {
  if (EMAIL === '' || PASSWORD === '') {
    throw new Error('QA_LAB_EMAIL / QA_LAB_PASSWORD (an admin) must be set for live mode.');
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`login failed ${String(res.status)}`);
  return (await res.json()).tokens.accessToken;
}

async function loadLive() {
  const token = await adminToken();
  const auth = { authorization: `Bearer ${token}` };
  let models;
  let generatedAt = null;
  if ((args.source ?? 'snapshot') === 'snapshot') {
    const snapshot = await getJson(SNAPSHOT_URL);
    models = snapshot.models ?? [];
    generatedAt = snapshot.generatedAt ?? null;
  } else {
    const rows = await getJson(`${BASE}/connectors/available-models`, auth);
    models = fromAvailableModels(Array.isArray(rows) ? rows : rows.data);
    generatedAt = `${new Date().toISOString()} (available-models)`;
  }
  const roles = {};
  for (const role of [ROLE.VISION_HELPER, ROLE.TTS_VOICE]) {
    roles[role] = await getJson(`${BASE}/routing/assistant-models/${role}`, auth);
  }
  return { models, roles, generatedAt };
}

function loadFixture(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const models = raw.snapshot?.models ?? fromAvailableModels(raw.availableModels ?? []);
  return { models, roles: raw.roles ?? {}, generatedAt: raw.snapshot?.generatedAt ?? 'fixture' };
}

async function main() {
  const input = args.fixture ? loadFixture(args.fixture) : await loadLive();
  const matrix = buildMatrix(input);
  const output =
    args.json === 'true' ? `${JSON.stringify(matrix, null, 2)}\n` : renderMatrix(matrix);
  if (args.out) fs.writeFileSync(args.out, output);
  process.stdout.write(output);
}

main().catch((error) => {
  process.stderr.write(`multimodal-capability-matrix: ${error.message}\n`);
  process.exit(1);
});
