import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCasesClusterDictionary } from '@/types/use-cases-cluster.types';

export const ES_USE_CASES_CLUSTER_CONTENT: UseCasesClusterDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'A dónde ir después',
    lastReviewed: 'Última revisión',
    backToHub: 'Todos los casos de uso',
    ctaTitle: 'Pruébalo en vez de creer solo nuestra palabra',
    ctaBody:
      'ClawAI dirige cada conversación al modelo y a las herramientas que se ajustan a la tarea, entre todos los proveedores con los que se conecta, desde un único espacio de trabajo.',
    startFree: 'Empieza con el plan gratuito',
    seeFeatures: 'Descubre qué hace ClawAI',
  },
  hub: {
    tasksHeading: 'Profundiza en una tarea concreta',
    tasksIntro:
      'Los casos anteriores son la versión resumida. Cada una de las siete tareas de abajo tiene su propia página completa: qué necesita realmente la tarea, qué función o modo de enrutado de ClawAI se encarga de ella, y dónde comprobar los detalles por ti mismo.',
    cardSummaries: {
      [UseCaseTask.CODING_AND_DEVELOPMENT]:
        'Escribir, editar y revisar código, con el agente de programación para cambios de varios pasos.',
      [UseCaseTask.RESEARCH_AND_FACT_FINDING]:
        'Respuestas basadas en fuentes que ClawAI realmente consultó, no solo en datos de entrenamiento.',
      [UseCaseTask.WRITING_AND_EDITING]:
        'Redacción y edición extensas que se mantienen coherentes a lo largo de todo un documento.',
      [UseCaseTask.COMPARING_MODEL_ANSWERS]:
        'Ejecutar el mismo prompt en varios modelos a la vez y dejar que uno de ellos juzgue el resto.',
      [UseCaseTask.WORKSPACE_AUTOMATION]:
        'Conectar las herramientas que tu equipo ya usa para que ClawAI pueda actuar dentro de ellas.',
      [UseCaseTask.STRUCTURED_DATA_EXTRACTION]:
        'Convertir texto o páginas desordenadas en salida estructurada que tus propios sistemas puedan consumir.',
      [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]:
        'Mantener una solicitud en hardware que controlas en lugar de un proveedor en la nube.',
    },
  },
  tasks: {
    [UseCaseTask.CODING_AND_DEVELOPMENT]: {
      seo: {
        title: 'Programación y desarrollo con ClawAI',
        description:
          'Cómo ayuda ClawAI en programación — chatea con un modelo para una corrección rápida, o entrega un cambio de varios pasos al agente de programación. Basado en el producto real, sin benchmarks inventados.',
        keywords: [
          'IA para programar',
          'caso de uso del agente de programación',
          'flujo de trabajo de programación en pareja con IA',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Programación y desarrollo',
      summary:
        'El trabajo de programación en ClawAI adopta dos formas: una pregunta rápida o una edición de un solo archivo respondida en un chat normal, y un cambio de varios pasos —varios archivos, un plan, una revisión— entregado al agente de programación. Ambas comparten el mismo enrutado y el mismo catálogo de proveedores por debajo.',
      sections: [
        {
          id: 'quick-fixes-in-chat',
          heading: 'Correcciones y preguntas rápidas, en un chat normal',
          paragraphs: [
            'Una edición de un solo archivo, una explicación de un error o una refactorización breve es un mensaje de chat normal de ClawAI como cualquier otro. El enrutador puede enviarlo a un modelo adecuado para la tarea bajo el enrutado Auto o High Reasoning, o puedes fijar un modelo concreto en el modo Manual Model si ya sabes cuál necesita un tipo de pregunta recurrente — consulta cómo elegir un modelo para programar, enlazado más abajo, para saber qué sopesar en ese caso.',
          ],
        },
        {
          id: 'multi-step-changes-with-the-coding-agent',
          heading: 'Cambios de varios pasos con el agente de programación',
          paragraphs: [
            'Para un cambio que abarca varios archivos o pasos —una función, una migración, una refactorización con un plan—, el agente de programación de ClawAI ejecuta un bucle por turnos sobre tu base de código en lugar de responder en un único mensaje, con su propia superficie de uso medida, separada del chat normal. Consulta la página del agente de programación, enlazada más abajo, para saber qué hace y cómo se instala.',
          ],
        },
        {
          id: 'connecting-your-repository',
          heading: 'Conectar el repositorio que afecta el trabajo',
          paragraphs: [
            'El trabajo de programación a menudo necesita tener a la vista el propio repositorio, no solo fragmentos pegados — ClawAI se conecta a GitHub, GitLab y Bitbucket como conectores de espacio de trabajo, de modo que una solicitud puede referenciar el código, los issues o los pull requests reales contra los que trabaja, en lugar de que copies archivos a mano. Consulta la página de integraciones, enlazada más abajo, para la lista completa de conectores.',
          ],
        },
      ],
      faq: [
        {
          question: '¿ClawAI escribe código por mí de forma automática?',
          answer:
            'Para un cambio pequeño y bien especificado, un mensaje de chat normal suele bastar. Para un cambio de varios pasos en varios archivos, el agente de programación ejecuta un bucle por turnos sobre tu base de código en lugar de responder una sola vez — consulta la página del agente de programación, enlazada más abajo.',
        },
        {
          question: '¿ClawAI puede ver mi repositorio real?',
          answer:
            'Sí, una vez que lo conectas — ClawAI tiene conectores de espacio de trabajo para GitHub, GitLab y Bitbucket, de modo que una solicitud de programación puede referenciar archivos, issues y pull requests reales en lugar de fragmentos pegados.',
        },
        {
          question: '¿Qué modelo debería usar para programar?',
          answer:
            'Esta página no nombra ninguno — consulta cómo elegir un modelo para programar, enlazado más abajo, para saber qué sopesar en lugar de un ranking.',
        },
      ],
      productNote:
        'ClawAI enruta una pregunta de programación normal a un modelo adecuado de forma automática, y entrega un cambio de varios pasos al agente de programación — una función real, ya publicada, con su propio uso medido, no un truco de chat.',
    },
    [UseCaseTask.RESEARCH_AND_FACT_FINDING]: {
      seo: {
        title: 'Investigación y verificación de datos con ClawAI',
        description:
          'Cómo el modo Research de ClawAI busca, obtiene y extrae contenido de la web para que una respuesta cite fuentes que realmente consultó, facturado por separado del crédito de modelo.',
        keywords: [
          'asistente de investigación con IA',
          'verificación de datos con IA',
          'respuestas de IA con fuentes',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Investigación y verificación de datos',
      summary:
        'Una tarea de investigación pide una respuesta basada en fuentes consultadas para esa pregunta concreta, no solo en lo que un modelo aprendió durante el entrenamiento. El modo Research de ClawAI es una función real, ya publicada, construida precisamente para esto, con tres niveles de profundidad y su propio sistema de medición separado del chat normal.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Qué hace realmente el modo Research',
          paragraphs: [
            'El modo Research permite que una solicitud busque en la web, obtenga una página, o la obtenga y extraiga contenido estructurado de ella, antes de que ClawAI produzca una respuesta — de modo que la respuesta pueda citar fuentes recuperadas para esa pregunta en lugar de depender solo de los datos de entrenamiento. Es una función limitada por plan con tres niveles de profundidad: solo búsqueda, búsqueda más obtención de página, o búsqueda más obtención y extracción.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Medido por separado de tu crédito de modelo',
          paragraphs: [
            'El acceso a Research —búsqueda web, obtención de páginas y extracción— se mide como un consumo propio, separado del límite de tokens del que dispone un mensaje de chat normal. El límite de investigación de tu plan y su límite de tokens de modelo son dos líneas distintas, no un mismo fondo compartido, así que ejecutar una investigación no consume el crédito que usaría una tarea de programación o de redacción.',
          ],
        },
        {
          id: 'picking-a-depth-for-the-question',
          heading: 'Elegir la profundidad adecuada para cada pregunta',
          paragraphs: [
            'Una verificación rápida de un dato suele necesitar solo el nivel de solo búsqueda; una pregunta que depende de lo que realmente dice una página concreta pide búsqueda más obtención; extraer datos estructurados de varias páginas a la vez es donde búsqueda más obtención y extracción justifica su coste. Ajustar la profundidad a la pregunta mantiene el uso de investigación proporcionado en lugar de recurrir siempre a la opción más costosa por defecto.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La investigación consume mi crédito de tokens de modelo?',
          answer:
            'No. El acceso a Research —búsqueda web, obtención de páginas y extracción— se mide por separado del límite de tokens del que dispone un mensaje de chat normal. Confirma ambos límites en la página de precios.',
        },
        {
          question: '¿Cuál es la diferencia entre las tres profundidades del modo Research?',
          answer:
            'Solo búsqueda devuelve resultados de una búsqueda web; búsqueda más obtención también recupera el contenido de la página; búsqueda más obtención y extracción además extrae contenido estructurado de lo que obtuvo.',
        },
        {
          question: '¿Importa el modelo que elija para la calidad de la investigación?',
          answer:
            'Sí — el modo Research cambia qué fuentes puede ver un modelo, no lo bien que las lee y las concilia. Consulta cómo elegir un modelo para investigación con fuentes, enlazado más abajo.',
        },
      ],
      productNote:
        'El modo Research de ClawAI puede buscar, obtener y obtener-y-extraer de la web antes de que un modelo responda — una función real, ya publicada, medida por separado de tu crédito de tokens de modelo.',
    },
    [UseCaseTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Redacción y edición con ClawAI',
        description:
          'Cómo ayuda ClawAI en redacción y edición extensas — paquetes de contexto para material de referencia, memoria para un estilo recurrente y enrutado a un modelo adecuado.',
        keywords: [
          'asistente de redacción con IA',
          'flujo de trabajo de edición con IA',
          'redacción extensa con IA',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Redacción y edición',
      summary:
        'La redacción y la edición en ClawAI van desde una reescritura breve hasta un documento largo que tiene que mantenerse coherente de la primera a la última página. Dos funciones asumen la mayor parte del trabajo cuando un documento se alarga: los paquetes de contexto para material de referencia, y la memoria para un estilo que debe persistir entre sesiones.',
      sections: [
        {
          id: 'reference-material-with-context-packs',
          heading: 'Mantener el material de referencia a la vista con paquetes de contexto',
          paragraphs: [
            'Un briefing de estilo, borradores anteriores o material de origen con el que un texto debe mantenerse coherente es, antes que nada, un problema de contexto y no un problema de redacción — los paquetes de contexto de ClawAI son una función limitada por plan para mantener ese material disponible en una conversación en lugar de volver a pegarlo cada sesión. Consulta qué son los paquetes de contexto, enlazado más abajo, para saber cómo funciona la función.',
          ],
        },
        {
          id: 'memory-for-a-recurring-voice',
          heading: 'Memoria para una voz que debe persistir',
          paragraphs: [
            'Una tarea de redacción recurrente —un boletín, un informe semanal, un estilo de documentación— se beneficia de que ClawAI recuerde las preferencias ya establecidas entre sesiones en lugar de repetirlas cada vez. La memoria es una función separada de los paquetes de contexto, también limitada por plan: los paquetes de contexto guardan material de referencia para una tarea, la memoria guarda lo que ClawAI ha aprendido sobre cómo quieres que se escriban las cosas.',
          ],
        },
        {
          id: 'routing-a-writing-request',
          heading: 'Enrutar una solicitud de redacción o edición a un modelo adecuado',
          paragraphs: [
            'El enrutador de ClawAI puede enviar una solicitud de redacción o edición a un modelo adecuado de forma automática bajo el enrutado Auto o Cost Saver, o puedes fijar uno en el modo Manual Model para una tarea recurrente con un estilo conocido. Consulta cómo elegir un modelo para redacción y edición, enlazado más abajo, para saber qué sopesar al elegir uno de forma deliberada.',
          ],
        },
      ],
      faq: [
        {
          question:
            '¿ClawAI puede mantener un briefing de estilo a la vista durante toda una sesión de edición?',
          answer:
            'Sí — los paquetes de contexto están construidos precisamente para esto, manteniendo disponible en una conversación material de referencia como un briefing de estilo o un documento de origen en lugar de volver a pegarlo. Consulta qué son los paquetes de contexto, enlazado más abajo.',
        },
        {
          question: '¿ClawAI recuerda cómo me gusta que se escriban las cosas?',
          answer:
            'La memoria puede mantener preferencias ya establecidas entre sesiones para una tarea de redacción recurrente, por separado de los paquetes de contexto, que guardan material de referencia específico de una tarea y no preferencias a largo plazo.',
        },
        {
          question: '¿Qué modelo debería usar para redactar?',
          answer:
            'Esta página no nombra ninguno — consulta cómo elegir un modelo para redacción y edición, enlazado más abajo, para saber qué sopesar en lugar de un ranking.',
        },
      ],
      productNote:
        'ClawAI puede mantener material de referencia a la vista con paquetes de contexto y recordar un estilo recurrente con memoria — ambas funciones reales, limitadas por plan, no trucos de chat.',
    },
    [UseCaseTask.COMPARING_MODEL_ANSWERS]: {
      seo: {
        title: 'Comparar respuestas de modelos con ClawAI',
        description:
          'Cómo los modos Compare y Judge de ClawAI ejecutan un mismo prompt en varios modelos a la vez y hacen que un modelo juez evalúe los resultados — basado en la función real ya publicada, sin rankings inventados.',
        keywords: [
          'comparar respuestas de modelos de IA',
          'consenso entre modelos de IA',
          'respuestas de IA best-of-N',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Comparar respuestas de modelos',
      summary:
        'A veces lo acertado no es elegir un modelo de antemano, sino ejecutar el mismo prompt en varios y observar lo que devuelve cada uno. El modo Compare de ClawAI hace exactamente esto, y el modo Judge puede hacer que un modelo aparte evalúe los resultados en lugar de dejarte leer cada respuesta tú mismo.',
      sections: [
        {
          id: 'what-compare-mode-does',
          heading: 'Qué hace el modo Compare',
          paragraphs: [
            'El modo Compare envía un mismo prompt a varios modelos a la vez y muestra las respuestas una junto a otra, de modo que una decisión que importa —un juicio de valor, una solicitud ambigua, un caso en el que el enfoque de un modelo podría estar equivocado— recibe más de una perspectiva. Es una función limitada por plan, medida por carril y no por ejecución, así que el coste crece según cuántos modelos compares.',
          ],
        },
        {
          id: 'consensus-and-best-of-n',
          heading: 'Consenso y best-of-N, explicados con precisión',
          paragraphs: [
            'Dos ideas describen qué hacer con varias respuestas una vez que las tienes: consenso, donde el propio acuerdo entre modelos aporta información, y best-of-N, donde generas varios candidatos y eliges o sintetizas el más fuerte. Consulta qué es el consenso de IA y qué es best-of-N, ambos enlazados más abajo, para saber cómo funciona cada uno en realidad y no en el discurso comercial.',
          ],
        },
        {
          id: 'judge-mode-and-critic-review',
          heading: 'Hacer que un modelo juzgue el resto',
          paragraphs: [
            'El modo Judge es una función separada, limitada por plan, que ejecuta una segunda pasada sobre una ejecución de Compare, con un modelo evaluando a los demás en lugar de que tú leas cada respuesta a mano. La revisión crítica es una función relacionada pero distinta, para una segunda mirada sobre una sola respuesta en lugar de una comparación entre modelos — consulta qué es un juez de IA, enlazado más abajo, para saber cómo funciona realmente la evaluación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre el modo Compare y el modo Judge?',
          answer:
            'El modo Compare ejecuta un mismo prompt en varios modelos y muestra cada respuesta una junto a otra. El modo Judge es una segunda pasada separada, limitada por plan, que hace que un modelo evalúe los resultados de una ejecución de Compare en lugar de que tú leas cada una.',
        },
        {
          question: '¿El modo Compare cuesta más que un mensaje de chat normal?',
          answer:
            'El uso de Compare se mide por carril, no por ejecución — comparar el mismo prompt contra más modelos cuesta proporcionalmente más. Confirma el límite vigente en la página de precios.',
        },
        {
          question: '¿Qué es best-of-N, y es lo mismo que el consenso?',
          answer:
            'No — el consenso trata el acuerdo entre las respuestas de los modelos como información en sí misma, mientras que best-of-N genera varios candidatos y elige o sintetiza el más fuerte. Consulta qué es el consenso de IA y qué es best-of-N, ambos enlazados más abajo.',
        },
      ],
      productNote:
        'Los modos Compare y Judge de ClawAI son funciones reales, ya publicadas y limitadas por plan — un mismo prompt en varios modelos, con un modelo adicional opcional para evaluar los resultados.',
    },
    [UseCaseTask.WORKSPACE_AUTOMATION]: {
      seo: {
        title: 'Automatización del espacio de trabajo con ClawAI',
        description:
          'Cómo se conecta ClawAI a las herramientas que ya usa un equipo — GitHub, Slack, Jira, Google Drive y más— para que una solicitud pueda actuar dentro de ellas, no solo hablar de ellas.',
        keywords: [
          'automatización de espacio de trabajo con IA',
          'conectores de herramientas de IA',
          'conectar IA con Slack y Jira',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Automatización del espacio de trabajo',
      summary:
        'Un conector de espacio de trabajo permite que una solicitud de ClawAI lea o actúe sobre una herramienta que tu equipo ya usa, en lugar de que copies información de un lado a otro a mano. ClawAI tiene hoy 14 conectores de espacio de trabajo, que abarcan alojamiento de código, chat, seguimiento de proyectos, documentos y calendarios.',
      sections: [
        {
          id: 'what-a-workspace-connector-is',
          heading: 'Qué hace realmente un conector de espacio de trabajo',
          paragraphs: [
            'Un espacio de trabajo conectado permite que una solicitud referencie o actúe sobre datos reales de esa herramienta —un ticket de Jira, un hilo de Slack, un archivo en Google Drive— en lugar de que lo pegues en la conversación. El acceso al espacio de trabajo es una función limitada por plan, y las acciones de los conectores se miden como una superficie propia, separada del chat normal.',
          ],
        },
        {
          id: 'which-tools-connect',
          heading: 'A qué herramientas se conecta ClawAI',
          paragraphs: [
            'Los conectores de ClawAI abarcan alojamiento de código (GitHub, GitLab, Bitbucket), mensajería y seguimiento (Slack, Jira, Confluence, ClickUp), diseño (Figma), documentos y almacenamiento (Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive) y calendarios (Google Calendar, Outlook Calendar). Consulta la página de integraciones, enlazada más abajo, para saber qué hace cada uno.',
          ],
        },
        {
          id: 'multi-model-review-and-handoff',
          heading: 'Revisión multimodelo y traspaso dentro de una acción de espacio de trabajo',
          paragraphs: [
            'Una acción de espacio de trabajo puede implicar más de una sola llamada a un modelo — un paso de redacción encadenada o de traspaso, o una revisión multimodelo del resultado antes de actuar sobre él, forma parte de la misma superficie medida en lugar de ser una función aparte que tienes que activar. Es la misma infraestructura de enrutado que usa el resto de ClawAI, aplicada a acciones que tocan una herramienta conectada.',
          ],
        },
      ],
      faq: [
        {
          question: '¿A cuántas herramientas se conecta ClawAI?',
          answer:
            'Catorce conectores de espacio de trabajo hoy, que abarcan alojamiento de código, mensajería, seguimiento de proyectos, diseño, documentos, almacenamiento y calendarios. Consulta la página de integraciones, enlazada más abajo, para la lista completa.',
        },
        {
          question: '¿ClawAI puede actuar sobre una herramienta conectada, o solo leerla?',
          answer:
            'Las acciones de espacio de trabajo pueden actuar sobre una herramienta conectada, no solo leerla — los detalles dependen del conector y del límite de espacio de trabajo de tu plan.',
        },
        {
          question:
            '¿La automatización del espacio de trabajo se mide por separado del chat normal?',
          answer:
            'Sí — las acciones de los conectores se miden como una superficie de uso propia, separada del límite de tokens del que dispone un mensaje de chat normal. Confirma el límite vigente en la página de precios.',
        },
      ],
      productNote:
        'ClawAI se conecta hoy a 14 herramientas de espacio de trabajo —alojamiento de código, mensajería, seguimiento de proyectos, diseño, documentos y calendarios— con su propia superficie de uso medida para las acciones que realiza en ellas.',
    },
    [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: {
      seo: {
        title: 'Extracción de datos estructurados con ClawAI',
        description:
          'Cómo convierte ClawAI texto y páginas sin estructurar en salida estructurada — llamadas a herramientas para un esquema definido, y el nivel de extracción del modo Research para páginas web.',
        keywords: [
          'extracción de datos estructurados con IA',
          'salida JSON con IA',
          'extraer datos de texto con IA',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Extracción de datos estructurados',
      summary:
        'Convertir texto desordenado, un documento o una página web en una estructura definida que tus propios sistemas puedan consumir es un trabajo distinto al de redactar prosa — se apoya en llamadas a herramientas hacia un esquema fijo y, cuando la fuente es una página web, en el nivel de extracción del modo Research de ClawAI.',
      sections: [
        {
          id: 'tool-calling-for-a-defined-schema',
          heading: 'Llamadas a herramientas para un esquema de salida definido',
          paragraphs: [
            'Cuando una solicitud necesita su salida en una forma concreta —un conjunto fijo de campos, una estructura JSON definida—, el mecanismo de llamada a herramientas de ClawAI es lo que hace fiable ese resultado en lugar de confiar en que una respuesta en texto plano se analice correctamente. Consulta cómo funciona la llamada a herramientas de IA y qué son las salidas de IA estructuradas, ambos enlazados más abajo, para saber cómo funciona realmente el mecanismo.',
          ],
        },
        {
          id: 'extracting-from-a-web-page',
          heading: 'Extraer contenido estructurado de una página web',
          paragraphs: [
            'Cuando la fuente es una página web en vivo y no un texto que ya tienes, el nivel de búsqueda más obtención y extracción del modo Research extrae contenido estructurado de lo que obtiene, como parte de la misma función que se usa para investigación con fuentes. Se mide como uso de investigación, separado del límite de tokens del que dispone un mensaje de chat normal.',
          ],
        },
        {
          id: 'file-generation-for-the-output',
          heading: 'Generar un archivo a partir del resultado extraído',
          paragraphs: [
            'Una vez extraídos los datos, la generación de documentos y archivos de ClawAI puede convertirlos en un artefacto descargable en lugar de dejar el resultado solo en la transcripción del chat — con su propia superficie medida, separada del chat normal y de la investigación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿ClawAI puede garantizar una salida JSON válida?',
          answer:
            'La llamada a herramientas hacia un esquema definido es lo que hace fiable la salida estructurada, en lugar de analizar una respuesta en texto plano después del hecho. Consulta cómo funciona la llamada a herramientas de IA, enlazado más abajo, para el mecanismo.',
        },
        {
          question:
            '¿ClawAI puede extraer datos estructurados de una página web, no solo de texto que yo pegue?',
          answer:
            'Sí — el nivel de búsqueda más obtención y extracción del modo Research extrae contenido estructurado de una página web que obtiene, medido como uso de investigación separado del chat normal.',
        },
        {
          question:
            '¿Puedo obtener el resultado extraído como archivo en lugar de solo texto de chat?',
          answer:
            'Sí — la generación de documentos y archivos puede convertir un resultado extraído en un artefacto descargable, en su propia superficie de uso medida.',
        },
      ],
      productNote:
        'La llamada a herramientas hacia un esquema definido de ClawAI, y el nivel de extracción del modo Research para páginas web, son funciones reales y ya publicadas detrás de la extracción de datos estructurados — no un simple truco de prompt.',
    },
    [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: {
      seo: {
        title: 'Despliegue privado y local con ClawAI',
        description:
          'Cómo mantienen los modos de enrutado Local-Only y Privacy-First de ClawAI una solicitud en hardware que controlas, usando los conectores de Ollama y llama.cpp en lugar de un proveedor en la nube.',
        keywords: [
          'despliegue de IA privado',
          'cargas de trabajo de IA locales',
          'ejecutar modelos de IA en tu propio hardware',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Despliegue privado y local',
      summary:
        'Algunos trabajos tienen que permanecer en hardware que tú controlas y no llegar nunca a un proveedor en la nube. ClawAI tiene conectores reales a Ollama y llama.cpp precisamente para esto, además de modos de enrutado que mantienen una solicitud en local por política y no por accidente.',
      sections: [
        {
          id: 'what-local-deployment-changes',
          heading: 'Qué cambia realmente al ejecutar algo en local',
          paragraphs: [
            'Un proveedor en la nube, en otra parte del catálogo de ClawAI, ejecuta un modelo en su propia infraestructura y cobra por solicitud; Ollama y llama.cpp, en cambio, cargan un modelo de pesos abiertos en hardware que tú controlas, de modo que la solicitud nunca sale de él. Eso cambia quién puede ver la solicitud, no la capacidad de ningún modelo en concreto.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Los modos de enrutado Local-Only y Privacy-First',
          paragraphs: [
            'El enrutado Local-Only mantiene toda solicitud en hardware que tú controlas, usando Ollama o llama.cpp en lugar de cualquier proveedor en la nube. Privacy-First es un modo distinto con sus propias prioridades; ambos existen porque no toda carga de trabajo debería recurrir por defecto al enrutado Auto, y elegir entre ellos es una decisión deliberada y no un valor por defecto que conviene dejar sin examinar.',
          ],
        },
        {
          id: 'when-private-deployment-fits',
          heading: 'Cuándo una carga privada o local es la forma adecuada',
          paragraphs: [
            'Una carga privada o local se define por dónde se ejecuta la solicitud, no por qué tipo de tarea es — programación, redacción o investigación pueden ejecutarse todas de esta forma si el requisito es que nada salga del hardware que controlas. Consulta cómo elegir un modelo para cargas privadas y locales y qué es la IA local-first, ambos enlazados más abajo, para las disyuntivas que conviene sopesar.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es la diferencia entre el enrutado Local-Only y Privacy-First?',
          answer:
            'Local-Only mantiene toda solicitud en hardware que tú controlas mediante Ollama o llama.cpp; Privacy-First es un modo de enrutado distinto con sus propias prioridades. Ambos existen porque no toda carga de trabajo debería recurrir por defecto al enrutado Auto.',
        },
        {
          question: '¿Qué modelo de pesos abiertos debería ejecutar en local?',
          answer:
            'Esta página no recomienda ninguno — consulta qué es la IA local-first, enlazado más abajo, para saber cómo pensar en la elección, ya que el modelo adecuado depende de tu hardware y de la tarea.',
        },
        {
          question: '¿Puedo ejecutar en local cualquier tipo de tarea, o solo algunas?',
          answer:
            'Una carga privada o local se define por dónde se ejecuta la solicitud, no por la tarea — programación, redacción o investigación pueden ejecutarse todas así si mantenerse en hardware que controlas importa más que qué tarea sea.',
        },
      ],
      productNote:
        'Los modos de enrutado Local-Only y Privacy-First de ClawAI mantienen una solicitud en hardware que controlas mediante los conectores de Ollama y llama.cpp — conectores reales, ya publicados, no un elemento en la hoja de ruta.',
    },
  },
};
