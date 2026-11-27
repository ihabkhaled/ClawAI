import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Every service-to-service controller requires the shared INTER_SERVICE_AUTH_TOKEN
// through a CLASS-LEVEL ServiceTokenGuard. `@Public()` on these routes only lifts
// the user-JWT guard; on its own it leaves a route open to anything that can reach
// the container. nginx not routing /api/v1/internal/* is a network fact, not an
// authorisation.
//
// History: TD-035 found two auth-service internal routes with no credential at
// all. The 2026-11-27 security audit found the same in agent-service
// (seed-command queued a terminal command for any userId), chat-service
// (threads/seeded, model-authorization-metrics), connector-service (four of five
// routes) and workspace-service (internal search took any userId). Class level,
// not per route, so a route added later cannot forget it.
//
// A controller is "internal" when its @Controller path starts with `internal`
// or its file name ends with `-internal.controller.ts`.
const root = path.resolve(import.meta.dirname, '..', '..');
const appsDir = path.join(root, 'apps');
const SKIPPED_DIRS = new Set([
  'node_modules',
  'dist',
  'generated',
  '__tests__',
  'coverage',
  '.next',
]);

// Justified exceptions, keyed by repo-relative path, each with its reason. Only a
// route that must answer WITHOUT the service token belongs here (for example a
// container health probe that Docker or health-service calls with no header).
//
// Empty on purpose. The one candidate, workspace-service's
// `internal/workspace/sync/health`, is not a probe: Docker healthchecks,
// health-service and Prometheus hit `/api/v1/health` and `/api/v1/metrics`, and
// nothing called that route when it was guarded on 2026-11-27.
const ALLOW_LIST = new Map([
  // ['apps/claw-example-service/src/modules/x/controllers/probe-internal.controller.ts',
  //  'Docker healthcheck calls it with no Authorization header'],
]);

// The controllers the 2026-11-27 audit fixed: if any stops being found, the
// discovery below has broken and the test would pass vacuously.
const AUDITED_CONTROLLERS = [
  'apps/claw-agent-service/src/modules/agent/controllers/agent-terminal-internal.controller.ts',
  'apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads-internal.controller.ts',
  'apps/claw-chat-service/src/modules/chat-messages/controllers/chat-internal.controller.ts',
  'apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts',
  'apps/claw-workspace-service/src/modules/workspace/controllers/workspace-search-internal.controller.ts',
  'apps/claw-workspace-service/src/modules/workspace/controllers/sync-health-internal.controller.ts',
  'apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts',
];

// One pass, leftmost match first: a `//` comment that contains `/*` (or a string
// that contains either) is consumed whole instead of opening a fake block comment.
const COMMENTS_AND_STRINGS =
  /\/\*[\s\S]*?\*\/|\/\/.*$|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/gm;
const stripComments = (source) =>
  source.replace(COMMENTS_AND_STRINGS, (token) => (token.startsWith('/') ? '' : token));

// A run of decorators (arguments nested up to three parentheses deep) directly
// in front of `export class`: the class's own decorators, never a method's.
const ARGS = String.raw`\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)`;
const CLASS_DECORATORS = new RegExp(
  String.raw`((?:@[\w.]+\s*(?:${ARGS})?\s*)+)export\s+(?:default\s+)?(?:abstract\s+)?class\s+\w+`,
  'g',
);
const CONTROLLER_PATH = /@Controller\(\s*(?:\{[^}]*?\bpath\s*:\s*)?['"`]\/?([^'"`]*)['"`]/;

function controllerFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : controllerFiles(full);
    return entry.isFile() && entry.name.endsWith('.controller.ts') ? [full] : [];
  });
}

function internalControllers() {
  return fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(appsDir, entry.name, 'src')))
    .flatMap((entry) => controllerFiles(path.join(appsDir, entry.name, 'src')))
    .map((file) => ({
      file,
      name: path.relative(root, file).replaceAll('\\', '/'),
      source: stripComments(fs.readFileSync(file, 'utf8')),
    }))
    .filter(({ file, source }) => {
      const controllerPath = source.match(CONTROLLER_PATH)?.[1];
      return (
        controllerPath?.startsWith('internal') === true || file.endsWith('-internal.controller.ts')
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const controllers = internalControllers();
const names = controllers.map(({ name }) => name);

test('finds the internal controllers across every service', () => {
  assert.ok(controllers.length >= 40, `found ${controllers.length}`);
  const authService = names.filter((name) => name.startsWith('apps/claw-auth-service/'));
  assert.ok(authService.length >= 8, `found ${authService.length} in auth-service`);
  for (const audited of AUDITED_CONTROLLERS) {
    assert.ok(names.includes(audited), `${audited} was not discovered`);
  }
});

test('every allow-list entry is still an internal controller', () => {
  for (const [name, reason] of ALLOW_LIST) {
    assert.ok(names.includes(name), `stale allow-list entry: ${name}`);
    assert.ok(reason.length > 0, `${name} needs a reason`);
  }
});

for (const { name, source } of controllers) {
  if (ALLOW_LIST.has(name)) continue;
  test(`${name} requires the service token at class level`, () => {
    const classDecorators = [...source.matchAll(CLASS_DECORATORS)]
      .map((match) => match[1])
      .find((decorators) => decorators.includes('@Controller('));
    assert.ok(classDecorators !== undefined, 'no @Controller class found');
    assert.match(
      classDecorators,
      /@UseGuards\([^)]*\bServiceTokenGuard\b/,
      'missing class-level @UseGuards(ServiceTokenGuard); a per-route guard is not enough',
    );
    assert.match(
      source,
      /import\s*\{[^}]*\bServiceTokenGuard\b[^}]*\}\s*from\s*'[^']*guards\/service-token\.guard(?:\.js)?'/,
      "must use the service's own guards/service-token.guard",
    );
  });
}
