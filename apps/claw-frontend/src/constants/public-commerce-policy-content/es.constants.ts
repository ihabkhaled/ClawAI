import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const ES_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: 'Política de entrega y envío',
      sections: [
        {
          id: 'digital-service',
          title: 'ClawAI es un servicio digital',
          body: 'ClawAI es un servicio de software en línea que se usa en un navegador web y en las aplicaciones compatibles. No hay ningún producto físico: no se empaqueta, envía ni manda por correo nada, y no se solicita ninguna dirección de envío. Todo lo que incluye un plan se entrega por internet a la cuenta que lo compró.',
        },
        {
          id: 'instant-access',
          title: 'El acceso es en línea e inmediato',
          body: 'Una cuenta gratuita está lista en cuanto termina el registro. Cuando se compra un plan de pago, se aplica a la cuenta en cuanto se confirma el pago, normalmente al instante, y puedes iniciar sesión y usarlo de inmediato. No hay periodo de espera ni calendario de entrega más allá de esta activación instantánea de la cuenta.',
        },
        {
          id: 'no-fees',
          title: 'Sin gastos de envío ni de entrega',
          body: 'Como no se envía nada físico, ClawAI nunca añade gastos de envío, manipulación, aduanas o entrega. El precio de un plan es el importe que se muestra al pagar. Los archivos que creas en el producto, como documentos o imágenes, se descargan desde tu cuenta y no se te envían por correo.',
        },
        {
          id: 'access-problems',
          title: 'Si no puedes acceder a lo que pagaste',
          body: `Si un pago se realizó correctamente pero el plan no aparece en tu cuenta, o no puedes iniciar sesión, escribe a ${PUBLIC_CONTACT_EMAIL} con la dirección de correo de la cuenta y, si la tienes, la referencia del pago. Revisaremos el pago y la cuenta y resolveremos el acceso a lo que pagaste.`,
        },
      ],
      evidence:
        'ClawAI se opera en línea desde El Cairo, Egipto. La entrega de una suscripción consiste en activar la cuenta para la que se compró, y el pago alojado muestra el precio vigente antes de pagar.',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: 'Política de reembolso y cancelación',
      sections: [
        {
          id: 'cancel',
          title: 'Cancela cuando quieras desde tu cuenta',
          body: 'Puedes cancelar una suscripción de pago en cualquier momento desde la configuración de facturación de tu cuenta. La cancelación detiene la renovación de la suscripción, por lo que no se te cobra el siguiente periodo de facturación. No necesitas escribir a nadie ni dar un motivo para cancelar.',
        },
        {
          id: 'access-after-cancel',
          title: 'El acceso continúa hasta el final del periodo pagado',
          body: 'Después de cancelar, el plan sigue activo hasta el final del periodo que ya pagaste, ya sea un mes o un plazo más largo. Tus funciones de pago siguen disponibles hasta esa fecha y después la suscripción termina en lugar de renovarse y volver a cobrarte.',
        },
        {
          id: 'refunds',
          title: 'Cuándo se concede un reembolso',
          body: 'El periodo pagado en curso, y cualquier periodo ya utilizado, no se reembolsa, porque el acceso al servicio ya se ha prestado. Los reembolsos se conceden solo cuando cometemos un error de facturación, como un cargo duplicado o incorrecto, o cuando la ley que te resulta aplicable lo exige. Cuando un pago se reembolsa por completo, termina el acceso de pago que compró.',
        },
        {
          id: 'trial-and-requests',
          title: 'Prueba gratuita y cómo pedir un reembolso',
          body: `La prueba gratuita de 90 días no requiere tarjeta de pago, así que no se cobra nada y no hay nada que reembolsar mientras pruebas ClawAI. Para informar de un error de facturación o solicitar un reembolso, escribe a ${PUBLIC_CONTACT_EMAIL} con el correo de la cuenta, la fecha y el importe del cargo, y la referencia del pago si la tienes.`,
        },
      ],
      evidence:
        'Esta política complementa los Términos de uso, según los cuales las condiciones de pago siguen la información mostrada al pagar y la ley aplicable. El precio vigente y el intervalo de facturación se muestran en el pago alojado antes de que pagues.',
    },
  },
  labels: {
    onThisPage: 'En esta página',
    evidence: 'Nota verificable',
    lastReviewed: 'Última revisión',
    effectiveDate: 'Fecha de entrada en vigor',
    startFree: 'Crear una cuenta gratuita',
    contactTeam: 'Contactar con el equipo',
    companyDetailsTitle: 'Datos de la empresa',
    emailLabel: 'Correo electrónico',
    phoneLabel: 'Teléfono',
    addressLabel: 'Dirección',
    addressNote:
      'ClawAI es un servicio en línea. No hay una oficina abierta a visitas, así que te pedimos que nos contactes por correo electrónico.',
  },
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: 'Política de entrega y envío',
      description:
        'ClawAI es un servicio digital: el acceso es en línea y empieza en cuanto se confirma el registro o el pago. No se envía nada y no hay gastos de entrega.',
      keywords: ['política de entrega', 'política de envío', 'acceso a un servicio digital'],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: 'Política de reembolso y cancelación',
      description:
        'Cancela una suscripción de ClawAI cuando quieras desde la facturación. El acceso dura hasta el final del periodo pagado; reembolsos por errores de cobro o cuando la ley lo exija.',
      keywords: ['política de reembolso', 'política de cancelación', 'cancelar suscripción'],
    },
  },
};
