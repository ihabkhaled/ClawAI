import { LearnTopic } from '@/enums/learn-topic.enum';
import type { LearnDictionary } from '@/types/learn.types';

export const ES_LEARN_CONTENT: LearnDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'Por dónde seguir',
    lastReviewed: 'Última revisión',
    backToHub: 'Todas las guías',
    ctaTitle: 'Pruébalo en lugar de leer sobre ello',
    ctaBody:
      'ClawAI reúne estas técnicas en un único espacio de trabajo, así que puedes lanzar el mismo prompt a varios modelos y ver tú mismo la diferencia.',
    startFree: 'Empieza con el plan gratuito',
    seeFeatures: 'Ver qué hace ClawAI',
  },
  hub: {
    seo: {
      title: 'Guías: IA multimodelo, enrutado y orquestación',
      description:
        'Explicaciones claras de las técnicas detrás de la IA multimodelo: enrutado, consenso, verificación, RAG, memoria y modelos de pesos abiertos en tu propio hardware.',
      keywords: ['orquestación de LLM', 'enrutado de modelos de IA', 'IA multimodelo'],
    },
    eyebrow: 'Guías',
    title: 'Cómo funciona realmente la IA multimodelo',
    summary:
      'Explicaciones breves y prácticas de las ideas que hay detrás de repartir un prompt entre varios modelos: qué hace cada técnica, cuándo compensa su coste y cuándo un solo modelo es la mejor respuesta. Sin benchmarks de fabricante ni cifras inventadas.',
    topicsHeading: 'Elige un concepto',
    cardSummaries: {
      [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]:
        'Cómo un prompt se convierte en tokens, probabilidades y una respuesta generada.',
      [LearnTopic.WHAT_ARE_AI_TOKENS]:
        'La unidad que un modelo realmente lee y escribe, y por qué una cifra exacta necesita su propio tokenizador.',
      [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]:
        'Lo que la temperatura y el top-p realmente cambian en una respuesta, y lo que no pueden cambiar.',
      [LearnTopic.WHAT_ARE_EMBEDDINGS]:
        'Cómo el texto se convierte en un vector de números, y por qué eso hace posible buscar por significado.',
      [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]:
        'Tres arreglos distintos para tres problemas distintos, y por qué muchos productos nunca necesitan el tercero.',
      [LearnTopic.WHAT_IS_MULTI_MODEL_AI]:
        'Usar varios modelos en un mismo flujo de trabajo en vez de casarte con uno.',
      [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]:
        'La capa que decide qué modelo se ejecuta, en qué orden y qué pasa con el resultado.',
      [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]:
        'Enviar cada petición al modelo elegido por tarea, coste, privacidad o latencia.',
      [LearnTopic.WHAT_IS_MODEL_FALLBACK]:
        'Qué debe pasar cuando el primer modelo se cae, se limita o se niega.',
      [LearnTopic.WHAT_IS_AI_CONSENSUS]:
        'Preguntar lo mismo a varios modelos y usar su acuerdo como señal.',
      [LearnTopic.WHAT_IS_BEST_OF_N]:
        'Generar varias respuestas candidatas y quedarse con la mejor.',
      [LearnTopic.WHAT_IS_AN_AI_JUDGE]:
        'Usar un modelo para puntuar las respuestas de otros, y dónde falla eso.',
      [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]:
        'Contrastar una respuesta con algo distinto del modelo que la produjo.',
      [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]:
        'La memoria de trabajo de una sola petición, y por qué no es memoria.',
      [LearnTopic.WHAT_IS_RAG]: 'Recuperar tus propios documentos y ponerlos delante del modelo.',
      [LearnTopic.WHAT_IS_AI_MEMORY]: 'Qué persiste entre conversaciones y cuánto te cuesta.',
      [LearnTopic.WHAT_ARE_CONTEXT_PACKS]:
        'Paquetes de contexto reutilizables que adjuntas a una conversación a propósito.',
      [LearnTopic.WHAT_IS_LOCAL_AI]:
        'Ejecutar un modelo en hardware que controlas, y qué cambia de verdad.',
      [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]:
        'Modelos cuyos pesos puedes descargar, y qué significa y qué no «abierto».',
      [LearnTopic.WHAT_IS_SELF_HOSTED_AI]:
        'Ejecutar toda la aplicación por tu cuenta, no solo el modelo.',
      [LearnTopic.OLLAMA_VS_LLAMACPP]:
        'Dos formas de ejecutar modelos de pesos abiertos en local, y para qué sirve cada una.',
      [LearnTopic.CLOUD_AI_VS_LOCAL_AI]:
        'El intercambio real: capacidad y comodidad frente a control y forma del coste.',
      [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: 'La diferencia entre responderte y hacer algo por ti.',
    },
  },
  topics: {
    [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]: {
      seo: {
        title: '¿Cómo generan respuestas los modelos de lenguaje?',
        description:
          'Descubre cómo un modelo tokeniza texto, predice el siguiente token según el contexto, muestrea una respuesta y por qué puede equivocarse.',
        keywords: [
          'cómo funcionan los modelos de lenguaje',
          'predicción del siguiente token',
          'generación de respuestas LLM',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Cómo generan respuestas los modelos de lenguaje',
      summary:
        'Un modelo de lenguaje genera una respuesta token a token. Convierte el prompt en tokens, usa el contexto actual para asignar probabilidades a los siguientes tokens posibles, elige uno, lo añade y repite. El resultado puede parecer deliberado, pero surge de patrones estadísticos aprendidos, no de recuperar un registro terminado.',
      sections: [
        {
          id: 'tokenization',
          heading: 'El texto entra como tokens',
          paragraphs: [
            'Antes de generar, un tokenizador divide las instrucciones, la conversación, los resultados de herramientas y el contexto adjunto. Un token puede ser una palabra, parte de ella o un signo. El modelo procesa identificadores, no las frases como las ve una persona; por eso la ortografía, el formato y el idioma afectan al espacio usado en la ventana de contexto.',
          ],
        },
        {
          id: 'next-token-prediction',
          heading: 'El modelo predice un token cada vez',
          paragraphs: [
            'Para la secuencia disponible, la red asigna una probabilidad a cada siguiente token de su vocabulario. Una regla de decodificación selecciona uno, lo agrega y vuelve a calcular. El ciclo termina al aparecer un token de parada o alcanzar un límite; normalmente no recupera una respuesta completa guardada de antemano.',
          ],
        },
        {
          id: 'context-and-probability',
          heading: 'El contexto cambia las probabilidades',
          paragraphs: [
            'Las instrucciones del sistema, la petición, los mensajes anteriores y los documentos aportados desplazan las probabilidades mientras quepan en el contexto activo. Elegir el token más probable suele ser más repetible; muestrear entre opciones plausibles produce variedad. La temperatura y controles similares cambian la selección, pero no aportan hechos nuevos.',
          ],
        },
        {
          id: 'not-database-retrieval',
          heading: 'Generar no es consultar una base de datos',
          paragraphs: [
            'El entrenamiento distribuye patrones del texto entre muchos pesos numéricos; no crea un catálogo de pasajes con direcciones fiables. Sin recuperación o una herramienta aparte, el modelo no abre un registro fuente para demostrar una afirmación. Por eso una respuesta fluida puede combinar patrones familiares en una afirmación sin respaldo real.',
          ],
        },
        {
          id: 'practical-limitations',
          heading: 'Límites prácticos que conviene prever',
          paragraphs: [
            'Los modelos pueden inventar detalles, interpretar mal una petición ambigua, omitir lo que queda fuera del contexto, repetir sesgos del entrenamiento y fallar en cálculos o razonamientos largos. Trata los resultados importantes como borradores: aporta contexto, usa recuperación o herramientas para hechos actuales y verifica las afirmaciones relevantes con una fuente o prueba independiente.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Un modelo de lenguaje entiende su respuesta?',
          answer:
            'Puede representar relaciones complejas y producir texto parecido al razonamiento, pero llamarlo comprensión humana añade algo que el mecanismo no demuestra. En términos operativos, predice tokens desde parámetros aprendidos y el contexto.',
        },
        {
          question: '¿Por qué el mismo prompt puede dar respuestas distintas?',
          answer:
            'Al muestrear entre varios tokens plausibles, una elección temprana diferente cambia todas las probabilidades posteriores. Los ajustes deterministas reducen la variación, pero no garantizan que la respuesta repetida sea correcta.',
        },
        {
          question: '¿Puede un modelo citar sus fuentes?',
          answer:
            'Solo si las fuentes se aportan mediante contexto, recuperación o una herramienta y el sistema conserva esa relación. Una cita generada solo desde los pesos puede ser inventada, así que debe verificarse.',
        },
      ],
      productNote:
        'ClawAI dirige prompts a modelos locales o en la nube configurados y puede ejecutar flujos de comparación y verificación; el modelo elegido sigue generando tokens de forma probabilística, así que el enrutamiento no garantiza la verdad.',
    },
    [LearnTopic.WHAT_ARE_AI_TOKENS]: {
      seo: {
        title: '¿Qué son los tokens de IA?',
        description:
          'Los tokens son las unidades que un modelo de lenguaje realmente lee y escribe, no palabras ni caracteres. Cómo funciona la tokenización, cómo se cuentan la entrada y la salida, y por qué solo el propio tokenizador del modelo da una cifra exacta.',
        keywords: ['qué es un token de IA', 'tokenización de LLM', 'tokens de entrada y salida'],
      },
      eyebrow: 'Fundamentos',
      title: '¿Qué son los tokens de IA?',
      summary:
        'Un token es la unidad que un modelo de lenguaje realmente lee y escribe: un fragmento de texto que resulta de dividir tu entrada con el propio tokenizador del modelo. No es una palabra ni un carácter, y cuántos tokens produce un texto depende del idioma en que está escrito, de cómo está formateado y de qué tokenizador lo está contando.',
      sections: [
        {
          id: 'tokens-vs-words-and-characters',
          heading: 'Un token no es una palabra, ni un carácter',
          paragraphs: [
            'Un tokenizador divide el texto en piezas tomadas de un vocabulario fijo que aprendió durante el entrenamiento. Una palabra corta y común suele ser exactamente un token; una palabra más larga o rara puede dividirse en dos o tres; un solo símbolo poco común puede ocupar por sí mismo más de un token. La puntuación, los espacios y los saltos de línea también son tokens, y no son gratis.',
            'Por eso el número de tokens, el número de palabras y el número de caracteres avanzan de forma independiente. Dos frases con el mismo número de palabras pueden usar un número distinto de tokens, y reescribir una frase con palabras más cortas y comunes puede reducir su número de tokens sin acortarla como texto.',
          ],
        },
        {
          id: 'tokenization-differs-by-language-and-model',
          heading: 'La tokenización varía según el idioma y el modelo',
          paragraphs: [
            'Cada modelo trae su propio tokenizador y su propio vocabulario fijo, construido a partir del texto con el que se entrenó. Las expresiones frecuentes en ese texto de entrenamiento tienden a comprimirse en tokens menos numerosos y más largos; las expresiones poco frecuentes tienden a dividirse en piezas más numerosas y cortas.',
            'De ahí se siguen dos consecuencias directas. Primero, la misma frase puede costar un número de tokens notablemente distinto según el idioma en que esté escrita, porque ningún vocabulario representa igual de bien a dos idiomas. Segundo, la misma frase puede costar un número distinto de tokens en dos modelos diferentes, porque cada uno tiene su propio vocabulario: un recuento del tokenizador de un modelo no es una estimación fiable para otro.',
          ],
        },
        {
          id: 'input-and-output-tokens',
          heading: 'Una petición gasta tokens de entrada y tokens de salida',
          paragraphs: [
            'Cada petición tiene dos bolsas de tokens, contadas y normalmente tarificadas por separado. Los tokens de entrada son todo lo que se envía al modelo: instrucciones, la conversación visible, cualquier documento adjunto y los resultados de herramientas. Los tokens de salida son todo lo que el modelo genera a cambio.',
            'Los tokens de entrada no son un coste único en una conversación de varios turnos. Como cada petición nueva reenvía la conversación hasta ese punto, los mensajes anteriores y cualquier material adjunto vuelven a contarse como entrada en cada turno, no solo en el turno en que se añadieron por primera vez.',
          ],
        },
        {
          id: 'tokens-and-the-context-window',
          heading: 'Los tokens son la unidad en que se mide una ventana de contexto',
          paragraphs: [
            'Una ventana de contexto es un presupuesto expresado en tokens, compartido por la entrada y la salida de una sola petición. En «¿Qué es una ventana de contexto?» se explica cómo se comporta ese presupuesto en la práctica; aquí solo importa la unidad: la ventana no se mide en palabras, caracteres ni mensajes, se mide en tokens, y entrada y salida se reparten el mismo total.',
          ],
        },
        {
          id: 'estimating-cost-without-a-price-table',
          heading: 'Estimar el coste sin una cifra fija',
          paragraphs: [
            'El coste basado en tokens es una multiplicación: tokens usados por una tarifa fijada por modelo. Los proveedores fijan y cambian esas tarifas según su propio calendario, y un modelo más capaz suele costar más por token que uno más pequeño, con los tokens de salida normalmente tarificados más caros que los de entrada. Nada de esto hace que valga la pena publicar aquí una cifra concreta: una tarifa impresa en esta página estaría equivocada en pocos meses.',
            'Lo que sigue siendo cierto sea cual sea la tarifa vigente es la forma del coste: los prompts más cortos y enfocados y las respuestas más cortas y enfocadas usan menos tokens, y reenviar archivos adjuntos grandes en cada turno de una conversación larga es una de las formas más comunes en que el uso de tokens crece sin que nadie lo haya decidido así.',
          ],
        },
        {
          id: 'exact-counts-need-the-tokenizer',
          heading: 'Una cifra exacta necesita el propio tokenizador del modelo',
          paragraphs: [
            'Una regla general sobre tokens por palabra es una aproximación de un idioma procesado por un tokenizador, y no se traslada a otro idioma, otra escritura ni otro modelo. El formato también cambia la cifra: el código, el JSON y el texto muy puntuado suelen tokenizarse con menos eficiencia que la misma información escrita como prosa sencilla.',
            'Si una cifra exacta importa, porque una petición está cerca de un límite de contexto o porque el coste debe predecirse con precisión, el único método fiable es pasar el texto real por el propio tokenizador del modelo o por un servicio de conteo antes de enviarlo. Una estimación basada en palabras o caracteres es una conjetura disfrazada de número.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Un token es lo mismo que una palabra?',
          answer:
            'No. Una palabra corta y común suele ser un token, pero una palabra más larga o rara puede dividirse en varios, y la puntuación, los espacios y los saltos de línea se cuentan como tokens por derecho propio. El número de tokens y el de palabras se corresponden solo de forma aproximada.',
        },
        {
          question:
            '¿Por qué la misma frase usa un número distinto de tokens en herramientas diferentes?',
          answer:
            'Cada herramienta suele reportar el recuento del tokenizador de un modelo concreto, y cada modelo tiene su propio vocabulario construido a partir de su propio texto de entrenamiento. Un recuento exacto para el tokenizador de un modelo es solo una estimación para otro.',
        },
        {
          question: '¿El formato como el código o JSON usa más tokens que el texto plano?',
          answer:
            'A menudo sí. La sangría, la puntuación y los símbolos repetidos son tokens en sí mismos, así que un formato muy estructurado puede usar notablemente más tokens que la misma información escrita en frases sencillas.',
        },
        {
          question:
            '¿Cómo puedo saber el número exacto de tokens de una petición antes de enviarla?',
          answer:
            'Pasa el texto exacto por el propio tokenizador del modelo concreto o por un servicio de conteo que ofrezca. Cualquier estimación basada en número de palabras o caracteres es aproximada, y el error crece con las diferencias de idioma, escritura y formato.',
        },
      ],
      productNote:
        'ClawAI cuenta los tokens de entrada y salida que una petición realmente usó una vez generada la respuesta, y muestra el coste y el margen que consumió esa respuesta en vez de una estimación hecha por adelantado.',
    },
    [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]: {
      seo: {
        title: '¿Qué controlan la temperatura y el top-p?',
        description:
          'La temperatura y el top-p deciden cómo elige un modelo su siguiente token, no lo que sabe. Qué cambia realmente cada ajuste, por qué más bajo no es automáticamente mejor, y por qué la temperatura cero sigue sin ser perfectamente repetible.',
        keywords: [
          'temperature top-p explicado',
          'parámetros de muestreo de LLM',
          'aleatoriedad en la salida de IA',
        ],
      },
      eyebrow: 'Fundamentos',
      title: '¿Qué controlan la temperatura y el top-p?',
      summary:
        'La temperatura y el top-p son ajustes de decodificación que cambian cómo un modelo elige su siguiente token a partir de las probabilidades que ya calculó. Controlan la aleatoriedad en el vocabulario y la redacción, no la precisión, el conocimiento ni la capacidad de razonar — y ninguno de los dos garantiza una salida exactamente repetible, ni siquiera en su ajuste más conservador.',
      sections: [
        {
          id: 'what-these-settings-actually-change',
          heading: 'Reconfiguran una elección, no el conocimiento del modelo',
          paragraphs: [
            'Para cuando la temperatura o el top-p entran en juego, el modelo ya ha calculado una probabilidad para cada posible siguiente token dado el contexto actual. Ninguno de los dos ajustes cambia de dónde vienen esas probabilidades: los parámetros aprendidos del modelo y el contexto que se le dio. Solo cambian cómo se elige un token de la distribución que el modelo ya produjo.',
          ],
        },
        {
          id: 'temperature-and-the-shape-of-the-distribution',
          heading: 'La temperatura ajusta qué tan marcada o plana es esa distribución',
          paragraphs: [
            'Una temperatura más baja hace que los tokens de mayor probabilidad tengan aún más posibilidades de ser elegidos, así que la salida se inclina hacia la única continuación más probable y se repite más entre ejecuciones distintas. Una temperatura más alta aplana la distribución, dando a los tokens de menor probabilidad una oportunidad más realista de ser elegidos, lo que produce redacciones más variadas — y más margen para que se cuele un token poco probable y a veces extraño.',
            'La temperatura no añade información que el modelo no tenga. No puede convertir una suposición incorrecta en una correcta; solo cambia con qué fuerza se compromete el modelo con la suposición que ya prefiere.',
          ],
        },
        {
          id: 'top-p-and-the-candidate-pool',
          heading: 'El top-p limita qué tokens siquiera se consideran',
          paragraphs: [
            'El top-p, también llamado muestreo por núcleo, funciona distinto a la temperatura: en vez de reconfigurar cada probabilidad, primero reduce el campo al conjunto más pequeño de tokens principales cuyas probabilidades suman un umbral elegido, y luego muestrea solo de ese conjunto. Un top-p bajo conserva solo el puñado de tokens de los que el modelo está más seguro; un top-p alto deja entrar una gama más amplia de alternativas plausibles. La temperatura y el top-p suelen aplicarse juntos, uno tras otro, en vez de sustituirse mutuamente.',
          ],
        },
        {
          id: 'why-temperature-zero-is-not-perfectly-repeatable',
          heading: 'La temperatura cero es casi determinista, no exactamente determinista',
          paragraphs: [
            'Una temperatura de cero, o un ajuste equivalente de "elegir siempre el token más probable", elimina el paso de muestreo y, en principio, debería hacer la salida reproducible para una entrada idéntica. En la práctica, la aritmética de punto flotante en las GPU no es estrictamente independiente del orden, y la infraestructura del proveedor puede agrupar o reordenar el cómputo entre peticiones. El resultado es que el mismo prompt enviado dos veces con el ajuste más determinista puede aun así volver distinto ocasionalmente, sobre todo cuando dos tokens candidatos estaban casi empatados.',
          ],
        },
        {
          id: 'lower-is-not-the-same-as-better',
          heading: 'Un ajuste más bajo no es automáticamente uno mejor',
          paragraphs: [
            'Reducir la aleatoriedad hace la salida más repetible, no más correcta. Una continuación equivocada con aparente seguridad sigue equivocada con aparente seguridad a baja temperatura, y los ajustes muy bajos también pueden producir una redacción notablemente repetitiva o forzada en salidas más largas, porque el modelo vuelve a elegir una y otra vez los mismos tokens seguros y de alta probabilidad.',
          ],
        },
        {
          id: 'choosing-a-setting-for-the-task',
          heading: 'El ajuste correcto depende de para qué es la salida',
          paragraphs: [
            'Las tareas con esencialmente una sola respuesta correcta — extraer un valor, seguir un formato estricto, escribir código que tenga que compilar — suelen beneficiarse de menos aleatoriedad, porque la consistencia importa más que la variedad. Las tareas donde varias respuestas distintas podrían ser igual de buenas — hacer una lluvia de ideas, redactar frases alternativas, escritura abierta — se benefician de más aleatoriedad, porque ahí la variedad es el objetivo. Ningún ajuste sustituye a darle al modelo mejor contexto, ni tampoco sustituye verificar una respuesta que de verdad importa.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La temperatura cero hace la salida determinista?',
          answer:
            'Casi, pero no está garantizado. Elimina la aleatoriedad intencional del muestreo, pero el cómputo en punto flotante y el agrupamiento del lado del proveedor aún pueden dar ocasionalmente un token distinto en un empate exacto o una decisión muy cerrada, así que las peticiones idénticas suelen ser — no siempre — idénticas.',
        },
        {
          question: '¿Cuál es la diferencia entre temperatura y top-p?',
          answer:
            'La temperatura reconfigura la probabilidad de cada posible siguiente token. El top-p primero reduce el campo al conjunto más pequeño de candidatos principales cuyas probabilidades superan un umbral, y luego muestrea solo de ese conjunto. Actúan sobre la misma distribución de formas distintas y suelen combinarse.',
        },
        {
          question: '¿Una temperatura más alta hace que un modelo sea más creativo o sepa más?',
          answer:
            'Cambia la variedad de la redacción, no el conocimiento ni el razonamiento. Una temperatura más alta puede producir una redacción más variada, pero sigue partiendo de los mismos parámetros aprendidos, y con la misma facilidad puede sacar a la luz una continuación menos probable y de peor calidad.',
        },
        {
          question: '¿Debería usar siempre el ajuste más bajo para tareas factuales?',
          answer:
            'Un ajuste más bajo hace la salida más consistente, lo cual ayuda cuando la consistencia misma es el objetivo, pero no corrige una respuesta incorrecta de fondo: una salida a baja temperatura puede ser incorrecta con aparente seguridad y de forma repetible. Verificar una afirmación factual sigue exigiendo una fuente o comprobación independiente.',
        },
      ],
      productNote:
        'ClawAI ofrece un control de temperatura por conversación, aplicado al proveedor que atienda la petición; no ofrece el top-p como ajuste, así que el muestreo por núcleo se queda en el valor predeterminado de cada proveedor.',
    },
    [LearnTopic.WHAT_ARE_EMBEDDINGS]: {
      seo: {
        title: '¿Qué son los embeddings?',
        description:
          'Un embedding convierte el texto en un vector de números que representa su significado, lo que hace posible buscar por significado y no por el texto exacto. Cómo se mide la similitud, y por qué los embeddings de distintos modelos no se pueden mezclar.',
        keywords: [
          'qué es un embedding',
          'embeddings vectoriales explicados',
          'búsqueda semántica por significado',
        ],
      },
      eyebrow: 'Fundamentos',
      title: '¿Qué son los embeddings?',
      summary:
        'Un embedding es una lista de números, producida por un modelo de embeddings, que representa el significado de un fragmento de texto como una posición en un espacio de muchas dimensiones. El texto con significado parecido acaba con vectores cercanos entre sí, y esa propiedad es justo la que hace posible buscar o emparejar por significado en vez de por el texto exacto.',
      sections: [
        {
          id: 'what-an-embedding-actually-is',
          heading: 'Una lista de números que representa el significado',
          paragraphs: [
            'Un modelo de embeddings lee un fragmento de texto —una palabra, una frase, un párrafo, a veces un documento entero— y devuelve un vector de longitud fija: una lista ordenada de números, normalmente de cientos o miles de elementos. Ese vector no es un resumen legible por una persona; es una posición en un espacio matemático que el modelo aprendió durante el entrenamiento, organizado de modo que los textos con significado relacionado queden cerca unos de otros.',
          ],
        },
        {
          id: 'why-similar-meaning-lands-nearby',
          heading: 'Lo que queda cerca es el significado parecido, no la ortografía parecida',
          paragraphs: [
            'Dos frases que casi no comparten palabras pero significan más o menos lo mismo pueden producir vectores cercanos entre sí, porque el modelo de embeddings aprendió asociaciones entre conceptos durante el entrenamiento, no solo qué letras aparecen. A la inversa, dos frases que comparten muchas palabras pero significan cosas distintas pueden acabar muy alejadas. Esta es la diferencia clave entre la búsqueda basada en embeddings y la coincidencia por palabras clave exactas.',
          ],
        },
        {
          id: 'how-similarity-is-measured',
          heading: 'La cercanía se mide, no se estima a ojo',
          paragraphs: [
            'Una vez que el texto está representado como vectores, comparar significado se convierte en un problema geométrico: una puntuación de similitud calculada entre dos vectores, casi siempre según cuánto apunten en la misma dirección. Buscar en una colección grande significa calcular esa puntuación entre un vector de consulta y cada vector almacenado, y devolver las coincidencias más cercanas: la misma operación tanto si la colección tiene cien entradas como cien millones.',
          ],
        },
        {
          id: 'embeddings-are-model-specific',
          heading: 'Los embeddings de distintos modelos no se mezclan',
          paragraphs: [
            'Igual que el vocabulario de un tokenizador, el espacio vectorial de un modelo de embeddings es propio de ese modelo y de cómo se entrenó. Un vector producido por un modelo de embeddings no es comparable de forma útil con uno producido por otro modelo distinto, aunque ambos vectores tengan el mismo número de dimensiones. Cambiar de modelo de embeddings significa volver a generar los embeddings de todo lo ya almacenado, no solo del contenido nuevo a partir de ese momento.',
          ],
        },
        {
          id: 'not-the-same-job-as-a-language-model',
          heading: 'Un modelo de embeddings hace un trabajo distinto al de un modelo de lenguaje',
          paragraphs: [
            'Un modelo de lenguaje genera texto, token a token, a partir de un prompt. Un modelo de embeddings no genera nada: convierte texto en un vector y ahí termina. Algunos sistemas usan el mismo modelo base para ambas tareas, y otros usan dos modelos completamente distintos; en cualquier caso, el vector que produce un paso de embeddings no es en sí mismo una respuesta, solo algo que un paso de búsqueda o emparejamiento puede comparar.',
          ],
        },
        {
          id: 'where-embeddings-show-up-in-practice',
          heading: 'Dónde aparece esto en la práctica',
          paragraphs: [
            'Los embeddings son lo que hace posible la generación aumentada por recuperación: consulta qué es RAG para ver cómo encaja la recuperación con un modelo de lenguaje, pero la misma técnica también sustenta la búsqueda semántica en tickets de soporte o documentación, el emparejamiento de conversaciones pasadas parecidas, la eliminación de contenido casi idéntico y la agrupación de elementos relacionados sin que nadie etiquete categorías a mano.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Un embedding es lo mismo que un token?',
          answer:
            'No. Un token es una unidad discreta de texto que un modelo de lenguaje lee o escribe de una en una. Un embedding es un vector continuo que representa el significado de un fragmento de texto más grande, producido por un paso aparte que no genera nada.',
        },
        {
          question: '¿Puedo comparar embeddings producidos por dos modelos distintos?',
          answer:
            'No de forma útil. Cada modelo de embeddings define su propio espacio vectorial durante el entrenamiento, así que una distancia que en el espacio de un modelo significa "muy similar" no tiene un significado definido en el espacio de otro modelo, aunque los vectores tengan la misma longitud.',
        },
        {
          question: '¿Un vector de embedding más grande significa mejor calidad de búsqueda?',
          answer:
            'No por sí solo. Más dimensiones pueden capturar más matices, pero la calidad depende de con qué se entrenó el modelo y de cuánto encaje eso con tu contenido, no solo del número de dimensiones.',
        },
        {
          question: '¿Alguien puede recuperar el texto original a partir de un embedding?',
          answer:
            'Recuperarlo con exactitud suele ser poco práctico, pero un embedding sigue derivándose directamente de tu contenido y puede filtrar información relevante sobre él bajo ciertos ataques. Trata los embeddings almacenados de texto sensible con el mismo cuidado que el propio texto, no como si ya estuvieran anonimizados.',
        },
      ],
      productNote:
        'Las funciones de memoria y paquetes de contexto de ClawAI generan embeddings localmente mediante Ollama y los guardan en una base de datos vectorial para la búsqueda por similitud, en vez de enviar tu contenido a una API de embeddings en la nube para ese fin.',
    },
    [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]: {
      seo: {
        title: 'Prompting vs. RAG vs. fine-tuning: ¿en qué se diferencian?',
        description:
          'Tres formas distintas de cambiar lo que produce un modelo: mejores instrucciones, contexto recuperado o un modelo modificado. Qué arregla realmente cada una, qué no puede arreglar, y por qué muchos productos nunca necesitan la tercera.',
        keywords: [
          'diferencia entre prompting, RAG y fine-tuning',
          'cuándo hacer fine-tuning a un LLM',
          'RAG o fine-tuning',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Prompting vs. RAG vs. fine-tuning: ¿en qué se diferencian?',
      summary:
        'El prompting, la generación aumentada por recuperación (RAG) y el fine-tuning son tres respuestas distintas a la misma pregunta de fondo: ¿cómo consigues que un modelo produzca lo que realmente necesitas? Cada una cambia una parte distinta del sistema —la petición, el contexto o el propio modelo— y arregla un tipo distinto de carencia. Elegir la técnica equivocada para el problema real es la razón más común de que un proyecto se estanque.',
      sections: [
        {
          id: 'three-different-fixes-for-three-different-problems',
          heading: 'Tres arreglos distintos para tres problemas distintos',
          paragraphs: [
            'El prompting cambia lo que le dices al modelo para una petición: instrucciones, ejemplos, reglas de formato. La generación aumentada por recuperación, o RAG, cambia lo que el modelo puede ver en una petición, recuperando material relevante y añadiéndolo al contexto —consulta qué es RAG para ver cómo funciona ese paso de recuperación—. El fine-tuning cambia el modelo mismo, ajustando sus pesos para que un patrón quede fijado y disponible sin repetirlo cada vez. No son tres niveles de dificultad de un mismo arreglo; responden a tres tipos distintos de carencia.',
          ],
        },
        {
          id: 'prompting-changes-only-the-request',
          heading: 'El prompting solo cambia la petición que tienes delante',
          paragraphs: [
            'Un prompt son instrucciones, ejemplos y restricciones incluidos en una única petición. Nada de eso persiste una vez llega la respuesta: la siguiente petición vuelve a partir del mismo estado en blanco a menos que incluyas de nuevo las mismas instrucciones. Esto hace del prompting la técnica más barata y rápida para iterar: un cambio de redacción se puede probar en segundos, sin infraestructura ni reentrenamiento.',
            'El prompting también es lo primero que conviene agotar antes de recurrir a cualquier otra cosa. Una proporción sorprendente de problemas de "el modelo no sabe hacer X" son en realidad problemas de "las instrucciones nunca dijeron que hiciera X".',
          ],
        },
        {
          id: 'rag-adds-facts-without-touching-the-model',
          heading: 'RAG añade hechos y documentos sin tocar el modelo',
          paragraphs: [
            'RAG resuelve un problema distinto: información con la que el modelo nunca se entrenó, o información que cambia demasiado rápido para que el entrenamiento le siga el ritmo —tus propios documentos, registros actuales, cualquier cosa privada—. En vez de enseñarle esa información al modelo, un paso de recuperación encuentra los pasajes relevantes y los coloca directamente en la petición como contexto, usando embeddings para buscar por significado en vez de por el texto exacto —consulta qué son los embeddings para ver cómo funciona esa búsqueda por debajo—.',
            'Como nada del modelo cambia, actualizar los documentos subyacentes actualiza al instante lo que el sistema puede responder, sin ningún paso de reentrenamiento. La contrapartida es que la calidad de la respuesta está limitada por la calidad de la recuperación: si el pasaje correcto nunca se encuentra, el modelo no puede usar información que nunca vio.',
          ],
        },
        {
          id: 'fine-tuning-changes-the-model-itself',
          heading: 'El fine-tuning cambia el propio modelo',
          paragraphs: [
            'El fine-tuning ajusta los pesos de un modelo usando ejemplos de entrenamiento adicionales, de modo que un patrón de comportamiento —un tono, un formato de respuesta, una habilidad especializada demostrada en los ejemplos— pasa a formar parte del modelo en vez de algo que tienes que repetir en cada prompt o aportar mediante recuperación. Una vez entrenado, el modelo se comporta así por defecto, en cualquier petición, sin instrucciones adicionales.',
            'También tiene costes reales que el prompting y el RAG no tienen: hay que preparar y seleccionar ejemplos de entrenamiento, hay que ejecutar y evaluar una ronda de entrenamiento, y el resultado es un artefacto de modelo específico que hay que alojar y mantener sincronizado a medida que mejoran los modelos base. El fine-tuning tampoco añade hechos vivos o cambiantes: fija un patrón a partir de un conjunto de entrenamiento fijo, y queda desactualizado igual que cualquier entrenamiento estático.',
          ],
        },
        {
          id: 'matching-the-technique-to-the-failure',
          heading: 'Ajusta la técnica al fallo real, no a la opción más sofisticada',
          paragraphs: [
            'Tono equivocado, formato equivocado, instrucciones pasadas por alto: normalmente un problema de prompting. Hechos erróneos o ausentes, sobre todo de material propio o que cambia rápido: normalmente un problema de recuperación. Un comportamiento especializado que quieres que se aplique de forma constante, en cada petición, sin volver a explicarlo cada vez: el caso para el que realmente está pensado el fine-tuning. No son mutuamente excluyentes —un modelo con fine-tuning puede seguir recibiendo un prompt y contexto recuperado—, pero cada técnica solo arregla el fallo para el que está construida, y usar la equivocada deja el problema real sin resolver mientras añade coste y complejidad.',
          ],
        },
        {
          id: 'why-many-products-skip-fine-tuning',
          heading: 'Por qué muchos productos nunca recurren al fine-tuning',
          paragraphs: [
            'El prompting y el RAG dejan intacto el modelo subyacente, así que actualizar a un modelo base más nuevo o mejor suele ser solo un cambio de configuración. Un modelo con fine-tuning queda atado al modelo base del que se entrenó: una actualización relevante del modelo base suele implicar volver a preparar datos y reentrenar en vez de simplemente cambiar. Por eso muchos productos resuelven todo su problema con prompting más recuperación, y solo recurren al fine-tuning cuando un comportamiento específico y bien definido necesita ser constante en un volumen enorme de peticiones sin el coste de repetir instrucciones y contexto cada vez.',
          ],
        },
      ],
      faq: [
        {
          question: '¿RAG actualiza el conocimiento del modelo de forma permanente?',
          answer:
            'No. RAG cambia lo que se incluye en el contexto de una petición; el modelo subyacente nunca se modifica. La siguiente petición que no recupere el mismo material empieza sin él, igual que cualquier otro prompt.',
        },
        {
          question: '¿El fine-tuning es siempre más preciso que el prompting o el RAG?',
          answer:
            'No. El fine-tuning fija un patrón a partir de sus ejemplos de entrenamiento, pero no añade hechos ausentes de esos datos de entrenamiento, y no mantiene los hechos al día como puede hacerlo la recuperación. Un modelo con fine-tuning puede seguir estando equivocado con total confianza sobre cualquier cosa fuera de lo que se le entrenó.',
        },
        {
          question: '¿Se pueden combinar prompting, RAG y fine-tuning?',
          answer:
            'Sí. Cambian partes distintas del sistema, así que un modelo con fine-tuning puede seguir recibiendo contexto recuperado e instrucciones explícitas en la misma petición. Combinarlos es habitual; no hace falta tratarlos como opciones mutuamente excluyentes.',
        },
        {
          question: '¿Cuál debería probar primero?',
          answer:
            'El prompting, casi siempre. No requiere infraestructura y un cambio de redacción se puede probar en segundos. Pasa a la recuperación cuando la carencia sea información ausente o desactualizada, y considera el fine-tuning solo cuando un comportamiento específico y bien definido deba ser constante en un volumen de peticiones lo bastante grande como para justificar el coste de entrenamiento y mantenimiento.',
        },
      ],
      productNote:
        'Los paquetes de contexto de ClawAI y la recuperación de archivos y del espacio de trabajo añaden material relevante a una petición sin tocar el modelo subyacente; ClawAI no ofrece fine-tuning de modelos: los modelos en la nube y locales a los que enruta se usan tal como ya están entrenados.',
    },
    [LearnTopic.WHAT_IS_MULTI_MODEL_AI]: {
      seo: {
        title: '¿Qué es la IA multimodelo?',
        description:
          'La IA multimodelo consiste en usar varios modelos de lenguaje en un mismo flujo en vez de casarte con uno. Qué resuelve, qué cuesta y cuándo basta con uno.',
        keywords: ['IA multimodelo', 'varios modelos de IA', 'elección de modelo'],
      },
      eyebrow: 'Fundamentos',
      title: '¿Qué es la IA multimodelo?',
      summary:
        'La IA multimodelo trata los modelos de lenguaje como piezas intercambiables en lugar de elegir uno y construirlo todo a su alrededor. La misma pregunta puede ir a un modelo rápido y barato, a uno pesado de razonamiento o a uno que corre en tu propio hardware, y la elección se hace por petición y no una sola vez al contratar.',
      sections: [
        {
          id: 'the-problem',
          heading: 'El problema que resuelve',
          paragraphs: [
            'Los modelos no son uniformemente mejores o peores entre sí. Uno escribe código más limpio, otro sigue documentos largos con más fidelidad, un tercero responde en una fracción del tiempo por una fracción del coste. Casarte con un solo proveedor implica aceptar su punto más débil en todas tus tareas.',
            'También implica aceptar sus caídas, sus límites de uso, sus cambios de precio y sus retiradas de modelos. Cuando se jubila un modelo del que dependes, un flujo de un solo modelo hay que rehacerlo. Un flujo multimodelo cambia un ajuste.',
          ],
        },
        {
          id: 'what-it-looks-like',
          heading: 'Cómo se ve en la práctica',
          paragraphs: [
            'En su forma más simple, la IA multimodelo es un desplegable: eliges el modelo por conversación. Ya es útil, y es donde casi todo el mundo empieza.',
            'Se pone interesante cuando la elección es automática, cuando un enrutador lee la petición y la manda a donde corresponde, y más aún cuando varios modelos responden a la vez y sus respuestas se comparan, se puntúan o se combinan. Son técnicas distintas, cada una con su coste, y cada una tiene aquí su propia página.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Lo que cuesta',
          paragraphs: [
            'Cada modelo que añades es otra cuenta de proveedor, otro juego de credenciales, otra relación de facturación y otro formato de datos de uso. Ese trabajo extra es el argumento honesto en contra, y por eso casi nadie lo hace a mano.',
            'Lanzar varios modelos al mismo prompt multiplica su coste en tokens. Técnicas como el consenso o el mejor de N valen su precio en decisiones importantes y son puro derroche en preguntas rutinarias. Saber distinguirlas es casi toda la habilidad.',
          ],
        },
        {
          id: 'when-one-is-enough',
          heading: 'Cuándo un solo modelo es la respuesta correcta',
          paragraphs: [
            'Si tu carga de trabajo es estrecha y un modelo la resuelve bien, añadir más es complejidad sin beneficio. El enfoque multimodelo compensa cuando tus tareas son variadas, cuando el coste por tarea varía en un orden de magnitud entre peticiones, o cuando parte de tus datos sencillamente no puede salir hacia un tercero.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La IA multimodelo no es solo una pasarela de API?',
          answer:
            'Una pasarela te da un único endpoint para varios proveedores, lo que resuelve la fontanería. La IA multimodelo es lo que haces con eso: elegir por petición, comparar respuestas, recurrir a otro modelo si uno falla. La pasarela es un requisito previo, no la técnica.',
        },
        {
          question: '¿Usar varios modelos hace las respuestas más exactas?',
          answer:
            'Por sí solo, no. Mandar un prompt a tres modelos te da tres respuestas, no una mejor. La exactitud sube solo cuando añades una forma de elegir entre ellas —acuerdo, puntuación o una comprobación externa— y cada una tiene sus propios fallos.',
        },
        {
          question: '¿Necesito varias suscripciones?',
          answer:
            'Si vas directo a cada proveedor, sí. Las plataformas que agregan proveedores existen en parte para evitarlo. ClawAI es una de ellas: {cloudProviderCount} proveedores en la nube más runtimes locales bajo una sola cuenta.',
        },
      ],
      productNote:
        'ClawAI está construido sobre esta idea: {cloudProviderCount} proveedores en la nube y modelos locales de pesos abiertos en un mismo espacio, con el modelo que respondió anotado en cada mensaje.',
    },
    [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]: {
      seo: {
        title: '¿Qué es la orquestación de LLM?',
        description:
          'La orquestación de LLM es la capa que decide qué modelo se ejecuta, en qué orden y qué pasa con el resultado. En qué se diferencia del prompting y de los agentes.',
        keywords: ['orquestación de LLM', 'orquestación de IA', 'pipeline de modelos'],
      },
      eyebrow: 'Fundamentos',
      title: '¿Qué es la orquestación de LLM?',
      summary:
        'La orquestación es todo lo que rodea a la llamada al modelo. Elegir cuál se ejecuta, decidir si basta con una llamada, pasar la salida de un paso al siguiente y decidir qué hacer cuando un paso falla. El prompt es una instrucción; la orquestación es el programa dentro del cual se ejecuta.',
      sections: [
        {
          id: 'not-prompting',
          heading: 'No es ingeniería de prompts',
          paragraphs: [
            'La ingeniería de prompts mejora una llamada concreta. La orquestación decide cuántas llamadas hay, qué modelos las hacen y cómo se combinan sus salidas. Puedes tener prompts excelentes y ninguna orquestación, y el resultado es un sistema que se cae en cuanto un proveedor tiene una mala hora.',
            'La distinción importa porque se optimizan de forma distinta. Un prompt mejor es barato y sube algo la calidad. Una orquestación mejor cuesta tokens y sube bastante la fiabilidad.',
          ],
        },
        {
          id: 'what-it-decides',
          heading: 'Qué decide una capa de orquestación',
          paragraphs: [
            'Qué modelo. Si preguntar a más de uno. Si comprobar la respuesta antes de devolverla. Qué hacer ante una negativa, un tiempo agotado o un límite de uso. Si la salida de este paso es la entrada del siguiente. Si todo el conjunto es asumible antes de empezar.',
            'Cada una de esas cosas es una política y cada una puede equivocarse por separado. Por eso merece la pena nombrar la orquestación como su propia capa en vez de repartir las decisiones por el código de la aplicación.',
          ],
        },
        {
          id: 'techniques',
          heading: 'Las técnicas habituales',
          paragraphs: [
            'El enrutado manda la petición a un modelo adecuado. El respaldo gestiona los fallos. El consenso pregunta a varios y mira el acuerdo. El mejor de N genera candidatas y se queda con una. Un juez puntúa respuestas. La verificación contrasta una afirmación con algo externo al modelo. Los pipelines encadenan pasos. La descomposición divide una petición grande en otras menores.',
            'ClawAI implementa nueve de ellas como modos de orquestación separados, más el juez y la comparación como superficies propias. Cada una tiene aquí una página que explica qué es antes de que decidas si la quieres.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Cuándo no orquestar',
          paragraphs: [
            'La orquestación multiplica coste y latencia. Un consenso a tres modelos cuesta unas tres veces los tokens y tarda lo que el más lento. Para una pregunta cuya respuesta compruebas de un vistazo, es un mal trato.',
            'La regla que aguanta: orquesta cuando equivocarse sale caro y comprobarlo es difícil. En el resto de casos, manda una petición a un modelo y lee la respuesta.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La orquestación es lo mismo que un framework de agentes?',
          answer:
            'Se solapan, pero no son lo mismo. Un agente decide su propio siguiente paso, normalmente con herramientas. La orquestación es la política que lo envuelve —qué modelo, cuántos, qué hacer si falla— y se aplica igual a un flujo sin ningún agente.',
        },
        {
          question: '¿Hace falta un framework para orquestar?',
          answer:
            'No. Reintentar con otro modelo ya es orquestación. Los frameworks ayudan cuando las políticas se multiplican lo bastante como para que estuvieras reimplementándolas en cada funcionalidad.',
        },
        {
          question: '¿Cuánto cuesta?',
          answer:
            'En tokens, más o menos en proporción a cuántas llamadas hace la política. Una llamada enrutada cuesta casi lo mismo que una sin enrutar; un consenso a tres modelos cuesta unas tres veces más. El coste es predecible, y eso lo convierte en una decisión de presupuesto y no en una apuesta.',
        },
      ],
      productNote:
        'ClawAI ejecuta {orchestrationLabCount} modos de orquestación junto al chat normal, y registra qué modelos usó cada ejecución, así que el coste de una técnica se ve en lugar de deducirse.',
    },
    [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]: {
      seo: {
        title: '¿Qué es el enrutado de modelos de IA?',
        description:
          'El enrutado manda cada petición a un modelo elegido por tarea, coste, privacidad o latencia en vez de usar uno para todo. Cómo deciden los enrutadores y cómo fallan.',
        keywords: ['enrutado de modelos de IA', 'router de LLM', 'selección de modelo'],
      },
      eyebrow: 'Enrutado',
      title: '¿Qué es el enrutado de modelos de IA?',
      summary:
        'Un enrutador mira la petición antes de ejecutarla y elige qué modelo debe responder. La idea es que el modelo adecuado cambia según la petición: una pregunta de una línea y una refactorización de mil no merecen el mismo modelo, y pagar precio de frontera por ambas no es algo que nadie elija a conciencia.',
      sections: [
        {
          id: 'how-decisions-are-made',
          heading: 'Sobre qué decide un enrutador',
          paragraphs: [
            'La mayoría combina unas pocas señales: qué tipo de tarea parece, cuánto ocupa la entrada, cuán sensibles son los datos, con qué rapidez hace falta la respuesta y cuánto se le permite costar.',
            'Esas señales chocan entre sí. El modelo más rápido rara vez es el más fuerte; la opción más privada rara vez es la más capaz. Un enrutador es en realidad una política sobre qué sacrificar, así que los útiles te dejan decir qué te importa en vez de adivinarlo.',
          ],
        },
        {
          id: 'automatic-vs-explicit',
          heading: 'Enrutado automático y explícito',
          paragraphs: [
            'El automático lee la petición y decide. Es cómodo y a veces se equivoca, y equivocarse es difícil de detectar si el sistema no te dice qué modelo respondió.',
            'El explícito significa que tú fijas la prioridad —esto que se quede en local, esto que salga barato, para esto usa el mejor razonamiento— y el enrutador la respeta. En la práctica casi todo el mundo quiere las dos: un valor por defecto sensato y poder anularlo para la petición que tiene delante.',
          ],
        },
        {
          id: 'failure-modes',
          heading: 'Cómo falla el enrutado',
          paragraphs: [
            'Los dos fallos habituales son las degradaciones silenciosas y las decisiones invisibles. Una degradación silenciosa es un enrutador que manda sin avisar tu petición cuidada a un modelo barato. Una decisión invisible es cualquier enrutado que no puedas auditar después.',
            'Ambos se arreglan igual: el sistema debe registrar qué modelo respondió realmente y enseñarlo. Un enrutador que no puedes inspeccionar es indistinguible de uno roto.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Cómo lo hace ClawAI',
          paragraphs: [
            'ClawAI tiene {routingModeCount} modos de enrutado. Auto lee la petición y elige. Manual fija un modelo. Solo local mantiene toda la cadena en modelos que corren en tu hardware. Privacidad primero prefiere lo local y se niega a salir de ahí en silencio. Los demás inclinan la elección hacia menos latencia, mejor razonamiento o menos coste.',
            'Cada respuesta registra el modelo que la produjo, así que una decisión automática se puede comprobar en lugar de confiar en ella.',
          ],
        },
      ],
      faq: [
        {
          question: '¿El enrutado empeora la calidad de las respuestas?',
          answer:
            'Puede, si la política no encaja con la petición. Por eso el modo lo eliges tú y por eso se muestra el modelo que respondió. Un enrutado que ves y puedes anular es un control de coste; uno que no ves es una degradación.',
        },
        {
          question: '¿Puede un enrutador mantener los datos fuera de la nube por completo?',
          answer:
            'Solo si se le permite negarse en vez de recurrir a otro sitio. Un modo «solo local» cuya cadena de respaldo llega a un proveedor en la nube no es un control de privacidad. El modo solo local de ClawAI mantiene su cadena en proveedores locales.',
        },
        {
          question: '¿Merece la pena el enrutado para una sola persona?',
          answer:
            'Normalmente sí, más por coste que por fiabilidad. Casi cualquier carga individual son sobre todo preguntas rutinarias con unas pocas difíciles; mandar las rutinarias a un modelo más barato es la palanca más grande sobre una factura personal de IA.',
        },
      ],
      productNote:
        'ClawAI incluye {routingModeCount} modos de enrutado y muestra el modelo elegido en cada mensaje, para que puedas comprobar el enrutador en vez de confiar en él.',
    },
    [LearnTopic.WHAT_IS_MODEL_FALLBACK]: {
      seo: {
        title: '¿Qué es el respaldo entre modelos?',
        description:
          'El respaldo es lo que pasa cuando el primer modelo falla: caído, limitado o negándose. Cómo funcionan las cadenas de respaldo y por qué el respaldo silencioso es peligroso.',
        keywords: ['respaldo de modelos', 'failover de LLM', 'fiabilidad de IA'],
      },
      eyebrow: 'Enrutado',
      title: '¿Qué es el respaldo entre modelos?',
      summary:
        'El respaldo es la respuesta a «qué pasa cuando el modelo que querías no está disponible». Los proveedores tienen caídas, límites de uso, negativas por contenido y tiempos agotados. Una cadena de respaldo es una lista ordenada de qué intentar después, y ese orden codifica qué estás dispuesto a ceder.',
      sections: [
        {
          id: 'why-needed',
          heading: 'Por qué no es opcional',
          paragraphs: [
            'Un flujo con un solo proveedor hereda exactamente su disponibilidad. Los límites de uso en particular no son sucesos raros: son la consecuencia normal de una hora con mucho tráfico, y un flujo sin respaldo simplemente se detiene.',
            'El respaldo convierte un fallo duro en una respuesta degradada. Que eso sea una mejora depende por completo de que te avisen de que ha pasado.',
          ],
        },
        {
          id: 'what-to-fall-back-to',
          heading: 'Elegir el orden',
          paragraphs: [
            'El orden intuitivo es «el siguiente mejor modelo», pero suele estar mal. Si la primera opción falló porque la petición era demasiado larga, un modelo más pequeño también fallará. Si se negó por motivos de contenido, otro parecido se negará igual.',
            'Un orden más útil cambia algo estructural: otro proveedor distinto, o un modelo local con otras reglas, en vez de un hermano que fallará por lo mismo.',
          ],
        },
        {
          id: 'silent-fallback',
          heading: 'La variante peligrosa',
          paragraphs: [
            'El respaldo silencioso es un sistema que responde discretamente con otro modelo y no te dice nada. Obtienes una respuesta peor, que atribuyes mentalmente al modelo que elegiste, y sacas una conclusión equivocada sobre ese modelo.',
            'Cuando el respaldo cruza una frontera de privacidad es peor que una conclusión equivocada. Pasar de un modelo local a un proveedor en la nube manda datos justo adonde el usuario decidió no mandarlos. Una cadena que puede abandonar la ejecución local debería ser una cadena que el usuario aceptó de forma explícita.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Cómo lo hace ClawAI',
          paragraphs: [
            'Los modos de enrutado definen sus propias cadenas, y el modo solo local mantiene la suya en proveedores locales en vez de buscar un modelo en la nube cuando el local está ocupado. Cada mensaje registra el modelo que respondió realmente, así que un respaldo se ve después en lugar de deducirse por un cambio de tono.',
          ],
        },
      ],
      faq: [
        {
          question: '¿El respaldo es lo mismo que un reintento?',
          answer:
            'Un reintento manda la misma petición al mismo modelo, lo que ayuda con un error pasajero. El respaldo cambia de modelo, lo que ayuda cuando el primero no puede atender la petición en absoluto. Los sistemas robustos hacen ambas cosas, en ese orden.',
        },
        {
          question: '¿Debería el respaldo pasar nunca de local a nube?',
          answer:
            'Solo si el usuario lo pidió. La ejecución local se elige normalmente por un motivo que un respaldo no puede respetar, así que lo seguro es fallar y decirlo en lugar de tener éxito en otro sitio.',
        },
        {
          question: '¿Cuántos modelos debería tener una cadena?',
          answer:
            'Dos o tres suelen bastar. Las cadenas largas sobre todo añaden latencia, porque cada intento fallido se paga en tiempo antes de que empiece el siguiente.',
        },
      ],
      productNote:
        'Los modos de enrutado de ClawAI llevan sus propias cadenas de respaldo, y el modo solo local mantiene la suya en local en vez de alcanzar en silencio un proveedor en la nube.',
    },
    [LearnTopic.WHAT_IS_AI_CONSENSUS]: {
      seo: {
        title: '¿Qué es el consenso entre modelos de IA?',
        description:
          'El consenso pregunta lo mismo a varios modelos y toma su acuerdo como señal. Qué indica y qué no indica ese acuerdo, y cuándo se justifica el coste.',
        keywords: ['consenso de IA', 'acuerdo entre modelos', 'ensemble de LLM'],
      },
      eyebrow: 'Orquestación',
      title: '¿Qué es el consenso entre modelos de IA?',
      summary:
        'El consenso pasa un prompt por varios modelos y compara las respuestas. Donde coinciden tienes una señal débil de que la respuesta no es un artefacto de un solo modelo. Donde discrepan tienes algo más útil: un aviso de que la pregunta era más difícil de lo que parecía.',
      sections: [
        {
          id: 'what-agreement-means',
          heading: 'Qué indica realmente el acuerdo',
          paragraphs: [
            'El acuerdo es evidencia, no prueba. Los modelos entrenados con datos que se solapan comparten sesgos y pueden equivocarse con aplomo en la misma dirección. Que tres modelos coincidan en un dato falso es un resultado habitual, no raro.',
            'La señal es más fuerte cuanto más distintos sean los modelos: distinto fabricante, distinto entrenamiento, distinto tamaño. Un consenso entre tres variantes de la misma familia no vale casi nada.',
          ],
        },
        {
          id: 'disagreement-is-the-value',
          heading: 'La discrepancia es la salida más útil',
          paragraphs: [
            'El valor práctico del consenso suele estar en el caso negativo. Cuando los modelos divergen has localizado una pregunta que necesita una persona, y localizarlas barato vale más que un aumento marginal de confianza en las preguntas que ya eran fáciles.',
            'Eso replantea cuándo usarlo. El consenso no es una mejora de calidad aplicada a todo; es una herramienta de triaje aplicada allí donde equivocarse sale caro.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'El coste',
          paragraphs: [
            'Ejecutar tres modelos cuesta unas tres veces los tokens y tarda lo que el más lento. En una pregunta rutinaria es puro derroche. En una cláusula contractual, un plan de migración o un resumen médico sobre el que vas a actuar, sale barato.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Cuándo no usarlo',
          paragraphs: [
            'No uses consenso para preguntas con respuesta comprobable. Si el código compila o no compila, ejecútalo: esa señal es más fuerte que tres modelos coincidiendo. El consenso es para preguntas de criterio donde no existe una comprobación externa barata.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuántos modelos necesito?',
          answer:
            'Tres es lo habitual, porque dos solo pueden coincidir o discrepar mientras que tres te enseñan la forma de la discrepancia. Más de tres rara vez cambia la decisión y multiplica la factura.',
        },
        {
          question: '¿El consenso evita las alucinaciones?',
          answer:
            'No. Detecta las alucinaciones propias de un modelo y se le escapan las que varios comparten. Es un filtro, no una garantía.',
        },
        {
          question: '¿Es lo mismo que el mejor de N?',
          answer:
            'No. El consenso compara respuestas de modelos distintos para ver si coinciden. El mejor de N genera varias candidatas y elige una. El consenso mide acuerdo; el mejor de N selecciona calidad.',
        },
      ],
      productNote:
        'El consenso es uno de los {orchestrationLabCount} modos de orquestación de ClawAI, y cada ejecución registra todos los modelos que usó y lo que costó.',
    },
    [LearnTopic.WHAT_IS_BEST_OF_N]: {
      seo: {
        title: '¿Qué es el muestreo mejor de N?',
        description:
          'El mejor de N genera varias respuestas candidatas y se queda con la mejor. Cómo se eligen, por qué el selector importa más que N y cuándo gana a un buen prompt.',
        keywords: ['mejor de N', 'muestreo de candidatas', 'selección de respuestas'],
      },
      eyebrow: 'Orquestación',
      title: '¿Qué es el mejor de N?',
      summary:
        'El mejor de N pide varias respuestas al mismo prompt y se queda con una. Aprovecha que la salida del modelo varía entre ejecuciones: un modelo que acierta siete de cada diez veces producirá, con tres intentos, al menos una respuesta buena. La técnica vive o muere según cómo elijas la ganadora.',
      sections: [
        {
          id: 'why-it-works',
          heading: 'Por qué funciona',
          paragraphs: [
            'La salida de un modelo de lenguaje se muestrea, no es determinista. Dos ejecuciones del mismo prompt dan respuestas distintas y de calidad variable. Si las buenas superan a las malas, tomar varias muestras aumenta la probabilidad de que al menos una lo sea.',
            'Ese es todo el mecanismo. No hace al modelo más listo; te da más oportunidades sobre la capacidad que ya tiene.',
          ],
        },
        {
          id: 'the-selector',
          heading: 'Elegir la ganadora es lo difícil',
          paragraphs: [
            'Generar candidatas es fácil. Elegir entre ellas es el problema real, y ahí está casi todo el valor de la técnica y casi todo su fallo.',
            'La selección por comprobación automática —compila, pasa los tests, cumple el esquema— es con diferencia la más fiable, porque la comprobación es independiente del modelo. La selección por otro modelo es un juez, con todas las salvedades de esa página. La selección por una persona es la más exacta y la menos escalable.',
          ],
        },
        {
          id: 'choosing-n',
          heading: 'Elegir N',
          paragraphs: [
            'Los rendimientos caen deprisa. Pasar de una candidata a tres es una mejora grande; de tres a diez es pequeña y cuesta más del triple. Casi todos los usos prácticos se quedan entre tres y cinco.',
            'N multiplica el coste exactamente. Cinco candidatas son cinco veces los tokens de generación, más lo que cueste la selección.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Cuándo no usarlo',
          paragraphs: [
            'Si no tienes forma de distinguir una respuesta buena de una mala, el mejor de N no puede ayudarte: elegirás al azar de un montón mayor y pagarás más por ello. Su sitio natural es el trabajo con comprobación objetiva: código, salida estructurada, cualquier cosa que se analice o no.',
          ],
        },
      ],
      faq: [
        {
          question: '¿El mejor de N es lo mismo que subir la temperatura?',
          answer:
            'No, aunque interactúan. La temperatura controla cuánto varía cada respuesta. El mejor de N va de cuántas tomas y cómo eliges. Algo de variedad ayuda, porque candidatas idénticas no te dan nada entre lo que elegir.',
        },
        {
          question: '¿Puedo usar modelos distintos para las candidatas?',
          answer:
            'Sí, y suele ayudar: los modelos fallan de forma distinta, así que el conjunto es más variado que varias muestras de uno. En ese punto estás cerca del consenso, con selección en lugar de acuerdo.',
        },
        {
          question: '¿Ayuda con la exactitud factual?',
          answer:
            'Solo si tu selector detecta errores factuales. Sin una comprobación externa estás eligiendo entre respuestas seguras de sí mismas, y la seguridad no es exactitud.',
        },
      ],
      productNote:
        'El mejor de N es uno de los {orchestrationLabCount} modos de orquestación de ClawAI, y cada candidata que genera queda registrada frente al coste de la ejecución.',
    },
    [LearnTopic.WHAT_IS_AN_AI_JUDGE]: {
      seo: {
        title: '¿Qué es un juez de IA?',
        description:
          'Un juez de IA es un modelo que puntúa las respuestas de otros modelos. Para qué se usa, qué sesgos arrastra y por qué no sustituye a una comprobación real.',
        keywords: ['juez de IA', 'LLM como juez', 'puntuación de respuestas'],
      },
      eyebrow: 'Orquestación',
      title: '¿Qué es un juez de IA?',
      summary:
        'Un juez es un modelo con otro trabajo: en vez de responder la pregunta, lee respuestas y las valora. Es como se hace casi toda la selección automática entre candidatas, y arrastra un conjunto de sesgos bien documentados y fáciles de olvidar.',
      sections: [
        {
          id: 'what-it-does',
          heading: 'Qué hace un juez',
          paragraphs: [
            'Un juez recibe la pregunta original y dos o más respuestas, y devuelve un orden o una puntuación, normalmente con un motivo. Es el paso de selección del mejor de N y el de arbitraje cuando los modelos discrepan.',
            'El atractivo es evidente: escala como la revisión humana no puede, y es mucho más barato que la persona a la que sustituye.',
          ],
        },
        {
          id: 'the-biases',
          heading: 'Los sesgos, que son consistentes',
          paragraphs: [
            'Los jueces prefieren respuestas largas a cortas, aunque la corta esté completa. Prefieren la redacción segura a la matizada, esté o no justificada esa seguridad. Son sensibles al orden en que se presentan las candidatas. Y un modelo al que se pide juzgar su propia salida tiende a preferirla.',
            'Ninguno es sutil y todos son manejables: baraja el orden, usa un modelo distinto como juez y como autor, y pide criterios concretos en vez de una preferencia general. Pero hay que gestionarlos a propósito, porque la configuración por defecto exhibe los cuatro.',
          ],
        },
        {
          id: 'not-a-check',
          heading: 'Un juez no es un verificador',
          paragraphs: [
            'Un juez compara respuestas entre sí. No las compara con la realidad. Dadas tres respuestas erróneas las ordenará con aplomo, y la ganadora seguirá siendo errónea.',
            'Donde exista una comprobación externa —tests, un esquema, una búsqueda— esa comprobación gana al juez, porque es independiente de lo que se juzga. Un juez es lo que usas cuando no hay tal comprobación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿El juez debería ser el modelo más potente?',
          answer:
            'Normalmente uno potente, y preferiblemente distinto del que escribió las candidatas. La autopreferencia existe y la solución más barata es usar otro modelo.',
        },
        {
          question: '¿Puede un juez puntuar una sola respuesta?',
          answer:
            'Puede, pero el juicio comparativo es más fiable que la puntuación absoluta. Los modelos se dan mejor con «cuál de estas es mejor» que con «esto es un 7 o un 8».',
        },
        {
          question: '¿Cómo sé que el juez acierta?',
          answer:
            'Contrástalo con tu propio criterio sobre una muestra. Si nunca lo compruebas, has desplazado la confianza en vez de ganártela.',
        },
      ],
      productNote:
        'ClawAI ejecuta el juicio como superficie propia sobre una comparación, así que una respuesta puntuada registra tanto los modelos que escribieron las candidatas como el que las juzgó.',
    },
    [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]: {
      seo: {
        title: '¿Qué es la verificación de respuestas de IA?',
        description:
          'Verificar es contrastar una respuesta con algo distinto del modelo que la generó. Por qué la independencia lo es todo y cuánto vale realmente una autocomprobación.',
        keywords: ['verificación de IA', 'comprobar respuestas', 'exactitud de LLM'],
      },
      eyebrow: 'Orquestación',
      title: '¿Qué es la verificación de respuestas de IA?',
      summary:
        'Verificar es contrastar una respuesta generada con una fuente que no es el generador. La palabra clave es independiente: un modelo que revisa su propia respuesta comparte el razonamiento que produjo el error, y por eso las autocomprobaciones detectan mucho menos de lo que la gente espera.',
      sections: [
        {
          id: 'independence',
          heading: 'La independencia es toda la idea',
          paragraphs: [
            'Si un modelo se inventa un dato por algo de su entrenamiento, preguntarle si ese dato es cierto consulta la misma fuente que lo inventó. La comprobación y el error tienen una causa común, así que la comprobación pasa.',
            'Un verificador útil cambia algo. Otro modelo, una búsqueda contra documentos reales, un compilador, una batería de tests, un validador de esquema. Cuanto más distinto sea el verificador del generador, más puede detectar.',
          ],
        },
        {
          id: 'kinds',
          heading: 'Tipos de verificación, de más débil a más fuerte',
          paragraphs: [
            'Autorrevisión: el modelo relee su respuesta. Barata, y detecta sobre todo formato y contradicciones internas. Revisión cruzada: otro modelo comprueba. Mejor, y detecta errores propios del primero. Recuperación: la afirmación se contrasta con documentos recuperados. Fuerte para afirmaciones factuales. Ejecución: el código corre, el esquema valida, los tests pasan. La más fuerte, y solo disponible donde la respuesta es ejecutable.',
            'El patrón es que la fuerza sigue a la independencia respecto al modelo, y la disponibilidad va al revés: las comprobaciones más fuertes solo existen para ciertos tipos de trabajo.',
          ],
        },
        {
          id: 'repair',
          heading: 'Verificación y reparación',
          paragraphs: [
            'Un verificador que solo informa del problema te deja donde estabas. En la práctica la verificación se empareja con la reparación: el fallo y su motivo vuelven a un modelo, que produce una respuesta corregida, que se vuelve a comprobar.',
            'Ese bucle necesita un límite. Sin él, un modelo incapaz de arreglar el problema seguirá produciendo variaciones de la misma respuesta equivocada a precio completo.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Sirve de algo pedirle al modelo que se revise?',
          answer:
            'Un poco, y sobre todo para incoherencias internas más que para errores factuales. Es la forma más débil de verificación y la más fácil de sobrevalorar.',
        },
        {
          question: '¿La verificación por recuperación es lo mismo que RAG?',
          answer:
            'Usan la misma maquinaria en direcciones opuestas. RAG recupera antes de generar, para informar la respuesta. La verificación por recuperación recupera después, para comprobarla.',
        },
        {
          question: '¿Cuántos intentos de reparación son razonables?',
          answer:
            'Uno o dos. Si un modelo no lo ha arreglado en el segundo, los siguientes suelen ser reformulaciones del mismo error y debería mirarlo una persona.',
        },
      ],
      productNote:
        'La verificación y la reparación son dos de los {orchestrationLabCount} modos de orquestación de ClawAI, y ambas se miden por intento, así que un bucle de reparación no puede generar una factura invisible.',
    },
    [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]: {
      seo: {
        title: '¿Qué es una ventana de contexto?',
        description:
          'La ventana de contexto es cuánto texto puede considerar un modelo en una petición. Por qué no es memoria, por qué llenarla degrada la calidad y cómo dispara el coste.',
        keywords: ['ventana de contexto', 'tokens de LLM', 'contexto largo'],
      },
      eyebrow: 'Contexto',
      title: '¿Qué es una ventana de contexto?',
      summary:
        'La ventana de contexto es todo el texto que un modelo puede sostener en una sola petición: tu prompt, la conversación hasta ese punto, los documentos que adjuntaste y la respuesta que se está escribiendo. Se mide en tokens y se reinicia por completo entre peticiones.',
      sections: [
        {
          id: 'not-memory',
          heading: 'No es memoria',
          paragraphs: [
            'Un modelo no recuerda tu conversación anterior. Lo que crea la ilusión de memoria es que la aplicación reenvía los mensajes previos con cada nueva petición. La ventana es espacio de trabajo para una llamada, no almacenamiento.',
            'Esto tiene una consecuencia directa que la gente descubre por sorpresa: una conversación larga se encarece con cada mensaje, porque todo el historial se reenvía y se vuelve a cobrar cada vez.',
          ],
        },
        {
          id: 'filling-it',
          heading: 'Una ventana llena no es una ventana bien usada',
          paragraphs: [
            'Una ventana grande es un margen, no un objetivo. Los modelos atienden de forma desigual a lo largo de un contexto extenso: lo que está en mitad de una entrada muy larga tiene más papeletas de recibir poca atención que lo que está en los extremos.',
            'En la práctica, diez páginas enfocadas suelen ganar a doscientas dispersas. La recuperación existe justamente para elegir esas diez páginas en vez de mandarlo todo y confiar.',
          ],
        },
        {
          id: 'cost',
          heading: 'Cómo dispara el coste',
          paragraphs: [
            'Casi todos los proveedores facturan por token, entrada y salida por separado, y la entrada suele ser más barata. Un documento grande adjunto a cada mensaje de una conversación larga se cobra en cada mensaje, no una vez.',
            'Es la causa más frecuente de una factura sorprendente, y la solución es estructural: adjunta lo que la pregunta necesita en vez de todo lo que podría venir al caso.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Una ventana más grande es siempre mejor?',
          answer:
            'Quita un límite, lo cual está bien, pero no mejora cómo usa el modelo lo que recibe. Una ventana mayor sobre todo te compra la posibilidad de cometer un error más caro.',
        },
        {
          question: '¿Qué es un token?',
          answer:
            'Aproximadamente un fragmento de palabra. En inglés salen unas tres cuartas partes de palabra por token, así que mil tokens son unas setecientas cincuenta palabras. Varía mucho por idioma, y los alfabetos no latinos suelen gastar más tokens por palabra.',
        },
        {
          question: '¿Qué pasa si la supero?',
          answer:
            'La petición falla, o la aplicación descarta en silencio los mensajes más antiguos. Lo segundo es más frecuente y más confuso, porque el modelo parece olvidar algo que dijiste.',
        },
      ],
      productNote:
        'ClawAI registra los tokens que consumió cada mensaje, así que una conversación que se está encareciendo se ve antes de la factura y no después.',
    },
    [LearnTopic.WHAT_IS_RAG]: {
      seo: {
        title: '¿Qué es RAG (generación aumentada por recuperación)?',
        description:
          'RAG recupera fragmentos relevantes de tus documentos y los pone delante del modelo. Cómo el troceado y la calidad de la recuperación deciden si funciona.',
        keywords: ['RAG', 'generación aumentada por recuperación', 'IA sobre documentos'],
      },
      eyebrow: 'Contexto',
      title: '¿Qué es la generación aumentada por recuperación?',
      summary:
        'RAG consiste en buscar en tus propios documentos los fragmentos relevantes para una pregunta e incluirlos en la petición. El modelo responde a partir de material que tú aportaste y no de su memoria, y eso es lo que le permite hablar de documentos con los que nunca se entrenó.',
      sections: [
        {
          id: 'how-it-works',
          heading: 'Cómo funciona',
          paragraphs: [
            'Los documentos se trocean y cada fragmento se convierte en un vector, una representación numérica de su significado. La pregunta se convierte igual, y se recuperan los fragmentos cuyos vectores estén más cerca.',
            'Esos fragmentos se insertan en el prompt, normalmente con la instrucción de responder a partir de ellos. El modelo pone el lenguaje; la recuperación pone el conocimiento.',
          ],
        },
        {
          id: 'retrieval-quality',
          heading: 'La calidad de la recuperación es todo el sistema',
          paragraphs: [
            'Si el fragmento correcto no se recupera, ningún modelo salva la respuesta: contestará desde su conocimiento general y sonará igual de seguro. Casi todos los sistemas RAG decepcionantes son problemas de recuperación disfrazados de generación.',
            'El troceado es donde se decide. Fragmentos demasiado pequeños pierden el contexto que los hacía significativos; demasiado grandes y cada uno diluye la coincidencia. Trocear por la estructura del documento —secciones, encabezados— suele ganar a trocear por longitud fija.',
          ],
        },
        {
          id: 'what-it-fixes',
          heading: 'Qué arregla y qué no',
          paragraphs: [
            'RAG arregla «el modelo nunca ha visto mis documentos». Reduce las alucinaciones en preguntas que los documentos responden, porque la respuesta está delante del modelo.',
            'No arregla el razonamiento, y no impide que el modelo conteste de memoria cuando la recuperación no devuelve nada útil. El anclaje es una tendencia fuerte, no una garantía, y el modo de fallo es una respuesta segura sin fuente.',
          ],
        },
      ],
      faq: [
        {
          question: '¿RAG es lo mismo que el ajuste fino?',
          answer:
            'No, y resuelven problemas distintos. El ajuste fino cambia cómo se comporta un modelo; RAG cambia lo que sabe para una petición. Para «responde preguntas sobre mis documentos», RAG es casi siempre la herramienta correcta y mucho más barata de mantener al día.',
        },
        {
          question: '¿Las ventanas de contexto grandes dejan RAG obsoleto?',
          answer:
            'No. Puedes pegar más, pero pagas cada token en cada mensaje y los modelos atienden de forma desigual a entradas muy largas. La recuperación es además el único enfoque que escala más allá de lo que cabe en cualquier ventana.',
        },
        {
          question: '¿RAG manda mis documentos al proveedor del modelo?',
          answer:
            'Los fragmentos recuperados sí, porque así es como el modelo los ve. Si eso es inaceptable, el modelo tiene que ejecutarse en un sitio que controles, y para eso está la ejecución local.',
        },
      ],
      productNote:
        'ClawAI recupera de los archivos que adjuntas, y lo combina con ejecución local para que los fragmentos recuperados puedan quedarse en tu propio hardware.',
    },
    [LearnTopic.WHAT_IS_AI_MEMORY]: {
      seo: {
        title: '¿Qué es la memoria en un asistente de IA?',
        description:
          'La memoria es lo que un asistente conserva entre conversaciones. En qué se diferencia de la ventana de contexto, qué cuesta en tokens y qué pregunta de privacidad plantea.',
        keywords: ['memoria de IA', 'contexto persistente', 'memoria del asistente'],
      },
      eyebrow: 'Contexto',
      title: '¿Qué es la memoria en un asistente de IA?',
      summary:
        'La memoria es la aplicación guardando datos sobre ti y reintroduciéndolos en conversaciones posteriores. El modelo en sí no recuerda nada entre peticiones; la memoria es una funcionalidad construida a su alrededor, con un coste y una forma de privacidad que conviene entender antes de activarla.',
      sections: [
        {
          id: 'mechanism',
          heading: 'Cómo funciona en realidad',
          paragraphs: [
            'La aplicación decide que algo merece conservarse —una preferencia, un dato, una instrucción permanente— y lo anota. En una conversación posterior selecciona las entradas relevantes y las añade a la petición antes de que el modelo la vea.',
            'Así que la memoria es recuperación sobre un almacén de datos tuyos, no algo que ocurra dentro del modelo. Lo que significa que solo es tan buena como las decisiones sobre qué guardar y qué reintroducir.',
          ],
        },
        {
          id: 'cost',
          heading: 'No es gratis',
          paragraphs: [
            'Cada dato recordado que se reintroduce en una conversación son tokens de entrada, cobrados en cada mensaje que los lleva. Una memoria grande inyectada sin criterio es un impuesto permanente sobre todas tus conversaciones.',
            'Las buenas implementaciones son selectivas: traen lo relevante para esta conversación en lugar de todo lo que saben.',
          ],
        },
        {
          id: 'privacy',
          heading: 'La cuestión de la privacidad',
          paragraphs: [
            'La memoria implica un almacén duradero de datos personales, que es una propuesta de privacidad distinta de una conversación que puedes borrar. Las preguntas que valen la pena son dónde se guarda, si puedes leerla entera, si puedes borrar entradas concretas y si se manda al proveedor del modelo al reintroducirse.',
            'La última es la que se pasa por alto. Un dato recordado que se inyecta en un prompt va adonde vaya ese prompt.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La memoria entrena al modelo con mis datos?',
          answer:
            'Por sí sola no. La memoria pone texto en un prompt; el entrenamiento cambia los pesos del modelo. Si un proveedor entrena con los prompts es otra cuestión y depende de sus términos.',
        },
        {
          question: '¿Por qué el asistente recuerda algo mal?',
          answer:
            'Porque anotó algo que fue cierto una vez, o interpretó un comentario de paso como una preferencia permanente. Poder leer y editar el almacén directamente es el único arreglo real.',
        },
        {
          question: '¿La memoria es lo mismo que una conversación larga?',
          answer:
            'No. Una conversación larga lo guarda todo y paga por todo en cada mensaje. La memoria guarda datos seleccionados y sobrevive al final de la conversación.',
        },
      ],
      productNote:
        'La memoria en ClawAI es un conjunto de entradas guardadas e inspeccionables, no un perfil opaco, y puede combinarse con ejecución local para que lo recordado se quede en hardware que controlas.',
    },
    [LearnTopic.WHAT_ARE_CONTEXT_PACKS]: {
      seo: {
        title: '¿Qué son los paquetes de contexto?',
        description:
          'Los paquetes de contexto son conjuntos reutilizables que adjuntas a una conversación a propósito. En qué se diferencian de la memoria y de RAG, y cuándo ganan.',
        keywords: ['paquetes de contexto', 'contexto reutilizable', 'contexto de prompt'],
      },
      eyebrow: 'Contexto',
      title: '¿Qué son los paquetes de contexto?',
      summary:
        'Un paquete de contexto es un conjunto con nombre y reutilizable de material —instrucciones, texto de referencia, archivos, enlaces— que adjuntas a una conversación a propósito. Está entre la memoria, que el sistema elige por ti, y un adjunto puntual, que rehaces cada vez.',
      sections: [
        {
          id: 'the-gap',
          heading: 'El hueco que llenan',
          paragraphs: [
            'La memoria es automática: el sistema decide qué guardar y cuándo reintroducirlo, lo cual es cómodo e impreciso. Un adjunto puntual es preciso y desechable: la semana que viene vuelves a reunir los mismos cinco documentos.',
            'Un paquete es el punto medio: se monta una vez, a conciencia, y se aplica cuando tú decides. Tus estándares de código, la terminología de tu producto, las restricciones que un trabajo debe respetar.',
          ],
        },
        {
          id: 'what-goes-in',
          heading: 'Qué debe ir dentro',
          paragraphs: [
            'Material estable que si no tendrías que volver a explicar: estilo de la casa, vocabulario del dominio, restricciones permanentes, la forma de salida que siempre quieres.',
            'Lo que no debe ir es cualquier cosa que cambie con cada pregunta. Un paquete que editas cada vez que lo usas es un prompt con pasos de más.',
          ],
        },
        {
          id: 'cost-and-discipline',
          heading: 'Coste y disciplina',
          paragraphs: [
            'Un paquete son tokens de entrada en cada mensaje al que se adjunta, así que uno grande aplicado a todo es el problema del coste de la ventana de contexto con otra forma. Varios paquetes pequeños y específicos ganan a uno grande y general.',
            'Como un paquete es explícito, también es revisable: puedes leer exactamente qué se está enviando, cosa que no ocurre con una memoria que se monta sola.',
          ],
        },
      ],
      faq: [
        {
          question: '¿En qué se diferencia de un prompt de sistema?',
          answer:
            'Un prompt de sistema suele ser un bloque de instrucciones fijado una vez. Un paquete es un conjunto con nombre que adjuntas y quitas por conversación, y puede llevar archivos y referencias además de instrucciones.',
        },
        {
          question: '¿Puedo usar varios a la vez?',
          answer:
            'Sí, y componer paquetes pequeños es justamente la idea: un paquete de idioma más uno de estilo de la casa, en lugar de un bloque por proyecto.',
        },
        {
          question: '¿Los paquetes sustituyen a RAG?',
          answer:
            'No. Un paquete se cura a mano y se incluye siempre; la recuperación selecciona de un corpus grande según la pregunta. Los paquetes encajan con material estable; la recuperación, con material demasiado grande para adjuntarlo.',
        },
      ],
      productNote:
        'Los paquetes de contexto de ClawAI son conjuntos reutilizables que adjuntas por conversación, así que lo que recibe el modelo es algo que montaste tú y no algo deducido sobre ti.',
    },
    [LearnTopic.WHAT_IS_LOCAL_AI]: {
      seo: {
        title: '¿Qué es la IA local?',
        description:
          'La IA local ejecuta un modelo en hardware que controlas. Qué cambia en privacidad y coste, qué exige en hardware y dónde compite de verdad.',
        keywords: ['IA local', 'IA on-premise', 'IA privada'],
      },
      eyebrow: 'Local y privado',
      title: '¿Qué es la IA local?',
      summary:
        'La IA local significa que el modelo corre en una máquina que controlas —tu portátil, tu servidor, tu rack— y no como una llamada a la API de otro. El prompt no sale del hardware, lo que cambia por completo la cuestión de la privacidad y cambia la del coste de una forma que suele malinterpretarse.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Qué cambia',
          paragraphs: [
            'Los datos son el motivo de verdad. Un prompt enviado a un modelo alojado lo procesa ese proveedor bajo sus términos. Un prompt a un modelo local no se manda a ninguna parte, que es la única versión de esa garantía que no depende de la política de un tercero.',
            'También elimina la facturación por token, los límites de uso y la posibilidad de que retiren un modelo bajo tus pies. Un modelo que has descargado sigue funcionando.',
          ],
        },
        {
          id: 'the-cost-shape',
          heading: 'La forma del coste, no el coste',
          paragraphs: [
            'La IA local no es automáticamente más barata. Convierte un coste variable en uno fijo: compras o alquilas hardware y a partir de ahí la inferencia es casi gratis al margen.',
            'Es un buen trato con volumen alto y sostenido y un mal trato para uso ocasional. Una GPU parada la mayor parte del día sale más cara que las llamadas de API que sustituyó.',
          ],
        },
        {
          id: 'the-honest-limits',
          heading: 'Los límites honestos',
          paragraphs: [
            'Los modelos que corren con holgura en una sola máquina no suelen ser los mayores disponibles. En las tareas de razonamiento más duras la distancia con un modelo de frontera alojado es real.',
            'Para muchísimo trabajo cotidiano —resumir, redactar, extraer, clasificar, código rutinario— la distancia es mucho menor de lo que se supone, y las propiedades de privacidad y coste suelen importar más que el último incremento de capacidad.',
          ],
        },
        {
          id: 'hybrid',
          heading: 'Su mejor forma es híbrida',
          paragraphs: [
            'El patrón habitual no es solo local ni solo nube. Es local para lo sensible o de mucho volumen, alojado para las preguntas más duras, y una política que decide cuál es cuál, que es exactamente para lo que sirve un enrutador.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué hardware necesito?',
          answer:
            'Depende por completo del tamaño del modelo y de la cuantización, y quien te dé una cifra única está adivinando. La restricción dominante es la memoria disponible: los pesos tienen que caber, y lo que cabe determina lo que puedes ejecutar.',
        },
        {
          question: '¿La IA local es privada por definición?',
          answer:
            'La llamada al modelo sí. El resto de la aplicación puede no serlo: búsqueda, telemetría y otras integraciones siguen pudiendo salir fuera. La privacidad es una propiedad del sistema entero, no de un componente.',
        },
        {
          question: '¿Los modelos locales pueden usar mis documentos?',
          answer:
            'Sí. La recuperación funciona igual, y cuando tanto la recuperación como el modelo son locales los documentos no salen de tu hardware en ningún momento.',
        },
      ],
      productNote:
        'ClawAI ejecuta modelos locales mediante Ollama y llama.cpp, y su modo de enrutado solo local mantiene toda la cadena de respaldo en proveedores locales en vez de buscar un modelo en la nube.',
    },
    [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]: {
      seo: {
        title: '¿Qué son los modelos de pesos abiertos?',
        description:
          'Los modelos de pesos abiertos publican sus parámetros entrenados para que puedas ejecutarlos. Qué cubre «abierto», qué no, y por qué las licencias difieren tanto.',
        keywords: ['modelos de pesos abiertos', 'LLM de código abierto', 'modelos descargables'],
      },
      eyebrow: 'Local y privado',
      title: '¿Qué son los modelos de pesos abiertos?',
      summary:
        'Un modelo de pesos abiertos es aquel cuyos parámetros entrenados se publican, de modo que puedes descargarlo y ejecutarlo en tu propio hardware. Es un término preciso y deliberadamente más estrecho que «código abierto»: que los pesos estén disponibles no dice nada sobre los datos de entrenamiento, el código ni lo que permite la licencia.',
      sections: [
        {
          id: 'what-open-covers',
          heading: 'Qué cubre aquí «abierto»',
          paragraphs: [
            'Pesos abiertos significa que los números que constituyen el modelo entrenado son descargables. Eso basta para ejecutarlo, ajustarlo, inspeccionarlo y mantenerlo funcionando pase lo que pase con quien lo publicó.',
            'Normalmente no incluye los datos de entrenamiento y a menudo tampoco el código de entrenamiento. Así que un modelo de pesos abiertos es reproducible en el sentido de que puedes ejecutarlo, no en el de que pudieras reconstruirlo.',
          ],
        },
        {
          id: 'licences',
          heading: 'Las licencias difieren de verdad',
          paragraphs: [
            'Algunos modelos de pesos abiertos llevan licencias permisivas corrientes. Otros llevan condiciones: restricciones de uso comercial por encima de cierto umbral, prohibiciones sobre aplicaciones concretas o requisitos de atribución y sobre modelos derivados.',
            'Esto importa comercialmente y es fácil de saltarse. «Podemos descargarlo» y «podemos usarlo en nuestro producto» son preguntas distintas, y solo la licencia responde la segunda.',
          ],
        },
        {
          id: 'why-they-matter',
          heading: 'Por qué importan',
          paragraphs: [
            'Son los únicos modelos que puedes ejecutar íntegramente en tu propio hardware, lo que los convierte en la base de todo despliegue local y privado. Tampoco te los pueden retirar bajo los pies: un modelo descargado funciona mientras lo conserves.',
            'La distancia de capacidad con los mejores modelos alojados es real y se ha estrechado bastante. Para buena parte del trabajo cotidiano ya no es el factor decisivo.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Pesos abiertos es lo mismo que código abierto?',
          answer:
            'No. El código abierto implica el código fuente y la libertad de usarlo y modificarlo. Pesos abiertos significa que los parámetros están publicados, bajo la licencia que eligiera quien los publicó, que a veces es restrictiva.',
        },
        {
          question: '¿Puedo ajustar un modelo de pesos abiertos?',
          answer:
            'Técnicamente sí, es una de las razones principales para querer los pesos. Si puedes hacerlo, y qué puedes hacer con el resultado, es una cuestión de licencia que varía por modelo.',
        },
        {
          question: '¿Se pueden usar comercialmente sin riesgo?',
          answer:
            'Muchos sí; algunos no sin condiciones. Lee la licencia concreta del modelo concreto: es lo único de esta área que de verdad no se puede generalizar.',
        },
      ],
      productNote:
        'ClawAI ejecuta modelos de pesos abiertos mediante Ollama y llama.cpp en tu propio hardware, junto a {cloudProviderCount} proveedores en la nube, con el enrutado decidiendo qué atiende cada cosa.',
    },
    [LearnTopic.WHAT_IS_SELF_HOSTED_AI]: {
      seo: {
        title: '¿Qué es la IA autoalojada?',
        description:
          'La IA autoalojada significa ejecutar toda la aplicación, no solo el modelo. Qué abarca, qué exige en operación y en qué se diferencia de los modelos locales.',
        keywords: ['IA autoalojada', 'plataforma de IA on-premise', 'despliegue privado'],
      },
      eyebrow: 'Local y privado',
      title: '¿Qué es la IA autoalojada?',
      summary:
        'Autoalojar significa que la aplicación corre en infraestructura que controlas —la interfaz, las bases de datos, las colas, la orquestación— y no solo el modelo. Es un compromiso mayor que ejecutar un modelo local y responde a otra pregunta: no solo «dónde ocurre la inferencia» sino «quién custodia los datos en reposo».',
      sections: [
        {
          id: 'more-than-the-model',
          heading: 'Es más que el modelo',
          paragraphs: [
            'Ejecutar un modelo local deja igualmente las conversaciones, los archivos, la memoria y los datos de cuenta en la aplicación que usaste. Autoalojar traslada todo eso a tu propia infraestructura.',
            'La distinción importa para cualquiera cuyas obligaciones sean sobre datos almacenados y no sobre inferencia. Dónde corre el modelo y dónde vive el historial son preguntas separadas, y solo el autoalojamiento responde la segunda.',
          ],
        },
        {
          id: 'what-it-costs-you',
          heading: 'Lo que cuesta en operación',
          paragraphs: [
            'Asumes actualizaciones, copias de seguridad, monitorización, TLS y la depuración cuando algo se rompe a una hora inoportuna. Es un coste real y continuo, medido en atención más que en dinero.',
            'Compensa cuando los datos realmente no pueden estar en otro sitio, o cuando necesitas que el despliegue sobreviva a cualquier relación con un proveedor. No compensa como precaución genérica.',
          ],
        },
        {
          id: 'hybrid-is-normal',
          heading: 'Autoalojado no significa desconectado',
          paragraphs: [
            'Un despliegue autoalojado puede seguir llamando a modelos alojados. Muchos lo hacen: la plataforma y sus datos son tuyos, y se usan proveedores en la nube donde su capacidad justifica que los datos salgan.',
            'La combinación que elimina por completo el procesamiento externo es autoalojamiento más modelos locales, y es una configuración deliberada, no el valor por defecto.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Autoalojar es lo mismo que IA local?',
          answer:
            'No. La IA local va de dónde corre el modelo. El autoalojamiento va de dónde viven la aplicación y sus datos. Puedes tener una sin la otra, y la posición de privacidad más fuerte necesita ambas.',
        },
        {
          question: '¿Autoalojar nos hace cumplidores?',
          answer:
            'No. Puede ser una pieza de un relato de cumplimiento, pero el cumplimiento va de contratos, controles, evidencias y auditorías. Dónde corre el software es una variable entre muchas.',
        },
        {
          question: '¿Qué hace falta para ejecutarlo?',
          answer:
            'En casi todas las plataformas, contenedores, una base de datos y dónde ejecutarlos, más una persona que se haga cargo de las actualizaciones. Lo último es lo que más se subestima.',
        },
      ],
      productNote:
        'ClawAI corre en tu propia infraestructura —la pila completa, no un plan alojado con opción local— y su código está disponible para revisión técnica.',
    },
    [LearnTopic.OLLAMA_VS_LLAMACPP]: {
      seo: {
        title: 'Ollama frente a llama.cpp: cuál usar',
        description:
          'Ollama y llama.cpp ejecutan modelos de pesos abiertos en local. Cómo se relacionan, para qué sirve cada uno y por qué usar ambos es lo normal.',
        keywords: [
          'Ollama frente a llama.cpp',
          'runtime de modelos locales',
          'ejecutar LLM en local',
        ],
      },
      eyebrow: 'Local y privado',
      title: 'Ollama frente a llama.cpp',
      summary:
        'No son realmente competidores. llama.cpp es el motor de inferencia que hizo práctico ejecutar modelos de lenguaje en hardware corriente; Ollama es un gestor de modelos y un servidor construido sobre esa estirpe. La pregunta no suele ser cuál elegir, sino en qué capa quieres trabajar.',
      sections: [
        {
          id: 'what-each-is',
          heading: 'Qué es cada uno',
          paragraphs: [
            'llama.cpp es un motor de inferencia en C++. Ejecuta modelos cuantizados de forma eficiente en CPU y GPU, y expone control fino sobre cómo se carga y se ejecuta un modelo. Es la capa baja, y buena parte del ecosistema de IA local está construida encima.',
            'Ollama envuelve ese tipo de motor en comodidad: descarga un modelo por nombre, levanta un servidor, obtén una API HTTP y deja que gestione los archivos del modelo y la memoria. Optimiza para tener un modelo en marcha en un minuto.',
          ],
        },
        {
          id: 'choosing',
          heading: 'Cómo elegir',
          paragraphs: [
            'Elige Ollama cuando quieras modelos funcionando rápido con valores por defecto sensatos, cuando vayas a alternar entre varios modelos o cuando quieras una API local estable sin ajustar nada.',
            'Elige llama.cpp directamente cuando necesites control: una cuantización concreta, un reparto de capas concreto, hardware poco común o incrustar la inferencia en tu propio binario. El precio es que gestionas tú los detalles.',
          ],
        },
        {
          id: 'both',
          heading: 'Usar ambos es normal',
          paragraphs: [
            'Un arreglo habitual es Ollama para el uso interactivo diario y llama.cpp para una carga que se ha ajustado a conciencia. No son excluyentes, y una plataforma que soporte ambos permite decidirlo por despliegue en vez de una sola vez.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Ollama es solo un envoltorio?',
          answer:
            'Eso lo infravalora. La gestión de modelos, el manejo de memoria y una API consistente son justo las piezas que hacen prácticos los modelos locales en el día a día, y son trabajo real sea cual sea el motor de debajo.',
        },
        {
          question: '¿Cuál es más rápido?',
          answer:
            'Con el mismo modelo, la misma cuantización y el mismo hardware van parejos, porque el trabajo pesado es el mismo. Las diferencias en la práctica suelen venir de la configuración y no de la herramienta.',
        },
        {
          question: '¿Qué es la cuantización?',
          answer:
            'Guardar los pesos del modelo con menos precisión para que ocupen menos memoria. Es lo que hace que modelos grandes quepan en hardware corriente, y cambia algo de calidad por mucha practicidad.',
        },
      ],
      productNote:
        'ClawAI soporta ambos como runtimes locales, así que un despliegue puede usar la comodidad de Ollama, el control de llama.cpp o las dos cosas a la vez.',
    },
    [LearnTopic.CLOUD_AI_VS_LOCAL_AI]: {
      seo: {
        title: 'IA en la nube frente a IA local: cómo elegir',
        description:
          'Los modelos en la nube dan capacidad sin hardware; los locales dan control y coste plano. Los factores que deciden de verdad y por qué casi todos usan ambos.',
        keywords: [
          'IA en la nube frente a local',
          'LLM local o alojado',
          'despliegue de IA privada',
        ],
      },
      eyebrow: 'Local y privado',
      title: 'IA en la nube frente a IA local',
      summary:
        'El resumen honesto: los modelos en la nube son más capaces en la gama alta y no te exigen nada; los locales mantienen tus datos en tu hardware y convierten una factura variable en una fija. Casi nadie debería elegir uno para todo, y la pregunta interesante es dónde poner la línea.',
      sections: [
        {
          id: 'capability',
          heading: 'Capacidad',
          paragraphs: [
            'Los modelos más grandes y potentes están alojados, y en razonamiento realmente difícil la diferencia es real. Si tu trabajo lo dominan las preguntas más duras, eso importa más que cualquier otra cosa de esta página.',
            'Para resumir, redactar, extraer, clasificar y código rutinario, la distancia se ha estrechado lo bastante como para que rara vez sea el factor decisivo.',
          ],
        },
        {
          id: 'data',
          heading: 'Datos',
          paragraphs: [
            'Esto es lo que suele decidir de verdad. Un prompt enviado a un modelo alojado lo procesa ese proveedor bajo sus términos. Para la mayoría del contenido eso está bien. Para parte —registros regulados, trabajo sin publicar, material confidencial de terceros— no lo está, y ninguna garantía contractual es tan fuerte como que los datos no salgan.',
            'Por eso el reparto rara vez es todo o nada. Suele decidirse por tipo de dato y no por organización.',
          ],
        },
        {
          id: 'cost',
          heading: 'Coste',
          paragraphs: [
            'La nube es variable: sin desembolso inicial y con una factura proporcional al uso que crece con el éxito. Lo local es fijo: hardware por adelantado y después coste marginal casi nulo.',
            'El punto de cruce depende del volumen. El uso ocasional sale más barato alojado. El uso intenso, sostenido y previsible suele salir más barato en local, y el umbral llega antes de lo que se espera cuando el uso es continuo.',
          ],
        },
        {
          id: 'the-answer',
          heading: 'Casi todos acaban con ambos',
          paragraphs: [
            'Local para lo sensible y de mucho volumen, alojado para las preguntas más duras, y una política de enrutado decidiendo por petición. Eso exige un sistema donde la decisión sea explícita y auditable; si no, «lo sensible se queda en local» es una intención y no un control.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La IA local es más barata?',
          answer:
            'Con volumen sostenido, normalmente sí. Con volumen bajo o irregular, normalmente no: el hardware parado cuesta dinero lo uses o no.',
        },
        {
          question: '¿Puedo empezar en la nube y mover después?',
          answer:
            'Sí, y es un orden sensato: valida el flujo con modelos alojados y luego mueve las partes cuyo volumen o sensibilidad justifiquen el hardware. Es mucho más fácil en una plataforma que ya soporta ambos.',
        },
        {
          question: '¿Lo híbrido es complicado?',
          answer:
            'Lo es si lo construyes tú, porque mantienes dos caminos. Es sencillo si la capa de enrutado ya trata los modelos locales y alojados como destinos intercambiables.',
        },
      ],
      productNote:
        'ClawAI trata los modelos locales y en la nube como el mismo tipo de destino, y sus modos privacidad primero y solo local convierten «lo sensible se queda en local» en un ajuste en vez de una costumbre.',
    },
    [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: {
      seo: {
        title: 'Agente de IA frente a chatbot: cuál es la diferencia',
        description:
          'Un chatbot responde; un agente actúa. Qué cambia cuando un modelo usa herramientas, por qué sube el riesgo y qué comprobar antes de dejarlo actuar.',
        keywords: [
          'agente de IA frente a chatbot',
          'qué es un agente de IA',
          'uso de herramientas',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Agente de IA frente a chatbot',
      summary:
        'Un chatbot produce texto y tú decides qué hacer con él. A un agente se le dan herramientas y un objetivo, y da pasos por su cuenta —leer archivos, llamar a APIs, ejecutar comandos— hasta que cree haber terminado. La diferencia no es inteligencia; es si la salida es una sugerencia o una acción.',
      sections: [
        {
          id: 'the-difference',
          heading: 'La diferencia real',
          paragraphs: [
            'El mecanismo es el uso de herramientas. Un agente es un modelo en un bucle con un conjunto de herramientas que puede invocar, y cada resultado alimenta la siguiente decisión. Quita las herramientas y el bucle y tienes un chatbot.',
            'Ese bucle es lo que hace útiles a los agentes y lo que los hace arriesgados. Un chatbot equivocado te hace perder el tiempo. Un agente equivocado ya ha hecho algo.',
          ],
        },
        {
          id: 'what-agents-are-good-at',
          heading: 'Dónde valen la pena',
          paragraphs: [
            'Trabajo de varios pasos con un estado final comprobable. Ejecuta los tests, lee el fallo, cambia el código, vuelve a ejecutarlos. La comprobación cierra el bucle y el agente puede saber si lo ha logrado.',
            'Sufren donde el éxito es cuestión de criterio, porque nada les dice que paren. Un agente sin forma de verificar su propio avance seguirá adelante con total confianza.',
          ],
        },
        {
          id: 'what-to-check',
          heading: 'Qué comprobar antes de dejarlo actuar',
          paragraphs: [
            'Qué herramientas tiene y hasta dónde llegan esas herramientas. Si las acciones destructivas requieren aprobación. Si puedes ver los pasos que dio y no solo el resultado. Y si se le puede detener a mitad.',
            'Los pasos son lo más importante. Un agente cuyo razonamiento no puedes inspeccionar es uno que hay que aceptar o rechazar en bloque, que es la peor posición desde la que revisar un trabajo.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Un chatbot con búsqueda es un agente?',
          answer:
            'Es la frontera. En cuanto decide por su cuenta si buscar, y qué hacer con los resultados, tiene el bucle. Casi todos los asistentes útiles están hoy en algún punto de ese espectro y no en un extremo.',
        },
        {
          question: '¿Los agentes necesitan los modelos más potentes?',
          answer:
            'Se benefician más que los chatbots, porque los errores se acumulan entre pasos. Un fallo pequeño al principio puede llevar toda la ejecución a un sitio inútil.',
        },
        {
          question: '¿Es seguro ejecutar un agente sobre una base de código?',
          answer:
            'Con control de versiones, permisos acotados y un paso de revisión, sí; es un uso ya asentado. Sin eso, un agente está haciendo cambios sin revisar sobre tu trabajo.',
        },
      ],
      productNote:
        'El agente de programación de ClawAI corre en tu editor con los pasos a la vista y la elección de modelo en tus manos, así que una ejecución se puede revisar en lugar de aceptarla o rechazarla en bloque.',
    },
  },
};
