import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * La versión en español de las dos páginas del agente de código.
 *
 * Traducida de `en.constants.ts`, que es la fuente de verdad. Cada afirmación sale
 * del README y del manifiesto de la propia extensión en `apps/claw-coding-agent`,
 * no de deseos de marketing. La extensión es un cliente ligero — la autenticación,
 * los derechos de acceso, las cuotas, el historial, las credenciales de proveedor,
 * el enrutado y la inferencia se quedan en la plataforma — y el texto lo dice,
 * porque quien la instale esperando un modelo de código sin conexión la
 * desinstalará en un minuto.
 */
export const ES_CODING_AGENT_CONTENT: CodingAgentDictionary = {
  overview: {
    eyebrow: 'ClawAI en tu editor',
    title: 'El agente de código de ClawAI para VS Code',
    intro:
      'Todos los modelos de tu suscripción de ClawAI, dentro del editor que ya usas. La extensión es un cliente ligero: tu cuenta, tus cuotas, tus credenciales de proveedor y tu historial de conversaciones se quedan en la plataforma, así que el mismo hilo que empezaste en el navegador continúa en VS Code.',
    installCta: 'Instalar desde el Marketplace',
    marketplaceCta: 'Ver en el Marketplace',
    capabilitiesTitle: 'Qué hace',
    capabilities: [
      {
        title: 'Todos los modelos, una suscripción',
        body: 'Nueve familias de modelos punteros y tus modelos locales de pesos abiertos, al alcance desde el editor y sin claves de API que pegar. El enrutado ocurre en la plataforma, así que el editor nunca guarda una credencial de proveedor.',
      },
      {
        title: 'Enrutado automático o manual',
        body: 'Deja que el enrutador elija el modelo de cada mensaje, o fija la conversación a uno concreto. La decisión es la misma que toma la aplicación web, porque se toma en el mismo sitio.',
      },
      {
        title: 'Comparar y juzgar, en el editor',
        body: 'Envía un mismo prompt a varios modelos a la vez y lee las respuestas en paralelo, con una pasada opcional de juez: el mismo flujo de comparación que la aplicación web, sobre el código que tienes abierto.',
      },
      {
        title: 'Vista previa antes de aplicar',
        body: 'Las ediciones llegan como un diff revisable, no como una escritura por sorpresa. Nada toca tu árbol de trabajo hasta que lo aceptas.',
      },
      {
        title: 'Contexto que puedes inspeccionar',
        body: 'Cada respuesta lleva su registro: qué archivos se leyeron, qué modelo respondió y cuánto consumió de tu saldo. Cuando una respuesta es incorrecta, puedes ver qué estaba mirando.',
      },
      {
        title: 'Conversaciones simultáneas',
        body: 'Varias pestañas de chat con título a la vez, dos en ejecución simultánea contra modelos distintos, con el historial del backend restaurado en su sitio.',
      },
    ],
    requirementsTitle: 'Qué necesitas',
    requirementsBody:
      'VS Code 1.98 o posterior y una cuenta de ClawAI. La extensión se conecta a la plataforma alojada de ClawAI o a tu propio despliegue autoalojado: eliges cuál al iniciar sesión.',
    faqTitle: 'Preguntas frecuentes',
    faq: [
      {
        question: '¿Necesito una suscripción aparte para la extensión?',
        answer:
          'No. La extensión usa la cuenta de ClawAI que ya tienes y consume el mismo saldo que la aplicación web. No hay nada extra que comprar.',
      },
      {
        question: '¿Se envía mi código a un proveedor de modelos?',
        answer:
          'Solo lo que una petición necesita, y solo al modelo que la responde: el registro de cada respuesta indica cuál. Fija la conversación a un modelo local de pesos abiertos, o apunta la extensión a un despliegue autoalojado, y nada llega a un proveedor externo.',
      },
      {
        question: '¿Funciona con un ClawAI autoalojado?',
        answer:
          'Sí. La extensión pide la URL del backend al iniciar sesión, así que funciona contra la plataforma alojada de ClawAI o contra una instancia que corra por completo en tu propia infraestructura.',
      },
      {
        question: '¿Puedo seguir usando también la aplicación web?',
        answer:
          'Sí, y las mismas conversaciones aparecen en ambas. El historial vive en la plataforma, así que un hilo empezado en el navegador continúa en el editor y vuelve de nuevo.',
      },
    ],
  },
  install: {
    eyebrow: 'Instalación',
    title: 'Instala el agente de código de ClawAI',
    intro:
      'Tres pasos, alrededor de un minuto. La extensión está publicada en el Visual Studio Marketplace bajo el publicador verificado ClawAI.',
    stepsTitle: 'Desde dentro de VS Code',
    steps: [
      {
        title: 'Abre la vista de extensiones',
        body: 'Pulsa Ctrl+Shift+X en Windows y Linux, o Cmd+Shift+X en macOS. También puedes abrirla desde la barra de actividad de la izquierda.',
      },
      {
        title: 'Busca ClawAI Coding Agent',
        body: 'Escribe «ClawAI» en el cuadro de búsqueda. Busca la entrada publicada por ClawAI: el nombre del publicador lleva una insignia de verificación.',
      },
      {
        title: 'Instala e inicia sesión',
        body: 'Haz clic en Instalar, luego abre el panel de ClawAI e inicia sesión. Se te pedirá la URL de tu backend: deja el valor por defecto para usar la plataforma alojada de ClawAI, o escribe la tuya si autoalojas.',
      },
    ],
    cliTitle: 'Desde la línea de comandos',
    cliBody:
      'Si instalas extensiones desde un terminal o desde un script de configuración, basta con un comando. Funciona en cualquier sitio donde el comando `code` esté en tu PATH.',
    signInTitle: 'Iniciar sesión',
    signInBody:
      'El inicio de sesión ocurre en tu navegador y devuelve al editor un token de alcance limitado. La extensión nunca guarda tu contraseña, ni tiene nunca la clave de API de un proveedor de modelos: esas se quedan en la plataforma.',
    troubleshootingTitle: 'Si algo va mal',
    troubleshooting: [
      {
        question: 'La extensión no aparece en la búsqueda',
        answer:
          'Comprueba tu versión de VS Code: la extensión requiere la 1.98 o posterior. En versiones anteriores el Marketplace la oculta en lugar de ofrecer una instalación incompatible.',
      },
      {
        question: 'El enlace de instalación no hace nada',
        answer:
          'El enlace de un clic usa el protocolo `vscode:`, que solo funciona si VS Code está instalado en la máquina desde la que navegas. Usa la página del Marketplace o la línea de comandos en su lugar.',
      },
      {
        question: 'El inicio de sesión funciona, pero no aparece ningún modelo',
        answer:
          'El acceso a los modelos depende de tu plan. Revisa la página de Modelos en la aplicación web; si allí también falta un modelo, es que no está expuesto a tu cuenta, no que falte en la extensión.',
      },
      {
        question: 'No consigue conectar con mi despliegue autoalojado',
        answer:
          'La URL del backend debe ser accesible desde tu máquina y presentar un certificado en el que tu editor confíe. Un certificado autofirmado que el navegador aceptó tras un aviso se rechazará igualmente aquí.',
      },
    ],
    marketplaceCta: 'Abrir la ficha del Marketplace',
    openInEditorCta: 'Abrir en VS Code',
  },
};
