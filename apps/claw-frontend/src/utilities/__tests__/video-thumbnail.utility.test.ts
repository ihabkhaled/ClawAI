import { describe, expect, it } from 'vitest';

import { VIDEO_THUMBNAIL_MAX_BASE64_CHARS } from '@/constants/video-thumbnail.constants';
import { readVideoDurationMs, toVideoPosterSrc } from '@/utilities/video-thumbnail.utility';

describe('toVideoPosterSrc', () => {
  it('builds a data URL from the stored JPEG thumbnail', () => {
    expect(toVideoPosterSrc({ thumbnailBase64: 'dGh1bWI=' })).toBe(
      'data:image/jpeg;base64,dGh1bWI=',
    );
    expect(toVideoPosterSrc({ thumbnailBase64: 'dGh1bWI=', thumbnailMimeType: 'image/webp' })).toBe(
      'data:image/webp;base64,dGh1bWI=',
    );
  });

  it('falls back (null) when there is no thumbnail', () => {
    expect(toVideoPosterSrc(undefined)).toBeNull();
    expect(toVideoPosterSrc(null)).toBeNull();
    expect(toVideoPosterSrc({ thumbnailBase64: null })).toBeNull();
    expect(toVideoPosterSrc({ thumbnailBase64: '' })).toBeNull();
  });

  it('refuses anything that is not a bounded, plain-base64 image', () => {
    expect(
      toVideoPosterSrc({ thumbnailBase64: 'dGh1bWI=', thumbnailMimeType: 'text/html' }),
    ).toBeNull();
    expect(toVideoPosterSrc({ thumbnailBase64: 'abc"><script>' })).toBeNull();
    expect(
      toVideoPosterSrc({ thumbnailBase64: 'A'.repeat(VIDEO_THUMBNAIL_MAX_BASE64_CHARS + 4) }),
    ).toBeNull();
  });
});

describe('readVideoDurationMs', () => {
  it('returns a positive finite duration, else null', () => {
    expect(readVideoDurationMs({ durationMs: 42_000 })).toBe(42_000);
    expect(readVideoDurationMs({ durationMs: 0 })).toBeNull();
    expect(readVideoDurationMs({})).toBeNull();
    expect(readVideoDurationMs(null)).toBeNull();
  });
});
