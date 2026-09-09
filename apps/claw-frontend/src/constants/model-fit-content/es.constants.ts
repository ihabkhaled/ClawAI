import { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { ModelFitDictionary } from '@/types/model-fit.types';

export const ES_MODEL_FIT_CONTENT: ModelFitDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'A dónde ir después',
    lastReviewed: 'Última revisión',
    backToHub: 'Todas las tareas',
    ctaTitle: 'Pruébalo en vez de creer solo nuestra palabra',
    ctaBody:
      'ClawAI dirige cada conversación al modelo que se ajusta a ella, entre todos los proveedores con los que se conecta, desde un único espacio de trabajo.',
    startFree: 'Empieza con el plan gratuito',
    seeFeatures: 'Descubre qué hace ClawAI',
    seePricing: 'Confirma el catálogo vigente en la página de precios',
  },
  hub: {
    seo: {
      title: 'Cómo elegir un modelo para tu tarea',
      description:
        'Qué importa realmente al elegir un modelo para programar, razonamiento complejo, redacción, investigación con fuentes o cargas privadas y locales — sin rankings ni puntuaciones inventadas.',
      keywords: [
        'elegir un modelo para una tarea',
        'qué modelo de IA se ajusta a mi tarea',
        'modelo para programar frente a redactar',
      ],
    },
    eyebrow: 'Ajuste de modelo',
    title: 'Cómo elegir un modelo para tu tarea',
    summary:
      'No existe un único modelo mejor: existe un modelo que se ajusta a una tarea concreta, y ese ajuste cambia según lo que la tarea necesite: cuán profundo debe ser el razonamiento, cuánto contexto tiene que retener, cuán sensible es el coste y si la solicitud debe permanecer en hardware que tú controlas. Este centro no clasifica modelos; recorre qué sopesar para cinco tipos de trabajo habituales y enlaza a las páginas de proveedores y a las guías de evaluación que te permiten comprobarlo por ti mismo.',
    topicsHeading: 'Elige una tarea',
    cardSummaries: {
      [ModelFitTask.CODING]: 'Qué importa cuando un modelo escribe o edita código.',
      [ModelFitTask.COMPLEX_REASONING]:
        'Problemas de varios pasos en los que el modelo debe razonar paso a paso.',
      [ModelFitTask.WRITING_AND_EDITING]:
        'Redacción extensa, edición y seguimiento de una guía de estilo.',
      [ModelFitTask.RESEARCH_WITH_SOURCES]:
        'Respuestas basadas en fuentes que el modelo consultó, no solo en sus datos de entrenamiento.',
      [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]:
        'Mantener una solicitud en hardware que controlas en lugar de un proveedor en la nube.',
    },
  },
  tasks: {
    [ModelFitTask.CODING]: {
      seo: {
        title: 'Cómo elegir un modelo para programar',
        description:
          'Qué sopesar al elegir un modelo para tareas de programación en ClawAI: seguimiento de instrucciones, ventana de contexto y coste por solicitud. Sin rankings ni puntuaciones inventadas. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'elegir un modelo para programar',
          'qué modelo usar para programar',
          'modelo de IA para programación',
        ],
      },
      eyebrow: 'Ajuste de modelo',
      title: 'Cómo elegir un modelo para programar',
      summary:
        'El trabajo de programación abarca un rango muy amplio —una corrección de una línea, una refactorización de varios archivos, una función construida desde cero— y el modelo que se ajusta cambia según el tamaño y la forma de ese trabajo. Esta página recorre qué sopesar en lugar de nombrar un único ganador; el enrutador de ClawAI ya puede encargarse de la mayor parte, o puedes elegir manualmente.',
      sections: [
        {
          id: 'what-coding-needs',
          heading: 'Qué necesita realmente una tarea de programación de un modelo',
          paragraphs: [
            'Las tareas de programación dependen de la capacidad de un modelo para seguir instrucciones detalladas y estructuradas, y mantener un cambio internamente coherente a lo largo de un archivo o de varios archivos, algo más cercano a una redacción cuidadosa y paso a paso que a una conversación abierta. Varios proveedores del catálogo de ClawAI publican modelos construidos específicamente para resolver un problema en pasos en lugar de responder de inmediato, lo cual encaja razonablemente con un cambio no trivial; una edición sencilla y bien especificada rara vez necesita eso.',
          ],
        },
        {
          id: 'context-and-cost',
          heading: 'Ventana de contexto y coste, no solo capacidad',
          paragraphs: [
            'Una base de código grande, o una tarea que necesita tener varios archivos abiertos a la vez, es antes que nada un problema de ventana de contexto: el modelo tiene que poder mantener a la vista el código relevante para razonar sobre él correctamente. La sensibilidad al coste también varía dentro de un mismo flujo de trabajo: una tarea de gran volumen, como generar código repetitivo o completados simples, es un lugar razonable para un modelo de menor coste, mientras que una refactorización cuidadosa sobre una ruta crítica es un lugar razonable para gastar más. Tratar toda solicitud de programación de la misma manera, sin importar su tamaño, suele ser el criterio equivocado por defecto.',
          ],
        },
        {
          id: 'how-clawai-routes-coding',
          heading: 'Cómo puede ClawAI enrutar una solicitud de programación',
          paragraphs: [
            'El enrutador de ClawAI puede enviar una solicitud de programación a un modelo adecuado de forma automática bajo el modo Auto o High Reasoning, o puedes fijar uno concreto en el modo Manual Model cuando sabes exactamente qué modelo necesita una tarea. Consulta la página de proveedores de modelos para ver cada familia de proveedores a la que ClawAI puede enrutar una solicitud, y confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto: la disponibilidad y los límites se aplican ahí, no en esta página.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es el mejor modelo para programar?',
          answer:
            'Esta página no va a nombrar uno: "el mejor" depende del tamaño y la forma de la tarea, y ningún benchmark fiable lo resuelve para todos los casos. Consulta cómo evaluar modelos de IA, enlazado más abajo, para un método repetible que puedes aplicar a tu propia carga de trabajo.',
        },
        {
          question: '¿ClawAI elige automáticamente un modelo distinto para tareas de programación?',
          answer:
            'Bajo el enrutado Auto o High Reasoning, el enrutador de ClawAI puede enviar una solicitud a un modelo que considera adecuado para la tarea, incluida la programación. También puedes fijar tú mismo un modelo concreto en el modo Manual Model.',
        },
        {
          question:
            '¿Un modelo centrado en razonamiento es siempre la opción correcta para programar?',
          answer:
            'No necesariamente: un cambio sencillo y bien especificado a menudo no necesita uno, mientras que una refactorización de varios pasos encaja de forma más natural. Confirma el catálogo vigente en la página de precios antes de elegir un plan en torno a un modelo concreto.',
        },
      ],
      productNote:
        'ClawAI puede enrutar una solicitud de programación a un modelo adecuado de forma automática, o puedes fijar uno directamente en el modo Manual Model: la elección es tuya, no está atada a un único proveedor.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFitTask.COMPLEX_REASONING]: {
      seo: {
        title: 'Cómo elegir un modelo para razonamiento complejo',
        description:
          'Qué sopesar al elegir un modelo para tareas de razonamiento de varios pasos en ClawAI: profundidad del razonamiento, modos de enrutado y cómo evaluar un modelo con tu propio problema. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'elegir un modelo para razonamiento',
          'modelo de IA para problemas complejos',
          'modelo de razonamiento de varios pasos',
        ],
      },
      eyebrow: 'Ajuste de modelo',
      title: 'Cómo elegir un modelo para razonamiento complejo',
      summary:
        'Una tarea de razonamiento complejo le pide a un modelo que trabaje a través de varios pasos —descomponer un problema, comprobar resultados intermedios, revisar antes de responder— en lugar de producir una respuesta a la primera. Esta página recorre qué cambia eso sobre el ajuste del modelo, sin nombrar un único ganador ni citar una puntuación de benchmark.',
      sections: [
        {
          id: 'what-reasoning-tasks-need',
          heading: 'Qué necesita una tarea de razonamiento de varios pasos',
          paragraphs: [
            'Varios proveedores del catálogo de ClawAI publican modelos construidos específicamente para resolver un problema paso a paso antes de dar una respuesta final, en lugar de responder de inmediato: un punto de partida razonable para una tarea con varios pasos dependientes, varias restricciones que satisfacer a la vez, o un resultado que necesita comprobarse antes de darse por definitivo. Una pregunta corta y de un solo paso rara vez se beneficia de ese tipo de modelo; el ajuste depende de la estructura de la tarea, no de una noción general de qué modelo es más fuerte.',
          ],
        },
        {
          id: 'high-reasoning-routing',
          heading: 'El modo de enrutado High Reasoning de ClawAI',
          paragraphs: [
            'High Reasoning es uno de los siete modos de enrutado de ClawAI, construido exactamente para este tipo de solicitud: el enrutador favorece un modelo adecuado para resolver un problema en pasos en lugar de responder de inmediato. El enrutado Auto también puede recurrir a uno de estos modelos cuando considera que una solicitud lo requiere; el modo Manual Model te permite fijar uno directamente si ya sabes qué modelo necesita una tarea recurrente.',
          ],
        },
        {
          id: 'evaluating-reasoning-models',
          heading: 'Comprobar por ti mismo el ajuste de razonamiento de un modelo',
          paragraphs: [
            'Ninguna página de este sitio publica una puntuación de benchmark, porque un número publicado rara vez refleja cómo se comporta un modelo con tu problema concreto: consulta cómo leer benchmarks de IA, enlazado más abajo, para saber qué te dice y qué no te dice una puntuación publicada. Cómo evaluar modelos de IA, también enlazado más abajo, recorre una forma repetible de comprobar un modelo frente a tus propias tareas de razonamiento.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuál es el mejor modelo para razonar?',
          answer:
            'Esta página no nombra uno: los modelos construidos para razonamiento de varios pasos varían según el proveedor, y hasta qué punto uno rinde bien en tu problema concreto merece comprobarse por ti mismo en lugar de tomarse de una puntuación publicada. Consulta cómo evaluar modelos de IA, enlazado más abajo.',
        },
        {
          question: '¿Qué hace el modo de enrutado High Reasoning de ClawAI?',
          answer:
            'Es uno de los siete modos de enrutado de ClawAI; cuando está seleccionado, el enrutador favorece un modelo adecuado para resolver un problema en pasos en lugar de responderlo de inmediato.',
        },
        {
          question: '¿Debería usar siempre un modelo centrado en razonamiento?',
          answer:
            'No: una pregunta corta y de un solo paso rara vez necesita uno, y los modelos centrados en razonamiento existen en todas las bandas de coste entre los proveedores de ClawAI. Confirma el catálogo vigente en la página de precios antes de elegir un plan en torno a un modelo concreto.',
        },
      ],
      productNote:
        'El modo de enrutado High Reasoning de ClawAI puede enviar una solicitud a un modelo adecuado para resolver un problema en pasos, o puedes fijar uno directamente en el modo Manual Model.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFitTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Cómo elegir un modelo para redacción y edición',
        description:
          'Qué sopesar al elegir un modelo para redactar, editar y escribir textos extensos en ClawAI: ventana de contexto, seguimiento de una guía de estilo y coste a lo largo de un flujo de trabajo. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'elegir un modelo para redactar',
          'modelo de IA para edición',
          'modelo para redacción extensa',
        ],
      },
      eyebrow: 'Ajuste de modelo',
      title: 'Cómo elegir un modelo para redacción y edición',
      summary:
        'La redacción y la edición cubren un rango muy amplio de tareas —una reescritura breve, un documento largo editado para que sea coherente, un borrador completo construido según una guía de estilo— y lo que un modelo necesita hacer bien cambia a lo largo de ese rango. Esta página recorre qué sopesar en lugar de nombrar un único modelo como la respuesta.',
      sections: [
        {
          id: 'what-writing-tasks-need',
          heading: 'Qué necesita una tarea de redacción o edición de un modelo',
          paragraphs: [
            'El trabajo de redacción cuidadosa depende de la capacidad de un modelo para seguir instrucciones detalladas y mantener un tono y una estructura coherentes a lo largo de todo un texto, algo más cercano a lo que varios proveedores describen como el punto fuerte de sus niveles de propósito general y superiores. Una reescritura breve o un solo párrafo rara vez necesitan el mismo modelo que un documento largo que debe mantenerse coherente de la primera a la última página.',
          ],
        },
        {
          id: 'context-window-for-long-documents',
          heading: 'La ventana de contexto importa en documentos largos',
          paragraphs: [
            'Editar un documento largo, o redactarlo siguiendo una guía de estilo extensa y material de referencia, es antes que nada un problema de ventana de contexto: el modelo tiene que poder mantener a la vista el documento completo, o gran parte de él, para conservar coherentes la terminología, el tono y la estructura. Consulta qué es una ventana de contexto, enlazado más abajo, para entender qué significa realmente ese límite y de dónde viene.',
          ],
        },
        {
          id: 'how-clawai-routes-writing',
          heading: 'Cómo puede ClawAI enrutar una solicitud de redacción',
          paragraphs: [
            'El enrutador de ClawAI puede enviar una solicitud de redacción o edición a un modelo adecuado de forma automática bajo el modo Auto o Cost Saver, o puedes fijar uno concreto en el modo Manual Model para una tarea recurrente con una guía de estilo conocida. Consulta la página de proveedores de modelos para ver cada familia de proveedores a la que ClawAI puede enrutar, y confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué modelo escribe mejor?',
          answer:
            'Esta página no va a nombrar uno: la calidad de la redacción la juzga de forma distinta cada lector y cada tarea, y ningún benchmark lo resuelve. Consulta cómo evaluar modelos de IA, enlazado más abajo, para un método que compruebe esto con tu propio material.',
        },
        {
          question: '¿Qué modelo debería usar para un documento largo?',
          answer:
            'Fíjate antes que nada en el tamaño de la ventana de contexto, ya que un documento largo tiene que caber a la vista para que el modelo se mantenga coherente a lo largo de él. Consulta qué es una ventana de contexto, enlazado más abajo, para saber cómo funciona ese límite.',
        },
        {
          question: '¿Puedo mantener el mismo modelo para una tarea de redacción recurrente?',
          answer:
            'Sí: fija uno en el modo Manual Model si una tarea recurrente tiene una guía de estilo conocida y quieres usar siempre el mismo modelo, en lugar de dejarlo al enrutado automático.',
        },
      ],
      productNote:
        'ClawAI puede enrutar una solicitud de redacción a un modelo adecuado de forma automática, o puedes fijar uno directamente en el modo Manual Model para una tarea recurrente con una guía de estilo conocida.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFitTask.RESEARCH_WITH_SOURCES]: {
      seo: {
        title: 'Cómo elegir un modelo para investigación con fuentes',
        description:
          'Cómo el modo Research de ClawAI basa una respuesta en fuentes que consultó, cómo se factura por separado del crédito de modelo, y qué sigue dependiendo del modelo que elijas. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'investigación con IA y fuentes',
          'respuestas de IA basadas en fuentes',
          'elegir un modelo para investigación',
        ],
      },
      eyebrow: 'Ajuste de modelo',
      title: 'Cómo elegir un modelo para investigación con fuentes',
      summary:
        'Una tarea de investigación pide una respuesta basada en fuentes que el modelo realmente consultó, no solo en lo que aprendió durante su entrenamiento. El modo Research de ClawAI es una función real, ya publicada, construida precisamente para esto; esta página explica qué hace, cómo se factura y qué sigue cambiando la elección de modelo una vez que hay fuentes de por medio.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Qué hace el modo Research de ClawAI',
          paragraphs: [
            'El modo Research permite que una solicitud busque en la web, obtenga una página, o la obtenga y extraiga contenido estructurado de ella, antes de que el modelo produzca una respuesta, de modo que la respuesta pueda citar fuentes que recuperó para esa pregunta concreta en lugar de basarse únicamente en lo que el modelo subyacente aprendió durante el entrenamiento. Es una función limitada por plan con tres niveles de profundidad: solo búsqueda, búsqueda más obtención de página, o búsqueda más obtención y extracción.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'La investigación se factura por separado, no del crédito de tu modelo',
          paragraphs: [
            'El acceso a Research se mide como un consumo propio —búsqueda web, obtención de páginas y extracción— separado del límite de tokens del que dispone un mensaje de chat. Afirmar que "la investigación consume tu crédito de modelo" sería incorrecto: ambas cosas se rastrean y se facturan por separado, y el límite de investigación de tu plan es una línea distinta de su límite de tokens de modelo.',
          ],
        },
        {
          id: 'what-the-model-still-changes',
          heading: 'Qué sigue cambiando el modelo subyacente',
          paragraphs: [
            'El modo Research cambia lo que el modelo puede ver antes de responder, no lo bien que razona sobre lo que recuperó: un modelo aún tiene que leer las fuentes obtenidas, sopesarlas entre sí y escribir una respuesta que las refleje con precisión. Aplican aquí las mismas consideraciones que en las tareas de razonamiento complejo: un modelo construido para resolver varios pasos encaja razonablemente con conciliar varias fuentes, y eso conviene comprobarlo con tu propio material en lugar de darlo por hecho.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La investigación consume mi crédito de modelo?',
          answer:
            'No. El acceso a Research —búsqueda web, obtención de páginas y extracción— se mide por separado del límite de tokens del que dispone un mensaje de chat. Confirma ambos límites en la página de precios.',
        },
        {
          question: '¿Cuál es la diferencia entre las tres profundidades del modo Research?',
          answer:
            'Solo búsqueda devuelve resultados de una búsqueda web; búsqueda más obtención de página también recupera el contenido de la página; búsqueda más obtención y extracción además extrae contenido estructurado de lo que obtuvo. Cuál se usa en una solicitud depende de cómo esté configurada.',
        },
        {
          question: '¿Importa el modelo que elija si el modo Research está activado?',
          answer:
            'Sí: el modo Research cambia qué fuentes puede ver el modelo, no lo bien que las lee y las concilia. Consulta cómo evaluar modelos de IA, enlazado más abajo, para saber cómo comprobar esto con tu propia carga de trabajo.',
        },
      ],
      productNote:
        'El modo Research de ClawAI puede buscar, obtener y obtener-y-extraer de la web antes de que un modelo responda: una función real, ya publicada, medida por separado de tu crédito de tokens de modelo.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]: {
      seo: {
        title: 'Cómo elegir un modelo para cargas privadas y locales',
        description:
          'Qué cambia cuando una solicitud permanece en hardware que controlas en lugar de un proveedor en la nube, y cómo encajan los modos de enrutado Local-Only y Privacy-First de ClawAI en cargas privadas. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'cargas de trabajo de IA privadas',
          'elección de modelo de IA local',
          'ejecutar modelos de IA en tu propio hardware',
        ],
      },
      eyebrow: 'Ajuste de modelo',
      title: 'Cómo elegir un modelo para cargas privadas y locales',
      summary:
        'Una carga privada o local se define por dónde se ejecuta la solicitud, no por qué tipo de tarea es: el requisito es que permanezca en hardware que tú controlas en lugar de llegar a un proveedor en la nube. ClawAI cuenta con adaptadores reales a Ollama y llama.cpp precisamente para esto, además de modos de enrutado que mantienen una solicitud en local por defecto.',
      sections: [
        {
          id: 'what-changes-locally',
          heading: 'Qué cambia realmente al ejecutar un modelo en local',
          paragraphs: [
            'Un proveedor en la nube, en otra parte del catálogo de ClawAI, ejecuta un modelo en su propia infraestructura y cobra por solicitud; Ollama y llama.cpp, en cambio, cargan un modelo de pesos abiertos en hardware que tú controlas, de modo que la solicitud nunca sale de él. Eso cambia quién puede ver la solicitud, no la capacidad de ningún modelo en concreto: consulta IA local, en la página de proveedores de modelos, para el mecanismo completo en lugar de repetirlo aquí.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Los modos de enrutado Local-Only y Privacy-First de ClawAI',
          paragraphs: [
            'El enrutado Local-Only mantiene toda solicitud en hardware que tú controlas, usando Ollama o llama.cpp en lugar de cualquier proveedor en la nube. Privacy-First es un modo distinto con sus propias prioridades; ambos existen precisamente porque no toda carga de trabajo debería recurrir por defecto al enrutado Auto. Elegir entre ellos, o fijar un modelo local concreto en el modo Manual Model, es una decisión de carga de trabajo que conviene tomar de forma deliberada y no dejar a un criterio genérico por defecto.',
          ],
        },
        {
          id: 'choosing-which-open-weight-model',
          heading: 'Elegir qué modelo de pesos abiertos ejecutar',
          paragraphs: [
            'Esta página deliberadamente no nombra ningún modelo de pesos abiertos concreto, por la misma razón que tampoco lo hace la página del proveedor de IA local: el campo avanza más rápido de lo que una página estática puede seguir, y una recomendación desactualizada es peor que ninguna. Consulta qué es la IA local-first, enlazado más abajo, para pensar en la disyuntiva entre un modelo de pesos abiertos que ejecutas tú mismo y un proveedor en la nube.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué modelo de pesos abiertos debería ejecutar para una carga privada?',
          answer:
            'Esta página no recomienda ninguno: consulta qué es la IA local-first, enlazado más abajo, para pensar en la elección, ya que el modelo adecuado depende de tu hardware y tu tarea de una forma que una página estática no puede seguir de manera responsable.',
        },
        {
          question: '¿Cuál es la diferencia entre el enrutado Local-Only y Privacy-First?',
          answer:
            'Local-Only mantiene toda solicitud en hardware que tú controlas mediante Ollama o llama.cpp; Privacy-First es un modo de enrutado distinto con sus propias prioridades. Ambos existen porque no toda carga de trabajo debería recurrir por defecto al enrutado Auto.',
        },
        {
          question: '¿Ejecutar un modelo en local tiene algún coste a través de ClawAI?',
          answer:
            'ClawAI no cobra una tarifa por token por un modelo ejecutado en local como sí hace con un proveedor en la nube, ya que no hay ningún proveedor en la nube al que facturar: el coste es el hardware que ya utilizas para ejecutarlo. Confirma el comportamiento actual del plan en la página de precios.',
        },
      ],
      productNote:
        'El modo de enrutado Local-Only de ClawAI mantiene toda solicitud en hardware que tú controlas mediante Ollama o llama.cpp: un conector real, ya publicado, no un elemento en la hoja de ruta.',
      catalogDisclaimer:
        'Aquí no se nombra ningún modelo concreto de forma deliberada: los modelos de pesos abiertos y sus capacidades cambian con rapidez, y eres tú quien elige cuáles ejecutar. Confirma el comportamiento del plan para cargas locales en la página de precios.',
    },
  },
};
