import { encodeGraphPath } from '../microsoft-graph-path.utility';

describe('encodeGraphPath', () => {
  it('returns empty string for empty input', () => {
    expect(encodeGraphPath('')).toBe('');
    expect(encodeGraphPath('/')).toBe('');
  });

  it('prepends leading slash if missing', () => {
    expect(encodeGraphPath('Documents/notes.txt')).toBe('/Documents/notes.txt');
  });

  it('preserves leading slash and slash separators', () => {
    expect(encodeGraphPath('/Documents/Reports/q4.pdf')).toBe('/Documents/Reports/q4.pdf');
  });

  it('encodes spaces in segments', () => {
    expect(encodeGraphPath('/My Documents/Project Notes.txt')).toBe(
      '/My%20Documents/Project%20Notes.txt',
    );
  });

  it('encodes special characters that would break Graph URLs', () => {
    expect(encodeGraphPath('/Folder/file?name.txt')).toBe('/Folder/file%3Fname.txt');
    expect(encodeGraphPath('/A&B/C#D.txt')).toBe('/A%26B/C%23D.txt');
  });

  it('preserves unicode segments via component encoding', () => {
    const out = encodeGraphPath('/مجلد/تقرير.pdf');
    expect(out.startsWith('/')).toBe(true);
    expect(out.includes('/')).toBe(true);
    expect(decodeURIComponent(out.slice(1).split('/')[0] ?? '')).toBe('مجلد');
  });

  it('handles trailing slash by leaving an empty final segment', () => {
    expect(encodeGraphPath('/Documents/')).toBe('/Documents/');
  });
});
