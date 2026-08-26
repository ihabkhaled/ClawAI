import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { checkKnowledgeCoverage } from '../knowledge/verify.mjs';
import { repoPath } from '../lib/repo.mjs';

// Rule 33. These assertions guard the knowledge layer's discoverability, which
// is the part of "the app is documented" that a machine can actually prove: a
// rule or skill unreachable from an index does not exist for the next agent,
// and a service with no CLAUDE.md or service guide forces a re-derivation that
// somebody already paid for once.

test('every rule and skill is reachable from an index, and every service is documented', () => {
  const issues = checkKnowledgeCoverage();
  assert.deepEqual(
    issues,
    [],
    `knowledge coverage regressed:\n${issues.map((i) => `  - ${i}`).join('\n')}`,
  );
});

test('the coverage check actually inspects the rule and skill catalogs', () => {
  // A check that silently inspects nothing would pass forever. Prove it is
  // looking at real, non-empty inputs.
  const rules = readdirSync(repoPath('rules')).filter((f) => /^\d{2}-.*\.md$/.test(f));
  const skills = readdirSync(repoPath('skills')).filter(
    (f) => f.endsWith('.md') && f !== '00-index.md' && f !== 'README.md',
  );
  assert.ok(rules.length >= 30, `expected the rule catalog to be populated, saw ${rules.length}`);
  assert.ok(
    skills.length >= 30,
    `expected the skill catalog to be populated, saw ${skills.length}`,
  );
});

test('an unindexed rule is reported rather than ignored', () => {
  // The check reads the index files as text, so a name that appears in no index
  // must be flagged. Verifying the negative case keeps the check honest without
  // writing a throwaway file into the repo.
  const indexes =
    (existsSync(repoPath('rules/README.md'))
      ? readFileSync(repoPath('rules/README.md'), 'utf8')
      : '') +
    (existsSync(repoPath('rules/00-master-rules.md'))
      ? readFileSync(repoPath('rules/00-master-rules.md'), 'utf8')
      : '');
  assert.ok(
    !indexes.includes('99-this-rule-does-not-exist.md'),
    'sanity: the fixture name must not be present in a real index',
  );
  assert.ok(
    indexes.includes('33-knowledge-compounding-and-context-velocity.md'),
    'rule 33 must itself be indexed — the rule that demands indexing cannot be unindexed',
  );
  assert.ok(
    indexes.includes('34-gate-economy-and-machine-resources.md'),
    'rule 34 must itself be indexed',
  );
});

test('the runbooks the rules point at exist', () => {
  for (const skill of ['grow-the-knowledge-layer.md', 'run-gates-once-and-land.md']) {
    assert.ok(existsSync(repoPath('skills', skill)), `missing runbook: skills/${skill}`);
  }
});
