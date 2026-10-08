import { TourId } from '@/enums/tour-id.enum';
import type { TourDictionary } from '@/types/tour.types';

export const ES_TOURS_CONTENT: TourDictionary = {
  ui: {
    next: 'Siguiente',
    back: 'Atrás',
    skip: 'Saltar la visita',
    done: 'Hecho',
    stepOf: 'Paso {current} de {total}',
    dialogLabel: 'Visita guiada del producto',
    launcherLabel: 'Visitas y ayuda',
    launcherTitle: 'Visitas guiadas',
    launcherHint: 'Un recorrido corto por lo que ves en esta página.',
    launcherHere: 'En esta página',
    launcherDone: 'Hecha',
    launcherStart: 'Empezar',
    launcherRestart: 'Repetir',
    offerTitle: '¿Eres nuevo? Haz una visita de 1 minuto',
    offerStart: 'Muéstramelo',
    offerLater: 'Ahora no',
    offerNever: 'No volver a mostrar visitas',
    launcherNoneHere: 'Esta página aún no tiene visita.',
    launcherStopOffers: 'No volver a ofrecer visitas',
    launcherResumeOffers: 'Volver a ofrecer visitas',
    launcherOffersStopped:
      'Las ofertas de visitas están desactivadas. Aquí aún puedes repetir cualquier visita de esta página.',
    missingTarget: 'Esta parte no está en pantalla ahora. Ábrela y vuelve a empezar la visita.',
  },
  tours: {
    [TourId.ThreadsIntro]: {
      title: 'Conoce Threads',
      description: 'Convierte un chat en un artículo público, investigado y con fuentes.',
      steps: {
        welcome: {
          title: 'Threads en un minuto',
          body: 'Un Thread es un artículo público escrito a partir de uno de tus chats: investigado en la web en vivo, escrito por varios modelos, revisado por un juez y un crítico, y publicado solo cuando lo apruebas.',
        },
        list: {
          title: 'Tus Threads',
          body: 'Cada Thread que empiezas aparece aquí con su estado. Abre uno para seguirlo mientras corre, revisar el borrador, aprobarlo, exportarlo o compartirlo.',
        },
        create: {
          title: 'Crea un Thread',
          body: 'Elige un chat de origen, di de qué trata el artículo y escoge los modelos. También puedes empezar desde cualquier chat con «Convertir en Thread público».',
        },
        process: {
          title: 'Qué pasa después',
          body: 'ClawAI investiga el tema, de tres a cinco autores escriben de forma independiente, acuerdan un borrador y el juez y el crítico lo revisan hasta tres rondas.',
        },
        approve: {
          title: 'Tú decides',
          body: 'Nada es público hasta que lees el borrador y lo apruebas. Puedes retirarlo cuando quieras y un límite de gasto que fijes acota el coste.',
        },
      },
    },
    [TourId.ThreadCreate]: {
      title: 'Rellena el formulario del Thread',
      description: 'Qué hace cada campo antes de empezar.',
      steps: {
        topic: {
          title: 'El tema',
          body: 'Di qué debe explicar o responder el artículo. Una pregunta clara da a los autores y a la investigación un objetivo claro.',
        },
        kind: {
          title: 'Tipo e idioma',
          body: 'Elige artículo, artículo de investigación, guía o explicación técnica, y el idioma en que se escribirá la página pública.',
        },
        cap: {
          title: 'Gasto máximo',
          body: 'Lo máximo que puede costar este Thread. Cada llamada a un modelo se comprueba antes contra él, y el trabajo se detiene antes de superarlo.',
        },
        models: {
          title: 'Autores, juez y crítico',
          body: 'Elige de tres a cinco autores, un juez y un crítico con el mismo selector del chat. Proveedores distintos dan borradores más variados y una revisión independiente.',
        },
        consent: {
          title: 'Tu consentimiento',
          body: 'Márcalo para confirmar que entiendes que el artículo final será público y se podrá buscar. Empezar queda desactivado hasta que lo hagas.',
        },
        start: {
          title: 'Iniciar la generación',
          body: 'ClawAI inicia el trabajo y abre la página de revisión, donde puedes seguir cada etapa y cancelar cuando quieras.',
        },
      },
    },
    [TourId.ThreadReview]: {
      title: 'Revisa un Thread',
      description: 'Síguelo, léelo, apruébalo, expórtalo, compártelo.',
      steps: {
        status: {
          title: 'Progreso en vivo',
          body: 'Mientras corre el trabajo, esta línea dice qué ocurre: investigar, autores escribiendo, acordar un borrador, el juez y el crítico. Cancelar lo detiene y devuelve el crédito sin usar.',
        },
        draft: {
          title: 'El borrador y sus fuentes',
          body: 'Cuando pasan las revisiones aparece el borrador con sus fuentes numeradas. Léelo con atención: puedes editarlo o pedir cambios antes de que algo sea público.',
        },
        approve: {
          title: 'Aprueba y publica',
          body: 'Solo un borrador aprobado se convierte en página pública. Retirar lo quita de la página, la búsqueda, el sitemap y los feeds.',
        },
        export: {
          title: 'Descárgalo',
          body: 'Marca uno o varios formatos y descárgalos juntos en un ZIP, o guarda un PDF con el diálogo de impresión de tu navegador.',
        },
        share: {
          title: 'Compártelo',
          body: 'Copia el enlace, usa el menú de compartir de tu dispositivo o publícalo en WhatsApp, Facebook, LinkedIn, X, Telegram, Reddit o por correo una vez publicado.',
        },
      },
    },
    [TourId.ChatIntro]: {
      title: 'Recorrido por el chat',
      description: 'Todo lo que rodea al cuadro de mensaje, en un minuto.',
      steps: {
        input: {
          title: 'Escribe aquí',
          body: 'Escribe tu mensaje y pulsa Enter para enviar. Shift+Enter añade una línea. También puedes pegar imágenes y archivos.',
        },
        context: {
          title: 'Contexto',
          body: 'Añade paquetes de contexto, previsualiza lo que verá el modelo y usa tu memoria, para que las respuestas se apoyen en tu material.',
        },
        model: {
          title: 'Qué modelo responde',
          body: 'Déjalo en Auto y ClawAI elige un modelo para cada mensaje, o elige uno concreto.',
        },
        attach: {
          title: 'Adjunta archivos',
          body: 'Sube documentos, imágenes, audio o vídeo. Se extrae el texto para que cualquier modelo pueda leerlo.',
        },
        research: {
          title: 'Busca en la web',
          body: 'Activa la investigación web cuando la respuesta necesite datos actuales y fuentes.',
        },
        prompts: {
          title: 'Biblioteca de prompts',
          body: 'Prompts reutilizables para tareas comunes. Elige uno para rellenar el cuadro de mensaje.',
        },
        send: {
          title: 'Enviar',
          body: 'Envía tu mensaje. La respuesta llega poco a poco y puedes detenerla cuando quieras.',
        },
        rail: {
          title: 'Herramientas de este chat',
          body: 'Compara el mismo prompt entre modelos, pide a un juez que arbitre, busca en este chat, compártelo o abre más acciones.',
        },
      },
    },
    [TourId.ChatModels]: {
      title: 'Cómo elegir un modelo',
      description: 'Enrutamiento automático, elegir a mano y qué significan las insignias.',
      steps: {
        model: {
          title: 'Abre el selector de modelo',
          body: 'Este botón muestra qué responderá tu próximo mensaje. Ábrelo para ver todos los modelos, agrupados por proveedor, con un cuadro de búsqueda.',
        },
        auto: {
          title: 'Auto o un modelo concreto',
          body: 'El enrutamiento automático elige un modelo para cada mensaje entre lo que permite tu plan. Elegir un modelo fija este chat a él.',
        },
        badges: {
          title: 'Insignias de crédito',
          body: '«Usa crédito» significa que el modelo gasta tu crédito de conectores o tus solicitudes gratuitas. Los modelos incluidos nunca usan crédito.',
        },
        credit: {
          title: 'Tu crédito',
          body: 'Muestra lo que puedes gastar. Cuando se acaban el crédito o las solicitudes gratuitas, ClawAI pasa a un modelo incluido y te lo dice.',
        },
      },
    },
    [TourId.ChatResearch]: {
      title: 'Cómo investigar',
      description: 'Obtén respuestas con fuentes en vivo.',
      steps: {
        toggle: {
          title: 'Activa la investigación web',
          body: 'Activa la investigación antes de enviar. ClawAI busca en la web, lee las mejores páginas y responde con lo que encontró.',
        },
        provider: {
          title: 'Elige el buscador',
          body: 'Elige qué proveedor de búsqueda usar. Auto escoge uno disponible para ti.',
        },
        sources: {
          title: 'Revisa las fuentes',
          body: 'Las respuestas muestran sus fuentes para que las abras y verifiques las afirmaciones. Para una investigación larga usa la página de Investigación.',
        },
      },
    },
    [TourId.ChatContext]: {
      title: 'Cómo añadir contexto',
      description: 'Apoya las respuestas en tu propio material.',
      steps: {
        context: {
          title: 'El botón Contexto',
          body: 'Ábrelo para adjuntar un paquete de contexto, ver lo adjunto y activar o desactivar la memoria en este chat.',
        },
        preview: {
          title: 'Previsualiza antes de enviar',
          body: 'Mira exactamente qué recibirá el modelo de tu historial, paquetes, memoria y archivos, para que no vaya nada inesperado.',
        },
        packs: {
          title: 'Crea tus propios paquetes',
          body: 'Un paquete de contexto es material de referencia reutilizable. Crea uno en la página Contexto y adjúntalo a cualquier chat.',
        },
      },
    },
    [TourId.ChatToThread]: {
      title: 'Convierte un chat en un Thread',
      description: 'Publica lo que aprendiste, con fuentes.',
      steps: {
        more: {
          title: 'Abre Más acciones',
          body: 'El menú al final de la barra tiene Exportar, Convertir en Thread público, Ajustes del Thread y Eliminar.',
        },
        create: {
          title: 'Elige Convertir en Thread público',
          body: 'Se abre un formulario con este chat como origen. Revisa el tema, elige modelos, fija un límite de gasto y da tu consentimiento.',
        },
        after: {
          title: 'Síguelo y apruébalo',
          body: 'Llegas a la página de revisión. Cuando pasan las revisiones, lee el borrador y apruébalo para publicar.',
        },
      },
    },
    [TourId.CompareIntro]: {
      title: 'Recorrido por Compare',
      description: 'Envía un prompt a varios modelos.',
      steps: {
        prompt: {
          title: 'Un prompt, muchos modelos',
          body: 'Escribe el prompt una vez. Compare lo envía a cada modelo que elijas y muestra las respuestas lado a lado.',
        },
        models: {
          title: 'Elige los modelos',
          body: 'Elige hasta cinco modelos con el mismo selector del chat. Mezcla proveedores para ver en qué se diferencian.',
        },
        judge: {
          title: 'Juez y crítico',
          body: 'Pide a un juez que clasifique las respuestas y a un crítico que señale lo débil, ambos con sus razones.',
        },
      },
    },
    [TourId.ContextPacks]: {
      title: 'Cómo crear contexto',
      description: 'Construye material de referencia reutilizable.',
      steps: {
        create: {
          title: 'Crea un paquete',
          body: 'Ponle nombre y añade notas, texto o archivos. Un paquete es tuyo y queda fuera de los chats de otras personas.',
        },
        use: {
          title: 'Úsalo en cualquier chat',
          body: 'Abre el botón Contexto en un chat y adjunta el paquete. El modelo responde entonces con ese material a la vista.',
        },
      },
    },
    [TourId.ChatList]: {
      title: 'Tus chats',
      description: 'Encuentra, inicia y organiza tus conversaciones.',
      steps: {
        new: {
          title: 'Empieza un chat',
          body: 'Inicia una conversación nueva. En el móvil, usa el botón redondo de abajo.',
        },
        search: {
          title: 'Busca en tus chats',
          body: 'Escribe para encontrar un chat por su título.',
        },
        tabs: {
          title: 'Todos, Fijados, Archivados',
          body: 'Los chats fijados se quedan arriba. Archiva un chat para ordenar la lista sin borrarlo.',
        },
        items: {
          title: 'Tus conversaciones',
          body: 'Abre una para continuarla. Usa el menú de una fila para fijarla o archivarla.',
        },
      },
    },
    [TourId.ChatMessages]: {
      title: 'Mensajes y respuestas',
      description: 'Lo que te permite cada mensaje y cada respuesta.',
      steps: {
        yours: {
          title: 'Tu mensaje',
          body: 'Pasa el cursor o enfoca un mensaje para copiarlo, editarlo o ramificar el chat desde ese punto.',
        },
        meta: {
          title: 'Qué modelo respondió',
          body: 'Cada respuesta muestra el modelo que la escribió, cómo se eligió y qué usó, como la memoria o los archivos.',
        },
        actions: {
          title: 'Trabaja con una respuesta',
          body: 'Cópiala, valórala, regenérala con el mismo modelo u otro, escúchala, guárdala en la memoria, expórtala o ábrela en grande.',
        },
        more: {
          title: 'Detrás de la respuesta',
          body: 'Abre «Por qué este modelo» para ver el motivo de la elección, y el panel de fuentes cuando la respuesta usó investigación. Selecciona cualquier texto de una respuesta para citarlo en tu siguiente mensaje.',
        },
      },
    },
    [TourId.ChatHeader]: {
      title: 'Cabecera del chat y herramientas',
      description: 'Búsqueda, calidad, exportación y más.',
      steps: {
        more: {
          title: 'Más acciones',
          body: 'Busca en este chat, revisa su calidad, compara modelos, compártelo, expórtalo, conviértelo en un Thread o abre sus ajustes.',
        },
        rail: {
          title: 'Acciones rápidas',
          body: 'Las más usadas están aquí: comparar modelos, revisar la calidad y buscar dentro de este chat.',
        },
        keep: {
          title: 'Guarda una copia',
          body: 'Exportar guarda esta conversación como un archivo. Un chat ramificado muestra una barra que lleva al chat del que salió.',
        },
      },
    },
    [TourId.ChatShare]: {
      title: 'Comparte un chat',
      description: 'Publica un enlace de solo lectura, con seguridad.',
      steps: {
        open: {
          title: 'Comparte un chat',
          body: 'Abre «Más acciones» y elige «Compartir» para publicar una copia de solo lectura de esta conversación en un enlace público.',
        },
        warning: {
          title: 'Lee antes de publicar',
          body: 'Cualquiera con el enlace puede leerla sin iniciar sesión. La copia contiene la conversación tal como está ahora; los mensajes posteriores siguen privados. Nunca compartas secretos ni datos personales.',
        },
        link: {
          title: 'El enlace y los buscadores',
          body: 'Copia el enlace público o ábrelo en una pestaña nueva. Permite que los buscadores lo indexen solo si quieres que aparezca en las búsquedas; si no, solo lo encuentran quienes tengan el enlace.',
        },
        manage: {
          title: 'Actualizar o detener',
          body: 'Actualiza la versión compartida para publicar mensajes más recientes, genera un enlace nuevo si el anterior se filtró, o deja de compartir para desactivar el enlace al instante.',
        },
      },
    },
    [TourId.ChatSettings]: {
      title: 'Ajustes del hilo',
      description: 'Afina un chat: modelo, prompt y contexto.',
      steps: {
        open: {
          title: 'Ajustes del hilo',
          body: 'Abre «Más acciones» y elige «Ajustes» para cambiar cómo se comporta solo este chat.',
        },
        model: {
          title: 'Modelo e instrucciones',
          body: 'Elige un modelo preferido para este chat y escribe un prompt de sistema que fije su papel y tono.',
        },
        tuning: {
          title: 'Creatividad y longitud',
          body: 'La temperatura hace las respuestas más predecibles o más variadas. El máximo de tokens limita lo larga que puede ser una respuesta.',
        },
        context: {
          title: 'Contexto de este chat',
          body: 'Adjunta paquetes de contexto y activa o desactiva la memoria, el contexto del chat y el de otros chats solo para esta conversación.',
        },
      },
    },
    [TourId.CompareResults]: {
      title: 'Leer los resultados de Comparar',
      description: 'Tarjetas, Judge y qué puedes hacer con las respuestas.',
      steps: {
        results: {
          title: 'Lado a lado',
          body: 'Cada modelo responde en su propia tarjeta para que las leas una junto a otra.',
        },
        judge: {
          title: 'Judge y Critic',
          body: 'Activa el Judge para ordenar las respuestas y explicar por qué. Añade el Critic para cuestionar la elección del Judge.',
        },
        actions: {
          title: 'Usa una respuesta',
          body: 'En cada tarjeta puedes alternar entre texto con formato y texto sin formato, copiarlo, exportarlo como Markdown o abrirlo en grande.',
        },
      },
    },
    [TourId.LabsIntro]: {
      title: 'Laboratorios de orquestación',
      description: 'Pasa un prompt por varios modelos con un patrón fijo.',
      steps: {
        what: {
          title: 'Qué hacen los laboratorios',
          body: 'Cada laboratorio pasa tu prompt por varios modelos con un patrón fijo: consenso, escalada, mejor de N, conjunto de costes, descomposición, canalización, reparación, paquete de roles o verificación.',
        },
        how: {
          title: 'Cómo usar uno',
          body: 'Elige los modelos, escribe tu prompt y envíalo. Adjunta archivos, paquetes de contexto y prompts guardados como en un chat normal. Los resultados aparecen abajo en tarjetas.',
        },
      },
    },
    [TourId.DashboardIntro]: {
      title: 'Tu panel',
      description: 'Un vistazo rápido a tu espacio de trabajo.',
      steps: {
        header: {
          title: 'Panel',
          body: 'Tu resumen: cuánto tienes, qué está conectado y si todo funciona bien.',
        },
        stats: {
          title: 'Cifras clave',
          body: 'Total de chats, conectores activos y modelos locales de un vistazo.',
        },
        actions: {
          title: 'Acciones rápidas',
          body: 'Inicia un chat, añade un conector o configura el enrutamiento con un clic.',
        },
      },
    },
    [TourId.PlanIntro]: {
      title: 'Tu plan',
      description: 'Qué incluye tu suscripción.',
      steps: {
        header: {
          title: 'Mi plan',
          body: 'Tu plan actual, sus funciones y los modelos que puedes usar.',
        },
        quota: { title: 'Cuota diaria de tokens', body: 'Tu asignación para cada día.' },
        models: {
          title: 'Modelos permitidos',
          body: 'Los modelos que tu plan te deja usar. Mejora el plan para desbloquear más.',
        },
      },
    },
    [TourId.BillingIntro]: {
      title: 'Facturación',
      description: 'Planes, precios y pagos.',
      steps: {
        header: {
          title: 'Facturación',
          body: 'Gestiona tu suscripción y consulta cuánto cuesta cada plan.',
        },
        plans: {
          title: 'Elige un plan',
          body: 'Compara planes y alterna entre facturación mensual y anual.',
        },
      },
    },
    [TourId.UsageIntro]: {
      title: 'Uso',
      description: 'Sigue lo que has usado.',
      steps: {
        header: { title: 'Uso', body: 'Sigue tu consumo diario de tokens frente a tu plan.' },
        card: {
          title: 'Uso diario de tokens',
          body: 'La barra muestra cuánto de la asignación de hoy has usado, y tu crédito de conectores si tu plan lo incluye.',
        },
      },
    },
    [TourId.FilesIntro]: {
      title: 'Tus archivos',
      description: 'Sube archivos para dar contexto a la IA.',
      steps: {
        header: {
          title: 'Archivos',
          body: 'Todo lo que subes está aquí, listo para usarse como contexto en el chat.',
        },
        upload: {
          title: 'Sube un archivo',
          body: 'Arrastra un archivo aquí o haz clic para elegir uno. Los archivos se analizan antes de usarse.',
        },
      },
    },
    [TourId.SettingsIntro]: {
      title: 'Ajustes',
      description: 'Tu cuenta y tus preferencias.',
      steps: {
        header: { title: 'Ajustes', body: 'Gestiona tu perfil, seguridad, idioma y aspecto.' },
        language: { title: 'Idioma', body: 'Elige el idioma de toda la aplicación.' },
        appearance: {
          title: 'Aspecto',
          body: 'Alterna entre el tema claro, el oscuro y el del sistema.',
        },
        danger: {
          title: 'Eliminar cuenta',
          body: 'Elimina tu cuenta de forma permanente y cierra todas las sesiones. No se puede deshacer.',
        },
      },
    },
    [TourId.MemoryIntro]: {
      title: 'Memoria',
      description: 'Lo que la IA recuerda sobre ti.',
      steps: {
        header: {
          title: 'Memoria',
          body: 'Los registros de memoria dan a la IA un contexto duradero sobre ti y tu trabajo.',
        },
        tabs: {
          title: 'Guardadas y sugeridas',
          body: 'Las memorias guardadas se usan en tus chats. Las sugerencias son nuevas que la IA propone para que las revises.',
        },
      },
    },
    [TourId.ConnectorsIntro]: {
      title: 'Conectores',
      description: 'Tus conexiones con proveedores de IA.',
      steps: {
        header: {
          title: 'Conectores',
          body: 'Un conector une ClawAI con un proveedor de IA mediante tu propia clave.',
        },
        actions: {
          title: 'Añade un conector',
          body: 'Crea uno para usar los modelos de un proveedor. Después puedes probar la conexión y sincronizar sus modelos.',
        },
      },
    },
  },
};
