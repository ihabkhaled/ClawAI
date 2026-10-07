import type { ThreadsMarketingDictionary } from '@/types/threads-marketing-content.types';

export const FR_THREADS_MARKETING_CONTENT: ThreadsMarketingDictionary = {
  eyebrow: 'Nouveau dans ClawAI',
  title: 'ClawAI Threads : transformez un chat en article public, documenté et sourcé',
  intro:
    'Une bonne conversation avec une IA se termine souvent par quelque chose qui mérite d’être partagé. Threads reprend le chat que vous avez déjà eu, recherche le sujet sur le web en direct, laisse plusieurs modèles différents l’écrire séparément, les oblige à s’accorder sur un seul brouillon, le fait relire par un juge et un critique, puis vous le rend. Vous lisez chaque mot et vous l’approuvez. Ce n’est qu’alors qu’il devient une page publique avec de vraies sources.',
  announcementBadge: 'Annonce',
  announcementTitle: 'Threads est là, et il est ouvert à toutes les offres',
  announcementBody:
    'Free, Starter, Plus et toutes les offres supérieures peuvent créer des Threads, tout comme les administrateurs. Lancez-vous depuis n’importe quel chat avec « Transformer en Thread public » ou depuis la page Threads. Publier reste toujours votre décision : rien ne quitte votre compte avant que vous approuviez le brouillon final.',
  createCta: 'Créer un Thread',
  discoverCta: 'Lire les Threads publiés',
  howItWorksCta: 'Voir les six étapes',
  whatTitle: 'Ce qu’est un Thread',
  whatParagraphs: [
    'Un Thread est un article public construit à partir de l’un de vos chats. Ce n’est pas une copie de la conversation et il ne montre jamais le chat. C’est un texte nouveau sur le sujet, appuyé sur des sources que ClawAI a recherchées pour lui, et écrit par plusieurs modèles plutôt qu’un seul.',
    'Utiliser plusieurs modèles compte. Chaque auteur écrit son propre brouillon sans voir les autres. Les auteurs doivent ensuite s’accorder sur un seul brouillon, mot pour mot. Un modèle juge note le résultat selon des critères explicites, et un modèle critique note ce qui reste faible. Si l’un des deux refuse, le brouillon repart pour un nouveau tour, trois au maximum.',
    'Vous gardez la main de bout en bout. Vous choisissez les modèles, fixez un plafond de dépense, pouvez annuler pendant l’exécution et voyez le brouillon terminé avec ses sources avant que quoi que ce soit devienne public. Après publication, vous pouvez le retirer à tout moment, et la page disparaît de la recherche, du sitemap et des flux.',
  ],
  stepsTitle: 'Comment ça marche, en six étapes',
  stepsIntro:
    'Le même parcours fonctionne depuis un chat ou depuis la page Threads. Chaque étape est soit une action de votre part, soit un travail que ClawAI fait pour vous.',
  steps: [
    {
      title: 'Choisissez le chat',
      body: 'Ouvrez le chat à partager et choisissez « Transformer en Thread public » dans le menu du chat. Depuis la page Threads, vous choisissez vous-même le chat source. La conversation est figée en instantané : les modifications ultérieures du chat ne changent pas ce dont le Thread est issu.',
    },
    {
      title: 'Indiquez le sujet et donnez votre accord',
      body: 'Décrivez le sujet en une ou deux phrases, choisissez le type (article, article de recherche, guide ou explication technique) et la langue, puis cochez la case confirmant que vous savez que le résultat sera public. Sans cet accord, le bouton de démarrage reste désactivé.',
    },
    {
      title: 'Choisissez les modèles',
      body: 'Choisissez de trois à cinq auteurs, un juge et un critique avec le même sélecteur de modèles que dans le chat : groupé par fournisseur, avec recherche et badges pour les capacités et pour les modèles qui utilisent du crédit de connecteur. Des fournisseurs différents donnent des brouillons vraiment différents.',
    },
    {
      title: 'Fixez un plafond et lancez',
      body: 'Définissez le maximum que ce Thread peut dépenser. Chaque appel de modèle est vérifié par rapport à ce plafond avant son exécution, et la tâche s’arrête plutôt que de le dépasser. Vous suivez les étapes en direct et pouvez annuler à tout moment.',
    },
    {
      title: 'Rechercher, écrire, s’accorder, juger',
      body: 'ClawAI recherche le sujet sur le web en direct et conserve les preuves. Les auteurs écrivent à partir de ces preuves, s’accordent sur un brouillon, puis le juge et le critique le relisent. Un brouillon refusé est révisé et relu, jusqu’à trois tours. S’il échoue encore, on vous en donne la raison et rien n’est publié.',
    },
    {
      title: 'Relire, approuver et publier',
      body: 'Lisez le brouillon avec ses sources, demandez des changements ou modifiez-le, et approuvez-le quand vous êtes satisfait. Seul un brouillon approuvé devient une page publique, avec données structurées, liste de sources, compteur de lecteurs et place pour les commentaires et réactions. Vous pouvez l’exporter et le retirer quand vous voulez.',
    },
  ],
  trustTitle: 'Des garde-fous intégrés, pas seulement promis',
  trustIntro:
    'Publier quelque chose sous votre compte mérite plus de soin qu’une réponse de chat. Ces contrôles s’appliquent à chaque Thread.',
  trust: [
    {
      title: 'Rien n’est public sans votre approbation',
      body: 'De bonnes notes du juge et du critique rendent seulement un brouillon éligible à votre relecture. Elles ne publient jamais rien par elles-mêmes.',
    },
    {
      title: 'Uniquement de vraies sources',
      body: 'Les citations doivent provenir des preuves réunies par l’étape de recherche. Un brouillon qui cite une adresse que la recherche n’a jamais trouvée est rejeté.',
    },
    {
      title: 'Deux relecteurs indépendants',
      body: 'Le juge doit noter le brouillon au moins 80 sur 100 et le critique au moins 75. Ce sont deux modèles que vous choisissez, donc vous pouvez prendre des relecteurs d’un autre fournisseur que celui des auteurs.',
    },
    {
      title: 'Un plafond de dépense strict',
      body: 'Chaque appel de modèle réserve d’abord son coût sur le plafond. Les réservations inutilisées sont libérées, et une tâche échouée ou annulée rend son crédit.',
    },
    {
      title: 'Votre conversation reste la vôtre',
      body: 'La page publique contient l’article, pas le chat. Le chat n’est que le point de départ et il est lu depuis un instantané figé.',
    },
    {
      title: 'Sécurité et vie privée des lecteurs',
      body: 'Les lecteurs peuvent commenter, réagir, suggérer des modifications et signaler une page. Les compteurs de vues ignorent les robots et ne stockent que des empreintes anonymes à clé, jamais une adresse ni un compte.',
    },
  ],
  outputsTitle: 'Ce que vous obtenez',
  outputs: [
    {
      title: 'Une page d’article publique',
      body: 'Une page claire avec l’article, ses sources numérotées et des données structurées pour que les moteurs de recherche le comprennent, dans la langue choisie.',
    },
    {
      title: 'Découverte et flux',
      body: 'Les Threads publiés apparaissent dans le hub Threads, dans le sitemap et dans les flux RSS, et en sortent dès que vous les retirez.',
    },
    {
      title: 'Exports',
      body: 'Téléchargez un Thread en JSON, Markdown ou TOON, le format compact peu coûteux à transmettre à un autre modèle.',
    },
    {
      title: 'Une communauté de lecteurs',
      body: 'Les lecteurs connectés peuvent commenter, réagir et suggérer des changements que vous acceptez ou refusez. Un compteur de vues montre la portée sans pister personne.',
    },
  ],
  useCasesTitle: 'Ce que les gens transforment en Threads',
  useCases: [
    {
      title: 'Un chat de recherche en explication',
      body: 'Vous avez passé une heure à comprendre un sujet avec l’IA. Faites-en l’article que vous auriez voulu trouver au départ.',
    },
    {
      title: 'Une solution en guide',
      body: 'Vous avez résolu un problème délicat dans un chat ? Publiez les étapes qui marchent sous forme de guide, avec les sources qui les appuient.',
    },
    {
      title: 'Une question technique en article',
      body: 'Interrogez plusieurs modèles, laissez-les s’accorder et publiez le résultat comme une explication technique relue deux fois.',
    },
    {
      title: 'Une comparaison en billet',
      body: 'Vous avez utilisé Compare pour voir comment les modèles répondent ? Publiez ce que vous avez appris, avec la recherche qui le soutient.',
    },
  ],
  plansTitle: 'Offres et coût',
  plansBody:
    'Threads est ouvert à toutes les offres. Free inclut un Thread, Starter deux par mois et Plus dix par mois, et les offres supérieures en incluent davantage. Créer un Thread utilise la même allocation et les mêmes règles de crédit que le reste de ClawAI, et votre plafond de dépense est le maximum qu’il peut coûter. Lire, commenter et réagir sont gratuits pour tout compte connecté.',
  faqTitle: 'Questions fréquentes',
  faq: [
    {
      question: 'Mon chat devient-il public ?',
      answer:
        'Non. Seul l’article que vous approuvez est public. Le chat sert de point de départ et n’est jamais affiché sur la page.',
    },
    {
      question: 'Un Thread peut-il être publié sans moi ?',
      answer:
        'Non. Chaque Thread attend votre approbation, même avec d’excellentes notes du juge et du critique. Vous pouvez aussi le retirer à tout moment.',
    },
    {
      question: 'Quels modèles écrivent un Thread ?',
      answer:
        'Ceux que vous choisissez : de trois à cinq auteurs, un juge et un critique, avec le même sélecteur que dans le chat. Des fournisseurs différents donnent des brouillons plus variés et une relecture indépendante.',
    },
    {
      question: 'Que se passe-t-il si le juge ou le critique rejette le brouillon ?',
      answer:
        'Le brouillon est révisé et relu, jusqu’à trois tours. S’il ne passe toujours pas, la tâche se termine avec une raison claire, le crédit inutilisé est libéré et rien n’est publié.',
    },
    {
      question: 'Comment savoir que les sources sont réelles ?',
      answer:
        'Les citations doivent provenir des preuves réunies par la recherche, et un brouillon qui cite autre chose est rejeté. Vous voyez la liste numérotée des sources avant d’approuver.',
    },
    {
      question: 'Combien coûte un Thread ?',
      answer:
        'Vous fixez un plafond de dépense avant le départ et la tâche ne peut pas le dépasser. Les modèles inclus dans votre offre n’utilisent pas de crédit ; ceux à crédit de connecteur puisent dans votre crédit ou votre allocation gratuite, et une tâche échouée ou annulée rend sa réservation.',
    },
    {
      question: 'Puis-je modifier un Thread après sa publication ?',
      answer:
        'Oui. Une modification est relue avant de remplacer la version publique, et les lecteurs peuvent suggérer des changements que vous acceptez ou refusez.',
    },
    {
      question: 'Quelles langues sont prises en charge ?',
      answer:
        'Les Threads peuvent être écrits dans l’une des 13 langues prises en charge par ClawAI, et la page publique utilise la langue choisie.',
    },
  ],
  closingTitle: 'Faites de votre prochain bon chat quelque chose qui vaut d’être partagé',
  closingBody:
    'Ouvrez n’importe quel chat, choisissez « Transformer en Thread public » et voyez ce qui revient. Vous ne publiez que ce que vous approuvez.',
};
