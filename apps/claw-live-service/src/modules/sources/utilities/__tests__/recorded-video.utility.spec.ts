import { join } from 'node:path';

import { parseRecordedProbeLine, recordedFilePath } from '../recorded-video.utility';

describe('parseRecordedProbeLine', () => {
  it.each([
    [
      'False 59.6 7708131026584734996 TikTok 576 1024',
      { durationSeconds: 60, videoId: '7708131026584734996', portrait: true },
    ],
    [
      'NA NA DgGWAcIBZ9M Instagram NA NA',
      { durationSeconds: null, videoId: 'DgGWAcIBZ9M', portrait: null },
    ],
    ['NA 120 bad/id Youtube 1920 1080', { durationSeconds: 120, videoId: null, portrait: false }],
  ])('reads %s', (line, expected) => {
    expect(parseRecordedProbeLine(`${line}\n`)).toEqual(expected);
  });

  it('refuses a live room that reports no length (Huya serves FLV, not a recorded video)', () => {
    expect(parseRecordedProbeLine('NA NA 13579 HuyaLive')).toBeNull();
    expect(parseRecordedProbeLine('NA NA DgGWAcIBZ9M Instagram')).toEqual({
      durationSeconds: null,
      videoId: 'DgGWAcIBZ9M',
      portrait: null,
    });
    expect(parseRecordedProbeLine('False 300 abc TwitchVod')).toEqual({
      durationSeconds: 300,
      videoId: 'abc',
      portrait: null,
    });
  });

  it.each(['True 0 abc', '', 'NA', 'False -3 abc', 'False nope abc'])('refuses %o', (line) => {
    expect(parseRecordedProbeLine(line)).toBeNull();
  });
});

describe('recordedFilePath', () => {
  const directory = join('tmp', 'run-1');

  it('returns the printed file only when it lies inside the run directory', () => {
    expect(recordedFilePath(`${join(directory, 'media.mkv')}\n`, directory)).toMatch(
      /media\.mkv$/u,
    );
    expect(recordedFilePath(join('etc', 'passwd'), directory)).toBeNull();
    expect(recordedFilePath(join('tmp', 'run-10', 'media.mkv'), directory)).toBeNull();
    expect(recordedFilePath('', directory)).toBeNull();
  });
});
