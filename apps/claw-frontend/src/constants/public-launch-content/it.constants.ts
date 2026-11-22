import type {
  PublicLaunchCorePageDictionary,
  PublicLaunchLabels,
  PublicLaunchLocalizedLabels,
} from '@/types/public-launch-content.types';

/** Le etichette della pagina (onThisPage, evidence, …) si trovano in public-commerce-policy-content. */
export const IT_PUBLIC_LAUNCH_LABELS: Omit<PublicLaunchLabels, keyof PublicLaunchLocalizedLabels> =
  {
    viewPricing: 'Vedi i prezzi',
    readSecurity: 'Leggi sicurezza e privacy',
    baselineCatalog: 'Catalogo di base degli abbonamenti',
    monthlyPrice: 'Mensile',
    yearlyPrice: 'Annuale',
    dailyAllowance: 'Quota ponderata giornaliera',
    monthlyAllowance: 'Quota ponderata mensile',
    liveCheckoutNote:
      'Questi sono i prezzi e le quote di base del repository. Il checkout live conferma il prezzo attivo prima del pagamento.',
    providerAvailabilityNote:
      'I modelli sono sincronizzati dai provider abilitati. Il catalogo esatto dipende dalle credenziali configurate, dalla disponibilità dei provider, dallo stato del ciclo di vita e dalla policy dell’amministratore.',
    routingRailTitle: 'Una richiesta, un percorso verificabile',
    routingRailSummary:
      'ClawAI valuta la richiesta e la policy corrente prima di scegliere un percorso di esecuzione disponibile.',
    routingRailAlternative:
      'Una richiesta viene valutata, instradata a un provider idoneo, facoltativamente confrontata e restituita con l’identità del modello e i dettagli di utilizzo.',
    evaluate: 'Valuta',
    evaluateDescription:
      'Legge l’attività, il contesto disponibile, la policy e l’idoneità attuale.',
    route: 'Instrada',
    routeDescription:
      'Sceglie un percorso di modello attivo tra i provider configurati dall’operatore.',
    compare: 'Confronta',
    compareDescription:
      'Usa l’orchestrazione di più modelli solo quando la modalità scelta e la quota lo consentono.',
    receipt: 'Restituisci',
    receiptDescription:
      'Trasmette la risposta con l’origine del modello visibile e le informazioni di utilizzo.',
  };

export const IT_PUBLIC_LAUNCH_PAGES: PublicLaunchCorePageDictionary = {
  about: {
    eyebrow: 'Informazioni su ClawAI',
    sections: [
      {
        id: 'purpose',
        title: 'Un piano di controllo pratico per il lavoro con l’IA',
        body: 'ClawAI riunisce conversazioni, instradamento dei modelli, file, memoria, ricerca, generazione e azioni dello spazio di lavoro in un’unica interfaccia coerente. Il prodotto è pensato per ridurre l’attrito operativo del passaggio tra provider, mantenendo visibili a chi lavora il modello scelto, l’utilizzo e il percorso di esecuzione.',
      },
      {
        id: 'principles',
        title: 'Costruito attorno a scelta, evidenza e controllo',
        body: 'La piattaforma non considera nessun modello il migliore in assoluto. Può instradare in base all’attività, lasciare che una persona scelga un modello, confrontare più risposte idonee o chiedere a un giudice indipendente di rivedere l’output. La disponibilità dipende sempre da connettori, credenziali, policy del piano e ciclo di vita dei modelli configurati nell’ambiente in esecuzione.',
      },
      {
        id: 'architecture',
        title: 'Operatività prima di tutto locale, accesso ai modelli cloud',
        body: 'Il repository contiene un’interfaccia Next.js e servizi distribuibili in modo indipendente, collegati da confini espliciti HTTP e di eventi. Gli operatori possono eseguire la piattaforma sulla propria infrastruttura, collegare i provider cloud supportati o definire una distribuzione di modelli locali il cui hardware e le cui integrazioni corrispondano ai requisiti dell’organizzazione.',
      },
      {
        id: 'trust',
        title: 'Fiducia fondata su fatti verificabili',
        body: 'Pubblichiamo architettura, basi dei prezzi, controlli di sicurezza, limiti e date di revisione, invece di sostituirli con badge non supportati o con false prove di clienti. Il repository del codice sorgente è disponibile per la revisione tecnica, mentre i cataloghi dei provider live e il checkout restano il riferimento per ciò che è disponibile in una specifica distribuzione.',
      },
    ],
    evidence:
      'ClawAI è un repository aperto con 18 servizi NestJS, un frontend Next.js, pacchetti condivisi, eventi RabbitMQ e un database per ogni servizio. Le affermazioni sul prodotto in questo sito si limitano al comportamento visibile in quel repository.',
  },
  pricing: {
    eyebrow: 'Basi di abbonamento chiare',
    sections: [
      {
        id: 'catalog',
        title: 'Sette punti di partenza, dal gratuito all’alto volume',
        body: 'Il catalogo di base comprende i piani Free, Starter, Plus, Pro, Team, Scale e Unlimited. I prezzi mensili vanno da zero a duecento dollari statunitensi, e i prezzi annuali corrispondono a dieci pagamenti mensili dove è disponibile la fatturazione annuale. Il servizio di checkout risolve sul server il prezzo attivo immutabile prima di creare un pagamento ospitato.',
      },
      {
        id: 'allowances',
        title: 'Le quote sono ponderate, non promesse di token grezzi',
        body: 'I valori giornalieri, settimanali e mensili pubblicati rappresentano unità normalizzate sul costo. Un modello più costoso consuma la quota in modo diverso da uno economico, il che permette a un unico saldo di coprire provider eterogenei. Il catalogo definisce inoltre, per ogni piano, i limiti di conversazioni, messaggi, concorrenza, spazi di lavoro, memoria e orchestrazione.',
      },
      {
        id: 'models',
        title: 'L’accesso ai modelli segue la distribuzione live',
        body: 'Per impostazione predefinita il repository espone i modelli attivi sincronizzati, a meno che un amministratore non crei restrizioni esplicite su provider o modelli. La policy di classi di costo precaricata non prova le regole di un database distribuito, quindi questa pagina non promette un modello specifico in un livello specifico. Verifica il catalogo live prima di scegliere un piano per un determinato modello.',
      },
      {
        id: 'payment',
        title: 'Checkout ospitato con prezzo stabilito dal server',
        body: 'Le integrazioni PayPal e Paymob usano un checkout ospitato, quindi i numeri di carta non passano attraverso l’applicazione ClawAI. I prezzi canonici dei piani sono memorizzati in dollari statunitensi; un gateway configurato può regolare in un’altra valuta supportata. Imposte, disponibilità geografica, rimborsi e prontezza del gateway dipendono dal servizio distribuito e dai termini applicabili.',
      },
    ],
    evidence:
      'I valori del catalogo sono una base versionata del repository, non una garanzia che un amministratore non abbia modificato la distribuzione attiva. Il checkout mostra e addebita il prezzo attivo lato server.',
  },
  'supported-models': {
    eyebrow: 'Modelli e provider',
    sections: [
      {
        id: 'cloud',
        title: 'Adattatori per provider cloud implementati',
        body: 'Il servizio connettori include adattatori operativi per OpenAI, Anthropic, Google Gemini, DeepSeek e xAI Grok. Ogni adattatore sincronizza il catalogo del provider quando sono presenti credenziali e configurazione valide. Nomi e disponibilità dei modelli possono cambiare a monte, quindi il catalogo live è la fonte affidabile per una distribuzione in esecuzione.',
      },
      {
        id: 'local',
        title: 'Esecuzione locale con Ollama e llama.cpp',
        body: 'Gli operatori possono configurare Ollama e llama.cpp per modelli eseguiti su un’infrastruttura controllata. Una modalità di instradamento solo locale mantiene la catena di ripiego sui provider locali. Adeguatezza dell’hardware, licenza dei modelli, limiti di contesto, qualità e throughput variano, perciò la scelta dei modelli per una distribuzione privata si definisce durante l’analisi tecnica e non viene promessa in generale.',
      },
      {
        id: 'selection',
        title: 'Selezione manuale e instradamento attento alla policy',
        body: 'Le persone possono scegliere direttamente un modello disponibile o lasciare che la logica di instradamento selezioni un percorso idoneo per l’attività. Il router considera capacità del modello, ciclo di vita, configurazione del connettore e policy. Le modalità multi-modello aggiungono schemi di confronto e revisione, ma la loro disponibilità e i loro limiti seguono la distribuzione attiva e non il testo promozionale.',
      },
      {
        id: 'availability',
        title: 'Perché questa pagina evita un elenco di versioni congelato',
        body: 'Un elenco statico di versioni di moda diventa rapidamente impreciso e può far pensare a credenziali non configurate. ClawAI distingue quindi le famiglie di provider implementate dall’effettiva disponibilità dei modelli. I modelli mostrati nel prodotto sono sincronizzati dai connettori abilitati e filtrati in base al ciclo di vita e a eventuali restrizioni dell’amministratore.',
      },
    ],
    evidence:
      'AWS Bedrock esiste nel repository come impalcatura di connettore, ma la sincronizzazione dei suoi modelli non è implementata, quindi volutamente non viene presentato qui come provider disponibile.',
  },
  'security-and-privacy': {
    eyebrow: 'Sicurezza e privacy',
    sections: [
      {
        id: 'credentials',
        title: 'Le credenziali dei connettori sono protette a riposo',
        body: 'Le chiavi API di provider e connettori sono cifrate con AES-256-GCM usando un vettore di inizializzazione casuale e un tag di autenticazione, quindi mascherate nelle risposte API. I token dei gateway di pagamento usano la cifratura autenticata con dati associati vincolati alla riga. Questi controlli supportano affermazioni precise sulla protezione delle credenziali, non un’affermazione generica su ogni byte memorizzato.',
      },
      {
        id: 'boundaries',
        title: 'Confini espliciti tra servizi e dati',
        body: 'ClawAI separa la titolarità dei servizi e impedisce a un servizio di accedere direttamente al database di un altro. Le richieste attraversano confini HTTP autenticati o eventi RabbitMQ, mentre validazione, autorizzazione, limiti di frequenza, header di sicurezza e registri di audit sono applicati a livelli definiti. La configurazione della distribuzione resta parte del perimetro di sicurezza.',
      },
      {
        id: 'retention',
        title: 'La conservazione varia in base al tipo di dato',
        body: 'I file scadono per impostazione predefinita dopo trenta giorni, a meno che un operatore non configuri una conservazione indefinita. I log di client e server usano indici di scadenza nel database di trenta giorni, mentre i registri di audit e i libri mastri di utilizzo non hanno scadenza automatica negli schemi attuali. Le persone possono eliminare conversazioni, memorie, pacchetti di contesto e file; l’eliminazione dell’account non è attualmente in autoservizio.',
      },
      {
        id: 'processing',
        title: 'L’elaborazione presso il provider è una scelta della distribuzione',
        body: 'I prompt e gli allegati inviati a un modello cloud sono elaborati dal provider configurato secondo i suoi termini. L’instradamento solo locale può mantenere l’esecuzione del modello sui percorsi Ollama locali, ma altri servizi abilitati possono comunque coinvolgere responsabili del trattamento esterni. Certificazioni, residenza dei dati, conformità normativa e garanzie universali di cancellazione richiedono prove separate e non sono dichiarate qui.',
      },
    ],
    evidence:
      'Le dichiarazioni di sicurezza descrivono controlli presenti nel repository. Non sono una certificazione, un rapporto di penetration test, un accordo sul trattamento dei dati né una garanzia sulla configurazione finale di un operatore.',
  },
  /* Owner legal review pending (2026-11-23) */
  privacy: {
    eyebrow: 'Informativa sulla privacy',
    sections: [
      {
        id: 'data',
        title: 'Dati trattati dall’applicazione',
        body: 'ClawAI tratta i dati dell’account, le conversazioni, i prompt, le risposte generate, le informazioni sul modello selezionato, i file caricati, le memorie, i pacchetti di contesto, i registri di utilizzo, gli eventi di audit, i messaggi di assistenza e i riferimenti di fatturazione necessari per fornire il servizio. I connettori dello spazio di lavoro possono trattare contenuti e identificativi dei servizi che un utente autorizzato sceglie di collegare.',
      },
      {
        id: 'use',
        title: 'Come i dati supportano il funzionamento del prodotto',
        body: 'L’applicazione usa questi dati per autenticare gli utenti, eseguire le azioni di IA e dello spazio di lavoro richieste, mantenere il contesto, applicare l’accesso e le quote configurati, diagnosticare i guasti, proteggere la piattaforma, elaborare il checkout ospitato e rispondere alle richieste di assistenza. I provider esterni ricevono solo le informazioni necessarie per l’operazione configurata, nel rispetto dei propri termini.',
      },
      {
        id: 'storage',
        title: 'Controlli su archiviazione, conservazione ed eliminazione',
        body: 'I token di autenticazione sono attualmente memorizzati nello storage locale del browser, insieme a preferenze come tema e lingua; lì può trovarsi anche un indirizzo e-mail ricordato facoltativamente. I file e i log operativi seguono i valori predefiniti del repository descritti nella pagina sulla sicurezza. Gli utenti possono eliminare diversi tipi di contenuto, ma l’eliminazione completa dell’account richiede attualmente di contattare l’operatore.',
      },
      {
        id: 'choices',
        title: 'Scelte e domande',
        body: 'Gli utenti possono evitare i connettori facoltativi, rimuovere conversazioni, file, memorie e pacchetti di contesto, svuotare lo storage locale del browser e scegliere l’instradamento su modelli locali quando la distribuzione lo prevede. Le richieste riguardanti un account, le pratiche dell’operatore, l’accesso, la rettifica o la cancellazione vanno inviate tramite la pagina dei contatti, in modo che l’operatore responsabile possa verificarle e rispondere.',
      },
    ],
    evidence:
      'Questa informativa non afferma volutamente che i dati non vengano mai venduti, mai usati per l’addestramento o sempre cancellati secondo una tempistica universale, perché tali impegni operativi e dei provider non sono stabiliti dal solo codice del repository.',
  },
  /* Owner legal review pending (2026-11-23) */
  terms: {
    eyebrow: 'Termini di utilizzo',
    sections: [
      {
        id: 'service',
        title: 'Utilizzo del servizio',
        body: 'I presenti termini disciplinano l’accesso all’applicazione ClawAI e alle sue funzioni ospitate o autogestite. Gli utenti devono fornire dati di account accurati, proteggere le proprie credenziali, rispettare la legge applicabile e usare solo dati, sistemi e integrazioni a cui sono autorizzati ad accedere. Per una distribuzione privata definita separatamente possono applicarsi termini commerciali aggiuntivi.',
      },
      {
        id: 'availability',
        title: 'Modelli, integrazioni e output generato',
        body: 'La disponibilità di modelli e provider può cambiare con la configurazione, le credenziali, i servizi a monte, lo stato del ciclo di vita e la policy dell’amministratore. L’output generato può essere incompleto, impreciso, non sicuro o inadatto a uno scopo particolare e deve essere verificato prima di un uso rilevante. ClawAI non sostituisce il giudizio professionale legale, medico, finanziario o di sicurezza.',
      },
      {
        id: 'billing',
        title: 'Piani e pagamento',
        body: 'Gli abbonamenti a pagamento usano il prezzo attivo e l’intervallo di fatturazione mostrati nel checkout ospitato con prezzo stabilito dal server. I valori di base del catalogo sul sito di marketing possono differire dall’attuale distribuzione di un amministratore. Disponibilità del gateway, valuta di regolamento, imposte, tempi di disdetta, rimborsi e altri diritti di pagamento seguono l’informativa del checkout e la legge applicabile.',
      },
      {
        id: 'changes',
        title: 'Modifiche, sospensione e contatti',
        body: 'L’operatore può modificare funzioni, limiti, integrazioni o questi termini per mantenere, proteggere o migliorare il servizio. L’accesso può essere limitato per rischio di sicurezza, mancato pagamento, condotta illecita o violazione sostanziale. I termini aggiornati dovrebbero riportare una nuova data di entrata in vigore, e domande o controversie dovrebbero essere sottoposte tramite la pagina dei contatti per essere esaminate.',
      },
    ],
    evidence:
      'Questi termini del prodotto sono una base fattuale di lancio e non una consulenza legale specifica per una giurisdizione. L’operatore responsabile dovrebbe rivolgersi a un legale prima di farvi affidamento per un servizio commerciale in produzione.',
  },
  /* Owner legal review pending (2026-11-23) */
  cookies: {
    eyebrow: 'Cookie e storage del browser',
    sections: [
      {
        id: 'cookie',
        title: 'Il cookie indicatore di autenticazione',
        body: 'Dopo l’accesso, il frontend imposta un breve cookie indicatore che segnala al middleware di instradamento che potrebbe esistere una sessione autenticata. L’indicatore non è la credenziale di accesso, è leggibile dal client e usa SameSite Lax. I token di accesso e di aggiornamento sono attualmente memorizzati separatamente nello storage locale del browser e non in un cookie di autenticazione HttpOnly.',
      },
      {
        id: 'local-storage',
        title: 'Storage locale usato dall’interfaccia',
        body: 'Il browser può memorizzare lo stato di autenticazione, il tema, la lingua, le preferenze di visualizzazione dei modelli, informazioni transitorie del campo di composizione e un indirizzo e-mail solo quando l’utente sceglie l’opzione per ricordare l’e-mail. Cancellare i dati del sito rimuove questi valori locali e può disconnettere l’utente o reimpostare le preferenze, senza eliminare i contenuti dell’account sul server.',
      },
      {
        id: 'advertising',
        title: 'Tecnologia pubblicitaria facoltativa',
        body: 'Il layout di marketing contiene un’integrazione Google AdSense attivabile tramite configurazione. Il repository attuale non offre una piattaforma completa di gestione del consenso, perciò gli operatori non devono abilitare l’archiviazione pubblicitaria facoltativa dove il consenso è richiesto per legge finché non avranno implementato e verificato un flusso di consenso e una policy regionale adeguati.',
      },
      {
        id: 'control',
        title: 'Controlli del browser e aggiornamenti',
        body: 'Gli utenti possono ispezionare, bloccare o cancellare cookie e storage locale tramite il browser, anche se bloccare lo storage necessario può impedire l’autenticazione o la persistenza delle preferenze. Gli operatori dovrebbero aggiornare questa informativa quando cambiano le chiavi di storage, l’analisi, la pubblicità, il pagamento o i servizi incorporati e allineare la data di entrata in vigore al comportamento distribuito.',
      },
    ],
    evidence:
      'Questa informativa descrive lo storage visibile oggi nel repository. Un operatore che distribuisce il servizio resta responsabile di verificare script, proxy, strumenti di analisi e comportamenti del gateway aggiuntivi introdotti tramite configurazione.',
  },
  /* Owner legal review pending (2026-11-23) */
  'acceptable-use': {
    eyebrow: 'Uso accettabile',
    sections: [
      {
        id: 'authorised',
        title: 'Usa solo sistemi e dati che sei autorizzato a usare',
        body: 'Non usare ClawAI per accedere ad account, repository, file, reti, dispositivi o servizi di terzi senza un chiaro permesso. Le azioni dello spazio di lavoro e le capacità dell’agente devono restare entro l’autorità concessa dal rispettivo titolare. Non aggirare approvazioni, controlli di accesso, limiti di frequenza, confini di sicurezza o policy dell’amministratore.',
      },
      {
        id: 'harm',
        title: 'Non favorire danni o condotte illecite',
        body: 'Non usare il servizio per creare o distribuire malware, furto di credenziali, istruzioni distruttive, molestie mirate, sfruttamento sessuale, sorveglianza illecita, sostituzione di persona ingannevole o materiale che violi la legge applicabile o i diritti di altri. Le decisioni ad alto impatto richiedono la revisione di persone qualificate e adeguate salvaguardie.',
      },
      {
        id: 'platform',
        title: 'Proteggi l’affidabilità e l’integrità del servizio',
        body: 'Non sondare, sovraccaricare, estrarre in massa, decompilare né interferire con una distribuzione, se non nell’ambito di un accordo autorizzato di test di sicurezza. Non automatizzare la creazione di account, non eludere le quote, non occultare un’origine abusiva, non manipolare la fatturazione e non usare contenuti generati per falsare la provenienza. Segnala le presunte vulnerabilità tramite il canale di contatto.',
      },
      {
        id: 'enforcement',
        title: 'Revisione e applicazione',
        body: 'L’operatore può indagare su segnalazioni credibili, conservare le prove di audit pertinenti, limitare una funzione, sospendere un account o bloccare l’accesso quando ragionevolmente necessario per proteggere utenti, provider, infrastruttura o obblighi di legge. Contesto, intenzione, gravità, recidiva e rimedi disponibili dovrebbero orientare ogni decisione di applicazione.',
      },
    ],
    evidence:
      'I controlli sull’uso accettabile integrano l’autorizzazione tecnica e le policy dei provider; non le sostituiscono. Le distribuzioni private dovrebbero adattare le procedure di applicazione e di segnalazione alla propria organizzazione e giurisdizione.',
  },
};
