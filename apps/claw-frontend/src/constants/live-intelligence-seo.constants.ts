import { LIVE_INTELLIGENCE_SLUG } from '@/constants/live-intelligence-marketing.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

const SLUG = LIVE_INTELLIGENCE_SLUG;

/**
 * SEO copy for the public Live Intelligence page, 13 locales. It states what the page states:
 * live streams on YouTube, Twitch, Kick and other platforms (or an HLS link) are analyzed, and
 * captions run a few seconds behind. Registered in `CLUSTER_SEO_SOURCES`.
 */
export const LIVE_INTELLIGENCE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = {
  [Locale.EN]: {
    [SLUG]: {
      title: 'Live Intelligence: captions, summaries and highlights for live streams',
      description:
        'Watch a live stream from YouTube, Twitch, Kick or an HLS link in ClawAI with translated captions a few seconds behind the speech, summary cards that update as topics change and highlights on a timeline. Free minutes every month, then $0.02 a minute.',
      keywords: [
        'live stream captions',
        'AI live stream summary',
        'live stream highlights',
        'translated live captions',
      ],
    },
  },
  [Locale.AR]: {
    [SLUG]: {
      title: 'Live Intelligence: ترجمة نصية وملخصات ومقاطع بارزة للبث المباشر',
      description:
        'شاهد بثًا مباشرًا من YouTube أو Twitch أو Kick أو رابط HLS داخل ClawAI مع ترجمة نصية تصل بعد الكلام بثوانٍ، وبطاقات ملخص تتجدد مع تغيّر المواضيع، ومقاطع بارزة على خط زمني. دقائق مجانية كل شهر ثم 0.02 دولار للدقيقة.',
      keywords: [
        'ترجمة نصية للبث المباشر',
        'ملخص البث المباشر بالذكاء الاصطناعي',
        'مقاطع بارزة من البث',
      ],
    },
  },
  [Locale.DE]: {
    [SLUG]: {
      title: 'Live Intelligence: Untertitel, Zusammenfassungen und Highlights für Livestreams',
      description:
        'Sieh einen Livestream von YouTube, Twitch, Kick oder einen HLS-Link in ClawAI mit übersetzten Untertiteln einige Sekunden nach der Sprache, Zusammenfassungskarten bei Themenwechsel und Highlights auf einer Zeitleiste. Jeden Monat Freiminuten, danach 0,02 $ pro Minute.',
      keywords: ['Livestream-Untertitel', 'KI-Zusammenfassung Livestream', 'Livestream-Highlights'],
    },
  },
  [Locale.ES]: {
    [SLUG]: {
      title: 'Live Intelligence: subtítulos, resúmenes y momentos clave de transmisiones en vivo',
      description:
        'Mira una transmisión en vivo de YouTube, Twitch, Kick o un enlace HLS en ClawAI con subtítulos traducidos unos segundos después del habla, tarjetas de resumen que cambian con el tema y momentos clave en una línea de tiempo. Minutos gratis cada mes y luego 0,02 $ por minuto.',
      keywords: [
        'subtítulos de transmisión en vivo',
        'resumen de directos con IA',
        'momentos clave de directos',
      ],
    },
  },
  [Locale.FA]: {
    [SLUG]: {
      title: 'Live Intelligence: زیرنویس، خلاصه و لحظه‌های برجسته برای پخش زنده',
      description:
        'پخش زنده از YouTube، Twitch، Kick یا یک پیوند HLS را درون ClawAI تماشا کنید، با زیرنویس ترجمه‌شده که چند ثانیه پس از گفتار می‌رسد، کارت‌های خلاصه که با تغییر موضوع به‌روز می‌شوند و لحظه‌های برجسته روی خط زمانی. هر ماه دقیقهٔ رایگان، سپس دقیقه‌ای ۰٫۰۲ دلار.',
      keywords: ['زیرنویس پخش زنده', 'خلاصه پخش زنده با هوش مصنوعی', 'لحظه‌های برجستهٔ پخش زنده'],
    },
  },
  [Locale.FR]: {
    [SLUG]: {
      title: 'Live Intelligence : sous-titres, résumés et temps forts des directs',
      description:
        'Regardez un direct YouTube, Twitch, Kick ou un lien HLS dans ClawAI avec des sous-titres traduits quelques secondes après la parole, des cartes de résumé qui suivent les sujets et des temps forts sur une frise. Minutes gratuites chaque mois, puis 0,02 $ la minute.',
      keywords: ['sous-titres de direct', 'résumé de direct par IA', 'temps forts de direct'],
    },
  },
  [Locale.HI]: {
    [SLUG]: {
      title: 'Live Intelligence: लाइव स्ट्रीम के कैप्शन, सारांश और हाइलाइट',
      description:
        'YouTube, Twitch, Kick या HLS लिंक की लाइव स्ट्रीम ClawAI में देखें: बोलने के कुछ सेकंड बाद आने वाले अनूदित कैप्शन, विषय बदलने पर अपडेट होते सारांश कार्ड और टाइमलाइन पर हाइलाइट। हर महीने मुफ़्त मिनट, फिर 0.02 डॉलर प्रति मिनट।',
      keywords: ['लाइव स्ट्रीम कैप्शन', 'AI लाइव स्ट्रीम सारांश', 'लाइव स्ट्रीम हाइलाइट'],
    },
  },
  [Locale.IT]: {
    [SLUG]: {
      title: 'Live Intelligence: sottotitoli, riassunti e momenti salienti delle dirette',
      description:
        'Guarda una diretta da YouTube, Twitch, Kick o un link HLS in ClawAI con sottotitoli tradotti pochi secondi dopo il parlato, schede di riepilogo che seguono gli argomenti e momenti salienti su una linea del tempo. Minuti gratuiti ogni mese, poi 0,02 $ al minuto.',
      keywords: ['sottotitoli diretta', 'riassunto diretta con IA', 'momenti salienti diretta'],
    },
  },
  [Locale.JA]: {
    [SLUG]: {
      title: 'Live Intelligence：ライブ配信の字幕・要約・ハイライト',
      description:
        'YouTube、Twitch、Kick、またはHLSリンクのライブ配信をClawAIで視聴し、発話の数秒後に届く翻訳字幕、話題の変化に合わせて更新される要約カード、タイムライン上のハイライトを利用できます。毎月の無料分があり、その後は1分0.02ドルです。',
      keywords: ['ライブ配信 字幕', 'AI ライブ配信 要約', 'ライブ配信 ハイライト'],
    },
  },
  [Locale.PT]: {
    [SLUG]: {
      title: 'Live Intelligence: legendas, resumos e destaques de transmissões ao vivo',
      description:
        'Assista a uma transmissão ao vivo do YouTube, Twitch, Kick ou de um link HLS no ClawAI com legendas traduzidas alguns segundos após a fala, cartões de resumo que acompanham os assuntos e destaques numa linha do tempo. Minutos grátis todo mês e depois US$ 0,02 por minuto.',
      keywords: ['legendas de transmissão ao vivo', 'resumo de live com IA', 'destaques de live'],
    },
  },
  [Locale.RU]: {
    [SLUG]: {
      title: 'Live Intelligence: субтитры, сводки и ключевые моменты прямых эфиров',
      description:
        'Смотрите прямой эфир с YouTube, Twitch, Kick или по HLS-ссылке в ClawAI: переведённые субтитры через несколько секунд после речи, карточки-сводки, меняющиеся вместе с темой, и ключевые моменты на временной шкале. Бесплатные минуты каждый месяц, затем 0,02 $ за минуту.',
      keywords: ['субтитры прямого эфира', 'ИИ-сводка прямого эфира', 'ключевые моменты эфира'],
    },
  },
  [Locale.TH]: {
    [SLUG]: {
      title: 'Live Intelligence: คำบรรยาย สรุป และไฮไลต์ของการถ่ายทอดสด',
      description:
        'ดูการถ่ายทอดสดจาก YouTube, Twitch, Kick หรือลิงก์ HLS ใน ClawAI พร้อมคำบรรยายที่แปลแล้วซึ่งมาหลังเสียงพูดไม่กี่วินาที การ์ดสรุปที่อัปเดตตามหัวข้อ และไฮไลต์บนไทม์ไลน์ มีนาทีฟรีทุกเดือน จากนั้น 0.02 ดอลลาร์ต่อนาที',
      keywords: ['คำบรรยายถ่ายทอดสด', 'สรุปถ่ายทอดสดด้วย AI', 'ไฮไลต์ถ่ายทอดสด'],
    },
  },
  [Locale.ZH]: {
    [SLUG]: {
      title: 'Live Intelligence：直播的字幕、摘要与精彩片段',
      description:
        '在 ClawAI 中观看来自 YouTube、Twitch、Kick 或 HLS 链接的直播，获得比说话晚几秒到达的翻译字幕、随话题变化更新的摘要卡片，以及时间轴上的精彩片段。每月有免费分钟数，之后每分钟 0.02 美元。',
      keywords: ['直播字幕', 'AI 直播摘要', '直播精彩片段'],
    },
  },
};
