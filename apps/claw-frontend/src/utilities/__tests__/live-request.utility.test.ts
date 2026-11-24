import { describe, expect, it } from 'vitest';

import { LiveCapability } from '@/enums/live.enum';
import {
  liveResolveErrorKey,
  liveSourceNeedsAttestation,
  safeYoutubeEmbedUrl,
  youtubeWatchUrl,
} from '@/utilities/live-request.utility';

describe('youtubeWatchUrl', () => {
  it('maps a video embed to its watch page', () => {
    expect(
      youtubeWatchUrl(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1',
      ),
    ).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('maps a channel live embed to the channel live page', () => {
    expect(
      youtubeWatchUrl(
        'https://www.youtube-nocookie.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1',
      ),
    ).toBe('https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live');
  });

  it('refuses anything that is not our nocookie embed', () => {
    expect(youtubeWatchUrl(null)).toBeNull();
    expect(youtubeWatchUrl('https://evil.example/embed/dQw4w9WgXcQ')).toBeNull();
    expect(safeYoutubeEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBeNull();
  });
});

describe('liveResolveErrorKey', () => {
  it('explains a YouTube handle link', () => {
    expect(liveResolveErrorKey(new Error('LIVE_YOUTUBE_HANDLE_UNSUPPORTED'))).toBe(
      'live.page.youtubeHandleError',
    );
  });

  it('explains a Discord link, by message or by API error code', () => {
    expect(liveResolveErrorKey(new Error('LIVE_DISCORD_PRIVATE'))).toBe(
      'live.platform.discordPrivate',
    );
    const coded = Object.assign(new Error('Unprocessable'), { code: 'LIVE_DISCORD_PRIVATE' });
    expect(liveResolveErrorKey(coded)).toBe('live.platform.discordPrivate');
  });

  it('explains a recorded video over the length cap', () => {
    const coded = Object.assign(new Error('Unprocessable'), { code: 'LIVE_RECORDED_TOO_LONG' });
    expect(liveResolveErrorKey(coded)).toBe('live.page.recordedTooLongError');
  });

  it('falls back to the generic message', () => {
    expect(liveResolveErrorKey(new Error('LIVE_SOURCE_UNSUPPORTED'))).toBe(
      'live.page.resolveError',
    );
  });
});

describe('liveSourceNeedsAttestation', () => {
  it('asks only for server-processed HLS capabilities', () => {
    expect(liveSourceNeedsAttestation(LiveCapability.AUDIO)).toBe(true);
    expect(liveSourceNeedsAttestation(LiveCapability.AUDIO_VISION)).toBe(true);
    expect(liveSourceNeedsAttestation(LiveCapability.BROWSER_CAPTURE)).toBe(false);
    expect(liveSourceNeedsAttestation(LiveCapability.LINK_ONLY)).toBe(false);
    expect(liveSourceNeedsAttestation(LiveCapability.PLAYER_ONLY)).toBe(false);
  });
});
