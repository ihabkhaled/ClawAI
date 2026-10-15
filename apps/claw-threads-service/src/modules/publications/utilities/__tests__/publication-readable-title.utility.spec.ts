import {
  isPlaceholderTitle,
  readablePublicationTitle,
  resolvePublicationTitle,
} from '../publication-readable-title.utility';

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

describe('resolvePublicationTitle (the one title resolver)', () => {
  it('never shows the placeholder when the article has a heading or a first sentence', () => {
    expect(resolvePublicationTitle('Untitled draft', { markdown: '## Soil health\n\nBody.' })).toBe(
      'Soil health',
    );
    expect(
      resolvePublicationTitle('Untitled draft', { markdown: 'Bees pollinate crops. More.' }),
    ).toBe('Bees pollinate crops.');
  });

  it('never overwrites a real stored title', () => {
    expect(resolvePublicationTitle('Real title', { markdown: '# Other' })).toBe('Real title');
  });

  it('falls back to the stored value when nothing readable exists', () => {
    expect(resolvePublicationTitle('Untitled draft', { markdown: ' ' })).toBe('Untitled draft');
  });

  it('knows which stored titles are placeholders', () => {
    expect(isPlaceholderTitle('Untitled draft')).toBe(true);
    expect(isPlaceholderTitle(' ')).toBe(true);
    expect(isPlaceholderTitle('Real')).toBe(false);
  });
});
