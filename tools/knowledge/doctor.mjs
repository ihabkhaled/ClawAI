#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';

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
      'search policy',
      existsSync(repoPath('.aiignore')),
      existsSync(repoPath('.aiignore')) ? '.aiignore present' : 'create .aiignore',
    ),
    check(
      'local cache',
      existsSync(repoPath('.ai/local/cache')),
      existsSync(repoPath('.ai/local/cache')) ? 'available' : 'created on first context run',
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
