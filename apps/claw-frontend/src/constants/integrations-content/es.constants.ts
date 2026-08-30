import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const ES_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: 'En esta página',
    faqTitle: 'Preguntas frecuentes',
    relatedTitle: 'Por dónde seguir',
    lastReviewed: 'Última revisión',
    backToHub: 'Todas las integraciones',
    ctaTitle: 'Conéctalo y compruébalo tú mismo',
    ctaBody:
      'Cada conector está disponible en todos los planes de pago. Conéctalo desde la configuración de tu espacio de trabajo.',
    startFree: 'Empieza con el plan gratuito',
    seeFeatures: 'Ver qué hace ClawAI',
    capabilitiesHeading: 'Qué puede hacer este conector',
    readLabel: 'ClawAI puede leer',
    writeLabel: 'ClawAI puede escribir',
    syncLabel: 'Sincronización',
    realTimeLabel: 'Se actualiza en tiempo real',
    pollBasedLabel: 'Se sincroniza según un calendario, no en tiempo real',
  },
  hub: {
    seo: {
      title: 'Integraciones: conecta ClawAI con tus herramientas',
      description:
        'ClawAI se conecta con 14 herramientas de trabajo — GitHub, Slack, Jira, Google Drive, Gmail y más — para que una conversación pueda leer tu trabajo y actuar sobre él, no solo hablar de él.',
      keywords: [
        'integraciones de ClawAI',
        'conectores de IA para el espacio de trabajo',
        'integraciones de herramientas con IA',
      ],
    },
    eyebrow: 'Integraciones',
    title: 'Conecta ClawAI con las herramientas que ya usas',
    summary:
      'Cada conector de aquí abajo es real y ya está en producción, no es un plan futuro: qué puede leer, qué puede escribir y si se actualiza en tiempo real o según un calendario, todo extraído del mismo registro sobre el que funciona el propio producto.',
    topicsHeading: 'Elige un conector',
    cardSummaries: {
      [IntegrationTopic.GITHUB]:
        'Repositorios, incidencias, pull requests — leer, comentar, revisar, aprobar.',
      [IntegrationTopic.GITLAB]:
        'Proyectos, merge requests, incidencias — comentar, aprobar, sugerir cambios.',
      [IntegrationTopic.BITBUCKET]:
        'Repositorios y pull requests — comentar, aprobar, crear incidencias.',
      [IntegrationTopic.SLACK]:
        'Canales y mensajes — leer el contexto, enviar y responder mensajes.',
      [IntegrationTopic.JIRA]: 'Incidencias y proyectos — crear tickets, actualizarlos, comentar.',
      [IntegrationTopic.CONFLUENCE]:
        'Páginas y espacios — leer documentación, crear y editar páginas.',
      [IntegrationTopic.CLICKUP]:
        'Tareas, espacios, carpetas — crear, actualizar y comentar tareas.',
      [IntegrationTopic.FIGMA]:
        'Archivos y comentarios — leer diseños, publicar comentarios, derivarlos a Jira.',
      [IntegrationTopic.GOOGLE_DRIVE]:
        'Archivos y carpetas — leer documentos y hojas de cálculo, subir y mover archivos.',
      [IntegrationTopic.GMAIL]:
        'Hilos y mensajes — leer correo, enviar, responder y redactar borradores.',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]:
        'Sitios, documentos, listas — leer y subir documentos, gestionar elementos de lista.',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]: 'Archivos y carpetas — leer, subir y mover archivos.',
      [IntegrationTopic.GOOGLE_CALENDAR]:
        'Reuniones y eventos — leer tu calendario, crear eventos.',
      [IntegrationTopic.OUTLOOK_CALENDAR]:
        'Reuniones y eventos — leer tu calendario, crear eventos.',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'Integración de IA con GitHub — ClawAI',
        description:
          'Conecta GitHub a ClawAI para leer repositorios, incidencias y pull requests, y para redactar descripciones de PR, comentar, sugerir cambios y aprobar — desde una conversación.',
        keywords: [
          'integración de IA con GitHub',
          'revisión de código con IA en GitHub',
          'chatear con un repositorio de GitHub',
        ],
      },
      eyebrow: 'Alojamiento de código',
      title: 'GitHub',
      summary:
        'Conecta una cuenta u organización de GitHub para que ClawAI pueda leer tus repositorios, incidencias y pull requests, y actuar sobre ellos — redactando descripciones, dejando comentarios, sugiriendo cambios y aprobando revisiones — desde dentro de una conversación.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'Una vez conectado, ClawAI puede leer el contenido de los repositorios, las incidencias, los pull requests y los comentarios. Se admiten actualizaciones en tiempo real — un webhook avisa a ClawAI cuando algo cambia en lugar de esperar a una sincronización periódica — y la sincronización incremental hace que releer un repositorio grande no signifique releerlo entero desde cero cada vez.',
            'En el lado de la escritura, ClawAI puede crear una incidencia, comentar en una incidencia, redactar la descripción de un pull request, comentar en un pull request, sugerir un cambio de código concreto y aprobar un pull request. Cada escritura ocurre como una acción explícita que tú revisas, nunca en silencio de fondo.',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: 'Cómo encaja con el Agente de Código',
          paragraphs: [
            'El conector de GitHub y el Agente de Código resuelven problemas relacionados pero distintos. El Agente de Código trabaja dentro de tu editor sobre un repositorio descargado localmente. El conector de GitHub trabaja dentro de una conversación de ClawAI sobre los datos alojados en GitHub — incidencias, pull requests y comentarios de revisión — sin que nadie tenga el repositorio abierto en su máquina.',
            'Un patrón habitual: usar el conector para triar incidencias y redactar descripciones de PR desde el chat, y recurrir al Agente de Código cuando el trabajo consiste en escribir y ejecutar código de verdad.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Cómo se conecta',
          paragraphs: [
            'GitHub admite OAuth (la opción por defecto — inicias sesión con GitHub y concedes acceso con alcance limitado) o un token de acceso personal, para cuentas y automatizaciones que prefieren un token. GitHub Enterprise es compatible apuntando el conector a la URL de la API de tu instancia en lugar de a github.com.',
          ],
        },
      ],
      faq: [
        {
          question: '¿ClawAI puede comentar mis pull requests automáticamente?',
          answer:
            'Puede dejar un comentario cuando se lo pidas — revisando un diff y publicando comentarios, o aprobando una vez que queda satisfecho. No comenta sin que se lo pidas; toda escritura es una acción que tú solicitas.',
        },
        {
          question: '¿Funciona con repositorios privados?',
          answer:
            'Sí, sujeto al acceso que concedas durante la conexión. ClawAI solo ve lo que puede ver la cuenta o el token conectado.',
        },
        {
          question: '¿Esto sustituye al Agente de Código?',
          answer:
            'No — cubren superficies distintas. El conector llega a las incidencias y pull requests alojados en GitHub desde el chat; el Agente de Código trabaja sobre tu código descargado localmente en tu editor.',
        },
      ],
      productNote:
        'El conector de GitHub es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI, y cada acción de escritura que realiza es una que tú pediste.',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'Integración de IA con GitLab — ClawAI',
        description:
          'Conecta GitLab a ClawAI para leer proyectos, merge requests e incidencias, y para comentar, sugerir cambios, actualizar descripciones y aprobar — desde una conversación.',
        keywords: [
          'integración de IA con GitLab',
          'revisión de merge requests con IA',
          'asistente de IA para GitLab',
        ],
      },
      eyebrow: 'Alojamiento de código',
      title: 'GitLab',
      summary:
        'Conecta una cuenta de GitLab o una instancia autoalojada para que ClawAI pueda leer tus proyectos, merge requests e incidencias, y actuar sobre ellos desde una conversación — comentando, sugiriendo cambios, actualizando descripciones y aprobando.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer proyectos, incidencias, merge requests y comentarios, con actualizaciones en tiempo real vía webhook. La sincronización es una relectura completa en cada ejecución en lugar de una sincronización incremental, algo que importa más en proyectos muy grandes que en los pequeños.',
            'En el lado de la escritura: comentar en un merge request, aprobarlo, actualizar su descripción, sugerir un cambio de código concreto, añadir un comentario en línea sobre una imagen, crear una incidencia y comentar en una incidencia. Cada una es una acción explícita que tú solicitas.',
          ],
        },
        {
          id: 'self-managed',
          heading: 'GitLab autoalojado',
          paragraphs: [
            'El conector no está limitado a gitlab.com — apuntarlo a la URL de tu propia instancia durante la configuración conecta ClawAI a un GitLab autoalojado de la misma forma en que se conecta al servicio alojado.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Cómo se conecta',
          paragraphs: [
            'GitLab admite OAuth o un token de acceso personal. Ambos quedan limitados al alcance que concedas durante la conexión — ClawAI nunca tiene más acceso del que permite el token o la concesión de OAuth.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Funciona con GitLab autoalojado?',
          answer:
            'Sí — indica la URL de la instancia al conectarte, y ClawAI habla con tu propia instalación de GitLab en lugar de con gitlab.com.',
        },
        {
          question: '¿Puede sugerir cambios de código reales, no solo comentarios?',
          answer:
            'Sí, mediante la acción de cambio sugerido, que publica una sugerencia de diff concreta y aplicable en el merge request, en lugar de un comentario de texto plano.',
        },
        {
          question: '¿La sincronización de los merge requests ocurre en tiempo real?',
          answer:
            'Sí — el conector admite webhooks, así que ClawAI recibe una notificación de los cambios en lugar de consultarlos periódicamente.',
        },
      ],
      productNote:
        'GitLab es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI, cada uno con sus propias capacidades de lectura y escritura documentadas en su propia página.',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'Integración de IA con Bitbucket — ClawAI',
        description:
          'Conecta Bitbucket Cloud a ClawAI para leer repositorios y pull requests, y para comentar, aprobar y crear incidencias directamente desde una conversación.',
        keywords: [
          'integración de IA con Bitbucket',
          'asistente de IA para Bitbucket',
          'búsqueda de código con IA',
        ],
      },
      eyebrow: 'Alojamiento de código',
      title: 'Bitbucket',
      summary:
        'Conecta una cuenta de Bitbucket Cloud para que ClawAI pueda leer tus repositorios y pull requests, y actuar sobre ellos — comentando, aprobando y creando incidencias — desde una conversación.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer repositorios y pull requests, con soporte para actualizaciones en tiempo real vía webhook. La sincronización es una relectura completa en cada ejecución, no una sincronización incremental.',
            'En el lado de la escritura: comentar en un pull request, aprobar un pull request y crear una incidencia. Cada una es una acción explícita, no algo que ClawAI hace por su cuenta.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Cómo se conecta',
          paragraphs: [
            'Bitbucket se conecta mediante OAuth — inicias sesión con tu cuenta de Atlassian y concedes acceso con alcance limitado a los espacios de trabajo y repositorios que elijas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Se admite Bitbucket Server o Data Center?',
          answer:
            'El conector está dirigido a Bitbucket Cloud. Bitbucket Server o Data Center autoalojados no son compatibles actualmente.',
        },
        {
          question: '¿Puede aprobar un pull request por mí?',
          answer:
            'Puede hacerlo, cuando se lo pidas tras revisar el diff — aprobar es una acción explícita que tú solicitas, no un paso automático.',
        },
      ],
      productNote:
        'Bitbucket es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI.',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'Integración de IA con Slack — ClawAI',
        description:
          'Conecta Slack a ClawAI para buscar en canales y mensajes, y para enviar y responder mensajes — de modo que una conversación pueda actuar sobre lo que tu equipo está tratando.',
        keywords: [
          'asistente de IA para Slack',
          'buscar mensajes de Slack con IA',
          'integración de Slack con IA',
        ],
      },
      eyebrow: 'Comunicación',
      title: 'Slack',
      summary:
        'Conecta un espacio de trabajo de Slack para que ClawAI pueda leer canales, mensajes y usuarios, y enviar o responder mensajes en tu nombre — convirtiendo una búsqueda por hilos dispersos en una pregunta que haces una sola vez.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer mensajes, canales y usuarios, con actualizaciones en tiempo real mediante los webhooks de eventos de Slack — los mensajes nuevos son visibles en cuanto llegan, no en la siguiente sincronización.',
            'En el lado de la escritura: enviar un mensaje a un canal y responder dentro de un hilo. Ambas requieren tu petición explícita; ClawAI nunca publica en Slack sin que se lo pidas.',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: 'Para qué sirve',
          paragraphs: [
            'Encontrar una decisión enterrada en un hilo de hace tres semanas, resumir la discusión de un canal antes de una reunión, o redactar una respuesta que haga referencia al contexto de varios mensajes — el tipo de búsqueda que un buscador de Slack no maneja bien porque compara palabras clave, no significado.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puede ClawAI leer canales privados?',
          answer:
            'Solo los canales de los que la cuenta conectada es miembro y a los que concede acceso durante la conexión — ClawAI nunca ve de un espacio de trabajo más de lo que puede ver el usuario que lo conectó.',
        },
        {
          question: '¿Publicará en Slack sin que yo se lo pida?',
          answer:
            'No. Enviar o responder un mensaje siempre es una acción explícita que solicitas en la conversación.',
        },
      ],
      productNote:
        'Slack es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI, con actualizaciones en tiempo real vía webhook.',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'Integración de IA con Jira — ClawAI',
        description:
          'Conecta Jira a ClawAI para leer incidencias y proyectos, y para crear tickets, actualizarlos y comentar — incluyendo convertir un comentario de Figma directamente en un ticket.',
        keywords: [
          'asistente de IA para Jira',
          'IA para tickets de Jira',
          'integración de Jira con IA',
        ],
      },
      eyebrow: 'Gestión de proyectos',
      title: 'Jira',
      summary:
        'Conecta un sitio de Atlassian Jira para que ClawAI pueda leer incidencias, tickets, proyectos y comentarios, y actuar sobre ellos — creando y actualizando tickets, comentando, y convirtiendo un comentario de diseño de Figma directamente en un ticket de Jira o una historia de usuario.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer incidencias, tickets, proyectos y comentarios, con actualizaciones en tiempo real vía webhook.',
            'En el lado de la escritura: crear un ticket, crear un ticket directamente a partir de un comentario de Figma, redactar una historia de usuario a partir de un archivo de Figma, actualizar una incidencia y comentar en un ticket. Las acciones de Figma a Jira son las más distintivas — cierran el círculo entre una revisión de diseño y una pieza de trabajo registrada sin volver a escribir nada.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Cómo se conecta',
          paragraphs: [
            'Jira admite OAuth o autenticación básica con un token de API, junto con la URL de tu sitio de Jira. La autenticación básica es adecuada para cuentas de servicio y automatizaciones que no deberían pasar por un flujo interactivo de OAuth.',
          ],
        },
      ],
      faq: [
        {
          question:
            '¿Puede crear un ticket de Jira a partir de un comentario de Figma automáticamente?',
          answer:
            'Puede hacerlo, cuando se lo pidas — la acción lee el comentario de Figma y crea el ticket de Jira o el borrador de historia de usuario correspondiente en un solo paso, en lugar de que tú copies los detalles a mano entre las dos herramientas.',
        },
        {
          question: '¿Funciona con Jira Server, o solo con Jira Cloud?',
          answer:
            'El conector está dirigido a la API REST en la nube de Atlassian Jira. Una instancia autoalojada de Jira Server no es compatible actualmente.',
        },
      ],
      productNote:
        'Jira es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI, y se combina directamente con el conector de Figma para el traspaso de diseño a ticket.',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'Integración de IA con Confluence — ClawAI',
        description:
          'Conecta Confluence a ClawAI para leer páginas, espacios y comentarios, y para crear y editar páginas — de modo que la documentación quede a una conversación de distancia.',
        keywords: [
          'asistente de IA para Confluence',
          'integración de Confluence con IA',
          'búsqueda de documentación con IA',
        ],
      },
      eyebrow: 'Documentación',
      title: 'Confluence',
      summary:
        'Conecta un sitio de Atlassian Confluence para que ClawAI pueda leer páginas, espacios y comentarios, y crear o editar páginas directamente — convirtiendo una búsqueda en la documentación en una pregunta y una actualización de la documentación en una petición.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer páginas, comentarios y los proyectos (espacios) que los organizan. Este conector no admite actualizaciones en tiempo real vía webhook — la sincronización ocurre bajo petición en lugar de mediante notificaciones push, así que una página editada hace un momento puede no reflejarse hasta la siguiente sincronización.',
            'En el lado de la escritura: crear una página y editar una página existente. Ambas son acciones explícitas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿La sincronización de Confluence ocurre en tiempo real?',
          answer:
            'No — a diferencia de GitHub o Slack, Confluence no envía actualizaciones a ClawAI. El contenido se sincroniza cuando se solicita, no en el momento en que cambia.',
        },
        {
          question: '¿Puede escribir documentación por mí, no solo leerla?',
          answer:
            'Sí — crear y editar páginas son ambas acciones de escritura compatibles, cada una una petición explícita que tú haces.',
        },
      ],
      productNote:
        'Confluence es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI.',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'Integración de IA con Figma — ClawAI',
        description:
          'Conecta Figma a ClawAI para leer archivos y comentarios, publicar comentarios y derivar un comentario de diseño directamente a Jira como ticket o historia de usuario.',
        keywords: [
          'asistente de IA para Figma',
          'integración de Figma con IA',
          'automatización de Figma a Jira',
        ],
      },
      eyebrow: 'Diseño',
      title: 'Figma',
      summary:
        'Conecta una cuenta de Figma para que ClawAI pueda leer archivos y comentarios, publicar un comentario propio y — combinado con el conector de Jira — convertir un comentario de diseño directamente en un ticket registrado o un borrador de historia de usuario.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer archivos de Figma y sus comentarios, con actualizaciones en tiempo real vía webhook. En el lado de la escritura, puede publicar un comentario en un archivo.',
            'La ventaja principal de Figma en ClawAI viene de combinarlo con Jira: un comentario sobre un diseño puede convertirse en un ticket de Jira o en un borrador de historia de usuario sin que nadie tenga que volver a escribir el contexto a mano — consulta la página de la integración de Jira para ver las acciones concretas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puede ClawAI leer el diseño real, no solo los comentarios?',
          answer:
            'Puede leer el contenido del archivo y los comentarios a través de la API de Figma. Lo que puede resumir de forma significativa sobre el diseño visual depende del archivo — los comentarios y la estructura son la fuente más fiable.',
        },
        {
          question: '¿También necesito el conector de Jira para el flujo de Figma a ticket?',
          answer:
            'Sí — las acciones de Figma a Jira viven en el conector de Jira y requieren que ambas conexiones estén activas.',
        },
      ],
      productNote:
        'Figma es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI, más útil combinado con Jira.',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'Integración de IA con ClickUp — ClawAI',
        description:
          'Conecta ClickUp a ClawAI para leer tareas, espacios y carpetas, y para crear, actualizar y comentar tareas directamente desde una conversación.',
        keywords: [
          'asistente de IA para ClickUp',
          'integración de ClickUp con IA',
          'gestión de tareas con IA',
        ],
      },
      eyebrow: 'Gestión de proyectos',
      title: 'ClickUp',
      summary:
        'Conecta un espacio de trabajo de ClickUp para que ClawAI pueda leer tareas, espacios y carpetas, y crear, actualizar o comentar tareas directamente desde una conversación.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer tareas, espacios, carpetas y comentarios. Este conector no admite actualmente actualizaciones en tiempo real vía webhook — la entrega del webhook subyacente no se puede verificar como auténtica, así que la sincronización ocurre bajo petición en lugar de mediante push.',
            'En el lado de la escritura: crear una tarea, actualizar una tarea y comentar en una tarea.',
          ],
        },
      ],
      faq: [
        {
          question: '¿ClickUp se actualiza en tiempo real?',
          answer:
            'No — la sincronización ocurre cuando se solicita, no mediante una notificación push en vivo. Trátalo igual que Confluence o Google Drive: actualizado a fecha de la última sincronización, no en vivo.',
        },
        {
          question: '¿Puede mover una tarea entre estados?',
          answer:
            'Las actualizaciones de tareas cubren cambios de estado y de campos en una tarea existente; el conjunto exacto de campos actualizables depende de cómo esté configurado tu espacio de trabajo de ClickUp.',
        },
      ],
      productNote:
        'ClickUp es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI. La sincronización es programada, no en tiempo real.',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'Integración de IA con Google Drive — ClawAI',
        description:
          'Conecta Google Drive a ClawAI para leer documentos y hojas de cálculo, y para subir y mover archivos — con soporte para sincronizar solo lo que cambió.',
        keywords: [
          'asistente de IA para Google Drive',
          'búsqueda de documentos con IA',
          'integración de Google Drive con IA',
        ],
      },
      eyebrow: 'Archivos',
      title: 'Google Drive',
      summary:
        'Conecta una cuenta de Google Drive para que ClawAI pueda leer archivos, documentos y hojas de cálculo, y subir o mover archivos — con sincronización incremental, de modo que resincronizar un Drive grande no signifique releerlo todo cada vez.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer archivos, documentos y hojas de cálculo. Este conector admite sincronización incremental — tras la primera lectura completa, las sincronizaciones posteriores solo obtienen lo que realmente cambió, algo que importa una vez que un Drive tiene miles de archivos. Actualmente no admite actualizaciones en tiempo real vía webhook; la sincronización ocurre bajo petición.',
            'En el lado de la escritura: subir un archivo y mover un archivo entre carpetas.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Conectar Drive le da a ClawAI acceso a todo lo que contiene?',
          answer:
            'Solo a lo que la cuenta de Google conectada concede acceso durante OAuth — normalmente limitado a los archivos que la cuenta ya puede abrir, no una concesión a nivel de organización.',
        },
        {
          question: '¿Resincronizar un Drive grande será lento cada vez?',
          answer:
            'La primera sincronización lee lo que necesita; la sincronización incremental hace que las siguientes solo obtengan los cambios, así que no se vuelve más lenta a medida que crece el Drive una vez completada la sincronización inicial.',
        },
      ],
      productNote:
        'Google Drive es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI, con sincronización incremental para bibliotecas grandes.',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'Integración de IA con Gmail — ClawAI',
        description:
          'Conecta Gmail a ClawAI para leer hilos y mensajes, y para enviar, responder y redactar correos directamente desde una conversación.',
        keywords: [
          'asistente de IA para Gmail',
          'integración de correo con IA',
          'integración de Gmail con IA',
        ],
      },
      eyebrow: 'Correo electrónico',
      title: 'Gmail',
      summary:
        'Conecta una cuenta de Gmail para que ClawAI pueda leer hilos, mensajes y etiquetas, y enviar, responder o redactar correos directamente desde una conversación — con sincronización incremental, de modo que no vuelve a leer todo tu buzón en cada comprobación.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer hilos de correo, mensajes y etiquetas, con sincronización incremental. Actualmente no admite notificaciones push en tiempo real para correo nuevo — la sincronización ocurre bajo petición.',
            'En el lado de la escritura: enviar un correo nuevo, responder a un hilo existente y crear un borrador sin enviarlo — útil cuando quieres que ClawAI prepare una respuesta para que la revises antes de que salga.',
          ],
        },
      ],
      faq: [
        {
          question: '¿ClawAI enviará correo sin que yo lo apruebe?',
          answer:
            'No. Enviar es una acción explícita; la acción de borrador existe precisamente para los casos en los que quieres revisar antes de que se envíe algo.',
        },
        {
          question: '¿Revisa mi bandeja de entrada continuamente?',
          answer:
            'Se sincroniza bajo petición en lugar de mediante una conexión push en vivo, así que el correo nuevo es visible a fecha de la última sincronización, no al instante.',
        },
      ],
      productNote:
        'Gmail es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'Integración de IA con SharePoint — ClawAI',
        description:
          'Conecta Microsoft SharePoint a ClawAI para leer documentos y listas de sitio, y para subir documentos y gestionar elementos de lista — desde una conversación.',
        keywords: [
          'asistente de IA para SharePoint',
          'integración de SharePoint con IA',
          'búsqueda de documentos de Microsoft con IA',
        ],
      },
      eyebrow: 'Archivos',
      title: 'Microsoft SharePoint',
      summary:
        'Conecta un sitio de Microsoft SharePoint para que ClawAI pueda leer documentos, archivos y listas de sitio, y subir documentos o gestionar elementos de lista directamente desde una conversación.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer documentos, archivos y las listas que organizan un sitio de SharePoint. La sincronización ocurre bajo petición en lugar de mediante una conexión push en tiempo real.',
            'En el lado de la escritura: subir un documento, crear un elemento de lista y actualizar un elemento de lista existente.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Cómo se conecta',
          paragraphs: [
            'SharePoint requiere el ID de tu inquilino (tenant) de Microsoft junto con OAuth, para que el conector sepa a qué SharePoint de qué organización acceder.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Necesita el ID de mi inquilino de Microsoft 365?',
          answer:
            'Sí — SharePoint está delimitado por inquilino, así que el conector necesita el ID de tu inquilino para saber a qué SharePoint de qué organización conectarse.',
        },
        {
          question: '¿El contenido se actualiza en tiempo real?',
          answer:
            'No — la sincronización ocurre bajo petición, no mediante una notificación push en vivo.',
        },
      ],
      productNote:
        'SharePoint es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'Integración de IA con OneDrive — ClawAI',
        description:
          'Conecta Microsoft OneDrive a ClawAI para leer archivos y documentos, y para subir y mover archivos — con soporte para sincronizar solo lo que cambió.',
        keywords: [
          'asistente de IA para OneDrive',
          'integración de OneDrive con IA',
          'búsqueda de archivos de Microsoft con IA',
        ],
      },
      eyebrow: 'Archivos',
      title: 'Microsoft OneDrive',
      summary:
        'Conecta una cuenta de Microsoft OneDrive para que ClawAI pueda leer archivos y documentos, y subir o mover archivos directamente desde una conversación — con sincronización incremental para bibliotecas grandes.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer archivos y documentos, con sincronización incremental — tras la primera lectura completa, las sincronizaciones posteriores solo obtienen lo que cambió. Las notificaciones push en tiempo real no son compatibles actualmente; la sincronización ocurre bajo petición.',
            'En el lado de la escritura: subir un archivo y mover un archivo entre carpetas.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Cómo se conecta',
          paragraphs: [
            'OneDrive requiere el ID de tu inquilino de Microsoft junto con OAuth, igual que SharePoint.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Necesita el ID de mi inquilino de Microsoft 365?',
          answer:
            'Sí, de la misma forma que SharePoint — OneDrive for Business está delimitado por inquilino.',
        },
        {
          question: '¿Un OneDrive grande es lento de mantener sincronizado?',
          answer:
            'La primera sincronización es la costosa; la sincronización incremental hace que las siguientes solo obtengan lo que realmente cambió.',
        },
      ],
      productNote:
        'OneDrive es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI, con sincronización incremental para bibliotecas grandes.',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'Integración de IA con Google Calendar — ClawAI',
        description:
          'Conecta Google Calendar a ClawAI para leer reuniones y eventos, y para crear un evento de calendario directamente desde una conversación.',
        keywords: [
          'asistente de IA para Google Calendar',
          'integración de Google Calendar con IA',
          'programar reuniones con IA',
        ],
      },
      eyebrow: 'Calendario',
      title: 'Google Calendar',
      summary:
        'Conecta un Google Calendar para que ClawAI pueda leer tus reuniones y eventos, y crear un evento de calendario nuevo directamente desde una conversación, con sincronización incremental para que consultar tu agenda siga siendo rápido.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer reuniones y eventos, con sincronización incremental. Las notificaciones push en tiempo real no son compatibles actualmente.',
            'En el lado de la escritura, el conector admite actualmente una sola acción: crear un evento de calendario. Reprogramar, eliminar o responder a una invitación existente no son aún acciones de escritura compatibles — esta página se actualizará si eso cambia.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puede ClawAI reprogramar una reunión existente por mí?',
          answer:
            'Todavía no — el conector actualmente admite crear un evento nuevo, no editar o reprogramar uno existente.',
        },
        {
          question: '¿Ve todo mi calendario, incluidos otros calendarios a los que tengo acceso?',
          answer:
            'El acceso está limitado a lo que concedas durante la conexión, que normalmente es tu calendario principal a menos que lo amplíes explícitamente.',
        },
      ],
      productNote:
        'Google Calendar es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI. Su acción de escritura está actualmente limitada a crear eventos.',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'Integración de IA con Outlook Calendar — ClawAI',
        description:
          'Conecta Outlook Calendar a ClawAI para leer reuniones y eventos, y para crear un evento de calendario directamente desde una conversación.',
        keywords: [
          'asistente de IA para Outlook Calendar',
          'integración de Outlook con IA',
          'programar reuniones con IA en Microsoft',
        ],
      },
      eyebrow: 'Calendario',
      title: 'Outlook Calendar',
      summary:
        'Conecta un Microsoft Outlook Calendar para que ClawAI pueda leer tus reuniones y eventos, y crear un evento de calendario nuevo directamente desde una conversación.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Qué cubre el conector',
          paragraphs: [
            'ClawAI puede leer reuniones y eventos. Este conector no admite actualmente sincronización incremental ni notificaciones push en tiempo real — cada sincronización lee lo que necesita bajo petición.',
            'En el lado de la escritura, el conector admite actualmente una sola acción: crear un evento de calendario. Reprogramar, eliminar o responder a una invitación existente no son compatibles todavía.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Cómo se conecta',
          paragraphs: [
            'Outlook Calendar admite OAuth con un ID de inquilino opcional — déjalo en blanco para usar el punto de conexión multiinquilino de Microsoft, o indícalo para una organización concreta.',
          ],
        },
      ],
      faq: [
        {
          question: '¿Puede ClawAI reprogramar una reunión existente por mí?',
          answer: 'Todavía no — actualmente solo se admite crear un evento nuevo.',
        },
        {
          question: '¿Necesito indicar un ID de inquilino?',
          answer:
            'Solo si quieres que el conector se limite a una organización de Microsoft concreta. Dejarlo en blanco usa el punto de conexión multiinquilino, que funciona para la mayoría de las cuentas personales y de organización.',
        },
      ],
      productNote:
        'Outlook Calendar es uno de los {connectorCount} conectores de espacio de trabajo en ClawAI. Su acción de escritura está actualmente limitada a crear eventos.',
    },
  },
};
