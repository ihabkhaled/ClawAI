import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';

/**
 * NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time.
 *
 * Setting one in .env (or compose `env_file`) reaches only the Node process:
 * the browser gets whatever literal Next substituted during `npm run build`,
 * and if the variable was absent then, that literal is `undefined` forever.
 * Restarting the container cannot fix it; only a rebuild can.
 *
 * That failure is invisible from the server side — `docker exec printenv` shows
 * the value, the container is healthy, no log line is emitted — and it shipped
 * a broken PayPal checkout: the SDK loader rejected with "PayPal client ID is
 * not configured" and users saw "We could not load the secure payment form".
 *
 * These tests make the wiring a build gate instead of a runtime surprise.
 */

const FRONTEND_SRC = new URL('../../apps/claw-frontend/src', import.meta.url);
const DOCKERFILE = new URL('../../apps/claw-frontend/Dockerfile', import.meta.url);
const PROD_COMPOSE = new URL('../../docker/docker-compose.prod.services.yml', import.meta.url);

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js'];
const PUBLIC_ENV_PATTERN = /NEXT_PUBLIC_[A-Z0-9_]+/gu;

/** Every NEXT_PUBLIC_* name the frontend source actually reads. */
async function readReferencedPublicEnvNames() {
  const root = fileURLToPath(FRONTEND_SRC);
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const names = new Set();
  for (const entry of entries) {
    if (!entry.isFile() || !SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      continue;
    }
    // parentPath is an OS path, not a URL — join it rather than building a
    // file:// URL, or this throws ERR_INVALID_URL_SCHEME on Windows.
    const contents = await readFile(join(entry.parentPath ?? root, entry.name), 'utf8');
    for (const match of contents.matchAll(PUBLIC_ENV_PATTERN)) {
      names.add(match[0]);
    }
  }
  return names;
}

// A Windows checkout has CRLF, and the block-scoping patterns below anchor on
// bare \n. Normalising keeps the same assertions passing on every OS.
async function readTextLf(url) {
  return (await readFile(url, 'utf8')).replaceAll('\r\n', '\n');
}

/** Names declared as `ARG NEXT_PUBLIC_...` in the production Dockerfile. */
async function readDockerfileBuildArgs() {
  const dockerfile = await readTextLf(DOCKERFILE);
  return new Set(
    [...dockerfile.matchAll(/^ARG\s+(NEXT_PUBLIC_[A-Z0-9_]+)/gmu)].map((match) => match[1]),
  );
}

/** Names passed under the frontend service's `build.args:` in prod compose. */
async function readComposeBuildArgs() {
  const compose = await readTextLf(PROD_COMPOSE);
  // Scope to the frontend service's args block so an env_file entry or another
  // service's variable cannot masquerade as a build arg.
  const frontendBlock = /^ {2}frontend:\n(?<body>(?: {4}.*\n|\n)*)/mu.exec(compose)?.groups?.body;
  assert.ok(frontendBlock, 'frontend service not found in docker-compose.prod.services.yml');
  const argsBlock = /^ {6}args:\n(?<args>(?: {8}.*\n|\n)*)/mu.exec(frontendBlock)?.groups?.args;
  assert.ok(argsBlock, 'frontend service declares no build args');
  return new Set([...argsBlock.matchAll(/^ {8}(NEXT_PUBLIC_[A-Z0-9_]+):/gmu)].map((m) => m[1]));
}

test('every NEXT_PUBLIC_* the client reads is declared as a Dockerfile build arg', async () => {
  const [referenced, declared] = await Promise.all([
    readReferencedPublicEnvNames(),
    readDockerfileBuildArgs(),
  ]);

  const missing = [...referenced].filter((name) => !declared.has(name)).sort();
  assert.deepEqual(
    missing,
    [],
    `apps/claw-frontend/Dockerfile is missing ARG/ENV for: ${missing.join(', ')}. ` +
      'Without it the value is `undefined` in the browser no matter what .env says.',
  );
});

test('every NEXT_PUBLIC_* the client reads is passed as a build arg in prod compose', async () => {
  const [referenced, passed] = await Promise.all([
    readReferencedPublicEnvNames(),
    readComposeBuildArgs(),
  ]);

  const missing = [...referenced].filter((name) => !passed.has(name)).sort();
  assert.deepEqual(
    missing,
    [],
    `docker/docker-compose.prod.services.yml does not pass: ${missing.join(', ')}. ` +
      'env_file only reaches the server process; the browser needs it at build time.',
  );
});

test('no server-side secret is passed through the public build-arg path', async () => {
  const passed = await readComposeBuildArgs();
  // Build args land in the client bundle and in image history, so anything
  // routed through here is published to every visitor. Names alone cannot prove
  // a value is safe, but a build arg that is not NEXT_PUBLIC_* — or that reads
  // like a credential — is categorically wrong here.
  const leaked = [...passed]
    .filter((name) => /SECRET|PASSWORD|PRIVATE|TOKEN|_KEY$/u.test(name))
    .sort();
  assert.deepEqual(leaked, [], `secret-looking build arg(s) exposed to the client: ${leaked}`);
});
