import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { guardedFetch } from '../../../common/utilities/guarded-fetch.utility';
import { HEALTH_CHECK_TIMEOUT_MS } from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import type { HealthCheckResult } from '../types/workspace.types';
import type { OAuthProbeInput } from '../types/oauth-probe.types';

export async function probeOAuthAppCredentials(input: OAuthProbeInput): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const { method = 'POST', headers, body } = input.requestBuilder();
    // A refusal throws inside this try and reads as UNKNOWN, like an unreachable provider.
    const response = await guardedFetch(input.declaredBase, input.tokenUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(input.timeoutMs ?? HEALTH_CHECK_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - start;
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const outcome = input.interpret(payload, response.status);
    if (outcome === OAuthProbeOutcome.CREDENTIALS_OK) {
      return { status: WorkspaceConnectorStatus.CONNECTED, latencyMs };
    }
    return outcome === OAuthProbeOutcome.CREDENTIALS_BAD
      ? {
          status: WorkspaceConnectorStatus.DISCONNECTED,
          latencyMs,
          errorMessage: 'clientId or clientSecret rejected by provider',
        }
      : {
          status: WorkspaceConnectorStatus.UNKNOWN,
          latencyMs,
          errorMessage: `Provider returned unexpected response (HTTP ${String(response.status)})`,
        };
  } catch (error: unknown) {
    return {
      status: WorkspaceConnectorStatus.UNKNOWN,
      latencyMs: Date.now() - start,
      errorMessage: error instanceof Error ? error.message : 'Network error during probe',
    };
  }
}
