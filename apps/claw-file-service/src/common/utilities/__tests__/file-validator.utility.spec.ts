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

  // Batch 7 — the classic ffmpeg polyglot: an HLS playlist (or concat script)
  // renamed to .mp4 that points the demuxer at a local path. The magic-byte
  // check refuses it at upload; `-format_whitelist` refuses it again at probe
  // time for a polyglot that does carry a real container header.
  it.each([
    [
      'an HLS playlist',
      '#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:1.0,\nfile:///etc/passwd\n#EXT-X-ENDLIST\n',
    ],
    ['an ffconcat script', "ffconcat version 1.0\nfile '/etc/passwd'\n"],
  ])('rejects %s declared as video/mp4', async (_label, text) => {
    const result = await validateMagicBytes(Buffer.from(text), 'video/mp4');
    expect(result.valid).toBe(false);
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

// Batch A2 — archive MIMEs other than ZIP. A tar has no offset-0 signature and
// a RAR has two, so these are sniffed; a declared label must match the bytes.
const GZIP_BYTES = Buffer.from('1f8b0800000000000003', 'hex');
const SEVEN_ZIP_BYTES = Buffer.from('377abcaf271c0004', 'hex');
const RAR5_BYTES = Buffer.from('526172211a0701000000', 'hex');
const RAR4_BYTES = Buffer.from('526172211a070000', 'hex');
const BZIP2_BYTES = Buffer.from('425a683931415926', 'hex');
const XZ_BYTES = Buffer.from('fd377a585a000004', 'hex');
const ZIP_BYTES = Buffer.from('504b0304140000000800', 'hex');
const USTAR_BYTES = ((): Buffer => {
  const block = Buffer.alloc(512);
  block.write('a.txt', 0);
  block.write('ustar', 257);
  return block;
})();

describe('validateMagicBytes archive formats', () => {
  it.each([
    ['application/x-7z-compressed', SEVEN_ZIP_BYTES],
    ['application/vnd.rar', RAR5_BYTES],
    ['application/x-rar-compressed', RAR4_BYTES],
    ['application/gzip', GZIP_BYTES],
    ['application/x-compressed-tar', GZIP_BYTES],
    ['application/x-bzip2', BZIP2_BYTES],
    ['application/x-xz', XZ_BYTES],
    ['application/x-tar', USTAR_BYTES],
    ['application/x-gtar', USTAR_BYTES],
    ['application/x-gtar', GZIP_BYTES],
    ['application/x-zip-compressed', ZIP_BYTES],
  ])('accepts %s whose bytes agree', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: true,
      reason: 'magic_bytes_match',
    });
  });

  it.each([
    ['application/x-7z-compressed', GZIP_BYTES],
    ['application/vnd.rar', SEVEN_ZIP_BYTES],
    ['application/gzip', XZ_BYTES],
    ['application/x-tar', GZIP_BYTES],
    ['application/x-xz', Buffer.from('%PDF-1.7')],
    ['application/x-zip-compressed', GZIP_BYTES],
  ])('rejects %s whose bytes are another format', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: false,
      reason: `mime_magic_mismatch: declared ${mimeType}`,
    });
  });
});

// HEIC / HEIF / AVIF / TIFF / BMP and the video containers added with them
// (Matroska, 3GPP, M4V, raw HEVC). Byte strings are real file heads.
const HEIC_BYTES = Buffer.from('0000001c6674797068656963000000006d696631686569630000', 'hex');
const MIF1_BYTES = Buffer.from('0000001c667479706d696631000000006d696631', 'hex');
const AVIF_BYTES = Buffer.from('0000001c6674797061766966000000006d696631617669660000', 'hex');
const TIFF_LE_BYTES = Buffer.from('49492a0008000000', 'hex');
const TIFF_BE_BYTES = Buffer.from('4d4d002a00000008', 'hex');
const BMP_BYTES = Buffer.concat([Buffer.from('BM'), Buffer.alloc(52)]);
const MATROSKA_BYTES = Buffer.concat([
  Buffer.from('1a45dfa39f4286810142f7810142f2810442f3810842828862', 'hex'),
  Buffer.from('matroska'),
  Buffer.alloc(16),
]);
const THREE_GP_BYTES = Buffer.from('000000146674797033677034000000003367703400', 'hex');
const M4V_BYTES = Buffer.from('0000001c667479706d3476200000000069736f6d6d3476', 'hex');
// 00 00 00 01 then a VPS (0x40 = type 32): what ffmpeg writes for `-f hevc`.
const HEVC_BYTES = Buffer.from('000000014001 0c01ffff04080000030000'.replace(' ', ''), 'hex');
const HEVC_SHORT_START_BYTES = Buffer.from('0000014201010160', 'hex');
// 00 00 00 01 then an H.264 SPS (0x67 = type 7): same start code, different codec.
const H264_BYTES = Buffer.from('0000000167640028acd940', 'hex');

describe('validateMagicBytes converted image formats', () => {
  it.each([
    ['image/heic', HEIC_BYTES],
    ['image/heic', MIF1_BYTES],
    ['image/heif', HEIC_BYTES],
    ['image/heif', MIF1_BYTES],
    ['image/heic-sequence', HEIC_BYTES],
    ['image/heif-sequence', MIF1_BYTES],
    ['image/avif', AVIF_BYTES],
    ['image/avif', MIF1_BYTES],
    ['image/tiff', TIFF_LE_BYTES],
    ['image/tiff', TIFF_BE_BYTES],
    ['image/bmp', BMP_BYTES],
    ['image/x-ms-bmp', BMP_BYTES],
  ])('accepts a detected %s', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: true,
      reason: 'magic_bytes_match',
    });
  });

  it.each([
    ['image/heic', AVIF_BYTES],
    ['image/heic', TIFF_LE_BYTES],
    ['image/avif', HEIC_BYTES],
    ['image/tiff', BMP_BYTES],
    ['image/bmp', TIFF_LE_BYTES],
    ['image/heic', MP4_BYTES],
    ['image/heic', Buffer.from('%PDF-1.7 not an image')],
    ['image/bmp', Buffer.from('<?xml version="1.0"?>')],
  ])('rejects %s declared over the wrong bytes', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: false,
      reason: `mime_magic_mismatch: declared ${mimeType}`,
    });
  });
});

describe('validateMagicBytes added video formats', () => {
  it.each([
    ['video/x-matroska', MATROSKA_BYTES],
    ['video/3gpp', THREE_GP_BYTES],
    ['video/3gpp2', THREE_GP_BYTES],
    ['video/x-m4v', M4V_BYTES],
    ['video/hevc', HEVC_BYTES],
    ['video/h265', HEVC_BYTES],
    ['video/hevc', HEVC_SHORT_START_BYTES],
  ])('accepts a detected %s', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: true,
      reason: 'magic_bytes_match',
    });
  });

  it.each([
    ['video/x-matroska', WEBM_BYTES],
    ['video/webm', MATROSKA_BYTES],
    ['video/hevc', H264_BYTES],
    ['video/hevc', MP4_BYTES],
    ['video/x-matroska', MP4_BYTES],
    ['video/x-m4v', WEBM_BYTES],
  ])('rejects %s declared over the wrong bytes', async (mimeType, buffer) => {
    await expect(validateMagicBytes(buffer, mimeType)).resolves.toEqual({
      valid: false,
      reason: `mime_magic_mismatch: declared ${mimeType}`,
    });
  });
});
