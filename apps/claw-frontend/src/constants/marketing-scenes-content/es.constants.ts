import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const ES_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'Míralo en la app',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'Un chat de ClawAI con una pregunta, la respuesta escrita, una insignia con el modelo que respondió y los detalles de enrutamiento bajo la respuesta.',
      caption: 'Cada respuesta muestra qué modelo la escribió y por qué.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'El cuadro de mensaje de ClawAI con el selector de modelo abierto, con los modelos entre los que puedes elegir.',
      caption: 'Elige un modelo tú mismo o deja que AUTO elija.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'El cuadro de mensaje con la investigación web activada y el selector del proveedor de búsqueda visible.',
      caption: 'Activa la investigación web y elige cómo busca.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'El cuadro de mensaje con el menú Contexto abierto, que ofrece tu memoria y tus paquetes de contexto.',
      caption: 'Lleva tu memoria y tus paquetes de contexto a cualquier chat.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'El diálogo «Compartir este chat» abierto sobre una conversación, con las opciones para compartirla.',
      caption: 'Comparte un chat con un enlace, en tus términos.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'La página Comparar con tres modelos seleccionados y un mensaje escrito, listo para enviar.',
      caption: 'Haz una pregunta y mira cómo tres modelos responden lado a lado.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'La página Consenso, donde varios modelos responden la misma pregunta y avanzan hacia un resultado acordado.',
      caption: 'Deja que varios modelos respondan y llega a una respuesta acordada.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'La página Archivos con los archivos que subiste y los que ClawAI creó para ti.',
      caption: 'Tus subidas y archivos generados, en un solo lugar.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'La página Memoria, que muestra lo que ClawAI recuerda de ti y que puedes revisar y editar.',
      caption: 'Mira y controla lo que ClawAI recuerda.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'La página Contexto con paquetes de contexto reutilizables que puedes adjuntar a los chats.',
      caption: 'Paquetes de contexto reutilizables para el trabajo que repites.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'La página Conectores con los servicios que puedes vincular a tu espacio de trabajo.',
      caption: 'Conecta tus herramientas para que la IA trabaje con ellas.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'La página de Facturación con los planes disponibles y cuál es el actual.',
      caption: 'Planes claros y siempre ves en cuál estás.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'La página Plan, que muestra lo que incluye tu plan y cuánto has usado.',
      caption: 'Mira exactamente lo que incluye tu plan.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'La página Uso con gráficos de cuántos tokens has usado a lo largo del tiempo.',
      caption: 'Sigue tu uso en tiempo real.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'La página Ajustes desplazada hasta la tarjeta de notificaciones, con sus interruptores.',
      caption: 'Elige qué notificaciones recibes.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'La página Threads con la lista de tus Threads y el estado de cada uno.',
      caption: 'Todos tus Threads y en qué punto está cada uno.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'El borrador de un Thread abierto en la página de revisión, antes de publicarse.',
      caption: 'Revisa un borrador antes de que algo se haga público.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'El panel de notificaciones abierto desde la campana, con algunas notificaciones recientes.',
      caption: 'Entérate en cuanto algo esté listo.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'Una tarjeta breve de recorrido del producto abierta en la página del chat, señalando una función.',
      caption: 'Un recorrido corto te enseña la app.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'El panel de ClawAI con un resumen de tu actividad y uso recientes.',
      caption: 'Tu espacio de trabajo de un vistazo.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'La vista de Observabilidad para administradores en la pestaña Consumo, con gráficos de cuánto se usaron los modelos.',
      caption: 'Los administradores ven el consumo en gráficos.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'Una conversación de chat de ClawAI en la pantalla de un teléfono.',
      caption: 'El mismo chat, en tu teléfono.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'El panel de ClawAI en la pantalla de un teléfono.',
      caption: 'Tu panel también cabe en una pantalla pequeña.',
    },
  },
};
