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
