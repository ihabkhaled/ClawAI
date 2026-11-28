#!/usr/bin/env node
// Research-engine evaluation runner (golden set in ./cases).
// Measures: did AUTO research fire when it should (and not when it should not),
// how deep did it go, were sources cited, and how long did it take.
// Hard rule inherited from ../client.mjs: only PAYG-exempt OLLAMA/LLAMACPP
// models ever execute.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(HERE, 'cases');
const ANSWER_TIMEOUT_MS = 180_000;
const SOURCE_TYPES = new Set(['news', 'official', 'academic', 'video', 'social', 'docs', 'forum']);
const RESEARCH_VALUES = new Set(['yes', 'no', 'either']);

// ------------------------------------------------------------------ args

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    limit: null,
    lang: null,
    category: null,
    concurrency: 3,
    model: 'gpt-oss:20b',
    out: null,
    keepThreads: false,
  };
  const need = (i, flag) => {
    if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--keep-threads') opts.keepThreads = true;
    else if (a === '--limit') opts.limit = Number(need(i++, a));
    else if (a === '--lang') opts.lang = need(i++, a);
    else if (a === '--category') opts.category = need(i++, a);
    else if (a === '--concurrency') opts.concurrency = Number(need(i++, a));
    else if (a === '--model') opts.model = need(i++, a);
    else if (a === '--out') opts.out = need(i++, a);
    else throw new Error(`unknown flag ${a}`);
  }
  if (opts.limit !== null && (!Number.isInteger(opts.limit) || opts.limit < 1))
    throw new Error('--limit must be a positive integer');
  if (!Number.isFinite(opts.concurrency)) throw new Error('--concurrency must be a number');
  opts.concurrency = Math.min(6, Math.max(1, Math.floor(opts.concurrency)));
  return opts;
}

// ------------------------------------------------------------ case loading

function validateCase(c, file, index) {
  const errs = [];
  const where = `${file}[${index}]${c && c.id ? ` (${c.id})` : ''}`;
  if (c === null || typeof c !== 'object') return [`${where}: not an object`];
  if (typeof c.id !== 'string' || !/^[A-Za-z]{2,3}(-[A-Za-z0-9]+)?-[a-z-]+-\d{2,}$/.test(c.id))
    errs.push(`${where}: bad id`);
  if (typeof c.lang !== 'string' || c.lang.length === 0) errs.push(`${where}: lang missing`);
  if (typeof c.category !== 'string' || c.category.length === 0)
    errs.push(`${where}: category missing`);
  if (typeof c.text !== 'string' || c.text.trim().length < 2) errs.push(`${where}: text missing`);
  if (typeof c.text === 'string' && c.text.length > 4000) errs.push(`${where}: text too long`);
  const e = c.expect;
  if (e === null || typeof e !== 'object') {
    errs.push(`${where}: expect missing`);
  } else {
    if (!RESEARCH_VALUES.has(e.research))
      errs.push(`${where}: expect.research must be yes|no|either`);
    for (const k of ['minDepth', 'maxDepth']) {
      if (e[k] !== undefined && !(Number.isInteger(e[k]) && e[k] >= 0 && e[k] <= 5))
        errs.push(`${where}: expect.${k} must be an integer 0-5`);
    }
    if (e.minDepth !== undefined && e.maxDepth !== undefined && e.minDepth > e.maxDepth)
      errs.push(`${where}: minDepth > maxDepth`);
    if (e.sourceTypes !== undefined) {
      if (!Array.isArray(e.sourceTypes) || e.sourceTypes.some((s) => !SOURCE_TYPES.has(s)))
        errs.push(`${where}: bad sourceTypes`);
    }
    if (e.mustMention !== undefined) {
      if (
        !Array.isArray(e.mustMention) ||
        e.mustMention.some((s) => typeof s !== 'string' || s.length === 0)
      )
        errs.push(`${where}: bad mustMention`);
    }
    if (e.research === 'no' && e.minDepth !== undefined && e.minDepth > 0)
      errs.push(`${where}: research=no with minDepth>0`);
  }
  if (c.notes !== undefined && typeof c.notes !== 'string')
    errs.push(`${where}: notes must be a string`);
  return errs;
}

function loadCases() {
  if (!fs.existsSync(CASES_DIR)) throw new Error(`cases dir missing: ${CASES_DIR}`);
  const files = fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const cases = [];
  const errors = [];
  const seen = new Map();
  for (const file of files) {
    let rows;
    try {
      rows = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), 'utf8'));
    } catch (error) {
      errors.push(`${file}: invalid JSON (${error.message})`);
      continue;
    }
    if (!Array.isArray(rows)) {
      errors.push(`${file}: top level must be an array`);
      continue;
    }
    rows.forEach((c, i) => {
      errors.push(...validateCase(c, file, i));
      if (c && typeof c.id === 'string') {
        if (seen.has(c.id)) errors.push(`duplicate id ${c.id} (${seen.get(c.id)} and ${file})`);
        else seen.set(c.id, file);
      }
      if (c && c.category && file !== `${c.category}.json`)
        errors.push(`${file}: case ${c.id} has category ${c.category}`);
      cases.push(c);
    });
  }
  return { cases, errors, files };
}

/** Round-robin across categories so --limit N yields a representative slice. */
function interleave(cases) {
  const byCat = new Map();
  for (const c of cases) {
    if (!byCat.has(c.category)) byCat.set(c.category, []);
    byCat.get(c.category).push(c);
  }
  const queues = [...byCat.values()];
  const out = [];
  for (let i = 0; out.length < cases.length; i += 1) {
    for (const q of queues) if (i < q.length) out.push(q[i]);
  }
  return out;
}

function tally(cases, key) {
  const m = new Map();
  for (const c of cases) {
    const k = typeof key === 'function' ? key(c) : c[key];
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function printCounts(cases) {
  console.log(`cases: ${cases.length}`);
  const langs = tally(cases, 'lang');
  console.log(`\nlanguages (${langs.length}):`);
  for (const [k, n] of langs) console.log(`  ${k.padEnd(10)} ${n}`);
  const cats = tally(cases, 'category');
  console.log(`\ncategories (${cats.length}):`);
  for (const [k, n] of cats) console.log(`  ${k.padEnd(20)} ${n}`);
  console.log('\nexpectation (research):');
  for (const [k, n] of tally(cases, (c) => c.expect?.research))
    console.log(`  ${String(k).padEnd(10)} ${n}`);
  const withMention = cases.filter((c) => c.expect?.mustMention?.length).length;
  const withDepth = cases.filter(
    (c) => c.expect?.minDepth !== undefined || c.expect?.maxDepth !== undefined,
  ).length;
  console.log(`\nwith mustMention: ${withMention}   with depth bounds: ${withDepth}`);
}

// -------------------------------------------------------------- extraction

const asArray = (v) => (Array.isArray(v) ? v : []);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Pull research facts out of the stored messages. The API shape is still moving,
 * so every field is optional: user.metadata.research (run record + bundle),
 * assistant.metadata.research (same), and assistant.metadata.narration (a list
 * of { kind, params } steps).
 */
export function extractResearch(userMsg, assistantMsg) {
  const um = isObj(userMsg?.metadata) ? userMsg.metadata : {};
  const am = isObj(assistantMsg?.metadata) ? assistantMsg.metadata : {};
  const record = isObj(um.research) ? um.research : isObj(am.research) ? am.research : null;
  const narration = asArray(am.narration).concat(asArray(um.narration)).filter(isObj);
  const researchKinds = new Set([
    'search_started',
    'search_done',
    'crawl_started',
    'crawl_progress',
    'crawl_done',
    'page_read',
    'back_to_ai',
    'replanned',
  ]);
  const narrated = narration.some((n) => researchKinds.has(n.kind));
  const ran = record !== null || narrated;

  let sources = 0;
  const bundle = isObj(record?.bundle) ? record.bundle : null;
  if (bundle)
    sources = Math.max(sources, asArray(bundle.items).length, asArray(bundle.sources).length);
  if (isObj(record) && Array.isArray(record.sources))
    sources = Math.max(sources, record.sources.length);

  let maxRound = 0;
  const queries = new Set();
  const languages = new Set();
  let duplicatesRemoved = 0;
  let reusedFromThread = 0;
  let pagesFromNarration = 0;
  for (const n of narration) {
    const p = isObj(n.params) ? n.params : isObj(n) ? n : {};
    if (Number.isFinite(Number(p.round))) maxRound = Math.max(maxRound, Number(p.round));
    for (const q of asArray(p.queries)) queries.add(typeof q === 'string' ? q : JSON.stringify(q));
    if (typeof p.query === 'string') queries.add(p.query);
    for (const l of asArray(p.languages)) languages.add(String(l));
    if (Number.isFinite(Number(p.duplicatesRemoved)))
      duplicatesRemoved += Number(p.duplicatesRemoved);
    if (p.reusedFromThread === true) reusedFromThread += 1;
    else if (Number.isFinite(Number(p.reusedFromThread)))
      reusedFromThread += Number(p.reusedFromThread);
    if (n.kind === 'crawl_done' && Number.isFinite(Number(p.pages ?? p.count)))
      pagesFromNarration = Math.max(pagesFromNarration, Number(p.pages ?? p.count));
  }
  sources = Math.max(sources, pagesFromNarration);
  // depth = research rounds actually run; a run with no round info counts as 1.
  const depth = !ran
    ? 0
    : maxRound > 0
      ? maxRound
      : Math.max(1, Number(record?.depth ?? bundle?.depth ?? 1) || 1);
  return {
    ran,
    depth,
    sources,
    queries: queries.size,
    languages: [...languages],
    duplicatesRemoved,
    reusedFromThread,
    narrationSteps: narration.length,
    mode: typeof record?.mode === 'string' ? record.mode : null,
  };
}

export function countCitations(text) {
  const nums = new Set();
  const re = /\[(\d{1,3}(?:\s*[,;\-–]\s*\d{1,3})*)\]/g;
  for (const m of String(text ?? '').matchAll(re)) {
    for (const n of m[1].split(/[,;\-–]/)) nums.add(n.trim());
  }
  return nums.size;
}

export function score(c, r) {
  const e = c.expect;
  const checks = {};
  checks.decision = e.research === 'either' ? true : e.research === 'yes' ? r.ran : !r.ran;
  const depthOk =
    (e.minDepth === undefined || r.depth >= e.minDepth) &&
    (e.maxDepth === undefined || r.depth <= e.maxDepth);
  // a wrong decision is already reported under `decision`; do not double-count it as a depth miss
  checks.depth = checks.decision ? depthOk : true;
  const answer = String(r.answer ?? '').toLowerCase();
  checks.mentions = (e.mustMention ?? []).every((t) => answer.includes(String(t).toLowerCase()));
  checks.citation = r.ran ? r.citations >= 1 : true;
  const pass = Object.values(checks).every(Boolean);
  const kind =
    e.research === 'no' && r.ran
      ? 'false_positive'
      : e.research === 'yes' && !r.ran
        ? 'false_negative'
        : null;
  return { checks, pass, kind };
}

// ------------------------------------------------------------------ runner

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runCase(client, model, c, opts) {
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    attempt += 1;
    let threadId = null;
    try {
      const thread = await client.createThread({
        title: `RESEARCH-EVAL-${c.id}`,
        provider: model.provider,
        model: model.modelKey,
      });
      threadId = thread.id;
      client.assertFree(model.provider);
      const sent = await client.api('POST', '/chat-messages', {
        threadId,
        content: c.text,
        routingMode: 'MANUAL_MODEL',
        provider: model.provider,
        model: model.modelKey,
        researchMode: 'AUTO',
      });
      if (!sent.ok) {
        const transport = sent.status >= 500 || sent.status === 429;
        if (transport && attempt === 1) {
          await sleep(3000);
          continue;
        }
        return {
          id: c.id,
          status: 'error',
          error: `send ${sent.status} ${JSON.stringify(sent.body).slice(0, 200)}`,
          threadId,
        };
      }
      const sendAt = Date.now();
      const reply = await client.awaitAssistant(threadId, 0, { timeoutMs: ANSWER_TIMEOUT_MS });
      if (!reply.ok)
        return {
          id: c.id,
          status: 'error',
          error: `no assistant reply (${reply.reason}) after ${reply.waitedMs} ms`,
          threadId,
        };
      const latencyMs = Date.now() - sendAt;
      const all = await client.listAllMessages(threadId);
      const userMsg = [...all].reverse().find((m) => m.role === 'USER') ?? null;
      const assistant = [...all].reverse().find((m) => m.role === 'ASSISTANT') ?? reply.message;
      const research = extractResearch(userMsg, assistant);
      const answer = String(assistant?.content ?? '');
      const citations = countCitations(answer);
      const scored = score(c, { ...research, answer, citations });
      if (!opts.keepThreads) await client.deleteThread(threadId).catch(() => undefined);
      return {
        id: c.id,
        lang: c.lang,
        category: c.category,
        status: 'scored',
        expect: c.expect,
        researchRan: research.ran,
        depth: research.depth,
        sources: research.sources,
        queries: research.queries,
        languages: research.languages,
        duplicatesRemoved: research.duplicatesRemoved,
        reusedFromThread: research.reusedFromThread,
        narrationSteps: research.narrationSteps,
        researchMode: research.mode,
        citations,
        answerChars: answer.length,
        latencyMs,
        checks: scored.checks,
        pass: scored.pass,
        kind: scored.kind,
        attempts: attempt,
        threadId: opts.keepThreads ? threadId : null,
      };
    } catch (error) {
      // thrown = transport failure (network, 401 exhaustion). Retry once, never on a scored failure.
      if (attempt === 1) {
        await sleep(3000);
        continue;
      }
      return {
        id: c.id,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        threadId,
        ms: Date.now() - started,
      };
    }
  }
}

// ------------------------------------------------------------------ summary

const pct = (n, d) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`);
function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function groupTable(rows, key, title) {
  const groups = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const lines = [
    `## ${title}`,
    '',
    `| ${key} | n | pass | accuracy | research ran | median ms |`,
    '|---|---:|---:|---:|---:|---:|',
  ];
  for (const [k, g] of [...groups.entries()].sort((a, b) =>
    String(a[0]).localeCompare(String(b[0])),
  )) {
    const lat = g.map((x) => x.latencyMs).sort((a, b) => a - b);
    const passN = g.filter((x) => x.pass).length;
    lines.push(
      `| ${k} | ${g.length} | ${passN} | ${pct(passN, g.length)} | ${g.filter((x) => x.researchRan).length} | ${percentile(lat, 50) ?? ''} |`,
    );
  }
  return lines.join('\n');
}

function buildSummary(results, meta) {
  const scored = results.filter((r) => r.status === 'scored');
  const errors = results.filter((r) => r.status === 'error');
  const passN = scored.filter((r) => r.pass).length;
  const decisive = scored.filter((r) => r.expect.research !== 'either');
  const decisionOk = decisive.filter((r) => r.checks.decision).length;
  const lat = scored.map((r) => r.latencyMs).sort((a, b) => a - b);
  const fp = scored.filter((r) => r.kind === 'false_positive');
  const fn = scored.filter((r) => r.kind === 'false_negative');
  const failed = scored.filter((r) => !r.pass);
  const lines = [
    `# Research eval ${meta.stamp}`,
    '',
    `- model: ${meta.model}`,
    `- cases run: ${results.length} (scored ${scored.length}, errors ${errors.length})`,
    `- overall accuracy (all checks): ${passN}/${scored.length} = ${pct(passN, scored.length)}`,
    `- decision accuracy (yes/no cases): ${decisionOk}/${decisive.length} = ${pct(decisionOk, decisive.length)}`,
    `- false positives (researched, expected no): ${fp.length}`,
    `- false negatives (did not research, expected yes): ${fn.length}`,
    `- latency: median ${percentile(lat, 50) ?? 'n/a'} ms, p90 ${percentile(lat, 90) ?? 'n/a'} ms`,
    '',
    groupTable(scored, 'lang', 'Per language'),
    '',
    groupTable(scored, 'category', 'Per category'),
    '',
    '## False positives',
    '',
    ...(fp.length ? fp.map((r) => `- ${r.id} (depth ${r.depth}, sources ${r.sources})`) : ['none']),
    '',
    '## False negatives',
    '',
    ...(fn.length ? fn.map((r) => `- ${r.id}`) : ['none']),
    '',
    '## Other failed checks',
    '',
    ...(failed.filter((r) => !r.kind).length
      ? failed
          .filter((r) => !r.kind)
          .map(
            (r) =>
              `- ${r.id}: ${Object.entries(r.checks)
                .filter(([, v]) => !v)
                .map(([k]) => k)
                .join(', ')}`,
          )
      : ['none']),
    '',
    '## Errors (not scored)',
    '',
    ...(errors.length ? errors.map((r) => `- ${r.id}: ${r.error}`) : ['none']),
    '',
  ];
  return lines.join('\n');
}

// -------------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { cases, errors, files } = loadCases();

  if (opts.dryRun) {
    console.log(`research-eval dry run: ${files.length} case files`);
    printCounts(cases.filter((c) => c && c.expect));
    if (errors.length > 0) {
      console.error(`\n${errors.length} problem(s):`);
      for (const e of errors) console.error(`  - ${e}`);
      process.exit(1);
    }
    console.log('\nOK: every case is valid, ids are unique.');
    return;
  }

  if (errors.length > 0) {
    console.error(`case files invalid (${errors.length}); run --dry-run`);
    process.exit(1);
  }

  let selected = cases;
  if (opts.lang) selected = selected.filter((c) => c.lang === opts.lang);
  if (opts.category) selected = selected.filter((c) => c.category === opts.category);
  selected = interleave(selected);
  if (opts.limit !== null) selected = selected.slice(0, opts.limit);
  if (selected.length === 0) {
    console.error('no cases match the filters');
    process.exit(1);
  }

  const client = await import('../client.mjs');
  const user = await client.login();
  const models = await client.loadAllowedModels();
  const model = models.find((m) => m.modelKey === opts.model);
  if (!model) {
    console.error(
      `model ${opts.model} is not in the PAYG-exempt allowed list: ${models.map((m) => m.modelKey).join(', ')}`,
    );
    process.exit(1);
  }
  client.assertFree(model.provider);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(
    opts.out ?? path.join(HERE, '..', 'results', `RESEARCH-EVAL-${stamp}`),
  );
  fs.mkdirSync(outDir, { recursive: true });
  const jsonl = path.join(outDir, 'results.jsonl');
  console.log(
    `acting as ${user.email}; model ${model.provider}/${model.modelKey}; ${selected.length} cases; concurrency ${opts.concurrency}; out ${outDir}`,
  );

  let done = 0;
  const results = await client.pool(selected, opts.concurrency, async (c) => {
    const r = await runCase(client, model, c, opts);
    if (r.lang === undefined) Object.assign(r, { lang: c.lang, category: c.category });
    client.appendJsonl(jsonl, r);
    done += 1;
    const tag =
      r.status === 'error'
        ? `ERROR ${r.error}`
        : r.pass
          ? 'pass'
          : `FAIL ${
              r.kind ??
              Object.entries(r.checks)
                .filter(([, v]) => !v)
                .map(([k]) => k)
                .join(',')
            }`;
    console.log(`[${done}/${selected.length}] ${c.id} ${tag}`);
    return r;
  });

  const normalized = results.map((r, i) =>
    r && r.status
      ? r
      : {
          id: selected[i].id,
          lang: selected[i].lang,
          category: selected[i].category,
          status: 'error',
          error: r?.error ?? 'unknown',
        },
  );
  fs.writeFileSync(
    path.join(outDir, 'summary.md'),
    buildSummary(normalized, { stamp, model: `${model.provider}/${model.modelKey}` }),
  );
  console.log(`done. ${path.join(outDir, 'summary.md')}`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
