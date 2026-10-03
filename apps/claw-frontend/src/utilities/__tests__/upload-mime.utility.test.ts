import { describe, expect, it } from 'vitest';

import { resolveUploadMimeType } from '@/utilities/upload-mime.utility';

const named = (name: string, type = ''): Pick<File, 'name' | 'type'> => ({ name, type });

describe('resolveUploadMimeType', () => {
  it.each([
    ['IMG_0001.HEIC', 'image/heic'],
    ['IMG_0001.heif', 'image/heif'],
    ['burst.heics', 'image/heic-sequence'],
    ['burst.heifs', 'image/heif-sequence'],
    ['pic.avif', 'image/avif'],
    ['scan.TIFF', 'image/tiff'],
    ['scan.tif', 'image/tiff'],
    ['paint.bmp', 'image/bmp'],
    ['movie.mkv', 'video/x-matroska'],
    ['clip.3gp', 'video/3gpp'],
    ['clip.3g2', 'video/3gpp2'],
    ['clip.m4v', 'video/x-m4v'],
    ['raw.hevc', 'video/hevc'],
    ['raw.h265', 'video/h265'],
    ['raw.265', 'video/h265'],
  ])('labels an unlabelled %s as %s', (name, expected) => {
    expect(resolveUploadMimeType(named(name))).toBe(expected);
    expect(resolveUploadMimeType(named(name, 'application/octet-stream'))).toBe(expected);
  });

  it('keeps the label the browser gave', () => {
    expect(resolveUploadMimeType(named('IMG_0001.heic', 'image/heic'))).toBe('image/heic');
    expect(resolveUploadMimeType(named('weird.heic', 'image/jpeg'))).toBe('image/jpeg');
    expect(resolveUploadMimeType(named('notes.txt', 'text/plain'))).toBe('text/plain');
  });

  it('falls back to the generic type for an extension it does not know, or none', () => {
    expect(resolveUploadMimeType(named('data.xyz'))).toBe('application/octet-stream');
    expect(resolveUploadMimeType(named('Makefile'))).toBe('application/octet-stream');
    expect(resolveUploadMimeType(named('.heic'))).toBe('image/heic');
    expect(resolveUploadMimeType(named('trailing.'))).toBe('application/octet-stream');
  });
});
