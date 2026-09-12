import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const ES_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'Qué ver a continuación',
    lastReviewed: 'Última revisión',
    backToHub: 'Todos los proveedores',
    ctaTitle: 'Pruébalo en vez de creer solo en nuestra palabra',
    ctaBody:
      'ClawAI dirige cada conversación al modelo que mejor le conviene, entre todos los proveedores de abajo, desde un solo espacio de trabajo.',
    startFree: 'Empezar con el plan gratuito',
    seeFeatures: 'Ver qué hace ClawAI',
    catalogHeading: 'Modelos a los que ClawAI puede enrutar',
    seePricing: 'Confirma el catálogo en vivo en la página de precios',
    catalogLiveNote:
      'Esta lista se lee en directo de los modelos a los que ClawAI puede enrutar en este momento, por lo que cambia a medida que se conectan proveedores o se retiran modelos.',
    catalogUnavailable:
      'El catálogo de modelos en vivo no está disponible temporalmente. Vuelva a intentarlo en breve.',
    catalogMore: 'y {count} modelos más disponibles en este proveedor',
    contextWindowLabel: 'Contexto',
    capabilityLabels: {
      vision: 'Visión',
      tools: 'Herramientas',
      audio: 'Audio',
    },
  },
  hub: {
    seo: {
      title: 'Proveedores de modelos de IA con los que se conecta ClawAI',
      description:
        'Todos los proveedores de modelos a los que ClawAI puede enrutar una conversación — OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok y modelos locales de peso abierto — con niveles de coste cualitativos y sin benchmarks inventados.',
      keywords: [
        'proveedores de modelos de IA',
        'qué modelos de IA admite ClawAI',
        'comparar proveedores de IA',
      ],
    },
    eyebrow: 'Proveedores de modelos',
    title: 'Los proveedores de modelos detrás de ClawAI',
    summary:
      'ClawAI no construye ningún modelo: enruta tu conversación a uno, elegido entre varios proveedores según la tarea, el coste o la privacidad. Esta página nombra las familias de proveedores que hoy cuentan con un conector activo, para qué se conoce generalmente cada una, y un nivel de coste cualitativo. No los clasifica, y no sustituye la revisión del catálogo en vivo antes de elegir un plan.',
    topicsHeading: 'Elige un proveedor',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5, o3 y el resto de la gama actual de OpenAI.',
      [ModelProviderPage.ANTHROPIC]: 'La familia Claude Opus, Sonnet y Haiku.',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro, Flash y Flash-Lite.',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek Chat y DeepSeek Reasoner.',
      [ModelProviderPage.XAI]: 'Grok 4 y Grok 3 mini de xAI.',
      [ModelProviderPage.LOCAL_AI]:
        'Modelos de peso abierto que ejecutas tú mismo, con Ollama o llama.cpp.',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'Los modelos de OpenAI en ClawAI — GPT-5, o3 y más',
        description:
          'Los modelos de OpenAI a los que ClawAI puede enrutar una conversación, para qué sirve cada uno, y un nivel de coste cualitativo. Confirma el catálogo en vivo antes de elegir un plan.',
        keywords: ['modelos de OpenAI en ClawAI', 'GPT-5 en ClawAI', 'qué modelo de OpenAI usar'],
      },
      eyebrow: 'Proveedor de modelos',
      title: 'OpenAI',
      summary:
        'ClawAI tiene un conector activo con OpenAI, así que una conversación puede enrutarse a uno de varios modelos de OpenAI según la tarea, su nivel de coste y tu modo de enrutamiento. Esta página nombra los modelos a los que ClawAI puede llegar hoy; no sustituye al catálogo en vivo de la página de precios.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Qué cubre la gama de OpenAI',
          paragraphs: [
            'La gama actual de OpenAI abarca un nivel insignia de razonamiento y uso general (GPT-5), una variante más ligera y ágil (GPT-5 mini), un generalista multimodal (GPT-4o y GPT-4o mini), y dos modelos diseñados específicamente para tareas de razonamiento paso a paso (o3 y o4-mini). El router de ClawAI puede elegir entre ellos en cada solicitud en lugar de fijar toda tu cuenta a uno solo.',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: 'Cuándo una tarea encaja con un modelo de OpenAI',
          paragraphs: [
            'Los modelos de OpenAI son una opción por defecto razonable para redacción general, asistencia con código y respuesta a preguntas del día a día, y los modelos de la serie o están diseñados específicamente para problemas de razonamiento en varios pasos, donde se espera que el modelo trabaje el problema en vez de responder de inmediato. Cuál rinde mejor en tu tarea concreta es algo que conviene verificar tú mismo — mira cómo evaluar modelos de IA más abajo — en lugar de tomarlo de un texto comercial, incluido este.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Cómo enruta ClawAI hacia él',
          paragraphs: [
            'El router de ClawAI puede enviar una solicitud a un modelo de OpenAI automáticamente bajo el enrutamiento Automático o Ahorro de coste, o puedes fijar uno concreto en el modo Modelo manual. Los niveles de coste de abajo son cualitativos: los modelos más baratos cuestan bastante menos por solicitud, pero la tarifa exacta cambia con la propia política de precios de OpenAI, no con nada que controle ClawAI.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Tiene ClawAI una asociación directa con OpenAI?',
          answer:
            'No. ClawAI se conecta a la API pública de OpenAI igual que lo haría cualquier aplicación con una clave de API. Esta página no implica ningún acuerdo especial.',
        },
        {
          question: '¿Qué modelo de OpenAI debería usar para programar?',
          answer:
            'Depende de la tarea y del espacio de trabajo en el que estés — consulta cómo evaluar modelos de IA, enlazado más abajo, para un método en vez de una única recomendación. Esta página evita deliberadamente afirmar que un modelo es el mejor.',
        },
        {
          question: '¿Está GPT-5 siempre disponible en mi plan?',
          answer:
            'La disponibilidad de los modelos la determina tu plan y el catálogo en vivo, no esta página. Confirma la gama actual en la página de precios antes de elegir un plan pensando en un modelo concreto.',
        },
      ],
      productNote:
        'ClawAI puede enrutar una solicitud a un modelo de OpenAI automáticamente, o puedes fijar uno directamente — la elección es tuya, sin quedar atado a un único proveedor.',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'Los modelos Claude de Anthropic en ClawAI',
        description:
          'Los modelos Claude a los que ClawAI puede enrutar una conversación — Opus, Sonnet y Haiku —, para qué sirve cada uno, y un nivel de coste cualitativo. Confirma el catálogo en vivo antes de elegir un plan.',
        keywords: [
          'modelos Claude en ClawAI',
          'Anthropic en ClawAI',
          'Claude Opus vs Sonnet vs Haiku',
        ],
      },
      eyebrow: 'Proveedor de modelos',
      title: 'Anthropic',
      summary:
        'ClawAI tiene un conector activo con Anthropic, así que una conversación puede enrutarse a un modelo Claude según la tarea, su nivel de coste y tu modo de enrutamiento. Esta página nombra los modelos a los que ClawAI puede llegar hoy; no sustituye al catálogo en vivo de la página de precios.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Qué cubre la gama Claude',
          paragraphs: [
            'La gama actual de Anthropic tiene tres niveles: Claude Opus 4 en la cima, pensado para las tareas más difíciles y complejas; Claude Sonnet 4 como nivel intermedio de uso general; y Claude Haiku 4.5 como opción rápida y de menor coste para solicitudes más sencillas. El router de ClawAI puede moverse entre ellos en cada solicitud.',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: 'Cuándo una tarea encaja con un modelo Claude',
          paragraphs: [
            'Los modelos Claude se usan habitualmente para trabajar con documentos largos, redacción cuidadosa paso a paso, y asistencia de código cuando seguir instrucciones detalladas importa. Como con cualquier proveedor, el modelo adecuado para una tarea concreta merece verificarse contra tu propia carga de trabajo — mira cómo leer benchmarks de IA más abajo para entender qué revela y qué no revela un número publicado.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Cómo enruta ClawAI hacia él',
          paragraphs: [
            'El router de ClawAI puede enviar una solicitud a un modelo Claude automáticamente bajo el enrutamiento Automático, Razonamiento alto o Ahorro de coste, o puedes fijar uno en el modo Modelo manual. Anthropic es el único proveedor de esta lista que publica una tarifa aparte de escritura en caché, que es un detalle de facturación y no una diferencia de capacidad: no cambia lo que el modelo puede hacer.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre Opus, Sonnet y Haiku?',
          answer:
            'Son tres niveles de coste y capacidad de la misma familia de modelos: Opus es el nivel más alto, Sonnet el nivel medio, Haiku el nivel más rápido y de menor coste. El router de ClawAI puede elegir entre ellos, o puedes elegir manualmente.',
        },
        {
          question: '¿Tiene ClawAI una asociación directa con Anthropic?',
          answer:
            'No. ClawAI se conecta a la API pública de Anthropic igual que lo haría cualquier aplicación con una clave de API.',
        },
        {
          question: '¿Está Claude Opus 4 disponible en todos los planes?',
          answer:
            'La disponibilidad de los modelos la determina tu plan y el catálogo en vivo, no esta página. Confirma la gama actual en la página de precios antes de elegir un plan pensando en un modelo concreto.',
        },
      ],
      productNote:
        'ClawAI puede enrutar una solicitud a un modelo Claude automáticamente, o puedes fijar uno directamente — la elección es tuya, sin quedar atado a un único proveedor.',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'Los modelos de Google Gemini en ClawAI',
        description:
          'Los modelos Gemini a los que ClawAI puede enrutar una conversación — 2.5 Pro, Flash y Flash-Lite —, para qué sirve cada uno, y un nivel de coste cualitativo. Confirma el catálogo en vivo antes de elegir un plan.',
        keywords: ['modelos Gemini en ClawAI', 'Google AI en ClawAI', 'Gemini Pro vs Flash'],
      },
      eyebrow: 'Proveedor de modelos',
      title: 'Google Gemini',
      summary:
        'ClawAI tiene un conector activo con Google Gemini, así que una conversación puede enrutarse a un modelo Gemini según la tarea, su nivel de coste y tu modo de enrutamiento. Esta página nombra los modelos a los que ClawAI puede llegar hoy; no sustituye al catálogo en vivo de la página de precios.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Qué cubre la gama Gemini',
          paragraphs: [
            'La gama actual de Google tiene tres niveles: Gemini 2.5 Pro para las solicitudes más exigentes, Gemini 2.5 Flash como nivel intermedio de uso general, y Gemini 2.5 Flash-Lite como opción rápida y de menor coste. El router de ClawAI puede moverse entre ellos en cada solicitud.',
          ],
        },
        {
          id: 'when-google-fits',
          heading: 'Cuándo una tarea encaja con un modelo Gemini',
          paragraphs: [
            'Los modelos Gemini se eligen habitualmente para tareas con una gran cantidad de material de origen que procesar, ya que la familia está construida en torno al manejo de contexto largo. Si un nivel concreto es el adecuado para tu carga de trabajo específica es algo que conviene comprobar por tu cuenta — mira cómo evaluar modelos de IA más abajo para un método repetible en vez de una afirmación de una sola línea.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Cómo enruta ClawAI hacia él',
          paragraphs: [
            'El router de ClawAI puede enviar una solicitud a un modelo Gemini automáticamente bajo el enrutamiento Automático o Ahorro de coste, o puedes fijar uno en el modo Modelo manual. La tarificación publicada de Gemini sube por encima de un umbral de contexto largo que el nivel de coste de esta página no intenta modelar — un único nivel cualitativo no es lo bastante preciso para expresar una tarifa escalonada, así que tómalo como punto de partida, no como una factura.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Tiene ClawAI una asociación directa con Google?',
          answer:
            'No. ClawAI se conecta a la API de Gemini igual que lo haría cualquier aplicación con una clave de API.',
        },
        {
          question: '¿Qué modelo Gemini maneja mejor los documentos largos?',
          answer:
            'La familia está, en general, construida para el manejo de contexto largo en todos sus niveles; el límite exacto y el coste dependen del modelo y la solicitud concretos. Revisa el catálogo en vivo en lugar de asumir una cifra fija.',
        },
        {
          question: '¿Está Gemini 2.5 Pro disponible en todos los planes?',
          answer:
            'La disponibilidad de los modelos la determina tu plan y el catálogo en vivo, no esta página. Confirma la gama actual en la página de precios antes de elegir un plan pensando en un modelo concreto.',
        },
      ],
      productNote:
        'ClawAI puede enrutar una solicitud a un modelo Gemini automáticamente, o puedes fijar uno directamente — la elección es tuya, sin quedar atado a un único proveedor.',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'Los modelos DeepSeek en ClawAI',
        description:
          'Los modelos DeepSeek a los que ClawAI puede enrutar una conversación — DeepSeek Chat y DeepSeek Reasoner —, para qué sirve cada uno, y un nivel de coste cualitativo. Confirma el catálogo en vivo antes de elegir un plan.',
        keywords: ['modelos DeepSeek en ClawAI', 'DeepSeek en ClawAI', 'DeepSeek Chat vs Reasoner'],
      },
      eyebrow: 'Proveedor de modelos',
      title: 'DeepSeek',
      summary:
        'ClawAI tiene un conector activo con DeepSeek, así que una conversación puede enrutarse a un modelo DeepSeek según la tarea, su nivel de coste y tu modo de enrutamiento. Esta página nombra los modelos a los que ClawAI puede llegar hoy; no sustituye al catálogo en vivo de la página de precios.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Qué cubre la gama DeepSeek',
          paragraphs: [
            'La gama actual de DeepSeek tiene dos modelos: DeepSeek Chat, un modelo de uso general, y DeepSeek Reasoner, diseñado específicamente para tareas donde se espera que el modelo trabaje varios pasos antes de responder. Ambos tienen un precio bastante por debajo de otros proveedores de esta página, lo que en parte explica que el modo de enrutamiento Ahorro de coste recurra a DeepSeek con más frecuencia.',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: 'Cuándo una tarea encaja con un modelo DeepSeek',
          paragraphs: [
            'DeepSeek es una opción razonable cuando el coste por solicitud importa más que exprimir el último incremento de capacidad, y DeepSeek Reasoner en concreto para tareas de razonamiento en varios pasos. Como con cualquier proveedor, verifícalo contra tu propia carga de trabajo en vez de una afirmación general — mira cómo leer benchmarks de IA más abajo.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Cómo enruta ClawAI hacia él',
          paragraphs: [
            'El router de ClawAI puede enviar una solicitud a un modelo DeepSeek automáticamente bajo el enrutamiento Ahorro de coste o Automático, o puedes fijar uno en el modo Modelo manual. Ambos modelos DeepSeek caen en el nivel de coste estándar de esta página — genuinamente económicos frente a los niveles premium de otras partes de este sitio, sin que esta página afirme una tarifa exacta.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Es DeepSeek más barato que otros proveedores?',
          answer:
            'Ambos modelos DeepSeek se sitúan aquí en el nivel de coste estándar, generalmente por debajo de los modelos de nivel premium de otros proveedores — pero el precio exacto cambia con las tarifas que publica el propio DeepSeek, no con esta página.',
        },
        {
          question: '¿Para qué sirve DeepSeek Reasoner?',
          answer:
            'Está diseñado para tareas donde el modelo trabaja varios pasos antes de producir una respuesta, con una intención similar a la de los modelos orientados al razonamiento que publican otros proveedores.',
        },
        {
          question: '¿Tiene ClawAI una asociación directa con DeepSeek?',
          answer:
            'No. ClawAI se conecta a la API pública de DeepSeek igual que lo haría cualquier aplicación con una clave de API.',
        },
      ],
      productNote:
        'ClawAI puede enrutar una solicitud a un modelo DeepSeek automáticamente, o puedes fijar uno directamente — la elección es tuya, sin quedar atado a un único proveedor.',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'Los modelos Grok de xAI en ClawAI',
        description:
          'Los modelos Grok de xAI a los que ClawAI puede enrutar una conversación — Grok 4 y Grok 3 mini —, para qué sirve cada uno, y un nivel de coste cualitativo. Confirma el catálogo en vivo antes de elegir un plan.',
        keywords: ['modelos Grok en ClawAI', 'xAI en ClawAI', 'Grok 4 en ClawAI'],
      },
      eyebrow: 'Proveedor de modelos',
      title: 'xAI',
      summary:
        'ClawAI tiene un conector activo con xAI, así que una conversación puede enrutarse a un modelo Grok según la tarea, su nivel de coste y tu modo de enrutamiento. Esta página nombra los modelos a los que ClawAI puede llegar hoy; no sustituye al catálogo en vivo de la página de precios.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Qué cubre la gama Grok',
          paragraphs: [
            'La gama actual de xAI tiene dos modelos disponibles a través de ClawAI: Grok 4, el nivel de mayor capacidad, y Grok 3 mini, una opción más rápida y de menor coste. El router de ClawAI puede moverse entre ellos en cada solicitud.',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: 'Cuándo una tarea encaja con un modelo Grok',
          paragraphs: [
            'Los modelos Grok son una opción razonable de uso general junto a los demás proveedores de esta página. Cuál rinde mejor en una tarea concreta conviene comprobarlo por tu cuenta — mira cómo evaluar modelos de IA más abajo para un método que no dependa del discurso comercial de un único proveedor.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Cómo enruta ClawAI hacia él',
          paragraphs: [
            'El router de ClawAI puede enviar una solicitud a un modelo Grok automáticamente bajo el enrutamiento Automático o Ahorro de coste, o puedes fijar uno en el modo Modelo manual. Grok 3 mini se sitúa en el nivel de coste económico de esta página; Grok 4 se sitúa en el nivel premium.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Tiene ClawAI una asociación directa con xAI?',
          answer:
            'No. ClawAI se conecta a la API pública de xAI igual que lo haría cualquier aplicación con una clave de API.',
        },
        {
          question: '¿Cuál es la diferencia entre Grok 4 y Grok 3 mini?',
          answer:
            'Son un nivel de mayor capacidad y un nivel más rápido y de menor coste de la misma familia de modelos. El router de ClawAI puede elegir entre ellos, o puedes elegir manualmente.',
        },
        {
          question: '¿Está Grok 4 disponible en todos los planes?',
          answer:
            'La disponibilidad de los modelos la determina tu plan y el catálogo en vivo, no esta página. Confirma la gama actual en la página de precios antes de elegir un plan pensando en un modelo concreto.',
        },
      ],
      productNote:
        'ClawAI puede enrutar una solicitud a un modelo Grok automáticamente, o puedes fijar uno directamente — la elección es tuya, sin quedar atado a un único proveedor.',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'Modelos de IA locales de peso abierto en ClawAI',
        description:
          'Ejecuta tú mismo modelos de peso abierto con Ollama o llama.cpp a través de ClawAI, en lugar de enviar solicitudes a un proveedor en la nube. Qué es el mecanismo y en qué se diferencia de los proveedores en la nube de esta página.',
        keywords: [
          'modelos de IA locales en ClawAI',
          'Ollama en ClawAI',
          'ejecutar modelos de IA localmente',
        ],
      },
      eyebrow: 'Proveedor de modelos',
      title: 'IA local',
      summary:
        'ClawAI tiene conectores activos con Ollama y llama.cpp, dos formas de ejecutar un modelo de peso abierto en hardware que tú controlas en lugar de enviar una solicitud a un proveedor en la nube. A diferencia de las demás páginas de este conjunto, aquí no hay un catálogo fijo que nombrar: los modelos son de peso abierto y eliges tú cuáles ejecutar.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Qué cambia realmente al ejecutar un modelo localmente',
          paragraphs: [
            'Un proveedor en la nube de este sitio ejecuta un modelo en su propia infraestructura y cobra por solicitud. Ollama y llama.cpp, en cambio, cargan un modelo de peso abierto en hardware que tú controlas — tu propia máquina, o un servidor que operas tú — de modo que la solicitud nunca sale de ahí. Eso cambia quién puede ver la solicitud, no de lo que el modelo es capaz; un modelo de peso abierto ejecutado localmente es algo distinto de cualquiera de los proveedores en la nube listados en el resto de este conjunto, no un sustituto directo de uno de ellos.',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollama y llama.cpp son dos herramientas distintas',
          paragraphs: [
            'Ambos son conectores reales de ClawAI, pero encajan en situaciones distintas: Ollama se centra en la facilidad de descargar y ejecutar un modelo con valores por defecto sensatos, mientras que llama.cpp ofrece un control más directo sobre cómo se ejecuta un modelo, a costa de una configuración más manual. La comparación completa está en Ollama frente a llama.cpp, enlazado más abajo, en lugar de repetirse aquí.',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: 'Elegir qué modelo de peso abierto ejecutar',
          paragraphs: [
            'Esta página no nombra deliberadamente ningún modelo de peso abierto concreto, porque el campo avanza más rápido de lo que una página estática puede seguir, y una recomendación desactualizada es peor que ninguna. Qué es la IA local-first, enlazado más abajo, explica los modelos de peso abierto y el equilibrio frente a los proveedores en la nube con más profundidad de la que debería tener una página de producto.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuesta algo la IA local a través de ClawAI?',
          answer:
            'ClawAI no cobra una tarifa por token para un modelo ejecutado localmente como sí hace con un proveedor en la nube, ya que no hay ningún proveedor en la nube al que facturar — el coste es el hardware que ya tienes en marcha. Confirma el comportamiento actual del plan en la página de precios.',
        },
        {
          question: '¿Qué modelo de peso abierto debería ejecutar?',
          answer:
            'Esta página no recomienda ninguno en concreto — consulta qué es la IA local-first, enlazado más abajo, para saber cómo abordar esa elección, ya que el modelo adecuado depende de tu hardware y tu tarea de una forma que una página estática no puede seguir de manera responsable.',
        },
        {
          question: '¿Es un modelo ejecutado localmente tan capaz como uno en la nube?',
          answer:
            'Eso depende por completo del modelo de peso abierto concreto y de tu hardware, y esta página no hará una afirmación general en un sentido ni en otro. Mira cómo evaluar modelos de IA, enlazado más abajo, para comprobarlo con tu propia carga de trabajo.',
        },
      ],
      productNote:
        'Los conectores de Ollama y llama.cpp de ClawAI son conectores reales y ya disponibles — el modo de enrutamiento Solo local mantiene cada solicitud en hardware que tú controlas.',
    },
  },
};
