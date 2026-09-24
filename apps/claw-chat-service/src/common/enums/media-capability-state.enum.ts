// Whether ONE model can take ONE kind of media natively, as far as the
// connector catalog (the source of truth, ADR-120) knows.
//
// Tri-state on purpose. UNKNOWN is not UNSUPPORTED: a model missing from the
// catalog snapshot, or a snapshot that could not be fetched, must not strip a
// working image flow — UNKNOWN falls back to the documented provider-level
// behaviour (`VISION_CAPABLE_PROVIDERS`, `GEMINI_VIDEO_CAPABLE_MODELS`) so an
// outage never regresses a turn that used to work.
export enum MediaCapabilityState {
  SUPPORTED = 'SUPPORTED',
  UNSUPPORTED = 'UNSUPPORTED',
  UNKNOWN = 'UNKNOWN',
}
