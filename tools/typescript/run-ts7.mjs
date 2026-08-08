#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packageJson = require.resolve('typescript7/package.json');
const compiler = join(dirname(packageJson), 'bin', 'tsc');
const result = spawnSync(process.execPath, [compiler, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
