/**
 * Public ClawAI effort profile — a quality/reasoning control.
 *
 * Effort is NOT response length, runtime duration, tool budget, speed tier, or
 * autonomy level. Those are separate dimensions with separate caps; conflating
 * them is how "make it think harder" turns into "let it run unbounded".
 *
 * ULTRA is a ClawAI orchestration preset, not a provider-native value. No
 * provider is ever sent `ultra` — it resolves to the highest proven native
 * level plus additional ClawAI passes.
 */
export enum ClawEffortProfile {
  AUTO = 'AUTO',
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  XHIGH = 'XHIGH',
  MAX = 'MAX',
  ULTRA = 'ULTRA',
}

/**
 * How a requested profile ended up being expressed to the provider.
 *
 * NATIVE       — provider takes a first-class effort/reasoning level.
 * BOOLEAN      — provider only has on/off (e.g. some Ollama models' `think`).
 * TOKEN_BUDGET — expressed as a reasoning-token budget instead of a level.
 * ORCHESTRATED — no provider control; ClawAI supplies the effort with extra
 *                planning/verification passes.
 * UNSUPPORTED  — the profile cannot be honoured for this model. Surfaced
 *                explicitly rather than silently downgraded.
 */
export enum EffortResolutionKind {
  NATIVE = 'NATIVE',
  BOOLEAN = 'BOOLEAN',
  TOKEN_BUDGET = 'TOKEN_BUDGET',
  ORCHESTRATED = 'ORCHESTRATED',
  UNSUPPORTED = 'UNSUPPORTED',
}

/** Depth of governed research a profile authorises. */
export enum EffortResearchDepth {
  NONE = 'NONE',
  FOCUSED = 'FOCUSED',
  DEEP = 'DEEP',
  EXHAUSTIVE = 'EXHAUSTIVE',
}
