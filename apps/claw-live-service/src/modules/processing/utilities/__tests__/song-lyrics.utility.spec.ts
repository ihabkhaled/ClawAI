import { isSungLine, lyricResearchQuery, withoutSungMarks } from '../song-lyrics.utility';

const line = (text: string) => ({ id: 'l', seq: 0, startAt: 0, endAt: 1, text, language: null });

describe('song lyrics', () => {
  it('reads a leading note sign as a sung line', () => {
    expect(isSungLine('  ♪ انا بموت')).toBe(true);
    expect(isSungLine('I am dying to see it')).toBe(false);
    expect(withoutSungMarks('♪ la la ♪')).toBe('la la');
  });

  it('searches the longest sung line with the word lyrics in the spoken language', () => {
    const window = [line('♪ انا بموت'), line('hello'), line('♪ انا بموت فيك يا حبيبي')];
    expect(lyricResearchQuery(window, 'ar-EG')).toBe('انا بموت فيك يا حبيبي كلمات');
    expect(lyricResearchQuery([line('♪ never gonna stop')], null)).toBe('never gonna stop lyrics');
  });

  it('keeps at most 8 words and returns nothing when no line is sung', () => {
    expect(lyricResearchQuery([line('♪ one two three four five six seven eight nine')], 'en')).toBe(
      'one two three four five six seven eight lyrics',
    );
    expect(lyricResearchQuery([line('just talking'), line('♪ ♪')], 'en')).toBe('');
  });
});
