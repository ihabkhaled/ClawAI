import type {
  PublicLaunchCorePageDictionary,
  PublicLaunchLabels,
  PublicLaunchLocalizedLabels,
} from '@/types/public-launch-content.types';

/** Los textos del marco de página (onThisPage, evidence, …) están en public-commerce-policy-content. */
export const ES_PUBLIC_LAUNCH_LABELS: Omit<PublicLaunchLabels, keyof PublicLaunchLocalizedLabels> =
  {
    viewPricing: 'Ver precios',
    readSecurity: 'Leer seguridad y privacidad',
    baselineCatalog: 'Catálogo base de suscripciones',
    monthlyPrice: 'Mensual',
    yearlyPrice: 'Anual',
    dailyAllowance: 'Cupo ponderado diario',
    monthlyAllowance: 'Cupo ponderado mensual',
    liveCheckoutNote:
      'Estos son los precios y cupos base del repositorio. El pago en vivo confirma el precio vigente antes de cobrar.',
    providerAvailabilityNote:
      'Los modelos se sincronizan desde los proveedores habilitados. El catálogo exacto depende de las credenciales configuradas, la disponibilidad de los proveedores, el estado del ciclo de vida y la política del administrador.',
    routingRailTitle: 'Una solicitud, una ruta verificable',
    routingRailSummary:
      'ClawAI evalúa la solicitud y la política vigente antes de elegir una vía de ejecución disponible.',
    routingRailAlternative:
      'Una solicitud se evalúa, se enruta a un proveedor elegible, opcionalmente se compara y se devuelve con la identidad del modelo y los detalles de uso.',
    evaluate: 'Evaluar',
    evaluateDescription:
      'Lee la tarea, el contexto disponible, la política y la elegibilidad actual.',
    route: 'Enrutar',
    routeDescription:
      'Elige una vía de modelo activa entre los proveedores configurados por el operador.',
    compare: 'Comparar',
    compareDescription:
      'Usa la orquestación de varios modelos solo cuando el modo elegido y el cupo lo permiten.',
    receipt: 'Devolver',
    receiptDescription:
      'Transmite la respuesta con el origen del modelo visible y la información de uso.',
  };

export const ES_PUBLIC_LAUNCH_PAGES: PublicLaunchCorePageDictionary = {
  about: {
    eyebrow: 'Acerca de ClawAI',
    sections: [
      {
        id: 'purpose',
        title: 'Un plano de control práctico para el trabajo con IA',
        body: 'ClawAI reúne conversaciones, enrutamiento de modelos, archivos, memoria, investigación, generación y acciones del espacio de trabajo en una interfaz coherente. El producto está pensado para reducir la fricción operativa de cambiar entre proveedores y mantener visibles, para quien trabaja, el modelo elegido, el uso y la vía de ejecución.',
      },
      {
        id: 'principles',
        title: 'Construido en torno a la elección, la evidencia y el control',
        body: 'La plataforma no considera que un modelo sea el mejor en todo. Puede enrutar según la tarea, dejar que la persona elija un modelo, comparar varias respuestas elegibles o pedir a un juez independiente que revise la salida. La disponibilidad siempre depende de los conectores, las credenciales, la política del plan y el ciclo de vida de los modelos configurados en el entorno en ejecución.',
      },
      {
        id: 'architecture',
        title: 'Operación local primero, alcance a modelos en la nube',
        body: 'El repositorio contiene una interfaz Next.js y servicios desplegables de forma independiente, conectados mediante límites explícitos de HTTP y de eventos. Los operadores pueden ejecutar la plataforma en su propia infraestructura, conectar proveedores en la nube compatibles o definir un despliegue de modelos locales cuyo hardware e integraciones se ajusten a los requisitos de la organización.',
      },
      {
        id: 'trust',
        title: 'Confianza mediante hechos verificables',
        body: 'Publicamos la arquitectura, las bases de precios, los controles de seguridad, las limitaciones y las fechas de revisión, en lugar de sustituirlos por insignias sin respaldo o pruebas de clientes inventadas. El repositorio de código está disponible para revisión técnica, mientras que los catálogos de proveedores en vivo y el pago siguen siendo la referencia de lo que está disponible en un despliegue concreto.',
      },
    ],
    evidence:
      'ClawAI es un repositorio abierto con 18 servicios NestJS, un frontend Next.js, paquetes compartidos, eventos RabbitMQ y una base de datos propia por servicio. Las afirmaciones sobre el producto en este sitio se limitan al comportamiento visible en ese repositorio.',
  },
  pricing: {
    eyebrow: 'Bases de suscripción claras',
    sections: [
      {
        id: 'catalog',
        title: 'Siete puntos de partida, de gratis a alto volumen',
        body: 'El catálogo base incluye los planes Free, Starter, Plus, Pro, Team, Scale y Unlimited. Los precios mensuales van de cero a doscientos dólares estadounidenses, y los anuales equivalen a diez pagos mensuales cuando hay facturación anual. El servicio de pago resuelve en el servidor el precio activo inmutable antes de crear un pago alojado.',
      },
      {
        id: 'allowances',
        title: 'Los cupos son ponderados, no promesas de tokens en bruto',
        body: 'Las cifras publicadas diarias, semanales y mensuales representan unidades normalizadas por coste. Un modelo más caro consume el cupo de forma distinta a uno económico, de modo que un único saldo cubre proveedores heterogéneos. El catálogo también define por plan los límites de conversaciones, mensajes, concurrencia, espacios de trabajo, memoria y orquestación.',
      },
      {
        id: 'models',
        title: 'El acceso a los modelos sigue al despliegue en vivo',
        body: 'Por defecto, el repositorio expone los modelos activos sincronizados, salvo que un administrador cree restricciones explícitas de proveedor o de modelo. La política de clases de coste sembrada no prueba las reglas de una base de datos desplegada, por lo que esta página no promete un modelo concreto en un nivel concreto. Confirma el catálogo en vivo antes de elegir un plan por un modelo.',
      },
      {
        id: 'payment',
        title: 'Pago alojado con precio fijado en el servidor',
        body: 'Las integraciones de PayPal y Paymob usan un pago alojado, por lo que los números de tarjeta no pasan por la aplicación ClawAI. Los precios canónicos de los planes se guardan en dólares estadounidenses; una pasarela configurada puede liquidar en otra moneda compatible. Los impuestos, la disponibilidad geográfica, los reembolsos y la disponibilidad de la pasarela dependen del servicio desplegado y de los términos aplicables.',
      },
    ],
    evidence:
      'Los valores del catálogo son una base versionada del repositorio, no una garantía de que un administrador no haya cambiado el despliegue activo. El pago muestra y cobra el precio activo del servidor.',
  },
  'supported-models': {
    eyebrow: 'Modelos y proveedores',
    sections: [
      {
        id: 'cloud',
        title: 'Adaptadores de proveedores en la nube implementados',
        body: 'El servicio de conectores incluye adaptadores operativos para OpenAI, Anthropic, Google Gemini, DeepSeek y xAI Grok. Cada adaptador sincroniza el catálogo del proveedor cuando hay credenciales y configuración válidas. Los nombres y la disponibilidad de los modelos pueden cambiar en origen, por lo que el catálogo en vivo es la fuente fiable para un despliegue en ejecución.',
      },
      {
        id: 'local',
        title: 'Ejecución local con Ollama y llama.cpp',
        body: 'Los operadores pueden configurar Ollama y llama.cpp para modelos que se ejecutan en infraestructura controlada. Un modo de enrutamiento solo local mantiene su cadena de respaldo en proveedores locales. El ajuste al hardware, la licencia de los modelos, los límites de contexto, la calidad y el rendimiento varían, así que la elección de modelos para un despliegue privado se trata en el alcance técnico y no se promete de forma general.',
      },
      {
        id: 'selection',
        title: 'Selección manual y enrutamiento según la política',
        body: 'Las personas pueden elegir directamente un modelo disponible o dejar que la lógica de enrutamiento seleccione una vía elegible para la tarea. El enrutador considera las capacidades del modelo, su ciclo de vida, la configuración del conector y la política. Los modos de varios modelos añaden patrones de comparación y revisión, pero su disponibilidad y sus límites siguen al despliegue activo y no al texto comercial.',
      },
      {
        id: 'availability',
        title: 'Por qué esta página evita una lista congelada de versiones',
        body: 'Una lista estática de versiones de moda se queda desfasada enseguida y puede sugerir credenciales que no están configuradas. Por eso ClawAI distingue entre las familias de proveedores implementadas y la disponibilidad real de modelos. Los modelos que se muestran dentro del producto se sincronizan desde los conectores habilitados y se filtran por ciclo de vida y por las restricciones del administrador.',
      },
    ],
    evidence:
      'AWS Bedrock existe en el repositorio como andamiaje de conector, pero su sincronización de modelos no está implementada, por lo que deliberadamente no se presenta aquí como proveedor disponible.',
  },
  'security-and-privacy': {
    eyebrow: 'Seguridad y privacidad',
    sections: [
      {
        id: 'credentials',
        title: 'Las credenciales de los conectores están protegidas en reposo',
        body: 'Las claves de API de proveedores y conectores se cifran con AES-256-GCM, con un vector de inicialización aleatorio y una etiqueta de autenticación, y se enmascaran en las respuestas de la API. Los tokens de las pasarelas de pago usan cifrado autenticado con datos asociados vinculados a la fila. Estos controles respaldan afirmaciones precisas sobre la protección de credenciales, no una afirmación general sobre cada byte almacenado.',
      },
      {
        id: 'boundaries',
        title: 'Límites explícitos entre servicios y datos',
        body: 'ClawAI separa la titularidad de los servicios e impide que un servicio acceda directamente a la base de datos de otro. Las solicitudes cruzan límites HTTP autenticados o eventos de RabbitMQ, mientras que la validación, la autorización, los límites de frecuencia, las cabeceras de seguridad y los registros de auditoría se aplican en capas definidas. La configuración del despliegue sigue formando parte del perímetro de seguridad.',
      },
      {
        id: 'retention',
        title: 'La retención difiere según el tipo de dato',
        body: 'Los archivos caducan por defecto a los treinta días, salvo que un operador configure una retención indefinida. Los registros de cliente y de servidor usan índices de caducidad de treinta días en la base de datos, mientras que los registros de auditoría y los libros de uso no tienen caducidad automática en sus esquemas actuales. Las personas pueden eliminar conversaciones, memorias, paquetes de contexto y archivos; la eliminación de la cuenta no es por ahora de autoservicio.',
      },
      {
        id: 'processing',
        title: 'El tratamiento por el proveedor es una decisión del despliegue',
        body: 'Los prompts y archivos adjuntos enviados a un modelo en la nube los trata el proveedor configurado según sus propios términos. El enrutamiento solo local puede mantener la ejecución del modelo en rutas locales de Ollama, pero otros servicios habilitados pueden seguir implicando a encargados externos. Las certificaciones, la residencia de datos, el cumplimiento normativo y las garantías universales de borrado requieren pruebas aparte y aquí no se afirman.',
      },
    ],
    evidence:
      'Las declaraciones de seguridad describen controles presentes en el repositorio. No son una certificación, un informe de pruebas de penetración, un acuerdo de tratamiento de datos ni una garantía sobre la configuración final de un operador.',
  },
  /* Owner legal review pending (2026-11-23) */
  privacy: {
    eyebrow: 'Aviso de privacidad',
    sections: [
      {
        id: 'data',
        title: 'Datos que maneja la aplicación',
        body: 'ClawAI trata datos de la cuenta, conversaciones, prompts, respuestas generadas, información del modelo elegido, archivos subidos, memorias, paquetes de contexto, registros de uso, eventos de auditoría, mensajes de soporte y referencias de facturación necesarios para prestar el servicio. Los conectores del espacio de trabajo pueden tratar contenido e identificadores de los servicios que una persona autorizada decida conectar.',
      },
      {
        id: 'use',
        title: 'Cómo apoyan los datos el funcionamiento del producto',
        body: 'La aplicación usa estos datos para autenticar a los usuarios, ejecutar las acciones de IA y del espacio de trabajo solicitadas, mantener el contexto, aplicar el acceso y los cupos configurados, diagnosticar fallos, proteger la plataforma, procesar el pago alojado y responder a las solicitudes de soporte. Los proveedores externos reciben solo la información necesaria para la operación configurada, sujeta a sus propios términos.',
      },
      {
        id: 'storage',
        title: 'Controles de almacenamiento, retención y eliminación',
        body: 'Los tokens de autenticación se guardan actualmente en el almacenamiento local del navegador, junto con preferencias como el tema y el idioma; también puede guardarse allí un correo recordado de forma opcional. Los archivos y los registros operativos tienen los valores por defecto del repositorio descritos en la página de seguridad. Los usuarios pueden eliminar varios tipos de contenido, pero la eliminación completa de la cuenta requiere por ahora contactar con el operador.',
      },
      {
        id: 'choices',
        title: 'Opciones y consultas',
        body: 'Los usuarios pueden evitar los conectores opcionales, eliminar conversaciones, archivos, memorias y paquetes de contexto, borrar el almacenamiento local del navegador y elegir el enrutamiento de modelos locales cuando el despliegue lo ofrezca. Las solicitudes sobre una cuenta, las prácticas del operador, el acceso, la rectificación o la supresión deben enviarse por la página de contacto para que el operador responsable pueda verificarlas y responder.',
      },
    ],
    evidence:
      'Este aviso no afirma intencionadamente que los datos nunca se vendan, nunca se usen para entrenar o se eliminen siempre según un calendario universal, porque esos compromisos operativos y de proveedores no se establecen solo con el código del repositorio.',
  },
  /* Owner legal review pending (2026-11-23) */
  terms: {
    eyebrow: 'Términos de uso',
    sections: [
      {
        id: 'service',
        title: 'Uso del servicio',
        body: 'Estos términos regulan el acceso a la aplicación ClawAI y a sus funciones alojadas o autogestionadas. Los usuarios deben facilitar datos de cuenta exactos, proteger sus credenciales, cumplir la ley aplicable y usar solo datos, sistemas e integraciones a los que estén autorizados a acceder. Pueden aplicarse términos comerciales adicionales a un despliegue privado definido por separado.',
      },
      {
        id: 'availability',
        title: 'Modelos, integraciones y contenido generado',
        body: 'La disponibilidad de modelos y proveedores puede cambiar con la configuración, las credenciales, los servicios de origen, el estado del ciclo de vida y la política del administrador. El contenido generado puede ser incompleto, inexacto, inseguro o inadecuado para un fin concreto y debe revisarse antes de un uso de consecuencias. ClawAI no sustituye el criterio profesional jurídico, médico, financiero ni de seguridad.',
      },
      {
        id: 'billing',
        title: 'Planes y pago',
        body: 'Las suscripciones de pago usan el precio activo y el intervalo de facturación que se muestran en el pago alojado con precio fijado en el servidor. Los valores base del catálogo en el sitio de marketing pueden diferir del despliegue actual de un administrador. La disponibilidad de la pasarela, la moneda de liquidación, los impuestos, el plazo de cancelación, los reembolsos y otros derechos de pago se rigen por lo que se informa en el pago y por la ley aplicable.',
      },
      {
        id: 'changes',
        title: 'Cambios, suspensión y contacto',
        body: 'El operador puede cambiar funciones, límites, integraciones o estos términos para mantener, proteger o mejorar el servicio. El acceso puede restringirse por riesgo de seguridad, impago, conducta ilícita o incumplimiento grave. Los términos actualizados deben llevar una nueva fecha de entrada en vigor, y las dudas o disputas deben plantearse por la página de contacto para su revisión.',
      },
    ],
    evidence:
      'Estos términos del producto son una base factual de lanzamiento y no asesoramiento jurídico para una jurisdicción concreta. El operador responsable debería recabar el asesoramiento de un abogado antes de apoyarse en ellos para un servicio comercial en producción.',
  },
  /* Owner legal review pending (2026-11-23) */
  cookies: {
    eyebrow: 'Cookies y almacenamiento del navegador',
    sections: [
      {
        id: 'cookie',
        title: 'La cookie marcadora de autenticación',
        body: 'Tras iniciar sesión, el frontend establece una cookie marcadora breve que indica al middleware de enrutamiento que puede existir una sesión autenticada. El marcador no es la credencial de acceso, es legible por el cliente y usa SameSite Lax. Los tokens de acceso y de renovación se guardan actualmente por separado en el almacenamiento local del navegador, y no en una cookie de autenticación HttpOnly.',
      },
      {
        id: 'local-storage',
        title: 'Almacenamiento local que usa la interfaz',
        body: 'El navegador puede guardar el estado de autenticación, el tema, el idioma, las preferencias de vista de modelos, información transitoria del cuadro de redacción y una dirección de correo solo cuando el usuario elige la opción de recordar el correo. Borrar los datos del sitio elimina estos valores locales y puede cerrar la sesión o restablecer preferencias sin eliminar el contenido de la cuenta en el servidor.',
      },
      {
        id: 'advertising',
        title: 'Tecnología publicitaria opcional',
        body: 'El diseño de marketing contiene una integración de Google AdSense activable por configuración. El repositorio actual no incluye una plataforma completa de gestión del consentimiento, por lo que los operadores no deben habilitar el almacenamiento publicitario opcional donde la ley exija consentimiento hasta que implementen y verifiquen un flujo de consentimiento y una política regional adecuados.',
      },
      {
        id: 'control',
        title: 'Controles del navegador y actualizaciones',
        body: 'Los usuarios pueden inspeccionar, bloquear o borrar las cookies y el almacenamiento local desde su navegador, aunque bloquear el almacenamiento necesario puede impedir la autenticación o que se conserven las preferencias. Los operadores deben actualizar este aviso cuando cambien las claves de almacenamiento, la analítica, la publicidad, el pago o los servicios incrustados, y alinear la fecha de entrada en vigor con el comportamiento desplegado.',
      },
    ],
    evidence:
      'Este aviso describe el almacenamiento visible hoy en el repositorio. Un operador que despliegue sigue siendo responsable de auditar los scripts, proxies, analítica y comportamientos de pasarela adicionales que se añadan por configuración.',
  },
  /* Owner legal review pending (2026-11-23) */
  'acceptable-use': {
    eyebrow: 'Uso aceptable',
    sections: [
      {
        id: 'authorised',
        title: 'Usa solo los sistemas y datos que estás autorizado a usar',
        body: 'No uses ClawAI para acceder a cuentas, repositorios, archivos, redes, dispositivos o servicios de terceros sin un permiso claro. Las acciones del espacio de trabajo y las capacidades del agente deben permanecer dentro de la autoridad concedida por el titular correspondiente. No eludas aprobaciones, controles de acceso, límites de frecuencia, límites de seguridad ni la política del administrador.',
      },
      {
        id: 'harm',
        title: 'No facilites el daño ni la conducta ilícita',
        body: 'No uses el servicio para crear o distribuir malware, robo de credenciales, instrucciones destructivas, acoso dirigido, explotación sexual, vigilancia ilícita, suplantación engañosa de identidad ni material que infrinja la ley aplicable o los derechos de otra persona. Las decisiones de alto impacto requieren la revisión de personas cualificadas y salvaguardas adecuadas.',
      },
      {
        id: 'platform',
        title: 'Protege la fiabilidad y la integridad del servicio',
        body: 'No sondees, sobrecargues, extraigas datos masivamente, aplicues ingeniería inversa ni interfieras con un despliegue, salvo en virtud de un acuerdo autorizado de pruebas de seguridad. No automatices la creación de cuentas, no evadas cupos, no ocultes un origen abusivo, no manipules la facturación ni uses contenido generado para falsear su procedencia. Comunica las sospechas de vulnerabilidades por la vía de contacto.',
      },
      {
        id: 'enforcement',
        title: 'Revisión y aplicación',
        body: 'El operador puede investigar denuncias creíbles, conservar las pruebas de auditoría pertinentes, limitar una función, suspender una cuenta o bloquear el acceso cuando sea razonablemente necesario para proteger a los usuarios, los proveedores, la infraestructura o las obligaciones legales. El contexto, la intención, la gravedad, la reincidencia y los remedios disponibles deben orientar cualquier decisión de aplicación.',
      },
    ],
    evidence:
      'Los controles de uso aceptable complementan la autorización técnica y las políticas de los proveedores; no las sustituyen. Los despliegues privados deben adaptar los procedimientos de aplicación y de denuncia a su organización y jurisdicción.',
  },
};
