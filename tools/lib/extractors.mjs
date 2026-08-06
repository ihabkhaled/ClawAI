// Fact extractors for the ClawAI repository.
//
// Each function derives one dimension of the inventory from canonical files.
// Shared by tools/audit (baseline report), tools/knowledge (manifests +
// context resolver), and tools/affected (impact graph) — one extraction layer,
// never reimplemented per tool. Regexes are matched against the real file
// shapes present in this repo (verified against source, not guessed).
import {
  REPO_ROOT,
  repoPath,
  readText,
  readJson,
  listDirs,
  listFiles,
  walkFiles,
  discoverWorkspaces,
  toRel,
  fileSize,
  exists,
} from './repo.mjs';
import { verified, unverified, cmp } from './fact.mjs';
import { join } from 'node:path';

/** Classify a workspace by its dependency + path signature. */
export function classifyWorkspace(ws) {
  const deps = { ...(ws.pkg.dependencies ?? {}), ...(ws.pkg.devDependencies ?? {}) };
  if (ws.dir.startsWith('packages/')) return 'shared-package';
  if (ws.name === 'claw-frontend') return 'frontend';
  if ('@nestjs/core' in deps) return 'nestjs-service';
  return 'other';
}

/** All workspaces with type, scripts, and cross-workspace @claw/* deps. */
export function extractWorkspaces() {
  return discoverWorkspaces().map((ws) => {
    const deps = { ...(ws.pkg.dependencies ?? {}), ...(ws.pkg.devDependencies ?? {}) };
    const internalDeps = Object.keys(deps)
      .filter((d) => d.startsWith('@claw/'))
      .sort();
    return {
      name: ws.name,
      dir: ws.dir,
      type: classifyWorkspace(ws),
      scripts: Object.keys(ws.pkg.scripts ?? {}).sort(),
      internalDeps,
      source: `${ws.dir}/package.json`,
    };
  });
}

/** Service ports from the canonical shared-constants source. */
export function extractPorts() {
  const src = readText(repoPath('packages/shared-constants/src/index.ts')) ?? '';
  const out = {};
  const re = /export const ([A-Z0-9_]+_SERVICE_PORT)\s*=\s*(\d+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out[m[1]] = verified(Number(m[2]), 'packages/shared-constants/src/index.ts');
  }
  return out;
}

/** Environment variable keys from .env.example (the canonical variable catalog). */
export function extractEnvVars() {
  const src = readText(repoPath('.env.example')) ?? '';
  const keys = [];
  for (const line of src.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=/.exec(line.trim());
    if (m) keys.push(m[1]);
  }
  return [...new Set(keys)].sort().map((k) => verified(k, '.env.example'));
}

/** Prisma models per service (grep `model X {` in each schema.prisma). */
export function extractPrismaModels() {
  const out = {};
  for (const ws of discoverWorkspaces()) {
    const schema = repoPath(ws.dir, 'prisma', 'schema.prisma');
    const src = readText(schema);
    if (!src) continue;
    const models = [...src.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]).sort();
    const provider = /provider\s*=\s*"(\w+)"/.exec(src.split('datasource')[1] ?? '');
    out[ws.name] = {
      models: models.map((m) => verified(m, `${ws.dir}/prisma/schema.prisma`)),
      provider: provider ? verified(provider[1], `${ws.dir}/prisma/schema.prisma`) : null,
    };
  }
  return out;
}

/** Mongoose models (`@Schema()` decorated classes + SchemaFactory usage). */
export function extractMongooseModels() {
  const out = {};
  for (const ws of discoverWorkspaces()) {
    if (classifyWorkspace(ws) !== 'nestjs-service') continue;
    const files = walkFiles(repoPath(ws.dir, 'src'), (r) => r.endsWith('.schema.ts'));
    const models = [];
    for (const f of files) {
      const src = readText(f) ?? '';
      for (const m of src.matchAll(/export class (\w+)/g)) {
        if (/@Schema\(/.test(src)) models.push(m[1]);
      }
    }
    if (models.length > 0) {
      out[ws.name] = [...new Set(models)].sort().map((m) => verified(m, `${ws.dir}/src`));
    }
  }
  return out;
}

/** API endpoints from @Controller + method decorators, per service. */
export function extractApiEndpoints() {
  const out = {};
  for (const ws of discoverWorkspaces()) {
    if (classifyWorkspace(ws) !== 'nestjs-service') continue;
    const files = walkFiles(repoPath(ws.dir, 'src'), (r) => r.endsWith('.controller.ts'));
    const endpoints = [];
    for (const f of files) {
      const src = readText(f) ?? '';
      const rel = toRel(f);
      const base = /@Controller\(\s*['"`]([^'"`]*)['"`]/.exec(src);
      const basePath = base ? base[1] : '';
      const methodRe = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?/g;
      let m;
      while ((m = methodRe.exec(src)) !== null) {
        const sub = m[2] ?? '';
        const route = `/${[basePath, sub].filter(Boolean).join('/')}`.replace(/\/+/g, '/');
        endpoints.push({ method: m[1].toUpperCase(), route, source: rel });
      }
    }
    if (endpoints.length > 0) {
      out[ws.name] = endpoints.sort((a, b) => cmp(a.route, b.route) || cmp(a.method, b.method));
    }
  }
  return out;
}

/** RabbitMQ event patterns from the canonical EventPattern enum. */
export function extractEvents() {
  const src = readText(repoPath('packages/shared-types/src/events/event-patterns.ts')) ?? '';
  const events = [];
  for (const m of src.matchAll(/(\w+)\s*=\s*'([a-z0-9_.]+)'/g)) {
    events.push({ key: m[1], pattern: m[2] });
  }
  return events
    .sort((a, b) => cmp(a.pattern, b.pattern))
    .map((e) => ({ ...e, source: 'packages/shared-types/src/events/event-patterns.ts' }));
}

/** Permission catalog from the canonical Permission enum. */
export function extractPermissions() {
  const src = readText(repoPath('packages/shared-types/src/enums/permission.enum.ts')) ?? '';
  const perms = [...src.matchAll(/(\w+)\s*=\s*'(\w+)'/g)].map((m) => m[2]);
  return [...new Set(perms)].sort().map((p) => verified(p, 'packages/shared-types/src/enums/permission.enum.ts'));
}

/**
 * Nginx location→backend routes.
 *
 * Reads BOTH config files. The routing table lives in locations.conf because a
 * production server serves it under two certificates (mkcert internally, Let's
 * Encrypt for the public domain) and each TLS server block `include`s the same
 * file — see docs/08-runtime-devops/tls-setup.md. nginx.conf is still scanned
 * so a route added directly to a server block is not silently dropped from the
 * manifest.
 */
export function extractNginxRoutes() {
  const sources = ['infra/nginx/nginx.conf', 'infra/nginx/locations.conf'];
  const routes = [];
  for (const source of sources) {
    const src = readText(repoPath(source)) ?? '';
    const lines = src.split(/\r?\n/);
    let currentLocation = null;
    let currentBackend = null;
    for (const line of lines) {
      const loc = /location\s+([^\s{]+)/.exec(line);
      if (loc) {
        currentLocation = loc[1];
        currentBackend = null;
        continue;
      }
      const set = /set\s+\$\w+_backend\s+(https?:\/\/([a-z0-9-]+):(\d+))/.exec(line);
      if (set && currentLocation) currentBackend = { url: set[1], service: set[2], port: Number(set[3]) };
      if (/proxy_pass/.test(line) && currentLocation && currentBackend) {
        routes.push({ location: currentLocation, service: currentBackend.service, port: currentBackend.port, source });
        currentLocation = null;
      }
    }
  }
  // Dedupe identical location→service pairs (nginx repeats blocks per verb).
  const seen = new Set();
  const deduped = [];
  for (const r of routes.sort((a, b) => cmp(a.location, b.location))) {
    const key = `${r.location}|${r.service}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped;
}

/** Docker services + databases + volumes across all compose files. */
export function extractDockerServices() {
  const composeDir = repoPath('docker');
  const files = listFiles(composeDir).filter((f) => f.endsWith('.yml'));
  const services = {};
  for (const f of files) {
    const src = readText(join(composeDir, f)) ?? '';
    const lines = src.split(/\r?\n/);
    let inServices = false;
    for (const line of lines) {
      if (/^services:\s*$/.test(line)) {
        inServices = true;
        continue;
      }
      if (inServices && /^\S/.test(line) && !/^services:/.test(line)) inServices = false;
      // A service is a 2-space-indented key directly under `services:`.
      const m = /^ {2}([a-z0-9][a-z0-9-]*):\s*$/.exec(line);
      if (inServices && m) {
        const name = m[1];
        services[name] = services[name] ?? { name, files: [] };
        if (!services[name].files.includes(`docker/${f}`)) services[name].files.push(`docker/${f}`);
      }
    }
  }
  return Object.values(services)
    .map((s) => ({ ...s, files: s.files.sort() }))
    .sort((a, b) => cmp(a.name, b.name));
}

/** Frontend App Router routes (page.tsx files under src/app). */
export function extractFrontendRoutes() {
  const appDir = repoPath('apps/claw-frontend/src/app');
  if (!exists(appDir)) return [];
  const pages = walkFiles(appDir, (r) => /\/(page|layout)\.tsx$/.test(r));
  return pages
    .map((f) => {
      const rel = toRel(f);
      const route = rel
        .replace('apps/claw-frontend/src/app', '')
        .replace(/\/(page|layout)\.tsx$/, '')
        .replace(/\/\([^)]+\)/g, '') // strip route groups
        .replace(/^$/, '/');
      return { route: route || '/', file: rel, kind: rel.endsWith('layout.tsx') ? 'layout' : 'page' };
    })
    .sort((a, b) => cmp(a.file, b.file));
}

/** i18n locale files + approximate key counts + untranslated flags. */
export function extractI18n() {
  const dir = repoPath('apps/claw-frontend/src/lib/i18n/locales');
  const locales = listFiles(dir).filter((f) => f.endsWith('.ts'));
  const enSrc = readText(join(dir, 'en.ts')) ?? '';
  const countKeys = (src) => (src.match(/^\s*[\w'"[\]]+\s*:/gm) ?? []).length;
  const enKeys = countKeys(enSrc);
  return {
    locales: locales.map((l) => l.replace('.ts', '')).sort(),
    approxKeyCount: unverified(
      enKeys,
      'apps/claw-frontend/src/lib/i18n/locales/en.ts',
      'line-based key count; nested structure not fully parsed',
    ),
    localeCount: locales.length,
    source: 'apps/claw-frontend/src/lib/i18n/locales',
  };
}

/** Test file counts + runner per workspace. */
export function extractTests() {
  const out = {};
  for (const ws of discoverWorkspaces()) {
    const type = classifyWorkspace(ws);
    const src = repoPath(ws.dir);
    const specs = walkFiles(src, (r) => /\.(spec|test)\.(ts|tsx)$/.test(r) && r.startsWith(ws.dir));
    const deps = { ...(ws.pkg.dependencies ?? {}), ...(ws.pkg.devDependencies ?? {}) };
    let runner = 'unknown';
    if ('jest' in deps || 'ts-jest' in deps) runner = 'jest';
    else if ('vitest' in deps) runner = 'vitest';
    else if (type === 'frontend') runner = 'vitest';
    else if (type === 'nestjs-service') runner = 'jest';
    out[ws.name] = { testFiles: specs.length, runner };
  }
  return out;
}

/** Coverage thresholds declared in jest/vitest configs (declared, not executed). */
export function extractCoverageThresholds() {
  const out = {};
  for (const ws of discoverWorkspaces()) {
    const candidates = ['jest.config.ts', 'jest.config.js', 'vitest.config.ts', 'vitest.config.mts'];
    for (const c of candidates) {
      const src = readText(repoPath(ws.dir, c));
      if (!src) continue;
      const block = /coverageThreshold[\s\S]{0,400}?\{([\s\S]{0,300}?)\}/.exec(src);
      if (block) {
        const nums = {};
        for (const m of block[1].matchAll(/(statements|branches|functions|lines)\s*:\s*(\d+)/g)) {
          nums[m[1]] = Number(m[2]);
        }
        out[ws.name] = unverified(nums, `${ws.dir}/${c}`, 'declared threshold; not the executed coverage result');
      }
      break;
    }
  }
  return out;
}

/** Inventory of governance assets: rules, skills, docs, AI entrypoints. */
export function extractGovernance() {
  const inv = (dir, ext = '.md') =>
    listFiles(repoPath(dir))
      .filter((f) => f.endsWith(ext))
      .map((f) => ({ file: `${dir}/${f}`, bytes: fileSize(repoPath(dir, f)) }))
      .sort((a, b) => cmp(a.file, b.file));
  const rootEntrypoints = ['CLAUDE.md', 'CODEX.md', 'cursor.md', 'AGENTS.md', '.cursorrules']
    .filter((f) => exists(repoPath(f)))
    .map((f) => ({ file: f, bytes: fileSize(repoPath(f)) }));
  return {
    rules: inv('rules'),
    skills: inv('skills'),
    aiEntrypoints: rootEntrypoints,
    docCategories: listDirs(repoPath('docs')).map((d) => `docs/${d}`),
    looseDocs: inv('docs').length,
  };
}

/** Everything, assembled. Pure — safe to call from any tool. */
export function extractAll() {
  return {
    workspaces: extractWorkspaces(),
    ports: extractPorts(),
    envVars: extractEnvVars(),
    prismaModels: extractPrismaModels(),
    mongooseModels: extractMongooseModels(),
    apiEndpoints: extractApiEndpoints(),
    events: extractEvents(),
    permissions: extractPermissions(),
    nginxRoutes: extractNginxRoutes(),
    dockerServices: extractDockerServices(),
    frontendRoutes: extractFrontendRoutes(),
    i18n: extractI18n(),
    tests: extractTests(),
    coverageThresholds: extractCoverageThresholds(),
    governance: extractGovernance(),
  };
}

export { REPO_ROOT };
