import { hasSecrets, readSecrets } from '../auth/auth-store.js';
import { publicRequest, request, apiUrl } from '../api/client.js';
import { readConfig } from '../config/config-store.js';
import * as log from '../utils/logger.js';

function line(ok, label, detail) {
  const mark = ok ? '✔' : '✖';
  if (ok) log.success(`${label}${detail !== undefined ? ` — ${detail}` : ''}`);
  else log.error(`${label}${detail !== undefined ? ` — ${detail}` : ''}`);
  return { ok, label, detail: detail ?? null, mark };
}

async function checkReachability() {
  try {
    await publicRequest('/api/v1/health');
    return line(true, 'API reachable', apiUrl('/api/v1/health'));
  } catch (err) {
    return line(false, 'API reachable', err instanceof Error ? err.message : 'unknown');
  }
}

function checkConfig() {
  const cfg = readConfig();
  return line(true, 'Config loaded', `apiUrl=${cfg.apiUrl}`);
}

function checkSecretsPresent() {
  return line(hasSecrets(), 'Credentials present', hasSecrets() ? 'encrypted-file' : 'missing');
}

async function checkWhoami() {
  const secrets = readSecrets();
  if (secrets === null) return line(false, 'Authenticated', 'no credentials');
  try {
    const page = await request('/api/v1/agent/devices?page=1&pageSize=1');
    const ok = page?.total !== undefined;
    return line(ok, 'Authenticated', `total devices: ${page?.total ?? 0}`);
  } catch (err) {
    return line(false, 'Authenticated', err instanceof Error ? err.message : 'unknown');
  }
}

export async function runDoctor(flags) {
  const asJson = flags['--json'] === true;
  const checks = [];
  checks.push(checkConfig());
  checks.push(await checkReachability());
  checks.push(checkSecretsPresent());
  checks.push(await checkWhoami());
  const allOk = checks.every((c) => c.ok);
  if (asJson) {
    console.log(JSON.stringify({ ok: allOk, checks }, null, 2));
  } else if (!allOk) {
    log.warn('One or more checks failed.');
  } else {
    log.success('All checks passed.');
  }
  process.exitCode = allOk ? 0 : 1;
}
