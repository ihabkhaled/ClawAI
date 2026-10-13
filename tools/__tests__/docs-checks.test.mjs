import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  applyCountFragments,
  countValues,
  unknownFragmentKeys,
} from '../knowledge/count-fragments.mjs';
import {
  countProblems,
  duplicateSections,
  DUPLICATE_WINDOW,
  referenceProblems,
  scanMarkdown,
} from '../knowledge/docs-checks.mjs';
import { impactAreas, impactProblems, parseDocsTrailers } from '../knowledge/docs-impact.mjs';
import { isHistorical } from '../knowledge/docs-policy.mjs';
import { MODEL_ROUTERS, renderModelRouters } from '../knowledge/render-model-routers.mjs';
import {
  absolutiseLinks,
  readMirrors,
  renderManifestPages,
  REPO_BLOB,
} from '../knowledge/render-wiki.mjs';
import { buildManifests } from '../lib/manifests.mjs';
import { repoPath } from '../lib/repo.mjs';

// rules/63. Each check below is what keeps a doc from silently drifting away
// from the code it describes.

test('a dead link, a missing path, an unknown script and an uninstalled npx command are all caught', () => {
  const doc = [
    '[gone](rules/99-does-not-exist.md) and [ok](rules/23-git-commits-hooks-and-release-gates.md)',
    '`tools/affected/nope.mjs` and `tools/affected/index.mjs` and `rules/60`',
    '`npm run no-such-script` but `npm run affected:list` and `npm run affected:*`',
    '`npx tsgo --noEmit` but `npx eslint src/`',
    '`apps/claw-<service>/src` is a pattern, `git checkout -b docs/new-branch` a branch',
  ].join('\n');
  const problems = referenceProblems('AGENTS.md', doc).map((p) => `${p.line} ${p.problem}`);
  assert.deepEqual(problems, [
    '1 broken link → rules/99-does-not-exist.md',
    '2 missing path tools/affected/nope.mjs',
    '3 unknown npm script "no-such-script"',
    '4 npx command "tsgo" is not installed (not in package-lock.json)',
  ]);
});

test('links with Next.js route groups and repository blob URLs resolve', () => {
  const doc = `[page](${REPO_BLOB}apps/claw-frontend/src/app/(auth)/login/page.tsx) [missing](${REPO_BLOB}apps/claw-frontend/src/app/(auth)/nope/page.tsx)`;
  assert.deepEqual(
    referenceProblems('wiki/Home.md', doc).map((p) => p.problem),
    [`broken link → ${REPO_BLOB}apps/claw-frontend/src/app/(auth)/nope/page.tsx`],
  );
});

test('the generated husky hooks directory is not a missing path', () => {
  const doc = 'Hooks live in `.husky/_` after `npx husky`; `.husky/not-a-file.sh` is a real typo.\n';
  const problems = referenceProblems('AGENTS.md', doc).map((p) => p.problem);
  assert.deepEqual(problems, ['missing path .husky/not-a-file.sh']);
});

test('a fenced block marked as an example is not checked', () => {
  // Prettier puts a blank line after an HTML comment; the marker still applies.
  const doc = [
    '<!-- docs:example -->',
    '',
    '```bash',
    'npx tsgo --noEmit',
    '```',
    '```bash',
    'npx tsgo',
    '```',
  ].join('\n');
  const { code } = scanMarkdown(doc);
  assert.deepEqual(
    code.map((c) => c.line),
    [7],
  );
});

test('hand-written totals fail; generated count fragments pass', () => {
  assert.equal(countProblems('ClawAI has 20 NestJS services and ~792 spec files.').length, 2);
  assert.equal(
    countProblems('ClawAI has <!-- count:services -->20<!-- /count --> NestJS services.').length,
    0,
  );
  assert.equal(countProblems('Two services share it.').length, 0, 'words are not totals');
});

test('count fragments are rewritten from the manifests and unknown keys are reported', () => {
  const values = countValues(buildManifests());
  assert.ok(values.services >= 1 && values.workspaces > values.services);
  const text = 'a <!-- count:services -->1<!-- /count --> b <!-- count:nope -->3<!-- /count -->';
  assert.equal(
    applyCountFragments(text, values),
    `a <!-- count:services -->${values.services}<!-- /count --> b <!-- count:nope -->3<!-- /count -->`,
  );
  assert.deepEqual(unknownFragmentKeys(text, values), ['nope']);
});

test('a section copied between two docs is found, a short shared phrase is not', () => {
  const block = Array.from(
    { length: DUPLICATE_WINDOW + 2 },
    (_, i) => `line number ${i} of the copied block`,
  ).join('\n');
  const found = duplicateSections([
    { rel: 'a.md', text: `intro\n${block}` },
    { rel: 'b.md', text: `other intro\n${block}\noutro` },
    { rel: 'c.md', text: 'line number 0 of the copied block\nsomething else' },
  ]);
  assert.equal(found.length, 1);
  assert.equal(found[0].a, 'a.md');
  assert.equal(found[0].b, 'b.md');
  assert.equal(found[0].lines, DUPLICATE_WINDOW + 2);
});

test('dated records are historical; living docs are not', () => {
  assert.equal(isHistorical('docs/qa-evidence/2026-10-13-x.md'), true);
  assert.equal(isHistorical('docs/13-adr/adr-170-agents-md-is-the-canonical-router.md'), true);
  assert.equal(isHistorical('docs/16-quality-engineering/mobile-regression-2026-08-20.md'), true);
  assert.equal(isHistorical('rules/63-docs-move-with-code.md'), false);
  assert.equal(isHistorical('docs/08-runtime-devops/ci-cd-pipeline.md'), false);
});

test('the Docs trailer: updated, reasoned none, bare none and missing', () => {
  assert.deepEqual(parseDocsTrailers('feat: x\n\nDocs: updated rules/23\n'), [
    { kind: 'updated', detail: 'rules/23' },
  ]);
  assert.deepEqual(
    parseDocsTrailers('feat: x\n\nDocs: none — internal refactor, no doc names it'),
    [{ kind: 'none', reason: 'internal refactor, no doc names it' }],
  );
  assert.match(
    impactProblems('fix: x\n\nDocs: none', ['README.md']).join(),
    /needs a specific reason/u,
  );
  assert.match(impactProblems('fix: x\n\nDocs: none — n/a', ['README.md']).join(), /too vague/u);
  assert.match(impactProblems('fix: x', []).join(), /no `Docs:` trailer/u);
  assert.match(
    impactProblems('fix: x\n\nDocs: updated stuff', ['.ai/BOOTSTRAP.md']).join(),
    /changes no hand-written/u,
  );
  assert.deepEqual(impactProblems('Merge branch main', []), []);
  assert.deepEqual(
    parseDocsTrailers('docs: tidy the guide\n\nDocs: updated README.md'),
    [{ kind: 'updated', detail: 'README.md' }],
    'a docs: subject is not a trailer',
  );
});

test('a mapped code change without its docs fails unless a reasoned none covers it', () => {
  const areas = impactAreas();
  const hook = ['.husky/pre-push'];
  assert.match(
    impactProblems('ci: x\n\nDocs: updated README.md', [...hook, 'README.md'], areas).join(),
    /git hooks and the gate runner/u,
  );
  assert.deepEqual(
    impactProblems(
      'ci: x\n\nDocs: updated rules/23',
      [...hook, 'rules/23-git-commits-hooks-and-release-gates.md'],
      areas,
    ),
    [],
  );
  assert.deepEqual(
    impactProblems('ci: x\n\nDocs: none — the hook comment typo has no doc', hook, areas),
    [],
  );
  const service = ['apps/claw-chat-service/src/modules/a.ts'];
  assert.match(
    impactProblems('fix: x\n\nDocs: updated README.md', [...service, 'README.md'], areas).join(),
    /claw-chat-service source/u,
  );
  assert.deepEqual(
    impactProblems(
      'fix: x\n\nDocs: updated guide',
      [...service, 'docs/04-backend/service-guide-chat.md'],
      areas,
    ),
    [],
  );
  assert.deepEqual(
    impactProblems(
      'test: x\n\nDocs: none — tests only, behaviour unchanged',
      ['apps/claw-chat-service/src/a/__tests__/a.spec.ts'],
      areas,
    ),
    [],
  );
});

test('the per-model routers are AGENTS.md plus their emphasis, and say they are generated', () => {
  const agents = readFileSync(repoPath('AGENTS.md'), 'utf8').replace(/\r\n/gu, '\n');
  const body = agents.replace(/^# .*\n+/u, '').trimEnd();
  const routers = renderModelRouters();
  assert.deepEqual(Object.keys(routers).sort(), Object.keys(MODEL_ROUTERS).sort());
  for (const [file, content] of Object.entries(routers)) {
    assert.match(content, /^<!-- GENERATED by tools\/knowledge\/build\.mjs/u, file);
    assert.ok(content.includes(body), `${file} carries the whole router`);
    assert.match(
      content,
      /update every doc it makes stale \(rule 63\)/u,
      `${file} carries the rule-63 line`,
    );
  }
});

test('AGENTS.md stays a router and CLAUDE.md stays small', () => {
  assert.ok(Buffer.byteLength(readFileSync(repoPath('AGENTS.md'))) <= 6 * 1024, 'AGENTS.md ≤ 6 kB');
  assert.ok(
    Buffer.byteLength(readFileSync(repoPath('CLAUDE.md'))) < 15 * 1024,
    'CLAUDE.md < 15 kB',
  );
});

test('wiki mirrors point at real files and render with absolute links', () => {
  for (const [page, source] of Object.entries(readMirrors())) {
    assert.ok(page.endsWith('.md'), page);
    assert.doesNotThrow(
      () => readFileSync(repoPath(source)),
      `${page} mirrors a missing file ${source}`,
    );
  }
  assert.equal(
    absolutiseLinks('[r](../rules/23-x.md#a) [w](https://x.dev) [h](#top)', 'docs/README.md'),
    `[r](${REPO_BLOB}rules/23-x.md#a) [w](https://x.dev) [h](#top)`,
  );
  const pages = renderManifestPages();
  assert.ok(pages['Service-claw-chat-service.md'].includes('## HTTP API'));
  assert.ok(pages['Frontend-Routes.md'].includes('| `/login` |'));
});
