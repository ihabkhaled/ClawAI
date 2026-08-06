import { ConnectorProvider } from '../../../generated/prisma';

const CONNECTOR_PROVIDERS = new Set<string>(Object.values(ConnectorProvider));

/**
 * Guards the enum boundary before a caller-supplied provider string reaches
 * Prisma. Without it a value outside the enum raises a validation error that
 * escapes as an opaque 500 instead of "no such connector".
 */
export function isConnectorProvider(value: string): value is ConnectorProvider {
  return CONNECTOR_PROVIDERS.has(value);
}
