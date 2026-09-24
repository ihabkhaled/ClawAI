// Normal-chat file matrix: the way a user really asks, in AUTO and in a chosen
// model. Unlike file-model-matrix.mjs (which forces provider FILE_GENERATION and
// swaps the global writer), this sends the plain prompt and lets the product
// decide. A run passes when a real file of the asked format comes back.
//
//   export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
//   export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…
//   node scripts/qa-lab/file-chat-matrix.mjs --mode=manual \
//     --models=OLLAMA:gpt-oss:20b,GEMINI:models/gemini-2.5-flash \
//     --formats=PDF,XLSX --variants=0,1 --out=scripts/qa-lab/results/CHATMATRIX-x
//   --mode=auto ignores --models. Re-running with the same --out resumes.
// Runbook: skills/run-the-file-model-matrix.md (chat lane).
import fs from 'node:fs';
import path from 'node:path';

import { checkFile } from './file-matrix-checks.mjs';

const BASE = process.env.QA_LAB_BASE ?? 'https://claw.local/api/v1';
const ORIGIN = new URL(BASE).origin;
const EMAIL = process.env.QA_LAB_EMAIL ?? '';
const PASSWORD = process.env.QA_LAB_PASSWORD ?? '';
const REPLY_TIMEOUT_MS = 240_000;
const FILE_TIMEOUT_MS = 300_000;

export const PHRASINGS = {
  PDF: [
    'give me a PDF report about the benefits of sleep',
    'اعمل لي ملف PDF عن فوائد النوم',
    'pdf: 1-page guide to saving money on groceries',
    'Crée un PDF sur les bienfaits du sport',
  ],
  DOCX: [
    'write a word document with a short checklist for moving apartments',
    'اكتب لي مستند وورد عن خطة عمل لمشروع صغير',
    'make me a docx of meeting notes template',
    'Genera un documento Word con una carta de presentación',
  ],
  XLSX: [
    'make me an excel of monthly expenses with 6 rows, columns item, category and amount',
    'اعمل لي ملف اكسل لميزانية شهرية',
    'xlsx budget tracker 5 rows',
    'Crée un tableur Excel de suivi des heures',
  ],
  CSV: [
    'make me a csv file with 6 rows of fake customers: name, city, age',
    'اعمل لي ملف csv فيه 5 منتجات مع الاسعار',
    'csv of 5 planets with diameter',
    'export a CSV of top 5 programming languages and year created',
  ],
  PPTX: [
    'make me a powerpoint deck of 4 slides about renewable energy',
    'اعمل لي عرض تقديمي عن الذكاء الاصطناعي',
    'pptx 3 slides on time management',
    'Fais-moi une présentation PowerPoint sur le recyclage',
  ],
  TXT: [
    'make me a txt file with five plain tips for studying',
    'اعطني ملف نصي txt فيه ٥ نصائح للدراسة',
    'save a short poem about the sea as a text file',
    'create a .txt with a grocery list',
  ],
  MD: [
    'make me a markdown file with notes on git branching',
    'write a README.md for a todo app',
    'اعمل لي ملف markdown عن ملخص كتاب',
    'create notes.md with a study plan',
  ],
  JSON: [
    'make me a json file listing 5 steps for baking bread, each with a title and minutes',
    'json file with 3 users: id, name, email',
    'اعمل ملف json فيه ٣ مستخدمين',
    'give me a JSON of 4 countries and capitals',
  ],
  ZIP: [
    'make me a zip of a tiny python project that prints hello, with a readme',
    'zip with an index.html and style.css for a landing page',
    'اعمل لي ملف zip فيه مشروع بايثون بسيط',
    'package a small node script and readme as a zip',
  ],
  IMAGE: [
    'generate an image of a red bicycle on a beach',
    'ارسم لي صورة قطة تلعب في الحديقة',
    'draw a logo for a coffee shop',
    'create a picture of a mountain at sunrise',
  ],
};
const ALL_FORMATS = Object.keys(PHRASINGS);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  }),
);
const mode = (args.mode ?? 'manual').toLowerCase();
const models = mode === 'auto' ? [{ provider: '', model: 'auto' }] : (args.models ?? '').split(',').filter(Boolean).map((m) => {
  const i = m.indexOf(':');
  return { provider: m.slice(0, i), model: m.slice(i + 1) };
});
const formats = (args.formats ? args.formats.split(',') : ALL_FORMATS).map((f) => f.trim().toUpperCase());
const variants = (args.variants ?? '0').split(',').map(Number);
const concurrency = Number(args.concurrency ?? 4);
const outDir = args.out ?? path.join('scripts', 'qa-lab', 'results', `CHATMATRIX-${Date.now().toString(36)}`);
if ((mode !== 'auto' && models.length === 0) || !EMAIL || !PASSWORD) {
  console.error('need QA_LAB_EMAIL/QA_LAB_PASSWORD and (--mode=auto or --models=PROVIDER:model,…)');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let token = '';
let tokenAt = 0;
async function auth() {
  if (token && Date.now() - tokenAt < 8 * 60_000) return token;
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
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${text.slice(0, 200)}`);
  return text === '' ? null : JSON.parse(text);
}

const IMAGE_MAGIC = [
  ['png', [0x89, 0x50, 0x4e, 0x47]],
  ['jpg', [0xff, 0xd8, 0xff]],
  ['webp', [0x52, 0x49, 0x46, 0x46]],
];
const isImage = (buf) => IMAGE_MAGIC.some(([, sig]) => sig.every((b, i) => buf[i] === b));

async function runOnce({ provider, model }, format, variant) {
  const started = Date.now();
  const prompt = PHRASINGS[format][variant % PHRASINGS[format].length];
  const r = { mode, provider, model, format, variant, prompt, outcome: 'unknown', pass: false, problems: [], latencyMs: null, replyPreview: '', metaType: null, servedBy: null, filename: null, bytes: 0 };
  let threadId = null;
  try {
    threadId = (await api('POST', '/chat-threads', { title: `CM ${model} ${format}` })).id;
    const body = { threadId, content: prompt };
    if (mode === 'auto') body.routingMode = 'AUTO';
    else Object.assign(body, { routingMode: 'MANUAL_MODEL', provider, model });
    await api('POST', '/chat-messages', body);
    let reply = null;
    while (Date.now() - started < REPLY_TIMEOUT_MS) {
      await sleep(3000);
      const list = await api('GET', `/chat-messages/thread/${threadId}`);
      const msgs = list.data ?? list;
      reply = msgs.filter((m) => m.role === 'ASSISTANT').at(-1) ?? null;
      if (reply && (reply.metadata?.generationId || (reply.content ?? '') !== '' || reply.metadata?.type)) {
        if (reply.status && !['COMPLETED', 'FAILED', 'DONE', 'SUCCEEDED'].includes(String(reply.status).toUpperCase()) && !reply.metadata?.generationId) continue;
        break;
      }
    }
    r.latencyMs = Date.now() - started;
    if (!reply) { r.outcome = 'no_reply'; r.problems.push('no reply'); return r; }
    r.replyPreview = String(reply.content ?? '').slice(0, 160).replace(/\s+/g, ' ');
    r.metaType = reply.metadata?.type ?? null;
    r.servedBy = `${reply.provider ?? '?'}/${reply.model ?? '?'}`;
    r.metaKeys = Object.keys(reply.metadata ?? {});
    const generationId = reply.metadata?.generationId ?? null;
    if (format === 'IMAGE') {
      const atts = reply.metadata?.imageUrls ?? reply.metadata?.images ?? reply.attachments ?? reply.metadata?.fileIds ?? [];
      if ((reply.provider ?? '').startsWith('IMAGE') || atts.length > 0) { r.outcome = 'image'; r.pass = true; }
      else { r.outcome = 'text_only'; r.problems.push('no image'); }
      return r;
    }
    if (!generationId) {
      r.outcome = /error|failed|unavailable|couldn't|could not/i.test(r.replyPreview) ? 'error_text' : 'text_only';
      r.problems.push(`no file: ${r.replyPreview.slice(0, 100)}`);
      return r;
    }
    let gen = null;
    while (Date.now() - started < FILE_TIMEOUT_MS) {
      gen = await api('GET', `/file-generations/${generationId}`);
      if (gen.status === 'COMPLETED' || gen.status === 'FAILED') break;
      await sleep(2500);
    }
    r.latencyMs = Date.now() - started;
    r.filename = gen?.filename ?? null;
    r.writer = gen?.model ?? null;
    if (gen?.status !== 'COMPLETED') { r.outcome = 'file_failed'; r.problems.push(`gen ${gen?.status}: ${String(gen?.errorMessage ?? '').slice(0, 100)}`); return r; }
    if (gen.format !== format) r.problems.push(`format became ${gen.format}`);
    const asset = (gen.assets ?? []).at(-1);
    if (!asset) { r.outcome = 'file_failed'; r.problems.push('no asset'); return r; }
    const res = await fetch(`${ORIGIN}${asset.downloadUrl}`, { headers: { authorization: `Bearer ${await auth()}` } });
    const buf = Buffer.from(await res.arrayBuffer());
    r.bytes = buf.length;
    if (!res.ok) r.problems.push(`download ${res.status}`);
    else r.problems.push(...(await checkFile(format, buf)));
    r.outcome = r.problems.length === 0 ? 'file' : 'file_bad';
    r.pass = r.problems.length === 0;
    return r;
  } catch (error) {
    r.outcome = 'error';
    r.problems.push(`error: ${error.message.slice(0, 200)}`);
    return r;
  } finally {
    if (threadId) await api('DELETE', `/chat-threads/${threadId}`).catch(() => {});
  }
}

fs.mkdirSync(outDir, { recursive: true });
const resultsFile = path.join(outDir, 'results.jsonl');
const done = new Set(fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, 'utf8').split('\n').filter(Boolean).map((l) => { const x = JSON.parse(l); return `${x.provider}|${x.model}|${x.format}|${x.variant}`; }) : []);
const jobs = models.flatMap((m) => formats.flatMap((f) => variants.map((v) => ({ m, f, v })))).filter(({ m, f, v }) => !done.has(`${m.provider}|${m.model}|${f}|${v}`));
let next = 0;
let pass = 0;
let count = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
  while (next < jobs.length) {
    const { m, f, v } = jobs[next++];
    const r = await runOnce(m, f, v);
    fs.appendFileSync(resultsFile, `${JSON.stringify(r)}\n`);
    count++;
    if (r.pass) pass++;
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${mode} ${m.provider}/${m.model} ${f}#${v} ${r.outcome} ${r.latencyMs}ms ${r.problems.join('; ').slice(0, 120)} (${pass}/${count})`);
  }
}));
console.log(`done ${pass}/${count} → ${resultsFile}`);
