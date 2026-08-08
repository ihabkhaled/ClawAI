#!/usr/bin/env node
// Runs typecheck with TypeScript 7's native `tsc` (package "typescript7", an
// npm alias for typescript@^7.0.2) instead of the old @typescript/native-preview
// (tsgo) package, which is gone now that TS7 ships tsc natively.
//
// "typescript" (^6.0.3) stays installed alongside it because @typescript-eslint
// still caps its peer range at <6.1.0. Both packages declare a bin literally
// named `tsc`, so npm can only link one of them into node_modules/.bin — which
// one wins is undefined. We sidestep that by resolving typescript7's own
// package.json (an explicitly exported subpath) through Node's normal
// hoisting-aware resolution, then spawning its bin/tsc directly by path.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ts7PackageJson = require.resolve('typescript7/package.json');
const tsc = join(dirname(ts7PackageJson), 'bin', 'tsc');

const result = spawnSync(process.execPath, [tsc, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
