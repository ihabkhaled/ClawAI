// Repository totals in docs are generated, never hand-written (rules/63):
//
//   <!-- count:services -->20<!-- /count -->
//
// `knowledge:build` rewrites the number inside every fragment from the
// manifests; `knowledge:verify` fails when one is stale, and the docs counts
// check fails on a total written outside a fragment.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { gitLines } from '../lib/git.mjs';
import { repoPath } from '../lib/repo.mjs';

const FRAGMENT = /(<!--\s*count:([\w-]+)\s*-->)([^<]*)(<!--\s*\/count\s*-->)/gu;

/** The totals a fragment may name. */
export function countValues(manifests) {
  const services = manifests.services.services;
  return {
    services: services.length,
    workspaces: manifests.workspaces.workspaces.length,
    sharedPackages: manifests.packages.packages.length,
    specFiles: manifests.tests.total,
    prismaClients: Object.keys(manifests['prisma-models'].byService).length,
  };
}

/** `text` with every fragment's number replaced; unknown keys are left as written. */
export function applyCountFragments(text, values) {
  return text.replace(FRAGMENT, (match, open, key, _old, close) =>
    key in values ? `${open}${String(values[key])}${close}` : match,
  );
}

/** Unknown fragment keys in `text`. */
export function unknownFragmentKeys(text, values) {
  return [...text.matchAll(FRAGMENT)].map((m) => m[2]).filter((key) => !(key in values));
}

function docsWithFragments() {
  return gitLines(['grep', '-l', '-F', '<!-- count:', '--', '*.md']).filter((rel) => existsSync(repoPath(rel)));
}

/** Rewrite stale fragments in place. Returns the docs it changed. */
export function writeCountFragments(values) {
  const changed = [];
  for (const rel of listFragmentDocs()) {
    const text = readFileSync(repoPath(rel), 'utf8');
    const next = applyCountFragments(text, values);
    if (next !== text) {
      writeFileSync(repoPath(rel), next);
      changed.push(rel);
    }
  }
  return changed;
}

/** Problems: stale fragments and unknown keys, as readable lines. */
export function countFragmentProblems(values) {
  const problems = [];
  for (const rel of listFragmentDocs()) {
    const text = readFileSync(repoPath(rel), 'utf8');
    for (const key of unknownFragmentKeys(text, values)) {
      problems.push(`${rel}: unknown count fragment "${key}" (known: ${Object.keys(values).join(', ')})`);
    }
    if (applyCountFragments(text, values) !== text) {
      problems.push(`${rel}: stale count fragment (run npm run knowledge:build)`);
    }
  }
  return problems;
}

export function listFragmentDocs() {
  try {
    return docsWithFragments();
  } catch {
    // `git grep -l` exits 1 when nothing matches: no doc has a fragment.
    return [];
  }
}
