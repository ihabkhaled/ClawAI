#!/usr/bin/env node
// Prisma's generated client under src/generated/prisma is plain JS that tsc
// never compiles (allowJs is off) — it is copied into dist/generated/prisma
// as-is. Under CommonJS this copy could run at container-build time, well
// after `npm run build`, because `require('../generated/prisma')` resolves an
// extensionless directory import fine either way. Node's ESM loader has no
// such fallback, so tsc-alias's `-f` pass (which adds the .js/`/index.js`
// extension by checking what exists on disk) needs dist/generated/prisma to
// already exist WHEN IT RUNS — this script is that copy, run between the
// TypeScript compile and the tsc-alias pass in every Prisma-backed service's
// build script.
import { cpSync, existsSync } from 'node:fs';

const source = 'src/generated';
const destination = 'dist/generated';

if (existsSync(source)) {
  cpSync(source, destination, { recursive: true });
}
