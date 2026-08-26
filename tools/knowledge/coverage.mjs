#!/usr/bin/env node
// knowledge:coverage — rule 33's documentation-discoverability gate.
//
// Deliberately NOT wired into the git hooks. Hooks gate code: they must stay
// fast, and a missing index row never breaks a build. This runs in CI, where
// being thorough is free, and in the unit suite, where it is milliseconds.
import { checkKnowledgeCoverage } from './verify.mjs';

const issues = checkKnowledgeCoverage();

if (issues.length > 0) {
  console.error(`knowledge:coverage FAILED — ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`  ✖ ${issue}`);
  console.error('\nEvery rule and skill must be reachable from its index, and every');
  console.error('service needs a CLAUDE.md and a service guide. See rules/33.');
  process.exit(1);
}

console.log(
  'knowledge:coverage OK — every rule and skill is indexed, every service has a CLAUDE.md and a guide.',
);
