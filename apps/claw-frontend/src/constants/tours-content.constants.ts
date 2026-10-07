import { Locale } from '@/enums/locale.enum';
import type { TourDictionary } from '@/types/tour.types';

import { AR_TOURS_CONTENT } from './tours-content/ar.constants';
import { DE_TOURS_CONTENT } from './tours-content/de.constants';
import { EN_TOURS_CONTENT } from './tours-content/en.constants';
import { ES_TOURS_CONTENT } from './tours-content/es.constants';
import { FA_TOURS_CONTENT } from './tours-content/fa.constants';
import { FR_TOURS_CONTENT } from './tours-content/fr.constants';
import { HI_TOURS_CONTENT } from './tours-content/hi.constants';
import { IT_TOURS_CONTENT } from './tours-content/it.constants';
import { JA_TOURS_CONTENT } from './tours-content/ja.constants';
import { PT_TOURS_CONTENT } from './tours-content/pt.constants';
import { RU_TOURS_CONTENT } from './tours-content/ru.constants';
import { TH_TOURS_CONTENT } from './tours-content/th.constants';
import { ZH_TOURS_CONTENT } from './tours-content/zh.constants';

/** Product-tour copy, translated per locale. A missing locale is a compile error. */
export const TOURS_CONTENT_BY_LOCALE: Record<Locale, TourDictionary> = {
  [Locale.EN]: EN_TOURS_CONTENT,
  [Locale.AR]: AR_TOURS_CONTENT,
  [Locale.FR]: FR_TOURS_CONTENT,
  [Locale.IT]: IT_TOURS_CONTENT,
  [Locale.DE]: DE_TOURS_CONTENT,
  [Locale.ES]: ES_TOURS_CONTENT,
  [Locale.RU]: RU_TOURS_CONTENT,
  [Locale.PT]: PT_TOURS_CONTENT,
  [Locale.HI]: HI_TOURS_CONTENT,
  [Locale.JA]: JA_TOURS_CONTENT,
  [Locale.TH]: TH_TOURS_CONTENT,
  [Locale.FA]: FA_TOURS_CONTENT,
  [Locale.ZH]: ZH_TOURS_CONTENT,
};
