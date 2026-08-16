const PLACEHOLDER_PREFIX = '$PROVIDER:';

/**
 * Extracts the provider name from a template step's connectorId
 * placeholder (e.g. "$PROVIDER:JIRA" → "JIRA"), or null if the string
 * isn't a placeholder at all (already a real connector id).
 */
export function parseProviderPlaceholder(connectorId: string): string | null {
  if (!connectorId.startsWith(PLACEHOLDER_PREFIX)) {
    return null;
  }
  return connectorId.slice(PLACEHOLDER_PREFIX.length);
}
