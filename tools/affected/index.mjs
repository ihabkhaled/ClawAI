#!/usr/bin/env node
// Affected-workspace engine. Given a git diff, determines which workspaces need
// validation and WHY — so a one-service change runs a one-service gate, not the
// whole 24-workspace fleet, while a shared-package change fans out to dependents.
//
//   node tools/affected/index.mjs list [--base=main]
//   node tools/affected/index.mjs lint|typecheck|test|build [--base=main]
import { execFileSync } from 'node:child_process';
import { buildManifests } from '../lib/manifests.mjs';
import { isMain } from '../lib/repo.mjs';
import { cmp } from '../lib/fact.mjs';

// npm is npm.cmd on Windows; execFileSync can't spawn a .cmd without a shell.
// Node's post-CVE-2024-27980 behavior throws EINVAL when spawning a .cmd/.bat
// without shell:true, so the NPM invocation below MUST pass IS_WINDOWS as its
// `shell` option — otherwise every workspace gate silently fails on Windows.
const IS_WINDOWS = process.platform === 'win32';
const NPM = IS_WINDOWS ? 'npm.cmd' : 'npm';

function gitLines(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Changed files. In --staged mode (used by pre-commit) only the staged set is
 * considered, so a commit validates what it is actually committing and is not
 * blocked by unrelated in-flight work in the tree. Otherwise it also includes
 * the diff against `base` and unstaged edits.
 */
function changedFiles(base, stagedOnly) {
  if (stagedOnly) return [...new Set(gitLines(['diff', '--name-only', '--cached']))].sort();
  const parts = [
    ...gitLines(['diff', '--name-only', `${base}...HEAD`]),
    ...gitLines(['diff', '--name-only', '--cached']),
    ...gitLines(['diff', '--name-only']),
  ];
  return [...new Set(parts)].sort();
}

/** Reverse dependency map: package -> [workspaces depending on it]. */
function reverseDeps(workspaces) {
  const rev = {};
  for (const ws of workspaces) {
    for (const dep of ws.internalDeps) {
      rev[dep] = rev[dep] ?? [];
      rev[dep].push(ws.name);
    }
  }
  return rev;
}

export function computeAffected(base, stagedOnly = false) {
  const manifests = buildManifests();
  const workspaces = manifests.workspaces.workspaces;
  const files = changedFiles(base, stagedOnly);
  const byDir = {};
  for (const ws of workspaces) byDir[ws.dir] = ws;
  const rev = reverseDeps(workspaces);
  const nameByDir = Object.fromEntries(workspaces.map((w) => [w.dir, w.name]));

  const affected = new Map(); // name -> reason
  const add = (name, reason) => {
    if (!affected.has(name)) affected.set(name, reason);
  };

  let rootInvariant = false;
  for (const f of files) {
    // A workspace's own AGENTS.md is generated documentation (tools/knowledge/
    // build.mjs) with zero code impact — it must not trigger a code gate
    // (typecheck/lint/test/build) for that workspace, or every governance
    // commit that regenerates 24 AGENTS.md files would force a full-fleet run.
    if (/\/AGENTS\.md$/.test(f)) continue;
    const owner = workspaces.find((ws) => f.startsWith(`${ws.dir}/`));
    if (owner) {
      add(owner.name, `direct edit: ${f}`);
      // Shared package changed → every dependent workspace is affected.
      if (owner.type === 'shared-package') {
        for (const dependent of rev[owner.name] ?? []) {
          add(dependent, `depends on changed package ${owner.name}`);
        }
      }
      continue;
    }
    // Root/infra changes → broad invariant validation.
    if (/^(package\.json|package-lock\.json|eslint|tsconfig|\.github\/|docker\/|infra\/|tools\/|rules\/|skills\/|context\/|\.env)/.test(f)) {
      rootInvariant = true;
      add('__root__', `root/infra/governance change: ${f}`);
    }
  }

  const result = [...affected.entries()]
    .filter(([name]) => name !== '__root__')
    .map(([name, reason]) => ({ name, reason }))
    .sort((a, b) => cmp(a.name, b.name));

  return { base, changedFileCount: files.length, rootInvariant, affected: result, nameByDir };
}

function runGate(script, base, expandRoot, stagedOnly) {
  const { affected, rootInvariant } = computeAffected(base, stagedOnly);
  const names = affected
    .map((a) => a.name)
    // Only workspaces that actually declare the target script can run it.
    .filter((name) => scriptExists(name, script));
  // Local hooks stay scoped: they run only the directly-affected workspaces and
  // their dependents. A root/config/governance change is flagged rootInvariant
  // and — ONLY with --all-on-root (used by CI + release:preflight) — expands to
  // every workspace. This keeps local hooks fast and prevents false-fails on
  // unrelated in-flight work, while CI still does the full broad pass.
  const list =
    rootInvariant && expandRoot
      ? buildManifests().workspaces.workspaces.map((w) => w.name).filter((name) => scriptExists(name, script))
      : names;
  const scope = rootInvariant
    ? expandRoot
      ? '(root invariant — ALL workspaces)'
      : '(root invariant — local scope: affected only; full pass runs in CI/preflight)'
    : names.join(', ') || '(none)';
  console.log(`affected:${script} → ${scope}`);
  if (list.length === 0) {
    console.log('Nothing to validate in local scope.');
    return;
  }
  for (const name of list) {
    console.log(`\n▶ ${name}: npm run ${script}`);
    try {
      // shell:true on Windows so npm.cmd can be spawned (see IS_WINDOWS note
      // above). `script` is a fixed gate name and `name` is a repo workspace
      // slug from the manifest — neither is user-controlled, so shell quoting
      // is not an injection surface here.
      execFileSync(NPM, ['run', script, '--workspace', name], {
        stdio: 'inherit',
        shell: IS_WINDOWS,
      });
    } catch {
      console.error(`✖ ${name} failed npm run ${script}`);
      process.exit(1);
    }
  }
}

/** True when a workspace's package.json declares the given script. */
function scriptExists(name, script) {
  const ws = buildManifests().workspaces.workspaces.find((w) => w.name === name);
  return Boolean(ws && ws.scripts.includes(script));
}

function main() {
  const [cmdArg = 'list'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const baseArg = process.argv.find((a) => a.startsWith('--base='));
  const base = baseArg ? baseArg.split('=')[1] : 'main';
  const expandRoot = process.argv.includes('--all-on-root');
  const stagedOnly = process.argv.includes('--staged');
  if (cmdArg === 'list') {
    const { affected, rootInvariant, changedFileCount } = computeAffected(base, stagedOnly);
    console.log(`Affected vs ${base} (${changedFileCount} changed files)${rootInvariant ? ' [root invariant]' : ''}:`);
    if (affected.length === 0 && !rootInvariant) console.log('  (none)');
    for (const a of affected) console.log(`  ${a.name} — ${a.reason}`);
    return;
  }
  runGate(cmdArg, base, expandRoot, stagedOnly);
}

if (isMain(import.meta.url)) main();
