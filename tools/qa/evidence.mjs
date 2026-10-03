#!/usr/bin/env node
// QA evidence CLI (rules/60).
//   node tools/qa/evidence.mjs new <slug>             create docs/qa-evidence/<date>-<slug>.md from the template
//   node tools/qa/evidence.mjs check <file...>        validate record(s); exit 1 on any problem
//   node tools/qa/evidence.mjs check --range A..B     every feat/fix/perf commit in the range that touches
//                                                     product source must have a valid record changed in the range
//   node tools/qa/evidence.mjs lanes                  print the lanes
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  LANES,
  commitOwesEvidence,
  evidenceFilesIn,
  renderTemplate,
  validateRecord,
} from './evidence-lib.mjs';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

function checkFiles(files) {
  let bad = 0;
  for (const file of files) {
    const problems = validateRecord(readFileSync(join(root, file), 'utf8'));
    if (problems.length > 0) {
      bad += 1;
      console.error(`QA evidence INVALID: ${file}`);
      for (const p of problems) console.error(`  - ${p}`);
    } else {
      console.log(`QA evidence ok: ${file}`);
    }
  }
  return bad;
}

function checkRange(range) {
  const commits = git(['log', '--no-merges', '--format=%H%x09%s', range])
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [sha, ...rest] = l.split('\t');
      return { sha, subject: rest.join('\t') };
    });
  const changed = new Set();
  const owing = [];
  for (const c of commits) {
    const files = git(['show', '--name-only', '--format=', c.sha]).split('\n').filter(Boolean);
    for (const f of files) changed.add(f);
    if (commitOwesEvidence(c.subject, files)) owing.push(c);
  }
  if (owing.length === 0) {
    console.log(`QA evidence: no feat/fix/perf product commit in ${range}, nothing owed`);
    return 0;
  }
  const records = evidenceFilesIn([...changed]).filter((f) => existsSync(join(root, f)));
  if (records.length === 0) {
    console.error(`QA evidence MISSING for ${String(owing.length)} commit(s) in ${range}:`);
    for (const c of owing) console.error(`  - ${c.sha.slice(0, 9)} ${c.subject}`);
    console.error(
      'Run: npm run qa:evidence:new -- <slug>, walk the lanes (skills/run-the-qa-team.md), fill the record.',
    );
    return 1;
  }
  return checkFiles(records);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'lanes') {
  for (const [id, name] of LANES) console.log(`${id}  ${name}`);
} else if (cmd === 'new') {
  const slug = (rest[0] ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug === '') {
    console.error('usage: qa:evidence:new -- <slug>');
    process.exit(2);
  }
  const date = new Date().toISOString().slice(0, 10);
  const rel = `docs/qa-evidence/${date}-${slug}.md`;
  mkdirSync(join(root, 'docs/qa-evidence'), { recursive: true });
  if (existsSync(join(root, rel))) {
    console.error(`already exists: ${rel}`);
    process.exit(1);
  }
  writeFileSync(join(root, rel), renderTemplate(slug));
  console.log(`created ${rel} - fill every lane, then run qa:evidence:check -- ${rel}`);
} else if (cmd === 'check') {
  const rangeIdx = rest.indexOf('--range');
  if (rangeIdx >= 0) {
    process.exit(checkRange(rest[rangeIdx + 1] ?? 'origin/main..HEAD') === 0 ? 0 : 1);
  }
  if (rest.length === 0) {
    console.error('usage: qa:evidence:check -- <file...> | --range A..B');
    process.exit(2);
  }
  process.exit(checkFiles(rest) === 0 ? 0 : 1);
} else {
  console.error('usage: new <slug> | check <file...> | check --range A..B | lanes');
  process.exit(2);
}
