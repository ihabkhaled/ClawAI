import {
  INTER_SERVICE_TOKEN_PLACEHOLDER_MARKERS,
  PRODUCTION_NODE_ENV,
} from './inter-service-token.constants';

export function isPlaceholderInterServiceToken(token: string): boolean {
  const lowered = token.toLowerCase();
  return INTER_SERVICE_TOKEN_PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker));
}

/**
 * Throws when a production process would authenticate sibling services with a
 * published placeholder token. The placeholder is in the repository, so anyone
 * who can reach a service port could forge `Authorization: Service <token>`.
 * Outside production the placeholder stays allowed so a fresh checkout boots.
 */
export function assertInterServiceTokenNotPlaceholder(
  token: string,
  nodeEnv: string | undefined,
): void {
  if (nodeEnv !== PRODUCTION_NODE_ENV) {
    return;
  }
  if (isPlaceholderInterServiceToken(token)) {
    throw new Error(
      'Invalid environment configuration:\n  - INTER_SERVICE_AUTH_TOKEN: a placeholder value is not allowed when NODE_ENV=production; set a random secret',
    );
  }
}
