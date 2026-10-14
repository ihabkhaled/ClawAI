import type { AuthKind } from '../../../common/enums/auth-kind.enum';
import type { ConsentDecision } from '../../../common/enums/consent-decision.enum';
import type { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import type { InvokeOutcome } from '../../../common/enums/invoke-outcome.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';
import type { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import type { TargetKind } from '../../../common/enums/target-kind.enum';
import type { PluginManifest } from '../../catalog/schemas/plugin-manifest.schema';

/** What every target shares, whichever kind it is. */
export type InvokeTargetBase = {
  /** The slug in plugin_<slug>_<tool>: a catalog slug, or the server's generated slug. */
  slug: string;
  /** The tool's local name, as the caller sent it. */
  toolName: string;
  title: string;
  riskLevel: RiskLevel;
  /** A stored grant that matches this tool's risk. Never true for DESTRUCTIVE. */
  consentGranted: boolean;
  inputSchema: Record<string, unknown>;
  /** The tool's own deadline and result cap; null means "use the admin setting". */
  timeoutMs: number | null;
  maxResultBytes: number | null;
  installId: string | null;
  pluginId: string | null;
  serverId: string | null;
};

export type SealedInstallCredential = { kind: AuthKind; headerName: string; ciphertext: string };

export type CatalogTarget = InvokeTargetBase & {
  kind: TargetKind.CATALOG;
  runtimeKind: RuntimeKind;
  manifest: PluginManifest;
  settings: Record<string, unknown>;
  credential: SealedInstallCredential | null;
};

export type ServerTarget = InvokeTargetBase & {
  kind: TargetKind.SERVER;
  ownerUserId: string;
  url: string;
  authKind: AuthKind;
  remoteName: string;
  failureCount: number;
  breakerOpenedAt: Date | null;
};

export type InvokeTarget = CatalogTarget | ServerTarget;

/** A target and, when it exists but cannot be called right now, the reason. */
export type ResolvedTarget = { target: InvokeTarget; blocked: InvokeErrorCode | null };

export type ConsentVerdict = { required: boolean; decision: ConsentDecision };

/** What an executor hands back. `text` is raw and untrusted until it is fenced. */
export type ExecutionResult = {
  outcome: InvokeOutcome;
  text: string;
  errorCode: string | null;
  /** True when the failure says the remote server is unhealthy (feeds the breaker). */
  serverFault: boolean;
  /** Set by the executor when it already cut the text. */
  truncated: boolean;
};

export type FencedResult = { content: string; bytes: number; truncated: boolean };

export type QuotaDetail = { used: number; limit: number; window: string | null };

export type ConsentRequest = {
  reason: ConsentDecision;
  argsHash: string;
  argsPreview: string;
};

/** The body of a 200 answer from POST /plugins/invoke. */
export type InvokeResponse = {
  callId: string;
  status: InvokeOutcome;
  /** The fenced, untrusted result (or error text). Null when nothing ran. */
  content: string | null;
  truncated: boolean;
  /** Always true: nothing a tool returns is an instruction. */
  untrusted: true;
  durationMs: number;
  riskLevel: RiskLevel;
  nativeName: string;
  errorCode: string | null;
  consent: ConsentRequest | null;
  quota: QuotaDetail | null;
};

export type AuditEntry = {
  userId: string;
  target: InvokeTargetBase;
  callId: string;
  surface: string;
  conversationId?: string;
  messageId?: string;
  status: InvokeOutcome;
  consentDecision: ConsentDecision;
  tainted: boolean;
  argsHash: string;
  resultBytes: number | null;
  truncated: boolean;
  errorCode: string | null;
  durationMs: number;
};

export type QuotaDecision =
  | { allowed: true; reservationId: string | null }
  | { allowed: false; errorCode: InvokeErrorCode; detail: QuotaDetail | null };

export type LimitSlot =
  { ok: true; release: () => void } | { ok: false; errorCode: InvokeErrorCode };

/** What an executor needs to run one call: who, the deadline, the cap and the abort signal. */
export type ExecutionContext = {
  userId: string;
  signal: AbortSignal;
  timeoutMs: number;
  maxResultBytes: number;
};

/** Everything the flow of one call carries from step to step. */
export type CallContext = {
  userId: string;
  callId: string;
  surface: string;
  conversationId?: string;
  messageId?: string;
  tainted: boolean;
  target: InvokeTarget;
  argsHash: string;
  started: number;
};
