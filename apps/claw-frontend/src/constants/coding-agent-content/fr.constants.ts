import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * La version française des deux pages de l’agent de codage.
 *
 * Traduite de la source anglaise, sans rien y ajouter : chaque affirmation vient
 * du README et du manifeste de l’extension, dans `apps/claw-coding-agent`, et non
 * d’un souhait marketing. L’extension est un client léger — l’authentification,
 * les droits, les quotas, l’historique, les identifiants des fournisseurs, le
 * routage et l’inférence restent sur la plateforme — et le texte le dit, car un
 * développeur qui l’installe en attendant un modèle de code hors ligne la
 * désinstallera en moins d’une minute.
 */
export const FR_CODING_AGENT_CONTENT: CodingAgentDictionary = {
  overview: {
    eyebrow: 'ClawAI dans votre éditeur',
    title: 'L’agent de codage ClawAI pour VS Code',
    intro:
      'Tous les modèles de votre abonnement ClawAI, dans l’éditeur que vous utilisez déjà. L’extension est un client léger : votre compte, vos quotas, vos identifiants de fournisseurs et votre historique de conversations restent sur la plateforme, si bien que le fil commencé dans le navigateur se poursuit dans VS Code.',
    installCta: 'Installer depuis la Marketplace',
    marketplaceCta: 'Voir sur la Marketplace',
    capabilitiesTitle: 'Ce qu’il fait',
    capabilities: [
      {
        title: 'Tous les modèles, un seul abonnement',
        body: 'Neuf familles de modèles de premier plan et vos modèles locaux à poids ouverts, accessibles depuis l’éditeur sans aucune clé API à coller. Le routage se fait sur la plateforme : l’éditeur ne détient jamais l’identifiant d’un fournisseur.',
      },
      {
        title: 'Routage automatique ou manuel',
        body: 'Laissez le routeur choisir le modèle pour chaque message, ou épinglez une conversation à un modèle précis. Le choix est le même que celui de l’application web, parce qu’il est fait au même endroit.',
      },
      {
        title: 'Comparer et juger, dans l’éditeur',
        body: 'Envoyez un même prompt à plusieurs modèles à la fois et lisez les réponses côte à côte, avec une passe de jugement facultative — le même flux de comparaison que dans l’application web, appliqué au code que vous avez ouvert.',
      },
      {
        title: 'Aperçu avant application',
        body: 'Les modifications arrivent sous forme de diff à relire, pas d’écriture surprise. Rien ne touche votre copie de travail tant que vous ne l’avez pas acceptée.',
      },
      {
        title: 'Un contexte inspectable',
        body: 'Chaque réponse porte son relevé : quels fichiers ont été lus, quel modèle a répondu, et ce que cela a consommé sur votre quota. Quand une réponse est fausse, vous voyez ce qu’elle avait sous les yeux.',
      },
      {
        title: 'Conversations simultanées',
        body: 'Plusieurs onglets de discussion nommés à la fois, dont deux qui tournent en parallèle sur des modèles différents, avec l’historique du backend restauré à sa place.',
      },
    ],
    requirementsTitle: 'Ce qu’il vous faut',
    requirementsBody:
      'VS Code 1.98 ou une version ultérieure, et un compte ClawAI. L’extension se connecte à la plateforme hébergée par ClawAI ou à votre propre déploiement auto-hébergé — vous choisissez à la connexion.',
    faqTitle: 'Les questions que l’on nous pose',
    faq: [
      {
        question: 'Faut-il un abonnement séparé pour l’extension ?',
        answer:
          'Non. L’extension utilise le compte ClawAI que vous avez déjà et puise dans le même quota que l’application web. Il n’y a rien de plus à acheter.',
      },
      {
        question: 'Mon code est-il envoyé à un fournisseur de modèles ?',
        answer:
          'Uniquement ce qu’une requête exige, et uniquement au modèle qui y répond — le relevé joint à chaque réponse nomme ce modèle. Épinglez une conversation à un modèle local à poids ouverts, ou pointez l’extension vers un déploiement auto-hébergé, et rien ne part vers un fournisseur externe.',
      },
      {
        question: 'Fonctionne-t-elle avec un ClawAI auto-hébergé ?',
        answer:
          'Oui. L’extension demande l’URL du backend à la connexion : elle fonctionne donc aussi bien avec la plateforme hébergée par ClawAI qu’avec une instance tournant entièrement sur votre propre infrastructure.',
      },
      {
        question: 'Puis-je continuer à utiliser l’application web ?',
        answer:
          'Oui, et les mêmes conversations apparaissent des deux côtés. L’historique vit sur la plateforme : un fil commencé dans le navigateur se poursuit dans l’éditeur, et inversement.',
      },
    ],
  },
  install: {
    eyebrow: 'Installation',
    title: 'Installer l’agent de codage ClawAI',
    intro:
      'Trois étapes, environ une minute. L’extension est publiée sur la Visual Studio Marketplace par l’éditeur vérifié ClawAI.',
    stepsTitle: 'Depuis VS Code',
    steps: [
      {
        title: 'Ouvrez la vue Extensions',
        body: 'Appuyez sur Ctrl+Shift+X sous Windows et Linux, ou sur Cmd+Shift+X sous macOS. Vous pouvez aussi l’ouvrir depuis la barre d’activité, à gauche.',
      },
      {
        title: 'Cherchez ClawAI Coding Agent',
        body: 'Tapez « ClawAI » dans le champ de recherche. Repérez l’entrée publiée par ClawAI — le nom de l’éditeur porte un badge de vérification.',
      },
      {
        title: 'Installez, puis connectez-vous',
        body: 'Cliquez sur Installer, puis ouvrez le panneau ClawAI et connectez-vous. L’URL de votre backend vous sera demandée — laissez la valeur par défaut pour utiliser la plateforme hébergée par ClawAI, ou saisissez la vôtre si vous l’auto-hébergez.',
      },
    ],
    cliTitle: 'En ligne de commande',
    cliBody:
      'Si vous installez vos extensions depuis un terminal ou un script d’installation, une seule commande suffit. Elle fonctionne partout où la commande `code` est dans votre PATH.',
    signInTitle: 'La connexion',
    signInBody:
      'La connexion se fait dans votre navigateur et renvoie à l’éditeur un jeton à portée limitée. L’extension ne conserve jamais votre mot de passe et ne détient jamais la clé API d’un fournisseur de modèles — celles-ci restent sur la plateforme.',
    troubleshootingTitle: 'Si quelque chose ne va pas',
    troubleshooting: [
      {
        question: 'L’extension n’apparaît pas dans la recherche',
        answer:
          'Vérifiez votre version de VS Code : l’extension exige la 1.98 ou une version ultérieure. Sur les versions plus anciennes, la Marketplace la masque plutôt que de proposer une installation incompatible.',
      },
      {
        question: 'Le lien d’installation ne fait rien',
        answer:
          'Le lien en un clic utilise le protocole `vscode:`, qui ne fonctionne que si VS Code est installé sur la machine depuis laquelle vous naviguez. Passez plutôt par la page de la Marketplace ou par la ligne de commande.',
      },
      {
        question: 'La connexion réussit mais aucun modèle n’est proposé',
        answer:
          'L’accès aux modèles suit votre offre. Vérifiez la page Modèles dans l’application web ; si un modèle y manque aussi, c’est qu’il n’est pas ouvert à votre compte, et non qu’il manque à l’extension.',
      },
      {
        question: 'Elle n’atteint pas mon déploiement auto-hébergé',
        answer:
          'L’URL du backend doit être joignable depuis votre machine et présenter un certificat auquel votre éditeur fait confiance. Un certificat auto-signé que le navigateur a accepté après un avertissement sera malgré tout refusé ici.',
      },
    ],
    marketplaceCta: 'Ouvrir la fiche Marketplace',
    openInEditorCta: 'Ouvrir dans VS Code',
  },
};
