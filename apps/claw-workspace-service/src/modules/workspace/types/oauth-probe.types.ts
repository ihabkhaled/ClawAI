import type { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';

export type OAuthProbeRequest = {
  method?: 'POST' | 'GET';
  headers: Record<string, string>;
  body?: string;
};

export type OAuthProbeInput = {
  /**
   * Where `tokenUrl` is declared to go (TD-040): the provider's token-URL
   * literal, or the admin-configured base for a self-hosted provider. Never
   * `tokenUrl` itself read back as its own authorisation.
   */
  declaredBase: string;
  tokenUrl: string;
  requestBuilder: () => OAuthProbeRequest;
  interpret: (payload: unknown, status: number) => OAuthProbeOutcome;
  timeoutMs?: number;
};
