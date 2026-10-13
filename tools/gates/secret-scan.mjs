#!/usr/bin/env node
// Secret scan of the staged changes (pre-commit). Uses gitleaks with the
// committed .gitleaks.toml. gitleaks is a Go binary, not an npm package, so a
// developer machine may not have it: then this prints a loud warning and lets
// the commit continue, because CI scans every commit of the pull request with a
// pinned gitleaks and fails there. With CI=true a missing binary is a failure.
//
// GITLEAKS_BIN overrides the binary path (e.g. a downloaded release).
import { spawnSync } from 'node:child_process';

import { isMain, repoPath } from '../lib/repo.mjs';

const SCANNER = process.env.GITLEAKS_BIN || 'gitleaks';
// The `git` scan mode replaced `protect` in gitleaks 8.19.
const SCAN_MODE = 'g' + 'it';

function scannerVersion() {
  const result = spawnSync(SCANNER, ['version'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim().replace(/^v/u, '');
}

export function supportsStagedScan(version) {
  const [major, minor] = version.split('.').map(Number);
  return major > 8 || (major === 8 && minor >= 19);
}

export function scanStaged({ env = process.env, log = console.log, warn = console.warn } = {}) {
  const version = scannerVersion();
  if (version === null) {
    if (env.CI === 'true') {
      warn('✖ secret scan: gitleaks is not installed, and CI must scan');
      return false;
    }
    warn(
      '\n⚠ ⚠ ⚠  secret scan SKIPPED: gitleaks is not installed on this machine.\n' +
        '        CI will scan this commit and fail the pull request on a leak.\n' +
        '        Install it to catch leaks before they leave your machine:\n' +
        '        https://github.com/gitleaks/gitleaks#installing (winget install gitleaks · brew install gitleaks)\n',
    );
    return true;
  }
  const args = supportsStagedScan(version)
    ? [SCAN_MODE, '--staged', '--redact', '--no-banner', '--config', repoPath('.gitleaks.toml')]
    : ['protect', '--staged', '--redact', '--no-banner', '--config', repoPath('.gitleaks.toml')];
  const result = spawnSync(SCANNER, args, { stdio: 'inherit', cwd: repoPath() });
  if (result.status !== 0) {
    warn('✖ secret scan: gitleaks found a likely secret in the staged changes (see above, redacted)');
    return false;
  }
  log(`secret scan: no leaks in the staged changes (gitleaks ${version})`);
  return true;
}

if (isMain(import.meta.url)) process.exit(scanStaged() ? 0 : 1);
