import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { CRAWLER_OPERATORS, CRAWLER_SOURCES } from '../crawlers/crawler-sources.mjs';
import {
  assemble,
  countEntries,
  dangerOf,
  entriesSignature,
  extractPrefixes,
  parseCidr,
  parseRangesConf,
  renderRangesConf,
  resolveSections,
  wholeFileGuard,
} from '../crawlers/ranges.mjs';
import { repoPath } from '../lib/repo.mjs';

// ADR-232: the verified-crawler range file is the PROOF that a request really comes from Google, Bing, ...
// These tests pin the parser (a bad range must never be trusted), the carry-forward rules (one broken download
// must never make a real crawler look fake) and the committed file.

const UPDATER = repoPath('tools/crawlers/update-verified-crawler-ranges.mjs');

function ok(text) {
  const parsed = parseCidr(text);
  assert.ok(parsed.ok, `${text}: ${parsed.ok ? '' : parsed.reason}`);
  return parsed.value;
}

test('parseCidr accepts IPv4 and IPv6 networks and writes the canonical text', () => {
  assert.equal(ok('66.249.64.0/27').text, '66.249.64.0/27');
  assert.equal(ok('  34.22.85.0/27 ').text, '34.22.85.0/27');
  assert.equal(ok('2001:4860:4801:10::/64').text, '2001:4860:4801:10::/64');
  assert.equal(ok('2001:4860:4801:0010:0000:0000:0000:0000/64').text, '2001:4860:4801:10::/64');
  assert.equal(ok('2A00:1450:4001::/48').text, '2a00:1450:4001::/48');
  assert.equal(ok('2600:1f28:365:8000::/56').text, '2600:1f28:365:8000::/56');
  assert.equal(ok('1.2.3.4/32').text, '1.2.3.4/32');
});

test('parseCidr rejects every malformed range', () => {
  const bad = [
    ['1.2.3.0', 'no prefix length'],
    ['1.2.3.0/', 'empty length'],
    ['1.2.3.0/24/24', 'two slashes'],
    ['256.1.1.0/24', 'octet over 255'],
    ['010.1.1.0/24', 'leading zero'],
    ['1.2.3/24', 'three octets'],
    ['1.2.3.0/024', 'leading zero in the length'],
    ['1.2.3.0/33', 'IPv4 length over 32'],
    ['1.2.3.1/24', 'host bits set'],
    ['2001:db8::/129', 'IPv6 length over 128'],
    ['2001:4860:4801:10::1/64', 'IPv6 host bits set'],
    ['::ffff:1.2.3.4/128', 'embedded IPv4'],
    ['fe80::1%eth0/64', 'zone id'],
    [':::/64', 'triple colon'],
    ['2001::4860::1/64', 'two compressions'],
    ['1:2:3:4:5:6:7:8:9/64', 'nine groups'],
    ['12345::/64', 'group of five digits'],
    ['gggg::/64', 'not hex'],
    ['', 'empty'],
    ['example.com/24', 'a name'],
    [null, 'null'],
    [42, 'a number'],
  ];
  for (const [input, why] of bad) {
    assert.equal(parseCidr(input).ok, false, `${JSON.stringify(input)} must be rejected: ${why}`);
  }
});

test('dangerOf refuses ranges that are too broad or touch private and reserved space', () => {
  assert.equal(dangerOf(ok('66.249.64.0/27')), null);
  assert.equal(dangerOf(ok('2001:4860:4801:10::/64')), null);
  assert.equal(dangerOf(ok('2600:1f28:365:8000::/56')), null);
  for (const text of [
    '0.0.0.0/0',
    '8.0.0.0/8',
    '34.0.0.0/15',
    '10.0.0.0/24',
    '172.17.0.0/16',
    '172.16.0.0/16',
    '192.168.5.0/24',
    '127.0.0.0/24',
    '169.254.1.0/24',
    '100.64.0.0/24',
    '224.0.0.0/24',
    '::/0',
    '2001::/16',
    'fe80::/64',
    'fd00:1234::/48',
    '2001:db8:1::/48',
    '::1/128',
  ]) {
    assert.notEqual(dangerOf(ok(text)), null, `${text} must be refused`);
  }
});

test('extractPrefixes reads the published shape, de-duplicates and sorts', () => {
  const result = extractPrefixes({
    creationTime: '2026-11-27T00:00:00',
    prefixes: [
      { ipv4Prefix: '66.249.64.32/27' },
      { ipv6Prefix: '2001:4860:4801:10::/64' },
      { ipv4Prefix: '66.249.64.0/27' },
      { ipv4Prefix: '66.249.64.0/27' },
    ],
  });
  assert.ok(result.ok);
  assert.deepEqual(
    result.prefixes.map((prefix) => prefix.text),
    ['66.249.64.0/27', '66.249.64.32/27', '2001:4860:4801:10::/64'],
  );
  assert.equal(result.creationTime, '2026-11-27T00:00:00');
});

test('extractPrefixes rejects the whole source when ANY entry is bad', () => {
  const good = { ipv4Prefix: '66.249.64.0/27' };
  const cases = {
    'not an object': [],
    'no prefixes array': { prefixes: 'x' },
    'an entry that is not an object': { prefixes: [good, 'x'] },
    'an entry with two keys': {
      prefixes: [good, { ipv4Prefix: '1.2.3.0/24', ipv6Prefix: '2001::/32' }],
    },
    'an unknown key': { prefixes: [good, { cidr: '1.2.3.0/24' }] },
    'a v6 range under ipv4Prefix': { prefixes: [good, { ipv4Prefix: '2001:4860:4801:10::/64' }] },
    'a malformed range': { prefixes: [good, { ipv4Prefix: '1.2.3.0/99' }] },
    'a private range': { prefixes: [good, { ipv4Prefix: '10.1.0.0/24' }] },
    'the whole internet': { prefixes: [good, { ipv4Prefix: '0.0.0.0/0' }] },
  };
  for (const [name, json] of Object.entries(cases)) {
    assert.equal(extractPrefixes(json).ok, false, name);
  }
  assert.equal(extractPrefixes(null).ok, false);
});

const SOURCE_A = {
  id: 'google/googlebot',
  operator: 'google',
  url: 'https://example.invalid/a.json',
};
const SOURCE_B = { id: 'openai/gptbot', operator: 'openai', url: 'https://example.invalid/b.json' };
const prefixes = (count, start = 0) =>
  Array.from({ length: count }, (_, index) => `66.249.${start + index}.0/24`);

test('resolveSections takes a fresh source, keeps the old copy of a broken one, and marks a never-seen one missing', () => {
  const previous = new Map([['google/googlebot', { operator: 'google', prefixes: prefixes(10) }]]);
  const fetched = new Map([
    ['google/googlebot', { ok: false, reason: 'HTTP 503' }],
    ['openai/gptbot', { ok: false, reason: 'HTTP 404' }],
  ]);
  const sections = resolveSections({
    sources: [SOURCE_A, SOURCE_B],
    fetched,
    previous,
    maxShrink: 0.5,
  });
  assert.equal(sections[0].status, 'stale');
  assert.equal(sections[0].prefixes.length, 10);
  assert.match(sections[0].note, /HTTP 503/u);
  assert.equal(sections[1].status, 'missing');
  assert.deepEqual(sections[1].prefixes, []);

  const fresh = new Map([
    ['google/googlebot', { ok: true, prefixes: prefixes(12), note: 'n' }],
    ['openai/gptbot', { ok: true, prefixes: prefixes(3, 100), note: 'n' }],
  ]);
  const after = resolveSections({
    sources: [SOURCE_A, SOURCE_B],
    fetched: fresh,
    previous,
    maxShrink: 0.5,
  });
  assert.deepEqual(
    after.map((section) => section.status),
    ['ok', 'ok'],
  );
  assert.equal(after[0].prefixes.length, 12);
});

test('resolveSections keeps the old copy of a source that shrank by more than half or came back empty', () => {
  const previous = new Map([['google/googlebot', { operator: 'google', prefixes: prefixes(10) }]]);
  const shrunk = new Map([['google/googlebot', { ok: true, prefixes: prefixes(4), note: 'n' }]]);
  const [stale] = resolveSections({
    sources: [SOURCE_A],
    fetched: shrunk,
    previous,
    maxShrink: 0.5,
  });
  assert.equal(stale.status, 'stale');
  assert.equal(stale.prefixes.length, 10);
  assert.match(stale.note, /shrank from 10 to 4/u);

  const [forced] = resolveSections({
    sources: [SOURCE_A],
    fetched: shrunk,
    previous,
    maxShrink: 0.5,
    forceShrink: true,
  });
  assert.equal(forced.status, 'ok');
  assert.equal(forced.prefixes.length, 4);

  const empty = new Map([['google/googlebot', { ok: true, prefixes: [], note: 'n' }]]);
  const [none] = resolveSections({
    sources: [SOURCE_A],
    fetched: empty,
    previous,
    maxShrink: 0.5,
    forceShrink: true,
  });
  assert.equal(
    none.status,
    'stale',
    'an empty feed is never accepted, even when shrinking is forced',
  );

  const half = new Map([['google/googlebot', { ok: true, prefixes: prefixes(5), note: 'n' }]]);
  const [exactlyHalf] = resolveSections({
    sources: [SOURCE_A],
    fetched: half,
    previous,
    maxShrink: 0.5,
  });
  assert.equal(
    exactlyHalf.status,
    'ok',
    'losing exactly half is allowed; MORE than half is refused',
  );
});

test('wholeFileGuard refuses an empty file and one more than half smaller, and nothing else', () => {
  assert.match(wholeFileGuard({ newTotal: 0, oldTotal: 0, maxShrink: 0.5 }) ?? '', /empty/u);
  assert.match(
    wholeFileGuard({ newTotal: 0, oldTotal: 10, maxShrink: 0.5, forceShrink: true }) ?? '',
    /empty/u,
  );
  assert.match(wholeFileGuard({ newTotal: 49, oldTotal: 100, maxShrink: 0.5 }) ?? '', /49.*100/u);
  assert.equal(wholeFileGuard({ newTotal: 50, oldTotal: 100, maxShrink: 0.5 }), null);
  assert.equal(
    wholeFileGuard({ newTotal: 5, oldTotal: 100, maxShrink: 0.5, forceShrink: true }),
    null,
  );
  assert.equal(wholeFileGuard({ newTotal: 120, oldTotal: 100, maxShrink: 0.5 }), null);
  assert.equal(wholeFileGuard({ newTotal: 3, oldTotal: 0, maxShrink: 0.5 }), null);
});

test('renderRangesConf writes geo lines that parseRangesConf reads back, and reports a conflict instead of duplicating', () => {
  const sections = [
    {
      ...SOURCE_A,
      status: 'ok',
      prefixes: ['66.249.64.0/27', '2001:4860:4801:10::/64'],
      note: 'n1',
    },
    { ...SOURCE_B, status: 'stale', prefixes: ['20.171.206.0/24', '66.249.64.0/27'], note: 'kept' },
  ];
  const { text, total, conflicts } = renderRangesConf({
    sections,
    generatedAt: '2026-11-28T00:00:00.000Z',
  });
  assert.equal(total, 3);
  assert.equal(conflicts.length, 1);
  assert.match(
    conflicts[0],
    /66\.249\.64\.0\/27 is published by both google and openai; kept google/u,
  );
  assert.match(text, /^# GENERATED FILE - do not edit by hand\./u);
  assert.match(text, /# Generated: {2}2026-11-28T00:00:00\.000Z/u);
  assert.match(text, /# Prefixes: {3}3 \(ipv4 2, ipv6 1\) from 2 sources/u);
  assert.match(text, /# {3}stale {3}openai\/gptbot/u);
  const lines = text.split('\n').filter((line) => /;$/u.test(line));
  assert.deepEqual(lines, [
    '66.249.64.0/27 google;',
    '2001:4860:4801:10::/64 google;',
    '20.171.206.0/24 openai;',
  ]);
  const back = parseRangesConf(text);
  assert.deepEqual([...back.keys()], ['google/googlebot', 'openai/gptbot']);
  assert.deepEqual(back.get('openai/gptbot'), {
    operator: 'openai',
    prefixes: ['20.171.206.0/24'],
  });
  assert.equal(countEntries(text), 3);
  assert.equal(assemble(sections).total, 3);
});

test('entriesSignature ignores the header, so a changed date alone never rewrites the file', () => {
  const sections = [{ ...SOURCE_A, status: 'ok', prefixes: ['66.249.64.0/27'], note: 'a' }];
  const first = renderRangesConf({ sections, generatedAt: '2026-11-28T00:00:00.000Z' }).text;
  const later = renderRangesConf({
    sections: [{ ...sections[0], note: 'different upstream stamp' }],
    generatedAt: '2026-12-05T00:00:00.000Z',
  }).text;
  assert.notEqual(first, later);
  assert.equal(entriesSignature(first), entriesSignature(later));
  const changed = renderRangesConf({
    sections: [{ ...sections[0], prefixes: ['66.249.64.0/27', '66.249.64.32/27'] }],
    generatedAt: '2026-11-28T00:00:00.000Z',
  }).text;
  assert.notEqual(entriesSignature(first), entriesSignature(changed));
});

// --- the CLI, offline (--source-dir) ------------------------------------------------------------------------
function withWorkspace(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-crawler-ranges-'));
  try {
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeSources(dir, overrides = {}) {
  CRAWLER_SOURCES.forEach((source, index) => {
    const entries = overrides[source.id] ?? [
      { ipv4Prefix: `34.${index + 1}.0.0/24` },
      { ipv4Prefix: `34.${index + 1}.1.0/24` },
      { ipv6Prefix: `2a00:${(index + 1).toString(16)}::/32` },
    ];
    const body =
      typeof entries === 'string'
        ? entries
        : JSON.stringify({ creationTime: 't', prefixes: entries });
    fs.writeFileSync(path.join(dir, `${source.id.replaceAll('/', '__')}.json`), body);
  });
}

function updater(dir, ...args) {
  const result = spawnSync(
    process.execPath,
    [UPDATER, '--source-dir', dir, '--out', path.join(dir, 'out', 'ranges.conf'), ...args],
    { encoding: 'utf8' },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

test('the updater writes a first file, leaves an identical run alone, and writes through a temp file', () => {
  withWorkspace((dir) => {
    writeSources(dir);
    const first = updater(dir);
    assert.equal(first.status, 0, first.output);
    const out = path.join(dir, 'out', 'ranges.conf');
    const text = fs.readFileSync(out, 'utf8');
    assert.equal(countEntries(text), CRAWLER_SOURCES.length * 3);
    assert.deepEqual(
      fs.readdirSync(path.join(dir, 'out')),
      ['ranges.conf'],
      'no temp file is left behind',
    );
    const stamp = fs.statSync(out).mtimeMs;
    const second = updater(dir);
    assert.equal(second.status, 0, second.output);
    assert.match(second.output, /unchanged/u);
    assert.equal(fs.statSync(out).mtimeMs, stamp, 'an unchanged run does not touch the file');
  });
});

test('the updater refuses a first file when a source is missing, unless told to', () => {
  withWorkspace((dir) => {
    writeSources(dir);
    fs.rmSync(path.join(dir, 'google__googlebot.json'));
    const refused = updater(dir);
    assert.equal(refused.status, 1, refused.output);
    assert.equal(fs.existsSync(path.join(dir, 'out', 'ranges.conf')), false);
    const allowed = updater(dir, '--allow-missing');
    assert.equal(allowed.status, 3, allowed.output);
    assert.match(
      fs.readFileSync(path.join(dir, 'out', 'ranges.conf'), 'utf8'),
      /# {3}missing google\/googlebot/u,
    );
  });
});

test('a source that turns bad keeps its previous ranges and the run reports exit 3', () => {
  withWorkspace((dir) => {
    writeSources(dir);
    assert.equal(updater(dir).status, 0);
    const out = path.join(dir, 'out', 'ranges.conf');
    const before = parseRangesConf(fs.readFileSync(out, 'utf8')).get('openai/gptbot');
    // openai/gptbot now publishes a private range: the whole source is rejected, the old copy stays.
    writeSources(dir, { 'openai/gptbot': [{ ipv4Prefix: '10.0.0.0/24' }] });
    const run = updater(dir);
    assert.equal(run.status, 3, run.output);
    assert.match(run.output, /stale\s+openai\/gptbot/u);
    assert.deepEqual(parseRangesConf(fs.readFileSync(out, 'utf8')).get('openai/gptbot'), before);
    // Not JSON at all: same.
    writeSources(dir, { 'openai/gptbot': '<html>oops</html>' });
    assert.equal(updater(dir).status, 3);
    assert.deepEqual(parseRangesConf(fs.readFileSync(out, 'utf8')).get('openai/gptbot'), before);
  });
});

test('an empty feed is carried forward, and only an operator can force a shrink', () => {
  withWorkspace((dir) => {
    writeSources(dir);
    assert.equal(updater(dir).status, 0);
    const out = path.join(dir, 'out', 'ranges.conf');
    const original = fs.readFileSync(out, 'utf8');
    // Every source empty: every one is carried forward, so the file stays whole.
    writeSources(dir, Object.fromEntries(CRAWLER_SOURCES.map((source) => [source.id, []])));
    const empties = updater(dir);
    assert.equal(empties.status, 3, empties.output);
    assert.equal(entriesSignature(fs.readFileSync(out, 'utf8')), entriesSignature(original));
    // Every source shrinks to one entry: refused per source, written only when an operator forces it.
    writeSources(
      dir,
      Object.fromEntries(
        CRAWLER_SOURCES.map((source) => [source.id, [{ ipv4Prefix: '34.250.0.0/24' }]]),
      ),
    );
    const collapsed = updater(dir, '--force-shrink');
    assert.equal(collapsed.status, 0, 'a forced shrink is an operator decision: it is written');
  });
});

test('a stricter --max-shrink carries a shrinking source forward, and --dry-run never writes', () => {
  withWorkspace((dir) => {
    writeSources(dir);
    assert.equal(updater(dir).status, 0);
    const out = path.join(dir, 'out', 'ranges.conf');
    const original = fs.readFileSync(out, 'utf8');
    // Each source keeps 2 of 3 entries: a third lost, fine at the default 0.5, too much at 0.2.
    writeSources(
      dir,
      Object.fromEntries(
        CRAWLER_SOURCES.map((source, index) => [
          source.id,
          [{ ipv4Prefix: `34.${index + 1}.0.0/24` }, { ipv4Prefix: `34.${index + 1}.1.0/24` }],
        ]),
      ),
    );
    const refused = updater(dir, '--max-shrink', '0.2');
    assert.equal(
      refused.status,
      3,
      'every source is stale at 0.2: the old file stays and the run is degraded',
    );
    assert.equal(fs.readFileSync(out, 'utf8'), original);
    assert.equal(updater(dir, '--dry-run').status, 0);
    assert.equal(fs.readFileSync(out, 'utf8'), original, '--dry-run never writes');
  });
});

// --- the committed file ---------------------------------------------------------------------------------------
test('the committed ranges.conf is complete, strictly valid and covers every source and operator', () => {
  const text = fs.readFileSync(repoPath('infra/nginx/verified-crawlers/ranges.conf'), 'utf8');
  assert.match(text, /^# GENERATED FILE - do not edit by hand\./u);
  const sections = parseRangesConf(text);
  assert.deepEqual(
    [...sections.keys()],
    CRAWLER_SOURCES.map((source) => source.id),
  );
  const seen = new Set();
  for (const source of CRAWLER_SOURCES) {
    const section = sections.get(source.id);
    assert.equal(section.operator, source.operator);
    assert.ok(section.prefixes.length > 0, `${source.id} has no prefixes`);
    for (const cidr of section.prefixes) {
      const parsed = parseCidr(cidr);
      assert.ok(parsed.ok, `${source.id}: ${cidr}`);
      assert.equal(parsed.value.text, cidr, `${cidr} is not canonical`);
      assert.equal(dangerOf(parsed.value), null, `${source.id}: ${cidr}`);
      assert.equal(seen.has(cidr), false, `${cidr} is listed twice`);
      seen.add(cidr);
    }
  }
  assert.ok(countEntries(text) > 2000);
  assert.ok(
    [...seen].some((cidr) => cidr.includes(':')),
    'IPv6 ranges are present',
  );
  assert.ok(
    !/^#\s+(?:stale|missing)\s/mu.test(text),
    'the committed file has no stale or missing source',
  );
  assert.deepEqual(
    [...new Set([...sections.values()].map((section) => section.operator))],
    [...CRAWLER_OPERATORS],
  );
  // Every non-comment, non-blank line is a geo line or a section marker: nginx must be able to read it.
  for (const line of text.split(/\r?\n/u)) {
    if (line === '' || line.startsWith('#')) continue;
    assert.match(line, /^[0-9a-f:.]+\/[0-9]{1,3} [a-z0-9-]+;$/iu, line);
  }
});
