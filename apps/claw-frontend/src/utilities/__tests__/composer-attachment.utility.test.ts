import { describe, expect, it } from 'vitest';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type { ComposerUploadEntry } from '@/types/composer-attachment.types';
import {
  classifyUploadError,
  describeComposerAttachmentChip,
  resolveComposerAttachmentChips,
} from '@/utilities/composer-attachment.utility';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}(${Object.values(params).join(',')})`;

function upload(overrides: Partial<ComposerUploadEntry>): ComposerUploadEntry {
  return {
    localId: 'upload-1',
    filename: 'voice-note.webm',
    state: ComposerAttachmentState.Uploading,
    fileId: null,
    reason: null,
    ...overrides,
  };
}

function file(ingestionStatus: FileIngestionStatus, extractionError: string | null = null) {
  return { id: 'file-1', filename: 'voice-note.webm', ingestionStatus, extractionError };
}

function stateOf(
  uploads: ComposerUploadEntry[],
  files: ReturnType<typeof file>[],
  selected: string[] = ['file-1'],
): ComposerAttachmentState | undefined {
  return resolveComposerAttachmentChips({ selectedFileIds: selected, uploads, files })[0]?.state;
}

describe('resolveComposerAttachmentChips — the chip life cycle', () => {
  it('uploading → uploaded → processing → ready', () => {
    expect(stateOf([upload({})], [], [])).toBe(ComposerAttachmentState.Uploading);

    const landed = upload({ state: ComposerAttachmentState.Uploaded, fileId: 'file-1' });
    // The id is selected but the file list has not refetched yet.
    expect(stateOf([landed], [])).toBe(ComposerAttachmentState.Uploaded);
    expect(stateOf([landed], [file(FileIngestionStatus.PENDING)])).toBe(
      ComposerAttachmentState.Processing,
    );
    expect(stateOf([landed], [file(FileIngestionStatus.PROCESSING)])).toBe(
      ComposerAttachmentState.Processing,
    );
    expect(stateOf([landed], [file(FileIngestionStatus.COMPLETED)])).toBe(
      ComposerAttachmentState.Ready,
    );
  });

  // Found live 2026-09-25: a video tile read "Ready" while file-service's job
  // was still running, because the list returned the persisted COMPLETED.
  // file-service now lists a placeholder video as PROCESSING (the same
  // effective status its internal readiness check reports), so the sequence
  // the chip sees for a video is PROCESSING, PROCESSING, ... then COMPLETED.
  it('keeps a video Processing across polls until its document lands', () => {
    const landed = upload({
      filename: 'qa-clip.mp4',
      state: ComposerAttachmentState.Uploaded,
      fileId: 'file-1',
    });
    const polls = [
      FileIngestionStatus.PROCESSING,
      FileIngestionStatus.PROCESSING,
      FileIngestionStatus.COMPLETED,
    ].map((status) => stateOf([landed], [file(status)]));

    expect(polls).toEqual([
      ComposerAttachmentState.Processing,
      ComposerAttachmentState.Processing,
      ComposerAttachmentState.Ready,
    ]);
  });

  it('a failed ingestion carries the backend detail', () => {
    const chips = resolveComposerAttachmentChips({
      selectedFileIds: ['file-1'],
      uploads: [],
      files: [file(FileIngestionStatus.FAILED, 'Audio transcription failed: provider timed out')],
    });
    expect(chips[0]?.state).toBe(ComposerAttachmentState.Failed);
    expect(chips[0]?.detail).toBe('Audio transcription failed: provider timed out');
  });

  it('keeps a failed upload visible until dismissed, and drops a deselected file', () => {
    const chips = resolveComposerAttachmentChips({
      selectedFileIds: [],
      uploads: [
        upload({ state: ComposerAttachmentState.Failed, reason: 'Network error' }),
        upload({ localId: 'upload-2', state: ComposerAttachmentState.Uploaded, fileId: 'gone' }),
      ],
      files: [],
    });
    expect(chips).toHaveLength(1);
    expect(chips[0]?.localId).toBe('upload-1');
  });
});

describe('describeComposerAttachmentChip — copy, never colour alone', () => {
  it('states a failed upload with its reason', () => {
    const [draft] = resolveComposerAttachmentChips({
      selectedFileIds: [],
      uploads: [upload({ state: ComposerAttachmentState.Failed, reason: 'Network error' })],
      files: [],
    });
    if (draft === undefined) {
      throw new Error('expected a chip');
    }
    const chip = describeComposerAttachmentChip(draft, t);
    expect(chip.stateLabel).toBe('mediaUi.attachmentState.failed');
    expect(chip.note).toBe('mediaUi.attachmentState.uploadFailedReason: Network error');
    expect(chip.removeLabel).toBe('mediaUi.attachmentState.remove(voice-note.webm)');
  });

  it('says processing does not block sending', () => {
    const [draft] = resolveComposerAttachmentChips({
      selectedFileIds: ['file-1'],
      uploads: [],
      files: [file(FileIngestionStatus.PROCESSING)],
    });
    if (draft === undefined) {
      throw new Error('expected a chip');
    }
    expect(describeComposerAttachmentChip(draft, t).note).toBe(
      'mediaUi.attachmentState.processingHint',
    );
  });

  it('names an unknown file generically instead of by id', () => {
    const [draft] = resolveComposerAttachmentChips({
      selectedFileIds: ['file-9'],
      uploads: [],
      files: [],
    });
    if (draft === undefined) {
      throw new Error('expected a chip');
    }
    expect(describeComposerAttachmentChip(draft, t).displayName).toBe('chat.attachedFile');
  });
});

describe('classifyUploadError', () => {
  it('reads 415 as unsupported and anything else as failed', () => {
    expect(classifyUploadError(new ApiClientError({ message: 'x', status: 415 }))).toBe(
      ComposerAttachmentState.Unsupported,
    );
    expect(classifyUploadError(new ApiClientError({ message: 'x', status: 500 }))).toBe(
      ComposerAttachmentState.Failed,
    );
    expect(classifyUploadError(new Error('offline'))).toBe(ComposerAttachmentState.Failed);
  });
});
