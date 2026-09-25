import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesFlagshipDictionary } from '@/types/features-cluster.types';

export const FR_FEATURES_FLAGSHIP_CONTENT: FeaturesFlagshipDictionary = {
  capabilitiesIntro:
    'Les sections ci-dessus sont la version courte. Chaque fonctionnalité ci-dessous a sa propre page complète : ce qu’elle fait réellement, comment elle est débloquée ou décomptée, et les limites qui s’appliquent, vérifiées sur le produit livré.',
  cardSummaries: {
    [FeatureCapability.MULTIMODAL_AI]:
      'Notes vocales et vidéo, un assistant qui décrit les images aux modèles qui ne voient pas, et un routage qui choisit un modèle capable de traiter la pièce jointe.',
    [FeatureCapability.FILES_FROM_CHAT]:
      'Demandez un PDF, un tableur ou une présentation en langage courant et recevez un vrai fichier, nommé par le modèle qui l’a rédigé.',
    [FeatureCapability.SMART_ATTACHMENTS]:
      'Déposez des documents, du code, des médias ou des archives entières dans le chat ; chaque envoi est analysé par un antivirus et son texte extrait pour le modèle.',
    [FeatureCapability.NARRATED_RESEARCH]:
      'Une boucle de recherche qui décide s’il faut chercher ou explorer un site, raconte chaque étape en direct et respecte robots.txt à chaque récupération.',
    [FeatureCapability.ORCHESTRATION_LABS]:
      'Des laboratoires dédiés qui mettent plusieurs modèles sur un même problème — comparaison avec juge, consensus, escalade, vérification et plus encore.',
    [FeatureCapability.CONVERSATION_TOOLS]:
      'Créez une branche, modifiez et relancez un message, cherchez dans vos fils, exportez une réponse et laissez un fil s’appuyer sur un autre.',
    [FeatureCapability.READ_ALOUD]:
      'Écoutez n’importe quelle réponse au lieu de la lire, avec une lecture qui démarre dès que la première courte partie est prête.',
    [FeatureCapability.IMAGE_GENERATION]:
      'Générez et modifiez des images dans la conversation, avec plusieurs fournisseurs d’images et un basculement automatique de l’un à l’autre.',
    [FeatureCapability.RELIABILITY]:
      'Basculement automatique vers un autre modèle, un disjoncteur partagé pour les fournisseurs à court de crédit, et des flux qui survivent à une reconnexion.',
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]:
      'Une dotation mensuelle de crédit incluse dans votre forfait, plus des recharges qui n’expirent jamais, réservées avant chaque appel et affichées dans votre devise.',
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]:
      'Des rôles que vous pouvez remodeler, la gestion des utilisateurs et des forfaits, et un journal d’audit filtrable pour qui administre ClawAI au sein d’une organisation.',
  },
  capabilities: {
    [FeatureCapability.MULTIMODAL_AI]: {
      seo: {
        title: 'IA multimodale dans ClawAI : voix, vidéo et vision',
        description:
          'Comment ClawAI traite les notes vocales, les notes vidéo et les images : transcription, images extraites des vidéos, un assistant de vision pour les modèles texte seul, et un routage selon le type de pièce jointe.',
        keywords: ['notes vocales IA', 'compréhension vidéo par IA', 'routage IA multimodal'],
      },
      eyebrow: 'Fonctionnalité',
      title: 'IA multimodale : voix, vidéo et vision',
      summary:
        'Vous pouvez parler à ClawAI, lui montrer une vidéo ou lui confier une image : le message parvient toujours à un modèle capable de le comprendre. Enregistrement, transcription, échantillonnage d’images et assistant de vision font partie intégrante du chat livré, pas d’une application à part.',
      sections: [
        {
          id: 'voice-and-video-notes',
          heading: 'Notes vocales et vidéo depuis la zone de saisie',
          paragraphs: [
            'La zone de saisie dispose d’un bouton d’enregistrement pour les notes vocales et vidéo. Il demande d’abord l’autorisation, affiche une forme d’onde en direct pendant l’enregistrement et limite chaque enregistrement à cinq minutes. L’enregistrement est transcrit — Gemini est essayé en premier, OpenAI Whisper sert de solution de repli — et le modèle qui répond est informé que le message est arrivé sous forme de note vocale, afin qu’il réponde à ce que vous avez dit plutôt qu’à un fichier.',
            'Les fichiers audio que vous avez déjà fonctionnent de la même manière : les envois WebM, OGG, MP3, MP4 et M4A, WAV, FLAC et AAC sont transcrits avant d’atteindre le modèle.',
          ],
        },
        {
          id: 'video-understanding',
          heading: 'Des vidéos que le modèle peut vraiment suivre',
          paragraphs: [
            'Une vidéo envoyée est transcrite avec horodatage, et jusqu’à six images par vidéo sont échantillonnées et montrées au modèle avec la transcription, pour qu’il puisse répondre à des questions sur ce qui se passe à l’écran autant que sur ce qui est dit. Une vidéo muette est signalée comme ne contenant aucune parole au lieu de produire une transcription vide, et vous pouvez interrompre à tout moment le traitement d’une longue vidéo.',
            'Chaque forfait dispose d’une durée de vidéo autorisée fixée par l’opérateur ; quel que soit le forfait, une vidéo ne peut jamais dépasser trente minutes ni la résolution 4K. Les conteneurs pris en charge sont MP4, MOV, WebM, AVI et MPEG.',
          ],
        },
        {
          id: 'vision-helper-and-modality-routing',
          heading: 'Un assistant de vision, et un routage selon la pièce jointe',
          paragraphs: [
            'Tous les modèles ne voient pas. Lorsque le modèle qui répond est limité au texte, un second modèle peut lui décrire jusqu’à quatre images, y compris le texte qu’elles contiennent, et le modèle qui répond sait qu’il travaille à partir d’une description. Dans les conversations en mode Local uniquement et Confidentialité d’abord, seuls des assistants locaux servis via Ollama ou llama.cpp sont utilisés.',
            'En mode Auto, le routeur classe aussi les modèles candidats selon leur capacité à traiter le type de pièce jointe du message, si bien qu’une image, un PDF ou une vidéo aboutit en général chez un modèle qui l’accepte nativement plutôt que de dépendre de l’assistant.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quelle peut être la durée d’une note vocale ou vidéo ?',
          answer:
            'Un enregistrement réalisé dans la zone de saisie peut durer jusqu’à cinq minutes. Les vidéos envoyées sont limitées par la durée autorisée de votre forfait, et jamais au-delà de trente minutes ou de la résolution 4K, quel que soit le forfait.',
        },
        {
          question:
            'Que se passe-t-il si j’envoie une image à un modèle qui ne voit pas les images ?',
          answer:
            'Si l’assistant de vision est activé sur votre forfait, un modèle doté de vision décrit l’image et transcrit son texte, et le modèle qui répond travaille à partir de cette description, en sachant qu’il s’agit d’une description et non de l’image elle-même.',
        },
        {
          question: 'ClawAI choisit-il un autre modèle à cause de ma pièce jointe ?',
          answer:
            'En mode Auto, oui : le routeur classe les candidats selon leur capacité à traiter le type de pièce jointe. Si vous fixez vous-même un modèle, votre choix est respecté et l’assistant de vision comble le manque là où il est activé.',
        },
      ],
      productNote:
        'Les notes vocales et vidéo, la transcription et le routage sensible à la modalité sont livrés ; l’assistant de vision est une fonctionnalité de forfait que l’opérateur active en lui attribuant un modèle assistant.',
    },
    [FeatureCapability.FILES_FROM_CHAT]: {
      seo: {
        title: 'Fichiers depuis le chat : PDF, DOCX, XLSX, PPTX et ZIP',
        description:
          'Demandez à ClawAI un document, un tableur, une présentation ou une archive en langage courant et téléchargez un vrai fichier dans l’un de dix formats, nommé et résumé par le modèle.',
        keywords: [
          'générer un PDF avec l’IA',
          'créer un tableur avec l’IA',
          'générateur PowerPoint IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Des fichiers depuis le chat',
      summary:
        'Dites « fais-en un PDF » ou « mets ça dans un tableur » et ClawAI vous remet un fichier, pas un bloc de texte à copier. Le modèle rédige le contenu, un adaptateur de format construit le fichier, et le résultat vous attend dans la conversation, prêt à être téléchargé.',
      sections: [
        {
          id: 'ten-formats-from-plain-language',
          heading: 'Dix formats de fichier à partir d’une demande en langage courant',
          paragraphs: [
            'Une demande comme « crée un PDF de ce plan » ou « exporte le tableau en CSV » est reconnue et transmise à la génération de fichiers. Les formats pris en charge sont PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, texte brut, CSV et JSON — chacun construit par son propre adaptateur, de sorte qu’un tableur a de vraies cellules et une présentation de vraies diapositives plutôt qu’une seule longue page.',
          ],
        },
        {
          id: 'named-by-the-model',
          heading: 'Nommé et résumé par le modèle qui l’a rédigé',
          paragraphs: [
            'Au lieu de « document (3).pdf », le modèle donne à chaque fichier un titre descriptif de 120 caractères au maximum et un résumé d’une phrase, qui apparaissent sur la carte du fichier dans le chat. Les titres en arabe, en chinois, en hindi ou dans toute autre écriture sont conservés tels quels plutôt que translittérés.',
            'Par ailleurs, n’importe quelle réponse peut être exportée en un clic en Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX ou ZIP. Ces exports convertissent une réponse que vous avez déjà ; ils ne sont donc jamais décomptés de votre quota quotidien de fichiers.',
          ],
        },
        {
          id: 'downloads-and-allowances',
          heading: 'Des téléchargements privés, et un quota quotidien sur chaque forfait',
          paragraphs: [
            'Seule la personne qui a créé un fichier peut le télécharger, via un lien authentifié. Le téléchargement reste disponible pendant une heure ; ensuite, vous pouvez reconstruire gratuitement le même fichier, ou demander au modèle de le régénérer avec un contenu neuf.',
            'Chaque forfait, y compris le forfait gratuit, dispose d’un quota quotidien de fichiers rédigés par l’IA fixé par l’opérateur, et les niveaux supérieurs l’augmentent ou suppriment le plafond. Votre quota d’utilisation habituel s’applique aussi à la rédaction elle-même, et c’est la première limite atteinte qui s’applique.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quels formats de fichier ClawAI peut-il créer ?',
          answer:
            'Dix : PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, texte brut, CSV et JSON. L’export de réponse en couvre huit — Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX et ZIP.',
        },
        {
          question: 'Pourquoi mon lien de téléchargement ne fonctionne-t-il plus ?',
          answer:
            'Les fichiers générés restent téléchargeables pendant une heure. Ensuite, ouvrez la carte du fichier et reconstruisez-le — même contenu, sans frais — ou demandez au modèle de le régénérer si vous voulez qu’il soit réécrit.',
        },
        {
          question: 'Le nombre de fichiers que je peux générer est-il limité ?',
          answer:
            'Oui, par un quota quotidien par forfait que fixe l’opérateur, et il est disponible aussi sur le forfait gratuit. Exporter une réponse que vous avez déjà n’est pas décompté.',
        },
      ],
      productNote:
        'La génération de fichiers est un service à part entière, avec un adaptateur par format et sa propre surface de décompte (FILE_GENERATION), distincte de l’utilisation ordinaire du chat.',
    },
    [FeatureCapability.SMART_ATTACHMENTS]: {
      seo: {
        title: 'Pièces jointes intelligentes : archives, médias et antivirus',
        description:
          'Ce qui se passe quand vous joignez un fichier dans ClawAI : cinquante types pris en charge, des archives dépliées en arborescence lisible, des envois reprenables et une analyse antivirus qui refuse en cas de doute.',
        keywords: ['pièces jointes chat IA', 'envoyer un zip à l’IA', 'lecteur d’archives IA'],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Pièces jointes intelligentes',
      summary:
        'Une pièce jointe n’est utile que si le modèle peut la lire. ClawAI extrait le texte des documents et des archives avant qu’un modèle ne les voie, analyse chaque envoi à la recherche de logiciels malveillants, et vous permet de déposer des fichiers n’importe où dans le chat plutôt que de chercher un bouton.',
      sections: [
        {
          id: 'what-you-can-attach',
          heading: 'Ce que vous pouvez joindre, et en quelle quantité',
          paragraphs: [
            'Des documents (PDF, DOCX, XLSX, PPTX, RTF), une quarantaine de formats de texte et de code, des images (PNG, JPEG, WebP, GIF, SVG), de l’audio, de la vidéo et des archives (ZIP, 7z, RAR, TAR, GZ, BZ2, XZ). Chaque fichier peut peser jusqu’à 50 Mo et un message peut en contenir jusqu’à dix. Les fichiers de plus de 4 Mo sont envoyés par morceaux reprenables, si bien qu’une connexion coupée ne vous oblige pas à tout recommencer.',
            'Vous pouvez déposer des fichiers n’importe où dans le panneau de chat — sur les messages ou sur la zone de saisie — et chaque pièce jointe affiche une pastille d’état pendant l’envoi, avec un bouton d’annulation si vous changez d’avis.',
          ],
        },
        {
          id: 'text-extraction-and-archives',
          heading: 'Extraction du texte, et des archives dans lesquelles le modèle peut naviguer',
          paragraphs: [
            'Le texte lisible des fichiers PDF, Office et RTF est extrait et remis au modèle, qui répond donc à partir du document lui-même et non d’un texte de substitution. Une archive est dépliée en une arborescence de fichiers accompagnée du texte de chaque élément : vous pouvez joindre un projet zippé et poser une question sur un fichier précis qu’il contient.',
            'Les archives sont vérifiées avant d’être décompressées : des limites sur la taille totale décompressée, le nombre d’entrées et la profondeur d’imbrication empêchent une bombe de décompression d’atteindre l’extracteur.',
          ],
        },
        {
          id: 'scanning-and-retention',
          heading: 'Une analyse antivirus qui refuse en cas de doute, et la conservation',
          paragraphs: [
            'Chaque envoi est analysé par ClamAV avant d’être stocké. Si l’analyseur est indisponible, l’envoi est refusé plutôt qu’accepté sans analyse. Les envois sont supprimés automatiquement à l’issue de la durée de conservation configurée par l’opérateur, et vous pouvez supprimer vous-même un fichier à tout moment.',
          ],
        },
      ],
      faq: [
        {
          question: 'Puis-je envoyer tout un projet sous forme de fichier ZIP ?',
          answer:
            'Oui. Les archives ZIP, 7z, RAR, TAR, GZ, BZ2 et XZ sont dépliées en une arborescence avec le texte de chaque élément, pour que le modèle puisse retrouver et citer un fichier précis de l’archive.',
        },
        {
          question: 'Quelle est la taille maximale d’une pièce jointe ?',
          answer:
            '50 Mo par fichier et jusqu’à dix pièces jointes par message. Les fichiers de plus de 4 Mo sont envoyés par morceaux reprenables : une connexion interrompue reprend au lieu de tout recommencer.',
        },
        {
          question: 'Que se passe-t-il si l’antivirus est hors service ?',
          answer:
            'L’envoi est refusé. ClawAI ne stocke jamais un fichier non analysé en guise de solution de repli — vous voyez une erreur et pouvez réessayer une fois l’analyse rétablie.',
        },
      ],
      productNote:
        'La gestion des pièces jointes se trouve dans le service de fichiers : extraction, manifestes d’archives, envois par morceaux et analyse ClamAV sont tous actifs par défaut, et non des options supplémentaires.',
    },
    [FeatureCapability.NARRATED_RESEARCH]: {
      seo: {
        title: 'Recherche commentée et exploration web dans ClawAI',
        description:
          'Comment ClawAI fait ses recherches sur le web : un planificateur qui choisit de chercher ou d’explorer, un journal de travail commenté en direct, une récupération par paliers qui respecte robots.txt, et des sources citées.',
        keywords: [
          'recherche web par IA',
          'robot d’exploration de sites IA',
          'recherche IA avec sources',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Recherche commentée et exploration web',
      summary:
        'Quand une question exige le web en direct, ClawAI ne devine pas. Un planificateur décide s’il faut répondre directement, chercher, explorer un site ou les deux, commente chaque étape pendant qu’il travaille, et renvoie la réponse avec les sources qu’il a réellement lues.',
      sections: [
        {
          id: 'a-planner-not-a-keyword',
          heading: 'C’est un planificateur qui décide, pas un mot-clé',
          paragraphs: [
            'En mode de recherche Auto, un modèle de planification lit le message et choisit l’une de quatre voies : répondre à partir de ce qu’il sait déjà, chercher sur le web, explorer un site précis, ou explorer puis chercher. Un lien que vous collez est toujours ouvert. Si le modèle de planification renvoie un résultat inexploitable, le modèle suivant est essayé plutôt que de laisser la recherche s’arrêter en silence.',
            'Vous pouvez aussi choisir le mode vous-même dans la zone de saisie : désactivé, Auto, recherche seule, recherche avec récupération des pages, ou recherche avec extraction de contenu structuré.',
          ],
        },
        {
          id: 'a-narrated-work-log',
          heading: 'Un journal de travail que vous pouvez suivre',
          paragraphs: [
            'Chaque étape — le plan, chaque recherche, chaque page récupérée ou ignorée — est diffusée en direct dans un journal commenté au-dessus de la réponse, puis enregistrée avec la réponse pour être toujours là après un rafraîchissement. Les sources utilisées par la réponse sont listées avec elle, pour que vous puissiez les ouvrir et les vérifier vous-même.',
          ],
        },
        {
          id: 'tiered-and-polite-fetching',
          heading: 'Une récupération par paliers qui respecte les règles',
          paragraphs: [
            'Les pages sont récupérées de la méthode la moins coûteuse à la plus coûteuse : l’API officielle du site quand elle existe, puis une simple requête HTTP, puis un navigateur sans interface uniquement si la page l’exige, avec un service de lecture et des instantanés d’archives comme solutions de repli ultérieures. Une exploration peut couvrir jusqu’à deux cents pages d’un même site.',
            'robots.txt est respecté à chaque récupération sous l’agent utilisateur ClawAI-ResearchBot, et une page interdite n’est pas retentée par un autre moyen. Les murs de connexion et les blocages juridiques arrêtent la récupération, les captchas ne sont jamais résolus, chaque redirection est vérifiée contre les adresses de réseau privé, et une copie archivée est toujours signalée comme telle.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI respecte-t-il robots.txt ?',
          answer:
            'Oui, à chaque récupération, sous l’agent utilisateur ClawAI-ResearchBot. Une page interdite par robots.txt est ignorée et n’est pas retentée par une autre méthode de récupération.',
        },
        {
          question: 'Puis-je voir ce que la recherche a réellement fait ?',
          answer:
            'Oui. Un journal de travail commenté montre le plan, chaque recherche et chaque page récupérée ou ignorée, et il est enregistré avec la réponse, accompagné de la liste des sources utilisées.',
        },
        {
          question: 'La recherche web est-elle disponible sur tous les forfaits ?',
          answer:
            'Les modes de recherche sont des fonctionnalités de forfait (RESEARCH_MODE, WEB_SEARCH, WEB_FETCH et WEB_EXTRACT) avec leurs propres quotas, que l’opérateur fixe pour chaque forfait. La page des tarifs indique ce que comprend chaque forfait.',
        },
      ],
      productNote:
        'La boucle de recherche s’exécute dans son propre service de recherche, avec des paliers de récupération modifiables par l’administrateur, et elle est décomptée sur ses propres surfaces plutôt qu’en jetons de chat ordinaires.',
    },
    [FeatureCapability.ORCHESTRATION_LABS]: {
      seo: {
        title: 'Laboratoires d’orchestration : comparer, juger, consensus, escalade',
        description:
          'Les laboratoires ClawAI qui mettent plusieurs modèles sur un même prompt — Compare avec Judge et Critic, Consensus, Escalation, Best-of-N, Verify, Repair, Pipelines et d’autres encore.',
        keywords: ['comparer des modèles d’IA côte à côte', 'réponse IA par consensus', 'LLM juge'],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Laboratoires d’orchestration',
      summary:
        'Certaines questions méritent plus d’un modèle. Les laboratoires sont des espaces de travail dédiés, chacun avec sa propre page et sa propre vue des résultats, pour faire travailler plusieurs modèles sur un même problème et voir précisément en quoi ils diffèrent.',
      sections: [
        {
          id: 'compare-judge-and-critic',
          heading: 'Compare, avec un juge et un critique',
          paragraphs: [
            'Compare envoie un même prompt à plusieurs modèles et affiche leurs réponses côte à côte, avec la latence et le nombre de jetons. Activez Judge et un modèle indépendant note chaque réponse selon des critères explicites ; activez Critic et il consigne les faiblesses de chacune. Compare fonctionne aussi à l’intérieur d’un fil ordinaire, pour vérifier une réponse sans quitter la conversation.',
          ],
        },
        {
          id: 'consensus-and-escalation',
          heading: 'Consensus et escalade',
          paragraphs: [
            'Consensus pose la même question à deux à cinq modèles et synthétise une réponse unique à partir de leurs points d’accord, en signalant leurs désaccords. Escalation commence par un modèle peu coûteux et ne remonte la chaîne que si la réponse est insuffisante : vous ne payez un modèle puissant que lorsque la question l’exige vraiment.',
          ],
        },
        {
          id: 'the-other-labs',
          heading: 'Vérification, réparation et le reste de l’atelier',
          paragraphs: [
            'Best-of-N génère plusieurs candidats et garde le meilleur. Verify fait vérifier l’exactitude d’une réponse par un second modèle. Repair corrige un défaut précis d’une réponse existante au lieu de la régénérer. Decompose découpe une tâche volumineuse en étapes. Les Role packs font passer un problème entre des modèles spécialisés par rôle, Cost ensemble arbitre entre qualité et dépense, et Pipelines enchaîne plusieurs étapes en un flux de travail nommé et réexécutable.',
            'Chaque laboratoire est activé par forfait par l’opérateur, et les exécutions des laboratoires sont décomptées séparément du chat ordinaire — Compare, Judge et Critic sur leurs propres surfaces, les autres laboratoires sur la surface d’orchestration.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quelle est la différence entre Compare et Consensus ?',
          answer:
            'Compare affiche la réponse de chaque modèle côte à côte et vous laisse trancher, éventuellement avec une note de Judge. Consensus fusionne les réponses en une seule et signale les points sur lesquels les modèles divergent.',
        },
        {
          question: 'Comment l’escalade permet-elle d’économiser ?',
          answer:
            'Elle commence par un modèle moins cher et ne passe à un modèle plus puissant que si la réponse n’atteint pas le niveau requis ; les questions simples ne paient donc jamais le modèle le plus coûteux.',
        },
        {
          question: 'Les laboratoires sont-ils inclus dans tous les forfaits ?',
          answer:
            'Chaque laboratoire est activé par forfait par l’opérateur ; leur disponibilité dépend donc de votre forfait. La page des tarifs indique ce que comprend chaque forfait.',
        },
      ],
      productNote:
        'Compare, Consensus, Escalation, Repair, Decompose, Best-of-N, Verify, Pipeline, Cost ensemble et Role pack sont chacun livrés avec leur propre page, leur propre point d’accès et leur propre carte de résultat.',
    },
    [FeatureCapability.CONVERSATION_TOOLS]: {
      seo: {
        title: 'Outils avancés de conversation : brancher, modifier, chercher, exporter',
        description:
          'Les outils ClawAI pour travailler une conversation plutôt que simplement la lire : branches, modification et relance, recherche dans le fil, recherche entre fils, export et liens de partage.',
        keywords: [
          'créer une branche de conversation IA',
          'modifier et relancer un prompt',
          'exporter un chat IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Outils avancés de conversation',
      summary:
        'Une longue conversation est un document de travail. ClawAI vous donne les outils pour la dupliquer, la corriger, y chercher, la réutiliser dans un autre fil et la transmettre à quelqu’un d’autre, sans copier-coller.',
      sections: [
        {
          id: 'branch-edit-and-rerun',
          heading: 'Brancher, modifier et relancer',
          paragraphs: [
            'Créez une branche de la conversation à partir de n’importe quel message pour explorer une autre direction tout en gardant l’original intact. Modifiez l’un de vos messages précédents et relancez-le, ou régénérez une réponse qui ne vous convient pas, et le fil reprend à partir de la nouvelle version.',
          ],
        },
        {
          id: 'find-search-and-cross-thread-context',
          heading: 'Trouver, chercher, et le contexte d’autres fils',
          paragraphs: [
            'Cherchez dans le fil en cours, ou dans tous vos fils par titre et par texte des messages. Le contexte entre fils permet à une conversation de s’appuyer sur vos propres fils antérieurs pertinents — trois au maximum, et toujours les vôtres uniquement. Il est activé par défaut, peut être désactivé fil par fil, et l’inspecteur de contexte montre quels fils ont été utilisés.',
          ],
        },
        {
          id: 'export-pin-and-share',
          heading: 'Exporter, épingler et partager',
          paragraphs: [
            'Exportez un fil entier en Markdown, ou une seule réponse en Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX ou ZIP. Épinglez les fils auxquels vous revenez. Partagez une conversation via un lien public que vous pouvez renouveler vers une nouvelle URL ou révoquer à tout moment.',
          ],
        },
      ],
      faq: [
        {
          question: 'Créer une branche modifie-t-il la conversation d’origine ?',
          answer:
            'Non. Une branche est un nouveau fil qui part du message choisi ; la conversation d’origine reste exactement telle qu’elle était.',
        },
        {
          question:
            'La conversation d’une autre personne peut-elle se retrouver dans la mienne via le contexte entre fils ?',
          answer:
            'Non. Le contexte entre fils ne lit que vos propres fils, trois au maximum, et vous pouvez le désactiver pour n’importe quel fil dans ses paramètres.',
        },
        {
          question: 'Puis-je arrêter de partager une conversation après avoir envoyé le lien ?',
          answer:
            'Oui. Vous pouvez révoquer un lien partagé à tout moment, ou le renouveler vers une nouvelle URL pour que l’ancien cesse de fonctionner.',
        },
      ],
      productNote:
        'Branches, modification et relance, régénération, recherche dans le fil et entre fils, export, épinglage, partage et contexte entre fils sont tous livrés dans l’espace de travail du chat.',
    },
    [FeatureCapability.READ_ALOUD]: {
      seo: {
        title: 'Lecture à voix haute : écoutez les réponses de l’IA dans ClawAI',
        description:
          'Comment ClawAI lit une réponse à voix haute avec une synthèse vocale générée sur le serveur : lecture qui démarre tôt, pause et arrêt, prise en charge des longues réponses et aucun frais pour les parties échouées.',
        keywords: [
          'lecture à voix haute IA',
          'synthèse vocale des réponses IA',
          'écouter un chat IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Lecture à voix haute',
      summary:
        'Toute réponse peut être écoutée au lieu d’être lue. La voix est générée sur le serveur par un modèle de synthèse vocale, et non par la voix intégrée du navigateur, et la lecture commence avant que la réponse entière n’ait été convertie.',
      sections: [
        {
          id: 'how-playback-works',
          heading: 'Comment fonctionne la lecture',
          paragraphs: [
            'Chaque message de l’assistant dispose d’un bouton Lire à voix haute avec lecture, pause et arrêt. La réponse est convertie par parties, et la lecture démarre dès que la première courte partie est prête : vous n’attendez pas qu’une longue réponse soit entièrement traitée avant d’entendre quoi que ce soit.',
          ],
        },
        {
          id: 'long-answers-and-languages',
          heading: 'Longues réponses et autres langues',
          paragraphs: [
            'Jusqu’à 12 000 caractères d’une réponse sont lus, et vous êtes prévenu lorsqu’une réponse dépassait cette longueur et que la lecture a été écourtée. Les phrases sont correctement découpées pour les textes en alphabet latin, en arabe, en hindi, en chinois, en japonais et en coréen, afin qu’une réponse multilingue ne trébuche pas à chaque point.',
          ],
        },
        {
          id: 'voices-and-billing',
          heading: 'Voix, disponibilité et facturation',
          paragraphs: [
            'Les voix proviennent de modèles de synthèse vocale Gemini ou OpenAI, choisis par l’opérateur. La lecture à voix haute est une fonctionnalité de forfait ; si aucune voix n’a été attribuée, le bouton vous le signale au lieu d’échouer en silence. Les parties dont la génération échoue ne sont pas facturées.',
          ],
        },
      ],
      faq: [
        {
          question: 'La lecture à voix haute utilise-t-elle la voix de mon navigateur ?',
          answer:
            'Non. La voix est générée sur le serveur par un modèle de synthèse vocale Gemini ou OpenAI ; elle sonne donc de la même façon sur tous les appareils et navigateurs.',
        },
        {
          question: 'Peut-elle lire une très longue réponse ?',
          answer:
            'Elle lit jusqu’à 12 000 caractères d’une réponse et vous prévient lorsque la réponse était plus longue, pour que vous sachiez que la lecture s’est arrêtée plus tôt.',
        },
        {
          question: 'Suis-je facturé si la lecture à voix haute échoue ?',
          answer:
            'Uniquement pour les parties effectivement générées. Une partie qui échoue n’est pas facturée, et vous pouvez relancer la lecture de la réponse.',
        },
      ],
      productNote:
        'La lecture à voix haute est une fonctionnalité de forfait qui utilise un modèle de synthèse vocale côté serveur attribué par l’opérateur ; ce n’est pas le moteur vocal du navigateur.',
    },
    [FeatureCapability.IMAGE_GENERATION]: {
      seo: {
        title: 'Génération d’images par IA dans les conversations ClawAI',
        description:
          'Générez et modifiez des images depuis une conversation ClawAI avec les modèles Gemini, OpenAI, xAI ou Stable Diffusion en local, avec basculement entre fournisseurs, suivi de progression et nouvel essai intégrés.',
        keywords: [
          'générateur d’images IA',
          'modifier une image avec l’IA',
          'génération d’images Gemini',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Génération d’images',
      summary:
        'Décrivez une image dans la conversation et ClawAI la génère sur place, à côté du reste de votre travail. Plusieurs fournisseurs d’images se trouvent derrière une même requête, et si l’un échoue, le suivant est essayé automatiquement.',
      sections: [
        {
          id: 'providers-and-fallback',
          heading: 'Plusieurs fournisseurs derrière une même requête',
          paragraphs: [
            'Les demandes d’images peuvent être servies par les modèles d’images Gemini, gpt-image-1 d’OpenAI, Grok Imagine de xAI, ou des modèles Stable Diffusion locaux (SDXL-Turbo et un flux ComfyUI) exécutés sur votre propre matériel. Si le fournisseur choisi échoue, la requête passe au suivant — le cloud d’abord, puis le local — au lieu de renvoyer une erreur.',
            'Si vous choisissez vous-même un modèle d’image précis, c’est ce modèle qui est utilisé, même lorsque le prompt ne contient pas de mot-clé évident lié à l’image.',
          ],
        },
        {
          id: 'in-the-conversation',
          heading: 'Générées dans la conversation, avec suivi de progression',
          paragraphs: [
            'Les images apparaissent dans le chat, avec un panneau de progression pendant leur génération. Vous pouvez annuler une génération, ou réessayer avec un autre fournisseur si le résultat ne vous plaît pas. Il n’y a pas d’application d’images séparée vers laquelle basculer.',
          ],
        },
        {
          id: 'prompts-sizes-and-edits',
          heading: 'Prompts, tailles et retouches',
          paragraphs: [
            'Les prompts peuvent compter jusqu’à 4 000 caractères, et les images peuvent être demandées dans des tailles de 256 à 4 096 pixels. Joignez une image de référence de 25 Mo au maximum pour modifier une image existante plutôt que de partir de zéro. La génération d’images est une fonctionnalité des forfaits payants, décomptée sur sa propre surface, séparément des jetons de chat.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quels modèles génèrent les images ?',
          answer:
            'Les modèles d’images Gemini, gpt-image-1 d’OpenAI, Grok Imagine de xAI et des modèles Stable Diffusion locaux. Leur disponibilité dépend de ce que l’opérateur a configuré.',
        },
        {
          question: 'Puis-je modifier une image que j’ai déjà ?',
          answer:
            'Oui. Joignez une image de référence de 25 Mo au maximum et décrivez la modification souhaitée : le modèle la retouche au lieu de générer une image à partir de zéro.',
        },
        {
          question: 'La génération d’images est-elle disponible sur le forfait gratuit ?',
          answer:
            'La génération d’images est une fonctionnalité des forfaits payants, décomptée séparément du chat. La page des tarifs indique quels forfaits l’incluent.',
        },
      ],
      productNote:
        'La génération d’images s’exécute dans son propre service d’images, avec un basculement entre fournisseurs des modèles cloud vers les modèles locaux, et elle est décomptée sur la surface IMAGE.',
    },
    [FeatureCapability.RELIABILITY]: {
      seo: {
        title: 'Fiabilité dans ClawAI : basculement, disjoncteurs et flux reprenables',
        description:
          'Ce que fait ClawAI quand un fournisseur tombe en panne : basculement automatique vers un autre modèle, un disjoncteur partagé pour les comptes fournisseurs épuisés, et des flux qui reprennent après une reconnexion.',
        keywords: [
          'basculement de modèle IA',
          'reprise sur incident de fournisseur LLM',
          'streaming IA reprenable',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Fiabilité',
      summary:
        'Les fournisseurs tombent en panne, épuisent leur crédit et dépassent leurs délais. ClawAI est conçu pour que, lorsque cela arrive, votre conversation continue avec un autre modèle et qu’un flux interrompu reprenne là où il s’était arrêté.',
      sections: [
        {
          id: 'automatic-fallback',
          heading: 'Basculement automatique vers un autre modèle',
          paragraphs: [
            'Chaque requête routée transporte une liste de modèles candidats. Si le modèle choisi échoue en cours de requête, ClawAI passe automatiquement au candidat suivant, et la réponse indique quel modèle a réellement répondu, pas seulement celui choisi au départ.',
          ],
        },
        {
          id: 'a-shared-provider-breaker',
          heading: 'Un disjoncteur partagé pour les fournisseurs épuisés',
          paragraphs: [
            'Lorsqu’un compte fournisseur n’a plus de crédit, un disjoncteur retire ce fournisseur de la rotation pendant dix minutes, puis laisse passer un unique appel de test pour vérifier s’il est rétabli. L’état du disjoncteur est partagé dans Redis entre tous les serveurs de chat : une panne est apprise une seule fois au lieu d’être redécouverte par chaque serveur, et chaque serveur se rabat sur sa propre copie si Redis est indisponible.',
          ],
        },
        {
          id: 'stop-and-resume',
          heading: 'Un Stop qui arrête toujours, des flux qui reprennent',
          paragraphs: [
            'Appuyer sur Stop est diffusé à tous les serveurs de chat, si bien que celui qui exécute le modèle l’interrompt, quel qu’il soit. Si votre connexion tombe pendant la diffusion d’une réponse, la reconnexion rejoue depuis un tampon les événements manqués au lieu de perdre la suite de la réponse.',
          ],
        },
      ],
      faq: [
        {
          question: 'Que se passe-t-il si un modèle échoue au milieu d’une réponse ?',
          answer:
            'ClawAI bascule automatiquement vers le modèle candidat suivant, et la réponse indique quel modèle l’a réellement produite.',
        },
        {
          question: 'Contre quoi le disjoncteur de fournisseur protège-t-il ?',
          answer:
            'Contre un compte fournisseur qui n’a plus de crédit. Il est ignoré pendant dix minutes puis testé avec un seul appel, au lieu que chaque requête échoue sur lui entre-temps.',
        },
        {
          question: 'Est-ce que je perds une réponse si ma connexion tombe ?',
          answer:
            'Non. Lorsque le flux se reconnecte, les événements manqués sont rejoués depuis un tampon côté serveur et la réponse se poursuit.',
        },
      ],
      productNote:
        'Le basculement, le disjoncteur de fournisseur partagé via Redis, le Stop entre serveurs et les flux reprenables sont tous présents dans le service de chat aujourd’hui ; les opérateurs voient l’état des disjoncteurs sur la page d’administration des connecteurs.',
    },
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: {
      seo: {
        title: 'Crédit IA à l’usage et prix en devise locale',
        description:
          'Comment fonctionne le crédit à l’usage de ClawAI : une dotation mensuelle incluse dans votre forfait, des recharges qui n’expirent jamais, une dépense réservée avant chaque appel et des prix affichés dans votre devise.',
        keywords: ['IA paiement à l’usage', 'recharge de crédit IA', 'prix IA en devise locale'],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Crédit à l’usage et devise locale',
      summary:
        'Les modèles cloud coûtent de l’argent réel à chaque jeton ; ClawAI les décompte donc d’un portefeuille de crédit au lieu de cacher ce coût dans un forfait fixe. Vous voyez ce que chaque fonctionnalité a dépensé, vous ne rechargez que lorsque c’est nécessaire, et vous lisez les prix dans votre propre devise.',
      sections: [
        {
          id: 'two-kinds-of-credit',
          heading: 'Deux types de crédit, dépensés dans un ordre fixe',
          paragraphs: [
            'Le portefeuille contient deux types de crédit. La dotation mensuelle est une part du prix de votre forfait payant, remise à zéro à chaque période de facturation et non reportée ; un forfait gratuit n’en accorde aucune. Le crédit acheté provient des recharges, n’expire jamais et reste à vous en cas de passage à un forfait inférieur ou de résiliation.',
            'La dépense puise toujours d’abord dans la dotation mensuelle, puis dans le crédit acheté : une recharge n’est entamée qu’une fois la dotation de la période épuisée. Tout le monde peut acheter une recharge, y compris sur le forfait gratuit, et les formules de recharge comme les prix des forfaits proviennent d’enregistrements de prix versionnés, et non de cette page.',
          ],
        },
        {
          id: 'no-surprise-spend',
          heading: 'La dépense est réservée avant un appel, jamais après',
          paragraphs: [
            'Avant l’exécution d’un modèle cloud, le coût de la requête est réservé sur votre solde ; ensuite, la réservation est réglée au montant réel ou libérée. Vous ne pouvez pas dépenser au-delà de votre solde, et si ce qui reste ne suffit pas à couvrir une réponse utile, la requête est refusée plutôt qu’interrompue en cours de route. Un modèle sans prix publié est bloqué au lieu d’être traité comme gratuit.',
            'Le crédit couvre le chat, Compare, Judge, les laboratoires d’orchestration, la génération d’images et de fichiers, l’agent de code, les actions d’espace de travail, la transcription, l’assistant de vision et la lecture à voix haute. Les modèles locaux servis via Ollama ou llama.cpp ne sont pas décomptés, et la recherche web utilise ses propres quotas distincts.',
          ],
        },
        {
          id: 'ledger-and-local-currency',
          heading: 'Un registre par fonctionnalité, et des prix dans votre devise',
          paragraphs: [
            'Chaque mouvement est inscrit dans un registre en ajout seul, en micro-dollars entiers — sans dérive d’arrondi — et la page de facturation indique quelle fonctionnalité a dépensé chaque montant : une semaine chargée en génération d’images apparaît exactement comme telle.',
            'Les prix sont affichés dans plus de soixante devises d’affichage, détectées selon votre emplacement ou choisies manuellement, avec le montant d’origine en dollars américains à côté. Le chiffre affiché est une estimation ; vous êtes débité dans la devise indiquée au paiement, à un taux fixé au moment où vous payez, via les passerelles de paiement activées par l’opérateur — PayPal et Paymob aujourd’hui.',
          ],
        },
      ],
      faq: [
        {
          question: 'Le crédit non utilisé est-il reporté ?',
          answer:
            'La dotation mensuelle ne l’est pas — elle est remise à zéro à chaque période de facturation. Le crédit acheté en recharge n’expire jamais et survit à un passage à un forfait inférieur ou à une résiliation.',
        },
        {
          question: 'Une longue conversation peut-elle dépasser mon solde ?',
          answer:
            'Non. Le coût est réservé avant l’exécution du modèle, et une requête que votre solde restant ne peut pas couvrir est refusée d’emblée au lieu d’être facturée après coup.',
        },
        {
          question: 'Pourquoi le prix au paiement diffère-t-il légèrement de celui que j’ai vu ?',
          answer:
            'Le prix en devise locale affiché sur le site est une estimation convertie depuis le dollar américain. Le débit utilise la devise indiquée au paiement et un taux de change fixé au moment où vous payez.',
        },
      ],
      productNote:
        'Le crédit à l’usage est un portefeuille doté d’un registre en micro-dollars en ajout seul, activé déploiement par déploiement par son opérateur ; les prix des forfaits et les formules de recharge proviennent toujours d’enregistrements de prix versionnés.',
    },
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]: {
      seo: {
        title: 'Administration et contrôle d’accès dans ClawAI',
        description:
          'Ce dont dispose un opérateur qui administre ClawAI pour une organisation : permissions basées sur les rôles, rôles personnalisés, gestion des utilisateurs, réglages des forfaits et des passerelles, et un journal d’audit filtrable.',
        keywords: [
          'console d’administration IA',
          'contrôle d’accès IA basé sur les rôles',
          'journal d’audit IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Administration et contrôle d’accès',
      summary:
        'Administrer ClawAI pour un groupe de personnes — une entreprise, un service, un laboratoire — signifie décider qui peut faire quoi et pouvoir vérifier ce qui s’est passé. La console d’administration couvre les utilisateurs, les rôles, les forfaits, les paiements et une piste d’audit, et c’est la même console, que ClawAI soit hébergé pour vous ou fonctionne sur vos propres serveurs.',
      sections: [
        {
          id: 'roles-and-permissions',
          heading: 'Des rôles et des permissions que vous pouvez remodeler',
          paragraphs: [
            'Chaque compte a un rôle, et chaque écran et chaque action d’API vérifient une permission nommée plutôt qu’un rôle codé en dur. Les administrateurs peuvent modifier les permissions d’un rôle et créer leurs propres rôles : un relecteur en lecture seule ou un opérateur limité à la facturation relève d’un changement de configuration, pas d’un changement de code.',
          ],
        },
        {
          id: 'users-plans-and-payments',
          heading: 'Utilisateurs, forfaits et paiements',
          paragraphs: [
            'Les administrateurs peuvent activer ou désactiver des comptes, changer le rôle d’un utilisateur, définir un mot de passe temporaire à changer à la prochaine connexion, et consulter l’utilisation et le forfait de chaque utilisateur. Les forfaits, les remboursements, les passerelles de paiement, les réglages du routeur intelligent, les livraisons de webhooks et les détails du déploiement ont chacun leur propre écran d’administration.',
          ],
        },
        {
          id: 'audit-and-self-hosting',
          heading: 'Un journal d’audit, et votre propre infrastructure si besoin',
          paragraphs: [
            'Les actions sensibles pour la sécurité sont inscrites dans un journal d’audit que les administrateurs peuvent filtrer et consulter, et les enregistrements d’audit sont conservés au lieu d’expirer selon le calendrier ordinaire des journaux. Les organisations qui ne peuvent pas envoyer de données à un fournisseur tiers peuvent faire fonctionner toute la plateforme sur leurs propres serveurs avec des modèles locaux uniquement ; il s’agit d’un déploiement sur mesure plutôt que d’un forfait en libre-service.',
          ],
        },
      ],
      faq: [
        {
          question: 'Puis-je créer mes propres rôles ?',
          answer:
            'Oui. Les administrateurs peuvent créer des rôles et choisir les permissions de chacun ; chaque écran et chaque action d’API vérifient une permission nommée, et non un rôle figé.',
        },
        {
          question:
            'ClawAI propose-t-il des espaces d’équipe, des sièges ou l’authentification unique ?',
          answer:
            'Pas encore. Il n’existe aujourd’hui ni espaces de travail d’équipe partagés, ni facturation par siège, ni invitations par e-mail, ni authentification unique. L’administration se fait par déploiement : un opérateur gère les utilisateurs, les rôles et les forfaits depuis la console d’administration.',
        },
        {
          question: 'Pouvons-nous exécuter ClawAI dans notre propre réseau ?',
          answer:
            'Oui, sous forme de déploiement sur mesure sur vos propres serveurs avec des modèles locaux uniquement, afin qu’aucun prompt ni document ne quitte votre infrastructure. La page consacrée au déploiement privé décrit ce que cela implique.',
        },
      ],
      productNote:
        'Les permissions basées sur les rôles, les rôles personnalisés, la gestion des utilisateurs et le journal d’audit sont livrés dans la console d’administration ; les espaces de travail d’équipe, la facturation par siège, les invitations et l’authentification unique ne le sont pas.',
    },
  },
};
