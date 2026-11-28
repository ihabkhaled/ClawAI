#!/usr/bin/env node
// Downloads the OFFICIAL IP range files of the crawlers that publish them and writes the nginx
// `geo` include that turns "a request from this address" into proof of who sent it (ADR-232).
//
//   node tools/crawlers/update-verified-crawler-ranges.mjs                 # rewrite infra/nginx/verified-crawlers/ranges.conf
//   node tools/crawlers/update-verified-crawler-ranges.mjs --dry-run       # show the plan, write nothing
//   node tools/crawlers/update-verified-crawler-ranges.mjs --out /var/lib/claw/verified-crawlers/ranges.conf
//   node tools/crawlers/update-verified-crawler-ranges.mjs --source-dir DIR   # offline: DIR/<id with / as __>.json
//
// Safety, in the order it applies:
//   * every CIDR is parsed strictly; a feed with one malformed, too-broad or private/reserved range is
//     rejected as a whole and that source keeps its PREVIOUS copy (stale), so one bad download can never
//     make a real crawler's traffic look fake;
//   * a source that lost more than --max-shrink (default 0.5) of its prefixes keeps its previous copy;
//   * the whole file is refused when it would be empty or more than --max-shrink smaller than the old one;
//   * the first generation needs every source (--allow-missing overrides);
//   * the file is replaced atomically, and left alone when no range changed.
//
// Exit codes: 0 written or unchanged, all sources fresh · 1 refused, nothing written ·
//             3 written or unchanged, but at least one source is stale or missing (look at the header).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { CRAWLER_SOURCES, DEFAULT_RANGES_FILE } from './crawler-sources.mjs';
import {
  countEntries,
  entriesSignature,
  extractPrefixes,
  parseRangesConf,
  renderRangesConf,
  resolveSections,
  sha256Short,
  wholeFileGuard,
} from './ranges.mjs';

// No import from tools/lib: the host refresher runs this folder alone in a bare node container.
const DEFAULT_OUT = fileURLToPath(new URL(`../../${DEFAULT_RANGES_FILE}`, import.meta.url));
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const REQUEST_HEADERS = {
  'user-agent': 'crawler-range-updater/1.0',
  accept: 'application/json, */*',
};

/** @param {string[]} argv */
function readOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      out: { type: 'string' },
      'source-dir': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'max-shrink': { type: 'string', default: '0.5' },
      'force-shrink': { type: 'boolean', default: false },
      'allow-missing': { type: 'boolean', default: false },
      'timeout-ms': { type: 'string', default: '30000' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const maxShrink = Number(values['max-shrink']);
  if (!(maxShrink > 0 && maxShrink < 1)) throw new Error('--max-shrink must be between 0 and 1');
  return {
    out: values.out === undefined ? DEFAULT_OUT : path.resolve(values.out),
    sourceDir: values['source-dir'],
    dryRun: values['dry-run'],
    maxShrink,
    forceShrink: values['force-shrink'],
    allowMissing: values['allow-missing'],
    timeoutMs: Number(values['timeout-ms']),
    help: values.help,
  };
}

/** @param {{ id: string, url: string }} source @param {{ sourceDir?: string, timeoutMs: number }} options */
async function readSourceText(source, options) {
  if (options.sourceDir !== undefined) {
    const file = path.join(options.sourceDir, `${source.id.replaceAll('/', '__')}.json`);
    return fs.readFileSync(file, 'utf8');
  }
  const url = new URL(source.url);
  if (url.protocol !== 'https:') throw new Error('the source is not https');
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(options.timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (new URL(response.url).protocol !== 'https:') throw new Error('a redirect left https');
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new Error(`the body is ${declared} bytes`);
  const text = await response.text();
  if (text.length > MAX_BODY_BYTES) throw new Error(`the body is ${text.length} bytes`);
  return text;
}

/** @param {{ id: string, url: string }} source @param {{ sourceDir?: string, timeoutMs: number }} options */
async function fetchSource(source, options) {
  try {
    const text = await readSourceText(source, options);
    const json = JSON.parse(text);
    const extracted = extractPrefixes(json);
    if (!extracted.ok) return { ok: false, reason: `rejected: ${extracted.reason}` };
    const stamp =
      extracted.creationTime === '' ? 'no upstream date' : `upstream ${extracted.creationTime}`;
    return {
      ok: true,
      prefixes: extracted.prefixes.map((prefix) => prefix.text),
      note: `${stamp}, sha256:${sha256Short(text)}`,
    };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function writeAtomically(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.tmp-${process.pid}`);
  fs.writeFileSync(temporary, text, { mode: 0o644 });
  fs.renameSync(temporary, file);
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  if (options.help) {
    console.log(
      fs
        .readFileSync(new URL(import.meta.url), 'utf8')
        .split('\n')
        .slice(1, 22)
        .join('\n'),
    );
    return 0;
  }
  const previousText = fs.existsSync(options.out) ? fs.readFileSync(options.out, 'utf8') : '';
  const previous = parseRangesConf(previousText);
  const oldTotal = countEntries(previousText);

  const fetched = new Map();
  await Promise.all(
    CRAWLER_SOURCES.map(async (source) =>
      fetched.set(source.id, await fetchSource(source, options)),
    ),
  );

  const sections = resolveSections({
    sources: CRAWLER_SOURCES,
    fetched,
    previous,
    maxShrink: options.maxShrink,
    forceShrink: options.forceShrink,
  });
  for (const section of sections) {
    console.log(
      `${section.status.padEnd(7)} ${section.id}  ${section.prefixes.length} prefixes  ${section.note}`,
    );
  }

  const missing = sections.filter((section) => section.status === 'missing');
  if (missing.length > 0 && !options.allowMissing && previousText === '') {
    console.error(
      `refused: no previous file and ${missing.map((section) => section.id).join(', ')} could not be read`,
    );
    return 1;
  }

  const rendered = renderRangesConf({ sections, generatedAt: new Date().toISOString() });
  const refusal = wholeFileGuard({
    newTotal: rendered.total,
    oldTotal,
    maxShrink: options.maxShrink,
    forceShrink: options.forceShrink,
  });
  if (refusal !== null) {
    console.error(`refused: ${refusal}; the old file was left in place`);
    return 1;
  }
  for (const conflict of rendered.conflicts) console.warn(`conflict: ${conflict}`);

  const degraded = sections.some((section) => section.status !== 'ok');
  if (entriesSignature(rendered.text) === entriesSignature(previousText)) {
    console.log(`unchanged: ${rendered.total} prefixes (${options.out})`);
    return degraded ? 3 : 0;
  }
  if (options.dryRun) {
    console.log(
      `dry run: would write ${rendered.total} prefixes (was ${oldTotal}) to ${options.out}`,
    );
    return degraded ? 3 : 0;
  }
  writeAtomically(options.out, rendered.text);
  console.log(`wrote ${rendered.total} prefixes (was ${oldTotal}) to ${options.out}`);
  return degraded ? 3 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
