import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCasesClusterDictionary } from '@/types/use-cases-cluster.types';

export const FR_USE_CASES_CLUSTER_CONTENT: UseCasesClusterDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'Pour aller plus loin',
    lastReviewed: 'Dernière relecture',
    backToHub: 'Tous les cas d’usage',
    ctaTitle: 'Essayez plutôt que de nous croire sur parole',
    ctaBody:
      'ClawAI oriente une conversation vers le modèle et les outils adaptés au travail à faire, sur tous les fournisseurs connectés, depuis un seul espace de travail.',
    startFree: 'Commencer avec le plan gratuit',
    seeFeatures: 'Découvrir ce que fait ClawAI',
  },
  hub: {
    tasksHeading: 'Approfondir un cas précis',
    tasksIntro:
      'Les cas ci-dessus en sont la version courte. Chacun des sept travaux ci-dessous a sa propre page complète : ce que ce travail exige vraiment, quelle fonctionnalité ou quel mode de routage de ClawAI le prend en charge, et où vérifier les détails par vous-même.',
    cardSummaries: {
      [UseCaseTask.CODING_AND_DEVELOPMENT]:
        'Écrire, modifier et relire du code, avec l’agent de code pour les changements à plusieurs étapes.',
      [UseCaseTask.RESEARCH_AND_FACT_FINDING]:
        'Des réponses fondées sur des sources que ClawAI a réellement consultées, pas seulement sur ses données d’entraînement.',
      [UseCaseTask.WRITING_AND_EDITING]:
        'Rédaction et édition longues qui restent cohérentes sur l’ensemble d’un document.',
      [UseCaseTask.COMPARING_MODEL_ANSWERS]:
        'Exécuter le même prompt sur plusieurs modèles côte à côte, et laisser l’un d’eux juger les autres.',
      [UseCaseTask.WORKSPACE_AUTOMATION]:
        'Connecter les outils que votre équipe utilise déjà pour que ClawAI puisse agir dedans.',
      [UseCaseTask.STRUCTURED_DATA_EXTRACTION]:
        'Transformer un texte ou des pages en désordre en sortie structurée que vos propres systèmes peuvent exploiter.',
      [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]:
        'Garder une requête sur du matériel que vous contrôlez plutôt que chez un fournisseur cloud.',
    },
  },
  tasks: {
    [UseCaseTask.CODING_AND_DEVELOPMENT]: {
      seo: {
        title: 'Code et développement avec ClawAI',
        description:
          'Comment ClawAI accompagne le code — discutez avec un modèle pour une correction rapide, ou confiez un changement à plusieurs étapes à l’agent de code. Fondé sur le produit, sans benchmark inventé.',
        keywords: [
          'IA pour le code',
          'cas d’usage agent de code',
          'flux de travail de programmation avec IA',
        ],
      },
      eyebrow: 'Cas d’usage',
      title: 'Code et développement',
      summary:
        'Le travail de code dans ClawAI prend deux formes : une question rapide ou une modification d’un seul fichier traitée dans une conversation ordinaire, et un changement à plusieurs étapes — plusieurs fichiers, un plan, une relecture — confié à l’agent de code. Les deux s’appuient sur le même routage et le même catalogue de fournisseurs.',
      sections: [
        {
          id: 'quick-fixes-in-chat',
          heading: 'Corrections et questions rapides, dans une conversation ordinaire',
          paragraphs: [
            'Une modification d’un seul fichier, l’explication d’une erreur, ou une courte refonte est un message de conversation ClawAI ordinaire comme un autre. Le routeur peut l’envoyer vers un modèle adapté à la tâche en mode Auto ou High Reasoning, ou vous pouvez fixer un modèle précis en mode Manual Model si vous savez déjà lequel convient à un type de question récurrent — voir choisir un modèle pour le code, lié ci-dessous, pour ce qu’il faut peser.',
          ],
        },
        {
          id: 'multi-step-changes-with-the-coding-agent',
          heading: 'Changements à plusieurs étapes avec l’agent de code',
          paragraphs: [
            'Pour un changement qui s’étend sur plusieurs fichiers ou étapes — une fonctionnalité, une migration, une refonte avec un plan — l’agent de code de ClawAI exécute une boucle par tours sur votre base de code plutôt que de répondre en un seul message, avec sa propre surface d’usage mesurée, distincte de la conversation ordinaire. Voir la page de l’agent de code, liée ci-dessous, pour ce qu’il fait et comment il s’installe.',
          ],
        },
        {
          id: 'connecting-your-repository',
          heading: 'Connecter le dépôt que le travail concerne',
          paragraphs: [
            'Le travail de code a souvent besoin du dépôt lui-même, pas seulement d’extraits collés — ClawAI se connecte à GitHub, GitLab et Bitbucket comme connecteurs d’espace de travail, de sorte qu’une requête puisse référencer le code, les tickets ou les pull requests réels sur lesquels elle porte, plutôt que vous copiiez des fichiers à la main. Voir la page des intégrations, liée ci-dessous, pour la liste complète des connecteurs.',
          ],
        },
      ],
      faq: [
        {
          question: 'Est-ce que ClawAI écrit du code pour moi automatiquement ?',
          answer:
            'Pour un changement petit et bien spécifié, un simple message de conversation suffit souvent. Pour un changement à plusieurs étapes sur plusieurs fichiers, l’agent de code exécute une boucle par tours sur votre base de code plutôt que de répondre en une fois — voir la page de l’agent de code, liée ci-dessous.',
        },
        {
          question: 'ClawAI peut-il voir mon véritable dépôt ?',
          answer:
            'Oui, une fois connecté — ClawAI dispose de connecteurs d’espace de travail pour GitHub, GitLab et Bitbucket, de sorte qu’une requête de code puisse référencer de vrais fichiers, tickets et pull requests plutôt que des extraits collés.',
        },
        {
          question: 'Quel modèle utiliser pour coder ?',
          answer:
            'Cette page n’en désigne pas un — voir choisir un modèle pour le code, lié ci-dessous, pour ce qu’il faut peser plutôt qu’un classement.',
        },
      ],
      productNote:
        'ClawAI route automatiquement une question de code ordinaire vers un modèle adapté, et confie un changement à plusieurs étapes à l’agent de code — une fonctionnalité réelle et déployée, avec son propre usage mesuré, pas un artifice de conversation.',
    },
    [UseCaseTask.RESEARCH_AND_FACT_FINDING]: {
      seo: {
        title: 'Recherche et vérification des faits avec ClawAI',
        description:
          'Comment le mode Research de ClawAI recherche, récupère et extrait depuis le web pour qu’une réponse cite des sources réellement consultées, facturé séparément du crédit modèle.',
        keywords: [
          'assistant de recherche IA',
          'vérification des faits avec IA',
          'réponses IA avec sources',
        ],
      },
      eyebrow: 'Cas d’usage',
      title: 'Recherche et vérification des faits',
      summary:
        'Une tâche de recherche demande une réponse fondée sur des sources consultées pour cette question précise, pas seulement sur ce qu’un modèle a appris pendant son entraînement. Le mode Research de ClawAI est une fonctionnalité réelle et déployée conçue exactement pour cela, avec trois niveaux de profondeur et sa propre mesure d’usage distincte de la conversation ordinaire.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Ce que fait vraiment le mode Research',
          paragraphs: [
            'Le mode Research permet à une requête de faire une recherche web, de récupérer une page, ou de récupérer et d’en extraire un contenu structuré, avant que ClawAI ne produise une réponse — la réponse peut ainsi citer des sources récupérées pour cette question plutôt que de reposer uniquement sur les données d’entraînement. C’est une fonctionnalité réservée à certains plans, avec trois niveaux de profondeur : recherche seule, recherche plus récupération, ou recherche plus récupération et extraction.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Mesuré séparément de votre crédit modèle',
          paragraphs: [
            'L’accès à la recherche — recherche web, récupération de pages et extraction — est mesuré comme son propre usage, distinct du quota de tokens sur lequel puise un message de conversation ordinaire. Le quota de recherche de votre plan et son quota de tokens modèle sont deux lignes différentes, pas une réserve commune, donc lancer une recherche ne consomme pas le crédit qu’utiliserait une tâche de code ou de rédaction.',
          ],
        },
        {
          id: 'picking-a-depth-for-the-question',
          heading: 'Choisir une profondeur adaptée à la question',
          paragraphs: [
            'Une vérification rapide d’un fait n’a généralement besoin que de la profondeur recherche seule ; une question qui dépend de ce que dit précisément une page appelle la recherche plus récupération ; extraire des données structurées de plusieurs pages à la fois, c’est là que la recherche plus récupération et extraction se justifie. Adapter la profondeur à la question garde l’usage de la recherche proportionné, au lieu de systématiquement choisir l’option la plus coûteuse.',
          ],
        },
      ],
      faq: [
        {
          question: 'La recherche utilise-t-elle mon crédit de tokens modèle ?',
          answer:
            'Non. L’accès à la recherche — recherche web, récupération de pages et extraction — est mesuré séparément du quota de tokens sur lequel puise un message de conversation ordinaire. Vérifiez les deux quotas sur la page tarifs.',
        },
        {
          question: 'Quelle est la différence entre les trois profondeurs du mode Research ?',
          answer:
            'Recherche seule renvoie les résultats d’une recherche web ; recherche plus récupération va aussi chercher le contenu de la page ; recherche plus récupération et extraction en tire en plus un contenu structuré.',
        },
        {
          question: 'Le modèle choisi compte-t-il pour la qualité de la recherche ?',
          answer:
            'Oui — le mode Research change les sources qu’un modèle peut voir, pas sa capacité à les lire et à les concilier. Voir choisir un modèle pour la recherche sourcée, lié ci-dessous.',
        },
      ],
      productNote:
        'Le mode Research de ClawAI peut faire une recherche, récupérer une page, ou récupérer et en extraire le contenu sur le web avant qu’un modèle ne réponde — une fonctionnalité réelle et déployée, mesurée séparément de votre crédit de tokens modèle.',
    },
    [UseCaseTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Rédaction et édition avec ClawAI',
        description:
          'Comment ClawAI accompagne la rédaction et l’édition de textes longs — packs de contexte pour le matériel de référence, mémoire pour un style récurrent, et routage vers un modèle adapté.',
        keywords: [
          'assistant de rédaction IA',
          'flux de travail d’édition IA',
          'rédaction longue avec IA',
        ],
      },
      eyebrow: 'Cas d’usage',
      title: 'Rédaction et édition',
      summary:
        'La rédaction et l’édition dans ClawAI vont d’une courte réécriture à un long document qui doit rester cohérent de la première à la dernière page. Deux fonctionnalités portent l’essentiel une fois qu’un document devient long : les packs de contexte pour le matériel de référence, et la mémoire pour un style qui doit persister entre les sessions.',
      sections: [
        {
          id: 'reference-material-with-context-packs',
          heading: 'Garder le matériel de référence en vue avec les packs de contexte',
          paragraphs: [
            'Une charte éditoriale, des versions précédentes, ou un matériel source auquel un texte doit rester fidèle est un problème de contexte avant d’être un problème de rédaction — les packs de contexte de ClawAI sont une fonctionnalité réservée à certains plans pour garder ce matériel disponible dans une conversation au lieu de le recoller à chaque session. Voir qu’est-ce qu’un pack de contexte, lié ci-dessous, pour comment fonctionne cette fonctionnalité.',
          ],
        },
        {
          id: 'memory-for-a-recurring-voice',
          heading: 'La mémoire pour un ton qui doit persister',
          paragraphs: [
            'Une tâche de rédaction récurrente — une newsletter, un rapport hebdomadaire, un style de documentation — profite du fait que ClawAI retient les préférences établies entre les sessions plutôt que de les réexpliquer à chaque fois. La mémoire est une fonctionnalité distincte des packs de contexte, réservée elle aussi à certains plans : les packs de contexte gardent le matériel de référence d’une tâche, la mémoire garde ce que ClawAI a appris sur la façon dont vous voulez que les choses soient écrites.',
          ],
        },
        {
          id: 'routing-a-writing-request',
          heading: 'Router une requête de rédaction ou d’édition vers un modèle adapté',
          paragraphs: [
            'Le routeur de ClawAI peut envoyer une requête de rédaction ou d’édition vers un modèle adapté automatiquement en mode Auto ou Cost Saver, ou vous pouvez en fixer un en mode Manual Model pour une tâche récurrente avec un style connu. Voir choisir un modèle pour la rédaction et l’édition, lié ci-dessous, pour ce qu’il faut peser en cas de choix délibéré.',
          ],
        },
      ],
      faq: [
        {
          question:
            'ClawAI peut-il garder une charte éditoriale en vue sur toute une session d’édition ?',
          answer:
            'Oui — les packs de contexte sont conçus exactement pour cela, gardant un matériel de référence comme une charte éditoriale ou un document source disponible dans une conversation au lieu de le recoller. Voir qu’est-ce qu’un pack de contexte, lié ci-dessous.',
        },
        {
          question: 'ClawAI se souvient-il de la façon dont j’aime que les choses soient écrites ?',
          answer:
            'La mémoire peut faire persister des préférences établies entre les sessions pour une tâche de rédaction récurrente, séparément des packs de contexte, qui gardent un matériel de référence propre à une tâche plutôt que des préférences durables.',
        },
        {
          question: 'Quel modèle utiliser pour la rédaction ?',
          answer:
            'Cette page n’en désigne pas un — voir choisir un modèle pour la rédaction et l’édition, lié ci-dessous, pour ce qu’il faut peser plutôt qu’un classement.',
        },
      ],
      productNote:
        'ClawAI peut garder un matériel de référence en vue avec les packs de contexte et retenir un style récurrent avec la mémoire — deux fonctionnalités réelles, réservées à certains plans, pas des artifices de conversation.',
    },
    [UseCaseTask.COMPARING_MODEL_ANSWERS]: {
      seo: {
        title: 'Comparer les réponses de plusieurs modèles avec ClawAI',
        description:
          'Comment les modes Compare et Judge de ClawAI exécutent un même prompt sur plusieurs modèles côte à côte et font évaluer les résultats par un modèle juge — fondé sur la fonctionnalité déployée, sans classement inventé.',
        keywords: [
          'comparer les réponses de modèles IA',
          'consensus entre modèles IA',
          'réponses IA best-of-N',
        ],
      },
      eyebrow: 'Cas d’usage',
      title: 'Comparer les réponses de plusieurs modèles',
      summary:
        'Parfois, la bonne approche n’est pas de choisir un modèle à l’avance mais d’exécuter le même prompt sur plusieurs et de regarder ce qui revient. Le mode Compare de ClawAI fait exactement cela, et le mode Judge peut faire évaluer les résultats par un modèle distinct plutôt que de vous laisser lire chaque réponse vous-même.',
      sections: [
        {
          id: 'what-compare-mode-does',
          heading: 'Ce que fait le mode Compare',
          paragraphs: [
            'Le mode Compare envoie un prompt à plusieurs modèles à la fois et affiche les réponses côte à côte, de sorte qu’une décision importante — un jugement, une requête ambiguë, un cas où le cadrage d’un modèle pourrait être erroné — bénéficie de plus d’un point de vue. C’est une fonctionnalité réservée à certains plans, mesurée par voie plutôt que par exécution, si bien que le coût augmente avec le nombre de modèles comparés.',
          ],
        },
        {
          id: 'consensus-and-best-of-n',
          heading: 'Le consensus et le best-of-N, expliqués correctement',
          paragraphs: [
            'Deux notions décrivent ce que l’on fait de plusieurs réponses une fois qu’on les a : le consensus, où l’accord entre modèles est en soi une information utile, et le best-of-N, où l’on génère plusieurs candidats puis on choisit ou synthétise le plus solide. Voir qu’est-ce que le consensus IA et qu’est-ce que le best-of-N, tous deux liés ci-dessous, pour comment chacun fonctionne réellement plutôt qu’un vernis marketing.',
          ],
        },
        {
          id: 'judge-mode-and-critic-review',
          heading: 'Faire évaluer les autres réponses par un modèle',
          paragraphs: [
            'Le mode Judge est une fonctionnalité distincte, réservée à certains plans, qui fait un second passage sur une exécution Compare, avec un modèle qui évalue les autres plutôt que vous lisant chaque réponse à la main. La relecture critique est une fonctionnalité liée mais distincte, pour un second regard sur une seule réponse plutôt qu’une comparaison entre modèles — voir qu’est-ce qu’un juge IA, lié ci-dessous, pour comment fonctionne réellement cette évaluation.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quelle est la différence entre le mode Compare et le mode Judge ?',
          answer:
            'Le mode Compare exécute un prompt sur plusieurs modèles et affiche chaque réponse côte à côte. Le mode Judge est un second passage distinct, réservé à certains plans, qui fait évaluer les résultats d’une exécution Compare par un modèle au lieu que vous lisiez chacune vous-même.',
        },
        {
          question:
            'Le mode Compare coûte-t-il plus cher qu’un message de conversation ordinaire ?',
          answer:
            'L’usage de Compare est mesuré par voie, pas par exécution — exécuter le même prompt sur davantage de modèles coûte proportionnellement plus. Vérifiez le quota actuel sur la page tarifs.',
        },
        {
          question: 'Qu’est-ce que le best-of-N, et est-ce la même chose que le consensus ?',
          answer:
            'Non — le consensus considère l’accord entre les réponses des modèles comme informatif en soi, tandis que le best-of-N génère plusieurs candidats puis choisit ou synthétise le plus solide. Voir qu’est-ce que le consensus IA et qu’est-ce que le best-of-N, tous deux liés ci-dessous.',
        },
      ],
      productNote:
        'Les modes Compare et Judge de ClawAI sont des fonctionnalités réelles, déployées et réservées à certains plans — un prompt sur plusieurs modèles, avec en option un second modèle pour évaluer les résultats.',
    },
    [UseCaseTask.WORKSPACE_AUTOMATION]: {
      seo: {
        title: 'Automatisation de l’espace de travail avec ClawAI',
        description:
          'Comment ClawAI se connecte aux outils qu’une équipe utilise déjà — GitHub, Slack, Jira, Google Drive et plus — pour qu’une requête puisse agir dedans, pas seulement en parler.',
        keywords: [
          'automatisation de l’espace de travail par IA',
          'connecteurs d’outils IA',
          'connecter une IA à Slack et Jira',
        ],
      },
      eyebrow: 'Cas d’usage',
      title: 'Automatisation de l’espace de travail',
      summary:
        'Un connecteur d’espace de travail permet à une requête ClawAI de lire ou d’agir sur un outil que votre équipe utilise déjà, au lieu que vous copiiez l’information à la main. ClawAI compte aujourd’hui 14 connecteurs d’espace de travail, couvrant l’hébergement de code, la messagerie, le suivi de projet, les documents et les calendriers.',
      sections: [
        {
          id: 'what-a-workspace-connector-is',
          heading: 'Ce que fait réellement un connecteur d’espace de travail',
          paragraphs: [
            'Un espace de travail connecté permet à une requête de référencer ou d’agir sur des données réelles dans cet outil — un ticket Jira, un fil Slack, un fichier dans Google Drive — plutôt que vous le colliez dans la conversation. L’accès à l’espace de travail est une fonctionnalité réservée à certains plans, et les actions de connecteur sont mesurées comme leur propre surface, distincte de la conversation ordinaire.',
          ],
        },
        {
          id: 'which-tools-connect',
          heading: 'Les outils auxquels ClawAI se connecte',
          paragraphs: [
            'Les connecteurs de ClawAI couvrent l’hébergement de code (GitHub, GitLab, Bitbucket), la messagerie et le suivi (Slack, Jira, Confluence, ClickUp), le design (Figma), les documents et le stockage (Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive) et les calendriers (Google Calendar, Outlook Calendar). Voir la page des intégrations, liée ci-dessous, pour ce que fait chacun.',
          ],
        },
        {
          id: 'multi-model-review-and-handoff',
          heading:
            'Relecture multi-modèle et transmission au sein d’une action d’espace de travail',
          paragraphs: [
            'Une action d’espace de travail peut impliquer plus d’un simple appel de modèle — une étape de rédaction chaînée ou de transmission, ou une relecture multi-modèle du résultat avant qu’il ne soit exploité, fait partie de la même surface mesurée plutôt qu’une fonctionnalité séparée à activer. C’est la même infrastructure de routage que le reste de ClawAI, appliquée à des actions qui touchent un outil connecté.',
          ],
        },
      ],
      faq: [
        {
          question: 'À combien d’outils ClawAI se connecte-t-il ?',
          answer:
            'Quatorze connecteurs d’espace de travail aujourd’hui, couvrant l’hébergement de code, la messagerie, le suivi de projet, le design, les documents, le stockage et les calendriers. Voir la page des intégrations, liée ci-dessous, pour la liste complète.',
        },
        {
          question: 'ClawAI peut-il agir sur un outil connecté, ou seulement le lire ?',
          answer:
            'Les actions d’espace de travail peuvent agir sur un outil connecté, pas seulement le lire — les détails dépendent du connecteur et du quota d’espace de travail de votre plan.',
        },
        {
          question:
            'L’automatisation de l’espace de travail est-elle mesurée séparément de la conversation ordinaire ?',
          answer:
            'Oui — les actions de connecteur sont mesurées comme leur propre surface d’usage, distincte du quota de tokens sur lequel puise un message de conversation ordinaire. Vérifiez le quota actuel sur la page tarifs.',
        },
      ],
      productNote:
        'ClawAI se connecte aujourd’hui à 14 outils d’espace de travail — hébergement de code, messagerie, suivi de projet, design, documents et calendriers — avec sa propre surface d’usage mesurée pour les actions qui s’y déroulent.',
    },
    [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: {
      seo: {
        title: 'Extraction de données structurées avec ClawAI',
        description:
          'Comment ClawAI transforme du texte et des pages non structurés en sortie structurée — appel d’outils pour un schéma défini, et la profondeur extraction du mode Research pour les pages web.',
        keywords: [
          'extraction de données structurées par IA',
          'sortie JSON par IA',
          'extraire des données d’un texte avec l’IA',
        ],
      },
      eyebrow: 'Cas d’usage',
      title: 'Extraction de données structurées',
      summary:
        'Transformer un texte en désordre, un document ou une page web en une structure définie que vos propres systèmes peuvent exploiter est un travail différent de la rédaction — il s’appuie sur l’appel d’outils vers un schéma fixe et, quand la source est une page web, sur la profondeur extraction du mode Research de ClawAI.',
      sections: [
        {
          id: 'tool-calling-for-a-defined-schema',
          heading: 'L’appel d’outils pour un schéma de sortie défini',
          paragraphs: [
            'Quand une requête a besoin d’une sortie dans une forme précise — un ensemble de champs fixe, une structure JSON définie — le mécanisme d’appel d’outils de ClawAI est ce qui rend cela fiable, plutôt que d’espérer qu’une réponse en texte brut s’analyse correctement. Voir comment fonctionne l’appel d’outils par l’IA et qu’est-ce qu’une sortie IA structurée, tous deux liés ci-dessous, pour comment fonctionne réellement ce mécanisme.',
          ],
        },
        {
          id: 'extracting-from-a-web-page',
          heading: 'Extraire un contenu structuré d’une page web',
          paragraphs: [
            'Quand la source est une page web en direct plutôt qu’un texte déjà en votre possession, la profondeur recherche-plus-récupération-et-extraction du mode Research tire un contenu structuré de ce qu’elle récupère, dans le cadre de la même fonctionnalité utilisée pour la recherche sourcée. Elle est mesurée comme usage de recherche, distinct du quota de tokens sur lequel puise un message de conversation ordinaire.',
          ],
        },
        {
          id: 'file-generation-for-the-output',
          heading: 'Générer un fichier à partir du résultat extrait',
          paragraphs: [
            'Une fois les données extraites, la génération de documents et de fichiers de ClawAI peut en faire un artefact téléchargeable plutôt que de laisser le résultat uniquement dans la transcription de la conversation — sa propre surface mesurée, distincte de la conversation ordinaire et de la recherche.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI peut-il garantir une sortie JSON valide ?',
          answer:
            'L’appel d’outils vers un schéma défini est ce qui rend la sortie structurée fiable, plutôt que d’analyser une réponse en texte brut après coup. Voir comment fonctionne l’appel d’outils par l’IA, lié ci-dessous, pour le mécanisme.',
        },
        {
          question:
            'ClawAI peut-il extraire des données structurées d’une page web, pas seulement d’un texte que je colle ?',
          answer:
            'Oui — la profondeur recherche-plus-récupération-et-extraction du mode Research tire un contenu structuré d’une page web qu’elle récupère, mesurée comme usage de recherche distinct de la conversation ordinaire.',
        },
        {
          question:
            'Puis-je obtenir le résultat extrait sous forme de fichier plutôt que juste du texte de conversation ?',
          answer:
            'Oui — la génération de documents et de fichiers peut transformer un résultat extrait en artefact téléchargeable, sur sa propre surface d’usage mesurée.',
        },
      ],
      productNote:
        'L’appel d’outils de ClawAI vers un schéma défini, et la profondeur extraction du mode Research pour les pages web, sont des fonctionnalités réelles et déployées derrière l’extraction de données structurées — pas un simple artifice de prompt.',
    },
    [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: {
      seo: {
        title: 'Déploiement privé et local avec ClawAI',
        description:
          'Comment les modes de routage Local-Only et Privacy-First de ClawAI gardent une requête sur du matériel que vous contrôlez, en utilisant les connecteurs Ollama et llama.cpp plutôt qu’un fournisseur cloud.',
        keywords: [
          'déploiement IA privé',
          'charges de travail IA locales',
          'exécuter des modèles IA sur son propre matériel',
        ],
      },
      eyebrow: 'Cas d’usage',
      title: 'Déploiement privé et local',
      summary:
        'Certains travaux doivent rester sur du matériel que vous contrôlez plutôt que d’atteindre un fournisseur cloud. ClawAI dispose de connecteurs opérationnels vers Ollama et llama.cpp exactement pour cela, ainsi que de modes de routage qui gardent une requête locale par choix délibéré plutôt que par accident.',
      sections: [
        {
          id: 'what-local-deployment-changes',
          heading: 'Ce que change réellement l’exécution locale',
          paragraphs: [
            'Un fournisseur cloud, ailleurs dans le catalogue de ClawAI, exécute un modèle sur sa propre infrastructure et facture par requête ; Ollama et llama.cpp chargent au contraire un modèle à poids ouverts sur du matériel que vous contrôlez, si bien que la requête n’en sort jamais. Cela change qui peut voir la requête, pas ce dont un modèle donné est capable.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Les modes de routage Local-Only et Privacy-First',
          paragraphs: [
            'Le routage Local-Only garde chaque requête sur du matériel que vous contrôlez, via Ollama ou llama.cpp plutôt que via un fournisseur cloud. Le routage Privacy-First est un mode distinct avec ses propres priorités ; les deux existent parce que tous les usages ne doivent pas basculer par défaut sur le routage Auto, et choisir entre eux est une décision délibérée plutôt qu’un réglage par défaut à ne pas examiner.',
          ],
        },
        {
          id: 'when-private-deployment-fits',
          heading: 'Quand un usage privé ou local est la bonne approche',
          paragraphs: [
            'Un usage privé ou local se définit par l’endroit où s’exécute la requête, pas par le type de tâche — le code, la rédaction ou la recherche peuvent tous fonctionner de cette façon si l’exigence est que rien ne sorte du matériel que vous contrôlez. Voir choisir un modèle pour des usages privés et locaux et qu’est-ce que l’IA local-first, tous deux liés ci-dessous, pour les arbitrages à peser.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quelle est la différence entre le routage Local-Only et Privacy-First ?',
          answer:
            'Local-Only garde chaque requête sur du matériel que vous contrôlez via Ollama ou llama.cpp ; Privacy-First est un mode de routage distinct avec ses propres priorités. Les deux existent parce que tous les usages ne doivent pas basculer par défaut sur le routage Auto.',
        },
        {
          question: 'Quel modèle à poids ouverts exécuter localement ?',
          answer:
            'Cette page n’en recommande aucun — voir qu’est-ce que l’IA local-first, lié ci-dessous, pour réfléchir à ce choix, car le modèle adapté dépend de votre matériel et de votre tâche.',
        },
        {
          question:
            'Puis-je exécuter n’importe quel type de tâche localement, ou seulement certaines ?',
          answer:
            'Un usage privé ou local se définit par l’endroit où s’exécute la requête, pas par la tâche — le code, la rédaction ou la recherche peuvent tous fonctionner de cette façon si rester sur du matériel que vous contrôlez compte plus que la nature de la tâche.',
        },
      ],
      productNote:
        'Les modes de routage Local-Only et Privacy-First de ClawAI gardent une requête sur du matériel que vous contrôlez via les connecteurs Ollama et llama.cpp — des connecteurs réels et déployés, pas un élément de feuille de route.',
    },
  },
};
