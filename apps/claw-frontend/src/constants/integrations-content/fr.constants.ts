import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const FR_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: 'Sur cette page',
    faqTitle: 'Questions fréquentes',
    relatedTitle: 'Pour aller plus loin',
    lastReviewed: 'Dernière vérification',
    backToHub: 'Toutes les intégrations',
    ctaTitle: 'Connectez-le et jugez par vous-même',
    ctaBody:
      'Chaque connecteur est disponible sur toutes les offres payantes. Connectez-le depuis les paramètres de votre espace de travail.',
    startFree: 'Commencer avec l’offre gratuite',
    seeFeatures: 'Voir ce que fait ClawAI',
    capabilitiesHeading: 'Ce que peut faire ce connecteur',
    readLabel: 'ClawAI peut lire',
    writeLabel: 'ClawAI peut écrire',
    syncLabel: 'Synchronisation',
    realTimeLabel: 'Mise à jour en temps réel',
    pollBasedLabel: 'Se synchronise selon un calendrier, pas en temps réel',
  },
  hub: {
    seo: {
      title: 'Intégrations : connectez ClawAI à vos outils',
      description:
        'ClawAI se connecte à 14 outils de travail — GitHub, Slack, Jira, Google Drive, Gmail et bien d’autres — pour qu’une conversation puisse lire votre travail et agir dessus, pas seulement en parler.',
      keywords: [
        'intégrations ClawAI',
        'connecteurs IA pour espace de travail',
        'intégration d’outils IA',
      ],
    },
    eyebrow: 'Intégrations',
    title: 'Connectez ClawAI aux outils que vous utilisez déjà',
    summary:
      'Chaque connecteur ci-dessous est réel et déjà disponible, pas un élément de feuille de route — ce qu’il peut lire, ce qu’il peut écrire, et s’il se met à jour en temps réel ou selon un calendrier, le tout tiré du même registre que celui utilisé par le produit lui-même.',
    topicsHeading: 'Choisissez un connecteur',
    cardSummaries: {
      [IntegrationTopic.GITHUB]:
        'Dépôts, tickets, pull requests — lire, commenter, examiner, approuver.',
      [IntegrationTopic.GITLAB]:
        'Projets, merge requests, tickets — commenter, approuver, suggérer des modifications.',
      [IntegrationTopic.BITBUCKET]:
        'Dépôts et pull requests — commenter, approuver, créer des tickets.',
      [IntegrationTopic.SLACK]:
        'Canaux et messages — lire le contexte, envoyer et répondre aux messages.',
      [IntegrationTopic.JIRA]:
        'Tickets et projets — créer des tickets, les mettre à jour, commenter.',
      [IntegrationTopic.CONFLUENCE]:
        'Pages et espaces — lire la documentation, créer et modifier des pages.',
      [IntegrationTopic.CLICKUP]:
        'Tâches, espaces, dossiers — créer, mettre à jour et commenter des tâches.',
      [IntegrationTopic.FIGMA]:
        'Fichiers et commentaires — lire les maquettes, publier des commentaires, transmettre à Jira.',
      [IntegrationTopic.GOOGLE_DRIVE]:
        'Fichiers et dossiers — lire des documents et des feuilles de calcul, importer et déplacer des fichiers.',
      [IntegrationTopic.GMAIL]:
        'Fils de discussion et messages — lire les e-mails, envoyer, répondre et rédiger des brouillons.',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]:
        'Sites, documents, listes — lire et importer des documents, gérer les éléments de liste.',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]:
        'Fichiers et dossiers — lire, importer et déplacer des fichiers.',
      [IntegrationTopic.GOOGLE_CALENDAR]:
        'Réunions et événements — lire votre calendrier, créer des événements.',
      [IntegrationTopic.OUTLOOK_CALENDAR]:
        'Réunions et événements — lire votre calendrier, créer des événements.',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'Intégration IA GitHub — ClawAI',
        description:
          'Connectez GitHub à ClawAI pour lire vos dépôts, tickets et pull requests, et rédiger des descriptions de PR, commenter, suggérer des modifications et approuver — depuis une conversation.',
        keywords: [
          'intégration IA GitHub',
          'revue de code IA GitHub',
          'discuter avec un dépôt GitHub',
        ],
      },
      eyebrow: 'Hébergement de code',
      title: 'GitHub',
      summary:
        'Connectez un compte ou une organisation GitHub pour que ClawAI puisse lire vos dépôts, tickets et pull requests, et agir dessus — rédiger des descriptions, laisser des commentaires, suggérer des modifications et approuver des revues — directement depuis une conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'Une fois connecté, ClawAI peut lire le contenu des dépôts, les tickets, les pull requests et les commentaires. Les mises à jour en temps réel sont prises en charge — un webhook prévient ClawAI dès qu’un changement survient plutôt que d’attendre une interrogation périodique — et la synchronisation différentielle signifie que relire un grand dépôt ne veut pas dire tout relire depuis zéro à chaque fois.',
            'Côté écriture, ClawAI peut créer un ticket, commenter un ticket, rédiger une description de pull request, commenter une pull request, suggérer une modification de code précise et approuver une pull request. Chaque écriture est une action explicite que vous validez, jamais quelque chose qui se passe silencieusement en arrière-plan.',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: 'Comment cela s’articule avec l’Agent de code',
          paragraphs: [
            'Le connecteur GitHub et l’Agent de code résolvent des problèmes voisins mais différents. L’Agent de code travaille dans votre éditeur sur un dépôt cloné localement. Le connecteur GitHub travaille dans une conversation ClawAI sur les données hébergées par GitHub — tickets, pull requests et commentaires de revue — sans que personne n’ait besoin d’ouvrir le dépôt en local.',
            'Un usage courant : utiliser le connecteur pour trier les tickets et rédiger des descriptions de PR depuis le chat, et passer à l’Agent de code quand le travail consiste réellement à écrire et exécuter du code.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Comment le connecter',
          paragraphs: [
            'GitHub prend en charge l’OAuth (le mode par défaut — connectez-vous avec GitHub et accordez un accès limité) ou un jeton d’accès personnel, pour les comptes et automatisations qui préfèrent un jeton. GitHub Enterprise est pris en charge en pointant le connecteur vers l’URL d’API de votre instance plutôt que vers github.com.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI peut-il commenter mes pull requests automatiquement ?',
          answer:
            'Il peut laisser un commentaire quand vous le lui demandez — examiner un diff et publier un retour, ou approuver une fois satisfait. Il ne commente jamais de sa propre initiative ; chaque écriture est une action que vous demandez.',
        },
        {
          question: 'Fonctionne-t-il avec des dépôts privés ?',
          answer:
            'Oui, dans la limite de l’accès que vous accordez lors de la connexion. ClawAI ne voit que ce que le compte ou le jeton connecté peut voir.',
        },
        {
          question: 'Cela remplace-t-il l’Agent de code ?',
          answer:
            'Non — ils couvrent des périmètres différents. Le connecteur accède aux tickets et pull requests hébergés par GitHub depuis le chat ; l’Agent de code travaille sur votre code cloné localement, dans votre éditeur.',
        },
      ],
      productNote:
        'Le connecteur GitHub fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI, et chaque action d’écriture qu’il effectue est une action que vous avez demandée.',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'Intégration IA GitLab — ClawAI',
        description:
          'Connectez GitLab à ClawAI pour lire vos projets, merge requests et tickets, et commenter, suggérer des modifications, mettre à jour des descriptions et approuver — depuis une conversation.',
        keywords: ['intégration IA GitLab', 'revue IA de merge request', 'assistant IA GitLab'],
      },
      eyebrow: 'Hébergement de code',
      title: 'GitLab',
      summary:
        'Connectez un compte GitLab ou une instance auto-hébergée pour que ClawAI puisse lire vos projets, merge requests et tickets, et agir dessus depuis une conversation — commenter, suggérer des modifications, mettre à jour des descriptions et approuver.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les projets, les tickets, les merge requests et les commentaires, avec des mises à jour en temps réel via webhook. La synchronisation consiste en une relecture complète à chaque exécution plutôt qu’en une synchronisation différentielle, ce qui compte surtout pour les très grands projets.',
            'Côté écriture : commenter une merge request, l’approuver, mettre à jour sa description, suggérer une modification de code précise, ajouter un commentaire en ligne sur une image, créer un ticket et commenter un ticket. Chacune de ces actions est explicite et demandée par vous.',
          ],
        },
        {
          id: 'self-managed',
          heading: 'GitLab auto-hébergé',
          paragraphs: [
            'Le connecteur ne se limite pas à gitlab.com — en le pointant vers l’URL de votre propre instance lors de la configuration, vous connectez ClawAI à un GitLab auto-hébergé exactement comme au service hébergé.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Comment le connecter',
          paragraphs: [
            'GitLab prend en charge l’OAuth ou un jeton d’accès personnel. Les deux sont limités à ce que vous accordez lors de la connexion — ClawAI n’a jamais un accès plus large que ce que le jeton ou l’autorisation OAuth permet.',
          ],
        },
      ],
      faq: [
        {
          question: 'Fonctionne-t-il avec un GitLab auto-hébergé ?',
          answer:
            'Oui — indiquez l’URL de l’instance lors de la connexion, et ClawAI communique avec votre propre installation GitLab plutôt qu’avec gitlab.com.',
        },
        {
          question:
            'Peut-il suggérer de véritables modifications de code, pas seulement des commentaires ?',
          answer:
            'Oui, via l’action de suggestion de modification, qui publie une proposition de diff précise et applicable sur la merge request plutôt qu’un simple commentaire texte.',
        },
        {
          question: 'La synchronisation des merge requests se fait-elle en temps réel ?',
          answer:
            'Oui — le connecteur prend en charge les webhooks, si bien que ClawAI est notifié des changements plutôt que de les rechercher par interrogation périodique.',
        },
      ],
      productNote:
        'GitLab fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI, chacun avec ses propres capacités de lecture et d’écriture documentées sur sa propre page.',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'Intégration IA Bitbucket — ClawAI',
        description:
          'Connectez Bitbucket Cloud à ClawAI pour lire vos dépôts et pull requests, et commenter, approuver et créer des tickets — directement depuis une conversation.',
        keywords: [
          'intégration IA Bitbucket',
          'assistant IA Bitbucket',
          'recherche IA dans un dépôt de code',
        ],
      },
      eyebrow: 'Hébergement de code',
      title: 'Bitbucket',
      summary:
        'Connectez un compte Bitbucket Cloud pour que ClawAI puisse lire vos dépôts et pull requests, et agir dessus — commenter, approuver et créer des tickets — depuis une conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les dépôts et les pull requests, avec prise en charge des mises à jour en temps réel via webhook. La synchronisation consiste en une relecture complète à chaque exécution plutôt qu’en une synchronisation différentielle incrémentale.',
            'Côté écriture : commenter une pull request, approuver une pull request et créer un ticket. Chacune de ces actions est explicite, jamais quelque chose que ClawAI fait de sa propre initiative.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Comment le connecter',
          paragraphs: [
            'Bitbucket se connecte via OAuth — connectez-vous avec votre compte Atlassian et accordez un accès limité aux espaces de travail et dépôts de votre choix.',
          ],
        },
      ],
      faq: [
        {
          question: 'Bitbucket Server ou Data Center sont-ils pris en charge ?',
          answer:
            'Le connecteur cible Bitbucket Cloud. Bitbucket Server ou Data Center auto-hébergés ne sont actuellement pas pris en charge.',
        },
        {
          question: 'Peut-il approuver une pull request à ma place ?',
          answer:
            'Oui, lorsque vous le lui demandez après avoir examiné le diff — l’approbation est une action explicite que vous demandez, pas une étape automatique.',
        },
      ],
      productNote:
        'Bitbucket fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI.',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'Intégration IA Slack — ClawAI',
        description:
          'Connectez Slack à ClawAI pour rechercher dans les canaux et les messages, et envoyer ou répondre à des messages — pour qu’une conversation puisse agir sur ce que votre équipe discute.',
        keywords: [
          'assistant IA Slack',
          'recherche IA dans les messages Slack',
          'intégration IA Slack',
        ],
      },
      eyebrow: 'Communication',
      title: 'Slack',
      summary:
        'Connectez un espace de travail Slack pour que ClawAI puisse lire les canaux, les messages et les utilisateurs, et envoyer ou répondre à des messages en votre nom — transformant une recherche dans des fils de discussion éparpillés en une question posée une seule fois.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les messages, les canaux et les utilisateurs, avec des mises à jour en temps réel via les webhooks d’événements de Slack — les nouveaux messages sont visibles dès leur arrivée plutôt qu’à la prochaine interrogation.',
            'Côté écriture : envoyer un message dans un canal, et répondre dans un fil de discussion. Les deux nécessitent une demande explicite de votre part ; ClawAI ne publie jamais sur Slack de sa propre initiative.',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: 'À quoi il sert particulièrement',
          paragraphs: [
            'Retrouver une décision enfouie dans un fil de discussion vieux de trois semaines, résumer la discussion d’un canal avant une réunion, ou rédiger une réponse qui s’appuie sur le contexte de plusieurs messages — le genre de recherche que la barre de recherche de Slack gère mal, car elle fait correspondre des mots-clés, pas du sens.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI peut-il lire les canaux privés ?',
          answer:
            'Uniquement les canaux dont le compte connecté est membre et dont il accorde l’accès lors de la connexion — ClawAI ne voit jamais plus d’un espace de travail que ce que peut voir l’utilisateur qui se connecte.',
        },
        {
          question: 'Publiera-t-il sur Slack sans que je le lui demande ?',
          answer:
            'Non. Envoyer ou répondre à un message est toujours une action explicite que vous demandez dans la conversation.',
        },
      ],
      productNote:
        'Slack fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI, avec des mises à jour en temps réel via webhook.',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'Intégration IA Jira — ClawAI',
        description:
          'Connectez Jira à ClawAI pour lire vos tickets et projets, et créer des tickets, les mettre à jour et les commenter — y compris en transformant directement un commentaire Figma en ticket.',
        keywords: ['assistant IA Jira', 'IA pour les tickets Jira', 'intégration IA Jira'],
      },
      eyebrow: 'Gestion de projet',
      title: 'Jira',
      summary:
        'Connectez un site Atlassian Jira pour que ClawAI puisse lire les tickets, les projets et les commentaires, et agir dessus — créer et mettre à jour des tickets, commenter, et transformer directement un commentaire de design Figma en ticket Jira ou en user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les tickets, les projets et les commentaires, avec des mises à jour en temps réel via webhook.',
            'Côté écriture : créer un ticket, créer un ticket directement à partir d’un commentaire Figma, rédiger une user story à partir d’un fichier Figma, mettre à jour un ticket et commenter un ticket. Les actions Figma-vers-Jira sont les plus distinctives — elles bouclent la boucle entre une revue de design et un élément de travail suivi, sans rien avoir à retaper.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Comment le connecter',
          paragraphs: [
            'Jira prend en charge l’OAuth ou l’authentification de base avec un jeton d’API, en plus de l’URL de votre site Jira. L’authentification de base convient aux comptes de service et aux automatisations qui ne doivent pas passer par un flux OAuth interactif.',
          ],
        },
      ],
      faq: [
        {
          question:
            'Peut-il créer automatiquement un ticket Jira à partir d’un commentaire Figma ?',
          answer:
            'Oui, lorsque vous le lui demandez — l’action lit le commentaire Figma et crée en une seule étape le ticket Jira ou le brouillon de user story correspondant, plutôt que de vous laisser copier les détails à la main entre les deux outils.',
        },
        {
          question: 'Fonctionne-t-il avec Jira Server, ou seulement avec Jira Cloud ?',
          answer:
            'Le connecteur cible l’API REST cloud de Jira chez Atlassian. Une instance Jira Server auto-hébergée n’est actuellement pas prise en charge.',
        },
      ],
      productNote:
        'Jira fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI, et se combine directement avec le connecteur Figma pour transformer un design en ticket.',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'Intégration IA Confluence — ClawAI',
        description:
          'Connectez Confluence à ClawAI pour lire les pages, les espaces et les commentaires, et créer ou modifier des pages — pour que la documentation ne soit jamais qu’à une conversation de distance.',
        keywords: [
          'assistant IA Confluence',
          'intégration IA Confluence',
          'recherche IA dans la documentation',
        ],
      },
      eyebrow: 'Documentation',
      title: 'Confluence',
      summary:
        'Connectez un site Atlassian Confluence pour que ClawAI puisse lire les pages, les espaces et les commentaires, et créer ou modifier des pages directement — transformant une recherche documentaire en simple question et une mise à jour de documentation en simple demande.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les pages, les commentaires et les projets (espaces) qui les organisent. Ce connecteur ne prend pas en charge les mises à jour en temps réel par webhook — la synchronisation se fait à la demande plutôt que par notification push, si bien qu’une page modifiée il y a quelques instants peut ne pas apparaître avant la prochaine synchronisation.',
            'Côté écriture : créer une page, et modifier une page existante. Ces deux actions sont explicites.',
          ],
        },
      ],
      faq: [
        {
          question: 'La synchronisation Confluence se fait-elle en temps réel ?',
          answer:
            'Non — contrairement à GitHub ou Slack, Confluence ne pousse pas les mises à jour vers ClawAI. Le contenu est synchronisé à la demande plutôt qu’au moment où il change.',
        },
        {
          question: 'Peut-il rédiger de la documentation pour moi, pas seulement la lire ?',
          answer:
            'Oui — créer et modifier des pages sont deux actions d’écriture prises en charge, chacune étant une demande explicite de votre part.',
        },
      ],
      productNote:
        'Confluence fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI.',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'Intégration IA Figma — ClawAI',
        description:
          'Connectez Figma à ClawAI pour lire les fichiers et les commentaires, publier des commentaires, et transmettre directement un commentaire de design à Jira sous forme de ticket ou de user story.',
        keywords: ['assistant IA Figma', 'intégration IA Figma', 'automatisation Figma vers Jira'],
      },
      eyebrow: 'Design',
      title: 'Figma',
      summary:
        'Connectez un compte Figma pour que ClawAI puisse lire les fichiers et les commentaires, publier ses propres commentaires, et — associé au connecteur Jira — transformer directement un commentaire de design en ticket suivi ou en brouillon de user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les fichiers Figma et leurs commentaires, avec des mises à jour en temps réel via webhook. Côté écriture, il peut publier un commentaire sur un fichier.',
            'L’intérêt principal de Figma dans ClawAI vient de son association avec Jira : un commentaire sur un design peut devenir un ticket Jira ou un brouillon de user story sans que personne n’ait à retaper le contexte à la main — voir la page d’intégration Jira pour le détail des actions.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI peut-il lire le design lui-même, pas seulement les commentaires ?',
          answer:
            'Il peut lire le contenu des fichiers et les commentaires via l’API Figma. Ce qu’il peut résumer utilement sur le design visuel dépend du fichier — les commentaires et la structure restent la source la plus fiable.',
        },
        {
          question: 'Ai-je aussi besoin du connecteur Jira pour le flux Figma-vers-ticket ?',
          answer:
            'Oui — les actions Figma-vers-Jira se trouvent sur le connecteur Jira et nécessitent que les deux connexions soient actives.',
        },
      ],
      productNote:
        'Figma fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI, et se révèle particulièrement utile associé à Jira.',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'Intégration IA ClickUp — ClawAI',
        description:
          'Connectez ClickUp à ClawAI pour lire les tâches, les espaces et les dossiers, et créer, mettre à jour ou commenter des tâches — directement depuis une conversation.',
        keywords: ['assistant IA ClickUp', 'intégration IA ClickUp', 'gestion IA des tâches'],
      },
      eyebrow: 'Gestion de projet',
      title: 'ClickUp',
      summary:
        'Connectez un espace de travail ClickUp pour que ClawAI puisse lire les tâches, les espaces et les dossiers, et créer, mettre à jour ou commenter des tâches directement depuis une conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les tâches, les espaces, les dossiers et les commentaires. Ce connecteur ne prend actuellement pas en charge les mises à jour en temps réel par webhook — la livraison du webhook sous-jacent ne peut pas être vérifiée comme authentique, donc la synchronisation se fait à la demande plutôt que par push.',
            'Côté écriture : créer une tâche, mettre à jour une tâche et commenter une tâche.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClickUp se met-il à jour en temps réel ?',
          answer:
            'Non — la synchronisation se fait à la demande plutôt que par notification push en direct. Traitez-le comme Confluence ou Google Drive : à jour depuis la dernière synchronisation, pas en direct.',
        },
        {
          question: 'Peut-il déplacer une tâche entre différents statuts ?',
          answer:
            'Les mises à jour de tâches couvrent les changements de statut et de champs sur une tâche existante ; l’ensemble exact des champs modifiables dépend de la configuration de votre espace de travail ClickUp.',
        },
      ],
      productNote:
        'ClickUp fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI. La synchronisation est planifiée, pas en temps réel.',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'Intégration IA Google Drive — ClawAI',
        description:
          'Connectez Google Drive à ClawAI pour lire des documents et des feuilles de calcul, et importer ou déplacer des fichiers — avec une synchronisation limitée à ce qui a changé.',
        keywords: [
          'assistant IA Google Drive',
          'recherche IA de documents',
          'intégration IA Google Drive',
        ],
      },
      eyebrow: 'Fichiers',
      title: 'Google Drive',
      summary:
        'Connectez un compte Google Drive pour que ClawAI puisse lire des fichiers, des documents et des feuilles de calcul, et importer ou déplacer des fichiers — avec une synchronisation différentielle, pour que resynchroniser un grand Drive ne signifie pas tout relire à chaque fois.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire des fichiers, des documents et des feuilles de calcul. Ce connecteur prend en charge la synchronisation différentielle — après la première lecture complète, les synchronisations suivantes ne récupèrent que ce qui a réellement changé, ce qui compte dès qu’un Drive contient des milliers de fichiers. Il ne prend actuellement pas en charge les mises à jour en temps réel par webhook ; la synchronisation se fait à la demande.',
            'Côté écriture : importer un fichier, et déplacer un fichier entre des dossiers.',
          ],
        },
      ],
      faq: [
        {
          question: 'Connecter Drive donne-t-il à ClawAI accès à tout son contenu ?',
          answer:
            'Uniquement ce à quoi le compte Google connecté accorde l’accès lors de l’OAuth — généralement limité aux fichiers que le compte peut déjà ouvrir, et non une autorisation à l’échelle de l’organisation.',
        },
        {
          question: 'La resynchronisation d’un grand Drive sera-t-elle lente à chaque fois ?',
          answer:
            'La première synchronisation lit ce dont elle a besoin ; la synchronisation différentielle signifie que les suivantes ne récupèrent que les changements, si bien que cela ne ralentit pas à mesure que le Drive grossit, une fois la synchronisation initiale terminée.',
        },
      ],
      productNote:
        'Google Drive fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI, avec une synchronisation différentielle pour les grandes bibliothèques.',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'Intégration IA Gmail — ClawAI',
        description:
          'Connectez Gmail à ClawAI pour lire les fils de discussion et les messages, et envoyer, répondre ou rédiger des brouillons d’e-mails — directement depuis une conversation.',
        keywords: ['assistant IA Gmail', 'intégration IA de messagerie', 'intégration IA Gmail'],
      },
      eyebrow: 'E-mail',
      title: 'Gmail',
      summary:
        'Connectez un compte Gmail pour que ClawAI puisse lire les fils de discussion, les messages et les libellés, et envoyer, répondre ou rédiger des brouillons d’e-mails directement depuis une conversation — avec une synchronisation différentielle, pour ne pas relire toute votre boîte de réception à chaque vérification.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les fils de discussion, les messages et les libellés, avec une synchronisation différentielle. Il ne prend actuellement pas en charge les notifications push en temps réel pour les nouveaux e-mails — la synchronisation se fait à la demande.',
            'Côté écriture : envoyer un nouvel e-mail, répondre à un fil de discussion existant, et créer un brouillon sans l’envoyer — utile lorsque vous voulez que ClawAI prépare une réponse que vous relisez avant son envoi.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI enverra-t-il des e-mails sans mon approbation ?',
          answer:
            'Non. L’envoi est une action explicite ; l’action de brouillon existe précisément pour les cas où vous souhaitez relire avant tout envoi.',
        },
        {
          question: 'Vérifie-t-il ma boîte de réception en continu ?',
          answer:
            'Il se synchronise à la demande plutôt que via une connexion push en direct, si bien que les nouveaux e-mails sont visibles depuis la dernière synchronisation, pas instantanément.',
        },
      ],
      productNote:
        'Gmail fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'Intégration IA SharePoint — ClawAI',
        description:
          'Connectez Microsoft SharePoint à ClawAI pour lire des documents et des listes de site, et importer des documents ou gérer des éléments de liste — depuis une conversation.',
        keywords: [
          'assistant IA SharePoint',
          'intégration IA SharePoint',
          'recherche IA de documents Microsoft',
        ],
      },
      eyebrow: 'Fichiers',
      title: 'Microsoft SharePoint',
      summary:
        'Connectez un site Microsoft SharePoint pour que ClawAI puisse lire des documents, des fichiers et des listes de site, et importer des documents ou gérer des éléments de liste directement depuis une conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les documents, les fichiers et les listes qui organisent un site SharePoint. La synchronisation se fait à la demande plutôt que via une connexion push en temps réel.',
            'Côté écriture : importer un document, créer un élément de liste et mettre à jour un élément de liste existant.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Comment le connecter',
          paragraphs: [
            'SharePoint nécessite l’identifiant de votre tenant Microsoft en plus de l’OAuth, afin que le connecteur sache quel SharePoint d’organisation contacter.',
          ],
        },
      ],
      faq: [
        {
          question: 'A-t-il besoin de l’identifiant de mon tenant Microsoft 365 ?',
          answer:
            'Oui — SharePoint est limité à un tenant, donc le connecteur a besoin de l’identifiant de votre tenant pour savoir à quel SharePoint d’organisation se connecter.',
        },
        {
          question: 'Le contenu est-il mis à jour en temps réel ?',
          answer:
            'Non — la synchronisation se fait à la demande, pas via une notification push en direct.',
        },
      ],
      productNote:
        'SharePoint fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'Intégration IA OneDrive — ClawAI',
        description:
          'Connectez Microsoft OneDrive à ClawAI pour lire des fichiers et des documents, et importer ou déplacer des fichiers — avec une synchronisation limitée à ce qui a changé.',
        keywords: [
          'assistant IA OneDrive',
          'intégration IA OneDrive',
          'recherche IA de fichiers Microsoft',
        ],
      },
      eyebrow: 'Fichiers',
      title: 'Microsoft OneDrive',
      summary:
        'Connectez un compte Microsoft OneDrive pour que ClawAI puisse lire des fichiers et des documents, et importer ou déplacer des fichiers directement depuis une conversation — avec une synchronisation différentielle pour les grandes bibliothèques.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire des fichiers et des documents, avec une synchronisation différentielle — après la première lecture complète, les synchronisations suivantes ne récupèrent que ce qui a changé. Les notifications push en temps réel ne sont actuellement pas prises en charge ; la synchronisation se fait à la demande.',
            'Côté écriture : importer un fichier, et déplacer un fichier entre des dossiers.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Comment le connecter',
          paragraphs: [
            'OneDrive nécessite l’identifiant de votre tenant Microsoft en plus de l’OAuth, tout comme SharePoint.',
          ],
        },
      ],
      faq: [
        {
          question: 'A-t-il besoin de l’identifiant de mon tenant Microsoft 365 ?',
          answer:
            'Oui, de la même façon que SharePoint — OneDrive for Business est limité à un tenant.',
        },
        {
          question: 'Un grand OneDrive est-il lent à garder synchronisé ?',
          answer:
            'La première synchronisation est la plus coûteuse ; la synchronisation différentielle signifie que les suivantes ne récupèrent que ce qui a réellement changé.',
        },
      ],
      productNote:
        'OneDrive fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI, avec une synchronisation différentielle pour les grandes bibliothèques.',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'Intégration IA Google Calendar — ClawAI',
        description:
          'Connectez Google Calendar à ClawAI pour lire vos réunions et événements, et créer un événement dans votre calendrier — directement depuis une conversation.',
        keywords: [
          'assistant IA Google Calendar',
          'intégration IA Google Calendar',
          'planifier une réunion avec l’IA',
        ],
      },
      eyebrow: 'Calendrier',
      title: 'Google Calendar',
      summary:
        'Connectez un Google Calendar pour que ClawAI puisse lire vos réunions et événements, et créer un nouvel événement directement depuis une conversation, avec une synchronisation différentielle pour que la consultation de votre agenda reste rapide.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les réunions et les événements, avec une synchronisation différentielle. Les notifications push en temps réel ne sont actuellement pas prises en charge.',
            'Côté écriture, le connecteur prend actuellement en charge une seule action : créer un événement dans le calendrier. Reprogrammer, supprimer ou répondre à une invitation existante ne sont pas encore des actions d’écriture prises en charge — cette page sera mise à jour si cela change.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI peut-il reprogrammer une réunion existante à ma place ?',
          answer:
            'Pas encore — le connecteur prend actuellement en charge la création d’un nouvel événement, pas la modification ou la reprogrammation d’un événement existant.',
        },
        {
          question:
            'Voit-il tout mon calendrier, y compris les autres calendriers auxquels j’ai accès ?',
          answer:
            'L’accès est limité à ce que vous accordez lors de la connexion, ce qui correspond généralement à votre calendrier principal, sauf si vous l’étendez explicitement.',
        },
      ],
      productNote:
        'Google Calendar fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI. Son action d’écriture se limite actuellement à la création d’événements.',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'Intégration IA Outlook Calendar — ClawAI',
        description:
          'Connectez Outlook Calendar à ClawAI pour lire vos réunions et événements, et créer un événement dans votre calendrier — directement depuis une conversation.',
        keywords: [
          'assistant IA Outlook Calendar',
          'intégration IA Outlook',
          'planifier une réunion avec l’IA Microsoft',
        ],
      },
      eyebrow: 'Calendrier',
      title: 'Outlook Calendar',
      summary:
        'Connectez un Microsoft Outlook Calendar pour que ClawAI puisse lire vos réunions et événements, et créer un nouvel événement directement depuis une conversation.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Ce que couvre le connecteur',
          paragraphs: [
            'ClawAI peut lire les réunions et les événements. Ce connecteur ne prend actuellement en charge ni la synchronisation différentielle ni les notifications push en temps réel — chaque synchronisation lit ce dont elle a besoin à la demande.',
            'Côté écriture, le connecteur prend actuellement en charge une seule action : créer un événement dans le calendrier. Reprogrammer, supprimer ou répondre à une invitation existante ne sont pas encore pris en charge.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Comment le connecter',
          paragraphs: [
            'Outlook Calendar prend en charge l’OAuth avec un identifiant de tenant optionnel — laissez-le vide pour utiliser le point de terminaison multi-tenant de Microsoft, ou renseignez-le pour une organisation précise.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI peut-il reprogrammer une réunion existante à ma place ?',
          answer:
            'Pas encore — seule la création d’un nouvel événement est actuellement prise en charge.',
        },
        {
          question: 'Dois-je renseigner un identifiant de tenant ?',
          answer:
            'Seulement si vous voulez limiter le connecteur à une organisation Microsoft précise. Le laisser vide utilise le point de terminaison multi-tenant, qui fonctionne pour la plupart des comptes personnels et professionnels.',
        },
      ],
      productNote:
        'Outlook Calendar fait partie des {connectorCount} connecteurs d’espace de travail de ClawAI. Son action d’écriture se limite actuellement à la création d’événements.',
    },
  },
};
