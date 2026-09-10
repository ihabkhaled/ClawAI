import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The enforcement for rule 06's freshness tiers.
 *
 * Both halves of this matter, and they fail in opposite directions:
 *
 * - A global `refetchInterval` makes every query in the app poll, including
 *   pure configuration and endpoints that 502 on deployments where an optional
 *   runtime is absent. That is what this file used to have, and it cost ~83
 *   requests per minute on an idle chat page.
 * - Removing it silently freezes any view whose data changes server-side. Those
 *   queries must say so themselves, and the list below is the record of which
 *   ones do. A hook that drops its interval here goes stale with no error,
 *   no failing render and no console warning — the worst kind of regression.
 */
const SRC = resolve(__dirname, '../..');
const PROVIDERS = resolve(SRC, 'app/providers.tsx');

/**
 * Queries whose data changes without the person looking at it doing anything.
 * Every one of these was verified against its endpoint before being listed.
 */
const LIVE_HOOKS = [
  'hooks/workspace/use-workspace-actions.ts',
  'hooks/files/use-files.ts',
  'hooks/agent/use-agent-sessions.ts',
  'hooks/agent/use-devices.ts',
  'hooks/agent/use-device-detail.ts',
  'hooks/agent/use-capability-detail.ts',
  'hooks/agent/use-agent-repos.ts',
  'hooks/agent/use-activity-memory-page.ts',
  'hooks/memory/use-memory-suggestions.ts',
  'hooks/research/use-research-runs.ts',
  'hooks/workspace-chains/use-chain-runs.ts',
  'hooks/routing/use-replay-runs.ts',
  'hooks/workspace/use-workspace-sync-runs.ts',
  'hooks/admin/use-webhook-deliveries.ts',
  'hooks/impl-handoff/use-impl-handoffs-page.ts',
  'hooks/chat/use-file-delivery.ts',
  'hooks/settings/use-email-change.ts',
  'hooks/logs/use-server-logs.ts',
  'hooks/logs/use-server-log-stats.ts',
  'hooks/logs/use-client-logs.ts',
  'hooks/logs/use-client-log-stats.ts',
  'hooks/observability/use-observability-page.ts',
  'hooks/audit/use-audit-logs.ts',
  'hooks/audit/use-audit-stats.ts',
  'hooks/audit/use-usage.ts',
  'hooks/admin/use-runtime-progress-page.ts',
];

describe('query freshness policy (rules/06)', () => {
  it('sets no global refetchInterval', () => {
    const source = readFileSync(PROVIDERS, 'utf8');
    const defaults = source.slice(source.indexOf('queries: {'), source.indexOf('retry: 1'));

    expect(defaults).not.toMatch(/^\s*refetchInterval:/m);
  });

  it('sets a deliberate default staleTime rather than a few seconds', () => {
    // A 5-second staleTime plus refetchOnWindowFocus meant every tab focus
    // refetched everything the app had ever loaded.
    const source = readFileSync(PROVIDERS, 'utf8');

    expect(source).toContain('staleTime: QUERY_STALE_DEFAULT_MS');
  });

  it('gives every live query its own interval, from a named tier', () => {
    // Either `refetchInterval: QUERY_POLL_*` directly, or a function that
    // returns one — the conditional form is preferred wherever the answer can
    // say whether polling is still worth it. `use-files` is the example: it
    // polls only while a file is mid-ingestion, because the response is 4.2 MB.
    const missing: string[] = [];
    for (const hook of LIVE_HOOKS) {
      const source = readFileSync(resolve(SRC, hook), 'utf8');
      if (!source.includes('refetchInterval:') || !source.includes('QUERY_POLL_')) {
        missing.push(hook);
      }
    }

    expect(missing).toEqual([]);
  });

  it('states the interval as a tier constant, never a bare number', () => {
    // A literal is a number nobody can grep for and nobody can change in one
    // place. The tiers carry the reasoning; `refetchInterval: 5000` does not.
    const offenders: string[] = [];
    for (const hook of LIVE_HOOKS) {
      const source = readFileSync(resolve(SRC, hook), 'utf8');
      if (/refetchInterval:\s*\d/.test(source)) {
        offenders.push(hook);
      }
    }

    expect(offenders).toEqual([]);
  });
});
