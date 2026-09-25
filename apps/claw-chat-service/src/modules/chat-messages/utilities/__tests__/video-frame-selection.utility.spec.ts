// Multimodal batch 8: which moments of a video are sampled for a question.
// Deterministic — the case table below IS the contract (rule 42 item 16).

import {
  VIDEO_FRAMES_PER_TURN_MAX,
  VIDEO_FRAMES_PER_VIDEO_MAX,
} from '../../constants/video-delivery.constants';
import {
  allocateTurnFrames,
  parseQuestionTimestamps,
  pickEvenly,
  selectVideoFrameTimestamps,
} from '../video-frame-selection.utility';

describe('parseQuestionTimestamps', () => {
  it.each([
    ['what happens at 2:35?', [155_000]],
    ['what happens at 02:35?', [155_000]],
    ['look at 1:02:03 please', [3_723_000]],
    ['what is said at 95s', [95_000]],
    ['at 95 seconds', [95_000]],
    ['around 40 sec', [40_000]],
    ['around 1 minute 30', [90_000]],
    ['at 1 minute 30 seconds', [90_000]],
    ['1m30s in', [90_000]],
    ['2 min and 5 sec', [125_000]],
    ['at 2 minutes', [120_000]],
    ['the 2 minute mark', [120_000]],
    ['the 30 second mark', [30_000]],
    ['minute 4', [240_000]],
    ['second 12', [12_000]],
    ['compare 0:10 with 1:20', [10_000, 80_000]],
    // 75 is not a seconds value, so only "at 1 minute" is read.
    ['at 1 minute 75', [60_000]],
    // Arabic-Indic and Extended Arabic-Indic digits, and Arabic unit words.
    ['ماذا يحدث عند ٢:٣٥؟', [155_000]],
    ['عند ۱:۰۵', [65_000]],
    ['ماذا يقول في الدقيقة ٣', [180_000]],
    ['بعد ٤٠ ثانية', [40_000]],
  ])('reads %j', (question, expected) => {
    expect(parseQuestionTimestamps(question)).toEqual(expected);
  });

  it.each([
    ['a version number', 'is this version 2.5 of the app?'],
    ['a ratio with one-digit seconds', 'the 3:1 ratio'],
    ['an aspect ratio', 'is it 16:9 or 4:3?'],
    ['a time of day', 'the meeting at 10:30 am'],
    ['a time of day, no space', 'call me at 7:45pm'],
    ['a length, not a position', 'summarise this 5 minute video'],
    ['a bare number with a unit and no cue', 'it has 30 seconds of silence'],
    ['a word that starts with m/s after the number', 'at 5 more places, at 3 so'],
    ['plain prose', 'what is this video about?'],
  ])('ignores %s', (_label, question) => {
    expect(parseQuestionTimestamps(question)).toEqual([]);
  });

  it('accepts two documented false positives (verse, 24-hour time) — the duration bounds them', () => {
    expect(parseQuestionTimestamps('John 3:16')).toEqual([196_000]);
    expect(parseQuestionTimestamps('the 14:30 train')).toEqual([870_000]);
  });

  it('never counts one span twice', () => {
    expect(parseQuestionTimestamps('at 1 minute 30 seconds and at 2:00')).toEqual([
      90_000, 120_000,
    ]);
  });
});

describe('selectVideoFrameTimestamps', () => {
  it('clusters frames around a named time (t, t-4s, t+4s …)', () => {
    expect(selectVideoFrameTimestamps(300_000, 'what happens at 2:35?', 3)).toEqual([
      151_000, 155_000, 159_000,
    ]);
  });

  it('splits the frames between several named times', () => {
    expect(selectVideoFrameTimestamps(300_000, 'compare 0:10 and 4:00', 4)).toEqual([
      6_000, 10_000, 236_000, 240_000,
    ]);
  });

  it('clamps a cluster to the video bounds and dedupes', () => {
    expect(selectVideoFrameTimestamps(10_000, 'at 0:01', 5)).toEqual([0, 1_000, 5_000, 9_000]);
  });

  it('drops a named time past the end and falls back to uniform coverage', () => {
    expect(selectVideoFrameTimestamps(60_000, 'what happens at 5:00?', 3)).toEqual([
      500, 30_000, 59_500,
    ]);
  });

  it('covers begin, middle and end when no time is named', () => {
    const stamps = selectVideoFrameTimestamps(120_000, 'describe this video', 6);
    expect(stamps).toHaveLength(6);
    expect(stamps[0]).toBe(500);
    expect(stamps.at(-1)).toBe(119_500);
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
  });

  it('takes the middle for a single frame', () => {
    expect(selectVideoFrameTimestamps(90_000, 'describe', 1)).toEqual([45_000]);
  });

  it('dedupes a clip too short to hold distinct frames', () => {
    expect(selectVideoFrameTimestamps(300, 'describe', 6)).toEqual([300]);
  });

  it.each([
    ['zero duration', 0, 6],
    ['negative duration', -5, 6],
    ['non-finite duration', Number.NaN, 6],
    ['no frames allowed', 60_000, 0],
  ])('returns nothing for %s', (_label, duration, max) => {
    expect(selectVideoFrameTimestamps(duration, 'at 0:10', max)).toEqual([]);
  });

  it('never exceeds the per-turn cap however many are asked for', () => {
    expect(selectVideoFrameTimestamps(600_000, 'describe', 50)).toHaveLength(
      VIDEO_FRAMES_PER_TURN_MAX,
    );
  });

  it('is deterministic', () => {
    const question = 'around 1 minute 30, and 3:10';
    expect(selectVideoFrameTimestamps(400_000, question, 6)).toEqual(
      selectVideoFrameTimestamps(400_000, question, 6),
    );
  });
});

describe('allocateTurnFrames', () => {
  it('gives each video its share in order until the turn cap is spent', () => {
    expect(allocateTurnFrames(1)).toEqual([VIDEO_FRAMES_PER_VIDEO_MAX]);
    expect(allocateTurnFrames(3)).toEqual([
      VIDEO_FRAMES_PER_VIDEO_MAX,
      VIDEO_FRAMES_PER_TURN_MAX - VIDEO_FRAMES_PER_VIDEO_MAX,
      0,
    ]);
    expect(allocateTurnFrames(0)).toEqual([]);
  });
});

describe('pickEvenly', () => {
  it('keeps first and last and spreads the rest', () => {
    expect(pickEvenly([1, 2, 3, 4, 5, 6], 3)).toEqual([1, 4, 6]);
    expect(pickEvenly([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(pickEvenly([1, 2, 3], 1)).toEqual([2]);
    expect(pickEvenly([1, 2, 3], 0)).toEqual([]);
  });
});
