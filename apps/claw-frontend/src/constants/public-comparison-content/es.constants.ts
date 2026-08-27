import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const ES_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'En esta página',
    atAGlance: 'De un vistazo',
    tableCaption: 'ClawAI y {rival} comparados, capacidad por capacidad',
    capabilityColumn: 'Capacidad',
    clawColumn: 'ClawAI',
    strengthTitle: 'En qué destaca {rival}',
    differenceTitle: 'En qué funciona distinto ClawAI',
    chooseTitle: 'Cuál elegir',
    chooseRivalLabel: 'Elige {rival} si',
    chooseClawLabel: 'Elige ClawAI si',
    faqTitle: 'Preguntas frecuentes',
    lastReviewed: 'Comparado con información pública, última revisión',
    independence:
      'ClawAI es un producto independiente. No está afiliado a ninguno de los asistentes mencionados en esta página, no cuenta con su respaldo ni los revende. Cada afirmación procede de la documentación pública de cada proveedor en la fecha indicada arriba, y estos productos cambian rápido: consulta las páginas del proveedor antes de decidir.',
    otherComparisons: 'Comparar ClawAI con otro asistente',
    startFree: 'Empieza con el plan gratuito',
    seePricing: 'Ver precios',
  },
  hub: {
    eyebrow: 'Comparativas',
    intro:
      'ClawAI no intenta ser un asistente único mejor. Pone nueve familias de modelos punteros bajo una sola suscripción y envía cada mensaje al que mejor encaja. Estas páginas lo contrastan con los asistentes que la gente ya usa, siempre sobre las mismas ocho capacidades.',
    cardsTitle: 'Elige un asistente para comparar',
    cardCta: 'Comparar con {rival}',
    coversTitle: 'Qué cubre cada comparativa',
    coversBody:
      'Las mismas ocho capacidades, en el mismo orden, en cada página: elección de modelos, enrutado, respuestas en paralelo, modelos locales, autoalojamiento, memoria y archivos, conectores y registro de uso por respuesta. Las mismas preguntas para todos, para poder leer dos páginas una al lado de la otra.',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'Elección de modelos',
    [ComparisonDimension.ROUTING]: 'Enrutado',
    [ComparisonDimension.SIDE_BY_SIDE]: 'Respuestas en paralelo',
    [ComparisonDimension.LOCAL_MODELS]: 'Modelos locales y de pesos abiertos',
    [ComparisonDimension.SELF_HOSTING]: 'Autoalojamiento',
    [ComparisonDimension.MEMORY_AND_FILES]: 'Memoria y archivos',
    [ComparisonDimension.CONNECTORS]: 'Conectores de trabajo',
    [ComparisonDimension.RECEIPTS]: 'Registro de uso',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]:
      'Nueve familias de modelos punteros bajo una sola suscripción',
    [ComparisonDimension.ROUTING]: 'Cinco modos de enrutado, incluido el automático por mensaje',
    [ComparisonDimension.SIDE_BY_SIDE]:
      'Un mismo prompt a varios modelos a la vez, respuestas en paralelo',
    [ComparisonDimension.LOCAL_MODELS]:
      'Modelos de pesos abiertos en tu propia GPU, con Ollama o llama.cpp',
    [ComparisonDimension.SELF_HOSTING]: 'Toda la pila corre en tus servidores, código en GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'Memoria que persiste entre conversaciones, más contexto de archivos',
    [ComparisonDimension.CONNECTORS]: 'Doce conectores de trabajo',
    [ComparisonDimension.RECEIPTS]:
      'Cada respuesta registra su modelo, su coste y el saldo consumido',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI vs ChatGPT',
      intro:
        'ChatGPT es el asistente en el que casi todo el mundo piensa al decir «IA»: pulido, rápido y apoyado en los modelos punteros de OpenAI. ClawAI tiene otra forma: una suscripción que alcanza los modelos de OpenAI junto a otras ocho familias y envía cada mensaje al que mejor encaja.',
      theirStrength:
        'Un único producto extremadamente bien hecho. Voz, generación de imágenes, ejecución de código e investigación profunda vienen integradas y funcionan juntas, las apps móviles son excelentes y el modelo de debajo es puntero, no un compromiso.',
      ourDifference:
        'ClawAI no intenta ser un asistente único mejor. Elimina la cuestión del proveedor único: una misma conversación puede moverse entre OpenAI, Anthropic, Google y otras seis familias, bajar a un modelo local de pesos abiertos cuando los datos no pueden salir de tu red, y registrar qué modelo respondió.',
      chooseRival:
        'quieres un asistente pulido, los modelos de OpenAI cubren casi todo lo que haces y te importan las herramientas de voz e imagen integradas.',
      chooseClaw:
        'chocas a menudo con el límite de un solo proveedor, quieres que un segundo modelo revise al primero, o parte del trabajo debe quedarse en tu propio hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelos de OpenAI',
        [ComparisonDimension.ROUTING]: 'Selección automática dentro del catálogo de OpenAI',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo nube',
        [ComparisonDimension.SELF_HOSTING]: 'No se ofrece',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Memoria, proyectos y subida de archivos',
        [ComparisonDimension.CONNECTORS]: 'Apps y conectores en planes de pago',
        [ComparisonDimension.RECEIPTS]: 'Uso a nivel de plan, no coste por respuesta',
      },
      faq: [
        {
          question: '¿Puede ClawAI usar los mismos modelos de OpenAI que ChatGPT?',
          answer:
            'ClawAI enruta a los modelos de OpenAI como una de las nueve familias de su catálogo. No hay cuenta de OpenAI que crear ni clave de API que pegar: el acceso a los modelos viene con la suscripción.',
        },
        {
          question: '¿Es ClawAI un cliente de ChatGPT?',
          answer:
            'No. ClawAI es una plataforma independiente con sus propias capas de enrutado, memoria, comparación y orquestación. OpenAI es uno de los proveedores a los que puede enviar un mensaje, no el producto que hay debajo.',
        },
        {
          question: '¿Puedo usar ClawAI sin enviar nada a OpenAI?',
          answer:
            'Sí. Fija la conversación a un modelo local de pesos abiertos, o autoaloja toda la pila y ejecuta solo modelos en tus propias GPU, sin ninguna llamada externa.',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI vs Claude',
      intro:
        'Claude es lo que muchos eligen cuando el trabajo es largo, cuidadoso y escrito. ClawAI también alcanza los modelos de Anthropic —junto a otras ocho familias— y deja que un segundo modelo revise lo que dijo el primero.',
      theirStrength:
        'Razonamiento cuidadoso sobre documentos largos, el seguimiento de instrucciones más fiable del sector y buena revisión de código. Proyectos, artefactos y conectores MCP lo convierten en un sitio realmente bueno para el trabajo escrito sostenido.',
      ourDifference:
        'ClawAI trata a Anthropic como una opción fuerte, no como la única. El mismo hilo puede enviar un prompt a Claude y a otros cuatro modelos a la vez, hacer que uno juzgue la respuesta de otro y conmutar automáticamente cuando un proveedor cae.',
      chooseRival:
        'casi todo tu trabajo es razonamiento largo o revisión de código y un modelo excelente basta.',
      chooseClaw:
        'quieres la respuesta de Claude y una segunda opinión, necesitas un modelo local para trabajo sensible, o prefieres no mantener una suscripción por proveedor.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelos de Anthropic',
        [ComparisonDimension.ROUTING]: 'Eliges el modelo tú mismo',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo nube',
        [ComparisonDimension.SELF_HOSTING]: 'No se ofrece',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Proyectos, archivos y memoria',
        [ComparisonDimension.CONNECTORS]: 'Conectores MCP y extensiones de escritorio',
        [ComparisonDimension.RECEIPTS]: 'Uso a nivel de plan, no coste por respuesta',
      },
      faq: [
        {
          question: '¿Incluye ClawAI modelos Claude?',
          answer:
            'Sí. Anthropic es una de las nueve familias de modelos del catálogo, accesible desde cualquier conversación sin cuenta ni clave de Anthropic aparte.',
        },
        {
          question: '¿Puede un modelo revisar la respuesta de otro?',
          answer:
            'Sí. Verify, Judge y Critic ponen un segundo modelo sobre la salida del primero. Eso reduce el riesgo de una respuesta equivocada y segura de sí misma, pero no lo elimina: todo lo importante sigue necesitando lectura humana.',
        },
        {
          question: '¿Está ClawAI afiliado a Anthropic?',
          answer:
            'No. ClawAI es independiente. Enruta a los modelos de Anthropic igual que a otros ocho proveedores, y no cuenta con el respaldo ni la asociación de ninguno.',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI vs Gemini',
      intro:
        'Gemini es el asistente más cercano a los documentos que ya tienes, siempre que vivan en Google Workspace. ClawAI llega por el otro lado: neutral ante proveedores, con los modelos de Google como una de nueve familias.',
      theirStrength:
        'Ventanas de contexto muy grandes, manejo nativo de imágenes, audio y vídeo, respuestas rápidas y una integración con Gmail, Drive y Docs que ningún tercero puede igualar.',
      ourDifference:
        'ClawAI no está atado ni a una suite ofimática ni a la hoja de ruta de un proveedor. Se conecta a doce herramientas de trabajo en lugar de una, enruta cada mensaje según la tarea y puede mantener el trabajo sensible en un modelo local de pesos abiertos.',
      chooseRival:
        'tu organización vive en Google Workspace y quieres el asistente directamente dentro.',
      chooseClaw:
        'usas herramientas de varios proveedores, quieres comparar modelos antes de comprometerte, o necesitas un despliegue sin ninguna llamada externa.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelos de Google',
        [ComparisonDimension.ROUTING]: 'Selección automática dentro del catálogo de Google',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo alojado por Google',
        [ComparisonDimension.SELF_HOSTING]: 'No se ofrece',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Archivos, Drive y contexto de Workspace',
        [ComparisonDimension.CONNECTORS]: 'Integración profunda con Google Workspace',
        [ComparisonDimension.RECEIPTS]: 'Uso a nivel de plan, no coste por respuesta',
      },
      faq: [
        {
          question: '¿Puede ClawAI usar modelos Gemini?',
          answer:
            'Sí. Google es una de las nueve familias de modelos del catálogo, disponible en cualquier conversación bajo la misma suscripción.',
        },
        {
          question: '¿Se conecta ClawAI a Google Workspace?',
          answer:
            'ClawAI incluye doce conectores para gestores de incidencias, chat y documentos. Su integración con Google es un conector, no una superficie propia: más amplia entre proveedores y menos profunda dentro de Google.',
        },
        {
          question: '¿Cuál es mejor para documentos muy largos?',
          answer:
            'Ambos los manejan bien, y las mayores ventanas de contexto de Google están entre las más grandes disponibles. La diferencia de ClawAI es que puedes enviar el mismo documento a dos modelos y comparar sus conclusiones.',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI vs Perplexity',
      intro:
        'Perplexity está construido alrededor de una sola tarea: responder una pregunta desde la web en vivo, con fuentes. ClawAI está construido alrededor de otra: poner el modelo adecuado en el trabajo que tengas entre manos, investigación incluida.',
      theirStrength:
        'El producto mejor diseñado para preguntas de tipo búsqueda. Las respuestas llegan con citas, las repreguntas mantienen el hilo coherente y toda la interfaz está pensada para comprobar de dónde sale una afirmación.',
      ourDifference:
        'ClawAI es un espacio de trabajo, no un motor de respuestas. La investigación es un modo entre varios, junto a la comparación de modelos, la memoria persistente, el contexto de archivos, un agente de código y los modelos locales, y cada respuesta registra el modelo que la produjo.',
      chooseRival: 'la mayoría de tus preguntas son «qué es cierto ahora mismo y quién lo dice».',
      chooseClaw:
        'la investigación es solo parte del trabajo y también necesitas código, redacción larga, comparación de modelos o un modelo que corra en tu propio hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modelos de varios proveedores en planes superiores',
        [ComparisonDimension.ROUTING]: 'Elegido por calidad de búsqueda y respuesta',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo nube',
        [ComparisonDimension.SELF_HOSTING]: 'No se ofrece',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Espacios, hilos y subida de archivos',
        [ComparisonDimension.CONNECTORS]: 'Conectores en planes de empresa',
        [ComparisonDimension.RECEIPTS]: 'Uso a nivel de plan, no coste por respuesta',
      },
      faq: [
        {
          question: '¿ClawAI busca en la web?',
          answer:
            'Sí. La investigación ejecuta una búsqueda web de varios pasos y devuelve una respuesta con sus fuentes. Es una capacidad dentro del espacio de trabajo, no el producto entero.',
        },
        {
          question: '¿Cuál cita mejor?',
          answer:
            'Perplexity está hecho a propósito para respuestas citadas y muestra fuentes para prácticamente cada afirmación. ClawAI cita sus investigaciones; para una pregunta de puro «buscar y citar», un motor de respuestas dedicado es la herramienta más afilada.',
        },
        {
          question: '¿Puedo usar los dos?',
          answer:
            'Mucha gente lo hace. La comparación que importa es si quieres un motor de respuestas especializado, un espacio multimodelo general, o ambos.',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI vs Microsoft Copilot',
      intro:
        'Copilot es Microsoft 365 con un asistente entretejido. ClawAI es un espacio de trabajo independiente que alcanza nueve familias de modelos y puede correr por completo en tus propios servidores.',
      theirStrength:
        'Nada se sitúa tan cerca de los datos de Microsoft que una organización ya tiene. El contexto de Word, Excel, Outlook y Teams llega sin configuración, y licencias, tenencia y cumplimiento siguen el contrato de Microsoft 365 que TI ya tiene.',
      ourDifference:
        'ClawAI es neutral ante proveedores y desplegable en cualquier sitio. Enruta entre nueve familias de modelos en lugar de la selección de un solo proveedor, muestra cuánto costó cada respuesta y puede instalarse dentro de tu red con modelos de pesos abiertos y sin llamadas externas.',
      chooseRival:
        'tu organización funciona sobre Microsoft 365 y el valor está en que el asistente viva dentro de los documentos que ya existen.',
      chooseClaw:
        'quieres elegir proveedor, ver el coste por respuesta, o un despliegue que nunca salga de tu infraestructura.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modelos de OpenAI y los propios de Microsoft',
        [ComparisonDimension.ROUTING]: 'Elegido por Microsoft según la superficie',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo nube',
        [ComparisonDimension.SELF_HOSTING]: 'No se ofrece',
        [ComparisonDimension.MEMORY_AND_FILES]:
          'Archivos de Microsoft 365 y contexto de la organización',
        [ComparisonDimension.CONNECTORS]: 'La integración más profunda con Microsoft 365',
        [ComparisonDimension.RECEIPTS]: 'Licencia por puesto, no coste por respuesta',
      },
      faq: [
        {
          question: '¿Se puede desplegar ClawAI dentro de nuestra red?',
          answer:
            'Sí. Toda la pila corre en tus servidores, con modelos de pesos abiertos en tus GPU y sin llamadas a proveedores externos. Es un proyecto acotado, no un plan que se compre en línea.',
        },
        {
          question: '¿Se integra ClawAI con Microsoft 365?',
          answer:
            'ClawAI incluye doce conectores para gestores de incidencias, chat y documentos: más amplio entre proveedores que Copilot y menos profundo dentro de las aplicaciones de Microsoft.',
        },
        {
          question: '¿Cómo se factura el uso?',
          answer:
            'Por tokens normalizados por coste contra un saldo diario y mensual, no por puesto. Cada respuesta muestra el modelo, el coste y el saldo consumido.',
        },
      ],
    },
    [ComparisonRival.KIMI]: {
      name: 'Kimi',
      vendor: 'Moonshot AI',
      eyebrow: 'ClawAI vs Kimi',
      intro:
        'Kimi se hizo un nombre con contextos muy largos y, más recientemente, publicando pesos abiertos que cualquiera puede descargar y ejecutar. ClawAI tiene otra forma: una suscripción que alcanza modelos de pesos abiertos de la clase de Kimi junto a otras ocho familias y envía cada mensaje al que mejor encaja.',
      theirStrength:
        'Lectura de contextos largos a un precio por debajo de la mayoría de los modelos punteros occidentales, buen comportamiento agéntico y con herramientas, y pesos abiertos en su línea principal: el mismo modelo se puede evaluar en el producto alojado y luego ejecutar en tu propio hardware.',
      ourDifference:
        'ClawAI no te pide elegir un laboratorio. Un modelo de pesos abiertos puede responder las preguntas donde importan el coste o la residencia de los datos, un modelo puntero puede quedarse con las que lo necesitan, y la decisión de enrutado queda registrada en cada respuesta en lugar de ser una costumbre que tengas que recordar.',
      chooseRival:
        'tu trabajo está dominado por documentos muy largos, te sientes cómodo con un solo proveedor y el precio por token es el número que decide.',
      chooseClaw:
        'quieres la economía de los pesos abiertos en algunos mensajes y la calidad puntera en otros, sin mantener dos suscripciones ni decidir a mano cada vez.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelos de Moonshot',
        [ComparisonDimension.ROUTING]: 'Selección dentro del catálogo de Moonshot',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abiertos publicados; alojarlos es cosa tuya',
        [ComparisonDimension.SELF_HOSTING]: 'Los pesos sí, el producto no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Lectura de archivos con contexto largo',
        [ComparisonDimension.CONNECTORS]: 'Limitados fuera de sus propias apps',
        [ComparisonDimension.RECEIPTS]: 'Uso a nivel de API, no coste por respuesta',
      },
      faq: [
        {
          question: '¿Puede ClawAI usar modelos Kimi?',
          answer:
            'ClawAI alcanza modelos de pesos abiertos de esta clase a través de su propio catálogo, y puede ejecutarlos localmente en tus GPU. No hay cuenta aparte que crear ni clave de API que pegar.',
        },
        {
          question: '¿Ejecutar pesos abiertos por mi cuenta sale más barato que una suscripción?',
          answer:
            'Con volumen sostenido puede serlo, una vez que tienes las GPU y el tiempo de operación. ClawAI apunta al caso intermedio: la economía de los pesos abiertos para los mensajes que la aprovechan y modelos punteros para los que no, en una sola factura.',
        },
        {
          question: '¿Salen mis datos de la red si uso un modelo local?',
          answer:
            'No. Fija la conversación a un modelo local de pesos abiertos y no se envía nada a un proveedor externo. Autoalojar toda la pila elimina por completo las llamadas externas.',
        },
      ],
    },
    [ComparisonRival.QWEN]: {
      name: 'Qwen',
      vendor: 'Alibaba',
      eyebrow: 'ClawAI vs Qwen',
      intro:
        'Qwen es una de las familias de pesos abiertos más completas que existen: una escalera amplia de tamaños, buena cobertura multilingüe y licencias permisivas en casi todo el catálogo. ClawAI pone modelos de esa clase junto a otras ocho familias bajo una sola suscripción.',
      theirStrength:
        'Amplitud. Tamaños que van desde los que corren en un portátil hasta los que necesitan un servidor, variantes de visión y de código, un rendimiento realmente bueno fuera del inglés y licencias que hacen sencillo el autoalojamiento comercial.',
      ourDifference:
        'ClawAI es la capa por encima del modelo, no el modelo. Enruta por mensaje, puede hacer la misma pregunta a varias familias y mostrar las respuestas en paralelo, mantiene la memoria y los archivos entre todas ellas, y lo cobra todo como un solo saldo.',
      chooseRival:
        'estás construyendo sobre un modelo, quieres ser dueño del despliegue y tienes la capacidad operativa para ejecutarlo y actualizarlo tú mismo.',
      chooseClaw:
        'quieres usar modelos en lugar de operarlos, y quieres la opción de alcanzar un modelo puntero cuando uno de pesos abiertos no basta.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo la familia Qwen',
        [ComparisonDimension.ROUTING]: 'Eliges el tamaño y la variante',
        [ComparisonDimension.SIDE_BY_SIDE]: 'No forma parte del modelo',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abiertos en todo el catálogo',
        [ComparisonDimension.SELF_HOSTING]: 'Los pesos sí, el producto no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Lo que construyas alrededor',
        [ComparisonDimension.CONNECTORS]: 'Lo que construyas alrededor',
        [ComparisonDimension.RECEIPTS]: 'Tu propia instrumentación',
      },
      faq: [
        {
          question: '¿Puedo ejecutar un modelo de pesos abiertos dentro de ClawAI?',
          answer:
            'Sí. ClawAI ejecuta modelos de pesos abiertos localmente con su propio runtime, y una conversación puede fijarse a uno para que nada salga de tu red.',
        },
        {
          question: '¿Por qué usar ClawAI en lugar de alojar un modelo directamente?',
          answer:
            'Porque el modelo es la parte fácil. El enrutado, la comparación, la memoria, el manejo de archivos, los conectores, las cuotas y la contabilidad del coste por respuesta son las partes que tendrías que construir, y son justo lo que es ClawAI.',
        },
        {
          question: '¿Admite ClawAI otros idiomas además del inglés?',
          answer:
            'La interfaz del producto está en trece idiomas, y la elección de modelo es por mensaje: un modelo multilingüe puede encargarse de los mensajes que lo necesiten.',
        },
      ],
    },
    [ComparisonRival.GLM]: {
      name: 'GLM',
      vendor: 'Zhipu AI',
      eyebrow: 'ClawAI vs GLM',
      intro:
        'GLM es la línea puntera de Zhipu, conocida por su buen rendimiento en código y tareas agénticas a una fracción del precio de los mayores modelos occidentales, con pesos abiertos en buena parte del catálogo. ClawAI trata a los modelos de esa clase como una opción entre nueve.',
      theirStrength:
        'Relación precio-capacidad. Resultados en código y uso de herramientas cercanos a modelos mucho más caros, un ritmo de lanzamientos agresivo y pesos abiertos que convierten el autoalojamiento en una opción real y no en una nota de prensa.',
      ourDifference:
        'ClawAI no te obliga a apostar por que un laboratorio mantenga su ventaja. El enrutado es por mensaje y el catálogo cambia por debajo, así que dejar que un modelo más barato se lleve más trabajo es un cambio de configuración, no una migración.',
      chooseRival:
        'el coste por respuesta capaz es el número que decide, tu trabajo es sobre todo código y estás dispuesto a seguir de cerca el ciclo de lanzamientos de un solo laboratorio.',
      chooseClaw:
        'quieres tener esa economía disponible sin comprometerte con ella para todo, y quieres un registro de qué modelo respondió realmente.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelos de Zhipu',
        [ComparisonDimension.ROUTING]: 'Selección dentro del catálogo de Zhipu',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abiertos en buena parte del catálogo',
        [ComparisonDimension.SELF_HOSTING]: 'Los pesos sí, el producto no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Subida de archivos en su propia app',
        [ComparisonDimension.CONNECTORS]: 'Limitados fuera de sus propias apps',
        [ComparisonDimension.RECEIPTS]: 'Uso a nivel de API, no coste por respuesta',
      },
      faq: [
        {
          question: '¿Es ClawAI más barato que usar directamente un modelo de bajo coste?',
          answer:
            'Por token, no: una llamada directa a la API del modelo capaz más barato siempre es el suelo. ClawAI sale más barato que la alternativa realista: varias suscripciones, o construir tú mismo el enrutado, la memoria y la contabilidad de costes.',
        },
        {
          question: '¿Puedo hacer que ClawAI prefiera modelos de menor coste?',
          answer:
            'Sí. Los modos de enrutado van desde el totalmente automático hasta fijar un modelo concreto, y los modos que tienen en cuenta el coste sopesan precio y capacidad en cada mensaje.',
        },
        {
          question: '¿Cómo sé qué modelo respondió?',
          answer:
            'Cada respuesta lleva el proveedor, el modelo, el modo de enrutado y el coste consumido, y la propia decisión de enrutado se puede inspeccionar.',
        },
      ],
    },
    [ComparisonRival.DEEPSEEK]: {
      name: 'DeepSeek',
      vendor: 'DeepSeek',
      eyebrow: 'ClawAI vs DeepSeek',
      intro:
        'DeepSeek cambió lo que se espera del precio de los modelos de razonamiento y publicó pesos abiertos de su línea principal. ClawAI es la capa que permite que un modelo así se lleve el trabajo que se le da bien sin convertirse en el único modelo que tienes.',
      theirStrength:
        'Razonamiento y matemáticas a un precio que sacudió el mercado, pesos abiertos en la línea principal y una postura investigadora que publica en lugar de insinuar: puedes leer cómo se entrenaron los modelos.',
      ourDifference:
        'ClawAI mantiene la elección abierta en cada mensaje. Una pregunta con mucho razonamiento puede ir a un modelo de razonamiento, una rutinaria a algo barato y rápido, y una sensible a un modelo en tu propio hardware, con la decisión registrada en lugar de supuesta.',
      chooseRival:
        'tu carga de trabajo está dominada por razonamiento difícil, quieres el precio más bajo para ello y te vale un solo proveedor.',
      chooseClaw:
        'el razonamiento es parte de tu trabajo y no todo él, y quieres tener un segundo modelo disponible para revisar al primero.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelos de DeepSeek',
        [ComparisonDimension.ROUTING]: 'Eliges entre chat o razonamiento',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una respuesta cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abiertos en la línea principal',
        [ComparisonDimension.SELF_HOSTING]: 'Los pesos sí, el producto no',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Subida de archivos en su propia app',
        [ComparisonDimension.CONNECTORS]: 'Limitados fuera de sus propias apps',
        [ComparisonDimension.RECEIPTS]: 'Uso a nivel de API, no coste por respuesta',
      },
      faq: [
        {
          question: '¿Puede ClawAI enrutar solo a modelos de razonamiento?',
          answer:
            'Sí. Una conversación puede fijarse a un modelo concreto, y el modo automático ya envía los mensajes con mucho razonamiento a los modelos adecuados.',
        },
        {
          question: '¿Dónde se procesan mis datos?',
          answer:
            'En el proveedor que respondió, y la respuesta dice cuál. Si eso importa para un trabajo, fíjalo a un modelo local de pesos abiertos, o autoaloja la pila para que nada salga de tu red.',
        },
        {
          question: '¿Puedo comparar dos modelos con la misma pregunta?',
          answer:
            'Sí. El modo de comparación envía un mismo prompt a varios modelos a la vez y muestra las respuestas en paralelo, con una pasada opcional de juez para puntuarlas.',
        },
      ],
    },
  },
};
