import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesClusterDictionary } from '@/types/features-cluster.types';

export const ES_FEATURES_CLUSTER_CONTENT: FeaturesClusterDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'A dónde ir después',
    lastReviewed: 'Última revisión',
    backToHub: 'Todas las funciones',
    ctaTitle: 'Pruébalo en lugar de confiar en nuestra palabra',
    ctaBody:
      'ClawAI dirige cada conversación al modelo y las herramientas adecuados para la tarea, en todos los proveedores a los que se conecta, desde un solo espacio de trabajo.',
    startFree: 'Empieza con el plan gratuito',
    seeUseCases: 'Ver esto aplicado a una tarea real',
  },
  hub: {
    capabilitiesHeading: 'Profundiza en una función concreta',
    capabilitiesIntro:
      'Las nueve secciones de arriba son la versión breve. Cada una de las seis funciones de abajo es una página completa: qué hace realmente la función subyacente, qué plan la habilita, y dónde comprobar el mecanismo por ti mismo.',
    cardSummaries: {
      [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]:
        'Siete modos de enrutamiento deciden qué modelo responde, y nueve primitivas de orquestación ponen a varios modelos sobre el mismo problema.',
      [FeatureCapability.MEMORY_AND_CONTEXT]:
        'Memoria que persiste entre conversaciones, y context packs que llevan el material de referencia de una tarea.',
      [FeatureCapability.WORKSPACE_CONNECTORS]:
        'Catorce conectores de espacio de trabajo permiten que una solicitud lea o actúe sobre las herramientas que tu equipo ya usa.',
      [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]:
        'Carga, fragmentación y OCR a la entrada; generación de imágenes, documentos e investigación a la salida.',
      [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]:
        'Cada respuesta registra qué modelo la gestionó, por qué, y cuánto costó de tu asignación.',
      [FeatureCapability.SECURITY_AND_DATA_HANDLING]:
        'Los mecanismos concretos — autenticación, RBAC, cifrado de credenciales, cifrado en tránsito — descritos con claridad.',
    },
  },
  capabilities: {
    [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: {
      seo: {
        title: 'Enrutamiento de modelos y orquestación en ClawAI',
        description:
          'Los siete modos de enrutamiento que deciden qué modelo responde a un mensaje, y las nueve primitivas de orquestación que ponen a varios modelos sobre el mismo problema, tal como existen en ClawAI.',
        keywords: [
          'modos de enrutamiento de modelos IA',
          'orquestación multimodelo',
          'transparencia del enrutamiento IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Enrutamiento de modelos y orquestación',
      summary:
        'El enrutamiento decide qué modelo único responde a un mensaje; la orquestación decide qué hacer cuando un solo modelo no basta. ClawAI ofrece ambos como mecanismos distintos y sujetos al plan, en lugar de un único ajuste oculto por defecto — siete modos de enrutamiento y nueve primitivas de orquestación, todos visibles en la respuesta que recibes.',
      sections: [
        {
          id: 'seven-routing-modes',
          heading: 'Siete modos de enrutamiento, no un ajuste oculto por defecto',
          paragraphs: [
            'ClawAI clasifica cada mensaje y puede enviarlo automáticamente a un modelo adecuado, o puedes fijar tú la regla. Los modos: Auto (clasifica según la tarea y elige un modelo fuerte para esa clase), Manual Model (fija un modelo para la conversación), Local-Only (cada solicitud permanece en hardware que controlas, vía Ollama o llama.cpp), Privacy-First (un modo distinto con prioridades propias para mantener una solicitud fuera del camino de nube genérico), Low Latency (prefiere el modelo que responde más rápido), High Reasoning (prefiere el modelo de razonamiento más fuerte sin importar velocidad ni coste) y Cost Saver (prefiere el modelo más económico capaz de gestionar la solicitud). Ver «qué es el enrutamiento de modelos IA», enlazado abajo, para el funcionamiento general de un enrutador.',
          ],
        },
        {
          id: 'nine-orchestration-primitives',
          heading: 'Nueve formas de poner más de un modelo sobre un problema',
          paragraphs: [
            'Cuando un modelo no basta, las primitivas de orquestación de ClawAI — registradas en el libro mayor bajo la superficie ORCHESTRATION, distinta del chat ordinario — son Compare (hasta cinco modelos sobre un mismo prompt, en paralelo), Consensus (sintetizar una respuesta a partir de dónde coinciden varios modelos, señalando los desacuerdos), Escalation (empezar económico y subir automáticamente solo cuando la calidad no alcanza), Best-of-N (generar varios candidatos y quedarse con el más fuerte), Repair (corregir un defecto concreto en una respuesta existente en lugar de regenerarla), Verify (un segundo modelo verifica la corrección con un límite configurable de revisiones), Role packs (un pequeño equipo de modelos especializados por rol que se pasan el trabajo) Pipelines (encadenar varias de estas etapas en un flujo nombrado y reejecutable) y Judge y Critic (un modelo independiente puntúa una respuesta según criterios explícitos, con retroalimentación escrita del paso Critic sobre los puntos débiles). Compare y Judge están cada uno sujetos individualmente al plan (COMPARE_MODE, JUDGE_MODE, CRITIC_REVIEW); ver «qué es el consenso de IA» y «qué es un juez de IA», ambos enlazados abajo, para cómo funciona la evaluación en sí.',
          ],
        },
        {
          id: 'automatic-fallback-on-provider-failure',
          heading: 'Qué pasa cuando un proveedor falla a mitad de la solicitud',
          paragraphs: [
            'Una decisión de enrutamiento no es una apuesta única: si el proveedor o el modelo al que se envió una solicitud falla a mitad del procesamiento, ClawAI puede pasar automáticamente a otro modelo, y la respuesta registra qué modelo intervino realmente — no solo el elegido en un principio. Ver «qué es el fallback de modelos», enlazado abajo, para cómo se toma esa decisión de conmutación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cuántos modos de enrutamiento tiene ClawAI?',
          answer:
            'Siete: Auto, Manual Model, Local-Only, Privacy-First, Low Latency, High Reasoning y Cost Saver. Auto es el predeterminado; los otros seis existen para cuando quieres decidir tú el enrutamiento, o sesgarlo en una dirección concreta.',
        },
        {
          question: '¿Cuál es la diferencia entre Compare y Consensus?',
          answer:
            'Compare muestra la respuesta de cada modelo al mismo prompt en paralelo, con latencia y recuento de tokens por modelo, dejándote la lectura a ti. Consensus sintetiza una respuesta a partir de dónde coinciden los modelos y señala los desacuerdos.',
        },
        {
          question: '¿Puedo ver qué modelo respondió realmente, y por qué?',
          answer:
            'Sí — cada respuesta lleva el proveedor y el modelo que la produjo, el razonamiento tras la decisión de enrutamiento, y lo que costó de tu asignación. Si un proveedor falló y otro modelo intervino, eso también queda registrado.',
        },
      ],
      productNote:
        'Siete modos de enrutamiento y nueve primitivas de orquestación son mecanismos reales y ya publicados en ClawAI, no un único ajuste oculto — Compare, Judge y Critic están cada uno sujetos individualmente al plan y medidos en su propia superficie del libro mayor.',
    },
    [FeatureCapability.MEMORY_AND_CONTEXT]: {
      seo: {
        title: 'Memoria y contexto en ClawAI',
        description:
          'Cómo funcionan la memoria y los context packs de ClawAI — registros de memoria aprobados con una puntuación de confianza, almacenamiento acotado y paquetes de material de referencia con control de versiones, como funciones publicadas y sujetas al plan.',
        keywords: [
          'función de memoria IA',
          'context packs de IA',
          'memoria de conversación IA persistente',
        ],
      },
      eyebrow: 'Función',
      title: 'Memoria y contexto',
      summary:
        'Memoria y context packs son dos funciones distintas y sujetas al plan (MEMORY y CONTEXT_PACKS) que resuelven problemas diferentes: la memoria conserva lo que ClawAI ha aprendido sobre ti entre sesiones, mientras que un context pack agrupa material de referencia para una tarea específica. Ambas son interruptores por conversación, no algo que se gestione globalmente.',
      sections: [
        {
          id: 'memory-records-and-approval',
          heading: 'Los registros de memoria, y la cola de aprobación previa',
          paragraphs: [
            'Un registro de memoria es un hecho, una preferencia, una instrucción o un resumen, almacenado con una categoría, una puntuación de confianza y su procedencia. Nada se recuerda en silencio: los candidatos llegan a una cola que apruebas o rechazas, y solo los elementos de alta confianza y no sensibles se aprueban automáticamente, a un umbral que fijas tú mismo. Ver «qué es la memoria de IA», enlazado abajo, para el funcionamiento general.',
          ],
        },
        {
          id: 'context-packs-for-reference-material',
          heading: 'Context packs para material que una tarea necesita a la vista',
          paragraphs: [
            'Un context pack agrupa texto reutilizable, archivos, enlaces y referencias de memoria en una unidad nombrada y con control de versiones que adjuntas a cualquier conversación — así un brief de estilo, un conjunto de documentos fuente o instrucciones permanentes no hace falta volver a pegarlos cada sesión. Los packs tienen control de versiones, así que puedes ver qué cambió y revertir. Ver «qué son los context packs», enlazado abajo, para el funcionamiento general.',
          ],
        },
        {
          id: 'scopes-receipts-and-controls',
          heading: 'Ámbitos, recibos de contexto y controles',
          paragraphs: [
            'Una memoria puede limitarse a ti mismo, a una sola conversación, a un proyecto o a un espacio de trabajo, para que el contexto laboral no se filtre a los chats personales. Cada respuesta que recurre a memoria o a un pack registra un recibo de contexto — qué elementos entraron en el prompt, en qué orden, y cuánto presupuesto de tokens consumió cada uno — y los controles permiten pausar toda la memoria, un solo elemento, fijar una caducidad, marcar algo como sensible para su redacción, o eliminarlo por completo, con cada cambio escrito en un registro de auditoría. Ver «qué es una ventana de contexto», enlazado abajo, para la importancia de ese cómputo de presupuesto de tokens.',
          ],
        },
      ],
      faq: [
        {
          question: '¿ClawAI recuerda cosas sobre mí sin preguntar?',
          answer:
            'No — los candidatos llegan a una cola de aprobación que revisas tú mismo. Solo los elementos de alta confianza y no sensibles se aprueban automáticamente, a un umbral que fijas tú, y cada cambio a un registro de memoria se escribe en un registro de auditoría.',
        },
        {
          question: '¿Cuál es la diferencia entre memoria y un context pack?',
          answer:
            'La memoria conserva, entre sesiones, lo que ClawAI ha aprendido sobre tus preferencias. Un context pack es un paquete con control de versiones de material de referencia — texto, archivos, enlaces — que adjuntas a una tarea específica en lugar de una preferencia duradera. Son dos funciones distintas sujetas al plan.',
        },
        {
          question: '¿Puedo desactivar la memoria para una sola pregunta?',
          answer:
            'Sí — memoria y context packs son interruptores por conversación. Desactívalos para una pregunta puntual y el prompt no contendrá nada más que lo que escribiste.',
        },
      ],
      productNote:
        'Memoria y context packs son dos funciones de ClawAI distintas y sujetas al plan (MEMORY, CONTEXT_PACKS) — registros aprobados con puntuación de confianza y paquetes de referencia con control de versiones, ambos acotados y auditables, no un único bloque de memoria mezclado.',
    },
    [FeatureCapability.WORKSPACE_CONNECTORS]: {
      seo: {
        title: 'Conectores de espacio de trabajo en ClawAI',
        description:
          'Los 14 conectores de espacio de trabajo que publica ClawAI — GitHub, Slack, Jira, Google Drive y más — y cómo una acción de espacio de trabajo sujeta al plan lee o actúa sobre ellos.',
        keywords: [
          'conectores de espacio de trabajo IA',
          'conectar IA a GitHub y Slack',
          'integraciones de herramientas IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Conectores de espacio de trabajo',
      summary:
        'Un conector de espacio de trabajo permite que una solicitud de ClawAI lea o actúe sobre una herramienta que tu equipo ya usa, en lugar de copiar información manualmente. ClawAI tiene hoy 14 conectores de espacio de trabajo, y el acceso al espacio de trabajo es una función distinta sujeta al plan (WORKSPACES) con su propia superficie de uso medida (WORKSPACE_ACTION).',
      sections: [
        {
          id: 'the-fourteen-connectors',
          heading: 'Los catorce conectores, por categoría',
          paragraphs: [
            'Alojamiento de código: GitHub, GitLab, Bitbucket. Mensajería y seguimiento: Slack, Jira, Confluence, ClickUp. Diseño: Figma. Documentos y almacenamiento: Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive. Calendarios: Google Calendar, Outlook Calendar. Cada uno se conecta una vez vía OAuth, y las credenciales se cifran en reposo, se vinculan a tu cuenta y se pueden revocar con un clic.',
          ],
        },
        {
          id: 'what-a-connected-workspace-can-do',
          heading: 'Qué permite realmente hacer un espacio de trabajo conectado',
          paragraphs: [
            'Una vez conectado, ClawAI puede buscar en una herramienta, extraer contexto de ella para una conversación, y actuar sobre ella tras tu aprobación — un ticket de Jira, un hilo de Slack, un archivo en Google Drive, referenciado o modificado directamente en lugar de pegado a mano. Las conexiones se sincronizan según una programación y mediante webhooks, así los resultados de búsqueda se mantienen actualizados, y cuántas conexiones puedes mantener depende de tu plan.',
          ],
        },
        {
          id: 'multi-model-review-inside-a-workspace-action',
          heading: 'Revisión multimodelo como parte de la misma superficie medida',
          paragraphs: [
            'Una acción de espacio de trabajo no se limita a una única llamada de modelo — un paso de redacción en cadena o de traspaso, o una revisión multimodelo del resultado antes de ejecutarlo, usa la misma infraestructura de enrutamiento y orquestación descrita en la página enrutamiento de modelos y orquestación, enlazada abajo, aplicada a una acción que toca una herramienta conectada en lugar de un mensaje de chat ordinario.',
          ],
        },
      ],
      faq: [
        {
          question: '¿A cuántas herramientas se conecta ClawAI?',
          answer:
            'Catorce conectores de espacio de trabajo: GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, ClickUp, Figma, Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive, Google Calendar y Outlook Calendar.',
        },
        {
          question: '¿Están seguras mis credenciales de conector?',
          answer:
            'Las credenciales se cifran en reposo, se vinculan a tu cuenta y nunca se devuelven al navegador — ver la página seguridad y tratamiento de datos, enlazada abajo, para el mecanismo subyacente.',
        },
        {
          question:
            '¿Se mide una acción de espacio de trabajo por separado de un mensaje de chat ordinario?',
          answer:
            'Sí — las acciones de espacio de trabajo tienen su propia superficie medida (WORKSPACE_ACTION), distinta de la asignación de tokens de un mensaje de chat ordinario. Confirma la asignación actual en la página de precios.',
        },
      ],
      productNote:
        'ClawAI se conecta hoy a 14 herramientas de espacio de trabajo — alojamiento de código, mensajería, seguimiento de proyectos, diseño, documentos, almacenamiento y calendarios — detrás de una sola función WORKSPACES sujeta al plan, con su propia superficie de acción medida.',
    },
    [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: {
      seo: {
        title: 'Gestión de archivos y documentos en ClawAI',
        description:
          'Cómo ClawAI ingiere archivos — carga, fragmentación, OCR, comprobaciones de carga — y los genera de vuelta como imágenes, documentos e investigaciones con fuentes citadas.',
        keywords: [
          'carga de archivos y OCR con IA',
          'generación de documentos con IA',
          'formatos de exportación de documentos IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Gestión de archivos y documentos',
      summary:
        'Los archivos se mueven en ambas direcciones en ClawAI: hacia dentro, como una carga que se fragmenta e indexa para que un modelo responda desde tu contenido en lugar de solo sus datos de entrenamiento; y hacia fuera, como una imagen generada, un documento exportado o una investigación con fuentes citadas. Ambas direcciones son reales, están publicadas y se miden por separado.',
      sections: [
        {
          id: 'upload-chunking-and-retrieval',
          heading: 'Carga, fragmentación y entrega adaptada a cada modelo',
          paragraphs: [
            'ClawAI acepta PDF, DOCX, hojas de cálculo, CSV, JSON, Markdown, texto sin formato, archivos de código e imágenes. Un archivo se divide en pasajes y se indexa, así solo las partes relevantes para una pregunta entran en el prompt, y cada modelo recibe la forma que gestiona con más fiabilidad — una imagen nativa, un PDF nativo o texto extraído — con cada mensaje mostrando qué forma recibió realmente cada modelo. Los archivos se pueden adjuntar por mensaje, incluso en ejecuciones Compare, así varios modelos pueden ser consultados sobre el mismo documento a la vez.',
          ],
        },
        {
          id: 'ocr-and-upload-checks',
          heading: 'OCR para documentos escaneados, y comprobaciones en cada carga',
          paragraphs: [
            'Un PDF escaneado sin capa de texto pasa por OCR antes de llegar a un modelo, y se marca cuando la confianza de reconocimiento es baja. Cada carga se analiza en busca de virus, se comprueba contra el tipo de archivo declarado, se examina en busca de nombres de archivo peligrosos, y se rechaza si un archivo comprimido resulta ser una bomba de descompresión — las cargas cuentan contra los límites de tamaño y almacenamiento del plan, y los archivos se eliminan según un calendario de retención o se pueden borrar en cualquier momento.',
          ],
        },
        {
          id: 'generating-images-documents-and-research',
          heading: 'Generar imágenes, documentos e investigaciones citadas',
          paragraphs: [
            'A la salida, ClawAI puede producir una imagen a partir de una descripción, exportar cualquier respuesta o una conversación entera como archivo con formato en PDF, DOCX, CSV, HTML, Markdown, TXT o JSON, y ejecutar una tarea de investigación que busca en la web, recupera y lee páginas, y responde con las fuentes realmente usadas. La generación de imágenes, la generación de archivos y la investigación se miden cada una por separado (IMAGE, FILE_GENERATION, y las asignaciones RESEARCH_MODE / WEB_SEARCH / WEB_FETCH / WEB_EXTRACT), distintas del uso de tokens del chat ordinario. Ver «cómo funciona la llamada a herramientas de IA» y «qué son las salidas de IA estructuradas», ambos enlazados abajo, para el mecanismo detrás de una forma de salida definida.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Qué tipos de archivo puedo cargar?',
          answer:
            'PDF, DOCX, hojas de cálculo, CSV, JSON, Markdown, texto sin formato, archivos de código e imágenes. Cada modelo recibe la forma que gestiona con más fiabilidad, y el mensaje muestra qué forma recibió realmente cada modelo.',
        },
        {
          question: '¿Puede ClawAI leer un documento escaneado sin capa de texto?',
          answer:
            'Sí — un PDF escaneado pasa por OCR antes de llegar a un modelo, y se marca cuando la confianza de reconocimiento es baja.',
        },
        {
          question: '¿En qué formatos puedo exportar un documento?',
          answer:
            'PDF, DOCX, CSV, HTML, Markdown, TXT y JSON. La exportación de documentos es una superficie medida distinta, separada del chat ordinario y del uso de investigación.',
        },
      ],
      productNote:
        'Carga, fragmentación, OCR y comprobaciones de carga a la entrada; generación de imágenes, exportación de documentos e investigaciones citadas a la salida — funciones reales, publicadas y medidas por separado, no un único modo de archivo mezclado.',
    },
    [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: {
      seo: {
        title: 'Observabilidad y transparencia en ClawAI',
        description:
          'Cómo muestra ClawAI lo que consume una solicitud — un panel de uso, detalle de enrutamiento por respuesta, un registro de auditoría y progreso en vivo — para que el uso nunca sea una caja negra.',
        keywords: [
          'transparencia de uso de IA',
          'registro de auditoría de enrutamiento IA',
          'observabilidad de costes de IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Observabilidad y transparencia',
      summary:
        'El uso en ClawAI está medido, atribuido y es visible en lugar de una caja negra: un panel de uso, detalle de enrutamiento por respuesta, un registro de auditoría y progreso en vivo mientras un modelo trabaja son cuatro piezas distintas y publicadas del mismo principio — siempre puedes ver qué hizo una solicitud y cuánto costó.',
      sections: [
        {
          id: 'usage-dashboard-and-per-answer-detail',
          heading: 'El panel de uso, y el detalle de enrutamiento por respuesta',
          paragraphs: [
            'Un panel de uso muestra la asignación consumida hoy y este mes, desglosada por modelo, con el saldo restante en las mismas unidades en que se cotiza un plan. Debajo, cada respuesta individual lleva el modelo que la produjo, por qué se eligió, cuánto tardó, cuántos tokens usó, y qué costó de la asignación — incluido qué modelo intervino si el proveedor original falló a mitad de la solicitud. Ver «qué es el enrutamiento de modelos IA» y «qué es el fallback de modelos», ambos enlazados abajo, para cómo se toma esa decisión de enrutamiento en sí.',
          ],
        },
        {
          id: 'the-audit-log',
          heading:
            'Un registro de auditoría para inicios de sesión, cambios de plan y actividad de conectores',
          paragraphs: [
            'Los inicios de sesión, cambios de plan, actividad de conectores, ediciones de memoria y contenido generado se registran cada uno con una marca de tiempo y un actor, así el historial de una cuenta es reconstruible en lugar de visible solo en el momento en que ocurrió. Es el mismo rastro de auditoría al que remiten las páginas memoria y contexto y seguridad y tratamiento de datos, enlazadas abajo, para las acciones que cada una de esas funciones escribe en él.',
          ],
        },
        {
          id: 'live-progress-and-limit-warnings',
          heading: 'Progreso en vivo mientras un modelo trabaja, y avisos de límite claros',
          paragraphs: [
            'Mientras un modelo trabaja ves la etapa en la que está, el texto según llega, su razonamiento cuando el modelo lo expone, y contadores de tokens y tiempo en vivo — nunca una espera silenciosa. Cuando una solicitud alcanza un límite del plan, ClawAI indica qué límite, cuánto queda en las otras ventanas y cuándo se reinicia, en lugar de cortar la solicitud sin explicación.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puedo ver qué modelo respondió a un mensaje concreto, y por qué?',
          answer:
            'Sí — cada respuesta registra el proveedor y el modelo que la produjo, el razonamiento tras la decisión de enrutamiento, cuánto tardó, los tokens usados, y qué costó de tu asignación.',
        },
        {
          question: '¿Qué registra realmente el registro de auditoría?',
          answer:
            'Inicios de sesión, cambios de plan, actividad de conectores, ediciones de memoria y contenido generado, cada uno con una marca de tiempo y un actor, así el historial de la cuenta es reconstruible después de los hechos.',
        },
        {
          question: '¿Qué pasa cuando alcanzo un límite de uso?',
          answer:
            'ClawAI indica qué límite específico se alcanzó, cuánta asignación queda en tus otras ventanas de uso, y cuándo se reinicia el límite — nada se corta en silencio.',
        },
      ],
      productNote:
        'Un panel de uso, detalle de enrutamiento por respuesta, un registro de auditoría y progreso en vivo son cuatro piezas reales y publicadas del mismo principio: el uso en ClawAI está medido, atribuido y es visible, nunca una caja negra.',
    },
    [FeatureCapability.SECURITY_AND_DATA_HANDLING]: {
      seo: {
        title: 'Seguridad y tratamiento de datos en ClawAI',
        description:
          'Los mecanismos concretos detrás de la seguridad de cuentas y datos de ClawAI — hash de contraseñas con Argon2, refresh tokens rotativos, RBAC, cifrado de credenciales AES-256-GCM, TLS y aislamiento de servicios — descritos con claridad, sin afirmaciones de cumplimiento normativo.',
        keywords: [
          'seguridad de la plataforma IA',
          'cifrado de credenciales IA',
          'control de acceso basado en roles IA',
        ],
      },
      eyebrow: 'Función',
      title: 'Seguridad y tratamiento de datos',
      summary:
        'Esta página describe mecanismos que existen hoy en el producto, con claridad, en lugar de una afirmación de cumplimiento normativo. Cuentas, credenciales, transporte y fronteras entre servicios tienen cada uno un mecanismo concreto y verificable detrás — y donde una solicitud debe permanecer en hardware que controlas en lugar de llegar a un proveedor de nube, el enrutamiento Local-Only y Privacy-First es la respuesta a eso, no una certificación de seguridad.',
      sections: [
        {
          id: 'accounts-sessions-and-access-control',
          heading: 'Cuentas, sesiones y acceso basado en roles',
          paragraphs: [
            'Las contraseñas se someten a hash con Argon2; los tokens de acceso son de corta duración, y los refresh tokens rotan en cada uso, así un token robado es detectable. Cada cuenta lleva un rol y un conjunto de permisos explícito, comprobado en la interfaz y de nuevo en cada endpoint del backend — un control de acceso basado en roles aplicado en ambas capas, no solo donde la interfaz da la casualidad de mostrarlo.',
          ],
        },
        {
          id: 'credential-and-transport-encryption',
          heading: 'Cifrado de credenciales y cifrado en tránsito',
          paragraphs: [
            'Las credenciales de proveedores y conectores se cifran en reposo con AES-256-GCM y nunca se devuelven al navegador. El transporte es TLS desde el navegador hasta el borde, y de nuevo TLS entre cada servicio interno, con certificados verificados en cada salto — así una credencial queda protegida tanto en reposo como en movimiento.',
          ],
        },
        {
          id: 'service-isolation-and-what-is-not-claimed',
          heading: 'Aislamiento de servicios, limitación de tasa, y qué no se afirma aquí',
          paragraphs: [
            'Cada servicio del backend posee su propia base de datos y no puede leer la de otro, así un fallo en la generación de imágenes no puede alcanzar tus conversaciones; los límites de tasa por cuenta protegen tanto tu asignación como la plataforma frente a bucles descontrolados. ClawAI no posee hoy ninguna certificación de cumplimiento normativo, y la app alojada envía solicitudes a proveedores de modelos externos bajo sus propios términos — donde eso no funcione para una organización, un despliegue privado dentro de tu propia red, ejecutando solo modelos de pesos abiertos, se define caso por caso; contáctanos para hablarlo. Para una solicitud que deba permanecer por defecto en hardware que controlas, ver despliegue privado y local, enlazado abajo.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Cómo se protegen mis contraseñas y tokens de sesión?',
          answer:
            'Las contraseñas se someten a hash con Argon2. Los tokens de acceso son de corta duración, y los refresh tokens rotan en cada uso, así un refresh token robado es detectable en lugar de reutilizable en silencio.',
        },
        {
          question: '¿Cómo se almacenan mis credenciales de herramientas conectadas?',
          answer:
            'Las credenciales de proveedores y conectores se cifran en reposo con AES-256-GCM y nunca se devuelven al navegador, sea cual sea el conector de espacio de trabajo.',
        },
        {
          question: '¿ClawAI posee certificaciones de cumplimiento normativo de terceros?',
          answer:
            'No — ClawAI no posee hoy ninguna certificación de cumplimiento normativo. Para un requisito que la app alojada no puede satisfacer, un despliegue privado dentro de tu propia red se define caso por caso; ver el caso de uso despliegue local y privado, enlazado abajo.',
        },
      ],
      productNote:
        'Hash de contraseñas con Argon2, refresh tokens rotativos, RBAC comprobado en cada endpoint del backend, cifrado de credenciales AES-256-GCM, TLS en cada salto y aislamiento de bases de datos por servicio — mecanismos concretos, descritos con claridad, sin ninguna certificación de cumplimiento normativo afirmada.',
    },
  },
};
