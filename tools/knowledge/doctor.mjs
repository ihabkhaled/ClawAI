#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

import { computeGeneratedFiles } from './build.mjs';
import { repoPath, isMain } from '../lib/repo.mjs';

function check(name, ok, message) {
  return { name, status: ok ? 'PASS' : 'WARN', message };
}

export function inspectRepository() {
  const expected = computeGeneratedFiles();
  const stale = Object.entries(expected).filter(([file, content]) => {
    try {
      return readFileSync(repoPath(file), 'utf8').replaceAll('\r\n', '\n') !== content;
    } catch {
      return true;
    }
  });
  const bootstrapSize = existsSync(repoPath('.ai/BOOTSTRAP.md'))
    ? statSync(repoPath('.ai/BOOTSTRAP.md')).size
    : 0;
  const contextSize = existsSync(repoPath('.ai/local/current-context.md'))
    ? statSync(repoPath('.ai/local/current-context.md')).size
    : 0;
  const ignoreFile = repoPath('.aiignore');
  const ignoreText = existsSync(ignoreFile) ? readFileSync(ignoreFile, 'utf8') : '';
  const requiredExclusions = ['node_modules/', 'dist/', '.next/', 'coverage/', '.ai/local/'];
  const missingExclusions = requiredExclusions.filter((entry) => !ignoreText.includes(entry));
  const missingGeneratedReferences = Object.keys(expected).filter(
    (file) => !existsSync(repoPath(file)),
  );
  const cacheDirectory = repoPath('.ai/local/cache/context');
  let invalidCacheFiles = 0;
  if (existsSync(cacheDirectory)) {
    for (const file of readdirSync(cacheDirectory).filter((entry) => entry.endsWith('.json'))) {
      try {
        JSON.parse(readFileSync(repoPath('.ai/local/cache/context', file), 'utf8'));
      } catch {
        invalidCacheFiles += 1;
      }
    }
  }
  const checks = [
    check(
      'generated knowledge',
      stale.length === 0,
      stale.length ? `${stale.length} stale files; run npm run knowledge:build` : 'current',
    ),
    check(
      'bootstrap budget',
      bootstrapSize > 0 && bootstrapSize < 7200,
      `${bootstrapSize} bytes; limit 7200`,
    ),
    check(
      'context budget',
      contextSize === 0 || contextSize < 80000,
      `${contextSize} bytes; limit 80000`,
    ),
    check(
      'search exclusions',
      missingExclusions.length === 0,
      missingExclusions.length === 0
        ? `${requiredExclusions.length} mandatory exclusions enforced`
        : `add missing .aiignore entries: ${missingExclusions.join(', ')}`,
    ),
    check(
      'cache health',
      existsSync(repoPath('.ai/local/cache')) && invalidCacheFiles === 0,
      invalidCacheFiles === 0
        ? 'available; cached contexts parse successfully'
        : `${invalidCacheFiles} invalid cache files; remove .ai/local/cache`,
    ),
    check(
      'generated references',
      missingGeneratedReferences.length === 0,
      missingGeneratedReferences.length === 0
        ? `${Object.keys(expected).length} generated targets resolve`
        : `${missingGeneratedReferences.length} generated targets missing; run npm run knowledge:build`,
    ),
  ];
  const status = checks.some((item) => item.status === 'WARN') ? 'WARN' : 'PASS';
  return { status, checks };
}

function main() {
  const report = inspectRepository();
  console.log(report.status);
  for (const item of report.checks) console.log(`${item.status} ${item.name}: ${item.message}`);
  if (report.status === 'FAIL') process.exitCode = 1;
}

if (isMain(import.meta.url)) main();
