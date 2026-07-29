import { validateMagicBytes } from '../file-validator.utility';

const MP4_BYTES = Buffer.from('000000186674797069736f6d0000020069736f6d69736f32', 'hex');
const QUICKTIME_BYTES = Buffer.from('0000001466747970717420200000000071742020', 'hex');
const WEBM_BYTES = Buffer.from(
  '1a45dfa39f4286810142f7810142f2810442f381084282847765626d4287810242858102',
  'hex',
);
const AVI_BYTES = Buffer.from('5249464624000000415649204c495354', 'hex');
const MPEG_BYTES = Buffer.from('000001b344000400', 'hex');

describe('validateMagicBytes video formats', () => {
  it.each([
    ['video/mp4', MP4_BYTES],
    ['video/quicktime', QUICKTIME_BYTES],
    ['video/mov', QUICKTIME_BYTES],
    ['video/webm', WEBM_BYTES],
    ['video/x-msvideo', AVI_BYTES],
    ['video/avi', AVI_BYTES],
    ['video/mpeg', MPEG_BYTES],
  ])('accepts a detected %s container', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: true,
      reason: 'magic_bytes_match',
    });
  });

  it.each([
    ['video/quicktime', MP4_BYTES],
    ['video/mp4', QUICKTIME_BYTES],
    ['video/mp4', WEBM_BYTES],
    ['video/webm', AVI_BYTES],
    ['video/x-msvideo', MPEG_BYTES],
  ])('rejects cross-declared %s container bytes', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: false,
      reason: `mime_magic_mismatch: declared ${mimeType}`,
    });
  });

  it('rejects undetectable bytes for a declared video format', async () => {
    await expect(validateMagicBytes(Buffer.from('%PDF-not-a-video'), 'video/mp4')).resolves.toEqual(
      {
        valid: false,
        reason: 'mime_magic_mismatch: declared video/mp4',
      },
    );
  });
});
