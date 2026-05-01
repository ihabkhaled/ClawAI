import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';

export const DIGEST_LOCK_NAMESPACE = 'workspace.digest';
export const DIGEST_DAILY_LOOKBACK_HOURS = 24;
export const DIGEST_WEEKLY_LOOKBACK_HOURS = 24 * 7;
export const DIGEST_MAX_OBJECTS_PER_PROVIDER = 25;
export const DIGEST_MAX_OBJECTS_PER_WEEKLY_PROVIDER = 100;
export const DIGEST_DEFAULT_MODEL = 'gemma3:4b';

export const DIGEST_HIGHLIGHT_KEYWORD_PATTERNS: ReadonlyArray<{
  regex: RegExp;
  kind: AiActionKind;
}> = [
  { regex: /\bsummari[sz]e\b/i, kind: AiActionKind.SUMMARIZE },
  { regex: /\b(extract|action items?)\b/i, kind: AiActionKind.EXTRACT },
  { regex: /\b(draft|reply|respond)\b/i, kind: AiActionKind.DRAFT },
  { regex: /\b(estimate|t-shirt)\b/i, kind: AiActionKind.ESTIMATE },
];

export const DIGEST_FALLBACK_NOTIFICATION_REGEX = /^(open|stale|pending|blocked|review|merge)/i;
