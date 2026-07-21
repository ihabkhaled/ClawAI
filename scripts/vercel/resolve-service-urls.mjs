#!/usr/bin/env node
/**
 * scripts/vercel/resolve-service-urls.mjs — discover the live URL of every
 * deployed ClawAI project and, optionally, fan those URLs out to the projects
 * that call them.
 *
 * This is what keeps generated Vercel hostnames out of source control: the URLs
 * live in deploy/vercel/generated/ (gitignored) and in Vercel's own env store,
 * never in a committed file.
 *
 *   node scripts/vercel/resolve-service-urls.mjs --target production
 *   node scripts/vercel/resolve-service-urls.mjs --target production --sync
 *   node scripts/vercel/resolve-service-urls.mjs --target preview --sync --dry-run
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
  writeGenerated,
  log,
  runScript,
  RunSummary,
} from './lib/common.mjs';

/**
 * Resolve a project's URL for a target.
 *
 * production: prefer the project's assigned production alias (stable across
 *   deploys) and fall back to the newest READY production deployment.
 * preview: the newest READY preview deployment; preview URLs are per-deploy by
 *   nature, so there is nothing stable to prefer.
 */
async function resolveUrl(credentials, project, target) {
  if (target === 'production') {
    const domains = await vercelRequest(
      credentials,
      'GET',
      `/v9/projects/${encodeURIComponent(project.projectName)}/domains?production=true&limit=50`,
    );
    if (domains.ok) {
      const candidates = (domains.body.domains ?? []).filter((domain) => domain.verified !== false);
      // Prefer a custom domain over the *.vercel.app default when one exists.
      const custom = candidates.find((domain) => !domain.name.endsWith('.vercel.app'));
      const chosen = custom ?? candidates[0];
      if (chosen !== undefined) {
        return { url: `https://${chosen.name}`, origin: custom !== undefined ? 'custom-domain' : 'vercel-domain' };
      }
    }
  }

  const deployments = await vercelRequest(
    credentials,
    'GET',
    `/v6/deployments?app=${encodeURIComponent(project.projectName)}&target=${target}&limit=20&state=READY`,
  );
  if (!deployments.ok) {
    throw new Error(vercelErrorMessage(deployments));
  }
  const newest = (deployments.body.deployments ?? [])[0];
  if (newest === undefined) {
    return null;
  }
  return { url: `https://${newest.url}`, origin: `deployment:${newest.uid ?? 'unknown'}` };
}

async function syncUrlToProject(credentials, projectName, name, value, target, dryRun) {
  if (dryRun) {
    log.info(`${projectName}: would set ${name}=${value}`);
    return;
  }
  const result = await vercelRequest(
    credentials,
    'POST',
    `/v10/projects/${encodeURIComponent(projectName)}/env?upsert=true`,
    { key: name, value, type: 'encrypted', target: [target] },
  );
  if (!result.ok) {
    throw new Error(`${projectName}/${name} — ${vercelErrorMessage(result)}`);
  }
  log.ok(`${projectName}: ${name}=${value}`);
}

function renderEnvFile(target, resolved) {
  const lines = [
    '# GENERATED FILE — do not commit, do not edit by hand.',
    `# Produced by scripts/vercel/resolve-service-urls.mjs --target ${target}`,
    `# Generated at ${new Date().toISOString()}`,
    '',
  ];
  for (const [variable, url] of [...resolved.entries()].sort()) {
    lines.push(`${variable}=${url}`);
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const { flags } = parseArgs();
  const target = resolveTarget(flags);
  const dryRun = isDryRun(flags);
  const shouldSync = flags.sync === true;

  const manifest = loadProjects();
  const environment = loadEnvironmentManifest();
  const { values: env } = loadDeploymentEnv(flags);
  const credentials = readVercelCredentials(env);
  const selected = selectProjects(manifest, flags);

  log.step(`Resolving ${target} URLs for ${selected.length} project(s)${dryRun ? ' [DRY RUN]' : ''}`);

  const summary = new RunSummary('Service URL resolution');
  /** @type {Map<string, string>} variable name -> url */
  const resolved = new Map();
  /** @type {Map<string, string>} project key -> url */
  const byKey = new Map();

  for (const project of selected) {
    try {
      const result = await resolveUrl(credentials, project, target);
      if (result === null) {
        log.warn(`${project.projectName}: no READY ${target} deployment yet`);
        summary.add('Skipped', `${project.key} (not deployed)`);
        continue;
      }
      resolved.set(project.serviceUrlVariable, result.url);
      byKey.set(project.key, result.url);
      log.ok(`${project.key.padEnd(16)} ${project.serviceUrlVariable} = ${result.url} (${result.origin})`);
      summary.add('Existing', project.key);
    } catch (error) {
      log.error(`${project.projectName}: ${error.message}`);
      summary.add('Failed', project.key);
    }
  }

  // The frontend's own public URLs are derived from its resolved origin.
  const frontendUrl = byKey.get('frontend');
  if (frontendUrl !== undefined) {
    resolved.set('NEXT_PUBLIC_APP_URL', frontendUrl);
    resolved.set('NEXT_PUBLIC_API_URL', frontendUrl);
  }

  const filename = `service-urls.${target}.env`;
  if (dryRun) {
    log.info(`would write deploy/vercel/generated/${filename}`);
  } else {
    const path = writeGenerated(filename, renderEnvFile(target, resolved));
    log.ok(`wrote ${path}`);
  }

  if (!shouldSync) {
    summary.print();
    log.info('Pass --sync to push these URLs into the Vercel projects that consume them.');
    return summary.failed ? 1 : 0;
  }

  log.step(`Syncing resolved URLs into consuming projects (${target})`);
  const byProjectKey = new Map(manifest.projects.map((project) => [project.key, project]));
  let syncFailures = 0;

  for (const derived of environment.derived) {
    const url = resolved.get(derived.name);
    if (url === undefined) {
      log.warn(`${derived.name}: no resolved URL — skipping its consumers`);
      continue;
    }
    for (const consumerKey of derived.appliesTo) {
      const consumer = byProjectKey.get(consumerKey);
      if (consumer === undefined || consumer.status !== 'enabled') {
        continue;
      }
      try {
        await syncUrlToProject(credentials, consumer.projectName, derived.name, url, target, dryRun);
      } catch (error) {
        log.error(error.message);
        syncFailures += 1;
      }
    }
  }

  if (syncFailures > 0) {
    summary.add('Failed', `${syncFailures} URL sync operation(s)`);
  } else {
    summary.add('Updated', 'service URLs fanned out');
  }

  summary.print();
  if (summary.failed) {
    return 1;
  }
  log.info('Consuming projects must be redeployed for the new URLs to take effect.');
  return 0;
}

await runScript('vercel:resolve-service-urls', main);
