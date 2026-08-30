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
