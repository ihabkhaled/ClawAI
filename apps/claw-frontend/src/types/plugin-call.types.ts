import type { PluginToolRiskLevel } from '@claw/shared-types';

import type { PluginCallStatus } from '@/enums/plugin-call-status.enum';
import type { PluginNoticeCode } from '@/enums/plugin-notice-code.enum';

/** One tool call as chat-service stored it on the assistant message (`metadata.pluginCalls`). */
export type PluginCallView = {
  callId: string;
  round: number;
  pluginSlug: string;
  toolName: string;
  title: string;
  riskLevel: PluginToolRiskLevel;
  status: PluginCallStatus;
  durationMs: number;
  truncated: boolean;
  errorCode?: string;
  /** Capped plain text of what the plugin returned. Shown as text, never as HTML. */
  resultExcerpt?: string;
};

export type PluginNoticeView = { code: PluginNoticeCode; pluginSlug?: string };

export type PluginCallTimelineProps = {
  calls: readonly PluginCallView[];
  notices: readonly PluginNoticeView[];
};

export type MessagePluginRefsProps = {
  refs: readonly { installId: string; label: string }[];
};
