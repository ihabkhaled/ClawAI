import { describe, expect, it } from 'vitest';

import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import { getAttachmentPreviewKind } from '@/utilities/attachment-preview.utility';

// Bug: every attachment under a sent message rendered through the SAME <img>
// tag regardless of real type — a voice note, a PDF, a docx and an actual
// image all forced their bytes through <img src>, and the browser's built-in
// broken-image glyph is what a non-image blob renders as. This is the one
// function that now decides the real kind first — every mimeType the backend
// (claw-file-service ALLOWED_MIME_TYPES) actually accepts is swept here so a
// newly-accepted type can never silently fall back to the old behaviour.
describe('getAttachmentPreviewKind', () => {
  it.each([
    ['image/png', 'photo.png'],
    ['image/jpeg', 'photo.jpg'],
    ['image/webp', 'photo.webp'],
    ['image/gif', 'photo.gif'],
    ['image/svg+xml', 'icon.svg'],
  ])('%s is Image', (mime, name) => {
    expect(getAttachmentPreviewKind(mime, name)).toBe(AttachmentPreviewKind.Image);
  });

  it.each([
    ['audio/webm', 'note.webm'],
    ['audio/ogg', 'note.ogg'],
    ['audio/mpeg', 'note.mp3'],
    ['audio/mp4', 'note.m4a'],
    ['audio/x-m4a', 'note.m4a'],
    ['audio/wav', 'note.wav'],
    ['audio/x-wav', 'note.wav'],
    ['audio/flac', 'note.flac'],
    ['audio/aac', 'note.aac'],
  ])('%s is Audio (a voice note gets a player, not a broken thumbnail)', (mime, name) => {
    expect(getAttachmentPreviewKind(mime, name)).toBe(AttachmentPreviewKind.Audio);
  });

  it.each([
    ['video/mp4', 'clip.mp4'],
    ['video/quicktime', 'clip.mov'],
    ['video/webm', 'clip.webm'],
    ['video/x-msvideo', 'clip.avi'],
    ['video/mpeg', 'clip.mpg'],
  ])('%s is Video (a video note gets a player, not a broken thumbnail)', (mime, name) => {
    expect(getAttachmentPreviewKind(mime, name)).toBe(AttachmentPreviewKind.Video);
  });

  it('application/pdf is Pdf', () => {
    expect(getAttachmentPreviewKind('application/pdf', 'report.pdf')).toBe(
      AttachmentPreviewKind.Pdf,
    );
  });

  it.each([
    ['text/plain', 'notes.txt'],
    ['text/csv', 'rows.csv'],
    ['text/markdown', 'readme.md'],
    ['application/json', 'data.json'],
    ['application/xml', 'data.xml'],
  ])('%s is Text (readable inline preview)', (mime, name) => {
    expect(getAttachmentPreviewKind(mime, name)).toBe(AttachmentPreviewKind.Text);
  });

  // Office documents, archives, and everything else with no in-app viewer:
  // NOT the Image branch (they must never hit <img>), and NOT Pdf/Text —
  // they get an icon + a download action.
  it.each([
    // Every Office Open XML mimeType contains "xml" (…openxmlformats…) — must
    // stay OUT of Text, or its binary bytes get handed to blob.text().
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'plan.docx'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'data.xlsx'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'deck.pptx'],
    ['application/rtf', 'notes.rtf'],
    ['application/zip', 'bundle.zip'],
    ['application/x-7z-compressed', 'bundle.7z'],
    ['application/vnd.rar', 'bundle.rar'],
    ['application/x-tar', 'bundle.tar'],
    ['application/gzip', 'bundle.tar.gz'],
    ['application/x-bzip2', 'bundle.bz2'],
    ['application/x-xz', 'bundle.xz'],
    ['application/octet-stream', 'unknown.bin'],
    ['application/x-python', 'script.py'],
    ['application/x-sh', 'script.sh'],
  ])('%s is Generic — never Image, never Text, never a broken placeholder', (mime, name) => {
    expect(getAttachmentPreviewKind(mime, name)).toBe(AttachmentPreviewKind.Generic);
  });
});
