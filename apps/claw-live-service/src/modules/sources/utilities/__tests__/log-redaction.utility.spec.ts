import { logSafeId, logSafeText, logSafeUrl } from '../log-redaction.utility';

describe('log redaction (share links are secrets)', () => {
  it('keeps only the host and first path segment of a link', () => {
    expect(logSafeUrl('https://drive.google.com/file/d/0ByeS4oOUV/edit?usp=sharing')).toBe(
      'drive.google.com/file/…',
    );
    expect(logSafeUrl('https://www.dropbox.com/s/abc/name.mp4?rlkey=secret&dl=0')).toBe(
      'www.dropbox.com/s/…',
    );
    expect(logSafeUrl('not a url')).toBe('/…');
  });

  it('reduces match ids and every URL inside tool output', () => {
    expect(logSafeId('drive.google.com/file/d/0ByeS4oOUV/edit')).toBe('drive.google.com/file/…');
    const text = logSafeText(
      'ERROR: [GoogleDrive] 0ByeS4: https://drive.google.com/file/d/0ByeS4/view?key=x is private',
    );
    expect(text).toBe('ERROR: [GoogleDrive] 0ByeS4: drive.google.com/file/… is private');
    expect(text).not.toContain('key=x');
  });
});
