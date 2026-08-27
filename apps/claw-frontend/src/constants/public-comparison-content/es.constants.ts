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
  },
};
