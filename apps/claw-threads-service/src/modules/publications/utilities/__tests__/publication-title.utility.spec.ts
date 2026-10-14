import { derivePublicationSlug, derivePublicationTitle } from '../publication-title.utility';

describe('derivePublicationTitle', () => {
  it.each([
    ['# One\n\ntext', 'One'],
    ['## Wärmepumpen im Altbau\n\ntext', 'Wärmepumpen im Altbau'],
    ['intro\n\n### Deep **title**\n', 'Deep title'],
  ])('takes the first heading of any level from %j', (markdown, title) => {
    expect(derivePublicationTitle(markdown)).toBe(title);
  });

  it('falls back to the first sentence when there is no heading', () => {
    expect(derivePublicationTitle('Heat pumps save money. They also cut CO2.')).toBe(
      'Heat pumps save money.',
    );
  });

  it('is Untitled draft only when nothing readable exists', () => {
    expect(derivePublicationTitle('  \n ')).toBe('Untitled draft');
  });
});

describe('derivePublicationSlug', () => {
  it('builds a slug from the title with a short unique part', () => {
    expect(derivePublicationSlug('Wärmepumpen im Altbau', 'abcd1234-ffff')).toBe(
      'wärmepumpen-im-altbau-abcd1234',
    );
  });

  it('keeps non-latin scripts and gives null for symbols only', () => {
    expect(derivePublicationSlug('دليل الطاقة', 'abcd1234-x')).toBe('دليل-الطاقة-abcd1234');
    expect(derivePublicationSlug('!!!', 'abcd1234-x')).toBeNull();
  });
});
