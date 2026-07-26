// Installs the Git hooks. Invoked by the root `prepare` script, which npm runs on
// every `npm install` — including inside the service Docker images.
//
// Every exit path below is a deliberate no-op rather than a failure. A failing
// `prepare` takes the whole `npm install` down with it, and there is no
// environment where "hooks could not be installed" is worth blocking an install
// for: CI does not commit, and a container has no working tree to commit from.
//
// The `prepare` script is additionally suffixed `|| exit 0` because the service
// Dockerfiles copy `package.json` without `.husky/`, so npm cannot even load this
// file there — a missing module has to be survivable too, not just a missing
// `.git`. Hook enforcement is not weakened by any of this: the hooks still run for
// every real commit, and CI re-runs the same gates.
import { existsSync } from 'node:fs';

// Skip Husky install in production, CI, and deployment environments.
if (
  process.env.NODE_ENV === 'production' ||
  process.env.CI ||
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.GITHUB_ACTIONS
) {
  process.exit(0);
}

// No .git means there are no hooks to install: a Docker build context, an
// extracted tarball, or a vendored copy. Husky throws here, which is what turned
// a plain `npm install` inside the service containers into a hard failure.
if (!existsSync('.git')) {
  process.exit(0);
}

try {
  const husky = (await import('husky')).default;
  husky();
} catch (error) {
  // husky absent (an --omit=dev install) or the hooks directory is unwritable.
  // Say so and carry on: the commit gates are enforced in CI as well, so a
  // missing local hook degrades rather than breaks.
  console.warn(
    `[husky] skipped hook installation: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(0);
}
