import { Locale } from '@/enums/locale.enum';
import { THREAD_PUBLIC_BOARD_TRANSLATIONS } from '@/lib/i18n/locales/thread-public-board-translations';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

/** Registry slug of the public, read-only Threads board. */
export const THREADS_PUBLIC_BOARD_SLUG = 'threads/board';

/** Path of the public Threads board (locale-prefixed by the router). */
export const THREADS_PUBLIC_BOARD_PATH = '/threads/board';

const SEO_KEYWORDS_BY_LOCALE: Readonly<Record<Locale, PublicPageSeoCopy['keywords']>> = {
  [Locale.EN]: ['public Threads', 'AI articles board', 'community AI guides'],
  [Locale.AR]: ['منشورات Threads العامة', 'لوحة مقالات الذكاء الاصطناعي', 'أدلة المجتمع'],
  [Locale.DE]: ['öffentliche Threads', 'KI-Artikel-Board', 'Community-Leitfäden'],
  [Locale.ES]: ['Threads públicos', 'tablero de artículos de IA', 'guías de la comunidad'],
  [Locale.FR]: ['Threads publics', 'tableau d’articles IA', 'guides de la communauté'],
  [Locale.HI]: ['सार्वजनिक Threads', 'AI लेख बोर्ड', 'समुदाय की मार्गदर्शिकाएँ'],
  [Locale.IT]: ['Thread pubblici', 'bacheca di articoli IA', 'guide della community'],
  [Locale.PT]: ['Threads públicos', 'quadro de artigos de IA', 'guias da comunidade'],
  [Locale.RU]: ['публичные Threads', 'доска статей об ИИ', 'руководства сообщества'],
  [Locale.JA]: ['公開 Threads', 'AI 記事ボード', 'コミュニティのガイド'],
  [Locale.TH]: ['Threads สาธารณะ', 'บอร์ดบทความ AI', 'คู่มือจากชุมชน'],
  [Locale.FA]: ['Threads عمومی', 'تابلوی مقاله‌های هوش مصنوعی', 'راهنمای جامعه'],
  [Locale.ZH]: ['公开 Threads', 'AI 文章看板', '社区指南'],
};

function buildSeo(locale: Locale): Readonly<Record<string, PublicPageSeoCopy>> {
  const copy = THREAD_PUBLIC_BOARD_TRANSLATIONS[locale];
  return {
    [THREADS_PUBLIC_BOARD_SLUG]: {
      title: copy.threadPublicBoardSeoTitle,
      description: copy.threadPublicBoardSeoDescription,
      keywords: SEO_KEYWORDS_BY_LOCALE[locale],
    },
  };
}

/** SEO copy of the public Threads board per locale; the translation file is the single source. */
export const THREADS_PUBLIC_BOARD_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = {
  [Locale.EN]: buildSeo(Locale.EN),
  [Locale.AR]: buildSeo(Locale.AR),
  [Locale.DE]: buildSeo(Locale.DE),
  [Locale.ES]: buildSeo(Locale.ES),
  [Locale.FR]: buildSeo(Locale.FR),
  [Locale.HI]: buildSeo(Locale.HI),
  [Locale.IT]: buildSeo(Locale.IT),
  [Locale.PT]: buildSeo(Locale.PT),
  [Locale.RU]: buildSeo(Locale.RU),
  [Locale.JA]: buildSeo(Locale.JA),
  [Locale.TH]: buildSeo(Locale.TH),
  [Locale.FA]: buildSeo(Locale.FA),
  [Locale.ZH]: buildSeo(Locale.ZH),
};
