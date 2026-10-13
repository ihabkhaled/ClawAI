import { Locale } from '@/enums/locale.enum';
import type { MarketingVideosLocaleTranslation } from '@/types/i18n.types';

/**
 * The videos on the public marketing pages, in all 13 locales. Mounted at `marketing.videos`.
 *
 * One file, imported by each locale, so a missing locale or key is a type error rather than a raw
 * key on screen (`t()` takes a plain string and is not checked). Real translations, not English
 * placeholders. "Thread" and "ClawAI" are product names and stay as they are.
 */
export const MARKETING_VIDEOS_TRANSLATIONS: Record<Locale, MarketingVideosLocaleTranslation> = {
  [Locale.EN]: {
    action: {
      title: 'See ClawAI in action',
      body: 'Short videos on what ClawAI does. Each one loads from YouTube only when you press play.',
    },
    shortsSection: {
      title: 'ClawAI in short videos',
      body: 'Watch a short video about this topic. It loads from YouTube only when you press play.',
    },
    threadsSection: {
      title: 'ClawAI Threads in 30 seconds',
      body: 'Watch a short video about ClawAI Threads.',
    },
    stepsSection: {
      title: 'Watch the ClawAI Threads video in three parts',
      body: 'Three short clips from ClawAI Threads.',
    },
    durationLabel: '{seconds} seconds',
    facade: { play: 'Play video: {title}', frameTitle: '{title} (YouTube video)' },
    local: {
      combined: {
        title: 'ClawAI Threads in 30 seconds',
        description: 'A 30-second video about ClawAI Threads.',
      },
      part: {
        title: 'ClawAI Threads video, part {n} of {total}',
        description: 'One of three short clips from ClawAI Threads.',
      },
    },
  },
  [Locale.AR]: {
    action: {
      title: 'شاهد ClawAI أثناء العمل',
      body: 'مقاطع فيديو قصيرة عمّا يفعله ClawAI. كل مقطع يُحمَّل من YouTube فقط عند الضغط على التشغيل.',
    },
    shortsSection: {
      title: 'ClawAI في مقاطع قصيرة',
      body: 'شاهد مقطعًا قصيرًا عن هذا الموضوع. يُحمَّل من YouTube فقط عند الضغط على التشغيل.',
    },
    threadsSection: {
      title: 'ClawAI Threads في 30 ثانية',
      body: 'شاهد فيديو قصيرًا عن ClawAI Threads.',
    },
    stepsSection: {
      title: 'شاهد فيديو ClawAI Threads في ثلاثة أجزاء',
      body: 'ثلاثة مقاطع قصيرة من ClawAI Threads.',
    },
    durationLabel: '{seconds} ثانية',
    facade: { play: 'تشغيل الفيديو: {title}', frameTitle: '{title} (فيديو YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads في 30 ثانية',
        description: 'فيديو مدته 30 ثانية عن ClawAI Threads.',
      },
      part: {
        title: 'فيديو ClawAI Threads، الجزء {n} من {total}',
        description: 'أحد ثلاثة مقاطع قصيرة من ClawAI Threads.',
      },
    },
  },
  [Locale.FR]: {
    action: {
      title: 'ClawAI en action',
      body: 'De courtes vidéos sur ce que fait ClawAI. Chacune ne se charge depuis YouTube que lorsque vous appuyez sur lecture.',
    },
    shortsSection: {
      title: 'ClawAI en vidéos courtes',
      body: 'Regardez une courte vidéo sur ce sujet. Elle ne se charge depuis YouTube que lorsque vous appuyez sur lecture.',
    },
    threadsSection: {
      title: 'ClawAI Threads en 30 secondes',
      body: 'Regardez une courte vidéo sur ClawAI Threads.',
    },
    stepsSection: {
      title: 'Regardez la vidéo ClawAI Threads en trois parties',
      body: 'Trois courts extraits de ClawAI Threads.',
    },
    durationLabel: '{seconds} secondes',
    facade: { play: 'Lire la vidéo : {title}', frameTitle: '{title} (vidéo YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads en 30 secondes',
        description: 'Une vidéo de 30 secondes sur ClawAI Threads.',
      },
      part: {
        title: 'Vidéo ClawAI Threads, partie {n} sur {total}',
        description: 'Un des trois courts extraits de ClawAI Threads.',
      },
    },
  },
  [Locale.IT]: {
    action: {
      title: 'ClawAI in azione',
      body: 'Brevi video su ciò che fa ClawAI. Ciascuno si carica da YouTube solo quando premi play.',
    },
    shortsSection: {
      title: 'ClawAI in brevi video',
      body: 'Guarda un breve video su questo argomento. Si carica da YouTube solo quando premi play.',
    },
    threadsSection: {
      title: 'ClawAI Threads in 30 secondi',
      body: 'Guarda un breve video su ClawAI Threads.',
    },
    stepsSection: {
      title: 'Guarda il video di ClawAI Threads in tre parti',
      body: 'Tre brevi clip di ClawAI Threads.',
    },
    durationLabel: '{seconds} secondi',
    facade: { play: 'Riproduci il video: {title}', frameTitle: '{title} (video YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads in 30 secondi',
        description: 'Un video di 30 secondi su ClawAI Threads.',
      },
      part: {
        title: 'Video di ClawAI Threads, parte {n} di {total}',
        description: 'Una delle tre brevi clip di ClawAI Threads.',
      },
    },
  },
  [Locale.DE]: {
    action: {
      title: 'ClawAI in Aktion',
      body: 'Kurze Videos darüber, was ClawAI kann. Jedes lädt erst von YouTube, wenn Sie auf Wiedergabe drücken.',
    },
    shortsSection: {
      title: 'ClawAI in Kurzvideos',
      body: 'Sehen Sie ein Kurzvideo zu diesem Thema. Es lädt erst von YouTube, wenn Sie auf Wiedergabe drücken.',
    },
    threadsSection: {
      title: 'ClawAI Threads in 30 Sekunden',
      body: 'Sieh dir ein kurzes Video über ClawAI Threads an.',
    },
    stepsSection: {
      title: 'Das ClawAI-Threads-Video in drei Teilen',
      body: 'Drei kurze Clips zu ClawAI Threads.',
    },
    durationLabel: '{seconds} Sekunden',
    facade: { play: 'Video abspielen: {title}', frameTitle: '{title} (YouTube-Video)' },
    local: {
      combined: {
        title: 'ClawAI Threads in 30 Sekunden',
        description: 'Ein 30-Sekunden-Video über ClawAI Threads.',
      },
      part: {
        title: 'ClawAI-Threads-Video, Teil {n} von {total}',
        description: 'Einer von drei kurzen Clips zu ClawAI Threads.',
      },
    },
  },
  [Locale.ES]: {
    action: {
      title: 'ClawAI en acción',
      body: 'Vídeos cortos sobre lo que hace ClawAI. Cada uno se carga desde YouTube solo cuando pulsas reproducir.',
    },
    shortsSection: {
      title: 'ClawAI en vídeos cortos',
      body: 'Mira un vídeo corto sobre este tema. Se carga desde YouTube solo cuando pulsas reproducir.',
    },
    threadsSection: {
      title: 'ClawAI Threads en 30 segundos',
      body: 'Mira un video corto sobre ClawAI Threads.',
    },
    stepsSection: {
      title: 'Mira el video de ClawAI Threads en tres partes',
      body: 'Tres clips cortos de ClawAI Threads.',
    },
    durationLabel: '{seconds} segundos',
    facade: { play: 'Reproducir vídeo: {title}', frameTitle: '{title} (vídeo de YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads en 30 segundos',
        description: 'Un video de 30 segundos sobre ClawAI Threads.',
      },
      part: {
        title: 'Video de ClawAI Threads, parte {n} de {total}',
        description: 'Uno de los tres clips cortos de ClawAI Threads.',
      },
    },
  },
  [Locale.RU]: {
    action: {
      title: 'ClawAI в действии',
      body: 'Короткие видео о том, что умеет ClawAI. Каждое загружается с YouTube только после нажатия «Воспроизвести».',
    },
    shortsSection: {
      title: 'ClawAI в коротких видео',
      body: 'Посмотрите короткое видео на эту тему. Оно загружается с YouTube только после нажатия «Воспроизвести».',
    },
    threadsSection: {
      title: 'ClawAI Threads за 30 секунд',
      body: 'Посмотрите короткое видео о ClawAI Threads.',
    },
    stepsSection: {
      title: 'Видео о ClawAI Threads в трёх частях',
      body: 'Три коротких ролика о ClawAI Threads.',
    },
    durationLabel: '{seconds} сек.',
    facade: { play: 'Воспроизвести видео: {title}', frameTitle: '{title} (видео YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads за 30 секунд',
        description: '30-секундное видео о ClawAI Threads.',
      },
      part: {
        title: 'Видео о ClawAI Threads, часть {n} из {total}',
        description: 'Один из трёх коротких роликов о ClawAI Threads.',
      },
    },
  },
  [Locale.PT]: {
    action: {
      title: 'Veja o ClawAI em ação',
      body: 'Vídeos curtos sobre o que o ClawAI faz. Cada um só é carregado do YouTube quando você toca em reproduzir.',
    },
    shortsSection: {
      title: 'ClawAI em vídeos curtos',
      body: 'Assista a um vídeo curto sobre este tema. Ele só é carregado do YouTube quando você toca em reproduzir.',
    },
    threadsSection: {
      title: 'ClawAI Threads em 30 segundos',
      body: 'Assista a um vídeo curto sobre o ClawAI Threads.',
    },
    stepsSection: {
      title: 'Assista ao vídeo do ClawAI Threads em três partes',
      body: 'Três clipes curtos do ClawAI Threads.',
    },
    durationLabel: '{seconds} segundos',
    facade: { play: 'Reproduzir vídeo: {title}', frameTitle: '{title} (vídeo do YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads em 30 segundos',
        description: 'Um vídeo de 30 segundos sobre o ClawAI Threads.',
      },
      part: {
        title: 'Vídeo do ClawAI Threads, parte {n} de {total}',
        description: 'Um dos três clipes curtos do ClawAI Threads.',
      },
    },
  },
  [Locale.HI]: {
    action: {
      title: 'ClawAI को काम करते देखें',
      body: 'ClawAI क्या करता है, इस पर छोटे वीडियो। हर वीडियो YouTube से तभी लोड होता है जब आप प्ले दबाते हैं।',
    },
    shortsSection: {
      title: 'छोटे वीडियो में ClawAI',
      body: 'इस विषय पर एक छोटा वीडियो देखें। यह YouTube से तभी लोड होता है जब आप प्ले दबाते हैं।',
    },
    threadsSection: {
      title: '30 सेकंड में ClawAI Threads',
      body: 'ClawAI Threads के बारे में एक छोटा वीडियो देखें।',
    },
    stepsSection: {
      title: 'ClawAI Threads वीडियो तीन भागों में देखें',
      body: 'ClawAI Threads के तीन छोटे क्लिप।',
    },
    durationLabel: '{seconds} सेकंड',
    facade: { play: 'वीडियो चलाएँ: {title}', frameTitle: '{title} (YouTube वीडियो)' },
    local: {
      combined: {
        title: '30 सेकंड में ClawAI Threads',
        description: 'ClawAI Threads के बारे में 30 सेकंड का वीडियो।',
      },
      part: {
        title: 'ClawAI Threads वीडियो, भाग {n} / {total}',
        description: 'ClawAI Threads के तीन छोटे क्लिप में से एक।',
      },
    },
  },
  [Locale.JA]: {
    action: {
      title: 'ClawAI の動きを見る',
      body: 'ClawAI でできることを紹介する短い動画です。再生を押したときにだけ YouTube から読み込まれます。',
    },
    shortsSection: {
      title: '短い動画で見る ClawAI',
      body: 'このテーマの短い動画をご覧ください。再生を押したときにだけ YouTube から読み込まれます。',
    },
    threadsSection: {
      title: '30秒でわかる ClawAI Threads',
      body: 'ClawAI Threads の短い動画をご覧ください。',
    },
    stepsSection: {
      title: 'ClawAI Threads の動画を3つのパートで見る',
      body: 'ClawAI Threads の短いクリップ3本です。',
    },
    durationLabel: '{seconds} 秒',
    facade: { play: '動画を再生: {title}', frameTitle: '{title}(YouTube 動画)' },
    local: {
      combined: {
        title: '30秒でわかる ClawAI Threads',
        description: 'ClawAI Threads についての30秒の動画です。',
      },
      part: {
        title: 'ClawAI Threads の動画 パート{n}/{total}',
        description: 'ClawAI Threads の短いクリップ3本のうちの1本です。',
      },
    },
  },
  [Locale.TH]: {
    action: {
      title: 'ดู ClawAI ทำงานจริง',
      body: 'วิดีโอสั้นเกี่ยวกับสิ่งที่ ClawAI ทำได้ แต่ละคลิปจะโหลดจาก YouTube ก็ต่อเมื่อคุณกดเล่นเท่านั้น',
    },
    shortsSection: {
      title: 'ClawAI ในวิดีโอสั้น',
      body: 'ดูวิดีโอสั้นเกี่ยวกับหัวข้อนี้ จะโหลดจาก YouTube ก็ต่อเมื่อคุณกดเล่นเท่านั้น',
    },
    threadsSection: {
      title: 'ClawAI Threads ใน 30 วินาที',
      body: 'ดูวิดีโอสั้นเกี่ยวกับ ClawAI Threads',
    },
    stepsSection: {
      title: 'ดูวิดีโอ ClawAI Threads แบบสามตอน',
      body: 'คลิปสั้นสามคลิปจาก ClawAI Threads',
    },
    durationLabel: '{seconds} วินาที',
    facade: { play: 'เล่นวิดีโอ: {title}', frameTitle: '{title} (วิดีโอ YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads ใน 30 วินาที',
        description: 'วิดีโอความยาว 30 วินาทีเกี่ยวกับ ClawAI Threads',
      },
      part: {
        title: 'วิดีโอ ClawAI Threads ตอนที่ {n} จาก {total}',
        description: 'หนึ่งในสามคลิปสั้นจาก ClawAI Threads',
      },
    },
  },
  [Locale.FA]: {
    action: {
      title: 'ClawAI را در عمل ببینید',
      body: 'ویدیوهای کوتاه درباره کارهایی که ClawAI انجام می‌دهد. هر ویدیو فقط وقتی پخش را بزنید از YouTube بارگیری می‌شود.',
    },
    shortsSection: {
      title: 'ClawAI در ویدیوهای کوتاه',
      body: 'یک ویدیوی کوتاه درباره این موضوع ببینید. فقط وقتی پخش را بزنید از YouTube بارگیری می‌شود.',
    },
    threadsSection: {
      title: 'ClawAI Threads در ۳۰ ثانیه',
      body: 'یک ویدیوی کوتاه درباره ClawAI Threads ببینید.',
    },
    stepsSection: {
      title: 'ویدیوی ClawAI Threads را در سه بخش ببینید',
      body: 'سه کلیپ کوتاه از ClawAI Threads.',
    },
    durationLabel: '{seconds} ثانیه',
    facade: { play: 'پخش ویدیو: {title}', frameTitle: '{title} (ویدیوی YouTube)' },
    local: {
      combined: {
        title: 'ClawAI Threads در ۳۰ ثانیه',
        description: 'ویدیویی ۳۰ ثانیه‌ای درباره ClawAI Threads.',
      },
      part: {
        title: 'ویدیوی ClawAI Threads، بخش {n} از {total}',
        description: 'یکی از سه کلیپ کوتاه ClawAI Threads.',
      },
    },
  },
  [Locale.ZH]: {
    action: {
      title: '看看 ClawAI 的实际效果',
      body: '介绍 ClawAI 功能的短视频。每个视频只有在你点击播放后才会从 YouTube 加载。',
    },
    shortsSection: {
      title: '短视频里的 ClawAI',
      body: '观看一段关于这个主题的短视频。只有在你点击播放后才会从 YouTube 加载。',
    },
    threadsSection: {
      title: '30 秒了解 ClawAI Threads',
      body: '观看关于 ClawAI Threads 的短视频。',
    },
    stepsSection: {
      title: '分三部分观看 ClawAI Threads 视频',
      body: '来自 ClawAI Threads 的三个短片段。',
    },
    durationLabel: '{seconds} 秒',
    facade: { play: '播放视频：{title}', frameTitle: '{title}（YouTube 视频）' },
    local: {
      combined: {
        title: '30 秒了解 ClawAI Threads',
        description: '关于 ClawAI Threads 的 30 秒视频。',
      },
      part: {
        title: 'ClawAI Threads 视频，第 {n} 部分，共 {total} 部分',
        description: 'ClawAI Threads 三个短片段之一。',
      },
    },
  },
};
