import { Locale } from '@/enums/locale.enum';
import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

import { AR_CODING_AGENT_CONTENT } from './coding-agent-content/ar.constants';
import { DE_CODING_AGENT_CONTENT } from './coding-agent-content/de.constants';
import { EN_CODING_AGENT_CONTENT } from './coding-agent-content/en.constants';
import { ES_CODING_AGENT_CONTENT } from './coding-agent-content/es.constants';
import { FA_CODING_AGENT_CONTENT } from './coding-agent-content/fa.constants';
import { FR_CODING_AGENT_CONTENT } from './coding-agent-content/fr.constants';
import { HI_CODING_AGENT_CONTENT } from './coding-agent-content/hi.constants';
import { IT_CODING_AGENT_CONTENT } from './coding-agent-content/it.constants';
import { JA_CODING_AGENT_CONTENT } from './coding-agent-content/ja.constants';
import { PT_CODING_AGENT_CONTENT } from './coding-agent-content/pt.constants';
import { RU_CODING_AGENT_CONTENT } from './coding-agent-content/ru.constants';
import { TH_CODING_AGENT_CONTENT } from './coding-agent-content/th.constants';
import { ZH_CODING_AGENT_CONTENT } from './coding-agent-content/zh.constants';

/**
 * Coding Agent copy, translated per locale.
 *
 * Same rule as the comparison cluster: a page only earns its place in a
 * locale's sitemap if a reader of that language can read it. An English body
 * behind a translated URL is worse for discovery than no page at all.
 */
export const CODING_AGENT_CONTENT_BY_LOCALE: Record<Locale, CodingAgentDictionary> = {
  [Locale.EN]: EN_CODING_AGENT_CONTENT,
  [Locale.AR]: AR_CODING_AGENT_CONTENT,
  [Locale.FR]: FR_CODING_AGENT_CONTENT,
  [Locale.IT]: IT_CODING_AGENT_CONTENT,
  [Locale.DE]: DE_CODING_AGENT_CONTENT,
  [Locale.ES]: ES_CODING_AGENT_CONTENT,
  [Locale.RU]: RU_CODING_AGENT_CONTENT,
  [Locale.PT]: PT_CODING_AGENT_CONTENT,
  [Locale.HI]: HI_CODING_AGENT_CONTENT,
  [Locale.JA]: JA_CODING_AGENT_CONTENT,
  [Locale.TH]: TH_CODING_AGENT_CONTENT,
  [Locale.FA]: FA_CODING_AGENT_CONTENT,
  [Locale.ZH]: ZH_CODING_AGENT_CONTENT,
};
