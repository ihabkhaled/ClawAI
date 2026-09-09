import { AR_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/ar.constants';
import { DE_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/de.constants';
import { EN_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/en.constants';
import { ES_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/es.constants';
import { FA_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/fa.constants';
import { FR_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/fr.constants';
import { HI_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/hi.constants';
import { IT_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/it.constants';
import { JA_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/ja.constants';
import { PT_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/pt.constants';
import { RU_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/ru.constants';
import { TH_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/th.constants';
import { ZH_PROMPT_GUIDE_CONTENT } from '@/constants/prompt-guide-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { PromptGuideContentByLocale } from '@/types/prompt-guide.types';

/**
 * The `/prompts` cluster's copy, one dictionary per locale. See
 * `learn-content.constants.ts` for why body copy lives here rather than in
 * the global i18n dictionary.
 */
export const PROMPT_GUIDE_CONTENT_BY_LOCALE: PromptGuideContentByLocale = {
  [Locale.EN]: EN_PROMPT_GUIDE_CONTENT,
  [Locale.AR]: AR_PROMPT_GUIDE_CONTENT,
  [Locale.DE]: DE_PROMPT_GUIDE_CONTENT,
  [Locale.ES]: ES_PROMPT_GUIDE_CONTENT,
  [Locale.FA]: FA_PROMPT_GUIDE_CONTENT,
  [Locale.FR]: FR_PROMPT_GUIDE_CONTENT,
  [Locale.HI]: HI_PROMPT_GUIDE_CONTENT,
  [Locale.IT]: IT_PROMPT_GUIDE_CONTENT,
  [Locale.JA]: JA_PROMPT_GUIDE_CONTENT,
  [Locale.PT]: PT_PROMPT_GUIDE_CONTENT,
  [Locale.RU]: RU_PROMPT_GUIDE_CONTENT,
  [Locale.TH]: TH_PROMPT_GUIDE_CONTENT,
  [Locale.ZH]: ZH_PROMPT_GUIDE_CONTENT,
};
