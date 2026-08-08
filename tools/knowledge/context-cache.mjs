import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { repoPath } from '../lib/repo.mjs';
import { stableStringify } from '../lib/fact.mjs';

const CACHE_VERSION = 1;

export function contextCacheKey(input) {
  return createHash('sha256')
    .update(stableStringify({ version: CACHE_VERSION, input }))
    .digest('hex')
    .slice(0, 20);
}

export function readContextCache(key) {
  try {
    return JSON.parse(readFileSync(repoPath('.ai/local/cache/context', `${key}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export function writeContextCache(key, value) {
  const directory = repoPath('.ai/local/cache/context');
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/${key}.json`, stableStringify(value));
}
