import { logSafeId, logSafeUrl, ytdlpErrorCategory } from '../log-redaction.utility';

describe('log redaction (share links and ids are secrets)', () => {
  it('keeps only the host of a link', () => {
    expect(logSafeUrl('https://drive.google.com/file/d/0ByeS4oOUV/edit?usp=sharing')).toBe(
      'drive.google.com/…',
    );
    expect(logSafeUrl('https://imgur.com/A61SaA1')).toBe('imgur.com/…');
    expect(logSafeUrl('not a url')).toBe('/…');
  });

  it('keeps only the head of a match id', () => {
    expect(logSafeId('drive.google.com/file/d/0ByeS4oOUV/edit')).toBe('drive.google.com/…');
    expect(logSafeId('video:7712514899993971462')).toBe('video/…');
    expect(logSafeId('xqc')).toBe('xqc/…');
  });

  it('turns yt-dlp error text into a fixed category, never the text', () => {
    expect(ytdlpErrorCategory("ERROR: [youtube] abc: Sign in to confirm you're not a bot")).toBe(
      'bot-check',
    );
    expect(ytdlpErrorCategory('ERROR: [chzzk:live] 22ab: The channel is not currently live')).toBe(
      'not-live',
    );
    expect(
      ytdlpErrorCategory(
        '[RaiPlayLive] rai1: not available from your location due to geo restriction',
      ),
    ).toBe('geo-blocked');
    expect(ytdlpErrorCategory('ERROR: No suitable extractor found for URL https://x.y/z')).toBe(
      'no-extractor',
    );
    expect(ytdlpErrorCategory('')).toBe('other');
  });
});
