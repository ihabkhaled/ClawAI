import { LearnTopic } from '@/enums/learn-topic.enum';
import type { LearnDictionary } from '@/types/learn.types';

export const FR_LEARN_CONTENT: LearnDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'Pour aller plus loin',
    lastReviewed: 'Dernière vérification',
    backToHub: 'Toutes les explications',
    ctaTitle: 'Essayez plutôt que de lire',
    ctaBody:
      'ClawAI réunit ces techniques dans un seul espace de travail : vous pouvez envoyer le même prompt à plusieurs modèles et constater vous-même la différence.',
    startFree: 'Commencer avec l’offre gratuite',
    seeFeatures: 'Voir ce que fait ClawAI',
  },
  hub: {
    seo: {
      title: 'Comprendre l’IA multimodèle, le routage et l’orchestration',
      description:
        'Des explications claires des techniques derrière l’IA multimodèle : routage, consensus, vérification, RAG, mémoire et modèles à poids ouverts sur votre matériel.',
      keywords: ['orchestration de LLM', 'routage de modèles IA', 'IA multimodèle'],
    },
    eyebrow: 'Explications',
    title: 'Comment fonctionne vraiment l’IA multimodèle',
    summary:
      'Des explications courtes et concrètes des idées derrière l’envoi d’un prompt à plusieurs modèles : ce que fait chaque technique, quand elle vaut son coût et quand un seul modèle reste la meilleure réponse. Sans benchmarks de fournisseur ni chiffres inventés.',
    topicsHeading: 'Choisissez un concept',
    cardSummaries: {
      [LearnTopic.WHAT_IS_MULTI_MODEL_AI]:
        'Utiliser plusieurs modèles dans un même flux plutôt que de s’enfermer dans un seul.',
      [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]:
        'La couche qui décide quel modèle s’exécute, dans quel ordre et ce qu’il advient du résultat.',
      [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]:
        'Envoyer chaque requête à un modèle choisi selon la tâche, le coût, la confidentialité ou la latence.',
      [LearnTopic.WHAT_IS_MODEL_FALLBACK]:
        'Ce qui doit se passer quand le premier modèle tombe, est limité ou refuse.',
      [LearnTopic.WHAT_IS_AI_CONSENSUS]:
        'Poser la même question à plusieurs modèles et traiter leur accord comme un signal.',
      [LearnTopic.WHAT_IS_BEST_OF_N]:
        'Produire plusieurs réponses candidates et garder la meilleure.',
      [LearnTopic.WHAT_IS_AN_AI_JUDGE]:
        'Faire noter par un modèle les réponses des autres, et là où cela échoue.',
      [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]:
        'Contrôler une réponse avec autre chose que le modèle qui l’a produite.',
      [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]:
        'La mémoire de travail d’une seule requête, et pourquoi ce n’est pas de la mémoire.',
      [LearnTopic.WHAT_IS_RAG]: 'Retrouver vos propres documents et les placer devant le modèle.',
      [LearnTopic.WHAT_IS_AI_MEMORY]:
        'Ce qui persiste entre les conversations, et ce que cela coûte.',
      [LearnTopic.WHAT_ARE_CONTEXT_PACKS]:
        'Des ensembles de contexte réutilisables que vous joignez volontairement à une conversation.',
      [LearnTopic.WHAT_IS_LOCAL_AI]:
        'Faire tourner un modèle sur du matériel que vous contrôlez, et ce que cela change vraiment.',
      [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]:
        'Des modèles dont vous pouvez télécharger les poids — et ce qu’« ouvert » veut dire ou non.',
      [LearnTopic.WHAT_IS_SELF_HOSTED_AI]:
        'Héberger toute l’application vous-même, pas seulement le modèle.',
      [LearnTopic.OLLAMA_VS_LLAMACPP]:
        'Deux façons d’exécuter des modèles à poids ouverts en local, et à quoi sert chacune.',
      [LearnTopic.CLOUD_AI_VS_LOCAL_AI]:
        'Le vrai compromis : capacité et confort contre contrôle et forme du coût.',
      [LearnTopic.AI_AGENT_VS_AI_CHATBOT]:
        'La différence entre vous répondre et agir à votre place.',
    },
  },
  topics: {
    [LearnTopic.WHAT_IS_MULTI_MODEL_AI]: {
      seo: {
        title: 'Qu’est-ce que l’IA multimodèle ?',
        description:
          'L’IA multimodèle consiste à utiliser plusieurs modèles de langage dans un même flux plutôt qu’un seul. Ce qu’elle résout, ce qu’elle coûte, quand un seul suffit.',
        keywords: ['IA multimodèle', 'plusieurs modèles IA', 'choix de modèle'],
      },
      eyebrow: 'Fondamentaux',
      title: 'Qu’est-ce que l’IA multimodèle ?',
      summary:
        'L’IA multimodèle traite les modèles de langage comme des pièces interchangeables au lieu d’en choisir un et de tout construire autour. La même question peut aller à un modèle rapide et bon marché, à un modèle de raisonnement lourd ou à un modèle tournant sur votre matériel — le choix se fait par requête et non une fois pour toutes à l’achat.',
      sections: [
        {
          id: 'the-problem',
          heading: 'Le problème qu’elle résout',
          paragraphs: [
            'Les modèles ne sont pas uniformément meilleurs ou pires les uns que les autres. L’un écrit du code plus propre, un autre suit plus fidèlement les longs documents, un troisième répond en une fraction du temps pour une fraction du coût. S’enfermer chez un fournisseur, c’est accepter son point faible sur toutes vos tâches.',
            'C’est aussi accepter ses pannes, ses limites de débit, ses changements de prix et ses retraits. Quand un modèle dont vous dépendez est retiré, un flux à modèle unique doit être refait. Un flux multimodèle change un réglage.',
          ],
        },
        {
          id: 'what-it-looks-like',
          heading: 'À quoi cela ressemble en pratique',
          paragraphs: [
            'Dans sa forme la plus simple, l’IA multimodèle est un menu déroulant : vous choisissez le modèle par conversation. C’est déjà utile, et c’est là que la plupart commencent.',
            'Cela devient plus intéressant quand le choix est automatique — quand un routeur lit la requête et l’envoie au bon endroit — et davantage encore quand plusieurs modèles répondent en même temps et que leurs réponses sont comparées, notées ou fusionnées. Ce sont des techniques distinctes, chacune avec son coût, et chacune a sa page ici.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Ce que cela coûte',
          paragraphs: [
            'Chaque modèle ajouté, c’est un compte fournisseur de plus, un jeu d’identifiants de plus, une relation de facturation de plus et un format de données d’usage de plus. Cette charge est l’argument honnête contre le multimodèle, et c’est pourquoi peu d’équipes le font à la main.',
            'Faire tourner plusieurs modèles sur le même prompt multiplie son coût en tokens. Des techniques comme le consensus ou le meilleur de N valent leur prix sur les décisions qui comptent et sont du gaspillage sur les questions de routine. Savoir distinguer les deux, c’est l’essentiel du savoir-faire.',
          ],
        },
        {
          id: 'when-one-is-enough',
          heading: 'Quand un seul modèle est la bonne réponse',
          paragraphs: [
            'Si votre charge est étroite et qu’un modèle la traite bien, en ajouter d’autres n’apporte que de la complexité. L’approche multimodèle paie quand les tâches sont variées, quand le coût par tâche varie d’un ordre de grandeur entre vos requêtes, ou quand une partie de vos données ne peut tout simplement pas partir chez un tiers.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’IA multimodèle, n’est-ce pas juste une passerelle d’API ?',
          answer:
            'Une passerelle vous donne un point d’entrée unique pour plusieurs fournisseurs, ce qui règle la plomberie. L’IA multimodèle, c’est ce que vous en faites : choisir par requête, comparer les réponses, basculer en cas d’échec. La passerelle est un prérequis, pas la technique.',
        },
        {
          question: 'Plusieurs modèles rendent-ils les réponses plus exactes ?',
          answer:
            'Pas en soi. Envoyer un prompt à trois modèles donne trois réponses, pas une meilleure. L’exactitude ne progresse que si vous ajoutez un moyen de choisir entre elles — accord, notation ou contrôle externe — et chacun a ses propres défauts.',
        },
        {
          question: 'Faut-il plusieurs abonnements ?',
          answer:
            'Si vous allez directement chez chaque fournisseur, oui. Les plateformes qui les regroupent existent en partie pour l’éviter. ClawAI en fait partie : {cloudProviderCount} fournisseurs cloud plus des runtimes locaux sous un seul compte.',
        },
      ],
      productNote:
        'ClawAI est bâti sur cette idée : {cloudProviderCount} fournisseurs cloud et des modèles locaux à poids ouverts dans un même espace, avec le modèle ayant répondu consigné sur chaque message.',
    },
    [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]: {
      seo: {
        title: 'Qu’est-ce que l’orchestration de LLM ?',
        description:
          'L’orchestration de LLM est la couche qui décide quel modèle s’exécute, dans quel ordre et ce qu’il advient du résultat. Sa différence avec le prompting et les agents.',
        keywords: ['orchestration de LLM', 'orchestration IA', 'pipeline de modèles'],
      },
      eyebrow: 'Fondamentaux',
      title: 'Qu’est-ce que l’orchestration de LLM ?',
      summary:
        'L’orchestration, c’est tout ce qui entoure l’appel au modèle. Choisir lequel s’exécute, décider si un appel suffit, passer la sortie d’une étape à la suivante et décider quoi faire quand une étape échoue. Le prompt est une instruction ; l’orchestration est le programme dans lequel elle s’exécute.',
      sections: [
        {
          id: 'not-prompting',
          heading: 'Ce n’est pas de l’ingénierie de prompt',
          paragraphs: [
            'L’ingénierie de prompt améliore un appel isolé. L’orchestration décide du nombre d’appels, des modèles qui les font et de la façon dont les sorties se combinent. On peut avoir d’excellents prompts et aucune orchestration : le système tombe dès qu’un fournisseur passe une mauvaise heure.',
            'La distinction compte parce que les deux s’optimisent différemment. Un meilleur prompt est peu coûteux et améliore un peu la qualité. Une meilleure orchestration coûte des tokens et améliore nettement la fiabilité.',
          ],
        },
        {
          id: 'what-it-decides',
          heading: 'Ce que décide une couche d’orchestration',
          paragraphs: [
            'Quel modèle. S’il faut en interroger plusieurs. S’il faut vérifier la réponse avant de la rendre. Quoi faire en cas de refus, d’expiration ou de limite de débit. Si la sortie de cette étape devient l’entrée de la suivante. Si l’ensemble est abordable avant de démarrer.',
            'Chacun de ces points est une politique, et chacune peut être fausse indépendamment. C’est pourquoi il vaut la peine de nommer l’orchestration comme une couche à part plutôt que d’éparpiller les décisions dans le code applicatif.',
          ],
        },
        {
          id: 'techniques',
          heading: 'Les techniques courantes',
          paragraphs: [
            'Le routage envoie une requête à un modèle adapté. Le repli gère l’échec. Le consensus interroge plusieurs modèles et observe l’accord. Le meilleur de N produit des candidats et en garde un. Un juge note les réponses. La vérification confronte une affirmation à quelque chose d’extérieur au modèle. Les pipelines enchaînent les étapes. La décomposition découpe une grande requête en plus petites.',
            'ClawAI en implémente neuf comme modes d’orchestration distincts, plus le juge et la comparaison comme surfaces propres. Chacune a ici une page qui explique ce qu’elle est avant que vous décidiez si vous la voulez.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quand ne pas orchestrer',
          paragraphs: [
            'L’orchestration multiplie coût et latence. Un consensus sur trois modèles coûte environ trois fois les tokens et dure aussi longtemps que le plus lent. Pour une question dont vous vérifiez la réponse d’un coup d’œil, c’est un mauvais calcul.',
            'La règle qui tient : orchestrez quand se tromper coûte cher et vérifier est difficile. Sinon, envoyez une requête à un modèle et lisez la réponse.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’orchestration est-elle la même chose qu’un framework d’agents ?',
          answer:
            'Cela se recoupe sans être identique. Un agent décide lui-même de son étape suivante, souvent avec des outils. L’orchestration est la politique qui l’entoure — quel modèle, combien, quoi faire en cas d’échec — et s’applique tout autant à un flux sans le moindre agent.',
        },
        {
          question: 'Faut-il un framework pour orchestrer ?',
          answer:
            'Non. Réessayer avec un autre modèle est déjà de l’orchestration. Les frameworks aident quand les politiques deviennent assez nombreuses pour que vous les réimplémentiez sinon fonctionnalité par fonctionnalité.',
        },
        {
          question: 'Combien cela coûte-t-il ?',
          answer:
            'En tokens, à peu près proportionnellement au nombre d’appels que fait la politique. Un appel routé coûte à peu près comme un appel non routé ; un consensus sur trois modèles environ trois fois plus. Le coût est prévisible, ce qui en fait une décision de budget et non un pari.',
        },
      ],
      productNote:
        'ClawAI exécute {orchestrationLabCount} modes d’orchestration à côté du chat ordinaire et consigne les modèles utilisés par chaque exécution : le coût d’une technique se voit au lieu de se deviner.',
    },
    [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]: {
      seo: {
        title: 'Qu’est-ce que le routage de modèles IA ?',
        description:
          'Le routage envoie chaque requête à un modèle choisi selon la tâche, le coût, la confidentialité ou la latence. Comment les routeurs décident, et comment ils échouent.',
        keywords: ['routage de modèles IA', 'routeur LLM', 'sélection de modèle'],
      },
      eyebrow: 'Routage',
      title: 'Qu’est-ce que le routage de modèles IA ?',
      summary:
        'Un routeur examine une requête avant son exécution et choisit le modèle qui doit répondre. L’idée : le bon modèle change selon la requête. Une question d’une ligne et une refonte de mille lignes ne méritent pas le même modèle, et payer un tarif de pointe pour les deux n’est un choix délibéré de personne.',
      sections: [
        {
          id: 'how-decisions-are-made',
          heading: 'Sur quoi décide un routeur',
          paragraphs: [
            'La plupart combinent quelques signaux : le type de tâche apparent, la longueur de l’entrée, la sensibilité des données, la rapidité attendue et le coût autorisé.',
            'Ces signaux se contredisent. Le modèle le plus rapide est rarement le plus puissant ; l’option la plus confidentielle est rarement la plus capable. Un routeur est en réalité une politique sur ce qu’on sacrifie : les bons vous laissent dire ce qui compte plutôt que de le deviner.',
          ],
        },
        {
          id: 'automatic-vs-explicit',
          heading: 'Routage automatique et explicite',
          paragraphs: [
            'Le routage automatique lit la requête et décide. C’est pratique et parfois faux, et l’erreur est difficile à repérer si le système ne dit pas quel modèle a répondu.',
            'Le routage explicite signifie que vous fixez la priorité — cela reste en local, cela reste bon marché, pour cela le meilleur raisonnement — et que le routeur s’y tient. En pratique, la plupart veulent les deux : un défaut raisonnable et la possibilité de le contourner pour la requête du moment.',
          ],
        },
        {
          id: 'failure-modes',
          heading: 'Comment le routage déraille',
          paragraphs: [
            'Les deux défaillances courantes sont les déclassements silencieux et les décisions invisibles. Un déclassement silencieux, c’est un routeur qui envoie discrètement votre requête soignée à un modèle bon marché. Une décision invisible, c’est tout routage que vous ne pouvez pas auditer après coup.',
            'Les deux se corrigent pareil : le système doit consigner le modèle qui a réellement répondu, et l’afficher. Un routeur qu’on ne peut pas inspecter est indiscernable d’un routeur cassé.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Comment ClawAI procède',
          paragraphs: [
            'ClawAI propose {routingModeCount} modes de routage. Auto lit la requête et choisit. Manuel fixe un modèle. Local seul garde toute la chaîne sur des modèles tournant sur votre matériel. Confidentialité d’abord privilégie le local et refuse d’en sortir silencieusement. Les autres orientent le choix vers moins de latence, un meilleur raisonnement ou un coût plus bas.',
            'Chaque réponse consigne le modèle qui l’a produite : une décision automatique se vérifie au lieu de se croire.',
          ],
        },
      ],
      faq: [
        {
          question: 'Le routage dégrade-t-il la qualité des réponses ?',
          answer:
            'Il le peut, si la politique ne convient pas à la requête. C’est pourquoi le mode vous appartient et pourquoi le modèle ayant répondu est affiché. Un routage que vous voyez et pouvez contourner est un contrôle de coût ; un routage invisible est un déclassement.',
        },
        {
          question: 'Un routeur peut-il tenir les données hors du cloud ?',
          answer:
            'Seulement s’il a le droit de refuser plutôt que de basculer. Un mode « local seul » dont la chaîne de repli atteint un fournisseur cloud n’est pas un contrôle de confidentialité. Le mode local seul de ClawAI garde sa chaîne chez des fournisseurs locaux.',
        },
        {
          question: 'Le routage vaut-il le coup pour une seule personne ?',
          answer:
            'Le plus souvent oui, pour le coût plus que pour la fiabilité. La plupart des usages individuels sont surtout des questions de routine avec quelques questions difficiles ; envoyer les questions de routine à un modèle moins cher est le plus gros levier sur une facture personnelle.',
        },
      ],
      productNote:
        'ClawAI livre {routingModeCount} modes de routage et affiche le modèle retenu sur chaque message : vous pouvez vérifier le routeur au lieu de lui faire confiance.',
    },
    [LearnTopic.WHAT_IS_MODEL_FALLBACK]: {
      seo: {
        title: 'Qu’est-ce que le repli entre modèles ?',
        description:
          'Le repli, c’est ce qui se passe quand le premier modèle échoue : en panne, limité ou refusant. Comment fonctionnent les chaînes de repli et pourquoi le repli silencieux est dangereux.',
        keywords: ['repli de modèle', 'bascule LLM', 'fiabilité IA'],
      },
      eyebrow: 'Routage',
      title: 'Qu’est-ce que le repli entre modèles ?',
      summary:
        'Le repli répond à « que se passe-t-il quand le modèle voulu n’est pas disponible ». Les fournisseurs ont des pannes, des limites de débit, des refus de contenu et des expirations. Une chaîne de repli est une liste ordonnée de ce qu’il faut essayer ensuite, et cet ordre encode ce que vous acceptez de sacrifier.',
      sections: [
        {
          id: 'why-needed',
          heading: 'Pourquoi ce n’est pas optionnel',
          paragraphs: [
            'Un flux à fournisseur unique hérite exactement de sa disponibilité. Les limites de débit en particulier ne sont pas des événements rares : elles sont la conséquence normale d’une heure chargée, et un flux sans repli s’arrête simplement.',
            'Le repli transforme un échec net en réponse dégradée. Que ce soit une amélioration dépend entièrement du fait qu’on vous le dise.',
          ],
        },
        {
          id: 'what-to-fall-back-to',
          heading: 'Choisir l’ordre',
          paragraphs: [
            'L’ordre intuitif est « le modèle suivant », mais il est souvent mauvais. Si le premier choix a échoué parce que la requête était trop longue, un modèle plus petit échouera aussi. S’il a refusé pour des raisons de contenu, un modèle semblable refusera pareillement.',
            'Un ordre plus utile change quelque chose de structurel : un tout autre fournisseur, ou un modèle local avec d’autres règles, plutôt qu’un cousin qui échouera de la même façon.',
          ],
        },
        {
          id: 'silent-fallback',
          heading: 'La variante dangereuse',
          paragraphs: [
            'Le repli silencieux, c’est un système qui répond discrètement avec un autre modèle sans rien dire. Vous obtenez une moins bonne réponse, que vous attribuez mentalement au modèle choisi, et vous tirez une conclusion fausse sur ce modèle.',
            'Quand le repli franchit une frontière de confidentialité, c’est pire qu’une conclusion fausse. Passer d’un modèle local à un fournisseur cloud envoie des données précisément là où l’utilisateur avait choisi de ne pas aller. Une chaîne pouvant quitter l’exécution locale devrait être une chaîne explicitement acceptée.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Comment ClawAI procède',
          paragraphs: [
            'Les modes de routage définissent leurs propres chaînes, et le mode local seul garde la sienne chez des fournisseurs locaux au lieu d’aller chercher un modèle cloud quand le local est occupé. Chaque message consigne le modèle qui a réellement répondu : un repli se voit après coup au lieu de se deviner à un changement de ton.',
          ],
        },
      ],
      faq: [
        {
          question: 'Le repli est-il la même chose qu’une nouvelle tentative ?',
          answer:
            'Une nouvelle tentative renvoie la même requête au même modèle, ce qui aide sur une erreur passagère. Le repli change de modèle, ce qui aide quand le premier ne peut pas traiter la requête du tout. Les systèmes robustes font les deux, dans cet ordre.',
        },
        {
          question: 'Le repli doit-il jamais passer du local au cloud ?',
          answer:
            'Seulement si l’utilisateur l’a demandé. L’exécution locale est en général choisie pour une raison qu’un repli ne peut pas respecter : le plus sûr est d’échouer et de le dire plutôt que de réussir ailleurs.',
        },
        {
          question: 'Combien de modèles dans une chaîne ?',
          answer:
            'Deux ou trois suffisent généralement. Les longues chaînes ajoutent surtout de la latence, car chaque tentative ratée se paie en temps avant que la suivante commence.',
        },
      ],
      productNote:
        'Les modes de routage de ClawAI portent leurs propres chaînes de repli, et le mode local seul garde la sienne en local au lieu d’atteindre silencieusement un fournisseur cloud.',
    },
    [LearnTopic.WHAT_IS_AI_CONSENSUS]: {
      seo: {
        title: 'Qu’est-ce que le consensus entre modèles IA ?',
        description:
          'Le consensus pose la même question à plusieurs modèles et traite leur accord comme un signal. Ce que l’accord dit et ne dit pas, et quand le coût se justifie.',
        keywords: ['consensus IA', 'accord entre modèles', 'ensemble de LLM'],
      },
      eyebrow: 'Orchestration',
      title: 'Qu’est-ce que le consensus entre modèles IA ?',
      summary:
        'Le consensus fait passer un prompt par plusieurs modèles et compare les réponses. Là où elles concordent, vous avez un signal faible que la réponse n’est pas un artefact d’un seul modèle. Là où elles divergent, vous avez quelque chose de plus utile : le signalement d’une question plus difficile qu’elle n’en avait l’air.',
      sections: [
        {
          id: 'what-agreement-means',
          heading: 'Ce que l’accord dit vraiment',
          paragraphs: [
            'L’accord est un indice, pas une preuve. Des modèles entraînés sur des données qui se recoupent partagent des biais et peuvent se tromper avec aplomb dans la même direction. Trois modèles d’accord sur un fait faux est un résultat courant, pas rare.',
            'Le signal est plus fort quand les modèles sont réellement différents — éditeurs différents, entraînements différents, tailles différentes. Un consensus entre trois variantes d’une même famille ne vaut presque rien.',
          ],
        },
        {
          id: 'disagreement-is-the-value',
          heading: 'Le désaccord est la sortie la plus utile',
          paragraphs: [
            'La valeur pratique du consensus tient surtout au cas négatif. Quand les modèles divergent, vous avez localisé une question qui demande un humain — et les localiser à bas coût vaut mieux qu’un gain marginal de confiance sur les questions déjà faciles.',
            'Cela recadre son usage. Le consensus n’est pas une amélioration appliquée à tout ; c’est un outil de tri appliqué là où l’erreur coûte cher.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Le coût',
          paragraphs: [
            'Faire tourner trois modèles coûte environ trois fois les tokens et dure aussi longtemps que le plus lent. Sur une question de routine, c’est du gaspillage pur. Sur une clause contractuelle, un plan de migration ou un résumé médical sur lequel vous comptez agir, c’est bon marché.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quand ne pas l’utiliser',
          paragraphs: [
            'N’utilisez pas le consensus pour des questions à réponse vérifiable. Si du code compile ou non, exécutez-le : c’est un signal plus fort que trois modèles d’accord. Le consensus sert aux questions de jugement pour lesquelles il n’existe pas de contrôle externe bon marché.',
          ],
        },
      ],
      faq: [
        {
          question: 'Combien de modèles faut-il ?',
          answer:
            'Trois est le choix habituel : deux ne peuvent qu’être d’accord ou non, tandis que trois montrent la forme du désaccord. Au-delà de trois, la décision change rarement et la facture se multiplie.',
        },
        {
          question: 'Le consensus empêche-t-il les hallucinations ?',
          answer:
            'Non. Il attrape les hallucinations propres à un modèle et laisse passer celles que plusieurs partagent. C’est un filtre, pas une garantie.',
        },
        {
          question: 'Est-ce la même chose que le meilleur de N ?',
          answer:
            'Non. Le consensus compare les réponses de modèles différents pour voir si elles concordent. Le meilleur de N produit plusieurs candidates et en choisit une. Le consensus mesure l’accord ; le meilleur de N sélectionne la qualité.',
        },
      ],
      productNote:
        'Le consensus est l’un des {orchestrationLabCount} modes d’orchestration de ClawAI, et chaque exécution consigne les modèles utilisés et ce qu’elle a coûté.',
    },
    [LearnTopic.WHAT_IS_BEST_OF_N]: {
      seo: {
        title: 'Qu’est-ce que l’échantillonnage meilleur de N ?',
        description:
          'Le meilleur de N produit plusieurs réponses candidates et garde la meilleure. Comment les candidates sont choisies, pourquoi le sélecteur compte plus que N.',
        keywords: ['meilleur de N', 'échantillonnage de candidates', 'sélection de réponse'],
      },
      eyebrow: 'Orchestration',
      title: 'Qu’est-ce que le meilleur de N ?',
      summary:
        'Le meilleur de N demande plusieurs réponses au même prompt et en garde une. Il exploite le fait que la sortie d’un modèle varie d’une exécution à l’autre : un modèle qui répond bien sept fois sur dix produira, en trois essais, au moins une bonne réponse. La technique vit ou meurt selon la façon dont vous choisissez la gagnante.',
      sections: [
        {
          id: 'why-it-works',
          heading: 'Pourquoi cela fonctionne',
          paragraphs: [
            'La sortie d’un modèle de langage est échantillonnée, pas déterministe. Deux exécutions du même prompt donnent des réponses différentes de qualité variable. Si les bonnes réponses du modèle l’emportent sur les mauvaises, prendre plusieurs échantillons augmente la chance qu’au moins une soit bonne.',
            'C’est tout le mécanisme. Il ne rend pas le modèle plus intelligent ; il vous donne plus de tentatives sur la capacité qu’il a déjà.',
          ],
        },
        {
          id: 'the-selector',
          heading: 'Choisir la gagnante est le plus dur',
          paragraphs: [
            'Produire des candidates est facile. Choisir entre elles est le vrai problème, et c’est là que se logent l’essentiel de la valeur de la technique et l’essentiel de ses échecs.',
            'La sélection par contrôle automatique — cela compile-t-il, les tests passent-ils, le schéma est-il respecté — est de loin la plus fiable, car le contrôle est indépendant du modèle. La sélection par un autre modèle est un juge, avec toutes les réserves de cette page. La sélection humaine est la plus exacte et la moins scalable.',
          ],
        },
        {
          id: 'choosing-n',
          heading: 'Choisir N',
          paragraphs: [
            'Le rendement décroît vite. Passer d’une candidate à trois est une grosse amélioration ; de trois à dix, une petite pour plus du triple du coût. La plupart des usages pratiques se situent entre trois et cinq.',
            'N multiplie le coût exactement. Cinq candidates, c’est cinq fois les tokens de génération, plus ce que coûte la sélection.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quand ne pas l’utiliser',
          paragraphs: [
            'Si vous n’avez aucun moyen de distinguer une bonne réponse d’une mauvaise, le meilleur de N ne peut pas vous aider : vous choisirez au hasard dans un plus grand tas et paierez davantage. Son terrain naturel est le travail à contrôle objectif : code, sortie structurée, tout ce qui s’analyse ou non.',
          ],
        },
      ],
      faq: [
        {
          question: 'Est-ce la même chose qu’augmenter la température ?',
          answer:
            'Non, même si les deux interagissent. La température règle la variété de chaque réponse. Le meilleur de N porte sur le nombre que vous prenez et sur votre façon de choisir. Un peu de variété aide, car des candidates identiques ne laissent rien à départager.',
        },
        {
          question: 'Puis-je utiliser des modèles différents pour les candidates ?',
          answer:
            'Oui, et cela aide souvent : les modèles échouent différemment, donc le lot est plus varié que des échantillons répétés d’un seul. À ce stade vous êtes proche du consensus, avec sélection au lieu d’accord.',
        },
        {
          question: 'Cela aide-t-il pour l’exactitude factuelle ?',
          answer:
            'Seulement si votre sélecteur détecte les erreurs factuelles. Sans contrôle externe, vous choisissez entre des réponses assurées, et l’assurance n’est pas l’exactitude.',
        },
      ],
      productNote:
        'Le meilleur de N est l’un des {orchestrationLabCount} modes d’orchestration de ClawAI, et chaque candidate produite est consignée au regard du coût de l’exécution.',
    },
    [LearnTopic.WHAT_IS_AN_AI_JUDGE]: {
      seo: {
        title: 'Qu’est-ce qu’un juge IA ?',
        description:
          'Un juge IA est un modèle qui note les réponses d’autres modèles. À quoi il sert, quels biais il porte et pourquoi il ne remplace pas un vrai contrôle.',
        keywords: ['juge IA', 'LLM comme juge', 'notation de réponses'],
      },
      eyebrow: 'Orchestration',
      title: 'Qu’est-ce qu’un juge IA ?',
      summary:
        'Un juge est un modèle à qui l’on confie un autre travail : au lieu de répondre à la question, il lit des réponses et les évalue. C’est ainsi que se fait l’essentiel de la sélection automatique entre candidates, et il porte un ensemble de biais bien documentés et faciles à oublier.',
      sections: [
        {
          id: 'what-it-does',
          heading: 'Ce que fait un juge',
          paragraphs: [
            'Un juge reçoit la question d’origine et deux réponses ou plus, et renvoie un classement ou une note, généralement avec une justification. C’est l’étape de sélection du meilleur de N et l’étape d’arbitrage quand les modèles divergent.',
            'L’attrait est évident : cela passe à l’échelle comme la relecture humaine ne le fait pas, et c’est bien moins cher que la personne qu’il remplace.',
          ],
        },
        {
          id: 'the-biases',
          heading: 'Les biais, qui sont constants',
          paragraphs: [
            'Les juges préfèrent les réponses longues aux courtes, même quand la courte est complète. Ils préfèrent la formulation assurée à la formulation nuancée, que l’assurance soit fondée ou non. Ils sont sensibles à l’ordre de présentation des candidates. Et un modèle appelé à juger sa propre sortie tend à la préférer.',
            'Aucun n’est subtil, et tous sont gérables — mélanger l’ordre, prendre un modèle différent comme juge et comme auteur, demander des critères précis plutôt qu’une préférence générale. Mais il faut le faire exprès, car la configuration par défaut présente les quatre.',
          ],
        },
        {
          id: 'not-a-check',
          heading: 'Un juge n’est pas un vérificateur',
          paragraphs: [
            'Un juge compare les réponses entre elles. Il ne les compare pas à la réalité. Devant trois réponses fausses, il les classera avec aplomb, et la gagnante restera fausse.',
            'Là où un contrôle externe existe — tests, schéma, recherche — ce contrôle bat un juge, car il est indépendant de ce qui est jugé. Un juge est ce que vous utilisez quand un tel contrôle n’existe pas.',
          ],
        },
      ],
      faq: [
        {
          question: 'Le juge doit-il être le modèle le plus puissant ?',
          answer:
            'Plutôt un modèle solide, et de préférence pas celui qui a écrit les candidates. L’auto-préférence est réelle et le remède le moins cher est un autre modèle.',
        },
        {
          question: 'Un juge peut-il noter une seule réponse ?',
          answer:
            'Il le peut, mais le jugement comparatif est plus fiable que la notation absolue. Les modèles sont meilleurs pour « laquelle est meilleure » que pour « est-ce un 7 ou un 8 ».',
        },
        {
          question: 'Comment savoir si le juge a raison ?',
          answer:
            'Contrôlez-le par sondage contre votre propre jugement. Si vous ne vérifiez jamais, vous avez déplacé la confiance au lieu de la gagner.',
        },
      ],
      productNote:
        'ClawAI exécute le jugement comme une surface propre au-dessus d’une comparaison : une réponse notée consigne à la fois les modèles ayant écrit les candidates et celui qui les a jugées.',
    },
    [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]: {
      seo: {
        title: 'Qu’est-ce que la vérification des réponses IA ?',
        description:
          'La vérification confronte une réponse à autre chose que le modèle qui l’a produite. Pourquoi l’indépendance est essentielle et ce que vaut vraiment une auto-vérification.',
        keywords: ['vérification IA', 'contrôle des réponses', 'exactitude LLM'],
      },
      eyebrow: 'Orchestration',
      title: 'Qu’est-ce que la vérification des réponses IA ?',
      summary:
        'Vérifier, c’est confronter une réponse générée à une source qui n’est pas le générateur. Le mot clé est indépendante : un modèle qui relit sa propre réponse partage le raisonnement qui a produit l’erreur, et c’est pourquoi les auto-vérifications attrapent bien moins qu’on ne l’imagine.',
      sections: [
        {
          id: 'independence',
          heading: 'L’indépendance est toute l’idée',
          paragraphs: [
            'Si un modèle invente un fait à cause de quelque chose dans son entraînement, lui demander si ce fait est vrai consulte la source même qui l’a inventé. Le contrôle et l’erreur ont une cause commune, donc le contrôle passe.',
            'Un vérificateur utile change quelque chose. Un autre modèle, une recherche dans de vrais documents, un compilateur, une suite de tests, un validateur de schéma. Plus le vérificateur diffère du générateur, plus il peut attraper.',
          ],
        },
        {
          id: 'kinds',
          heading: 'Types de vérification, du plus faible au plus fort',
          paragraphs: [
            'Auto-relecture : le modèle relit sa réponse. Peu coûteux, attrape surtout la mise en forme et les contradictions internes. Relecture croisée : un autre modèle contrôle. Mieux, attrape les erreurs propres au premier. Récupération : l’affirmation est confrontée à des documents récupérés. Solide pour les affirmations factuelles. Exécution : le code tourne, le schéma valide, les tests passent. Le plus fort, et seulement disponible là où la réponse est exécutable.',
            'Le schéma : la force suit l’indépendance vis-à-vis du modèle, et la disponibilité va en sens inverse — les contrôles les plus forts n’existent que pour certains types de travail.',
          ],
        },
        {
          id: 'repair',
          heading: 'Vérification et réparation',
          paragraphs: [
            'Un vérificateur qui se contente de signaler un problème vous laisse au point de départ. En pratique, la vérification s’accompagne d’une réparation : l’échec et sa raison repartent vers un modèle, qui produit une réponse corrigée, qui est de nouveau contrôlée.',
            'Cette boucle a besoin d’une limite. Sans elle, un modèle incapable de corriger continuera à produire des variantes de la même mauvaise réponse au prix fort.',
          ],
        },
      ],
      faq: [
        {
          question: 'Demander au modèle de se relire aide-t-il ?',
          answer:
            'Un peu, et surtout sur l’incohérence interne plutôt que sur l’erreur factuelle. C’est la forme la plus faible de vérification et la plus facile à surestimer.',
        },
        {
          question: 'La vérification par récupération est-elle du RAG ?',
          answer:
            'Ce sont les mêmes rouages dans des directions opposées. Le RAG récupère avant de générer, pour informer la réponse. La vérification par récupération récupère après, pour la contrôler.',
        },
        {
          question: 'Combien de tentatives de réparation ?',
          answer:
            'Une ou deux. Si un modèle n’a pas corrigé au deuxième essai, les suivants produisent en général des reformulations de la même erreur, et un humain devrait regarder.',
        },
      ],
      productNote:
        'La vérification et la réparation sont deux des {orchestrationLabCount} modes d’orchestration de ClawAI, et les deux sont mesurés par tentative : une boucle de réparation ne peut pas creuser une facture invisible.',
    },
    [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]: {
      seo: {
        title: 'Qu’est-ce qu’une fenêtre de contexte ?',
        description:
          'La fenêtre de contexte est la quantité de texte qu’un modèle peut considérer en une requête. Pourquoi ce n’est pas de la mémoire et comment elle fait grimper le coût.',
        keywords: ['fenêtre de contexte', 'tokens LLM', 'contexte long'],
      },
      eyebrow: 'Contexte',
      title: 'Qu’est-ce qu’une fenêtre de contexte ?',
      summary:
        'La fenêtre de contexte est la quantité totale de texte qu’un modèle peut tenir dans une seule requête : votre prompt, la conversation jusqu’ici, les documents joints et la réponse en cours d’écriture. Elle se mesure en tokens et se réinitialise entièrement entre les requêtes.',
      sections: [
        {
          id: 'not-memory',
          heading: 'Ce n’est pas de la mémoire',
          paragraphs: [
            'Un modèle ne se souvient pas de votre conversation précédente. L’illusion de mémoire vient de ce que l’application renvoie les messages antérieurs à chaque nouvelle requête. La fenêtre est un plan de travail pour un appel, pas un stockage.',
            'Cela a une conséquence directe que l’on découvre par surprise : une longue conversation devient plus chère à chaque message, car tout l’historique est renvoyé et refacturé à chaque fois.',
          ],
        },
        {
          id: 'filling-it',
          heading: 'Une fenêtre pleine n’est pas une fenêtre bien utilisée',
          paragraphs: [
            'Une grande fenêtre est une marge, pas un objectif. Les modèles répartissent leur attention inégalement sur un long contexte : ce qui se trouve au milieu d’une très longue entrée risque davantage d’être traité à la légère que ce qui est aux extrémités.',
            'En pratique, dix pages ciblées battent souvent deux cents pages dispersées. La récupération existe précisément pour choisir ces dix pages plutôt que de tout envoyer en espérant.',
          ],
        },
        {
          id: 'cost',
          heading: 'Comment elle fait grimper le coût',
          paragraphs: [
            'Presque tous les fournisseurs facturent au token, entrée et sortie séparément, l’entrée étant en général moins chère. Un gros document joint à chaque message d’une longue conversation est facturé à chaque message, pas une fois.',
            'C’est la cause la plus fréquente d’une facture surprenante, et le remède est structurel : joignez ce dont la question a besoin plutôt que tout ce qui pourrait servir.',
          ],
        },
      ],
      faq: [
        {
          question: 'Une plus grande fenêtre est-elle toujours meilleure ?',
          answer:
            'Elle lève une limite, ce qui est bien, mais n’améliore pas la façon dont le modèle exploite ce qu’il reçoit. Une fenêtre plus grande vous achète surtout la possibilité d’une erreur plus coûteuse.',
        },
        {
          question: 'Qu’est-ce qu’un token ?',
          answer:
            'À peu près un fragment de mot. En anglais, cela tourne autour de trois quarts de mot par token, donc mille tokens font environ sept cent cinquante mots — mais cela varie selon la langue, et les écritures non latines consomment souvent plus de tokens par mot.',
        },
        {
          question: 'Que se passe-t-il si je la dépasse ?',
          answer:
            'La requête échoue, ou l’application supprime silencieusement les messages les plus anciens. Le second cas est plus fréquent et plus déroutant, car le modèle semble oublier ce que vous avez dit.',
        },
      ],
      productNote:
        'ClawAI consigne les tokens consommés par chaque message : une conversation qui devient coûteuse se voit avant la facture, pas après.',
    },
    [LearnTopic.WHAT_IS_RAG]: {
      seo: {
        title: 'Qu’est-ce que le RAG (génération augmentée par récupération) ?',
        description:
          'Le RAG récupère les passages pertinents de vos documents et les place devant le modèle. Comment le découpage et la qualité de récupération décident du résultat.',
        keywords: ['RAG', 'génération augmentée par récupération', 'IA documentaire'],
      },
      eyebrow: 'Contexte',
      title: 'Qu’est-ce que la génération augmentée par récupération ?',
      summary:
        'Le RAG consiste à chercher dans vos propres documents les passages pertinents pour une question et à les inclure dans la requête. Le modèle répond à partir d’un matériau que vous avez fourni plutôt que de mémoire, ce qui lui permet de parler de documents sur lesquels il n’a jamais été entraîné.',
      sections: [
        {
          id: 'how-it-works',
          heading: 'Comment cela fonctionne',
          paragraphs: [
            'Les documents sont découpés en morceaux et chaque morceau est converti en vecteur — une représentation numérique de son sens. La question est convertie de la même façon, et les morceaux dont les vecteurs sont les plus proches sont récupérés.',
            'Ces morceaux sont insérés dans le prompt, généralement avec l’instruction d’y répondre à partir d’eux. Le modèle fait le travail de langue ; la récupération fait le savoir.',
          ],
        },
        {
          id: 'retrieval-quality',
          heading: 'La qualité de récupération est tout le système',
          paragraphs: [
            'Si le bon passage n’est pas récupéré, aucun modèle ne sauvera la réponse : il répondra depuis ses connaissances générales et paraîtra tout aussi sûr. La plupart des systèmes RAG décevants sont des problèmes de récupération déguisés en génération.',
            'Le découpage est là où cela se joue. Des morceaux trop petits perdent le contexte qui les rendait signifiants ; trop grands, chacun dilue la correspondance. Découper selon la structure du document — sections, titres — bat en général le découpage à longueur fixe.',
          ],
        },
        {
          id: 'what-it-fixes',
          heading: 'Ce que cela corrige et ne corrige pas',
          paragraphs: [
            'Le RAG corrige « le modèle n’a jamais vu mes documents ». Il réduit les hallucinations sur les questions auxquelles les documents répondent, car la réponse est sous les yeux du modèle.',
            'Il ne corrige pas le raisonnement et n’empêche pas le modèle de répondre de mémoire quand la récupération ne renvoie rien d’utile. L’ancrage est une forte tendance, pas une garantie, et le mode d’échec est une réponse assurée sans source.',
          ],
        },
      ],
      faq: [
        {
          question: 'Le RAG est-il la même chose que le fine-tuning ?',
          answer:
            'Non, et ils résolvent des problèmes différents. Le fine-tuning change le comportement d’un modèle ; le RAG change ce qu’il sait pour une requête. Pour « réponds à des questions sur mes documents », le RAG est presque toujours le bon outil et bien moins cher à maintenir à jour.',
        },
        {
          question: 'Les grandes fenêtres rendent-elles le RAG obsolète ?',
          answer:
            'Non. Vous pouvez coller davantage, mais vous payez chaque token à chaque message et les modèles répartissent mal leur attention sur de très longues entrées. La récupération est aussi la seule approche qui passe à l’échelle au-delà de ce que contient une fenêtre.',
        },
        {
          question: 'Le RAG envoie-t-il mes documents au fournisseur du modèle ?',
          answer:
            'Les passages récupérés, oui — c’est ainsi que le modèle les voit. Si c’est inacceptable, le modèle doit tourner à un endroit que vous contrôlez, et c’est le rôle de l’exécution locale.',
        },
      ],
      productNote:
        'ClawAI récupère depuis les fichiers que vous joignez et associe cela à l’exécution locale, pour que les passages récupérés puissent rester sur votre propre matériel.',
    },
    [LearnTopic.WHAT_IS_AI_MEMORY]: {
      seo: {
        title: 'Qu’est-ce que la mémoire d’un assistant IA ?',
        description:
          'La mémoire est ce qu’un assistant conserve entre les conversations. Sa différence avec la fenêtre de contexte, son coût en tokens et la question de confidentialité.',
        keywords: ['mémoire IA', 'contexte persistant', 'mémoire d’assistant'],
      },
      eyebrow: 'Contexte',
      title: 'Qu’est-ce que la mémoire d’un assistant IA ?',
      summary:
        'La mémoire, c’est l’application qui stocke des faits vous concernant et les réintroduit dans des conversations ultérieures. Le modèle lui-même ne retient rien entre les requêtes ; la mémoire est une fonctionnalité bâtie autour, avec un coût et une forme de confidentialité qu’il vaut mieux comprendre avant de l’activer.',
      sections: [
        {
          id: 'mechanism',
          heading: 'Comment cela marche réellement',
          paragraphs: [
            'L’application décide que quelque chose mérite d’être conservé — une préférence, un fait, une consigne permanente — et l’écrit. Lors d’une conversation ultérieure, elle sélectionne les entrées pertinentes et les ajoute à la requête avant que le modèle la voie.',
            'La mémoire est donc de la récupération sur un magasin de faits vous concernant, et non quelque chose qui se passe dans le modèle. Ce qui veut dire qu’elle ne vaut que ce que valent les décisions sur ce qu’on garde et ce qu’on réintroduit.',
          ],
        },
        {
          id: 'cost',
          heading: 'Ce n’est pas gratuit',
          paragraphs: [
            'Chaque fait mémorisé réintroduit dans une conversation, ce sont des tokens d’entrée, facturés à chaque message qui les porte. Une grande mémoire injectée sans discernement est un impôt permanent sur toutes vos conversations.',
            'Les bonnes implémentations sont sélectives : elles ramènent ce qui est pertinent pour cette conversation plutôt que tout ce qu’elles savent.',
          ],
        },
        {
          id: 'privacy',
          heading: 'La question de confidentialité',
          paragraphs: [
            'La mémoire suppose un magasin durable de faits personnels, ce qui est une situation différente d’une conversation que vous pouvez effacer. Les bonnes questions sont : où est-elle stockée, pouvez-vous la lire en entier, pouvez-vous supprimer des entrées précises, et est-elle envoyée au fournisseur du modèle lors de la réintroduction ?',
            'C’est la dernière que l’on oublie. Un fait mémorisé injecté dans un prompt va là où va ce prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'La mémoire entraîne-t-elle le modèle sur mes données ?',
          answer:
            'Pas en soi. La mémoire met du texte dans un prompt ; l’entraînement modifie les poids du modèle. Qu’un fournisseur s’entraîne sur les prompts est une autre question, qui dépend de ses conditions.',
        },
        {
          question: 'Pourquoi l’assistant retient-il quelque chose de faux ?',
          answer:
            'Parce qu’il a noté quelque chose qui fut vrai un jour, ou pris une remarque de passage pour une préférence permanente. Pouvoir lire et modifier le magasin directement est le seul vrai remède.',
        },
        {
          question: 'La mémoire équivaut-elle à une longue conversation ?',
          answer:
            'Non. Une longue conversation garde tout et le paie à chaque message. La mémoire garde des faits choisis et survit à la fin de la conversation.',
        },
      ],
      productNote:
        'La mémoire dans ClawAI est un ensemble d’entrées stockées et consultables plutôt qu’un profil opaque, et elle peut être associée à l’exécution locale pour que les faits retenus restent sur du matériel que vous contrôlez.',
    },
    [LearnTopic.WHAT_ARE_CONTEXT_PACKS]: {
      seo: {
        title: 'Que sont les packs de contexte ?',
        description:
          'Les packs de contexte sont des ensembles réutilisables que vous joignez volontairement à une conversation. Leur différence avec la mémoire et le RAG.',
        keywords: ['packs de contexte', 'contexte réutilisable', 'contexte de prompt'],
      },
      eyebrow: 'Contexte',
      title: 'Que sont les packs de contexte ?',
      summary:
        'Un pack de contexte est un ensemble nommé et réutilisable de matériaux — consignes, textes de référence, fichiers, liens — que vous joignez volontairement à une conversation. Il se situe entre la mémoire, que le système choisit pour vous, et une pièce jointe ponctuelle, que vous reconstituez à chaque fois.',
      sections: [
        {
          id: 'the-gap',
          heading: 'Le vide qu’ils comblent',
          paragraphs: [
            'La mémoire est automatique : le système décide de ce qu’il garde et du moment où il le réintroduit, ce qui est pratique et imprécis. Une pièce jointe ponctuelle est précise et jetable : la semaine prochaine, vous rassemblerez les mêmes cinq documents.',
            'Un pack est l’entre-deux : assemblé une fois, délibérément, et appliqué quand vous le décidez. Vos standards de code, la terminologie de votre produit, les contraintes qu’un travail doit respecter.',
          ],
        },
        {
          id: 'what-goes-in',
          heading: 'Ce qui y a sa place',
          paragraphs: [
            'Du matériau stable que vous devriez sinon réexpliquer : style maison, vocabulaire métier, contraintes permanentes, la forme de sortie que vous voulez toujours.',
            'N’y a pas sa place ce qui change à chaque question. Un pack que vous modifiez à chaque usage est un prompt avec des étapes en plus.',
          ],
        },
        {
          id: 'cost-and-discipline',
          heading: 'Coût et discipline',
          paragraphs: [
            'Un pack, ce sont des tokens d’entrée à chaque message auquel il est joint : un gros pack appliqué à tout, c’est le problème de coût de la fenêtre de contexte sous une autre forme. Plusieurs petits packs spécifiques battent un gros pack général.',
            'Parce qu’un pack est explicite, il est aussi relisible : vous pouvez lire exactement ce qui est envoyé, ce qui n’est pas vrai d’une mémoire qui s’assemble toute seule.',
          ],
        },
      ],
      faq: [
        {
          question: 'En quoi est-ce différent d’un prompt système ?',
          answer:
            'Un prompt système est en général un bloc de consignes défini une fois. Un pack est un ensemble nommé que vous attachez et détachez par conversation, et il peut porter des fichiers et des références en plus des consignes.',
        },
        {
          question: 'Puis-je en utiliser plusieurs à la fois ?',
          answer:
            'Oui, et composer de petits packs est justement l’intérêt : un pack langue plus un pack style maison plutôt qu’un ensemble par projet.',
        },
        {
          question: 'Les packs remplacent-ils le RAG ?',
          answer:
            'Non. Un pack est trié à la main et toujours inclus ; la récupération sélectionne dans un grand corpus selon la question. Les packs conviennent au matériau stable ; la récupération au matériau trop volumineux pour être joint.',
        },
      ],
      productNote:
        'Les packs de contexte de ClawAI sont des ensembles réutilisables que vous joignez par conversation : ce que reçoit le modèle est ce que vous avez assemblé, pas ce qui a été déduit de vous.',
    },
    [LearnTopic.WHAT_IS_LOCAL_AI]: {
      seo: {
        title: 'Qu’est-ce que l’IA locale ?',
        description:
          'L’IA locale fait tourner un modèle sur du matériel que vous contrôlez. Ce que cela change pour la confidentialité et le coût, et où elle rivalise vraiment.',
        keywords: ['IA locale', 'IA sur site', 'IA privée'],
      },
      eyebrow: 'Local et privé',
      title: 'Qu’est-ce que l’IA locale ?',
      summary:
        'L’IA locale signifie que le modèle tourne sur une machine que vous contrôlez — votre portable, votre serveur, votre baie — plutôt qu’en appel à l’API de quelqu’un d’autre. Le prompt ne quitte pas le matériel, ce qui change entièrement la question de la confidentialité et change celle du coût d’une manière souvent mal comprise.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Ce que cela change',
          paragraphs: [
            'Les données sont la vraie raison. Un prompt envoyé à un modèle hébergé est traité par ce fournisseur selon ses conditions. Un prompt à un modèle local n’est envoyé nulle part, seule version de cette garantie qui ne dépende pas de la politique d’un tiers.',
            'Cela supprime aussi la facturation au token, les limites de débit et la possibilité qu’un modèle soit retiré sous vos pieds. Un modèle téléchargé continue de fonctionner.',
          ],
        },
        {
          id: 'the-cost-shape',
          heading: 'La forme du coût, pas le coût',
          paragraphs: [
            'L’IA locale n’est pas automatiquement moins chère. Elle transforme un coût variable en coût fixe : vous achetez ou louez du matériel, puis l’inférence est quasi gratuite à la marge.',
            'C’est un bon calcul à volume élevé et régulier, un mauvais pour un usage occasionnel. Un GPU inactif la plupart de la journée coûte plus cher que les appels d’API qu’il remplace.',
          ],
        },
        {
          id: 'the-honest-limits',
          heading: 'Les limites honnêtes',
          paragraphs: [
            'Les modèles qui tournent confortablement sur une seule machine ne sont en général pas les plus gros disponibles. Sur les tâches de raisonnement les plus dures, l’écart avec un modèle de pointe hébergé est réel.',
            'Pour énormément de tâches quotidiennes — résumer, rédiger, extraire, classer, coder de la routine — l’écart est bien plus faible qu’on ne le croit, et les propriétés de confidentialité et de coût pèsent souvent plus que le dernier incrément de capacité.',
          ],
        },
        {
          id: 'hybrid',
          heading: 'Surtout utile en hybride',
          paragraphs: [
            'Le schéma courant n’est ni tout local ni tout cloud. C’est local pour ce qui est sensible ou volumineux, hébergé pour les questions les plus dures, et une politique qui décide de la répartition — précisément le rôle d’un routeur.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quel matériel me faut-il ?',
          answer:
            'Cela dépend entièrement de la taille du modèle et de la quantisation, et quiconque vous donne un chiffre unique devine. La contrainte dominante est la mémoire disponible : les poids doivent tenir, et ce qui tient détermine ce que vous pouvez exécuter.',
        },
        {
          question: 'L’IA locale est-elle privée par définition ?',
          answer:
            'L’appel au modèle l’est. Le reste de l’application peut ne pas l’être — recherche, télémétrie et autres intégrations peuvent encore sortir. La confidentialité est une propriété du système entier, pas d’un composant.',
        },
        {
          question: 'Les modèles locaux peuvent-ils utiliser mes documents ?',
          answer:
            'Oui. La récupération fonctionne pareil, et quand la récupération et le modèle sont locaux, les documents ne quittent votre matériel à aucun moment.',
        },
      ],
      productNote:
        'ClawAI exécute les modèles locaux via Ollama et llama.cpp, et son mode de routage local seul garde toute la chaîne de repli chez des fournisseurs locaux au lieu d’aller chercher un modèle cloud.',
    },
    [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]: {
      seo: {
        title: 'Que sont les modèles à poids ouverts ?',
        description:
          'Les modèles à poids ouverts publient leurs paramètres entraînés pour que vous puissiez les exécuter. Ce que couvre « ouvert », ce qu’il ne couvre pas, et les licences.',
        keywords: ['modèles à poids ouverts', 'LLM open source', 'modèles téléchargeables'],
      },
      eyebrow: 'Local et privé',
      title: 'Que sont les modèles à poids ouverts ?',
      summary:
        'Un modèle à poids ouverts est un modèle dont les paramètres entraînés sont publiés, de sorte que vous pouvez le télécharger et l’exécuter sur votre matériel. Le terme est précis et volontairement plus étroit qu’« open source » : la disponibilité des poids ne dit rien des données d’entraînement, du code, ni de ce que permet la licence.',
      sections: [
        {
          id: 'what-open-covers',
          heading: 'Ce que « ouvert » couvre ici',
          paragraphs: [
            'Poids ouverts signifie que les nombres constituant le modèle entraîné sont téléchargeables. C’est suffisant pour l’exécuter, l’affiner, l’inspecter et le maintenir en état quoi que fasse ensuite l’éditeur.',
            'Cela n’inclut généralement pas les données d’entraînement, et souvent pas le code d’entraînement. Un modèle à poids ouverts est donc reproductible au sens où vous pouvez l’exécuter, pas au sens où vous pourriez le reconstruire.',
          ],
        },
        {
          id: 'licences',
          heading: 'Les licences diffèrent réellement',
          paragraphs: [
            'Certains modèles à poids ouverts portent des licences permissives ordinaires. D’autres portent des conditions : restrictions d’usage commercial au-delà d’un seuil, interdictions d’applications particulières, ou exigences d’attribution et sur les modèles dérivés.',
            'Cela compte commercialement et se saute facilement. « Nous pouvons le télécharger » et « nous pouvons l’utiliser dans notre produit » sont deux questions, et seule la licence répond à la seconde.',
          ],
        },
        {
          id: 'why-they-matter',
          heading: 'Pourquoi ils comptent',
          paragraphs: [
            'Ce sont les seuls modèles que vous pouvez exécuter entièrement sur votre matériel, donc le socle de tout déploiement local et privé. Ils ne peuvent pas non plus être retirés sous vos pieds : un modèle téléchargé fonctionne tant que vous le conservez.',
            'L’écart de capacité avec les meilleurs modèles hébergés est réel et s’est nettement resserré. Pour une grande part du travail quotidien, ce n’est plus le facteur décisif.',
          ],
        },
      ],
      faq: [
        {
          question: 'Poids ouverts et open source, est-ce pareil ?',
          answer:
            'Non. L’open source implique le code source et la liberté de l’utiliser et de le modifier. Poids ouverts signifie que les paramètres sont publiés, sous la licence choisie par l’éditeur — parfois restrictive.',
        },
        {
          question: 'Puis-je affiner un modèle à poids ouverts ?',
          answer:
            'Techniquement oui, c’est l’une des principales raisons de vouloir les poids. Si vous en avez le droit, et ce que vous pouvez faire du résultat, est une question de licence qui varie selon le modèle.',
        },
        {
          question: 'Peut-on les utiliser commercialement sans risque ?',
          answer:
            'Beaucoup oui ; certains non sans conditions. Lisez la licence précise du modèle précis — c’est la seule chose dans ce domaine qui ne se généralise vraiment pas.',
        },
      ],
      productNote:
        'ClawAI exécute des modèles à poids ouverts via Ollama et llama.cpp sur votre matériel, aux côtés de {cloudProviderCount} fournisseurs cloud, le routage décidant qui traite quoi.',
    },
    [LearnTopic.WHAT_IS_SELF_HOSTED_AI]: {
      seo: {
        title: 'Qu’est-ce que l’IA auto-hébergée ?',
        description:
          'L’IA auto-hébergée consiste à faire tourner toute l’application soi-même, pas seulement le modèle. Ce qu’elle couvre et sa différence avec les modèles locaux.',
        keywords: ['IA auto-hébergée', 'plateforme IA sur site', 'déploiement privé'],
      },
      eyebrow: 'Local et privé',
      title: 'Qu’est-ce que l’IA auto-hébergée ?',
      summary:
        'Auto-héberger signifie que l’application tourne sur une infrastructure que vous contrôlez — l’interface, les bases de données, les files, l’orchestration — et pas seulement le modèle. C’est un engagement plus lourd que faire tourner un modèle local, et cela répond à une autre question : non pas seulement « où a lieu l’inférence » mais « qui détient les données au repos ».',
      sections: [
        {
          id: 'more-than-the-model',
          heading: 'C’est plus que le modèle',
          paragraphs: [
            'Faire tourner un modèle local laisse tout de même les conversations, les fichiers, la mémoire et les données de compte dans l’application utilisée. L’auto-hébergement déplace tout cela sur votre propre infrastructure.',
            'La distinction compte pour quiconque a des obligations portant sur les données stockées plutôt que sur l’inférence. Où tourne le modèle et où vit l’historique sont deux questions distinctes, et seul l’auto-hébergement répond à la seconde.',
          ],
        },
        {
          id: 'what-it-costs-you',
          heading: 'Ce que cela coûte en exploitation',
          paragraphs: [
            'Vous prenez en charge les mises à jour, les sauvegardes, la supervision, le TLS et le débogage quand quelque chose casse à une heure indue. C’est un coût réel et continu, mesuré en attention plus qu’en argent.',
            'Cela en vaut la peine quand les données ne peuvent réellement pas être ailleurs, ou quand le déploiement doit survivre à toute relation fournisseur. Cela n’en vaut pas la peine comme précaution générale.',
          ],
        },
        {
          id: 'hybrid-is-normal',
          heading: 'Auto-hébergé ne veut pas dire déconnecté',
          paragraphs: [
            'Un déploiement auto-hébergé peut toujours appeler des modèles hébergés. Beaucoup le font : la plateforme et ses données vous appartiennent, et les fournisseurs cloud servent là où leur capacité justifie la sortie des données.',
            'La combinaison qui supprime tout traitement externe est l’auto-hébergement plus des modèles locaux, et c’est une configuration délibérée, pas le réglage par défaut.',
          ],
        },
      ],
      faq: [
        {
          question: 'Auto-héberger est-ce la même chose que l’IA locale ?',
          answer:
            'Non. L’IA locale concerne l’endroit où tourne le modèle. L’auto-hébergement concerne l’endroit où vivent l’application et ses données. On peut avoir l’un sans l’autre, et la position de confidentialité la plus forte demande les deux.',
        },
        {
          question: 'L’auto-hébergement nous rend-il conformes ?',
          answer:
            'Non. Cela peut être une brique d’un dossier de conformité, mais la conformité repose sur des contrats, des contrôles, des preuves et des audits. Où tourne le logiciel n’est qu’un élément parmi d’autres.',
        },
        {
          question: 'Que faut-il pour l’exploiter ?',
          answer:
            'Pour la plupart des plateformes, des conteneurs, une base de données et un endroit où les faire tourner — plus une personne qui assume la trajectoire de mise à jour. C’est ce dernier point qu’on sous-estime.',
        },
      ],
      productNote:
        'ClawAI tourne sur votre propre infrastructure — la pile complète, pas une offre hébergée avec une option locale — et son code source est disponible pour examen technique.',
    },
    [LearnTopic.OLLAMA_VS_LLAMACPP]: {
      seo: {
        title: 'Ollama ou llama.cpp : lequel utiliser ?',
        description:
          'Ollama et llama.cpp exécutent tous deux des modèles à poids ouverts en local. Leur relation, l’usage de chacun et pourquoi utiliser les deux est normal.',
        keywords: ['Ollama ou llama.cpp', 'runtime local', 'exécuter un LLM en local'],
      },
      eyebrow: 'Local et privé',
      title: 'Ollama ou llama.cpp',
      summary:
        'Ce ne sont pas vraiment des concurrents. llama.cpp est le moteur d’inférence qui a rendu praticable l’exécution de modèles de langage sur du matériel ordinaire ; Ollama est un gestionnaire de modèles et un serveur bâtis sur cette lignée. La question n’est en général pas lequel choisir, mais à quelle couche vous voulez travailler.',
      sections: [
        {
          id: 'what-each-is',
          heading: 'Ce qu’est chacun',
          paragraphs: [
            'llama.cpp est un moteur d’inférence en C++. Il exécute efficacement des modèles quantisés sur CPU et GPU, et expose un contrôle fin sur le chargement et l’exécution d’un modèle. C’est la couche basse, et une grande partie de l’écosystème d’IA locale est bâtie dessus.',
            'Ollama enveloppe ce type de moteur dans du confort : récupérer un modèle par son nom, lancer un serveur, obtenir une API HTTP, laisser gérer les fichiers de modèle et la mémoire. Il optimise pour avoir un modèle en marche en une minute.',
          ],
        },
        {
          id: 'choosing',
          heading: 'Comment choisir',
          paragraphs: [
            'Choisissez Ollama si vous voulez des modèles opérationnels vite avec des réglages par défaut sensés, si vous alternez entre plusieurs modèles, ou si vous voulez une API locale stable sans rien ajuster.',
            'Choisissez llama.cpp directement si vous avez besoin de contrôle — une quantisation précise, une répartition de couches précise, du matériel inhabituel, ou de l’inférence embarquée dans votre binaire. Le prix : vous gérez les détails.',
          ],
        },
        {
          id: 'both',
          heading: 'Utiliser les deux est normal',
          paragraphs: [
            'Un arrangement courant est Ollama pour l’usage interactif quotidien et llama.cpp pour une charge optimisée à dessein. Ils ne s’excluent pas, et une plateforme qui prend en charge les deux laisse trancher par déploiement plutôt qu’une fois pour toutes.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ollama n’est-il qu’une surcouche ?',
          answer:
            'Ce serait injuste. La gestion des modèles, la gestion mémoire et une API cohérente sont précisément ce qui rend les modèles locaux praticables au quotidien, et c’est du vrai travail quel que soit le moteur dessous.',
        },
        {
          question: 'Lequel est le plus rapide ?',
          answer:
            'À modèle, quantisation et matériel identiques, ils sont proches, car le gros du travail est le même. Les écarts en pratique viennent surtout de la configuration, pas de l’outil.',
        },
        {
          question: 'Qu’est-ce que la quantisation ?',
          answer:
            'Stocker les poids du modèle avec une précision moindre pour qu’ils occupent moins de mémoire. C’est ce qui fait tenir de gros modèles sur du matériel ordinaire, en échangeant un peu de qualité contre beaucoup de praticabilité.',
        },
      ],
      productNote:
        'ClawAI prend en charge les deux comme runtimes locaux : un déploiement peut utiliser le confort d’Ollama, le contrôle de llama.cpp, ou les deux à la fois.',
    },
    [LearnTopic.CLOUD_AI_VS_LOCAL_AI]: {
      seo: {
        title: 'IA cloud ou IA locale : comment choisir',
        description:
          'Les modèles cloud offrent la capacité sans matériel ; les modèles locaux offrent le contrôle et un coût fixe. Les arbitrages qui décident vraiment.',
        keywords: ['IA cloud ou locale', 'LLM local ou hébergé', 'déploiement IA privée'],
      },
      eyebrow: 'Local et privé',
      title: 'IA cloud ou IA locale',
      summary:
        'Le résumé honnête : les modèles cloud sont plus capables au sommet et n’exigent rien de vous ; les modèles locaux gardent vos données sur votre matériel et transforment une facture variable en coût fixe. Presque personne ne devrait choisir l’un pour tout, et la vraie question est de savoir où passe la ligne.',
      sections: [
        {
          id: 'capability',
          heading: 'Capacité',
          paragraphs: [
            'Les modèles les plus grands et les plus puissants sont hébergés, et sur du raisonnement vraiment difficile l’écart est réel. Si votre travail est dominé par les questions les plus dures, cela compte plus que tout le reste de cette page.',
            'Pour résumer, rédiger, extraire, classer et coder de la routine, l’écart s’est assez resserré pour rarement trancher.',
          ],
        },
        {
          id: 'data',
          heading: 'Données',
          paragraphs: [
            'C’est en général ce qui décide vraiment. Un prompt envoyé à un modèle hébergé est traité par ce fournisseur selon ses conditions. Pour l’essentiel des contenus, cela convient. Pour certains — dossiers réglementés, travaux non publiés, matériel confidentiel de tiers — non, et aucune assurance contractuelle n’égale des données qui ne sortent pas.',
            'C’est pourquoi la répartition est rarement binaire. Elle se décide en général par type de données plutôt que par organisation.',
          ],
        },
        {
          id: 'cost',
          heading: 'Coût',
          paragraphs: [
            'Le cloud est variable : aucune dépense initiale et une facture proportionnelle à l’usage, qui croît avec le succès. Le local est fixe : matériel d’abord, puis coût marginal quasi nul.',
            'Le point de bascule dépend du volume. L’usage occasionnel revient moins cher hébergé. L’usage soutenu, régulier et prévisible revient en général moins cher en local, et le seuil arrive plus tôt qu’on ne l’imagine dès que l’usage est continu.',
          ],
        },
        {
          id: 'the-answer',
          heading: 'La plupart finissent avec les deux',
          paragraphs: [
            'Local pour le sensible et le volumineux, hébergé pour les questions les plus dures, et une politique de routage qui décide par requête. Cela suppose un système où la décision est explicite et auditable — sinon « le sensible reste en local » est une intention, pas un contrôle.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’IA locale est-elle moins chère ?',
          answer:
            'À volume soutenu, en général oui. À volume faible ou irrégulier, en général non — du matériel inactif coûte de l’argent que vous vous en serviez ou non.',
        },
        {
          question: 'Puis-je commencer hébergé et migrer ensuite ?',
          answer:
            'Oui, et c’est un ordre sensé : valider le flux avec des modèles hébergés, puis déplacer les parties dont le volume ou la sensibilité justifie le matériel. C’est bien plus simple sur une plateforme qui prend déjà en charge les deux.',
        },
        {
          question: 'L’hybride est-il compliqué ?',
          answer:
            'Il l’est si vous le construisez vous-même, car vous entretenez deux chemins. Il est simple si la couche de routage traite déjà les modèles locaux et hébergés comme des destinations interchangeables.',
        },
      ],
      productNote:
        'ClawAI traite les modèles locaux et cloud comme le même type de destination, et ses modes confidentialité d’abord et local seul font de « le sensible reste en local » un réglage plutôt qu’une habitude.',
    },
    [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: {
      seo: {
        title: 'Agent IA ou chatbot : quelle différence ?',
        description:
          'Un chatbot répond ; un agent agit. Ce qui change quand un modèle utilise des outils, pourquoi l’enjeu monte et quoi vérifier avant de le laisser agir.',
        keywords: ['agent IA ou chatbot', 'qu’est-ce qu’un agent IA', 'usage d’outils'],
      },
      eyebrow: 'Fondamentaux',
      title: 'Agent IA ou chatbot',
      summary:
        'Un chatbot produit du texte et vous décidez quoi en faire. Un agent reçoit des outils et un objectif, et enchaîne des étapes de lui-même — lire des fichiers, appeler des API, exécuter des commandes — jusqu’à croire avoir fini. La différence n’est pas l’intelligence ; c’est que la sortie soit une suggestion ou une action.',
      sections: [
        {
          id: 'the-difference',
          heading: 'La vraie différence',
          paragraphs: [
            'Le mécanisme est l’usage d’outils. Un agent est un modèle dans une boucle avec un ensemble d’outils qu’il peut appeler, et chaque résultat nourrit la décision suivante. Retirez les outils et la boucle, et vous avez un chatbot.',
            'Cette boucle rend les agents utiles et risqués. Un chatbot qui se trompe vous fait perdre du temps. Un agent qui se trompe a déjà fait quelque chose.',
          ],
        },
        {
          id: 'what-agents-are-good-at',
          heading: 'Où les agents sont rentables',
          paragraphs: [
            'Le travail en plusieurs étapes avec un état final vérifiable. Lancer les tests, lire l’échec, changer le code, relancer. Le contrôle referme la boucle, et l’agent peut savoir s’il a réussi.',
            'Ils peinent quand le succès relève du jugement, car rien ne leur dit de s’arrêter. Un agent sans moyen de vérifier sa propre progression continuera avec assurance.',
          ],
        },
        {
          id: 'what-to-check',
          heading: 'Quoi vérifier avant de le laisser agir',
          paragraphs: [
            'Quels outils il a, et ce que ces outils peuvent atteindre. Si les actions destructives demandent une validation. Si vous voyez les étapes et pas seulement le résultat. Et s’il peut être arrêté en cours.',
            'Les étapes comptent le plus. Un agent dont vous ne pouvez pas inspecter le raisonnement est un agent qu’il faut accepter ou rejeter en bloc, la pire position pour relire un travail.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un chatbot avec recherche est-il un agent ?',
          answer:
            'C’est la frontière. Dès qu’il décide lui-même s’il faut chercher, et quoi faire des résultats, il a la boucle. La plupart des assistants utiles se situent aujourd’hui quelque part sur ce spectre plutôt qu’à une extrémité.',
        },
        {
          question: 'Les agents ont-ils besoin des modèles les plus puissants ?',
          answer:
            'Ils en profitent plus que les chatbots, car les erreurs se cumulent d’une étape à l’autre. Une petite erreur au début peut envoyer toute l’exécution ailleurs.',
        },
        {
          question: 'Est-il sûr de lancer un agent sur une base de code ?',
          answer:
            'Avec du contrôle de version, des permissions restreintes et une étape de relecture, oui — c’est un usage établi. Sans cela, un agent apporte des modifications non relues à votre travail.',
        },
      ],
      productNote:
        'L’agent de code de ClawAI tourne dans votre éditeur avec les étapes visibles et le choix du modèle entre vos mains : une exécution se relit au lieu d’être à prendre ou à laisser.',
    },
  },
};
