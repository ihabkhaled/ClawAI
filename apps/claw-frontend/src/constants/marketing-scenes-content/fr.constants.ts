import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const FR_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'Voir dans l’application',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'Un chat ClawAI avec une question, la réponse rédigée, un badge indiquant le modèle qui a répondu et les détails de routage sous la réponse.',
      caption: 'Chaque réponse indique quel modèle l’a rédigée et pourquoi.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'La zone de message de ClawAI avec le sélecteur de modèle ouvert, listant les modèles parmi lesquels choisir.',
      caption: 'Choisissez un modèle vous-même, ou laissez AUTO choisir.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'La zone de message avec la recherche web activée et le sélecteur du fournisseur de recherche affiché.',
      caption: 'Activez la recherche web et choisissez comment elle cherche.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'La zone de message avec le menu Contexte ouvert, proposant votre mémoire et vos packs de contexte.',
      caption: 'Apportez votre mémoire et vos packs de contexte dans n’importe quel chat.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'La boîte de dialogue « Partager ce chat » ouverte sur une conversation, avec les options de partage.',
      caption: 'Partagez un chat par lien, selon vos conditions.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'La page Comparer avec trois modèles sélectionnés et un message saisi, prêt à être envoyé.',
      caption: 'Posez une question et voyez trois modèles répondre côte à côte.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'La page Consensus, où plusieurs modèles répondent à la même question et convergent vers un résultat commun.',
      caption: 'Laissez plusieurs modèles répondre, puis obtenez une réponse commune.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'La page Fichiers listant les fichiers que vous avez importés et ceux que ClawAI a créés pour vous.',
      caption: 'Vos imports et fichiers générés, au même endroit.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'La page Mémoire montrant ce que ClawAI retient de vous, que vous pouvez relire et modifier.',
      caption: 'Voyez et contrôlez ce dont ClawAI se souvient.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'La page Contexte listant des packs de contexte réutilisables que vous pouvez joindre aux chats.',
      caption: 'Des packs de contexte réutilisables pour le travail que vous répétez.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'La page Connecteurs listant les services que vous pouvez relier à votre espace de travail.',
      caption: 'Connectez vos outils pour que l’IA travaille avec eux.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'La page Facturation affichant les offres disponibles et l’offre actuelle.',
      caption: 'Des offres claires, et vous voyez toujours laquelle est active.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'La page Offre montrant ce que comprend votre offre et la part que vous avez utilisée.',
      caption: 'Voyez exactement ce que comprend votre offre.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'La page Utilisation avec des graphiques du nombre de tokens consommés au fil du temps.',
      caption: 'Suivez votre consommation en direct.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'La page Paramètres défilée jusqu’à la carte des notifications, avec ses interrupteurs.',
      caption: 'Choisissez les notifications que vous recevez.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'La page Threads listant vos Threads, chacun avec son statut.',
      caption: 'Tous vos Threads, et où en est chacun.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'Un brouillon de Thread ouvert sur la page de relecture, avant sa publication.',
      caption: 'Relisez un brouillon avant que quoi que ce soit devienne public.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'Le panneau de notifications ouvert depuis la cloche, avec quelques notifications récentes.',
      caption: 'Sachez dès que quelque chose est prêt.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'Une courte carte de visite guidée ouverte sur la page de chat, pointant une fonctionnalité.',
      caption: 'Une courte visite pour vous guider.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'Le tableau de bord ClawAI avec un aperçu de votre activité et de votre consommation récentes.',
      caption: 'Votre espace de travail en un coup d’œil.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'La vue Observabilité réservée aux administrateurs, onglet Consommation, avec des graphiques de l’usage des modèles.',
      caption: 'Les administrateurs voient la consommation en graphiques.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'Une conversation de chat ClawAI sur l’écran d’un téléphone.',
      caption: 'Le même chat, sur votre téléphone.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'Le tableau de bord ClawAI sur l’écran d’un téléphone.',
      caption: 'Votre tableau de bord tient aussi sur un petit écran.',
    },
  },
};
