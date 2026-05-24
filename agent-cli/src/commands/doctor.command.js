import { hasSecrets, readSecrets } from '../auth/auth-store.js';
import { publicRequest, request, apiUrl } from '../api/client.js';
import { providerRegistry } from '../capability-providers/index.js';
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

// V2 Stream 02 — capability provider probes
async function probeProviders() {
  const results = [];
  for (const [name, provider] of providerRegistry.entries()) {
    if (typeof provider.probe !== 'function') {
      results.push({
        class: name,
        healthy: false,
        dependencies: [],
        notes: 'Provider does not export probe() — not yet upgraded',
      });
      continue;
    }
    try {
      const probeResult = await provider.probe();
      results.push(probeResult);
    } catch (err) {
      results.push({
        class: name,
        healthy: false,
        dependencies: [],
        notes: `probe() threw: ${err instanceof Error ? err.message : 'unknown'}`,
      });
    }
  }
  return results;
}

function renderProviderProbe(probe) {
  const mark = probe.healthy ? '✔' : '✖';
  const detail = probe.notes ?? '';
  if (probe.healthy) log.success(`Provider ${probe.class} ${detail !== '' ? `— ${detail}` : ''}`);
  else log.error(`Provider ${probe.class} ${detail !== '' ? `— ${detail}` : ''}`);
  for (const d of probe.dependencies) {
    const sub = d.installed ? '  ✔' : d.required ? '  ✖' : '  ◌';
    const versionPart = d.version === null || d.version === undefined ? '' : ` (${d.version})`;
    const fixPart = d.installed === false && d.fix !== null && d.fix !== undefined ? `  — fix: ${d.fix}` : '';
    const requiredTag = d.required ? '' : ' [optional]';
    console.log(`    ${sub} ${d.name}${requiredTag}${versionPart}${fixPart}`);
  }
  return { ok: probe.healthy, label: `Provider ${probe.class}`, detail, mark };
}

export async function runDoctor(flags) {
  const asJson = flags['--json'] === true;
  const checks = [];
  checks.push(checkConfig());
  checks.push(await checkReachability());
  checks.push(checkSecretsPresent());
  checks.push(await checkWhoami());

  // V2 Stream 02 — provider probes
  const providerProbes = await probeProviders();
  if (!asJson) {
    console.log('');
    log.info('Capability provider probes:');
  }
  for (const p of providerProbes) {
    if (asJson) {
      checks.push({ ok: p.healthy, label: `Provider ${p.class}`, detail: p.notes ?? null, mark: p.healthy ? '✔' : '✖' });
    } else {
      checks.push(renderProviderProbe(p));
    }
  }

  // Required-provider gating: TERMINAL / FILESYSTEM / PROCESS are core
  // and must always be healthy. Others (BROWSER/SCREEN/etc.) are
  // optional — the operator picks which to install based on their
  // recipe needs. allOk reflects the core providers + the connectivity
  // checks; we surface the unhealthy optionals as warnings.
  const requiredHealthy = providerProbes
    .filter((p) => ['TERMINAL', 'FILESYSTEM', 'PROCESS'].includes(p.class))
    .every((p) => p.healthy);
  const allOk = checks.slice(0, 4).every((c) => c.ok) && requiredHealthy;

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          ok: allOk,
          checks,
          providerProbes,
        },
        null,
        2,
      ),
    );
  } else if (!allOk) {
    log.warn('One or more core checks failed.');
  } else {
    log.success('All core checks passed.');
    const unhealthyOptionals = providerProbes.filter((p) => !p.healthy);
    if (unhealthyOptionals.length > 0) {
      log.info(
        `Optional providers needing setup: ${unhealthyOptionals.map((p) => p.class).join(', ')}`,
      );
    }
  }
  process.exitCode = allOk ? 0 : 1;
}
