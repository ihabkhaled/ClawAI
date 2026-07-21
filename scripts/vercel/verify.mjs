#!/usr/bin/env node
/**
 * scripts/vercel/verify.mjs — prove a deployment actually works.
 *
 * Reads the URLs written by deploy.mjs / resolve-service-urls.mjs and probes
 * each one. A green run here is the difference between "the build succeeded"
 * and "the system is up".
 *
 *   node scripts/vercel/verify.mjs --target production
 *   node scripts/vercel/verify.mjs --target preview
 *   node scripts/vercel/verify.mjs --service chat
 *   node scripts/vercel/verify.mjs --dry-run
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  GENERATED_DIR,
  loadProjects,
  loadDeploymentEnv,
  parseEnvFile,
  parseArgs,
  resolveTarget,
  isDryRun,
  selectProjects,
  skippedProjects,
  writeGenerated,
  log,
  runScript,
} from './lib/common.mjs';

const REQUEST_TIMEOUT_MS = 20_000;

/** Fetch with a hard timeout — a hung probe must not hang the whole run. */
async function probe(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      redirect: options.redirect ?? 'manual',
      signal: controller.signal,
    });
    return {
      ok: true,
      status: response.status,
      headers: response.headers,
      latencyMs: Date.now() - started,
      response,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      error: error.name === 'AbortError' ? `timed out after ${options.timeoutMs ?? REQUEST_TIMEOUT_MS}ms` : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

class Report {
  constructor(target) {
    this.target = target;
    this.checks = [];
  }

  record(entry) {
    this.checks.push(entry);
    const status = entry.status === 'pass' ? log.ok : entry.status === 'warn' ? log.warn : log.error;
    status(`${entry.project.padEnd(16)} ${entry.check.padEnd(28)} ${entry.detail}`);
  }

  get requiredFailures() {
    return this.checks.filter((entry) => entry.status === 'fail' && entry.required === true);
  }

  get counts() {
    return {
      pass: this.checks.filter((entry) => entry.status === 'pass').length,
      warn: this.checks.filter((entry) => entry.status === 'warn').length,
      fail: this.checks.filter((entry) => entry.status === 'fail').length,
    };
  }
}

/**
 * Resolve each project's base URL, preferring the deployment record written by
 * deploy.mjs and falling back to the resolved service-URL env file.
 */
function resolveBaseUrls(target, env) {
  const urls = new Map();

  const deploymentsPath = join(GENERATED_DIR, `deployments.${target}.json`);
  if (existsSync(deploymentsPath)) {
    const record = JSON.parse(readFileSync(deploymentsPath, 'utf8'));
    for (const entry of record.results ?? []) {
      if (entry.url !== null && entry.url !== undefined) {
        urls.set(entry.key, entry.url);
      }
    }
  }

  const serviceUrlsPath = join(GENERATED_DIR, `service-urls.${target}.env`);
  if (existsSync(serviceUrlsPath)) {
    const parsed = parseEnvFile(readFileSync(serviceUrlsPath, 'utf8'));
    for (const [variable, value] of Object.entries(parsed)) {
      urls.set(`var:${variable}`, value);
    }
  }

  // A URL supplied directly in the environment always wins — it is the operator
  // telling us where the thing actually lives.
  for (const [key, value] of Object.entries(env)) {
    if (key.endsWith('_SERVICE_URL') && value !== '') {
      urls.set(`var:${key}`, value);
    }
  }

  return urls;
}

function baseUrlFor(project, urls) {
  return urls.get(project.key) ?? urls.get(`var:${project.serviceUrlVariable}`) ?? null;
}

async function checkHealth(project, baseUrl, report) {
  const url = `${baseUrl}${project.healthPath}`;
  const result = await probe(url);
  if (!result.ok) {
    report.record({
      project: project.key,
      check: 'health',
      status: 'fail',
      required: true,
      detail: `${url} — ${result.error}`,
    });
    return;
  }
  const healthy = result.status >= 200 && result.status < 300;
  report.record({
    project: project.key,
    check: 'health',
    status: healthy ? 'pass' : 'fail',
    required: true,
    detail: `HTTP ${result.status} in ${result.latencyMs}ms`,
  });
}

async function checkProtectedEndpoint(project, baseUrl, report) {
  if (project.protectedProbePath === null || project.protectedProbePath === undefined) {
    return;
  }
  const url = `${baseUrl}${project.protectedProbePath}`;
  const result = await probe(url);
  if (!result.ok) {
    report.record({
      project: project.key,
      check: 'auth-guard',
      status: 'fail',
      required: true,
      detail: `${url} — ${result.error}`,
    });
    return;
  }
  // 401 is the correct answer to an unauthenticated call. 404 means routing is
  // broken; 500 means the guard itself threw; 200 means the endpoint is open.
  const correct = result.status === 401 || result.status === 403;
  const diagnosis =
    result.status === 404
      ? 'route not found — the API prefix or rewrite is wrong'
      : result.status === 500
        ? 'server error — the auth guard is throwing instead of rejecting'
        : result.status === 200
          ? 'endpoint answered without credentials — it is NOT protected'
          : `HTTP ${result.status}`;
  report.record({
    project: project.key,
    check: 'auth-guard (expect 401)',
    status: correct ? 'pass' : 'fail',
    required: true,
    detail: correct ? `HTTP ${result.status} as expected` : diagnosis,
  });
}

async function checkCors(project, baseUrl, frontendOrigin, report) {
  if (frontendOrigin === null) {
    return;
  }
  const url = `${baseUrl}${project.healthPath}`;
  const result = await probe(url, {
    method: 'OPTIONS',
    headers: {
      Origin: frontendOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  if (!result.ok) {
    report.record({
      project: project.key,
      check: 'cors-preflight',
      status: 'warn',
      required: false,
      detail: result.error,
    });
    return;
  }
  const allowed = result.headers.get('access-control-allow-origin');
  const permits = allowed === frontendOrigin || allowed === '*';
  report.record({
    project: project.key,
    check: 'cors-preflight',
    status: permits ? 'pass' : 'warn',
    required: false,
    detail: permits
      ? `allows ${frontendOrigin}`
      : `Access-Control-Allow-Origin is "${allowed ?? '<absent>'}" — the browser will block calls from ${frontendOrigin}`,
  });
}

async function checkStreaming(project, baseUrl, report) {
  if (project.streamingPath === undefined || project.streamingPath === null) {
    return;
  }
  const url = `${baseUrl}${project.streamingPath}`;
  const result = await probe(url, { headers: { Accept: 'text/event-stream' }, timeoutMs: 10_000 });
  if (!result.ok) {
    report.record({
      project: project.key,
      check: 'streaming',
      status: 'warn',
      required: false,
      detail: `${url} — ${result.error}`,
    });
    return;
  }
  // Unauthenticated, so 401 is a healthy answer: the route exists and the
  // handler was reached. What matters is that it is not 404 and not buffered
  // into a non-streaming content type when it does answer.
  const contentType = result.headers.get('content-type') ?? '';
  const routeExists = result.status !== 404;
  const streams = result.status === 401 || contentType.includes('text/event-stream');
  report.record({
    project: project.key,
    check: 'streaming endpoint',
    status: routeExists && streams ? 'pass' : 'warn',
    required: false,
    detail: routeExists
      ? `HTTP ${result.status}, content-type "${contentType || '<none>'}"`
      : 'route not found — SSE rewrite missing',
  });
  if (result.response !== undefined && result.response.body !== null) {
    try {
      await result.response.body.cancel();
    } catch {
      // The stream may already be closed; nothing to clean up.
    }
  }
}

async function checkFrontend(project, baseUrl, report) {
  const result = await probe(`${baseUrl}/`, { redirect: 'follow' });
  if (!result.ok) {
    report.record({
      project: project.key,
      check: 'frontend',
      status: 'fail',
      required: true,
      detail: result.error,
    });
    return;
  }
  const served = result.status >= 200 && result.status < 400;
  report.record({
    project: project.key,
    check: 'frontend',
    status: served ? 'pass' : 'fail',
    required: true,
    detail: `HTTP ${result.status} in ${result.latencyMs}ms`,
  });
}

async function checkFrontendProxy(project, baseUrl, report) {
  // The frontend rewrites /api/v1/auth/* to auth-service. If the rewrite is
  // missing, Next.js answers 404 from its own router instead of proxying.
  const url = `${baseUrl}/api/v1/health`;
  const result = await probe(url);
  if (!result.ok) {
    report.record({
      project: project.key,
      check: 'frontend→backend proxy',
      status: 'warn',
      required: false,
      detail: result.error,
    });
    return;
  }
  const proxied = result.status !== 404;
  report.record({
    project: project.key,
    check: 'frontend→backend proxy',
    status: proxied ? 'pass' : 'warn',
    required: false,
    detail: proxied
      ? `HTTP ${result.status} — rewrite is live`
      : '404 — no rewrite from the frontend to a backend project. Run resolve-service-urls.mjs --sync and redeploy the frontend.',
  });
}

async function checkOllama(env, report) {
  const baseUrl = env.OLLAMA_BASE_URL;
  if (baseUrl === undefined || baseUrl === '') {
    report.record({
      project: 'external',
      check: 'ollama api',
      status: 'warn',
      required: false,
      detail: 'OLLAMA_BASE_URL is not set — model routing will fail at request time',
    });
    return;
  }
  const headers = {};
  if (env.OLLAMA_API_KEY !== undefined && env.OLLAMA_API_KEY !== '') {
    headers.Authorization = `Bearer ${env.OLLAMA_API_KEY}`;
  }
  // /api/tags is a listing call: it proves reachability and credentials without
  // spending a single token of inference.
  const result = await probe(`${baseUrl.replace(/\/$/, '')}/api/tags`, { headers });
  if (!result.ok) {
    report.record({
      project: 'external',
      check: 'ollama api',
      status: 'fail',
      required: true,
      detail: `${baseUrl} unreachable — ${result.error}`,
    });
    return;
  }
  const reachable = result.status >= 200 && result.status < 300;
  report.record({
    project: 'external',
    check: 'ollama api',
    status: reachable ? 'pass' : 'fail',
    required: true,
    detail: reachable
      ? `HTTP ${result.status} from /api/tags in ${result.latencyMs}ms (no inference performed)`
      : `HTTP ${result.status} from /api/tags — check OLLAMA_API_KEY`,
  });
}

function recordDisabledServices(manifest, report) {
  for (const skipped of skippedProjects(manifest)) {
    report.record({
      project: skipped.key,
      check: `not deployed [${skipped.status}]`,
      status: 'pass',
      required: false,
      detail: 'correctly absent from this deployment',
    });
  }
}

function renderMarkdown(report) {
  const { pass, warn, fail } = report.counts;
  const lines = [
    '# ClawAI Vercel deployment verification',
    '',
    `- **Target:** ${report.target}`,
    `- **Generated:** ${new Date().toISOString()}`,
    `- **Result:** ${pass} passed, ${warn} warnings, ${fail} failed`,
    '',
    '| Project | Check | Status | Detail |',
    '| --- | --- | --- | --- |',
  ];
  for (const entry of report.checks) {
    const icon = entry.status === 'pass' ? 'PASS' : entry.status === 'warn' ? 'WARN' : 'FAIL';
    lines.push(`| ${entry.project} | ${entry.check} | ${icon} | ${entry.detail.replace(/\|/g, '\\|')} |`);
  }
  const required = report.requiredFailures;
  lines.push('', '## Verdict', '');
  if (required.length === 0) {
    lines.push('All required checks passed.');
  } else {
    lines.push(`${required.length} required check(s) failed:`, '');
    for (const entry of required) {
      lines.push(`- **${entry.project} / ${entry.check}** — ${entry.detail}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const { flags } = parseArgs();
  const target = resolveTarget(flags);
  const dryRun = isDryRun(flags);

  const manifest = loadProjects();
  const { values: env } = loadDeploymentEnv(flags);
  const selected = selectProjects(manifest, flags);
  const urls = resolveBaseUrls(target, env);
  const report = new Report(target);

  log.step(`Verifying ${selected.length} project(s) on ${target}${dryRun ? ' [DRY RUN]' : ''}`);

  if (dryRun) {
    log.info('Dry run — listing the probes that would execute, without any network calls.');
    for (const project of selected) {
      const baseUrl = baseUrlFor(project, urls) ?? '<unresolved>';
      log.plain(`  ${project.key.padEnd(16)} health        ${baseUrl}${project.healthPath}`);
      if (project.protectedProbePath !== null && project.protectedProbePath !== undefined) {
        log.plain(`  ${''.padEnd(16)} auth-guard    ${baseUrl}${project.protectedProbePath} (expect 401)`);
      }
      if (project.streamingPath !== undefined) {
        log.plain(`  ${''.padEnd(16)} streaming     ${baseUrl}${project.streamingPath}`);
      }
    }
    log.plain(`  ${'external'.padEnd(16)} ollama api    ${env.OLLAMA_BASE_URL ?? '<OLLAMA_BASE_URL unset>'}/api/tags`);
    for (const skipped of skippedProjects(manifest)) {
      log.plain(`  ${skipped.key.padEnd(16)} expect absent [${skipped.status}]`);
    }
    log.ok('Dry run complete — no report written.');
    return 0;
  }

  const frontend = manifest.projects.find((project) => project.key === 'frontend');
  const frontendOrigin = frontend === undefined ? null : baseUrlFor(frontend, urls);

  let unresolved = 0;
  for (const project of selected) {
    const baseUrl = baseUrlFor(project, urls);
    if (baseUrl === null) {
      report.record({
        project: project.key,
        check: 'url resolution',
        status: 'fail',
        required: true,
        detail: `no ${target} URL known. Run vercel:deploy or vercel:resolve-service-urls first.`,
      });
      unresolved += 1;
      continue;
    }

    if (project.key === 'frontend') {
      await checkFrontend(project, baseUrl, report);
      await checkFrontendProxy(project, baseUrl, report);
      continue;
    }

    await checkHealth(project, baseUrl, report);
    await checkProtectedEndpoint(project, baseUrl, report);
    await checkCors(project, baseUrl, frontendOrigin, report);
    await checkStreaming(project, baseUrl, report);
  }

  await checkOllama(env, report);
  recordDisabledServices(manifest, report);

  const json = {
    generatedAt: new Date().toISOString(),
    target,
    counts: report.counts,
    unresolved,
    checks: report.checks,
    requiredFailures: report.requiredFailures,
  };
  writeGenerated('verification-report.json', `${JSON.stringify(json, null, 2)}\n`);
  writeGenerated('verification-report.md', renderMarkdown(report));

  const { pass, warn, fail } = report.counts;
  log.step('Verdict');
  log.plain(`${pass} passed, ${warn} warnings, ${fail} failed`);
  log.plain('Reports: deploy/vercel/generated/verification-report.{json,md}');

  if (report.requiredFailures.length > 0) {
    log.error(`${report.requiredFailures.length} required check(s) failed.`);
    return 1;
  }
  log.ok('All required checks passed.');
  return 0;
}

await runScript('vercel:verify', main);
