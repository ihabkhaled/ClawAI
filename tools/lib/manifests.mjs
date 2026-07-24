// Manifest builder. Transforms the shared extraction layer into the committed
// `.ai/manifests/*.json` set. Every manifest is derived — never hand-edited —
// so `knowledge:check` can prove they are reproducible from source.
import { extractAll } from './extractors.mjs';
import { readText, repoPath, walkFiles } from './repo.mjs';
import { cmp } from './fact.mjs';

/**
 * Build the full manifest set as a { name -> object } map. Only manifests that
 * can be derived reliably are produced; inferred relationships are tagged
 * (confidence) rather than asserted.
 */
export function buildManifests() {
  const inv = extractAll();
  const services = inv.workspaces.filter((w) => w.type === 'nestjs-service');
  const packages = inv.workspaces.filter((w) => w.type === 'shared-package');

  const repository = {
    name: 'ClawAI',
    workspaceCount: inv.workspaces.length,
    serviceCount: services.length,
    sharedPackageCount: packages.length,
    frontend: 'claw-frontend',
    eventExchange: 'claw.events',
    apiPrefix: '/api/v1',
    reverseProxy: 'nginx',
  };

  // Per-service catalog joining ports, endpoints, models, events-by-owner.
  const serviceCatalog = services.map((ws) => {
    const short = ws.name.replace(/^claw-/, '').replace(/-service$/, '').replace(/-/g, '_').toUpperCase();
    const portKey = `${short}_SERVICE_PORT`;
    const prisma = inv.prismaModels[ws.name];
    return {
      name: ws.name,
      dir: ws.dir,
      port: inv.ports[portKey]?.value ?? null,
      portSource: inv.ports[portKey] ? 'shared-constants' : 'env-only (no constant)',
      database: prisma?.provider?.value ?? (inv.mongooseModels[ws.name] ? 'mongodb' : 'none'),
      prismaModels: (prisma?.models ?? []).map((m) => m.value),
      mongooseModels: (inv.mongooseModels[ws.name] ?? []).map((m) => m.value),
      endpointCount: (inv.apiEndpoints[ws.name] ?? []).length,
      internalDeps: ws.internalDeps,
      testFiles: inv.tests[ws.name]?.testFiles ?? 0,
      testRunner: inv.tests[ws.name]?.runner ?? 'unknown',
    };
  });

  return {
    repository,
    workspaces: { workspaces: inv.workspaces },
    services: { services: serviceCatalog },
    packages: {
      packages: packages.map((p) => ({ name: p.name, dir: p.dir, internalDeps: p.internalDeps })),
    },
    'api-endpoints': { byService: inv.apiEndpoints, total: sumEndpoints(inv.apiEndpoints) },
    'rabbitmq-events': { exchange: 'claw.events', events: inv.events },
    permissions: { permissions: inv.permissions.map((p) => p.value) },
    'environment-variables': { variables: inv.envVars.map((v) => v.value) },
    ports: {
      ports: Object.fromEntries(Object.entries(inv.ports).map(([k, v]) => [k, v.value])),
    },
    'nginx-routes': { routes: inv.nginxRoutes },
    'docker-services': { services: inv.dockerServices },
    'frontend-routes': { routes: inv.frontendRoutes.filter((r) => r.kind === 'page') },
    'prisma-models': { byService: mapPrisma(inv.prismaModels) },
    i18n: { locales: inv.i18n.locales, approxKeyCount: inv.i18n.approxKeyCount.value },
    tests: { byWorkspace: inv.tests, total: sumTests(inv.tests) },
    governance: inv.governance,
    'data-ownership': {
      note: 'Each service owns its data — cross-service access is HTTP or RabbitMQ only.',
      byService: serviceCatalog
        .filter((s) => s.database !== 'none')
        .map((s) => ({
          service: s.name,
          database: s.database,
          prismaModels: s.prismaModels,
          mongooseModels: s.mongooseModels,
        })),
    },
    'workspace-dependency-graph': { edges: workspaceEdges(inv.workspaces) },
    'event-graph': buildEventGraph(inv),
  };
}

function sumEndpoints(byService) {
  return Object.values(byService).reduce((n, e) => n + e.length, 0);
}
function sumTests(byWs) {
  return Object.values(byWs).reduce((n, t) => n + t.testFiles, 0);
}
function mapPrisma(prisma) {
  const out = {};
  for (const [k, v] of Object.entries(prisma)) out[k] = (v.models ?? []).map((m) => m.value);
  return out;
}
function workspaceEdges(workspaces) {
  const edges = [];
  for (const ws of workspaces) {
    for (const dep of ws.internalDeps) edges.push({ from: ws.name, to: dep });
  }
  return edges.sort((a, b) => cmp(a.from, b.from) || cmp(a.to, b.to));
}

/**
 * Event producer/consumer graph. Producers/consumers are inferred by scanning
 * each service's src for the EventPattern enum key, so they are heuristic — the
 * manifest marks the inference method explicitly.
 */
function buildEventGraph(inv) {
  const services = inv.workspaces.filter((w) => w.type === 'nestjs-service');
  const usage = {};
  for (const e of inv.events) usage[e.pattern] = { key: e.key, producers: [], consumers: [] };
  // Lightweight scan: look for `EventPattern.<KEY>` and publish/subscribe verbs.
  for (const ws of services) {
    const files = scanServiceText(ws.dir);
    for (const e of inv.events) {
      const token = `EventPattern.${e.key}`;
      if (!files.includes(token)) continue;
      const publishes = new RegExp(`publish[^;]{0,80}${e.key}|${e.key}[^;]{0,80}publish`).test(files);
      if (publishes) usage[e.pattern].producers.push(ws.name);
      else usage[e.pattern].consumers.push(ws.name);
    }
  }
  return {
    inferenceMethod: 'heuristic: EventPattern.<KEY> token + publish-verb proximity; confidence=unverified',
    events: Object.entries(usage)
      .map(([pattern, v]) => ({
        pattern,
        key: v.key,
        producers: [...new Set(v.producers)].sort(),
        consumers: [...new Set(v.consumers)].sort(),
      }))
      .sort((a, b) => cmp(a.pattern, b.pattern)),
  };
}

function scanServiceText(dir) {
  // Concatenate a bounded set of src text for token scanning. Kept simple and
  // deterministic; heavy files skipped by the walker's default ignore set.
  const files = walkFiles(repoPath(dir, 'src'), (r) => /\.ts$/.test(r) && !/\.spec\.ts$/.test(r));
  let out = '';
  for (const f of files) out += `${readText(f) ?? ''}\n`;
  return out;
}
