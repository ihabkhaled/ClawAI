import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const IT_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Dove proseguire',
    lastReviewed: 'Ultima verifica',
    backToHub: 'Tutte le integrazioni',
    ctaTitle: 'Collegalo e verificalo di persona',
    ctaBody:
      'Ogni connettore è disponibile su tutti i piani a pagamento. Collegalo dalle impostazioni del tuo spazio di lavoro.',
    startFree: 'Inizia con il piano gratuito',
    seeFeatures: 'Guarda cosa fa ClawAI',
    capabilitiesHeading: 'Cosa può fare questo connettore',
    readLabel: 'ClawAI può leggere',
    writeLabel: 'ClawAI può scrivere',
    syncLabel: 'Sincronizzazione',
    realTimeLabel: 'Si aggiorna in tempo reale',
    pollBasedLabel: 'Si sincronizza a intervalli, non in tempo reale',
  },
  hub: {
    seo: {
      title: 'Integrazioni: collega ClawAI ai tuoi strumenti',
      description:
        'ClawAI si collega a 14 strumenti di lavoro — GitHub, Slack, Jira, Google Drive, Gmail e altri ancora — così una conversazione può leggere il tuo lavoro e agire su di esso, non solo parlarne.',
      keywords: [
        'integrazioni ClawAI',
        'connettori IA per il lavoro',
        'integrazioni di strumenti IA',
      ],
    },
    eyebrow: 'Integrazioni',
    title: 'Collega ClawAI agli strumenti che usi già',
    summary:
      'Ogni connettore qui sotto è reale e già disponibile, non una voce di roadmap — cosa può leggere, cosa può scrivere e se si aggiorna in tempo reale o a intervalli: tutto viene dallo stesso registro su cui gira il prodotto.',
    topicsHeading: 'Scegli un connettore',
    cardSummaries: {
      [IntegrationTopic.GITHUB]:
        'Repository, issue, pull request — leggi, commenta, revisiona, approva.',
      [IntegrationTopic.GITLAB]:
        'Progetti, merge request, issue — commenta, approva, suggerisci modifiche.',
      [IntegrationTopic.BITBUCKET]: 'Repository e pull request — commenta, approva, apri issue.',
      [IntegrationTopic.SLACK]:
        'Canali e messaggi — leggi il contesto, invia e rispondi ai messaggi.',
      [IntegrationTopic.JIRA]: 'Issue e progetti — crea ticket, aggiornali, commenta.',
      [IntegrationTopic.CONFLUENCE]:
        'Pagine e spazi — leggi la documentazione, crea e modifica pagine.',
      [IntegrationTopic.CLICKUP]: 'Task, spazi, cartelle — crea, aggiorna e commenta i task.',
      [IntegrationTopic.FIGMA]:
        'File e commenti — leggi i design, pubblica commenti, passa il testimone a Jira.',
      [IntegrationTopic.GOOGLE_DRIVE]:
        'File e cartelle — leggi documenti e fogli di calcolo, carica e sposta i file.',
      [IntegrationTopic.GMAIL]:
        'Thread e messaggi — leggi le email, invia, rispondi e scrivi bozze.',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]:
        'Siti, documenti, elenchi — leggi e carica documenti, gestisci gli elementi degli elenchi.',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]: 'File e cartelle — leggi, carica e sposta i file.',
      [IntegrationTopic.GOOGLE_CALENDAR]:
        'Riunioni ed eventi — leggi il tuo calendario, crea eventi.',
      [IntegrationTopic.OUTLOOK_CALENDAR]:
        'Riunioni ed eventi — leggi il tuo calendario, crea eventi.',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'Integrazione IA con GitHub — ClawAI',
        description:
          'Collega GitHub a ClawAI per leggere repository, issue e pull request, e per scrivere descrizioni di PR, commentare, suggerire modifiche e approvare — direttamente da una conversazione.',
        keywords: [
          'integrazione IA GitHub',
          'revisione codice IA GitHub',
          'chatta con repository GitHub',
        ],
      },
      eyebrow: 'Hosting di codice',
      title: 'GitHub',
      summary:
        'Collega un account o un’organizzazione GitHub perché ClawAI possa leggere i tuoi repository, issue e pull request, e agire su di essi — scrivendo descrizioni, lasciando commenti, suggerendo modifiche e approvando le revisioni — direttamente da una conversazione.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'Una volta collegato, ClawAI può leggere il contenuto dei repository, le issue, le pull request e i commenti. Gli aggiornamenti in tempo reale sono supportati — un webhook avvisa ClawAI quando qualcosa cambia invece di aspettare un polling — e la sincronizzazione differenziale fa sì che rileggere un repository grande non significhi rileggerlo da zero ogni volta.',
            'Sul fronte della scrittura, ClawAI può creare una issue, commentare una issue, scrivere la descrizione di una pull request, commentare una pull request, suggerire una modifica di codice specifica e approvare una pull request. Ogni scrittura avviene come azione esplicita che rivedi, non in silenzio in background.',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: 'Come si inserisce rispetto al Coding Agent',
          paragraphs: [
            'Il connettore GitHub e il Coding Agent risolvono problemi collegati ma diversi. Il Coding Agent lavora dentro il tuo editor su un repository scaricato in locale. Il connettore GitHub lavora dentro una conversazione di ClawAI sui dati ospitati da GitHub — issue, pull request e commenti di revisione — senza che nessuno debba avere il repository aperto in locale.',
            'Uno schema comune: usa il connettore per il triage delle issue e per scrivere descrizioni di PR dalla chat, e passa al Coding Agent quando il lavoro consiste davvero nello scrivere ed eseguire codice.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Come lo colleghi',
          paragraphs: [
            'GitHub supporta OAuth (l’opzione predefinita — accedi con GitHub e concedi un accesso limitato) oppure un token di accesso personale, per account e automazioni che preferiscono un token. GitHub Enterprise è supportato puntando il connettore all’URL API della tua istanza invece che a github.com.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI può commentare automaticamente le mie pull request?',
          answer:
            'Può lasciare un commento quando glielo chiedi — revisionando un diff e pubblicando un riscontro, oppure approvando quando è soddisfatto. Non commenta senza che tu glielo chieda: ogni scrittura è un’azione che richiedi tu.',
        },
        {
          question: 'Funziona con i repository privati?',
          answer:
            'Sì, in base all’accesso che concedi durante il collegamento. ClawAI vede solo ciò che può vedere l’account o il token collegato.',
        },
        {
          question: 'Questo sostituisce il Coding Agent?',
          answer:
            'No — coprono ambiti diversi. Il connettore raggiunge dalla chat le issue e le pull request ospitate da GitHub; il Coding Agent lavora sul codice che hai scaricato in locale, nel tuo editor.',
        },
      ],
      productNote:
        'Il connettore GitHub è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI, e ogni azione di scrittura che compie è una che hai richiesto tu.',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'Integrazione IA con GitLab — ClawAI',
        description:
          'Collega GitLab a ClawAI per leggere progetti, merge request e issue, e per commentare, suggerire modifiche, aggiornare descrizioni e approvare — direttamente da una conversazione.',
        keywords: [
          'integrazione IA GitLab',
          'revisione IA delle merge request',
          'assistente IA per GitLab',
        ],
      },
      eyebrow: 'Hosting di codice',
      title: 'GitLab',
      summary:
        'Collega un account GitLab o un’istanza self-managed perché ClawAI possa leggere i tuoi progetti, merge request e issue, e agire su di essi da una conversazione — commentando, suggerendo modifiche, aggiornando descrizioni e approvando.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere progetti, issue, merge request e commenti, con aggiornamenti in tempo reale tramite webhook. La sincronizzazione è una rilettura completa a ogni esecuzione, non una sincronizzazione differenziale — una differenza che pesa di più sui progetti molto grandi che su quelli piccoli.',
            'Sul fronte della scrittura: commentare una merge request, approvarla, aggiornarne la descrizione, suggerire una modifica di codice specifica, aggiungere un commento in linea su un’immagine, creare una issue e commentare una issue. Ognuna è un’azione esplicita che richiedi tu.',
          ],
        },
        {
          id: 'self-managed',
          heading: 'GitLab self-managed',
          paragraphs: [
            'Il connettore non è limitato a gitlab.com — puntandolo all’URL della tua istanza durante la configurazione, colleghi ClawAI a un GitLab self-managed nello stesso modo in cui lo colleghi al servizio ospitato.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Come lo colleghi',
          paragraphs: [
            'GitLab supporta OAuth o un token di accesso personale. Entrambi sono limitati a ciò che concedi durante il collegamento — ClawAI non ha mai un accesso più ampio di quanto permetta il token o la concessione OAuth.',
          ],
        },
      ],
      faq: [
        {
          question: 'Funziona con GitLab self-managed?',
          answer:
            'Sì — imposta l’URL dell’istanza durante il collegamento, e ClawAI parlerà con la tua installazione di GitLab invece che con gitlab.com.',
        },
        {
          question: 'Può suggerire vere modifiche di codice, non solo commenti?',
          answer:
            'Sì, tramite l’azione di modifica suggerita, che pubblica sulla merge request un suggerimento di diff specifico e applicabile invece di un semplice commento testuale.',
        },
        {
          question: 'La sincronizzazione delle merge request avviene in tempo reale?',
          answer:
            'Sì — il connettore supporta i webhook, quindi ClawAI viene avvisato dei cambiamenti invece di doverli richiedere con un polling.',
        },
      ],
      productNote:
        'GitLab è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI, ciascuno con le proprie capacità di lettura e scrittura documentate sulla propria pagina.',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'Integrazione IA con Bitbucket — ClawAI',
        description:
          'Collega Bitbucket Cloud a ClawAI per leggere repository e pull request, e per commentare, approvare e aprire issue — direttamente da una conversazione.',
        keywords: [
          'integrazione IA Bitbucket',
          'assistente IA per Bitbucket',
          'ricerca IA nei repository di codice',
        ],
      },
      eyebrow: 'Hosting di codice',
      title: 'Bitbucket',
      summary:
        'Collega un account Bitbucket Cloud perché ClawAI possa leggere i tuoi repository e le tue pull request, e agire su di essi — commentando, approvando e aprendo issue — da una conversazione.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere repository e pull request, con supporto per aggiornamenti in tempo reale via webhook. La sincronizzazione è una rilettura completa a ogni esecuzione, non una sincronizzazione differenziale incrementale.',
            'Sul fronte della scrittura: commentare una pull request, approvare una pull request e creare una issue. Ognuna è un’azione esplicita, non qualcosa che ClawAI fa di propria iniziativa.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Come lo colleghi',
          paragraphs: [
            'Bitbucket si collega tramite OAuth — accedi con il tuo account Atlassian e concedi un accesso limitato agli spazi di lavoro e ai repository che scegli.',
          ],
        },
      ],
      faq: [
        {
          question: 'Bitbucket Server o Data Center sono supportati?',
          answer:
            'Il connettore è pensato per Bitbucket Cloud. Bitbucket Server o Data Center self-hosted non sono al momento supportati.',
        },
        {
          question: 'Può approvare una pull request al posto mio?',
          answer:
            'Può farlo, quando glielo chiedi dopo aver revisionato il diff — l’approvazione è un’azione esplicita che richiedi tu, non un passaggio automatico.',
        },
      ],
      productNote:
        'Bitbucket è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI.',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'Integrazione IA con Slack — ClawAI',
        description:
          'Collega Slack a ClawAI per cercare tra canali e messaggi, e per inviare e rispondere ai messaggi — così una conversazione può agire su ciò di cui discute il tuo team.',
        keywords: [
          'assistente IA per Slack',
          'ricerca IA nei messaggi Slack',
          'integrazione IA Slack',
        ],
      },
      eyebrow: 'Comunicazione',
      title: 'Slack',
      summary:
        'Collega uno spazio di lavoro Slack perché ClawAI possa leggere canali, messaggi e utenti, e inviare o rispondere ai messaggi per tuo conto — trasformando una ricerca tra thread sparsi in una domanda che fai una sola volta.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere messaggi, canali e utenti, con aggiornamenti in tempo reale tramite i webhook di evento di Slack — i nuovi messaggi sono visibili non appena arrivano, invece che al prossimo polling.',
            'Sul fronte della scrittura: inviare un messaggio a un canale e rispondere all’interno di un thread. Entrambe richiedono una tua richiesta esplicita; ClawAI non pubblica mai su Slack di propria iniziativa.',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: 'A cosa serve davvero',
          paragraphs: [
            'Ritrovare una decisione sepolta in un thread di tre settimane fa, riassumere la discussione di un canale prima di una riunione, o scrivere una risposta che richiama il contesto di più messaggi — il tipo di ricerca che la casella di ricerca di Slack gestisce male, perché fa corrispondere le parole chiave, non il significato.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI può leggere i canali privati?',
          answer:
            'Solo i canali di cui l’account collegato è membro e a cui concede l’accesso durante il collegamento — ClawAI non vede mai di uno spazio di lavoro più di quanto possa vedere l’utente che lo ha collegato.',
        },
        {
          question: 'Pubblicherà su Slack senza che io glielo chieda?',
          answer:
            'No. Inviare o rispondere a un messaggio è sempre un’azione esplicita che richiedi tu nella conversazione.',
        },
      ],
      productNote:
        'Slack è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI, con aggiornamenti in tempo reale via webhook.',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'Integrazione IA con Jira — ClawAI',
        description:
          'Collega Jira a ClawAI per leggere issue e progetti, e per creare ticket, aggiornarli e commentarli — trasformando anche un commento di Figma direttamente in un ticket.',
        keywords: ['assistente IA per Jira', 'IA per i ticket Jira', 'integrazione IA Jira'],
      },
      eyebrow: 'Gestione progetti',
      title: 'Jira',
      summary:
        'Collega un sito Atlassian Jira perché ClawAI possa leggere issue, ticket, progetti e commenti, e agire su di essi — creando e aggiornando ticket, commentando e trasformando direttamente un commento di design su Figma in un ticket Jira o in una user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere issue, ticket, progetti e commenti, con aggiornamenti in tempo reale via webhook.',
            'Sul fronte della scrittura: creare un ticket, creare un ticket direttamente da un commento di Figma, scrivere una user story a partire da un file Figma, aggiornare una issue e commentare un ticket. Le azioni da Figma a Jira sono le più distintive — chiudono il cerchio tra una revisione di design e un elemento di lavoro tracciato senza dover riscrivere nulla.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Come lo colleghi',
          paragraphs: [
            'Jira supporta OAuth oppure l’autenticazione di base con un token API, insieme all’URL del tuo sito Jira. L’autenticazione di base è adatta agli account di servizio e alle automazioni che non devono passare per un flusso OAuth interattivo.',
          ],
        },
      ],
      faq: [
        {
          question: 'Può creare automaticamente un ticket Jira a partire da un commento di Figma?',
          answer:
            'Può farlo, quando glielo chiedi — l’azione legge il commento di Figma e crea in un solo passaggio il ticket Jira o la bozza di user story corrispondente, invece di farti copiare i dettagli a mano tra i due strumenti.',
        },
        {
          question: 'Funziona con Jira Server, o solo con Jira Cloud?',
          answer:
            'Il connettore è pensato per la REST API cloud di Jira di Atlassian. Un’istanza self-hosted di Jira Server non è al momento supportata.',
        },
      ],
      productNote:
        'Jira è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI, e si abbina direttamente al connettore Figma per il passaggio dal design al ticket.',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'Integrazione IA con Confluence — ClawAI',
        description:
          'Collega Confluence a ClawAI per leggere pagine, spazi e commenti, e per creare e modificare pagine — così la documentazione resta a portata di una conversazione.',
        keywords: [
          'assistente IA per Confluence',
          'integrazione IA Confluence',
          'ricerca IA nella documentazione',
        ],
      },
      eyebrow: 'Documentazione',
      title: 'Confluence',
      summary:
        'Collega un sito Atlassian Confluence perché ClawAI possa leggere pagine, spazi e commenti, e creare o modificare pagine direttamente — trasformando una ricerca nella documentazione in una domanda e un aggiornamento della documentazione in una richiesta.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere pagine, commenti e i progetti (spazi) che li organizzano. Questo connettore non supporta aggiornamenti in tempo reale via webhook — la sincronizzazione avviene su richiesta e non tramite notifica push, quindi una pagina modificata pochi istanti fa potrebbe non riflettersi fino alla sincronizzazione successiva.',
            'Sul fronte della scrittura: creare una pagina e modificare una pagina esistente. Entrambe sono azioni esplicite.',
          ],
        },
      ],
      faq: [
        {
          question: 'La sincronizzazione di Confluence avviene in tempo reale?',
          answer:
            'No — a differenza di GitHub o Slack, Confluence non invia aggiornamenti a ClawAI tramite push. I contenuti vengono sincronizzati su richiesta, non nel momento in cui cambiano.',
        },
        {
          question: 'Può scrivere la documentazione al posto mio, non solo leggerla?',
          answer:
            'Sì — creare e modificare pagine sono entrambe azioni di scrittura supportate, ciascuna una richiesta esplicita che fai tu.',
        },
      ],
      productNote:
        'Confluence è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI.',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'Integrazione IA con Figma — ClawAI',
        description:
          'Collega Figma a ClawAI per leggere file e commenti, pubblicare commenti e passare un commento di design direttamente a Jira come ticket o user story.',
        keywords: [
          'assistente IA per Figma',
          'integrazione IA Figma',
          'automazione da Figma a Jira',
        ],
      },
      eyebrow: 'Design',
      title: 'Figma',
      summary:
        'Collega un account Figma perché ClawAI possa leggere file e commenti, pubblicare un proprio commento e — abbinato al connettore Jira — trasformare direttamente un commento di design in un ticket tracciato o in una bozza di user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere i file di Figma e i loro commenti, con aggiornamenti in tempo reale via webhook. Sul fronte della scrittura, può pubblicare un commento su un file.',
            'La leva principale di Figma in ClawAI viene dall’abbinamento con Jira: un commento su un design può diventare un ticket Jira o una bozza di user story senza che nessuno debba riscrivere il contesto a mano — per le azioni specifiche, vedi la pagina dell’integrazione Jira.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI può leggere il design vero e proprio, non solo i commenti?',
          answer:
            'Può leggere il contenuto dei file e i commenti tramite l’API di Figma. Quanto possa riassumere in modo significativo sul design visivo dipende dal file — commenti e struttura sono la fonte più affidabile.',
        },
        {
          question: 'Mi serve anche il connettore Jira per il flusso da Figma al ticket?',
          answer:
            'Sì — le azioni da Figma a Jira risiedono nel connettore Jira e richiedono che entrambi i collegamenti siano attivi.',
        },
      ],
      productNote:
        'Figma è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI, ed è più utile se abbinato a Jira.',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'Integrazione IA con ClickUp — ClawAI',
        description:
          'Collega ClickUp a ClawAI per leggere task, spazi e cartelle, e per creare, aggiornare e commentare i task — direttamente da una conversazione.',
        keywords: ['assistente IA per ClickUp', 'integrazione IA ClickUp', 'gestione IA dei task'],
      },
      eyebrow: 'Gestione progetti',
      title: 'ClickUp',
      summary:
        'Collega uno spazio di lavoro ClickUp perché ClawAI possa leggere task, spazi e cartelle, e creare, aggiornare o commentare i task direttamente da una conversazione.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere task, spazi, cartelle e commenti. Questo connettore al momento non supporta aggiornamenti in tempo reale via webhook — la consegna del webhook sottostante non può essere verificata come autentica, quindi la sincronizzazione avviene su richiesta e non tramite push.',
            'Sul fronte della scrittura: creare un task, aggiornare un task e commentare un task.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClickUp si aggiorna in tempo reale?',
          answer:
            'No — la sincronizzazione avviene su richiesta e non tramite una notifica push in tempo reale. Trattalo come Confluence o Google Drive: aggiornato all’ultima sincronizzazione, non in diretta.',
        },
        {
          question: 'Può spostare un task tra gli stati?',
          answer:
            'Gli aggiornamenti dei task coprono i cambi di stato e di campo su un task esistente; l’insieme esatto dei campi aggiornabili dipende da come è configurato il tuo spazio di lavoro ClickUp.',
        },
      ],
      productNote:
        'ClickUp è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI. La sincronizzazione è programmata, non in tempo reale.',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'Integrazione IA con Google Drive — ClawAI',
        description:
          'Collega Google Drive a ClawAI per leggere documenti e fogli di calcolo, e per caricare e spostare file — con supporto alla sincronizzazione di ciò che è cambiato.',
        keywords: [
          'assistente IA per Google Drive',
          'ricerca IA nei documenti',
          'integrazione IA Google Drive',
        ],
      },
      eyebrow: 'File',
      title: 'Google Drive',
      summary:
        'Collega un account Google Drive perché ClawAI possa leggere file, documenti e fogli di calcolo, e caricare o spostare file — con sincronizzazione differenziale, così risincronizzare un Drive grande non significa rileggere tutto ogni volta.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere file, documenti e fogli di calcolo. Questo connettore supporta la sincronizzazione differenziale — dopo la prima lettura completa, le sincronizzazioni successive recuperano solo ciò che è realmente cambiato, il che conta quando un Drive arriva a contenere migliaia di file. Al momento non supporta aggiornamenti in tempo reale via webhook; la sincronizzazione avviene su richiesta.',
            'Sul fronte della scrittura: caricare un file e spostare un file tra cartelle.',
          ],
        },
      ],
      faq: [
        {
          question: 'Collegare Drive dà a ClawAI accesso a tutto ciò che contiene?',
          answer:
            'Solo a ciò a cui l’account Google collegato concede l’accesso durante OAuth — di norma limitato ai file che l’account può già aprire, non una concessione estesa a tutta l’organizzazione.',
        },
        {
          question: 'Risincronizzare un Drive grande sarà lento ogni volta?',
          answer:
            'La prima sincronizzazione legge ciò che le serve; la sincronizzazione differenziale fa sì che quelle successive recuperino solo i cambiamenti, quindi non rallenta man mano che il Drive cresce, una volta completata la sincronizzazione iniziale.',
        },
      ],
      productNote:
        'Google Drive è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI, con sincronizzazione differenziale per le raccolte di grandi dimensioni.',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'Integrazione IA con Gmail — ClawAI',
        description:
          'Collega Gmail a ClawAI per leggere thread e messaggi, e per inviare, rispondere e scrivere bozze di email — direttamente da una conversazione.',
        keywords: [
          'assistente IA per Gmail',
          'integrazione IA per le email',
          'integrazione IA Gmail',
        ],
      },
      eyebrow: 'Email',
      title: 'Gmail',
      summary:
        'Collega un account Gmail perché ClawAI possa leggere thread, messaggi ed etichette, e inviare, rispondere o scrivere bozze di email direttamente da una conversazione — con sincronizzazione differenziale, così non rilegge tutta la tua casella a ogni controllo.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere thread, messaggi ed etichette delle email, con sincronizzazione differenziale. Al momento non supporta le notifiche push in tempo reale per la nuova posta — la sincronizzazione avviene su richiesta.',
            'Sul fronte della scrittura: inviare una nuova email, rispondere a un thread esistente e creare una bozza senza inviarla — utile quando vuoi che ClawAI prepari una risposta da rivedere prima che parta.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI invierà email senza la mia approvazione?',
          answer:
            'No. L’invio è un’azione esplicita; l’azione di bozza esiste apposta per i casi in cui vuoi rivedere il contenuto prima che parta.',
        },
        {
          question: 'Controlla la mia posta in arrivo continuamente?',
          answer:
            'Si sincronizza su richiesta e non tramite una connessione push in tempo reale, quindi la nuova posta è visibile a partire dall’ultima sincronizzazione, non all’istante.',
        },
      ],
      productNote: 'Gmail è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'Integrazione IA con SharePoint — ClawAI',
        description:
          'Collega Microsoft SharePoint a ClawAI per leggere documenti ed elenchi del sito, e per caricare documenti e gestire gli elementi degli elenchi — da una conversazione.',
        keywords: [
          'assistente IA per SharePoint',
          'integrazione IA SharePoint',
          'ricerca IA nei documenti Microsoft',
        ],
      },
      eyebrow: 'File',
      title: 'Microsoft SharePoint',
      summary:
        'Collega un sito Microsoft SharePoint perché ClawAI possa leggere documenti, file ed elenchi del sito, e caricare documenti o gestire gli elementi degli elenchi direttamente da una conversazione.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere documenti, file e gli elenchi che organizzano un sito SharePoint. La sincronizzazione avviene su richiesta e non tramite una connessione push in tempo reale.',
            'Sul fronte della scrittura: caricare un documento, creare un elemento di elenco e aggiornare un elemento di elenco esistente.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Come lo colleghi',
          paragraphs: [
            'SharePoint richiede l’ID tenant Microsoft insieme a OAuth, così il connettore sa a quale SharePoint di quale organizzazione rivolgersi.',
          ],
        },
      ],
      faq: [
        {
          question: 'Serve il mio ID tenant Microsoft 365?',
          answer:
            'Sì — SharePoint è legato al tenant, quindi il connettore ha bisogno del tuo ID tenant per sapere a quale SharePoint di quale organizzazione collegarsi.',
        },
        {
          question: 'I contenuti si aggiornano in tempo reale?',
          answer:
            'No — la sincronizzazione avviene su richiesta, non tramite una notifica push in tempo reale.',
        },
      ],
      productNote:
        'SharePoint è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'Integrazione IA con OneDrive — ClawAI',
        description:
          'Collega Microsoft OneDrive a ClawAI per leggere file e documenti, e per caricare e spostare file — con supporto alla sincronizzazione di ciò che è cambiato.',
        keywords: [
          'assistente IA per OneDrive',
          'integrazione IA OneDrive',
          'ricerca IA nei file Microsoft',
        ],
      },
      eyebrow: 'File',
      title: 'Microsoft OneDrive',
      summary:
        'Collega un account Microsoft OneDrive perché ClawAI possa leggere file e documenti, e caricare o spostare file direttamente da una conversazione — con sincronizzazione differenziale per le raccolte di grandi dimensioni.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere file e documenti, con sincronizzazione differenziale — dopo la prima lettura completa, le sincronizzazioni successive recuperano solo ciò che è cambiato. Le notifiche push in tempo reale al momento non sono supportate; la sincronizzazione avviene su richiesta.',
            'Sul fronte della scrittura: caricare un file e spostare un file tra cartelle.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Come lo colleghi',
          paragraphs: [
            'OneDrive richiede il tuo ID tenant Microsoft insieme a OAuth, esattamente come SharePoint.',
          ],
        },
      ],
      faq: [
        {
          question: 'Serve il mio ID tenant Microsoft 365?',
          answer: 'Sì, allo stesso modo di SharePoint — OneDrive for Business è legato al tenant.',
        },
        {
          question: 'Un OneDrive grande è lento da mantenere sincronizzato?',
          answer:
            'La prima sincronizzazione è quella più onerosa; la sincronizzazione differenziale fa sì che quelle successive recuperino solo ciò che è realmente cambiato.',
        },
      ],
      productNote:
        'OneDrive è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI, con sincronizzazione differenziale per le raccolte di grandi dimensioni.',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'Integrazione IA con Google Calendar — ClawAI',
        description:
          'Collega Google Calendar a ClawAI per leggere riunioni ed eventi, e per creare un evento in calendario — direttamente da una conversazione.',
        keywords: [
          'assistente IA per Google Calendar',
          'integrazione IA Google Calendar',
          'pianificazione IA delle riunioni',
        ],
      },
      eyebrow: 'Calendario',
      title: 'Google Calendar',
      summary:
        'Collega un Google Calendar perché ClawAI possa leggere le tue riunioni ed eventi, e creare un nuovo evento in calendario direttamente da una conversazione, con sincronizzazione differenziale così controllare la tua agenda resta veloce.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere riunioni ed eventi, con sincronizzazione differenziale. Le notifiche push in tempo reale al momento non sono supportate.',
            'Sul fronte della scrittura, il connettore supporta al momento una sola azione: creare un evento in calendario. Riprogrammare, eliminare o rispondere a un invito esistente non sono ancora azioni di scrittura supportate — questa pagina verrà aggiornata se la situazione cambierà.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI può riprogrammare una riunione esistente al posto mio?',
          answer:
            'Non ancora — il connettore al momento supporta solo la creazione di un nuovo evento, non la modifica o la riprogrammazione di uno esistente.',
        },
        {
          question: 'Vede tutto il mio calendario, compresi gli altri calendari a cui ho accesso?',
          answer:
            'L’accesso è limitato a ciò che concedi durante il collegamento, di norma il tuo calendario principale, a meno che tu non lo estenda esplicitamente.',
        },
      ],
      productNote:
        'Google Calendar è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI. La sua azione di scrittura è al momento limitata alla creazione di eventi.',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'Integrazione IA con Outlook Calendar — ClawAI',
        description:
          'Collega Outlook Calendar a ClawAI per leggere riunioni ed eventi, e per creare un evento in calendario — direttamente da una conversazione.',
        keywords: [
          'assistente IA per Outlook Calendar',
          'integrazione IA Outlook',
          'pianificazione IA delle riunioni Microsoft',
        ],
      },
      eyebrow: 'Calendario',
      title: 'Outlook Calendar',
      summary:
        'Collega un Microsoft Outlook Calendar perché ClawAI possa leggere le tue riunioni ed eventi, e creare un nuovo evento in calendario direttamente da una conversazione.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Cosa copre il connettore',
          paragraphs: [
            'ClawAI può leggere riunioni ed eventi. Questo connettore al momento non supporta la sincronizzazione differenziale né le notifiche push in tempo reale — ogni sincronizzazione legge ciò che le serve su richiesta.',
            'Sul fronte della scrittura, il connettore supporta al momento una sola azione: creare un evento in calendario. Riprogrammare, eliminare o rispondere a un invito esistente non sono ancora supportati.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Come lo colleghi',
          paragraphs: [
            'Outlook Calendar supporta OAuth con un ID tenant facoltativo — lascialo vuoto per usare l’endpoint multi-tenant di Microsoft, oppure impostalo per una specifica organizzazione.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI può riprogrammare una riunione esistente al posto mio?',
          answer: 'Non ancora — al momento è supportata solo la creazione di un nuovo evento.',
        },
        {
          question: 'Devo impostare un ID tenant?',
          answer:
            'Solo se vuoi che il connettore sia limitato a una specifica organizzazione Microsoft. Lasciandolo vuoto viene usato l’endpoint multi-tenant, che funziona per la maggior parte degli account personali e organizzativi.',
        },
      ],
      productNote:
        'Outlook Calendar è uno dei {connectorCount} connettori per lo spazio di lavoro di ClawAI. La sua azione di scrittura è al momento limitata alla creazione di eventi.',
    },
  },
};
