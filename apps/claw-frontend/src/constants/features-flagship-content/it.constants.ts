import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesFlagshipDictionary } from '@/types/features-cluster.types';

export const IT_FEATURES_FLAGSHIP_CONTENT: FeaturesFlagshipDictionary = {
  capabilitiesIntro:
    'Le sezioni sopra sono la versione breve. Ognuna delle funzionalità qui sotto ha una pagina completa: cosa fa davvero, come viene abilitata o misurata, e quali limiti si applicano, verificati sul prodotto rilasciato.',
  cardSummaries: {
    [FeatureCapability.MULTIMODAL_AI]:
      'Note vocali e video, un assistente che descrive le immagini ai modelli che non vedono, e un instradamento che sceglie un modello capace di gestire l’allegato.',
    [FeatureCapability.FILES_FROM_CHAT]:
      'Chiedi un PDF, un foglio di calcolo o una presentazione a parole tue e ricevi un file vero, con il nome dato dal modello che l’ha scritto.',
    [FeatureCapability.SMART_ATTACHMENTS]:
      'Trascina in chat documenti, codice, file multimediali o interi archivi; ogni caricamento viene analizzato dall’antivirus e il suo testo estratto per il modello.',
    [FeatureCapability.NARRATED_RESEARCH]:
      'Un ciclo di ricerca che decide se cercare o esplorare un sito, racconta ogni passaggio mentre lavora e rispetta robots.txt a ogni recupero.',
    [FeatureCapability.ORCHESTRATION_LABS]:
      'Laboratori dedicati che mettono più modelli sullo stesso problema: confronto con un giudice, consenso, escalation, verifica e altro ancora.',
    [FeatureCapability.CONVERSATION_TOOLS]:
      'Dirama una conversazione, modifica e riesegui un messaggio, cerca tra le tue chat, esporta una risposta e lascia che una chat attinga da un’altra.',
    [FeatureCapability.READ_ALOUD]:
      'Ascolta qualsiasi risposta invece di leggerla, con una riproduzione che parte appena la prima breve parte è pronta.',
    [FeatureCapability.IMAGE_GENERATION]:
      'Genera e modifica immagini dentro la conversazione, su diversi provider di immagini con passaggio automatico dall’uno all’altro.',
    [FeatureCapability.RELIABILITY]:
      'Passaggio automatico a un altro modello, un interruttore condiviso per i provider senza più credito e stream che sopravvivono a una riconnessione.',
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]:
      'Un credito mensile incluso nel piano più ricariche che non scadono mai, riservato prima di ogni chiamata e mostrato nella tua valuta.',
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]:
      'Ruoli che puoi rimodellare, gestione di utenti e piani, e un registro di audit filtrabile per chi gestisce ClawAI per un’organizzazione.',
  },
  capabilities: {
    [FeatureCapability.MULTIMODAL_AI]: {
      seo: {
        title: 'AI multimodale in ClawAI: voce, video e visione',
        description:
          'Come ClawAI gestisce note vocali, note video e immagini: trascrizione, fotogrammi video campionati, un assistente visivo per i modelli solo testo e instradamento in base al tipo di allegato.',
        keywords: ['note vocali AI', 'comprensione video AI', 'instradamento AI multimodale'],
      },
      eyebrow: 'Funzionalità',
      title: 'AI multimodale: voce, video e visione',
      summary:
        'Puoi parlare a ClawAI, mostrargli un video o passargli un’immagine, e il messaggio arriva comunque a un modello in grado di capirlo. Registrazione, trascrizione, campionamento dei fotogrammi e assistente visivo fanno parte della chat già rilasciata, non di un’app separata.',
      sections: [
        {
          id: 'voice-and-video-notes',
          heading: 'Note vocali e video direttamente dal compositore',
          paragraphs: [
            'Il compositore ha un pulsante di registrazione per note vocali e video. Chiede prima il permesso, mostra una forma d’onda in tempo reale mentre registri e limita ogni registrazione a cinque minuti. La registrazione viene trascritta — prima si prova Gemini, con OpenAI Whisper come riserva — e il modello che risponde viene informato che il messaggio è arrivato come nota vocale, così risponde a ciò che hai detto e non a un file.',
            'L’audio che hai già funziona allo stesso modo: i caricamenti WebM, OGG, MP3, MP4 e M4A, WAV, FLAC e AAC vengono trascritti prima di raggiungere il modello.',
          ],
        },
        {
          id: 'video-understanding',
          heading: 'Video che il modello riesce davvero a seguire',
          paragraphs: [
            'Un video caricato viene trascritto con i timestamp, e fino a sei fotogrammi per video vengono campionati e mostrati al modello insieme alla trascrizione, così può rispondere a domande su ciò che accade sullo schermo oltre che su ciò che viene detto. Un video muto viene segnalato come privo di parlato invece di produrre una trascrizione vuota, e puoi interrompere l’elaborazione di un video lungo in qualsiasi momento.',
            'Ogni piano ha un limite di durata video fissato dall’operatore; indipendentemente dal piano, un singolo video non può mai superare i trenta minuti né la risoluzione 4K. I contenitori supportati sono MP4, MOV, WebM, AVI e MPEG.',
          ],
        },
        {
          id: 'vision-helper-and-modality-routing',
          heading: 'Un assistente visivo, e instradamento per tipo di allegato',
          paragraphs: [
            'Non tutti i modelli vedono. Quando il modello che risponde a un messaggio è solo testo, un secondo modello può descrivergli fino a quattro immagini, compreso l’eventuale testo al loro interno, e il modello che risponde sa di lavorare su una descrizione. Nelle conversazioni Local-Only e Privacy-First si usano solo assistenti locali serviti tramite Ollama o llama.cpp.',
            'In modalità Auto, il router ordina anche i modelli candidati in base a quanto bene gestiscono il tipo di allegato presente nel messaggio, così un’immagine, un PDF o un video tende a finire su un modello che lo accetta nativamente invece di affidarsi all’assistente.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quanto può durare una nota vocale o video?',
          answer:
            'Una registrazione fatta nel compositore può durare fino a cinque minuti. I video caricati sono limitati dalla durata video prevista dal tuo piano, e mai oltre i trenta minuti o la risoluzione 4K, su qualsiasi piano.',
        },
        {
          question: 'Cosa succede se invio un’immagine a un modello che non vede le immagini?',
          answer:
            'Se l’assistente visivo è abilitato sul tuo piano, un modello con capacità di visione descrive l’immagine e ne trascrive il testo, e il modello che risponde lavora su quella descrizione, sapendo che si tratta di una descrizione e non dell’immagine stessa.',
        },
        {
          question: 'ClawAI sceglie un modello diverso a causa del mio allegato?',
          answer:
            'In modalità Auto, sì: il router ordina i candidati in base a quanto bene gestiscono il tipo di allegato. Se fissi tu un modello, la tua scelta viene rispettata e l’assistente visivo colma la lacuna dove è abilitato.',
        },
      ],
      productNote:
        'Note vocali e video, trascrizione e instradamento consapevole della modalità sono già rilasciati; l’assistente visivo è una funzionalità di piano che un operatore attiva assegnando un modello di supporto.',
    },
    [FeatureCapability.FILES_FROM_CHAT]: {
      seo: {
        title: 'File dalla chat: PDF, DOCX, XLSX, PPTX e ZIP',
        description:
          'Chiedi a ClawAI un documento, un foglio di calcolo, una presentazione o un archivio a parole tue e scarica un file vero in uno di dieci formati, con nome e riassunto scritti dal modello.',
        keywords: [
          'generare PDF con AI',
          'creare fogli di calcolo con AI',
          'generatore PowerPoint AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'File dalla chat',
      summary:
        'Di’ «trasformalo in PDF» o «mettilo in un foglio di calcolo» e ClawAI ti consegna un file, non un blocco di testo da copiare. Il modello scrive il contenuto, un adattatore di formato costruisce il file e il risultato resta nella conversazione, pronto da scaricare.',
      sections: [
        {
          id: 'ten-formats-from-plain-language',
          heading: 'Dieci formati di file da una richiesta a parole tue',
          paragraphs: [
            'Una richiesta come «crea un PDF di questo piano» o «esporta la tabella in CSV» viene riconosciuta e inviata alla generazione di file. I formati supportati sono PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, testo semplice, CSV e JSON — ognuno costruito dal proprio adattatore, così un foglio di calcolo ha celle vere e una presentazione ha diapositive vere invece di un’unica lunga pagina.',
          ],
        },
        {
          id: 'named-by-the-model',
          heading: 'Nome e riassunto dati dal modello che l’ha scritto',
          paragraphs: [
            'Invece di «documento (3).pdf», il modello assegna a ogni file un titolo descrittivo fino a 120 caratteri e un riassunto di una frase, che compaiono sulla scheda del file in chat. I titoli in arabo, cinese, hindi o in qualsiasi altra scrittura restano come sono stati scritti, senza traslitterazione.',
            'A parte questo, qualsiasi singola risposta si può esportare con un clic in Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX o ZIP. Queste esportazioni convertono una risposta che hai già, quindi non contano mai nel tuo limite giornaliero di file.',
          ],
        },
        {
          id: 'downloads-and-allowances',
          heading: 'Download privati, e un limite giornaliero su ogni piano',
          paragraphs: [
            'Solo chi ha creato un file può scaricarlo, tramite un link autenticato. Il download resta disponibile per un’ora; dopo puoi ricostruire lo stesso file gratuitamente, oppure chiedere al modello di rigenerarlo con contenuti nuovi.',
            'Ogni piano, compreso Free, ha un limite giornaliero di file scritti dall’AI fissato dall’operatore, e i piani superiori lo alzano o lo eliminano. Alla scrittura in sé si applica anche il tuo normale limite di utilizzo, e vale quello che viene raggiunto per primo.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quali formati di file può creare ClawAI?',
          answer:
            'Dieci: PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, testo semplice, CSV e JSON. L’esportazione delle risposte ne copre otto — Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX e ZIP.',
        },
        {
          question: 'Perché il mio link di download ha smesso di funzionare?',
          answer:
            'I file generati restano scaricabili per un’ora. Dopo, apri la scheda del file e ricostruiscilo — stesso contenuto, senza costi — oppure chiedi al modello di rigenerarlo se vuoi che venga riscritto.',
        },
        {
          question: 'C’è un limite al numero di file che posso generare?',
          answer:
            'Sì, un limite giornaliero per piano fissato dall’operatore, disponibile anche sul piano Free. Esportare una risposta che hai già non conta ai fini di questo limite.',
        },
      ],
      productNote:
        'La generazione di file è un servizio a sé, con un adattatore per ogni formato e una propria superficie di misurazione (FILE_GENERATION), separata dal normale utilizzo della chat.',
    },
    [FeatureCapability.SMART_ATTACHMENTS]: {
      seo: {
        title: 'Allegati intelligenti: archivi, media e scansione antivirus',
        description:
          'Cosa succede quando alleghi un file in ClawAI: cinquanta tipi supportati, archivi estratti in un albero leggibile, caricamenti riprendibili e una scansione antivirus che in caso di guasto blocca tutto.',
        keywords: ['allegati chat AI', 'caricare zip su AI', 'lettore di archivi AI'],
      },
      eyebrow: 'Funzionalità',
      title: 'Allegati intelligenti',
      summary:
        'Un allegato è utile solo se il modello riesce a leggerlo. ClawAI estrae il testo da documenti e archivi prima che un modello li veda, analizza ogni caricamento alla ricerca di malware e ti permette di trascinare i file in qualsiasi punto della chat invece di cercare un pulsante.',
      sections: [
        {
          id: 'what-you-can-attach',
          heading: 'Cosa puoi allegare, e quanto',
          paragraphs: [
            'Documenti (PDF, DOCX, XLSX, PPTX, RTF), una quarantina di formati di testo e codice, immagini (PNG, JPEG, WebP, GIF, SVG), audio, video e archivi (ZIP, 7z, RAR, TAR, GZ, BZ2, XZ). Ogni file può arrivare a 50 MB e un messaggio può contenerne fino a dieci. I file oltre 4 MB si caricano a blocchi riprendibili, così una connessione caduta non significa ricominciare da capo.',
            'Puoi trascinare i file in qualsiasi punto del pannello della chat — sui messaggi o sul compositore — e ogni allegato mostra un indicatore di stato durante il caricamento, con un pulsante per annullare se cambi idea.',
          ],
        },
        {
          id: 'text-extraction-and-archives',
          heading: 'Estrazione del testo, e archivi in cui il modello sa muoversi',
          paragraphs: [
            'Il testo leggibile di file PDF, Office e RTF viene estratto e passato al modello, così risponde a partire dal documento stesso e non da un segnaposto. Un archivio viene estratto in un albero di file più il testo di ciascun elemento, così puoi allegare un progetto compresso e chiedere di un file specifico al suo interno.',
            'Gli archivi vengono controllati prima di essere estratti: limiti sulla dimensione totale estratta, sul numero di voci e sulla profondità di annidamento impediscono a una bomba di decompressione di raggiungere l’estrattore.',
          ],
        },
        {
          id: 'scanning-and-retention',
          heading: 'Scansione antivirus che blocca in caso di guasto, e conservazione',
          paragraphs: [
            'Ogni caricamento viene analizzato da ClamAV prima di essere archiviato. Se lo scanner non è disponibile, il caricamento viene rifiutato invece di passare senza scansione. I caricamenti vengono eliminati automaticamente dopo il periodo di conservazione configurato dall’operatore, e puoi eliminare tu stesso un file in qualsiasi momento.',
          ],
        },
      ],
      faq: [
        {
          question: 'Posso caricare un intero progetto come file ZIP?',
          answer:
            'Sì. Gli archivi ZIP, 7z, RAR, TAR, GZ, BZ2 e XZ vengono estratti in un albero di file con il testo di ogni elemento, così il modello può trovare e citare un file specifico all’interno dell’archivio.',
        },
        {
          question: 'Qual è la dimensione massima di un allegato?',
          answer:
            '50 MB per file e fino a dieci allegati per messaggio. I file oltre 4 MB si caricano a blocchi riprendibili, così una connessione interrotta riprende invece di ricominciare da capo.',
        },
        {
          question: 'Cosa succede se l’antivirus non è disponibile?',
          answer:
            'Il caricamento viene rifiutato. ClawAI non archivia mai un file non analizzato come ripiego: vedi un errore e puoi riprovare quando la scansione torna disponibile.',
        },
      ],
      productNote:
        'La gestione degli allegati vive nel servizio file: estrazione, manifest degli archivi, caricamenti a blocchi e scansione ClamAV sono tutti attivi per impostazione predefinita, non componenti aggiuntivi opzionali.',
    },
    [FeatureCapability.NARRATED_RESEARCH]: {
      seo: {
        title: 'Ricerca narrata ed esplorazione del web in ClawAI',
        description:
          'Come ClawAI fa ricerca sul web: un pianificatore che sceglie se cercare o esplorare, un registro di lavoro narrato in diretta, un recupero a livelli che rispetta robots.txt e fonti citate.',
        keywords: ['ricerca web con AI', 'crawler di siti AI', 'ricerca AI con fonti'],
      },
      eyebrow: 'Funzionalità',
      title: 'Ricerca narrata ed esplorazione del web',
      summary:
        'Quando una domanda richiede il web in tempo reale, ClawAI non tira a indovinare. Un pianificatore decide se rispondere direttamente, cercare, esplorare un sito o entrambe le cose, racconta ogni passaggio mentre lavora e restituisce la risposta con le fonti che ha effettivamente letto.',
      sections: [
        {
          id: 'a-planner-not-a-keyword',
          heading: 'Decide un pianificatore, non una parola chiave',
          paragraphs: [
            'Nella modalità di ricerca Auto, un modello di pianificazione legge il messaggio e sceglie uno di quattro percorsi: rispondere con ciò che sa già, cercare sul web, esplorare un sito specifico, oppure esplorare e poi cercare. Un link che incolli viene sempre aperto. Se il modello di pianificazione restituisce qualcosa di inutilizzabile, si prova il modello successivo invece di interrompere la ricerca in silenzio.',
            'Puoi anche scegliere tu la modalità nel compositore: disattivata, Auto, solo ricerca, ricerca con recupero delle pagine, oppure ricerca con estrazione di contenuti strutturati.',
          ],
        },
        {
          id: 'a-narrated-work-log',
          heading: 'Un registro di lavoro che puoi seguire',
          paragraphs: [
            'Ogni passaggio — il piano, ogni ricerca, ogni pagina recuperata o saltata — viene trasmesso in tempo reale in un registro narrato sopra la risposta, e salvato con la risposta così che resti lì anche dopo un aggiornamento della pagina. Le fonti su cui si basa la risposta sono elencate insieme a essa, così puoi aprirle e verificarle tu stesso.',
          ],
        },
        {
          id: 'tiered-and-polite-fetching',
          heading: 'Un recupero a livelli che rispetta le regole',
          paragraphs: [
            'Le pagine vengono recuperate partendo dal metodo più economico: l’API ufficiale del sito quando esiste, poi una semplice richiesta HTTP, poi il passaggio a un browser headless solo quando una pagina lo richiede, con un servizio di lettura e le copie d’archivio come ripieghi successivi. Un’esplorazione può coprire fino a duecento pagine di uno stesso sito.',
            'robots.txt viene rispettato a ogni recupero con lo user agent ClawAI-ResearchBot, e una pagina non consentita non viene ritentata in altro modo. Le pagine che richiedono l’accesso e i blocchi legali fermano il recupero, i captcha non vengono mai risolti, ogni reindirizzamento viene controllato contro gli indirizzi di rete privati e una copia d’archivio è sempre indicata come tale.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI rispetta robots.txt?',
          answer:
            'Sì, a ogni recupero, con lo user agent ClawAI-ResearchBot. Una pagina vietata da robots.txt viene saltata e non viene ritentata con un altro metodo di recupero.',
        },
        {
          question: 'Posso vedere cosa ha fatto davvero la ricerca?',
          answer:
            'Sì. Un registro di lavoro narrato mostra il piano, ogni ricerca e ogni pagina recuperata o saltata, e viene salvato con la risposta insieme all’elenco delle fonti utilizzate.',
        },
        {
          question: 'La ricerca web è disponibile su ogni piano?',
          answer:
            'Le modalità di ricerca sono funzionalità di piano (RESEARCH_MODE, WEB_SEARCH, WEB_FETCH e WEB_EXTRACT) con limiti propri, che l’operatore fissa per ciascun piano. La pagina dei prezzi mostra cosa include ogni piano.',
        },
      ],
      productNote:
        'Il ciclo di ricerca gira in un proprio servizio di ricerca con livelli di recupero modificabili dall’amministratore, misurato su superfici proprie invece che come normali token di chat.',
    },
    [FeatureCapability.ORCHESTRATION_LABS]: {
      seo: {
        title: 'Laboratori di orchestrazione: confronto, giudice, consenso, escalation',
        description:
          'I laboratori di ClawAI che mettono più modelli sullo stesso prompt — Compare con Judge e Critic, Consensus, Escalation, Best-of-N, Verify, Repair, Pipeline e altri ancora.',
        keywords: [
          'confrontare modelli AI affiancati',
          'risposta AI per consenso',
          'LLM come giudice',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Laboratori di orchestrazione',
      summary:
        'Alcune domande meritano più di un modello. I laboratori sono spazi di lavoro dedicati, ciascuno con la propria pagina e la propria vista dei risultati, per far lavorare più modelli sullo stesso problema e vedere esattamente in cosa differiscono.',
      sections: [
        {
          id: 'compare-judge-and-critic',
          heading: 'Compare, con un giudice e un critico',
          paragraphs: [
            'Compare invia un prompt a più modelli e mostra le loro risposte affiancate, con latenza e conteggio dei token. Attiva Judge e un modello indipendente valuta ogni risposta secondo criteri espliciti; attiva Critic e scrive cosa c’è di debole in ciascuna. Compare funziona anche dentro una normale conversazione, così puoi verificare una singola risposta senza uscire dalla chat.',
          ],
        },
        {
          id: 'consensus-and-escalation',
          heading: 'Consenso ed escalation',
          paragraphs: [
            'Consensus pone la stessa domanda a un numero di modelli da due a cinque e sintetizza un’unica risposta a partire dai punti in cui concordano, segnalando quelli in cui divergono. Escalation parte da un modello economico e sale di livello solo quando la risposta non è all’altezza, così paghi un modello potente quando la domanda ne ha davvero bisogno.',
          ],
        },
        {
          id: 'the-other-labs',
          heading: 'Verifica, riparazione e il resto del banco di lavoro',
          paragraphs: [
            'Best-of-N genera più candidati e tiene il migliore. Verify fa controllare a un secondo modello la correttezza di una risposta. Repair corregge un difetto specifico in una risposta esistente invece di rigenerarla. Decompose suddivide un compito ampio in passaggi. I Role pack passano un problema tra modelli specializzati per ruolo, Cost ensemble bilancia qualità e spesa, e Pipeline concatena più fasi in un unico flusso di lavoro con nome e rieseguibile.',
            'Ogni laboratorio viene abilitato per piano dall’operatore, e le esecuzioni dei laboratori sono misurate separatamente dalla chat normale — Compare, Judge e Critic su superfici proprie, gli altri laboratori sulla superficie di orchestrazione.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual è la differenza tra Compare e Consensus?',
          answer:
            'Compare mostra affiancate le risposte di ogni modello e lascia a te il verdetto, eventualmente con un punteggio di Judge. Consensus fonde le risposte in una sola e segnala i punti su cui i modelli non sono d’accordo.',
        },
        {
          question: 'In che modo l’escalation fa risparmiare?',
          answer:
            'Parte da un modello più economico e passa a uno più potente solo quando la risposta non raggiunge il livello richiesto, così le domande facili non pagano mai il modello più costoso.',
        },
        {
          question: 'I laboratori sono disponibili su ogni piano?',
          answer:
            'Ogni laboratorio viene attivato per piano dall’operatore, quindi la disponibilità dipende dal tuo piano. La pagina dei prezzi elenca cosa include ciascun piano.',
        },
      ],
      productNote:
        'Compare, Consensus, Escalation, Repair, Decompose, Best-of-N, Verify, Pipeline, Cost ensemble e Role pack sono tutti rilasciati, ciascuno con la propria pagina, il proprio endpoint e la propria scheda dei risultati.',
    },
    [FeatureCapability.CONVERSATION_TOOLS]: {
      seo: {
        title: 'Strumenti avanzati per le conversazioni: dirama, modifica, cerca, esporta',
        description:
          'Gli strumenti di ClawAI per lavorare su una conversazione invece di limitarsi a leggerla: diramazioni, modifica e riesecuzione, ricerca nella chat, ricerca tra le chat, esportazione e link condivisi.',
        keywords: [
          'diramare una conversazione AI',
          'modificare e rieseguire un prompt',
          'esportare chat AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Strumenti avanzati per le conversazioni',
      summary:
        'Una conversazione lunga è un documento di lavoro. ClawAI ti dà gli strumenti per diramarla, correggerla, cercarci dentro, riutilizzarla in un’altra chat e passarla a qualcun altro, senza copiare e incollare.',
      sections: [
        {
          id: 'branch-edit-and-rerun',
          heading: 'Dirama, modifica e riesegui',
          paragraphs: [
            'Dirama una conversazione da qualsiasi messaggio per provare una direzione diversa lasciando intatto l’originale. Modifica uno dei tuoi messaggi precedenti e rieseguilo, oppure rigenera una risposta che non ti convince, e la chat prosegue dalla nuova versione.',
          ],
        },
        {
          id: 'find-search-and-cross-thread-context',
          heading: 'Trova, cerca, e contesto da altre chat',
          paragraphs: [
            'Cerca all’interno della chat corrente, oppure in tutte le tue chat per titolo e testo dei messaggi. Il contesto tra chat permette a una conversazione di attingere dalle tue chat precedenti pertinenti — al massimo tre, e sempre e solo tue. È attivo per impostazione predefinita, si può disattivare per singola chat, e l’ispettore del contesto mostra quali chat sono state usate.',
          ],
        },
        {
          id: 'export-pin-and-share',
          heading: 'Esporta, fissa e condividi',
          paragraphs: [
            'Esporta un’intera chat in Markdown, oppure una singola risposta in Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX o ZIP. Fissa le chat a cui torni spesso. Condividi una conversazione tramite un link pubblico che puoi rigenerare su un nuovo URL o revocare in qualsiasi momento.',
          ],
        },
      ],
      faq: [
        {
          question: 'Diramare una conversazione modifica quella originale?',
          answer:
            'No. Una diramazione è una nuova chat che parte dal messaggio che hai scelto; la conversazione originale resta esattamente com’era.',
        },
        {
          question:
            'La conversazione di un’altra persona può finire nella mia tramite il contesto tra chat?',
          answer:
            'No. Il contesto tra chat legge solo le tue chat, al massimo tre, e puoi disattivarlo per qualsiasi chat dalle sue impostazioni.',
        },
        {
          question: 'Posso smettere di condividere una conversazione dopo aver inviato il link?',
          answer:
            'Sì. Puoi revocare un link condiviso in qualsiasi momento, oppure rigenerarlo su un nuovo URL così che quello vecchio smetta di funzionare.',
        },
      ],
      productNote:
        'Diramazione, modifica e riesecuzione, rigenerazione, ricerca nella chat e tra le chat, esportazione, fissaggio, condivisione e contesto tra chat sono tutti già rilasciati nello spazio di lavoro della chat.',
    },
    [FeatureCapability.READ_ALOUD]: {
      seo: {
        title: 'Lettura ad alta voce: ascolta le risposte AI in ClawAI',
        description:
          'Come ClawAI legge ad alta voce una risposta con una voce generata dal server: riproduzione che parte presto, comandi di pausa e stop, gestione delle risposte lunghe e nessun addebito per le parti non riuscite.',
        keywords: [
          'lettura ad alta voce AI',
          'sintesi vocale delle risposte AI',
          'ascoltare la chat AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Lettura ad alta voce',
      summary:
        'Qualsiasi risposta si può ascoltare invece di leggerla. La voce viene generata sul server da un modello di sintesi vocale, non dalla voce integrata del browser, e inizia a suonare prima che l’intera risposta sia stata convertita.',
      sections: [
        {
          id: 'how-playback-works',
          heading: 'Come funziona la riproduzione',
          paragraphs: [
            'Ogni messaggio dell’assistente ha un pulsante Leggi ad alta voce con riproduci, pausa e stop. La risposta viene convertita a parti, e la riproduzione parte non appena la prima breve parte è pronta, così non devi aspettare che una risposta lunga sia elaborata per intero prima di sentire qualcosa.',
          ],
        },
        {
          id: 'long-answers-and-languages',
          heading: 'Risposte lunghe e altre lingue',
          paragraphs: [
            'Vengono letti fino a 12.000 caratteri di una risposta, e ti viene segnalato quando una risposta era più lunga e la riproduzione è stata interrotta. Le frasi vengono suddivise correttamente per testi in alfabeto latino, arabo, hindi, cinese, giapponese e coreano, così una risposta multilingue non inciampa a ogni punto fermo.',
          ],
        },
        {
          id: 'voices-and-billing',
          heading: 'Voci, disponibilità e fatturazione',
          paragraphs: [
            'Le voci provengono da modelli di sintesi vocale di Gemini o OpenAI, scelti dall’operatore. La lettura ad alta voce è una funzionalità di piano; se non è stata assegnata alcuna voce, il pulsante te lo dice invece di fallire in silenzio. Le parti che non vengono generate non sono addebitate.',
          ],
        },
      ],
      faq: [
        {
          question: 'La lettura ad alta voce usa la voce del mio browser?',
          answer:
            'No. La voce viene generata sul server da un modello di sintesi vocale di Gemini o OpenAI, quindi suona allo stesso modo su ogni dispositivo e browser.',
        },
        {
          question: 'Può leggere una risposta molto lunga?',
          answer:
            'Legge fino a 12.000 caratteri di una risposta e ti avvisa quando la risposta era più lunga, così sai che la riproduzione si è fermata prima.',
        },
        {
          question: 'Mi viene addebitato qualcosa se la lettura ad alta voce non riesce?',
          answer:
            'Solo le parti effettivamente generate. Una parte che non riesce non viene addebitata, e puoi riprodurre di nuovo la risposta.',
        },
      ],
      productNote:
        'La lettura ad alta voce è una funzionalità di piano che usa un modello di sintesi vocale lato server assegnato dall’operatore; non è il motore vocale del browser.',
    },
    [FeatureCapability.IMAGE_GENERATION]: {
      seo: {
        title: 'Generazione di immagini AI nelle conversazioni di ClawAI',
        description:
          'Genera e modifica immagini da una conversazione ClawAI con modelli Gemini, OpenAI, xAI o Stable Diffusion locali, con passaggio automatico tra provider, avanzamento e nuovo tentativo integrati.',
        keywords: [
          'generatore di immagini AI',
          'modificare immagini con AI',
          'generazione di immagini Gemini',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Generazione di immagini',
      summary:
        'Descrivi un’immagine nella conversazione e ClawAI la genera lì, accanto al resto del lavoro. Dietro una sola richiesta ci sono diversi provider di immagini, e se uno fallisce si prova automaticamente il successivo.',
      sections: [
        {
          id: 'providers-and-fallback',
          heading: 'Diversi provider dietro una sola richiesta',
          paragraphs: [
            'Le richieste di immagini possono essere servite dai modelli di immagini Gemini, da gpt-image-1 di OpenAI, da Grok Imagine di xAI, oppure da modelli Stable Diffusion locali (SDXL-Turbo e un flusso di lavoro ComfyUI) in esecuzione sul tuo hardware. Se il provider scelto fallisce, la richiesta passa al successivo — prima il cloud, poi il locale — invece di restituire un errore.',
            'Se scegli tu un modello di immagini specifico, viene usato quel modello, anche quando il prompt non contiene una parola chiave evidente legata alle immagini.',
          ],
        },
        {
          id: 'in-the-conversation',
          heading: 'Generate nella conversazione, con l’avanzamento',
          paragraphs: [
            'Le immagini compaiono dentro la chat con un pannello di avanzamento mentre vengono generate. Puoi annullare una generazione, oppure riprovare con un altro provider se il risultato non ti piace. Non c’è un’app di immagini separata in cui passare.',
          ],
        },
        {
          id: 'prompts-sizes-and-edits',
          heading: 'Prompt, dimensioni e modifiche',
          paragraphs: [
            'I prompt possono arrivare a 4.000 caratteri, e le immagini si possono richiedere in dimensioni da 256 a 4.096 pixel. Allega un’immagine di riferimento fino a 25 MB per modificare un’immagine esistente invece di partire da zero. La generazione di immagini è una funzionalità dei piani a pagamento ed è misurata su una propria superficie, separata dai token della chat.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quali modelli generano le immagini?',
          answer:
            'I modelli di immagini Gemini, gpt-image-1 di OpenAI, Grok Imagine di xAI e modelli Stable Diffusion locali. Quali siano disponibili dipende da ciò che l’operatore ha configurato.',
        },
        {
          question: 'Posso modificare un’immagine che ho già?',
          answer:
            'Sì. Allega un’immagine di riferimento fino a 25 MB e descrivi la modifica che vuoi, e il modello la modifica invece di generarne una da zero.',
        },
        {
          question: 'La generazione di immagini è disponibile sul piano gratuito?',
          answer:
            'La generazione di immagini è una funzionalità dei piani a pagamento ed è misurata separatamente dalla chat. La pagina dei prezzi mostra quali piani la includono.',
        },
      ],
      productNote:
        'La generazione di immagini gira in un proprio servizio immagini con passaggio automatico dai modelli cloud a quelli locali, misurata sulla superficie IMAGE.',
    },
    [FeatureCapability.RELIABILITY]: {
      seo: {
        title: 'Affidabilità in ClawAI: fallback, interruttori e stream riprendibili',
        description:
          'Cosa fa ClawAI quando un provider fallisce: passaggio automatico a un altro modello, un interruttore condiviso per gli account dei provider esauriti e stream che riprendono dopo una riconnessione.',
        keywords: [
          'fallback tra modelli AI',
          'failover tra provider LLM',
          'streaming AI riprendibile',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Affidabilità',
      summary:
        'I provider falliscono, esauriscono il credito e vanno in timeout. ClawAI è costruito in modo che, quando succede, la tua conversazione prosegua con un altro modello e uno stream interrotto riprenda da dove si era fermato.',
      sections: [
        {
          id: 'automatic-fallback',
          heading: 'Passaggio automatico a un altro modello',
          paragraphs: [
            'Ogni richiesta instradata porta con sé un elenco di modelli candidati. Se il modello scelto fallisce a metà richiesta, ClawAI passa automaticamente al candidato successivo, e la risposta registra quale modello ha effettivamente risposto, non solo quello scelto per primo.',
          ],
        },
        {
          id: 'a-shared-provider-breaker',
          heading: 'Un interruttore condiviso per i provider esauriti',
          paragraphs: [
            'Quando l’account di un provider esaurisce il credito, un interruttore toglie quel provider dalla rotazione per dieci minuti, poi lascia passare una singola chiamata di prova per vedere se si è ripreso. Lo stato dell’interruttore è condiviso in Redis tra tutti i server di chat, così un guasto viene appreso una volta sola invece di essere riscoperto da ogni server, e ogni server ripiega sulla propria copia se Redis non è disponibile.',
          ],
        },
        {
          id: 'stop-and-resume',
          heading: 'Uno Stop che ferma sempre, stream che riprendono',
          paragraphs: [
            'La pressione di Stop viene trasmessa a tutti i server di chat, così quello che sta eseguendo il modello lo interrompe. Se la connessione cade mentre una risposta è in streaming, alla riconnessione gli eventi persi vengono riprodotti da un buffer invece di perdere il resto della risposta.',
          ],
        },
      ],
      faq: [
        {
          question: 'Cosa succede se un modello fallisce a metà di una risposta?',
          answer:
            'ClawAI passa automaticamente al modello candidato successivo, e la risposta mostra quale modello l’ha effettivamente prodotta.',
        },
        {
          question: 'Da cosa protegge l’interruttore dei provider?',
          answer:
            'Dall’account di un provider che ha esaurito il credito. Viene saltato per dieci minuti e poi testato con una chiamata, invece di far fallire ogni richiesta contro di lui nel frattempo.',
        },
        {
          question: 'Perdo una risposta se la connessione cade?',
          answer:
            'No. Quando lo stream si riconnette, gli eventi persi vengono riprodotti da un buffer lato server e la risposta prosegue.',
        },
      ],
      productNote:
        'Il fallback, l’interruttore dei provider condiviso in Redis, lo Stop tra server e gli stream riprendibili sono già oggi nel servizio di chat; gli operatori vedono lo stato degli interruttori nella pagina dei connettori dell’amministrazione.',
    },
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: {
      seo: {
        title: 'Credito AI a consumo e prezzi in valuta locale',
        description:
          'Come funziona il credito a consumo di ClawAI: un credito mensile incluso nel piano, ricariche che non scadono mai, spesa riservata prima di ogni chiamata e prezzi mostrati nella tua valuta.',
        keywords: ['AI a consumo', 'ricarica credito AI', 'prezzi AI in valuta locale'],
      },
      eyebrow: 'Funzionalità',
      title: 'Credito a consumo e valuta locale',
      summary:
        'I modelli cloud costano denaro vero per ogni token, quindi ClawAI li misura su un portafoglio di credito invece di nascondere il costo dentro una tariffa fissa. Vedi quanto ha speso ogni funzionalità, ricarichi solo quando serve e leggi i prezzi nella tua valuta.',
      sections: [
        {
          id: 'two-kinds-of-credit',
          heading: 'Due tipi di credito, spesi in un ordine fisso',
          paragraphs: [
            'Il portafoglio contiene due tipi di credito. Il credito mensile è una quota del prezzo del tuo piano a pagamento che si azzera a ogni periodo di fatturazione e non si accumula; un piano gratuito non ne concede. Il credito acquistato proviene dalle ricariche, non scade mai e resta tuo anche dopo un downgrade o una disdetta.',
            'La spesa attinge sempre prima dal credito mensile e poi da quello acquistato, quindi una ricarica viene toccata solo una volta esaurito il credito del periodo. Chiunque può acquistare una ricarica, anche sul piano gratuito, e i pacchetti di ricarica e i prezzi dei piani provengono da record di prezzo con versioni, non da questa pagina.',
          ],
        },
        {
          id: 'no-surprise-spend',
          heading: 'La spesa viene riservata prima di una chiamata, mai dopo',
          paragraphs: [
            'Prima che un modello cloud venga eseguito, il costo della richiesta viene riservato sul tuo saldo; dopo, la riserva viene saldata all’importo reale oppure rilasciata. Non puoi spendere oltre il tuo saldo, e se ciò che resta non basterebbe per una risposta utile, la richiesta viene rifiutata invece di essere interrotta a metà. Un modello senza prezzo pubblicato viene bloccato invece di essere trattato come gratuito.',
            'Il credito copre chat, Compare, Judge, i laboratori di orchestrazione, la generazione di immagini e di file, l’agente di programmazione, le azioni sullo spazio di lavoro, la trascrizione, l’assistente visivo e la lettura ad alta voce. I modelli locali serviti tramite Ollama o llama.cpp non vengono misurati, e la ricerca web usa limiti propri e separati.',
          ],
        },
        {
          id: 'ledger-and-local-currency',
          heading: 'Un registro per funzionalità, e prezzi nella tua valuta',
          paragraphs: [
            'Ogni movimento viene scritto in un registro a sola aggiunta in micro-dollari interi — nessuno scostamento da arrotondamento — e la pagina di fatturazione mostra quale funzionalità ha speso ogni importo, così una settimana intensa di generazione di immagini risulta esattamente per quello che è.',
            'I prezzi sono mostrati in più di sessanta valute di visualizzazione, rilevate dalla tua posizione o scelte a mano, con l’importo originale in dollari USA accanto. La cifra visualizzata è una stima; l’addebito avviene nella valuta mostrata al checkout, a un tasso fissato al momento del pagamento, tramite i gateway di pagamento abilitati dall’operatore — oggi PayPal e Paymob.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il credito non usato si accumula?',
          answer:
            'Il credito mensile no: si azzera a ogni periodo di fatturazione. Il credito acquistato con una ricarica non scade mai e sopravvive a un downgrade o a una disdetta.',
        },
        {
          question: 'Una conversazione lunga può far sforare il mio saldo?',
          answer:
            'No. Il costo viene riservato prima che il modello venga eseguito, e una richiesta che il saldo residuo non può coprire viene rifiutata in anticipo invece di essere addebitata dopo.',
        },
        {
          question: 'Perché il prezzo al checkout è leggermente diverso da quello che ho visto?',
          answer:
            'Il prezzo in valuta locale sul sito è una stima convertita dai dollari USA. L’addebito usa la valuta mostrata al checkout e un tasso di cambio fissato nel momento in cui paghi.',
        },
      ],
      productNote:
        'Il credito a consumo è un portafoglio con un registro in micro-dollari a sola aggiunta, attivato per singola installazione dal suo operatore; i prezzi dei piani e i pacchetti di ricarica provengono sempre da record di prezzo con versioni.',
    },
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]: {
      seo: {
        title: 'Amministrazione e controllo degli accessi in ClawAI',
        description:
          'Cosa ottiene un operatore che gestisce ClawAI per un’organizzazione: permessi basati sui ruoli, ruoli personalizzati, gestione degli utenti, impostazioni di piani e gateway e un registro di audit filtrabile.',
        keywords: [
          'console di amministrazione AI',
          'controllo accessi AI basato sui ruoli',
          'registro di audit AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Amministrazione e controllo degli accessi',
      summary:
        'Gestire ClawAI per un gruppo di persone — un’azienda, un reparto, un laboratorio — significa decidere chi può fare cosa e poter verificare cosa è successo. La console di amministrazione copre utenti, ruoli, piani, pagamenti e una traccia di audit, ed è la stessa console sia che ClawAI sia ospitato per te sia che giri sui tuoi server.',
      sections: [
        {
          id: 'roles-and-permissions',
          heading: 'Ruoli e permessi che puoi rimodellare',
          paragraphs: [
            'Ogni account ha un ruolo, e ogni schermata e azione dell’API verifica un permesso con nome invece di un ruolo fisso nel codice. Gli amministratori possono cambiare i permessi di un ruolo e creare ruoli propri, così un revisore in sola lettura o un operatore dedicato solo alla fatturazione è una modifica di configurazione, non di codice.',
          ],
        },
        {
          id: 'users-plans-and-payments',
          heading: 'Utenti, piani e pagamenti',
          paragraphs: [
            'Gli amministratori possono attivare o disattivare account, cambiare il ruolo di un utente, impostare una password temporanea da cambiare al successivo accesso e vedere l’utilizzo e il piano di ogni singolo utente. Piani, rimborsi, gateway di pagamento, impostazioni del router intelligente, consegne dei webhook e dettagli dell’installazione hanno ciascuno la propria schermata di amministrazione.',
          ],
        },
        {
          id: 'audit-and-self-hosting',
          heading: 'Un registro di audit, e la tua infrastruttura se ti serve',
          paragraphs: [
            'Le azioni rilevanti per la sicurezza vengono scritte in un registro di audit che gli amministratori possono filtrare e consultare, e i record di audit vengono conservati invece di scadere secondo il calendario ordinario dei log. Le organizzazioni che non possono inviare dati a un provider di terze parti possono eseguire l’intera piattaforma sui propri server con soli modelli locali; si tratta di un’installazione su misura, non di un piano self-service.',
          ],
        },
      ],
      faq: [
        {
          question: 'Posso creare ruoli personalizzati?',
          answer:
            'Sì. Gli amministratori possono creare ruoli e scegliere quali permessi porta ciascun ruolo; ogni schermata e azione dell’API verifica un permesso con nome, non un ruolo fisso.',
        },
        {
          question: 'ClawAI ha spazi di lavoro per team, postazioni o single sign-on?',
          answer:
            'Non ancora. Oggi non esistono spazi di lavoro condivisi per team, fatturazione per postazione, inviti via email né single sign-on. L’amministrazione è per installazione: un operatore gestisce utenti, ruoli e piani dalla console di amministrazione.',
        },
        {
          question: 'Possiamo eseguire ClawAI all’interno della nostra rete?',
          answer:
            'Sì, come installazione su misura sui vostri server con soli modelli locali, così nessun prompt o documento lascia la vostra infrastruttura. La pagina sull’installazione privata descrive cosa comporta.',
        },
      ],
      productNote:
        'Permessi basati sui ruoli, ruoli personalizzati, gestione degli utenti e registro di audit sono già rilasciati nella console di amministrazione; spazi di lavoro per team, fatturazione per postazione, inviti e single sign-on non lo sono.',
    },
  },
};
