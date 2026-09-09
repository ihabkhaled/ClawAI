import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const ES_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'A dónde ir después',
    lastReviewed: 'Última revisión',
    backToHub: 'Todos los pares',
    ctaTitle: 'Pruébalo en vez de creer solo nuestra palabra',
    ctaBody:
      'ClawAI dirige cada conversación al modelo que se ajusta a ella, entre todos los proveedores con los que se conecta, desde un único espacio de trabajo.',
    startFree: 'Empieza con el plan gratuito',
    seeFeatures: 'Descubre qué hace ClawAI',
    seePricing: 'Confirma el catálogo vigente en la página de precios',
  },
  hub: {
    seo: {
      title: 'Cómo enruta ClawAI entre familias de modelos',
      description:
        'Cómo elige el propio enrutador de ClawAI entre dos familias de proveedores para una solicitud concreta: clase de coste, necesidades de contexto y si una solicitud debe permanecer en local. Sin rankings entre productos concretos ni benchmarks inventados.',
      keywords: [
        'cómo enruta ClawAI entre proveedores de modelos',
        'elegir entre familias de modelos de IA',
        'enrutado OpenAI vs Anthropic vs Google',
      ],
    },
    eyebrow: 'Enrutado de modelos',
    title: 'Cómo enruta ClawAI entre familias de modelos',
    summary:
      'Este centro no clasifica a OpenAI, Anthropic, Google, DeepSeek ni xAI unos frente a otros: esa es una pregunta distinta de la que realmente responde el enrutador de ClawAI. Lo que hace el enrutador es elegir, para una solicitud concreta, a qué familia la envía, sopesando la clase de coste, cuánto contexto necesita la solicitud, si la carga de trabajo tiene que permanecer en hardware que tú controlas y qué modo de enrutado has seleccionado. Cada página de abajo explica esa elección para un par de familias, apoyándose en los propios modos de enrutado de ClawAI y en las bandas de coste cualitativas de su catálogo de modelos, nunca en una puntuación de benchmark.',
    pairsHeading: 'Elige un par',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        'Cómo sopesa el enrutador una solicitud entre los catálogos de OpenAI y Anthropic.',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]:
        'Cómo sopesa el enrutador una solicitud entre los catálogos de OpenAI y Google.',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        'Cómo sopesa el enrutador una solicitud entre los catálogos de Anthropic y Google.',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        'Cómo cambia la clase de coste la elección del enrutador entre OpenAI y DeepSeek.',
      [ModelFamilyPair.OPENAI_VS_XAI]:
        'Cómo sopesa el enrutador una solicitud entre los catálogos de OpenAI y xAI.',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        'Qué cambia cuando una solicitud debe permanecer en hardware que tú controlas en lugar de cualquier proveedor en la nube.',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI vs Anthropic: cómo enruta ClawAI entre ellos',
        description:
          'Cómo elige el enrutador de ClawAI entre los catálogos de modelos de OpenAI y Anthropic para una solicitud concreta: clase de coste, ajuste con el modo de razonamiento y fijación manual. Sin ganador declarado. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'OpenAI vs Anthropic',
          'enrutador de ClawAI OpenAI Anthropic',
          'elegir entre modelos de OpenAI y Claude',
        ],
      },
      eyebrow: 'Enrutado de modelos',
      title: 'OpenAI vs Anthropic: cómo enruta ClawAI entre ellos',
      summary:
        'OpenAI y Anthropic publican ambos catálogos que abarcan varias clases de coste, desde modelos baratos y rápidos de responder hasta niveles premium y máximos construidos para problemas más difíciles. Esta página no clasifica a una familia por encima de la otra: explica qué sopesa realmente el enrutador de ClawAI cuando una solicitud podría ir razonablemente a cualquiera de las dos, y cómo puedes anular esa elección tú mismo.',
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading: 'La clase de coste abarca ambos catálogos, no un nivel por proveedor',
          paragraphs: [
            'El catálogo de modelos de ClawAI etiqueta cada modelo incluido con una clase de coste cualitativa —económica, estándar, premium o máxima— en lugar de un precio exacto. El catálogo de OpenAI abarca desde económica hasta premium; el de Anthropic abarca desde estándar hasta el nivel máximo. Ningún proveedor posee en exclusiva el extremo barato ni el caro, así que una decisión de enrutado basada en el coste tiene que fijarse en los modelos concretos disponibles en ambos catálogos, no asumir que un proveedor es uniformemente más barato.',
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: 'Los modos de enrutado que afectan a este par',
          paragraphs: [
            'Bajo el enrutado Auto, el enrutador de ClawAI puede enviar una solicitud a un modelo de cualquiera de los dos catálogos según lo que necesite la solicitud. El enrutado High Reasoning favorece un modelo construido para resolver un problema en pasos, y tanto OpenAI como Anthropic publican modelos con esa forma; el enrutado Cost Saver favorece un modelo de clase de coste inferior, que de nuevo existe en ambos catálogos. El modo Manual Model te permite fijar directamente un modelo concreto de cualquiera de los dos proveedores, la anulación deliberada para una tarea recurrente en la que ya sabes cuál encaja.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Lo que esta página no afirma',
          paragraphs: [
            'Ninguna página de este sitio publica una puntuación de benchmark ni una afirmación de velocidad comparando a estos dos proveedores, y esta no es la primera en hacerlo. Consulta cómo leer benchmarks de IA y cómo evaluar modelos de IA, enlazados más abajo, para comprobar el ajuste frente a tu propia carga de trabajo en lugar de tomar un ranking de cualquier lado, incluida esta página.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Es mejor OpenAI o Anthropic?',
          answer:
            'Esta página no lo va a decir: ambos publican modelos en varias clases de coste y casos de uso, y ningún benchmark fiable lo resuelve para todas las tareas. Consulta cómo evaluar modelos de IA, enlazado más abajo, para un método que puedas aplicar a tu propia carga de trabajo.',
        },
        {
          question: '¿El enrutador de ClawAI elige automáticamente entre OpenAI y Anthropic?',
          answer:
            'Bajo el enrutado Auto, High Reasoning o Cost Saver, sí: el enrutador puede enviar una solicitud a un modelo de cualquiera de los dos catálogos según lo que necesite. También puedes fijar un modelo concreto de cualquiera de los dos proveedores en el modo Manual Model.',
        },
        {
          question: '¿Puedo usar modelos de OpenAI y de Anthropic en el mismo espacio de trabajo?',
          answer:
            'Sí: ClawAI se conecta a ambos como proveedores independientes, y el enrutado Auto puede recurrir a cualquiera de los dos según la solicitud, o puedes fijar un modelo concreto de cada uno para distintas tareas en el modo Manual Model.',
        },
      ],
      productNote:
        'El enrutado Auto y High Reasoning de ClawAI puede recurrir tanto al catálogo de OpenAI como al de Anthropic para una solicitud concreta, o puedes fijar uno directamente en el modo Manual Model.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI vs Google: cómo enruta ClawAI entre ellos',
        description:
          'Cómo elige el enrutador de ClawAI entre los catálogos de modelos de OpenAI y Google para una solicitud concreta: clase de coste, necesidades de contexto y fijación manual. Sin ganador declarado. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'OpenAI vs Google Gemini',
          'enrutador de ClawAI OpenAI Google',
          'elegir entre modelos de OpenAI y Gemini',
        ],
      },
      eyebrow: 'Enrutado de modelos',
      title: 'OpenAI vs Google: cómo enruta ClawAI entre ellos',
      summary:
        'OpenAI y Google Gemini publican ambos catálogos que abarcan desde modelos baratos y rápidos de responder hasta niveles premium. Esta página no nombra un ganador: explica qué sopesa el enrutador de ClawAI cuando una solicitud podría ir razonablemente a cualquiera de las dos familias, y cómo anular esa elección.',
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: 'Clase de coste y forma del catálogo',
          paragraphs: [
            'El catálogo incluido de OpenAI abarca desde económica hasta premium; el catálogo Gemini de Google también abarca desde económica hasta premium, con un nivel barato propio. Una decisión de enrutado que sopesa la clase de coste tiene que fijarse en el modelo concreto de cada familia que encaja con el presupuesto de la solicitud, ya que ambos proveedores publican un rango en lugar de un único precio fijo.',
          ],
        },
        {
          id: 'context-window-considerations',
          heading: 'La ventana de contexto es una propiedad por modelo, no por proveedor',
          paragraphs: [
            'Cuánto puede mantener un modelo a la vista de una vez varía según el modelo concreto elegido, no según cuál de estos dos proveedores lo publique. Consulta qué es una ventana de contexto, enlazado más abajo, para saber qué significa ese límite y por qué una solicitud que necesita razonar sobre un documento extenso o un historial de conversación largo debería comprobarlo directamente en lugar de asumir que los modelos de un proveedor son uniformemente más grandes.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Cómo enruta ClawAI una solicitud entre ellos',
          paragraphs: [
            'Bajo el enrutado Auto, el enrutador de ClawAI puede enviar una solicitud a un modelo adecuado de cualquiera de los dos catálogos. El enrutado Cost Saver favorece un modelo de clase de coste inferior sin importar de cuál de estos dos proveedores provenga. El modo Manual Model te permite fijar directamente un modelo concreto de OpenAI o de Google para una tarea recurrente cuyo ajuste ya conoces.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Es mejor OpenAI o Google Gemini?',
          answer:
            'Esta página no lo dice: ambos publican modelos en varias clases de coste, y el ajuste depende de la tarea. Consulta cómo evaluar modelos de IA, enlazado más abajo, para una forma repetible de comprobarlo frente a tu propia carga de trabajo.',
        },
        {
          question: '¿ClawAI enruta automáticamente entre modelos de OpenAI y de Google?',
          answer:
            'Bajo el enrutado Auto o Cost Saver, el enrutador puede enviar una solicitud a un modelo adecuado de cualquiera de los dos catálogos. También puedes fijar un modelo concreto de cualquiera de los dos proveedores en el modo Manual Model.',
        },
        {
          question: '¿Qué proveedor tiene la ventana de contexto más grande?',
          answer:
            'Eso varía según el modelo concreto, no de forma uniforme por proveedor. Consulta qué es una ventana de contexto, enlazado más abajo, para saber cómo comprobar el límite de un modelo dado antes de confiar en él para un documento extenso o una conversación larga.',
        },
      ],
      productNote:
        'El enrutado Auto y Cost Saver de ClawAI puede recurrir tanto al catálogo de OpenAI como al de Google para una solicitud concreta, o puedes fijar uno directamente en el modo Manual Model.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic vs Google: cómo enruta ClawAI entre ellos',
        description:
          'Cómo elige el enrutador de ClawAI entre los catálogos de modelos de Anthropic y Google para una solicitud concreta: clase de coste, ajuste con el modo de razonamiento y fijación manual. Sin ganador declarado. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'Anthropic vs Google Gemini',
          'enrutador de ClawAI Anthropic Google',
          'elegir entre modelos de Claude y Gemini',
        ],
      },
      eyebrow: 'Enrutado de modelos',
      title: 'Anthropic vs Google: cómo enruta ClawAI entre ellos',
      summary:
        'El catálogo de Anthropic va de estándar hasta el nivel de coste más alto; el catálogo Gemini de Google abarca desde económica hasta premium. Esta página explica qué significa esa diferencia de forma para cómo elige el enrutador de ClawAI entre ellos, no cuál de los dos es mejor.',
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: 'Los dos catálogos cubren partes distintas del rango de coste',
          paragraphs: [
            'Los modelos incluidos de Anthropic se sitúan en las clases de coste estándar, premium y máxima, sin ninguna entrada de nivel económico por ahora; el catálogo Gemini de Google llega hasta un nivel económico. Esa diferencia de forma, no un juicio de capacidad, es un factor más que sopesa una decisión de enrutado sensible al coste cuando una solicitud tiene un presupuesto ajustado frente a otra en la que el coste importa menos.',
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: 'Ambos catálogos incluyen modelos centrados en razonamiento',
          paragraphs: [
            'Tanto Anthropic como Google publican al menos un modelo en su catálogo orientado a resolver un problema en pasos en lugar de responder de inmediato. El modo de enrutado High Reasoning de ClawAI puede favorecer un modelo adecuado de cualquiera de las dos familias para ese tipo de solicitud; cuál elige exactamente depende de la disponibilidad y de las demás necesidades de la solicitud, no de una preferencia fija por un proveedor.',
          ],
        },
        {
          id: 'overriding-the-router',
          heading: 'Anular el enrutador tú mismo',
          paragraphs: [
            'El modo Manual Model te permite fijar directamente un modelo concreto de Anthropic o de Google, la elección adecuada para una tarea recurrente en la que ya sabes cuál encaja —un flujo de trabajo documentado, un estilo conocido, una integración concreta— en lugar de dejarlo cada vez al enrutado automático.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Es mejor Anthropic o Google Gemini?',
          answer:
            'Esta página no nombra uno: los dos catálogos cubren partes distintas del rango de coste y ambos incluyen modelos centrados en razonamiento. Consulta cómo evaluar modelos de IA, enlazado más abajo, para comprobar el ajuste frente a tu propia carga de trabajo.',
        },
        {
          question: '¿El modo High Reasoning de ClawAI favorece a uno de estos proveedores?',
          answer:
            'Sin preferencia fija: el enrutado High Reasoning puede favorecer un modelo adecuado de cualquiera de los dos catálogos según la disponibilidad y las necesidades de la solicitud.',
        },
        {
          question:
            '¿Puedo fijar un modelo de Claude o de Gemini para una tarea recurrente concreta?',
          answer:
            'Sí: el modo Manual Model te permite fijar directamente un modelo concreto de cualquiera de los dos proveedores, una elección razonable una vez que conoces el ajuste de una tarea en lugar de confiar cada vez en el enrutado automático.',
        },
      ],
      productNote:
        'El enrutado High Reasoning de ClawAI puede favorecer un modelo adecuado tanto del catálogo de Anthropic como del de Google, o puedes fijar uno directamente en el modo Manual Model.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI vs DeepSeek: cómo enruta ClawAI entre ellos',
        description:
          'Cómo cambia la clase de coste el enrutador de ClawAI entre los catálogos de OpenAI y DeepSeek, y cómo encajan el enrutado Cost Saver y el modo Manual Model en este par. Sin ganador declarado. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'OpenAI vs DeepSeek',
          'enrutador de ClawAI OpenAI DeepSeek',
          'alternativa de IA más barata a OpenAI',
        ],
      },
      eyebrow: 'Enrutado de modelos',
      title: 'OpenAI vs DeepSeek: cómo enruta ClawAI entre ellos',
      summary:
        'El catálogo de OpenAI abarca desde económica hasta premium; los modelos incluidos de DeepSeek se sitúan en la clase de coste estándar. Esta página recorre qué significa esa diferencia de clase de coste para enrutar una solicitud entre los dos, sin declarar a ninguno el proveedor mejor.',
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading: 'La clase de coste es la diferencia más clara entre estos dos catálogos',
          paragraphs: [
            'Los dos modelos incluidos de DeepSeek —un modelo de chat general y un modelo centrado en razonamiento— se sitúan ambos en la clase de coste estándar de ClawAI. El catálogo de OpenAI abarca un rango más amplio, desde un nivel económico hasta premium. Para una solicitud sensible al coste, eso convierte al catálogo de DeepSeek en un punto de partida razonable, aunque los propios modelos de nivel económico de OpenAI se sitúan en la misma clase de coste y también merece la pena sopesarlos: la comparación es entre clases de coste, no entre proveedores en su conjunto.',
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'El modo de enrutado Cost Saver de ClawAI',
          paragraphs: [
            'Cost Saver es uno de los siete modos de enrutado de ClawAI, construido para favorecer un modelo de clase de coste inferior cuando una solicitud no necesita uno premium. Puede recurrir a cualquiera de los dos catálogos según qué modelo encaje realmente con la solicitud en esa clase de coste, en lugar de recurrir por defecto a un proveedor concreto.',
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: 'Existe una opción centrada en razonamiento en ambos catálogos',
          paragraphs: [
            'DeepSeek publica un modelo construido específicamente para resolver un problema en pasos, en la misma clase de coste estándar que su modelo de chat general; OpenAI publica modelos centrados en razonamiento en sus niveles estándar y premium. El enrutado High Reasoning puede recurrir a cualquiera de los dos, y cuál encaja con una tarea concreta de varios pasos merece comprobarse directamente en lugar de asumirlo solo por la clase de coste.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Es DeepSeek una alternativa más barata a OpenAI?',
          answer:
            'Los modelos incluidos de DeepSeek se sitúan en la clase de coste estándar de ClawAI, y OpenAI también publica modelos de nivel económico y estándar: así que la comparación justa es por clase de coste, no por proveedor. Confirma el precio vigente de cualquier modelo concreto en la página de precios.',
        },
        {
          question: '¿El modo Cost Saver de ClawAI prefiere a DeepSeek?',
          answer:
            'Sin preferencia fija: el enrutado Cost Saver favorece cualquier modelo disponible que encaje con una clase de coste inferior para la solicitud, de cualquiera de los dos catálogos.',
        },
        {
          question: '¿DeepSeek tiene un modelo centrado en razonamiento como el de OpenAI?',
          answer:
            'Sí: DeepSeek publica un modelo construido para resolver un problema en pasos, en la misma clase de coste que su modelo de chat general. OpenAI también publica modelos centrados en razonamiento, en un rango de coste más amplio.',
        },
      ],
      productNote:
        'El enrutado Cost Saver de ClawAI puede favorecer un modelo de clase de coste inferior tanto del catálogo de OpenAI como del de DeepSeek, o puedes fijar uno directamente en el modo Manual Model.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI vs xAI: cómo enruta ClawAI entre ellos',
        description:
          'Cómo elige el enrutador de ClawAI entre los catálogos de OpenAI y Grok de xAI para una solicitud concreta: clase de coste y fijación manual. Sin ganador declarado. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'OpenAI vs xAI Grok',
          'enrutador de ClawAI OpenAI xAI',
          'elegir entre modelos de GPT y Grok',
        ],
      },
      eyebrow: 'Enrutado de modelos',
      title: 'OpenAI vs xAI: cómo enruta ClawAI entre ellos',
      summary:
        'El catálogo de OpenAI abarca desde económica hasta premium; el catálogo Grok de xAI en ClawAI también abarca desde económica hasta premium, con menos modelos incluidos en total. Esta página explica qué sopesa el enrutador de ClawAI entre los dos, sin nombrar a ninguno el proveedor mejor.',
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: 'Un catálogo más pequeño no significa un rango de coste más estrecho',
          paragraphs: [
            'El catálogo incluido de xAI en ClawAI es más pequeño que el de OpenAI —dos modelos frente a los seis de OpenAI— pero aun así abarca un modelo de nivel económico y otro premium, el mismo rango de clase de coste que cubre el propio catálogo de OpenAI en sus extremos. Una decisión de enrutado entre ellos sopesa la clase de coste del modelo concreto frente al presupuesto de la solicitud, no el tamaño del catálogo de cada proveedor.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Cómo enruta ClawAI una solicitud entre ellos',
          paragraphs: [
            'Bajo el enrutado Auto, el enrutador de ClawAI puede enviar una solicitud a un modelo adecuado de cualquiera de los dos catálogos. El enrutado Cost Saver favorece la opción de clase de coste inferior sin importar el proveedor. El modo Manual Model te permite fijar directamente un modelo concreto de OpenAI o de xAI si ya sabes cuál necesita una tarea.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Lo que esta página no afirma',
          paragraphs: [
            'Esta página no hace ninguna afirmación de velocidad ni clasificación de capacidad entre estos dos proveedores: ninguna página de este sitio lo hace. Consulta cómo evaluar modelos de IA, enlazado más abajo, para un método con el que comprobar el ajuste frente a tu propia carga de trabajo.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Es mejor OpenAI o xAI Grok?',
          answer:
            'Esta página no lo dice: ambos publican modelos en un rango de clase de coste similar, y ningún benchmark fiable resuelve el ajuste para todas las tareas. Consulta cómo evaluar modelos de IA, enlazado más abajo.',
        },
        {
          question: '¿ClawAI enruta automáticamente entre modelos de OpenAI y de xAI?',
          answer:
            'Bajo el enrutado Auto o Cost Saver, sí: el enrutador puede enviar una solicitud a un modelo adecuado de cualquiera de los dos catálogos. También puedes fijar un modelo concreto de cualquiera de los dos proveedores en el modo Manual Model.',
        },
        {
          question: '¿xAI tiene tantos modelos en el catálogo de ClawAI como OpenAI?',
          answer:
            'No: el catálogo incluido de xAI es más pequeño, dos modelos frente a los seis de OpenAI, aunque abarca un rango de clase de coste similar. Confirma el catálogo vigente en la página de precios.',
        },
      ],
      productNote:
        'El enrutado Auto y Cost Saver de ClawAI puede recurrir tanto al catálogo de OpenAI como al de xAI para una solicitud concreta, o puedes fijar uno directamente en el modo Manual Model.',
      catalogDisclaimer:
        'La disponibilidad de modelos y los límites los aplica tu plan y el catálogo vigente, no esta página. Confirma el catálogo vigente en la página de precios antes de elegir un plan construido en torno a un modelo concreto.',
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: 'Nube vs local: cómo enruta ClawAI entre ellos',
        description:
          'Qué cambia cuando una solicitud permanece en hardware que controlas en lugar de un proveedor en la nube, y cómo encajan los modos de enrutado Local-Only y Privacy-First de ClawAI en esa elección. Sin ganador declarado. Confirma el catálogo vigente antes de elegir un plan.',
        keywords: [
          'IA en la nube vs IA local',
          'enrutado Local-Only de ClawAI',
          'cuándo ejecutar un modelo en local en vez de en la nube',
        ],
      },
      eyebrow: 'Enrutado de modelos',
      title: 'Nube vs local: cómo enruta ClawAI entre ellos',
      summary:
        'Este es el único par de este conjunto definido por dónde se ejecuta una solicitud, no por qué proveedor responde. Cada familia en la nube a la que se conecta ClawAI —OpenAI, Anthropic, Google, DeepSeek, xAI— ejecuta un modelo en su propia infraestructura; Ollama y llama.cpp, en cambio, ejecutan un modelo de pesos abiertos en hardware que tú controlas. Esta página explica qué cambia eso y cómo trata el enrutador de ClawAI esa elección, dado el diseño local-first propio de ClawAI.',
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: 'Qué cambia realmente cuando una solicitud permanece en local',
          paragraphs: [
            'Un proveedor en la nube ejecuta un modelo en su propia infraestructura y cobra por solicitud; Ollama y llama.cpp, en cambio, cargan un modelo de pesos abiertos en hardware que tú controlas, de modo que la solicitud nunca llega a ningún proveedor en la nube. Eso cambia quién puede ver la solicitud, no la capacidad de ningún modelo en concreto: consulta IA local, en la página de proveedores de modelos, para el mecanismo completo.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading:
            'Los modos de enrutado Local-Only y Privacy-First de ClawAI existen para esta elección',
          paragraphs: [
            'El enrutado Local-Only mantiene toda solicitud en hardware que tú controlas mediante Ollama o llama.cpp, sin llegar nunca a ninguna de las cinco familias en la nube que cubre este conjunto. Privacy-First es un modo distinto con sus propias prioridades. Ambos existen precisamente porque no toda carga de trabajo debería recurrir por defecto al enrutado Auto, que puede alcanzar cualquier proveedor conectado, en la nube o en local, según la solicitud.',
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: 'Cuándo una carga de trabajo es candidata a permanecer en local',
          paragraphs: [
            'Una solicitud es una candidata razonable para el enrutado Local-Only o Privacy-First cuando el requisito es que nunca salga de hardware que tú controlas —un límite de cumplimiento normativo, un requisito de confidencialidad con un cliente, o simplemente la preferencia de no enviar ciertos datos a ningún proveedor externo. Consulta qué es la IA local-first, enlazado más abajo, para pensar en la disyuntiva entre un modelo de pesos abiertos que ejecutas tú mismo y el catálogo de un proveedor en la nube.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Es un modelo local tan capaz como uno en la nube?',
          answer:
            'Esta página no los clasifica: la capacidad depende del modelo de pesos abiertos concreto que elijas ejecutar, lo cual es decisión tuya, no una comparación fija que esta página pueda hacer de forma responsable. Consulta qué es la IA local-first, enlazado más abajo.',
        },
        {
          question: '¿Cómo decide ClawAI si mantener una solicitud en local?',
          answer:
            'No lo decide por ti por defecto: el enrutado Local-Only mantiene toda solicitud en hardware que tú controlas, y el enrutado Privacy-First aplica sus propias prioridades; el enrutado Auto puede alcanzar cualquier proveedor conectado, en la nube o en local. Tú eliges qué modo usa un espacio de trabajo o una solicitud.',
        },
        {
          question: '¿Ejecutar un modelo en local cuesta algo a través de ClawAI?',
          answer:
            'ClawAI no cobra una tarifa por token por un modelo ejecutado en local como sí hace con un proveedor en la nube, ya que no hay ningún proveedor en la nube al que facturar: el coste es el hardware que ya utilizas para ejecutarlo. Confirma el comportamiento actual del plan en la página de precios.',
        },
      ],
      productNote:
        'El modo de enrutado Local-Only de ClawAI mantiene toda solicitud en hardware que tú controlas mediante Ollama o llama.cpp —un conector real, ya publicado, no un elemento en la hoja de ruta— junto al enrutado Privacy-First para un conjunto distinto de prioridades.',
      catalogDisclaimer:
        'Aquí no se clasifica ningún modelo concreto en la nube ni en local de forma deliberada: los modelos de pesos abiertos y todos los catálogos en la nube cambian con su propio calendario, y eres tú quien elige cuál ejecutar o conectar. Confirma el comportamiento del plan para cargas locales en la página de precios.',
    },
  },
};
