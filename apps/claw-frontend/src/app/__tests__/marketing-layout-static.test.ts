import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relative: string): string => readFileSync(resolve(__dirname, relative), 'utf8');

// The marketing pages are public and statically renderable. The session is
// read in the navbar, in the browser, after hydration - never on the server.
describe('the marketing layout stays session-free', () => {
  const layout = read('../(marketing)/layout.tsx');

  it('does not read cookies or the auth store, and does not redirect', () => {
    expect(layout).not.toMatch(/cookies\s*\(/u);
    expect(layout).not.toContain('auth.store');
    expect(layout).not.toContain('use-is-signed-in');
    expect(layout).not.toMatch(/redirect\s*\(/u);
  });

  it('loads the feedback dialog lazily', () => {
    const reporter = read('../../components/marketing/marketing-feedback-reporter.tsx');

    expect(reporter).toContain('dynamic(');
    expect(reporter).not.toMatch(/^import .*feedback-reporter/mu);
  });
});
