#!/usr/bin/env node
/**
 * scripts/vercel/sync-env.mjs — upload environment variables from .env.vercel
 * to the right Vercel projects, and only the right ones.
 *
 * Values are never printed. Only variable names, their target, and whether the
 * value changed. Nothing is ever removed unless --remove-missing is passed.
 *
 *   node scripts/vercel/sync-env.mjs --all
 *   node scripts/vercel/sync-env.mjs --service chat
 *   node scripts/vercel/sync-env.mjs --all --target production
 *   node scripts/vercel/sync-env.mjs --all --dry-run
 */

import {
  loadProjects,
  loadEnvironmentManifest,
  loadDeploymentEnv,
  readVercelCredentials,
  vercelRequest,
  vercelErrorMessage,
  parseArgs,
  resolveTarget,
  isDryRun,
  selectProjects,
  skippedProjects,
  maskValue,
  log,
  runScript,
  RunSummary,
} from './lib/common.mjs';

const MANIFEST_META_KEYS = new Set(['$schema', 'version', 'description', 'conventions', 'shared', 'derived']);

/**
 * Build the exact variable set a single project should receive for a target.
 * A project gets a variable only when the manifest maps it there — this is the
 * mechanism that keeps, say, WORKSPACE_DATABASE_URL out of the chat project.
 */
function resolveProjectVariables(project, environment, env, target) {
  const wanted = new Map();

  const consider = (entry, sourceLabel) => {
    if (!entry.targets.includes(target)) {
      return;
    }
    const value = env[entry.name];
    if (value === undefined || value === '') {
      if (entry.required === true) {
        wanted.set(entry.name, { ...entry, source: sourceLabel, value: undefined, missing: true });
      }
      return;
    }
    wanted.set(entry.name, { ...entry, source: sourceLabel, value, missing: false });
  };

  for (const entry of environment.shared) {
    if (entry.appliesTo.includes(project.key)) {
      consider(entry, 'shared');
    }
  }
  for (const entry of environment[project.key] ?? []) {
    consider(entry, 'project');
  }

  // Derived service URLs are synced by resolve-service-urls.mjs, but if the
  // operator has already put a concrete value in .env.vercel we honour it here
  // so a first-run bootstrap does not need two passes.
  for (const entry of environment.derived) {
    if (!entry.appliesTo.includes(project.key)) {
      continue;
    }
    const value = env[entry.name];
    if (value !== undefined && value !== '') {
      wanted.set(entry.name, {
        name: entry.name,
        required: false,
        secret: false,
        targets: [target],
        source: 'derived',
        value,
        missing: false,
      });
    }
  }

  return wanted;
}

async function listExisting(credentials, projectName) {
  const result = await vercelRequest(
    credentials,
    'GET',
    `/v10/projects/${encodeURIComponent(projectName)}/env?decrypt=false`,
  );
  if (!result.ok) {
    throw new Error(`Could not list env vars — ${vercelErrorMessage(result)}`);
  }
  const byKey = new Map();
  for (const entry of result.body.envs ?? []) {
    const existing = byKey.get(entry.key) ?? [];
    existing.push(entry);
    byKey.set(entry.key, existing);
  }
  return byKey;
}

async function upsertVariable(credentials, projectName, name, value, secret, target) {
  const payload = {
    key: name,
    value,
    type: secret === true ? 'sensitive' : 'encrypted',
    target: [target],
  };
  // upsert=true makes Vercel replace a same-key/same-target entry instead of
  // erroring, which is what makes this script idempotent.
  const result = await vercelRequest(
    credentials,
    'POST',
    `/v10/projects/${encodeURIComponent(projectName)}/env?upsert=true`,
    payload,
  );
  if (!result.ok) {
    throw new Error(`${name} — ${vercelErrorMessage(result)}`);
  }
}

async function removeVariable(credentials, projectName, envId, name) {
  const result = await vercelRequest(
    credentials,
    'DELETE',
    `/v9/projects/${encodeURIComponent(projectName)}/env/${envId}`,
  );
  if (!result.ok) {
    throw new Error(`${name} — ${vercelErrorMessage(result)}`);
  }
}

/**
 * Fail before touching Vercel if any required value is missing. Half-applying an
 * environment is worse than not starting: the service boots and fails its Zod
 * validation at request time instead of at deploy time.
 */
function preflight(selected, environment, env, target) {
  const problems = [];
  for (const project of selected) {
    const wanted = resolveProjectVariables(project, environment, env, target);
    for (const [name, entry] of wanted) {
      if (entry.missing === true) {
        problems.push(`${project.key}: ${name} is required for target=${target} but has no value`);
      }
    }
  }
  return problems;
}

function assertNoSecretLeak(environment) {
  const problems = [];
  for (const [key, value] of Object.entries(environment)) {
    if (MANIFEST_META_KEYS.has(key) || !Array.isArray(value)) {
      continue;
    }
    for (const entry of value) {
      if (entry.secret === true && entry.name.startsWith('NEXT_PUBLIC_')) {
        problems.push(`${entry.name} is secret but declared with the NEXT_PUBLIC_ prefix (project ${key})`);
      }
    }
  }
  for (const entry of environment.shared) {
    if (entry.secret === true && entry.appliesTo.includes('frontend')) {
      problems.push(`${entry.name} is secret but mapped to the frontend project`);
    }
  }
  return problems;
}

async function main() {
  const { flags } = parseArgs();
  const target = resolveTarget(flags);
  const dryRun = isDryRun(flags);
  const removeMissing = flags['remove-missing'] === true;

  const manifest = loadProjects();
  const environment = loadEnvironmentManifest();
  const { values: env } = loadDeploymentEnv(flags);
  const credentials = readVercelCredentials(env);
  const selected = selectProjects(manifest, flags);

  log.step(`Syncing environment variables to ${selected.length} project(s), target=${target}${dryRun ? ' [DRY RUN]' : ''}`);

  const leaks = assertNoSecretLeak(environment);
  if (leaks.length > 0) {
    for (const leak of leaks) {
      log.error(leak);
    }
    throw new Error('Refusing to sync: a secret is declared in a browser-exposed position.');
  }

  const problems = preflight(selected, environment, env, target);
  if (problems.length > 0) {
    for (const problem of problems) {
      log.error(problem);
    }
    throw new Error(
      `${problems.length} required value(s) missing. Nothing was sent to Vercel — fill them in .env.vercel and re-run.`,
    );
  }
  log.ok('Pre-flight passed: every required value for this target has a value.');

  const summary = new RunSummary('Environment sync');
  for (const skipped of skippedProjects(manifest)) {
    if (!selected.some((p) => p.key === skipped.key)) {
      summary.add('Skipped', `${skipped.key} [${skipped.status}]`);
    }
  }

  for (const project of selected) {
    const wanted = resolveProjectVariables(project, environment, env, target);
    log.step(`${project.projectName} — ${wanted.size} variable(s) for ${target}`);

    if (wanted.size === 0) {
      log.info('nothing to sync');
      summary.add('Existing', project.key);
      continue;
    }

    let existing = new Map();
    if (!dryRun) {
      try {
        existing = await listExisting(credentials, project.projectName);
      } catch (error) {
        log.error(`${project.projectName}: ${error.message}`);
        summary.add('Failed', project.key);
        continue;
      }
    }

    let applied = 0;
    let failed = 0;

    for (const [name, entry] of wanted) {
      const label = `${name} = ${maskValue(entry.value)} [${entry.secret === true ? 'sensitive' : 'plain'}, ${entry.source}]`;
      if (dryRun) {
        log.info(`would set ${label}`);
        applied += 1;
        continue;
      }
      try {
        await upsertVariable(credentials, project.projectName, name, entry.value, entry.secret, target);
        log.ok(`set ${label}`);
        applied += 1;
      } catch (error) {
        log.error(`failed ${name} — ${error.message}`);
        failed += 1;
      }
    }

    if (removeMissing) {
      for (const [name, entries] of existing) {
        if (wanted.has(name)) {
          continue;
        }
        for (const entry of entries.filter((candidate) => (candidate.target ?? []).includes(target))) {
          if (dryRun) {
            log.warn(`would REMOVE ${name} (--remove-missing)`);
            continue;
          }
          try {
            await removeVariable(credentials, project.projectName, entry.id, name);
            log.warn(`removed ${name} (--remove-missing)`);
          } catch (error) {
            log.error(`failed to remove ${name} — ${error.message}`);
            failed += 1;
          }
        }
      }
    }

    if (failed > 0) {
      summary.add('Failed', `${project.key} (${failed})`);
    } else {
      summary.add('Updated', `${project.key} (${applied})`);
    }
  }

  if (!removeMissing) {
    log.info('Variables present on Vercel but absent from the manifest were left untouched. Pass --remove-missing to prune them.');
  }

  summary.print();
  return summary.failed ? 1 : 0;
}

await runScript('vercel:env:sync', main);
