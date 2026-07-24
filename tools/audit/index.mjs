#!/usr/bin/env node
// Repository audit — Slice 1 of the AI-native engineering OS.
//
// Runs every extractor + analyzer and writes a deterministic machine-readable
// baseline. The human narrative (00-current-state-audit.md) is authored on top
// of this JSON so its claims are always traceable to real files.
//
//   node tools/audit/index.mjs            → writes .audit/inventory.json + snapshot
//   node tools/audit/index.mjs --check    → fails if committed snapshot is stale
import { mkdirSync, writeFileSync } from 'node:fs';
import { extractAll } from '../lib/extractors.mjs';
import {
  findContradictions,
  findStaleClaims,
  findDuplication,
  findBypassRecommendations,
  findPortCoverageGaps,
} from '../lib/analyzers.mjs';
import { repoPath, readText, isMain } from '../lib/repo.mjs';
import { stableStringify, hash } from '../lib/fact.mjs';

export function buildInventory() {
  const inv = extractAll();
  const analysis = {
    contradictions: findContradictions(inv),
    portCoverageGaps: findPortCoverageGaps(inv),
    staleClaims: findStaleClaims(inv),
    duplication: findDuplication(),
    bypassRecommendations: findBypassRecommendations(),
  };
  const summary = {
    workspaceCount: inv.workspaces.length,
    serviceCount: inv.workspaces.filter((w) => w.type === 'nestjs-service').length,
    sharedPackageCount: inv.workspaces.filter((w) => w.type === 'shared-package').length,
    portCount: Object.keys(inv.ports).length,
    envVarCount: inv.envVars.length,
    eventCount: inv.events.length,
    permissionCount: inv.permissions.length,
    endpointCount: Object.values(inv.apiEndpoints).reduce((n, e) => n + e.length, 0),
    nginxRouteCount: inv.nginxRoutes.length,
    dockerServiceCount: inv.dockerServices.length,
    frontendRouteCount: inv.frontendRoutes.filter((r) => r.kind === 'page').length,
    localeCount: inv.i18n.localeCount,
    totalTestFiles: Object.values(inv.tests).reduce((n, t) => n + t.testFiles, 0),
    contradictionCount: analysis.contradictions.length,
    portCoverageGapCount: analysis.portCoverageGaps.length,
    staleClaimCount: analysis.staleClaims.length,
    bypassRecommendationCount: analysis.bypassRecommendations.length,
  };
  return { schemaVersion: 1, summary, inventory: inv, analysis };
}

function main() {
  const check = process.argv.includes('--check');
  const data = buildInventory();
  const json = stableStringify(data);
  const snapshotPath = repoPath('docs/features/ai-native-engineering-os/inventory.snapshot.json');

  if (check) {
    const existing = readText(snapshotPath);
    const existingHash = existing ? hash(existing) : 'absent';
    const freshHash = hash(json);
    if (existingHash !== freshHash) {
      console.error('audit:check FAILED — inventory snapshot is stale. Run `npm run audit` and commit the result.');
      console.error(`  snapshot hash: ${existingHash}`);
      console.error(`  current  hash: ${freshHash}`);
      process.exit(1);
    }
    console.log('audit:check OK — inventory snapshot is current.');
    return;
  }

  mkdirSync(repoPath('.audit'), { recursive: true });
  mkdirSync(repoPath('docs/features/ai-native-engineering-os'), { recursive: true });
  writeFileSync(repoPath('.audit/inventory.json'), json);
  writeFileSync(snapshotPath, json);

  const s = data.summary;
  console.log('ClawAI repository audit complete.');
  console.log(
    `  ${s.workspaceCount} workspaces (${s.serviceCount} services, ${s.sharedPackageCount} shared packages)`,
  );
  console.log(
    `  ${s.endpointCount} endpoints · ${s.eventCount} events · ${s.permissionCount} permissions · ${s.portCount} ports`,
  );
  console.log(
    `  ${s.nginxRouteCount} nginx routes · ${s.dockerServiceCount} docker services · ${s.frontendRouteCount} frontend pages · ${s.localeCount} locales`,
  );
  console.log(
    `  ${s.contradictionCount} contradictions · ${s.portCoverageGapCount} port gaps · ${s.staleClaimCount} stale claims · ${s.bypassRecommendationCount} hook-bypass recommendations`,
  );
  console.log('  → .audit/inventory.json + docs/features/ai-native-engineering-os/inventory.snapshot.json');
}

// Only run as a CLI, never as a side effect of `import`.
if (isMain(import.meta.url)) main();
