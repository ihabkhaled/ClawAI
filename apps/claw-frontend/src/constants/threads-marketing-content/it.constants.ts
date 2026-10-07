import type { ThreadsMarketingDictionary } from '@/types/threads-marketing-content.types';

export const IT_THREADS_MARKETING_CONTENT: ThreadsMarketingDictionary = {
  eyebrow: 'Novità in ClawAI',
  title: 'ClawAI Threads: trasforma una chat in un articolo pubblico, documentato e con fonti',
  intro:
    'Una buona conversazione con un’IA spesso finisce con qualcosa che vale la pena condividere. Threads prende la chat che hai già fatto, ricerca l’argomento sul web in tempo reale, lascia che più modelli diversi lo scrivano in modo indipendente, li obbliga ad accordarsi su una sola bozza, la fa esaminare da un giudice e da un critico e te la restituisce. Leggi ogni parola e la approvi. Solo allora diventa una pagina pubblica con fonti reali.',
  announcementBadge: 'Annuncio',
  announcementTitle: 'Threads è qui, ed è aperto a ogni piano',
  announcementBody:
    'Free, Starter, Plus e tutti i piani superiori possono creare Threads, come anche gli amministratori. Parti da qualsiasi chat con «Trasforma in Thread pubblico» o dalla pagina Threads. Pubblicare è sempre una tua decisione: nulla esce dal tuo account finché non approvi la bozza finale.',
  createCta: 'Crea un Thread',
  discoverCta: 'Leggi i Threads pubblicati',
  howItWorksCta: 'Vedi i sei passaggi',
  whatTitle: 'Che cos’è un Thread',
  whatParagraphs: [
    'Un Thread è un articolo pubblico costruito a partire da una delle tue chat. Non è una copia della conversazione e non mostra mai la chat. È un testo nuovo sull’argomento, basato su fonti che ClawAI ha cercato apposta e scritto da più modelli invece che da uno solo.',
    'Usare più modelli conta. Ogni autore scrive la propria bozza senza vedere le altre. Poi gli autori devono accordarsi su una sola bozza, parola per parola. Un modello giudice valuta il risultato secondo criteri espliciti e un modello critico annota ciò che resta debole. Se uno dei due dice no, la bozza torna per un altro giro, fino a tre.',
    'Il controllo resta tuo per tutto il tempo. Scegli i modelli, imposti un limite di spesa, puoi annullare mentre gira e vedi la bozza finita con le sue fonti prima che qualcosa diventi pubblico. Dopo la pubblicazione puoi ritirarla quando vuoi e la pagina sparisce da ricerca, sitemap e feed.',
  ],
  stepsTitle: 'Come funziona, in sei passaggi',
  stepsIntro:
    'Lo stesso flusso funziona da una chat o dalla pagina Threads. Ogni passaggio è qualcosa che fai tu o qualcosa che ClawAI fa per te.',
  steps: [
    {
      title: 'Scegli la chat',
      body: 'Apri la chat da condividere e scegli «Trasforma in Thread pubblico» dal menu della chat. Dalla pagina Threads scegli tu la chat di origine. La conversazione viene congelata in un’istantanea, quindi le modifiche successive alla chat non cambiano ciò da cui è nato il Thread.',
    },
    {
      title: 'Indica l’argomento e dai il consenso',
      body: 'Scrivi l’argomento in una o due frasi, scegli il tipo (articolo, articolo di ricerca, guida o spiegazione tecnica) e la lingua, e spunta la casella che conferma che sai che il risultato sarà pubblico. Senza questo consenso il pulsante di avvio resta disattivato.',
    },
    {
      title: 'Scegli i modelli',
      body: 'Scegli da tre a cinque autori, un giudice e un critico con lo stesso selettore di modelli della chat: raggruppato per fornitore, ricercabile, con badge per le capacità e per i modelli che usano credito dei connettori. Fornitori diversi danno bozze davvero diverse.',
    },
    {
      title: 'Imposta il limite di spesa e avvia',
      body: 'Imposta il massimo che questo Thread può spendere. Ogni chiamata a un modello viene controllata rispetto al limite prima di partire e il lavoro si ferma invece di superarlo. Puoi seguire le fasi in diretta e annullare in qualsiasi momento.',
    },
    {
      title: 'Ricerca, scrittura, accordo, giudizio',
      body: 'ClawAI ricerca l’argomento sul web in tempo reale e conserva le prove. Gli autori scrivono a partire da quelle prove, si accordano su una bozza e giudice e critico la esaminano. Una bozza che non passa viene rivista ed esaminata di nuovo, fino a tre giri. Se ancora fallisce, ti viene detto perché e non viene pubblicato nulla.',
    },
    {
      title: 'Rivedi, approva e pubblica',
      body: 'Leggi la bozza con le sue fonti, chiedi modifiche o modificala, e approvala quando sei soddisfatto. Solo una bozza approvata diventa una pagina pubblica, con dati strutturati, elenco delle fonti, contatore dei lettori e spazio per commenti e reazioni. Puoi esportarla e ritirarla quando vuoi.',
    },
  ],
  trustTitle: 'Tutele integrate, non solo promesse',
  trustIntro:
    'Pubblicare qualcosa con il tuo account merita più cura di una risposta in chat. Questi controlli girano su ogni Thread.',
  trust: [
    {
      title: 'Niente è pubblico senza la tua approvazione',
      body: 'Un buon punteggio di giudice e critico rende solo la bozza idonea alla tua revisione. Non pubblica mai nulla da sola.',
    },
    {
      title: 'Solo fonti reali',
      body: 'Le citazioni devono provenire dalle prove raccolte dalla fase di ricerca. Una bozza che cita un indirizzo mai trovato dalla ricerca viene respinta.',
    },
    {
      title: 'Due revisori indipendenti',
      body: 'Il giudice deve dare alla bozza almeno 80 su 100 e il critico almeno 75. Sono modelli scelti da te, quindi puoi scegliere revisori di un fornitore diverso dagli autori.',
    },
    {
      title: 'Un limite di spesa rigido',
      body: 'Ogni chiamata a un modello riserva prima il proprio costo rispetto al limite. Le prenotazioni non usate vengono rilasciate e un lavoro fallito o annullato restituisce il suo credito.',
    },
    {
      title: 'La tua conversazione resta tua',
      body: 'La pagina pubblica contiene l’articolo, non la chat. La chat è solo il punto di partenza e viene letta da un’istantanea fissa.',
    },
    {
      title: 'Sicurezza e privacy dei lettori',
      body: 'I lettori possono commentare, reagire, suggerire modifiche e segnalare una pagina. I contatori di visualizzazioni ignorano i crawler e salvano solo hash anonimi con chiave, mai un indirizzo o un account.',
    },
  ],
  outputsTitle: 'Che cosa ottieni',
  outputs: [
    {
      title: 'Una pagina di articolo pubblica',
      body: 'Una pagina pulita con l’articolo, le fonti numerate e dati strutturati perché i motori di ricerca lo capiscano, nella lingua che hai scelto.',
    },
    {
      title: 'Scoperta e feed',
      body: 'I Threads pubblicati compaiono nell’hub Threads, nella sitemap e nei feed RSS, e ne escono non appena li ritiri.',
    },
    {
      title: 'Esportazioni',
      body: 'Scarica un Thread in JSON, Markdown o TOON, il formato compatto e poco costoso da passare a un altro modello.',
    },
    {
      title: 'Una community di lettori',
      body: 'I lettori con account possono commentare, reagire e suggerire modifiche che accetti o rifiuti. Un contatore di visualizzazioni mostra la portata senza tracciare nessuno.',
    },
  ],
  useCasesTitle: 'Che cosa trasformano le persone in Threads',
  useCases: [
    {
      title: 'Una chat di ricerca in una spiegazione',
      body: 'Hai passato un’ora a capire un argomento con l’IA. Trasformala nell’articolo che avresti voluto trovare all’inizio.',
    },
    {
      title: 'Una soluzione in una guida',
      body: 'Hai risolto qualcosa di difficile in una chat? Pubblica i passaggi che funzionano come guida, con le fonti che li sostengono.',
    },
    {
      title: 'Una domanda tecnica in un approfondimento',
      body: 'Chiedi a più modelli, lascia che si accordino e pubblica il risultato come spiegazione tecnica rivista due volte.',
    },
    {
      title: 'Un confronto in un post',
      body: 'Hai usato Compare per vedere come rispondono i modelli? Pubblica ciò che hai imparato, con la ricerca che lo sostiene.',
    },
  ],
  plansTitle: 'Piani e costo',
  plansBody:
    'Threads è aperto a ogni piano. Free include un Thread, Starter due al mese e Plus dieci al mese, e i piani superiori ne includono di più. Creare un Thread usa la stessa quota e le stesse regole di credito del resto di ClawAI, e il tuo limite di spesa è il massimo che può costare. Leggere, commentare e reagire è gratuito per ogni account connesso.',
  faqTitle: 'Domande frequenti',
  faq: [
    {
      question: 'La mia chat diventa pubblica?',
      answer:
        'No. È pubblico solo l’articolo che approvi. La chat serve da punto di partenza e non viene mai mostrata nella pagina.',
    },
    {
      question: 'Un Thread può essere pubblicato senza di me?',
      answer:
        'No. Ogni Thread attende la tua approvazione, qualunque sia il punteggio di giudice e critico. Puoi anche ritirarlo in qualsiasi momento.',
    },
    {
      question: 'Quali modelli scrivono un Thread?',
      answer:
        'Quelli che scegli tu: da tre a cinque autori, un giudice e un critico, con lo stesso selettore della chat. Fornitori diversi danno bozze più varie e una revisione indipendente.',
    },
    {
      question: 'Che cosa succede se giudice o critico respingono la bozza?',
      answer:
        'La bozza viene rivista ed esaminata di nuovo, fino a tre giri. Se ancora non passa, il lavoro termina con un motivo chiaro, il credito non usato viene rilasciato e non viene pubblicato nulla.',
    },
    {
      question: 'Come so che le fonti sono reali?',
      answer:
        'Le citazioni devono provenire dalle prove raccolte dalla ricerca e una bozza che cita altro viene respinta. Vedi l’elenco numerato delle fonti prima di approvare.',
    },
    {
      question: 'Quanto costa un Thread?',
      answer:
        'Imposti un limite di spesa prima di iniziare e il lavoro non può superarlo. I modelli inclusi nel tuo piano non usano credito; quelli a credito dei connettori attingono al tuo credito o alla quota gratuita, e un lavoro fallito o annullato restituisce la prenotazione.',
    },
    {
      question: 'Posso modificare un Thread dopo la pubblicazione?',
      answer:
        'Sì. Una modifica viene riesaminata prima di sostituire la versione pubblica, e i lettori possono suggerire cambiamenti che accetti o rifiuti.',
    },
    {
      question: 'Quali lingue sono supportate?',
      answer:
        'I Threads possono essere scritti in una qualsiasi delle 13 lingue supportate da ClawAI, e la pagina pubblica usa la lingua che scegli.',
    },
  ],
  closingTitle: 'Trasforma la tua prossima buona chat in qualcosa che vale la pena condividere',
  closingBody:
    'Apri una chat qualsiasi, scegli «Trasforma in Thread pubblico» e guarda cosa torna indietro. Pubblichi solo ciò che approvi.',
};
