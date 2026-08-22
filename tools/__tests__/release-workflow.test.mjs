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
  assert.match(condition, /workflow_run\.head_repository\.full_name == github\.repository/u);
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
    /--title "chore\(release\): Deployment Release v\$RELEASE_VERSION"/u,
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

test('privileged release checks out trusted main before accepting the exact CI commit', () => {
  const checkout =
    workflow.split('- uses: actions/checkout@v7')[1]?.split('- uses: actions/setup-node@v7')[0] ??
    '';
  const releaseScript = workflow.split('id: release')[1]?.split('Publish GitHub release')[0] ?? '';

  assert.match(checkout, /ref:\s*main/u);
  assert.doesNotMatch(checkout, /workflow_run\.head_sha/u);

  const validatesSha = releaseScript.indexOf('[[ ! "$HEAD_SHA" =~ ^[0-9a-f]{40}$ ]]');
  const fetchesMain = releaseScript.indexOf('git fetch --quiet origin main');
  const verifiesCommit = releaseScript.indexOf('git cat-file -e "${HEAD_SHA}^{commit}"');
  const verifiesMainAncestry = releaseScript.indexOf(
    'git merge-base --is-ancestor "$HEAD_SHA" origin/main',
  );
  const checksOutTarget = releaseScript.indexOf('git checkout --quiet --detach "$HEAD_SHA"');

  assert.ok(validatesSha >= 0, 'release must validate the event SHA format');
  assert.ok(fetchesMain > validatesSha, 'release must fetch trusted main after validating the SHA');
  assert.ok(verifiesCommit > fetchesMain, 'release must verify that the event SHA names a commit');
  assert.ok(
    verifiesMainAncestry > verifiesCommit,
    'release must verify that the event SHA belongs to main',
  );
  assert.ok(
    checksOutTarget > verifiesMainAncestry,
    'release must establish trust before checking out the event SHA',
  );
});

test('release passes the generated version to the shell through env and validates it', () => {
  const publish = workflow.split('Publish GitHub release')[1] ?? '';
  const [metadata = '', run = ''] = publish.split('run: |');

  assert.match(metadata, /RELEASE_VERSION:\s*\$\{\{\s*steps\.release\.outputs\.next\s*\}\}/u);
  assert.doesNotMatch(run, /\$\{\{\s*steps\.release\.outputs\.next\s*\}\}/u);
  assert.match(run, /\[\[ ! "\$RELEASE_VERSION" =~ \^\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$ \]\]/u);
  assert.match(run, /gh release create "v\$RELEASE_VERSION"/u);
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

test('release hands the deployment to the automatic lane so a paused switch is honoured', () => {
  assert.match(workflow, /uses: \.\/\.github\/workflows\/deploy-production\.yml[\s\S]*?trigger_source: auto/u);
});
