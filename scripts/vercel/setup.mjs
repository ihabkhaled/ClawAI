#!/usr/bin/env node
/**
 * scripts/vercel/setup.mjs — one command that runs the whole deployment
 * pipeline in the correct order.
 *
 * Order matters and is not configurable:
 *   validate → provision → sync env → migrate → deploy backends →
 *   resolve service URLs (+sync) → deploy frontend → verify
 *
 * Backends are deployed before URLs are resolved, because a URL cannot be
 * resolved for something that has never deployed. The frontend goes last so it
 * ships with every backend URL already in place.
 *
 *   npm run vercel:setup -- --target preview
 *   npm run vercel:setup -- --target production
 *   npm run vercel:setup -- --target production --skip-migrations
 *   npm run vercel:setup -- --target production --dry-run
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import {
  REPO_ROOT,
  loadProjects,
  parseArgs,
  resolveTarget,
  isDryRun,
  log,
  runScript,
} from './lib/common.mjs';

const SCRIPTS_DIR = join(REPO_ROOT, 'scripts', 'vercel');

/** Run a sibling script in a child process and return its exit code. */
function runStep(scriptName, args) {
  const result = spawnSync(process.execPath, [join(SCRIPTS_DIR, scriptName), ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (result.error !== undefined && result.error !== null) {
    return { code: 1, message: result.error.message };
  }
  return { code: result.status ?? 1 };
}

function buildPlan(target, flags, dryRun) {
  const common = dryRun ? ['--dry-run'] : [];
  const targetArgs = ['--target', target];
  const skipMigrations = flags['skip-migrations'] === true;

  return [
    {
      name: 'validate',
      script: 'validate.mjs',
      args: [...targetArgs],
      required: true,
      description: 'Check manifests, paths, env declarations, and safety invariants.',
    },
    {
      name: 'provision',
      script: 'provision.mjs',
      args: ['--all', ...common],
      required: true,
      description: 'Create missing Vercel projects; patch drifted settings. Never deletes.',
    },
    {
      name: 'sync-env',
      script: 'sync-env.mjs',
      args: ['--all', ...targetArgs, ...common],
      required: true,
      description: `Upload ${target} environment variables to each project that needs them.`,
    },
    {
      name: 'migrate',
      script: 'migrate.mjs',
      args: ['--all', ...common],
      required: true,
      skip: skipMigrations,
      description: skipMigrations
        ? 'SKIPPED (--skip-migrations).'
        : 'Run Prisma deploy migrations and create MongoDB TTL indexes.',
    },
    {
      name: 'deploy-backends',
      script: 'deploy.mjs',
      args: ['--all', ...targetArgs, ...common],
      required: true,
      description: `Deploy every enabled project to ${target} in dependency order (frontend last).`,
    },
    {
      name: 'resolve-service-urls',
      script: 'resolve-service-urls.mjs',
      args: [...targetArgs, '--sync', ...common],
      required: true,
      description: 'Discover live URLs and fan them out to the projects that call them.',
    },
    {
      name: 'redeploy-frontend',
      script: 'deploy.mjs',
      args: ['--service', 'frontend', ...targetArgs, ...common],
      required: true,
      description: 'Redeploy the frontend so it picks up the freshly synced backend URLs.',
    },
    {
      name: 'verify',
      script: 'verify.mjs',
      args: [...targetArgs, ...common],
      required: true,
      description: 'Probe health, auth guards, CORS, streaming, proxy routes, and the Ollama API.',
    },
  ];
}

function printPlan(plan, target, dryRun) {
  const manifest = loadProjects();
  const enabled = manifest.projects.filter((project) => project.status === 'enabled');
  const excluded = manifest.projects.filter((project) => project.status !== 'enabled');

  log.step(`ClawAI Vercel setup — target=${target}${dryRun ? ' [DRY RUN]' : ''}`);
  log.plain('');
  log.plain(`Projects to deploy (${enabled.length}):`);
  for (const project of enabled) {
    log.plain(`  • ${project.projectName.padEnd(32)} ${project.rootDirectory}`);
  }
  log.plain('');
  log.plain(`Projects NOT deployed (${excluded.length}):`);
  for (const project of excluded) {
    log.plain(`  • ${project.projectName.padEnd(32)} [${project.status}]`);
  }
  log.plain('');
  log.plain('Steps:');
  for (const [index, step] of plan.entries()) {
    const marker = step.skip === true ? 'skip' : `${index + 1}`.padStart(4);
    log.plain(`  ${marker}. ${step.name.padEnd(22)} ${step.description}`);
  }
  log.plain('');
}

async function main() {
  const { flags } = parseArgs();
  const target = resolveTarget(flags);
  const dryRun = isDryRun(flags);
  const plan = buildPlan(target, flags, dryRun);

  printPlan(plan, target, dryRun);

  if (target === 'production' && !dryRun) {
    // No interactive prompt: this must work unattended in CI. The summary above
    // is the deliberate "here is what is about to change" moment.
    log.warn('PRODUCTION run starting. Nothing above will be deleted, but live aliases will be republished.');
  }

  const outcomes = [];
  for (const step of plan) {
    if (step.skip === true) {
      log.step(`Step: ${step.name} — SKIPPED`);
      outcomes.push({ name: step.name, status: 'skipped' });
      continue;
    }

    log.step(`Step: ${step.name}`);
    const result = runStep(step.script, step.args);

    if (result.code !== 0) {
      log.error(`Step "${step.name}" failed with exit code ${result.code}${result.message !== undefined ? ` — ${result.message}` : ''}`);
      outcomes.push({ name: step.name, status: 'failed' });

      log.step('Setup summary');
      for (const outcome of outcomes) {
        log.plain(`  ${outcome.status.padEnd(8)} ${outcome.name}`);
      }
      for (const remaining of plan.slice(plan.indexOf(step) + 1)) {
        log.plain(`  ${'not run'.padEnd(8)} ${remaining.name}`);
      }
      log.error('Pipeline halted. Fix the failure above and re-run — every step is idempotent.');
      return 1;
    }

    log.ok(`Step "${step.name}" completed.`);
    outcomes.push({ name: step.name, status: 'ok' });
  }

  log.step('Setup summary');
  for (const outcome of outcomes) {
    log.plain(`  ${outcome.status.padEnd(8)} ${outcome.name}`);
  }
  log.ok(`ClawAI ${target} deployment pipeline completed.`);
  if (!dryRun) {
    log.plain('Verification report: deploy/vercel/generated/verification-report.md');
  }
  return 0;
}

await runScript('vercel:setup', main);
