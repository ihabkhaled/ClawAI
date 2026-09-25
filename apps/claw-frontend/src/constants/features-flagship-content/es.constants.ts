import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesFlagshipDictionary } from '@/types/features-cluster.types';

export const ES_FEATURES_FLAGSHIP_CONTENT: FeaturesFlagshipDictionary = {
  capabilitiesIntro:
    'Las secciones de arriba son la versión breve. Cada función de abajo tiene su propia página completa: qué hace realmente, cómo se habilita o se mide, y qué límites se aplican, todo contrastado con el producto tal como se ha lanzado.',
  cardSummaries: {
    [FeatureCapability.MULTIMODAL_AI]:
      'Notas de voz y de vídeo, un asistente que describe imágenes para los modelos que no pueden verlas, y un enrutamiento que elige un modelo capaz de manejar el adjunto.',
    [FeatureCapability.FILES_FROM_CHAT]:
      'Pide un PDF, una hoja de cálculo o una presentación en lenguaje natural y recibe un archivo real, con el nombre que le da el modelo que lo escribió.',
    [FeatureCapability.SMART_ATTACHMENTS]:
      'Suelta documentos, código, contenido multimedia o archivos comprimidos enteros en el chat; cada subida pasa un análisis antivirus y su texto se extrae para el modelo.',
    [FeatureCapability.NARRATED_RESEARCH]:
      'Un ciclo de investigación que decide si buscar o rastrear, narra cada paso mientras trabaja y respeta robots.txt en cada descarga.',
    [FeatureCapability.ORCHESTRATION_LABS]:
      'Laboratorios dedicados que ponen a varios modelos sobre un mismo problema: comparación con juez, consenso, escalado, verificación y más.',
    [FeatureCapability.CONVERSATION_TOOLS]:
      'Ramifica una conversación, edita y vuelve a ejecutar un mensaje, busca en tus hilos, exporta una respuesta y deja que un hilo se apoye en otro.',
    [FeatureCapability.READ_ALOUD]:
      'Escucha cualquier respuesta en lugar de leerla, con una reproducción que empieza en cuanto la primera parte breve está lista.',
    [FeatureCapability.IMAGE_GENERATION]:
      'Genera y edita imágenes dentro de la conversación, con varios proveedores de imagen y respaldo automático entre ellos.',
    [FeatureCapability.RELIABILITY]:
      'Respaldo automático a otro modelo, un cortacircuitos compartido para proveedores que se quedan sin crédito y transmisiones que sobreviven a una reconexión.',
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]:
      'Una asignación mensual de crédito de tu plan más recargas que nunca caducan, reservado antes de cada llamada y mostrado en tu propia moneda.',
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]:
      'Roles que puedes redefinir, gestión de usuarios y planes, y un registro de auditoría filtrable para quien opera ClawAI en una organización.',
  },
  capabilities: {
    [FeatureCapability.MULTIMODAL_AI]: {
      seo: {
        title: 'IA multimodal en ClawAI: voz, vídeo y visión',
        description:
          'Cómo gestiona ClawAI las notas de voz, las notas de vídeo y las imágenes: transcripción, fotogramas de vídeo muestreados, un asistente de visión para modelos solo de texto y enrutamiento según el tipo de adjunto.',
        keywords: [
          'notas de voz con IA',
          'comprensión de vídeo con IA',
          'enrutamiento de IA multimodal',
        ],
      },
      eyebrow: 'Función',
      title: 'IA multimodal: voz, vídeo y visión',
      summary:
        'Puedes hablarle a ClawAI, enseñarle un vídeo o pasarle una imagen, y el mensaje sigue llegando a un modelo capaz de entenderlo. La grabación, la transcripción, el muestreo de fotogramas y el asistente de visión forman parte del chat ya lanzado, no son una aplicación aparte.',
      sections: [
        {
          id: 'voice-and-video-notes',
          heading: 'Notas de voz y de vídeo desde el compositor',
          paragraphs: [
            'El compositor tiene un botón de grabación para notas de voz y de vídeo. Primero pide permiso, muestra una forma de onda en directo mientras grabas y limita cada grabación a cinco minutos. La grabación se transcribe —se prueba primero Gemini y OpenAI Whisper actúa como respaldo— y al modelo que responde se le indica que el mensaje llegó como nota de voz, para que conteste a lo que dijiste y no a un archivo.',
            'El audio que ya tienes funciona igual: las subidas en WebM, OGG, MP3, MP4 y M4A, WAV, FLAC y AAC se transcriben antes de llegar al modelo.',
          ],
        },
        {
          id: 'video-understanding',
          heading: 'Vídeo que el modelo puede seguir de verdad',
          paragraphs: [
            'Un vídeo subido se transcribe con marcas de tiempo, y se muestrean hasta seis fotogramas por vídeo que se muestran al modelo junto con la transcripción, para que pueda responder tanto sobre lo que ocurre en pantalla como sobre lo que se dice. Un vídeo sin sonido se indica como vídeo sin voz en lugar de producir una transcripción vacía, y puedes detener el procesamiento de un vídeo largo en cualquier momento.',
            'Cada plan tiene una asignación de duración de vídeo fijada por el operador; al margen del plan, un vídeo nunca puede superar los treinta minutos ni la resolución 4K. Los contenedores compatibles son MP4, MOV, WebM, AVI y MPEG.',
          ],
        },
        {
          id: 'vision-helper-and-modality-routing',
          heading: 'Un asistente de visión y enrutamiento según el tipo de adjunto',
          paragraphs: [
            'No todos los modelos pueden ver. Cuando el modelo que responde a un mensaje es solo de texto, un segundo modelo puede describirle hasta cuatro imágenes, incluido el texto que contengan, y al modelo que responde se le indica que trabaja a partir de una descripción. En las conversaciones Local-Only y de privacidad primero solo se usan asistentes locales servidos mediante Ollama o llama.cpp.',
            'En el modo Auto, el enrutador también clasifica los modelos candidatos según lo bien que manejan el tipo de adjunto del mensaje, de modo que una imagen, un PDF o un vídeo suele acabar en un modelo que lo acepta de forma nativa en lugar de depender del asistente.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuánto puede durar una nota de voz o de vídeo?',
          answer:
            'Una grabación hecha en el compositor puede durar hasta cinco minutos. Los vídeos subidos están limitados por la asignación de duración de vídeo de tu plan, y nunca superan los treinta minutos ni la resolución 4K en ningún plan.',
        },
        {
          question: '¿Qué pasa si envío una imagen a un modelo que no puede ver imágenes?',
          answer:
            'Si el asistente de visión está habilitado en tu plan, un modelo con visión describe la imagen y transcribe su texto, y el modelo que responde trabaja a partir de esa descripción, sabiendo que es una descripción y no la imagen en sí.',
        },
        {
          question: '¿ClawAI elige otro modelo por culpa de mi adjunto?',
          answer:
            'En el modo Auto, sí: el enrutador clasifica a los candidatos según lo bien que manejan el tipo de adjunto. Si fijas tú un modelo, se respeta tu elección y el asistente de visión cubre el hueco donde esté habilitado.',
        },
      ],
      productNote:
        'Las notas de voz y de vídeo, la transcripción y el enrutamiento según la modalidad ya están lanzados; el asistente de visión es una función del plan que el operador activa asignando un modelo asistente.',
    },
    [FeatureCapability.FILES_FROM_CHAT]: {
      seo: {
        title: 'Archivos desde el chat: PDF, DOCX, XLSX, PPTX y ZIP',
        description:
          'Pide a ClawAI un documento, una hoja de cálculo, una presentación o un archivo comprimido en lenguaje natural y descarga un archivo real en uno de diez formatos, con nombre y resumen del modelo.',
        keywords: [
          'generar PDF con IA',
          'crear hoja de cálculo con IA',
          'generador de PowerPoint con IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Archivos desde el chat',
      summary:
        'Di «pásalo a PDF» o «ponlo en una hoja de cálculo» y ClawAI te entrega un archivo, no un bloque de texto para copiar. El modelo escribe el contenido, un adaptador de formato construye el archivo y el resultado queda en la conversación, listo para descargar.',
      sections: [
        {
          id: 'ten-formats-from-plain-language',
          heading: 'Diez formatos de archivo a partir de una petición en lenguaje natural',
          paragraphs: [
            'Una petición como «crea un PDF de este plan» o «exporta la tabla como CSV» se reconoce y se envía a la generación de archivos. Los formatos compatibles son PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, texto plano, CSV y JSON, cada uno construido por su propio adaptador, de modo que una hoja de cálculo tiene celdas reales y una presentación tiene diapositivas reales en lugar de una sola página larga.',
          ],
        },
        {
          id: 'named-by-the-model',
          heading: 'Con nombre y resumen del modelo que lo escribió',
          paragraphs: [
            'En lugar de «documento (3).pdf», el modelo da a cada archivo un título descriptivo de hasta 120 caracteres y un resumen de una frase, que aparecen en la tarjeta del archivo en el chat. Los títulos en árabe, chino, hindi o cualquier otra escritura se conservan tal como se escribieron, sin transliterarlos.',
            'Por otro lado, cualquier respuesta individual se puede exportar con un clic como Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX o ZIP. Esas exportaciones convierten una respuesta que ya tienes, así que nunca cuentan contra tu asignación diaria de archivos.',
          ],
        },
        {
          id: 'downloads-and-allowances',
          heading: 'Descargas privadas y una asignación diaria en cada plan',
          paragraphs: [
            'Solo la persona que creó un archivo puede descargarlo, mediante un enlace autenticado. La descarga sigue disponible durante una hora; después puedes reconstruir el mismo archivo gratis o pedir al modelo que lo vuelva a generar con contenido nuevo.',
            'Cada plan, incluido el gratuito, tiene una asignación diaria de archivos escritos por IA que fija el operador, y los niveles superiores la amplían o eliminan el tope. Tu asignación de uso normal también se aplica a la redacción en sí, y rige el límite que se alcance primero.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué formatos de archivo puede crear ClawAI?',
          answer:
            'Diez: PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, texto plano, CSV y JSON. La exportación de respuestas cubre ocho de ellos: Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX y ZIP.',
        },
        {
          question: '¿Por qué dejó de funcionar mi enlace de descarga?',
          answer:
            'Los archivos generados se pueden descargar durante una hora. Pasado ese tiempo, abre la tarjeta del archivo y reconstrúyelo —el mismo contenido, sin coste— o pide al modelo que lo vuelva a generar si quieres que lo reescriba.',
        },
        {
          question: '¿Hay un límite de archivos que puedo generar?',
          answer:
            'Sí, una asignación diaria por plan que fija el operador, y también está disponible en el plan gratuito. Exportar una respuesta que ya tienes no cuenta para ese límite.',
        },
      ],
      productNote:
        'La generación de archivos es un servicio propio, con un adaptador por formato y su propia superficie de medición (FILE_GENERATION), separada del uso normal del chat.',
    },
    [FeatureCapability.SMART_ATTACHMENTS]: {
      seo: {
        title: 'Adjuntos inteligentes: archivos comprimidos, multimedia y antivirus',
        description:
          'Qué ocurre cuando adjuntas un archivo en ClawAI: cincuenta tipos compatibles, archivos comprimidos desplegados en un árbol legible, subidas reanudables y un análisis antivirus que bloquea ante la duda.',
        keywords: [
          'adjuntar archivos en chat de IA',
          'subir zip a una IA',
          'lector de archivos comprimidos con IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Adjuntos inteligentes',
      summary:
        'Un adjunto solo sirve si el modelo puede leerlo. ClawAI extrae el texto de documentos y archivos comprimidos antes de que un modelo los vea, analiza cada subida en busca de malware y te deja soltar archivos en cualquier parte del chat sin tener que buscar un botón.',
      sections: [
        {
          id: 'what-you-can-attach',
          heading: 'Qué puedes adjuntar, y cuánto',
          paragraphs: [
            'Documentos (PDF, DOCX, XLSX, PPTX, RTF), unos cuarenta formatos de texto y código, imágenes (PNG, JPEG, WebP, GIF, SVG), audio, vídeo y archivos comprimidos (ZIP, 7z, RAR, TAR, GZ, BZ2, XZ). Cada archivo puede ocupar hasta 50 MB y un mensaje puede llevar hasta diez. Los archivos de más de 4 MB se suben en fragmentos reanudables, así que una conexión caída no obliga a empezar de nuevo.',
            'Puedes soltar archivos en cualquier parte del panel de chat —sobre los mensajes o sobre el compositor— y cada adjunto muestra una etiqueta de estado mientras se sube, con un botón para cancelar si cambias de idea.',
          ],
        },
        {
          id: 'text-extraction-and-archives',
          heading: 'Extracción de texto y archivos comprimidos que el modelo puede recorrer',
          paragraphs: [
            'El texto legible de los archivos PDF, de Office y RTF se extrae y se entrega al modelo, para que responda a partir del propio documento y no de un marcador de posición. Un archivo comprimido se despliega en un árbol de archivos más el texto de cada elemento, así que puedes adjuntar un proyecto comprimido y preguntar por un archivo concreto de su interior.',
            'Los archivos comprimidos se revisan antes de desplegarlos: los límites de tamaño total descomprimido, de número de entradas y de profundidad de anidamiento impiden que una bomba de descompresión llegue siquiera al extractor.',
          ],
        },
        {
          id: 'scanning-and-retention',
          heading: 'Análisis antivirus que bloquea ante la duda, y retención',
          paragraphs: [
            'ClamAV analiza cada subida antes de almacenarla. Si el analizador no está disponible, la subida se rechaza en lugar de dejarla pasar sin analizar. Las subidas se eliminan automáticamente tras el periodo de retención que configura el operador, y puedes borrar un archivo tú mismo en cualquier momento.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puedo subir un proyecto entero como archivo ZIP?',
          answer:
            'Sí. Los archivos ZIP, 7z, RAR, TAR, GZ, BZ2 y XZ se despliegan en un árbol de archivos con el texto de cada elemento, para que el modelo pueda encontrar y citar un archivo concreto dentro del comprimido.',
        },
        {
          question: '¿Cuál es el tamaño máximo de un adjunto?',
          answer:
            '50 MB por archivo y hasta diez adjuntos por mensaje. Los archivos de más de 4 MB se suben en fragmentos reanudables, así que una conexión interrumpida se reanuda en lugar de empezar de cero.',
        },
        {
          question: '¿Qué pasa si el antivirus no está disponible?',
          answer:
            'La subida se rechaza. ClawAI nunca almacena un archivo sin analizar como alternativa: verás un error y podrás volver a intentarlo cuando el análisis esté de nuevo operativo.',
        },
      ],
      productNote:
        'La gestión de adjuntos vive en el servicio de archivos: la extracción, los manifiestos de archivos comprimidos, las subidas por fragmentos y el análisis con ClamAV están activados por defecto, no son complementos opcionales.',
    },
    [FeatureCapability.NARRATED_RESEARCH]: {
      seo: {
        title: 'Investigación narrada y rastreo web en ClawAI',
        description:
          'Cómo investiga ClawAI en la web: un planificador que elige entre buscar o rastrear, un registro de trabajo narrado en directo, descargas por niveles que respetan robots.txt y fuentes citadas.',
        keywords: [
          'investigación web con IA',
          'rastreador de sitios web con IA',
          'investigación con IA y fuentes',
        ],
      },
      eyebrow: 'Función',
      title: 'Investigación narrada y rastreo web',
      summary:
        'Cuando una pregunta necesita la web en directo, ClawAI no adivina. Un planificador decide si responder directamente, buscar, rastrear un sitio o ambas cosas, narra cada paso mientras trabaja y devuelve la respuesta con las fuentes que realmente leyó.',
      sections: [
        {
          id: 'a-planner-not-a-keyword',
          heading: 'Decide un planificador, no una palabra clave',
          paragraphs: [
            'En el modo de investigación Auto, un modelo planificador lee el mensaje y elige uno de cuatro caminos: responder con lo que ya sabe, buscar en la web, rastrear un sitio concreto, o rastrear y después buscar. Un enlace que pegues siempre se abre. Si el modelo planificador devuelve algo inservible, se prueba el siguiente modelo en lugar de que la investigación se detenga en silencio.',
            'También puedes elegir tú el modo en el compositor: desactivado, Auto, solo búsqueda, búsqueda y descarga de páginas, o búsqueda y extracción de contenido estructurado.',
          ],
        },
        {
          id: 'a-narrated-work-log',
          heading: 'Un registro de trabajo que puedes seguir',
          paragraphs: [
            'Cada paso —el plan, cada búsqueda, cada página descargada u omitida— se transmite en directo a un registro narrado encima de la respuesta y se guarda con ella, así que sigue ahí después de recargar. Las fuentes en las que se basó la respuesta aparecen junto a ella, para que puedas abrirlas y comprobarlas tú mismo.',
          ],
        },
        {
          id: 'tiered-and-polite-fetching',
          heading: 'Descargas por niveles que siguen las normas',
          paragraphs: [
            'Las páginas se descargan empezando por lo más barato: la API oficial del sitio cuando existe, después una petición HTTP simple y, solo cuando una página lo requiere, un navegador sin interfaz, con un servicio lector e instantáneas de archivo como últimos recursos. Un rastreo puede cubrir hasta doscientas páginas de un mismo sitio.',
            'robots.txt se respeta en cada descarga con el agente de usuario ClawAI-ResearchBot, y una página no permitida no se reintenta por otra vía. Los muros de inicio de sesión y los bloqueos legales detienen la descarga, los captchas nunca se resuelven, cada redirección se comprueba contra direcciones de redes privadas y una copia archivada siempre se etiqueta como tal.',
          ],
        },
      ],
      faq: [
        {
          question: '¿ClawAI respeta robots.txt?',
          answer:
            'Sí, en cada descarga, con el agente de usuario ClawAI-ResearchBot. Una página que robots.txt no permite se omite y no se reintenta mediante otro método de descarga.',
        },
        {
          question: '¿Puedo ver qué hizo realmente la investigación?',
          answer:
            'Sí. Un registro de trabajo narrado muestra el plan, cada búsqueda y cada página descargada u omitida, y se guarda con la respuesta junto con la lista de fuentes que utilizó.',
        },
        {
          question: '¿La investigación web está disponible en todos los planes?',
          answer:
            'Los modos de investigación son funciones del plan (RESEARCH_MODE, WEB_SEARCH, WEB_FETCH y WEB_EXTRACT) con sus propias asignaciones, que el operador fija por plan. La página de precios muestra qué incluye cada plan.',
        },
      ],
      productNote:
        'El ciclo de investigación se ejecuta en su propio servicio de investigación, con niveles de descarga editables por el administrador, y se mide en sus propias superficies en lugar de como tokens de chat ordinarios.',
    },
    [FeatureCapability.ORCHESTRATION_LABS]: {
      seo: {
        title: 'Laboratorios de orquestación: comparar, juzgar, consenso, escalado',
        description:
          'Los laboratorios de ClawAI que ponen a varios modelos sobre un mismo prompt: Compare con Judge y Critic, Consensus, Escalation, Best-of-N, Verify, Repair, Pipelines y más.',
        keywords: [
          'comparar modelos de IA lado a lado',
          'respuesta de IA por consenso',
          'LLM como juez',
        ],
      },
      eyebrow: 'Función',
      title: 'Laboratorios de orquestación',
      summary:
        'Algunas preguntas merecen más de un modelo. Los laboratorios son espacios de trabajo dedicados, cada uno con su propia página y vista de resultados, para ejecutar varios modelos sobre un mismo problema y ver exactamente en qué se diferencian.',
      sections: [
        {
          id: 'compare-judge-and-critic',
          heading: 'Compare, con un juez y un crítico',
          paragraphs: [
            'Compare envía un mismo prompt a varios modelos y muestra sus respuestas lado a lado con la latencia y el recuento de tokens. Activa Judge y un modelo independiente puntúa cada respuesta según criterios explícitos; activa Critic y anota los puntos débiles de cada una. Compare también funciona dentro de un hilo normal, así que puedes contrastar una sola respuesta sin salir de la conversación.',
          ],
        },
        {
          id: 'consensus-and-escalation',
          heading: 'Consenso y escalado',
          paragraphs: [
            'Consensus plantea la misma pregunta a entre dos y cinco modelos y sintetiza una sola respuesta a partir de sus coincidencias, señalando dónde discrepan. Escalation empieza con un modelo económico y sube por la cadena solo cuando la respuesta se queda corta, así que pagas por un modelo potente cuando la pregunta realmente lo necesita.',
          ],
        },
        {
          id: 'the-other-labs',
          heading: 'Verificar, reparar y el resto del banco de pruebas',
          paragraphs: [
            'Best-of-N genera varios candidatos y se queda con el mejor. Verify hace que un segundo modelo compruebe si una respuesta es correcta. Repair corrige un defecto concreto de una respuesta existente en lugar de regenerarla. Decompose divide una tarea grande en pasos. Role packs pasa un problema entre modelos especializados por rol, Cost ensemble equilibra la calidad con el gasto, y Pipelines encadena varias etapas en un único flujo de trabajo con nombre que se puede volver a ejecutar.',
            'El operador habilita cada laboratorio por plan, y las ejecuciones de los laboratorios se miden por separado del chat normal: Compare, Judge y Critic en sus propias superficies, y los demás laboratorios en la superficie de orquestación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué diferencia hay entre Compare y Consensus?',
          answer:
            'Compare muestra la respuesta de cada modelo lado a lado y te deja el veredicto a ti, opcionalmente con una puntuación de Judge. Consensus fusiona las respuestas en una sola y señala los puntos en los que los modelos discrepan.',
        },
        {
          question: '¿Cómo ahorra dinero el escalado?',
          answer:
            'Empieza con un modelo más barato y solo pasa a uno más potente cuando la respuesta no alcanza el nivel exigido, así que las preguntas fáciles nunca pagan por el modelo más caro.',
        },
        {
          question: '¿Los laboratorios están en todos los planes?',
          answer:
            'El operador activa cada laboratorio por plan, así que la disponibilidad depende de tu plan. La página de precios indica qué incluye cada plan.',
        },
      ],
      productNote:
        'Compare, Consensus, Escalation, Repair, Decompose, Best-of-N, Verify, Pipeline, Cost ensemble y Role pack se han lanzado cada uno con su propia página, su endpoint y su tarjeta de resultados.',
    },
    [FeatureCapability.CONVERSATION_TOOLS]: {
      seo: {
        title: 'Herramientas avanzadas de conversación: ramificar, editar, buscar, exportar',
        description:
          'Las herramientas de ClawAI para trabajar con una conversación en lugar de solo leerla: ramificación, editar y volver a ejecutar, búsqueda en el hilo, búsqueda entre hilos, exportación y enlaces compartidos.',
        keywords: [
          'ramificar conversación de IA',
          'editar y reejecutar un prompt',
          'exportar chat de IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Herramientas avanzadas de conversación',
      summary:
        'Una conversación larga es un documento de trabajo. ClawAI te da las herramientas para bifurcarla, corregirla, buscar en ella, reutilizarla en otro hilo y pasársela a otra persona, sin copiar y pegar.',
      sections: [
        {
          id: 'branch-edit-and-rerun',
          heading: 'Ramificar, editar y volver a ejecutar',
          paragraphs: [
            'Ramifica una conversación desde cualquier mensaje para probar otra dirección sin tocar la original. Edita uno de tus mensajes anteriores y vuelve a ejecutarlo, o regenera una respuesta que no te convence, y el hilo continúa a partir de la nueva versión.',
          ],
        },
        {
          id: 'find-search-and-cross-thread-context',
          heading: 'Buscar en el hilo, buscar en todo y contexto de otros hilos',
          paragraphs: [
            'Busca dentro del hilo actual, o en todos tus hilos por título y texto de los mensajes. El contexto entre hilos permite que una conversación se apoye en tus propios hilos anteriores relevantes: tres como máximo, y siempre solo los tuyos. Está activado por defecto, se puede desactivar en cada hilo y el inspector de contexto muestra qué hilos se usaron.',
          ],
        },
        {
          id: 'export-pin-and-share',
          heading: 'Exportar, fijar y compartir',
          paragraphs: [
            'Exporta un hilo completo como Markdown, o una sola respuesta como Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX o ZIP. Fija los hilos a los que vuelves a menudo. Comparte una conversación mediante un enlace público que puedes renovar con una URL nueva o revocar en cualquier momento.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Ramificar cambia la conversación original?',
          answer:
            'No. Una rama es un hilo nuevo que parte del mensaje que elegiste; la conversación original se queda exactamente como estaba.',
        },
        {
          question:
            '¿Puede colarse la conversación de otra persona en la mía a través del contexto entre hilos?',
          answer:
            'No. El contexto entre hilos solo lee tus propios hilos, tres como máximo, y puedes desactivarlo para cualquier hilo desde sus ajustes.',
        },
        {
          question: '¿Puedo dejar de compartir una conversación después de enviar el enlace?',
          answer:
            'Sí. Puedes revocar un enlace compartido en cualquier momento, o renovarlo con una URL nueva para que el antiguo deje de funcionar.',
        },
      ],
      productNote:
        'La ramificación, editar y volver a ejecutar, la regeneración, la búsqueda en el hilo y entre hilos, la exportación, la fijación, el uso compartido y el contexto entre hilos ya están lanzados en el espacio de trabajo del chat.',
    },
    [FeatureCapability.READ_ALOUD]: {
      seo: {
        title: 'Lectura en voz alta: escucha las respuestas de la IA en ClawAI',
        description:
          'Cómo lee ClawAI una respuesta en voz alta con voz generada en el servidor: reproducción que empieza pronto, controles de pausa y detención, gestión de respuestas largas y sin cargo por las partes fallidas.',
        keywords: [
          'lectura en voz alta con IA',
          'texto a voz para respuestas de IA',
          'escuchar el chat de IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Lectura en voz alta',
      summary:
        'Cualquier respuesta se puede escuchar en lugar de leer. La voz la genera en el servidor un modelo de texto a voz, no la voz integrada del navegador, y empieza a sonar antes de que se haya convertido la respuesta completa.',
      sections: [
        {
          id: 'how-playback-works',
          heading: 'Cómo funciona la reproducción',
          paragraphs: [
            'Cada mensaje del asistente tiene un botón de lectura en voz alta con reproducir, pausar y detener. La respuesta se convierte por partes y la reproducción empieza en cuanto la primera parte breve está lista, así que no esperas a que se procese entera una respuesta larga antes de oír algo.',
          ],
        },
        {
          id: 'long-answers-and-languages',
          heading: 'Respuestas largas y otros idiomas',
          paragraphs: [
            'Se leen hasta 12.000 caracteres de una respuesta, y se te avisa cuando una respuesta era más larga y la reproducción se cortó antes. Las frases se dividen correctamente en textos latinos, árabes, hindi, chinos, japoneses y coreanos, para que una respuesta multilingüe no tropiece en cada punto.',
          ],
        },
        {
          id: 'voices-and-billing',
          heading: 'Voces, disponibilidad y facturación',
          paragraphs: [
            'Las voces proceden de modelos de texto a voz de Gemini u OpenAI que elige el operador. La lectura en voz alta es una función del plan; si no se ha asignado ninguna voz, el botón te lo indica en lugar de fallar en silencio. Las partes que no se llegan a generar no se cobran.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La lectura en voz alta usa la voz de mi navegador?',
          answer:
            'No. La voz la genera en el servidor un modelo de texto a voz de Gemini u OpenAI, así que suena igual en cualquier dispositivo y navegador.',
        },
        {
          question: '¿Puede leer una respuesta muy larga?',
          answer:
            'Lee hasta 12.000 caracteres de una respuesta y te avisa cuando la respuesta era más larga, para que sepas que la reproducción se detuvo antes.',
        },
        {
          question: '¿Se me cobra si la lectura en voz alta falla?',
          answer:
            'Solo por las partes que realmente se generaron. Una parte que falla no se cobra, y puedes volver a reproducir la respuesta.',
        },
      ],
      productNote:
        'La lectura en voz alta es una función del plan que usa un modelo de texto a voz en el servidor asignado por el operador; no es el motor de voz del navegador.',
    },
    [FeatureCapability.IMAGE_GENERATION]: {
      seo: {
        title: 'Generación de imágenes con IA dentro de las conversaciones de ClawAI',
        description:
          'Genera y edita imágenes desde una conversación de ClawAI con modelos de Gemini, OpenAI, xAI o Stable Diffusion en local, con respaldo entre proveedores, progreso y reintento integrados.',
        keywords: [
          'generador de imágenes con IA',
          'editar imágenes con IA',
          'generación de imágenes con Gemini',
        ],
      },
      eyebrow: 'Función',
      title: 'Generación de imágenes',
      summary:
        'Describe una imagen en la conversación y ClawAI la genera allí mismo, junto al resto del trabajo. Detrás de una sola petición hay varios proveedores de imagen, y si uno falla se prueba automáticamente el siguiente.',
      sections: [
        {
          id: 'providers-and-fallback',
          heading: 'Varios proveedores detrás de una sola petición',
          paragraphs: [
            'Las peticiones de imagen pueden atenderlas los modelos de imagen de Gemini, gpt-image-1 de OpenAI, Grok Imagine de xAI o modelos locales de Stable Diffusion (SDXL-Turbo y un flujo de trabajo de ComfyUI) que se ejecutan en tu propio hardware. Si el proveedor elegido falla, la petición pasa al siguiente —primero en la nube, luego en local— en lugar de devolver un error.',
            'Si eliges tú un modelo de imagen concreto, se usa ese modelo, aunque el prompt no contenga ninguna palabra clave evidente sobre imágenes.',
          ],
        },
        {
          id: 'in-the-conversation',
          heading: 'Generadas en la conversación, con progreso',
          paragraphs: [
            'Las imágenes aparecen dentro del chat con un panel de progreso mientras se generan. Puedes cancelar una generación, o reintentarla con otro proveedor si el resultado no te gusta. No hay una aplicación de imágenes aparte a la que tengas que cambiar.',
          ],
        },
        {
          id: 'prompts-sizes-and-edits',
          heading: 'Prompts, tamaños y ediciones',
          paragraphs: [
            'Los prompts pueden tener hasta 4.000 caracteres, y las imágenes se pueden pedir en tamaños de 256 a 4.096 píxeles. Adjunta una imagen de referencia de hasta 25 MB para editar una imagen existente en lugar de partir de cero. La generación de imágenes es una función de los planes de pago y se mide en su propia superficie, separada de los tokens de chat.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué modelos generan las imágenes?',
          answer:
            'Los modelos de imagen de Gemini, gpt-image-1 de OpenAI, Grok Imagine de xAI y modelos locales de Stable Diffusion. Cuáles están disponibles depende de lo que haya configurado el operador.',
        },
        {
          question: '¿Puedo editar una imagen que ya tengo?',
          answer:
            'Sí. Adjunta una imagen de referencia de hasta 25 MB y describe el cambio que quieres, y el modelo la edita en lugar de generarla desde cero.',
        },
        {
          question: '¿La generación de imágenes está disponible en el plan gratuito?',
          answer:
            'La generación de imágenes es una función de los planes de pago y se mide por separado del chat. La página de precios muestra qué planes la incluyen.',
        },
      ],
      productNote:
        'La generación de imágenes se ejecuta en su propio servicio de imágenes, con respaldo de proveedores desde la nube hasta los modelos locales, y se mide en la superficie IMAGE.',
    },
    [FeatureCapability.RELIABILITY]: {
      seo: {
        title: 'Fiabilidad en ClawAI: respaldo, cortacircuitos y transmisiones reanudables',
        description:
          'Qué hace ClawAI cuando falla un proveedor: respaldo automático a otro modelo, un cortacircuitos compartido para cuentas de proveedor agotadas y transmisiones que se reanudan tras una reconexión.',
        keywords: [
          'respaldo de modelos de IA',
          'conmutación por error de proveedores LLM',
          'streaming de IA reanudable',
        ],
      },
      eyebrow: 'Función',
      title: 'Fiabilidad',
      summary:
        'Los proveedores fallan, se quedan sin crédito y agotan el tiempo de espera. ClawAI está hecho para que, cuando eso ocurre, tu conversación continúe con otro modelo y una transmisión interrumpida retome donde se quedó.',
      sections: [
        {
          id: 'automatic-fallback',
          heading: 'Respaldo automático a otro modelo',
          paragraphs: [
            'Cada petición enrutada lleva una lista de modelos candidatos. Si el modelo elegido falla a mitad de la petición, ClawAI pasa automáticamente al siguiente candidato, y la respuesta registra qué modelo respondió realmente, no solo el que se eligió al principio.',
          ],
        },
        {
          id: 'a-shared-provider-breaker',
          heading: 'Un cortacircuitos compartido para proveedores agotados',
          paragraphs: [
            'Cuando una cuenta de proveedor se queda sin crédito, un cortacircuitos saca a ese proveedor de la rotación durante diez minutos y después deja pasar una única llamada de prueba para ver si se ha recuperado. El estado del cortacircuitos se comparte en Redis entre todos los servidores de chat, de modo que un fallo se aprende una sola vez en lugar de que cada servidor lo redescubra, y cada servidor recurre a su propia copia si Redis no está disponible.',
          ],
        },
        {
          id: 'stop-and-resume',
          heading: 'Un botón Detener que siempre detiene, y transmisiones que se reanudan',
          paragraphs: [
            'Al pulsar Detener, la orden se difunde a todos los servidores de chat, así que el que esté ejecutando el modelo lo interrumpe. Si tu conexión se cae mientras se transmite una respuesta, al reconectar se reproducen desde un búfer los eventos que te perdiste en lugar de perder el resto de la respuesta.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué pasa si un modelo falla a mitad de una respuesta?',
          answer:
            'ClawAI recurre automáticamente al siguiente modelo candidato, y la respuesta muestra qué modelo la produjo realmente.',
        },
        {
          question: '¿Frente a qué protege el cortacircuitos de proveedores?',
          answer:
            'Frente a una cuenta de proveedor que se ha quedado sin crédito. Se omite durante diez minutos y luego se prueba con una llamada, en lugar de que todas las peticiones fallen contra ella mientras tanto.',
        },
        {
          question: '¿Pierdo una respuesta si se cae mi conexión?',
          answer:
            'No. Cuando la transmisión se reconecta, los eventos que te perdiste se reproducen desde un búfer en el servidor y la respuesta continúa.',
        },
      ],
      productNote:
        'El respaldo, el cortacircuitos de proveedores compartido en Redis, el botón Detener entre servidores y las transmisiones reanudables ya están en el servicio de chat; los operadores ven el estado del cortacircuitos en la página de conectores del administrador.',
    },
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: {
      seo: {
        title: 'Crédito de IA de pago por uso y precios en moneda local',
        description:
          'Cómo funciona el crédito de pago por uso de ClawAI: una asignación mensual de tu plan, recargas que nunca caducan, gasto reservado antes de cada llamada y precios mostrados en tu moneda.',
        keywords: [
          'IA de pago por uso',
          'recarga de crédito de IA',
          'precios de IA en moneda local',
        ],
      },
      eyebrow: 'Función',
      title: 'Crédito de pago por uso y moneda local',
      summary:
        'Los modelos en la nube cuestan dinero real por token, así que ClawAI los mide contra un monedero de crédito en lugar de esconder el coste dentro de una tarifa plana. Ves lo que gastó cada función, recargas solo cuando lo necesitas y lees los precios en tu propia moneda.',
      sections: [
        {
          id: 'two-kinds-of-credit',
          heading: 'Dos tipos de crédito, gastados en un orden fijo',
          paragraphs: [
            'El monedero guarda dos tipos de crédito. La asignación mensual es una parte del precio de tu plan de pago que se restablece en cada periodo de facturación y no se acumula; un plan gratuito no concede ninguna. El crédito comprado procede de las recargas, nunca caduca y sigue siendo tuyo aunque bajes de plan o canceles.',
            'El gasto siempre toma primero la asignación mensual y después el crédito comprado, así que una recarga solo se toca cuando se ha agotado la asignación del periodo. Cualquiera puede comprar una recarga, también en el plan gratuito, y los paquetes de recarga y los precios de los planes proceden de registros de precios versionados, no de esta página.',
          ],
        },
        {
          id: 'no-surprise-spend',
          heading: 'El gasto se reserva antes de una llamada, nunca después',
          paragraphs: [
            'Antes de que se ejecute un modelo en la nube, el coste de la petición se reserva contra tu saldo; después, la reserva se liquida por la cifra real o se libera. No puedes gastar por encima de tu saldo, y si lo que queda no alcanza para una respuesta útil, la petición se rechaza en lugar de cortarse a la mitad. Un modelo sin precio publicado se bloquea en lugar de tratarse como gratuito.',
            'El crédito cubre el chat, Compare, Judge, los laboratorios de orquestación, la generación de imágenes y de archivos, el agente de programación, las acciones del espacio de trabajo, la transcripción, el asistente de visión y la lectura en voz alta. Los modelos locales servidos mediante Ollama o llama.cpp no se miden, y la investigación web usa sus propias asignaciones separadas.',
          ],
        },
        {
          id: 'ledger-and-local-currency',
          heading: 'Un libro de movimientos por función, y precios en tu moneda',
          paragraphs: [
            'Cada movimiento se anota en un libro de movimientos de solo adición en microdólares enteros —sin desviaciones por redondeo— y la página de facturación muestra qué función gastó cada importe, de modo que una semana intensa de generación de imágenes se ve exactamente como tal.',
            'Los precios se muestran en más de sesenta monedas de visualización, detectadas según tu ubicación o elegidas a mano, con el importe original en dólares estadounidenses al lado. La cifra mostrada es una estimación; se te cobra en la moneda que aparece al pagar, a un tipo fijado en el momento del pago, a través de las pasarelas de pago que el operador haya habilitado: hoy, PayPal y Paymob.',
          ],
        },
      ],
      faq: [
        {
          question: '¿El crédito no usado se acumula?',
          answer:
            'La asignación mensual no: se restablece en cada periodo de facturación. El crédito que compraste como recarga nunca caduca y se mantiene aunque bajes de plan o canceles.',
        },
        {
          question: '¿Puede una conversación larga gastar más que mi saldo?',
          answer:
            'No. El coste se reserva antes de que se ejecute el modelo, y una petición que tu saldo restante no puede cubrir se rechaza de antemano en lugar de facturarse después.',
        },
        {
          question: '¿Por qué el precio al pagar difiere un poco del que vi?',
          answer:
            'El precio en moneda local del sitio es una estimación convertida desde dólares estadounidenses. El cobro usa la moneda que aparece al pagar y un tipo de cambio fijado en el momento en que pagas.',
        },
      ],
      productNote:
        'El crédito de pago por uso es un monedero con un libro de movimientos de solo adición en microdólares, que su operador activa por despliegue; los precios de los planes y los paquetes de recarga siempre proceden de registros de precios versionados.',
    },
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]: {
      seo: {
        title: 'Administración y control de acceso en ClawAI',
        description:
          'Qué obtiene un operador al ejecutar ClawAI para una organización: permisos basados en roles, roles personalizados, gestión de usuarios, ajustes de planes y pasarelas, y un registro de auditoría filtrable.',
        keywords: [
          'consola de administración de IA',
          'control de acceso basado en roles para IA',
          'registro de auditoría de IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Administración y control de acceso',
      summary:
        'Ejecutar ClawAI para un grupo de personas —una empresa, un departamento, un laboratorio— implica decidir quién puede hacer qué y poder comprobar qué ocurrió. La consola de administración cubre usuarios, roles, planes, pagos y un registro de auditoría, y es la misma consola tanto si ClawAI está alojado para ti como si se ejecuta en tus propios servidores.',
      sections: [
        {
          id: 'roles-and-permissions',
          heading: 'Roles y permisos que puedes redefinir',
          paragraphs: [
            'Cada cuenta tiene un rol, y cada pantalla y acción de la API comprueba un permiso con nombre en lugar de un rol fijado en el código. Los administradores pueden cambiar qué permisos lleva un rol y crear roles propios, así que un revisor de solo lectura o un operador que solo gestiona la facturación es un cambio de configuración, no de código.',
          ],
        },
        {
          id: 'users-plans-and-payments',
          heading: 'Usuarios, planes y pagos',
          paragraphs: [
            'Los administradores pueden activar o desactivar cuentas, cambiar el rol de un usuario, asignar una contraseña temporal que debe cambiarse en el siguiente inicio de sesión y ver el uso y el plan de cada usuario. Los planes, los reembolsos, las pasarelas de pago, los ajustes del enrutador inteligente, las entregas de webhooks y los detalles del despliegue tienen cada uno su propia pantalla de administración.',
          ],
        },
        {
          id: 'audit-and-self-hosting',
          heading: 'Un registro de auditoría, y tu propia infraestructura si la necesitas',
          paragraphs: [
            'Las acciones relevantes para la seguridad se anotan en un registro de auditoría que los administradores pueden filtrar y revisar, y los registros de auditoría se conservan en lugar de caducar con el calendario de los registros normales. Las organizaciones que no pueden enviar datos a un proveedor externo pueden ejecutar toda la plataforma en sus propios servidores solo con modelos locales; se trata de un despliegue a medida, no de un plan de autoservicio.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puedo crear mis propios roles?',
          answer:
            'Sí. Los administradores pueden crear roles y elegir qué permisos lleva cada uno; cada pantalla y acción de la API comprueba un permiso con nombre, no un rol fijo.',
        },
        {
          question:
            '¿ClawAI tiene espacios de trabajo de equipo, licencias por puesto o inicio de sesión único?',
          answer:
            'Todavía no. Hoy no hay espacios de trabajo de equipo compartidos, facturación por puesto, invitaciones por correo electrónico ni inicio de sesión único. La administración es por despliegue: un operador gestiona usuarios, roles y planes desde la consola de administración.',
        },
        {
          question: '¿Podemos ejecutar ClawAI dentro de nuestra propia red?',
          answer:
            'Sí, como un despliegue a medida en tus propios servidores y solo con modelos locales, de modo que ningún prompt ni documento sale de tu infraestructura. La página de despliegue privado describe lo que implica.',
        },
      ],
      productNote:
        'Los permisos basados en roles, los roles personalizados, la gestión de usuarios y el registro de auditoría ya están lanzados en la consola de administración; los espacios de trabajo de equipo, la facturación por puesto, las invitaciones y el inicio de sesión único no.',
    },
  },
};
