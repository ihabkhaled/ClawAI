import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const workflow = readFileSync(repoPath('.github/workflows/release.yml'), 'utf8');

test('release triggers on successful CI workflow_run completion', () => {
  assert.match(workflow, /on:\s*\n\s*workflow_run:\s*\n\s*workflows:\s*\['CI'\]/u);
  assert.match(workflow, /types:\s*\[completed\]/u);
});

test('release gates on success, push event, and main branch — not PRs, not develop', () => {
  const condition = workflow.split('if: >')[1]?.split('steps:')[0] ?? '';
  assert.match(condition, /workflow_run\.conclusion == 'success'/u);
  assert.match(condition, /workflow_run\.event == 'push'/u);
  assert.match(condition, /workflow_run\.head_branch == 'main'/u);
});

test('release declares contents: write, required to push the bump commit and tag', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*write/u);
});

test('release uses its own concurrency group, independent of deploy-production', () => {
  assert.match(workflow, /concurrency:\s*\n\s*group:\s*clawai-release/u);
  assert.doesNotMatch(workflow, /group:\s*clawai-production/u);
  assert.match(workflow, /cancel-in-progress:\s*false/u);
});

test('release commit and GitHub release use the deployment release label', () => {
  assert.match(workflow, /git commit --quiet -m "chore\(release\): Deployment Release v\$NEXT"/u);
  assert.match(
    workflow,
    /--title "chore\(release\): Deployment Release v\$\{\{ steps\.release\.outputs\.next \}\}"/u,
  );
});

test('release relies on the built-in token and workflow_run gates for loop prevention, not skip directives', () => {
  const checkout =
    workflow.split('- uses: actions/checkout@v7')[1]?.split('- uses: actions/setup-node@v7')[0] ??
    '';
  assert.doesNotMatch(checkout, /token:/u);
  assert.doesNotMatch(checkout, /persist-credentials:\s*false/u);
  assert.doesNotMatch(workflow, /\[skip ci\]/iu);
});

test('release never force-pushes to main', () => {
  assert.doesNotMatch(workflow, /push[^\n]*--force/u);
  assert.doesNotMatch(workflow, /push[^\n]*-f\b/u);
});

test('release uses the invoking commit as its basis, not an unpinned main checkout', () => {
  assert.match(workflow, /ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/u);
});

test('release calls the version and notes tooling with a repository argument for changelog links', () => {
  assert.match(workflow, /node tools\/release\/version\.mjs --from "\$PREV_TAG" --to HEAD/u);
  assert.match(workflow, /node tools\/release\/notes\.mjs/u);
  assert.match(workflow, /--repository "\$REPOSITORY"/u);
});

test('release refuses to commit an empty version bump', () => {
  assert.match(workflow, /if \[ -z "\$CHANGED" \]/u);
});

test('release publishes only after the push step reports success', () => {
  const publish = workflow.split('Publish GitHub release')[1] ?? '';
  assert.match(publish.split('run:')[0], /if:\s*steps\.release\.outputs\.released == 'true'/u);
});

test('release deploys only the newly created release SHA through the reusable SSH workflow', () => {
  assert.match(workflow, /target_sha=\$\(git rev-parse HEAD\)/u);
  assert.match(workflow, /deploy:\s*\n\s*needs:\s*release/u);
  assert.match(workflow, /needs\.release\.outputs\.released == 'true'/u);
  assert.match(workflow, /uses:\s*\.\/\.github\/workflows\/deploy-production\.yml/u);
  assert.match(workflow, /target_sha:\s*\$\{\{\s*needs\.release\.outputs\.target_sha\s*\}\}/u);
  assert.match(workflow, /secrets:\s*inherit/u);
});
