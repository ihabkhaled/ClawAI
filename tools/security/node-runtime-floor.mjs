#!/usr/bin/env node
// Minimum Node.js runtime per supported release line (CVE-2026-111497, the Brotli
// decoder out-of-bounds write, "Node2Shell"; Node.js security release 2026-10-21).
// One source for the Dockerfile build guard, the `engines` range and the
// operator check, so they cannot drift apart. Raising a floor means editing
// FLOORS, then `node tools/security/node-runtime-floor.mjs --sync`.
//
//   node tools/security/node-runtime-floor.mjs --sync     rewrite the guard in every Dockerfile
//   node tools/security/node-runtime-floor.mjs --running  fail if a running claw-* container is below the floor
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { isMain, repoPath } from '../lib/repo.mjs';

export const FLOORS = { 22: [23, 4], 24: [22, 1], 26: [12, 1] };

export const ENGINES_RANGE = Object.entries(FLOORS)
  .map(([major, [minor, patch]], index, all) =>
    index === all.length - 1 ? `>=${major}.${minor}.${patch}` : `^${major}.${minor}.${patch}`,
  )
  .join(' || ');

/** True when `version` (with or without a leading v) is at or above its line's floor. */
export function meetsFloor(version) {
  const [major, minor, patch] = version.replace(/^v/u, '').split('.').map(Number);
  const lines = Object.keys(FLOORS).map(Number);
  if (major > Math.max(...lines)) return true;
  const floor = FLOORS[major];
  if (!floor) return false;
  return minor > floor[0] || (minor === floor[0] && patch >= floor[1]);
}

/** Single-line Dockerfile instruction that fails the build on a vulnerable base image. */
export const DOCKER_GUARD_LINE =
  `RUN node -e "const[a,b,c]=process.versions.node.split('.').map(Number),f={${Object.entries(
    FLOORS,
  )
    .map(([major, floor]) => `${major}:[${floor.join(',')}]`)
    .join(',')}}[a];` +
  `if(!(a>${Math.max(...Object.keys(FLOORS).map(Number))}||f&&(b>f[0]||b===f[0]&&c>=f[1])))` +
  `{console.error('Node '+process.version+' is below the CVE-2026-111497 floor');process.exit(1)}"`;

const GUARD_MARKER = 'CVE-2026-111497 floor';
const NODE_FROM = /^FROM node:\S+( AS \S+)?$/u;

/** Adds or refreshes the guard directly after every `FROM node:` line. */
export function withGuard(dockerfile) {
  const out = [];
  const lines = dockerfile.split('\n');
  const carriageReturn = dockerfile.includes('\r\n') ? '\r' : '';
  for (let index = 0; index < lines.length; index += 1) {
    out.push(lines[index]);
    if (!NODE_FROM.test(lines[index].replace(/\r$/u, ''))) continue;
    if (lines[index + 1]?.includes(GUARD_MARKER)) index += 1;
    out.push(DOCKER_GUARD_LINE + carriageReturn);
  }
  return out.join('\n');
}

function trackedDockerfiles() {
  return execFileSync('git', ['ls-files'], { cwd: repoPath(), encoding: 'utf8' })
    .split('\n')
    .filter((file) => /(^|\/)Dockerfile[^/]*$/u.test(file));
}

function syncDockerfiles() {
  for (const file of trackedDockerfiles()) {
    const before = readFileSync(repoPath(file), 'utf8');
    const after = withGuard(before);
    if (after !== before) writeFileSync(repoPath(file), after);
  }
}

function checkRunningContainers() {
  const names = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' })
    .split('\n')
    .filter((name) => name.startsWith('claw-'));
  let below = 0;
  for (const name of names) {
    let version;
    try {
      version = execFileSync('docker', ['exec', name, 'node', '-p', 'process.version'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      continue;
    }
    const ok = meetsFloor(version);
    if (!ok) below += 1;
    console.log(`${ok ? 'ok   ' : 'BELOW'} ${name} ${version}`);
  }
  process.exitCode = below === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) {
  const flag = process.argv[2];
  if (flag === '--sync') syncDockerfiles();
  else if (flag === '--running') checkRunningContainers();
  else console.log(`engines: ${ENGINES_RANGE}\n${DOCKER_GUARD_LINE}`);
}
