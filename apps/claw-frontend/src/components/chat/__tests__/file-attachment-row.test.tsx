import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileAttachmentRow } from '@/components/chat/file-attachment-row';
import { DropdownMenu, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { FileIngestionStatus } from '@/enums';
import type { UploadedFile } from '@/types';

// The row rendered raw enum names — "PROCESSING" — in all thirteen locales. It
// went unnoticed because the status column always said COMPLETED: nothing ever
// extracted a file, so the other three states were unreachable. Now that
// extraction runs, they are on screen.
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'files.statusPending': 'Pending',
        'files.statusProcessing': 'Processing',
        'files.statusCompleted': 'Completed',
        'files.statusFailed': 'Failed',
        'chat.attachment.voiceNote': 'Voice note',
        'chat.attachment.videoNote': 'Video note',
      })[key] ?? `MISSING:${key}`,
  }),
}));

function makeFile(
  ingestionStatus: FileIngestionStatus,
  overrides: Partial<UploadedFile> = {},
): UploadedFile {
  return {
    id: 'file-1',
    filename: 'resume.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2035,
    ingestionStatus,
    createdAt: '2026-09-12T00:00:00Z',
    ...overrides,
  } as UploadedFile;
}

// The row is a Radix menu item, so it needs its menu context to mount at all.
function renderRow(status: FileIngestionStatus, overrides: Partial<UploadedFile> = {}): void {
  render(
    <DropdownMenu open>
      <DropdownMenuContent>
        <FileAttachmentRow
          file={makeFile(status, overrides)}
          checked={false}
          indented={false}
          onToggle={vi.fn()}
        />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

describe('FileAttachmentRow', () => {
  it.each([
    [FileIngestionStatus.PENDING, 'Pending'],
    [FileIngestionStatus.PROCESSING, 'Processing'],
    [FileIngestionStatus.COMPLETED, 'Completed'],
    [FileIngestionStatus.FAILED, 'Failed'],
  ])('renders %s as a translated word', (status, expected) => {
    renderRow(status);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    FileIngestionStatus.PENDING,
    FileIngestionStatus.PROCESSING,
    FileIngestionStatus.COMPLETED,
    FileIngestionStatus.FAILED,
  ])('never shows the raw enum name for %s', (status) => {
    renderRow(status);

    expect(screen.queryByText(String(status))).not.toBeInTheDocument();
  });

  it('resolves a real key rather than falling through to the missing marker', () => {
    renderRow(FileIngestionStatus.PROCESSING);

    expect(screen.queryByText(/^MISSING:/)).not.toBeInTheDocument();
  });

  it('still shows the filename', () => {
    renderRow(FileIngestionStatus.COMPLETED);

    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
  });

  // A voice/video note must be visually distinct from an ordinary document —
  // it is something the user said, not something they attached.
  describe('voice and video notes', () => {
    it('labels an audio attachment as a voice note', () => {
      renderRow(FileIngestionStatus.COMPLETED, { mimeType: 'audio/mpeg', filename: 'memo.mp3' });

      expect(screen.getByText('Voice note')).toBeInTheDocument();
    });

    it('labels a video attachment as a video note', () => {
      renderRow(FileIngestionStatus.COMPLETED, { mimeType: 'video/webm', filename: 'clip.webm' });

      expect(screen.getByText('Video note')).toBeInTheDocument();
    });

    it('never labels an ordinary document as a voice or video note', () => {
      renderRow(FileIngestionStatus.COMPLETED);

      expect(screen.queryByText('Voice note')).not.toBeInTheDocument();
      expect(screen.queryByText('Video note')).not.toBeInTheDocument();
    });

    it('still shows the processing/failed status text for an in-flight voice note', () => {
      renderRow(FileIngestionStatus.PROCESSING, { mimeType: 'audio/mpeg', filename: 'memo.mp3' });

      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Voice note')).toBeInTheDocument();
    });
  });
});
