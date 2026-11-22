import type {
  PublicLaunchCorePageDictionary,
  PublicLaunchLabels,
  PublicLaunchLocalizedLabels,
} from '@/types/public-launch-content.types';

/** Les libellés de page (onThisPage, evidence, …) se trouvent dans public-commerce-policy-content. */
export const FR_PUBLIC_LAUNCH_LABELS: Omit<PublicLaunchLabels, keyof PublicLaunchLocalizedLabels> =
  {
    viewPricing: 'Voir les tarifs',
    readSecurity: 'Lire la sécurité et la confidentialité',
    baselineCatalog: 'Catalogue de base des abonnements',
    monthlyPrice: 'Mensuel',
    yearlyPrice: 'Annuel',
    dailyAllowance: 'Quota pondéré quotidien',
    monthlyAllowance: 'Quota pondéré mensuel',
    liveCheckoutNote:
      'Ce sont les prix et quotas de base du dépôt. Le paiement en direct confirme le prix en vigueur avant le règlement.',
    providerAvailabilityNote:
      'Les modèles sont synchronisés depuis les fournisseurs activés. Le catalogue exact dépend des identifiants configurés, de la disponibilité des fournisseurs, de l’état du cycle de vie et de la politique de l’administrateur.',
    routingRailTitle: 'Une requête, un parcours vérifiable',
    routingRailSummary:
      'ClawAI évalue la requête et la politique en vigueur avant de choisir une voie d’exécution disponible.',
    routingRailAlternative:
      'Une requête est évaluée, acheminée vers un fournisseur éligible, éventuellement comparée, puis renvoyée avec l’identité du modèle et le détail de l’usage.',
    evaluate: 'Évaluer',
    evaluateDescription:
      'Lire la tâche, le contexte disponible, la politique et l’éligibilité actuelle.',
    route: 'Acheminer',
    routeDescription:
      'Choisir une voie de modèle active parmi les fournisseurs configurés par l’opérateur.',
    compare: 'Comparer',
    compareDescription:
      'Utiliser l’orchestration multimodèle uniquement si le mode choisi et le quota le permettent.',
    receipt: 'Renvoyer',
    receiptDescription:
      'Diffuser la réponse avec l’origine du modèle et les informations d’usage visibles.',
  };

export const FR_PUBLIC_LAUNCH_PAGES: PublicLaunchCorePageDictionary = {
  about: {
    eyebrow: 'À propos de ClawAI',
    sections: [
      {
        id: 'purpose',
        title: 'Un plan de contrôle pratique pour le travail avec l’IA',
        body: 'ClawAI réunit conversations, routage de modèles, fichiers, mémoire, recherche, génération et actions d’espace de travail dans une interface cohérente. Le produit est conçu pour réduire la friction opérationnelle liée au passage d’un fournisseur à l’autre, tout en gardant visibles, pour la personne qui travaille, le modèle choisi, l’usage et la voie d’exécution.',
      },
      {
        id: 'principles',
        title: 'Conçu autour du choix, de la preuve et du contrôle',
        body: 'La plateforme ne considère aucun modèle comme le meilleur en toutes circonstances. Elle peut router selon la tâche, laisser une personne choisir un modèle, comparer plusieurs réponses éligibles ou demander à un juge indépendant de relire le résultat. La disponibilité dépend toujours des connecteurs, des identifiants, de la politique du forfait et du cycle de vie des modèles configurés dans l’environnement en cours d’exécution.',
      },
      {
        id: 'architecture',
        title: 'Exploitation d’abord locale, accès aux modèles du cloud',
        body: 'Le dépôt contient une interface Next.js et des services déployables indépendamment, reliés par des frontières HTTP et événementielles explicites. Les opérateurs peuvent exécuter la plateforme sur leur propre infrastructure, connecter des fournisseurs cloud pris en charge ou définir un déploiement de modèles locaux dont le matériel et les intégrations correspondent aux exigences de l’organisation.',
      },
      {
        id: 'trust',
        title: 'La confiance par des faits vérifiables',
        body: 'Nous publions l’architecture, les bases tarifaires, les contrôles de sécurité, les limites et les dates de relecture, plutôt que des badges sans fondement ou de fausses preuves clients. Le dépôt source est disponible pour un examen technique, tandis que les catalogues de fournisseurs en direct et le paiement restent la référence de ce qui est disponible dans un déploiement donné.',
      },
    ],
    evidence:
      'ClawAI est un dépôt ouvert comprenant 18 services NestJS, un frontend Next.js, des paquets partagés, des événements RabbitMQ et une base de données propre à chaque service. Les affirmations sur le produit figurant sur ce site se limitent au comportement visible dans ce dépôt.',
  },
  pricing: {
    eyebrow: 'Des bases d’abonnement claires',
    sections: [
      {
        id: 'catalog',
        title: 'Sept points de départ, du gratuit au gros volume',
        body: 'Le catalogue de base comprend les forfaits Free, Starter, Plus, Pro, Team, Scale et Unlimited. Les prix mensuels vont de zéro à deux cents dollars américains, et les prix annuels correspondent à dix mensualités lorsque la facturation annuelle est proposée. Le service de paiement détermine côté serveur le prix actif immuable avant de créer un paiement hébergé.',
      },
      {
        id: 'allowances',
        title: 'Les quotas sont pondérés, pas des promesses de jetons bruts',
        body: 'Les chiffres quotidiens, hebdomadaires et mensuels publiés représentent des unités normalisées selon le coût. Un modèle plus coûteux consomme le quota différemment d’un modèle économique, ce qui permet à un seul solde de couvrir des fournisseurs hétérogènes. Le catalogue définit aussi, par forfait, les limites de conversations, de messages, de simultanéité, d’espaces de travail, de mémoire et d’orchestration.',
      },
      {
        id: 'models',
        title: 'L’accès aux modèles suit le déploiement en direct',
        body: 'Par défaut, le dépôt expose les modèles actifs synchronisés, sauf si un administrateur crée des restrictions explicites de fournisseur ou de modèle. La politique de classes de coût préchargée ne prouve pas les règles d’une base de données déployée ; cette page ne promet donc pas un modèle précis pour un niveau précis. Vérifiez le catalogue en direct avant de choisir un forfait pour un modèle donné.',
      },
      {
        id: 'payment',
        title: 'Paiement hébergé au prix fixé côté serveur',
        body: 'Les intégrations PayPal et Paymob utilisent un paiement hébergé, de sorte que les numéros de carte ne transitent pas par l’application ClawAI. Les prix de référence des forfaits sont stockés en dollars américains ; une passerelle configurée peut régler dans une autre devise prise en charge. Les taxes, la disponibilité géographique, les remboursements et la disponibilité de la passerelle dépendent du service déployé et des conditions applicables.',
      },
    ],
    evidence:
      'Les valeurs du catalogue sont une base versionnée du dépôt, et non la garantie qu’un administrateur n’a pas modifié le déploiement actif. Le paiement affiche et facture le prix actif côté serveur.',
  },
  'supported-models': {
    eyebrow: 'Modèles et fournisseurs',
    sections: [
      {
        id: 'cloud',
        title: 'Adaptateurs de fournisseurs cloud implémentés',
        body: 'Le service de connecteurs comprend des adaptateurs opérationnels pour OpenAI, Anthropic, Google Gemini, DeepSeek et xAI Grok. Chaque adaptateur synchronise le catalogue du fournisseur lorsque des identifiants et une configuration valides sont présents. Les noms et la disponibilité des modèles peuvent évoluer en amont ; le catalogue en direct est donc la source fiable pour un déploiement en cours d’exécution.',
      },
      {
        id: 'local',
        title: 'Exécution locale avec Ollama et llama.cpp',
        body: 'Les opérateurs peuvent configurer Ollama et llama.cpp pour des modèles exécutés sur une infrastructure maîtrisée. Un mode de routage uniquement local maintient sa chaîne de repli sur des fournisseurs locaux. L’adéquation au matériel, la licence des modèles, les limites de contexte, la qualité et le débit varient ; le choix des modèles d’un déploiement privé est donc traité lors du cadrage technique et non promis de façon générale.',
      },
      {
        id: 'selection',
        title: 'Sélection manuelle et routage tenant compte de la politique',
        body: 'Les personnes peuvent choisir directement un modèle disponible ou laisser la logique de routage sélectionner une voie éligible pour la tâche. Le routeur tient compte des capacités du modèle, de son cycle de vie, de la configuration du connecteur et de la politique. Les modes multimodèles ajoutent des schémas de comparaison et de relecture, mais leur disponibilité et leurs limites suivent le déploiement actif et non le discours commercial.',
      },
      {
        id: 'availability',
        title: 'Pourquoi cette page évite une liste de versions figée',
        body: 'Une liste statique de versions à la mode devient vite inexacte et peut laisser croire à des identifiants qui ne sont pas configurés. ClawAI distingue donc les familles de fournisseurs implémentées de la disponibilité réelle des modèles. Les modèles affichés dans le produit sont synchronisés depuis les connecteurs activés et filtrés selon le cycle de vie et les éventuelles restrictions de l’administrateur.',
      },
    ],
    evidence:
      'AWS Bedrock existe dans le dépôt sous forme d’ébauche de connecteur, mais sa synchronisation de modèles n’est pas implémentée ; il n’est donc volontairement pas présenté ici comme un fournisseur disponible.',
  },
  'security-and-privacy': {
    eyebrow: 'Sécurité et confidentialité',
    sections: [
      {
        id: 'credentials',
        title: 'Les identifiants des connecteurs sont protégés au repos',
        body: 'Les clés d’API des fournisseurs et des connecteurs sont chiffrées avec AES-256-GCM, avec un vecteur d’initialisation aléatoire et une étiquette d’authentification, puis masquées dans les réponses de l’API. Les jetons des passerelles de paiement utilisent un chiffrement authentifié avec des données associées liées à la ligne. Ces contrôles étayent des affirmations précises sur la protection des identifiants, et non une affirmation générale sur chaque octet stocké.',
      },
      {
        id: 'boundaries',
        title: 'Des frontières explicites entre services et entre données',
        body: 'ClawAI sépare la responsabilité des services et empêche un service d’accéder directement à la base de données d’un autre. Les requêtes franchissent des frontières HTTP authentifiées ou des événements RabbitMQ, tandis que la validation, l’autorisation, les limites de débit, les en-têtes de sécurité et les journaux d’audit s’appliquent à des niveaux définis. La configuration du déploiement reste une part du périmètre de sécurité.',
      },
      {
        id: 'retention',
        title: 'La conservation diffère selon le type de donnée',
        body: 'Les fichiers expirent par défaut au bout de trente jours, sauf si un opérateur configure une conservation indéfinie. Les journaux client et serveur utilisent des index d’expiration de trente jours dans la base de données, alors que les journaux d’audit et les registres d’usage n’ont aucune expiration automatique dans leurs schémas actuels. Les personnes peuvent supprimer des conversations, des souvenirs, des paquets de contexte et des fichiers ; la suppression du compte n’est pas actuellement en libre-service.',
      },
      {
        id: 'processing',
        title: 'Le traitement chez le fournisseur est un choix de déploiement',
        body: 'Les prompts et les pièces jointes envoyés à un modèle cloud sont traités par le fournisseur configuré selon ses propres conditions. Le routage uniquement local peut garder l’exécution des modèles sur des chemins Ollama locaux, mais d’autres services activés peuvent tout de même faire intervenir des sous-traitants externes. Les certifications, la résidence des données, la conformité réglementaire et les garanties universelles d’effacement exigent des preuves distinctes et ne sont pas revendiquées ici.',
      },
    ],
    evidence:
      'Les déclarations de sécurité décrivent des contrôles présents dans le dépôt. Elles ne constituent ni une certification, ni un rapport de test d’intrusion, ni un accord de traitement des données, ni une garantie sur la configuration finale d’un opérateur.',
  },
  /* Owner legal review pending (2026-11-23) */
  privacy: {
    eyebrow: 'Avis de confidentialité',
    sections: [
      {
        id: 'data',
        title: 'Données traitées par l’application',
        body: 'ClawAI traite les informations de compte, les conversations, les prompts, les réponses générées, les informations sur le modèle choisi, les fichiers importés, les souvenirs, les paquets de contexte, les relevés d’usage, les événements d’audit, les messages d’assistance et les références de facturation nécessaires à la fourniture du service. Les connecteurs d’espace de travail peuvent traiter des contenus et des identifiants issus de services qu’un utilisateur autorisé choisit de connecter.',
      },
      {
        id: 'use',
        title: 'Comment les données soutiennent le fonctionnement du produit',
        body: 'L’application utilise ces données pour authentifier les utilisateurs, exécuter les actions d’IA et d’espace de travail demandées, conserver le contexte, appliquer l’accès et les quotas configurés, diagnostiquer les défaillances, sécuriser la plateforme, traiter le paiement hébergé et répondre aux demandes d’assistance. Les fournisseurs externes ne reçoivent que les informations nécessaires à l’opération configurée, sous réserve de leurs propres conditions.',
      },
      {
        id: 'storage',
        title: 'Contrôles de stockage, de conservation et de suppression',
        body: 'Les jetons d’authentification sont actuellement stockés dans le stockage local du navigateur, avec des préférences comme le thème et la langue ; une adresse e-mail mémorisée en option peut aussi s’y trouver. Les fichiers et les journaux opérationnels suivent les valeurs par défaut du dépôt décrites sur la page de sécurité. Les utilisateurs peuvent supprimer plusieurs types de contenu, mais la suppression complète du compte exige actuellement de contacter l’opérateur.',
      },
      {
        id: 'choices',
        title: 'Choix et questions',
        body: 'Les utilisateurs peuvent éviter les connecteurs facultatifs, supprimer des conversations, des fichiers, des souvenirs et des paquets de contexte, vider le stockage local du navigateur et choisir le routage de modèles locaux lorsque le déploiement le propose. Les demandes concernant un compte, les pratiques de l’opérateur, l’accès, la rectification ou la suppression doivent être envoyées via la page de contact afin que l’opérateur responsable puisse les vérifier et y répondre.',
      },
    ],
    evidence:
      'Cet avis n’affirme volontairement pas que les données ne sont jamais vendues, jamais utilisées pour l’entraînement ou toujours supprimées selon un calendrier universel, car ces engagements opérationnels et ceux des fournisseurs ne sont pas établis par le seul code du dépôt.',
  },
  /* Owner legal review pending (2026-11-23) */
  terms: {
    eyebrow: 'Conditions d’utilisation',
    sections: [
      {
        id: 'service',
        title: 'Utilisation du service',
        body: 'Les présentes conditions régissent l’accès à l’application ClawAI et à ses fonctionnalités hébergées ou autogérées. Les utilisateurs doivent fournir des informations de compte exactes, protéger leurs identifiants, respecter la loi applicable et n’utiliser que des données, systèmes et intégrations auxquels ils sont autorisés à accéder. Des conditions commerciales supplémentaires peuvent s’appliquer à un déploiement privé défini séparément.',
      },
      {
        id: 'availability',
        title: 'Modèles, intégrations et contenus générés',
        body: 'La disponibilité des modèles et des fournisseurs peut changer selon la configuration, les identifiants, les services en amont, l’état du cycle de vie et la politique de l’administrateur. Un contenu généré peut être incomplet, inexact, dangereux ou inadapté à un usage particulier et doit être vérifié avant tout usage lourd de conséquences. ClawAI ne remplace pas le jugement d’un professionnel du droit, de la médecine, de la finance ou de la sécurité.',
      },
      {
        id: 'billing',
        title: 'Forfaits et paiement',
        body: 'Les abonnements payants appliquent le prix actif et la périodicité de facturation affichés lors du paiement hébergé au prix fixé côté serveur. Les valeurs de base du catalogue sur le site marketing peuvent différer du déploiement actuel d’un administrateur. La disponibilité de la passerelle, la devise de règlement, les taxes, le délai de résiliation, les remboursements et les autres droits liés au paiement relèvent des informations du paiement et de la loi applicable.',
      },
      {
        id: 'changes',
        title: 'Modifications, suspension et contact',
        body: 'L’opérateur peut modifier les fonctionnalités, les limites, les intégrations ou les présentes conditions pour maintenir, sécuriser ou améliorer le service. L’accès peut être restreint en cas de risque pour la sécurité, de défaut de paiement, de conduite illicite ou de manquement grave. Les conditions mises à jour doivent porter une nouvelle date d’entrée en vigueur, et les questions ou litiges doivent être soumis à examen via la page de contact.',
      },
    ],
    evidence:
      'Ces conditions du produit sont une base factuelle de lancement et non un conseil juridique propre à une juridiction. L’opérateur responsable devrait consulter un conseil avant de s’y fier pour un service commercial en production.',
  },
  /* Owner legal review pending (2026-11-23) */
  cookies: {
    eyebrow: 'Cookies et stockage du navigateur',
    sections: [
      {
        id: 'cookie',
        title: 'Le cookie marqueur d’authentification',
        body: 'Après la connexion, le frontend dépose un court cookie marqueur qui indique au middleware de routage qu’une session authentifiée peut exister. Le marqueur n’est pas l’identifiant d’accès, il est lisible par le client et utilise SameSite Lax. Les jetons d’accès et de renouvellement sont actuellement stockés séparément dans le stockage local du navigateur, et non dans un cookie d’authentification HttpOnly.',
      },
      {
        id: 'local-storage',
        title: 'Stockage local utilisé par l’interface',
        body: 'Le navigateur peut stocker l’état d’authentification, le thème, la langue, les préférences d’affichage des modèles, des informations transitoires du champ de saisie et une adresse e-mail uniquement lorsque l’utilisateur choisit l’option de mémorisation de l’e-mail. Effacer les données du site supprime ces valeurs locales et peut déconnecter l’utilisateur ou réinitialiser les préférences, sans supprimer le contenu du compte côté serveur.',
      },
      {
        id: 'advertising',
        title: 'Technologie publicitaire facultative',
        body: 'La mise en page marketing contient une intégration Google AdSense activable par configuration. Le dépôt actuel ne fournit pas de plateforme complète de gestion du consentement ; les opérateurs ne doivent donc pas activer le stockage publicitaire facultatif là où le consentement est légalement requis, tant qu’ils n’ont pas mis en œuvre et vérifié un parcours de consentement et une politique régionale appropriés.',
      },
      {
        id: 'control',
        title: 'Contrôles du navigateur et mises à jour',
        body: 'Les utilisateurs peuvent consulter, bloquer ou effacer les cookies et le stockage local depuis leur navigateur, même si bloquer le stockage nécessaire peut empêcher l’authentification ou la conservation des préférences. Les opérateurs doivent mettre à jour cet avis lorsque les clés de stockage, l’analyse d’audience, la publicité, le paiement ou les services intégrés changent, et aligner la date d’entrée en vigueur sur le comportement déployé.',
      },
    ],
    evidence:
      'Cet avis décrit le stockage visible aujourd’hui dans le dépôt. Un opérateur qui déploie reste responsable de l’audit des scripts, proxys, outils d’analyse et comportements de passerelle supplémentaires ajoutés par la configuration.',
  },
  /* Owner legal review pending (2026-11-23) */
  'acceptable-use': {
    eyebrow: 'Utilisation acceptable',
    sections: [
      {
        id: 'authorised',
        title: 'N’utilisez que les systèmes et les données que vous êtes autorisé à utiliser',
        body: 'N’utilisez pas ClawAI pour accéder à des comptes, dépôts, fichiers, réseaux, appareils ou services tiers sans autorisation claire. Les actions d’espace de travail et les capacités de l’agent doivent rester dans les limites de l’autorité accordée par le propriétaire concerné. Ne contournez pas les approbations, les contrôles d’accès, les limites de débit, les garde-fous de sécurité ni la politique de l’administrateur.',
      },
      {
        id: 'harm',
        title: 'Ne facilitez ni le préjudice ni les conduites illicites',
        body: 'N’utilisez pas le service pour créer ou diffuser des logiciels malveillants, du vol d’identifiants, des instructions destructrices, du harcèlement ciblé, de l’exploitation sexuelle, de la surveillance illicite, de l’usurpation trompeuse d’identité ou des contenus qui enfreignent la loi applicable ou les droits d’autrui. Les décisions à fort impact exigent une relecture par des personnes qualifiées et des garde-fous appropriés.',
      },
      {
        id: 'platform',
        title: 'Protégez la fiabilité et l’intégrité du service',
        body: 'Ne sondez pas, ne surchargez pas, ne moissonnez pas, ne désassemblez pas et ne perturbez pas un déploiement, sauf dans le cadre d’un accord de test de sécurité autorisé. N’automatisez pas la création de comptes, ne contournez pas les quotas, ne dissimulez pas une origine abusive, ne manipulez pas la facturation et n’utilisez pas de contenu généré pour falsifier sa provenance. Signalez les vulnérabilités présumées par la voie de contact.',
      },
      {
        id: 'enforcement',
        title: 'Examen et application',
        body: 'L’opérateur peut enquêter sur des signalements crédibles, conserver les éléments d’audit pertinents, limiter une fonctionnalité, suspendre un compte ou bloquer l’accès lorsque cela est raisonnablement nécessaire pour protéger les utilisateurs, les fournisseurs, l’infrastructure ou les obligations légales. Le contexte, l’intention, la gravité, la récidive et les mesures correctives disponibles doivent éclairer toute décision d’application.',
      },
    ],
    evidence:
      'Les contrôles d’utilisation acceptable complètent l’autorisation technique et les politiques des fournisseurs ; ils ne les remplacent pas. Les déploiements privés doivent adapter les procédures d’application et de signalement à leur organisation et à leur juridiction.',
  },
};
