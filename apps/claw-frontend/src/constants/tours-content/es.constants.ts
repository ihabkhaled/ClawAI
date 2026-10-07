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
    launcherMore: 'Más visitas',
    launcherDone: 'Hecha',
    launcherStart: 'Empezar',
    launcherRestart: 'Repetir',
    offerTitle: '¿Eres nuevo? Haz una visita de 1 minuto',
    offerStart: 'Muéstramelo',
    offerLater: 'Ahora no',
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
  },
};
