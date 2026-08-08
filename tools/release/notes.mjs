#!/usr/bin/env node
// Release notes for a ClawAI version, rendered from conventional commits.
//
// Every commit in the range appears exactly once. Commits whose subject is not
// conventional are NOT dropped — they land in "Other changes", because notes
// that quietly omit work are worse than notes with an untidy section.
//
//   node tools/release/notes.mjs --version 1.2.0 --from v1.1.0 --to <sha> \
//     --repository owner/name [--output NOTES.md]
import { writeFileSync } from 'node:fs';

import { isMain } from '../lib/repo.mjs';
import { readCommits, bumpLevelFor } from './version.mjs';

/**
 * Section order is deliberate: what a reader most needs first. `types: null`
 * is the catch-all for subjects that did not parse as conventional commits.
 * The type set mirrors commitlint.config.js's `type-enum` exactly — anything
 * outside it (e.g. a bare "security" prefix) is prose, not a type, and lands
 * in "Other changes" rather than a section that can never otherwise fill.
 */
export const SECTIONS = [
  { title: '🚀 Features', types: ['feat'] },
  { title: '🐛 Bug fixes', types: ['fix'] },
  { title: '⚡ Performance', types: ['perf'] },
  { title: '⏪ Reverts', types: ['revert'] },
  { title: '♻️ Refactoring', types: ['refactor'] },
  { title: '📚 Documentation', types: ['docs'] },
  { title: '✅ Tests', types: ['test'] },
  { title: '🏗️ Build & CI', types: ['build', 'ci'] },
  { title: '🧹 Chores', types: ['chore', 'style'] },
  { title: '📦 Other changes', types: null },
];

const LEVEL_SUMMARY = {
  major: 'major — this release contains breaking changes',
  minor: 'minor — this release adds functionality backwards-compatibly',
  patch: 'patch — fixes and maintenance only',
};

function shortSha(sha) {
  return String(sha).slice(0, 7);
}

function commitLink(commit, repository) {
  const short = shortSha(commit.sha);
  if (!repository || !commit.sha) return short ? `\`${short}\`` : '';
  return `([\`${short}\`](https://github.com/${repository}/commit/${commit.sha}))`;
}

/**
 * One bullet. The scope becomes the bolded lead so a reader can scan by area,
 * which is how these notes actually get read during an incident.
 */
export function renderEntry(commit, repository) {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  const link = commitLink(commit, repository);
  return `- ${scope}${commit.description}${link ? ` ${link}` : ''}`;
}

function sortEntries(commits) {
  return [...commits].sort((a, b) => {
    const scopeA = a.scope ?? '';
    const scopeB = b.scope ?? '';
    if (scopeA !== scopeB) return scopeA < scopeB ? -1 : 1;
    return a.description < b.description ? -1 : a.description > b.description ? 1 : 0;
  });
}

/** Distinct author names, in first-seen order, for the credits line. */
export function contributorsOf(commits) {
  const seen = [];
  for (const commit of commits) {
    const author = (commit.author ?? '').trim();
    if (author && !seen.includes(author)) seen.push(author);
  }
  return seen;
}

export function renderNotes({
  version,
  previousTag = '',
  commits = [],
  repository = '',
  level = bumpLevelFor(commits),
} = {}) {
  const lines = [];
  const breaking = commits.filter((commit) => commit.breaking);
  const contributors = contributorsOf(commits);

  const plural = commits.length === 1 ? 'commit' : 'commits';
  lines.push(
    `**${commits.length} ${plural}** since ${previousTag || 'the beginning of the repository'} · ` +
      `bump: ${LEVEL_SUMMARY[level] ?? level}`,
  );

  if (breaking.length > 0) {
    lines.push('', '## ⚠️ Breaking changes', '');
    for (const commit of sortEntries(breaking)) {
      const scope = commit.scope ? `**${commit.scope}:** ` : '';
      const note = commit.breakingNote ?? commit.description;
      lines.push(`- ${scope}${note} ${commitLink(commit, repository)}`.trimEnd());
    }
  }

  const claimed = new Set();
  for (const section of SECTIONS) {
    const matching = commits.filter((commit) => {
      if (claimed.has(commit)) return false;
      if (section.types === null) return true;
      return section.types.includes(commit.type);
    });
    if (matching.length === 0) continue;
    for (const commit of matching) claimed.add(commit);
    lines.push('', `## ${section.title}`, '');
    for (const commit of sortEntries(matching)) {
      lines.push(renderEntry(commit, repository));
    }
  }

  if (contributors.length > 0) {
    lines.push('', '## 👥 Contributors', '');
    lines.push(contributors.map((name) => `\`${name}\``).join(', '));
  }

  lines.push('', '---', '');
  if (repository && previousTag) {
    lines.push(
      `**Full changelog:** https://github.com/${repository}/compare/${previousTag}...v${version}`,
    );
  }
  lines.push(
    '',
    'Production deployment for this commit runs in parallel in the ' +
      '`deploy-production` workflow — this release being published does not by ' +
      'itself mean the version is live. See `docs/PRODUCTION_DEPLOYMENT.md`.',
  );

  return `${lines.join('\n').trim()}\n`;
}

function argValue(args, name) {
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : undefined;
}

export function run({
  args = process.argv.slice(2),
  write = (text) => process.stdout.write(text),
  writeFile = writeFileSync,
} = {}) {
  const version = argValue(args, '--version') ?? '';
  const from = argValue(args, '--from') ?? '';
  const to = argValue(args, '--to') ?? 'HEAD';
  const repository = argValue(args, '--repository') ?? '';
  const output = argValue(args, '--output');

  const commits = readCommits({ from, to });
  const notes = renderNotes({ version, previousTag: from, commits, repository });

  if (output) writeFile(output, notes);
  else write(notes);
  return notes;
}

if (isMain(import.meta.url)) run();
