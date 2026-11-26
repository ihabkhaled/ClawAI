import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligenceMarketingSeo,
} from '@/types/live-intelligence-marketing-content.types';

/**
 * The Italian copy of the public Live & Video Intelligence pages. Every claim mirrors the English
 * file (`en.constants.ts`); nothing here may say more than it does.
 */
export const IT_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Novità in ClawAI: Live & Video Intelligence',
  title: 'Ogni diretta e ogni video, capiti nella tua lingua',
  intro:
    'Incolla il link di una diretta o di un video registrato da oltre 50 piattaforme. ClawAI lo segue con sottotitoli in tempo reale e un feed continuo di riassunti e momenti salienti, oppure trasforma l’intero video in un unico report chiaro con un solo clic. Funziona sui server di ClawAI, quindi va su qualsiasi dispositivo, anche sul tuo telefono.',
  openCta: 'Incolla un link ora',
  signUpCta: 'Crea un account gratuito',
  howItWorksCta: 'Scopri come funziona',
  videosTitle: 'Guardalo in azione',
  videosIntro:
    'Due brevi clip dal prodotto reale. Premi play: sono senza audio per impostazione predefinita e vanno in loop, così puoi guardarle ovunque.',
  videos: [
    {
      title: 'Il pannello Analisi IA accanto a uno stream di gameplay',
      body: 'Uno stream di gioco va avanti mentre il pannello Analisi IA tiene un feed continuo di quello che succede sullo schermo e di quello che viene detto.',
    },
    {
      title: 'Un telegiornale in diretta in arabo, sottotitolato in inglese su un telefono',
      body: 'La registrazione con il telefono di un telegiornale in diretta su YouTube: la conduttrice parla arabo, i sottotitoli compaiono in inglese e il Feed intelligente riassume la notizia fin qui.',
    },
  ],
  stepsTitle: 'Come funziona, in quattro passaggi',
  stepsIntro: 'Da un link incollato ad appunti da conservare. Niente da installare.',
  steps: [
    {
      title: 'Incolla un link',
      body: 'Incolla l’indirizzo di una diretta o di un video registrato: un reel, un post, uno short o una diretta passata. ClawAI verifica di poter leggere la fonte prima di avviare qualsiasi cosa.',
    },
    {
      title: 'Scegli la lingua e una modalità',
      body: 'Scegli la lingua in cui vuoi leggere, tra le 13 lingue dell’app, e una modalità di analisi: Solo audio, Audio + visione o Automatico intelligente.',
    },
    {
      title: 'Segui in diretta, oppure clicca su «Riassumi video»',
      body: 'Segui tutto con i sottotitoli e un Feed intelligente di riassunti, momenti salienti e note visive. Per un video registrato puoi invece cliccare su «Riassumi video» e ottenere subito il report completo.',
    },
    {
      title: 'Esporta e condividi',
      body: 'Tutto viene salvato nella tua cronologia. Esportalo in PDF, Markdown o TXT e condividilo con chi ne ha bisogno.',
    },
  ],
  screenshotsTitle: 'Com’è su un telefono',
  screenshotsIntro: 'Schermate reali dell’app, acquisite su un telefono con il tema scuro.',
  screenshots: [
    {
      title: 'Incollare il link di una diretta o di un video',
      body: 'Un solo campo accetta il link di qualsiasi piattaforma supportata. Scegli la lingua e la modalità, poi avvia.',
    },
    {
      title: 'Il feed in diretta con sottotitoli, riassunti e momenti salienti',
      body: 'I sottotitoli arrivano qualche secondo dopo chi parla, mentre il Feed intelligente tiene aggiornati riassunti, momenti salienti e note visive.',
    },
    {
      title: 'Un riassunto video con un clic',
      body: 'Il report finito: un riassunto generale, i momenti chiave con i timestamp, i momenti salienti e la trascrizione completa.',
    },
  ],
  outcomesTitle: 'Cosa fa per te',
  outcomes: [
    {
      title: 'Recupera una diretta di due ore in pochi minuti',
      body: 'Leggi il riassunto e i momenti chiave invece di scorrere tutta la registrazione. Ogni momento ha un timestamp, così puoi saltare dritto al punto che conta.',
    },
    {
      title: 'Segui una trasmissione in lingua straniera nella tua lingua',
      body: 'Una conferenza stampa in giapponese, la telecronaca di una partita in spagnolo, il telegiornale in arabo: leggi sottotitoli e riassunti nella lingua che scegli.',
    },
    {
      title: 'Non perdere mai il momento chiave',
      body: 'I momenti salienti vengono individuati mentre la diretta va avanti, così puoi distogliere lo sguardo e sapere comunque cosa è appena successo.',
    },
    {
      title: 'Appunti per riunioni, lezioni, notizie e gaming',
      body: 'Trasforma un webinar pubblico, una lezione registrata, una diretta di ultim’ora o un torneo in appunti da cercare, conservare ed esportare.',
    },
    {
      title: 'Funziona su qualsiasi dispositivo',
      body: 'ClawAI legge la diretta sui propri server. Non devi condividere nulla dal tuo schermo, quindi funziona allo stesso modo su telefono, tablet o computer.',
    },
    {
      title: 'La tua cronologia, le tue esportazioni',
      body: 'Ciò che hai guardato e ogni riassunto che hai creato restano nella tua cronologia, pronti da esportare in PDF, Markdown o TXT.',
    },
  ],
  waysTitle: 'Due modi per usarlo',
  waysIntro:
    'Segui una diretta mentre accade, oppure affida a ClawAI un video registrato e ricevi il report tutto in una volta.',
  ways: [
    {
      title: 'Analisi in diretta: segui insieme',
      body: 'I sottotitoli arrivano circa 7-12 secondi dopo il parlato, e un Feed intelligente continuo aggiunge riassunti, momenti salienti e note visive. Le piattaforme con una chat dal vivo hanno una scheda chat. Per un video registrato, ClawAI lo riproduce dall’inizio a velocità normale e l’analisi lo segue.',
    },
    {
      title: 'Riassumi video: un clic',
      body: 'Per un video registrato, ClawAI elabora l’intero video in una volta e restituisce un report completo: un riassunto generale, i momenti chiave con i timestamp, i momenti salienti e la trascrizione completa. Viene salvato nella tua cronologia e si esporta in PDF, Markdown o TXT.',
    },
  ],
  waysTableCaption: 'Analisi in diretta e riassunto con un clic, a confronto',
  waysTableAspect: 'Cosa ottieni',
  waysTableLive: 'Analisi in diretta',
  waysTableSummary: 'Riassumi video',
  waysRows: [
    {
      label: 'Funziona con',
      live: 'Dirette e video registrati',
      summary: 'Video registrati fino a 3 ore',
    },
    {
      label: 'Tempistica',
      live: 'Segue il video in tempo reale, sottotitoli con circa 7-12 secondi di ritardo',
      summary: 'L’intero video viene elaborato in una volta',
    },
    {
      label: 'Risultato',
      live: 'Sottotitoli e un Feed intelligente di riassunti, momenti salienti e note visive',
      summary:
        'Riassunto generale, momenti chiave con timestamp, momenti salienti e trascrizione completa',
    },
    {
      label: 'Chat dal vivo',
      live: 'Una scheda chat sulle piattaforme che ce l’hanno',
      summary: 'Non necessaria',
    },
    {
      label: 'Conservalo',
      live: 'Salvato nella cronologia, esportabile in PDF, Markdown o TXT',
      summary: 'Salvato nella cronologia, esportabile in PDF, Markdown o TXT',
    },
  ],
  modesTitle: 'Tre modalità di analisi',
  modesIntro: 'La modalità decide a cosa presta attenzione ClawAI. La scegli prima di iniziare.',
  modes: [
    {
      title: 'Solo audio',
      body: 'Sottotitoli, riassunti e momenti salienti da ciò che viene detto. Ideale per talk, interviste, podcast, lezioni e notiziari.',
    },
    {
      title: 'Audio + visione',
      body: 'Aggiunge ciò che appare sullo schermo, come slide, grafici, tabelloni o gameplay, così gli appunti descrivono ciò che vedi oltre a ciò che senti.',
    },
    {
      title: 'Automatico intelligente',
      body: 'Parte dall’audio e guarda l’immagine quando è probabile che conti, per esempio quando chi parla tace o la scena cambia.',
    },
  ],
  researchNote:
    'Ricerca: un riassunto può eseguire una ricerca sul web per aggiungere contesto, per esempio chi è una persona che parla o a cosa si riferisce un evento.',
  languagesTitle: 'Leggilo nella tua lingua',
  languagesParagraphs: [
    'Scegli una delle 13 lingue dell’app: inglese, arabo, tedesco, spagnolo, persiano, francese, hindi, italiano, giapponese, portoghese, russo, thailandese o cinese. Chi parla può usare qualsiasi lingua.',
    'Quando chi parla usa già la tua lingua, leggi le sue parole esatte. Altrimenti sottotitoli, riassunti e momenti salienti vengono tradotti, e la traduzione compare al posto dell’originale.',
  ],
  platformsTitle: 'Oltre 50 piattaforme',
  platformsBody:
    'YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili, Niconico e molte altre. Funzionano sia le dirette sia i video registrati.',
  platformsCta: 'Vedi tutte le piattaforme',
  limitsTitle: 'Buono a sapersi',
  limits: [
    {
      title: 'Solo video e dirette pubblici',
      body: 'ClawAI può leggere solo video e dirette pubblici. Alcune piattaforme, o singoli video, possono rifiutare l’accesso da un server; quando succede, ClawAI te lo dice chiaramente invece di fingere.',
    },
    {
      title: 'Video registrati fino a 3 ore',
      body: 'Un video registrato può durare fino a 3 ore, sia per l’analisi in diretta sia per il riassunto con un clic.',
    },
    {
      title: 'I sottotitoli arrivano qualche secondo dopo',
      body: 'Il parlato viene trascritto in brevi segmenti, quindi i sottotitoli arrivano circa 7-12 secondi dopo che è stato pronunciato. Non si tratta di sottotitolazione istantanea.',
    },
    {
      title: 'Minuti gratuiti ogni mese, minuti a pagamento solo con la tua approvazione',
      body: 'Ogni piano include minuti gratuiti ogni mese. Dopo, i minuti si pagano solo quando li approvi. Un riassunto con un clic conta la durata del video in minuti.',
    },
  ],
  faqTitle: 'Domande frequenti',
  faq: [
    {
      question: 'Funziona sul mio telefono?',
      answer:
        'Sì. ClawAI legge la diretta o il video sui propri server, quindi non devi condividere nulla dal tuo schermo. Funziona allo stesso modo su telefoni, tablet e computer.',
    },
    {
      question: 'In quali lingue posso leggere i sottotitoli?',
      answer:
        'In una qualsiasi delle 13 lingue dell’app: inglese, arabo, tedesco, spagnolo, persiano, francese, hindi, italiano, giapponese, portoghese, russo, thailandese e cinese. Chi parla può usare qualsiasi lingua. Se parla già la tua lingua vedi le sue parole esatte; altrimenti la traduzione compare al posto dell’originale.',
    },
    {
      question: 'Funziona con i video registrati o solo con le dirette?',
      answer:
        'Con entrambi. Incolla una diretta oppure un video registrato come un reel, un post, uno short o una diretta passata. Con un video registrato puoi seguirlo dall’inizio a velocità normale, oppure cliccare su «Riassumi video» per ottenere subito il report completo.',
    },
    {
      question: 'Quanto può durare un video?',
      answer: 'Un video registrato può durare fino a 3 ore.',
    },
    {
      question: 'Cosa contiene un riassunto con un clic?',
      answer:
        'Un riassunto generale, i momenti chiave con i timestamp, i momenti salienti e la trascrizione completa. Viene salvato nella tua cronologia e si può esportare in PDF, Markdown o TXT.',
    },
    {
      question: 'Come viene addebitato?',
      answer:
        'Ogni piano include minuti gratuiti ogni mese. Dopo paghi al minuto, e solo dopo averlo approvato. Un riassunto con un clic conta la durata del video in minuti.',
    },
    {
      question: 'I sottotitoli sono in tempo reale?',
      answer:
        'Quasi. I sottotitoli arrivano circa 7-12 secondi dopo il parlato, perché l’audio viene trascritto in brevi segmenti. Riassunti e momenti salienti seguono i sottotitoli.',
    },
    {
      question: 'Quali piattaforme sono supportate?',
      answer:
        'Oltre 50, tra cui YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili e Niconico. La pagina delle piattaforme le elenca tutte. Si possono leggere solo video e dirette pubblici, e Discord non è supportato perché non ha link pubblici.',
    },
    {
      question: 'ClawAI pubblica o scrive in chat al posto mio?',
      answer:
        'No. ClawAI si limita a leggere la diretta. Non pubblica, non commenta e non scrive mai in chat per te su nessuna piattaforma. Ciò che dice la diretta, e ciò che dice la sua chat, viene trattato come dati non affidabili da riassumere, mai come istruzioni per ClawAI.',
    },
    {
      question: 'Chi può vedere cosa ho guardato?',
      answer:
        'La tua cronologia è tua. Le analisi che hai seguito e i riassunti che hai creato restano nel tuo account finché non li elimini, e sei tu a decidere cosa esportare o condividere.',
    },
  ],
  closingTitle: 'Incolla il tuo primo link',
  closingBody:
    'Una partita in diretta, una conferenza stampa, una lezione o una diretta di due ore che ti sei perso: incolla il link, scegli la lingua e lascia che sia ClawAI a prendere appunti. Ogni piano include minuti gratuiti ogni mese.',
  platformsPage: {
    eyebrow: 'Novità in ClawAI: Live & Video Intelligence',
    title: 'Tutte le piattaforme che Live & Video Intelligence sa leggere',
    intro:
      'Incolla un link da una di queste piattaforme, in diretta o registrato. ClawAI lo legge sui propri server, quindi funziona su qualsiasi dispositivo, telefoni compresi.',
    openCta: 'Incolla un link ora',
    backCta: 'Torna a Live & Video Intelligence',
    groupsTitle: 'Piattaforme per tipo',
    groupsIntro:
      'I nomi delle piattaforme sono marchi dei rispettivi proprietari. ClawAI non è affiliata né approvata da loro.',
    groups: {
      [LiveMarketingPlatformGroup.GLOBAL_VIDEO]: {
        title: 'Video globali',
        body: 'I grandi siti video che le persone condividono ogni giorno, dai talk e dalle lezioni lunghe alle clip brevi e ai programmi audio.',
      },
      [LiveMarketingPlatformGroup.GAMING_STREAMING]: {
        title: 'Gaming e streaming',
        body: 'Gaming in diretta, esport e stream dei creator, con una scheda di chat dal vivo proprio accanto all’analisi.',
      },
      [LiveMarketingPlatformGroup.SOCIAL]: {
        title: 'Social',
        body: 'Reel, post, short e dirette dai social network e dai canali di messaggistica.',
      },
      [LiveMarketingPlatformGroup.ASIA]: {
        title: 'Asia',
        body: 'Piattaforme video e di dirette da Cina, Giappone, Corea e tutta l’Asia, leggibili in una qualsiasi delle 13 lingue dell’app.',
      },
    },
    liveTag: 'Diretta',
    videoTag: 'Video',
    supportTitle: 'Cosa funziona su ogni piattaforma',
    supportIntro: 'Le stesse tre cose funzionano ovunque ClawAI riesca a leggere la fonte.',
    support: [
      {
        title: 'Dirette',
        body: 'Sottotitoli circa 7-12 secondi dopo il parlato, un Feed intelligente di riassunti, momenti salienti e note visive, e una scheda di chat dal vivo dove la piattaforma ne ha una.',
      },
      {
        title: 'Video registrati',
        body: 'Reel, post, short e dirette passate fino a 3 ore. ClawAI riproduce il video dall’inizio a velocità normale e l’analisi lo segue.',
      },
      {
        title: 'Riassunto con un clic',
        body: 'Per un video registrato, clicca su «Riassumi video» e ottieni un riassunto generale, i momenti chiave con i timestamp, i momenti salienti e la trascrizione completa.',
      },
    ],
    limitsTitle: 'I limiti, detti onestamente',
    limits: [
      {
        title: 'Solo contenuti pubblici',
        body: 'Si possono leggere solo video e dirette pubblici. I contenuti privati o riservati agli iscritti non si possono leggere.',
      },
      {
        title: 'Una piattaforma può dire di no',
        body: 'Alcune piattaforme, o singoli video, possono rifiutare l’accesso da un server. Quando succede, ClawAI te lo dice chiaramente invece di mostrare un risultato falso.',
      },
      {
        title: 'Discord non è supportato',
        body: 'Gli stream di Discord non hanno link pubblici, quindi un server non ha nulla da aprire.',
      },
    ],
    faqTitle: 'Domande sulle piattaforme',
    faq: [
      {
        question: 'La mia piattaforma è supportata?',
        answer:
          'Se è in questa pagina, incolla il link e ClawAI lo verifica prima di avviare qualsiasi cosa. Se la piattaforma o il video rifiutano l’accesso dal server, lo vedi subito.',
      },
      {
        question: 'Funzionano sia le dirette sia i video registrati?',
        answer:
          'Sì, su ogni piattaforma elencata. Un video registrato fino a 3 ore si può anche riassumere con un clic.',
      },
      {
        question: 'Perché un video può non funzionare anche se la sua piattaforma è elencata?',
        answer:
          'Una piattaforma può impedire a un server di leggere un singolo video, anche se è pubblico. Quando succede, ClawAI te lo dice subito. I video e le dirette privati non si possono mai leggere.',
      },
      {
        question: 'Perché manca Discord?',
        answer:
          'Gli stream di Discord non hanno un link pubblico che un server possa aprire, quindi ClawAI non può leggerli.',
      },
    ],
    closingTitle: 'Hai trovato la tua piattaforma?',
    closingBody:
      'Incolla il link, scegli la lingua e inizia. Ogni piano include minuti gratuiti ogni mese.',
  },
};

/** Italian SEO copy for both pages; claims mirror the English file. */
export const IT_LIVE_INTELLIGENCE_MARKETING_SEO: LiveIntelligenceMarketingSeo = {
  overview: {
    title: 'Live & Video Intelligence: sottotitoli in diretta e riassunti video con un clic',
    description:
      'Incolla il link di una diretta o di un video da YouTube, Twitch, TikTok e oltre 50 piattaforme. Ottieni sottotitoli in diretta nella tua lingua, un Feed intelligente di riassunti e momenti salienti, o un riassunto video con timestamp in un clic. Su ogni dispositivo.',
    keywords: [
      'sottotitoli diretta streaming',
      'riassunto video YouTube',
      'riassumere video con IA',
      'sottotitoli tradotti in diretta',
      'momenti salienti live',
    ],
  },
  platforms: {
    title: 'Piattaforme supportate da Live & Video Intelligence',
    description:
      'Tutte le piattaforme che ClawAI sa leggere per sottotitoli in diretta e riassunti video: YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X, Bilibili, Niconico e altre, raggruppate per tipo.',
    keywords: [
      'piattaforme video supportate',
      'piattaforme per dirette streaming',
      'sottotitoli Twitch',
      'riassunto video piattaforme',
    ],
  },
};
