import { describe, expect, it } from 'vitest';

import { FileIngestionStatus } from '../../../../generated/prisma';
import { OWNER_PLACEHOLDER_PROCESSING_CEILING_MS } from '../../constants/effective-ingestion.constants';
import { VIDEO_PROCESSING_LOCK_TTL_SECONDS } from '../../constants/video-processing.constants';
import { type EffectiveIngestionRow } from '../../types/effective-ingestion.types';
import {
  resolveEffectiveIngestionStatus,
  withOwnerFacingIngestionStatus,
} from '../effective-ingestion.utility';

const NOW = Date.parse('2026-09-25T12:00:00Z');

function row(overrides: Partial<EffectiveIngestionRow> = {}): EffectiveIngestionRow {
  return {
    mimeType: 'video/mp4',
    ingestionStatus: FileIngestionStatus.COMPLETED,
    extractedText: '[Video file: clip.mp4]',
    extractionError: null,
    updatedAt: new Date(NOW - 1000),
    ...overrides,
  };
}

describe('resolveEffectiveIngestionStatus (rule 42 items 12/15)', () => {
  it.each([
    ['video placeholder', row(), FileIngestionStatus.PROCESSING],
    [
      'audio placeholder',
      row({ mimeType: 'audio/mpeg', extractedText: '[Audio file: memo.mp3]' }),
      FileIngestionStatus.PROCESSING,
    ],
    ['failed video', row({ extractionError: 'queue down' }), FileIngestionStatus.FAILED],
    [
      'finished video',
      row({ extractedText: 'Video "clip.mp4" — length 00:04.' }),
      FileIngestionStatus.COMPLETED,
    ],
    [
      'a PDF',
      row({ mimeType: 'application/pdf', extractedText: 'body' }),
      FileIngestionStatus.COMPLETED,
    ],
    [
      'a persisted PENDING row',
      row({ ingestionStatus: FileIngestionStatus.PENDING, extractedText: null }),
      FileIngestionStatus.PENDING,
    ],
    [
      'a placeholder prefix on the wrong kind',
      row({ mimeType: 'image/png' }),
      FileIngestionStatus.COMPLETED,
    ],
  ])('%s', (_label, input, expected) => {
    expect(resolveEffectiveIngestionStatus(input, { now: NOW })).toBe(expected);
  });

  it('has no ceiling unless one is asked for (the internal check keeps waiting)', () => {
    const stale = row({ updatedAt: new Date(NOW - 24 * 60 * 60 * 1000) });
    expect(resolveEffectiveIngestionStatus(stale, { now: NOW })).toBe(
      FileIngestionStatus.PROCESSING,
    );
  });
});

describe('withOwnerFacingIngestionStatus', () => {
  it('reports the effective status and never mutates the row', () => {
    const input = row();
    const shown = withOwnerFacingIngestionStatus(input, NOW);
    expect(shown.ingestionStatus).toBe(FileIngestionStatus.PROCESSING);
    expect(input.ingestionStatus).toBe(FileIngestionStatus.COMPLETED);
  });

  it('reports the persisted status past the ceiling, so a lost job cannot pin the list poll', () => {
    const stale = row({ updatedAt: new Date(NOW - OWNER_PLACEHOLDER_PROCESSING_CEILING_MS - 1) });
    expect(withOwnerFacingIngestionStatus(stale, NOW).ingestionStatus).toBe(
      FileIngestionStatus.COMPLETED,
    );
  });

  it('keeps a failure FAILED even past the ceiling', () => {
    const stale = row({
      extractionError: 'Audio transcription failed',
      updatedAt: new Date(NOW - OWNER_PLACEHOLDER_PROCESSING_CEILING_MS - 1),
    });
    expect(withOwnerFacingIngestionStatus(stale, NOW).ingestionStatus).toBe(
      FileIngestionStatus.FAILED,
    );
  });

  it('outlives the slowest real job (the video lock TTL)', () => {
    expect(OWNER_PLACEHOLDER_PROCESSING_CEILING_MS).toBeGreaterThan(
      VIDEO_PROCESSING_LOCK_TTL_SECONDS * 1000,
    );
  });
});
