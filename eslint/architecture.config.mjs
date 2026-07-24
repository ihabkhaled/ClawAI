// Central architecture policy — the SINGLE source of truth for ClawAI's layer,
// workspace, and package-ownership conventions. Both the ESLint architecture
// plugin and (where useful) the knowledge tooling read these definitions so the
// same conventions are never defined twice.

/** Glob roots for each workspace class. */
export const WORKSPACE_PATTERNS = {
  services: 'apps/claw-*-service',
  frontend: 'apps/claw-frontend',
  packages: 'packages/*',
};

/** Backend layer detection by file suffix. Order matters (most specific first). */
export const BACKEND_LAYERS = [
  { layer: 'controller', suffix: '.controller.ts' },
  { layer: 'service', suffix: '.service.ts' },
  { layer: 'manager', suffix: '.manager.ts' },
  { layer: 'repository', suffix: '.repository.ts' },
  { layer: 'adapter', suffix: '.adapter.ts' },
  { layer: 'guard', suffix: '.guard.ts' },
  { layer: 'utility', suffix: '.utility.ts' },
  { layer: 'dto', suffix: '.dto.ts' },
];

/**
 * Allowed downward dependency direction for the backend. A layer may import
 * from itself and any layer listed as allowed; upward imports are violations.
 */
export const BACKEND_LAYER_POLICY = {
  controller: ['service', 'manager', 'dto', 'guard', 'utility'],
  manager: ['service', 'repository', 'adapter', 'utility', 'dto'],
  service: ['repository', 'adapter', 'utility', 'dto'], // NOT manager, NOT controller
  repository: ['adapter', 'utility'],
  adapter: ['utility'],
};

/** Third-party package → single owning layer/location. Business code imports facades. */
export const PACKAGE_OWNERSHIP = {
  '@prisma/client': 'repository',
  prisma: 'repository',
  mongoose: 'repository',
  amqplib: 'packages/shared-rabbitmq',
  ioredis: 'cache-adapter',
  axios: 'http-adapter',
  '@tanstack/react-query': 'frontend/repositories',
  zustand: 'frontend/stores',
  zod: 'dto/validation',
};

/** Files where `process.env` is permitted (config layer only). */
export const CONFIG_FILE_PATTERNS = [/config/i, /\.config\./, /main\.ts$/, /app\.config\.ts$/];

/** Soft/hard file-size budgets (lines). Hard = error target once adopted. */
export const FILE_SIZE_BUDGETS = {
  serviceMethodLines: 50,
  managerMethodLines: 80,
  serviceFileLines: 500,
  utilityFileLines: 300,
};

/** Detect the backend layer of a filename, or null. */
export function detectLayer(filename) {
  const norm = filename.replace(/\\/g, '/');
  for (const { layer, suffix } of BACKEND_LAYERS) {
    if (norm.endsWith(suffix)) return layer;
  }
  return null;
}

/** Detect which service a file belongs to (claw-X-service), or null. */
export function detectService(filename) {
  const m = /apps\/(claw-[a-z0-9-]+-service)\//.exec(filename.replace(/\\/g, '/'));
  return m ? m[1] : null;
}
