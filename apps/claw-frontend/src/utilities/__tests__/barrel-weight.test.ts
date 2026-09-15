import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

// The marketing content clusters hold ~2.7 MB of long-form prose across 13
// languages. Re-exporting anything that reaches them from a barrel a CLIENT
// component imports ships all of it to the browser: that is exactly how the
// homepage came to load a 1,364 KiB chunk whose evaluation was 91% of mobile
// LCP, and it cost 27 Lighthouse points.
//
// These are source-level assertions because the defect is an import EDGE. No
// render test can see it, and by the time a bundle analyzer would, it has
// already shipped.
const FORBIDDEN_IN_CLIENT_BARRELS = [
  './content-registry.utility',
  './public-comparison.utility',
  './route-visibility.utility',
];

describe('the @/utilities barrel', () => {
  it.each(FORBIDDEN_IN_CLIENT_BARRELS)('never re-exports %s', (module) => {
    expect(read('src/utilities/index.ts')).not.toContain(`from '${module}'`);
  });

  it('still exports the small helpers client components rely on', () => {
    const source = read('src/utilities/index.ts');
    for (const name of ['logger', 'resolveChatLimitNotice', 'getConfiguredSocialLinks']) {
      expect(source).toContain(name);
    }
  });
});

describe('the @/constants barrel', () => {
  it('never re-exports the content registry', () => {
    // It imports every cluster's SEO constants, and each of those derives its
    // titles from that cluster's full body copy.
    expect(read('src/constants/index.ts')).not.toContain("from './content-registry.constants'");
  });

  it('still exports what client components rely on', () => {
    const source = read('src/constants/index.ts');
    for (const name of ['ROUTES', 'APP_VERSION']) {
      expect(source).toContain(name);
    }
  });
});
