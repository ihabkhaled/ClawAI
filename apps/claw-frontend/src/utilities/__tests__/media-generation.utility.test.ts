import { describe, expect, it } from 'vitest';

import { AudioGenerationStatus } from '@/enums/audio-generation-status.enum';

import {
  formatAudioDuration,
  getAudioDownloadFilename,
  getAudioStatusLabelKey,
  isInProgressAudioStatus,
  readLaneMediaGenerations,
  readMediaGenerations,
  toDisplayedAudioRow,
} from '../media-generation.utility';

describe('readMediaGenerations', () => {
  it('reads the cards a chat model made with a media tool', () => {
    expect(
      readMediaGenerations({
        mediaGenerations: [
          { kind: 'image', id: 'g1', status: 'completed', prompt: 'a fox' },
          { kind: 'video', id: 'v1', status: 'in_progress', prompt: 'waves' },
        ],
      }),
    ).toEqual([
      { kind: 'image', id: 'g1', prompt: 'a fox' },
      { kind: 'video', id: 'v1', prompt: 'waves' },
    ]);
  });

  it('keeps a stored audio entry, so a thread reload shows the audio card', () => {
    expect(
      readMediaGenerations({ mediaGenerations: [{ kind: 'audio', id: 'a1', prompt: 'hello' }] }),
    ).toEqual([{ kind: 'audio', id: 'a1', prompt: 'hello' }]);
  });

  it('drops anything malformed instead of throwing', () => {
    expect(readMediaGenerations(null)).toEqual([]);
    expect(readMediaGenerations({ mediaGenerations: 'x' })).toEqual([]);
    expect(
      readMediaGenerations({
        mediaGenerations: [
          null,
          { kind: 'gif', id: 'x' },
          { kind: 'image' },
          { kind: 'image', id: '' },
        ],
      }),
    ).toEqual([]);
  });
});

describe('audio helpers', () => {
  const base = { provider: 'p', model: 'm', kind: 'SPEECH', supersededById: null, asset: null };

  it('formats a length and rejects a missing one', () => {
    expect(formatAudioDuration(65)).toBe('1:05');
    expect(formatAudioDuration(undefined)).toBeNull();
    expect(formatAudioDuration(0)).toBeNull();
  });

  it('names the download after the format', () => {
    expect(getAudioDownloadFilename('audio/wav')).toBe('claw-audio.wav');
    expect(getAudioDownloadFilename('audio/mpeg; codecs=x')).toBe('claw-audio.mp3');
    expect(getAudioDownloadFilename(undefined)).toBe('claw-audio');
  });

  it('knows in-progress statuses and has a label for each', () => {
    expect(isInProgressAudioStatus(AudioGenerationStatus.RUNNING)).toBe(true);
    expect(isInProgressAudioStatus(AudioGenerationStatus.FAILED)).toBe(false);
    expect(getAudioStatusLabelKey()).toBe('mediaUi.audio.preparing');
    expect(getAudioStatusLabelKey(AudioGenerationStatus.TIMED_OUT)).toBe('mediaUi.audio.timedOut');
  });

  it('shows the head of the retry chain', () => {
    const head = { ...base, id: 'b', status: AudioGenerationStatus.RUNNING };
    const failed = { ...base, id: 'a', status: AudioGenerationStatus.FAILED };
    expect(toDisplayedAudioRow({ ...failed, latest: head })).toBe(head);
    expect(toDisplayedAudioRow(failed).id).toBe('a');
  });
});

describe('readLaneMediaGenerations', () => {
  it('prefers the lane result and falls back to the stored message metadata', () => {
    const card = { kind: 'video', id: 'v1', prompt: 'p' };
    expect(readLaneMediaGenerations({ mediaGenerations: [card] })).toEqual([card]);
    expect(
      readLaneMediaGenerations({ message: { metadata: { mediaGenerations: [card] } } }),
    ).toEqual([card]);
    expect(readLaneMediaGenerations({})).toEqual([]);
  });
});
