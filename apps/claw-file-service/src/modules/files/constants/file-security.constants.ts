export const MAX_FILENAME_LENGTH = 255;

export const DANGEROUS_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.pif',
  '.vbs',
  '.vbe',
  '.wsf',
  '.wsh',
  '.msi',
  '.msp',
  '.dll',
  '.sys',
  '.drv',
  '.cpl',
  '.inf',
  '.reg',
  '.ps1',
  '.psm1',
  '.psd1',
  '.gadget',
  '.hta',
  '.lnk',
  '.scf',
  '.url',
  '.jar',
  '.jnlp',
  '.application',
  '.appref-ms',
  '.action',
  '.command',
  '.workflow',
]);

export const MIME_TO_MAGIC_BYTES: Record<string, Buffer[]> = {
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/jpeg': [
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
    Buffer.from([0xff, 0xd8, 0xff, 0xe2]),
    Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
    Buffer.from([0xff, 0xd8, 0xff, 0xee]),
  ],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')],
  'application/zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  // Unchecked until batch A2, so any bytes rode in under this label.
  'application/x-zip-compressed': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
};

export const VIDEO_MIME_DETECTION_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'video/mp4': ['video/mp4'],
  'video/quicktime': ['video/quicktime'],
  'video/mov': ['video/quicktime'],
  'video/webm': ['video/webm'],
  'video/x-msvideo': ['video/vnd.avi'],
  'video/avi': ['video/vnd.avi'],
  'video/mpeg': ['video/mpeg'],
};

// B6a — audio container detection.
//
// MIME_TO_MAGIC_BYTES above can only express "these exact bytes at offset 0",
// so it cannot carry an audio signature: WAV is 'RIFF' at 0 AND 'WAVE' at 8
// (offset-0 'RIFF' alone would also accept a WebP), M4A is 'ftyp' at offset 4
// followed by a brand from a set, and MP3 is either 'ID3' or one of several
// frame-sync byte pairs. Audio therefore uses the same container-detection
// mechanism video already uses: detect what the bytes really are, then check
// the declared MIME is allowed to be that.
export const AUDIO_MIME_DETECTION_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'audio/webm': ['audio/webm'],
  'audio/ogg': ['audio/ogg'],
  'audio/mpeg': ['audio/mpeg'],
  'audio/mp4': ['audio/mp4'],
  'audio/x-m4a': ['audio/mp4'],
  'audio/wav': ['audio/wav'],
  'audio/x-wav': ['audio/wav'],
  'audio/flac': ['audio/flac'],
  // An .aac in the wild is ADTS, but encoders also ship it with an ID3 tag,
  // which is indistinguishable from an MP3 header at the byte level.
  'audio/aac': ['audio/aac', 'audio/mpeg'],
};

// ISO base-media brands that mean "audio-only MP4". Same container family as
// MP4_MAJOR_BRANDS below, so an M4A declared as audio/mp4 is checked the same
// way a video/mp4 is — 'ftyp' at offset 4, brand at offset 8.
export const M4A_MAJOR_BRANDS = new Set(['m4a ', 'm4b ', 'mp41', 'mp42', 'isom', 'iso2', 'dash']);

// MP3 frame-sync pairs (MPEG-1/2 Layer III) accepted at offset 0 when the file
// carries no ID3 tag.
export const MP3_FRAME_SYNC_SECOND_BYTES = new Set([0xfb, 0xf3, 0xf2]);

// AAC ADTS sync words at offset 0: 0xFFF1 (MPEG-4) and 0xFFF9 (MPEG-2).
export const AAC_ADTS_SECOND_BYTES = new Set([0xf1, 0xf9]);

export const MP4_MAJOR_BRANDS = new Set([
  '3g2a',
  '3g2b',
  '3g2c',
  '3ge6',
  '3ge7',
  '3gg6',
  '3gp1',
  '3gp2',
  '3gp3',
  '3gp4',
  '3gp5',
  '3gp6',
  '3gp7',
  'avc1',
  'dash',
  'f4v ',
  'iso2',
  'iso3',
  'iso4',
  'iso5',
  'iso6',
  'isom',
  'm4v ',
  'mp41',
  'mp42',
  'msnv',
]);
