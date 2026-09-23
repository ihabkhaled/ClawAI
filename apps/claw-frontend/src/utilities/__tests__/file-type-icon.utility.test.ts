import { Archive, FileCode, FileSpreadsheet, FileText, Presentation } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { FileIngestionStatus } from '@/enums';
import {
  getFileTypeDescriptor,
  getIngestionStatusIcon,
  isAudioMime,
  isVideoMime,
} from '@/utilities/file-type-icon.utility';

describe('getFileTypeDescriptor', () => {
  // Every Office MIME type contains "xml" (…openxmlformats…), and Word and
  // PowerPoint files used to fall into the code branch.
  it.each([
    [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'deck.pptx',
      Presentation,
    ],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'plan.docx',
      FileText,
    ],
    [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'data.xlsx',
      FileSpreadsheet,
    ],
    ['application/zip', 'bundle.zip', Archive],
    ['application/json', 'data.json', FileCode],
    ['application/pdf', 'report.pdf', FileText],
  ])('%s → the right icon', (mime, name, icon) => {
    expect(getFileTypeDescriptor(mime, name).Icon).toBe(icon);
  });
});

describe('isAudioMime / isVideoMime', () => {
  it('recognises an audio mime type', () => {
    expect(isAudioMime('audio/mpeg')).toBe(true);
    expect(isAudioMime('video/webm')).toBe(false);
    expect(isAudioMime('application/pdf')).toBe(false);
  });

  it('recognises a video mime type', () => {
    expect(isVideoMime('video/webm')).toBe(true);
    expect(isVideoMime('audio/mpeg')).toBe(false);
  });
});

describe('getIngestionStatusIcon', () => {
  it('spins only for PROCESSING', () => {
    expect(getIngestionStatusIcon(FileIngestionStatus.PROCESSING).spin).toBe(true);
    expect(getIngestionStatusIcon(FileIngestionStatus.PENDING).spin).toBe(false);
    expect(getIngestionStatusIcon(FileIngestionStatus.COMPLETED).spin).toBe(false);
    expect(getIngestionStatusIcon(FileIngestionStatus.FAILED).spin).toBe(false);
  });

  it('gives every status its own icon', () => {
    const icons = new Set(
      [
        FileIngestionStatus.PENDING,
        FileIngestionStatus.PROCESSING,
        FileIngestionStatus.COMPLETED,
        FileIngestionStatus.FAILED,
      ].map((status) => getIngestionStatusIcon(status).Icon),
    );

    expect(icons.size).toBe(4);
  });
});
