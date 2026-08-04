/**
 * How much weight a capability claim carries.
 *
 * This exists so routing can distinguish "we think this model has tools"
 * from "we watched this model call one". Agent runs require real capability;
 * routing on an unverified guess is how a run lands on a model that silently
 * ignores `tools` and then cannot explain why it did nothing.
 *
 * UNKNOWN     — never checked. Not the same as unsupported.
 * ADVERTISED  — claimed by the provider or a curated family list. Usable for
 *               ranking, never sufficient on its own for a strict gate.
 * PROVISIONAL — a probe started or partially succeeded; treat as advertised
 *               until it completes.
 * PROVEN      — a behavioral probe exercised the capability successfully.
 * FAILED      — a probe ran and the capability did NOT work. Strictly stronger
 *               than UNKNOWN: this model is known-bad for this capability, and
 *               must not be re-ranked upward by a later curated-list guess.
 */
export enum CapabilityConfidence {
  UNKNOWN = 'UNKNOWN',
  ADVERTISED = 'ADVERTISED',
  PROVISIONAL = 'PROVISIONAL',
  PROVEN = 'PROVEN',
  FAILED = 'FAILED',
}
