import { describe, expect, it } from 'vitest';

import { prepareLegacyDraft } from '../prepare-legacy-draft.utility';

const citations = [{ evidenceId: 'efc2e342efd8b15e', url: 'https://example.com/a' }];

describe('prepareLegacyDraft', () => {
  it('turns [address, id] into [id] for a known source and drops an unknown one', () => {
    const draft = {
      markdown:
        '# T\n\nA [https://example.com/a, EFC2E342EFD8B15E] and B [https://gone.test/x, 0123456789abcdef].',
      citations,
    };
    expect(prepareLegacyDraft(draft, 'T').markdown).toBe('# T\n\nA [efc2e342efd8b15e] and B .');
  });

  it('adds the missing H1 from a real title, but never the placeholder', () => {
    const draft = { markdown: '## Part\n\nText.', citations };
    expect(prepareLegacyDraft(draft, 'Soil health').markdown).toBe(
      '# Soil health\n\n## Part\n\nText.',
    );
    expect(prepareLegacyDraft(draft, 'Untitled draft').markdown).toBe('## Part\n\nText.');
  });

  it('leaves a well-formed article untouched', () => {
    const draft = { markdown: '# T\n\nFact [efc2e342efd8b15e].', citations };
    expect(prepareLegacyDraft(draft, 'T')).toEqual(draft);
  });
});

// CodeQL js/polynomial-redos: the `[address, id]` markers are found by a linear scan.
describe('prepareLegacyDraft marker scan', () => {
  it.each([
    ['[http://example.com/a; efc2e342efd8b15e]', '[efc2e342efd8b15e]'],
    ['[x [https://example.com/a,efc2e342efd8b15e]', '[x [efc2e342efd8b15e]'],
    ['[HTTPS://Example.com/A, 0123456789abcdef]', '[efc2e342efd8b15e]'],
    ['[https://, efc2e342efd8b15e]', '[https://, efc2e342efd8b15e]'],
    ['[https://example.com/a, efc2e342]', '[efc2e342efd8b15e]'],
    ['[https://example.com/a, efc2e34]', '[https://example.com/a, efc2e34]'],
    [`[https://example.com/a, ${'a'.repeat(33)}]`, `[https://example.com/a, ${'a'.repeat(33)}]`],
  ])('rewrites %j to %j as before', (body, expected) => {
    const draft = { markdown: `# T\n\n${body}`, citations };
    expect(prepareLegacyDraft(draft, 'T').markdown).toBe(`# T\n\n${expected}`);
  });

  it.each([
    ['50,000 "[https://"', '[https://'.repeat(50_000)],
    [
      '50,000 addresses before one long blank run',
      `${'[https://a'.repeat(50_000)},${' '.repeat(50_000)}`,
    ],
  ])('stays linear on %s', (_label, body) => {
    const draft = { markdown: `# T\n\n${body}`, citations };
    const started = performance.now();
    const markdown = prepareLegacyDraft(draft, 'T').markdown;

    expect(performance.now() - started).toBeLessThan(1000);
    expect(markdown).toBe(draft.markdown);
  });
});
