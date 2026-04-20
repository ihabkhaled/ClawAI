import type { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';

export type OAuthProbeRequest = {
  method?: 'POST' | 'GET';
  headers: Record<string, string>;
  body?: string;
};

export type OAuthProbeInput = {
  tokenUrl: string;
  requestBuilder: () => OAuthProbeRequest;
  interpret: (payload: unknown, status: number) => OAuthProbeOutcome;
  timeoutMs?: number;
};
