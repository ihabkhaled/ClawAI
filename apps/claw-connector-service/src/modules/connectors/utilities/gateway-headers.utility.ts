// LLM-gateway headers (F092): how they are stored and how they join a request.
// Pure — encryption is done by the caller with the service's own key.

import { GATEWAY_HEADER_FORBIDDEN_NAMES } from '../constants/gateway-headers.constants';

// Serialised with sorted names so the same headers always encrypt from the same
// plaintext. `undefined` in → `undefined` out (field omitted: keep what is
// stored); an empty object → `null` (clear the column).
export function serializeGatewayHeaders(
  headers: Record<string, string> | undefined,
): string | null | undefined {
  if (headers === undefined) {
    return undefined;
  }
  const entries = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
  return entries.length === 0 ? null : JSON.stringify(Object.fromEntries(entries));
}

// Tolerant: a row that does not decode to a string→string object yields no
// headers rather than a crash on every request through the connector.
export function parseGatewayHeaders(plaintext: string | null | undefined): Record<string, string> {
  if (plaintext === null || plaintext === undefined || plaintext.length === 0) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return {};
  }
  return typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)
    ? {}
    : Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
}

// Gateway headers are added UNDER the provider's own headers: a name the
// provider set (or any forbidden name, should one have been stored before the
// rule existed) is never overridden.
export function withGatewayHeaders(
  providerHeaders: Record<string, string>,
  gatewayHeaders: Record<string, string> | undefined,
): Record<string, string> {
  if (gatewayHeaders === undefined) {
    return providerHeaders;
  }
  const taken = new Set(Object.keys(providerHeaders).map((name) => name.toLowerCase()));
  const merged = Object.fromEntries(
    Object.entries(gatewayHeaders).filter(([name]) => {
      const lower = name.toLowerCase();
      return !taken.has(lower) && !GATEWAY_HEADER_FORBIDDEN_NAMES.has(lower);
    }),
  );
  return { ...merged, ...providerHeaders };
}
