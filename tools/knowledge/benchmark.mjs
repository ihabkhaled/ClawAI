#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

import { isMain } from '../lib/repo.mjs';
import { resolveContext } from './context.mjs';

export function benchmarkScenarios() {
  return [
    { kind: 'tiny', task: 'fix a typo in the contributor guide' },
    { kind: 'backend', task: 'fix chat streaming disconnect handling' },
    { kind: 'frontend', task: 'add a frontend settings page filter' },
    { kind: 'api', task: 'add connector status API endpoint' },
    { kind: 'database', task: 'add a Prisma audit metadata column' },
    { kind: 'security', task: 'rotate authentication refresh tokens safely' },
    { kind: 'cross-workspace', task: 'change billing event across payment and auth services' },
  ];
}

export function runBenchmark() {
  return benchmarkScenarios().map((scenario) => {
    const coldStart = performance.now();
    const cold = resolveContext({ task: scenario.task, maxTokens: 6000, refreshCache: true });
    const coldMs = performance.now() - coldStart;
    const warmStart = performance.now();
    const warm = resolveContext({ task: scenario.task, maxTokens: 6000 });
    const warmMs = performance.now() - warmStart;
    return {
      ...scenario,
      coldMs: Number(coldMs.toFixed(2)),
      warmMs: Number(warmMs.toFixed(2)),
      speedup: Number((coldMs / Math.max(warmMs, 0.01)).toFixed(2)),
      estimatedTokens: warm.efficiency.estimatedTokens,
      sourceFiles: warm.likelySourceFiles.length,
      tests: warm.likelyTests.length,
      cache: warm.cache.status,
    };
  });
}

if (isMain(import.meta.url)) console.table(runBenchmark());
