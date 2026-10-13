import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileLibraryRow } from '@/components/chat/file-library-row';
import { FileLibraryTile } from '@/components/chat/file-library-tile';
import type { FileLibraryRowProps } from '@/types/file-library-ui.types';

import { echoTranslate, makeLibraryFile } from './file-library-fixtures';

const useTranslationState = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: echoTranslate, locale: useTranslationState.locale }),
}));
vi.mock('@/hooks/files/use-file-thumbnail-blob', () => ({
  useFileThumbnailBlob: (fileId: string, enabled: boolean) => ({
    blobUrl: enabled ? `blob:${fileId}` : null,
    isError: false,
  }),
}));

function props(overrides: Partial<FileLibraryRowProps> = {}): FileLibraryRowProps {
  return {
    file: makeLibraryFile({
      id: 'zip',
      filename: 'bundle.zip',
      mimeType: 'application/zip',
      childCount: 3,
    }),
    checked: false,
    disabled: false,
    selectedMemberCount: 0,
    onToggle: vi.fn(),
    onBrowseArchive: vi.fn(),
    ...overrides,
  };
}

describe.each([
  ['row', FileLibraryRow, 'file-library-row'],
  ['tile', FileLibraryTile, 'file-library-tile'],
])('FileLibrary %s', (_name, Component, testId) => {
  it('reports the file on click and the archive on its contents button', async () => {
    const p = props();
    render(
      <ul>
        <Component {...p} />
      </ul>,
    );

    await userEvent.click(screen.getByRole('checkbox'));
    expect(p.onToggle).toHaveBeenCalledWith(p.file);

    await userEvent.click(screen.getByLabelText('chat.fileLibrary.archiveChoose:bundle.zip'));
    expect(p.onBrowseArchive).toHaveBeenCalledWith(p.file);
  });

  it('reflects checked and disabled state for assistive tech', () => {
    render(
      <ul>
        <Component {...props({ checked: true, disabled: true })} />
      </ul>,
    );

    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(box).toBeDisabled();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('says how many files inside an archive are picked individually', () => {
    render(
      <ul>
        <Component {...props({ selectedMemberCount: 2 })} />
      </ul>,
    );
    expect(screen.getByText('files.archive.membersSelected:2')).toBeInTheDocument();
  });

  it('labels a recorded voice note and a video note, with their marks', () => {
    const { rerender } = render(
      <ul>
        <Component
          {...props({
            file: makeLibraryFile({ filename: 'rec.webm', mimeType: 'audio/webm' }),
          })}
        />
      </ul>,
    );
    expect(screen.getByText(/chat\.attachment\.voiceNote/)).toBeInTheDocument();
    expect(screen.getByTestId(testId).querySelector('svg.lucide-mic')).not.toBeNull();

    rerender(
      <ul>
        <Component
          {...props({
            file: makeLibraryFile({ filename: 'rec.mp4', mimeType: 'video/mp4' }),
          })}
        />
      </ul>,
    );
    expect(screen.getByText(/chat\.attachment\.videoNote/)).toBeInTheDocument();
    expect(screen.getByTestId(testId).querySelector('svg.lucide-video')).not.toBeNull();
  });

  it('says an archive attaches whole, with how many files it holds', () => {
    render(
      <ul>
        <Component
          {...props({
            file: makeLibraryFile({
              id: 'zip',
              filename: 'bundle.zip',
              mimeType: 'application/zip',
              childCount: 3,
              extractionMetadata: { fileEntryCount: 12 },
            }),
          })}
        />
      </ul>,
    );
    expect(
      screen.getByText(/files\.archive\.attachWhole · files\.archive\.fileCount:12/),
    ).toBeInTheDocument();
  });

  it('shows only size and date for an ordinary document', () => {
    render(
      <ul>
        <Component {...props({ file: makeLibraryFile() })} />
      </ul>,
    );
    expect(screen.queryByText(/voiceNote|videoNote|attachWhole/)).toBeNull();
  });
});

describe('useFileLibraryRow date language', () => {
  it('formats the date in the app language, not the browser default', () => {
    useTranslationState.locale = 'de';
    render(
      <ul>
        <FileLibraryRow
          {...props({ file: makeLibraryFile({ createdAt: '2026-10-05T10:00:00Z' }) })}
        />
      </ul>,
    );
    expect(screen.getByTestId('file-library-row')).toHaveTextContent(/5\. Okt/);
    useTranslationState.locale = 'en';
  });
});
