#!/usr/bin/env node
// Docs checks (rules/63): every reference in a living doc resolves, no
// hand-written repository counts, no section copied between docs.
//
//   node tools/knowledge/docs-checks.mjs [refs|counts|duplication|all] [--files=a.md,b.md]
//
// knowledge:verify runs all three over every living doc (pre-commit, pre-push,
// CI). `--files` narrows to the given docs (a quick local run).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';

import { gitLines } from '../lib/git.mjs';
import { isMain, listFiles, readJson, readText, repoPath } from '../lib/repo.mjs';
import { EXAMPLE_MARKER, GENERATED_MARKER, isHistorical } from './docs-policy.mjs';

const REPO_URL = 'https://github.com/ihabkhaled/ClawAI/blob/main/';

// ── Inventory ───────────────────────────────────────────────────────────────

/** Tracked markdown, classified. */
export function listDocs() {
  return gitLines(['ls-files', '--', '*.md'])
    .filter((rel) => existsSync(repoPath(rel)))
    .map((rel) => ({ rel, kind: classify(rel) }));
}

function classify(rel) {
  if (rel.startsWith('.ai/') || (rel.endsWith('/AGENTS.md') && rel !== 'AGENTS.md')) return 'generated';
  const first = (readText(repoPath(rel)) ?? '').split('\n', 1)[0];
  if (GENERATED_MARKER.test(first)) return 'generated';
  return isHistorical(rel) ? 'historical' : 'living';
}

// ── Markdown scanning ───────────────────────────────────────────────────────

/** The nearest non-blank line above `index` (Prettier puts a blank line after an HTML comment). */
function previousContentLine(lines, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (lines[i].trim() !== '') return lines[i].trim();
  }
  return '';
}

/**
 * Split markdown into the pieces the checks look at, with 1-based line numbers:
 * links, inline code spans, fenced code lines and prose lines. A fenced block
 * preceded by the example marker is skipped entirely.
 */
export function scanMarkdown(text) {
  const out = { links: [], code: [], prose: [] };
  const lines = text.split(/\r?\n/u);
  let fence = null;
  let skipFence = false;
  for (const [index, line] of lines.entries()) {
    const lineNo = index + 1;
    const fenceMatch = /^\s*(```|~~~)/u.exec(line);
    if (fenceMatch) {
      if (fence === null) {
        fence = fenceMatch[1];
        skipFence = previousContentLine(lines, index) === EXAMPLE_MARKER;
      } else if (fenceMatch[1] === fence) {
        fence = null;
        skipFence = false;
      }
      continue;
    }
    if (fence !== null) {
      if (!skipFence) out.code.push({ text: line, line: lineNo, fenced: true });
      continue;
    }
    // One level of balanced parentheses inside the target: Next.js route
    // groups put `(auth)` and `(portal)` in real paths.
    for (const match of line.matchAll(/!?\[[^\]]*\]\(\s*<?((?:[^()\s>]|\([^()\s]*\))+)>?(?:\s+"[^"]*")?\s*\)/gu)) {
      out.links.push({ target: match[1], line: lineNo });
    }
    for (const match of line.matchAll(/`([^`]+)`/gu)) out.code.push({ text: match[1], line: lineNo, fenced: false });
    out.prose.push({ text: line.replace(/`[^`]*`/gu, ' '), line: lineNo });
  }
  return out;
}

// ── References ──────────────────────────────────────────────────────────────

const PATH_ROOTS =
  'apps|packages|tools|rules|skills|context|docs|scripts|infra|docker|eslint|testing|agents|wiki|\\.github|\\.husky|\\.ai';
const PATH_TOKEN = new RegExp(`(?:^|[\\s'"(=])((?:${PATH_ROOTS})/[A-Za-z0-9@._()/-]+)`, 'gu');
// A token followed by a placeholder or glob character (`apps/claw-<svc>`,
// `rules/*`, `npm run affected:*`) is a pattern, not a name, and is not checked.
const PATTERN_CONTINUATION = /^:?[<>{}*$…[]/u;

/** Matches of `pattern` (group 1) that are not cut short by a placeholder. */
function concreteMatches(text, pattern) {
  return [...text.matchAll(pattern)]
    .filter((match) => !PATTERN_CONTINUATION.test(text.slice(match.index + match[0].length)))
    .map((match) => match[1]);
}
// Not checkable from this repository: build output and local caches are never
// committed, and apps/claw-coding-agent is a submodule — another repository,
// not checked out in CI — whose own docs and CI verify its paths.
const UNCHECKABLE_PATH =
  /(^|\/)(node_modules|dist|coverage|\.next|generated|\.cache|playwright-report|test-results|\.lighthouseci)(\/|$)|^\.ai\/local\/|^apps\/claw-coding-agent\//u;
// A line about the coding-agent repository names that repository's npm scripts.
const SUBMODULE_CONTEXT = /claw-coding-agent|coding[- ]agent|ClawAI-Coding-Agent/iu;
// `git checkout -b docs/x` names a branch, not a path.
const BRANCH_ARGUMENT = /\b(?:checkout|switch)\s+-[bcB]\s+\S+/gu;

function repoRefExists(rel) {
  const clean = rel.replace(/[.,;:)]+$/u, '').replace(/:\d+(?::\d+)?$/u, '').replace(/#.*$/u, '');
  if (clean === '' || UNCHECKABLE_PATH.test(clean)) return true;
  if (existsSync(repoPath(clean))) return true;
  // Shorthand the docs use on purpose: `rules/60` for rules/60-*.md, a skill
  // or doc named without its `.md`.
  if (existsSync(repoPath(`${clean}.md`))) return true;
  const slash = clean.lastIndexOf('/');
  const dir = clean.slice(0, slash);
  const stem = clean.slice(slash + 1);
  return /^\d{2}$/u.test(stem) && listFiles(repoPath(dir)).some((file) => file.startsWith(`${stem}-`));
}

let cachedScripts = null;
/** Script names from every tracked package.json (workspaces, agent-cli, tools). */
function knownScripts() {
  if (cachedScripts) return cachedScripts;
  const names = new Set();
  for (const rel of gitLines(['ls-files', '--', 'package.json', '*/package.json'])) {
    for (const name of Object.keys(readJson(repoPath(rel))?.scripts ?? {})) names.add(name);
  }
  cachedScripts = names;
  return names;
}

let cachedBins = null;
/** Every command `npx` can resolve from the lockfile: package bins and package names. */
function knownBins() {
  if (cachedBins) return cachedBins;
  const bins = new Set();
  const lock = readJson(repoPath('package-lock.json'));
  for (const [path, entry] of Object.entries(lock?.packages ?? {})) {
    const name = path.split('node_modules/').pop();
    if (name) bins.add(name);
    for (const bin of Object.keys(entry.bin ?? {})) bins.add(bin);
  }
  cachedBins = bins;
  return bins;
}

function linkProblem(target, fromRel) {
  if (/^(mailto:|tel:|#)/u.test(target)) return null;
  let rel;
  if (target.startsWith(REPO_URL)) rel = target.slice(REPO_URL.length);
  else if (/^[a-z][a-z0-9+.-]*:/iu.test(target)) return null;
  else if (target.startsWith('/')) rel = target.slice(1);
  else rel = posix.normalize(posix.join(posix.dirname(fromRel), target));
  rel = decodeURIComponent(rel.split('#')[0].split('?')[0]);
  if (rel === '' || rel.startsWith('../')) return null;
  return repoRefExists(rel) ? null : `broken link → ${target}`;
}

const NPX_COMMAND = /\bnpx\s+(?:(?:-y|--yes|--no|-p\s+\S+|--package(?:=|\s+)\S+)\s+)*([@\w][\w./@-]*)/gu;

function lineText(text, line) {
  return text.split(/\r?\n/u)[line - 1] ?? '';
}

/** Reference problems in one doc: `{ line, problem }`. */
export function referenceProblems(rel, text) {
  const problems = [];
  const { links, code } = scanMarkdown(text);
  for (const { target, line } of links) {
    const problem = linkProblem(target, rel);
    if (problem) problems.push({ line, problem });
  }
  for (const { text: raw, line } of code) {
    const snippet = raw.replace(BRANCH_ARGUMENT, ' ');
    for (const path of concreteMatches(snippet, PATH_TOKEN)) {
      if (/\.\.\./u.test(path)) continue;
      if (!repoRefExists(path)) problems.push({ line, problem: `missing path ${path}` });
    }
    for (const script of concreteMatches(snippet, /\bnpm run ([\w:.-]*\w)/gu)) {
      if (knownScripts().has(script) || SUBMODULE_CONTEXT.test(lineText(text, line))) continue;
      problems.push({ line, problem: `unknown npm script "${script}"` });
    }
    for (const command of concreteMatches(snippet, NPX_COMMAND)) {
      const bin = command.replace(/(?<=.)@[\w.^~-]+$/u, '');
      if (!knownBins().has(bin)) {
        problems.push({ line, problem: `npx command "${bin}" is not installed (not in package-lock.json)` });
      }
    }
  }
  return problems;
}

// ── Counts ──────────────────────────────────────────────────────────────────

/** Hand-written totals that drift. Generated fragments are the only allowed home. */
const COUNT_CLAIMS = [
  /\b~?\d[\d,]*\+?\s+(?:NestJS\s+|backend\s+)?(?:micro)?services\b/giu,
  /\b~?\d[\d,]*\+?\s+(?:npm\s+)?workspaces\b/giu,
  /\b~?\d[\d,]*\+?\s+(?:spec|test)\s+files\b/giu,
  /\b~?\d[\d,]*\+?\s+Prisma\s+clients\b/giu,
  /\b~?\d[\d,]*\+?\s+shared\s+packages\b/giu,
];
const COUNT_FRAGMENT = /<!--\s*count:[\w-]+\s*-->[^<]*<!--\s*\/count\s*-->/gu;

export function countProblems(text) {
  const problems = [];
  for (const { text: prose, line } of scanMarkdown(text).prose) {
    const outsideFragments = prose.replace(COUNT_FRAGMENT, ' ');
    for (const pattern of COUNT_CLAIMS) {
      for (const match of outsideFragments.matchAll(pattern)) {
        problems.push({ line, problem: `hand-written count "${match[0].trim()}" — use a <!-- count:… --> fragment or drop the number` });
      }
    }
  }
  return problems;
}

// ── Duplication ─────────────────────────────────────────────────────────────

export const DUPLICATE_WINDOW = 10;

function contentLines(text) {
  return text
    .split(/\r?\n/u)
    .map((raw, index) => ({ text: raw.trim().replace(/\s+/gu, ' '), line: index + 1 }))
    .filter(({ text: t }) => t.length >= 4 && !/^(```|~~~|\|?\s*:?-{3,}|<!--)/u.test(t));
}

/** Runs of DUPLICATE_WINDOW identical content lines shared by two docs. */
export function duplicateSections(docs) {
  const seen = new Map();
  const pairs = new Map();
  for (const { rel, text } of docs) {
    const lines = contentLines(text);
    for (let i = 0; i + DUPLICATE_WINDOW <= lines.length; i += 1) {
      const window = lines.slice(i, i + DUPLICATE_WINDOW);
      const key = createHash('sha1').update(window.map((l) => l.text).join('\n')).digest('hex');
      const first = seen.get(key);
      if (!first) {
        seen.set(key, { rel, line: window[0].line });
        continue;
      }
      if (first.rel === rel) continue;
      const pairKey = `${first.rel}\0${rel}`;
      if (!pairs.has(pairKey)) pairs.set(pairKey, { a: first.rel, aLine: first.line, b: rel, bLine: window[0].line, windows: 0 });
      pairs.get(pairKey).windows += 1;
    }
  }
  return [...pairs.values()].map((pair) => ({ ...pair, lines: pair.windows + DUPLICATE_WINDOW - 1 }));
}

// ── Runner ──────────────────────────────────────────────────────────────────

export function runDocsChecks({ checks = ['refs', 'counts', 'duplication'], files } = {}) {
  const all = listDocs();
  const living = all.filter((d) => d.kind === 'living');
  const targets = files ? living.filter((d) => files.includes(d.rel)) : living;
  const errors = [];
  for (const { rel } of targets) {
    const text = readFileSync(repoPath(rel), 'utf8');
    if (checks.includes('refs')) {
      for (const { line, problem } of referenceProblems(rel, text)) errors.push(`${rel}:${line} ${problem}`);
    }
    if (checks.includes('counts')) {
      for (const { line, problem } of countProblems(text)) errors.push(`${rel}:${line} ${problem}`);
    }
  }
  if (checks.includes('duplication') && !files) {
    const docs = living.map(({ rel }) => ({ rel, text: readFileSync(repoPath(rel), 'utf8') }));
    for (const dup of duplicateSections(docs)) {
      errors.push(`${dup.b}:${dup.bLine} copies ~${dup.lines} lines of ${dup.a}:${dup.aLine} — link to one home instead`);
    }
  }
  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const which = args.find((a) => !a.startsWith('--')) ?? 'all';
  const files = args.find((a) => a.startsWith('--files='))?.slice(8).split(',').filter(Boolean);
  const checks = which === 'all' ? ['refs', 'counts', 'duplication'] : [which];
  const errors = runDocsChecks({ checks, files });
  if (errors.length > 0) {
    console.error(`docs checks FAILED — ${errors.length} issue(s) (rules/63):`);
    for (const error of errors) console.error(`  ✖ ${error}`);
    process.exit(1);
  }
  console.log(`docs checks OK — ${checks.join(', ')}`);
}

if (isMain(import.meta.url)) main();
