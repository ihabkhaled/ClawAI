#!/usr/bin/env node
// docs:impact (rules/63) — a change to a mapped code area must change one of the
// docs that describe it, or say why not in the commit message:
//
//   Docs: updated <what was updated>        (the commit changes at least one doc)
//   Docs: none — <specific reason>          (at least three words; a bare "none" fails)
//
//   node tools/knowledge/docs-impact.mjs --commit-msg <file>   (.husky/commit-msg, staged files)
//   node tools/knowledge/docs-impact.mjs --range <a>..<b>      (CI, every commit in a pull request)
//
// The map from code to docs is built from the workspace list (each workspace's
// own CLAUDE.md, README.md and service guide) plus the static entries below.
import { readFileSync } from 'node:fs';

import { git, gitLines } from '../lib/git.mjs';
import { discoverWorkspaces, isMain } from '../lib/repo.mjs';

const DOC = /\.md$/u;

/** Areas whose docs are not derivable from the workspace list. */
const STATIC_AREAS = [
  {
    name: 'git hooks and the gate runner',
    code: /^(?:\.husky\/|\.lintstagedrc\.cjs$|commitlint\.config\.cjs$|tools\/(?:affected|gates)\/)/u,
    docs: /^(?:rules\/(?:23|34|48)-|AGENTS\.md$|skills\/run-gates-once-and-land\.md$)/u,
  },
  {
    name: 'CI workflows',
    code: /^\.github\/(?:workflows|actions)\//u,
    docs: /^(?:rules\/23-|docs\/08-runtime-devops\/ci-cd-pipeline\.md$)/u,
  },
  {
    name: 'coverage, lint and security ratchets',
    code: /^tools\/(?:coverage|lint|security)\/.+\.mjs$|^\.gitleaks\.toml$|^eslint\.config\.mjs$/u,
    docs: /^(?:rules\/(?:22|23)-|testing\/coverage-policy\.md$|docs\/08-runtime-devops\/ci-cd-pipeline\.md$)/u,
  },
  {
    name: 'the knowledge generators and docs checks',
    code: /^tools\/knowledge\/.+\.mjs$/u,
    docs: /^(?:rules\/(?:24|33|63)-|AGENTS\.md$|context\/generated-file-map\.md$)/u,
  },
  {
    name: 'Prisma schemas',
    code: /^apps\/[^/]+\/prisma\/schema\.prisma$/u,
    docs: /^(?:rules\/52-|docs\/06-data\/|context\/database-ownership-map\.md$|apps\/[^/]+\/CLAUDE\.md$|docs\/04-backend\/service-guide-)/u,
  },
  {
    name: 'environment variables',
    code: /^(?:\.env\.example$|apps\/[^/]+\/src\/app\/config\/app\.config\.ts$)/u,
    docs: /^(?:\.env\.example$|docs\/06-data\/environment-variables\.md$|context\/environment-ownership-map\.md$)/u,
  },
  {
    name: 'root npm scripts',
    code: /^package\.json$/u,
    docs: /^(?:context\/stack-and-toolchain\.md$|docs\/08-runtime-devops\/build-system\.md$|rules\/23-|AGENTS\.md$)/u,
  },
];

function serviceGuide(dir) {
  const base = dir.replace(/^(apps|packages)\//u, '').replace(/^claw-/u, '').replace(/-service$/u, '');
  return base === 'file-generation' ? 'filegen' : base;
}

function escapeRegex(text) {
  return text.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&');
}

/** The full code → docs map: static areas plus one entry per workspace. */
export function impactAreas(workspaces = discoverWorkspaces()) {
  const perWorkspace = workspaces.map((ws) => {
    const dir = escapeRegex(ws.dir);
    const docs = [
      `^${dir}/(?:CLAUDE|README)\\.md$`,
      `^docs/04-backend/service-guide-${escapeRegex(serviceGuide(ws.dir))}(?:-[\\w-]+)?\\.md$`,
      ws.dir === 'apps/claw-frontend' ? '^docs/05-frontend/' : null,
      ws.dir.startsWith('packages/') ? '^context/package-boundaries\\.md$' : null,
      '^docs/features/',
    ].filter(Boolean);
    return {
      name: `${ws.name} source`,
      code: new RegExp(`^${dir}/src/(?!.*(?:__tests__/|\\.(?:spec|test)\\.tsx?$))`, 'u'),
      docs: new RegExp(docs.join('|'), 'u'),
    };
  });
  return [...STATIC_AREAS, ...perWorkspace];
}

/**
 * Every `Docs:` trailer line, parsed. A commit may carry both kinds: `updated`
 * for the docs it changed and `none — <reason>` for an area it touched that no
 * doc describes.
 */
export function parseDocsTrailers(message) {
  // Line 1 is the subject: a `docs:` commit type is not a trailer, hence the
  // case-sensitive match from line 2 on.
  return message
    .split(/\r?\n/u)
    .slice(1)
    .filter((line) => !line.startsWith('#') && /^Docs:/u.test(line.trim()))
    .map((line) => {
      const value = line.trim().slice(5).trim();
      const none = /^none\s*(?:—|–|--|-|:)\s*(.+)$/iu.exec(value);
      if (none) return { kind: 'none', reason: none[1].trim() };
      if (/^none\b/iu.test(value)) return { kind: 'bare-none' };
      const updated = /^updated\s+(.+)$/iu.exec(value);
      if (updated) return { kind: 'updated', detail: updated[1].trim() };
      return { kind: 'invalid', value };
    });
}

/** Generated docs change with the code automatically; they never count as a docs update. */
function isGeneratedDoc(file) {
  return file.startsWith('.ai/') || (file.endsWith('/AGENTS.md') && file !== 'AGENTS.md');
}

function trailerProblems(trailers, docsChanged) {
  if (trailers.length === 0) {
    return ['no `Docs:` trailer — add `Docs: updated <what>` or `Docs: none — <specific reason>`'];
  }
  const problems = [];
  for (const trailer of trailers) {
    if (trailer.kind === 'bare-none') {
      problems.push('`Docs: none` needs a specific reason: `Docs: none — <why no doc describes this change>`');
    } else if (trailer.kind === 'invalid') {
      problems.push(`\`Docs: ${trailer.value}\` is not a valid trailer — use \`updated <what>\` or \`none — <reason>\``);
    } else if (trailer.kind === 'none' && trailer.reason.split(/\s+/u).length < 3) {
      problems.push(`\`Docs: none — ${trailer.reason}\` is too vague; say why no doc describes this change`);
    } else if (trailer.kind === 'updated' && docsChanged.length === 0) {
      problems.push('`Docs: updated …` but the commit changes no hand-written .md file');
    }
  }
  return problems;
}

/** Problems for one commit: its message and the files it changes. */
export function impactProblems(message, files, areas = impactAreas()) {
  if (/^(Merge |Revert ")/u.test(message)) return [];
  const trailers = parseDocsTrailers(message);
  const docsChanged = files.filter((f) => DOC.test(f) && !isGeneratedDoc(f));
  const problems = trailerProblems(trailers, docsChanged);
  // A reasoned `none` covers every area the commit's docs do not.
  if (trailers.some((t) => t.kind === 'none' && t.reason.split(/\s+/u).length >= 3)) return problems;

  for (const area of areas) {
    const touched = files.filter((f) => area.code.test(f));
    if (touched.length === 0) continue;
    if (docsChanged.some((doc) => area.docs.test(doc))) continue;
    problems.push(
      `${area.name} changed (${touched.slice(0, 3).join(', ')}${touched.length > 3 ? ', …' : ''}) but none of its docs ` +
        `did — review docs matching ${area.docs.source}, or add \`Docs: none — <reason>\``,
    );
  }
  return problems;
}

function commitHasChecker(sha) {
  try {
    git(['cat-file', '-e', `${sha}:tools/knowledge/docs-impact.mjs`]);
    return true;
  } catch {
    return false;
  }
}

function report(problems, where) {
  if (problems.length === 0) return true;
  console.error(`docs:impact FAILED${where} (rules/63):`);
  for (const problem of problems) console.error(`  ✖ ${problem}`);
  return false;
}

function main() {
  const args = process.argv.slice(2);
  const msgIndex = args.indexOf('--commit-msg');
  if (msgIndex >= 0) {
    const message = readFileSync(args[msgIndex + 1], 'utf8');
    const files = gitLines(['diff', '--cached', '--name-only']);
    process.exit(report(impactProblems(message, files), '') ? 0 : 1);
  }
  const rangeIndex = args.indexOf('--range');
  if (rangeIndex >= 0) {
    const range = args[rangeIndex + 1];
    let ok = true;
    for (const sha of gitLines(['rev-list', '--no-merges', range])) {
      // Rule 63 binds commits made after it existed; a commit whose own tree
      // has no checker predates the rule and is not judged retroactively.
      if (!commitHasChecker(sha)) continue;
      const message = git(['log', '-1', '--format=%B', sha]);
      const files = gitLines(['diff-tree', '--no-commit-id', '--name-only', '-r', sha]);
      ok = report(impactProblems(message, files), ` for ${sha.slice(0, 10)}`) && ok;
    }
    if (ok) console.log(`docs:impact OK — every commit in ${range} declares its docs impact`);
    process.exit(ok ? 0 : 1);
  }
  console.error('usage: docs-impact.mjs --commit-msg <file> | --range <a>..<b>');
  process.exit(2);
}

if (isMain(import.meta.url)) main();
