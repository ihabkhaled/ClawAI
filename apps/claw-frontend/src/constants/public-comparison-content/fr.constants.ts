import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const FR_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    atAGlance: 'En un coup d’œil',
    tableCaption: 'ClawAI et {rival} comparés, capacité par capacité',
    capabilityColumn: 'Capacité',
    clawColumn: 'ClawAI',
    strengthTitle: 'Là où {rival} est fort',
    differenceTitle: 'Ce que ClawAI fait autrement',
    chooseTitle: 'Lequel choisir',
    chooseRivalLabel: 'Choisissez {rival} si',
    chooseClawLabel: 'Choisissez ClawAI si',
    faqTitle: 'Questions fréquentes',
    lastReviewed: 'Comparaison établie sur des informations publiques, dernière vérification',
    independence:
      'ClawAI est un produit indépendant. Il n’est ni affilié à, ni approuvé par, ni revendeur d’aucun des assistants cités sur cette page. Chaque affirmation provient de la documentation publique de l’éditeur concerné à la date ci-dessus, et ces produits évoluent vite — vérifiez les pages officielles avant de décider.',
    otherComparisons: 'Comparer ClawAI à un autre assistant',
    startFree: 'Commencer avec l’offre gratuite',
    seePricing: 'Voir les tarifs',
  },
  hub: {
    eyebrow: 'Comparatifs',
    intro:
      'ClawAI ne cherche pas à être un meilleur assistant unique. Il réunit neuf familles de modèles de premier plan sous un seul abonnement et envoie chaque message à celui qui convient. Ces pages le confrontent aux assistants déjà utilisés, sur les mêmes huit capacités à chaque fois.',
    cardsTitle: 'Choisissez un assistant à comparer',
    cardCta: 'Comparer avec {rival}',
    coversTitle: 'Ce que couvre chaque comparatif',
    coversBody:
      'Les mêmes huit capacités, dans le même ordre, sur chaque page : choix des modèles, routage, réponses côte à côte, modèles locaux, auto-hébergement, mémoire et fichiers, connecteurs et relevé d’usage par réponse. Les mêmes questions pour tous, pour pouvoir lire deux pages l’une à côté de l’autre.',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'Choix des modèles',
    [ComparisonDimension.ROUTING]: 'Routage',
    [ComparisonDimension.SIDE_BY_SIDE]: 'Réponses côte à côte',
    [ComparisonDimension.LOCAL_MODELS]: 'Modèles locaux et à poids ouverts',
    [ComparisonDimension.SELF_HOSTING]: 'Auto-hébergement',
    [ComparisonDimension.MEMORY_AND_FILES]: 'Mémoire et fichiers',
    [ComparisonDimension.CONNECTORS]: 'Connecteurs de travail',
    [ComparisonDimension.RECEIPTS]: 'Relevé d’usage',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]:
      'Neuf familles de modèles de premier plan sous un seul abonnement',
    [ComparisonDimension.ROUTING]: 'Cinq modes de routage, dont un routage automatique par message',
    [ComparisonDimension.SIDE_BY_SIDE]:
      'Un prompt envoyé à plusieurs modèles à la fois, réponses côte à côte',
    [ComparisonDimension.LOCAL_MODELS]:
      'Modèles à poids ouverts sur votre propre GPU, via Ollama ou llama.cpp',
    [ComparisonDimension.SELF_HOSTING]:
      'Toute la pile tourne sur vos serveurs, code source sur GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'Une mémoire qui persiste entre les conversations, plus le contexte des fichiers',
    [ComparisonDimension.CONNECTORS]: 'Douze connecteurs vers vos outils de travail',
    [ComparisonDimension.RECEIPTS]:
      'Chaque réponse enregistre son modèle, son coût et le quota consommé',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI vs ChatGPT',
      intro:
        'ChatGPT est l’assistant auquel la plupart des gens pensent quand ils disent « IA » : soigné, rapide, adossé aux modèles de pointe d’OpenAI. ClawAI a une autre forme : un seul abonnement qui atteint les modèles d’OpenAI aux côtés de huit autres familles, et envoie chaque message à celui qui convient.',
      theirStrength:
        'Un produit unique, extrêmement bien fait. La voix, la génération d’images, l’exécution de code et la recherche approfondie sont intégrées et fonctionnent ensemble, les applications mobiles sont excellentes, et le modèle sous-jacent est un modèle de pointe, pas un compromis.',
      ourDifference:
        'ClawAI n’essaie pas d’être un meilleur assistant unique. Il supprime la question du fournisseur unique : une même conversation peut passer d’OpenAI à Anthropic, Google et six autres familles, basculer sur un modèle local à poids ouverts quand les données ne doivent pas quitter votre réseau, et consigner quel modèle a répondu.',
      chooseRival:
        'vous voulez un assistant soigné, les modèles OpenAI couvrent presque tout ce que vous faites, et les outils voix et image intégrés comptent pour vous.',
      chooseClaw:
        'vous butez régulièrement sur les limites d’un seul fournisseur, vous voulez qu’un second modèle vérifie le premier, ou une partie du travail doit rester sur votre matériel.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modèles OpenAI uniquement',
        [ComparisonDimension.ROUTING]: 'Sélection automatique dans la gamme d’OpenAI',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud uniquement',
        [ComparisonDimension.SELF_HOSTING]: 'Non proposé',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Mémoire, projets et envoi de fichiers',
        [ComparisonDimension.CONNECTORS]: 'Applications et connecteurs sur les offres payantes',
        [ComparisonDimension.RECEIPTS]: 'Usage au niveau de l’offre, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI peut-il utiliser les mêmes modèles OpenAI que ChatGPT ?',
          answer:
            'ClawAI achemine vers les modèles d’OpenAI, l’une des neuf familles de son catalogue. Aucun compte OpenAI à créer, aucune clé API à coller : l’accès aux modèles est compris dans l’abonnement.',
        },
        {
          question: 'ClawAI est-il un client ChatGPT ?',
          answer:
            'Non. ClawAI est une plateforme indépendante avec ses propres couches de routage, de mémoire, de comparaison et d’orchestration. OpenAI est l’un des fournisseurs auxquels elle peut envoyer un message, pas le produit qui la fait tourner.',
        },
        {
          question: 'Puis-je utiliser ClawAI sans rien envoyer à OpenAI ?',
          answer:
            'Oui. Épinglez la conversation à un modèle local à poids ouverts, ou hébergez toute la pile chez vous et n’exécutez que des modèles sur vos propres GPU, sans aucun appel externe.',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI vs Claude',
      intro:
        'Claude est ce vers quoi beaucoup se tournent quand le travail est long, minutieux et écrit. ClawAI atteint aussi les modèles d’Anthropic — aux côtés de huit autres familles — et laisse un second modèle vérifier ce que le premier a dit.',
      theirStrength:
        'Un raisonnement soigneux sur de longs documents, le suivi d’instructions le plus fiable du secteur et une bonne relecture de code. Les projets, les artefacts et les connecteurs MCP en font un excellent endroit pour un travail écrit de longue haleine.',
      ourDifference:
        'ClawAI traite Anthropic comme une option forte, pas comme la seule. Un même fil peut envoyer un prompt à Claude et à quatre autres modèles en même temps, faire juger la réponse de l’un par un autre, et basculer automatiquement quand un fournisseur tombe.',
      chooseRival:
        'presque tout votre travail relève du raisonnement long ou de la relecture de code, et un excellent modèle suffit.',
      chooseClaw:
        'vous voulez la réponse de Claude et un second avis, il vous faut un modèle local pour des données sensibles, ou vous préférez éviter un abonnement par fournisseur.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modèles Anthropic uniquement',
        [ComparisonDimension.ROUTING]: 'Vous choisissez le modèle vous-même',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud uniquement',
        [ComparisonDimension.SELF_HOSTING]: 'Non proposé',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Projets, fichiers et mémoire',
        [ComparisonDimension.CONNECTORS]: 'Connecteurs MCP et extensions bureau',
        [ComparisonDimension.RECEIPTS]: 'Usage au niveau de l’offre, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI inclut-il les modèles Claude ?',
          answer:
            'Oui. Anthropic est l’une des neuf familles de modèles du catalogue, accessible depuis n’importe quelle conversation sans compte ni clé Anthropic séparés.',
        },
        {
          question: 'Un modèle peut-il vérifier la réponse d’un autre ?',
          answer:
            'Oui. Verify, Judge et Critic mettent un second modèle sur la sortie du premier. Cela réduit le risque d’une réponse fausse et assurée sans l’éliminer : tout ce qui compte demande encore une lecture humaine.',
        },
        {
          question: 'ClawAI est-il affilié à Anthropic ?',
          answer:
            'Non. ClawAI est indépendant. Il achemine vers les modèles d’Anthropic comme vers huit autres fournisseurs, sans être approuvé ni partenaire d’aucun d’eux.',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI vs Gemini',
      intro:
        'Gemini est l’assistant le plus proche des documents que vous avez déjà, à condition qu’ils vivent dans Google Workspace. ClawAI aborde le problème par l’autre bout : neutre vis-à-vis des fournisseurs, avec les modèles de Google comme l’une des neuf familles.',
      theirStrength:
        'De très grandes fenêtres de contexte, une prise en charge native des images, de l’audio et de la vidéo, des réponses rapides, et une intégration à Gmail, Drive et Docs qu’aucun tiers ne peut égaler.',
      ourDifference:
        'ClawAI n’est lié ni à une suite bureautique ni à la feuille de route d’un fournisseur. Il se connecte à douze outils de travail plutôt qu’un seul, route chaque message selon la tâche, et peut garder le travail sensible sur un modèle local à poids ouverts.',
      chooseRival:
        'votre organisation vit dans Google Workspace et vous voulez l’assistant directement à l’intérieur.',
      chooseClaw:
        'vous utilisez des outils de plusieurs éditeurs, vous voulez comparer les modèles avant de vous engager, ou il vous faut un déploiement sans aucun appel externe.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modèles Google uniquement',
        [ComparisonDimension.ROUTING]: 'Sélection automatique dans la gamme de Google',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]: 'Hébergé par Google uniquement',
        [ComparisonDimension.SELF_HOSTING]: 'Non proposé',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Fichiers, Drive et contexte Workspace',
        [ComparisonDimension.CONNECTORS]: 'Intégration Google Workspace profonde',
        [ComparisonDimension.RECEIPTS]: 'Usage au niveau de l’offre, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI peut-il utiliser les modèles Gemini ?',
          answer:
            'Oui. Google est l’une des neuf familles de modèles du catalogue, disponible dans n’importe quelle conversation sous le même abonnement.',
        },
        {
          question: 'ClawAI se connecte-t-il à Google Workspace ?',
          answer:
            'ClawAI propose douze connecteurs couvrant les outils de suivi, la messagerie d’équipe et les documents. Son intégration Google est un connecteur, pas une surface native : plus large entre éditeurs, moins profonde à l’intérieur de Google.',
        },
        {
          question: 'Lequel est meilleur pour les très longs documents ?',
          answer:
            'Les deux s’en sortent bien, et les plus grandes fenêtres de contexte de Google comptent parmi les plus vastes disponibles. La différence de ClawAI est que vous pouvez envoyer le même document à deux modèles et comparer leurs conclusions.',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI vs Perplexity',
      intro:
        'Perplexity est construit autour d’une seule tâche : répondre à une question à partir du web en direct, sources à l’appui. ClawAI est construit autour d’une autre : mettre le bon modèle sur le travail en cours, recherche comprise.',
      theirStrength:
        'Le produit le mieux taillé pour les questions de type recherche. Les réponses arrivent avec leurs citations, les relances gardent le fil cohérent, et toute l’interface est pensée pour vérifier d’où vient une affirmation.',
      ourDifference:
        'ClawAI est un espace de travail, pas un moteur de réponses. La recherche est un mode parmi d’autres, à côté de la comparaison de modèles, de la mémoire persistante, du contexte des fichiers, d’un agent de code et des modèles locaux — et chaque réponse consigne le modèle qui l’a produite.',
      chooseRival:
        'la plupart de vos questions sont « qu’est-ce qui est vrai en ce moment, et qui le dit ».',
      chooseClaw:
        'la recherche n’est qu’une partie du travail et il vous faut aussi du code, de la rédaction longue, de la comparaison de modèles, ou un modèle qui tourne sur votre matériel.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]:
          'Modèles de plusieurs éditeurs sur les offres supérieures',
        [ComparisonDimension.ROUTING]: 'Choisi pour la qualité de recherche et de réponse',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud uniquement',
        [ComparisonDimension.SELF_HOSTING]: 'Non proposé',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Espaces, fils et envoi de fichiers',
        [ComparisonDimension.CONNECTORS]: 'Connecteurs sur les offres entreprise',
        [ComparisonDimension.RECEIPTS]: 'Usage au niveau de l’offre, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI cherche-t-il sur le web ?',
          answer:
            'Oui. La recherche exécute une requête web en plusieurs étapes et renvoie une réponse avec ses sources. C’est une capacité de l’espace de travail, pas le produit tout entier.',
        },
        {
          question: 'Lequel cite le mieux ses sources ?',
          answer:
            'Perplexity est conçu pour les réponses sourcées et affiche des sources pour pratiquement chaque affirmation. ClawAI cite ses recherches ; pour une question purement « trouver et citer », un moteur de réponses dédié est l’outil le plus tranchant.',
        },
        {
          question: 'Puis-je utiliser les deux ?',
          answer:
            'Beaucoup le font. La vraie question est de savoir si vous voulez un moteur de réponses spécialisé, un espace de travail multi-modèles général, ou les deux.',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI vs Microsoft Copilot',
      intro:
        'Copilot, c’est Microsoft 365 avec un assistant tissé à l’intérieur. ClawAI est un espace de travail autonome qui atteint neuf familles de modèles et peut tourner entièrement sur vos propres serveurs.',
      theirStrength:
        'Rien d’autre ne se tient aussi près des données Microsoft d’une organisation. Le contexte de Word, Excel, Outlook et Teams arrive sans configuration, et licences, hébergement et conformité suivent le contrat Microsoft 365 que la DSI a déjà.',
      ourDifference:
        'ClawAI est neutre vis-à-vis des fournisseurs et déployable partout. Il route sur neuf familles de modèles plutôt que sur la sélection d’un seul fournisseur, montre ce que chaque réponse a coûté, et peut s’installer dans votre réseau avec des modèles à poids ouverts et aucun appel externe.',
      chooseRival:
        'votre organisation tourne sur Microsoft 365 et la valeur tient à l’assistant présent dans les documents déjà là.',
      chooseClaw:
        'vous voulez le choix du fournisseur, la visibilité du coût par réponse, ou un déploiement qui ne quitte jamais votre infrastructure.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modèles OpenAI et modèles propres à Microsoft',
        [ComparisonDimension.ROUTING]: 'Choisi par Microsoft selon la surface',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]: 'Cloud uniquement',
        [ComparisonDimension.SELF_HOSTING]: 'Non proposé',
        [ComparisonDimension.MEMORY_AND_FILES]:
          'Fichiers Microsoft 365 et contexte de l’organisation',
        [ComparisonDimension.CONNECTORS]: 'Intégration Microsoft 365 la plus profonde',
        [ComparisonDimension.RECEIPTS]: 'Licence par utilisateur, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI peut-il être déployé dans notre propre réseau ?',
          answer:
            'Oui. Toute la pile tourne sur vos serveurs, avec des modèles à poids ouverts sur vos GPU et aucun appel à un fournisseur externe. C’est une prestation cadrée, pas une offre achetable en ligne.',
        },
        {
          question: 'ClawAI s’intègre-t-il à Microsoft 365 ?',
          answer:
            'ClawAI propose douze connecteurs couvrant les outils de suivi, la messagerie d’équipe et les documents — plus large entre éditeurs que Copilot, et moins profond à l’intérieur des applications Microsoft.',
        },
        {
          question: 'Comment l’usage est-il facturé ?',
          answer:
            'En jetons normalisés par coût, sur un quota quotidien et mensuel, et non par utilisateur. Chaque réponse affiche le modèle, le coût et le quota consommé.',
        },
      ],
    },
    [ComparisonRival.KIMI]: {
      name: 'Kimi',
      vendor: 'Moonshot AI',
      eyebrow: 'ClawAI vs Kimi',
      intro:
        'Kimi s’est fait un nom sur des contextes très longs et, plus récemment, sur la publication de poids ouverts que chacun peut télécharger et exécuter. ClawAI a une autre forme : un seul abonnement qui atteint des modèles à poids ouverts de la classe de Kimi aux côtés de huit autres familles, et envoie chaque message à celui qui convient.',
      theirStrength:
        'La lecture de très longs contextes à un prix inférieur à celui de la plupart des modèles de pointe occidentaux, un bon comportement agentique et d’usage d’outils, et des poids ouverts pour la gamme phare — le même modèle peut donc être évalué dans le produit hébergé, puis exécuté sur votre propre matériel.',
      ourDifference:
        'ClawAI ne vous demande pas de choisir un laboratoire. Un modèle à poids ouverts peut répondre là où le coût ou la localisation des données compte, un modèle de pointe peut prendre les questions qui l’exigent, et la décision de routage est consignée à chaque réponse au lieu d’être une habitude à retenir.',
      chooseRival:
        'votre travail est dominé par de très longs documents, un fournisseur unique vous convient, et le prix au jeton est le chiffre qui décide.',
      chooseClaw:
        'vous voulez l’économie des poids ouverts sur certains messages et la qualité d’un modèle de pointe sur d’autres, sans tenir deux abonnements ni trancher à la main à chaque fois.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modèles Moonshot uniquement',
        [ComparisonDimension.ROUTING]: 'Sélection dans la gamme propre à Moonshot',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]:
          'Poids ouverts publiés, l’hébergement reste à votre charge',
        [ComparisonDimension.SELF_HOSTING]: 'Poids oui, produit non',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Lecture de fichiers en contexte long',
        [ComparisonDimension.CONNECTORS]: 'Limités hors de ses propres applications',
        [ComparisonDimension.RECEIPTS]: 'Usage au niveau de l’API, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI peut-il utiliser les modèles Kimi ?',
          answer:
            'ClawAI atteint des modèles à poids ouverts de cette classe via son propre catalogue, et peut les exécuter localement sur vos GPU. Aucun compte séparé à créer, aucune clé API à coller.',
        },
        {
          question: 'Exécuter moi-même des poids ouverts revient-il moins cher qu’un abonnement ?',
          answer:
            'À volume soutenu, cela peut l’être, une fois les GPU et le temps d’exploitation à votre charge. ClawAI vise le cas intermédiaire : l’économie des poids ouverts pour les messages qui s’y prêtent, des modèles de pointe pour les autres, sur une seule facture.',
        },
        {
          question: 'Mes données quittent-elles le réseau si j’utilise un modèle local ?',
          answer:
            'Non. Épinglez une conversation à un modèle local à poids ouverts et rien n’est envoyé à un fournisseur externe. Héberger toute la pile chez vous supprime entièrement les appels externes.',
        },
      ],
    },
    [ComparisonRival.QWEN]: {
      name: 'Qwen',
      vendor: 'Alibaba',
      eyebrow: 'ClawAI vs Qwen',
      intro:
        'Qwen est l’une des familles à poids ouverts les plus complètes disponibles : une large échelle de tailles, une bonne couverture multilingue et des licences permissives sur la majeure partie de la gamme. ClawAI place des modèles de cette classe aux côtés de huit autres familles sous un seul abonnement.',
      theirStrength:
        'L’étendue. Des tailles qui vont de ce qui tourne sur un portable à ce qui exige un serveur, des variantes vision et code, de vraies bonnes performances hors de l’anglais, et des licences qui rendent l’auto-hébergement commercial simple.',
      ourDifference:
        'ClawAI est la couche au-dessus du modèle, pas le modèle lui-même. Il route message par message, peut poser la même question à plusieurs familles et afficher les réponses côte à côte, conserve la mémoire et les fichiers pour toutes, et facture l’ensemble sur un seul quota.',
      chooseRival:
        'vous construisez sur un modèle, vous voulez maîtriser le déploiement, et vous avez la capacité d’exploitation pour l’exécuter et le mettre à jour vous-même.',
      chooseClaw:
        'vous voulez utiliser des modèles plutôt que les exploiter, et garder la possibilité d’atteindre un modèle de pointe quand un modèle à poids ouverts ne suffit pas.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Famille Qwen uniquement',
        [ComparisonDimension.ROUTING]: 'Vous choisissez la taille et la variante',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Ne fait pas partie du modèle',
        [ComparisonDimension.LOCAL_MODELS]: 'Poids ouverts sur toute la gamme',
        [ComparisonDimension.SELF_HOSTING]: 'Poids oui, produit non',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Ce que vous construisez autour',
        [ComparisonDimension.CONNECTORS]: 'Ce que vous construisez autour',
        [ComparisonDimension.RECEIPTS]: 'Votre propre instrumentation',
      },
      faq: [
        {
          question: 'Puis-je exécuter un modèle à poids ouverts dans ClawAI ?',
          answer:
            'Oui. ClawAI exécute des modèles à poids ouverts localement via son propre moteur d’exécution, et une conversation peut y être épinglée pour que rien ne quitte votre réseau.',
        },
        {
          question: 'Pourquoi utiliser ClawAI plutôt qu’héberger un modèle directement ?',
          answer:
            'Parce que le modèle est la partie facile. Le routage, la comparaison, la mémoire, la gestion des fichiers, les connecteurs, les quotas et la comptabilité du coût par réponse sont les parties qu’il vous faudrait sinon construire, et c’est exactement ce qu’est ClawAI.',
        },
        {
          question: 'ClawAI prend-il en charge d’autres langues que l’anglais ?',
          answer:
            'L’interface du produit existe en treize langues, et le choix du modèle se fait message par message — un modèle multilingue peut donc prendre les messages qui en ont besoin.',
        },
      ],
    },
    [ComparisonRival.GLM]: {
      name: 'GLM',
      vendor: 'Zhipu AI',
      eyebrow: 'ClawAI vs GLM',
      intro:
        'GLM est la gamme de pointe de Zhipu, connue pour ses solides performances en code et en agents à une fraction du prix des plus grands modèles occidentaux, avec des poids ouverts sur une large part de la gamme. ClawAI traite les modèles de cette classe comme une option parmi neuf.',
      theirStrength:
        'Le rapport prix-capacité. Des résultats en code et en usage d’outils proches de modèles bien plus chers, un rythme de sorties agressif, et des poids ouverts qui font de l’auto-hébergement une vraie option plutôt qu’un communiqué de presse.',
      ourDifference:
        'ClawAI ne vous oblige pas à parier sur un laboratoire qui garderait son avance. Le routage se fait message par message et le catalogue évolue sous vos pieds : qu’un modèle moins cher prenne une plus grande part du travail relève de la configuration, pas de la migration.',
      chooseRival:
        'le coût par réponse capable est le chiffre qui décide, votre travail est surtout du code, et vous êtes prêt à suivre de près le cycle de sorties d’un seul laboratoire.',
      chooseClaw:
        'vous voulez cette économie disponible sans vous y engager pour tout, et vous voulez garder trace du modèle qui a réellement répondu.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modèles Zhipu uniquement',
        [ComparisonDimension.ROUTING]: 'Sélection dans la gamme propre à Zhipu',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]: 'Poids ouverts sur une large part de la gamme',
        [ComparisonDimension.SELF_HOSTING]: 'Poids oui, produit non',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Envoi de fichiers dans sa propre application',
        [ComparisonDimension.CONNECTORS]: 'Limités hors de ses propres applications',
        [ComparisonDimension.RECEIPTS]: 'Usage au niveau de l’API, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI revient-il moins cher que l’usage direct d’un modèle bon marché ?',
          answer:
            'Au jeton, non — un appel API direct au modèle capable le moins cher restera toujours le plancher. ClawAI revient moins cher que l’alternative réaliste : plusieurs abonnements, ou construire vous-même le routage, la mémoire et la comptabilité des coûts.',
        },
        {
          question: 'Puis-je faire préférer à ClawAI des modèles moins coûteux ?',
          answer:
            'Oui. Les modes de routage vont du tout automatique à l’épinglage d’un modèle précis, et les modes sensibles au coût mettent en balance le prix et la capacité pour chaque message.',
        },
        {
          question: 'Comment savoir quel modèle a répondu ?',
          answer:
            'Chaque réponse porte le fournisseur, le modèle, le mode de routage et le coût consommé, et la décision de routage elle-même peut être inspectée.',
        },
      ],
    },
    [ComparisonRival.DEEPSEEK]: {
      name: 'DeepSeek',
      vendor: 'DeepSeek',
      eyebrow: 'ClawAI vs DeepSeek',
      intro:
        'DeepSeek a changé les attentes de prix sur les modèles de raisonnement et publié les poids ouverts de sa gamme phare. ClawAI est la couche qui laisse un tel modèle prendre le travail où il excelle sans devenir le seul modèle dont vous disposez.',
      theirStrength:
        'Du raisonnement et des mathématiques à un prix qui a bousculé le marché, des poids ouverts sur la gamme phare, et une posture de recherche qui publie au lieu de laisser entendre — vous pouvez lire comment les modèles ont été entraînés.',
      ourDifference:
        'ClawAI garde le choix ouvert message par message. Une question exigeante en raisonnement peut aller à un modèle de raisonnement, une question de routine à un modèle rapide et bon marché, et une question sensible à un modèle sur votre propre matériel, la décision étant consignée plutôt que supposée.',
      chooseRival:
        'votre charge de travail est dominée par du raisonnement difficile, vous en voulez le prix le plus bas, et un fournisseur unique vous convient.',
      chooseClaw:
        'le raisonnement est une partie de votre travail plutôt que la totalité, et vous voulez un second modèle disponible pour vérifier le premier.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modèles DeepSeek uniquement',
        [ComparisonDimension.ROUTING]: 'Vous choisissez chat ou raisonnement',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Une réponse à la fois',
        [ComparisonDimension.LOCAL_MODELS]: 'Poids ouverts sur la gamme phare',
        [ComparisonDimension.SELF_HOSTING]: 'Poids oui, produit non',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Envoi de fichiers dans sa propre application',
        [ComparisonDimension.CONNECTORS]: 'Limités hors de ses propres applications',
        [ComparisonDimension.RECEIPTS]: 'Usage au niveau de l’API, pas de coût par réponse',
      },
      faq: [
        {
          question: 'ClawAI peut-il router uniquement vers des modèles de raisonnement ?',
          answer:
            'Oui. Une conversation peut être épinglée à un modèle précis, et le mode automatique envoie déjà les messages exigeants en raisonnement aux modèles qui s’y prêtent.',
        },
        {
          question: 'Où mes données sont-elles traitées ?',
          answer:
            'Chez le fournisseur qui a répondu, et la réponse indique lequel. Si cela compte pour un travail donné, épinglez-le à un modèle local à poids ouverts, ou hébergez la pile chez vous pour que rien ne quitte votre réseau.',
        },
        {
          question: 'Puis-je comparer deux modèles sur la même question ?',
          answer:
            'Oui. Le mode comparaison envoie un même prompt à plusieurs modèles à la fois et affiche les réponses côte à côte, avec une passe de jugement optionnelle pour les noter.',
        },
      ],
    },
  },
};
