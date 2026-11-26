import {
  formatReportTranscript,
  formatVideoClock,
  momentsInWindow,
  parseVideoClock,
  renderReportBody,
  reportWindows,
} from '../video-report.utility';

const ORIGIN = 1_700_000_000_000;
const line = (seconds: number, text: string) => ({
  id: `l${String(seconds)}`,
  seq: seconds,
  startAt: ORIGIN + seconds * 1000,
  endAt: ORIGIN + seconds * 1000 + 5000,
  text,
  language: 'en',
});

describe('video clock', () => {
  it.each([
    [0, '0:00'],
    [44, '0:44'],
    [605, '10:05'],
    [3723, '1:02:03'],
  ])('%i s reads %s and back', (seconds, clock) => {
    expect(formatVideoClock(seconds)).toBe(clock);
    expect(parseVideoClock(clock)).toBe(seconds);
  });

  it.each(['', '44', '0:61', '1:75:00', 'a:bc', '1:2:3:4', '0:4x'])('refuses %j', (value) => {
    expect(parseVideoClock(value)).toBeNull();
  });
});

describe('report windows and moments', () => {
  it('cuts the transcript into 5-minute parts of video time, skipping empty parts', () => {
    const windows = reportWindows(
      [line(5, 'a'), line(290, 'b'), line(310, 'c'), line(950, 'd')],
      ORIGIN,
      300_000,
    );
    expect(windows.map((window) => [window.fromSeconds, window.lines.length])).toEqual([
      [0, 2],
      [300, 1],
      [900, 1],
    ]);
    expect(formatReportTranscript(windows[1]?.lines ?? [], ORIGIN)).toBe('[5:10-5:15] c');
    // A part ends where its last speech ends (950 s + 5 s), never at the 5-minute mark past the video.
    expect(windows.map((window) => window.toSeconds)).toEqual([295, 315, 955]);
  });

  it('keeps moments inside the part, in order, one per second, with readable times only', () => {
    const moments = momentsInWindow(
      [
        { at: '0:20', text: 'second' },
        { at: '0:10', text: 'first' },
        { at: '0:10', text: 'duplicate' },
        { at: '9:99', text: 'bad clock' },
        { at: '6:00', text: 'outside' },
      ],
      { fromSeconds: 0, toSeconds: 300 },
    );
    expect(moments).toEqual([
      { atSeconds: 10, text: 'first' },
      { atSeconds: 20, text: 'second' },
    ]);
  });
});

describe('renderReportBody', () => {
  const content = {
    summary: 'A cooking video.',
    chapters: [{ atSeconds: 0, text: 'Intro' }],
    moments: [
      { atSeconds: 0, text: 'The host says hello.' },
      { atSeconds: 44, text: 'She cracks two eggs.' },
    ],
    quotes: [{ atSeconds: 44, text: 'Never skip the salt' }],
  };

  it('writes summary, chapters, moment by moment and quotes in the viewer language', () => {
    expect(renderReportBody(content, 'en')).toBe(
      [
        'Summary\nA cooking video.',
        'Chapters\n0:00 Intro',
        'Moment by moment\n0:00 — The host says hello.\n0:44 — She cracks two eggs.',
        'Key quotes\n0:44 “Never skip the salt”',
      ].join('\n\n'),
    );
    expect(renderReportBody(content, 'ar-EG').startsWith('الملخص')).toBe(true);
    expect(renderReportBody(content, 'xx').startsWith('Summary')).toBe(true);
  });

  it('leaves out empty chapters and quotes', () => {
    const body = renderReportBody({ ...content, chapters: [], quotes: [] }, 'fr');
    expect(body).toContain('Moment par moment');
    expect(body).not.toContain('Chapitres');
    expect(body).not.toContain('Citations');
  });
});
