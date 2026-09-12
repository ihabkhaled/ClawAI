import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const FR_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'À consulter ensuite',
    lastReviewed: 'Dernière vérification',
    backToHub: 'Tous les fournisseurs',
    ctaTitle: 'Essayez-le plutôt que de nous croire sur parole',
    ctaBody:
      'ClawAI dirige une conversation vers le modèle qui lui convient, parmi tous les fournisseurs ci-dessous, depuis un seul espace de travail.',
    startFree: 'Démarrer avec le plan gratuit',
    seeFeatures: 'Découvrir ce que fait ClawAI',
    catalogHeading: 'Modèles vers lesquels ClawAI peut router',
    seePricing: 'Vérifiez le catalogue en direct sur la page tarifs',
    catalogLiveNote:
      'Cette liste est lue en direct parmi les modèles vers lesquels ClawAI peut router actuellement ; elle évolue donc à mesure que des fournisseurs sont connectés ou que des modèles sont retirés.',
    catalogUnavailable:
      'Le catalogue des modèles en direct est momentanément indisponible. Veuillez réessayer dans un instant.',
    catalogMore: 'et {count} autres modèles disponibles chez ce fournisseur',
    contextWindowLabel: 'Contexte',
    capabilityLabels: {
      vision: 'Vision',
      tools: 'Outils',
      audio: 'Audio',
    },
  },
  hub: {
    seo: {
      title: 'Fournisseurs de modèles d’IA connectés à ClawAI',
      description:
        'Chaque fournisseur de modèles vers lequel ClawAI peut router une conversation — OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, et des modèles locaux à poids ouverts — avec des niveaux de coût qualitatifs et aucun benchmark inventé.',
      keywords: [
        'fournisseurs de modèles IA',
        'quels modèles ClawAI prend-il en charge',
        'comparer les fournisseurs IA',
      ],
    },
    eyebrow: 'Fournisseurs de modèles',
    title: 'Les fournisseurs de modèles derrière ClawAI',
    summary:
      'ClawAI ne construit pas de modèle — il route votre conversation vers un modèle choisi parmi plusieurs fournisseurs selon la tâche, le coût ou la confidentialité. Cette page nomme les familles de fournisseurs disposant aujourd’hui d’un connecteur actif, ce pour quoi chacune est généralement connue, et un niveau de coût qualitatif. Elle ne les classe pas, et ne remplace pas la vérification du catalogue en direct avant de choisir un plan.',
    topicsHeading: 'Choisissez un fournisseur',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5, o3 et le reste de la gamme actuelle d’OpenAI.',
      [ModelProviderPage.ANTHROPIC]: 'La famille Claude Opus, Sonnet et Haiku.',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro, Flash et Flash-Lite.',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek Chat et DeepSeek Reasoner.',
      [ModelProviderPage.XAI]: 'Grok 4 et Grok 3 mini de xAI.',
      [ModelProviderPage.LOCAL_AI]:
        'Des modèles à poids ouverts exécutés par vous-même, avec Ollama ou llama.cpp.',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'Les modèles OpenAI dans ClawAI — GPT-5, o3, et plus',
        description:
          'Les modèles OpenAI vers lesquels ClawAI peut router une conversation, à quoi chacun sert, et un niveau de coût qualitatif. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: ['modèles OpenAI ClawAI', 'GPT-5 dans ClawAI', 'quel modèle OpenAI utiliser'],
      },
      eyebrow: 'Fournisseur de modèles',
      title: 'OpenAI',
      summary:
        'ClawAI dispose d’un connecteur actif vers OpenAI : une conversation peut donc être routée vers l’un de plusieurs modèles OpenAI selon la tâche, son niveau de coût et votre mode de routage. Cette page nomme les modèles que ClawAI peut atteindre aujourd’hui ; elle ne remplace pas le catalogue en direct de la page tarifs.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Ce que couvre la gamme d’OpenAI',
          paragraphs: [
            'La gamme actuelle d’OpenAI comprend un niveau amiral polyvalent et orienté raisonnement (GPT-5), une variante plus légère et plus rapide (GPT-5 mini), un généraliste multimodal (GPT-4o et GPT-4o mini), et deux modèles conçus spécifiquement pour des tâches de raisonnement en plusieurs étapes (o3 et o4-mini). Le routeur de ClawAI peut choisir entre eux à chaque requête plutôt que d’engager tout votre compte sur un seul.',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: 'Quand une tâche convient à un modèle OpenAI',
          paragraphs: [
            'Les modèles OpenAI constituent un choix par défaut raisonnable pour la rédaction générale, l’aide au code et les questions-réponses courantes, et les modèles de la série o sont conçus spécifiquement pour des problèmes de raisonnement en plusieurs étapes où le modèle doit avancer pas à pas plutôt que répondre immédiatement. Le modèle réellement le plus performant pour votre tâche est à vérifier vous-même — voir comment évaluer les modèles d’IA ci-dessous — plutôt qu’à déduire d’un texte marketing, y compris celui-ci.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Comment ClawAI y route',
          paragraphs: [
            'Le routeur de ClawAI peut envoyer une requête vers un modèle OpenAI automatiquement en mode Auto ou Économie, ou vous pouvez en fixer un précisément en mode Modèle manuel. Les niveaux de coût ci-dessous sont qualitatifs — les modèles moins chers coûtent nettement moins par requête, mais le tarif exact évolue avec la tarification propre d’OpenAI, pas avec quelque chose que ClawAI contrôle.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI a-t-il un partenariat direct avec OpenAI ?',
          answer:
            'Non. ClawAI se connecte à l’API publique d’OpenAI comme le ferait toute application disposant d’une clé API. Cette page n’implique aucun accord particulier.',
        },
        {
          question: 'Quel modèle OpenAI utiliser pour le code ?',
          answer:
            'Cela dépend de la tâche et de l’espace de travail concerné — voir comment évaluer les modèles d’IA, lié ci-dessous, pour une méthode plutôt qu’une recommandation unique. Cette page évite volontairement d’affirmer qu’un modèle est le meilleur.',
        },
        {
          question: 'GPT-5 est-il toujours disponible sur mon plan ?',
          answer:
            'La disponibilité des modèles est déterminée par votre plan et le catalogue en direct, pas par cette page. Vérifiez la gamme actuelle sur la page tarifs avant de choisir un plan pour un modèle précis.',
        },
      ],
      productNote:
        'ClawAI peut router une requête vers un modèle OpenAI automatiquement, ou vous pouvez en fixer un directement — le choix vous appartient, sans dépendance à un seul fournisseur.',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'Les modèles Claude d’Anthropic dans ClawAI',
        description:
          'Les modèles Claude vers lesquels ClawAI peut router une conversation — Opus, Sonnet et Haiku —, à quoi chacun sert, et un niveau de coût qualitatif. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'modèles Claude ClawAI',
          'Anthropic dans ClawAI',
          'Claude Opus vs Sonnet vs Haiku',
        ],
      },
      eyebrow: 'Fournisseur de modèles',
      title: 'Anthropic',
      summary:
        'ClawAI dispose d’un connecteur actif vers Anthropic : une conversation peut donc être routée vers un modèle Claude selon la tâche, son niveau de coût et votre mode de routage. Cette page nomme les modèles que ClawAI peut atteindre aujourd’hui ; elle ne remplace pas le catalogue en direct de la page tarifs.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Ce que couvre la gamme Claude',
          paragraphs: [
            'La gamme actuelle d’Anthropic compte trois niveaux : Claude Opus 4 en tête, conçu pour les tâches les plus exigeantes ; Claude Sonnet 4 comme niveau intermédiaire polyvalent ; et Claude Haiku 4.5 comme option rapide et économique pour les requêtes plus simples. Le routeur de ClawAI peut passer de l’un à l’autre à chaque requête.',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: 'Quand une tâche convient à un modèle Claude',
          paragraphs: [
            'Les modèles Claude sont couramment utilisés pour le travail sur de longs documents, la rédaction méthodique étape par étape, et l’aide au code lorsque le respect d’instructions détaillées compte. Comme pour tout fournisseur, le bon modèle pour une tâche précise mérite d’être vérifié sur votre propre charge de travail — voir comment lire les benchmarks IA ci-dessous pour ce qu’un chiffre publié révèle et ne révèle pas.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Comment ClawAI y route',
          paragraphs: [
            'Le routeur de ClawAI peut envoyer une requête vers un modèle Claude automatiquement en mode Auto, Raisonnement élevé ou Économie, ou vous pouvez en fixer un en mode Modèle manuel. Anthropic est le seul fournisseur de cette liste à publier un tarif d’écriture en cache distinct, un détail de facturation plutôt qu’une différence de capacité — cela ne change pas ce que le modèle peut faire.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quelle est la différence entre Opus, Sonnet et Haiku ?',
          answer:
            'Ce sont trois niveaux de coût et de capacité d’une même famille de modèles — Opus est le niveau le plus élevé, Sonnet le niveau intermédiaire, Haiku le niveau le plus rapide et le moins cher. Le routeur de ClawAI peut choisir entre eux, ou vous pouvez choisir manuellement.',
        },
        {
          question: 'ClawAI a-t-il un partenariat direct avec Anthropic ?',
          answer:
            'Non. ClawAI se connecte à l’API publique d’Anthropic comme le ferait toute application disposant d’une clé API.',
        },
        {
          question: 'Claude Opus 4 est-il disponible sur tous les plans ?',
          answer:
            'La disponibilité des modèles est déterminée par votre plan et le catalogue en direct, pas par cette page. Vérifiez la gamme actuelle sur la page tarifs avant de choisir un plan pour un modèle précis.',
        },
      ],
      productNote:
        'ClawAI peut router une requête vers un modèle Claude automatiquement, ou vous pouvez en fixer un directement — le choix vous appartient, sans dépendance à un seul fournisseur.',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'Les modèles Google Gemini dans ClawAI',
        description:
          'Les modèles Gemini vers lesquels ClawAI peut router une conversation — 2.5 Pro, Flash et Flash-Lite —, à quoi chacun sert, et un niveau de coût qualitatif. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: ['modèles Gemini ClawAI', 'Google AI dans ClawAI', 'Gemini Pro vs Flash'],
      },
      eyebrow: 'Fournisseur de modèles',
      title: 'Google Gemini',
      summary:
        'ClawAI dispose d’un connecteur actif vers Google Gemini : une conversation peut donc être routée vers un modèle Gemini selon la tâche, son niveau de coût et votre mode de routage. Cette page nomme les modèles que ClawAI peut atteindre aujourd’hui ; elle ne remplace pas le catalogue en direct de la page tarifs.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Ce que couvre la gamme Gemini',
          paragraphs: [
            'La gamme actuelle de Google compte trois niveaux : Gemini 2.5 Pro pour les requêtes les plus exigeantes, Gemini 2.5 Flash comme niveau intermédiaire polyvalent, et Gemini 2.5 Flash-Lite comme option rapide et économique. Le routeur de ClawAI peut passer de l’un à l’autre à chaque requête.',
          ],
        },
        {
          id: 'when-google-fits',
          heading: 'Quand une tâche convient à un modèle Gemini',
          paragraphs: [
            'Les modèles Gemini sont souvent sollicités pour des tâches avec une grande quantité de source à traiter, la famille étant conçue autour d’un traitement de contexte long. Vérifier vous-même si un niveau donné convient à votre charge de travail précise reste utile — voir comment évaluer les modèles d’IA ci-dessous pour une méthode reproductible plutôt qu’une affirmation en une ligne.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Comment ClawAI y route',
          paragraphs: [
            'Le routeur de ClawAI peut envoyer une requête vers un modèle Gemini automatiquement en mode Auto ou Économie, ou vous pouvez en fixer un en mode Modèle manuel. La tarification publiée de Gemini augmente au-delà d’un seuil de contexte long que le niveau de coût de cette page ne cherche pas à modéliser — un seul niveau qualitatif n’est pas assez précis pour exprimer un tarif à paliers, à considérer comme un point de départ, pas une facture.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI a-t-il un partenariat direct avec Google ?',
          answer:
            'Non. ClawAI se connecte à l’API Gemini comme le ferait toute application disposant d’une clé API.',
        },
        {
          question: 'Quel modèle Gemini gère le mieux les longs documents ?',
          answer:
            'La famille est globalement conçue pour un traitement de contexte long sur tous les niveaux ; la limite exacte et le coût dépendent du modèle et de la requête précis. Vérifiez le catalogue en direct plutôt que de supposer un chiffre fixe.',
        },
        {
          question: 'Gemini 2.5 Pro est-il disponible sur tous les plans ?',
          answer:
            'La disponibilité des modèles est déterminée par votre plan et le catalogue en direct, pas par cette page. Vérifiez la gamme actuelle sur la page tarifs avant de choisir un plan pour un modèle précis.',
        },
      ],
      productNote:
        'ClawAI peut router une requête vers un modèle Gemini automatiquement, ou vous pouvez en fixer un directement — le choix vous appartient, sans dépendance à un seul fournisseur.',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'Les modèles DeepSeek dans ClawAI',
        description:
          'Les modèles DeepSeek vers lesquels ClawAI peut router une conversation — DeepSeek Chat et DeepSeek Reasoner —, à quoi chacun sert, et un niveau de coût qualitatif. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: ['modèles DeepSeek ClawAI', 'DeepSeek dans ClawAI', 'DeepSeek Chat vs Reasoner'],
      },
      eyebrow: 'Fournisseur de modèles',
      title: 'DeepSeek',
      summary:
        'ClawAI dispose d’un connecteur actif vers DeepSeek : une conversation peut donc être routée vers un modèle DeepSeek selon la tâche, son niveau de coût et votre mode de routage. Cette page nomme les modèles que ClawAI peut atteindre aujourd’hui ; elle ne remplace pas le catalogue en direct de la page tarifs.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Ce que couvre la gamme DeepSeek',
          paragraphs: [
            'La gamme actuelle de DeepSeek compte deux modèles : DeepSeek Chat, un modèle polyvalent, et DeepSeek Reasoner, conçu spécifiquement pour des tâches où le modèle doit avancer en plusieurs étapes avant de répondre. Les deux sont tarifés nettement en dessous de plusieurs autres fournisseurs de cette page, ce qui explique en partie pourquoi le mode Économie se tourne plus souvent vers DeepSeek.',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: 'Quand une tâche convient à un modèle DeepSeek',
          paragraphs: [
            'DeepSeek est une option raisonnable lorsque le coût par requête compte davantage que de gagner le dernier incrément de capacité, et DeepSeek Reasoner en particulier pour les tâches de raisonnement en plusieurs étapes. Comme pour tout fournisseur, vérifiez sur votre propre charge de travail plutôt que sur une affirmation générale — voir comment lire les benchmarks IA ci-dessous.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Comment ClawAI y route',
          paragraphs: [
            'Le routeur de ClawAI peut envoyer une requête vers un modèle DeepSeek automatiquement en mode Économie ou Auto, ou vous pouvez en fixer un en mode Modèle manuel. Les deux modèles DeepSeek se situent dans le niveau de coût standard sur cette page — réellement peu coûteux par rapport aux niveaux premium ailleurs sur ce site, sans que cette page n’avance un tarif exact.',
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeek est-il moins cher que les autres fournisseurs ?',
          answer:
            'Les deux modèles DeepSeek se situent ici dans le niveau de coût standard, généralement inférieur aux modèles premium d’autres fournisseurs — mais le tarif exact évolue avec les prix publiés par DeepSeek, pas avec cette page.',
        },
        {
          question: 'À quoi sert DeepSeek Reasoner ?',
          answer:
            'Il est conçu pour des tâches où le modèle avance en plusieurs étapes avant de produire une réponse, dans un esprit similaire aux modèles orientés raisonnement publiés par d’autres fournisseurs.',
        },
        {
          question: 'ClawAI a-t-il un partenariat direct avec DeepSeek ?',
          answer:
            'Non. ClawAI se connecte à l’API publique de DeepSeek comme le ferait toute application disposant d’une clé API.',
        },
      ],
      productNote:
        'ClawAI peut router une requête vers un modèle DeepSeek automatiquement, ou vous pouvez en fixer un directement — le choix vous appartient, sans dépendance à un seul fournisseur.',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'Les modèles Grok de xAI dans ClawAI',
        description:
          'Les modèles Grok vers lesquels ClawAI peut router une conversation — Grok 4 et Grok 3 mini —, à quoi chacun sert, et un niveau de coût qualitatif. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: ['modèles Grok ClawAI', 'xAI dans ClawAI', 'Grok 4 dans ClawAI'],
      },
      eyebrow: 'Fournisseur de modèles',
      title: 'xAI',
      summary:
        'ClawAI dispose d’un connecteur actif vers xAI : une conversation peut donc être routée vers un modèle Grok selon la tâche, son niveau de coût et votre mode de routage. Cette page nomme les modèles que ClawAI peut atteindre aujourd’hui ; elle ne remplace pas le catalogue en direct de la page tarifs.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Ce que couvre la gamme Grok',
          paragraphs: [
            'La gamme actuelle de xAI compte deux modèles accessibles via ClawAI : Grok 4, le niveau de capacité supérieur, et Grok 3 mini, une option plus rapide et plus économique. Le routeur de ClawAI peut passer de l’un à l’autre à chaque requête.',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: 'Quand une tâche convient à un modèle Grok',
          paragraphs: [
            'Les modèles Grok constituent une option polyvalente raisonnable aux côtés des autres fournisseurs de cette page. Le modèle réellement le plus performant pour une tâche précise reste à vérifier vous-même — voir comment évaluer les modèles d’IA ci-dessous pour une méthode qui ne repose pas sur le discours marketing d’un seul fournisseur.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Comment ClawAI y route',
          paragraphs: [
            'Le routeur de ClawAI peut envoyer une requête vers un modèle Grok automatiquement en mode Auto ou Économie, ou vous pouvez en fixer un en mode Modèle manuel. Grok 3 mini se situe dans le niveau de coût économique sur cette page ; Grok 4 dans le niveau premium.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI a-t-il un partenariat direct avec xAI ?',
          answer:
            'Non. ClawAI se connecte à l’API publique de xAI comme le ferait toute application disposant d’une clé API.',
        },
        {
          question: 'Quelle est la différence entre Grok 4 et Grok 3 mini ?',
          answer:
            'Ce sont un niveau de capacité supérieur et un niveau plus rapide et moins cher d’une même famille de modèles. Le routeur de ClawAI peut choisir entre eux, ou vous pouvez choisir manuellement.',
        },
        {
          question: 'Grok 4 est-il disponible sur tous les plans ?',
          answer:
            'La disponibilité des modèles est déterminée par votre plan et le catalogue en direct, pas par cette page. Vérifiez la gamme actuelle sur la page tarifs avant de choisir un plan pour un modèle précis.',
        },
      ],
      productNote:
        'ClawAI peut router une requête vers un modèle Grok automatiquement, ou vous pouvez en fixer un directement — le choix vous appartient, sans dépendance à un seul fournisseur.',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'Modèles d’IA locaux à poids ouverts dans ClawAI',
        description:
          'Exécutez vous-même des modèles à poids ouverts avec Ollama ou llama.cpp via ClawAI, au lieu d’envoyer des requêtes à un fournisseur cloud. Le mécanisme et sa différence avec les fournisseurs cloud de cette page.',
        keywords: [
          'modèles IA locaux ClawAI',
          'Ollama dans ClawAI',
          'exécuter des modèles IA localement',
        ],
      },
      eyebrow: 'Fournisseur de modèles',
      title: 'IA locale',
      summary:
        'ClawAI dispose de connecteurs actifs vers Ollama et llama.cpp, deux façons d’exécuter un modèle à poids ouverts sur du matériel que vous contrôlez au lieu d’envoyer une requête à un fournisseur cloud. Contrairement aux autres pages de cet ensemble, il n’existe pas de catalogue fixe à nommer — les modèles sont à poids ouverts et c’est vous qui choisissez lesquels exécuter.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Ce que change réellement l’exécution locale',
          paragraphs: [
            'Un fournisseur cloud de ce site exécute un modèle sur sa propre infrastructure et facture par requête. Ollama et llama.cpp chargent au contraire un modèle à poids ouverts sur du matériel que vous contrôlez — votre propre machine, ou un serveur que vous exploitez — de sorte que la requête ne le quitte jamais. Cela change qui peut voir la requête, pas ce dont le modèle est capable ; un modèle à poids ouverts exécuté localement est d’une autre nature que les fournisseurs cloud listés ailleurs dans cet ensemble, pas un remplacement direct de l’un d’eux.',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollama et llama.cpp sont deux outils différents',
          paragraphs: [
            'Les deux sont des connecteurs ClawAI réels, mais ils conviennent à des situations différentes — Ollama privilégie la simplicité de récupération et d’exécution d’un modèle avec des réglages par défaut sensés, tandis que llama.cpp offre un contrôle plus direct sur la façon dont un modèle s’exécute, au prix d’une configuration plus manuelle. La comparaison complète se trouve sur Ollama contre llama.cpp, lié ci-dessous, plutôt que d’être répétée ici.',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: 'Choisir quel modèle à poids ouverts exécuter',
          paragraphs: [
            'Cette page ne nomme volontairement aucun modèle à poids ouverts précis, car le domaine évolue plus vite qu’une page statique ne peut le suivre, et une recommandation périmée est pire que l’absence de recommandation. Qu’est-ce que l’IA locale-first, lié ci-dessous, explique les modèles à poids ouverts et l’arbitrage face aux fournisseurs cloud plus en profondeur qu’une page produit ne le devrait.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’IA locale coûte-t-elle quelque chose via ClawAI ?',
          answer:
            'ClawAI ne facture pas de tarif au jeton pour un modèle exécuté localement comme il le fait pour un fournisseur cloud, puisqu’aucun fournisseur cloud n’est facturé — le coût est le matériel que vous exploitez déjà. Vérifiez le comportement actuel du plan sur la page tarifs.',
        },
        {
          question: 'Quel modèle à poids ouverts devrais-je exécuter ?',
          answer:
            'Cette page n’en recommande aucun — voir qu’est-ce que l’IA locale-first, lié ci-dessous, pour savoir comment aborder ce choix, le bon modèle dépendant de votre matériel et de votre tâche d’une manière qu’une page statique ne peut pas suivre de façon responsable.',
        },
        {
          question: 'Un modèle exécuté localement est-il aussi capable qu’un modèle cloud ?',
          answer:
            'Cela dépend entièrement du modèle à poids ouverts précis et de votre matériel, et cette page ne fera aucune affirmation générale dans un sens ou dans l’autre. Voir comment évaluer les modèles d’IA, lié ci-dessous, pour vérifier sur votre propre charge de travail.',
        },
      ],
      productNote:
        'Les connecteurs Ollama et llama.cpp de ClawAI sont des connecteurs réels et livrés — le mode de routage Local uniquement garde chaque requête sur du matériel que vous contrôlez.',
    },
  },
};
