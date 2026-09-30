import { describe, expect, it } from 'vitest';

import { VIDEO_STATUS_LABEL_KEYS } from '@/constants/video-generation-status.constants';
import { VideoGenerationStatus } from '@/enums/video-generation-status.enum';
import type { VideoGeneration, VideoGenerationRow } from '@/types/video-generation.types';
import {
  getSupersedingVideoGenerationId,
  getVideoStatusLabelKey,
  isInProgressVideoStatus,
  isTerminalVideoStatus,
  isVideoOutputModel,
  toLatestVideoGeneration,
} from '@/utilities/video-generation.utility';

const row = (overrides: Partial<VideoGenerationRow> = {}): VideoGenerationRow => ({
  id: 'vid-1',
  status: VideoGenerationStatus.FAILED,
  provider: 'VIDEO_GEMINI',
  model: 'veo-3.1-fast-generate-preview',
  prompt: 'a fox',
  durationSeconds: 4,
  aspectRatio: '16:9',
  errorCode: 'PROVIDER_ERROR',
  errorMessage: 'boom',
  createdAt: '2026-09-30T00:00:00Z',
  completedAt: null,
  supersededById: null,
  isAutoMode: true,
  asset: null,
  ...overrides,
});

describe('video status helpers', () => {
  it('has a label key for every status and a preparing key without one', () => {
    for (const status of Object.values(VideoGenerationStatus)) {
      expect(getVideoStatusLabelKey(status)).toBe(VIDEO_STATUS_LABEL_KEYS[status]);
    }
    expect(getVideoStatusLabelKey()).toBe('mediaUi.videoStatus.preparing');
  });

  it('splits every status into exactly one of in-progress or terminal', () => {
    for (const status of Object.values(VideoGenerationStatus)) {
      expect(isTerminalVideoStatus(status)).toBe(!isInProgressVideoStatus(status));
    }
    expect(isTerminalVideoStatus(VideoGenerationStatus.TIMED_OUT)).toBe(true);
    expect(isInProgressVideoStatus(VideoGenerationStatus.FINALIZING)).toBe(true);
  });
});

describe('supersession helpers', () => {
  it('reports the successor only when latest is a different row', () => {
    expect(getSupersedingVideoGenerationId({ ...row(), latest: row() })).toBeUndefined();
    expect(getSupersedingVideoGenerationId(row())).toBeUndefined();
    expect(getSupersedingVideoGenerationId({ ...row(), latest: row({ id: 'vid-2' }) })).toBe(
      'vid-2',
    );
  });

  it('presents the chain head while keeping the asked-for prompt', () => {
    const asset = { id: 'a', url: '/u', downloadUrl: '/d', mimeType: 'video/mp4', sizeBytes: 1 };
    const source: VideoGeneration = {
      ...row({ prompt: 'the original' }),
      latest: row({
        id: 'vid-2',
        status: VideoGenerationStatus.COMPLETED,
        provider: 'VIDEO_GROK',
        asset,
        prompt: 'other',
      }),
    };
    const head = toLatestVideoGeneration(source);
    expect(head.id).toBe('vid-2');
    expect(head.status).toBe(VideoGenerationStatus.COMPLETED);
    expect(head.provider).toBe('VIDEO_GROK');
    expect(head.asset).toEqual(asset);
    expect(head.prompt).toBe('the original');
    expect(head.latest).toBeNull();
  });

  it('returns the row itself when it is already the head', () => {
    const source = { ...row(), latest: row() };
    expect(toLatestVideoGeneration(source)).toBe(source);
  });
});

describe('isVideoOutputModel', () => {
  it.each([
    ['GEMINI', 'models/veo-3.1-generate-preview', true],
    ['GEMINI', 'veo-3.1-fast-generate-preview', true],
    ['GROK', 'grok-imagine-video', true],
    ['GROK', 'grok-imagine-video-beta', true],
    ['GEMINI', 'gemini-2.5-flash', false],
    ['GROK', 'grok-4', false],
    ['OPENAI', 'sora-2', false],
    ['GROK', 'veo-3.1', false],
  ])('%s / %s -> %s', (provider, model, expected) => {
    expect(isVideoOutputModel(provider, model)).toBe(expected);
  });
});
