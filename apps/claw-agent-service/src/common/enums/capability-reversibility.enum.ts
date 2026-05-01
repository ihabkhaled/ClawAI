// REVERSIBLE      — bit-for-bit undoable (rename file)
// COMPENSATABLE   — can record undo plan (deleted file → restore from snapshot)
// IRREVERSIBLE    — cannot undo (sent network packet, killed process group)
export enum CapabilityReversibility {
  REVERSIBLE = 'REVERSIBLE',
  COMPENSATABLE = 'COMPENSATABLE',
  IRREVERSIBLE = 'IRREVERSIBLE',
}
