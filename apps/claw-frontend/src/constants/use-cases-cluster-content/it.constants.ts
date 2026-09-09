import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCasesClusterDictionary } from '@/types/use-cases-cluster.types';

export const IT_USE_CASES_CLUSTER_CONTENT: UseCasesClusterDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Dove andare adesso',
    lastReviewed: 'Ultima revisione',
    backToHub: 'Tutti gli scenari d’uso',
    ctaTitle: 'Provalo invece di fidarti della nostra parola',
    ctaBody:
      'ClawAI instrada ogni conversazione verso il modello e gli strumenti più adatti al compito, tra tutti i provider a cui si collega, da un unico workspace.',
    startFree: 'Inizia con il piano gratuito',
    seeFeatures: 'Scopri cosa fa ClawAI',
  },
  hub: {
    tasksHeading: 'Approfondisci un compito specifico',
    tasksIntro:
      'Gli scenari sopra sono la versione breve. Ognuno dei sette compiti qui sotto è una pagina completa: cosa richiede davvero quel lavoro, quale funzionalità o modalità di routing di ClawAI se ne occupa, e dove verificare i dettagli di persona.',
    cardSummaries: {
      [UseCaseTask.CODING_AND_DEVELOPMENT]:
        'Scrivere, modificare e revisionare codice, con il coding agent per le modifiche su più passaggi.',
      [UseCaseTask.RESEARCH_AND_FACT_FINDING]:
        'Risposte basate su fonti che ClawAI ha effettivamente consultato, non solo sui dati di addestramento.',
      [UseCaseTask.WRITING_AND_EDITING]:
        'Redazione ed editing di testi lunghi che restano coerenti lungo tutto il documento.',
      [UseCaseTask.COMPARING_MODEL_ANSWERS]:
        'Eseguire lo stesso prompt su più modelli fianco a fianco, con un giudice che valuta il resto.',
      [UseCaseTask.WORKSPACE_AUTOMATION]:
        'Collegare gli strumenti che il tuo team già usa, così ClawAI può agire al loro interno.',
      [UseCaseTask.STRUCTURED_DATA_EXTRACTION]:
        'Trasformare testo o pagine disordinate in output strutturato che i tuoi sistemi possono usare.',
      [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]:
        'Mantenere una richiesta su hardware che controlli invece che su un provider cloud.',
    },
  },
  tasks: {
    [UseCaseTask.CODING_AND_DEVELOPMENT]: {
      seo: {
        title: 'Programmazione e sviluppo con ClawAI',
        description:
          'Come ClawAI supporta la programmazione — chatta con un modello per una correzione rapida, oppure affida una modifica su più passaggi al coding agent. Basato sul prodotto reale, nessun benchmark inventato.',
        keywords: [
          'AI per la programmazione',
          'caso d’uso del coding agent',
          'flusso di lavoro di pair programming con AI',
        ],
      },
      eyebrow: 'Caso d’uso',
      title: 'Programmazione e sviluppo',
      summary:
        'Il lavoro di programmazione in ClawAI si divide in due forme: una domanda rapida o una modifica a un singolo file, gestita in una chat normale, e una modifica su più passaggi — più file, un piano, una revisione — affidata al coding agent. Entrambe condividono lo stesso routing e lo stesso catalogo di provider sotto il cofano.',
      sections: [
        {
          id: 'quick-fixes-in-chat',
          heading: 'Correzioni rapide e domande, in una chat normale',
          paragraphs: [
            'Una modifica a un singolo file, la spiegazione di un errore o un breve refactoring sono un normale messaggio di chat di ClawAI come qualsiasi altro. Il router può inviarlo a un modello adatto al compito con il routing Auto o High Reasoning, oppure puoi fissare un modello specifico con la modalità Manual Model se sai già di quale ha bisogno un tipo di domanda ricorrente — consulta come scegliere un modello per programmazione, linkato più sotto, per capire cosa valutare.',
          ],
        },
        {
          id: 'multi-step-changes-with-the-coding-agent',
          heading: 'Modifiche su più passaggi con il coding agent',
          paragraphs: [
            'Per una modifica che coinvolge più file o passaggi — una funzionalità, una migrazione, un refactoring pianificato — il coding agent di ClawAI esegue un ciclo a turni sulla tua base di codice invece di rispondere in un solo messaggio, con un proprio consumo misurato separato dalla chat normale. Consulta la pagina del coding agent, linkata più sotto, per cosa fa e come si installa.',
          ],
        },
        {
          id: 'connecting-your-repository',
          heading: 'Collegare il repository su cui verte il lavoro',
          paragraphs: [
            'Il lavoro di programmazione spesso richiede di avere sotto controllo il repository stesso, non solo frammenti incollati — ClawAI si collega a GitHub, GitLab e Bitbucket come connettori del workspace, così una richiesta può fare riferimento al codice reale, alle issue o alle pull request su cui sta lavorando invece che a file copiati a mano. Consulta la pagina delle integrazioni, linkata più sotto, per l’elenco completo dei connettori.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI scrive codice per me automaticamente?',
          answer:
            'Per una modifica piccola e ben definita, un normale messaggio di chat spesso basta. Per una modifica su più passaggi che coinvolge più file, il coding agent esegue un ciclo a turni sulla tua base di codice invece di rispondere una sola volta — consulta la pagina del coding agent, linkata più sotto.',
        },
        {
          question: 'ClawAI può vedere il mio repository reale?',
          answer:
            'Sì, una volta collegato — ClawAI ha connettori del workspace per GitHub, GitLab e Bitbucket, così una richiesta di programmazione può fare riferimento a file, issue e pull request reali invece che a frammenti incollati.',
        },
        {
          question: 'Quale modello dovrei usare per programmare?',
          answer:
            'Questa pagina non ne indica uno — consulta come scegliere un modello per programmazione, linkato più sotto, per capire cosa valutare invece di seguire una classifica.',
        },
      ],
      productNote:
        'ClawAI instrada automaticamente una normale domanda di programmazione verso un modello adatto, e affida una modifica su più passaggi al coding agent — una funzionalità reale, già disponibile, con un proprio consumo misurato, non un trucco di chat.',
    },
    [UseCaseTask.RESEARCH_AND_FACT_FINDING]: {
      seo: {
        title: 'Ricerca e verifica dei fatti con ClawAI',
        description:
          'Come la modalità Research di ClawAI cerca, recupera ed estrae contenuto dal web così che una risposta citi fonti effettivamente consultate, fatturata separatamente dal credito modello.',
        keywords: [
          'assistente di ricerca AI',
          'verifica dei fatti con AI',
          'risposte AI con fonti',
        ],
      },
      eyebrow: 'Caso d’uso',
      title: 'Ricerca e verifica dei fatti',
      summary:
        'Un compito di ricerca richiede una risposta basata su fonti consultate proprio per quella domanda, non solo su ciò che un modello ha appreso durante l’addestramento. La modalità Research di ClawAI è una funzionalità reale, già disponibile, costruita esattamente per questo, con tre livelli di profondità e un consumo misurato separato dalla chat normale.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Cosa fa davvero la modalità Research',
          paragraphs: [
            'La modalità Research permette a una richiesta di cercare sul web, recuperare una pagina, oppure recuperare ed estrarre contenuto strutturato da essa, prima che ClawAI produca una risposta — così la risposta può citare fonti recuperate proprio per quella domanda invece di basarsi solo sui dati di addestramento. È una funzionalità legata al piano, con tre livelli di profondità: solo ricerca, ricerca più recupero, oppure ricerca più recupero ed estrazione.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Misurata separatamente dal tuo credito modello',
          paragraphs: [
            'L’accesso alla ricerca — ricerca web, recupero pagine ed estrazione — viene misurato come consumo a sé stante, separato dal budget di token su cui si basa un normale messaggio di chat. Il limite di ricerca del tuo piano e il suo limite di token per i modelli sono due voci distinte, non un’unica riserva condivisa, quindi eseguire una ricerca non intacca il credito che userebbe un compito di programmazione o scrittura.',
          ],
        },
        {
          id: 'picking-a-depth-for-the-question',
          heading: 'Scegliere una profondità adatta alla domanda',
          paragraphs: [
            'Una verifica rapida di un fatto di solito richiede solo la profondità di ricerca, senza altro; una domanda che dipende da ciò che dice davvero una pagina specifica richiede ricerca più recupero; estrarre dati strutturati da più pagine contemporaneamente è dove ricerca più recupero ed estrazione giustifica il suo costo. Far corrispondere la profondità alla domanda mantiene l’uso della ricerca proporzionato, invece di ricorrere sempre di default all’opzione più costosa.',
          ],
        },
      ],
      faq: [
        {
          question: 'La ricerca consuma il mio credito token per i modelli?',
          answer:
            'No. L’accesso alla ricerca — ricerca web, recupero pagine ed estrazione — viene misurato separatamente dal budget di token su cui si basa un normale messaggio di chat. Verifica entrambi i limiti nella pagina dei prezzi.',
        },
        {
          question: 'Qual è la differenza tra i tre livelli di profondità della modalità Research?',
          answer:
            'Solo ricerca restituisce i risultati di una ricerca web; ricerca più recupero recupera anche il contenuto della pagina; ricerca più recupero ed estrazione estrae inoltre contenuto strutturato da ciò che ha recuperato.',
        },
        {
          question: 'Il modello che scelgo conta per la qualità della ricerca?',
          answer:
            'Sì — la modalità Research cambia quali fonti un modello può vedere, non quanto bene le legge e le concilia tra loro. Consulta come scegliere un modello per la ricerca con fonti, linkato più sotto.',
        },
      ],
      productNote:
        'La modalità Research di ClawAI può cercare, recuperare e recuperare-ed-estrarre contenuto dal web prima che un modello risponda — una funzionalità reale, già disponibile, misurata separatamente dal tuo credito token per i modelli.',
    },
    [UseCaseTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Scrittura ed editing con ClawAI',
        description:
          'Come ClawAI supporta la redazione e l’editing di testi lunghi — context pack per il materiale di riferimento, memoria per uno stile ricorrente e routing verso un modello adatto.',
        keywords: [
          'assistente di scrittura AI',
          'flusso di editing con AI',
          'redazione di testi lunghi con AI',
        ],
      },
      eyebrow: 'Caso d’uso',
      title: 'Scrittura ed editing',
      summary:
        'Scrittura ed editing in ClawAI spaziano da una breve riscrittura a un documento lungo che deve restare coerente dalla prima all’ultima pagina. Due funzionalità reggono gran parte del peso quando un documento si allunga: i context pack per il materiale di riferimento e la memoria per uno stile che deve persistere tra una sessione e l’altra.',
      sections: [
        {
          id: 'reference-material-with-context-packs',
          heading: 'Tenere il materiale di riferimento sotto controllo con i context pack',
          paragraphs: [
            'Un brief di stile, bozze precedenti o materiale sorgente con cui un testo deve restare coerente sono prima di tutto un problema di contesto, non solo un problema di scrittura — i context pack di ClawAI sono una funzionalità legata al piano per tenere quel materiale disponibile a una conversazione invece di reincollarlo ogni sessione. Consulta cosa sono i context pack, linkato più sotto, per capire come funziona la funzionalità.',
          ],
        },
        {
          id: 'memory-for-a-recurring-voice',
          heading: 'Memoria per uno stile che deve persistere',
          paragraphs: [
            'Un compito di scrittura ricorrente — una newsletter, un report settimanale, uno stile di documentazione — trae vantaggio dal fatto che ClawAI ricordi le preferenze già stabilite tra una sessione e l’altra, invece di doverle ripetere ogni volta. La memoria è una funzionalità separata dai context pack, legata al piano: i context pack contengono il materiale di riferimento per un compito, la memoria contiene ciò che ClawAI ha appreso su come vuoi che le cose vengano scritte.',
          ],
        },
        {
          id: 'routing-a-writing-request',
          heading: 'Instradare una richiesta di scrittura o editing verso un modello adatto',
          paragraphs: [
            'Il router di ClawAI può inviare automaticamente una richiesta di scrittura o editing a un modello adatto con il routing Auto o Cost Saver, oppure puoi fissarne uno con la modalità Manual Model per un compito ricorrente con uno stile noto. Consulta come scegliere un modello per scrittura ed editing, linkato più sotto, per capire cosa valutare quando scegli deliberatamente.',
          ],
        },
      ],
      faq: [
        {
          question:
            'ClawAI può tenere un brief di stile sotto controllo per un’intera sessione di editing?',
          answer:
            'Sì — i context pack sono costruiti esattamente per questo, per tenere disponibile a una conversazione materiale di riferimento come un brief di stile o un documento sorgente invece di reincollarlo. Consulta cosa sono i context pack, linkato più sotto.',
        },
        {
          question: 'ClawAI ricorda come mi piace che le cose vengano scritte?',
          answer:
            'La memoria può far persistere le preferenze stabilite tra una sessione e l’altra per un compito di scrittura ricorrente, separatamente dai context pack, che contengono materiale di riferimento specifico per un compito invece di preferenze di lungo periodo.',
        },
        {
          question: 'Quale modello dovrei usare per scrivere?',
          answer:
            'Questa pagina non ne indica uno — consulta come scegliere un modello per scrittura ed editing, linkato più sotto, per capire cosa valutare invece di seguire una classifica.',
        },
      ],
      productNote:
        'ClawAI può tenere sotto controllo il materiale di riferimento con i context pack e ricordare uno stile ricorrente con la memoria — entrambe funzionalità reali, legate al piano, non trucchi di chat.',
    },
    [UseCaseTask.COMPARING_MODEL_ANSWERS]: {
      seo: {
        title: 'Confrontare le risposte dei modelli con ClawAI',
        description:
          'Come le modalità Compare e Judge di ClawAI eseguono un prompt su più modelli fianco a fianco e fanno valutare i risultati a un modello giudice — basato sulla funzionalità reale, nessuna classifica inventata.',
        keywords: [
          'confrontare le risposte dei modelli AI',
          'consenso tra modelli AI',
          'risposte AI best-of-N',
        ],
      },
      eyebrow: 'Caso d’uso',
      title: 'Confrontare le risposte dei modelli',
      summary:
        'A volte la mossa giusta non è scegliere un modello in anticipo, ma eseguire lo stesso prompt su più modelli e guardare cosa restituiscono. La modalità Compare di ClawAI fa esattamente questo, e la modalità Judge può far valutare i risultati a un modello separato invece di lasciarti leggere ogni risposta da solo.',
      sections: [
        {
          id: 'what-compare-mode-does',
          heading: 'Cosa fa la modalità Compare',
          paragraphs: [
            'La modalità Compare invia un prompt a più modelli contemporaneamente e mostra le risposte fianco a fianco, così una decisione che conta — una valutazione soggettiva, una richiesta ambigua, un caso in cui l’impostazione di un modello potrebbe essere sbagliata — riceve più di una prospettiva. È una funzionalità legata al piano, misurata per corsia anziché per esecuzione, quindi il costo cresce in base a quanti modelli confronti.',
          ],
        },
        {
          id: 'consensus-and-best-of-n',
          heading: 'Consenso e best-of-N, spiegati correttamente',
          paragraphs: [
            'Due idee descrivono cosa fare con più risposte una volta ottenute: il consenso, in cui l’accordo tra modelli è di per sé informativo, e il best-of-N, in cui generi più candidati e scegli o sintetizzi il migliore. Consulta cos’è il consenso AI e cos’è il best-of-N, entrambi linkati più sotto, per come funziona davvero ciascuno, senza toni pubblicitari.',
          ],
        },
        {
          id: 'judge-mode-and-critic-review',
          heading: 'Far giudicare le risposte a un modello',
          paragraphs: [
            'La modalità Judge è una funzionalità separata, legata al piano, che esegue un secondo passaggio su un’esecuzione di Compare, con un modello che valuta gli altri invece che tu legga ogni risposta a mano. La revisione critica è una funzionalità correlata, ma distinta, per un secondo sguardo su una singola risposta invece che un confronto tra modelli — consulta cos’è un giudice AI, linkato più sotto, per come funziona davvero la valutazione.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual è la differenza tra la modalità Compare e la modalità Judge?',
          answer:
            'La modalità Compare esegue un prompt su più modelli e mostra ogni risposta fianco a fianco. La modalità Judge è un secondo passaggio separato, legato al piano, che fa valutare a un modello i risultati di un’esecuzione di Compare invece che tu legga ognuna.',
        },
        {
          question: 'La modalità Compare costa più di un normale messaggio di chat?',
          answer:
            'L’uso di Compare è misurato per corsia, non per esecuzione — eseguire lo stesso prompt su più modelli costa proporzionalmente di più. Verifica il limite attuale nella pagina dei prezzi.',
        },
        {
          question: 'Cos’è il best-of-N, ed è lo stesso del consenso?',
          answer:
            'No — il consenso considera informativo di per sé l’accordo tra le risposte dei modelli, mentre il best-of-N genera più candidati e sceglie o sintetizza il migliore. Consulta cos’è il consenso AI e cos’è il best-of-N, entrambi linkati più sotto.',
        },
      ],
      productNote:
        'Le modalità Compare e Judge di ClawAI sono funzionalità reali, già disponibili e legate al piano — un prompt su più modelli, con un modello opzionale in più per valutare i risultati.',
    },
    [UseCaseTask.WORKSPACE_AUTOMATION]: {
      seo: {
        title: 'Automazione del workspace con ClawAI',
        description:
          'Come ClawAI si collega agli strumenti che un team già usa — GitHub, Slack, Jira, Google Drive e altri — così una richiesta può agire al loro interno, non solo parlarne.',
        keywords: [
          'automazione del workspace con AI',
          'connettori di strumenti AI',
          'collegare AI a Slack e Jira',
        ],
      },
      eyebrow: 'Caso d’uso',
      title: 'Automazione del workspace',
      summary:
        'Un connettore del workspace permette a una richiesta di ClawAI di leggere da uno strumento che il tuo team già usa, o di agire su di esso, invece che tu debba copiare informazioni avanti e indietro a mano. ClawAI ha oggi 14 connettori del workspace, che coprono hosting del codice, chat, gestione dei progetti, documenti e calendari.',
      sections: [
        {
          id: 'what-a-workspace-connector-is',
          heading: 'Cosa fa davvero un connettore del workspace',
          paragraphs: [
            'Un workspace collegato permette a una richiesta di fare riferimento a dati reali in quello strumento, o di agire su di essi — un ticket Jira, un thread Slack, un file in Google Drive — invece che tu li incolli nella conversazione. L’accesso al workspace è una funzionalità legata al piano, e le azioni dei connettori sono misurate come consumo a sé stante, separato dalla chat normale.',
          ],
        },
        {
          id: 'which-tools-connect',
          heading: 'A quali strumenti si collega ClawAI',
          paragraphs: [
            'I connettori di ClawAI coprono l’hosting del codice (GitHub, GitLab, Bitbucket), la messaggistica e la gestione dei progetti (Slack, Jira, Confluence, ClickUp), il design (Figma), documenti e archiviazione (Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive) e i calendari (Google Calendar, Outlook Calendar). Consulta la pagina delle integrazioni, linkata più sotto, per cosa fa ciascuno.',
          ],
        },
        {
          id: 'multi-model-review-and-handoff',
          heading: 'Revisione multi-modello e passaggio di consegne dentro un’azione del workspace',
          paragraphs: [
            'Un’azione sul workspace può coinvolgere più di una singola chiamata a un modello — un passaggio a catena o una consegna tra modelli, oppure una revisione multi-modello del risultato prima che venga eseguita, fa parte dello stesso consumo misurato invece di essere una funzionalità separata da attivare. È la stessa infrastruttura di routing usata nel resto di ClawAI, applicata alle azioni che toccano uno strumento collegato.',
          ],
        },
      ],
      faq: [
        {
          question: 'A quanti strumenti si collega ClawAI?',
          answer:
            'Quattordici connettori del workspace oggi, che coprono hosting del codice, messaggistica, gestione dei progetti, design, documenti, archiviazione e calendari. Consulta la pagina delle integrazioni, linkata più sotto, per l’elenco completo.',
        },
        {
          question: 'ClawAI può agire su uno strumento collegato, o solo leggerlo?',
          answer:
            'Le azioni sul workspace possono agire su uno strumento collegato, non solo leggerlo — i dettagli dipendono dal connettore e dal limite del workspace previsto dal tuo piano.',
        },
        {
          question: 'L’automazione del workspace è misurata separatamente dalla chat normale?',
          answer:
            'Sì — le azioni dei connettori sono misurate come consumo a sé stante, separato dal budget di token su cui si basa un normale messaggio di chat. Verifica il limite attuale nella pagina dei prezzi.',
        },
      ],
      productNote:
        'ClawAI si collega oggi a 14 strumenti del workspace — hosting del codice, messaggistica, gestione dei progetti, design, documenti e calendari — con un proprio consumo misurato per le azioni al loro interno.',
    },
    [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: {
      seo: {
        title: 'Estrazione di dati strutturati con ClawAI',
        description:
          'Come ClawAI trasforma testo e pagine non strutturati in output strutturato — chiamata di strumenti per uno schema definito, e la profondità di estrazione della modalità Research per le pagine web.',
        keywords: [
          'estrazione di dati strutturati con AI',
          'output JSON con AI',
          'estrarre dati da testo con AI',
        ],
      },
      eyebrow: 'Caso d’uso',
      title: 'Estrazione di dati strutturati',
      summary:
        'Trasformare testo disordinato, un documento o una pagina web in una struttura definita che i tuoi sistemi possono usare è un lavoro diverso dallo scrivere prosa — si appoggia alla chiamata di strumenti verso uno schema fisso e, quando la fonte è una pagina web, alla profondità di estrazione della modalità Research di ClawAI.',
      sections: [
        {
          id: 'tool-calling-for-a-defined-schema',
          heading: 'Chiamata di strumenti per uno schema di output definito',
          paragraphs: [
            'Quando una richiesta deve produrre un output in una forma specifica — un insieme fisso di campi, una struttura JSON definita — il meccanismo di chiamata di strumenti di ClawAI è ciò che lo rende affidabile, invece di sperare che una risposta in testo semplice venga interpretata correttamente. Consulta come funziona la chiamata di strumenti AI e cosa sono gli output AI strutturati, entrambi linkati più sotto, per come funziona davvero il meccanismo.',
          ],
        },
        {
          id: 'extracting-from-a-web-page',
          heading: 'Estrarre contenuto strutturato da una pagina web',
          paragraphs: [
            'Quando la fonte è una pagina web live invece di un testo che hai già, la profondità ricerca-più-recupero-ed-estrazione della modalità Research estrae contenuto strutturato da ciò che recupera, come parte della stessa funzionalità usata per la ricerca con fonti. Viene misurata come consumo di ricerca, separato dal budget di token su cui si basa un normale messaggio di chat.',
          ],
        },
        {
          id: 'file-generation-for-the-output',
          heading: 'Generare un file dal risultato estratto',
          paragraphs: [
            'Una volta estratti i dati, la generazione di documenti e file di ClawAI può trasformarli in un artefatto scaricabile invece di lasciare il risultato solo nella trascrizione della chat — un consumo misurato a sé stante, separato dalla chat normale e dalla ricerca.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI può garantire un output JSON valido?',
          answer:
            'La chiamata di strumenti verso uno schema definito è ciò che rende affidabile l’output strutturato, invece di interpretare una risposta in testo semplice dopo il fatto. Consulta come funziona la chiamata di strumenti AI, linkato più sotto, per il meccanismo.',
        },
        {
          question:
            'ClawAI può estrarre dati strutturati da una pagina web, non solo da testo che incollo?',
          answer:
            'Sì — la profondità ricerca-più-recupero-ed-estrazione della modalità Research estrae contenuto strutturato da una pagina web che recupera, misurata come consumo di ricerca separato dalla chat normale.',
        },
        {
          question:
            'Posso ottenere il risultato estratto come file invece che solo come testo in chat?',
          answer:
            'Sì — la generazione di documenti e file può trasformare un risultato estratto in un artefatto scaricabile, su un proprio consumo misurato.',
        },
      ],
      productNote:
        'La chiamata di strumenti di ClawAI verso uno schema definito, e la profondità di estrazione della modalità Research per le pagine web, sono funzionalità reali, già disponibili, dietro l’estrazione di dati strutturati — non un singolo trucco di prompt.',
    },
    [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: {
      seo: {
        title: 'Distribuzione privata e locale con ClawAI',
        description:
          'Come le modalità di routing Local-Only e Privacy-First di ClawAI mantengono una richiesta su hardware che controlli, usando i connettori Ollama e llama.cpp invece di un provider cloud.',
        keywords: [
          'distribuzione AI privata',
          'carichi di lavoro AI locali',
          'eseguire modelli AI sul proprio hardware',
        ],
      },
      eyebrow: 'Caso d’uso',
      title: 'Distribuzione privata e locale',
      summary:
        'Alcuni lavori devono restare su hardware che controlli, senza mai raggiungere un provider cloud. ClawAI ha connettori reali verso Ollama e llama.cpp proprio per questo, oltre a modalità di routing che mantengono una richiesta locale per policy, non per caso.',
      sections: [
        {
          id: 'what-local-deployment-changes',
          heading: 'Cosa cambia davvero eseguendo un modello in locale',
          paragraphs: [
            'Un provider cloud altrove nel catalogo di ClawAI esegue un modello sulla propria infrastruttura e addebita un costo per richiesta; Ollama e llama.cpp caricano invece un modello a pesi aperti su hardware che controlli, così la richiesta non lo lascia mai. Questo cambia chi può vedere la richiesta, non le capacità di un dato modello.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Le modalità di routing Local-Only e Privacy-First',
          paragraphs: [
            'Il routing Local-Only mantiene ogni richiesta su hardware che controlli, usando Ollama o llama.cpp anziché un provider cloud. Il routing Privacy-First è una modalità separata con priorità proprie; entrambe esistono perché non ogni carico di lavoro dovrebbe usare per default il routing Auto, e scegliere tra le due è una decisione deliberata, non un’impostazione da lasciare senza esame.',
          ],
        },
        {
          id: 'when-private-deployment-fits',
          heading: 'Quando un carico privato o locale è la scelta giusta',
          paragraphs: [
            'Un carico di lavoro privato o locale si definisce in base a dove viene eseguita la richiesta, non al tipo di compito — programmazione, scrittura o ricerca possono tutti essere eseguiti in questo modo se il requisito è che nulla lasci l’hardware che controlli. Consulta come scegliere un modello per carichi privati e locali e cos’è l’AI local-first, entrambi linkati più sotto, per i compromessi da valutare.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual è la differenza tra il routing Local-Only e Privacy-First?',
          answer:
            'Local-Only mantiene ogni richiesta su hardware che controlli tramite Ollama o llama.cpp; Privacy-First è una modalità di routing separata con priorità proprie. Entrambe esistono perché non ogni carico di lavoro dovrebbe usare per default il routing Auto.',
        },
        {
          question: 'Quale modello a pesi aperti dovrei eseguire in locale?',
          answer:
            'Questa pagina non ne consiglia uno — consulta cos’è l’AI local-first, linkato più sotto, per capire come ragionare sulla scelta, dato che il modello giusto dipende dal tuo hardware e dal tuo compito.',
        },
        {
          question: 'Posso eseguire qualsiasi tipo di compito in locale, o solo alcuni?',
          answer:
            'Un carico di lavoro privato o locale si definisce in base a dove viene eseguita la richiesta, non al compito — programmazione, scrittura o ricerca possono tutti essere eseguiti in questo modo se restare su hardware che controlli conta più di quale sia il compito.',
        },
      ],
      productNote:
        'Le modalità di routing Local-Only e Privacy-First di ClawAI mantengono una richiesta su hardware che controlli tramite i connettori Ollama e llama.cpp — connettori reali, già disponibili, non una voce di roadmap.',
    },
  },
};
