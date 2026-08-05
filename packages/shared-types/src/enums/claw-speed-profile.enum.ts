/**
 * Public ClawAI speed profile.
 *
 * Speed and effort are ORTHOGONAL: a user may ask for high effort at standard
 * speed, or medium effort on an accelerated tier. Conflating them is how
 * "make it faster" quietly becomes "make it think less".
 *
 * The numbers are ClawAI target/resource profiles, NOT guaranteed wall-clock
 * multipliers. UI wording must say "target tier" unless a provider gives an
 * explicit measured guarantee for that exact model and request class.
 */
export enum ClawSpeedProfile {
  STANDARD_1X = 'STANDARD_1X',
  ACCELERATED_1_5X = 'ACCELERATED_1_5X',
  TURBO_2X = 'TURBO_2X',
}

/**
 * What the provider is actually doing — which is not always what was asked.
 *
 * UNSUPPORTED is the load-bearing member. §11.3 requires a run to "fail or
 * visibly degrade when the requested tier is unavailable — never claim 2×
 * while running standard", and that is only expressible if "we asked for turbo
 * and did not get it" is a distinct state from "we are running standard".
 */
export enum SpeedProviderMode {
  STANDARD = 'STANDARD',
  FAST = 'FAST',
  PRIORITY = 'PRIORITY',
  PROVISIONED = 'PROVISIONED',
  LOCAL_PROFILE = 'LOCAL_PROFILE',
  UNSUPPORTED = 'UNSUPPORTED',
}
