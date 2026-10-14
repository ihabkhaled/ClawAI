import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// Spanish (formal "usted") translation of en.copy.ts, which remains the source
// of truth: every key, every order and every null here mirrors the English file.
export const ES_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: 'Hola {value}:',
    greetingFallback: 'Hola:',
    signOff: 'Un cordial saludo,',
    teamName: 'El equipo de ClawAI',
    footerNote:
      'Este es un mensaje automático relativo a su cuenta de ClawAI. Le rogamos que no responda a él — las respuestas enviadas a esta dirección no se leen.',
    linkLabel: 'Abrir este enlace',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: 'Confirme su dirección de correo electrónico para activar su cuenta de ClawAI',
      preheader: 'Solo queda un paso: confirme su dirección y su cuenta estará lista.',
      heading: 'Confirme su dirección de correo electrónico',
      intro:
        'Le agradecemos que haya creado una cuenta de ClawAI. Para proteger su cuenta, necesitamos confirmar que esta dirección le pertenece.',
      bodyLines: [
        'Su cuenta se ha creado, pero todavía no está activa. Mientras no confirme esta dirección, no podrá iniciar sesión.',
        'Pulse el botón que aparece a continuación para confirmar su dirección y completar la configuración de su cuenta.',
      ],
      actionLabel: 'Confirmar mi dirección de correo electrónico',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: 'Por motivos de seguridad, este enlace de confirmación caduca en {expiry}.',
      securityNote:
        'Si no ha creado ninguna cuenta de ClawAI, puede ignorar este mensaje con total tranquilidad: no se activará ninguna cuenta sin esta confirmación.',
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: 'Restablezca su contraseña de ClawAI',
      preheader: 'Utilice el enlace seguro que incluimos para elegir una nueva contraseña.',
      heading: 'Restablezca su contraseña',
      intro:
        'Hemos recibido una solicitud para restablecer la contraseña de la cuenta de ClawAI asociada a esta dirección.',
      bodyLines: [
        'Pulse el botón que aparece a continuación para elegir una nueva contraseña. Su contraseña actual seguirá siendo válida hasta que lo haga.',
        'Por su seguridad, es posible que deba volver a iniciar sesión en sus demás dispositivos después del cambio.',
      ],
      actionLabel: 'Elegir una nueva contraseña',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote:
        'Por motivos de seguridad, este enlace de restablecimiento caduca en {expiry} y solo puede utilizarse una vez.',
      securityNote:
        'Si no ha solicitado restablecer la contraseña, no es necesario que haga nada: su contraseña no se ha modificado. Si esta situación se repite, le rogamos que se ponga en contacto con nuestro equipo de asistencia.',
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: 'Se ha emitido una contraseña temporal para su cuenta de ClawAI',
      preheader: 'Inicie sesión con la contraseña temporal y establezca una nueva de inmediato.',
      heading: 'Su contraseña temporal',
      intro:
        'Un administrador ha emitido una contraseña temporal para su cuenta de ClawAI. Su contraseña anterior ha dejado de ser válida.',
      bodyLines: [
        'Su contraseña temporal es: {value}',
        'Inicie sesión con ella y se le pedirá de inmediato que elija una nueva contraseña. No comparta esta contraseña con nadie.',
      ],
      actionLabel: 'Iniciar sesión en ClawAI',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: 'Le rogamos que inicie sesión y cambie esta contraseña cuanto antes.',
      securityNote:
        'Si no esperaba este mensaje, póngase en contacto con nuestro equipo de asistencia de inmediato: alguien con acceso de administrador ha modificado sus datos de inicio de sesión.',
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject:
        'Su código de verificación para cambiar su dirección de correo electrónico de ClawAI',
      preheader: 'Introduzca este código para confirmar el cambio de dirección en su cuenta.',
      heading: 'Confirme este cambio de dirección',
      intro:
        'Se ha solicitado cambiar la dirección de correo electrónico de su cuenta de ClawAI a {value}. Para continuar, confirme el cambio desde su dirección actual.',
      bodyLines: [
        'Introduzca este código de verificación en la ventana del navegador en la que inició el cambio.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote:
        'Este código caduca en {expiry}. No lo comparta nunca con nadie, ni siquiera con nuestro personal.',
      securityNote:
        'Si no ha solicitado este cambio, no introduzca el código. Cambie su contraseña de inmediato y póngase en contacto con nuestro equipo de asistencia: es posible que otra persona tenga acceso a su cuenta.',
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: 'Confirme su nueva dirección de correo electrónico de ClawAI',
      preheader: 'Confirme esta dirección para completar el traslado de su cuenta a ella.',
      heading: 'Confirme su nueva dirección',
      intro:
        'Esta dirección se ha indicado como la nueva dirección de correo electrónico de una cuenta de ClawAI. Una última confirmación completará el cambio.',
      bodyLines: [
        'Una vez confirmada, esta pasará a ser la dirección con la que inicie sesión y a la que enviaremos los mensajes relativos a su cuenta.',
      ],
      actionLabel: 'Confirmar esta dirección',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: 'Por motivos de seguridad, este enlace de confirmación caduca en {expiry}.',
      securityNote:
        'Si no esperaba este mensaje, ignórelo. El cambio no puede completarse sin esta confirmación.',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: 'Se ha cambiado la dirección de correo electrónico de su cuenta de ClawAI',
      preheader: 'Una confirmación de que la dirección de su cuenta ha cambiado.',
      heading: 'Su dirección de correo electrónico ha cambiado',
      intro:
        'La dirección de correo electrónico con la que inicia sesión en su cuenta de ClawAI se ha cambiado. Enviamos este mensaje a su dirección anterior para que quede constancia del cambio.',
      bodyLines: [
        'Los mensajes relativos a su cuenta se enviarán a partir de ahora a la nueva dirección, que también será la que utilice para iniciar sesión.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        'Si no ha realizado este cambio, póngase en contacto con nuestro equipo de asistencia de inmediato: es posible que otra persona tenga acceso a su cuenta.',
    },
    [AuthEmailKind.THREAD_READY_FOR_REVIEW]: {
      subject: 'El borrador de tu Thread está listo para que lo revises',
      preheader: 'Léelo y apruébalo para publicarlo, o pide cambios.',
      heading: 'Tu Thread está listo para revisión',
      intro:
        'Los autores, el Judge y el Critic han terminado tu Thread. Está guardado en privado y todavía no hay nada público.',
      bodyLines: [
        'Ábrelo para leer el borrador y sus fuentes. Solo se publica cuando tú lo apruebas.',
      ],
      actionLabel: 'Revisar mi Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque iniciaste un Thread en ClawAI. Puedes desactivar estos correos en los ajustes de notificaciones.',
    },
    [AuthEmailKind.THREAD_PUBLISHED]: {
      subject: 'Tu Thread ya es público',
      preheader: 'Los lectores ya pueden abrirlo.',
      heading: 'Tu Thread está publicado',
      intro: '«{value}» ya está publicado en ClawAI. Cualquiera que tenga el enlace puede leerlo.',
      bodyLines: [
        'Puedes compartirlo, ver cuántas personas lo han leído o dejar de publicarlo cuando quieras desde tu página de Threads.',
      ],
      actionLabel: 'Abrir mi Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque iniciaste un Thread en ClawAI. Puedes desactivar estos correos en los ajustes de notificaciones.',
    },
    [AuthEmailKind.THREAD_FAILED]: {
      subject: 'No se pudo terminar tu Thread',
      preheader: 'Se liberó el gasto reservado. Puedes intentarlo de nuevo.',
      heading: 'No se pudo terminar tu Thread',
      intro: 'Algo salió mal mientras se escribía tu Thread y no se pudo completar.',
      bodyLines: [
        'Se liberó el gasto reservado y nuestro equipo ha sido avisado. Puedes empezarlo de nuevo desde tu página de Threads.',
      ],
      actionLabel: 'Ir a mis Threads',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque iniciaste un Thread en ClawAI. Puedes desactivar estos correos en los ajustes de notificaciones.',
    },
    [AuthEmailKind.THREAD_COMMENTED]: {
      subject: 'Nuevo comentario en tu Thread',
      preheader: 'Alguien se unió a la conversación.',
      heading: 'Nuevo comentario en tu Thread',
      intro: 'Alguien comentó «{value}».',
      bodyLines: ['Abre el Thread para leerlo y unirte a la conversación.'],
      actionLabel: 'Abrir el Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque participaste en este Thread de ClawAI. Puedes desactivar estos correos en la configuración de notificaciones.',
    },
    [AuthEmailKind.THREAD_COMMENT_REPLIED]: {
      subject: 'Alguien respondió a tu comentario',
      preheader: 'Abre la conversación para leer la respuesta.',
      heading: 'Alguien respondió a tu comentario',
      intro: 'Se añadió una respuesta a tu comentario en «{value}».',
      bodyLines: ['Abre el Thread para leerlo y unirte a la conversación.'],
      actionLabel: 'Abrir el Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque participaste en este Thread de ClawAI. Puedes desactivar estos correos en la configuración de notificaciones.',
    },
    [AuthEmailKind.THREAD_MENTIONED]: {
      subject: 'Te mencionaron en un comentario',
      preheader: 'Alguien te etiquetó en una conversación.',
      heading: 'Te mencionaron en un comentario',
      intro: 'Te mencionaron en un comentario de «{value}».',
      bodyLines: ['Abre el Thread para leerlo y unirte a la conversación.'],
      actionLabel: 'Abrir el Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque participaste en este Thread de ClawAI. Puedes desactivar estos correos en la configuración de notificaciones.',
    },
    [AuthEmailKind.THREAD_REACTED]: {
      subject: 'Tu Thread recibió una reacción',
      preheader: 'Un lector reaccionó a tu Thread.',
      heading: 'Tu Thread recibió una reacción',
      intro: 'Un lector reaccionó a «{value}».',
      bodyLines: ['Abre el Thread para leerlo y unirte a la conversación.'],
      actionLabel: 'Abrir el Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque participaste en este Thread de ClawAI. Puedes desactivar estos correos en la configuración de notificaciones.',
    },
    [AuthEmailKind.THREAD_COMMENT_REACTED]: {
      subject: 'A alguien le gustó tu comentario',
      preheader: 'Tu comentario está siendo apreciado.',
      heading: 'A alguien le gustó tu comentario',
      intro: 'Tu comentario en «{value}» recibió un me gusta.',
      bodyLines: ['Abre el Thread para leerlo y unirte a la conversación.'],
      actionLabel: 'Abrir el Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque participaste en este Thread de ClawAI. Puedes desactivar estos correos en la configuración de notificaciones.',
    },
    [AuthEmailKind.THREAD_CHANGE_REQUESTED]: {
      subject: 'Se sugirió un cambio en tu Thread',
      preheader: 'Revisa la sugerencia y acéptala o recházala.',
      heading: 'Se sugirió un cambio en tu Thread',
      intro: 'Un lector sugirió un cambio en «{value}».',
      bodyLines: ['Abre el Thread para leerlo y unirte a la conversación.'],
      actionLabel: 'Abrir el Thread',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque participaste en este Thread de ClawAI. Puedes desactivar estos correos en la configuración de notificaciones.',
    },
    [AuthEmailKind.MCP_SERVER_APPROVED]: {
      subject: 'Tu servidor MCP fue aprobado',
      preheader: 'Ya puedes usarlo en el chat.',
      heading: 'Tu servidor MCP está aprobado',
      intro: 'Un administrador aprobó «{value}».',
      bodyLines: [
        'Sus herramientas ya están disponibles en tus chats. Puedes desactivarlo o cambiar los permisos de sus herramientas cuando quieras en la página de servidores MCP.',
      ],
      actionLabel: 'Abrir mis servidores MCP',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque añadiste un servidor MCP en ClawAI. Puedes desactivar estos correos en los ajustes de notificaciones.',
    },
    [AuthEmailKind.MCP_SERVER_REJECTED]: {
      subject: 'Tu servidor MCP no fue aprobado',
      preheader: 'Abre la página para ver el motivo.',
      heading: 'Tu servidor MCP no fue aprobado',
      intro: 'Un administrador no aprobó «{value}».',
      bodyLines: [
        'Abre la página de servidores MCP para ver el motivo. Puedes eliminar el servidor y añadir uno corregido.',
      ],
      actionLabel: 'Abrir mis servidores MCP',
      fallbackNote:
        'Si el botón no funciona, copie la dirección que figura a continuación en su navegador:',
      expiryNote: null,
      securityNote:
        'Recibes este mensaje porque añadiste un servidor MCP en ClawAI. Puedes desactivar estos correos en los ajustes de notificaciones.',
    },
  },
};
