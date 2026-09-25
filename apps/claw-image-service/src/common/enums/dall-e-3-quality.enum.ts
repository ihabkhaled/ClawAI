/**
 * The `quality` values OpenAI accepts for `dall-e-3`. Each one is priced on its
 * own routing `ModelCostVersion` row: `standard` on the base `dall-e-3` row
 * (seed v4, $0.040), `hd` on `dall-e-3@hd` (seed v9, $0.080).
 */
export enum DallE3Quality {
  STANDARD = 'standard',
  HD = 'hd',
}
