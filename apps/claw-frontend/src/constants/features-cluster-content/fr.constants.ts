import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesClusterDictionary } from '@/types/features-cluster.types';

export const FR_FEATURES_CLUSTER_CONTENT: FeaturesClusterDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'Pour aller plus loin',
    lastReviewed: 'Dernière révision',
    backToHub: 'Toutes les fonctionnalités',
    ctaTitle: 'Essayez-le plutôt que de nous croire sur parole',
    ctaBody:
      'ClawAI dirige chaque conversation vers le modèle et les outils adaptés à la tâche, sur tous les fournisseurs connectés, depuis un seul espace de travail.',
    startFree: 'Commencer gratuitement',
    seeUseCases: 'Voir cela appliqué à une tâche réelle',
  },
  hub: {
    capabilitiesHeading: 'Approfondir une fonctionnalité précise',
    capabilitiesIntro:
      'Les neuf sections ci-dessus sont la version courte. Chacune des six fonctionnalités ci-dessous est une page complète : ce que fait réellement la fonctionnalité sous-jacente, quel plan la débloque, et où vérifier le mécanisme vous-même.',
    cardSummaries: {
      [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]:
        'Sept modes de routage décident quel modèle répond, et neuf primitives d’orchestration mettent plusieurs modèles sur un même problème.',
      [FeatureCapability.MEMORY_AND_CONTEXT]:
        'Une mémoire qui persiste entre les conversations, et des packs de contexte qui portent le matériel de référence d’une tâche.',
      [FeatureCapability.WORKSPACE_CONNECTORS]:
        'Quatorze connecteurs d’espace de travail permettent à une requête de lire ou d’agir dans les outils que votre équipe utilise déjà.',
      [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]:
        'Envoi, découpage et OCR à l’entrée ; génération d’images, de documents et de recherches à la sortie.',
      [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]:
        'Chaque réponse enregistre quel modèle l’a traitée, pourquoi, et ce qu’elle a coûté sur votre quota.',
      [FeatureCapability.SECURITY_AND_DATA_HANDLING]:
        'Les mécanismes concrets — authentification, RBAC, chiffrement des identifiants, chiffrement du transport — décrits simplement.',
    },
  },
  capabilities: {
    [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: {
      seo: {
        title: 'Routage de modèles et orchestration dans ClawAI',
        description:
          'Les sept modes de routage qui décident quel modèle répond à un message, et les neuf primitives d’orchestration qui mettent plusieurs modèles sur un même problème, tels qu’ils existent dans ClawAI.',
        keywords: [
          'modes de routage de modèles IA',
          'orchestration multi-modèles',
          'transparence du routage IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Routage de modèles et orchestration',
      summary:
        'Le routage décide quel modèle unique répond à un message ; l’orchestration décide quoi faire quand un seul modèle ne suffit pas. ClawAI propose les deux comme des mécanismes distincts et soumis au plan, plutôt qu’un seul réglage caché — sept modes de routage et neuf primitives d’orchestration, tous visibles dans la réponse que vous recevez.',
      sections: [
        {
          id: 'seven-routing-modes',
          heading: 'Sept modes de routage, pas un seul réglage caché',
          paragraphs: [
            'ClawAI classe chaque message et peut l’envoyer automatiquement à un modèle adapté, ou vous pouvez fixer la règle vous-même. Les modes : Auto (classe selon la tâche et choisit un modèle fort pour cette classe), Manual Model (fixe un modèle pour la conversation), Local-Only (chaque requête reste sur du matériel que vous contrôlez, via Ollama ou llama.cpp), Privacy-First (un mode distinct avec ses propres priorités pour garder une requête hors du chemin cloud généraliste), Low Latency (privilégie le modèle qui répond le plus vite), High Reasoning (privilégie le modèle de raisonnement le plus solide, sans égard à la vitesse ou au coût) et Cost Saver (privilégie le modèle le moins cher capable de traiter la requête). Voir « qu’est-ce que le routage de modèles IA », lié ci-dessous, pour le fonctionnement général d’un routeur.',
          ],
        },
        {
          id: 'nine-orchestration-primitives',
          heading: 'Neuf façons de mettre plusieurs modèles sur un problème',
          paragraphs: [
            'Quand un modèle ne suffit pas, les primitives d’orchestration de ClawAI — enregistrées sur le registre sous la surface ORCHESTRATION, distincte du chat ordinaire — sont Compare (jusqu’à cinq modèles sur une même requête, côte à côte), Consensus (synthétiser une réponse à partir de l’accord entre plusieurs modèles, et signaler les désaccords), Escalation (démarrer avec un modèle économique et monter automatiquement seulement si la qualité est insuffisante), Best-of-N (générer plusieurs candidats et garder le plus solide), Repair (corriger un défaut précis dans une réponse existante plutôt que la régénérer), Verify (un second modèle vérifie l’exactitude, avec une limite configurable de révisions), Role packs (une petite équipe de modèles spécialisés par rôle qui se relaient) Pipelines (enchaîner plusieurs de ces étapes en un flux nommé et rejouable) et Judge et Critic (un modèle indépendant note une réponse selon des critères explicites, avec un retour écrit du passage Critic sur les faiblesses). Compare et Judge sont chacun soumis individuellement au plan (COMPARE_MODE, JUDGE_MODE, CRITIC_REVIEW) ; voir « qu’est-ce que le consensus IA » et « qu’est-ce qu’un juge IA », tous deux liés ci-dessous, pour le fonctionnement de l’évaluation elle-même.',
          ],
        },
        {
          id: 'automatic-fallback-on-provider-failure',
          heading: 'Ce qui se passe quand un fournisseur échoue en cours de requête',
          paragraphs: [
            'Une décision de routage n’est pas un pari unique : si le fournisseur ou le modèle vers lequel une requête a été envoyée échoue en cours de traitement, ClawAI peut basculer automatiquement vers un autre modèle, et la réponse enregistre quel modèle a réellement pris le relais — pas seulement celui choisi au départ. Voir « qu’est-ce que le basculement de modèle », lié ci-dessous, pour la manière dont cette décision de basculement elle-même est prise.',
          ],
        },
      ],
      faq: [
        {
          question: 'Combien de modes de routage ClawAI propose-t-il ?',
          answer:
            'Sept : Auto, Manual Model, Local-Only, Privacy-First, Low Latency, High Reasoning et Cost Saver. Auto est le mode par défaut ; les six autres existent pour quand vous voulez décider vous-même, ou orienter le routage dans une direction précise.',
        },
        {
          question: 'Quelle différence entre Compare et Consensus ?',
          answer:
            'Compare montre la réponse de chaque modèle à la même requête côte à côte, avec latence et nombre de jetons par modèle, et vous laisse la lecture. Consensus synthétise une réponse à partir de l’accord entre modèles et signale les désaccords.',
        },
        {
          question: 'Puis-je voir quel modèle a réellement répondu, et pourquoi ?',
          answer:
            'Oui — chaque réponse porte le fournisseur et le modèle qui l’a produite, le raisonnement derrière le choix de routage, et ce qu’elle a coûté sur votre quota. Si un fournisseur a échoué et qu’un autre modèle a pris le relais, c’est également enregistré.',
        },
      ],
      productNote:
        'Sept modes de routage et neuf primitives d’orchestration sont des mécanismes réels et livrés dans ClawAI, pas un réglage caché unique — Compare, Judge et Critic sont chacun soumis individuellement au plan et mesurés sur leur propre surface de registre.',
    },
    [FeatureCapability.MEMORY_AND_CONTEXT]: {
      seo: {
        title: 'Mémoire et contexte dans ClawAI',
        description:
          'Comment fonctionnent la mémoire et les packs de contexte de ClawAI — des entrées de mémoire approuvées avec un score de confiance, un stockage circonscrit, et des lots de matériel de référence versionnés, en tant que fonctionnalités livrées et soumises au plan.',
        keywords: [
          'fonctionnalité de mémoire IA',
          'packs de contexte IA',
          'mémoire de conversation IA persistante',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Mémoire et contexte',
      summary:
        'La mémoire et les packs de contexte sont deux fonctionnalités distinctes, soumises au plan (MEMORY et CONTEXT_PACKS), qui résolvent des problèmes différents : la mémoire conserve ce que ClawAI a appris sur vous d’une session à l’autre, tandis qu’un pack de contexte regroupe le matériel de référence d’une tâche précise. Les deux sont des interrupteurs par conversation, pas une gestion globale.',
      sections: [
        {
          id: 'memory-records-and-approval',
          heading: 'Les entrées de mémoire, et la file d’approbation en amont',
          paragraphs: [
            'Une entrée de mémoire est un fait, une préférence, une instruction ou un résumé, stocké avec une catégorie, un score de confiance et sa provenance. Rien n’est retenu en silence : les candidats atterrissent dans une file que vous approuvez ou rejetez, et seuls les éléments à forte confiance et non sensibles sont approuvés automatiquement, à un seuil que vous définissez vous-même. Voir « qu’est-ce que la mémoire IA », lié ci-dessous, pour le fonctionnement général du mécanisme.',
          ],
        },
        {
          id: 'context-packs-for-reference-material',
          heading: 'Des packs de contexte pour le matériel qu’une tâche doit garder à l’esprit',
          paragraphs: [
            'Un pack de contexte regroupe du texte réutilisable, des fichiers, des liens et des références de mémoire dans une unité nommée et versionnée que vous attachez à n’importe quelle conversation — un brief de style, un ensemble de documents sources ou des instructions permanentes n’ont plus besoin d’être recollés à chaque session. Les packs sont versionnés, vous pouvez donc voir ce qui a changé et revenir en arrière. Voir « que sont les packs de contexte », lié ci-dessous, pour le fonctionnement général.',
          ],
        },
        {
          id: 'scopes-receipts-and-controls',
          heading: 'Portées, reçus de contexte et contrôles',
          paragraphs: [
            'Une mémoire peut être limitée à vous-même, à une seule conversation, à un projet ou à un espace de travail, pour éviter que le contexte professionnel ne s’infiltre dans les conversations personnelles. Chaque réponse qui puise dans la mémoire ou un pack enregistre un reçu de contexte — quels éléments sont entrés dans la requête, dans quel ordre, et combien de budget de jetons chacun a consommé — et des contrôles permettent de suspendre toute la mémoire, un seul élément, de fixer une expiration, de marquer un élément sensible pour caviardage, ou de le supprimer purement et simplement, chaque changement étant écrit dans un journal d’audit. Voir « qu’est-ce qu’une fenêtre de contexte », lié ci-dessous, pour l’importance de ce décompte de budget de jetons.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI retient-il des choses sur moi sans me le demander ?',
          answer:
            'Non — les candidats atterrissent dans une file d’approbation que vous examinez vous-même. Seuls les éléments à forte confiance et non sensibles sont approuvés automatiquement, à un seuil que vous fixez, et chaque changement à une entrée de mémoire est écrit dans un journal d’audit.',
        },
        {
          question: 'Quelle différence entre la mémoire et un pack de contexte ?',
          answer:
            'La mémoire conserve, d’une session à l’autre, ce que ClawAI a appris de vos préférences. Un pack de contexte est un lot versionné de matériel de référence — texte, fichiers, liens — que vous attachez à une tâche précise plutôt qu’une préférence durable. Ce sont deux fonctionnalités distinctes soumises au plan.',
        },
        {
          question: 'Puis-je désactiver la mémoire pour une seule question ?',
          answer:
            'Oui — la mémoire et les packs de contexte sont des interrupteurs par conversation. Désactivez-les pour une question ponctuelle et la requête ne contiendra rien d’autre que ce que vous avez saisi.',
        },
      ],
      productNote:
        'La mémoire et les packs de contexte sont deux fonctionnalités ClawAI distinctes et soumises au plan (MEMORY, CONTEXT_PACKS) — des entrées approuvées avec un score de confiance, et des lots de référence versionnés, tous deux circonscrits et vérifiables, pas un seul bloc de mémoire mélangé.',
    },
    [FeatureCapability.WORKSPACE_CONNECTORS]: {
      seo: {
        title: 'Connecteurs d’espace de travail dans ClawAI',
        description:
          'Les 14 connecteurs d’espace de travail livrés par ClawAI — GitHub, Slack, Jira, Google Drive et plus — et comment une action d’espace de travail soumise au plan y lit ou y agit.',
        keywords: [
          'connecteurs d’espace de travail IA',
          'connecter l’IA à GitHub et Slack',
          'intégrations d’outils IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Connecteurs d’espace de travail',
      summary:
        'Un connecteur d’espace de travail permet à une requête ClawAI de lire ou d’agir dans un outil que votre équipe utilise déjà, plutôt que de copier des informations à la main. ClawAI compte aujourd’hui 14 connecteurs, et l’accès à l’espace de travail est une fonctionnalité distincte soumise au plan (WORKSPACES) avec sa propre surface d’usage mesurée (WORKSPACE_ACTION).',
      sections: [
        {
          id: 'the-fourteen-connectors',
          heading: 'Les quatorze connecteurs, par catégorie',
          paragraphs: [
            'Hébergement de code : GitHub, GitLab, Bitbucket. Messagerie et suivi : Slack, Jira, Confluence, ClickUp. Design : Figma. Documents et stockage : Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive. Calendriers : Google Calendar, Outlook Calendar. Chacun se connecte une fois via OAuth, et les identifiants sont chiffrés au repos, rattachés à votre compte et révocables en un clic.',
          ],
        },
        {
          id: 'what-a-connected-workspace-can-do',
          heading: 'Ce qu’un espace de travail connecté permet réellement à une requête',
          paragraphs: [
            'Une fois connecté, ClawAI peut chercher dans un outil, en tirer du contexte pour une conversation, et y agir après votre approbation — un ticket Jira, un fil Slack, un fichier dans Google Drive, référencé ou modifié directement plutôt que collé à la main. Les connexions se synchronisent selon un calendrier et via des webhooks, pour que les résultats de recherche restent à jour, et le nombre de connexions possibles dépend de votre plan.',
          ],
        },
        {
          id: 'multi-model-review-inside-a-workspace-action',
          heading: 'Une revue multi-modèles au sein de la même surface mesurée',
          paragraphs: [
            'Une action d’espace de travail ne se limite pas à un seul appel de modèle — une étape de rédaction en chaîne ou de relais, ou une revue multi-modèles du résultat avant qu’il ne soit exécuté, utilise la même infrastructure de routage et d’orchestration décrite sur la page routage de modèles et orchestration, liée ci-dessous, appliquée à une action touchant un outil connecté plutôt qu’à un message de chat ordinaire.',
          ],
        },
      ],
      faq: [
        {
          question: 'À combien d’outils ClawAI se connecte-t-il ?',
          answer:
            'Quatorze connecteurs d’espace de travail : GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, ClickUp, Figma, Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive, Google Calendar et Outlook Calendar.',
        },
        {
          question: 'Mes identifiants de connecteur sont-ils en sécurité ?',
          answer:
            'Les identifiants sont chiffrés au repos, rattachés à votre compte, et jamais renvoyés au navigateur — voir la page sécurité et traitement des données, liée ci-dessous, pour le mécanisme sous-jacent.',
        },
        {
          question:
            'Une action d’espace de travail est-elle mesurée séparément d’un message de chat ordinaire ?',
          answer:
            'Oui — les actions d’espace de travail ont leur propre surface mesurée (WORKSPACE_ACTION), distincte du quota de jetons d’un message de chat ordinaire. Vérifiez le quota actuel sur la page tarifaire.',
        },
      ],
      productNote:
        'ClawAI se connecte aujourd’hui à 14 outils d’espace de travail — hébergement de code, messagerie, suivi de projet, design, documents, stockage et calendriers — derrière une seule fonctionnalité WORKSPACES soumise au plan, avec sa propre surface d’action mesurée.',
    },
    [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: {
      seo: {
        title: 'Traitement des fichiers et documents dans ClawAI',
        description:
          'Comment ClawAI ingère les fichiers — envoi, découpage, OCR, contrôles à l’envoi — et les génère en retour sous forme d’images, de documents et de recherches avec sources citées.',
        keywords: [
          'envoi de fichiers et OCR IA',
          'génération de documents IA',
          'formats d’export de documents IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Traitement des fichiers et documents',
      summary:
        'Les fichiers circulent dans les deux sens chez ClawAI : à l’entrée, un envoi découpé et indexé pour qu’un modèle réponde à partir de votre contenu plutôt que de ses seules données d’entraînement ; et à la sortie, une image générée, un document exporté ou une recherche avec sources citées. Les deux sens sont réels, livrés et mesurés séparément.',
      sections: [
        {
          id: 'upload-chunking-and-retrieval',
          heading: 'Envoi, découpage et livraison adaptée à chaque modèle',
          paragraphs: [
            'ClawAI accepte PDF, DOCX, tableurs, CSV, JSON, Markdown, texte brut, fichiers de code et images. Un fichier est découpé en passages et indexé, pour que seules les parties pertinentes à une question entrent dans la requête, et chaque modèle reçoit la forme qu’il traite le plus fiablement — une image native, un PDF natif ou du texte extrait — chaque message indiquant la forme réellement reçue par chaque modèle. Les fichiers peuvent être joints par message, y compris dans les exécutions Compare, pour interroger plusieurs modèles sur le même document à la fois.',
          ],
        },
        {
          id: 'ocr-and-upload-checks',
          heading: 'OCR pour les documents scannés, et contrôles à chaque envoi',
          paragraphs: [
            'Un PDF scanné sans couche de texte passe par l’OCR avant d’atteindre un modèle, et est signalé quand la confiance de reconnaissance est faible. Chaque envoi est scanné contre les virus, vérifié par rapport au type de fichier déclaré, examiné pour des noms de fichiers dangereux, et rejeté si une archive s’avère être une bombe de décompression — les envois comptent contre les limites de taille et de stockage d’un plan, et les fichiers sont retirés selon un calendrier de conservation ou supprimables à tout moment.',
          ],
        },
        {
          id: 'generating-images-documents-and-research',
          heading: 'Générer des images, des documents et des recherches citées',
          paragraphs: [
            'En sortie, ClawAI peut produire une image à partir d’une description, exporter n’importe quelle réponse ou une conversation entière en fichier formaté PDF, DOCX, CSV, HTML, Markdown, TXT ou JSON, et exécuter une tâche de recherche qui parcourt le web, récupère et lit des pages, et répond avec les sources réellement utilisées. La génération d’images, la génération de fichiers et la recherche sont chacune mesurées séparément (IMAGE, FILE_GENERATION, et les quotas RESEARCH_MODE / WEB_SEARCH / WEB_FETCH / WEB_EXTRACT), distinctes de l’usage de jetons du chat ordinaire. Voir « comment fonctionne l’appel d’outils IA » et « que sont les sorties IA structurées », tous deux liés ci-dessous, pour le mécanisme derrière une forme de sortie définie.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quels types de fichiers puis-je envoyer ?',
          answer:
            'PDF, DOCX, tableurs, CSV, JSON, Markdown, texte brut, fichiers de code et images. Chaque modèle reçoit la forme qu’il traite le plus fiablement, et le message indique la forme réellement reçue par chaque modèle.',
        },
        {
          question: 'ClawAI peut-il lire un document scanné sans couche de texte ?',
          answer:
            'Oui — un PDF scanné passe par l’OCR avant d’atteindre un modèle, et est signalé quand la confiance de reconnaissance est faible.',
        },
        {
          question: 'Dans quels formats puis-je exporter un document ?',
          answer:
            'PDF, DOCX, CSV, HTML, Markdown, TXT et JSON. L’export de document est une surface mesurée distincte, séparée du chat ordinaire et de l’usage de recherche.',
        },
      ],
      productNote:
        'Envoi, découpage, OCR et contrôles à l’entrée ; génération d’images, export de documents et recherches citées à la sortie — des fonctionnalités réelles, livrées et mesurées séparément, pas un seul mode fichier mélangé.',
    },
    [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: {
      seo: {
        title: 'Observabilité et transparence dans ClawAI',
        description:
          'Comment ClawAI montre ce que consomme une requête — un tableau de bord d’usage, des détails de routage par réponse, un journal d’audit et une progression en direct — pour que l’usage ne soit jamais une boîte noire.',
        keywords: [
          'transparence de l’usage IA',
          'journal d’audit du routage IA',
          'observabilité des coûts IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Observabilité et transparence',
      summary:
        'L’usage dans ClawAI est mesuré, attribué et visible plutôt qu’une boîte noire : un tableau de bord d’usage, des détails de routage par réponse, un journal d’audit et une progression en direct pendant qu’un modèle travaille sont quatre éléments distincts et livrés du même principe — vous voyez toujours ce qu’une requête a fait et ce qu’elle a coûté.',
      sections: [
        {
          id: 'usage-dashboard-and-per-answer-detail',
          heading: 'Le tableau de bord d’usage, et les détails de routage par réponse',
          paragraphs: [
            'Un tableau de bord d’usage montre le quota consommé aujourd’hui et ce mois-ci, réparti par modèle, avec le solde restant dans les mêmes unités que le plan. En dessous, chaque réponse individuelle porte le modèle qui l’a produite, pourquoi il a été choisi, combien de temps cela a pris, combien de jetons ont été utilisés, et ce que cela a coûté sur le quota — y compris quel modèle a pris le relais si le fournisseur initial a échoué en cours de requête. Voir « qu’est-ce que le routage de modèles IA » et « qu’est-ce que le basculement de modèle », tous deux liés ci-dessous, pour la façon dont cette décision de routage elle-même est prise.',
          ],
        },
        {
          id: 'the-audit-log',
          heading:
            'Un journal d’audit pour les connexions, changements de plan et activité des connecteurs',
          paragraphs: [
            'Les connexions, changements de plan, activité des connecteurs, modifications de mémoire et contenus générés sont chacun enregistrés avec un horodatage et un acteur, pour que l’historique d’un compte soit reconstituable plutôt que visible seulement sur le moment. C’est la même piste d’audit vers laquelle renvoient les pages mémoire et contexte ainsi que sécurité et traitement des données, liées ci-dessous, pour les actions que chacune de ces fonctionnalités y inscrit.',
          ],
        },
        {
          id: 'live-progress-and-limit-warnings',
          heading:
            'Progression en direct pendant qu’un modèle travaille, et alertes de limite claires',
          paragraphs: [
            'Pendant qu’un modèle travaille, vous voyez l’étape en cours, le texte au fur et à mesure, son raisonnement quand le modèle l’expose, ainsi que des compteurs de jetons et de temps en direct — jamais une attente silencieuse. Quand une requête atteint une limite de plan, ClawAI indique quelle limite, ce qu’il reste sur les autres fenêtres et quand elle se réinitialise, plutôt que de couper la requête sans explication.',
          ],
        },
      ],
      faq: [
        {
          question: 'Puis-je voir quel modèle a répondu à un message précis, et pourquoi ?',
          answer:
            'Oui — chaque réponse enregistre le fournisseur et le modèle qui l’a produite, le raisonnement derrière le choix de routage, la durée, les jetons utilisés, et ce qu’elle a coûté sur votre quota.',
        },
        {
          question: 'Que consigne réellement le journal d’audit ?',
          answer:
            'Les connexions, changements de plan, activité des connecteurs, modifications de mémoire et contenus générés, chacun avec un horodatage et un acteur, pour que l’historique du compte soit reconstituable après coup.',
        },
        {
          question: 'Que se passe-t-il quand j’atteins une limite d’usage ?',
          answer:
            'ClawAI indique quelle limite précise a été atteinte, combien de quota reste sur vos autres fenêtres d’usage, et quand la limite se réinitialise — rien n’est coupé en silence.',
        },
      ],
      productNote:
        'Un tableau de bord d’usage, des détails de routage par réponse, un journal d’audit et une progression en direct sont quatre éléments réels et livrés du même principe : l’usage dans ClawAI est mesuré, attribué et visible, jamais une boîte noire.',
    },
    [FeatureCapability.SECURITY_AND_DATA_HANDLING]: {
      seo: {
        title: 'Sécurité et traitement des données dans ClawAI',
        description:
          'Les mécanismes concrets derrière la sécurité des comptes et des données de ClawAI — hachage des mots de passe Argon2, jetons de rafraîchissement rotatifs, RBAC, chiffrement des identifiants AES-256-GCM, TLS et isolation des services — décrits simplement, sans revendication de conformité.',
        keywords: [
          'sécurité de plateforme IA',
          'chiffrement des identifiants IA',
          'contrôle d’accès basé sur les rôles IA',
        ],
      },
      eyebrow: 'Fonctionnalité',
      title: 'Sécurité et traitement des données',
      summary:
        'Cette page décrit des mécanismes qui existent aujourd’hui dans le produit, simplement, plutôt qu’une revendication de conformité. Comptes, identifiants, transport et frontières entre services ont chacun un mécanisme concret et vérifiable derrière eux — et là où une requête doit rester sur du matériel que vous contrôlez plutôt que d’atteindre un fournisseur cloud, le routage Local-Only et Privacy-First est la réponse à cela, pas une certification de sécurité.',
      sections: [
        {
          id: 'accounts-sessions-and-access-control',
          heading: 'Comptes, sessions et accès basé sur les rôles',
          paragraphs: [
            'Les mots de passe sont hachés avec Argon2 ; les jetons d’accès sont de courte durée, et les jetons de rafraîchissement pivotent à chaque usage, pour qu’un jeton volé soit détectable. Chaque compte porte un rôle et un ensemble de permissions explicite, vérifié dans l’interface puis de nouveau à chaque point d’entrée backend — un contrôle d’accès basé sur les rôles appliqué aux deux niveaux, pas seulement là où l’interface le montre par hasard.',
          ],
        },
        {
          id: 'credential-and-transport-encryption',
          heading: 'Chiffrement des identifiants et chiffrement en transit',
          paragraphs: [
            'Les identifiants de fournisseurs et de connecteurs sont chiffrés au repos avec AES-256-GCM et ne sont jamais renvoyés au navigateur. Le transport se fait en TLS du navigateur jusqu’à la périphérie, puis de nouveau en TLS entre chaque service interne, avec des certificats vérifiés à chaque saut — un identifiant est ainsi protégé au repos comme en mouvement.',
          ],
        },
        {
          id: 'service-isolation-and-what-is-not-claimed',
          heading:
            'Isolation des services, limitation de débit, et ce qui n’est pas revendiqué ici',
          paragraphs: [
            'Chaque service backend possède sa propre base de données et ne peut pas lire celle d’un autre, pour qu’une panne de la génération d’images ne puisse pas atteindre vos conversations ; des limites de débit par compte protègent à la fois votre quota et la plateforme contre des boucles hors de contrôle. ClawAI ne détient aujourd’hui aucune certification de conformité, et l’application hébergée envoie des requêtes à des fournisseurs de modèles tiers selon leurs propres conditions — là où cela ne convient pas à une organisation, un déploiement privé sur votre propre réseau, exécutant uniquement des modèles à poids ouverts, est étudié au cas par cas ; contactez-nous pour en discuter. Pour une requête qui doit rester par défaut sur du matériel que vous contrôlez, voir déploiement privé et local, lié ci-dessous.',
          ],
        },
      ],
      faq: [
        {
          question: 'Comment mes mots de passe et jetons de connexion sont-ils protégés ?',
          answer:
            'Les mots de passe sont hachés avec Argon2. Les jetons d’accès sont de courte durée, et les jetons de rafraîchissement pivotent à chaque usage, pour qu’un jeton de rafraîchissement volé soit détectable plutôt que silencieusement réutilisable.',
        },
        {
          question: 'Comment mes identifiants d’outils connectés sont-ils stockés ?',
          answer:
            'Les identifiants de fournisseurs et de connecteurs sont chiffrés au repos avec AES-256-GCM et ne sont jamais renvoyés au navigateur, quel que soit le connecteur d’espace de travail concerné.',
        },
        {
          question: 'ClawAI détient-il des certifications de conformité tierces ?',
          answer:
            'Non — ClawAI ne détient aujourd’hui aucune certification de conformité. Pour une exigence que l’application hébergée ne peut satisfaire, un déploiement privé sur votre propre réseau est étudié au cas par cas ; voir le cas d’usage déploiement local et privé, lié ci-dessous.',
        },
      ],
      productNote:
        'Hachage des mots de passe Argon2, jetons de rafraîchissement rotatifs, RBAC vérifié à chaque point d’entrée backend, chiffrement des identifiants AES-256-GCM, TLS à chaque saut et isolation des bases de données par service — des mécanismes concrets, décrits simplement, sans certification de conformité revendiquée.',
    },
  },
};
