import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/** French copy for the public Live Intelligence page. Same claims as the English source. */
export const FR_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Nouveau dans ClawAI',
  title: 'Live Intelligence : sous-titres, résumés et temps forts d’un direct',
  intro:
    'Collez le lien d’un direct et regardez-le dans ClawAI. Pendant la lecture, ClawAI transforme la parole en sous-titres dans la langue de votre choix, tient à jour de courtes cartes de résumé quand le sujet change et repère les moments importants sur une frise. Fermez la fenêtre : ce que vous avez regardé reste dans votre historique, prêt à être enrichi et exporté.',
  openCta: 'Ouvrir Live Intelligence',
  pricingCta: 'Voir les offres et les tarifs',
  howItWorksCta: 'Voir le fonctionnement',
  whatTitle: 'Ce qu’est Live Intelligence',
  whatParagraphs: [
    'Un direct est difficile à suivre quand il est long, rapide ou dans une langue que vous ne parlez pas. Live Intelligence se place à côté de la vidéo et prend les notes : sous-titres traduits dans votre langue, résumé continu et liste des temps forts, pour que vous puissiez détourner les yeux sans perdre le fil.',
    'Tout se passe dans une fenêtre de ClawAI : le direct et l’analyse sont sur le même écran. Vous choisissez la langue des sous-titres et un mode d’analyse avant de commencer, puis vous pouvez mettre en pause, reprendre et vous déplacer là où le flux le permet. En pause, le flux est figé et la facturation s’arrête.',
    'Plusieurs personnes peuvent regarder le même direct sans payer plusieurs fois le même travail. Quand ClawAI analyse un flux sur ses propres serveurs, comme un direct public sur YouTube, Twitch, TikTok LIVE ou une autre plateforme prise en charge, ou un lien HLS, il le traite une seule fois et partage l’analyse avec tous ses spectateurs. L’analyse que vous avez réellement regardée est enregistrée dans votre historique, et vous la gardez jusqu’à ce que vous la supprimiez.',
  ],
  stepsTitle: 'Comment ça marche, en cinq étapes',
  stepsIntro:
    'Du lien collé au résumé exporté. Chaque étape est une action de votre part ou un travail que ClawAI fait pour vous.',
  steps: [
    {
      title: 'Collez le lien',
      body: 'Ouvrez Live Intelligence et collez l’adresse d’un direct. ClawAI vérifie que la source est prise en charge avant toute analyse ou facturation, et vous le dit clairement si ce n’est pas le cas.',
    },
    {
      title: 'Choisissez une langue et un mode',
      body: 'Choisissez la langue des sous-titres et des résumés, puis l’un des trois modes : Audio, Audio + Vision ou Smart Auto. Pour un lien HLS, vous confirmez avoir le droit de l’analyser. Si les serveurs de ClawAI ne peuvent pas lire un direct YouTube, Twitch, Kick ou Facebook, vous pouvez accepter que ClawAI écoute plutôt via votre appareil.',
    },
    {
      title: 'Regardez avec sous-titres, cartes et temps forts',
      body: 'Les sous-titres apparaissent quelques secondes après la parole, environ 7 à 12 secondes de retard. Les cartes de résumé changent avec les sujets et les temps forts détectés sont placés sur une frise cliquable.',
    },
    {
      title: 'Pause, reprise et déplacement',
      body: 'Mettez en pause pour figer le flux et arrêter le compteur. Reprenez là où vous vous étiez arrêté ou revenez au direct, avec l’écart affiché clairement. Le déplacement dans le flux fonctionne là où la source le permet.',
    },
    {
      title: 'Fermez, revenez, enrichissez, exportez',
      body: 'En fermant la fenêtre, ce que vous avez regardé reste dans votre historique. Vous pouvez ensuite enrichir une carte avec le modèle de votre choix et exporter l’historique en PDF, Markdown ou TXT.',
    },
  ],
  featuresTitle: 'Ce que vous obtenez',
  features: [
    {
      title: 'Sous-titres en direct dans votre langue',
      body: 'La parole est transcrite puis traduite dans la langue choisie. Les sous-titres arrivent quelques secondes après l’orateur : ce n’est pas instantané, et l’interface le dit.',
    },
    {
      title: 'Des cartes de résumé qui suivent',
      body: 'De courtes cartes résument le direct et sont actualisées quand le sujet change : la dernière carte vous dit où en est le direct.',
    },
    {
      title: 'Temps forts automatiques sur une frise',
      body: 'Les moments à revoir sont détectés et marqués sur une frise. Cliquez pour y aller, quand le flux autorise le déplacement.',
    },
    {
      title: 'Pause, reprise et déplacement',
      body: 'Contrôlez la lecture comme un enregistrement quand la source le permet. En pause, le flux est figé et rien n’est facturé.',
    },
    {
      title: 'Un historique que vous maîtrisez',
      body: 'L’analyse regardée est conservée dans un historique paginé jusqu’à ce que vous la supprimiez. La supprimer l’efface.',
    },
    {
      title: 'Enrichir une carte avec le modèle de votre choix',
      body: 'Choisissez un modèle disponible pour reformuler ou approfondir une carte. L’enrichissement est facturé au coût réel du modèle choisi.',
    },
    {
      title: 'Export en PDF, Markdown ou TXT',
      body: 'Sortez votre historique de ClawAI dans le format qui convient à la suite.',
    },
    {
      title: 'Traitement partagé',
      body: 'Beaucoup de spectateurs, une seule analyse. Un direct public que les serveurs de ClawAI peuvent lire, ou un flux HLS, est traité une fois sur les serveurs de ClawAI et partagé avec tous ceux qui le regardent, sur n’importe quel appareil, téléphone compris. Une analyse faite à partir du son de votre propre appareil reste privée.',
    },
  ],
  modesTitle: 'Trois modes d’analyse',
  modesIntro:
    'Le mode décide ce que ClawAI observe. Vous le choisissez avant de commencer, et le coût suit ce choix.',
  modes: [
    {
      title: 'Audio',
      body: 'Sous-titres, résumés et temps forts à partir de ce qui est dit. Le mode le plus simple, adapté aux conférences, points de presse, cours et entretiens.',
    },
    {
      title: 'Audio + Vision',
      body: 'Ajoute ce qui est montré à l’écran : diapositives, graphiques, démonstration. ClawAI échantillonne des images du flux et garde celles qui ont changé. La vision est facturée au coût réel du modèle utilisé.',
    },
    {
      title: 'Smart Auto',
      body: 'Part de l’audio et n’ajoute la vision que lorsque le flux devient silencieux ou que l’image change, pour payer la vision quand elle a des chances de compter.',
    },
  ],
  sourcesTitle: 'Ce qu’il peut et ne peut pas analyser',
  sourcesIntro: 'Nous préférons vous dire les limites maintenant plutôt que pendant le direct.',
  sources: [
    {
      title: '15 plateformes, analysées sur les serveurs de ClawAI',
      body: 'ClawAI reconnaît 15 plateformes de direct. Quand un direct est en cours et public, et que la plateforme le permet, les serveurs de ClawAI le lisent eux-mêmes : YouTube, Twitch, Kick, Facebook, TikTok LIVE, Rumble, BIGO LIVE, Bilibili, CHZZK, SOOP, Nimo TV et d’autres. Rien à partager, cela fonctionne sur n’importe quel appareil, téléphone compris, et une seule analyse est partagée avec tous les spectateurs. Instagram Live ne peut généralement pas être lu par le serveur. Discord Go Live n’est pas pris en charge, faute de lien public. Les liens HLS que vous avez le droit d’analyser fonctionnent toujours ; vous le confirmez au démarrage.',
    },
    {
      title: 'Quand le serveur ne peut pas lire un direct',
      body: 'YouTube, Twitch, Kick et Facebook se lisent alors dans leur lecteur officiel, et l’IA écoute le son de votre appareil une fois votre accord donné : sur ordinateur, vous partagez le son de l’onglet dans Chrome ou Edge (« Analyser avec mon navigateur ») ; sur téléphone, le micro capte le direct depuis le haut-parleur (« Analyser avec le micro »). Seul l’audio est envoyé, pour la transcription, d’où le mode Audio. Les autres plateformes s’ouvrent sur la plateforme elle-même (« Regarder sur … »), sans IA. Le chat en direct s’affiche pour les vidéos YouTube, Twitch et Kick ; les autres plateformes ont un lien « Ouvrir le chat ».',
    },
    {
      title: 'Les sous-titres ont quelques secondes de retard',
      body: 'La parole est transcrite par petits morceaux : les sous-titres arrivent environ 7 à 12 secondes après. Ce n’est pas du sous-titrage en temps réel.',
    },
    {
      title: 'Des états honnêtes, jamais de faux succès',
      body: 'La fenêtre indique quand elle se connecte, prend du retard, récupère, n’a plus de minutes gratuites, attend votre accord, est à capacité maximale ou quand le direct est terminé.',
    },
  ],
  plansTitle: 'Minutes gratuites et tarifs',
  plansIntro:
    'Chaque offre inclut des minutes d’analyse gratuites par mois. Ce sont les valeurs par défaut, ajustables.',
  planMinutesUnit: 'minutes gratuites par mois',
  planProAndAbove: 'Pro et supérieures',
  plansBody:
    'Après vos minutes gratuites, l’analyse coûte {price} la minute, et seulement après votre confirmation. Vous pouvez fixer un plafond de dépense. Quand votre crédit est épuisé, vous disposez d’un unique délai de grâce de 60 secondes. La vision est facturée au coût réel du modèle utilisé, et la pause arrête le compteur.',
  faqTitle: 'Questions fréquentes',
  faq: [
    {
      question: 'Live Intelligence fonctionne-t-il avec les directs YouTube ?',
      answer:
        'Oui, quand le direct est en cours et public et que YouTube le permet : les serveurs de ClawAI le lisent, il n’y a rien à partager et cela fonctionne sur n’importe quel appareil. Si le serveur ne peut pas le lire, l’IA travaille à partir du son de votre propre appareil après votre accord : sur ordinateur, vous partagez le son de l’onglet dans Chrome ou Edge ; sur téléphone, le micro capte le direct depuis le haut-parleur. Dans les deux cas, les sous-titres arrivent quelques secondes après la parole.',
    },
    {
      question: 'Quels flux peut-il analyser ?',
      answer:
        'Les directs publics sur YouTube, Twitch, Kick, Facebook, TikTok LIVE, Rumble, BIGO LIVE, Bilibili, CHZZK, SOOP, Nimo TV et d’autres plateformes prises en charge, analysés sur les serveurs de ClawAI sur n’importe quel appareil quand la plateforme le permet ; et les directs HLS que vous avez le droit d’analyser, ce que vous confirmez au démarrage. Si le serveur ne peut pas lire un direct, YouTube, Twitch, Kick et Facebook passent au son de votre propre appareil, et les autres plateformes s’ouvrent sur la plateforme elle-même, sans IA. Instagram Live ne peut généralement pas être lu par le serveur, et Discord n’est pas pris en charge.',
    },
    {
      question: 'Les sous-titres sont-ils en temps réel ?',
      answer:
        'Non. Ils arrivent environ 7 à 12 secondes après la parole, car l’audio est transcrit par petits morceaux. Les résumés et temps forts suivent les sous-titres.',
    },
    {
      question: 'Combien ça coûte ?',
      answer:
        'Chaque offre inclut des minutes gratuites par mois : 30 pour Free, 120 pour Starter, 300 pour Plus et 600 pour Pro et au-delà. Ensuite, 0,02 $ la minute, seulement après votre confirmation, avec un plafond optionnel. La vision est facturée au coût réel du modèle.',
    },
    {
      question: 'Que se passe-t-il si mon crédit s’épuise en plein direct ?',
      answer:
        'Vous disposez d’un seul délai de grâce de 60 secondes, puis l’analyse s’arrête jusqu’à ce que vous ajoutiez du crédit.',
    },
    {
      question: 'La pause coûte-t-elle quelque chose ?',
      answer:
        'Non. En pause, le flux est figé et la facturation s’arrête. Reprenez là où vous étiez ou revenez au direct.',
    },
    {
      question: 'Que devient mon historique ?',
      answer:
        'L’analyse que vous avez réellement regardée est conservée jusqu’à sa suppression. Vous pouvez la parcourir, enrichir une carte avec un modèle de votre choix et l’exporter en PDF, Markdown ou TXT.',
    },
    {
      question: 'Puis-je poser des questions au direct ?',
      answer:
        'Pas dans cette première version. Live Intelligence fournit sous-titres, cartes de résumé et temps forts ; les questions sur un direct ne sont pas encore incluses.',
    },
  ],
  closingTitle: 'Suivez le prochain direct sans regarder chaque minute',
  closingBody:
    'Collez le lien d’un direct sur YouTube, Twitch, TikTok LIVE ou une autre plateforme prise en charge, ou un lien HLS que vous avez le droit d’analyser, choisissez votre langue et lancez. Vos minutes gratuites vous attendent.',
};
