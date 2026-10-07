import { TourId } from '@/enums/tour-id.enum';
import type { TourDictionary } from '@/types/tour.types';

export const FR_TOURS_CONTENT: TourDictionary = {
  ui: {
    next: 'Suivant',
    back: 'Retour',
    skip: 'Passer la visite',
    done: 'Terminé',
    stepOf: 'Étape {current} sur {total}',
    dialogLabel: 'Visite guidée du produit',
    launcherLabel: 'Visites et aide',
    launcherTitle: 'Visites guidées',
    launcherHint: 'Un court tour de ce que vous voyez sur cette page.',
    launcherHere: 'Sur cette page',
    launcherMore: 'Autres visites',
    launcherDone: 'Faite',
    launcherStart: 'Démarrer',
    launcherRestart: 'Revoir',
    offerTitle: 'Nouveau ici ? Faites une visite d’une minute',
    offerStart: 'Montrez-moi',
    offerLater: 'Pas maintenant',
    missingTarget:
      'Cette partie n’est pas à l’écran pour l’instant. Ouvrez-la, puis relancez la visite.',
  },
  tours: {
    [TourId.ThreadsIntro]: {
      title: 'Découvrir Threads',
      description: 'Transformez un chat en article public, documenté et sourcé.',
      steps: {
        welcome: {
          title: 'Threads en une minute',
          body: 'Un Thread est un article public écrit à partir de l’un de vos chats : recherché sur le web en direct, rédigé par plusieurs modèles, relu par un juge et un critique, et publié seulement quand vous l’approuvez.',
        },
        list: {
          title: 'Vos Threads',
          body: 'Chaque Thread que vous lancez apparaît ici avec son statut. Ouvrez-en un pour le suivre pendant l’exécution, relire le brouillon, l’approuver, l’exporter ou le partager.',
        },
        create: {
          title: 'Créer un Thread',
          body: 'Choisissez un chat source, dites de quoi parle l’article et choisissez les modèles. Vous pouvez aussi partir de n’importe quel chat avec « Transformer en Thread public ».',
        },
        process: {
          title: 'Ce qui se passe ensuite',
          body: 'ClawAI recherche le sujet, de trois à cinq auteurs écrivent indépendamment, s’accordent sur un brouillon, puis le juge et le critique le relisent jusqu’à trois tours.',
        },
        approve: {
          title: 'Vous décidez',
          body: 'Rien n’est public tant que vous n’avez pas lu et approuvé le brouillon. Vous pouvez retirer à tout moment, et un plafond de dépense que vous fixez limite le coût.',
        },
      },
    },
    [TourId.ThreadCreate]: {
      title: 'Remplir le formulaire du Thread',
      description: 'Ce que fait chaque champ avant de démarrer.',
      steps: {
        topic: {
          title: 'Le sujet',
          body: 'Dites ce que l’article doit expliquer ou répondre. Une question claire donne aux auteurs et à la recherche un objectif clair.',
        },
        kind: {
          title: 'Type et langue',
          body: 'Choisissez article, article de recherche, guide ou explication technique, et la langue de la page publique.',
        },
        cap: {
          title: 'Dépense maximale',
          body: 'Le maximum que ce Thread peut coûter. Chaque appel de modèle est d’abord vérifié par rapport à lui, et la tâche s’arrête plutôt que de le dépasser.',
        },
        models: {
          title: 'Auteurs, juge et critique',
          body: 'Choisissez de trois à cinq auteurs, un juge et un critique avec le même sélecteur que dans le chat. Des fournisseurs différents donnent des brouillons plus variés et une relecture indépendante.',
        },
        consent: {
          title: 'Votre accord',
          body: 'Cochez pour confirmer que vous savez que l’article final sera public et indexable. Le démarrage reste désactivé tant que ce n’est pas fait.',
        },
        start: {
          title: 'Lancer la génération',
          body: 'ClawAI lance la tâche et ouvre la page de relecture, où vous suivez chaque étape et pouvez annuler à tout moment.',
        },
      },
    },
    [TourId.ThreadReview]: {
      title: 'Relire un Thread',
      description: 'Le suivre, le lire, l’approuver, l’exporter, le partager.',
      steps: {
        status: {
          title: 'Progression en direct',
          body: 'Pendant l’exécution, cette ligne dit ce qui se passe : recherche, auteurs en train d’écrire, accord sur un brouillon, juge et critique. Annuler l’arrête et rend le crédit inutilisé.',
        },
        draft: {
          title: 'Le brouillon et ses sources',
          body: 'Quand les relectures passent, le brouillon apparaît avec ses sources numérotées. Lisez-le attentivement : vous pouvez le modifier ou demander des changements avant que quoi que ce soit soit public.',
        },
        approve: {
          title: 'Approuver et publier',
          body: 'Seul un brouillon approuvé devient une page publique. Retirer l’enlève de la page, de la recherche, du sitemap et des flux.',
        },
        export: {
          title: 'Le télécharger',
          body: 'Cochez un ou plusieurs formats et téléchargez-les ensemble dans un ZIP, ou enregistrez un PDF via la boîte d’impression du navigateur.',
        },
        share: {
          title: 'Le partager',
          body: 'Copiez le lien, utilisez le partage de votre appareil ou publiez-le sur WhatsApp, Facebook, LinkedIn, X, Telegram, Reddit ou par e-mail une fois publié.',
        },
      },
    },
    [TourId.ChatIntro]: {
      title: 'Visite du chat',
      description: 'Tout ce qui entoure la zone de message, en une minute.',
      steps: {
        input: {
          title: 'Écrivez ici',
          body: 'Tapez votre message et appuyez sur Entrée pour l’envoyer. Maj+Entrée ajoute une ligne. Vous pouvez aussi coller images et fichiers.',
        },
        context: {
          title: 'Contexte',
          body: 'Ajoutez des paquets de contexte, prévisualisez ce que verra le modèle et utilisez votre mémoire, pour que les réponses s’appuient sur votre matériel.',
        },
        model: {
          title: 'Quel modèle répond',
          body: 'Laissez Auto et ClawAI choisit un modèle pour chaque message, ou choisissez-en un précis.',
        },
        attach: {
          title: 'Joindre des fichiers',
          body: 'Téléversez des documents, images, audio ou vidéo. Le texte est extrait pour que n’importe quel modèle puisse le lire.',
        },
        research: {
          title: 'Chercher sur le web',
          body: 'Activez la recherche web quand la réponse demande des faits récents et des sources.',
        },
        prompts: {
          title: 'Bibliothèque de prompts',
          body: 'Des prompts réutilisables pour les tâches courantes. Choisissez-en un pour remplir la zone de message.',
        },
        send: {
          title: 'Envoyer',
          body: 'Envoie votre message. La réponse arrive au fil de l’eau et vous pouvez l’arrêter à tout moment.',
        },
        rail: {
          title: 'Outils de ce chat',
          body: 'Comparez le même prompt entre modèles, demandez à un juge d’arbitrer, cherchez dans ce chat, partagez-le ou ouvrez d’autres actions.',
        },
      },
    },
    [TourId.ChatModels]: {
      title: 'Comment choisir un modèle',
      description: 'Routage automatique, choix manuel et sens des badges.',
      steps: {
        model: {
          title: 'Ouvrir le sélecteur de modèle',
          body: 'Ce bouton montre ce qui répondra à votre prochain message. Ouvrez-le pour voir tous les modèles, groupés par fournisseur, avec une recherche.',
        },
        auto: {
          title: 'Auto ou un modèle précis',
          body: 'Le routage automatique choisit un modèle par message parmi ce que votre offre permet. Choisir un modèle y épingle ce chat.',
        },
        badges: {
          title: 'Badges de crédit',
          body: '« Utilise du crédit » signifie que le modèle puise dans votre crédit de connecteur ou vos requêtes gratuites. Les modèles inclus n’en utilisent jamais.',
        },
        credit: {
          title: 'Votre crédit',
          body: 'Indique ce que vous pouvez dépenser. Quand le crédit ou les requêtes gratuites s’épuisent, ClawAI passe à un modèle inclus et vous le dit.',
        },
      },
    },
    [TourId.ChatResearch]: {
      title: 'Comment faire une recherche',
      description: 'Obtenez des réponses avec des sources en direct.',
      steps: {
        toggle: {
          title: 'Activer la recherche web',
          body: 'Activez la recherche avant d’envoyer. ClawAI cherche sur le web, lit les meilleures pages et répond d’après ce qu’il a trouvé.',
        },
        provider: {
          title: 'Choisir le moteur de recherche',
          body: 'Choisissez le fournisseur de recherche à utiliser. Auto en prend un qui vous est disponible.',
        },
        sources: {
          title: 'Vérifier les sources',
          body: 'Les réponses affichent leurs sources pour que vous les ouvriez et vérifiiez les affirmations. Pour une longue enquête, utilisez la page Recherche.',
        },
      },
    },
    [TourId.ChatContext]: {
      title: 'Comment ajouter du contexte',
      description: 'Ancrer les réponses dans votre propre matériel.',
      steps: {
        context: {
          title: 'Le bouton Contexte',
          body: 'Ouvrez-le pour joindre un paquet de contexte, voir ce qui est joint et activer ou couper la mémoire pour ce chat.',
        },
        preview: {
          title: 'Prévisualiser avant d’envoyer',
          body: 'Voyez exactement ce que le modèle recevra de votre historique, paquets, mémoire et fichiers, pour que rien de surprenant ne parte.',
        },
        packs: {
          title: 'Créer vos propres paquets',
          body: 'Un paquet de contexte est un matériel de référence réutilisable. Créez-en un sur la page Contexte et joignez-le à n’importe quel chat.',
        },
      },
    },
    [TourId.ChatToThread]: {
      title: 'Transformer un chat en Thread',
      description: 'Publiez ce que vous avez appris, avec les sources.',
      steps: {
        more: {
          title: 'Ouvrir Plus d’actions',
          body: 'Le menu au bout de la barre contient Exporter, Transformer en Thread public, Paramètres du Thread et Supprimer.',
        },
        create: {
          title: 'Choisir Transformer en Thread public',
          body: 'Un formulaire s’ouvre avec ce chat comme source. Vérifiez le sujet, choisissez les modèles, fixez un plafond de dépense et donnez votre accord.',
        },
        after: {
          title: 'Suivre et approuver',
          body: 'Vous arrivez sur la page de relecture. Quand les relectures passent, lisez le brouillon et approuvez-le pour publier.',
        },
      },
    },
    [TourId.CompareIntro]: {
      title: 'Visite de Compare',
      description: 'Envoyer un prompt à plusieurs modèles.',
      steps: {
        prompt: {
          title: 'Un prompt, plusieurs modèles',
          body: 'Écrivez le prompt une fois. Compare l’envoie à chaque modèle choisi et affiche les réponses côte à côte.',
        },
        models: {
          title: 'Choisir les modèles',
          body: 'Choisissez jusqu’à cinq modèles avec le même sélecteur que dans le chat. Mélangez les fournisseurs pour voir les différences.',
        },
        judge: {
          title: 'Juge et critique',
          body: 'Demandez à un juge de classer les réponses et à un critique de pointer ce qui est faible, avec leurs raisons.',
        },
      },
    },
    [TourId.ContextPacks]: {
      title: 'Comment créer du contexte',
      description: 'Construire un matériel de référence réutilisable.',
      steps: {
        create: {
          title: 'Créer un paquet',
          body: 'Donnez-lui un nom et ajoutez des notes, du texte ou des fichiers. Un paquet vous appartient et reste hors des chats des autres.',
        },
        use: {
          title: 'L’utiliser dans n’importe quel chat',
          body: 'Ouvrez le bouton Contexte dans un chat et joignez le paquet. Le modèle répond alors avec ce matériel sous les yeux.',
        },
      },
    },
  },
};
