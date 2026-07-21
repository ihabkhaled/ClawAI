#!/usr/bin/env node
/**
 * scripts/vercel/provision.mjs — create and configure the Vercel projects
 * declared in deploy/vercel/projects.json.
 *
 * Idempotent by construction: existing projects are patched to match the
 * manifest, never recreated. Projects are NEVER deleted, and a Vercel project
 * whose name is not in the manifest is never touched.
 *
 *   node scripts/vercel/provision.mjs --all
 *   node scripts/vercel/provision.mjs --service auth
 *   node scripts/vercel/provision.mjs --all --dry-run
 */

import {
  loadProjects,
  loadDeploymentEnv,
  readVercelCredentials,
  vercelRequest,
  vercelErrorMessage,
  parseArgs,
  isDryRun,
  selectProjects,
  skippedProjects,
  log,
  runScript,
  RunSummary,
} from './lib/common.mjs';

/**
 * Settings this script owns. Anything not listed is left exactly as the
 * operator configured it in the Vercel dashboard.
 */
function desiredSettings(project, credentials) {
  return {
    framework: project.vercelFramework,
    rootDirectory: project.rootDirectory,
    buildCommand: project.buildCommand,
    installCommand: project.installCommand,
    outputDirectory: project.outputDirectory,
    // The monorepo root owns the lockfile, so Vercel must not try to infer a
    // per-app one, and a change anywhere in the workspace should rebuild.
    commandForIgnoringBuildStep: null,
    gitForkProtection: true,
    publicSource: false,
    productionBranch: credentials.productionBranch,
  };
}

function gitRepositoryPayload(credentials) {
  return { type: 'github', repo: credentials.gitRepository };
}

/** Marker for credential failures, so one bad token reports once, not 16 times. */
class CredentialError extends Error {}

async function findProject(credentials, projectName) {
  const result = await vercelRequest(credentials, 'GET', `/v9/projects/${encodeURIComponent(projectName)}`);
  if (result.status === 404) {
    return null;
  }
  if (result.status === 401 || result.status === 403) {
    throw new CredentialError(
      `Vercel rejected the credentials (HTTP ${result.status}). Check VERCEL_TOKEN, and VERCEL_TEAM_ID if the projects live in a team scope.`,
    );
  }
  if (!result.ok) {
    throw new Error(`Lookup of "${projectName}" failed — ${vercelErrorMessage(result)}`);
  }
  return result.body;
}

async function createProject(credentials, project) {
  const settings = desiredSettings(project, credentials);
  const payload = {
    name: project.projectName,
    framework: settings.framework,
    rootDirectory: settings.rootDirectory,
    buildCommand: settings.buildCommand,
    installCommand: settings.installCommand,
    outputDirectory: settings.outputDirectory,
    gitRepository: gitRepositoryPayload(credentials),
  };
  const result = await vercelRequest(credentials, 'POST', '/v11/projects', payload);
  if (!result.ok) {
    throw new Error(`Create failed — ${vercelErrorMessage(result)}`);
  }
  return result.body;
}

/** Returns the list of setting names that differ from the manifest. */
function settingsDrift(existing, desired) {
  const drift = [];
  const compare = (name, current, wanted) => {
    const normalise = (value) => (value === undefined || value === '' ? null : value);
    if (normalise(current) !== normalise(wanted)) {
      drift.push(name);
    }
  };
  compare('framework', existing.framework, desired.framework);
  compare('rootDirectory', existing.rootDirectory, desired.rootDirectory);
  compare('buildCommand', existing.buildCommand, desired.buildCommand);
  compare('installCommand', existing.installCommand, desired.installCommand);
  compare('outputDirectory', existing.outputDirectory, desired.outputDirectory);
  return drift;
}

async function updateProject(credentials, project, drift) {
  const settings = desiredSettings(project, credentials);
  const payload = {
    framework: settings.framework,
    rootDirectory: settings.rootDirectory,
    buildCommand: settings.buildCommand,
    installCommand: settings.installCommand,
    outputDirectory: settings.outputDirectory,
  };
  const result = await vercelRequest(
    credentials,
    'PATCH',
    `/v9/projects/${encodeURIComponent(project.projectName)}`,
    payload,
  );
  if (!result.ok) {
    throw new Error(`Update failed (${drift.join(', ')}) — ${vercelErrorMessage(result)}`);
  }
  return result.body;
}

/** Attach the shared GitHub repository when the project has no link yet. */
async function ensureGitLink(credentials, project, existing) {
  const link = existing.link;
  if (link !== undefined && link !== null) {
    const linkedRepo = `${link.org ?? link.owner ?? ''}/${link.repo ?? ''}`;
    if (linkedRepo.toLowerCase() !== credentials.gitRepository.toLowerCase()) {
      log.warn(
        `${project.projectName} is linked to "${linkedRepo}", not "${credentials.gitRepository}". ` +
          'Refusing to relink an existing connection — fix it in the Vercel dashboard if this is wrong.',
      );
    }
    return false;
  }
  const result = await vercelRequest(
    credentials,
    'POST',
    `/v9/projects/${encodeURIComponent(project.projectName)}/link`,
    gitRepositoryPayload(credentials),
  );
  if (!result.ok) {
    throw new Error(`Git link failed — ${vercelErrorMessage(result)}`);
  }
  return true;
}

/** Point the project at the production branch declared in .env.vercel. */
async function ensureProductionBranch(credentials, project, existing) {
  const current = existing.link?.productionBranch;
  if (current === credentials.productionBranch) {
    return false;
  }
  const result = await vercelRequest(
    credentials,
    'PATCH',
    `/v9/projects/${encodeURIComponent(project.projectName)}`,
    { productionBranch: credentials.productionBranch },
  );
  if (!result.ok) {
    throw new Error(`Production-branch update failed — ${vercelErrorMessage(result)}`);
  }
  return true;
}

async function main() {
  const { flags } = parseArgs();
  const dryRun = isDryRun(flags);
  const manifest = loadProjects();
  const { values: env } = loadDeploymentEnv(flags);
  const credentials = readVercelCredentials(env);

  const selected = selectProjects(manifest, flags);
  const summary = new RunSummary('Provision');

  log.step(
    `Provisioning ${selected.length} Vercel project(s) on ${credentials.gitRepository} ` +
      `(branch ${credentials.productionBranch})${dryRun ? ' [DRY RUN]' : ''}`,
  );
  if (credentials.teamId === undefined) {
    log.warn('VERCEL_TEAM_ID is not set — operating on the personal scope of the token owner.');
  }

  for (const skipped of skippedProjects(manifest)) {
    if (!selected.some((p) => p.key === skipped.key)) {
      summary.add('Skipped', `${skipped.key} [${skipped.status}]`);
    }
  }

  for (const project of selected) {
    const label = project.projectName;
    try {
      const existing = await findProject(credentials, project.projectName);

      if (existing === null) {
        if (dryRun) {
          log.info(`${label}: would CREATE (root=${project.rootDirectory}, framework=${project.framework})`);
          summary.add('Created', `${label} (dry-run)`);
          continue;
        }
        await createProject(credentials, project);
        log.ok(`${label}: created and linked to ${credentials.gitRepository}`);
        summary.add('Created', label);
        continue;
      }

      const drift = settingsDrift(existing, desiredSettings(project, credentials));
      const needsLink = existing.link === undefined || existing.link === null;
      const needsBranch = existing.link?.productionBranch !== credentials.productionBranch;

      if (drift.length === 0 && !needsLink && !needsBranch) {
        log.info(`${label}: already correct`);
        summary.add('Existing', label);
        continue;
      }

      if (dryRun) {
        const actions = [
          ...(drift.length > 0 ? [`settings(${drift.join(', ')})`] : []),
          ...(needsLink ? ['git-link'] : []),
          ...(needsBranch ? [`production-branch→${credentials.productionBranch}`] : []),
        ];
        log.info(`${label}: would UPDATE ${actions.join(', ')}`);
        summary.add('Updated', `${label} (dry-run)`);
        continue;
      }

      if (drift.length > 0) {
        await updateProject(credentials, project, drift);
      }
      if (needsLink) {
        await ensureGitLink(credentials, project, existing);
      }
      if (needsBranch) {
        await ensureProductionBranch(credentials, project, existing);
      }
      log.ok(`${label}: updated (${[...drift, ...(needsLink ? ['git-link'] : []), ...(needsBranch ? ['production-branch'] : [])].join(', ')})`);
      summary.add('Updated', label);
    } catch (error) {
      if (error instanceof CredentialError) {
        // Every subsequent project would fail identically. Stop and say why once.
        log.error(error.message);
        summary.add('Failed', 'authentication');
        break;
      }
      log.error(`${label}: ${error.message}`);
      summary.add('Failed', label);
    }
  }

  summary.print();
  if (summary.failed) {
    log.error('One or more projects failed to provision.');
    return 1;
  }
  log.ok('Provisioning complete. No project was deleted or replaced.');
  return 0;
}

await runScript('vercel:provision', main);
