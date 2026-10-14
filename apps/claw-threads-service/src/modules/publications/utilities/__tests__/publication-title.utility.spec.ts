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

describe('derivePublicationSlug keeps combining marks (every script)', () => {
  const unique = 'abcd1234-ffff';
  it.each([
    ['Hindi', 'कृत्रिम बुद्धिमत्ता और शिक्षा'],
    ['Thai', 'ปัญญาประดิษฐ์ ในการศึกษา'],
    ['Arabic with harakat', 'الذَّكَاءُ الِاصْطِنَاعِيُّ فِي التَّعْلِيمِ'],
    ['Persian', 'هوش مصنوعی در آموزش'],
    ['Hebrew with niqqud', 'בִּינָה מְלָאכוּתִית בְּחִנּוּךְ'],
    ['Tamil', 'செயற்கை நுண்ணறிவு கல்வி'],
    ['Bengali', 'কৃত্রিম বুদ্ধিমত্তা শিক্ষা'],
    ['Russian', 'Искусственный интеллект в образовании'],
  ])('%s', (_name, title) => {
    const expected = `${title.normalize('NFKC').toLowerCase().replaceAll(' ', '-')}-abcd1234`;
    expect(derivePublicationSlug(title, unique)).toBe(expected);
  });

  it('never leaves a lone hyphen between the letters of one word', () => {
    expect(derivePublicationSlug('कृत्रिम', unique)).toBe('कृत्रिम-abcd1234');
    expect(derivePublicationSlug('कृत्रिम', unique)).not.toMatch(
      /[\u0900-\u097F]-[\u0900-\u097F]/u,
    );
  });

  it('cuts a long title between characters, never inside a cluster, and stays bounded', () => {
    const title = 'कृत्रिम बुद्धिमत्ता '.repeat(20);
    const slug = derivePublicationSlug(title, unique) ?? '';
    const words = slug.slice(0, -'-abcd1234'.length);
    expect([...words].length).toBeLessThanOrEqual(60);
    expect([...slug].length).toBeLessThanOrEqual(69);
    expect(words).not.toMatch(/-$/u);
    // A cut cluster would end the text on a combining mark whose base was dropped: the kept text
    // must be a prefix of the full normalised text made of whole graphemes.
    const full = title.normalize('NFKC').toLowerCase().replaceAll(' ', '-');
    expect(full.startsWith(words)).toBe(true);
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const kept = [...segmenter.segment(words)].map(({ segment }) => segment);
    const all = [...segmenter.segment(full)].map(({ segment }) => segment);
    expect(all.slice(0, kept.length)).toEqual(kept);
  });

  it('is null for marks and symbols alone', () => {
    expect(derivePublicationSlug('\u0947\u094d !!', unique)).toBeNull();
  });
});
