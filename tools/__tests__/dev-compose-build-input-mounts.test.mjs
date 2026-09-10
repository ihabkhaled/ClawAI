// A dev container recompiles the source it mounts. If the COMPILER CONFIG and
// the BUILD SCRIPTS come from the image instead of the working tree, it
// compiles today's source with an old config — and says so in a language that
// looks nothing like config drift.
//
// On 2026-09-10 that had killed three services. The repo moved every workspace
// to `moduleResolution: "bundler"`; services whose images predated the change
// kept compiling extensionless relative imports under `Node16`, where they are
// illegal, and reported `TS2307: Cannot find module '../../../common/enums/…'`
// on imports that plainly existed. research-service had been down 22 hours, so
// `/research/*` returned 502 and every web search and fetch in chat silently
// did nothing. ollama-service and llamacpp-service were dead beside it. Nothing
// in the code was wrong.
//
// The general rule this enforces: if a dev container derives something from the
// working tree, mount everything that derivation reads.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const COMPOSE = repoPath('docker/docker-compose.dev.services.yml');
const TOOLS_MOUNT = '- ../tools:/app/tools:ro';

/** Services that mount their own `src`, i.e. the ones that recompile in place. */
function servicesMountingSource(compose) {
  const names = new Set();
  const pattern = /- \.\.\/apps\/(claw-[a-z0-9-]+)\/src:/g;
  let match = pattern.exec(compose);
  while (match !== null) {
    names.add(match[1]);
    match = pattern.exec(compose);
  }
  return [...names];
}

test('every dev service that mounts src also mounts its TypeScript config', () => {
  const compose = readFileSync(COMPOSE, 'utf8');
  const missing = [];

  for (const service of servicesMountingSource(compose)) {
    for (const config of ['tsconfig.json', 'tsconfig.build.json']) {
      // Only require what the workspace actually has: the frontend has no
      // tsconfig.build.json, and demanding one would mount a path that does
      // not exist and fail the container at start.
      if (!existsSync(repoPath(`apps/${service}/${config}`))) {
        continue;
      }
      const mount = `- ../apps/${service}/${config}:/app/apps/${service}/${config}:ro`;
      if (!compose.includes(mount)) {
        missing.push(`${service} → ${config}`);
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    `Dev services recompile mounted source. These mount src but take their build ` +
      `config from the image, so they will compile new source with an old config:\n  ` +
      missing.join('\n  '),
  );
});

test('every dev service that mounts src also mounts the shared tools directory', () => {
  const compose = readFileSync(COMPOSE, 'utf8');
  // The build command runs `node ../../tools/typescript/run-ts7.mjs` and
  // `copy-generated-prisma.mjs`. The second was added after several images were
  // built, so those containers died on `Cannot find module
  // '/app/tools/typescript/copy-generated-prisma.mjs'` — the SECOND failure
  // hiding behind the first.
  const services = servicesMountingSource(compose);
  const toolsMounts = compose.split(TOOLS_MOUNT).length - 1;

  assert.ok(
    toolsMounts >= services.length,
    `${services.length} dev services mount src but only ${toolsMounts} mount ../tools. ` +
      `A build script added to tools/ after an image was built is invisible to that container.`,
  );
});

test('the build scripts the dev build command invokes actually exist', () => {
  // The mount is worthless if it points at a directory missing the scripts.
  for (const script of ['run-ts7.mjs', 'copy-generated-prisma.mjs']) {
    assert.ok(
      existsSync(repoPath(`tools/typescript/${script}`)),
      `tools/typescript/${script} is referenced by every service build command and is missing.`,
    );
  }
});
