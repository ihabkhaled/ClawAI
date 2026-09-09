import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PromptGuideDictionary } from '@/types/prompt-guide.types';

export const ES_PROMPT_GUIDE_CONTENT: PromptGuideDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'A dónde ir después',
    lastReviewed: 'Última revisión',
    backToHub: 'Todas las guías de prompts',
    ctaTitle: 'Practica en una conversación real',
    ctaBody:
      'ClawAI te da un solo espacio de trabajo para probar un prompt con modelos de todos los proveedores a los que se conecta, para que veas por ti mismo qué cambia.',
    startFree: 'Empieza con el plan gratuito',
    seeFeatures: 'Descubre qué hace ClawAI',
  },
  hub: {
    seo: {
      title: 'Cómo escribir mejores prompts de IA',
      description:
        'Guías prácticas y honestas para escribir prompts que obtienen mejores resultados: claridad, ejemplos, razonamiento paso a paso, salida estructurada, prompts de sistema y cómo corregir una respuesta mala. Sin estadísticas inventadas, sin exagerar lo que un prompt puede arreglar.',
      keywords: [
        'cómo escribir prompts de IA',
        'guía de escritura de prompts',
        'fundamentos de prompt engineering',
      ],
    },
    eyebrow: 'Guías de prompts',
    title: 'Cómo escribir mejores prompts de IA',
    summary:
      'Un prompt es la instrucción que le das a un modelo, y cómo lo escribas cambia la respuesta que obtienes; esto es cierto sin importar qué modelo o producto uses. Estas guías repasan las técnicas que realmente ayudan: ser específico, dar ejemplos, pedir razonamiento paso a paso, describir el formato de salida que quieres y corregir una respuesta que no dio en el blanco. Ninguna de ellas hace que un modelo sea correcto ni garantiza un resultado; hacen más probable que obtengas lo que en realidad querías pedir.',
    topicsHeading: 'Elige una guía',
    cardSummaries: {
      [PromptGuideTopic.WRITING_CLEAR_PROMPTS]:
        'Los fundamentos: contexto, restricciones, formato y ejemplos.',
      [PromptGuideTopic.FEW_SHOT_PROMPTING]:
        'Mostrarle a un modelo lo que quieres dándole ejemplos.',
      [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]:
        'Pedirle a un modelo que trabaje por pasos antes de responder.',
      [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]:
        'Escribir el prompt que pide JSON, una tabla u otra forma fija.',
      [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]:
        'Qué hace un prompt de sistema de forma distinta a lo que escribes en el chat.',
      [PromptGuideTopic.ITERATING_ON_A_PROMPT]:
        'Qué cambiar cuando la primera respuesta no es la correcta.',
      [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]:
        'Cómo cambia el enfoque adecuado entre código, escritura y análisis.',
    },
  },
  topics: {
    [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: {
      seo: {
        title: 'Cómo escribir un prompt de IA claro y específico',
        description:
          'Los fundamentos de un prompt que obtiene una respuesta útil: dar contexto, indicar restricciones, nombrar el formato que quieres y añadir un ejemplo. Guía práctica, sin estadísticas inventadas.',
        keywords: [
          'cómo escribir un prompt claro',
          'fundamentos de prompts de IA',
          'escritura de prompts específicos',
        ],
      },
      eyebrow: 'Guías de prompts',
      title: 'Cómo escribir un prompt de IA claro y específico',
      summary:
        'La mayoría de las respuestas decepcionantes se deben a un prompt que dejó fuera algo que el modelo no tenía forma de adivinar: la audiencia, las restricciones, el formato o qué aspecto tiene "bueno". Esta guía repasa las cuatro cosas que vale la pena añadir antes de enviar un prompt, en aproximadamente el orden en que importan.',
      sections: [
        {
          id: 'give-context',
          heading: 'Dale al modelo el contexto que no puede adivinar',
          paragraphs: [
            'Un modelo responde a partir de lo que hay en la conversación más lo que aprendió durante el entrenamiento; no sabe para quién estás escribiendo, qué ya intentaste, ni por qué importa la tarea, a menos que se lo digas. "Reescribe este correo" y "reescribe este correo para que un cliente que ya está molesto lo lea como una disculpa, no como una excusa" son la misma tarea con una cantidad distinta de contexto, y obtienen respuestas distintas. El contexto no necesita ser largo; necesita incluir el dato o los dos datos que cambiarían cómo una persona haría la tarea.',
          ],
        },
        {
          id: 'state-constraints',
          heading: 'Indica las restricciones en lugar de esperar que se sobreentiendan',
          paragraphs: [
            'Un límite de longitud, un nivel de lectura, un tono, algo que evitar mencionar, un plazo que la respuesta debe respetar: un modelo aplica una restricción si la indicas, y de lo contrario recurre a un valor genérico por defecto que puede no encajar. "Mantenlo por debajo de 150 palabras" y "evita la jerga técnica" son ambas restricciones que un modelo puede seguir de forma confiable una vez que son explícitas; ninguna es algo que infiera correctamente por sí solo con consistencia.',
          ],
        },
        {
          id: 'name-the-format',
          heading: 'Nombra el formato de salida que realmente quieres',
          paragraphs: [
            'Una lista con viñetas, un párrafo breve, una tabla, una línea de asunto más un cuerpo: pedir de entrada la forma que quieres ahorra un mensaje de seguimiento pidiendo un reformateo. Esto importa más, no menos, cuando la salida tiene que ser procesada por algo distinto a una persona que la lee; para ese caso, consulta cómo pedir salida estructurada, enlazado más abajo, que es la guía complementaria más profunda sobre este punto.',
          ],
        },
        {
          id: 'add-an-example',
          heading: 'Añade un ejemplo cuando una descripción por sí sola sería ambigua',
          paragraphs: [
            'Algunas cosas son más fáciles de mostrar que de describir: un estilo de casa, un tono, un formato específico para una tarea recurrente. Un ejemplo bien elegido a menudo resuelve una ambigüedad que varias frases de descripción no resolverían. Consulta prompting con pocos ejemplos, enlazado más abajo, para saber cómo usar más de un ejemplo de forma deliberada, y cuándo vale la pena la extensión adicional en el prompt.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Un prompt más largo siempre obtiene una mejor respuesta?',
          answer:
            'No: un prompt más largo solo ayuda si la extensión adicional es contexto, una restricción o un ejemplo que al modelo de otro modo le faltaría. Rellenar un prompt con instrucciones repetidas o relleno no mejora la respuesta y puede enterrar la parte que sí importaba.',
        },
        {
          question: '¿Un prompt claro evitará que un modelo se equivoque en los hechos?',
          answer:
            'No. Un prompt claro hace más probable que el modelo entienda lo que estás pidiendo, pero no verifica hechos ni elimina las alucinaciones; consulta por qué la IA alucina, enlazado más abajo, para saber qué causa eso en realidad y por qué el prompting por sí solo no puede arreglarlo.',
        },
        {
          question: '¿Cuál es la única cosa más útil que se puede añadir a un prompt vago?',
          answer:
            'Normalmente el contexto: el dato o los dos datos sobre la audiencia, el objetivo o la situación que una persona necesitaría para hacer bien la tarea. Una restricción o un ejemplo también ayudan, pero importan menos si el modelo aún no sabe para quién es la respuesta.',
        },
      ],
      productNote:
        'ClawAI no reescribe tu prompt por ti, pero un prompt más claro rinde más con cualquier modelo al que lo dirijas, incluso a través del enrutamiento Auto, que sigue respondiendo a partir de lo que realmente pediste.',
    },
    [PromptGuideTopic.FEW_SHOT_PROMPTING]: {
      seo: {
        title: 'Prompting con pocos ejemplos: dar ejemplos a un modelo',
        description:
          'Cómo usar uno o más ejemplos en un prompt para mostrarle a un modelo el patrón que quieres, en lugar de solo describirlo, con orientación sobre cuántos ejemplos ayudan y cuándo basta con zero-shot.',
        keywords: ['few-shot prompting', 'ejemplos en prompts', 'one-shot vs few-shot prompting'],
      },
      eyebrow: 'Guías de prompts',
      title: 'Prompting con pocos ejemplos: dar ejemplos a un modelo',
      summary:
        'El few-shot prompting consiste en incluir uno o más ejemplos resueltos en el propio prompt, para que el modelo pueda seguir el patrón en lugar de inferirlo solo a partir de una descripción. Es una de las formas más fiables de acotar qué significa "bueno" para una tarea que es más fácil de mostrar que de explicar.',
      sections: [
        {
          id: 'what-few-shot-means',
          heading: 'Qué significan "few-shot" y "zero-shot"',
          paragraphs: [
            'Un prompt zero-shot pide un resultado sin incluir ningún ejemplo; un prompt one-shot incluye exactamente uno; un prompt few-shot incluye varios. Los términos describen cuántos ejemplos hay en el prompt, no una afirmación sobre la precisión; un prompt zero-shot bien escrito puede superar a uno few-shot mal elegido, ya que los ejemplos solo ayudan si realmente representan lo que quieres.',
          ],
        },
        {
          id: 'when-examples-help-most',
          heading: 'Cuándo los ejemplos ayudan más que una descripción más larga',
          paragraphs: [
            'Los ejemplos se ganan su lugar cuando la tarea tiene un formato, un tono o un patrón que es genuinamente más fácil de demostrar que de describir: etiquetar datos en categorías difíciles de definir con palabras, imitar una voz de escritura específica, o seguir una plantilla con peculiaridades que una descripción llana pasaría por alto. Para una tarea que ya es inequívoca a partir de una instrucción corta, un ejemplo añade extensión sin añadir información.',
          ],
        },
        {
          id: 'choosing-good-examples',
          heading: 'Qué hace útil a un ejemplo, no solo presente',
          paragraphs: [
            'Un ejemplo vale tanto como lo representativo que sea de la tarea real; un ejemplo fácil o poco habitual puede enseñar el patrón equivocado. Un par de ejemplos bien elegidos que cubran el rango de casos que realmente esperas, incluyendo un caso límite si es probable, suele funcionar mejor que varios ejemplos que se parecen todos entre sí. Si tus ejemplos no coinciden entre sí en tono o formato, espera que el modelo los mezcle en lugar de elegir el que tenías en mente.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuántos ejemplos debe incluir un prompt few-shot?',
          answer:
            'No hay un número fijo: los suficientes para cubrir el rango de casos que esperas, a menudo entre dos y cinco, y más solo si la tarea varía genuinamente más que eso. Añadir ejemplos que se parecen todos rara vez ayuda pasado el primero o el segundo.',
        },
        {
          question: '¿El few-shot prompting es siempre mejor que el zero-shot?',
          answer:
            'No. No está documentado como una ganancia de precisión garantizada y esta página no afirmará eso: un prompt zero-shot claro en una tarea bien definida puede rendir igual de bien, y los ejemplos ayudan sobre todo cuando la tarea es más fácil de mostrar que de describir.',
        },
        {
          question: '¿Puedo combinar ejemplos few-shot con una instrucción paso a paso?',
          answer:
            'Sí; abordan cosas distintas. Los ejemplos muestran el patrón o formato que quieres; pedir razonamiento paso a paso cambia cómo el modelo trabaja hacia la respuesta. Consulta prompting con cadena de razonamiento, enlazado más abajo, para la segunda técnica.',
        },
      ],
      productNote:
        'Un prompt few-shot funciona igual en todos los modelos a los que enruta ClawAI: los ejemplos viven en tu prompt, no en un ajuste, así que viajan con la conversación sin importar qué proveedor la responda.',
    },
    [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]: {
      seo: {
        title: 'Prompting con cadena de razonamiento: pedirle a un modelo que razone paso a paso',
        description:
          'Qué es el chain-of-thought prompting, cuándo pedirle a un modelo que trabaje por pasos antes de responder realmente ayuda, y por qué no garantiza un resultado correcto.',
        keywords: [
          'chain-of-thought prompting',
          'prompting paso a paso',
          'técnica de prompt de razonamiento de IA',
        ],
      },
      eyebrow: 'Guías de prompts',
      title: 'Prompting con cadena de razonamiento: pedirle a un modelo que razone paso a paso',
      summary:
        'El chain-of-thought prompting le pide a un modelo que trabaje un problema por pasos, descomponiéndolo, comprobando resultados intermedios, antes de dar una respuesta final, en lugar de producir de inmediato una respuesta de primera pasada. Es una técnica real y útil para el tipo de tarea adecuado, y no garantiza por sí sola un razonamiento correcto.',
      sections: [
        {
          id: 'what-it-is',
          heading: 'Qué hace en realidad pedir un razonamiento paso a paso',
          paragraphs: [
            'Un prompt como "resuelve esto paso a paso" o "muestra tu razonamiento antes de dar una respuesta final" le pide al modelo que exponga los pasos intermedios en lugar de saltar directo a una conclusión. Para un problema de varios pasos, esto puede sacar a la luz un error en un paso intermedio que de otro modo quedaría enterrado dentro de una única respuesta final que suena segura, y te da algo concreto que comprobar en lugar de solo un resultado en el que confiar.',
          ],
        },
        {
          id: 'when-it-helps',
          heading: 'Cuándo ayuda y cuándo es innecesario',
          paragraphs: [
            'El prompting paso a paso tiende a ayudar más en problemas con varios pasos dependientes, varias restricciones que satisfacer a la vez, o un cálculo que merece la pena verificar dos veces: un problema de palabras con varias partes, una decisión con varios factores, una pieza de lógica que tiene que sostenerse. Una pregunta corta de un solo paso rara vez se beneficia de ello, y pedirlo de todos modos solo añade extensión sin cambiar la respuesta. Consulta cómo elegir un modelo para razonamiento complejo, enlazado más abajo, para ver cómo esto se conecta con elegir un modelo construido justo para este tipo de tarea.',
          ],
        },
        {
          id: 'what-it-does-not-guarantee',
          heading: 'Lo que no garantiza',
          paragraphs: [
            'Pedirle a un modelo que razone paso a paso no garantiza una respuesta correcta, y una cadena de pasos segura y bien estructurada puede aun así llegar a la conclusión equivocada; los pasos adicionales hacen que un error sea más fácil de detectar, no imposible de cometer. Esto es coherente con por qué la IA alucina, enlazado más abajo: un modelo puede producir un razonamiento fluido y de apariencia plausible que sigue siendo incorrecto, así que una respuesta paso a paso merece ser comprobada en cualquier cosa que importe, no aceptada por fe porque parezca metódica.',
          ],
        },
      ],
      faq: [
        {
          question: '¿El chain-of-thought prompting garantiza una respuesta correcta?',
          answer:
            'No: no garantiza un razonamiento correcto, y una respuesta paso a paso puede aun así llegar a una conclusión equivocada. Tiende a hacer que un error sea más fácil de detectar en los pasos intermedios, lo cual es distinto de impedir el error.',
        },
        {
          question: '¿Cuándo debería pedirle a un modelo que muestre su razonamiento?',
          answer:
            'En problemas con varios pasos o restricciones dependientes, donde un error intermedio de otro modo quedaría oculto dentro de una única respuesta final. Una pregunta corta de un solo paso rara vez lo necesita.',
        },
        {
          question: '¿Es esto lo mismo que usar un modelo enfocado en razonamiento?',
          answer:
            'Relacionado pero no idéntico: esta guía trata sobre cómo formulas un prompt para cualquier modelo; cómo elegir un modelo para razonamiento complejo, enlazado más abajo, trata sobre qué modelo está construido para trabajar por pasos de forma predeterminada. Ambas cosas se pueden combinar.',
        },
      ],
      productNote:
        'El modo de enrutamiento High Reasoning de ClawAI favorece un modelo apto para trabajar un problema por pasos, lo cual encaja de forma natural con un prompt paso a paso, pero la técnica de esta página funciona con cualquier modelo al que enrutes.',
    },
    [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]: {
      seo: {
        title: 'Cómo escribir un prompt que pide salida estructurada',
        description:
          'Guía práctica para escribir un prompt que pida de forma fiable JSON, una tabla u otro formato fijo, la pieza complementaria de qué son las salidas de IA estructuradas y por qué el prompting por sí solo no garantiza una estructura válida.',
        keywords: [
          'prompt para salida JSON',
          'prompting de salida estructurada',
          'cómo pedirle una tabla a la IA',
        ],
      },
      eyebrow: 'Guías de prompts',
      title: 'Cómo escribir un prompt que pide salida estructurada',
      summary:
        'Esta guía es la compañera práctica, de "cómo escribir el prompt", de qué son las salidas de IA estructuradas, enlazado más abajo, que cubre el mecanismo técnico; esta página asume que ya quieres salida estructurada y se centra en cómo pedirla bien. No vuelve a explicar el mecanismo subyacente y se mantiene coherente con lo que esa página ya dice sobre lo que un prompt simple puede y no puede garantizar.',
      sections: [
        {
          id: 'describe-the-shape-exactly',
          heading: 'Describe la forma exacta que quieres, no solo el nombre del formato',
          paragraphs: [
            'Decir "devuelve esto como JSON" es un comienzo, pero nombrar los campos, su orden y sus tipos es lo que realmente elimina la ambigüedad: "devuelve un objeto JSON con un campo de texto llamado title y un campo de array llamado steps, donde cada paso es un texto" deja mucho menos por adivinar al modelo que "devuelve JSON con el title y los steps". Lo mismo aplica a una tabla: nombra las columnas y qué pertenece a cada una en lugar de asumir que el modelo elegirá el mismo desglose que tienes en mente.',
          ],
        },
        {
          id: 'show-an-example-of-the-shape',
          heading: 'Muestra un ejemplo de la salida exacta que quieres',
          paragraphs: [
            'Un solo ejemplo de la forma terminada, un objeto JSON de muestra breve, o una fila de la tabla, a menudo elimina más ambigüedad que otro párrafo de descripción, por la misma razón por la que un ejemplo ayuda en el prompting con pocos ejemplos, enlazado más abajo. Esto importa más cuando el formato tiene una peculiaridad fácil de describir de forma imprecisa, como si un campo es opcional o cómo debe representarse un valor ausente.',
          ],
        },
        {
          id: 'plain-prompting-has-limits',
          heading: 'Lo que un prompt bien escrito no garantiza aquí',
          paragraphs: [
            'Un prompt escrito con cuidado hace más probable una salida válida y bien formada, pero no lo garantiza: un modelo puede devolver JSON malformado, un campo extra, o prosa envolviendo la estructura que pediste, especialmente en una respuesta más larga o compleja. Consulta qué son las salidas de IA estructuradas, enlazado más abajo, para conocer los mecanismos técnicos, como la generación restringida por esquema, que existen precisamente porque el prompting por sí solo no es una garantía fiable, y para saber qué hace ClawAI de forma distinta a simplemente pedirlo con amabilidad en un prompt.',
          ],
        },
      ],
      faq: [
        {
          question:
            '¿Basta con pedirlo con amabilidad en un prompt para garantizar un JSON válido?',
          answer:
            'No: un prompt bien escrito lo hace más probable, no seguro. Consulta qué son las salidas de IA estructuradas, enlazado más abajo, para conocer los mecanismos que existen porque el prompting por sí solo no garantiza de forma fiable una estructura válida.',
        },
        {
          question: '¿Debería describir el formato o mostrar un ejemplo?',
          answer:
            'Ambas cosas, cuando el formato tiene cualquier ambigüedad: una descripción precisa de los campos más un ejemplo de la forma terminada cubre más casos que cualquiera de las dos por separado. Consulta prompting con pocos ejemplos, enlazado más abajo, para saber cómo elegir un buen ejemplo.',
        },
        {
          question:
            '¿Cuál es la diferencia entre esta guía y qué son las salidas de IA estructuradas?',
          answer:
            'Esa página explica el mecanismo técnico detrás de una salida estructurada fiable; esta página es la compañera práctica: cómo escribir el prompt en sí. Están pensadas para leerse juntas, no como duplicados una de la otra.',
        },
      ],
      productNote:
        'Para una salida que tiene que ser fiablemente válida, los mecanismos de salida estructurada de ClawAI (consulta qué son las salidas de IA estructuradas, enlazado más abajo) van más allá de la redacción del prompt por sí sola; esta guía cubre la mitad de esa imagen relacionada con la escritura del prompt.',
    },
    [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]: {
      seo: {
        title: 'Prompts de sistema frente a prompts de usuario: qué hace cada uno',
        description:
          'La diferencia entre un prompt de sistema y los mensajes que escribes en una conversación: para qué sirve cada uno, cuándo usar cuál, y cómo funcionan juntos.',
        keywords: [
          'prompt de sistema vs prompt de usuario',
          'qué es un prompt de sistema',
          'roles de prompts de IA explicados',
        ],
      },
      eyebrow: 'Guías de prompts',
      title: 'Prompts de sistema frente a prompts de usuario: qué hace cada uno',
      summary:
        'Una conversación con un modelo suele estar construida a partir de más de un tipo de mensaje: un prompt de sistema que fija instrucciones permanentes para toda la conversación, y prompts de usuario, lo que realmente escribes, que piden algo específico dentro de ella. Saber cuál usar para una instrucción determinada evita repetirte y mantiene una conversación larga más coherente.',
      sections: [
        {
          id: 'what-a-system-prompt-is-for',
          heading: 'Para qué sirve un prompt de sistema',
          paragraphs: [
            'Un prompt de sistema fija una instrucción que se aplica a toda la conversación en lugar de a un solo mensaje de ella: una personalidad que mantener, un tono que conservar, una regla que seguir siempre ("responde siempre en español formal" o "nunca sugieras una dosis específica"). Se establece una vez, normalmente antes de que empiece la conversación, y un modelo lo trata como orientación permanente en lugar de algo que negociar en cada mensaje nuevo.',
          ],
        },
        {
          id: 'what-a-user-prompt-is-for',
          heading: 'Para qué sirve un prompt de usuario',
          paragraphs: [
            'Un prompt de usuario es lo que escribes en cada turno de la conversación: la pregunta o tarea específica de ese mensaje. Es donde se aplica sobre todo la orientación sobre contexto, restricciones, formato y ejemplos de cómo escribir un prompt claro y específico, ya que un prompt de usuario suele tratar sobre una cosa concreta en lugar de una regla permanente para toda la conversación.',
          ],
        },
        {
          id: 'when-to-use-which',
          heading: 'Cuándo poner una instrucción en el prompt de sistema en lugar de repetirla',
          paragraphs: [
            'Una instrucción que debería mantenerse en todos los mensajes, un tono, una personalidad, un límite, pertenece al prompt de sistema, para que no la repitas en cada turno arriesgándote a que se pierda o se contradiga a mitad de una conversación larga. Una petición puntual que solo aplica al mensaje actual pertenece al prompt de usuario. Un prompt de sistema no es por sí solo un límite de seguridad; consulta qué es la inyección de prompts, enlazado más abajo, para saber por qué una instrucción en cualquiera de los dos lugares aún puede ser anulada por contenido adversario en otra parte de una conversación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puede un mensaje de usuario anular un prompt de sistema?',
          answer:
            'Depende de cómo lo maneje un producto específico, y esto no es una garantía establecida en general: un prompt de sistema está pensado como orientación permanente, no como una regla irrompible. Consulta qué es la inyección de prompts, enlazado más abajo, para saber por qué tratarlo como un límite de seguridad absoluto es un error.',
        },
        {
          question: '¿Necesito un prompt de sistema para una pregunta sencilla y puntual?',
          answer:
            'No: un prompt de sistema se justifica cuando una instrucción debería aplicarse a toda una conversación. Para una sola pregunta, poner todo en el prompt de usuario es más simple e igual de eficaz.',
        },
        {
          question:
            '¿Qué tipo de instrucción pertenece a un prompt de sistema en lugar de a uno de usuario?',
          answer:
            'Una regla permanente que no debería necesitar repetirse: una personalidad, un tono, un límite que el modelo siempre debería respetar. Una petición específica y puntual pertenece en cambio al prompt de usuario.',
        },
      ],
      productNote:
        'El ajuste de prompt de sistema de ClawAI se aplica a toda una conversación de la misma forma en cada proveedor al que enruta, así que una instrucción permanente no necesita reescribirse por modelo.',
    },
    [PromptGuideTopic.ITERATING_ON_A_PROMPT]: {
      seo: {
        title: 'Qué hacer cuando la primera respuesta de la IA no es la correcta',
        description:
          'Un enfoque práctico para depurar un prompt que no obtuvo la respuesta que querías: diagnosticar qué faltaba en lugar de solo repetir la petición, y cuándo empezar de nuevo en lugar de parchear.',
        keywords: [
          'mejorar un prompt de IA',
          'corregir una mala respuesta de IA',
          'depuración de prompts de IA',
        ],
      },
      eyebrow: 'Guías de prompts',
      title: 'Qué hacer cuando la primera respuesta de la IA no es la correcta',
      summary:
        'La primera respuesta a un prompt rara vez es la última palabra: la mayoría de la gente obtiene un mejor resultado tratando una respuesta decepcionante como información sobre lo que le faltaba al prompt, y luego ajustando, en lugar de repetir la misma petición esperando algo distinto. Esta guía repasa cómo diagnosticar una mala respuesta y decidir qué cambiar.',
      sections: [
        {
          id: 'diagnose-before-you-rewrite',
          heading: 'Diagnostica qué salió mal antes de reescribir todo el prompt',
          paragraphs: [
            'Una respuesta decepcionante suele encajar en una de unas pocas categorías: le faltó contexto que tenías pero no indicaste, ignoró una restricción, usó el formato equivocado, o está segura de algo que es incorrecto. Identificar cuál de ellas ocurrió apunta a una solución específica: una restricción faltante pide añadir esa restricción explícitamente, no reescribir todo el prompt desde cero ni repetirlo con más insistencia.',
          ],
        },
        {
          id: 'add-what-was-missing',
          heading: 'Añade justo lo que faltaba, no más instrucciones en general',
          paragraphs: [
            'Una vez que sabes qué faltaba, añade exactamente eso: la restricción, el ejemplo, el fragmento de contexto o la descripción del formato que habría dejado clara la petición. Consulta cómo escribir un prompt claro y específico, enlazado más abajo, para los fundamentos de los que suele partir este paso; la mayor parte de la iteración consiste en aplicar el mismo puñado de cosas que el primer prompt omitió.',
          ],
        },
        {
          id: 'know-when-to-start-over',
          heading: 'Sabe cuándo empezar un prompt nuevo en lugar de parchear',
          paragraphs: [
            'Un largo intercambio de pequeñas correcciones puede dejar una conversación cargando instrucciones contradictorias que el modelo ahora intenta reconciliar; en ese punto, un prompt nuevo y completo que declare todo lo que has aprendido que necesitas suele ser más rápido y fiable que un parche más. Esto también vale la pena recordarlo cuando la respuesta está segura de algo que es factualmente incorrecto en lugar de estar simplemente fuera de formato: parchear la redacción no arreglará eso, porque no es un problema de redacción; consulta por qué la IA alucina, enlazado más abajo, para saber qué está pasando en realidad en ese caso.',
          ],
        },
      ],
      faq: [
        {
          question:
            'La respuesta está bien escrita pero es factualmente incorrecta, ¿cómo arreglo el prompt?',
          answer:
            'En su mayoría no puedes arreglar esto reformulando el prompt, porque no es un problema de redacción. Consulta por qué la IA alucina, enlazado más abajo, para saber qué está pasando en realidad y qué sí ayuda, como pedirle al modelo que cite fuentes que se puedan comprobar o usar un modo de investigación que busque información.',
        },
        {
          question: '¿Debería seguir corrigiendo en la misma conversación o empezar una nueva?',
          answer:
            'Cualquiera de las dos puede funcionar, pero una cadena larga de pequeñas correcciones corre el riesgo de dejar instrucciones contradictorias. Si una conversación ya ha tenido varias correcciones, un prompt nuevo y completo suele ser más fiable que un parche más.',
        },
        {
          question: '¿Cuántas veces debería intentarlo antes de abandonar un enfoque de prompt?',
          answer:
            'No hay un número fijo, pero si dos o tres correcciones específicas y diagnosticadas no han ayudado, el problema puede no ser el prompt en absoluto. Consulta cómo elegir un modelo para tu tarea, enlazado más abajo, para saber si la tarea podría necesitar un tipo de modelo distinto.',
        },
      ],
      productNote:
        'Cada conversación en ClawAI conserva su historial, así que puedes iterar sobre un prompt a lo largo de varios turnos y ver exactamente qué cambió entre una respuesta y la siguiente.',
    },
    [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]: {
      seo: {
        title: 'Cómo cambia el prompting para código, escritura y análisis',
        description:
          'Cómo cambia el enfoque de prompting adecuado entre tareas de código, tareas de escritura y tareas de análisis, y cómo se conecta eso con elegir el modelo correcto para cada una, no solo las palabras correctas.',
        keywords: [
          'prompting para código vs escritura',
          'prompts de IA por tipo de tarea',
          'prompting para tareas de análisis',
        ],
      },
      eyebrow: 'Guías de prompts',
      title: 'Cómo cambia el prompting para código, escritura y análisis',
      summary:
        'Las técnicas de este centro de guías (claridad, ejemplos, razonamiento paso a paso, formato) se aplican en todas partes, pero cuáles importan más cambia según el tipo de tarea. Esta guía repasa qué tiende a ayudar más para código, para escritura y para análisis, y enlaza con el grupo de guías sobre ajuste de modelo para el lado del modelo de la misma pregunta, en lugar de volver a explicar aquí esas distinciones de tarea.',
      sections: [
        {
          id: 'prompting-for-code',
          heading: 'Prompting para código: precisión antes que persuasión',
          paragraphs: [
            'Un prompt de código se beneficia sobre todo de la precisión: la firma exacta de la función, el lenguaje y la versión, la restricción que el código tiene que cumplir, un ejemplo de la entrada y salida esperadas. Un planteamiento vago que sería inofensivo en un prompt de escritura ("hazlo bien") le da a una tarea de código casi nada con lo que trabajar, ya que no hay una única forma correcta para una petición así.',
          ],
        },
        {
          id: 'prompting-for-writing',
          heading: 'Prompting para escritura: audiencia, tono y un buen ejemplo',
          paragraphs: [
            'Un prompt de escritura o edición se beneficia sobre todo de la orientación sobre contexto y restricciones de cómo escribir un prompt claro y específico, enlazado más abajo: para quién es el texto, el tono que debería mantener y una restricción de longitud o estructura. Un ejemplo de la voz objetivo, según el prompting con pocos ejemplos, enlazado más abajo, a menudo hace aquí más trabajo que una descripción más larga del tono.',
          ],
        },
        {
          id: 'prompting-for-analysis',
          heading: 'Prompting para análisis: pedir el razonamiento, no solo la conclusión',
          paragraphs: [
            'Una tarea analítica, sopesar opciones, interpretar datos, trabajar una decisión con varios factores, suele beneficiarse del prompting con cadena de razonamiento, enlazado más abajo: pedirle al modelo que exponga su razonamiento en lugar de solo enunciar una conclusión te da algo que comprobar, y tiende a sacar a la luz un factor pasado por alto o una suposición débil. Esta es la misma forma de tarea que cómo elegir un modelo para razonamiento complejo, enlazado más abajo, que cubre qué modelo está construido justo para esto en lugar de repetir aquí esa orientación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Una sola técnica de prompting funciona mejor en los tres tipos de tarea?',
          answer:
            'No: la precisión importa más para el código, la audiencia y el tono importan más para la escritura, y pedir un razonamiento visible importa más para el análisis. La mayoría de las tareas se benefician de una mezcla, ponderada hacia lo que la tarea realmente necesite de estas.',
        },
        {
          question: '¿El modelo que elijo importa tanto como cómo escribo el prompt?',
          answer:
            'Ambas cosas importan, y son palancas distintas: esta guía trata sobre la redacción; consulta cómo elegir un modelo para tu tarea, enlazado más abajo, para el lado del ajuste de modelo específicamente para código, escritura y tareas con mucho razonamiento.',
        },
        {
          question: '¿Un prompt de código es solo un prompt de escritura con otras palabras?',
          answer:
            'No: una tarea de código suele tener una única forma correcta o funcional, así que la precisión sobre el requisito exacto importa más de lo que importa en la mayoría de la escritura, donde varias formulaciones distintas pueden ser todas buenas.',
        },
      ],
      productNote:
        'Los modos de enrutamiento de ClawAI ya se inclinan hacia un modelo adecuado por tarea (Auto y High Reasoning para trabajo analítico, por ejemplo), así que un prompt bien escrito y una ruta adecuada trabajan juntos en lugar de como decisiones separadas.',
    },
  },
};
