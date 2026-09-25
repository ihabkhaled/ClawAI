import { describe, expect, it } from 'vitest';

import { SpeechJobStatus } from '../../../../common/enums';
import { SPEECH_JOB_LOCK_TTL_MS } from '../../constants/speech.constants';
import type { SpeechJobState, StoredSpeechSegment } from '../../types/speech.types';
import {
  finalSpeechStatus,
  isCancellableSpeechJob,
  isStaleSpeechJob,
  readSpeechJobState,
  toSpeechStateResponse,
  withSpeechJobState,
  withStoredSegment,
} from '../speech-job-state.utility';

const NOW = Date.parse('2026-09-25T12:00:00.000Z');

function segment(index: number): StoredSpeechSegment {
  return {
    index,
    fileId: `f${String(index)}`,
    mimeType: 'audio/wav',
    characters: 10,
    provider: 'GEMINI',
    model: 'gemini-2.5-flash-preview-tts',
  };
}

const STATE: SpeechJobState = {
  version: 2,
  status: SpeechJobStatus.GENERATING,
  contentHash: 'abc',
  generation: 2,
  startedAt: new Date(NOW - 1_000).toISOString(),
  totalSegments: 3,
  characters: 30,
  truncated: true,
  segments: [segment(0)],
  errorCode: null,
};

describe('readSpeechJobState / withSpeechJobState', () => {
  it('round-trips a version-2 state and keeps every other metadata key', () => {
    const merged = withSpeechJobState({ fileIds: ['a'], paygClamped: false }, STATE);
    expect(merged['fileIds']).toEqual(['a']);
    expect(readSpeechJobState(merged)).toEqual(STATE);
    expect(JSON.stringify(merged)).not.toContain('base64');
  });

  it('reads a version-1 value (one fileId) as a READY one-segment state', () => {
    expect(
      readSpeechJobState({
        speech: {
          fileId: 'old',
          mimeType: 'audio/mpeg',
          contentHash: 'abc',
          characters: 12,
          provider: 'OPENAI',
          model: 'tts-1',
          truncated: true,
          generation: 4,
        },
      }),
    ).toMatchObject({
      status: SpeechJobStatus.READY,
      generation: 4,
      totalSegments: 1,
      truncated: true,
      segments: [{ index: 0, fileId: 'old', mimeType: 'audio/mpeg', characters: 12 }],
    });
  });

  it.each([
    ['null metadata', null],
    ['no speech key', { other: 1 }],
    ['v1 without a fileId', { speech: { contentHash: 'abc' } }],
    ['no hash', { speech: { fileId: 'f1' } }],
    ['a string', { speech: 'f1' }],
    ['v2 with an unknown status', { speech: { ...STATE, status: 'DONE' } }],
  ])('reads nothing from %s', (_label, metadata) => {
    expect(readSpeechJobState(metadata)).toBeNull();
  });

  it('drops malformed segments rather than trusting them', () => {
    const state = readSpeechJobState({
      speech: { ...STATE, segments: [segment(0), { index: 'x' }, 'junk', { fileId: 'f' }] },
    });
    expect(state?.segments).toEqual([segment(0)]);
  });
});

describe('isStaleSpeechJob', () => {
  it('is stale only for GENERATING past the lock TTL', () => {
    const old = { ...STATE, startedAt: new Date(NOW - SPEECH_JOB_LOCK_TTL_MS - 1).toISOString() };
    expect(isStaleSpeechJob(STATE, NOW)).toBe(false);
    expect(isStaleSpeechJob(old, NOW)).toBe(true);
    expect(isStaleSpeechJob({ ...old, status: SpeechJobStatus.READY }, NOW)).toBe(false);
    expect(isStaleSpeechJob({ ...STATE, startedAt: 'garbage' }, NOW)).toBe(true);
  });
});

describe('toSpeechStateResponse — the GET/POST contract', () => {
  it('has exactly the documented keys and never provider/model/fileIds of other replies', () => {
    const body = toSpeechStateResponse(STATE, 'abc', NOW);
    expect(Object.keys(body).sort()).toEqual(
      ['errorCode', 'segments', 'status', 'totalSegments', 'truncated'].sort(),
    );
    expect(body.segments).toEqual([
      { index: 0, fileId: 'f0', mimeType: 'audio/wav', characters: 10 },
    ]);
    expect(body).toMatchObject({
      status: SpeechJobStatus.GENERATING,
      totalSegments: 3,
      truncated: true,
    });
  });

  it('says NONE for no state or a state of other text', () => {
    expect(toSpeechStateResponse(null, 'abc', NOW).status).toBe(SpeechJobStatus.NONE);
    expect(toSpeechStateResponse(STATE, 'other', NOW)).toEqual({
      status: SpeechJobStatus.NONE,
      segments: [],
      totalSegments: 0,
      truncated: false,
      errorCode: null,
    });
  });

  it('reports a stale job honestly: PARTIAL with segments, FAILED without', () => {
    const old = { ...STATE, startedAt: new Date(NOW - SPEECH_JOB_LOCK_TTL_MS - 1).toISOString() };
    expect(toSpeechStateResponse(old, 'abc', NOW)).toMatchObject({
      status: SpeechJobStatus.PARTIAL,
      errorCode: 'TTS_FAILED',
    });
    expect(toSpeechStateResponse({ ...old, segments: [] }, 'abc', NOW).status).toBe(
      SpeechJobStatus.FAILED,
    );
  });
});

describe('finalSpeechStatus / withStoredSegment', () => {
  it('is READY for all, PARTIAL for some, FAILED for none', () => {
    expect(finalSpeechStatus(3, 3)).toBe(SpeechJobStatus.READY);
    expect(finalSpeechStatus(3, 1)).toBe(SpeechJobStatus.PARTIAL);
    expect(finalSpeechStatus(3, 0)).toBe(SpeechJobStatus.FAILED);
    expect(finalSpeechStatus(0, 0)).toBe(SpeechJobStatus.FAILED);
  });

  it('keeps segments in index order whatever order they finish in, one per index', () => {
    const merged = withStoredSegment(withStoredSegment([segment(2)], segment(0)), segment(1));
    expect(merged.map((entry) => entry.index)).toEqual([0, 1, 2]);
    expect(withStoredSegment(merged, { ...segment(1), fileId: 'new' })).toHaveLength(3);
  });
});

describe('isCancellableSpeechJob — only a live job can be stopped', () => {
  it('a fresh GENERATING job can be stopped', () => {
    expect(isCancellableSpeechJob({ ...STATE, status: SpeechJobStatus.GENERATING }, NOW)).toBe(
      true,
    );
  });

  it.each([
    SpeechJobStatus.READY,
    SpeechJobStatus.PARTIAL,
    SpeechJobStatus.FAILED,
    SpeechJobStatus.CANCELLED,
  ])('%s has nothing to stop', (status) => {
    expect(isCancellableSpeechJob({ ...STATE, status }, NOW)).toBe(false);
  });

  it('a stale GENERATING job (its replica died) has nothing to stop', () => {
    const stale = {
      ...STATE,
      status: SpeechJobStatus.GENERATING,
      startedAt: new Date(NOW - SPEECH_JOB_LOCK_TTL_MS - 1).toISOString(),
    };
    expect(isCancellableSpeechJob(stale, NOW)).toBe(false);
  });
});
