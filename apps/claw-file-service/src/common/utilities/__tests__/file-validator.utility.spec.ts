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

// B6a — audio containers. Without a signature check, "audio/wav" was an
// unchecked MIME: any bytes at all rode in under that name.
const WAV_BYTES = Buffer.from('524946462400000057415645666d7420', 'hex');
const OGG_BYTES = Buffer.from('4f6767530002000000000000', 'hex');
const FLAC_BYTES = Buffer.from('664c614300000022', 'hex');
const MP3_ID3_BYTES = Buffer.from('494433040000000000', 'hex');
const MP3_SYNC_BYTES = Buffer.from('fffb906400000000', 'hex');
const M4A_BYTES = Buffer.from('00000020667479704d34412000000000', 'hex');
const AAC_ADTS_BYTES = Buffer.from('fff1508000000000', 'hex');

describe('validateMagicBytes audio formats', () => {
  it.each([
    ['audio/wav', WAV_BYTES],
    ['audio/x-wav', WAV_BYTES],
    ['audio/ogg', OGG_BYTES],
    ['audio/flac', FLAC_BYTES],
    ['audio/mpeg', MP3_ID3_BYTES],
    ['audio/mpeg', MP3_SYNC_BYTES],
    ['audio/mp4', M4A_BYTES],
    ['audio/x-m4a', M4A_BYTES],
    ['audio/webm', WEBM_BYTES],
    ['audio/aac', AAC_ADTS_BYTES],
  ])('accepts a detected %s container', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: true,
      reason: 'magic_bytes_match',
    });
  });

  it.each([
    ['audio/wav', MP3_SYNC_BYTES],
    ['audio/mpeg', WAV_BYTES],
    ['audio/ogg', FLAC_BYTES],
    ['audio/flac', OGG_BYTES],
    ['audio/mp4', WEBM_BYTES],
    ['audio/webm', M4A_BYTES],
  ])('rejects cross-declared %s container bytes', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: false,
      reason: `mime_magic_mismatch: declared ${mimeType}`,
    });
  });

  it.each(['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/flac'])(
    'rejects an executable payload renamed to %s',
    async (mimeType) => {
      await expect(
        validateMagicBytes(Buffer.from('MZ\u0090\u0000payload'), mimeType),
      ).resolves.toEqual({
        valid: false,
        reason: `mime_magic_mismatch: declared ${mimeType}`,
      });
    },
  );

  it('rejects a RIFF container that is not WAVE', async () => {
    await expect(validateMagicBytes(AVI_BYTES, 'audio/wav')).resolves.toEqual({
      valid: false,
      reason: 'mime_magic_mismatch: declared audio/wav',
    });
  });
});
