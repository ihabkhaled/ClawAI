#!/usr/bin/env node
/**
 * scripts/vercel/validate.mjs — pre-flight consistency check for the Vercel
 * deployment automation. Touches nothing remote and needs no VERCEL_TOKEN.
 *
 * Run this before every provision/deploy. It is also the first step of
 * `npm run vercel:setup` and both GitHub Actions workflows.
 *
 *   node scripts/vercel/validate.mjs
 *   node scripts/vercel/validate.mjs --target production
 *   node scripts/vercel/validate.mjs --service chat
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  REPO_ROOT,
  loadProjects,
  loadEnvironmentManifest,
  loadMigrationsManifest,
  loadDeploymentEnv,
  parseArgs,
  resolveTarget,
  log,
  runScript,
  writeGenerated,
} from './lib/common.mjs';

/** Hostnames that only resolve inside the Docker network. */
const DOCKER_ONLY_HOSTS = [
  'auth-service',
  'chat-service',
  'connector-service',
  'routing-service',
  'memory-service',
  'file-service',
  'audit-service',
  'ollama-service',
  'health-service',
  'client-logs-service',
  'server-logs-service',
  'image-service',
  'file-generation-service',
  'workspace-service',
  'agent-service',
  'research-service',
  'llamacpp-service',
  'postgres',
  'mongodb',
  'redis',
  'rabbitmq',
  'clamav',
  'comfyui',
  'stable-diffusion',
  'ollama',
];

/** Values that must never appear in a production URL variable. */
const LOCAL_HOST_PATTERNS = [/^https?:\/\/localhost/i, /^https?:\/\/127\.0\.0\.1/i, /^https?:\/\/0\.0\.0\.0/i];

/** Variables that carry a local-runtime dependency ClawAI-on-Vercel must not need. */
const LOCAL_RUNTIME_VARIABLES = [
  'LLAMACPP_SERVICE_URL',
  'LLAMACPP_DATA_PATH',
  'LLAMACPP_BINARY_VERSION',
  'OLLAMA_SERVICE_URL',
  'COMFYUI_BASE_URL',
  'COMFYUI_MODELS_PATH',
  'STABLE_DIFFUSION_URL',
];

class Findings {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  pass(check) {
    this.checks.push({ check, status: 'pass' });
  }

  fail(check, detail) {
    this.checks.push({ check, status: 'fail', detail });
    this.errors.push(`${check}: ${detail}`);
  }

  warn(check, detail) {
    this.checks.push({ check, status: 'warn', detail });
    this.warnings.push(`${check}: ${detail}`);
  }
}

function checkProjectPaths(projects, findings) {
  for (const project of projects.projects) {
    if (project.status === 'not-vercel-compatible') {
      if (project.notVercelCompatibleReason === undefined || project.notVercelCompatibleReason === '') {
        findings.fail('project-status', `${project.key} is not-vercel-compatible but gives no reason`);
      }
      continue;
    }
    const root = join(REPO_ROOT, project.rootDirectory);
    if (!existsSync(root)) {
      findings.fail('project-path', `${project.key} rootDirectory does not exist: ${project.rootDirectory}`);
      continue;
    }
    const packageJsonPath = join(root, 'package.json');
    if (!existsSync(packageJsonPath)) {
      findings.fail('project-path', `${project.key} has no package.json at ${project.rootDirectory}`);
      continue;
    }
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (pkg.name !== project.workspaceName) {
      findings.fail(
        'workspace-name',
        `${project.key} declares workspaceName "${project.workspaceName}" but package.json says "${pkg.name}"`,
      );
    }
    if (pkg.scripts?.build === undefined) {
      findings.fail('build-script', `${project.key} workspace has no "build" script`);
    }
    if (project.buildCommand === null || project.buildCommand === undefined) {
      findings.fail('build-command', `${project.key} is deployable but declares no buildCommand`);
    } else if (project.buildCommand.length > 256) {
      // vercel.json schema validation rejects anything longer.
      findings.fail(
        'build-command-length',
        `${project.key} buildCommand is ${project.buildCommand.length} chars; Vercel caps it at 256. Move the work into scripts/vercel/build-service.sh.`,
      );
    }
    if (project.installCommand !== null && project.installCommand !== undefined && project.installCommand.length > 256) {
      findings.fail(
        'install-command-length',
        `${project.key} installCommand is ${project.installCommand.length} chars; Vercel caps it at 256.`,
      );
    }
    if (project.prismaSchema !== null && pkg.scripts?.['prisma:generate'] === undefined) {
      findings.fail('prisma-generate', `${project.key} has a Prisma schema but no "prisma:generate" script`);
    }
  }
  findings.pass('project-paths-scanned');
}

function checkGeneratedConfigs(projects, findings) {
  for (const project of projects.projects.filter((p) => p.status === 'enabled')) {
    const root = join(REPO_ROOT, project.rootDirectory);
    if (!existsSync(join(root, 'vercel.json'))) {
      findings.fail(
        'vercel-config',
        `${project.key} has no vercel.json. Run: node scripts/vercel/generate-configs.mjs`,
      );
    }
    // Next.js is served by Vercel's own builder; only Nest services need a
    // hand-off entry point.
    if (project.framework !== 'nextjs' && !existsSync(join(root, 'api', 'index.js'))) {
      findings.fail(
        'serverless-entry',
        `${project.key} has no api/index.js. Run: node scripts/vercel/generate-configs.mjs`,
      );
    }
  }
  findings.pass('vercel-configs-present');
}

function checkPortBinding(projects, findings) {
  for (const project of projects.projects.filter((p) => p.status === 'enabled')) {
    if (project.framework === 'nextjs') {
      continue;
    }
    const mainPath = join(REPO_ROOT, project.rootDirectory, 'src', 'main.ts');
    if (!existsSync(mainPath)) {
      findings.fail('port-binding', `${project.key} has no src/main.ts`);
      continue;
    }
    const contents = readFileSync(mainPath, 'utf8');
    if (!/app\.listen\(\s*process\.env\['PORT'\]/.test(contents)) {
      findings.fail(
        'port-binding',
        `${project.key} does not read process.env.PORT before its local port fallback`,
      );
    }
  }
  findings.pass('services-honour-process-env-PORT');
}

function checkHealthEndpoints(projects, findings) {
  for (const project of projects.projects.filter((p) => p.status === 'enabled')) {
    if (project.healthPath === null || project.healthPath === undefined || project.healthPath === '') {
      findings.fail('health-endpoint', `${project.key} has no healthPath and no documented exemption`);
    }
  }
  findings.pass('health-endpoints-declared');
}

function checkPrismaSchemasHaveMigrations(projects, migrations, findings) {
  const migrationServices = new Set(migrations.migrations.map((m) => m.service));
  const excluded = new Set(migrations.excluded.map((m) => m.service));

  for (const project of projects.projects) {
    if (project.status === 'not-vercel-compatible' || project.databaseType === 'none') {
      continue;
    }
    if (!migrationServices.has(project.key) && !excluded.has(project.key)) {
      findings.fail(
        'migration-entry',
        `${project.key} has databaseType "${project.databaseType}" but no entry in migrations.json`,
      );
    }
  }

  for (const migration of migrations.migrations) {
    if (migration.engine !== 'prisma') {
      continue;
    }
    const schemaPath = join(REPO_ROOT, migration.schema);
    if (!existsSync(schemaPath)) {
      findings.fail('migration-schema', `${migration.service} schema not found: ${migration.schema}`);
      continue;
    }
    const migrationsDir = join(schemaPath, '..', 'migrations');
    const actuallyHasMigrations = existsSync(migrationsDir);
    if (actuallyHasMigrations !== migration.hasMigrationsDirectory) {
      findings.fail(
        'migration-drift',
        `${migration.service} declares hasMigrationsDirectory=${migration.hasMigrationsDirectory} but the directory ${actuallyHasMigrations ? 'exists' : 'does not exist'}`,
      );
    }
    if (typeof migration.command === 'string' && migration.command.includes('migrate dev')) {
      findings.fail('migration-command', `${migration.service} uses "prisma migrate dev", which is forbidden`);
    }
    if (!actuallyHasMigrations) {
      findings.warn(
        'migration-baseline',
        `${migration.service} has no prisma/migrations directory — falling back to "db push" with no reviewable history`,
      );
    }
  }
  findings.pass('migration-manifest-consistent');
}

function checkDatabaseOwnership(projects, findings) {
  const owner = new Map();
  for (const project of projects.projects) {
    if (project.databaseVariable === null || project.databaseVariable === undefined) {
      continue;
    }
    const existing = owner.get(project.databaseVariable);
    if (existing !== undefined) {
      findings.fail(
        'database-ownership',
        `${project.databaseVariable} is claimed by both "${existing}" and "${project.key}" — services must never share a database`,
      );
      continue;
    }
    owner.set(project.databaseVariable, project.key);
  }

  // A project must not list another project's database variable in its env sets.
  for (const project of projects.projects) {
    const declared = [
      ...(project.requiredEnvironmentVariables ?? []),
      ...(project.optionalEnvironmentVariables ?? []),
    ];
    for (const variable of declared) {
      const ownerKey = owner.get(variable);
      if (ownerKey !== undefined && ownerKey !== project.key) {
        findings.fail(
          'database-ownership',
          `${project.key} declares ${variable}, which belongs to ${ownerKey}`,
        );
      }
    }
  }
  findings.pass('database-ownership-exclusive');
}

function checkServiceUrlDependencies(projects, environment, findings) {
  const derivedByName = new Map(environment.derived.map((d) => [d.name, d]));
  const byKey = new Map(projects.projects.map((p) => [p.key, p]));

  for (const project of projects.projects.filter((p) => p.status === 'enabled')) {
    for (const dependencyKey of project.dependencies ?? []) {
      const dependency = byKey.get(dependencyKey);
      if (dependency === undefined) {
        findings.fail('dependency', `${project.key} depends on unknown project "${dependencyKey}"`);
        continue;
      }
      if (dependency.status === 'not-vercel-compatible') {
        findings.fail(
          'dependency',
          `${project.key} depends on "${dependencyKey}", which is not-vercel-compatible`,
        );
        continue;
      }
      const urlVariable = dependency.serviceUrlVariable;
      const derived = derivedByName.get(urlVariable);
      if (derived === undefined) {
        findings.fail(
          'service-url',
          `${project.key} depends on ${dependencyKey} but ${urlVariable} is not declared under environment.json "derived"`,
        );
        continue;
      }
      if (!derived.appliesTo.includes(project.key)) {
        findings.fail(
          'service-url',
          `${urlVariable} is not mapped to "${project.key}" in environment.json even though ${project.key} depends on ${dependencyKey}`,
        );
      }
    }
  }
  findings.pass('service-url-dependencies-declared');
}

function checkEnvironmentDeclarations(projects, environment, findings) {
  const sharedByName = new Map(environment.shared.map((entry) => [entry.name, entry]));
  const derivedByName = new Map(environment.derived.map((entry) => [entry.name, entry]));

  for (const project of projects.projects.filter((p) => p.status === 'enabled')) {
    const perProject = new Set((environment[project.key] ?? []).map((entry) => entry.name));
    for (const variable of project.requiredEnvironmentVariables ?? []) {
      const shared = sharedByName.get(variable);
      const derived = derivedByName.get(variable);
      const declared =
        perProject.has(variable) ||
        (shared !== undefined && shared.appliesTo.includes(project.key)) ||
        (derived !== undefined && derived.appliesTo.includes(project.key));
      if (!declared) {
        findings.fail(
          'env-declaration',
          `${project.key} requires ${variable} but environment.json never maps it to that project`,
        );
      }
    }
  }

  // Secrets must never be public.
  const allEntries = [
    ...environment.shared,
    ...Object.entries(environment)
      .filter(([key]) => !['shared', 'derived', '$schema', 'version', 'description', 'conventions'].includes(key))
      .flatMap(([, value]) => (Array.isArray(value) ? value : [])),
  ];
  for (const entry of allEntries) {
    if (entry.secret === true && entry.name.startsWith('NEXT_PUBLIC_')) {
      findings.fail('secret-exposure', `${entry.name} is marked secret but uses the NEXT_PUBLIC_ prefix`);
    }
  }

  // Explicit guard for the one the brief calls out by name.
  const frontendNames = new Set((environment.frontend ?? []).map((entry) => entry.name));
  if (frontendNames.has('OLLAMA_API_KEY') || frontendNames.has('NEXT_PUBLIC_OLLAMA_API_KEY')) {
    findings.fail('secret-exposure', 'OLLAMA_API_KEY must never be assigned to the frontend project');
  }
  findings.pass('environment-declarations-complete');
}

function checkNoLocalRuntimeRequirement(projects, findings) {
  for (const project of projects.projects.filter((p) => p.status === 'enabled')) {
    for (const variable of project.requiredEnvironmentVariables ?? []) {
      if (LOCAL_RUNTIME_VARIABLES.includes(variable)) {
        findings.fail(
          'local-runtime',
          `${project.key} REQUIRES ${variable}, which points at a local-only runtime that Vercel cannot provide`,
        );
      }
    }
  }
  findings.pass('no-local-runtime-required');
}

function checkProductionValues(projects, env, target, findings) {
  if (target !== 'production') {
    findings.pass('production-url-check-skipped (target=preview)');
    return;
  }
  const urlVariables = new Set();
  for (const project of projects.projects) {
    for (const variable of [
      ...(project.requiredEnvironmentVariables ?? []),
      ...(project.optionalEnvironmentVariables ?? []),
    ]) {
      if (variable.endsWith('_URL') || variable.endsWith('_URI') || variable.endsWith('_BASE_URL')) {
        urlVariables.add(variable);
      }
    }
  }

  for (const variable of urlVariables) {
    const value = env[variable];
    if (value === undefined || value === '') {
      continue;
    }
    if (LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(value))) {
      findings.fail('localhost-in-production', `${variable} points at a localhost address in a production run`);
    }
    let host;
    try {
      host = new URL(value.includes('://') ? value : `https://${value}`).hostname;
    } catch {
      continue;
    }
    if (DOCKER_ONLY_HOSTS.includes(host)) {
      findings.fail(
        'docker-hostname-in-production',
        `${variable} resolves to the Docker-only hostname "${host}", which does not exist on Vercel`,
      );
    }
  }
  findings.pass('production-urls-scanned');
}

function checkGitignore(findings) {
  const gitignorePath = join(REPO_ROOT, '.gitignore');
  if (!existsSync(gitignorePath)) {
    findings.fail('gitignore', '.gitignore is missing');
    return;
  }
  const contents = readFileSync(gitignorePath, 'utf8');
  const lines = contents.split(/\r?\n/).map((line) => line.trim());

  if (!lines.includes('.env.vercel')) {
    findings.fail('gitignore', '.env.vercel is not gitignored — deployment secrets could be committed');
  }
  if (!lines.includes('deploy/vercel/generated/')) {
    findings.fail('gitignore', 'deploy/vercel/generated/ is not gitignored');
  }
  findings.pass('gitignore-covers-deployment-artifacts');
}

function checkNoSecretsInSource(findings) {
  const trackedTemplate = join(REPO_ROOT, '.env.vercel.example');
  if (!existsSync(trackedTemplate)) {
    findings.fail('env-template', '.env.vercel.example is missing');
    return;
  }
  const contents = readFileSync(trackedTemplate, 'utf8');
  const offenders = [];
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq);
    const value = line.slice(eq + 1).trim();
    const looksSecret = /TOKEN|SECRET|PASSWORD|KEY|_URI|_URL/i.test(key);
    // Placeholder scheme prefixes are fine; a filled-in credential is not.
    const isPlaceholder =
      value === '' || /^(https?:\/\/)?$/.test(value) || value.startsWith('<') || value.startsWith('changeme');
    if (looksSecret && !isPlaceholder) {
      offenders.push(key);
    }
  }
  if (offenders.length > 0) {
    findings.fail(
      'secrets-in-source',
      `.env.vercel.example ships non-empty values for: ${offenders.join(', ')}`,
    );
  } else {
    findings.pass('no-secrets-in-committed-templates');
  }

  const leaked = join(REPO_ROOT, '.env.vercel');
  if (existsSync(leaked)) {
    findings.warn('env-local', '.env.vercel exists locally (expected) — confirm it is never staged for commit');
  }
}

function checkRequiredValuesPresent(projects, environment, env, target, findings) {
  const sharedByName = new Map(environment.shared.map((entry) => [entry.name, entry]));
  const missing = new Set();

  for (const project of projects.projects.filter((p) => p.status === 'enabled')) {
    for (const variable of project.requiredEnvironmentVariables ?? []) {
      const shared = sharedByName.get(variable);
      if (shared !== undefined && !shared.targets.includes(target)) {
        continue;
      }
      const perProject = (environment[project.key] ?? []).find((entry) => entry.name === variable);
      if (perProject !== undefined && !perProject.targets.includes(target)) {
        continue;
      }
      if (env[variable] === undefined || env[variable] === '') {
        missing.add(`${variable} (needed by ${project.key})`);
      }
    }
  }

  if (missing.size > 0) {
    findings.warn(
      'required-values',
      `${missing.size} required value(s) are not set for target=${target}: ${[...missing].join(', ')}. ` +
        'Fill them in .env.vercel before running vercel:env:sync.',
    );
  } else {
    findings.pass('required-values-present');
  }
}

async function main() {
  const { flags } = parseArgs();
  const target = resolveTarget(flags);

  log.step(`Validating ClawAI Vercel deployment manifests (target=${target})`);

  const projects = loadProjects();
  const environment = loadEnvironmentManifest();
  const migrations = loadMigrationsManifest();
  const { values: env } = loadDeploymentEnv(flags);

  const findings = new Findings();

  checkProjectPaths(projects, findings);
  checkGeneratedConfigs(projects, findings);
  checkPortBinding(projects, findings);
  checkHealthEndpoints(projects, findings);
  checkPrismaSchemasHaveMigrations(projects, migrations, findings);
  checkDatabaseOwnership(projects, findings);
  checkServiceUrlDependencies(projects, environment, findings);
  checkEnvironmentDeclarations(projects, environment, findings);
  checkNoLocalRuntimeRequirement(projects, findings);
  checkProductionValues(projects, env, target, findings);
  checkGitignore(findings);
  checkNoSecretsInSource(findings);
  checkRequiredValuesPresent(projects, environment, env, target, findings);

  log.step('Results');
  for (const entry of findings.checks) {
    if (entry.status === 'pass') {
      log.ok(entry.check);
    } else if (entry.status === 'warn') {
      log.warn(`${entry.check} — ${entry.detail}`);
    } else {
      log.error(`${entry.check} — ${entry.detail}`);
    }
  }

  const enabled = projects.projects.filter((p) => p.status === 'enabled');
  const excluded = projects.projects.filter((p) => p.status !== 'enabled');
  log.step('Project inventory');
  log.plain(`Deployable (${enabled.length}): ${enabled.map((p) => p.key).join(', ')}`);
  for (const project of excluded) {
    log.plain(`Excluded   : ${project.key} [${project.status}]`);
  }

  writeGenerated(
    'validation-report.json',
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        target,
        errors: findings.errors,
        warnings: findings.warnings,
        checks: findings.checks,
      },
      null,
      2,
    )}\n`,
  );

  log.step('Verdict');
  if (findings.errors.length > 0) {
    log.error(`${findings.errors.length} error(s), ${findings.warnings.length} warning(s). Validation FAILED.`);
    return 1;
  }
  log.ok(`0 errors, ${findings.warnings.length} warning(s). Validation PASSED.`);
  return 0;
}

await runScript('vercel:validate', main);
