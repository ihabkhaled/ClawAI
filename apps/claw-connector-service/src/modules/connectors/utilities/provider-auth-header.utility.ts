import { type ConnectorProviderDefinition } from '../../../generated/prisma';
import { type ProviderAuthHeader } from '../types/provider-auth-header.types';
import { type ConnectorConfig } from '../managers/provider-adapter.interface';

/** `Bearer <key>`, or the bare key when the scheme is empty (AI Horde's `apikey`). */
export function buildAuthHeaderValue(header: ProviderAuthHeader, apiKey: string): string {
  return header.scheme.length > 0 ? `${header.scheme} ${apiKey}` : apiKey;
}

/**
 * chat-service always sends `Authorization: Bearer`. A provider that wants its
 * key elsewhere gets it added as an extra header on the execution config, which
 * chat-service already merges into every request.
 */
export function withCustomAuthHeader(
  config: ConnectorConfig,
  definition: ConnectorProviderDefinition | null | undefined,
): Record<string, string> | undefined {
  if (!definition || definition.isBuiltIn || config.apiKey.length === 0) {
    return config.gatewayHeaders;
  }
  const header = { name: definition.authHeaderName, scheme: definition.authHeaderScheme };
  if (header.name.toLowerCase() === 'authorization' && header.scheme === 'Bearer') {
    return config.gatewayHeaders;
  }
  return {
    ...config.gatewayHeaders,
    [header.name]: buildAuthHeaderValue(header, config.apiKey),
  };
}
