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
    researchSection: {
      title: 'Watch research work',
      body: 'A real research turn in the app, sped up. No sound.',
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
      research: {
        title: 'Research in rounds, in the app',
        description:
          'A question about intermittent fasting and heart disease: ClawAI searches the web and academic sources, checks what is missing, searches again, then answers with numbered sources.',
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
    researchSection: {
      title: 'شاهد البحث أثناء العمل',
      body: 'عملية بحث حقيقية داخل التطبيق، بسرعة مضاعفة. بلا صوت.',
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
      research: {
        title: 'البحث على جولات داخل التطبيق',
        description:
          'سؤال عن الصيام المتقطع ومرض القلب: تبحث ClawAI في الويب والمصادر الأكاديمية، وتتحقق مما ينقص، ثم تبحث مرة أخرى وتجيب مع مصادر مرقّمة.',
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
    researchSection: {
      title: 'La recherche en action',
      body: 'Une vraie recherche dans l’application, en accéléré. Sans son.',
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
      research: {
        title: 'La recherche par tours dans l’application',
        description:
          'Une question sur le jeûne intermittent et les maladies cardiaques : ClawAI cherche sur le web et dans les sources scientifiques, vérifie ce qui manque, cherche à nouveau puis répond avec des sources numérotées.',
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
    researchSection: {
      title: 'La ricerca in azione',
      body: 'Una vera ricerca nell’app, accelerata. Senza audio.',
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
      research: {
        title: 'Ricerca a giri nell’app',
        description:
          'Una domanda su digiuno intermittente e malattie cardiache: ClawAI cerca sul web e in fonti accademiche, controlla che cosa manca, cerca di nuovo e risponde con fonti numerate.',
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
    researchSection: {
      title: 'So arbeitet die Recherche',
      body: 'Eine echte Recherche in der App, beschleunigt. Ohne Ton.',
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
      research: {
        title: 'Recherche in Runden in der App',
        description:
          'Eine Frage zu Intervallfasten und Herzkrankheiten: ClawAI durchsucht Web und wissenschaftliche Quellen, prüft, was fehlt, sucht erneut und antwortet mit nummerierten Quellen.',
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
    researchSection: {
      title: 'Mira cómo investiga',
      body: 'Una investigación real en la app, acelerada. Sin sonido.',
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
      research: {
        title: 'Investigación por rondas en la app',
        description:
          'Una pregunta sobre ayuno intermitente y enfermedad cardíaca: ClawAI busca en la web y en fuentes académicas, comprueba qué falta, vuelve a buscar y responde con fuentes numeradas.',
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
    researchSection: {
      title: 'Как идёт исследование',
      body: 'Настоящее исследование в приложении, ускоренное. Без звука.',
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
      research: {
        title: 'Исследование раундами в приложении',
        description:
          'Вопрос об интервальном голодании и болезнях сердца: ClawAI ищет в вебе и научных источниках, проверяет, чего не хватает, ищет снова и отвечает с пронумерованными источниками.',
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
    researchSection: {
      title: 'Veja a pesquisa em ação',
      body: 'Uma pesquisa real no app, acelerada. Sem som.',
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
      research: {
        title: 'Pesquisa em rodadas no app',
        description:
          'Uma pergunta sobre jejum intermitente e doença cardíaca: o ClawAI busca na web e em fontes acadêmicas, verifica o que falta, busca de novo e responde com fontes numeradas.',
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
    researchSection: {
      title: 'शोध को काम करते देखें',
      body: 'ऐप में एक वास्तविक शोध, तेज़ गति में। बिना आवाज़।',
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
      research: {
        title: 'ऐप में कई दौर का शोध',
        description:
          'इंटरमिटेंट फ़ास्टिंग और हृदय रोग पर एक प्रश्न: ClawAI वेब और शैक्षणिक स्रोतों में खोजता है, जाँचता है कि क्या बाकी है, फिर खोजता है और क्रमांकित स्रोतों के साथ उत्तर देता है।',
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
    researchSection: {
      title: '調査の様子を見る',
      body: 'アプリ内の実際の調査を早送りで。音声はありません。',
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
      research: {
        title: 'アプリで進むラウンド制の調査',
        description:
          '間欠的断食と心臓病についての質問。ClawAI はウェブと学術情報源を検索し、足りない点を確認して再び検索し、番号付きの出典を添えて回答します。',
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
    researchSection: {
      title: 'ดูการค้นคว้าขณะทำงาน',
      body: 'การค้นคว้าจริงในแอป เร่งความเร็ว ไม่มีเสียง',
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
      research: {
        title: 'การค้นคว้าหลายรอบในแอป',
        description:
          'คำถามเรื่องการอดอาหารเป็นช่วงกับโรคหัวใจ: ClawAI ค้นเว็บและแหล่งวิชาการ ตรวจว่ายังขาดอะไร ค้นอีกครั้ง แล้วตอบพร้อมแหล่งอ้างอิงที่มีหมายเลข',
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
    researchSection: {
      title: 'پژوهش را در حال کار ببینید',
      body: 'یک پژوهش واقعی در برنامه، با سرعت بیشتر. بدون صدا.',
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
      research: {
        title: 'پژوهش مرحله‌ای در برنامه',
        description:
          'پرسشی درباره روزه‌داری متناوب و بیماری قلبی: ClawAI در وب و منابع علمی جستجو می‌کند، کمبودها را بررسی می‌کند، دوباره جستجو می‌کند و با منابع شماره‌دار پاسخ می‌دهد.',
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
    researchSection: {
      title: '查看研究过程',
      body: '应用内一次真实研究的快放，无声音。',
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
      research: {
        title: '应用内的分轮研究',
        description:
          '一个关于间歇性断食与心脏病的问题：ClawAI 搜索网络和学术来源，检查还缺什么，再次搜索，然后给出带编号来源的回答。',
      },
    },
  },
};
