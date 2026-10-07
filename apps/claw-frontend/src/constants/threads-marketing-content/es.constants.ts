import type { ThreadsMarketingDictionary } from '@/types/threads-marketing-content.types';

export const ES_THREADS_MARKETING_CONTENT: ThreadsMarketingDictionary = {
  eyebrow: 'Novedad en ClawAI',
  title: 'ClawAI Threads: convierte un chat en un artículo público, investigado y con fuentes',
  intro:
    'Una buena conversación con una IA suele terminar en algo que vale la pena compartir. Threads toma el chat que ya tuviste, investiga el tema en la web en vivo, deja que varios modelos distintos lo escriban por separado, les exige ponerse de acuerdo en un solo borrador, lo pasa por un juez y un crítico y te lo devuelve. Tú lees cada palabra y lo apruebas. Solo entonces se convierte en una página pública con fuentes reales.',
  announcementBadge: 'Anuncio',
  announcementTitle: 'Threads ya está aquí y está abierto a todos los planes',
  announcementBody:
    'Free, Starter, Plus y todos los planes superiores pueden crear Threads, y también los administradores. Empieza desde cualquier chat con «Convertir en Thread público» o desde la página de Threads. Publicar siempre es decisión tuya: nada sale de tu cuenta hasta que apruebas el borrador final.',
  createCta: 'Crear un Thread',
  discoverCta: 'Leer Threads publicados',
  howItWorksCta: 'Ver los seis pasos',
  whatTitle: 'Qué es un Thread',
  whatParagraphs: [
    'Un Thread es un artículo público construido a partir de uno de tus chats. No es una copia de la conversación y nunca muestra el chat. Es un texto nuevo sobre el tema, apoyado en fuentes que ClawAI buscó para él y escrito por varios modelos, no por uno solo.',
    'Usar más de un modelo importa. Cada autor escribe su propio borrador sin ver los demás. Después deben ponerse de acuerdo en un único borrador, palabra por palabra. Un modelo juez puntúa el resultado con criterios explícitos y un modelo crítico anota lo que sigue débil. Si cualquiera dice que no, el borrador vuelve a otra ronda, hasta tres.',
    'Tú mandas en todo momento. Eliges los modelos, fijas un límite de gasto, puedes cancelar mientras corre y ves el borrador terminado con sus fuentes antes de que nada sea público. Tras publicar puedes retirarlo cuando quieras y la página desaparece de la búsqueda, el sitemap y los feeds.',
  ],
  stepsTitle: 'Cómo funciona, en seis pasos',
  stepsIntro:
    'El mismo flujo funciona desde un chat o desde la página de Threads. Cada paso es algo que haces tú o algo que ClawAI hace por ti.',
  steps: [
    {
      title: 'Elige el chat',
      body: 'Abre el chat que quieres compartir y elige «Convertir en Thread público» en el menú del chat. Desde la página de Threads eliges tú el chat de origen. La conversación se congela como una instantánea, así que los cambios posteriores al chat no alteran lo que originó el Thread.',
    },
    {
      title: 'Indica el tema y da tu consentimiento',
      body: 'Escribe el tema en una o dos frases, elige el tipo (artículo, artículo de investigación, guía o explicación técnica) y el idioma, y marca la casilla que confirma que entiendes que el resultado será público. Sin ese consentimiento el botón de inicio queda desactivado.',
    },
    {
      title: 'Elige los modelos',
      body: 'Elige de tres a cinco autores, un juez y un crítico con el mismo selector de modelos que usas en el chat: agrupado por proveedor, con búsqueda e insignias de capacidades y de modelos que usan crédito de conectores. Proveedores distintos dan borradores realmente distintos.',
    },
    {
      title: 'Fija un límite de gasto y empieza',
      body: 'Define lo máximo que puede gastar este Thread. Cada llamada a un modelo se comprueba contra ese límite antes de ejecutarse y el trabajo se detiene antes de superarlo. Puedes seguir las etapas en vivo y cancelar en cualquier momento.',
    },
    {
      title: 'Investigar, escribir, acordar, juzgar',
      body: 'ClawAI investiga el tema en la web en vivo y conserva las pruebas. Los autores escriben a partir de ellas, acuerdan un borrador y el juez y el crítico lo revisan. Un borrador que no pasa se corrige y se revisa de nuevo, hasta tres rondas. Si aun así falla, se te explica por qué y no se publica nada.',
    },
    {
      title: 'Revisar, aprobar y publicar',
      body: 'Lee el borrador con sus fuentes, pide cambios o edítalo, y apruébalo cuando estés conforme. Solo un borrador aprobado se convierte en página pública, con datos estructurados, lista de fuentes, contador de lectores y espacio para comentarios y reacciones. Puedes exportarlo y retirarlo cuando quieras.',
    },
  ],
  trustTitle: 'Salvaguardas incluidas, no prometidas',
  trustIntro:
    'Publicar algo con tu cuenta merece más cuidado que una respuesta de chat. Estas comprobaciones se ejecutan en cada Thread.',
  trust: [
    {
      title: 'Nada es público sin tu aprobación',
      body: 'Una buena puntuación del juez y del crítico solo hace que el borrador pueda ser revisado por ti. Nunca publica nada por sí sola.',
    },
    {
      title: 'Solo fuentes reales',
      body: 'Las citas deben salir de las pruebas reunidas en la investigación. Se rechaza un borrador que cite una dirección que la investigación nunca encontró.',
    },
    {
      title: 'Dos revisores independientes',
      body: 'El juez debe puntuar el borrador con al menos 80 sobre 100 y el crítico con al menos 75. Ambos son modelos que eliges tú, así que puedes elegir revisores de un proveedor distinto al de los autores.',
    },
    {
      title: 'Un límite de gasto estricto',
      body: 'Cada llamada reserva primero su coste contra el límite. Las reservas sin usar se liberan y un trabajo fallido o cancelado devuelve su crédito.',
    },
    {
      title: 'Tu conversación sigue siendo tuya',
      body: 'La página pública contiene el artículo, no el chat. El chat es solo el punto de partida y se lee desde una instantánea fija.',
    },
    {
      title: 'Seguridad y privacidad de los lectores',
      body: 'Los lectores pueden comentar, reaccionar, sugerir cambios y denunciar una página. Los contadores de visitas ignoran a los rastreadores y solo guardan hashes anónimos con clave, nunca una dirección ni una cuenta.',
    },
  ],
  outputsTitle: 'Qué obtienes',
  outputs: [
    {
      title: 'Una página de artículo pública',
      body: 'Una página limpia con el artículo, sus fuentes numeradas y datos estructurados para que los buscadores lo entiendan, en el idioma que elegiste.',
    },
    {
      title: 'Descubrimiento y feeds',
      body: 'Los Threads publicados aparecen en el centro de Threads, en el sitemap y en los feeds RSS, y salen de ellos en cuanto los retiras.',
    },
    {
      title: 'Exportaciones',
      body: 'Descarga un Thread como JSON, Markdown o TOON, el formato compacto y barato de pasar a otro modelo.',
    },
    {
      title: 'Una comunidad de lectores',
      body: 'Los lectores con sesión pueden comentar, reaccionar y sugerir cambios que tú aceptas o rechazas. Un contador de vistas muestra el alcance sin rastrear a nadie.',
    },
  ],
  useCasesTitle: 'Qué convierte la gente en Threads',
  useCases: [
    {
      title: 'Un chat de investigación en una explicación',
      body: 'Pasaste una hora entendiendo un tema con la IA. Conviértelo en el artículo que te habría gustado encontrar al principio.',
    },
    {
      title: 'Una solución en una guía',
      body: '¿Resolviste algo difícil en un chat? Publica los pasos que funcionan como guía, con las fuentes que los respaldan.',
    },
    {
      title: 'Una pregunta técnica en un artículo',
      body: 'Pregunta a varios modelos, deja que se pongan de acuerdo y publica el resultado como una explicación técnica revisada dos veces.',
    },
    {
      title: 'Una comparación en una publicación',
      body: '¿Usaste Compare para ver cómo responden los modelos? Publica lo que aprendiste, con la investigación detrás.',
    },
  ],
  plansTitle: 'Planes y coste',
  plansBody:
    'Threads está abierto a todos los planes. Free incluye un Thread, Starter dos al mes y Plus diez al mes, y los planes superiores incluyen más. Crear un Thread usa la misma asignación y las mismas reglas de crédito que el resto de ClawAI, y tu límite de gasto es lo máximo que puede costar. Leer, comentar y reaccionar es gratis para cualquier cuenta con sesión iniciada.',
  faqTitle: 'Preguntas frecuentes',
  faq: [
    {
      question: '¿Mi chat se hace público?',
      answer:
        'No. Solo es público el artículo que apruebas. El chat se usa como punto de partida y nunca se muestra en la página.',
    },
    {
      question: '¿Puede publicarse un Thread sin mí?',
      answer:
        'No. Cada Thread espera tu aprobación, por muy bien que lo puntúen el juez y el crítico. También puedes retirarlo en cualquier momento.',
    },
    {
      question: '¿Qué modelos escriben un Thread?',
      answer:
        'Los que tú eliges: de tres a cinco autores, un juez y un crítico, con el mismo selector del chat. Usar proveedores distintos da borradores más variados y una revisión independiente.',
    },
    {
      question: '¿Qué pasa si el juez o el crítico rechazan el borrador?',
      answer:
        'El borrador se corrige y se revisa de nuevo, hasta tres rondas. Si sigue sin pasar, el trabajo termina con un motivo claro, se libera el crédito sin usar y no se publica nada.',
    },
    {
      question: '¿Cómo sé que las fuentes son reales?',
      answer:
        'Las citas deben salir de las pruebas reunidas en la investigación y se rechaza un borrador que cite otra cosa. Ves la lista numerada de fuentes antes de aprobar.',
    },
    {
      question: '¿Cuánto cuesta un Thread?',
      answer:
        'Fijas un límite de gasto antes de empezar y el trabajo no puede superarlo. Los modelos incluidos en tu plan no usan crédito; los de crédito de conectores usan tu crédito o tu asignación gratuita, y un trabajo fallido o cancelado devuelve su reserva.',
    },
    {
      question: '¿Puedo editar un Thread después de publicarlo?',
      answer:
        'Sí. Una edición se revisa de nuevo antes de sustituir la versión pública, y los lectores pueden sugerir cambios que aceptas o rechazas.',
    },
    {
      question: '¿Qué idiomas admite?',
      answer:
        'Los Threads pueden escribirse en cualquiera de los 13 idiomas que admite ClawAI, y la página pública usa el idioma que elijas.',
    },
  ],
  closingTitle: 'Convierte tu próximo buen chat en algo que valga la pena compartir',
  closingBody:
    'Abre cualquier chat, elige «Convertir en Thread público» y mira qué sale. Solo publicas lo que apruebas.',
};
