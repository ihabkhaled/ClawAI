import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligenceMarketingSeo,
} from '@/types/live-intelligence-marketing-content.types';

/**
 * The French copy of the public Live & Video Intelligence pages. Every claim mirrors the English
 * file (`en.constants.ts`); nothing here may say more than it does.
 */
export const FR_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Nouveau dans ClawAI : Live & Video Intelligence',
  title: 'Chaque direct, chaque vidéo, compris dans votre langue',
  intro:
    'Collez le lien d’un direct ou d’une vidéo enregistrée provenant de plus de 30 plateformes. ClawAI le suit avec des sous-titres en direct et un flux continu de résumés et de temps forts, ou transforme la vidéo entière en un rapport clair en un seul clic. Tout tourne sur les serveurs de ClawAI : cela fonctionne donc sur n’importe quel appareil, y compris votre téléphone.',
  openCta: 'Collez un lien maintenant',
  signUpCta: 'Créer un compte gratuit',
  howItWorksCta: 'Voir comment ça marche',
  videosTitle: 'Voyez-le à l’œuvre',
  videosIntro:
    'Deux courts extraits du vrai produit. Appuyez sur lecture : ils sont muets par défaut et tournent en boucle, vous pouvez donc les regarder n’importe où.',
  videos: [
    {
      title: 'Le panneau Analyse IA à côté d’un stream de jeu vidéo',
      body: 'Un stream de jeu vidéo est en cours pendant que le panneau Analyse IA tient un fil continu de ce qui se passe à l’écran et de ce qui se dit.',
    },
    {
      title: 'Un journal télévisé en direct en arabe, sous-titré en anglais sur un téléphone',
      body: 'L’enregistrement sur téléphone d’un journal en direct sur YouTube : la présentatrice parle arabe, les sous-titres s’affichent en anglais et le Flux intelligent résume l’actualité jusqu’ici.',
    },
  ],
  stepsTitle: 'Comment ça marche, en quatre étapes',
  stepsIntro: 'D’un lien collé à des notes que vous pouvez garder. Rien à installer.',
  steps: [
    {
      title: 'Collez un lien',
      body: 'Collez l’adresse d’un direct ou d’une vidéo enregistrée : un reel, une publication, un short ou un ancien live. ClawAI vérifie qu’il peut lire la source avant de démarrer quoi que ce soit.',
    },
    {
      title: 'Choisissez votre langue et un mode',
      body: 'Choisissez la langue dans laquelle vous voulez lire, parmi les 13 langues de l’application, ainsi qu’un mode d’analyse : Son, Son + image ou Auto intelligent.',
    },
    {
      title: 'Suivez en direct, ou cliquez sur « Résumer la vidéo »',
      body: 'Suivez le contenu avec des sous-titres et un Flux intelligent de résumés, de temps forts et de notes visuelles. Pour une vidéo enregistrée, vous pouvez aussi cliquer sur « Résumer la vidéo » et obtenir le rapport complet d’un coup.',
    },
    {
      title: 'Exportez et partagez',
      body: 'Tout est enregistré dans votre historique. Exportez-le en PDF, Markdown ou TXT et partagez-le avec qui en a besoin.',
    },
  ],
  screenshotsTitle: 'À quoi ça ressemble sur un téléphone',
  screenshotsIntro: 'De vrais écrans de l’application, capturés sur un téléphone en thème sombre.',
  screenshots: [
    {
      title: 'Coller le lien d’un direct ou d’une vidéo',
      body: 'Un seul champ accepte un lien de n’importe quelle plateforme prise en charge. Choisissez la langue et le mode, puis lancez.',
    },
    {
      title: 'Le flux en direct avec sous-titres, résumés et temps forts',
      body: 'Les sous-titres suivent l’orateur à quelques secondes près, tandis que le Flux intelligent tient à jour résumés, temps forts et notes visuelles.',
    },
    {
      title: 'Un résumé vidéo en un clic',
      body: 'Le rapport final : un résumé global, les moments clés horodatés, les temps forts et la transcription complète.',
    },
  ],
  outcomesTitle: 'Ce que ça change pour vous',
  outcomes: [
    {
      title: 'Rattrapez un live de deux heures en quelques minutes',
      body: 'Lisez le résumé et les moments clés au lieu de parcourir tout l’enregistrement. Chaque moment est horodaté : vous sautez directement au passage qui compte.',
    },
    {
      title: 'Suivez une émission en langue étrangère dans votre langue',
      body: 'Une conférence de presse en japonais, un commentaire de match en espagnol, le journal en arabe : lisez les sous-titres et les résumés dans la langue de votre choix.',
    },
    {
      title: 'Ne manquez plus jamais le moment clé',
      body: 'Les temps forts sont repérés au fil du direct : vous pouvez détourner les yeux et savoir quand même ce qui vient de se passer.',
    },
    {
      title: 'Des notes pour les réunions, les cours, l’actualité et le jeu vidéo',
      body: 'Transformez un webinaire public, un cours enregistré, un direct d’actualité ou un tournoi en notes que vous pouvez rechercher, conserver et exporter.',
    },
    {
      title: 'Fonctionne sur tous les appareils',
      body: 'ClawAI lit le direct sur ses propres serveurs. Vous n’avez rien à partager depuis votre écran, donc cela fonctionne de la même façon sur téléphone, tablette ou ordinateur.',
    },
    {
      title: 'Votre historique, vos exports',
      body: 'Ce que vous avez regardé et chaque résumé que vous avez créé restent dans votre historique, prêts à être exportés en PDF, Markdown ou TXT.',
    },
  ],
  waysTitle: 'Deux façons de l’utiliser',
  waysIntro:
    'Suivez un direct au moment où il se déroule, ou confiez une vidéo enregistrée à ClawAI et recevez le rapport en une fois.',
  ways: [
    {
      title: 'Analyse en direct : suivez en même temps',
      body: 'Les sous-titres arrivent environ 7 à 12 secondes après la parole, et un Flux intelligent continu ajoute résumés, temps forts et notes visuelles. Les plateformes dotées d’un chat en direct ont droit à un onglet de chat. Pour une vidéo enregistrée, ClawAI la lit depuis le début à vitesse normale et l’analyse suit.',
    },
    {
      title: 'Résumer la vidéo : un seul clic',
      body: 'Pour une vidéo enregistrée, ClawAI traite toute la vidéo d’un coup et renvoie un rapport complet : un résumé global, les moments clés horodatés, les temps forts et la transcription complète. Il est enregistré dans votre historique et s’exporte en PDF, Markdown ou TXT.',
    },
  ],
  waysTableCaption: 'Analyse en direct et résumé en un clic, côte à côte',
  waysTableAspect: 'Ce que vous obtenez',
  waysTableLive: 'Analyse en direct',
  waysTableSummary: 'Résumer la vidéo',
  waysRows: [
    {
      label: 'Fonctionne avec',
      live: 'Les directs et les vidéos enregistrées',
      summary: 'Les vidéos enregistrées jusqu’à 3 heures',
    },
    {
      label: 'Rythme',
      live: 'Suit la vidéo en temps réel, sous-titres avec environ 7 à 12 secondes de décalage',
      summary: 'Toute la vidéo est traitée d’un coup',
    },
    {
      label: 'Résultat',
      live: 'Sous-titres et Flux intelligent de résumés, temps forts et notes visuelles',
      summary: 'Résumé global, moments clés horodatés, temps forts et transcription complète',
    },
    {
      label: 'Chat en direct',
      live: 'Un onglet de chat sur les plateformes qui en ont un',
      summary: 'Inutile',
    },
    {
      label: 'Conservation',
      live: 'Enregistré dans votre historique, export en PDF, Markdown ou TXT',
      summary: 'Enregistré dans votre historique, export en PDF, Markdown ou TXT',
    },
  ],
  modesTitle: 'Trois modes d’analyse',
  modesIntro:
    'Le mode détermine ce à quoi ClawAI prête attention. Vous le choisissez avant de commencer.',
  modes: [
    {
      title: 'Son',
      body: 'Sous-titres, résumés et temps forts à partir de ce qui est dit. Idéal pour les conférences, interviews, podcasts, cours et journaux d’information.',
    },
    {
      title: 'Son + image',
      body: 'Ajoute ce qui s’affiche à l’écran, comme des diapositives, des graphiques, des tableaux de score ou du gameplay, pour que les notes décrivent ce que vous voyez autant que ce que vous entendez.',
    },
    {
      title: 'Auto intelligent',
      body: 'Part du son et regarde l’image quand elle a des chances de compter, par exemple quand l’orateur se tait ou que la scène change.',
    },
  ],
  researchNote:
    'Recherche : un résumé peut lancer une recherche web pour ajouter du contexte, par exemple qui est un intervenant ou à quoi un événement fait référence.',
  languagesTitle: 'Lisez-le dans votre langue',
  languagesParagraphs: [
    'Choisissez l’une des 13 langues de l’application : anglais, arabe, allemand, espagnol, persan, français, hindi, italien, japonais, portugais, russe, thaï ou chinois. L’orateur peut parler n’importe quelle langue.',
    'Quand l’orateur parle déjà votre langue, vous lisez ses mots exacts. Sinon, les sous-titres, résumés et temps forts sont traduits, et la traduction s’affiche à la place de l’original.',
  ],
  platformsTitle: 'Plus de 30 plateformes',
  platformsBody:
    'YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili, Niconico, CHZZK, SOOP et bien d’autres. Les directs comme les vidéos enregistrées fonctionnent.',
  platformsCta: 'Voir toutes les plateformes',
  limitsTitle: 'Bon à savoir',
  limits: [
    {
      title: 'Uniquement les vidéos et directs publics',
      body: 'ClawAI ne peut lire que les vidéos et directs publics. Certaines plateformes, ou certaines vidéos, peuvent refuser l’accès depuis un serveur ; dans ce cas, ClawAI vous le dit clairement au lieu de faire semblant.',
    },
    {
      title: 'Vidéos enregistrées jusqu’à 3 heures',
      body: 'Une vidéo enregistrée peut durer jusqu’à 3 heures, pour l’analyse en direct comme pour le résumé en un clic.',
    },
    {
      title: 'Les sous-titres ont quelques secondes de retard',
      body: 'La parole est transcrite par courts segments, donc les sous-titres arrivent environ 7 à 12 secondes après avoir été prononcés. Ce n’est pas du sous-titrage instantané.',
    },
    {
      title: 'Des minutes gratuites chaque mois, des minutes payantes seulement avec votre accord',
      body: 'Chaque formule inclut des minutes gratuites chaque mois. Au-delà, les minutes ne sont payantes qu’une fois que vous avez donné votre accord. Un résumé en un clic compte la durée de la vidéo en minutes.',
    },
  ],
  faqTitle: 'Questions fréquentes',
  faq: [
    {
      question: 'Est-ce que ça marche sur mon téléphone ?',
      answer:
        'Oui. ClawAI lit le direct ou la vidéo sur ses propres serveurs, vous n’avez donc rien à partager depuis votre écran. Cela fonctionne aussi bien sur téléphone que sur tablette ou ordinateur.',
    },
    {
      question: 'Dans quelles langues puis-je lire les sous-titres ?',
      answer:
        'Dans l’une des 13 langues de l’application : anglais, arabe, allemand, espagnol, persan, français, hindi, italien, japonais, portugais, russe, thaï et chinois. L’orateur peut parler n’importe quelle langue. S’il parle déjà votre langue, vous voyez ses mots exacts ; sinon, la traduction s’affiche à la place de l’original.',
    },
    {
      question:
        'Est-ce que ça marche avec des vidéos enregistrées, ou seulement avec des directs ?',
      answer:
        'Les deux. Collez un direct, ou une vidéo enregistrée comme un reel, une publication, un short ou un ancien live. Avec une vidéo enregistrée, vous pouvez la suivre depuis le début à vitesse normale, ou cliquer sur « Résumer la vidéo » pour obtenir le rapport complet d’un coup.',
    },
    {
      question: 'Quelle durée maximale pour une vidéo ?',
      answer: 'Une vidéo enregistrée peut durer jusqu’à 3 heures.',
    },
    {
      question: 'Que contient un résumé en un clic ?',
      answer:
        'Un résumé global, les moments clés horodatés, les temps forts et la transcription complète. Il est enregistré dans votre historique et peut être exporté en PDF, Markdown ou TXT.',
    },
    {
      question: 'Comment est-ce facturé ?',
      answer:
        'Chaque formule inclut des minutes gratuites chaque mois. Au-delà, vous payez à la minute, et uniquement après avoir donné votre accord. Un résumé en un clic compte la durée de la vidéo en minutes.',
    },
    {
      question: 'Les sous-titres sont-ils en temps réel ?',
      answer:
        'Presque. Les sous-titres arrivent environ 7 à 12 secondes après la parole, car l’audio est transcrit par courts segments. Les résumés et les temps forts suivent les sous-titres.',
    },
    {
      question: 'Quelles plateformes sont prises en charge ?',
      answer:
        'Plus de 30, dont YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili et Niconico. La page des plateformes les liste toutes. Seuls les vidéos et directs publics peuvent être lus, et Discord n’est pas pris en charge car il n’a pas de liens publics.',
    },
    {
      question: 'ClawAI publie-t-il ou discute-t-il en mon nom ?',
      answer:
        'Non. ClawAI se contente de lire le direct. Il ne publie, ne commente et ne discute jamais pour vous sur aucune plateforme. Ce que dit le direct, et ce que dit son chat, est traité comme des données non fiables à résumer, jamais comme des instructions pour ClawAI.',
    },
    {
      question: 'Qui peut voir ce que j’ai regardé ?',
      answer:
        'Votre historique vous appartient. Les analyses que vous avez suivies et les résumés que vous avez créés restent dans votre compte jusqu’à ce que vous les supprimiez, et c’est vous qui décidez de ce que vous exportez ou partagez.',
    },
  ],
  closingTitle: 'Collez votre premier lien',
  closingBody:
    'Un match en direct, une conférence de presse, un cours ou un live de deux heures que vous avez manqué : collez le lien, choisissez votre langue et laissez ClawAI prendre les notes. Des minutes gratuites sont incluses chaque mois dans chaque formule.',
  platformsPage: {
    eyebrow: 'Nouveau dans ClawAI : Live & Video Intelligence',
    title: 'Toutes les plateformes que Live & Video Intelligence sait lire',
    intro:
      'Collez un lien de l’une de ces plateformes, en direct ou enregistré. ClawAI le lit sur ses propres serveurs : cela fonctionne donc sur n’importe quel appareil, téléphones compris.',
    openCta: 'Collez un lien maintenant',
    backCta: 'Retour à Live & Video Intelligence',
    groupsTitle: 'Les plateformes par catégorie',
    groupsIntro:
      'Les noms des plateformes sont des marques de leurs propriétaires. ClawAI n’est ni affilié à elles ni approuvé par elles.',
    groups: {
      [LiveMarketingPlatformGroup.GLOBAL_VIDEO]: {
        title: 'Vidéo grand public',
        body: 'Les grands sites vidéo que l’on partage tous les jours, des longues conférences et des cours aux courts extraits et aux émissions audio.',
      },
      [LiveMarketingPlatformGroup.GAMING_STREAMING]: {
        title: 'Jeu vidéo et streaming',
        body: 'Jeu vidéo en direct, esport et streams de créateurs, avec un onglet de chat en direct juste à côté de l’analyse.',
      },
      [LiveMarketingPlatformGroup.SOCIAL]: {
        title: 'Réseaux sociaux',
        body: 'Reels, publications, shorts et directs issus des réseaux sociaux et des canaux de messagerie.',
      },
      [LiveMarketingPlatformGroup.ASIA]: {
        title: 'Asie',
        body: 'Plateformes vidéo et de direct de Chine, du Japon, de Corée et de toute l’Asie, lisibles dans l’une des 13 langues de l’application.',
      },
    },
    liveTag: 'Direct',
    videoTag: 'Vidéos',
    supportTitle: 'Ce qui fonctionne sur chaque plateforme',
    supportIntro: 'Les trois mêmes fonctions marchent partout où ClawAI peut lire la source.',
    support: [
      {
        title: 'Directs',
        body: 'Des sous-titres environ 7 à 12 secondes après la parole, un Flux intelligent de résumés, de temps forts et de notes visuelles, et un onglet de chat en direct quand la plateforme en propose un.',
      },
      {
        title: 'Vidéos enregistrées',
        body: 'Reels, publications, shorts et anciens lives jusqu’à 3 heures. ClawAI lit la vidéo depuis le début à vitesse normale et l’analyse suit.',
      },
      {
        title: 'Résumé en un clic',
        body: 'Pour une vidéo enregistrée, cliquez sur « Résumer la vidéo » et obtenez un résumé global, les moments clés horodatés, les temps forts et la transcription complète.',
      },
    ],
    limitsTitle: 'Les limites, en toute honnêteté',
    limits: [
      {
        title: 'Public uniquement',
        body: 'Seuls les vidéos et directs publics peuvent être lus. Les contenus privés ou réservés aux membres ne sont pas lisibles.',
      },
      {
        title: 'Une plateforme peut refuser',
        body: 'Certaines plateformes, ou certaines vidéos, peuvent refuser l’accès depuis un serveur. Dans ce cas, ClawAI vous le dit clairement au lieu d’afficher un faux résultat.',
      },
      {
        title: 'Discord n’est pas pris en charge',
        body: 'Les streams Discord n’ont pas de liens publics : un serveur n’a donc rien à ouvrir.',
      },
    ],
    faqTitle: 'Questions sur les plateformes',
    faq: [
      {
        question: 'Ma plateforme est-elle prise en charge ?',
        answer:
          'Si elle figure sur cette page, collez le lien : ClawAI le vérifie avant de démarrer quoi que ce soit. Si la plateforme ou la vidéo refuse l’accès depuis un serveur, vous le voyez immédiatement.',
      },
      {
        question: 'Les directs et les vidéos enregistrées fonctionnent-ils tous les deux ?',
        answer:
          'Oui, sur toutes les plateformes listées. Une vidéo enregistrée peut aussi être résumée en un clic, jusqu’à 3 heures.',
      },
      {
        question: 'Pourquoi une vidéo peut-elle échouer alors que sa plateforme est listée ?',
        answer:
          'Une plateforme peut empêcher un serveur de lire une vidéo précise, même publique. Dans ce cas, ClawAI vous le dit immédiatement. Les vidéos et directs privés ne peuvent jamais être lus.',
      },
      {
        question: 'Pourquoi Discord est-il absent ?',
        answer:
          'Les streams Discord n’ont pas de lien public qu’un serveur pourrait ouvrir : ClawAI ne peut donc pas les lire.',
      },
    ],
    closingTitle: 'Vous avez trouvé votre plateforme ?',
    closingBody:
      'Collez le lien, choisissez votre langue et lancez-vous. Des minutes gratuites sont incluses chaque mois dans chaque formule.',
  },
};

/** French SEO copy for both pages; claims mirror the English file. */
export const FR_LIVE_INTELLIGENCE_MARKETING_SEO: LiveIntelligenceMarketingSeo = {
  overview: {
    title: 'Live & Video Intelligence : sous-titres en direct et résumé vidéo en un clic',
    description:
      'Collez le lien d’un direct ou d’une vidéo YouTube, Twitch, TikTok et de 30+ plateformes. Obtenez des sous-titres en direct dans votre langue, un Flux intelligent de résumés et de temps forts, ou un résumé vidéo horodaté en un clic. Sur tous les appareils.',
    keywords: [
      'sous-titres live stream',
      'résumer une vidéo YouTube',
      'résumé vidéo IA',
      'traduction sous-titres en direct',
      'temps forts live',
    ],
  },
  platforms: {
    title: 'Plateformes prises en charge par Live & Video Intelligence',
    description:
      'Toutes les plateformes que ClawAI sait lire pour les sous-titres en direct et les résumés vidéo : YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X, Bilibili, Niconico, CHZZK, SOOP et plus, par catégorie.',
    keywords: [
      'plateformes vidéo prises en charge',
      'plateformes de streaming en direct',
      'sous-titres Twitch',
      'résumé vidéo plateformes',
    ],
  },
};
