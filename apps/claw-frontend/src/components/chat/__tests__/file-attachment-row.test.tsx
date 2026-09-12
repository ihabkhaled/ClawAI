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
      })[key] ?? `MISSING:${key}`,
  }),
}));

function makeFile(ingestionStatus: FileIngestionStatus): UploadedFile {
  return {
    id: 'file-1',
    filename: 'resume.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2035,
    ingestionStatus,
    createdAt: '2026-09-12T00:00:00Z',
  } as UploadedFile;
}

// The row is a Radix menu item, so it needs its menu context to mount at all.
function renderRow(status: FileIngestionStatus): void {
  render(
    <DropdownMenu open>
      <DropdownMenuContent>
        <FileAttachmentRow
          file={makeFile(status)}
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
});
