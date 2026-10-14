import type { InvocationState } from '../../../common/enums/invocation-status.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';

/** One row of plugin_invocations as it is written. */
export type InvocationRow = {
  userId: string;
  installId: string | null;
  pluginId: string | null;
  serverId: string | null;
  callId: string;
  toolName: string;
  conversationId: string | null;
  messageId: string | null;
  surface: string;
  status: InvocationState;
  riskLevel: RiskLevel;
  consentDecision: string;
  taintedTurn: boolean;
  argsHash: string;
  resultBytes: number | null;
  truncated: boolean;
  errorCode: string | null;
  durationMs: number;
};
