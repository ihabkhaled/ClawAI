import { classifyMediaOutputModel, type MediaOutputClassification } from '@claw/shared-utilities';
import { type ModelCostVersion } from '../../../generated/prisma';

/** The unit rate that prices one artifact of this kind, or null when the row has none. */
function unitRate(row: ModelCostVersion, media: MediaOutputClassification): bigint | null {
  if (media.kind === 'VIDEO') return row.videoPerUnitMicroUsd;
  if (media.kind === 'IMAGE') return row.imagePerUnitMicroUsd;
  // Music is metered as one `imageUnits` item (PaygSurface has no per-song unit); speech per character.
  return media.audioKind === 'MUSIC' ? row.imagePerUnitMicroUsd : row.ttsPerCharacterMicroUsd;
}

function tokenTotal(row: ModelCostVersion): bigint {
  return (row.inputPerMillionMicroUsd ?? 0n) + (row.outputPerMillionMicroUsd ?? 0n);
}

/**
 * The dearest ACTIVE row of the provider's own media family (same kind, and for audio
 * the same speech/music split) to stand in for an unseeded media model id, or null when
 * the provider has no priced sibling: such an id stays UNPRICED (PAYG_MODEL_UNPRICED)
 * instead of being charged a chat TOKEN rate that would settle a per-image or
 * per-second job at about $0.
 *
 * Unit-priced siblings win when there are any (the job settles on units); otherwise the
 * dearest token-priced sibling (Gemini images and speech settle on tokens).
 */
export function dearestMediaSibling(
  rows: readonly ModelCostVersion[],
  provider: string,
  media: MediaOutputClassification,
): ModelCostVersion | null {
  const siblings = rows.filter((row) => {
    const other = classifyMediaOutputModel(row.modelKey, provider);
    return other?.kind === media.kind && other.audioKind === media.audioKind;
  });
  let dearest: ModelCostVersion | null = null;
  let dearestRate = 0n;
  for (const row of siblings) {
    const rate = unitRate(row, media);
    if (rate !== null && rate > dearestRate) {
      dearest = row;
      dearestRate = rate;
    }
  }
  if (dearest !== null) return dearest;
  for (const row of siblings) {
    const total = tokenTotal(row);
    if (total > dearestRate) {
      dearest = row;
      dearestRate = total;
    }
  }
  return dearest;
}
