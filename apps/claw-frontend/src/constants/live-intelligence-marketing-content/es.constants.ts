import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligenceMarketingSeo,
} from '@/types/live-intelligence-marketing-content.types';

/**
 * The Spanish copy of the public Live & Video Intelligence pages. Every claim mirrors the English
 * file (`en.constants.ts`); nothing here may say more than it does.
 */
export const ES_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Novedad en ClawAI: Live & Video Intelligence',
  title: 'Cualquier transmisión en vivo o video, entendida en tu idioma',
  intro:
    'Pega el enlace de una transmisión en vivo o de un video grabado de más de 30 plataformas. ClawAI lo sigue con subtítulos en vivo y un feed continuo de resúmenes y destacados, o convierte el video completo en un informe claro con un solo clic. Funciona en los servidores de ClawAI, así que sirve en cualquier dispositivo, incluido tu teléfono.',
  openCta: 'Pega un enlace ahora',
  signUpCta: 'Crea una cuenta gratis',
  howItWorksCta: 'Mira cómo funciona',
  videosTitle: 'Míralo en acción',
  videosIntro:
    'Dos clips cortos del producto real. Toca reproducir: vienen sin sonido por defecto y se repiten en bucle, así que puedes verlos en cualquier lugar.',
  videos: [
    {
      title: 'El panel de Análisis con IA junto a una transmisión de videojuegos',
      body: 'Una transmisión de videojuegos se reproduce mientras el panel de Análisis con IA mantiene un feed continuo de lo que pasa en pantalla y de lo que se dice.',
    },
    {
      title: 'Un noticiero en vivo en árabe, con subtítulos en inglés en un teléfono',
      body: 'Una grabación con teléfono de un noticiero en vivo en YouTube: la presentadora habla en árabe, los subtítulos aparecen en inglés y el Feed inteligente resume la noticia hasta el momento.',
    },
  ],
  stepsTitle: 'Cómo funciona, en cuatro pasos',
  stepsIntro: 'De un enlace pegado a notas que puedes guardar. No hay nada que instalar.',
  steps: [
    {
      title: 'Pega un enlace',
      body: 'Pega la dirección de una transmisión en vivo o de un video grabado: un reel, una publicación, un short o una transmisión pasada. ClawAI comprueba que puede leer la fuente antes de empezar.',
    },
    {
      title: 'Elige tu idioma y un modo',
      body: 'Elige el idioma en el que quieres leer, entre los 13 idiomas de la app, y un modo de análisis: Solo audio, Audio + visión o Automático inteligente.',
    },
    {
      title: 'Míralo en vivo o haz clic en «Resumir video»',
      body: 'Síguelo con subtítulos y un Feed inteligente de resúmenes, destacados y notas visuales. Con un video grabado también puedes hacer clic en «Resumir video» y recibir el informe completo de una vez.',
    },
    {
      title: 'Exporta y comparte',
      body: 'Todo se guarda en tu historial. Expórtalo en PDF, Markdown o TXT y compártelo con quien lo necesite.',
    },
  ],
  screenshotsTitle: 'Así se ve en un teléfono',
  screenshotsIntro: 'Pantallas reales de la app, capturadas en un teléfono con el tema oscuro.',
  screenshots: [
    {
      title: 'Pegar el enlace de una transmisión en vivo o de un video',
      body: 'Un solo campo acepta el enlace de cualquier plataforma compatible. Elige el idioma y el modo, y empieza.',
    },
    {
      title: 'El feed en vivo con subtítulos, resúmenes y destacados',
      body: 'Los subtítulos van unos segundos por detrás de quien habla, mientras el Feed inteligente mantiene al día los resúmenes, los destacados y las notas visuales.',
    },
    {
      title: 'Un resumen de video con un clic',
      body: 'El informe terminado: un resumen general, los momentos clave con marcas de tiempo, los destacados y la transcripción completa.',
    },
  ],
  outcomesTitle: 'Lo que hace por ti',
  outcomes: [
    {
      title: 'Ponte al día con una transmisión de dos horas en minutos',
      body: 'Lee el resumen y los momentos clave en lugar de recorrer toda la grabación. Cada momento tiene marca de tiempo, así que puedes saltar directo a la parte que importa.',
    },
    {
      title: 'Sigue una transmisión en otro idioma en el tuyo',
      body: 'Una rueda de prensa en japonés, la narración de un partido en español, las noticias en árabe: lee los subtítulos y los resúmenes en el idioma que elijas.',
    },
    {
      title: 'No te pierdas nunca el momento clave',
      body: 'Los destacados se detectan mientras avanza la transmisión, así que puedes apartar la vista y aun así saber qué acaba de pasar.',
    },
    {
      title: 'Notas para reuniones, clases, noticias y videojuegos',
      body: 'Convierte un webinar público, una clase grabada, una transmisión de última hora o un torneo en notas que puedes buscar, guardar y exportar.',
    },
    {
      title: 'Funciona en cualquier dispositivo',
      body: 'ClawAI lee la transmisión en sus propios servidores. No tienes que compartir nada de tu pantalla, así que funciona igual en un teléfono, una tableta o una computadora.',
    },
    {
      title: 'Tu historial, tus exportaciones',
      body: 'Lo que viste y cada resumen que creaste se quedan en tu historial, listos para exportar en PDF, Markdown o TXT.',
    },
  ],
  waysTitle: 'Dos formas de usarlo',
  waysIntro:
    'Sigue una transmisión mientras ocurre, o entrégale a ClawAI un video grabado y recibe el informe de una sola vez.',
  ways: [
    {
      title: 'Análisis en vivo: síguelo al momento',
      body: 'Los subtítulos llegan unos 7 a 12 segundos después de lo hablado, y un Feed inteligente continuo añade resúmenes, destacados y notas visuales. Las plataformas con chat en vivo tienen una pestaña de chat. Con un video grabado, ClawAI lo reproduce desde el principio a velocidad normal y el análisis lo acompaña.',
    },
    {
      title: 'Resumir video: un clic',
      body: 'Con un video grabado, ClawAI procesa el video completo de una vez y devuelve un informe completo: un resumen general, los momentos clave con marcas de tiempo, los destacados y la transcripción completa. Se guarda en tu historial y se exporta en PDF, Markdown o TXT.',
    },
  ],
  waysTableCaption: 'Análisis en vivo y resumen con un clic, lado a lado',
  waysTableAspect: 'Lo que obtienes',
  waysTableLive: 'Análisis en vivo',
  waysTableSummary: 'Resumir video',
  waysRows: [
    {
      label: 'Funciona con',
      live: 'Transmisiones en vivo y videos grabados',
      summary: 'Videos grabados de hasta 3 horas',
    },
    {
      label: 'Tiempo',
      live: 'Sigue el video en tiempo real, con subtítulos unos 7 a 12 segundos por detrás',
      summary: 'El video completo se procesa de una vez',
    },
    {
      label: 'Resultado',
      live: 'Subtítulos y un Feed inteligente de resúmenes, destacados y notas visuales',
      summary:
        'Resumen general, momentos clave con marcas de tiempo, destacados y transcripción completa',
    },
    {
      label: 'Chat en vivo',
      live: 'Una pestaña de chat en las plataformas que lo tienen',
      summary: 'No hace falta',
    },
    {
      label: 'Guárdalo',
      live: 'Guardado en tu historial, exportable en PDF, Markdown o TXT',
      summary: 'Guardado en tu historial, exportable en PDF, Markdown o TXT',
    },
  ],
  modesTitle: 'Tres modos de análisis',
  modesIntro: 'El modo decide a qué presta atención ClawAI. Lo eliges antes de empezar.',
  modes: [
    {
      title: 'Solo audio',
      body: 'Subtítulos, resúmenes y destacados a partir de lo que se dice. Ideal para charlas, entrevistas, podcasts, clases y noticias.',
    },
    {
      title: 'Audio + visión',
      body: 'Añade lo que se muestra en pantalla, como diapositivas, gráficos, marcadores o gameplay, para que las notas describan lo que ves además de lo que oyes.',
    },
    {
      title: 'Automático inteligente',
      body: 'Empieza por el audio y mira la imagen cuando es probable que importe, por ejemplo cuando quien habla se queda en silencio o cambia la escena.',
    },
  ],
  researchNote:
    'Investigación: un resumen puede hacer una búsqueda web para añadir contexto, como quién es una persona que habla o a qué se refiere un evento.',
  languagesTitle: 'Léelo en tu idioma',
  languagesParagraphs: [
    'Elige cualquiera de los 13 idiomas de la app: inglés, árabe, alemán, español, persa, francés, hindi, italiano, japonés, portugués, ruso, tailandés o chino. Quien habla puede hacerlo en cualquier idioma.',
    'Cuando quien habla ya usa tu idioma, lees sus palabras exactas. Cuando no, los subtítulos, los resúmenes y los destacados se traducen, y la traducción aparece en lugar del original.',
  ],
  platformsTitle: 'Más de 30 plataformas',
  platformsBody:
    'YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili, Niconico, CHZZK, SOOP y muchas más. Funcionan tanto las transmisiones en vivo como los videos grabados.',
  platformsCta: 'Ver todas las plataformas',
  limitsTitle: 'Conviene saber',
  limits: [
    {
      title: 'Solo videos y transmisiones públicos',
      body: 'ClawAI solo puede leer videos y transmisiones públicos. Algunas plataformas, o videos concretos, pueden rechazar el acceso desde un servidor; cuando eso pasa, ClawAI te lo dice con claridad en lugar de fingir.',
    },
    {
      title: 'Videos grabados de hasta 3 horas',
      body: 'Un video grabado puede durar hasta 3 horas, tanto para el análisis en vivo como para el resumen con un clic.',
    },
    {
      title: 'Los subtítulos van unos segundos por detrás',
      body: 'El habla se transcribe en fragmentos cortos, así que los subtítulos llegan unos 7 a 12 segundos después de pronunciarse. No es subtitulado instantáneo.',
    },
    {
      title: 'Minutos gratis cada mes, minutos de pago solo con tu aprobación',
      body: 'Todos los planes incluyen minutos gratis cada mes. Después, los minutos solo se cobran cuando los apruebas. Un resumen con un clic cuenta la duración del video en minutos.',
    },
  ],
  faqTitle: 'Preguntas frecuentes',
  faq: [
    {
      question: '¿Funciona en mi teléfono?',
      answer:
        'Sí. ClawAI lee la transmisión o el video en sus propios servidores, así que no tienes que compartir nada de tu pantalla. Funciona igual en teléfonos, tabletas y computadoras.',
    },
    {
      question: '¿En qué idiomas puedo leer los subtítulos?',
      answer:
        'En cualquiera de los 13 idiomas de la app: inglés, árabe, alemán, español, persa, francés, hindi, italiano, japonés, portugués, ruso, tailandés y chino. Quien habla puede hacerlo en cualquier idioma. Si ya habla tu idioma, ves sus palabras exactas; si no, la traducción aparece en lugar del original.',
    },
    {
      question: '¿Funciona con videos grabados o solo con transmisiones en vivo?',
      answer:
        'Con ambos. Pega una transmisión en vivo o un video grabado, como un reel, una publicación, un short o una transmisión pasada. Con un video grabado puedes seguirlo desde el principio a velocidad normal, o hacer clic en «Resumir video» para recibir el informe completo de una vez.',
    },
    {
      question: '¿Cuánto puede durar un video?',
      answer: 'Un video grabado puede durar hasta 3 horas.',
    },
    {
      question: '¿Qué incluye un resumen con un clic?',
      answer:
        'Un resumen general, los momentos clave con marcas de tiempo, los destacados y la transcripción completa. Se guarda en tu historial y se puede exportar en PDF, Markdown o TXT.',
    },
    {
      question: '¿Cómo se cobra?',
      answer:
        'Todos los planes incluyen minutos gratis cada mes. Después pagas por minuto, y solo después de aprobarlo. Un resumen con un clic cuenta la duración del video en minutos.',
    },
    {
      question: '¿Los subtítulos son en tiempo real?',
      answer:
        'Casi. Los subtítulos llegan unos 7 a 12 segundos después de lo hablado, porque el audio se transcribe en fragmentos cortos. Los resúmenes y los destacados siguen a los subtítulos.',
    },
    {
      question: '¿Qué plataformas son compatibles?',
      answer:
        'Más de 30, entre ellas YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili y Niconico. La página de plataformas las enumera todas. Solo se pueden leer videos y transmisiones públicos, y Discord no es compatible porque no tiene enlaces públicos.',
    },
    {
      question: '¿ClawAI publica o chatea en mi nombre?',
      answer:
        'No. ClawAI solo lee la transmisión. Nunca publica, comenta ni chatea por ti en ninguna plataforma. Lo que dice la transmisión, y lo que dice su chat, se trata como datos no confiables que hay que resumir, nunca como instrucciones para ClawAI.',
    },
    {
      question: '¿Quién puede ver lo que vi?',
      answer:
        'Tu historial es tuyo. Los análisis que viste y los resúmenes que creaste se quedan en tu cuenta hasta que los borres, y tú decides qué exportar o compartir.',
    },
  ],
  closingTitle: 'Pega tu primer enlace',
  closingBody:
    'Un partido en vivo, una rueda de prensa, una clase o una transmisión de dos horas que te perdiste: pega el enlace, elige tu idioma y deja que ClawAI tome las notas. Todos los planes incluyen minutos gratis cada mes.',
  platformsPage: {
    eyebrow: 'Novedad en ClawAI: Live & Video Intelligence',
    title: 'Todas las plataformas que Live & Video Intelligence puede leer',
    intro:
      'Pega un enlace de cualquiera de estas plataformas, en vivo o grabado. ClawAI lo lee en sus propios servidores, así que funciona en cualquier dispositivo, teléfonos incluidos.',
    openCta: 'Pega un enlace ahora',
    backCta: 'Volver a Live & Video Intelligence',
    groupsTitle: 'Plataformas por tipo',
    groupsIntro:
      'Los nombres de las plataformas son marcas de sus propietarios. ClawAI no está afiliada a ellas ni cuenta con su respaldo.',
    groups: {
      [LiveMarketingPlatformGroup.GLOBAL_VIDEO]: {
        title: 'Video global',
        body: 'Los grandes sitios de video que la gente comparte a diario, desde charlas y clases largas hasta clips cortos y programas de audio.',
      },
      [LiveMarketingPlatformGroup.GAMING_STREAMING]: {
        title: 'Videojuegos y streaming',
        body: 'Partidas en vivo, esports y transmisiones de creadores, con una pestaña de chat en vivo justo al lado del análisis.',
      },
      [LiveMarketingPlatformGroup.SOCIAL]: {
        title: 'Redes sociales',
        body: 'Reels, publicaciones, shorts y transmisiones en vivo de redes sociales y canales de mensajería.',
      },
      [LiveMarketingPlatformGroup.ASIA]: {
        title: 'Asia',
        body: 'Plataformas de video y de transmisiones en vivo de China, Japón, Corea y toda Asia, legibles en cualquiera de los 13 idiomas de la app.',
      },
    },
    liveTag: 'En vivo',
    videoTag: 'Videos',
    supportTitle: 'Lo que funciona en todas las plataformas',
    supportIntro: 'Las mismas tres cosas funcionan dondequiera que ClawAI pueda leer la fuente.',
    support: [
      {
        title: 'Transmisiones en vivo',
        body: 'Subtítulos unos 7 a 12 segundos después de lo hablado, un Feed inteligente de resúmenes, destacados y notas visuales, y una pestaña de chat en vivo donde la plataforma lo tiene.',
      },
      {
        title: 'Videos grabados',
        body: 'Reels, publicaciones, shorts y transmisiones pasadas de hasta 3 horas. ClawAI reproduce el video desde el principio a velocidad normal y el análisis lo acompaña.',
      },
      {
        title: 'Resumen con un clic',
        body: 'Con un video grabado, haz clic en «Resumir video» y recibe un resumen general, los momentos clave con marcas de tiempo, los destacados y la transcripción completa.',
      },
    ],
    limitsTitle: 'Los límites, con honestidad',
    limits: [
      {
        title: 'Solo contenido público',
        body: 'Solo se pueden leer videos y transmisiones públicos. El contenido privado o exclusivo para miembros no se puede leer.',
      },
      {
        title: 'Una plataforma puede decir que no',
        body: 'Algunas plataformas, o videos concretos, pueden rechazar el acceso desde un servidor. Cuando pasa, ClawAI te lo dice con claridad en lugar de mostrar un resultado falso.',
      },
      {
        title: 'Discord no es compatible',
        body: 'Las transmisiones de Discord no tienen enlaces públicos, así que no hay nada que un servidor pueda abrir.',
      },
    ],
    faqTitle: 'Preguntas sobre las plataformas',
    faq: [
      {
        question: '¿Mi plataforma es compatible?',
        answer:
          'Si aparece en esta página, pega el enlace y ClawAI lo comprueba antes de empezar. Si la plataforma o el video rechazan el acceso desde un servidor, lo ves de inmediato.',
      },
      {
        question: '¿Funcionan tanto las transmisiones en vivo como los videos grabados?',
        answer:
          'Sí, en todas las plataformas de la lista. Un video grabado de hasta 3 horas también se puede resumir con un clic.',
      },
      {
        question: '¿Por qué puede fallar un video si su plataforma está en la lista?',
        answer:
          'Una plataforma puede impedir que un servidor lea un video concreto, incluso uno público. Cuando eso ocurre, ClawAI te lo dice de inmediato. Los videos y transmisiones privados nunca se pueden leer.',
      },
      {
        question: '¿Por qué no está Discord?',
        answer:
          'Las transmisiones de Discord no tienen un enlace público que un servidor pueda abrir, así que ClawAI no puede leerlas.',
      },
    ],
    closingTitle: '¿Encontraste tu plataforma?',
    closingBody:
      'Pega el enlace, elige tu idioma y empieza. Todos los planes incluyen minutos gratis cada mes.',
  },
};

/** Spanish SEO copy for both pages; claims mirror the English file. */
export const ES_LIVE_INTELLIGENCE_MARKETING_SEO: LiveIntelligenceMarketingSeo = {
  overview: {
    title: 'Live & Video Intelligence: subtítulos en vivo y resúmenes de video con un clic',
    description:
      'Pega el enlace de una transmisión en vivo o un video de YouTube, Twitch, TikTok y más de 30 plataformas. Recibe subtítulos en vivo en tu idioma, un Feed inteligente de resúmenes y destacados, o un resumen de video con marcas de tiempo en un clic. En cualquier dispositivo.',
    keywords: [
      'subtítulos para transmisiones en vivo',
      'resumir video de YouTube',
      'resumen de video con IA',
      'subtítulos traducidos en vivo',
      'destacados de transmisiones en vivo',
    ],
  },
  platforms: {
    title: 'Plataformas compatibles con Live & Video Intelligence',
    description:
      'Todas las plataformas que ClawAI puede leer para subtítulos en vivo y resúmenes de video: YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X, Bilibili, Niconico, CHZZK, SOOP y más, agrupadas por tipo.',
    keywords: [
      'plataformas de video compatibles',
      'plataformas de transmisión en vivo',
      'subtítulos para Twitch',
      'plataformas para resumir videos',
    ],
  },
};
