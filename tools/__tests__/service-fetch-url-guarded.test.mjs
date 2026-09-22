import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { REPO_ROOT, toRel, walkFiles } from '../lib/repo.mjs';

/**
 * TD-038. Every direct `fetch(` inside a service must sit in a file that also
 * reaches for `assertSafeRequestUrl`.
 *
 * The shared HTTP client was hardened for CodeQL alert #58 (js/request-forgery)
 * and then eight services turned out to carry their own copy of it — each one
 * a `fetch` with no protocol check, no embedded-credential check, no cloud
 * metadata check and no host allowlist. They existed because each needed
 * something the shared client does not do: streaming, a binary read, a non-JSON
 * body parse. Closing them one by one fixes today; this test is what stops a
 * ninth copy appearing tomorrow, because the next person who needs "just one
 * more little fetch" trips a red gate instead of a code review that may or may
 * not notice.
 *
 * The check is deliberately coarse — file-level, not call-level. A file that
 * imports the guard and then forgets it on one branch is not caught here; that
 * is what the per-service unit tests are for. What IS caught is the thing that
 * actually happened: a whole new HTTP utility appearing with no guard anywhere
 * near it.
 */

const APPS = path.join(REPO_ROOT, 'apps');

/**
 * `fetch` in a call position, and nothing else.
 *
 * The lookbehind drops `this.fetch(`, `options.fetch(`, `prefetch(` and
 * `refetch(` — a method named `fetch` on someone else's object is not the
 * global sink. Declarations of a method literally named `fetch` are dropped
 * separately, below, by looking at what precedes it on the line.
 */
const FETCH_CALL = /(?<![\w$.])fetch\s*\(/gu;

/** Only whitespace and member modifiers precede a METHOD DECLARATION named `fetch`. */
const DECLARATION_PREFIX = /^(?:private|public|protected|static|async|readonly|abstract|override|\s)*$/u;

/** The guard that makes a fetch a checked one. */
const GUARD = 'assertSafeRequestUrl';

/**
 * Comments describe fetches as often as code performs them — "the frontend
 * connects via fetch()", "a script chooses, via an <img>, an XHR, a fetch()".
 * Stripping them first keeps prose out of the finding list.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/[^\n]*/gu, '$1');
}

function callsFetchDirectly(source) {
  const code = stripComments(source);
  for (const match of code.matchAll(FETCH_CALL)) {
    const lineStart = code.lastIndexOf('\n', match.index) + 1;
    const prefix = code.slice(lineStart, match.index);
    const lineEnd = code.indexOf('\n', match.index);
    const line = code.slice(lineStart, lineEnd === -1 ? code.length : lineEnd).trimEnd();
    // Modifiers-only prefix means either a method DECLARATION named `fetch`
    // (`private async fetch(provider: string): Promise<…> {`) or a bare call
    // statement on its own line (`fetch(url);`). The terminator tells them
    // apart: a statement ends in a semicolon, a signature does not.
    if (DECLARATION_PREFIX.test(prefix) && !line.endsWith(';')) continue;
    return true;
  }
  return false;
}

/**
 * Files that call `fetch` and are NOT required to reference the guard.
 *
 * Every entry carries its reason. An entry is a promise that the destination is
 * controlled some other way, or that the shared guard is the wrong control for
 * that code — not that nobody got around to it. Where it IS "nobody got around
 * to it", that is written down as such and tracked, so the list cannot quietly
 * become a place to hide.
 */

/**
 * Whole workspaces that are not Nest services.
 *
 * The guard's allowlist is computed from a service PROCESS's environment — the
 * `*_SERVICE_URL`, `*_BASE_URL` variables that name the hosts that deployment
 * may call. A browser bundle has no such environment and must never be given
 * one, and a VS Code extension host talks to a base URL the user typed into
 * their own settings. Applying a server-side egress allowlist there would be
 * theatre: the code runs on the reader's machine, where they may already call
 * anything they like. These are not SSRF sinks, because there is no server
 * whose network position is being borrowed.
 */
const EXEMPT_WORKSPACES = ['apps/claw-frontend/', 'apps/claw-coding-agent/'];

/**
 * Individual files with a DIFFERENT, stronger control of their own.
 */
const EXEMPT_FILES = new Map([
  [
    'apps/claw-research-service/src/modules/fetch/adapters/http-fetch.adapter.ts',
    // The crawler. Its URL is typed by a USER, so a static host allowlist is
    // exactly the wrong shape — it must accept any public host and refuse every
    // private one, which is the opposite question. It calls
    // `assertSafeOutboundUrl` with an operator-managed allowlist for private
    // hosts, and re-checks the destination AFTER redirects, which the shared
    // guard does not do. Swapping that for `assertSafeRequestUrl` would be a
    // downgrade.
    'uses assertSafeOutboundUrl + post-redirect re-check (stronger, user-supplied URLs)',
  ],
]);

/**
 * Files that SHOULD have the guard and do not yet: the remainder of the same
 * defect, outside TD-038's blast radius.
 *
 * TD-038 covered the eight services that had grown their own HTTP client.
 * These are single call sites scattered through three other services, each
 * talking to an operator-configured or OAuth-provider destination. They are
 * real, they are tracked as TD-040 in docs/14-risk-debt/technical-debt.md, and
 * they are listed here one by one rather than behind a directory wildcard so
 * that the list can only ever shrink: a new file in
 * `workspace/adapters/` fails this test.
 *
 * Do not add to this list. Add the guard.
 */
const KNOWN_UNGUARDED = [
  // audit-service — one outbound webhook to an operator-configured URL.
  'apps/claw-audit-service/src/modules/feedback/managers/feedback.manager.ts',
  // auth-service — GitHub Actions dispatch, hardcoded api.github.com.
  'apps/claw-auth-service/src/modules/deployment/adapters/github-actions.adapter.ts',
  // payment-service — PayPal OAuth token. Both PayPal hosts are already in
  // EXTERNAL_ENDPOINT_HOSTS, so this one is a pure wiring gap.
  'apps/claw-payment-service/src/modules/gateways/paypal/managers/paypal-token.manager.ts',
  // research-service — search providers. Each destination is an operator
  // configured `context.baseUrl`, so each needs declaredHost(context.baseUrl).
  'apps/claw-research-service/src/modules/search/adapters/brave.adapter.ts',
  'apps/claw-research-service/src/modules/search/adapters/exa.adapter.ts',
  'apps/claw-research-service/src/modules/search/adapters/firecrawl.adapter.ts',
  'apps/claw-research-service/src/modules/search/adapters/ollama-web.adapter.ts',
  'apps/claw-research-service/src/modules/search/adapters/searxng.adapter.ts',
  'apps/claw-research-service/src/modules/search/adapters/serpapi.adapter.ts',
  'apps/claw-research-service/src/modules/search/adapters/tavily.adapter.ts',
  // workspace-service — internal service calls that simply predate the guard.
  'apps/claw-workspace-service/src/common/utilities/file-service-client.utility.ts',
  'apps/claw-workspace-service/src/modules/ai-actions/managers/model-catalog-resolver.manager.ts',
  'apps/claw-workspace-service/src/modules/ai-actions/services/automation-preference.service.ts',
  'apps/claw-workspace-service/src/modules/ai-actions/utilities/cloud-generation-client.utility.ts',
  'apps/claw-workspace-service/src/modules/ai-actions/utilities/ollama-generation-client.utility.ts',
  'apps/claw-workspace-service/src/modules/inbox/consumers/workspace-object-embed.consumer.ts',
  'apps/claw-workspace-service/src/modules/inbox/services/workspace-semantic-search.service.ts',
  'apps/claw-workspace-service/src/modules/learning/services/preference-upsert.service.ts',
  'apps/claw-workspace-service/src/modules/ticket-planning/managers/impl-handoff.manager.ts',
  // workspace-service — the OAuth provider adapters. These have their own
  // anti-SSRF utility for the baseUrl an operator configures
  // (common/utilities/url-safety.utility.ts) but it is applied at CONFIG time,
  // in provider-app-config.service.ts, not at the call.
  'apps/claw-workspace-service/src/modules/workspace/adapters/bitbucket.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/clickup.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/confluence.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/figma.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/github-write-actions.helper.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/github.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/gitlab-write-actions.helper.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/gitlab.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/gmail-attachment.helper.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/gmail.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/google-calendar.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/google-drive.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/jira.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/onedrive.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/outlook-calendar.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/sharepoint.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/adapters/slack.adapter.ts',
  'apps/claw-workspace-service/src/modules/workspace/utilities/oauth-app-probe.utility.ts',
];

const ALLOWED = new Set([...EXEMPT_FILES.keys(), ...KNOWN_UNGUARDED]);

function serviceSources() {
  return walkFiles(
    APPS,
    (rel) =>
      rel.endsWith('.ts') &&
      !rel.endsWith('.d.ts') &&
      !rel.endsWith('.spec.ts') &&
      rel.includes('/src/') &&
      !EXEMPT_WORKSPACES.some((prefix) => rel.startsWith(prefix)),
  );
}

const sources = serviceSources();

test('there are service sources to scan', () => {
  assert.ok(sources.length > 500, `only found ${sources.length} files — the walk is wrong`);
});

test('every direct fetch() in a service sits beside assertSafeRequestUrl', () => {
  const offenders = [];
  for (const file of sources) {
    const rel = toRel(file);
    const source = fs.readFileSync(file, 'utf8');
    if (!callsFetchDirectly(source)) continue;
    if (source.includes(GUARD)) continue;
    if (ALLOWED.has(rel)) continue;
    offenders.push(rel);
  }
  assert.deepEqual(
    offenders,
    [],
    `These files call fetch() with no URL guard (TD-038). Call ` +
      `assertSafeRequestUrl(url, allowedHosts) from @claw/shared-utilities before the ` +
      `fetch, and pass declaredHost(baseUrl) when the destination is an ` +
      `admin-configured connector:\n  ${offenders.join('\n  ')}`,
  );
});

/**
 * An opt-out that no longer applies is worse than no opt-out: it reads as a
 * standing exemption for code that has since been fixed, and the next person
 * copies it. Both lists are asserted to be live.
 */
test('every opt-out entry still names a file that calls fetch without the guard', () => {
  const stale = [];
  for (const rel of ALLOWED) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) {
      stale.push(`${rel} (file is gone)`);
      continue;
    }
    const source = fs.readFileSync(full, 'utf8');
    if (!callsFetchDirectly(source)) {
      stale.push(`${rel} (no longer calls fetch)`);
    } else if (source.includes(GUARD)) {
      stale.push(`${rel} (now uses the guard — delete this entry)`);
    }
  }
  assert.deepEqual(stale, [], `Stale opt-out entries in ${path.basename(import.meta.filename)}`);
});

/**
 * The eight clients TD-038 was written about, named explicitly. The scan above
 * would catch a regression in any of them, but only as one line in a list;
 * naming them means a regression in the one that carries provider traffic says
 * so out loud.
 */
const TD_038_CLIENTS = [
  'apps/claw-chat-service/src/common/utilities/http-client.utility.ts',
  'apps/claw-connector-service/src/common/utilities/http.utility.ts',
  'apps/claw-file-generation-service/src/common/utilities/http-client.utility.ts',
  'apps/claw-health-service/src/common/utilities/http-client.utility.ts',
  'apps/claw-image-service/src/common/utilities/http-client.utility.ts',
  'apps/claw-memory-service/src/common/utilities/http-client.utility.ts',
  'apps/claw-ollama-service/src/common/utilities/http-client.utility.ts',
  'apps/claw-routing-service/src/common/utilities/http-client.utility.ts',
];

for (const rel of TD_038_CLIENTS) {
  test(`${rel} routes through the shared URL guard`, () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    // Either it calls the guard itself, or it delegates to the shared client
    // that does — both are closed; a copy that does neither is TD-038 again.
    const guarded =
      source.includes(GUARD) || /from '@claw\/shared-utilities'/u.test(source);
    assert.ok(guarded, `${rel} neither guards its URL nor delegates to the shared client`);
  });
}
