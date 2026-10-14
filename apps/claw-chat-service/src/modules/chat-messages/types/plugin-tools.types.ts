import type { PluginToolRiskLevel } from '@claw/shared-types';

import type { ChatSurface } from '../../../common/enums/chat-surface.enum';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { PluginInvokeStatus } from '../enums/plugin-invoke-status.enum';
import type { PluginNoticeCode } from '../enums/plugin-notice-code.enum';
import type { AssembledContext } from './context.types';
import type { ExecutionOptions } from './execution-options.types';
import type { LlmResponse } from './execution.types';
import type { PluginConsentCard } from './plugin-consent.types';
import type { NormalizedToolCall } from './provider-tool.types';

/** One `@mention` the user sent with a message (`pluginRefs`). */
export type PluginRef = {
  installId: string;
  /** Present when the user picked one tool rather than the whole plugin. */
  toolName?: string | undefined;
  label: string;
};

/** A tool plugin-service offers for this turn, already namespaced `plugin_<slug>_<tool>`. */
export type ResolvedPluginTool = {
  nativeName: string;
  installId: string;
  pluginSlug: string;
  toolName: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  riskLevel: PluginToolRiskLevel;
};

export type PluginLoopLimits = {
  maxRounds: number;
  maxCallsPerTurn: number;
  timeoutMs: number;
};

export type PluginNotice = { code: PluginNoticeCode; pluginSlug?: string | undefined };

export type PluginResolveRequest = {
  userId: string;
  surface: ChatSurface;
  refs: readonly PluginRef[];
};

export type PluginResolveResult = {
  tools: readonly ResolvedPluginTool[];
  /** Text for the system prompt (what each plugin is, how to use it). May be empty. */
  systemBlock: string;
  limits: PluginLoopLimits;
  notices: readonly PluginNotice[];
};

export type PluginInvokeRequest = {
  userId: string;
  installId: string;
  toolName: string;
  args: Record<string, unknown>;
  conversationId: string;
  messageId?: string | undefined;
  surface: ChatSurface;
  /** True once any untrusted tool result is already in the model context this turn. */
  tainted: boolean;
  /** Set when a call resumes after the user said yes: the same call id as the one that asked. */
  callId?: string | undefined;
  /** The consent request the user approved on the card. plugin-service spends it once. */
  consentRequestId?: string | undefined;
};

export type PluginInvokeResult = {
  status: PluginInvokeStatus;
  content?: string | undefined;
  truncated: boolean;
  durationMs: number;
  errorCode?: string | undefined;
  /** The call id plugin-service used; needed to resume the same call after a yes. */
  callId?: string | undefined;
  /** The open consent question, when the status is CONSENT_REQUIRED and the service raised one. */
  consent?: PluginConsentCard | undefined;
};

/** What the UI shows for one call, stored on the assistant message as `pluginCalls`. */
export type PluginCallRecord = {
  callId: string;
  round: number;
  pluginSlug: string;
  toolName: string;
  title: string;
  riskLevel: PluginToolRiskLevel;
  status: PluginInvokeStatus;
  durationMs: number;
  truncated: boolean;
  errorCode?: string | undefined;
  /** Capped plain text of what the plugin returned. Never rendered as HTML. */
  resultExcerpt?: string | undefined;
};

/** What a model round gets: the context to send and the options to send it with. */
export type PluginModelRound = {
  round: number;
  context: AssembledContext;
  options: ExecutionOptions;
};

export type PluginToolLoopArgs = {
  context: AssembledContext;
  executionOptions: ExecutionOptions | undefined;
  /** One paid model call. The caller owns billing: every round is its own chokepoint call. */
  callModel: (round: PluginModelRound) => Promise<LlmResponse>;
  messageId?: string | undefined;
  threadId?: string | undefined;
};

/** A Runtime risk class, as a tool definition carries it. */
export type PluginRiskClass = ToolDefinitionDto['riskClasses'][number];

export type PluginRiskClassMap = Readonly<Record<PluginToolRiskLevel, PluginRiskClass>>;

/** Plugin tools that passed the Runtime definition schema, with their definitions. */
export type PluginToolCatalog = {
  accepted: ResolvedPluginTool[];
  definitions: ToolDefinitionDto[];
};

/** What the loop carries from one model round to the next. */
export type PluginLoopRoundState = {
  context: AssembledContext;
  records: PluginCallRecord[];
  notices: PluginNotice[];
  callsMade: number;
  tainted: boolean;
};

export type PluginExecuteCallsInput = {
  args: PluginToolLoopArgs;
  state: PluginLoopRoundState;
  round: number;
  calls: readonly NormalizedToolCall[];
  byName: ReadonlyMap<string, ResolvedPluginTool>;
  maxCallsPerTurn: number;
};
