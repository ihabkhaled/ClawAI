import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export const THREADS_DISCOVERY_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = {
  [Locale.EN]: {
    'threads/discover': {
      title: 'Public Threads | ClawAI',
      description:
        'Explore research-backed articles, guides, and technical explanations published by the ClawAI community.',
      keywords: ['AI research articles', 'AI guides', 'technical explanations'],
    },
  },
  [Locale.AR]: {
    'threads/discover': {
      title: 'منشورات Threads العامة | ClawAI',
      description:
        'استكشف المقالات والأدلة والشروحات التقنية المدعومة بالبحث والمنشورة من مجتمع ClawAI.',
      keywords: ['مقالات الذكاء الاصطناعي', 'أدلة الذكاء الاصطناعي', 'شروحات تقنية'],
    },
  },
  [Locale.DE]: {
    'threads/discover': {
      title: 'Öffentliche Threads | ClawAI',
      description:
        'Entdecke recherchierte Artikel, Leitfäden und technische Erklärungen der ClawAI-Community.',
      keywords: ['KI-Forschungsartikel', 'KI-Leitfäden', 'technische Erklärungen'],
    },
  },
  [Locale.ES]: {
    'threads/discover': {
      title: 'Threads públicos | ClawAI',
      description:
        'Explora artículos, guías y explicaciones técnicas con investigación publicados por la comunidad de ClawAI.',
      keywords: ['artículos de investigación sobre IA', 'guías de IA', 'explicaciones técnicas'],
    },
  },
  [Locale.FR]: {
    'threads/discover': {
      title: 'Threads publics | ClawAI',
      description:
        'Découvrez les articles documentés, guides et explications techniques publiés par la communauté ClawAI.',
      keywords: ['articles de recherche IA', 'guides IA', 'explications techniques'],
    },
  },
  [Locale.HI]: {
    'threads/discover': {
      title: 'सार्वजनिक Threads | ClawAI',
      description:
        'ClawAI समुदाय द्वारा प्रकाशित शोध-आधारित लेख, मार्गदर्शिकाएँ और तकनीकी व्याख्याएँ देखें।',
      keywords: ['AI शोध लेख', 'AI मार्गदर्शिकाएँ', 'तकनीकी व्याख्याएँ'],
    },
  },
  [Locale.IT]: {
    'threads/discover': {
      title: 'Thread pubblici | ClawAI',
      description:
        'Esplora articoli basati su ricerche, guide e spiegazioni tecniche pubblicati dalla community ClawAI.',
      keywords: ['articoli di ricerca IA', 'guide IA', 'spiegazioni tecniche'],
    },
  },
  [Locale.PT]: {
    'threads/discover': {
      title: 'Threads públicos | ClawAI',
      description:
        'Explore artigos pesquisados, guias e explicações técnicas publicados pela comunidade ClawAI.',
      keywords: ['artigos de pesquisa em IA', 'guias de IA', 'explicações técnicas'],
    },
  },
  [Locale.RU]: {
    'threads/discover': {
      title: 'Публичные Threads | ClawAI',
      description:
        'Изучайте статьи, руководства и технические объяснения на основе исследований от сообщества ClawAI.',
      keywords: ['исследования ИИ', 'руководства по ИИ', 'технические объяснения'],
    },
  },
  [Locale.JA]: {
    'threads/discover': {
      title: '公開 Threads | ClawAI',
      description: 'ClawAI コミュニティが公開した調査記事、ガイド、技術解説をご覧ください。',
      keywords: ['AI 調査記事', 'AI ガイド', '技術解説'],
    },
  },
  [Locale.TH]: {
    'threads/discover': {
      title: 'Threads สาธารณะ | ClawAI',
      description:
        'สำรวจบทความ คู่มือ และคำอธิบายทางเทคนิคที่ผ่านการค้นคว้าและเผยแพร่โดยชุมชน ClawAI',
      keywords: ['บทความวิจัย AI', 'คู่มือ AI', 'คำอธิบายทางเทคนิค'],
    },
  },
  [Locale.FA]: {
    'threads/discover': {
      title: 'Threads عمومی | ClawAI',
      description:
        'مقاله‌ها، راهنماها و توضیحات فنی پژوهش‌محور منتشرشده توسط جامعه ClawAI را ببینید.',
      keywords: ['مقاله‌های پژوهشی هوش مصنوعی', 'راهنمای هوش مصنوعی', 'توضیحات فنی'],
    },
  },
  [Locale.ZH]: {
    'threads/discover': {
      title: '公开 Threads | ClawAI',
      description: '浏览 ClawAI 社区发布的研究文章、指南和技术说明。',
      keywords: ['AI 研究文章', 'AI 指南', '技术说明'],
    },
  },
};
