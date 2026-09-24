import { describe, expect, it } from 'vitest';
import { ModalityKind } from '../../../../generated/prisma';
import { normalizeSnapshotModalities, normalizeSnapshotRow } from '../snapshot-modality.utility';

describe('normalizeSnapshotModalities', () => {
  it('maps the connector AUDIO alias to AUDIO_INPUT (the row used to fail its upsert)', () => {
    expect(normalizeSnapshotModalities(['TEXT', 'AUDIO'])).toEqual([
      ModalityKind.TEXT,
      ModalityKind.AUDIO_INPUT,
    ]);
  });

  it('keeps real ModalityKind members untouched', () => {
    expect(normalizeSnapshotModalities(['IMAGE_INPUT', 'VIDEO_INPUT'])).toEqual([
      ModalityKind.IMAGE_INPUT,
      ModalityKind.VIDEO_INPUT,
    ]);
  });

  it('drops unknown and non-string members instead of letting Prisma reject the row', () => {
    expect(normalizeSnapshotModalities(['TEXT', 'HOLOGRAM', 42, null])).toEqual([
      ModalityKind.TEXT,
    ]);
  });

  it('de-duplicates an alias and its canonical member', () => {
    expect(normalizeSnapshotModalities(['AUDIO', 'AUDIO_INPUT'])).toEqual([
      ModalityKind.AUDIO_INPUT,
    ]);
  });

  it('keeps undefined as undefined so the builder default still applies', () => {
    expect(normalizeSnapshotModalities(undefined)).toBeUndefined();
  });
});

describe('normalizeSnapshotRow', () => {
  it('normalizes both directions and preserves every other field', () => {
    const row = normalizeSnapshotRow({
      provider: 'GEMINI',
      modelKey: 'models/gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash',
      modalitiesIn: [ModalityKind.TEXT, 'AUDIO' as ModalityKind],
      modalitiesOut: [ModalityKind.TEXT],
    });
    expect(row.modelKey).toBe('models/gemini-2.5-flash');
    expect(row.modalitiesIn).toEqual([ModalityKind.TEXT, ModalityKind.AUDIO_INPUT]);
    expect(row.modalitiesOut).toEqual([ModalityKind.TEXT]);
  });

  it('adds no modality keys a row did not carry', () => {
    const row = normalizeSnapshotRow({
      provider: 'OPENAI',
      modelKey: 'gpt-5',
      displayName: 'GPT-5',
    });
    expect('modalitiesIn' in row).toBe(false);
    expect('modalitiesOut' in row).toBe(false);
  });
});
