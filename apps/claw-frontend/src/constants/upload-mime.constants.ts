/** What a browser sends for a file whose extension its OS has no type for. */
export const UNLABELLED_UPLOAD_MIME_TYPE = 'application/octet-stream';

/**
 * Media extensions a browser often leaves unlabelled (Windows without the HEIF
 * codec reports `.heic` with an empty type; no OS knows `.hevc`). Mirrors the
 * MIME types file-service accepts: it converts HEIC / HEIF / AVIF / TIFF / BMP
 * to JPEG on upload, and ffmpeg reads the video containers.
 */
export const UPLOAD_MIME_BY_EXTENSION: ReadonlyMap<string, string> = new Map([
  ['heic', 'image/heic'],
  ['heics', 'image/heic-sequence'],
  ['heif', 'image/heif'],
  ['heifs', 'image/heif-sequence'],
  ['avif', 'image/avif'],
  ['tif', 'image/tiff'],
  ['tiff', 'image/tiff'],
  ['bmp', 'image/bmp'],
  ['mkv', 'video/x-matroska'],
  ['3gp', 'video/3gpp'],
  ['3g2', 'video/3gpp2'],
  ['m4v', 'video/x-m4v'],
  ['hevc', 'video/hevc'],
  ['h265', 'video/h265'],
  ['265', 'video/h265'],
]);
