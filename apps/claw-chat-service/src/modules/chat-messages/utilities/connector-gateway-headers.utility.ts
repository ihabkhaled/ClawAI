// LLM-gateway headers (F092). connector-service validates and stores them
// (names the connector owns — Authorization, x-api-key, Host… — are refused on
// write and dropped on read); this side only merges them under the provider's
// own headers so a gateway header can never replace the connector's key.

export function withConnectorGatewayHeaders(
  providerHeaders: Record<string, string>,
  gatewayHeaders: Record<string, string> | undefined,
): Record<string, string> {
  if (gatewayHeaders === undefined) {
    return providerHeaders;
  }
  const taken = new Set(Object.keys(providerHeaders).map((name) => name.toLowerCase()));
  const merged = Object.fromEntries(
    Object.entries(gatewayHeaders).filter(([name]) => !taken.has(name.toLowerCase())),
  );
  return { ...merged, ...providerHeaders };
}
