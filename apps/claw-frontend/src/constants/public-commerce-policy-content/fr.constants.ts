import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const FR_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: 'Politique de livraison et d’expédition',
      sections: [
        {
          id: 'digital-service',
          title: 'ClawAI est un service numérique',
          body: 'ClawAI est un service logiciel en ligne, utilisé dans un navigateur web et dans les applications prises en charge. Il n’y a aucun produit physique : rien n’est emballé, posté ni expédié, et aucune adresse de livraison n’est demandée. Tout ce qu’inclut une offre est fourni par internet au compte qui l’a achetée.',
        },
        {
          id: 'instant-access',
          title: 'Un accès en ligne et immédiat',
          body: 'Un compte gratuit est prêt dès la fin de l’inscription. Lorsqu’une offre payante est achetée, elle est appliquée au compte dès que le paiement est confirmé, normalement tout de suite, et vous pouvez vous connecter et l’utiliser immédiatement. Il n’y a ni délai d’attente ni calendrier de livraison au-delà de cette activation instantanée du compte.',
        },
        {
          id: 'no-fees',
          title: 'Aucuns frais d’expédition ni de livraison',
          body: 'Comme rien de physique n’est envoyé, ClawAI n’ajoute jamais de frais d’expédition, de manutention, de douane ou de livraison. Le prix d’une offre est le montant affiché lors du paiement. Les fichiers que vous créez dans le produit, comme des documents ou des images, se téléchargent depuis votre compte et ne vous sont pas envoyés par la poste.',
        },
        {
          id: 'access-problems',
          title: 'Si vous n’accédez pas à ce que vous avez payé',
          body: `Si un paiement a réussi mais que l’offre n’apparaît pas sur votre compte, ou si vous ne pouvez pas vous connecter, écrivez à ${PUBLIC_CONTACT_EMAIL} en indiquant l’adresse e-mail du compte et, si vous l’avez, la référence du paiement. Nous vérifierons le paiement et le compte et rétablirons l’accès à ce que vous avez payé.`,
        },
      ],
      evidence:
        'ClawAI est exploité en ligne depuis Le Caire, en Égypte. La livraison d’un abonnement correspond à l’activation du compte pour lequel il a été acheté, et le paiement hébergé affiche le prix en vigueur avant le règlement.',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: 'Politique de remboursement et de résiliation',
      sections: [
        {
          id: 'cancel',
          title: 'Résiliez à tout moment depuis votre compte',
          body: 'Vous pouvez résilier un abonnement payant à tout moment depuis les paramètres de facturation de votre compte. La résiliation arrête le renouvellement de l’abonnement : la période de facturation suivante ne vous est donc pas facturée. Vous n’avez besoin d’écrire à personne ni de donner une raison pour résilier.',
        },
        {
          id: 'access-after-cancel',
          title: 'L’accès continue jusqu’à la fin de la période payée',
          body: 'Après la résiliation, l’offre reste active jusqu’à la fin de la période déjà payée, qu’il s’agisse d’un mois ou d’une durée plus longue. Vos fonctionnalités payantes restent disponibles jusqu’à cette date, puis l’abonnement s’arrête au lieu de se renouveler et de vous être facturé à nouveau.',
        },
        {
          id: 'refunds',
          title: 'Quand un remboursement est accordé',
          body: 'La période payée en cours, ainsi que toute période déjà utilisée, n’est pas remboursée, car l’accès au service a déjà été fourni. Un remboursement n’est accordé qu’en cas d’erreur de facturation de notre part, comme un prélèvement en double ou incorrect, ou lorsque la loi qui vous est applicable l’exige. Lorsqu’un paiement est remboursé en totalité, l’accès payant qu’il a acheté prend fin.',
        },
        {
          id: 'trial-and-requests',
          title: 'Essai gratuit et demande de remboursement',
          body: `L’essai gratuit de 90 jours ne demande aucune carte de paiement : rien n’est prélevé et il n’y a rien à rembourser pendant que vous essayez ClawAI. Pour signaler une erreur de facturation ou demander un remboursement, écrivez à ${PUBLIC_CONTACT_EMAIL} en indiquant l’adresse e-mail du compte, la date et le montant du prélèvement, et la référence du paiement si vous l’avez.`,
        },
      ],
      evidence:
        'Cette politique complète les Conditions d’utilisation, selon lesquelles les conditions de paiement suivent les informations affichées au paiement et la loi applicable. Le prix en vigueur et la période de facturation sont affichés sur la page de paiement hébergée avant que vous payiez.',
    },
  },
  labels: {
    onThisPage: 'Sur cette page',
    evidence: 'Note vérifiable',
    lastReviewed: 'Dernière révision',
    effectiveDate: 'Date d’entrée en vigueur',
    startFree: 'Créer un compte gratuit',
    contactTeam: 'Contacter l’équipe',
    companyDetailsTitle: 'Coordonnées de l’entreprise',
    emailLabel: 'E-mail',
    phoneLabel: 'Téléphone',
    addressLabel: 'Adresse',
    addressNote:
      'ClawAI est un service en ligne. Aucun bureau n’accueille de visiteurs : merci de nous contacter par e-mail.',
  },
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: 'Politique de livraison et d’expédition',
      description:
        'ClawAI est un service numérique : l’accès est en ligne et commence dès la confirmation de l’inscription ou du paiement. Rien n’est expédié, sans frais de livraison.',
      keywords: [
        'politique de livraison',
        'politique d’expédition',
        'accès à un service numérique',
      ],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: 'Politique de remboursement et de résiliation',
      description:
        'Résiliez un abonnement ClawAI à tout moment depuis la facturation. L’accès dure jusqu’à la fin de la période payée ; remboursement en cas d’erreur ou si la loi l’exige.',
      keywords: [
        'politique de remboursement',
        'politique de résiliation',
        'résilier un abonnement',
      ],
    },
  },
};
