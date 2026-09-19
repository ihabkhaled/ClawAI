// F4 file-model matrix: every model × every format × N runs, through the real
// chat → file writer → file-generation → download path, scored per file.
//
//   export QA_LAB_BASE=https://claw.local/api/v1     # default
//   export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"   # trust the local cert
//   export QA_LAB_EMAIL=admin@claw.local QA_LAB_PASSWORD='…'   # an ADMIN
//   node scripts/qa-lab/file-model-matrix.mjs --models=gpt-oss:120b,kimi-k3 \
//     [--formats=PDF,XLSX] [--runs=10] [--concurrency=4] [--out=<dir>]
//
// The writer is the admin's FILE_WRITER list, not the user's model, so the
// runner sets that list to ONE model at a time, waits out chat's 60 s cache,
// and puts the original list back in `finally`, even after Ctrl+C. A send
// names provider FILE_GENERATION in manual mode, so no router call is spent:
// one run is exactly one writer call. Re-running with the same --out resumes.
// Runbook: skills/run-the-file-model-matrix.md.
import fs from 'node:fs';
import path from 'node:path';

import { FORMATS, checkFile, promptFor, renderReport, summarize, titleProblems } from './file-matrix-checks.mjs';

const BASE = process.env.QA_LAB_BASE ?? 'https://claw.local/api/v1';
const ORIGIN = new URL(BASE).origin;
const EMAIL = process.env.QA_LAB_EMAIL ?? '';
const PASSWORD = process.env.QA_LAB_PASSWORD ?? '';
const CACHE_WAIT_MS = 65_000;
const REPLY_TIMEOUT_MS = 240_000;
const FILE_TIMEOUT_MS = 300_000;
const TOKEN_MAX_AGE_MS = 8 * 60_000;
// The stack failing is not the model failing: these runs are not scored, a
// resume re-runs them, and this many in a row stops the run.
const INFRA_ERROR = /→ 5\d\d |fetch failed|ECONNREFUSED|ECONNRESET|login failed/;
const MAX_INFRA_STREAK = 10;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  }),
);
const models = (args.models ?? '').split(',').map((m) => m.trim()).filter(Boolean);
const formats = (args.formats ? args.formats.split(',') : FORMATS).map((f) => f.trim().toUpperCase());
const runs = Number(args.runs ?? 10);
const concurrency = Number(args.concurrency ?? 4);
const id = args.out ? path.basename(args.out) : `FILEMATRIX-${Date.now().toString(36)}`;
const outDir = args.out ?? path.join('scripts', 'qa-lab', 'results', id);

if (models.length === 0 || EMAIL === '' || PASSWORD === '') {
  console.error('need --models=a,b and QA_LAB_EMAIL / QA_LAB_PASSWORD (an admin). See skills/run-the-file-model-matrix.md.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let token = '';
let tokenAt = 0;

async function auth() {
  if (token !== '' && Date.now() - tokenAt < TOKEN_MAX_AGE_MS) return token;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}`);
  token = (await res.json()).tokens.accessToken;
  tokenAt = Date.now();
  return token;
}

async function api(method, route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: { authorization: `Bearer ${await auth()}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${text.slice(0, 160)}`);
  return text === '' ? null : JSON.parse(text);
}

const toEntry = (m) => ({
  provider: m.provider,
  modelAlias: m.modelAlias,
  ...(m.deploymentId ? { deploymentId: m.deploymentId } : {}),
  enabled: m.enabled,
  timeoutMs: m.timeoutMs,
  maxTokens: m.maxTokens,
});

async function setWriter(entries) {
  await api('PUT', '/routing/assistant-models/FILE_WRITER', { entries });
}

async function runOnce(model, format, run) {
  const started = Date.now();
  const result = { model, format, run, writer: null, pass: false, problems: [], latencyMs: null, title: null, filename: null, bytes: 0 };
  let threadId = null;
  try {
    threadId = (await api('POST', '/chat-threads', { title: `F4 ${model} ${format} ${run}` })).id;
    await api('POST', '/chat-messages', {
      threadId,
      content: promptFor(format, run),
      routingMode: 'MANUAL_MODEL',
      provider: 'FILE_GENERATION',
      model: 'auto',
    });
    let generationId = null;
    let reply = null;
    while (Date.now() - started < REPLY_TIMEOUT_MS) {
      await sleep(3000);
      const list = await api('GET', `/chat-messages/thread/${threadId}`);
      reply = (list.data ?? list).filter((m) => m.role === 'ASSISTANT').at(-1) ?? null;
      if (reply) {
        generationId = reply.metadata?.generationId ?? null;
        break;
      }
    }
    if (!generationId) {
      result.problems.push(reply ? `no file started: ${String(reply.content).slice(0, 80)}` : 'no reply');
      return result;
    }
    let gen = null;
    while (Date.now() - started < FILE_TIMEOUT_MS) {
      gen = await api('GET', `/file-generations/${generationId}`);
      if (gen.status === 'COMPLETED' || gen.status === 'FAILED') break;
      await sleep(2500);
    }
    result.writer = gen?.model ?? null;
    result.latencyMs = Date.now() - started;
    if (gen?.status !== 'COMPLETED') {
      result.problems.push(gen?.status === 'FAILED' ? `failed: ${String(gen.errorMessage ?? '').slice(0, 80)}` : 'timed out');
      return result;
    }
    if (gen.format !== format) result.problems.push(`format became ${gen.format}`);
    result.title = gen.title ?? null;
    result.filename = gen.filename ?? null;
    result.problems.push(...titleProblems(gen));
    const asset = (gen.assets ?? []).at(-1);
    if (!asset) {
      result.problems.push('no asset');
    } else {
      const res = await fetch(`${ORIGIN}${asset.downloadUrl}`, { headers: { authorization: `Bearer ${await auth()}` } });
      const buf = Buffer.from(await res.arrayBuffer());
      result.bytes = buf.length;
      if (!res.ok) result.problems.push(`download ${res.status}`);
      else result.problems.push(...(await checkFile(format, buf)));
      // A failing file is kept, so a finding can be read, not guessed at.
      if (res.ok && result.problems.length > 0) {
        const name = `${model.replace(/[^\w.-]/g, '_')}-${format}-${run}.${format.toLowerCase()}`;
        fs.mkdirSync(path.join(outDir, 'failures'), { recursive: true });
        fs.writeFileSync(path.join(outDir, 'failures', name), buf);
      }
    }
    if (result.writer !== model) result.problems.push(`written by ${result.writer}`);
    result.pass = result.problems.length === 0;
    return result;
  } catch (error) {
    result.problems.push(`error: ${error.message.slice(0, 120)}`);
    result.infra = INFRA_ERROR.test(error.message);
    return result;
  } finally {
    if (threadId) await api('DELETE', `/chat-threads/${threadId}`).catch(() => {});
  }
}

async function pool(jobs, size, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, jobs.length) }, async () => {
      while (next < jobs.length && !stopping) {
        const job = jobs[next++];
        await worker(job);
      }
    }),
  );
}

let stopping = false;
fs.mkdirSync(outDir, { recursive: true });
const resultsFile = path.join(outDir, 'results.jsonl');
const done = new Set(
  fs.existsSync(resultsFile)
    ? fs.readFileSync(resultsFile, 'utf8').split('\n').filter(Boolean).map((l) => {
        const r = JSON.parse(l);
        return r.infra ? null : `${r.model}|${r.format}|${r.run}`;
      })
    : [],
);

const original = (await api('GET', '/routing/assistant-models/FILE_WRITER')).map(toEntry);
fs.writeFileSync(path.join(outDir, 'file-writer-original.json'), JSON.stringify(original, null, 2));
const template = original[0] ?? { provider: 'OLLAMA_CLOUD', enabled: true, timeoutMs: 120_000, maxTokens: 8192 };
process.on('SIGINT', () => {
  stopping = true;
  console.log('\nstopping after in-flight runs; the FILE_WRITER list will be restored');
});

const meta = { id, started: new Date().toISOString(), base: BASE, runs, calls: 0 };
try {
  for (const model of models) {
    if (stopping) break;
    const jobs = formats.flatMap((format) => Array.from({ length: runs }, (_, run) => ({ format, run })))
      .filter((j) => !done.has(`${model}|${j.format}|${j.run}`));
    if (jobs.length === 0) continue;
    await setWriter([{ ...toEntry(template), provider: 'OLLAMA_CLOUD', modelAlias: model, enabled: true }]);
    console.log(`${model}: writer set; waiting ${CACHE_WAIT_MS / 1000}s for chat's cache`);
    await sleep(CACHE_WAIT_MS);
    let passed = 0;
    let count = 0;
    let infraStreak = 0;
    await pool(jobs, concurrency, async ({ format, run }) => {
      const r = await runOnce(model, format, run);
      fs.appendFileSync(resultsFile, `${JSON.stringify(r)}\n`);
      count++;
      if (r.pass) passed++;
      infraStreak = r.infra ? infraStreak + 1 : 0;
      if (infraStreak >= MAX_INFRA_STREAK && !stopping) {
        stopping = true;
        console.log(`${MAX_INFRA_STREAK} infrastructure errors in a row: the stack is down. Fix it, then re-run with the same --out.`);
      }
      console.log(`  ${model} ${format} #${run}: ${r.pass ? 'pass' : `FAIL ${r.problems.join('; ')}`} (${passed}/${count})`);
    });
  }
} finally {
  await setWriter(original);
  console.log('FILE_WRITER list restored');
  const results = fs.readFileSync(resultsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  meta.calls = results.length;
  const rows = summarize(results);
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.md'), renderReport(rows, { ...meta, runs }));
  console.log(`report: ${path.join(outDir, 'report.md')}`);
}
