import { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { ModelFitDictionary } from '@/types/model-fit.types';

export const FR_MODEL_FIT_CONTENT: ModelFitDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'Pour aller plus loin',
    lastReviewed: 'Dernière relecture',
    backToHub: 'Toutes les tâches',
    ctaTitle: 'Essayez plutôt que de nous croire sur parole',
    ctaBody:
      'ClawAI oriente chaque conversation vers le modèle qui lui convient, parmi tous les fournisseurs connectés, depuis un seul espace de travail.',
    startFree: 'Commencer avec le plan gratuit',
    seeFeatures: 'Découvrir ce que fait ClawAI',
    seePricing: 'Vérifier le catalogue en direct sur la page tarifs',
  },
  hub: {
    seo: {
      title: 'Choisir un modèle pour votre tâche',
      description:
        'Ce qui compte vraiment pour choisir un modèle pour le code, le raisonnement complexe, la rédaction, la recherche sourcée ou les usages privés et locaux — sans classement, sans benchmark inventé.',
      keywords: [
        'choisir un modèle pour une tâche',
        'quel modèle IA convient à ma tâche',
        'modèle pour le code ou la rédaction',
      ],
    },
    eyebrow: 'Adéquation du modèle',
    title: 'Choisir un modèle pour votre tâche',
    summary:
      "Il n'existe pas un seul meilleur modèle : il existe un modèle qui convient à une tâche donnée, et cette adéquation change selon ce que la tâche exige — la profondeur de raisonnement nécessaire, la quantité de contexte à retenir, la sensibilité au coût, et si la requête doit rester sur du matériel que vous contrôlez. Ce hub ne classe pas les modèles ; il détaille ce qu'il faut peser pour cinq types de travaux courants, et renvoie vers les pages fournisseurs et les guides d'évaluation qui permettent de vérifier par soi-même.",
    topicsHeading: 'Choisissez une tâche',
    cardSummaries: {
      [ModelFitTask.CODING]: 'Ce qui compte quand un modèle écrit ou modifie du code.',
      [ModelFitTask.COMPLEX_REASONING]:
        'Des problèmes à plusieurs étapes où le modèle doit raisonner pas à pas.',
      [ModelFitTask.WRITING_AND_EDITING]:
        "Rédaction longue, édition et respect d'une charte éditoriale.",
      [ModelFitTask.RESEARCH_WITH_SOURCES]:
        "Des réponses fondées sur des sources consultées par le modèle, pas seulement sur ses données d'entraînement.",
      [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]:
        'Garder une requête sur du matériel que vous contrôlez plutôt que chez un fournisseur cloud.',
    },
  },
  tasks: {
    [ModelFitTask.CODING]: {
      seo: {
        title: 'Choisir un modèle pour le code',
        description:
          "Ce qu'il faut peser pour choisir un modèle pour des tâches de code dans ClawAI — suivi des instructions, fenêtre de contexte et coût par requête. Sans classement, sans benchmark inventé. Vérifiez le catalogue en direct avant de choisir un plan.",
        keywords: [
          'choisir un modèle pour le code',
          'quel modèle utiliser pour coder',
          'modèle IA pour la programmation',
        ],
      },
      eyebrow: 'Adéquation du modèle',
      title: 'Choisir un modèle pour le code',
      summary:
        "Le travail de code couvre un large éventail — une correction d'une ligne, une refonte multi-fichiers, une fonctionnalité créée de zéro — et le modèle qui convient change selon la taille et la nature de ce travail. Cette page détaille ce qu'il faut peser plutôt que de désigner un vainqueur unique ; le routeur de ClawAI peut déjà gérer l'essentiel, ou vous pouvez choisir manuellement.",
      sections: [
        {
          id: 'what-coding-needs',
          heading: "Ce qu'une tâche de code attend vraiment d'un modèle",
          paragraphs: [
            "Les tâches de code s'appuient sur la capacité d'un modèle à suivre des instructions détaillées et structurées, et à garder une modification cohérente sur un fichier ou plusieurs fichiers — plus proche d'une écriture méthodique pas à pas que d'une conversation ouverte. Plusieurs fournisseurs du catalogue ClawAI publient des modèles conçus spécifiquement pour traiter un problème par étapes plutôt que de répondre immédiatement, ce qui convient raisonnablement à une modification non triviale ; une modification simple et bien définie en a rarement besoin.",
          ],
        },
        {
          id: 'context-and-cost',
          heading: 'La fenêtre de contexte et le coût, pas seulement la capacité',
          paragraphs: [
            "Une base de code volumineuse, ou une tâche qui nécessite plusieurs fichiers ouverts à la fois, est avant tout un problème de fenêtre de contexte — un modèle doit pouvoir garder le code pertinent sous les yeux pour raisonner correctement dessus. La sensibilité au coût varie aussi au sein d'un même flux de travail : une tâche à fort volume comme la génération de code répétitif ou de complétions simples se prête bien à un modèle moins coûteux, tandis qu'une refonte soignée d'un chemin critique justifie de dépenser davantage. Traiter chaque requête de code de la même façon, quelle que soit sa taille, est en général le mauvais réflexe par défaut.",
          ],
        },
        {
          id: 'how-clawai-routes-coding',
          heading: 'Comment ClawAI peut router une requête de code',
          paragraphs: [
            "Le routeur de ClawAI peut envoyer une requête de code vers un modèle adapté automatiquement en mode Auto ou High Reasoning, ou vous pouvez en fixer un précisément en mode Manual Model lorsque vous savez exactement de quel modèle une tâche a besoin. Parcourez la page des fournisseurs de modèles pour voir toutes les familles de fournisseurs vers lesquelles ClawAI peut router une requête, et vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle — la disponibilité et les quotas y sont appliqués, pas sur cette page.",
          ],
        },
      ],
      faq: [
        {
          question: 'Quel est le meilleur modèle pour le code ?',
          answer:
            "Cette page n'en désignera pas un — le « meilleur » dépend de la taille et de la nature de la tâche, et aucun benchmark fiable ne tranche la question pour tous les cas. Consultez le guide pour évaluer les modèles IA, lié ci-dessous, pour une méthode reproductible à appliquer à votre propre charge de travail.",
        },
        {
          question:
            'ClawAI choisit-il automatiquement un modèle différent pour les tâches de code ?',
          answer:
            "En mode Auto ou High Reasoning, le routeur de ClawAI peut envoyer une requête vers un modèle qu'il juge adapté à la tâche, code compris. Vous pouvez aussi fixer vous-même un modèle précis en mode Manual Model.",
        },
        {
          question: 'Un modèle orienté raisonnement est-il toujours le bon choix pour coder ?',
          answer:
            "Pas nécessairement — une modification simple et bien définie n'en a souvent pas besoin, tandis qu'une refonte à plusieurs étapes s'y prête plus naturellement. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan autour d'un modèle précis.",
        },
      ],
      productNote:
        "ClawAI peut router une requête de code vers un modèle adapté automatiquement, ou vous pouvez en fixer un directement en mode Manual Model — le choix vous appartient, sans dépendre d'un seul fournisseur.",
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont définis par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFitTask.COMPLEX_REASONING]: {
      seo: {
        title: 'Choisir un modèle pour le raisonnement complexe',
        description:
          "Ce qu'il faut peser pour choisir un modèle pour des tâches de raisonnement à plusieurs étapes dans ClawAI — profondeur de raisonnement, modes de routage, et comment évaluer un modèle sur votre propre problème. Vérifiez le catalogue en direct avant de choisir un plan.",
        keywords: [
          'choisir un modèle pour le raisonnement',
          'modèle IA pour problèmes complexes',
          'modèle de raisonnement à plusieurs étapes',
        ],
      },
      eyebrow: 'Adéquation du modèle',
      title: 'Choisir un modèle pour le raisonnement complexe',
      summary:
        "Une tâche de raisonnement complexe demande à un modèle de traiter plusieurs étapes — décomposer un problème, vérifier des résultats intermédiaires, réviser avant de répondre — plutôt que de produire une réponse au premier jet. Cette page détaille ce que cela change dans l'adéquation d'un modèle, sans désigner de vainqueur unique ni citer de score de benchmark.",
      sections: [
        {
          id: 'what-reasoning-tasks-need',
          heading: 'Ce dont une tâche de raisonnement à plusieurs étapes a besoin',
          paragraphs: [
            "Plusieurs fournisseurs du catalogue ClawAI publient des modèles conçus spécifiquement pour traiter un problème étape par étape avant de produire une réponse finale, plutôt que de répondre immédiatement — un point de départ raisonnable pour une tâche comportant plusieurs étapes dépendantes, plusieurs contraintes à satisfaire à la fois, ou un résultat qui doit être vérifié avant d'être définitif. Une question courte et à étape unique tire rarement parti de ce type de modèle ; l'adéquation dépend de la structure de la tâche, pas d'une notion générale de modèle plus performant.",
          ],
        },
        {
          id: 'high-reasoning-routing',
          heading: 'Le mode de routage High Reasoning de ClawAI',
          paragraphs: [
            "High Reasoning est l'un des sept modes de routage de ClawAI, conçu précisément pour ce type de requête : le routeur privilégie un modèle adapté pour traiter un problème par étapes plutôt que d'y répondre immédiatement. Le mode Auto peut lui aussi recourir à l'un de ces modèles lorsqu'il juge qu'une requête l'exige ; le mode Manual Model permet de fixer un modèle directement si vous savez déjà de quel modèle une tâche récurrente a besoin.",
          ],
        },
        {
          id: 'evaluating-reasoning-models',
          heading: "Vérifier soi-même l'adéquation d'un modèle en raisonnement",
          paragraphs: [
            "Aucune page de ce site ne publie de score de benchmark, car un chiffre publié reflète rarement la performance d'un modèle sur votre problème précis — consultez comment lire les benchmarks IA, lié ci-dessous, pour ce qu'un score publié indique et n'indique pas. Comment évaluer les modèles IA, également lié ci-dessous, détaille une méthode reproductible pour tester un modèle sur vos propres tâches de raisonnement.",
          ],
        },
      ],
      faq: [
        {
          question: 'Quel est le meilleur modèle en raisonnement ?',
          answer:
            "Cette page n'en désigne pas un — les modèles conçus pour le raisonnement à plusieurs étapes varient selon le fournisseur, et il vaut mieux vérifier soi-même leur performance sur son propre problème plutôt que de se fier à un score publié. Consultez le guide pour évaluer les modèles IA, lié ci-dessous.",
        },
        {
          question: 'Que fait le mode de routage High Reasoning de ClawAI ?',
          answer:
            "C'est l'un des sept modes de routage de ClawAI ; une fois sélectionné, le routeur privilégie un modèle adapté pour traiter un problème par étapes plutôt que d'y répondre immédiatement.",
        },
        {
          question: 'Faut-il toujours utiliser un modèle orienté raisonnement ?',
          answer:
            "Non — une question courte et à étape unique en a rarement besoin, et les modèles orientés raisonnement se trouvent à tous les niveaux de prix chez les fournisseurs de ClawAI. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan autour d'un modèle précis.",
        },
      ],
      productNote:
        'Le mode de routage High Reasoning de ClawAI peut envoyer une requête vers un modèle adapté pour traiter un problème par étapes, ou vous pouvez en fixer un directement en mode Manual Model.',
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont définis par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFitTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Choisir un modèle pour la rédaction et l’édition',
        description:
          "Ce qu'il faut peser pour choisir un modèle de rédaction, d'édition et de textes longs dans ClawAI — fenêtre de contexte, respect d'une charte éditoriale et coût sur l'ensemble d'un flux de travail. Vérifiez le catalogue en direct avant de choisir un plan.",
        keywords: [
          'choisir un modèle pour la rédaction',
          'modèle IA pour l’édition',
          'modèle pour la rédaction longue',
        ],
      },
      eyebrow: 'Adéquation du modèle',
      title: 'Choisir un modèle pour la rédaction et l’édition',
      summary:
        "La rédaction et l'édition couvrent un large éventail de tâches — une courte réécriture, un long document édité pour rester cohérent, un texte entièrement rédigé selon une charte éditoriale — et ce qu'un modèle doit bien faire change selon ce spectre. Cette page détaille ce qu'il faut peser plutôt que de désigner un modèle unique comme réponse.",
      sections: [
        {
          id: 'what-writing-tasks-need',
          heading: "Ce qu'une tâche de rédaction ou d'édition attend d'un modèle",
          paragraphs: [
            "Un travail de rédaction soigné s'appuie sur la capacité d'un modèle à suivre des instructions détaillées et à garder un ton et une structure cohérents sur l'ensemble d'un texte, ce qui se rapproche de ce que plusieurs fournisseurs présentent comme le point fort de leurs modèles généralistes et de leurs offres supérieures. Une courte réécriture ou un simple paragraphe n'a que rarement besoin du même modèle qu'un long document qui doit rester cohérent de la première à la dernière page.",
          ],
        },
        {
          id: 'context-window-for-long-documents',
          heading: 'La fenêtre de contexte compte pour les documents longs',
          paragraphs: [
            "Éditer un long document, ou en rédiger un à partir d'une charte éditoriale et de documents de référence conséquents, est avant tout un problème de fenêtre de contexte — le modèle doit pouvoir garder tout le document, ou une part suffisante de celui-ci, sous les yeux pour garder la terminologie, le ton et la structure cohérents. Consultez qu'est-ce qu'une fenêtre de contexte, lié ci-dessous, pour ce que cette limite signifie réellement et d'où elle vient.",
          ],
        },
        {
          id: 'how-clawai-routes-writing',
          heading: 'Comment ClawAI peut router une requête de rédaction',
          paragraphs: [
            "Le routeur de ClawAI peut envoyer une requête de rédaction ou d'édition vers un modèle adapté automatiquement en mode Auto ou Cost Saver, ou vous pouvez en fixer un précisément en mode Manual Model pour une tâche récurrente avec une charte éditoriale connue. Parcourez la page des fournisseurs de modèles pour voir toutes les familles de fournisseurs vers lesquelles ClawAI peut router, et vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle.",
          ],
        },
      ],
      faq: [
        {
          question: 'Quel modèle rédige le mieux ?',
          answer:
            "Cette page n'en désignera pas un — la qualité rédactionnelle est jugée différemment par chaque lecteur et chaque tâche, et aucun benchmark ne tranche la question. Consultez le guide pour évaluer les modèles IA, lié ci-dessous, pour une méthode qui se vérifie sur votre propre matériel.",
        },
        {
          question: 'Quel modèle utiliser pour un long document ?',
          answer:
            "Regardez d'abord la taille de la fenêtre de contexte, puisqu'un long document doit tenir sous les yeux du modèle pour qu'il reste cohérent tout du long. Consultez qu'est-ce qu'une fenêtre de contexte, lié ci-dessous, pour comprendre comment fonctionne cette limite.",
        },
        {
          question: 'Puis-je garder le même modèle pour une tâche de rédaction récurrente ?',
          answer:
            'Oui — fixez-en un en mode Manual Model si une tâche récurrente suit une charte éditoriale connue et que vous voulez le même modèle à chaque fois, plutôt que de laisser faire le routage automatique.',
        },
      ],
      productNote:
        'ClawAI peut router une requête de rédaction vers un modèle adapté automatiquement, ou vous pouvez en fixer un directement en mode Manual Model pour une tâche récurrente avec une charte éditoriale connue.',
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont définis par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFitTask.RESEARCH_WITH_SOURCES]: {
      seo: {
        title: 'Choisir un modèle pour la recherche sourcée',
        description:
          'Comment le mode Research de ClawAI fonde une réponse sur des sources consultées, comment cela est facturé séparément du crédit modèle, et ce que le choix du modèle change encore. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'recherche IA avec sources',
          'réponses IA fondées sur des sources',
          'choisir un modèle pour la recherche',
        ],
      },
      eyebrow: 'Adéquation du modèle',
      title: 'Choisir un modèle pour la recherche sourcée',
      summary:
        "Une tâche de recherche demande une réponse fondée sur des sources que le modèle a réellement consultées, et pas seulement sur ce qu'il a appris pendant son entraînement. Le mode Research de ClawAI est une fonctionnalité réelle et déployée conçue pour cela ; cette page explique ce qu'il fait, comment il est facturé, et ce que le choix du modèle change encore une fois des sources impliquées.",
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Ce que fait le mode Research de ClawAI',
          paragraphs: [
            "Le mode Research permet à une requête de faire une recherche web, de récupérer une page, ou de récupérer et d'en extraire un contenu structuré, avant que le modèle ne produise une réponse — la réponse peut ainsi citer des sources récupérées pour cette question précise plutôt que de reposer uniquement sur ce que le modèle sous-jacent a appris pendant son entraînement. C'est une fonctionnalité réservée à certains plans, avec trois niveaux de profondeur : recherche seule, recherche plus récupération de page, ou recherche plus récupération et extraction.",
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'La recherche est facturée séparément, pas sur votre crédit modèle',
          paragraphs: [
            "L'accès à la recherche est mesuré comme un usage à part — recherche web, récupération de pages et extraction — distinct du quota de tokens sur lequel un message de conversation puise. Affirmer que « la recherche utilise votre crédit modèle » serait faux : les deux sont suivis et facturés séparément, et le quota de recherche de votre plan est une ligne distincte de son quota de tokens modèle.",
          ],
        },
        {
          id: 'what-the-model-still-changes',
          heading: 'Ce que le modèle sous-jacent change encore',
          paragraphs: [
            "Le mode Research change ce que le modèle peut voir avant de répondre, pas la qualité de son raisonnement sur ce qu'il a récupéré — un modèle doit toujours lire les sources récupérées, les mettre en balance les unes avec les autres, et rédiger une réponse qui les reflète fidèlement. Les mêmes considérations que pour les tâches de raisonnement complexe s'appliquent ici : un modèle conçu pour traiter plusieurs étapes convient raisonnablement pour concilier plusieurs sources, ce qui mérite d'être vérifié sur votre propre matériel plutôt que supposé.",
          ],
        },
      ],
      faq: [
        {
          question: 'La recherche utilise-t-elle mon crédit modèle ?',
          answer:
            "Non. L'accès à la recherche — recherche web, récupération de pages et extraction — est mesuré séparément du quota de tokens sur lequel puise un message de conversation. Vérifiez les deux quotas sur la page tarifs.",
        },
        {
          question:
            'Quelle est la différence entre les trois niveaux de profondeur du mode Research ?',
          answer:
            "La recherche seule renvoie les résultats d'une recherche web ; recherche plus récupération va aussi chercher le contenu de la page ; recherche plus récupération et extraction en tire en plus un contenu structuré. Le niveau utilisé par une requête dépend de sa configuration.",
        },
        {
          question: 'Le modèle choisi a-t-il de l’importance quand le mode Research est activé ?',
          answer:
            'Oui — le mode Research change les sources que le modèle peut voir, pas sa capacité à les lire et à les concilier. Consultez le guide pour évaluer les modèles IA, lié ci-dessous, pour vérifier cela sur votre propre charge de travail.',
        },
      ],
      productNote:
        "Le mode Research de ClawAI peut faire une recherche, récupérer une page, ou récupérer et en extraire le contenu sur le web avant qu'un modèle ne réponde — une fonctionnalité réelle et déployée, mesurée séparément de votre crédit de tokens modèle.",
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont définis par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]: {
      seo: {
        title: 'Choisir un modèle pour des usages privés et locaux',
        description:
          'Ce qui change quand une requête reste sur du matériel que vous contrôlez plutôt que chez un fournisseur cloud, et comment les modes de routage Local-Only et Privacy-First de ClawAI conviennent aux usages privés. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'usages IA privés sur modèle',
          'choix de modèle IA local',
          'exécuter des modèles IA sur son propre matériel',
        ],
      },
      eyebrow: 'Adéquation du modèle',
      title: 'Choisir un modèle pour des usages privés et locaux',
      summary:
        "Un usage privé ou local se définit par l'endroit où s'exécute la requête, pas par le type de tâche — l'exigence est qu'elle reste sur du matériel que vous contrôlez plutôt que d'atteindre un fournisseur cloud. ClawAI dispose de connecteurs opérationnels vers Ollama et llama.cpp exactement pour cela, ainsi que de modes de routage qui gardent une requête locale par défaut.",
      sections: [
        {
          id: 'what-changes-locally',
          heading: "Ce que change réellement l'exécution locale d'un modèle",
          paragraphs: [
            "Un fournisseur cloud, ailleurs dans le catalogue ClawAI, exécute un modèle sur sa propre infrastructure et facture par requête ; Ollama et llama.cpp chargent au contraire un modèle à poids ouverts sur du matériel que vous contrôlez, si bien que la requête n'en sort jamais. Cela change qui peut voir la requête, pas ce dont un modèle donné est capable — consultez l'IA locale, sur la page des fournisseurs de modèles, pour le mécanisme complet plutôt que de le répéter ici.",
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Les modes de routage Local-Only et Privacy-First de ClawAI',
          paragraphs: [
            "Le routage Local-Only garde chaque requête sur du matériel que vous contrôlez, via Ollama ou llama.cpp plutôt que via un fournisseur cloud. Le routage Privacy-First est un mode distinct avec ses propres priorités ; les deux existent précisément parce que tous les usages ne doivent pas basculer par défaut sur le routage Auto. Choisir entre les deux, ou fixer un modèle local précis en mode Manual Model, est une décision d'usage qui mérite d'être prise délibérément plutôt que laissée à un réglage générique par défaut.",
          ],
        },
        {
          id: 'choosing-which-open-weight-model',
          heading: 'Choisir quel modèle à poids ouverts exécuter',
          paragraphs: [
            "Cette page ne nomme volontairement aucun modèle à poids ouverts précis, pour la même raison que la page fournisseur de l'IA locale ne le fait pas non plus : le domaine évolue plus vite qu'une page statique ne peut le suivre, et une recommandation obsolète est pire que l'absence de recommandation. Consultez qu'est-ce que l'IA local-first, lié ci-dessous, pour réfléchir à l'arbitrage entre un modèle à poids ouverts exécuté par vous-même et un fournisseur cloud.",
          ],
        },
      ],
      faq: [
        {
          question: 'Quel modèle à poids ouverts exécuter pour un usage privé ?',
          answer:
            "Cette page n'en recommande aucun — consultez qu'est-ce que l'IA local-first, lié ci-dessous, pour réfléchir à ce choix, car le modèle adapté dépend de votre matériel et de votre tâche d'une façon qu'une page statique ne peut pas suivre de manière responsable.",
        },
        {
          question: 'Quelle est la différence entre le routage Local-Only et Privacy-First ?',
          answer:
            'Local-Only garde chaque requête sur du matériel que vous contrôlez via Ollama ou llama.cpp ; Privacy-First est un mode de routage distinct avec ses propres priorités. Les deux existent parce que tous les usages ne doivent pas basculer par défaut sur le routage Auto.',
        },
        {
          question: 'Exécuter un modèle localement coûte-t-il quelque chose via ClawAI ?',
          answer:
            "ClawAI ne facture pas de tarif au token pour un modèle exécuté localement comme il le fait pour un fournisseur cloud, puisqu'aucun fournisseur cloud n'est sollicité — le coût est le matériel que vous exploitez déjà. Vérifiez le comportement actuel du plan sur la page tarifs.",
        },
      ],
      productNote:
        'Le mode de routage Local-Only de ClawAI garde chaque requête sur du matériel que vous contrôlez via Ollama ou llama.cpp — un connecteur réel et déployé, pas un élément de feuille de route.',
      catalogDisclaimer:
        "Aucun modèle précis n'est nommé ici, volontairement — les modèles à poids ouverts et leurs capacités évoluent rapidement, et c'est vous qui choisissez lesquels exécuter. Vérifiez le comportement du plan pour les usages locaux sur la page tarifs.",
    },
  },
};
