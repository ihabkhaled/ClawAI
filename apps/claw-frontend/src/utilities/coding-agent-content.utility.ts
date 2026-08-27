import { CODING_AGENT_CONTENT_BY_LOCALE } from '@/constants/coding-agent-content.constants';
import type { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * The Coding Agent copy for one locale.
 *
 * Falls back to English only if a locale is somehow missing from the record,
 * which the type system already prevents — the fallback exists so a bad runtime
 * locale string renders a page rather than throwing.
 */
export function getCodingAgentContent(locale: Locale): CodingAgentDictionary {
  return CODING_AGENT_CONTENT_BY_LOCALE[locale] ?? CODING_AGENT_CONTENT_BY_LOCALE[DEFAULT_LOCALE];
}
