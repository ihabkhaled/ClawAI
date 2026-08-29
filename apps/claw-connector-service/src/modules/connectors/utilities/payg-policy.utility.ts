import { PAYG_DEFAULT_PROVIDERS } from '@claw/shared-constants';
import { type ConnectorProvider } from '../../../generated/prisma';
import { type ConnectorPaygPolicyRow } from '../types/connectors.types';

const PAYG_DEFAULT_PROVIDER_SET = new Set<string>(PAYG_DEFAULT_PROVIDERS);

/**
 * The PAYG classification a connector starts life with, derived from its
 * provider.
 *
 * Only a DEFAULT. Once the row exists, `Connector.isPayAsYouGo` is the runtime
 * authority and the admin toggle is the lever (ADR-082). This exists so an
 * administrator who adds an OpenAI connector does not have to remember a second
 * call to start metering it, while a provider nobody has classified stays free.
 *
 * Deliberately provider-shaped, not model-shaped: `connectors` has
 * `@@index([provider])` and no unique constraint on it, so a provider can hold
 * several rows and a per-model key could not address any single one of them.
 */
export function paygDefaultForProvider(provider: ConnectorProvider): boolean {
  return PAYG_DEFAULT_PROVIDER_SET.has(provider);
}

/**
 * Rolls per-connector flags up to the provider grain auth-service reserves
 * against.
 *
 * A provider is PAYG when ANY **enabled** connector for it is PAYG. The
 * asymmetry is intentional and is the conservative direction: several
 * connectors can serve one provider (a personal key and a shared key, say), and
 * treating that provider as free because one of them is unclassified would hand
 * out uncapped provider spend. A disabled connector cannot serve traffic, so it
 * cannot make a provider cost money either — but it still contributes its
 * provider to the map, so a provider whose only PAYG connector is switched off
 * comes back as an explicit `false` rather than vanishing into an absent key
 * the caller would have to guess about.
 */
export function rollUpPaygPolicy(rows: readonly ConnectorPaygPolicyRow[]): Record<string, boolean> {
  // A Map rather than a plain object accumulator: the key is provider data off
  // a database row, and writing it into an object literal by computed index is
  // exactly the prototype-pollution shape `security/detect-object-injection`
  // exists to catch. Materialised once at the end instead.
  const metered = new Map<string, boolean>();

  for (const row of rows) {
    const previous = metered.get(row.provider) ?? false;
    metered.set(row.provider, previous || (row.isEnabled && row.isPayAsYouGo));
  }

  return Object.fromEntries(metered);
}
