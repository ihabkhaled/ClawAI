// Pure functions behind tools/crawlers/update-verified-crawler-ranges.mjs (ADR-232): strict CIDR
// parsing, the published-JSON reader, the nginx geo renderer and its reader, and the guards that
// keep a bad download from replacing a good file. No I/O here, so every rule is unit-tested.
import { createHash } from 'node:crypto';

const BITS = { 4: 32, 6: 128 };

/** Broader than this and a "crawler range" is really a slice of the internet. */
export const MIN_PREFIX_LENGTH = { 4: 16, 6: 32 };

/** Addresses nginx can never see from the open internet; a crawler range must never overlap them. */
const RESERVED_RANGES = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '::/128',
  '::1/128',
  '::ffff:0:0/96',
  '64:ff9b::/96',
  '2001:db8::/32',
  'fc00::/7',
  'fe80::/10',
  'ff00::/8',
];

const IPV4_OCTET = '(0|[1-9][0-9]{0,2})';
const IPV4_PATTERN = new RegExp(`^${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}$`, 'u');
const IPV6_GROUP_PATTERN = /^[0-9a-f]{1,4}$/iu;

/** @returns {bigint | null} */
function parseIPv4(text) {
  if (!IPV4_PATTERN.test(text)) return null;
  let value = 0n;
  for (const octet of text.split('.')) {
    const number = Number(octet);
    if (number > 255) return null;
    value = (value << 8n) | BigInt(number);
  }
  return value;
}

/** @returns {bigint | null} */
function parseIPv6(text) {
  if (!/^[0-9a-f:]+$/iu.test(text)) return null;
  const compression = text.indexOf('::');
  if (compression !== text.lastIndexOf('::')) return null;
  /** @type {string[]} */
  let groups;
  if (compression === -1) {
    groups = text.split(':');
    if (groups.length !== 8) return null;
  } else {
    const head = text.slice(0, compression);
    const tail = text.slice(compression + 2);
    const headGroups = head === '' ? [] : head.split(':');
    const tailGroups = tail === '' ? [] : tail.split(':');
    const missing = 8 - headGroups.length - tailGroups.length;
    if (missing < 1) return null;
    groups = [...headGroups, ...Array.from({ length: missing }, () => '0'), ...tailGroups];
  }
  let value = 0n;
  for (const group of groups) {
    if (!IPV6_GROUP_PATTERN.test(group)) return null;
    value = (value << 16n) | BigInt(Number.parseInt(group, 16));
  }
  return value;
}

/** RFC 5952 text for an IPv6 network value. */
function formatIPv6(value) {
  const groups = Array.from({ length: 8 }, (_, index) =>
    Number((value >> BigInt((7 - index) * 16)) & 0xffffn),
  );
  let bestStart = -1;
  let bestLength = 0;
  for (let start = 0; start < 8;) {
    if (groups[start] !== 0) {
      start += 1;
      continue;
    }
    let end = start;
    while (end < 8 && groups[end] === 0) end += 1;
    if (end - start > bestLength) {
      bestStart = start;
      bestLength = end - start;
    }
    start = end;
  }
  if (bestLength < 2) return groups.map((group) => group.toString(16)).join(':');
  const head = groups.slice(0, bestStart).map((group) => group.toString(16));
  const tail = groups.slice(bestStart + bestLength).map((group) => group.toString(16));
  return `${head.join(':')}::${tail.join(':')}`;
}

function formatIPv4(value) {
  return [24n, 16n, 8n, 0n].map((shift) => String(Number((value >> shift) & 0xffn))).join('.');
}

/**
 * @typedef {object} ParsedCidr
 * @property {4 | 6} family
 * @property {bigint} network
 * @property {number} length
 * @property {string} text  canonical `address/length`
 */

/**
 * Strict CIDR parser: dotted-quad or colon-hex address, a REQUIRED `/length`, no leading zeros, no
 * zone id, no embedded IPv4 in IPv6, host bits all zero.
 * @param {unknown} input
 * @returns {{ ok: true, value: ParsedCidr } | { ok: false, reason: string }}
 */
export function parseCidr(input) {
  if (typeof input !== 'string') return { ok: false, reason: 'not a string' };
  const text = input.trim();
  const slash = text.indexOf('/');
  if (slash === -1 || slash !== text.lastIndexOf('/')) {
    return { ok: false, reason: `"${input}" is not address/length` };
  }
  const address = text.slice(0, slash);
  const lengthText = text.slice(slash + 1);
  if (!/^(0|[1-9][0-9]{0,2})$/u.test(lengthText)) {
    return { ok: false, reason: `"${input}" has a bad prefix length` };
  }
  const length = Number(lengthText);
  /** @type {4 | 6} */
  const family = address.includes(':') ? 6 : 4;
  const network = family === 4 ? parseIPv4(address) : parseIPv6(address);
  if (network === null) return { ok: false, reason: `"${input}" has a bad address` };
  if (length > BITS[family])
    return { ok: false, reason: `"${input}" prefix is longer than ${BITS[family]}` };
  const hostBits = BigInt(BITS[family] - length);
  if ((network & ((1n << hostBits) - 1n)) !== 0n) {
    return { ok: false, reason: `"${input}" has host bits set` };
  }
  const canonical = family === 4 ? formatIPv4(network) : formatIPv6(network);
  return { ok: true, value: { family, network, length, text: `${canonical}/${length}` } };
}

/** @param {ParsedCidr} outer @param {ParsedCidr} inner */
function contains(outer, inner) {
  if (outer.family !== inner.family || outer.length > inner.length) return false;
  const shift = BigInt(BITS[outer.family] - outer.length);
  return outer.network >> shift === inner.network >> shift;
}

const RESERVED = RESERVED_RANGES.map((text) => {
  const parsed = parseCidr(text);
  if (!parsed.ok) throw new Error(`reserved range ${text}: ${parsed.reason}`);
  return parsed.value;
});

/**
 * Reasons a syntactically valid range may still not be trusted: too broad, or touching an address
 * that is never a public client. A feed that contains one is treated as compromised as a whole.
 * @param {ParsedCidr} cidr
 * @returns {string | null}
 */
export function dangerOf(cidr) {
  if (cidr.length < MIN_PREFIX_LENGTH[cidr.family]) {
    return `${cidr.text} is broader than /${MIN_PREFIX_LENGTH[cidr.family]}`;
  }
  const reserved = RESERVED.find((range) => contains(range, cidr) || contains(cidr, range));
  return reserved === undefined
    ? null
    : `${cidr.text} overlaps the reserved range ${reserved.text}`;
}

/**
 * Reads the shape every operator uses: `{"prefixes":[{"ipv4Prefix":"…"},{"ipv6Prefix":"…"}]}`.
 * ANY malformed or dangerous entry rejects the whole source (the caller keeps the previous copy).
 * @param {unknown} json
 * @returns {{ ok: true, prefixes: ParsedCidr[], creationTime: string } | { ok: false, reason: string }}
 */
export function extractPrefixes(json) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, reason: 'the document is not an object' };
  }
  const list = /** @type {{ prefixes?: unknown }} */ (json).prefixes;
  if (!Array.isArray(list)) return { ok: false, reason: 'no "prefixes" array' };
  /** @type {Map<string, ParsedCidr>} */
  const unique = new Map();
  for (const [index, entry] of list.entries()) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      return { ok: false, reason: `prefixes[${index}] is not an object` };
    }
    const keys = Object.keys(entry);
    if (keys.length !== 1 || (keys[0] !== 'ipv4Prefix' && keys[0] !== 'ipv6Prefix')) {
      return { ok: false, reason: `prefixes[${index}] has unexpected keys ${keys.join(',')}` };
    }
    const parsed = parseCidr(/** @type {Record<string, unknown>} */ (entry)[keys[0]]);
    if (!parsed.ok) return { ok: false, reason: `prefixes[${index}]: ${parsed.reason}` };
    const wantedFamily = keys[0] === 'ipv4Prefix' ? 4 : 6;
    if (parsed.value.family !== wantedFamily) {
      return {
        ok: false,
        reason: `prefixes[${index}]: ${keys[0]} holds an address of the other family`,
      };
    }
    const danger = dangerOf(parsed.value);
    if (danger !== null) return { ok: false, reason: `prefixes[${index}]: ${danger}` };
    unique.set(parsed.value.text, parsed.value);
  }
  const prefixes = [...unique.values()].sort(compareCidr);
  const creationTime = String(/** @type {{ creationTime?: unknown }} */ (json).creationTime ?? '');
  return { ok: true, prefixes, creationTime };
}

/** @param {ParsedCidr} left @param {ParsedCidr} right */
export function compareCidr(left, right) {
  if (left.family !== right.family) return left.family - right.family;
  if (left.network !== right.network) return left.network < right.network ? -1 : 1;
  return left.length - right.length;
}

/** @param {string} text */
export function sha256Short(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

const LINE_PATTERN = /^([0-9a-f:.]+\/[0-9]{1,3}) ([a-z0-9-]+);$/iu;
const SECTION_PATTERN = /^# @section (\S+) (\S+)$/u;

/**
 * Reads a ranges.conf back into sections.
 * @param {string} text
 * @returns {Map<string, { operator: string, prefixes: string[] }>}
 */
export function parseRangesConf(text) {
  /** @type {Map<string, { operator: string, prefixes: string[] }>} */
  const sections = new Map();
  let current = null;
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim();
    const header = SECTION_PATTERN.exec(line);
    if (header !== null) {
      current = { operator: header[2], prefixes: [] };
      sections.set(header[1], current);
      continue;
    }
    const entry = LINE_PATTERN.exec(line);
    if (entry !== null && current !== null && entry[2] === current.operator) {
      current.prefixes.push(entry[1]);
    }
  }
  return sections;
}

/**
 * @typedef {object} SectionResult
 * @property {string} id
 * @property {string} operator
 * @property {string} url
 * @property {'ok' | 'stale' | 'missing'} status
 * @property {string[]} prefixes     canonical CIDR strings
 * @property {string} note           why a section is stale or missing; upstream stamp when ok
 */

/**
 * Decides what each source contributes: its fresh copy when it is sound, otherwise the previous
 * copy (stale) so one broken download never removes a crawler's ranges, and never makes that
 * operator's real traffic look fake.
 * @param {object} input
 * @param {readonly { id: string, operator: string, url: string }[]} input.sources
 * @param {Map<string, { ok: true, prefixes: string[], note: string } | { ok: false, reason: string }>} input.fetched
 * @param {Map<string, { operator: string, prefixes: string[] }>} input.previous
 * @param {number} input.maxShrink  0.5 = a source may lose at most half of its previous prefixes
 * @param {boolean} [input.forceShrink]
 * @returns {SectionResult[]}
 */
export function resolveSections({ sources, fetched, previous, maxShrink, forceShrink = false }) {
  return sources.map((source) => {
    const fresh = fetched.get(source.id);
    const old = previous.get(source.id);
    const base = { id: source.id, operator: source.operator, url: source.url };
    if (fresh !== undefined && fresh.ok) {
      const oldCount = old?.prefixes.length ?? 0;
      const shrunk = oldCount > 0 && fresh.prefixes.length < oldCount * (1 - maxShrink);
      if (fresh.prefixes.length === 0) {
        return carry(base, old, 'the file contains no prefixes');
      }
      if (shrunk && !forceShrink) {
        return carry(base, old, `shrank from ${oldCount} to ${fresh.prefixes.length} prefixes`);
      }
      return { ...base, status: 'ok', prefixes: fresh.prefixes, note: fresh.note };
    }
    return carry(base, old, fresh === undefined ? 'not fetched' : fresh.reason);
  });
}

/** @param {{ id: string, operator: string, url: string }} base */
function carry(base, old, reason) {
  if (old === undefined || old.prefixes.length === 0) {
    return { ...base, status: 'missing', prefixes: [], note: reason };
  }
  return {
    ...base,
    status: 'stale',
    prefixes: [...old.prefixes],
    note: `kept the previous copy: ${reason}`,
  };
}

/**
 * Flattens the sections into the geo lines, dropping a duplicate network and keeping the first
 * operator that claimed it (a conflict is reported, never written twice).
 * @param {SectionResult[]} sections
 */
export function assemble(sections) {
  /** @type {Map<string, string>} */
  const owner = new Map();
  /** @type {string[]} */
  const conflicts = [];
  const rendered = sections.map((section) => {
    const lines = [];
    for (const cidr of section.prefixes) {
      const existing = owner.get(cidr);
      if (existing === undefined) {
        owner.set(cidr, section.operator);
        lines.push(`${cidr} ${section.operator};`);
      } else if (existing !== section.operator) {
        conflicts.push(
          `${cidr} is published by both ${existing} and ${section.operator}; kept ${existing}`,
        );
      }
    }
    return { section, lines };
  });
  return { rendered, conflicts, total: owner.size };
}

/**
 * @param {object} input
 * @param {SectionResult[]} input.sections
 * @param {string} input.generatedAt  ISO timestamp
 */
export function renderRangesConf({ sections, generatedAt }) {
  const { rendered, conflicts, total } = assemble(sections);
  const perOperator = new Map();
  let ipv4 = 0;
  let ipv6 = 0;
  for (const { section, lines } of rendered) {
    perOperator.set(section.operator, (perOperator.get(section.operator) ?? 0) + lines.length);
    for (const line of lines) {
      if (line.includes(':')) ipv6 += 1;
      else ipv4 += 1;
    }
  }
  const header = [
    '# GENERATED FILE - do not edit by hand.',
    '# Generator:  tools/crawlers/update-verified-crawler-ranges.mjs  (ADR-232)',
    `# Generated:  ${generatedAt}`,
    `# Prefixes:   ${total} (ipv4 ${ipv4}, ipv6 ${ipv6}) from ${sections.length} sources`,
    `# Operators:  ${[...perOperator.entries()].map(([name, count]) => `${name} ${count}`).join(', ')}`,
    '# Use:        infra/nginx/nginx.conf includes this INSIDE',
    '#             geo $remote_addr $claw_crawler_ip_owner { default ""; include <this file>; }',
    '#             A request from an address listed here is PROOF of that operator. The User-Agent is never proof.',
    '# Line:       <cidr> <operator>;   (one section per published file; the geo value is the operator)',
    '# Sources:',
    ...sections.map(
      (section) =>
        `#   ${section.status.padEnd(7)} ${section.id}  ${section.prefixes.length} prefixes  ${section.url}  ${section.note}`,
    ),
    ...conflicts.map((conflict) => `# conflict: ${conflict}`),
    '',
  ];
  const body = rendered.flatMap(({ section, lines }) => [
    `# @section ${section.id} ${section.operator}`,
    ...lines,
    '',
  ]);
  return { text: [...header, ...body].join('\n'), total, conflicts };
}

/**
 * The signature of a rendered file: every entry line and section marker, no comments. Two files with
 * the same signature are the same ranges, whatever their header says.
 * @param {string} text
 */
export function entriesSignature(text) {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => LINE_PATTERN.test(line) || SECTION_PATTERN.test(line))
    .join('\n');
}

/** @param {string} text */
export function countEntries(text) {
  return text.split(/\r?\n/u).filter((line) => LINE_PATTERN.test(line.trim())).length;
}

/**
 * The whole-file guard. A file that is empty, or that lost more than `maxShrink` of the previous
 * entries, is refused and the old file stays.
 * @param {{ newTotal: number, oldTotal: number, maxShrink: number, forceShrink?: boolean }} input
 * @returns {string | null} the reason it is refused, or null
 */
export function wholeFileGuard({ newTotal, oldTotal, maxShrink, forceShrink = false }) {
  if (newTotal === 0) return 'the new file would be empty';
  if (!forceShrink && oldTotal > 0 && newTotal < oldTotal * (1 - maxShrink)) {
    return `the new file has ${newTotal} entries, the old one ${oldTotal} (more than ${Math.round(maxShrink * 100)}% fewer)`;
  }
  return null;
}
