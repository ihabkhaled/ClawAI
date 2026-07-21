#!/usr/bin/env node
/**
 * scripts/vercel/deploy.mjs — deploy ClawAI projects to Vercel.
 *
 * Each project is an independent Vercel project and is deployed on its own.
 * Backends go first, in dependency order, and the frontend goes last so it
 * never ships pointing at a backend that has not been updated yet.
 *
 * Preview is the default target. Production requires `--target production`.
 *
 *   node scripts/vercel/deploy.mjs --all --target preview
 *   node scripts/vercel/deploy.mjs --all --target production
 *   node scripts/vercel/deploy.mjs --service frontend --target production
 *   node scripts/vercel/deploy.mjs --dry-run
 */

import { spawnSync } from 'node:child_process';

import {
  REPO_ROOT,
  loadProjects,
  loadDeploymentEnv,
  readVercelCredentials,
  vercelRequest,
  vercelErrorMessage,
  parseArgs,
  resolveTarget,
  isDryRun,
  selectProjects,
  skippedProjects,
  topologicalOrder,
  writeGenerated,
  log,
  runScript,
  RunSummary,
} from './lib/common.mjs';

const VERCEL_CLI = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';

function cliAvailable() {
  const result = spawnSync(VERCEL_CLI, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.error === undefined || result.error === null;
}

/**
 * Build the non-interactive Vercel CLI invocation for one project.
 *
 * Deploys from the REPOSITORY ROOT, not the service directory. The Vercel
 * project already carries `rootDirectory: apps/<service>`, and Vercel applies
 * it relative to whatever is uploaded — so passing `--cwd apps/<service>` made
 * it look for `apps/<service>/apps/<service>` and fail. The repo root is also
 * the only place the npm workspace lockfile exists.
 *
 * Which project receives the deploy is set by VERCEL_PROJECT_ID in the
 * environment (see deployProject), since one directory now maps to 16 projects.
 */
function buildArgs(credentials, target) {
  const args = ['deploy', '--yes', '--token', credentials.token];
  if (credentials.teamId !== undefined) {
    args.push('--scope', credentials.teamId);
  }
  if (target === 'production') {
    args.push('--prod');
  }
  return args;
}

/** Look up a project's Vercel id so the CLI targets it without a .vercel link. */
async function resolveProjectId(credentials, projectName) {
  const result = await vercelRequest(credentials, 'GET', `/v9/projects/${encodeURIComponent(projectName)}`);
  if (!result.ok) {
    throw new Error(`could not resolve project id — ${vercelErrorMessage(result)}`);
  }
  return { id: result.body.id, orgId: result.body.accountId };
}

/** Redact the token from anything we echo to the operator. */
function renderCommand(args) {
  const safe = [...args];
  const tokenIndex = safe.indexOf('--token');
  if (tokenIndex !== -1) {
    safe[tokenIndex + 1] = '<redacted>';
  }
  return `${VERCEL_CLI} ${safe.join(' ')}`;
}

async function deployProject(project, credentials, target, dryRun) {
  const args = buildArgs(credentials, target);
  log.info(`${renderCommand(args)}   [project ${project.projectName}, root ${project.rootDirectory}]`);

  if (dryRun) {
    return { ok: true, url: null, dryRun: true };
  }

  let identity;
  try {
    identity = await resolveProjectId(credentials, project.projectName);
  } catch (error) {
    return { ok: false, message: error.message };
  }

  const result = spawnSync(VERCEL_CLI, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      // These two are how the CLI knows which project to deploy to when the
      // working directory is shared by every project in the monorepo.
      VERCEL_PROJECT_ID: identity.id,
      VERCEL_ORG_ID: credentials.teamId ?? identity.orgId,
    },
  });

  if (result.error !== undefined && result.error !== null) {
    return { ok: false, message: result.error.message };
  }

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  // The CLI writes progress to stderr and the final deployment URL to stdout.
  if (stderr.trim() !== '') {
    for (const line of stderr.trim().split('\n')) {
      log.plain(`    ${line}`);
    }
  }

  if (result.status !== 0) {
    return { ok: false, message: `vercel CLI exited with code ${result.status}` };
  }

  const url = (stdout.match(/https:\/\/[^\s]+/g) ?? []).pop() ?? null;
  return { ok: true, url };
}

async function main() {
  const { flags } = parseArgs();
  const target = resolveTarget(flags);
  const dryRun = isDryRun(flags);

  const manifest = loadProjects();
  const { values: env } = loadDeploymentEnv(flags);
  const credentials = readVercelCredentials(env);
  const selected = topologicalOrder(selectProjects(manifest, flags));

  log.step(`Deploying ${selected.length} project(s) to ${target}${dryRun ? ' [DRY RUN]' : ''}`);
  log.plain(`Order: ${selected.map((project) => project.key).join(' → ')}`);

  if (target === 'production') {
    log.warn('PRODUCTION target selected. This publishes to the live production aliases.');
  }

  if (!dryRun && !cliAvailable()) {
    throw new Error(
      'The Vercel CLI is not on PATH. Install it with `npm i -g vercel` (or add it as a devDependency) and re-run.',
    );
  }

  const summary = new RunSummary('Deployment');
  const results = [];
  const failedKeys = new Set();

  for (const skipped of skippedProjects(manifest)) {
    if (!selected.some((project) => project.key === skipped.key)) {
      summary.add('Skipped', `${skipped.key} [${skipped.status}]`);
      results.push({ key: skipped.key, status: 'skipped', reason: skipped.reason, url: null });
    }
  }

  for (const project of selected) {
    // A project whose dependency failed would deploy against a stale peer.
    // Skipping it is safer than shipping a known-broken wiring.
    const brokenDependency = (project.dependencies ?? []).find((key) => failedKeys.has(key));
    if (brokenDependency !== undefined) {
      log.warn(`${project.key}: skipped — dependency "${brokenDependency}" failed to deploy`);
      summary.add('Skipped', `${project.key} (dependency ${brokenDependency} failed)`);
      results.push({
        key: project.key,
        status: 'skipped',
        reason: `dependency ${brokenDependency} failed`,
        url: null,
      });
      failedKeys.add(project.key);
      continue;
    }

    log.step(`${project.projectName} → ${target}`);
    const outcome = await deployProject(project, credentials, target, dryRun);

    if (!outcome.ok) {
      log.error(`${project.projectName}: ${outcome.message}`);
      summary.add('Failed', project.key);
      results.push({ key: project.key, status: 'failed', reason: outcome.message, url: null });
      failedKeys.add(project.key);
      continue;
    }

    if (outcome.dryRun === true) {
      summary.add('Updated', `${project.key} (dry-run)`);
      results.push({ key: project.key, status: 'dry-run', url: null });
      continue;
    }

    log.ok(`${project.projectName}: ${outcome.url ?? 'deployed (URL not reported)'}`);
    summary.add('Updated', project.key);
    results.push({
      key: project.key,
      projectName: project.projectName,
      status: 'deployed',
      url: outcome.url,
      healthPath: project.healthPath,
    });
  }

  const record = {
    generatedAt: new Date().toISOString(),
    target,
    dryRun,
    results,
  };
  const filename = `deployments.${target}.json`;
  if (dryRun) {
    log.info(`would write deploy/vercel/generated/${filename}`);
  } else {
    log.ok(`wrote ${writeGenerated(filename, `${JSON.stringify(record, null, 2)}\n`)}`);
  }

  summary.print();
  if (summary.failed) {
    log.error('At least one deployment failed. Run `npm run vercel:verify` once the cause is fixed.');
    return 1;
  }
  log.ok('All selected deployments succeeded.');
  return 0;
}

await runScript('vercel:deploy', main);
