#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isMain, repoPath } from '../lib/repo.mjs';

function boundedFailure(log, lineLimit) {
  const lines = log.split(/\r?\n/u).filter(Boolean);
  return lines.slice(-lineLimit).join('\n');
}

export function runForAi(command, args = [], options = {}) {
  const logDirectory = options.logDirectory ?? repoPath('.ai/local/logs');
  const failureLines = options.failureLines ?? 20;
  mkdirSync(logDirectory, { recursive: true });
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: process.env,
    shell: false,
  });
  const durationMs = Date.now() - started;
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const safeName = command.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '') || 'command';
  const logFile = join(logDirectory, `${safeName}-${started}.log`);
  writeFileSync(logFile, output);
  const exitCode = result.status ?? 1;
  const summary =
    exitCode === 0
      ? `PASS · ${durationMs}ms · full log: ${logFile}`
      : `FAIL · exit ${exitCode} · ${durationMs}ms\n\n${boundedFailure(output, failureLines)}\n\nFull log: ${logFile}`;
  return { exitCode, durationMs, logFile, summary };
}

function main() {
  const separator = process.argv.indexOf('--');
  const values = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);
  const [command, ...args] = values;
  if (!command) {
    console.error('Usage: npm run ai:check -- <command> [args...]');
    process.exitCode = 2;
    return;
  }
  const result = runForAi(command, args);
  console.log(result.summary);
  process.exitCode = result.exitCode;
}

if (isMain(import.meta.url)) main();
