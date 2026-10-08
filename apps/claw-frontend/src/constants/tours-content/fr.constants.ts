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
    launcherDone: 'Faite',
    launcherStart: 'Démarrer',
    launcherRestart: 'Revoir',
    offerTitle: 'Nouveau ici ? Faites une visite d’une minute',
    offerStart: 'Montrez-moi',
    offerLater: 'Pas maintenant',
    offerNever: 'Ne plus afficher les visites',
    launcherNoneHere: 'Pas encore de visite pour cette page.',
    launcherStopOffers: 'Ne plus proposer de visites',
    launcherResumeOffers: 'Proposer de nouveau les visites',
    launcherOffersStopped:
      'Les propositions de visite sont désactivées. Vous pouvez toujours revoir ici chaque visite de cette page.',
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
    [TourId.ChatList]: {
      title: 'Vos discussions',
      description: 'Trouvez, lancez et organisez vos conversations.',
      steps: {
        new: {
          title: 'Lancer une discussion',
          body: 'Commencez une nouvelle conversation. Sur mobile, utilisez le bouton rond en bas.',
        },
        search: {
          title: 'Rechercher dans vos discussions',
          body: 'Saisissez du texte pour retrouver une discussion par son titre.',
        },
        tabs: {
          title: 'Toutes, Épinglées, Archivées',
          body: 'Les discussions épinglées restent en haut. Archivez-en une pour ranger la liste sans la supprimer.',
        },
        items: {
          title: 'Vos conversations',
          body: 'Ouvrez-en une pour la poursuivre. Le menu d’une ligne permet de l’épingler ou de l’archiver.',
        },
      },
    },
    [TourId.ChatMessages]: {
      title: 'Messages et réponses',
      description: 'Ce que permet chaque message et chaque réponse.',
      steps: {
        yours: {
          title: 'Votre message',
          body: 'Survolez ou ciblez un message pour le copier, le modifier ou créer une branche de la discussion à partir de là.',
        },
        meta: {
          title: 'Quel modèle a répondu',
          body: 'Chaque réponse indique le modèle qui l’a écrite, comment il a été choisi et ce qu’il a utilisé, comme la mémoire ou des fichiers.',
        },
        actions: {
          title: 'Travailler avec une réponse',
          body: 'Copiez-la, notez-la, régénérez-la avec le même modèle ou un autre, faites-la lire à voix haute, enregistrez-la en mémoire, exportez-la ou ouvrez-la en grand.',
        },
        more: {
          title: 'Derrière la réponse',
          body: 'Ouvrez « Pourquoi ce modèle » pour voir la raison du choix, et le panneau des sources quand la réponse a utilisé la recherche. Sélectionnez un texte dans une réponse pour le citer dans votre message suivant.',
        },
      },
    },
    [TourId.ChatHeader]: {
      title: 'En-tête de la discussion et outils',
      description: 'Recherche, qualité, export et plus.',
      steps: {
        more: {
          title: 'Plus d’actions',
          body: 'Recherchez dans cette discussion, vérifiez sa qualité, comparez des modèles, partagez-la, exportez-la, transformez-la en Thread ou ouvrez ses paramètres.',
        },
        rail: {
          title: 'Actions rapides',
          body: 'Les plus utilisées sont ici : comparer des modèles, vérifier la qualité et rechercher dans cette discussion.',
        },
        keep: {
          title: 'Garder une copie',
          body: 'L’export enregistre cette conversation dans un fichier. Une discussion issue d’une branche affiche une barre qui renvoie à la discussion d’origine.',
        },
      },
    },
    [TourId.ChatShare]: {
      title: 'Partager une discussion',
      description: 'Publiez un lien en lecture seule, en toute sécurité.',
      steps: {
        open: {
          title: 'Partager une discussion',
          body: 'Ouvrez « Plus d’actions » et choisissez « Partager » pour publier une copie en lecture seule de cette conversation sur un lien public.',
        },
        warning: {
          title: 'À lire avant de publier',
          body: 'Toute personne disposant du lien peut la lire sans se connecter. La copie contient la conversation dans son état actuel ; les messages suivants restent privés. Ne partagez jamais de secrets ni de données personnelles.',
        },
        link: {
          title: 'Le lien et les moteurs de recherche',
          body: 'Copiez le lien public ou ouvrez-le dans un nouvel onglet. N’autorisez l’indexation que si vous voulez qu’il apparaisse dans les recherches ; sinon seules les personnes ayant le lien le trouvent.',
        },
        manage: {
          title: 'Mettre à jour ou arrêter',
          body: 'Mettez à jour la version partagée pour publier les messages récents, générez un nouveau lien si l’ancien a fuité, ou arrêtez le partage pour désactiver le lien aussitôt.',
        },
      },
    },
    [TourId.ChatSettings]: {
      title: 'Paramètres du fil',
      description: 'Réglez une discussion : modèle, prompt et contexte.',
      steps: {
        open: {
          title: 'Paramètres du fil',
          body: 'Ouvrez « Plus d’actions » et choisissez « Paramètres » pour changer le comportement de cette seule discussion.',
        },
        model: {
          title: 'Modèle et consignes',
          body: 'Choisissez un modèle préféré pour cette discussion et rédigez un prompt système qui fixe son rôle et son ton.',
        },
        tuning: {
          title: 'Créativité et longueur',
          body: 'La température rend les réponses plus prévisibles ou plus variées. Le nombre maximal de tokens limite la longueur d’une réponse.',
        },
        context: {
          title: 'Contexte de cette discussion',
          body: 'Joignez des packs de contexte et activez ou désactivez la mémoire, le contexte de la discussion et celui des autres discussions pour cette conversation seulement.',
        },
      },
    },
    [TourId.CompareResults]: {
      title: 'Lire les résultats de Comparer',
      description: 'Cartes, Judge et ce que vous pouvez faire des réponses.',
      steps: {
        results: {
          title: 'Côte à côte',
          body: 'Chaque modèle répond dans sa propre carte, pour que vous les lisiez l’une à côté de l’autre.',
        },
        judge: {
          title: 'Judge et Critic',
          body: 'Activez le Judge pour classer les réponses et expliquer pourquoi. Ajoutez le Critic pour contester le choix du Judge.',
        },
        actions: {
          title: 'Utiliser une réponse',
          body: 'Sur chaque carte, vous pouvez alterner entre texte mis en forme et texte brut, le copier, l’exporter en Markdown ou l’ouvrir en grand.',
        },
      },
    },
    [TourId.LabsIntro]: {
      title: 'Laboratoires d’orchestration',
      description: 'Faites passer un prompt par plusieurs modèles selon un schéma fixe.',
      steps: {
        what: {
          title: 'Ce que font les laboratoires',
          body: 'Chaque laboratoire fait passer votre prompt par plusieurs modèles selon un schéma fixe : consensus, escalade, meilleur de N, ensemble de coûts, décomposition, pipeline, réparation, pack de rôles ou vérification.',
        },
        how: {
          title: 'Comment en utiliser un',
          body: 'Choisissez les modèles, rédigez votre prompt et envoyez-le. Joignez fichiers, packs de contexte et prompts enregistrés comme dans une discussion normale. Les résultats apparaissent en dessous sous forme de cartes.',
        },
      },
    },
    [TourId.DashboardIntro]: {
      title: 'Votre tableau de bord',
      description: 'Un aperçu rapide de votre espace de travail.',
      steps: {
        header: {
          title: 'Tableau de bord',
          body: 'Votre vue d’ensemble : ce que vous avez, ce qui est connecté et si tout va bien.',
        },
        stats: {
          title: 'Chiffres clés',
          body: 'Total des discussions, connecteurs actifs et modèles locaux d’un coup d’œil.',
        },
        actions: {
          title: 'Actions rapides',
          body: 'Lancez une discussion, ajoutez un connecteur ou configurez le routage en un clic.',
        },
      },
    },
    [TourId.PlanIntro]: {
      title: 'Votre offre',
      description: 'Ce que comprend votre abonnement.',
      steps: {
        header: {
          title: 'Mon offre',
          body: 'Votre offre actuelle, ses fonctionnalités et les modèles que vous pouvez utiliser.',
        },
        quota: { title: 'Quota quotidien de tokens', body: 'Votre allocation pour chaque jour.' },
        models: {
          title: 'Modèles autorisés',
          body: 'Les modèles que votre offre vous permet d’utiliser. Passez à l’offre supérieure pour en débloquer davantage.',
        },
      },
    },
    [TourId.BillingIntro]: {
      title: 'Facturation',
      description: 'Offres, prix et paiements.',
      steps: {
        header: {
          title: 'Facturation',
          body: 'Gérez votre abonnement et voyez ce que coûte chaque offre.',
        },
        plans: {
          title: 'Choisir une offre',
          body: 'Comparez les offres et alternez entre facturation mensuelle et annuelle.',
        },
      },
    },
    [TourId.UsageIntro]: {
      title: 'Utilisation',
      description: 'Suivez ce que vous avez consommé.',
      steps: {
        header: {
          title: 'Utilisation',
          body: 'Suivez votre consommation quotidienne de tokens par rapport à votre offre.',
        },
        card: {
          title: 'Utilisation quotidienne de tokens',
          body: 'La barre montre la part de l’allocation du jour que vous avez utilisée, ainsi que votre crédit de connecteur si votre offre en comprend.',
        },
      },
    },
    [TourId.FilesIntro]: {
      title: 'Vos fichiers',
      description: 'Importez des fichiers pour donner du contexte à l’IA.',
      steps: {
        header: {
          title: 'Fichiers',
          body: 'Tout ce que vous importez est ici, prêt à servir de contexte dans la discussion.',
        },
        upload: {
          title: 'Importer un fichier',
          body: 'Glissez un fichier ici ou cliquez pour en choisir un. Les fichiers sont analysés avant d’être utilisés.',
        },
      },
    },
    [TourId.SettingsIntro]: {
      title: 'Paramètres',
      description: 'Votre compte et vos préférences.',
      steps: {
        header: {
          title: 'Paramètres',
          body: 'Gérez votre profil, votre sécurité, votre langue et votre apparence.',
        },
        language: { title: 'Langue', body: 'Choisissez la langue de toute l’application.' },
        appearance: {
          title: 'Apparence',
          body: 'Passez du thème clair au thème sombre ou à celui du système.',
        },
        danger: {
          title: 'Supprimer le compte',
          body: 'Supprime définitivement votre compte et ferme toutes les sessions. Impossible à annuler.',
        },
      },
    },
    [TourId.MemoryIntro]: {
      title: 'Mémoire',
      description: 'Ce que l’IA retient de vous.',
      steps: {
        header: {
          title: 'Mémoire',
          body: 'Les enregistrements de mémoire donnent à l’IA un contexte durable sur vous et votre travail.',
        },
        tabs: {
          title: 'Enregistrées et suggérées',
          body: 'Les mémoires enregistrées servent dans vos discussions. Les suggestions sont de nouvelles mémoires que l’IA vous propose de relire.',
        },
      },
    },
    [TourId.ConnectorsIntro]: {
      title: 'Connecteurs',
      description: 'Vos connexions aux fournisseurs d’IA.',
      steps: {
        header: {
          title: 'Connecteurs',
          body: 'Un connecteur relie ClawAI à un fournisseur d’IA avec votre propre clé.',
        },
        actions: {
          title: 'Ajouter un connecteur',
          body: 'Créez-en un pour utiliser les modèles d’un fournisseur. Vous pourrez ensuite tester la connexion et synchroniser ses modèles.',
        },
      },
    },
  },
};
