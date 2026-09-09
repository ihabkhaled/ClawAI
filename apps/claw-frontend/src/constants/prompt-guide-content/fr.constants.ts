import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PromptGuideDictionary } from '@/types/prompt-guide.types';

export const FR_PROMPT_GUIDE_CONTENT: PromptGuideDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'Où aller ensuite',
    lastReviewed: 'Dernière relecture',
    backToHub: 'Tous les guides de prompts',
    ctaTitle: 'Entraînez-vous sur une vraie conversation',
    ctaBody:
      'ClawAI vous donne un seul espace de travail pour tester un prompt sur des modèles de tous les fournisseurs auxquels il se connecte, afin que vous puissiez voir par vous-même ce qui change.',
    startFree: 'Démarrer avec le plan gratuit',
    seeFeatures: 'Voir ce que fait ClawAI',
  },
  hub: {
    seo: {
      title: 'Comment écrire de meilleurs prompts pour l’IA',
      description:
        'Des guides pratiques et honnêtes pour écrire des prompts qui obtiennent de meilleurs résultats — clarté, exemples, raisonnement étape par étape, sortie structurée, prompts système, et corriger une mauvaise réponse. Aucune statistique inventée, aucune promesse exagérée sur ce qu’un prompt peut corriger.',
      keywords: [
        'comment écrire des prompts IA',
        'guide de rédaction de prompts',
        'bases du prompt engineering',
      ],
    },
    eyebrow: 'Guides de prompts',
    title: 'Comment écrire de meilleurs prompts pour l’IA',
    summary:
      'Un prompt est l’instruction que vous donnez à un modèle, et la façon dont vous l’écrivez change la réponse que vous obtenez — c’est vrai quel que soit le modèle ou le produit utilisé. Ces guides passent en revue les techniques qui aident réellement : être précis, donner des exemples, demander un raisonnement étape par étape, décrire le format de sortie souhaité, et corriger une réponse qui est passée à côté. Aucune de ces techniques ne rend un modèle infaillible ni ne garantit un résultat ; elles augmentent simplement la probabilité d’obtenir ce que vous vouliez demander.',
    topicsHeading: 'Choisissez un guide',
    cardSummaries: {
      [PromptGuideTopic.WRITING_CLEAR_PROMPTS]:
        'Les fondamentaux : contexte, contraintes, format et exemples.',
      [PromptGuideTopic.FEW_SHOT_PROMPTING]:
        'Montrer à un modèle ce que vous voulez en lui donnant des exemples.',
      [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]:
        'Demander à un modèle de raisonner par étapes avant de répondre.',
      [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]:
        'Écrire le prompt qui demande du JSON, un tableau ou une autre forme fixe.',
      [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]:
        'Ce qu’un prompt système fait différemment de ce que vous tapez dans le chat.',
      [PromptGuideTopic.ITERATING_ON_A_PROMPT]:
        'Que changer quand la première réponse n’est pas la bonne.',
      [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]:
        'Comment la bonne approche change entre le code, l’écriture et l’analyse.',
    },
  },
  topics: {
    [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: {
      seo: {
        title: 'Comment écrire un prompt IA clair et précis',
        description:
          'Les fondamentaux d’un prompt qui obtient une réponse utile : donner du contexte, énoncer des contraintes, nommer le format voulu et ajouter un exemple. Des conseils pratiques, sans statistiques inventées.',
        keywords: [
          'comment écrire un prompt clair',
          'bases du prompt IA',
          'rédaction de prompt précis',
        ],
      },
      eyebrow: 'Guides de prompts',
      title: 'Comment écrire un prompt IA clair et précis',
      summary:
        'La plupart des réponses décevantes viennent d’un prompt qui a omis quelque chose que le modèle n’avait aucun moyen de deviner — le public visé, les contraintes, le format, ou à quoi ressemble une « bonne » réponse. Ce guide passe en revue les quatre choses qui valent la peine d’être ajoutées avant d’envoyer un prompt, à peu près dans l’ordre où elles comptent.',
      sections: [
        {
          id: 'give-context',
          heading: 'Donnez au modèle le contexte qu’il ne peut pas deviner',
          paragraphs: [
            'Un modèle répond à partir de ce qui est dans la conversation plus ce qu’il a appris pendant son entraînement — il ne sait pas pour qui vous écrivez, ce que vous avez déjà essayé, ni pourquoi la tâche compte, sauf si vous le précisez. « Réécris cet e-mail » et « réécris cet e-mail pour qu’un client déjà frustré le lise comme des excuses, et non comme une justification » sont la même tâche avec une quantité de contexte différente, et elles obtiennent des réponses différentes. Le contexte n’a pas besoin d’être long ; il doit inclure le fait ou les deux qui changeraient la façon dont une personne accomplirait la tâche.',
          ],
        },
        {
          id: 'state-constraints',
          heading: 'Énoncez les contraintes au lieu d’espérer qu’elles soient sous-entendues',
          paragraphs: [
            'Une limite de longueur, un niveau de lecture, un ton, une chose à ne pas mentionner, une échéance que la réponse doit respecter — un modèle applique une contrainte si vous l’énoncez, et sinon retombe sur un réglage générique par défaut qui peut ne pas convenir. « Reste en dessous de 150 mots » et « évite le jargon technique » sont deux contraintes qu’un modèle peut suivre de façon fiable une fois qu’elles sont explicites ; aucune des deux n’est quelque chose qu’il déduit correctement de lui-même, avec constance.',
          ],
        },
        {
          id: 'name-the-format',
          heading: 'Nommez le format de sortie que vous voulez réellement',
          paragraphs: [
            'Une liste à puces, un court paragraphe, un tableau, un objet plus un corps de message — demander la forme voulue dès le départ évite un message de suivi demandant une reformulation. Cela compte encore plus, pas moins, une fois que la sortie doit être traitée par autre chose qu’une personne qui la lit ; pour ce cas, voir demander une sortie structurée à l’IA, cité ci-dessous, qui est le guide complémentaire plus approfondi sur ce point.',
          ],
        },
        {
          id: 'add-an-example',
          heading: 'Ajoutez un exemple quand une description seule serait ambiguë',
          paragraphs: [
            'Certaines choses sont plus faciles à montrer qu’à décrire — un style maison, un ton, un format spécifique pour une tâche récurrente. Un exemple bien choisi résout souvent une ambiguïté que plusieurs phrases de description ne résoudraient pas. Voir le prompting par exemples (few-shot), cité ci-dessous, pour savoir comment utiliser plus d’un exemple de façon délibérée, et quand cela vaut la longueur supplémentaire dans le prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un prompt plus long obtient-il toujours une meilleure réponse ?',
          answer:
            'Non — un prompt plus long n’aide que si la longueur supplémentaire est du contexte, une contrainte, ou un exemple qui manquerait sinon au modèle. Remplir un prompt d’instructions répétées ou de remplissage n’améliore pas la réponse et peut enterrer la partie qui comptait.',
        },
        {
          question: 'Un prompt clair empêchera-t-il un modèle de se tromper sur les faits ?',
          answer:
            'Non. Un prompt clair rend plus probable que le modèle comprenne ce que vous demandez, mais il ne vérifie pas les faits et n’élimine pas les hallucinations — voir pourquoi l’IA hallucine, cité ci-dessous, pour ce qui cause réellement cela et pourquoi le prompt seul ne peut pas le corriger.',
        },
        {
          question: 'Quelle est la chose la plus utile à ajouter à un prompt vague ?',
          answer:
            'Généralement le contexte : le fait ou les deux sur le public, l’objectif, ou la situation, dont une personne aurait besoin pour bien accomplir la tâche. Une contrainte ou un exemple aide aussi, mais ils comptent moins si le modèle ne sait toujours pas pour qui la réponse est destinée.',
        },
      ],
      productNote:
        'ClawAI ne réécrit pas votre prompt à votre place, mais un prompt plus clair va plus loin avec n’importe quel modèle vers lequel vous êtes routé — y compris via le routage Auto, qui répond toujours en fonction de ce que vous avez réellement demandé.',
    },
    [PromptGuideTopic.FEW_SHOT_PROMPTING]: {
      seo: {
        title: 'Le prompting par exemples (few-shot) : donner des exemples à un modèle',
        description:
          'Comment utiliser un ou plusieurs exemples dans un prompt pour montrer à un modèle le schéma voulu, plutôt que de seulement le décrire — avec des conseils sur le nombre d’exemples utiles et sur quand le zero-shot suffit.',
        keywords: [
          'prompting few-shot',
          'exemples dans un prompt',
          'one-shot vs few-shot prompting',
        ],
      },
      eyebrow: 'Guides de prompts',
      title: 'Le prompting par exemples (few-shot) : donner des exemples à un modèle',
      summary:
        'Le prompting few-shot consiste à inclure un ou plusieurs exemples travaillés directement dans le prompt, pour que le modèle puisse suivre le schéma plutôt que de le déduire d’une simple description. C’est l’une des façons les plus fiables de préciser ce que signifie « bon » pour une tâche plus facile à montrer qu’à expliquer.',
      sections: [
        {
          id: 'what-few-shot-means',
          heading: 'Ce que signifient « few-shot » et « zero-shot »',
          paragraphs: [
            'Un prompt zero-shot demande un résultat sans exemple inclus ; un prompt one-shot en inclut exactement un ; un prompt few-shot en inclut plusieurs. Ces termes décrivent le nombre d’exemples dans le prompt, pas une affirmation sur la précision — un prompt zero-shot bien écrit peut surpasser un prompt few-shot mal choisi, puisque les exemples n’aident que s’ils représentent réellement ce que vous voulez.',
          ],
        },
        {
          id: 'when-examples-help-most',
          heading: 'Quand les exemples aident plus qu’une description plus longue ne le ferait',
          paragraphs: [
            'Les exemples méritent leur place quand la tâche a un format, un ton ou un schéma véritablement plus facile à démontrer qu’à décrire — classer des données dans des catégories difficiles à définir avec des mots, reproduire une voix d’écriture spécifique, ou suivre un gabarit avec des particularités qu’une simple description manquerait. Pour une tâche déjà sans ambiguïté à partir d’une courte instruction, un exemple ajoute de la longueur sans ajouter d’information.',
          ],
        },
        {
          id: 'choosing-good-examples',
          heading: 'Ce qui rend un exemple utile, pas seulement présent',
          paragraphs: [
            'Un exemple ne vaut que ce que sa représentativité de la tâche réelle vaut — un exemple facile ou inhabituel peut enseigner le mauvais schéma. Quelques exemples bien choisis qui couvrent l’éventail des cas que vous attendez réellement, y compris un cas limite si probable, tend à mieux fonctionner que plusieurs exemples qui se ressemblent tous. Si vos exemples se contredisent en ton ou en format, attendez-vous à ce que le modèle les mélange plutôt que de choisir celui que vous vouliez.',
          ],
        },
      ],
      faq: [
        {
          question: 'Combien d’exemples un prompt few-shot doit-il inclure ?',
          answer:
            'Il n’y a pas de nombre fixe — assez pour couvrir l’éventail des cas attendus, souvent deux à cinq, et plus seulement si la tâche varie réellement davantage. Ajouter des exemples qui se ressemblent tous aide rarement au-delà du premier ou du deuxième.',
        },
        {
          question: 'Le few-shot est-il toujours meilleur que le zero-shot ?',
          answer:
            'Non. Ce n’est pas publié comme un gain de précision garanti et cette page n’en affirmera pas un — un prompt zero-shot clair sur une tâche bien définie peut tout aussi bien fonctionner, et les exemples aident surtout quand la tâche est plus facile à montrer qu’à décrire.',
        },
        {
          question: 'Puis-je combiner des exemples few-shot avec une instruction étape par étape ?',
          answer:
            'Oui — elles traitent des choses différentes. Les exemples montrent le schéma ou le format voulu ; demander un raisonnement étape par étape change la façon dont le modèle travaille vers la réponse. Voir le prompting en chaîne de pensée, cité ci-dessous, pour la seconde technique.',
        },
      ],
      productNote:
        'Un prompt few-shot fonctionne de la même façon sur tous les modèles vers lesquels ClawAI route — les exemples vivent dans votre prompt, pas dans un réglage, donc ils voyagent avec la conversation quel que soit le fournisseur qui répond.',
    },
    [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]: {
      seo: {
        title:
          'Le prompting en chaîne de pensée : demander à un modèle de raisonner étape par étape',
        description:
          'Ce qu’est le prompting en chaîne de pensée, quand demander à un modèle de travailler par étapes avant de répondre aide réellement, et pourquoi cela ne garantit pas un résultat correct.',
        keywords: [
          'prompting en chaîne de pensée',
          'prompting étape par étape',
          'technique de prompt de raisonnement IA',
        ],
      },
      eyebrow: 'Guides de prompts',
      title: 'Le prompting en chaîne de pensée : demander à un modèle de raisonner étape par étape',
      summary:
        'Le prompting en chaîne de pensée demande à un modèle de travailler un problème par étapes — le décomposer, vérifier des résultats intermédiaires — avant de donner une réponse finale, au lieu de produire une réponse de premier jet immédiatement. C’est une technique réelle et utile pour le bon type de tâche, et elle ne garantit pas à elle seule un raisonnement correct.',
      sections: [
        {
          id: 'what-it-is',
          heading: 'Ce que fait réellement demander un raisonnement étape par étape',
          paragraphs: [
            'Un prompt comme « travaille cela étape par étape » ou « montre ton raisonnement avant de donner une réponse finale » demande au modèle d’exposer les étapes intermédiaires plutôt que de sauter directement à une conclusion. Pour un problème à plusieurs étapes, cela peut faire apparaître une erreur dans une étape intermédiaire qui serait autrement enfouie dans une réponse finale unique et d’apparence sûre d’elle — et cela vous donne quelque chose de concret à vérifier plutôt qu’un simple résultat à croire sur parole.',
          ],
        },
        {
          id: 'when-it-helps',
          heading: 'Quand cela aide, et quand c’est inutile',
          paragraphs: [
            'Le prompting étape par étape tend à aider le plus sur des problèmes avec plusieurs étapes dépendantes, plusieurs contraintes à satisfaire à la fois, ou un calcul qui mérite d’être revérifié — un problème en plusieurs parties, une décision avec plusieurs facteurs, un enchaînement logique qui doit tenir. Une question courte et à une seule étape en bénéficie rarement, et le demander quand même ajoute de la longueur sans changer la réponse. Voir choisir un modèle pour un raisonnement complexe, cité ci-dessous, pour comment cela se relie au choix d’un modèle conçu précisément pour ce type de tâche.',
          ],
        },
        {
          id: 'what-it-does-not-guarantee',
          heading: 'Ce que cela ne garantit pas',
          paragraphs: [
            'Demander à un modèle de raisonner étape par étape ne garantit pas une réponse correcte, et une chaîne d’étapes sûre d’elle-même et bien structurée peut quand même aboutir à la mauvaise conclusion — les étapes supplémentaires rendent une erreur plus facile à repérer, pas impossible à commettre. Cela concorde avec pourquoi l’IA hallucine, cité ci-dessous : un modèle peut produire un raisonnement fluide et d’apparence plausible qui reste faux, donc une réponse étape par étape mérite d’être vérifiée sur tout ce qui compte, et non prise sur parole parce qu’elle a l’air méthodique.',
          ],
        },
      ],
      faq: [
        {
          question: 'Le prompting en chaîne de pensée garantit-il une réponse correcte ?',
          answer:
            'Non — il ne garantit pas un raisonnement correct, et une réponse étape par étape peut quand même aboutir à une mauvaise conclusion. Il tend à rendre une erreur plus facile à repérer dans les étapes intermédiaires, ce qui est différent de l’empêcher.',
        },
        {
          question: 'Quand devrais-je demander à un modèle de montrer son raisonnement ?',
          answer:
            'Sur des problèmes avec plusieurs étapes ou contraintes dépendantes, où une erreur intermédiaire serait autrement cachée dans une réponse finale unique. Une question courte et à une seule étape en a rarement besoin.',
        },
        {
          question: 'Est-ce la même chose qu’utiliser un modèle axé sur le raisonnement ?',
          answer:
            'Lié mais pas identique — ce guide porte sur la façon de formuler un prompt pour n’importe quel modèle ; choisir un modèle pour un raisonnement complexe, cité ci-dessous, porte sur quel modèle est conçu pour travailler par étapes par défaut. Les deux peuvent être combinés.',
        },
      ],
      productNote:
        'Le mode de routage High Reasoning de ClawAI favorise un modèle adapté pour travailler un problème par étapes, ce qui s’accorde naturellement avec un prompt étape par étape — mais la technique de cette page fonctionne avec n’importe quel modèle vers lequel vous êtes routé.',
    },
    [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]: {
      seo: {
        title: 'Comment écrire un prompt qui demande une sortie structurée',
        description:
          'Des conseils pratiques pour écrire un prompt qui demande de façon fiable du JSON, un tableau, ou un autre format fixe — le pendant pratique de ce que sont les sorties IA structurées et pourquoi le prompt seul ne garantit pas une structure valide.',
        keywords: [
          'prompt pour sortie JSON',
          'prompting de sortie structurée',
          'comment demander un tableau à l’IA',
        ],
      },
      eyebrow: 'Guides de prompts',
      title: 'Comment écrire un prompt qui demande une sortie structurée',
      summary:
        'Ce guide est le pendant pratique, « comment écrire le prompt », de qu’est-ce qu’une sortie IA structurée, cité ci-dessous, qui couvre le mécanisme technique — cette page suppose que vous voulez déjà une sortie structurée et se concentre sur comment bien la demander. Elle ne réexplique pas le mécanisme sous-jacent et reste cohérente avec ce que cette page dit déjà sur ce qu’un simple prompt peut et ne peut pas garantir.',
      sections: [
        {
          id: 'describe-the-shape-exactly',
          heading: 'Décrivez la forme exacte voulue, pas seulement le nom du format',
          paragraphs: [
            'Dire « renvoie cela en JSON » est un début, mais nommer les champs, leur ordre et leurs types est ce qui supprime réellement l’ambiguïté — « renvoie un objet JSON avec un champ texte appelé title et un champ tableau appelé steps, où chaque étape est une chaîne de texte » laisse bien moins de place à la supposition que « renvoie du JSON avec le title et les steps ». La même logique s’applique à un tableau : nommez les colonnes et ce qui appartient à chacune plutôt que de supposer que le modèle choisira la même répartition que vous avez en tête.',
          ],
        },
        {
          id: 'show-an-example-of-the-shape',
          heading: 'Montrez un exemple de la sortie exacte que vous voulez',
          paragraphs: [
            'Un seul exemple de la forme finale — un court échantillon d’objet JSON, ou une ligne du tableau — supprime souvent plus d’ambiguïté qu’un paragraphe de description supplémentaire, pour la même raison qu’un exemple aide dans le prompting few-shot, cité ci-dessous. Cela compte le plus quand le format a une particularité facile à décrire de façon imprécise, comme si un champ est optionnel ou comment une valeur manquante doit être représentée.',
          ],
        },
        {
          id: 'plain-prompting-has-limits',
          heading: 'Ce qu’un prompt bien écrit ne garantit pas ici',
          paragraphs: [
            'Un prompt soigneusement écrit rend une sortie valide et bien formée plus probable, mais ne la garantit pas — un modèle peut encore renvoyer du JSON malformé, un champ en trop, ou du texte enveloppant la structure demandée, en particulier sur une réponse plus longue ou plus complexe. Voir qu’est-ce qu’une sortie IA structurée, cité ci-dessous, pour les mécanismes techniques — comme la génération contrainte par schéma — qui existent précisément parce que le prompt seul n’est pas une garantie fiable, et pour ce que ClawAI fait différemment que de simplement demander poliment dans un prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Demander poliment dans un prompt suffit-il à garantir du JSON valide ?',
          answer:
            'Non — un prompt bien écrit le rend plus probable, pas certain. Voir qu’est-ce qu’une sortie IA structurée, cité ci-dessous, pour les mécanismes qui existent parce que le prompt seul ne garantit pas de façon fiable une structure valide.',
        },
        {
          question: 'Devrais-je décrire le format ou montrer un exemple ?',
          answer:
            'Les deux, quand le format présente une ambiguïté — une description précise des champs plus un exemple de la forme finale couvre plus de cas que l’un ou l’autre seul. Voir le prompting few-shot, cité ci-dessous, pour comment choisir un bon exemple.',
        },
        {
          question:
            'Quelle est la différence entre ce guide et qu’est-ce qu’une sortie IA structurée ?',
          answer:
            'Cette autre page explique le mécanisme technique derrière une sortie structurée fiable ; cette page est le pendant pratique — comment écrire le prompt lui-même. Elles sont pensées pour être lues ensemble, pas comme des doublons l’une de l’autre.',
        },
      ],
      productNote:
        'Pour une sortie qui doit être fiablement valide, les mécanismes de sortie structurée de ClawAI (voir qu’est-ce qu’une sortie IA structurée, cité ci-dessous) vont plus loin que la seule formulation du prompt — ce guide couvre la moitié « rédaction du prompt » de ce tableau.',
    },
    [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]: {
      seo: {
        title: 'Prompt système vs prompt utilisateur : ce que fait chacun',
        description:
          'La différence entre un prompt système et les messages que vous tapez dans une conversation — à quoi sert chacun, quand utiliser lequel, et comment ils fonctionnent ensemble.',
        keywords: [
          'prompt système vs prompt utilisateur',
          'qu’est-ce qu’un prompt système',
          'rôles de prompt IA expliqués',
        ],
      },
      eyebrow: 'Guides de prompts',
      title: 'Prompt système vs prompt utilisateur : ce que fait chacun',
      summary:
        'Une conversation avec un modèle est généralement construite à partir de plus d’un type de message : un prompt système qui fixe des instructions permanentes pour toute la conversation, et des prompts utilisateur — ce que vous tapez réellement — qui demandent quelque chose de spécifique à l’intérieur de celle-ci. Savoir lequel utiliser pour une instruction donnée évite de se répéter et garde une longue conversation plus cohérente.',
      sections: [
        {
          id: 'what-a-system-prompt-is-for',
          heading: 'À quoi sert un prompt système',
          paragraphs: [
            'Un prompt système fixe une instruction qui s’applique à toute la conversation plutôt qu’à un seul message qu’elle contient — une personnalité à tenir, un ton à garder, une règle à toujours suivre (« réponds toujours en anglais formel » ou « ne suggère jamais un dosage spécifique »). Il est défini une fois, généralement avant que la conversation ne commence, et un modèle le traite comme une consigne permanente plutôt que comme quelque chose à négocier à chaque nouveau message.',
          ],
        },
        {
          id: 'what-a-user-prompt-is-for',
          heading: 'À quoi sert un prompt utilisateur',
          paragraphs: [
            'Un prompt utilisateur est ce que vous tapez à chaque tour de la conversation — la question ou tâche spécifique de ce message. C’est là que s’applique surtout le conseil de comment écrire un prompt clair et précis sur le contexte, les contraintes, le format et les exemples, puisqu’un prompt utilisateur porte généralement sur une chose concrète plutôt que sur une règle permanente pour toute la conversation.',
          ],
        },
        {
          id: 'when-to-use-which',
          heading: 'Quand placer une instruction dans le prompt système plutôt que de la répéter',
          paragraphs: [
            'Une instruction qui devrait tenir pour chaque message — un ton, une personnalité, une limite — appartient au prompt système, pour que vous n’ayez pas à la reformuler à chaque tour en risquant qu’elle soit abandonnée ou contredite en cours de longue conversation. Une demande ponctuelle qui ne s’applique qu’au message en cours appartient au prompt utilisateur. Un prompt système n’est pas une frontière de sécurité à lui seul ; voir qu’est-ce que l’injection de prompt, cité ci-dessous, pour comprendre pourquoi une instruction placée à l’un ou l’autre endroit peut toujours être contournée par du contenu adverse ailleurs dans une conversation.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un message utilisateur peut-il l’emporter sur un prompt système ?',
          answer:
            'Cela dépend de la façon dont un produit spécifique le gère, et ce n’est pas une garantie établie en général — un prompt système est pensé comme une consigne permanente, pas comme une règle inviolable. Voir qu’est-ce que l’injection de prompt, cité ci-dessous, pour comprendre pourquoi le traiter comme une frontière de sécurité absolue est une erreur.',
        },
        {
          question: 'Ai-je besoin d’un prompt système pour une question simple et ponctuelle ?',
          answer:
            'Non — un prompt système mérite sa place quand une instruction doit s’appliquer sur toute une conversation. Pour une seule question, tout mettre dans le prompt utilisateur est plus simple et tout aussi efficace.',
        },
        {
          question:
            'Quel type d’instruction appartient à un prompt système plutôt qu’à un prompt utilisateur ?',
          answer:
            'Une règle permanente qui ne devrait pas avoir besoin d’être répétée — une personnalité, un ton, une limite que le modèle doit toujours respecter. Une demande spécifique et ponctuelle appartient plutôt au prompt utilisateur.',
        },
      ],
      productNote:
        'Le réglage de prompt système de ClawAI s’applique à toute une conversation de la même façon sur chaque fournisseur vers lequel il route, de sorte qu’une instruction permanente n’a pas besoin d’être réécrite par modèle.',
    },
    [PromptGuideTopic.ITERATING_ON_A_PROMPT]: {
      seo: {
        title: 'Que faire quand la première réponse de l’IA n’est pas la bonne',
        description:
          'Une approche pratique pour déboguer un prompt qui n’a pas obtenu la réponse voulue — diagnostiquer ce qui manquait plutôt que simplement répéter la demande, et savoir quand recommencer plutôt que rafistoler.',
        keywords: [
          'améliorer un prompt IA',
          'corriger une mauvaise réponse IA',
          'déboguer des prompts IA',
        ],
      },
      eyebrow: 'Guides de prompts',
      title: 'Que faire quand la première réponse de l’IA n’est pas la bonne',
      summary:
        'La première réponse à un prompt est rarement le dernier mot — la plupart des gens obtiennent un meilleur résultat en traitant une réponse décevante comme une information sur ce qui manquait au prompt, puis en ajustant, plutôt qu’en répétant la même demande en espérant autre chose. Ce guide passe en revue comment diagnostiquer une mauvaise réponse et décider quoi changer.',
      sections: [
        {
          id: 'diagnose-before-you-rewrite',
          heading: 'Diagnostiquez ce qui n’a pas marché avant de réécrire tout le prompt',
          paragraphs: [
            'Une réponse décevante entre généralement dans l’une de quelques catégories : elle a manqué un contexte que vous aviez mais n’avez pas énoncé, elle a ignoré une contrainte, elle a utilisé le mauvais format, ou elle se trompe sur un fait avec assurance. Identifier laquelle s’est produite pointe vers une correction précise — une contrainte manquante appelle à ajouter la contrainte explicitement, pas à réécrire tout le prompt depuis le début ni à le répéter plus fermement.',
          ],
        },
        {
          id: 'add-what-was-missing',
          heading: 'Ajoutez précisément ce qui manquait, pas plus d’instructions en général',
          paragraphs: [
            'Une fois que vous savez ce qui manquait, ajoutez exactement cela : la contrainte, l’exemple, l’élément de contexte, ou la description du format qui aurait rendu la demande claire. Voir comment écrire un prompt clair et précis, cité ci-dessous, pour les fondamentaux sur lesquels s’appuie généralement cette étape — l’essentiel de l’itération consiste à appliquer les mêmes quelques éléments que le premier prompt avait omis.',
          ],
        },
        {
          id: 'know-when-to-start-over',
          heading: 'Sachez quand recommencer un prompt plutôt que rafistoler',
          paragraphs: [
            'Un long va-et-vient de petites corrections peut laisser une conversation porter des instructions contradictoires que le modèle essaie maintenant de concilier — à ce stade, un prompt neuf et complet qui énonce tout ce que vous avez appris être nécessaire est souvent plus rapide et plus fiable qu’un rafistolage de plus. C’est aussi bon à se rappeler quand la réponse se trompe sur un fait avec assurance plutôt que d’être simplement mal formatée : ajuster la formulation ne corrigera pas cela, puisque ce n’est pas un problème de formulation — voir pourquoi l’IA hallucine, cité ci-dessous, pour ce qui se passe réellement dans ce cas.',
          ],
        },
      ],
      faq: [
        {
          question:
            'La réponse est bien écrite mais factuellement fausse — comment corriger le prompt ?',
          answer:
            'Vous ne pouvez généralement pas corriger cela en reformulant le prompt, car ce n’est pas un problème de formulation. Voir pourquoi l’IA hallucine, cité ci-dessous, pour ce qui se passe réellement et ce qui aide vraiment, comme demander au modèle de citer des sources vérifiables ou utiliser un mode recherche qui va chercher l’information.',
        },
        {
          question:
            'Dois-je continuer à corriger dans la même conversation ou en démarrer une nouvelle ?',
          answer:
            'Les deux peuvent fonctionner, mais une longue chaîne de petites corrections risque de laisser des instructions contradictoires derrière elle. Si une conversation a déjà eu plusieurs corrections, un prompt neuf et complet est souvent plus fiable qu’un rafistolage de plus.',
        },
        {
          question:
            'Combien de fois devrais-je essayer avant d’abandonner une approche de prompt ?',
          answer:
            'Il n’y a pas de nombre fixe — mais si deux ou trois corrections précises et diagnostiquées n’ont pas aidé, le problème n’est peut-être pas du tout le prompt. Voir choisir un modèle pour votre tâche, cité ci-dessous, pour savoir si la tâche a besoin d’un autre type de modèle.',
        },
      ],
      productNote:
        'Chaque conversation dans ClawAI conserve son historique, vous pouvez donc itérer sur un prompt sur plusieurs tours et voir exactement ce qui a changé d’une réponse à l’autre.',
    },
    [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]: {
      seo: {
        title: 'Comment le prompting diffère pour le code, l’écriture et l’analyse',
        description:
          'Comment la bonne approche de prompting change entre les tâches de code, les tâches d’écriture et les tâches d’analyse — et comment cela se relie au choix du bon modèle pour chacune, pas seulement des bons mots.',
        keywords: [
          'prompting pour le code vs l’écriture',
          'prompts IA par type de tâche',
          'prompting pour des tâches d’analyse',
        ],
      },
      eyebrow: 'Guides de prompts',
      title: 'Comment le prompting diffère pour le code, l’écriture et l’analyse',
      summary:
        'Les techniques de ce hub — clarté, exemples, raisonnement étape par étape, format — s’appliquent partout, mais lesquelles comptent le plus change selon le type de tâche. Ce guide passe en revue ce qui tend à aider le plus pour le code, pour l’écriture, et pour l’analyse, et renvoie vers le cluster d’adéquation des modèles pour le volet modèle de la même question plutôt que de réexpliquer ces distinctions de tâches ici.',
      sections: [
        {
          id: 'prompting-for-code',
          heading: 'Le prompting pour le code : la précision avant la persuasion',
          paragraphs: [
            'Un prompt de code bénéficie surtout de la précision — la signature exacte de la fonction, le langage et sa version, la contrainte que le code doit satisfaire, un exemple de l’entrée et de la sortie attendues. Un cadrage vague qui serait inoffensif dans un prompt d’écriture (« rends-le bon ») ne donne presque rien à travailler pour une tâche de code, puisqu’il n’existe pas de forme unique correcte pour une telle demande.',
          ],
        },
        {
          id: 'prompting-for-writing',
          heading: 'Le prompting pour l’écriture : public, ton, et un bon exemple',
          paragraphs: [
            'Un prompt d’écriture ou d’édition bénéficie surtout des conseils sur le contexte et les contraintes de comment écrire un prompt clair et précis, cité ci-dessous — à qui s’adresse le texte, le ton qu’il doit tenir, et une contrainte de longueur ou de structure. Un exemple de la voix visée, selon le prompting few-shot, cité ci-dessous, fait souvent plus de travail ici qu’une description plus longue du ton ne le ferait.',
          ],
        },
        {
          id: 'prompting-for-analysis',
          heading:
            'Le prompting pour l’analyse : demander le raisonnement, pas seulement la conclusion',
          paragraphs: [
            'Une tâche analytique — peser des options, interpréter des données, travailler une décision avec plusieurs facteurs — bénéficie généralement du prompting en chaîne de pensée, cité ci-dessous : demander au modèle d’exposer son raisonnement plutôt que de seulement énoncer une conclusion vous donne quelque chose à vérifier, et tend à faire apparaître un facteur manqué ou une hypothèse faible. C’est le même type de tâche que choisir un modèle pour un raisonnement complexe, cité ci-dessous, qui couvre quel modèle est conçu précisément pour cela plutôt que de répéter ce conseil ici.',
          ],
        },
      ],
      faq: [
        {
          question:
            'Une seule technique de prompting fonctionne-t-elle le mieux pour les trois types de tâches ?',
          answer:
            'Non — la précision compte le plus pour le code, le public et le ton comptent le plus pour l’écriture, et demander un raisonnement visible compte le plus pour l’analyse. La plupart des tâches bénéficient d’un mélange, pondéré selon celui de ces éléments dont la tâche a réellement besoin.',
        },
        {
          question:
            'Le modèle que je choisis compte-t-il autant que la façon dont j’écris le prompt ?',
          answer:
            'Les deux comptent, et ce sont des leviers différents — ce guide porte sur la formulation ; voir choisir un modèle pour votre tâche, cité ci-dessous, pour le volet adéquation du modèle pour le code, l’écriture, et les tâches à forte composante de raisonnement spécifiquement.',
        },
        {
          question:
            'Un prompt de code est-il juste un prompt d’écriture avec des mots différents ?',
          answer:
            'Non — une tâche de code a généralement une seule forme correcte ou fonctionnelle, donc la précision sur l’exigence exacte compte davantage que pour la plupart des tâches d’écriture, où plusieurs formulations différentes peuvent toutes être bonnes.',
        },
      ],
      productNote:
        'Les modes de routage de ClawAI penchent déjà vers un modèle adapté par tâche — Auto et High Reasoning pour le travail analytique, par exemple — de sorte qu’un prompt bien écrit et un routage adapté fonctionnent ensemble plutôt que comme des choix séparés.',
    },
  },
};
