// Multimodal batch 9 — the "Read aloud" audio store body, and its route guard.

import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { storeGeneratedAudioSchema } from '../store-generated-audio.dto';
import { FilesInternalController } from '../../controllers/files-internal.controller';
import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { GENERATED_AUDIO_MAX_BASE64_LENGTH } from '../../constants/generated-audio.constants';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({ INTER_SERVICE_AUTH_TOKEN: 'service-secret-token-0000000000' })),
  },
}));

const valid = {
  userId: 'u1',
  filename: 'reply-m1.wav',
  mimeType: 'audio/wav',
  base64Data: 'UklGRg==',
};

describe('storeGeneratedAudioSchema', () => {
  it('accepts a WAV and an MP3, with or without a transcript', () => {
    expect(storeGeneratedAudioSchema.safeParse(valid).success).toBe(true);
    expect(
      storeGeneratedAudioSchema.safeParse({ ...valid, mimeType: 'audio/mpeg', transcript: 'Hi' })
        .success,
    ).toBe(true);
  });

  it.each([
    ['no owner', { ...valid, userId: undefined }],
    ['an empty owner', { ...valid, userId: '' }],
    ['an over-long owner', { ...valid, userId: 'u'.repeat(129) }],
    ['a non-audio mime type', { ...valid, mimeType: 'text/html' }],
    ['an audio mime type TTS never returns', { ...valid, mimeType: 'audio/ogg' }],
    ['an empty filename', { ...valid, filename: '' }],
    ['an over-long filename', { ...valid, filename: `${'a'.repeat(201)}.wav` }],
    ['non-base64 data', { ...valid, base64Data: '<script>' }],
    ['empty data', { ...valid, base64Data: '' }],
    [
      'data past the file size cap',
      { ...valid, base64Data: 'A'.repeat(GENERATED_AUDIO_MAX_BASE64_LENGTH + 4) },
    ],
    ['an over-long transcript', { ...valid, transcript: 'x'.repeat(20_001) }],
    ['an unknown key', { ...valid, storagePath: '/etc/passwd' }],
    ['a numeric owner', { ...valid, userId: 42 }],
  ])('rejects %s', (_label, body) => {
    expect(storeGeneratedAudioSchema.safeParse(body).success).toBe(false);
  });
});

describe('POST /internal/files/store-generated-audio guard', () => {
  it('is guarded by the service token', () => {
    const guards: unknown = Reflect.getMetadata(
      GUARDS_METADATA,
      FilesInternalController.prototype.storeGeneratedAudio,
    );
    expect(guards).toEqual([ServiceTokenGuard]);
  });
});
