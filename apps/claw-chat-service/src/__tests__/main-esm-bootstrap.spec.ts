// ESM bootstrap regression guard for src/main.ts.
//
// package.json declares "type": "module", so dist/main.js is loaded as an ES
// module. CommonJS globals (`__dirname`, `__filename`, `require`) do not exist
// there. On 2026-09-02 the production rollout of chat-service crash-looped with
//
//   ReferenceError: __dirname is not defined in ES module scope
//
// because main.ts still carried a CommonJS-era `tsconfig-paths` register
// (`baseUrl: __dirname`) left over from the tsgo migration. Path aliases are
// rewritten at build time by `tsc-alias -f`, so that register was dead code that
// only ever ran in prod. chat-service was the sole service with it, which is why
// every sibling booted and this one did not.
//
// This spec pins both facts: the entrypoint uses no CommonJS globals, and the
// runtime alias resolver is not reintroduced.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Comments are allowed to mention the banned tokens (main.ts explains WHY they
// are banned); only code is scanned.
const stripComments = (source: string): string =>
  source
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

describe('main.ts ESM bootstrap contract', () => {
  const mainSource = stripComments(readFileSync(join(process.cwd(), 'src', 'main.ts'), 'utf8'));
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
    type?: string;
    dependencies?: Record<string, string>;
  };

  it('package.json is an ES module, so the entrypoint is loaded as ESM', () => {
    expect(packageJson.type).toBe('module');
  });

  it.each(['__dirname', '__filename', 'require('])(
    'main.ts does not reference the CommonJS global %s',
    (cjsGlobal) => {
      expect(mainSource).not.toContain(cjsGlobal);
    },
  );

  it('main.ts does not register tsconfig-paths at runtime (aliases are rewritten by tsc-alias)', () => {
    expect(mainSource).not.toContain('tsconfig-paths');
    expect(mainSource).not.toContain('registerTsConfigPaths');
  });

  it('tsconfig-paths is not a runtime dependency', () => {
    expect(packageJson.dependencies?.['tsconfig-paths']).toBeUndefined();
  });
});
