import { describe, expect, it } from 'vitest';
import { TRANSCRIBE_CHUNK_MAX_BASE64_LENGTH } from '../../constants/transcribe-chunk.constants';
import { transcribeChunkSchema } from '../transcribe-chunk.dto';

const valid = {
  contentBase64: 'UklGRg==',
  mimeType: 'audio/wav',
  requestId: 'live:run-1:0',
};

describe('transcribeChunkSchema (ADR-221)', () => {
  it('accepts a minimal chunk and an optional language hint', () => {
    expect(transcribeChunkSchema.safeParse(valid).success).toBe(true);
    expect(transcribeChunkSchema.safeParse({ ...valid, languageHint: 'pt-BR' }).success).toBe(true);
  });

  it('rejects a non-audio mime type', () => {
    expect(transcribeChunkSchema.safeParse({ ...valid, mimeType: 'video/mp4' }).success).toBe(
      false,
    );
  });

  it('rejects base64 longer than the 2 MiB ceiling', () => {
    const contentBase64 = 'A'.repeat(TRANSCRIBE_CHUNK_MAX_BASE64_LENGTH + 4);
    expect(transcribeChunkSchema.safeParse({ ...valid, contentBase64 }).success).toBe(false);
  });

  it('rejects unknown fields and a missing requestId', () => {
    expect(transcribeChunkSchema.safeParse({ ...valid, userId: 'u' }).success).toBe(false);
    const { requestId: _omit, ...rest } = valid;
    expect(transcribeChunkSchema.safeParse(rest).success).toBe(false);
  });
});
