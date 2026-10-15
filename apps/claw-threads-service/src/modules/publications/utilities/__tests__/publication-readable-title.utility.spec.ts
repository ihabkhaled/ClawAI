import { readablePublicationTitle } from '../publication-readable-title.utility';

describe('readablePublicationTitle', () => {
  it('keeps a real stored title', () => {
    expect(readablePublicationTitle('Photosynthesis', { markdown: '# Other' })).toBe(
      'Photosynthesis',
    );
  });

  it('derives the title from the article when the stored one is the placeholder', () => {
    expect(
      readablePublicationTitle('Untitled draft', { markdown: '# How plants make food\n\nText.' }),
    ).toBe('How plants make food');
  });

  it('derives it from the first sentence when there is no heading', () => {
    expect(
      readablePublicationTitle('Untitled draft', {
        markdown: 'Plants turn light into sugar. More.',
      }),
    ).toBe('Plants turn light into sugar.');
  });

  it('is empty, never the placeholder, when nothing readable exists', () => {
    expect(readablePublicationTitle('Untitled draft', { markdown: '   ' })).toBe('');
    expect(readablePublicationTitle('', null)).toBe('');
    expect(readablePublicationTitle('  ', 'not an object')).toBe('');
  });
});
