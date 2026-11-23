import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/** Italian copy for the public Live Intelligence page. Same claims as the English source. */
export const IT_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Novità in ClawAI',
  title: 'Live Intelligence: sottotitoli, riassunti e momenti salienti di una diretta',
  intro:
    'Incolla il link di una diretta e guardala dentro ClawAI. Mentre scorre, ClawAI trasforma il parlato in sottotitoli nella lingua che scegli, tiene aggiornate brevi schede di riepilogo quando cambia l’argomento e segna i momenti importanti su una linea del tempo. Chiudi la finestra e ciò che hai guardato resta nella tua cronologia, pronto da potenziare ed esportare.',
  openCta: 'Apri Live Intelligence',
  pricingCta: 'Vedi piani e prezzi',
  howItWorksCta: 'Scopri come funziona',
  whatTitle: 'Che cos’è Live Intelligence',
  whatParagraphs: [
    'Una diretta è difficile da seguire quando è lunga, veloce o in una lingua che non parli. Live Intelligence sta accanto al video e prende appunti: sottotitoli tradotti nella tua lingua, un riepilogo continuo e un elenco di momenti salienti, così puoi distogliere lo sguardo senza perdere il filo.',
    'Tutto avviene in una finestra dentro ClawAI: diretta e analisi sono sullo stesso schermo. Prima di iniziare scegli la lingua dei sottotitoli e una modalità di analisi, e puoi mettere in pausa, riprendere e spostarti dove la diretta lo permette. In pausa il flusso si congela e la fatturazione si ferma.',
    'Molte persone possono guardare la stessa diretta senza pagare più volte lo stesso lavoro. Quando ClawAI analizza una diretta sui propri server, come un canale Twitch in diretta o un link HLS, la elabora una sola volta e condivide l’analisi con tutti gli spettatori. L’analisi che hai davvero guardato viene salvata nella tua cronologia e resta finché non la elimini.',
  ],
  stepsTitle: 'Come funziona, in cinque passaggi',
  stepsIntro:
    'Dal link incollato al riepilogo esportato. Ogni passaggio è qualcosa che fai tu o che ClawAI fa per te.',
  steps: [
    {
      title: 'Incolla il link',
      body: 'Apri Live Intelligence e incolla l’indirizzo di una diretta. ClawAI verifica che la fonte sia supportata prima di analizzare o addebitare qualsiasi cosa e ti dice chiaramente se non lo è.',
    },
    {
      title: 'Scegli lingua e modalità',
      body: 'Scegli la lingua di sottotitoli e riassunti e una delle tre modalità: Audio, Audio + Visione o Smart Auto. Per un link HLS confermi di avere il diritto di analizzarlo; per YouTube, Kick o Facebook accetti che ClawAI ascolti tramite il tuo dispositivo.',
    },
    {
      title: 'Guarda con sottotitoli, schede e momenti salienti',
      body: 'I sottotitoli compaiono pochi secondi dopo il parlato, con circa 7-12 secondi di ritardo. Le schede di riepilogo cambiano con gli argomenti e i momenti salienti rilevati sono posti su una linea del tempo cliccabile.',
    },
    {
      title: 'Pausa, ripresa e spostamento',
      body: 'Metti in pausa per congelare il flusso e fermare il contatore. Riprendi da dove eri o torna alla diretta, con il divario mostrato chiaramente. Lo spostamento funziona dove lo consente la diretta stessa.',
    },
    {
      title: 'Chiudi, torna, potenzia, esporta',
      body: 'Chiudendo la finestra, ciò che hai guardato resta nella cronologia. Più tardi puoi potenziare qualsiasi scheda con un modello a tua scelta ed esportare la cronologia in PDF, Markdown o TXT.',
    },
  ],
  featuresTitle: 'Cosa ottieni',
  features: [
    {
      title: 'Sottotitoli in diretta nella tua lingua',
      body: 'Il parlato viene trascritto e tradotto nella lingua scelta. I sottotitoli arrivano qualche secondo dopo chi parla: non è istantaneo, e l’interfaccia lo dice.',
    },
    {
      title: 'Schede di riepilogo che stanno al passo',
      body: 'Brevi schede riassumono la diretta e si aggiornano quando cambia l’argomento, così l’ultima ti dice a che punto è la diretta.',
    },
    {
      title: 'Momenti salienti automatici su una linea del tempo',
      body: 'I momenti da rivedere vengono rilevati e segnati sulla linea del tempo. Clicca per andarci, dove la diretta permette lo spostamento.',
    },
    {
      title: 'Pausa, ripresa e spostamento',
      body: 'Controlla la riproduzione come una registrazione quando la fonte lo consente. In pausa il flusso è congelato e non si addebita nulla.',
    },
    {
      title: 'Una cronologia sotto il tuo controllo',
      body: 'L’analisi che hai guardato resta in una cronologia paginata finché non la elimini. Eliminarla la rimuove.',
    },
    {
      title: 'Potenzia una scheda con un modello a tua scelta',
      body: 'Scegli un modello disponibile per riscrivere o approfondire una scheda. Il potenziamento è addebitato al costo reale del modello scelto.',
    },
    {
      title: 'Esporta in PDF, Markdown o TXT',
      body: 'Porta la cronologia fuori da ClawAI nel formato più adatto a ciò che viene dopo.',
    },
    {
      title: 'Elaborazione condivisa',
      body: 'Molti spettatori, una sola analisi. Un canale Twitch in diretta o uno stream HLS viene elaborato una volta sui server di ClawAI e condiviso con chiunque lo guardi, su qualsiasi dispositivo, telefono compreso. L’analisi ricavata dall’audio del tuo dispositivo resta privata.',
    },
  ],
  modesTitle: 'Tre modalità di analisi',
  modesIntro:
    'La modalità decide che cosa osserva ClawAI. La scegli prima di iniziare e il costo segue la scelta.',
  modes: [
    {
      title: 'Audio',
      body: 'Sottotitoli, riassunti e momenti salienti da ciò che viene detto. La modalità più semplice, adatta a interventi, briefing, lezioni e interviste.',
    },
    {
      title: 'Audio + Visione',
      body: 'Aggiunge ciò che appare sullo schermo, come diapositive, grafici o una demo. ClawAI campiona i fotogrammi della diretta e tiene quelli cambiati. La visione è fatturata al costo reale del modello usato.',
    },
    {
      title: 'Smart Auto',
      body: 'Parte dall’audio e aggiunge la visione solo quando la diretta tace o l’immagine cambia, così paghi la visione quando è probabile che conti.',
    },
  ],
  sourcesTitle: 'Che cosa può e non può analizzare',
  sourcesIntro: 'Preferiamo dirti i limiti adesso piuttosto che farteli scoprire a metà diretta.',
  sources: [
    {
      title: '15 piattaforme, più i link HLS',
      body: 'ClawAI riconosce 15 piattaforme di dirette. Un canale Twitch in diretta viene analizzato sui server di ClawAI, senza dover condividere nulla e su qualsiasi dispositivo; se il canale è offline si usa l’audio del tuo dispositivo. TikTok LIVE, Instagram Live, Rumble, BIGO LIVE, LinkedIn Live, Telegram, Bilibili, CHZZK, SOOP e Nimo TV si aprono sulla piattaforma stessa («Guarda su …»), senza IA. Discord Go Live non è supportato perché non ha un link pubblico. I link HLS che hai il diritto di analizzare funzionano ancora; lo confermi all’avvio.',
    },
    {
      title: 'YouTube, Kick e Facebook: IA dal tuo dispositivo',
      body: 'Si guardano nel loro player ufficiale e, dopo il tuo consenso, l’IA ascolta l’audio del tuo dispositivo. Sul computer condividi l’audio della scheda in Chrome o Edge («Analizza con il mio browser»); sul telefono il microfono sente la diretta dall’altoparlante («Analizza con il microfono»). Viene inviato solo l’audio, per la trascrizione, quindi si usa la modalità Audio. La chat dal vivo compare per i video YouTube, Twitch e Kick; le altre piattaforme hanno un link «Apri la chat».',
    },
    {
      title: 'I sottotitoli arrivano con qualche secondo di ritardo',
      body: 'Il parlato viene trascritto in brevi blocchi, quindi i sottotitoli arrivano circa 7-12 secondi dopo. Non è sottotitolazione in tempo reale.',
    },
    {
      title: 'Stati onesti, mai un falso successo',
      body: 'La finestra mostra quando si sta connettendo, è in ritardo, si sta riprendendo, ha finito i minuti gratuiti, attende la tua approvazione, è al limite di capacità o la diretta è terminata.',
    },
  ],
  plansTitle: 'Minuti gratuiti e prezzi',
  plansIntro:
    'Ogni piano include minuti di analisi gratuiti ogni mese. Sono i valori predefiniti e possono essere modificati.',
  planMinutesUnit: 'minuti gratuiti al mese',
  planProAndAbove: 'Pro e superiori',
  plansBody:
    'Dopo i minuti gratuiti l’analisi costa {price} al minuto, e solo dopo la tua conferma. Puoi impostare un tetto di spesa. Quando il credito finisce hai un solo periodo di tolleranza di 60 secondi. La visione è fatturata al costo reale del modello usato e la pausa ferma il contatore.',
  faqTitle: 'Domande frequenti',
  faq: [
    {
      question: 'Live Intelligence funziona con le dirette YouTube?',
      answer:
        'Sì. Una diretta YouTube si guarda nel suo player ufficiale e l’IA lavora sull’audio del tuo dispositivo dopo il tuo consenso: sul computer condividi l’audio della scheda in Chrome o Edge, sul telefono il microfono sente la diretta dall’altoparlante. Viene inviato solo l’audio, per la trascrizione, e i sottotitoli arrivano comunque qualche secondo dopo il parlato.',
    },
    {
      question: 'Quali dirette può analizzare?',
      answer:
        'Canali Twitch in diretta, analizzati sui server di ClawAI su qualsiasi dispositivo; YouTube, Kick e Facebook, dall’audio del tuo dispositivo; e dirette HLS che hai il diritto di analizzare, cosa che confermi all’avvio. Altre dieci piattaforme si aprono sulla piattaforma stessa, senza IA. Una diretta che il servizio non riesce a leggere viene segnalata come non supportata, senza fallire in silenzio.',
    },
    {
      question: 'I sottotitoli sono in tempo reale?',
      answer:
        'No. Arrivano circa 7-12 secondi dopo il parlato, perché l’audio è trascritto in brevi blocchi. Riassunti e momenti salienti seguono i sottotitoli.',
    },
    {
      question: 'Quanto costa?',
      answer:
        'Ogni piano include minuti gratuiti ogni mese: 30 per Free, 120 per Starter, 300 per Plus e 600 per Pro e superiori. Poi 0,02 $ al minuto, solo dopo la tua conferma e con un tetto di spesa facoltativo. La visione è fatturata al costo reale del modello.',
    },
    {
      question: 'Cosa succede se il credito finisce a metà diretta?',
      answer:
        'Hai un solo periodo di tolleranza di 60 secondi, poi l’analisi si ferma finché non aggiungi credito.',
    },
    {
      question: 'La pausa costa qualcosa?',
      answer:
        'No. In pausa il flusso si congela e la fatturazione si ferma. Riprendi da dove eri o torna alla diretta.',
    },
    {
      question: 'Che fine fa la mia cronologia?',
      answer:
        'L’analisi che hai davvero guardato resta finché non la elimini. Puoi sfogliarla, potenziare una scheda con un modello a tua scelta ed esportarla in PDF, Markdown o TXT.',
    },
    {
      question: 'Posso fare domande alla diretta?',
      answer:
        'Non in questa prima versione. Live Intelligence offre sottotitoli, schede di riepilogo e momenti salienti; le domande su una diretta non sono ancora incluse.',
    },
  ],
  closingTitle: 'Segui la prossima diretta senza guardare ogni minuto',
  closingBody:
    'Incolla un link di Twitch, YouTube, Kick o Facebook, oppure un link HLS che hai il diritto di analizzare, scegli la lingua e inizia. I tuoi minuti gratuiti ti aspettano.',
};
