import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  join(process.cwd(), 'src/components/analytics/analytics-head.tsx'),
  'utf8',
);

describe('AnalyticsHead script strategy', () => {
  it('never uses beforeInteractive, which breaks hydration in the head', () => {
    // `beforeInteractive` emits an inline `(self.__next_s=...).push(...)`
    // element on the server and renders nothing on the client. The server head
    // then carries one more child than the client's, so React aligns every
    // following sibling against the wrong node — observed as this component's
    // script being reconciled against the AdSense loader tag, complete with a
    // pagead2.googlesyndication.com `src` React did not expect.
    //
    // Asserted against the source rather than a render, because the defect is
    // in what Next emits around the component, which a unit render does not
    // reproduce. A grep is a weak test; it is the right strength for a rule
    // that is exactly "this string must not appear here".
    expect(SOURCE).not.toContain('strategy="beforeInteractive"');
  });

  it('keeps every tag on afterInteractive, matching the official GTM integration', () => {
    const strategies = SOURCE.match(/strategy="(\w+)"/gu) ?? [];

    expect(strategies.length).toBeGreaterThan(0);
    expect(new Set(strategies)).toEqual(new Set(['strategy="afterInteractive"']));
  });

  it('does not reach for dangerouslySetInnerHTML to inline the snippet', () => {
    // The bootstrap must be inline, but next/script is the sanctioned way to do
    // that. Reaching for the dangerous prop here would put an injection sink in
    // the one component that renders a value read from the environment.
    // Matched as a JSX prop, not as a word: both this rule and the one above
    // are explained in the component's own comments, and a bare substring
    // search fails on the prose describing what must not be done.
    expect(SOURCE).not.toContain('dangerouslySetInnerHTML={');
  });
});
