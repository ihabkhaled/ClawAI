import { VideoFailureCode } from '../../../../common/enums';
import { BusinessException } from '../../../../common/errors';
import { VideoAssetRole, VideoGenerationStatus } from '../../../../generated/prisma';
import { generateVideoSchema } from '../../dto/generate-video.dto';
import {
  VIDEO_FAILURE_MESSAGES,
  videoFailureMessage,
} from '../../constants/video-failure.constants';
import {
  isActiveVideoStatus,
  isVideoCancelledError,
  videoCancelled,
} from '../video-cancel.utility';
import { videoPriceKey } from '../video-price-key.utility';
import {
  toVideoProviderException,
  videoFailure,
  videoFailureCodeOf,
} from '../video-provider-error.utility';
import { abandonedVideoHold, videoSettlement } from '../video-settlement.utility';
import { toVideoView } from '../video-view.utility';

describe('videoPriceKey', () => {
  it('meters the bare model id, whichever spelling the catalog used', () => {
    expect(videoPriceKey('models/veo-3.1-generate-preview')).toBe('veo-3.1-generate-preview');
    expect(videoPriceKey(' grok-imagine-video ')).toBe('grok-imagine-video');
  });
});

describe('videoSettlement', () => {
  const hold = {
    metered: true,
    reservationId: 'r',
    heldMicroUsd: 1,
    maxOutputTokens: 1,
    clamped: false,
    availableAfterMicroUsd: 0,
    reason: null,
  };

  it('settles on whole seconds, never tokens, and never negative', () => {
    expect(videoSettlement(hold, 4.9).calls).toEqual({ toolCalls: 0, videoSeconds: 4 });
    expect(videoSettlement(hold, -3).calls.videoSeconds).toBe(0);
    expect(videoSettlement(hold, 4).usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
    });
  });

  it('rebuilds a releasable hold from nothing but its id', () => {
    expect(abandonedVideoHold('res-9')).toMatchObject({ metered: true, reservationId: 'res-9' });
  });
});

describe('cancel helpers', () => {
  it('knows which statuses can still be cancelled', () => {
    expect(isActiveVideoStatus(VideoGenerationStatus.GENERATING)).toBe(true);
    expect(isActiveVideoStatus(VideoGenerationStatus.COMPLETED)).toBe(false);
    expect(isActiveVideoStatus(VideoGenerationStatus.CANCELLED)).toBe(false);
  });

  it('recognises its own cancel exception and nothing else', () => {
    expect(isVideoCancelledError(videoCancelled())).toBe(true);
    expect(isVideoCancelledError(new Error('x'))).toBe(false);
  });
});

describe('failure vocabulary', () => {
  it('has a fixed sentence for every code, and never leaks provider text', () => {
    for (const code of Object.values(VideoFailureCode)) {
      expect(VIDEO_FAILURE_MESSAGES.get(code)).toBeTruthy();
    }
    const error = toVideoProviderException(
      { response: { status: 400, data: { error: { message: 'secret prompt text' } } } },
      'Gemini',
    );
    expect(videoFailureMessage(videoFailureCodeOf(error) as VideoFailureCode)).not.toContain(
      'secret',
    );
  });

  it('keeps an existing exception and builds its own with the fixed sentence', () => {
    const own = videoFailure(VideoFailureCode.STORAGE_FAILED, 'disk');
    expect(toVideoProviderException(own, 'x')).toBe(own);
    expect(own.message).toContain('could not be saved');
    expect(videoFailureCodeOf(new Error('x'))).toBe(VideoFailureCode.PROVIDER_FAILURE);
    expect(videoFailureCodeOf(new BusinessException('m', 'CUSTOM'))).toBe('CUSTOM');
  });

  it('classifies transport errors as unavailable and a policy block as content rejected', () => {
    expect(toVideoProviderException({ code: 'ETIMEDOUT' }, 'x')).toMatchObject({
      code: VideoFailureCode.PROVIDER_UNAVAILABLE,
    });
    expect(
      toVideoProviderException(
        { response: { status: 400, data: { message: 'blocked by safety' } } },
        'x',
      ),
    ).toMatchObject({ code: VideoFailureCode.CONTENT_REJECTED });
  });
});

describe('generateVideoSchema', () => {
  const valid = {
    prompt: 'A lighthouse at dusk',
    provider: 'VIDEO_GEMINI',
    model: 'veo-3.1-fast-generate-preview',
    userId: 'user-1',
  };

  it('defaults to a 4 second landscape manual clip', () => {
    expect(generateVideoSchema.parse(valid)).toMatchObject({
      durationSeconds: 4,
      aspectRatio: '16:9',
      isAutoMode: false,
    });
  });

  it.each([
    ['an unsupported provider', { provider: 'VIDEO_OPENAI' }],
    ['a clip under 4 seconds', { durationSeconds: 3 }],
    ['a clip over 8 seconds', { durationSeconds: 9 }],
    ['a fractional length', { durationSeconds: 4.5 }],
    ['a square aspect ratio', { aspectRatio: '1:1' }],
    ['an empty prompt', { prompt: '   ' }],
    ['a prompt over 4000 characters', { prompt: 'x'.repeat(4_001) }],
  ])('rejects %s', (_label, override) => {
    expect(generateVideoSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe('toVideoView', () => {
  it('flattens the clip and drops the fields that are ours alone', () => {
    const view = toVideoView({
      id: 'g',
      userId: 'u',
      threadId: null,
      userMessageId: null,
      assistantMessageId: null,
      prompt: 'p',
      originalPrompt: null,
      provider: 'VIDEO_GROK',
      model: 'm',
      durationSeconds: 4,
      aspectRatio: '16:9',
      isAutoMode: false,
      status: VideoGenerationStatus.COMPLETED,
      errorCode: null,
      errorMessage: null,
      providerOperationId: 'op',
      startedAt: null,
      completedAt: null,
      latencyMs: null,
      supersededById: null,
      paygReservationId: 'res',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      assets: [
        {
          id: 'a',
          generationId: 'g',
          storageKey: 'file-1',
          url: '/u',
          downloadUrl: '/d',
          mimeType: 'video/mp4',
          sizeBytes: 7,
          durationSeconds: 4,
          role: VideoAssetRole.OUTPUT,
        },
      ],
    });

    expect(view.asset).toEqual({
      id: 'a',
      url: '/u',
      downloadUrl: '/d',
      mimeType: 'video/mp4',
      sizeBytes: 7,
    });
    expect(Object.keys(view)).not.toEqual(
      expect.arrayContaining(['userId', 'providerOperationId', 'paygReservationId', 'assets']),
    );
  });
});
