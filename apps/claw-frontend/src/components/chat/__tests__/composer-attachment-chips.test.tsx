import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerAttachmentChips } from '@/components/chat/composer-attachment-chips';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import type { ComposerAttachmentChip } from '@/types/composer-attachment.types';

function chip(overrides: Partial<ComposerAttachmentChip>): ComposerAttachmentChip {
  return {
    key: 'file-1',
    filename: 'clip.mp4',
    displayName: 'clip.mp4',
    state: ComposerAttachmentState.Ready,
    stateLabel: 'Ready',
    fileId: 'file-1',
    localId: null,
    detail: null,
    note: null,
    removeLabel: 'Remove clip.mp4',
    canCancelProcessing: false,
    ...overrides,
  };
}

describe('ComposerAttachmentChips', () => {
  it('renders nothing when nothing is attached', () => {
    const { container } = render(
      <ComposerAttachmentChips chips={[]} listLabel="Attached files" onRemove={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('announces changes politely and spells every state out in words', () => {
    render(
      <ComposerAttachmentChips
        chips={[
          chip({ key: 'a', state: ComposerAttachmentState.Uploading, stateLabel: 'Uploading' }),
          chip({
            key: 'b',
            state: ComposerAttachmentState.Processing,
            stateLabel: 'Processing',
            note: 'You can send now; it is used once processing ends',
          }),
          chip({ key: 'c', state: ComposerAttachmentState.Ready, stateLabel: 'Ready' }),
        ]}
        listLabel="Attached files"
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByTestId('composer-attachment-chips')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('list', { name: 'Attached files' })).toBeInTheDocument();
    const states = screen
      .getAllByTestId('composer-attachment-chip-state')
      .map((node) => node.textContent);
    expect(states).toEqual(['Uploading', 'Processing', 'Ready']);
    expect(screen.getByText('You can send now; it is used once processing ends')).toBeVisible();
  });

  it('shows a failure reason as visible text, and removes the chip on request', () => {
    const onRemove = vi.fn();
    const failed = chip({
      state: ComposerAttachmentState.Failed,
      stateLabel: 'Failed',
      note: 'The file could not be processed: Audio transcription failed',
    });
    render(
      <ComposerAttachmentChips chips={[failed]} listLabel="Attached files" onRemove={onRemove} />,
    );

    expect(screen.getByTestId('composer-attachment-chip')).toHaveAttribute(
      'data-state',
      ComposerAttachmentState.Failed,
    );
    expect(screen.getByTestId('composer-attachment-chip-note')).toHaveTextContent(
      'The file could not be processed: Audio transcription failed',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove clip.mp4' }));
    expect(onRemove).toHaveBeenCalledWith(failed);
  });
});
