import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/** Spanish copy for the public Live Intelligence page. Same claims as the English source. */
export const ES_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Novedad en ClawAI',
  title: 'Live Intelligence: subtítulos, resúmenes y momentos clave de una transmisión en vivo',
  intro:
    'Pega el enlace de una transmisión en vivo y mírala dentro de ClawAI. Mientras se reproduce, ClawAI convierte el habla en subtítulos en el idioma que elijas, mantiene al día tarjetas de resumen cortas cuando cambia el tema y marca los momentos importantes en una línea de tiempo. Si cierras la ventana, lo que viste queda en tu historial, listo para mejorar y exportar.',
  openCta: 'Abrir Live Intelligence',
  pricingCta: 'Ver planes y precios',
  howItWorksCta: 'Ver cómo funciona',
  whatTitle: 'Qué es Live Intelligence',
  whatParagraphs: [
    'Una transmisión en vivo es difícil de seguir cuando es larga, rápida o está en un idioma que no hablas. Live Intelligence se coloca junto al vídeo y toma las notas: subtítulos traducidos a tu idioma, un resumen continuo y una lista de momentos clave, para que puedas apartar la vista sin perder el hilo.',
    'Todo ocurre en una ventana dentro de ClawAI: la transmisión y el análisis están en una sola pantalla. Antes de empezar eliges el idioma de los subtítulos y un modo de análisis, y puedes pausar, reanudar y avanzar o retroceder donde la transmisión lo permita. Al pausar, la emisión se congela y la facturación se detiene.',
    'Muchas personas pueden ver la misma transmisión sin pagar muchas veces el mismo trabajo. Cuando ClawAI analiza una transmisión en sus propios servidores, como un directo público en YouTube, Twitch, TikTok LIVE u otra plataforma compatible, o un enlace HLS, la procesa una sola vez y comparte ese análisis con todos los espectadores. El análisis que realmente viste se guarda en tu historial y lo conservas hasta que lo borres.',
  ],
  stepsTitle: 'Cómo funciona, en cinco pasos',
  stepsIntro:
    'Del enlace pegado al resumen exportado. Cada paso es algo que haces tú o algo que ClawAI hace por ti.',
  steps: [
    {
      title: 'Pega el enlace',
      body: 'Abre Live Intelligence y pega la dirección de una transmisión en vivo. ClawAI comprueba que la fuente es compatible antes de analizar o cobrar nada, y te lo dice con claridad si no lo es.',
    },
    {
      title: 'Elige idioma y modo',
      body: 'Elige el idioma de subtítulos y resúmenes y uno de tres modos: Audio, Audio + Visión o Smart Auto. Con un enlace HLS confirmas que tienes derecho a analizarlo. Si los servidores de ClawAI no pueden leer una transmisión de YouTube, Twitch, Kick o Facebook, puedes aceptar que ClawAI escuche a través de tu dispositivo.',
    },
    {
      title: 'Mira con subtítulos, tarjetas y momentos clave',
      body: 'Los subtítulos aparecen unos segundos después del habla, con unos 7 a 12 segundos de retraso. Las tarjetas de resumen cambian con los temas y los momentos clave detectados se colocan en una línea de tiempo en la que puedes hacer clic.',
    },
    {
      title: 'Pausa, reanuda y avanza',
      body: 'Pausa para congelar la emisión y detener el contador. Reanuda donde lo dejaste o salta al directo, con el hueco bien visible. Avanzar o retroceder funciona donde la propia transmisión lo permite.',
    },
    {
      title: 'Cierra, vuelve, mejora y exporta',
      body: 'Al cerrar la ventana, lo que viste queda en tu historial. Más tarde puedes mejorar cualquier tarjeta con el modelo que elijas y exportar el historial en PDF, Markdown o TXT.',
    },
  ],
  featuresTitle: 'Qué obtienes',
  features: [
    {
      title: 'Subtítulos en vivo en tu idioma',
      body: 'El habla se transcribe y se traduce al idioma elegido. Los subtítulos llegan unos segundos después de quien habla: no es instantáneo y la interfaz lo dice.',
    },
    {
      title: 'Tarjetas de resumen que te siguen el ritmo',
      body: 'Tarjetas cortas resumen la transmisión y se actualizan cuando cambia el tema, de modo que la última te dice dónde va la transmisión ahora.',
    },
    {
      title: 'Momentos clave automáticos en una línea de tiempo',
      body: 'Los momentos que merece la pena revisar se detectan y se marcan en la línea de tiempo. Haz clic para ir allí, donde la transmisión permita saltar.',
    },
    {
      title: 'Pausa, reanuda y avanza',
      body: 'Controla la reproducción como una grabación cuando la fuente lo admite. En pausa, la emisión está congelada y no se cobra nada.',
    },
    {
      title: 'Un historial bajo tu control',
      body: 'El análisis que viste se guarda en un historial paginado hasta que lo borres. Borrarlo lo elimina.',
    },
    {
      title: 'Mejora una tarjeta con el modelo que elijas',
      body: 'Elige un modelo disponible para reescribir o profundizar una tarjeta. La mejora se cobra al coste real del modelo elegido.',
    },
    {
      title: 'Exporta en PDF, Markdown o TXT',
      body: 'Lleva tu historial fuera de ClawAI en el formato que mejor encaje con lo siguiente.',
    },
    {
      title: 'Procesamiento compartido',
      body: 'Muchos espectadores, un solo análisis. Un directo público que los servidores de ClawAI pueden leer, o una transmisión HLS, se procesa una vez en los servidores de ClawAI y se comparte con todos los que la ven, en cualquier dispositivo, móviles incluidos. El análisis hecho con el audio de tu propio dispositivo es solo tuyo.',
    },
  ],
  modesTitle: 'Tres modos de análisis',
  modesIntro:
    'El modo decide qué mira ClawAI. Lo eliges antes de empezar y el coste sigue esa elección.',
  modes: [
    {
      title: 'Audio',
      body: 'Subtítulos, resúmenes y momentos clave a partir de lo que se dice. El modo más sencillo y el adecuado para charlas, ruedas de prensa, clases y entrevistas.',
    },
    {
      title: 'Audio + Visión',
      body: 'Añade lo que se muestra en pantalla, como diapositivas, gráficos o una demostración. ClawAI toma imágenes de la transmisión y se queda con las que cambiaron. La visión se factura al coste real del modelo utilizado.',
    },
    {
      title: 'Smart Auto',
      body: 'Empieza con el audio y añade visión solo cuando la transmisión se queda en silencio o cambia la imagen, para que pagues la visión cuando es probable que importe.',
    },
  ],
  sourcesTitle: 'Qué puede y qué no puede analizar',
  sourcesIntro:
    'Preferimos contarte los límites ahora que dejar que los descubras en pleno directo.',
  sources: [
    {
      title: '15 plataformas, analizadas en los servidores de ClawAI',
      body: 'ClawAI reconoce 15 plataformas de directos. Cuando una transmisión está en directo y es pública, y la plataforma lo permite, los servidores de ClawAI la leen por sí mismos: YouTube, Twitch, Kick, Facebook, TikTok LIVE, Rumble, BIGO LIVE, Bilibili, CHZZK, SOOP, Nimo TV y otras. No tienes que compartir nada, funciona en cualquier dispositivo, móviles incluidos, y un solo análisis se comparte con todos los espectadores. Instagram Live normalmente no puede ser leído por el servidor. Discord Go Live no es compatible porque no tiene enlace público. Los enlaces HLS que tienes derecho a analizar siguen funcionando; lo confirmas al empezar.',
    },
    {
      title: 'Cuando el servidor no puede leer una transmisión',
      body: 'Entonces YouTube, Twitch, Kick y Facebook se reproducen en su reproductor oficial y, si das tu permiso, la IA escucha el audio de tu dispositivo: en un ordenador compartes el audio de la pestaña en Chrome o Edge («Analizar con mi navegador»); en un móvil, el micrófono oye la transmisión por el altavoz («Analizar con el micrófono»). Solo se envía audio, para transcribirlo, así que se usa el modo Audio. Las demás plataformas se abren en la propia plataforma («Ver en …»), sin IA. El chat en directo aparece para vídeos de YouTube, Twitch y Kick; las demás plataformas tienen un enlace «Abrir el chat».',
    },
    {
      title: 'Los subtítulos llegan con unos segundos de retraso',
      body: 'El habla se transcribe en fragmentos cortos, por lo que los subtítulos llegan unos 7 a 12 segundos después. No es subtitulado en tiempo real.',
    },
    {
      title: 'Estados honestos, nunca un falso éxito',
      body: 'La ventana muestra cuándo está conectando, con retraso, recuperándose, sin minutos gratuitos, esperando tu aprobación, a capacidad máxima o cuando la transmisión ha terminado.',
    },
  ],
  plansTitle: 'Minutos gratuitos y precios',
  plansIntro:
    'Todos los planes incluyen minutos de análisis gratuitos cada mes. Son los valores por defecto y pueden ajustarse.',
  planMinutesUnit: 'minutos gratuitos al mes',
  planProAndAbove: 'Pro y superiores',
  plansBody:
    'Después de tus minutos gratuitos, el análisis cuesta {price} por minuto y solo después de que lo confirmes. Puedes fijar un tope de gasto. Cuando se agota tu crédito tienes un único periodo de gracia de 60 segundos. La visión se factura al coste real del modelo utilizado y al pausar se detiene el contador.',
  faqTitle: 'Preguntas frecuentes',
  faq: [
    {
      question: '¿Live Intelligence funciona con transmisiones en vivo de YouTube?',
      answer:
        'Sí, cuando la transmisión está en directo, es pública y YouTube lo permite: los servidores de ClawAI la leen, no tienes que compartir nada y funciona en cualquier dispositivo. Si el servidor no puede leerla, la IA trabaja con el audio de tu propio dispositivo cuando das tu permiso: en un ordenador compartes el audio de la pestaña en Chrome o Edge, y en un móvil el micrófono oye la transmisión por el altavoz. En ambos casos, los subtítulos llegan unos segundos después de la voz.',
    },
    {
      question: '¿Qué transmisiones puede analizar?',
      answer:
        'Directos públicos en YouTube, Twitch, Kick, Facebook, TikTok LIVE, Rumble, BIGO LIVE, Bilibili, CHZZK, SOOP, Nimo TV y otras plataformas compatibles, analizados en los servidores de ClawAI en cualquier dispositivo cuando la plataforma lo permite; y transmisiones HLS en vivo que tienes derecho a analizar, algo que confirmas al empezar. Si el servidor no puede leer una transmisión, YouTube, Twitch, Kick y Facebook pasan al audio de tu propio dispositivo, y las demás plataformas se abren en la propia plataforma, sin IA. Instagram Live normalmente no puede ser leído por el servidor, y Discord no es compatible.',
    },
    {
      question: '¿Los subtítulos son en tiempo real?',
      answer:
        'No. Llegan unos 7 a 12 segundos después del habla, porque el audio se transcribe en fragmentos cortos. Los resúmenes y los momentos clave siguen a los subtítulos.',
    },
    {
      question: '¿Cuánto cuesta?',
      answer:
        'Cada plan incluye minutos gratuitos cada mes: 30 en Free, 120 en Starter, 300 en Plus y 600 en Pro y superiores. Después, 0,02 $ por minuto, solo tras tu confirmación y con un tope de gasto opcional. La visión se factura al coste real del modelo.',
    },
    {
      question: '¿Qué pasa si mi crédito se agota a mitad de la transmisión?',
      answer:
        'Tienes un único periodo de gracia de 60 segundos y después el análisis se detiene hasta que añadas crédito.',
    },
    {
      question: '¿Pausar cuesta algo?',
      answer:
        'No. Al pausar, la emisión se congela y la facturación se detiene. Reanuda donde estabas o salta al directo.',
    },
    {
      question: '¿Qué pasa con mi historial?',
      answer:
        'El análisis que realmente viste se conserva hasta que lo borres. Puedes explorarlo, mejorar una tarjeta con el modelo que elijas y exportarlo en PDF, Markdown o TXT.',
    },
    {
      question: '¿Puedo hacerle preguntas a la transmisión?',
      answer:
        'No en esta primera versión. Live Intelligence ofrece subtítulos, tarjetas de resumen y momentos clave; las preguntas sobre una transmisión aún no están incluidas.',
    },
  ],
  closingTitle: 'Sigue la próxima transmisión sin ver cada minuto',
  closingBody:
    'Pega el enlace de un directo en YouTube, Twitch, TikTok LIVE u otra plataforma compatible, o un enlace HLS que tengas derecho a analizar, elige tu idioma y empieza. Tus minutos gratuitos te esperan.',
};
