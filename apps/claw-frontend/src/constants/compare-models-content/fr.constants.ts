import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const FR_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'Pour aller plus loin',
    lastReviewed: 'Dernière relecture',
    backToHub: 'Toutes les paires',
    ctaTitle: 'Essayez plutôt que de nous croire sur parole',
    ctaBody:
      'ClawAI oriente chaque conversation vers le modèle qui lui convient, parmi tous les fournisseurs connectés, depuis un seul espace de travail.',
    startFree: 'Commencer avec le plan gratuit',
    seeFeatures: 'Découvrir ce que fait ClawAI',
    seePricing: 'Vérifier le catalogue en direct sur la page tarifs',
  },
  hub: {
    seo: {
      title: 'Comment ClawAI route entre les familles de modèles',
      description:
        'Comment le routeur de ClawAI choisit entre deux familles de fournisseurs pour une requête donnée — classe de coût, besoins de contexte, et si une requête doit rester locale. Aucun classement entre produits nommés, aucun benchmark inventé.',
      keywords: [
        'comment ClawAI route entre les fournisseurs de modèles',
        'choisir entre des familles de modèles IA',
        'routage OpenAI vs Anthropic vs Google',
      ],
    },
    eyebrow: 'Routage de modèles',
    title: 'Comment ClawAI route entre les familles de modèles',
    summary:
      "Ce hub ne classe pas OpenAI, Anthropic, Google, DeepSeek ou xAI les uns par rapport aux autres — c'est une question différente de celle à laquelle répond réellement le routeur de ClawAI. Ce que fait le routeur, c'est choisir, pour une requête donnée, vers quelle famille l'envoyer, en pesant la classe de coût, la quantité de contexte dont la requête a besoin, si la charge de travail doit rester sur du matériel que vous contrôlez, et le mode de routage que vous avez sélectionné. Chaque page ci-dessous explique ce choix pour une paire de familles, en s'appuyant sur les modes de routage propres à ClawAI et sur les classes de coût qualitatives de son catalogue de modèles, jamais sur un score de benchmark.",
    pairsHeading: 'Choisissez une paire',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        'Comment le routeur arbitre une requête entre les catalogues d’OpenAI et d’Anthropic.',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]:
        'Comment le routeur arbitre une requête entre les catalogues d’OpenAI et de Google.',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        'Comment le routeur arbitre une requête entre les catalogues d’Anthropic et de Google.',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        'Comment la classe de coût oriente le choix du routeur entre OpenAI et DeepSeek.',
      [ModelFamilyPair.OPENAI_VS_XAI]:
        'Comment le routeur arbitre une requête entre les catalogues d’OpenAI et de xAI.',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        'Ce qui change quand une requête doit rester sur du matériel que vous contrôlez plutôt que chez un fournisseur cloud.',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI vs Anthropic : comment ClawAI route entre eux',
        description:
          'Comment le routeur de ClawAI choisit entre les catalogues de modèles d’OpenAI et d’Anthropic pour une requête donnée — classe de coût, adéquation au mode raisonnement, et fixation manuelle. Aucun vainqueur désigné. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'OpenAI vs Anthropic',
          'routeur ClawAI OpenAI Anthropic',
          'choisir entre les modèles OpenAI et Claude',
        ],
      },
      eyebrow: 'Routage de modèles',
      title: 'OpenAI vs Anthropic : comment ClawAI route entre eux',
      summary:
        "OpenAI et Anthropic publient chacun des catalogues qui couvrent plusieurs classes de coût, des modèles bon marché et rapides à répondre jusqu'aux niveaux premium et les plus élevés conçus pour des problèmes plus difficiles. Cette page ne classe pas une famille au-dessus de l'autre — elle explique ce que le routeur de ClawAI pèse réellement lorsqu'une requête pourrait plausiblement aller vers l'une ou l'autre, et comment vous pouvez vous-même surclasser ce choix.",
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading: 'La classe de coût traverse les deux catalogues, pas un palier par fournisseur',
          paragraphs: [
            "Le catalogue de modèles de ClawAI attribue à chaque modèle intégré une classe de coût qualitative — économique, standard, premium ou la plus élevée — plutôt qu'un prix exact. Le catalogue d'OpenAI va d'économique à premium ; celui d'Anthropic va de standard jusqu'au niveau le plus élevé. Aucun des deux fournisseurs ne possède entièrement l'extrémité bon marché ou l'extrémité coûteuse, si bien qu'une décision de routage fondée sur le coût doit examiner les modèles précis disponibles dans les deux catalogues, plutôt que de supposer qu'un fournisseur est uniformément moins cher.",
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: 'Les modes de routage qui concernent cette paire',
          paragraphs: [
            "En mode Auto, le routeur de ClawAI peut envoyer une requête vers un modèle de l'un ou l'autre catalogue selon ce dont la requête a besoin. Le mode High Reasoning privilégie un modèle conçu pour traiter un problème par étapes, et OpenAI comme Anthropic publient des modèles de ce type ; le mode Cost Saver privilégie un modèle de classe de coût inférieure, qui existe lui aussi dans les deux catalogues. Le mode Manual Model permet de fixer directement un modèle précis de l'un ou l'autre fournisseur, ce qui est le choix délibéré pour une tâche récurrente dont vous savez déjà quel modèle convient.",
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Ce que cette page n’affirme pas',
          paragraphs: [
            "Aucune page de ce site ne publie de score de benchmark ni de revendication de vitesse comparant ces deux fournisseurs, et celle-ci ne commence pas à le faire. Consultez comment lire les benchmarks IA et comment évaluer les modèles IA, liés ci-dessous, pour vérifier une adéquation avec votre propre charge de travail plutôt que d'accepter un classement venu de n'importe où, y compris de cette page.",
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI ou Anthropic, lequel est le meilleur ?',
          answer:
            "Cette page ne le dira pas — les deux publient des modèles sur plusieurs classes de coût et cas d'usage, et aucun benchmark fiable ne tranche la question pour toutes les tâches. Consultez comment évaluer les modèles IA, lié ci-dessous, pour une méthode applicable à votre propre charge de travail.",
        },
        {
          question: 'Le routeur de ClawAI choisit-il automatiquement entre OpenAI et Anthropic ?',
          answer:
            "En mode Auto, High Reasoning ou Cost Saver, oui — le routeur peut envoyer une requête vers un modèle de l'un ou l'autre catalogue selon ce dont la requête a besoin. Vous pouvez aussi fixer un modèle précis de l'un ou l'autre fournisseur en mode Manual Model.",
        },
        {
          question:
            'Puis-je utiliser des modèles OpenAI et Anthropic dans le même espace de travail ?',
          answer:
            "Oui — ClawAI se connecte aux deux comme fournisseurs distincts, et le routage Auto peut recourir à l'un ou l'autre selon la requête, ou vous pouvez fixer un modèle précis de chacun pour des tâches différentes en mode Manual Model.",
        },
      ],
      productNote:
        "Le routage Auto et High Reasoning de ClawAI peut recourir au catalogue d'OpenAI ou à celui d'Anthropic pour une requête donnée, ou vous pouvez en fixer un directement en mode Manual Model.",
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont appliqués par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI vs Google : comment ClawAI route entre eux',
        description:
          'Comment le routeur de ClawAI choisit entre les catalogues de modèles d’OpenAI et de Google pour une requête donnée — classe de coût, besoins de contexte, et fixation manuelle. Aucun vainqueur désigné. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'OpenAI vs Google Gemini',
          'routeur ClawAI OpenAI Google',
          'choisir entre les modèles OpenAI et Gemini',
        ],
      },
      eyebrow: 'Routage de modèles',
      title: 'OpenAI vs Google : comment ClawAI route entre eux',
      summary:
        "OpenAI et Google Gemini publient tous deux des catalogues allant de modèles bon marché et rapides à répondre jusqu'à des niveaux premium. Cette page ne désigne pas de vainqueur — elle explique ce que le routeur de ClawAI pèse lorsqu'une requête pourrait plausiblement aller vers l'une ou l'autre famille, et comment surclasser ce choix.",
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: 'Classe de coût et forme du catalogue',
          paragraphs: [
            "Le catalogue intégré d'OpenAI va d'économique à premium ; le catalogue Gemini de Google va lui aussi d'économique à premium, avec son propre niveau bon marché. Une décision de routage qui pèse la classe de coût doit examiner le modèle précis, au sein de chaque famille, qui correspond au budget de la requête, puisque les deux fournisseurs publient une gamme plutôt qu'un point de prix unique et fixe.",
          ],
        },
        {
          id: 'context-window-considerations',
          heading: 'La fenêtre de contexte est une propriété par modèle, pas par fournisseur',
          paragraphs: [
            "Ce qu'un modèle peut tenir sous les yeux à la fois varie selon le modèle précis choisi, pas selon lequel de ces deux fournisseurs il vient. Consultez qu'est-ce qu'une fenêtre de contexte, lié ci-dessous, pour ce que cette limite signifie et pourquoi une requête qui doit raisonner sur un document volumineux ou un long historique de conversation devrait la vérifier directement plutôt que de supposer que les modèles d'un fournisseur sont uniformément plus grands.",
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Comment ClawAI route une requête entre eux',
          paragraphs: [
            "En mode Auto, le routeur de ClawAI peut envoyer une requête vers un modèle adapté de l'un ou l'autre catalogue. Le mode Cost Saver privilégie un modèle de classe de coût inférieure, quel que soit celui de ces deux fournisseurs dont il provient. Le mode Manual Model permet de fixer directement un modèle OpenAI ou Google précis pour une tâche récurrente dont l'adéquation est connue.",
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI ou Google Gemini, lequel est le meilleur ?',
          answer:
            "Cette page ne le dit pas — les deux publient des modèles sur plusieurs classes de coût, et l'adéquation dépend de la tâche. Consultez comment évaluer les modèles IA, lié ci-dessous, pour une méthode reproductible à vérifier sur votre propre charge de travail.",
        },
        {
          question: 'ClawAI route-t-il automatiquement entre les modèles OpenAI et Google ?',
          answer:
            "En mode Auto ou Cost Saver, le routeur peut envoyer une requête vers un modèle adapté de l'un ou l'autre catalogue. Vous pouvez aussi fixer un modèle précis de l'un ou l'autre fournisseur en mode Manual Model.",
        },
        {
          question: 'Quel fournisseur a la plus grande fenêtre de contexte ?',
          answer:
            "Cela varie selon le modèle précis, pas uniformément selon le fournisseur. Consultez qu'est-ce qu'une fenêtre de contexte, lié ci-dessous, pour savoir comment vérifier la limite d'un modèle donné avant de s'y fier pour un document volumineux ou une longue conversation.",
        },
      ],
      productNote:
        "Le routage Auto et Cost Saver de ClawAI peut recourir au catalogue d'OpenAI ou à celui de Google pour une requête donnée, ou vous pouvez en fixer un directement en mode Manual Model.",
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont appliqués par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic vs Google : comment ClawAI route entre eux',
        description:
          'Comment le routeur de ClawAI choisit entre les catalogues de modèles d’Anthropic et de Google pour une requête donnée — classe de coût, adéquation au mode raisonnement, et fixation manuelle. Aucun vainqueur désigné. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'Anthropic vs Google Gemini',
          'routeur ClawAI Anthropic Google',
          'choisir entre les modèles Claude et Gemini',
        ],
      },
      eyebrow: 'Routage de modèles',
      title: 'Anthropic vs Google : comment ClawAI route entre eux',
      summary:
        "Le catalogue d'Anthropic va de standard jusqu'au niveau de coût le plus élevé ; le catalogue Gemini de Google va d'économique à premium. Cette page explique ce que cette différence de forme signifie pour la façon dont le routeur de ClawAI choisit entre eux — pas lequel est le meilleur.",
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: 'Les deux catalogues couvrent des parts différentes de la gamme de coût',
          paragraphs: [
            "Les modèles intégrés d'Anthropic se situent dans les classes de coût standard, premium et la plus élevée, sans entrée de niveau économique aujourd'hui ; le catalogue Gemini de Google descend jusqu'à un niveau économique. Cette différence de forme, et non un jugement de capacité, est l'un des éléments qu'une décision de routage sensible au coût pèse lorsqu'une requête a un budget serré face à une autre où le coût compte moins.",
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: 'Les deux catalogues incluent des modèles orientés raisonnement',
          paragraphs: [
            "Anthropic et Google publient chacun au moins un modèle dans leur catalogue conçu pour traiter un problème par étapes plutôt que de répondre immédiatement. Le mode de routage High Reasoning de ClawAI peut privilégier un modèle adapté de l'une ou l'autre famille pour ce type de requête ; lequel il retient précisément dépend de la disponibilité et des autres besoins de la requête, pas d'une préférence fixe pour un fournisseur.",
          ],
        },
        {
          id: 'overriding-the-router',
          heading: 'Surclasser le routeur vous-même',
          paragraphs: [
            'Le mode Manual Model permet de fixer directement un modèle Anthropic ou Google précis, ce qui est le bon choix pour une tâche récurrente dont vous savez déjà quel modèle convient — un flux de travail documenté, un style connu, une intégration précise — plutôt que de laisser le routage automatique décider à chaque fois.',
          ],
        },
      ],
      faq: [
        {
          question: 'Anthropic ou Google Gemini, lequel est le meilleur ?',
          answer:
            "Cette page n'en désigne pas — les deux catalogues couvrent des parts différentes de la gamme de coût et incluent chacun des modèles orientés raisonnement. Consultez comment évaluer les modèles IA, lié ci-dessous, pour vérifier une adéquation avec votre propre charge de travail.",
        },
        {
          question: 'Le mode High Reasoning de ClawAI privilégie-t-il l’un de ces fournisseurs ?',
          answer:
            "Aucune préférence fixe — le routage High Reasoning peut privilégier un modèle adapté de l'un ou l'autre catalogue selon la disponibilité et les besoins de la requête.",
        },
        {
          question: 'Puis-je fixer un modèle Claude ou Gemini pour une tâche récurrente précise ?',
          answer:
            "Oui — le mode Manual Model permet de fixer directement un modèle précis de l'un ou l'autre fournisseur, ce qui est un choix raisonnable une fois que vous connaissez l'adéquation d'une tâche plutôt que de vous reposer sur le routage automatique à chaque fois.",
        },
      ],
      productNote:
        "Le routage High Reasoning de ClawAI peut privilégier un modèle adapté du catalogue d'Anthropic ou de celui de Google, ou vous pouvez en fixer un directement en mode Manual Model.",
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont appliqués par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI vs DeepSeek : comment ClawAI route entre eux',
        description:
          'Comment la classe de coût oriente le routeur de ClawAI entre les catalogues d’OpenAI et de DeepSeek, et comment le routage Cost Saver et le mode Manual Model s’appliquent à cette paire. Aucun vainqueur désigné. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'OpenAI vs DeepSeek',
          'routeur ClawAI OpenAI DeepSeek',
          'alternative moins chère à OpenAI',
        ],
      },
      eyebrow: 'Routage de modèles',
      title: 'OpenAI vs DeepSeek : comment ClawAI route entre eux',
      summary:
        "Le catalogue d'OpenAI va d'économique à premium ; les modèles intégrés de DeepSeek se situent dans la classe de coût standard. Cette page détaille ce que cette différence de classe de coût signifie pour le routage d'une requête entre les deux, sans désigner l'un ou l'autre comme le meilleur fournisseur.",
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading: 'La classe de coût est la différence la plus nette entre ces deux catalogues',
          paragraphs: [
            "Les deux modèles intégrés de DeepSeek — un modèle de conversation générale et un modèle orienté raisonnement — se situent tous deux dans la classe de coût standard de ClawAI. Le catalogue d'OpenAI couvre une gamme plus large, d'un niveau économique jusqu'à premium. Pour une requête sensible au coût, cela fait du catalogue de DeepSeek un point de départ raisonnable, même si les propres modèles de niveau économique d'OpenAI se situent dans la même classe de coût et méritent aussi d'être pesés — la comparaison porte sur les classes de coût, pas sur les fournisseurs dans leur ensemble.",
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'Le mode de routage Cost Saver de ClawAI',
          paragraphs: [
            "Cost Saver est l'un des sept modes de routage de ClawAI, conçu pour privilégier un modèle de classe de coût inférieure lorsqu'une requête n'a pas besoin d'un modèle premium. Il peut recourir à l'un ou l'autre catalogue selon quel modèle correspond réellement à la requête à cette classe de coût, plutôt que de par défaut se tourner vers un fournisseur en particulier.",
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: 'Une option orientée raisonnement existe dans les deux catalogues',
          paragraphs: [
            "DeepSeek publie un modèle conçu spécifiquement pour traiter un problème par étapes, dans la même classe de coût standard que son modèle de conversation générale ; OpenAI publie des modèles orientés raisonnement dans ses niveaux standard et premium. Le routage High Reasoning peut recourir à l'un ou l'autre, et lequel convient à une tâche précise à plusieurs étapes mérite d'être vérifié directement plutôt que supposé à partir de la seule classe de coût.",
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeek est-il une alternative moins chère à OpenAI ?',
          answer:
            'Les modèles intégrés de DeepSeek se situent dans la classe de coût standard de ClawAI, et OpenAI publie lui aussi des modèles de niveau économique et standard — la comparaison équitable porte donc sur la classe de coût, pas sur le fournisseur. Vérifiez le prix actuel de tout modèle précis sur la page tarifs.',
        },
        {
          question: 'Le mode Cost Saver de ClawAI privilégie-t-il DeepSeek ?',
          answer:
            'Aucune préférence fixe — le routage Cost Saver privilégie le modèle disponible qui correspond à une classe de coût inférieure pour la requête, quel que soit le catalogue dont il provient.',
        },
        {
          question: 'DeepSeek dispose-t-il d’un modèle orienté raisonnement comme celui d’OpenAI ?',
          answer:
            'Oui — DeepSeek publie un modèle conçu pour traiter un problème par étapes, dans la même classe de coût que son modèle de conversation générale. OpenAI publie lui aussi des modèles orientés raisonnement, sur une gamme de coût plus large.',
        },
      ],
      productNote:
        "Le routage Cost Saver de ClawAI peut privilégier un modèle de classe de coût inférieure du catalogue d'OpenAI ou de celui de DeepSeek, ou vous pouvez en fixer un directement en mode Manual Model.",
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont appliqués par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI vs xAI : comment ClawAI route entre eux',
        description:
          'Comment le routeur de ClawAI choisit entre les catalogues d’OpenAI et de Grok de xAI pour une requête donnée — classe de coût et fixation manuelle. Aucun vainqueur désigné. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'OpenAI vs xAI Grok',
          'routeur ClawAI OpenAI xAI',
          'choisir entre les modèles GPT et Grok',
        ],
      },
      eyebrow: 'Routage de modèles',
      title: 'OpenAI vs xAI : comment ClawAI route entre eux',
      summary:
        "Le catalogue d'OpenAI va d'économique à premium ; le catalogue Grok de xAI dans ClawAI va lui aussi d'économique à premium, avec moins de modèles intégrés au total. Cette page explique ce que le routeur de ClawAI pèse entre les deux, sans désigner l'un ou l'autre comme le meilleur fournisseur.",
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: 'Un catalogue plus restreint ne veut pas dire une gamme de coût plus étroite',
          paragraphs: [
            "Le catalogue intégré de xAI dans ClawAI est plus restreint que celui d'OpenAI — deux modèles contre six pour OpenAI — mais couvre tout de même un modèle de niveau économique et un modèle de niveau premium, la même gamme de classes de coût que le catalogue d'OpenAI couvre à ses extrêmes. Une décision de routage entre eux pèse la classe de coût du modèle précis face au budget de la requête, pas la taille du catalogue de l'un ou l'autre fournisseur.",
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Comment ClawAI route une requête entre eux',
          paragraphs: [
            "En mode Auto, le routeur de ClawAI peut envoyer une requête vers un modèle adapté de l'un ou l'autre catalogue. Le mode Cost Saver privilégie l'option de classe de coût inférieure, quel que soit le fournisseur. Le mode Manual Model permet de fixer directement un modèle OpenAI ou xAI précis si vous savez déjà lequel une tâche nécessite.",
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Ce que cette page n’affirme pas',
          paragraphs: [
            'Cette page ne fait aucune revendication de vitesse ni aucun classement de capacité entre ces deux fournisseurs — aucune page de ce site ne le fait. Consultez comment évaluer les modèles IA, lié ci-dessous, pour une méthode permettant de vérifier une adéquation avec votre propre charge de travail à la place.',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI ou xAI Grok, lequel est le meilleur ?',
          answer:
            "Cette page ne le dit pas — les deux publient des modèles sur une gamme de classes de coût similaire, et aucun benchmark fiable ne tranche l'adéquation pour toutes les tâches. Consultez comment évaluer les modèles IA, lié ci-dessous.",
        },
        {
          question: 'ClawAI route-t-il automatiquement entre les modèles OpenAI et xAI ?',
          answer:
            "En mode Auto ou Cost Saver, oui — le routeur peut envoyer une requête vers un modèle adapté de l'un ou l'autre catalogue. Vous pouvez aussi fixer un modèle précis de l'un ou l'autre fournisseur en mode Manual Model.",
        },
        {
          question: 'xAI a-t-il autant de modèles dans le catalogue de ClawAI qu’OpenAI ?',
          answer:
            "Non — le catalogue intégré de xAI est plus restreint, deux modèles contre six pour OpenAI, même s'il couvre une gamme de classes de coût similaire. Vérifiez le catalogue en direct sur la page tarifs.",
        },
      ],
      productNote:
        "Le routage Auto et Cost Saver de ClawAI peut recourir au catalogue d'OpenAI ou à celui de xAI pour une requête donnée, ou vous pouvez en fixer un directement en mode Manual Model.",
      catalogDisclaimer:
        "La disponibilité des modèles et les quotas sont appliqués par votre plan et le catalogue en direct, pas par cette page. Vérifiez le catalogue en direct sur la page tarifs avant de choisir un plan construit autour d'un modèle précis.",
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: 'Cloud vs local : comment ClawAI route entre eux',
        description:
          'Ce qui change quand une requête reste sur du matériel que vous contrôlez plutôt que chez un fournisseur cloud, et comment les modes de routage Local-Only et Privacy-First de ClawAI s’appliquent à ce choix. Aucun vainqueur désigné. Vérifiez le catalogue en direct avant de choisir un plan.',
        keywords: [
          'IA cloud vs IA locale',
          'routage Local-Only ClawAI',
          'quand exécuter un modèle localement plutôt que dans le cloud',
        ],
      },
      eyebrow: 'Routage de modèles',
      title: 'Cloud vs local : comment ClawAI route entre eux',
      summary:
        "C'est la seule paire de ce groupe définie par l'endroit où s'exécute une requête, pas par le fournisseur qui y répond. Chaque famille cloud à laquelle ClawAI se connecte — OpenAI, Anthropic, Google, DeepSeek, xAI — exécute un modèle sur sa propre infrastructure ; Ollama et llama.cpp exécutent au contraire un modèle à poids ouverts sur du matériel que vous contrôlez. Cette page explique ce que cela change et comment le routeur de ClawAI traite ce choix, compte tenu de la conception local-first propre à ClawAI.",
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: 'Ce qui change réellement quand une requête reste locale',
          paragraphs: [
            "Un fournisseur cloud exécute un modèle sur sa propre infrastructure et facture par requête ; Ollama et llama.cpp chargent au contraire un modèle à poids ouverts sur du matériel que vous contrôlez, si bien que la requête n'atteint jamais un fournisseur cloud. Cela change qui peut voir la requête, pas ce dont un modèle précis est capable — consultez l'IA locale, sur la page des fournisseurs de modèles, pour le mécanisme complet.",
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading:
            'Les modes de routage Local-Only et Privacy-First de ClawAI existent pour ce choix',
          paragraphs: [
            "Le routage Local-Only garde chaque requête sur du matériel que vous contrôlez via Ollama ou llama.cpp, sans jamais atteindre l'une des cinq familles cloud couvertes par ce groupe de pages. Le routage Privacy-First est un mode distinct avec ses propres priorités. Les deux existent précisément parce que toutes les charges de travail ne doivent pas basculer par défaut sur le routage Auto, qui peut recourir à n'importe quel fournisseur connecté, cloud ou local, selon la requête.",
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: 'Quand une charge de travail est candidate à rester locale',
          paragraphs: [
            "Une requête est un candidat raisonnable pour le routage Local-Only ou Privacy-First lorsque l'exigence est qu'elle ne quitte jamais le matériel que vous contrôlez — une contrainte de conformité, une exigence de confidentialité client, ou simplement une préférence pour ne pas envoyer certaines données à un fournisseur externe. Consultez qu'est-ce que l'IA local-first, lié ci-dessous, pour réfléchir à l'arbitrage entre un modèle à poids ouverts que vous exécutez vous-même et le catalogue d'un fournisseur cloud.",
          ],
        },
      ],
      faq: [
        {
          question: 'Un modèle local est-il aussi capable qu’un modèle cloud ?',
          answer:
            "Cette page ne les classe pas — la capacité dépend du modèle à poids ouverts précis que vous choisissez d'exécuter, ce qui relève de votre décision, pas d'une comparaison fixe que cette page pourrait faire de façon responsable. Consultez qu'est-ce que l'IA local-first, lié ci-dessous.",
        },
        {
          question: 'Comment ClawAI décide-t-il de garder une requête locale ?',
          answer:
            "Il ne décide pas pour vous par défaut — le routage Local-Only garde chaque requête sur du matériel que vous contrôlez, et le routage Privacy-First applique ses propres priorités ; le routage Auto peut recourir à n'importe quel fournisseur connecté, cloud ou local. Vous choisissez le mode utilisé par un espace de travail ou une requête.",
        },
        {
          question: 'Exécuter un modèle localement coûte-t-il quelque chose via ClawAI ?',
          answer:
            "ClawAI ne facture pas de tarif au token pour un modèle exécuté localement comme il le fait pour un fournisseur cloud, puisqu'aucun fournisseur cloud n'est sollicité — le coût est le matériel que vous exploitez déjà. Vérifiez le comportement actuel du plan sur la page tarifs.",
        },
      ],
      productNote:
        'Le mode de routage Local-Only de ClawAI garde chaque requête sur du matériel que vous contrôlez via Ollama ou llama.cpp — un connecteur réel et déployé, pas un élément de feuille de route — aux côtés du routage Privacy-First pour un autre ensemble de priorités.',
      catalogDisclaimer:
        "Aucun modèle cloud ou local précis n'est classé ici, volontairement — les modèles à poids ouverts et chaque catalogue cloud évoluent selon leur propre calendrier, et c'est vous qui choisissez lequel exécuter ou connecter. Vérifiez le comportement du plan pour les charges de travail locales sur la page tarifs.",
    },
  },
};
