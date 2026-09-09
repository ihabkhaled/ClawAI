import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesClusterDictionary } from '@/types/features-cluster.types';

export const IT_FEATURES_CLUSTER_CONTENT: FeaturesClusterDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Dove andare dopo',
    lastReviewed: 'Ultima revisione',
    backToHub: 'Tutte le funzionalità',
    ctaTitle: 'Provalo invece di fidarti della nostra parola',
    ctaBody:
      'ClawAI instrada ogni conversazione verso il modello e gli strumenti adatti al compito, su ogni provider a cui si collega, da un unico spazio di lavoro.',
    startFree: 'Inizia con il piano gratuito',
    seeUseCases: 'Vedilo applicato a un compito reale',
  },
  hub: {
    capabilitiesHeading: 'Approfondisci una funzionalità specifica',
    capabilitiesIntro:
      'Le nove sezioni sopra sono la versione breve. Ognuna delle sei funzionalità qui sotto è una pagina completa: cosa fa davvero la funzionalità sottostante, quale piano la sblocca, e dove verificare tu stesso il meccanismo.',
    cardSummaries: {
      [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]:
        'Sette modalità di instradamento decidono quale modello risponde, e nove primitive di orchestrazione mettono più modelli sullo stesso problema.',
      [FeatureCapability.MEMORY_AND_CONTEXT]:
        'Memoria che persiste tra le conversazioni, e context pack che portano il materiale di riferimento per un compito.',
      [FeatureCapability.WORKSPACE_CONNECTORS]:
        'Quattordici connettori di spazio di lavoro permettono a una richiesta di leggere o agire sugli strumenti che il tuo team già usa.',
      [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]:
        'Caricamento, suddivisione e OCR in ingresso; generazione di immagini, documenti e ricerche in uscita.',
      [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]:
        'Ogni risposta registra quale modello l’ha gestita, perché, e quanto è costata sul tuo piano.',
      [FeatureCapability.SECURITY_AND_DATA_HANDLING]:
        'I meccanismi concreti — autenticazione, RBAC, cifratura delle credenziali, cifratura del trasporto — descritti in modo semplice.',
    },
  },
  capabilities: {
    [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: {
      seo: {
        title: 'Instradamento dei modelli e orchestrazione in ClawAI',
        description:
          'Le sette modalità di instradamento che decidono quale modello risponde a un messaggio, e le nove primitive di orchestrazione che mettono più modelli sullo stesso problema, così come sono in ClawAI.',
        keywords: [
          'modalità di instradamento AI',
          'orchestrazione multi-modello',
          'trasparenza dell’instradamento AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Instradamento dei modelli e orchestrazione',
      summary:
        'L’instradamento decide quale singolo modello risponde a un messaggio; l’orchestrazione decide cosa fare quando un modello solo non basta. ClawAI offre entrambi come meccanismi distinti e soggetti al piano, invece di un unico predefinito nascosto — sette modalità di instradamento e nove primitive di orchestrazione, tutte visibili nella risposta che ricevi.',
      sections: [
        {
          id: 'seven-routing-modes',
          heading: 'Sette modalità di instradamento, non un predefinito nascosto',
          paragraphs: [
            'ClawAI classifica ogni messaggio e può inviarlo automaticamente a un modello adatto, oppure puoi decidere tu la regola. Le modalità: Auto (classifica per compito e sceglie un modello forte per quella classe), Manual Model (fissa un modello per la conversazione), Local-Only (ogni richiesta resta su hardware che controlli, via Ollama o llama.cpp), Privacy-First (una modalità distinta con priorità proprie per tenere una richiesta fuori dal percorso cloud generico), Low Latency (privilegia il modello che risponde più rapidamente), High Reasoning (privilegia il modello di ragionamento più forte indipendentemente da velocità o costo) e Cost Saver (privilegia il modello più economico ancora capace di gestire la richiesta). Vedi «cos’è l’instradamento dei modelli AI», collegato sotto, per il funzionamento generale di un router.',
          ],
        },
        {
          id: 'nine-orchestration-primitives',
          heading: 'Nove modi per mettere più di un modello su un problema',
          paragraphs: [
            'Quando un modello non basta, le primitive di orchestrazione di ClawAI — registrate sul ledger sotto la superficie ORCHESTRATION, distinta dalla chat ordinaria — sono Compare (fino a cinque modelli sullo stesso prompt, affiancati), Consensus (sintetizzare una risposta da dove più modelli concordano, segnalando i disaccordi), Escalation (partire economico e salire automaticamente solo quando la qualità non basta), Best-of-N (generare più candidati e mantenere il più forte), Repair (correggere un difetto specifico in una risposta esistente invece di rigenerarla), Verify (un secondo modello verifica la correttezza con un limite configurabile di revisioni), Role pack (un piccolo team di modelli specializzati per ruolo che si passano il lavoro) Pipeline (concatenare più di queste fasi in un flusso nominato e rieseguibile) e Judge e Critic (un modello indipendente valuta una risposta secondo criteri espliciti, con un feedback scritto del passaggio Critic sui punti deboli). Compare e Judge sono ciascuno soggetto individualmente al piano (COMPARE_MODE, JUDGE_MODE, CRITIC_REVIEW); vedi «cos’è il consenso AI» e «cos’è un giudice AI», entrambi collegati sotto, per come funziona la valutazione stessa.',
          ],
        },
        {
          id: 'automatic-fallback-on-provider-failure',
          heading: 'Cosa succede quando un provider fallisce a metà richiesta',
          paragraphs: [
            'Una decisione di instradamento non è una scommessa unica: se il provider o il modello a cui è stata inviata una richiesta fallisce a metà elaborazione, ClawAI può passare automaticamente a un altro modello, e la risposta registra quale modello è effettivamente intervenuto — non solo quello scelto inizialmente. Vedi «cos’è il fallback dei modelli», collegato sotto, per come viene presa quella decisione di fallback.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quante modalità di instradamento ha ClawAI?',
          answer:
            'Sette: Auto, Manual Model, Local-Only, Privacy-First, Low Latency, High Reasoning e Cost Saver. Auto è quella predefinita; le altre sei esistono per quando vuoi decidere tu l’instradamento, o orientarlo in una direzione precisa.',
        },
        {
          question: 'Qual è la differenza tra Compare e Consensus?',
          answer:
            'Compare mostra la risposta di ogni modello allo stesso prompt affiancate, con latenza e conteggio dei token per modello, lasciando a te la lettura. Consensus sintetizza una risposta da dove i modelli concordano e segnala i disaccordi.',
        },
        {
          question: 'Posso vedere quale modello ha risposto davvero, e perché?',
          answer:
            'Sì — ogni risposta riporta il provider e il modello che l’ha prodotta, il ragionamento dietro la scelta di instradamento, e quanto è costata sul tuo piano. Se un provider è fallito e un altro modello è intervenuto, anche questo viene registrato.',
        },
      ],
      productNote:
        'Sette modalità di instradamento e nove primitive di orchestrazione sono meccanismi reali e distribuiti in ClawAI, non un unico predefinito nascosto — Compare, Judge e Critic sono ciascuno soggetto individualmente al piano e misurato sulla propria superficie del ledger.',
    },
    [FeatureCapability.MEMORY_AND_CONTEXT]: {
      seo: {
        title: 'Memoria e contesto in ClawAI',
        description:
          'Come funzionano la memoria e i context pack di ClawAI — voci di memoria approvate con un punteggio di confidenza, archiviazione delimitata, e pacchetti di materiale di riferimento con versioning, come funzionalità distribuite e soggette al piano.',
        keywords: [
          'funzionalità di memoria AI',
          'context pack AI',
          'memoria di conversazione AI persistente',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Memoria e contesto',
      summary:
        'Memoria e context pack sono due funzionalità distinte, soggette al piano (MEMORY e CONTEXT_PACKS), che risolvono problemi diversi: la memoria conserva ciò che ClawAI ha imparato su di te tra le sessioni, mentre un context pack raggruppa il materiale di riferimento per un compito specifico. Entrambe sono interruttori per singola conversazione, non qualcosa da gestire globalmente.',
      sections: [
        {
          id: 'memory-records-and-approval',
          heading: 'Le voci di memoria, e la coda di approvazione a monte',
          paragraphs: [
            'Una voce di memoria è un fatto, una preferenza, un’istruzione o un riassunto, archiviato con una categoria, un punteggio di confidenza e la sua provenienza. Nulla viene ricordato in silenzio: i candidati finiscono in una coda che approvi o rifiuti, e solo gli elementi ad alta confidenza e non sensibili vengono approvati automaticamente, a una soglia che imposti tu stesso. Vedi «cos’è la memoria AI», collegato sotto, per il funzionamento generale.',
          ],
        },
        {
          id: 'context-packs-for-reference-material',
          heading: 'Context pack per il materiale che un compito deve tenere sott’occhio',
          paragraphs: [
            'Un context pack raggruppa testo riutilizzabile, file, link e riferimenti di memoria in un’unità nominata e con versioning che alleghi a qualsiasi conversazione — così un brief di stile, un insieme di documenti sorgente o istruzioni permanenti non vanno reincollati ogni sessione. I pack hanno versioning, quindi puoi vedere cosa è cambiato e tornare indietro. Vedi «cosa sono i context pack», collegato sotto, per il funzionamento generale.',
          ],
        },
        {
          id: 'scopes-receipts-and-controls',
          heading: 'Ambiti, ricevute di contesto e controlli',
          paragraphs: [
            'Una memoria può essere limitata a te stesso, a una singola conversazione, a un progetto o a uno spazio di lavoro, così il contesto di lavoro non filtra nelle chat personali. Ogni risposta che attinge da memoria o da un pack registra una ricevuta di contesto — quali elementi sono entrati nel prompt, in che ordine, e quanto budget di token ciascuno ha consumato — e i controlli permettono di mettere in pausa tutta la memoria, un singolo elemento, fissare una scadenza, contrassegnare qualcosa come sensibile per l’oscuramento, o eliminarlo del tutto, con ogni modifica scritta in un registro di audit. Vedi «cos’è una finestra di contesto», collegato sotto, per l’importanza di questo conteggio del budget di token.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI ricorda cose su di me senza chiedere?',
          answer:
            'No — i candidati finiscono in una coda di approvazione che esamini tu stesso. Solo gli elementi ad alta confidenza e non sensibili vengono approvati automaticamente, a una soglia che imposti tu, e ogni modifica a una voce di memoria viene scritta in un registro di audit.',
        },
        {
          question: 'Qual è la differenza tra memoria e context pack?',
          answer:
            'La memoria conserva, tra le sessioni, ciò che ClawAI ha imparato sulle tue preferenze. Un context pack è un pacchetto con versioning di materiale di riferimento — testo, file, link — che alleghi a un compito specifico invece di una preferenza duratura. Sono due funzionalità distinte soggette al piano.',
        },
        {
          question: 'Posso disattivare la memoria per una singola domanda?',
          answer:
            'Sì — memoria e context pack sono interruttori per singola conversazione. Disattivali per una domanda occasionale e il prompt non conterrà nient’altro che ciò che hai digitato.',
        },
      ],
      productNote:
        'Memoria e context pack sono due funzionalità ClawAI distinte e soggette al piano (MEMORY, CONTEXT_PACKS) — voci approvate con punteggio di confidenza e pacchetti di riferimento con versioning, entrambi delimitati e verificabili, non un unico blocco di memoria mescolato.',
    },
    [FeatureCapability.WORKSPACE_CONNECTORS]: {
      seo: {
        title: 'Connettori di spazio di lavoro in ClawAI',
        description:
          'I 14 connettori di spazio di lavoro distribuiti da ClawAI — GitHub, Slack, Jira, Google Drive e altri — e come un’azione di spazio di lavoro soggetta al piano legge o agisce su di essi.',
        keywords: [
          'connettori di spazio di lavoro AI',
          'collegare AI a GitHub e Slack',
          'integrazioni di strumenti AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Connettori di spazio di lavoro',
      summary:
        'Un connettore di spazio di lavoro permette a una richiesta ClawAI di leggere o agire su uno strumento che il tuo team già usa, invece di copiare informazioni manualmente. ClawAI ha oggi 14 connettori di spazio di lavoro, e l’accesso allo spazio di lavoro è una funzionalità distinta soggetta al piano (WORKSPACES) con una propria superficie di utilizzo misurata (WORKSPACE_ACTION).',
      sections: [
        {
          id: 'the-fourteen-connectors',
          heading: 'I quattordici connettori, per categoria',
          paragraphs: [
            'Hosting di codice: GitHub, GitLab, Bitbucket. Messaggistica e tracking: Slack, Jira, Confluence, ClickUp. Design: Figma. Documenti e archiviazione: Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive. Calendari: Google Calendar, Outlook Calendar. Ognuno si collega una volta via OAuth, e le credenziali sono cifrate a riposo, legate al tuo account e revocabili con un clic.',
          ],
        },
        {
          id: 'what-a-connected-workspace-can-do',
          heading: 'Cosa permette davvero di fare uno spazio di lavoro connesso',
          paragraphs: [
            'Una volta connesso, ClawAI può cercare in uno strumento, estrarne contesto per una conversazione, e agire su di esso dopo la tua approvazione — un ticket Jira, un thread Slack, un file in Google Drive, referenziato o modificato direttamente invece di essere incollato a mano. Le connessioni si sincronizzano secondo una pianificazione e via webhook, così i risultati di ricerca restano aggiornati, e quante connessioni puoi mantenere dipende dal tuo piano.',
          ],
        },
        {
          id: 'multi-model-review-inside-a-workspace-action',
          heading: 'Revisione multi-modello come parte della stessa superficie misurata',
          paragraphs: [
            'Un’azione di spazio di lavoro non si limita a una singola chiamata al modello — un passaggio di bozza a catena o di handoff, o una revisione multi-modello del risultato prima che venga eseguito, usa la stessa infrastruttura di instradamento e orchestrazione descritta nella pagina instradamento dei modelli e orchestrazione, collegata sotto, applicata a un’azione che tocca uno strumento connesso invece di un normale messaggio di chat.',
          ],
        },
      ],
      faq: [
        {
          question: 'A quanti strumenti si connette ClawAI?',
          answer:
            'Quattordici connettori di spazio di lavoro: GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, ClickUp, Figma, Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive, Google Calendar e Outlook Calendar.',
        },
        {
          question: 'Le mie credenziali dei connettori sono al sicuro?',
          answer:
            'Le credenziali sono cifrate a riposo, legate al tuo account, e non vengono mai restituite al browser — vedi la pagina sicurezza e trattamento dei dati, collegata sotto, per il meccanismo sottostante.',
        },
        {
          question:
            'Un’azione di spazio di lavoro è misurata separatamente da un normale messaggio di chat?',
          answer:
            'Sì — le azioni di spazio di lavoro hanno una propria superficie misurata (WORKSPACE_ACTION), distinta dal piano di token di un normale messaggio di chat. Verifica il piano attuale nella pagina dei prezzi.',
        },
      ],
      productNote:
        'ClawAI si connette oggi a 14 strumenti di spazio di lavoro — hosting di codice, messaggistica, tracking di progetti, design, documenti, archiviazione e calendari — dietro un’unica funzionalità WORKSPACES soggetta al piano, con una propria superficie d’azione misurata.',
    },
    [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: {
      seo: {
        title: 'Gestione di file e documenti in ClawAI',
        description:
          'Come ClawAI acquisisce i file — caricamento, suddivisione, OCR, controlli sul caricamento — e li genera di nuovo come immagini, documenti e ricerche con fonti citate.',
        keywords: [
          'caricamento file e OCR AI',
          'generazione di documenti AI',
          'formati di esportazione documenti AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Gestione di file e documenti',
      summary:
        'I file si muovono in entrambe le direzioni in ClawAI: in ingresso, come caricamento suddiviso e indicizzato così un modello risponde dal tuo contenuto invece che solo dai dati di addestramento; e in uscita, come immagine generata, documento esportato o ricerca con fonti citate. Entrambe le direzioni sono reali, distribuite e misurate separatamente.',
      sections: [
        {
          id: 'upload-chunking-and-retrieval',
          heading: 'Caricamento, suddivisione e consegna per modello',
          paragraphs: [
            'ClawAI accetta PDF, DOCX, fogli di calcolo, CSV, JSON, Markdown, testo semplice, file di codice e immagini. Un file viene suddiviso in passaggi e indicizzato, così solo le parti rilevanti per una domanda entrano nel prompt, e ogni modello riceve la forma che gestisce più affidabilmente — un’immagine nativa, un PDF nativo o testo estratto — con ogni messaggio che mostra quale forma ha effettivamente ricevuto ciascun modello. I file possono essere allegati per messaggio, anche nelle esecuzioni Compare, così più modelli possono essere interrogati sullo stesso documento contemporaneamente.',
          ],
        },
        {
          id: 'ocr-and-upload-checks',
          heading: 'OCR per documenti scansionati, e controlli su ogni caricamento',
          paragraphs: [
            'Un PDF scansionato senza livello di testo passa attraverso l’OCR prima di raggiungere un modello, e viene segnalato quando la confidenza di riconoscimento è bassa. Ogni caricamento viene scansionato antivirus, verificato rispetto al tipo di file dichiarato, controllato per nomi di file pericolosi, e rifiutato se un archivio si rivela una bomba di decompressione — i caricamenti contano contro i limiti di dimensione e archiviazione del piano, e i file vengono rimossi secondo una pianificazione di conservazione o eliminabili in qualsiasi momento.',
          ],
        },
        {
          id: 'generating-images-documents-and-research',
          heading: 'Generare immagini, documenti e ricerche citate',
          paragraphs: [
            'In uscita, ClawAI può produrre un’immagine da una descrizione, esportare qualsiasi risposta o un’intera conversazione come file formattato in PDF, DOCX, CSV, HTML, Markdown, TXT o JSON, ed eseguire un compito di ricerca che cerca sul web, recupera e legge pagine, e risponde con le fonti effettivamente usate. Generazione di immagini, generazione di file e ricerca sono ciascuna misurate separatamente (IMAGE, FILE_GENERATION, e i piani RESEARCH_MODE / WEB_SEARCH / WEB_FETCH / WEB_EXTRACT), distinte dall’uso di token della chat ordinaria. Vedi «come funziona la chiamata di strumenti AI» e «cosa sono gli output AI strutturati», entrambi collegati sotto, per il meccanismo dietro una forma di output definita.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quali tipi di file posso caricare?',
          answer:
            'PDF, DOCX, fogli di calcolo, CSV, JSON, Markdown, testo semplice, file di codice e immagini. Ogni modello riceve la forma che gestisce più affidabilmente, e il messaggio mostra quale forma ha effettivamente ricevuto ciascun modello.',
        },
        {
          question: 'ClawAI può leggere un documento scansionato senza livello di testo?',
          answer:
            'Sì — un PDF scansionato passa attraverso l’OCR prima di raggiungere un modello, e viene segnalato quando la confidenza di riconoscimento è bassa.',
        },
        {
          question: 'In quali formati posso esportare un documento?',
          answer:
            'PDF, DOCX, CSV, HTML, Markdown, TXT e JSON. L’esportazione di documenti è una superficie misurata distinta, separata dalla chat ordinaria e dall’uso di ricerca.',
        },
      ],
      productNote:
        'Caricamento, suddivisione, OCR e controlli sul caricamento in ingresso; generazione di immagini, esportazione di documenti e ricerche citate in uscita — funzionalità reali, distribuite e misurate separatamente, non un’unica modalità file mescolata.',
    },
    [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: {
      seo: {
        title: 'Osservabilità e trasparenza in ClawAI',
        description:
          'Come ClawAI mostra cosa consuma una richiesta — una dashboard di utilizzo, dettagli di instradamento per ogni risposta, un registro di audit e un avanzamento in diretta — così l’uso non è mai una scatola nera.',
        keywords: [
          'trasparenza dell’uso AI',
          'registro di audit dell’instradamento AI',
          'osservabilità dei costi AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Osservabilità e trasparenza',
      summary:
        'L’uso in ClawAI è misurato, attribuito e visibile invece che una scatola nera: una dashboard di utilizzo, dettagli di instradamento per ogni risposta, un registro di audit e un avanzamento in diretta mentre un modello lavora sono quattro elementi distinti e distribuiti dello stesso principio — vedi sempre cosa ha fatto una richiesta e quanto è costata.',
      sections: [
        {
          id: 'usage-dashboard-and-per-answer-detail',
          heading: 'La dashboard di utilizzo, e i dettagli di instradamento per ogni risposta',
          paragraphs: [
            'Una dashboard di utilizzo mostra il piano consumato oggi e questo mese, suddiviso per modello, con il saldo residuo nelle stesse unità in cui è quotato il piano. Sotto, ogni singola risposta riporta il modello che l’ha prodotta, perché è stato scelto, quanto tempo ci ha messo, quanti token ha usato, e cosa è costato sul piano — incluso quale modello è intervenuto se il provider originale è fallito a metà richiesta. Vedi «cos’è l’instradamento dei modelli AI» e «cos’è il fallback dei modelli», entrambi collegati sotto, per come viene presa quella decisione di instradamento.',
          ],
        },
        {
          id: 'the-audit-log',
          heading: 'Un registro di audit per accessi, cambi di piano e attività dei connettori',
          paragraphs: [
            'Accessi, cambi di piano, attività dei connettori, modifiche alla memoria e contenuti generati sono ciascuno registrati con una marca temporale e un attore, così la storia di un account è ricostruibile invece di essere visibile solo nel momento in cui accade. È la stessa traccia di audit a cui rimandano le pagine memoria e contesto e sicurezza e trattamento dei dati, collegate sotto, per le azioni che ciascuna di queste funzionalità vi scrive.',
          ],
        },
        {
          id: 'live-progress-and-limit-warnings',
          heading: 'Avanzamento in diretta mentre un modello lavora, e avvisi di limite chiari',
          paragraphs: [
            'Mentre un modello lavora vedi la fase in corso, il testo man mano che arriva, il suo ragionamento quando il modello lo espone, e contatori di token e tempo in diretta — mai un’attesa silenziosa. Quando una richiesta raggiunge un limite del piano, ClawAI indica quale limite, quanto resta sulle altre finestre e quando si azzera, invece di interrompere la richiesta senza spiegazioni.',
          ],
        },
      ],
      faq: [
        {
          question: 'Posso vedere quale modello ha risposto a un messaggio specifico, e perché?',
          answer:
            'Sì — ogni risposta registra il provider e il modello che l’ha prodotta, il ragionamento dietro la scelta di instradamento, la durata, i token usati, e quanto è costata sul tuo piano.',
        },
        {
          question: 'Cosa registra davvero il registro di audit?',
          answer:
            'Accessi, cambi di piano, attività dei connettori, modifiche alla memoria e contenuti generati, ciascuno con una marca temporale e un attore, così la storia dell’account è ricostruibile a posteriori.',
        },
        {
          question: 'Cosa succede quando raggiungo un limite di utilizzo?',
          answer:
            'ClawAI indica quale limite specifico è stato raggiunto, quanto piano resta sulle altre finestre di utilizzo, e quando il limite si azzera — nulla viene interrotto in silenzio.',
        },
      ],
      productNote:
        'Una dashboard di utilizzo, dettagli di instradamento per ogni risposta, un registro di audit e un avanzamento in diretta sono quattro elementi reali e distribuiti dello stesso principio: l’uso in ClawAI è misurato, attribuito e visibile, mai una scatola nera.',
    },
    [FeatureCapability.SECURITY_AND_DATA_HANDLING]: {
      seo: {
        title: 'Sicurezza e trattamento dei dati in ClawAI',
        description:
          'I meccanismi concreti dietro la sicurezza di account e dati di ClawAI — hashing delle password con Argon2, refresh token rotanti, RBAC, cifratura delle credenziali AES-256-GCM, TLS e isolamento dei servizi — descritti in modo semplice, senza dichiarazioni di conformità.',
        keywords: [
          'sicurezza della piattaforma AI',
          'cifratura delle credenziali AI',
          'controllo di accesso basato sui ruoli AI',
        ],
      },
      eyebrow: 'Funzionalità',
      title: 'Sicurezza e trattamento dei dati',
      summary:
        'Questa pagina descrive meccanismi che esistono oggi nel prodotto, in modo semplice, invece di una dichiarazione di conformità. Account, credenziali, trasporto e confini tra servizi hanno ciascuno un meccanismo concreto e verificabile dietro — e dove una richiesta deve restare su hardware che controlli invece di raggiungere un provider cloud, l’instradamento Local-Only e Privacy-First è la risposta a questo, non una certificazione di sicurezza.',
      sections: [
        {
          id: 'accounts-sessions-and-access-control',
          heading: 'Account, sessioni e accesso basato sui ruoli',
          paragraphs: [
            'Le password sono sottoposte a hashing con Argon2; i token di accesso hanno vita breve, e i refresh token ruotano a ogni utilizzo, così un token rubato è rilevabile. Ogni account porta un ruolo e un insieme di permessi esplicito, verificato nell’interfaccia e di nuovo su ogni endpoint del backend — un controllo di accesso basato sui ruoli applicato a entrambi i livelli, non solo dove l’interfaccia capita di mostrarlo.',
          ],
        },
        {
          id: 'credential-and-transport-encryption',
          heading: 'Cifratura delle credenziali e cifratura in transito',
          paragraphs: [
            'Le credenziali di provider e connettori sono cifrate a riposo con AES-256-GCM e non vengono mai restituite al browser. Il trasporto avviene in TLS dal browser al margine, e di nuovo in TLS tra ogni servizio interno, con certificati verificati a ogni salto — così una credenziale è protetta sia a riposo sia in movimento.',
          ],
        },
        {
          id: 'service-isolation-and-what-is-not-claimed',
          heading:
            'Isolamento dei servizi, limitazione della frequenza, e cosa non è dichiarato qui',
          paragraphs: [
            'Ogni servizio backend possiede il proprio database e non può leggere quello di un altro, così un guasto nella generazione di immagini non può raggiungere le tue conversazioni; limiti di frequenza per account proteggono sia il tuo piano sia la piattaforma da cicli fuori controllo. ClawAI non detiene oggi alcuna certificazione di conformità, e l’app ospitata invia richieste a provider di modelli terzi secondo i loro termini — dove questo non funziona per un’organizzazione, un deployment privato sulla tua rete, con soli modelli a pesi aperti, viene definito caso per caso; contattaci per discuterne. Per una richiesta che deve restare per default su hardware che controlli, vedi deployment privato e locale, collegato sotto.',
          ],
        },
      ],
      faq: [
        {
          question: 'Come sono protette le mie password e i token di accesso?',
          answer:
            'Le password sono sottoposte a hashing con Argon2. I token di accesso hanno vita breve, e i refresh token ruotano a ogni utilizzo, così un refresh token rubato è rilevabile invece di riutilizzabile in silenzio.',
        },
        {
          question: 'Come sono archiviate le mie credenziali degli strumenti connessi?',
          answer:
            'Le credenziali di provider e connettori sono cifrate a riposo con AES-256-GCM e non vengono mai restituite al browser, qualunque sia il connettore di spazio di lavoro coinvolto.',
        },
        {
          question: 'ClawAI detiene certificazioni di conformità di terze parti?',
          answer:
            'No — ClawAI non detiene oggi alcuna certificazione di conformità. Per un requisito che l’app ospitata non può soddisfare, un deployment privato sulla tua rete viene definito caso per caso; vedi il caso d’uso deployment locale e privato, collegato sotto.',
        },
      ],
      productNote:
        'Hashing delle password con Argon2, refresh token rotanti, RBAC verificato su ogni endpoint del backend, cifratura delle credenziali AES-256-GCM, TLS a ogni salto e isolamento dei database per servizio — meccanismi concreti, descritti in modo semplice, senza alcuna certificazione di conformità dichiarata.',
    },
  },
};
