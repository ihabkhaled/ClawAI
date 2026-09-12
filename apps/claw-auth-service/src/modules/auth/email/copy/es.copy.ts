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
  },
};
