import { AlertCircle, CheckCircle2, type LucideIcon, ShieldQuestion } from 'lucide-react';

import { PLUGIN_CALL_STATUS_KEYS, PLUGIN_NOTICE_KEYS } from '@/constants/plugin-call.constants';
import { PluginCallStatus } from '@/enums/plugin-call-status.enum';
import type { PluginNoticeCode } from '@/enums/plugin-notice-code.enum';
import type { PluginCallView, PluginNoticeView } from '@/types/plugin-call.types';
import type { PluginRefPayload } from '@/types/plugin-mention.types';

const RISK_LEVELS: readonly PluginCallView['riskLevel'][] = ['READ', 'WRITE', 'DESTRUCTIVE'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCallStatus(value: unknown): value is PluginCallStatus {
  return typeof value === 'string' && Object.hasOwn(PLUGIN_CALL_STATUS_KEYS, value);
}

function isNoticeCode(value: unknown): value is PluginNoticeCode {
  return typeof value === 'string' && Object.hasOwn(PLUGIN_NOTICE_KEYS, value);
}

function isRiskLevel(value: unknown): value is PluginCallView['riskLevel'] {
  return RISK_LEVELS.some((level) => level === value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function toCallView(entry: unknown): PluginCallView | null {
  if (!isRecord(entry)) {
    return null;
  }
  const callId = readString(entry['callId']);
  const pluginSlug = readString(entry['pluginSlug']);
  const toolName = readString(entry['toolName']);
  const status = entry['status'];
  const risk = entry['riskLevel'];
  if (callId === undefined || pluginSlug === undefined || toolName === undefined) {
    return null;
  }
  if (!isCallStatus(status)) {
    return null;
  }
  const errorCode = readString(entry['errorCode']);
  const excerpt = readString(entry['resultExcerpt']);
  return {
    callId,
    round: readNumber(entry['round']),
    pluginSlug,
    toolName,
    title: readString(entry['title']) ?? toolName,
    riskLevel: isRiskLevel(risk) ? risk : 'READ',
    status,
    durationMs: readNumber(entry['durationMs']),
    truncated: entry['truncated'] === true,
    ...(errorCode === undefined ? {} : { errorCode }),
    ...(excerpt === undefined ? {} : { resultExcerpt: excerpt }),
  };
}

/** The tool calls an assistant message used, read defensively from its stored metadata. */
export function readPluginCalls(metadata: Record<string, unknown> | null): PluginCallView[] {
  const raw = metadata?.['pluginCalls'];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry) => {
    const view = toCallView(entry);
    return view === null ? [] : [view];
  });
}

/** Why a mentioned plugin did not run, read defensively from stored metadata. */
export function readPluginNotices(metadata: Record<string, unknown> | null): PluginNoticeView[] {
  const raw = metadata?.['pluginNotices'];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry): PluginNoticeView[] => {
    if (!isRecord(entry) || !isNoticeCode(entry['code'])) {
      return [];
    }
    const pluginSlug = readString(entry['pluginSlug']);
    return [{ code: entry['code'], ...(pluginSlug === undefined ? {} : { pluginSlug }) }];
  });
}

/** The chips a user message was sent with, read defensively from its stored metadata. */
export function readPluginRefs(
  metadata: Record<string, unknown> | null,
): Pick<PluginRefPayload, 'installId' | 'label'>[] {
  const raw = metadata?.['pluginRefs'];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const installId = readString(entry['installId']);
    const label = readString(entry['label']);
    return installId === undefined || label === undefined ? [] : [{ installId, label }];
  });
}

/** The glyph beside a call's outcome: done, a problem, or waiting on the user. */
export function statusIconFor(status: PluginCallStatus, failed: boolean): LucideIcon {
  if (status === PluginCallStatus.OK) {
    return CheckCircle2;
  }
  return failed ? AlertCircle : ShieldQuestion;
}
