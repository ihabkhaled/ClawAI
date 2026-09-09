import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PromptGuideDictionary } from '@/types/prompt-guide.types';

export const IT_PROMPT_GUIDE_CONTENT: PromptGuideDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Dove andare dopo',
    lastReviewed: 'Ultima revisione',
    backToHub: 'Tutte le guide sui prompt',
    ctaTitle: 'Fai pratica su una conversazione reale',
    ctaBody:
      'ClawAI ti offre uno spazio di lavoro unico per provare un prompt su modelli di ogni provider a cui si connette, così puoi vedere di persona cosa cambia.',
    startFree: 'Inizia con il piano gratuito',
    seeFeatures: 'Scopri cosa fa ClawAI',
  },
  hub: {
    seo: {
      title: 'Come scrivere prompt AI migliori',
      description:
        'Guide pratiche e oneste per scrivere prompt che ottengono risultati migliori — chiarezza, esempi, ragionamento passo per passo, output strutturato, prompt di sistema e come correggere una risposta sbagliata. Nessuna statistica inventata, nessuna promessa eccessiva su cosa un prompt può risolvere.',
      keywords: [
        'come scrivere prompt AI',
        'guida alla scrittura dei prompt',
        'basi del prompt engineering',
      ],
    },
    eyebrow: 'Guide sui prompt',
    title: 'Come scrivere prompt AI migliori',
    summary:
      "Un prompt è l'istruzione che dai a un modello, e il modo in cui lo scrivi cambia la risposta che ottieni — questo vale qualunque modello o prodotto tu usi. Queste guide illustrano le tecniche che aiutano davvero: essere specifici, fornire esempi, chiedere un ragionamento passo per passo, descrivere il formato di output desiderato e correggere una risposta che ha mancato l'obiettivo. Nessuna di queste rende un modello corretto né garantisce un risultato; rendono più probabile ottenere ciò che intendevi chiedere.",
    topicsHeading: 'Scegli una guida',
    cardSummaries: {
      [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: 'Le basi: contesto, vincoli, formato ed esempi.',
      [PromptGuideTopic.FEW_SHOT_PROMPTING]: 'Mostrare a un modello cosa vuoi fornendogli esempi.',
      [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]:
        'Chiedere a un modello di ragionare per passaggi prima di rispondere.',
      [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]:
        "Scrivere il prompt che richiede JSON, una tabella o un'altra forma fissa.",
      [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]:
        'Cosa fa diversamente un prompt di sistema rispetto a ciò che digiti in chat.',
      [PromptGuideTopic.ITERATING_ON_A_PROMPT]:
        'Cosa cambiare quando la prima risposta non è giusta.',
      [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]:
        "Come cambia l'approccio giusto tra codice, scrittura e analisi.",
    },
  },
  topics: {
    [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: {
      seo: {
        title: 'Come scrivere un prompt AI chiaro e specifico',
        description:
          'Le basi di un prompt che ottiene una risposta utile: dare contesto, dichiarare i vincoli, indicare il formato desiderato e aggiungere un esempio. Guida pratica, nessuna statistica inventata.',
        keywords: [
          'come scrivere un prompt chiaro',
          'basi del prompt AI',
          'scrittura di prompt specifici',
        ],
      },
      eyebrow: 'Guide sui prompt',
      title: 'Come scrivere un prompt AI chiaro e specifico',
      summary:
        'La maggior parte delle risposte deludenti si riconduce a un prompt che ha omesso qualcosa che il modello non poteva indovinare — il pubblico, i vincoli, il formato o come si presenta un risultato "buono". Questa guida illustra le quattro cose che vale la pena aggiungere prima di inviare un prompt, all\'incirca nell\'ordine in cui contano.',
      sections: [
        {
          id: 'give-context',
          heading: 'Fornisci al modello il contesto che non può indovinare',
          paragraphs: [
            'Un modello risponde in base a ciò che è nella conversazione più ciò che ha appreso durante l\'addestramento — non sa per chi stai scrivendo, cosa hai già provato o perché il compito conta, a meno che tu non lo dica. "Riscrivi questa email" e "riscrivi questa email in modo che un cliente già frustrato la legga come una scusa, non come una giustificazione" sono lo stesso compito con una quantità diversa di contesto, e ottengono risposte diverse. Il contesto non deve essere lungo; deve includere il fatto o i due fatti che cambierebbero il modo in cui una persona svolgerebbe il compito.',
          ],
        },
        {
          id: 'state-constraints',
          heading: 'Dichiara i vincoli invece di sperare che siano impliciti',
          paragraphs: [
            'Un limite di lunghezza, un livello di lettura, un tono, una cosa da evitare di menzionare, una scadenza che la risposta deve rispettare — un modello applica un vincolo se lo dichiari, altrimenti ricade su un valore predefinito generico che potrebbe non adattarsi. "Mantienilo sotto le 150 parole" ed "evita il gergo tecnico" sono entrambi vincoli che un modello può seguire in modo affidabile una volta resi espliciti; nessuno dei due è qualcosa che deduce correttamente da solo con una qualche coerenza.',
          ],
        },
        {
          id: 'name-the-format',
          heading: 'Indica il formato di output che vuoi davvero',
          paragraphs: [
            "Un elenco puntato, un breve paragrafo, una tabella, una riga dell'oggetto più un corpo — chiedere in anticipo la forma desiderata evita un messaggio successivo che chiede una riformattazione. Questo conta di più, non di meno, quando l'output deve essere elaborato da qualcosa di diverso da una persona che legge; per questo caso, vedi come richiedere un output strutturato, linkato di seguito, che è la guida di approfondimento correlata a questo punto.",
          ],
        },
        {
          id: 'add-an-example',
          heading: 'Aggiungi un esempio quando una sola descrizione sarebbe ambigua',
          paragraphs: [
            "Alcune cose sono più facili da mostrare che da descrivere — uno stile aziendale, un tono, un formato specifico per un compito ricorrente. Un esempio ben scelto spesso risolve un'ambiguità che diverse frasi di descrizione non risolverebbero. Vedi il prompting few-shot, linkato di seguito, per come usare più di un esempio in modo deliberato, e quando vale la pena la lunghezza extra nel prompt.",
          ],
        },
      ],
      faq: [
        {
          question: 'Un prompt più lungo ottiene sempre una risposta migliore?',
          answer:
            'No — un prompt più lungo aiuta solo se la lunghezza extra è contesto, un vincolo o un esempio che al modello mancherebbe altrimenti. Riempire un prompt con istruzioni ripetute o riempitivi non migliora la risposta e può seppellire la parte che contava.',
        },
        {
          question: 'Un prompt chiaro impedirà a un modello di sbagliare i fatti?',
          answer:
            "No. Un prompt chiaro rende più probabile che il modello capisca cosa gli stai chiedendo, ma non verifica i fatti né elimina le allucinazioni — vedi perché l'AI ha allucinazioni, linkato di seguito, per cosa causa davvero questo fenomeno e perché il solo prompting non può risolverlo.",
        },
        {
          question: 'Qual è la cosa singola più utile da aggiungere a un prompt vago?',
          answer:
            "Di solito il contesto: il fatto o i due fatti sul pubblico, l'obiettivo o la situazione di cui una persona avrebbe bisogno per svolgere bene il compito. Anche un vincolo o un esempio aiutano, ma contano meno se il modello ancora non sa per chi è la risposta.",
        },
      ],
      productNote:
        'ClawAI non riscrive il prompt per te, ma un prompt più chiaro va più lontano con qualsiasi modello a cui ti instradi — incluso tramite il routing Auto, che risponde comunque in base a ciò che hai effettivamente chiesto.',
    },
    [PromptGuideTopic.FEW_SHOT_PROMPTING]: {
      seo: {
        title: 'Prompting few-shot: fornire esempi a un modello',
        description:
          'Come usare uno o più esempi in un prompt per mostrare a un modello lo schema desiderato, anziché limitarsi a descriverlo — con indicazioni su quanti esempi aiutano e quando lo zero-shot è sufficiente.',
        keywords: ['prompting few-shot', 'esempi nel prompt', 'one-shot vs few-shot prompting'],
      },
      eyebrow: 'Guide sui prompt',
      title: 'Prompting few-shot: fornire esempi a un modello',
      summary:
        'Il prompting few-shot consiste nell\'includere uno o più esempi svolti direttamente nel prompt, così il modello può seguire lo schema anziché dedurlo da una sola descrizione. È uno dei modi più affidabili per definire cosa significhi "buono" per un compito più facile da mostrare che da spiegare.',
      sections: [
        {
          id: 'what-few-shot-means',
          heading: 'Cosa significano "few-shot" e "zero-shot"',
          paragraphs: [
            "Un prompt zero-shot chiede un risultato senza alcun esempio incluso; un prompt one-shot ne include esattamente uno; un prompt few-shot ne include diversi. I termini descrivono quanti esempi sono nel prompt, non un'affermazione sull'accuratezza — un prompt zero-shot ben scritto può superare un prompt few-shot mal scelto, poiché gli esempi aiutano solo se rappresentano davvero ciò che vuoi.",
          ],
        },
        {
          id: 'when-examples-help-most',
          heading: 'Quando gli esempi aiutano più di una descrizione più lunga',
          paragraphs: [
            "Gli esempi si guadagnano il loro posto quando il compito ha un formato, un tono o uno schema che è genuinamente più facile da dimostrare che da descrivere — etichettare dati in categorie difficili da definire a parole, replicare una voce di scrittura specifica, o seguire un modello con particolarità che una semplice descrizione trascurerebbe. Per un compito già inequivocabile a partire da un'istruzione breve, un esempio aggiunge lunghezza senza aggiungere informazione.",
          ],
        },
        {
          id: 'choosing-good-examples',
          heading: 'Cosa rende un esempio utile, non solo presente',
          paragraphs: [
            'Un esempio vale quanto è rappresentativo del compito reale — un esempio facile o insolito può insegnare lo schema sbagliato. Un paio di esempi ben scelti che coprano la gamma di casi che ti aspetti davvero, incluso un caso limite se è probabile, tende a funzionare meglio di diversi esempi che si assomigliano tutti. Se i tuoi esempi non concordano tra loro nel tono o nel formato, aspettati che il modello li fonda invece di scegliere quello che intendevi.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quanti esempi dovrebbe includere un prompt few-shot?',
          answer:
            'Non esiste un numero fisso — abbastanza da coprire la gamma di casi che ti aspetti, spesso da due a cinque, e di più solo se il compito varia genuinamente oltre quel range. Aggiungere esempi che si assomigliano tutti raramente aiuta oltre il primo o il secondo.',
        },
        {
          question: 'Il prompting few-shot è sempre migliore dello zero-shot?',
          answer:
            'No. Non è pubblicato come un guadagno di accuratezza garantito e questa pagina non lo affermerà — un prompt zero-shot chiaro su un compito ben definito può funzionare altrettanto bene, e gli esempi aiutano soprattutto quando il compito è più facile da mostrare che da descrivere.',
        },
        {
          question: "Posso combinare esempi few-shot con un'istruzione passo per passo?",
          answer:
            'Sì — affrontano cose diverse. Gli esempi mostrano lo schema o il formato desiderato; chiedere un ragionamento passo per passo cambia il modo in cui il modello arriva alla risposta. Vedi il prompting a catena di pensiero, linkato di seguito, per la seconda tecnica.',
        },
      ],
      productNote:
        "Un prompt few-shot funziona allo stesso modo su ogni modello a cui ClawAI si instrada — gli esempi vivono nel tuo prompt, non in un'impostazione, quindi viaggiano con la conversazione a prescindere da quale provider risponde.",
    },
    [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]: {
      seo: {
        title: 'Prompting a catena di pensiero: chiedere a un modello di ragionare passo per passo',
        description:
          "Cos'è il prompting a catena di pensiero, quando chiedere a un modello di lavorare per passaggi prima di rispondere aiuta davvero, e perché non garantisce un risultato corretto.",
        keywords: [
          'prompting a catena di pensiero',
          'prompting passo per passo',
          'tecnica di prompt per il ragionamento AI',
        ],
      },
      eyebrow: 'Guide sui prompt',
      title: 'Prompting a catena di pensiero: chiedere a un modello di ragionare passo per passo',
      summary:
        'Il prompting a catena di pensiero chiede a un modello di lavorare su un problema per passaggi — scomponendolo, verificando i risultati intermedi — prima di dare una risposta finale, invece di produrre subito una risposta di primo tentativo. È una tecnica reale e utile per il giusto tipo di compito, e non garantisce da sola un ragionamento corretto.',
      sections: [
        {
          id: 'what-it-is',
          heading: 'Cosa fa davvero chiedere un ragionamento passo per passo',
          paragraphs: [
            'Un prompt come "lavora su questo passo per passo" o "mostra il tuo ragionamento prima di dare una risposta finale" chiede al modello di esporre i passaggi intermedi invece di saltare direttamente a una conclusione. Per un problema con più passaggi, questo può far emergere un errore in un passaggio intermedio che altrimenti resterebbe sepolto dentro un\'unica risposta finale dal tono sicuro — e ti offre qualcosa di concreto da verificare, non solo un risultato da credere sulla fiducia.',
          ],
        },
        {
          id: 'when-it-helps',
          heading: 'Quando aiuta e quando è superfluo',
          paragraphs: [
            'Il prompting passo per passo tende ad aiutare di più su problemi con diversi passaggi dipendenti tra loro, diversi vincoli da soddisfare contemporaneamente, o un calcolo che vale la pena ricontrollare — un problema a più parti, una decisione con diversi fattori, un ragionamento logico che deve reggere nel suo insieme. Una domanda breve e a un solo passaggio raramente ne trae beneficio, e chiederlo comunque aggiunge solo lunghezza senza cambiare la risposta. Vedi come scegliere un modello per il ragionamento complesso, linkato di seguito, per come questo si collega alla scelta di un modello costruito proprio per questo tipo di compito.',
          ],
        },
        {
          id: 'what-it-does-not-guarantee',
          heading: 'Cosa non garantisce',
          paragraphs: [
            "Chiedere a un modello di ragionare passo per passo non garantisce una risposta corretta, e una catena di passaggi sicura e ben strutturata può comunque arrivare alla conclusione sbagliata — i passaggi extra rendono un errore più facile da individuare, non impossibile da commettere. Questo è coerente con perché l'AI ha allucinazioni, linkato di seguito: un modello può produrre un ragionamento fluente e verosimile che è comunque sbagliato, quindi una risposta passo per passo vale la pena verificarla su tutto ciò che conta, non prenderla per fede solo perché sembra metodica.",
          ],
        },
      ],
      faq: [
        {
          question: 'Il prompting a catena di pensiero garantisce una risposta corretta?',
          answer:
            "No — non garantisce un ragionamento corretto, e una risposta passo per passo può comunque arrivare a una conclusione sbagliata. Tende a rendere un errore più facile da individuare nei passaggi intermedi, il che è diverso dal prevenire l'errore.",
        },
        {
          question: 'Quando dovrei chiedere a un modello di mostrare il suo ragionamento?',
          answer:
            "Su problemi con diversi passaggi o vincoli dipendenti tra loro, dove un errore intermedio resterebbe altrimenti nascosto dentro un'unica risposta finale. Una domanda breve e a un solo passaggio raramente ne ha bisogno.",
        },
        {
          question: 'È la stessa cosa che usare un modello orientato al ragionamento?',
          answer:
            'Correlato ma non identico — questa guida riguarda come formuli un prompt per qualsiasi modello; scegliere un modello per il ragionamento complesso, linkato di seguito, riguarda quale modello è costruito per lavorare per passaggi di default. I due possono essere combinati.',
        },
      ],
      productNote:
        'La modalità di routing High Reasoning di ClawAI favorisce un modello adatto a lavorare su un problema per passaggi, il che si abbina naturalmente a un prompt passo per passo — ma la tecnica descritta in questa pagina funziona con qualsiasi modello a cui ti instradi.',
    },
    [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]: {
      seo: {
        title: 'Come scrivere un prompt che richiede un output strutturato',
        description:
          'Guida pratica per scrivere un prompt che richiede in modo affidabile JSON, una tabella o un altro formato fisso — il complemento a cosa sono gli output AI strutturati e perché il solo prompting non garantisce una struttura valida.',
        keywords: [
          'prompt per output JSON',
          'prompting per output strutturato',
          "come chiedere una tabella all'AI",
        ],
      },
      eyebrow: 'Guide sui prompt',
      title: 'Come scrivere un prompt che richiede un output strutturato',
      summary:
        'Questa guida è il complemento pratico, il "come scrivere il prompt", a cosa sono gli output AI strutturati, linkato di seguito, che copre il meccanismo tecnico — questa pagina presuppone che tu voglia già un output strutturato e si concentra su come chiederlo bene. Non rispiega il meccanismo sottostante e resta coerente con ciò che quella pagina già dice su cosa un semplice prompt può e non può garantire.',
      sections: [
        {
          id: 'describe-the-shape-exactly',
          heading: 'Descrivi esattamente la forma che vuoi, non solo il nome del formato',
          paragraphs: [
            'Dire "restituiscilo come JSON" è un inizio, ma nominare i campi, il loro ordine e i loro tipi è ciò che rimuove davvero l\'ambiguità — "restituisci un oggetto JSON con un campo stringa chiamato title e un campo array chiamato steps, dove ogni step è una stringa" lascia molto meno da indovinare al modello rispetto a "restituisci JSON con il title e gli steps." Lo stesso vale per una tabella: nomina le colonne e cosa appartiene a ciascuna invece di supporre che il modello scelga la stessa suddivisione che hai in mente.',
          ],
        },
        {
          id: 'show-an-example-of-the-shape',
          heading: 'Mostra un esempio della forma esatta di output desiderata',
          paragraphs: [
            'Un singolo esempio della forma finita — un breve campione di oggetto JSON, o una riga della tabella — spesso rimuove più ambiguità di un altro paragrafo di descrizione, per la stessa ragione per cui un esempio aiuta nel prompting few-shot, linkato di seguito. Questo conta soprattutto quando il formato ha una particolarità facile da descrivere in modo impreciso, come se un campo sia opzionale o come debba essere rappresentato un valore mancante.',
          ],
        },
        {
          id: 'plain-prompting-has-limits',
          heading: 'Cosa non garantisce qui un prompt ben scritto',
          paragraphs: [
            'Un prompt scritto con cura rende più probabile un output valido e ben formato, ma non lo garantisce — un modello può comunque restituire JSON malformato, un campo extra, o del testo che avvolge la struttura richiesta, specialmente su una risposta più lunga o complessa. Vedi cosa sono gli output AI strutturati, linkato di seguito, per i meccanismi tecnici — come la generazione vincolata da schema — che esistono proprio perché il solo prompting non è una garanzia affidabile, e per cosa fa ClawAI in modo diverso dal semplice chiedere gentilmente in un prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Chiedere gentilmente in un prompt basta a garantire un JSON valido?',
          answer:
            'No — un prompt ben scritto lo rende più probabile, non certo. Vedi cosa sono gli output AI strutturati, linkato di seguito, per i meccanismi che esistono perché il solo prompting non garantisce in modo affidabile una struttura valida.',
        },
        {
          question: 'Dovrei descrivere il formato o mostrare un esempio?',
          answer:
            'Entrambi, quando il formato presenta una qualche ambiguità — una descrizione precisa dei campi più un esempio della forma finita copre più casi di uno solo dei due. Vedi il prompting few-shot, linkato di seguito, per come scegliere un buon esempio.',
        },
        {
          question: 'Qual è la differenza tra questa guida e cosa sono gli output AI strutturati?',
          answer:
            "Quella pagina spiega il meccanismo tecnico dietro un output strutturato affidabile; questa pagina è il complemento pratico — come scrivere il prompt stesso. Sono pensate per essere lette insieme, non come duplicati l'una dell'altra.",
        },
      ],
      productNote:
        'Per output che deve essere affidabilmente valido, i meccanismi di output strutturato di ClawAI (vedi cosa sono gli output AI strutturati, linkato di seguito) vanno oltre la sola formulazione del prompt — questa guida copre la metà relativa alla scrittura del prompt di quel quadro.',
    },
    [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]: {
      seo: {
        title: 'Prompt di sistema vs prompt utente: cosa fa ciascuno',
        description:
          'La differenza tra un prompt di sistema e i messaggi che digiti in una conversazione — a cosa serve ciascuno, quando usare quale, e come lavorano insieme.',
        keywords: [
          'prompt di sistema vs prompt utente',
          "cos'è un prompt di sistema",
          'ruoli dei prompt AI spiegati',
        ],
      },
      eyebrow: 'Guide sui prompt',
      title: 'Prompt di sistema vs prompt utente: cosa fa ciascuno',
      summary:
        "Una conversazione con un modello è di solito costruita con più di un tipo di messaggio: un prompt di sistema che imposta istruzioni permanenti per l'intera conversazione, e prompt utente — ciò che digiti realmente — che chiedono qualcosa di specifico al suo interno. Sapere quale usare per una data istruzione evita di ripeterti e mantiene una conversazione lunga più coerente.",
      sections: [
        {
          id: 'what-a-system-prompt-is-for',
          heading: 'A cosa serve un prompt di sistema',
          paragraphs: [
            'Un prompt di sistema imposta un\'istruzione che si applica all\'intera conversazione piuttosto che a un solo messaggio — una persona da mantenere, un tono da tenere, una regola da seguire sempre ("rispondi sempre in inglese formale" o "non suggerire mai un dosaggio specifico"). Viene impostato una volta, tipicamente prima che la conversazione inizi, e un modello lo tratta come una guida permanente piuttosto che qualcosa da negoziare a ogni nuovo messaggio.',
          ],
        },
        {
          id: 'what-a-user-prompt-is-for',
          heading: 'A cosa serve un prompt utente',
          paragraphs: [
            "Un prompt utente è ciò che digiti a ogni turno della conversazione — la domanda o il compito specifico per quel messaggio. È dove si applica per lo più l'indicazione su contesto, vincoli, formato ed esempi della guida su come scrivere prompt chiari, dato che un prompt utente riguarda di solito una cosa concreta piuttosto che una regola permanente per l'intera conversazione.",
          ],
        },
        {
          id: 'when-to-use-which',
          heading: "Quando mettere un'istruzione nel prompt di sistema invece di ripeterla",
          paragraphs: [
            "Un'istruzione che dovrebbe valere per ogni messaggio — un tono, una persona, un confine — appartiene al prompt di sistema, così non la ripeti a ogni turno rischiando che venga persa o contraddetta a metà di una conversazione lunga. Una richiesta occasionale che si applica solo al messaggio corrente appartiene al prompt utente. Un prompt di sistema non è di per sé un confine di sicurezza; vedi cos'è il prompt injection, linkato di seguito, per capire perché un'istruzione in entrambi i luoghi può comunque essere sovrascritta da contenuto avversario altrove nella conversazione.",
          ],
        },
      ],
      faq: [
        {
          question: 'Un messaggio utente può sovrascrivere un prompt di sistema?',
          answer:
            "Dipende da come lo gestisce un prodotto specifico, e questa non è una garanzia consolidata in generale — un prompt di sistema è pensato come guida permanente, non come regola infrangibile. Vedi cos'è il prompt injection, linkato di seguito, per capire perché trattarlo come un confine di sicurezza assoluto è un errore.",
        },
        {
          question: 'Mi serve un prompt di sistema per una domanda semplice e occasionale?',
          answer:
            "No — un prompt di sistema si guadagna il suo posto quando un'istruzione dovrebbe applicarsi a un'intera conversazione. Per una singola domanda, mettere tutto nel prompt utente è più semplice e altrettanto efficace.",
        },
        {
          question:
            'Che tipo di istruzione appartiene a un prompt di sistema piuttosto che a un prompt utente?',
          answer:
            'Una regola permanente che non dovrebbe aver bisogno di essere ripetuta — una persona, un tono, un confine che il modello dovrebbe sempre rispettare. Una richiesta specifica e una tantum appartiene invece al prompt utente.',
        },
      ],
      productNote:
        "L'impostazione del prompt di sistema di ClawAI si applica a un'intera conversazione allo stesso modo su ogni provider a cui si instrada, quindi un'istruzione permanente non deve essere riscritta per ogni modello.",
    },
    [PromptGuideTopic.ITERATING_ON_A_PROMPT]: {
      seo: {
        title: 'Cosa fare quando la prima risposta AI non è giusta',
        description:
          'Un approccio pratico per correggere un prompt che non ha ottenuto la risposta desiderata — diagnosticare cosa mancava invece di limitarsi a ripetere la richiesta, e quando ricominciare da capo invece di rattoppare.',
        keywords: [
          'migliorare un prompt AI',
          'correggere una risposta AI sbagliata',
          'debug dei prompt AI',
        ],
      },
      eyebrow: 'Guide sui prompt',
      title: 'Cosa fare quando la prima risposta AI non è giusta',
      summary:
        "La prima risposta a un prompt raramente è l'ultima parola — la maggior parte delle persone ottiene un risultato migliore trattando una risposta deludente come informazione su cosa mancava al prompt, per poi correggerla, invece di ripetere la stessa richiesta sperando in qualcosa di diverso. Questa guida illustra come diagnosticare una risposta sbagliata e decidere cosa cambiare.",
      sections: [
        {
          id: 'diagnose-before-you-rewrite',
          heading: "Diagnostica cosa è andato storto prima di riscrivere l'intero prompt",
          paragraphs: [
            "Una risposta deludente di solito rientra in una di poche categorie: ha mancato un contesto che avevi ma non hai dichiarato, ha ignorato un vincolo, ha usato il formato sbagliato, oppure è sicura di sé ma sbagliata su un fatto. Individuare quale sia il caso indica una correzione specifica — un vincolo mancante richiede di aggiungerlo esplicitamente, non di riscrivere l'intero prompt da zero o di ripeterlo con più insistenza.",
          ],
        },
        {
          id: 'add-what-was-missing',
          heading: 'Aggiungi la cosa specifica che mancava, non istruzioni generiche in più',
          paragraphs: [
            "Una volta capito cosa mancava, aggiungi esattamente quello: il vincolo, l'esempio, l'elemento di contesto o la descrizione del formato che avrebbe reso chiara la richiesta. Vedi come scrivere un prompt chiaro e specifico, linkato di seguito, per le basi su cui questo passaggio di solito si fonda — la maggior parte dell'iterazione consiste nell'applicare la stessa manciata di cose che il primo prompt aveva omesso.",
          ],
        },
        {
          id: 'know-when-to-start-over',
          heading: 'Sappi quando iniziare un prompt nuovo invece di rattoppare',
          paragraphs: [
            "Un lungo botta e risposta di piccole correzioni può lasciare una conversazione che porta istruzioni contraddittorie che il modello sta ora cercando di conciliare — a quel punto, un prompt nuovo e completo che dichiara tutto ciò che hai imparato di dover specificare è spesso più veloce e affidabile di un'ulteriore rattoppatura. Vale la pena ricordarlo anche quando la risposta è sicura di sé ma sbagliata su un fatto piuttosto che semplicemente fuori formato: rattoppare la formulazione non lo risolverà, perché non è un problema di formulazione — vedi perché l'AI ha allucinazioni, linkato di seguito, per cosa sta succedendo davvero in quel caso.",
          ],
        },
      ],
      faq: [
        {
          question:
            'La risposta è ben scritta ma fattualmente sbagliata — come correggo il prompt?',
          answer:
            "Nella maggior parte dei casi non puoi risolverlo riformulando il prompt, perché non è un problema di formulazione. Vedi perché l'AI ha allucinazioni, linkato di seguito, per cosa sta succedendo davvero e cosa aiuta effettivamente, come chiedere al modello di citare fonti verificabili o usare una modalità di ricerca che consulta informazioni esterne.",
        },
        {
          question:
            'Dovrei continuare a correggere nella stessa conversazione o iniziarne una nuova?',
          answer:
            "Entrambe le strade possono funzionare, ma una lunga catena di piccole correzioni rischia di lasciare istruzioni contraddittorie. Se una conversazione ha già avuto diverse correzioni, un prompt nuovo e completo è spesso più affidabile di un'ulteriore rattoppatura.",
        },
        {
          question: 'Quante volte dovrei provare prima di rinunciare a un approccio di prompt?',
          answer:
            'Non esiste un numero fisso — ma se due o tre correzioni specifiche e diagnosticate non hanno aiutato, il problema potrebbe non essere affatto il prompt. Vedi come scegliere un modello per il tuo compito, linkato di seguito, per capire se il compito potrebbe aver bisogno di un tipo di modello diverso.',
        },
      ],
      productNote:
        "Ogni conversazione in ClawAI conserva la sua cronologia, quindi puoi iterare su un prompt attraverso più turni e vedere esattamente cosa è cambiato da una risposta all'altra.",
    },
    [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]: {
      seo: {
        title: 'Come cambia il prompting tra codice, scrittura e analisi',
        description:
          "Come cambia l'approccio giusto al prompting tra compiti di codifica, compiti di scrittura e compiti analitici — e come questo si collega alla scelta del modello giusto per ciascuno, non solo alle parole giuste.",
        keywords: [
          'prompting per codice vs scrittura',
          'prompt AI per tipo di compito',
          'prompting per compiti di analisi',
        ],
      },
      eyebrow: 'Guide sui prompt',
      title: 'Come cambia il prompting tra codice, scrittura e analisi',
      summary:
        "Le tecniche di questo hub — chiarezza, esempi, ragionamento passo per passo, formato — si applicano ovunque, ma quali contano di più cambia con il tipo di compito. Questa guida illustra cosa tende ad aiutare di più per la codifica, per la scrittura e per l'analisi, e rimanda al cluster sull'adeguatezza del modello per il lato modello della stessa questione invece di rispiegare qui quelle distinzioni tra compiti.",
      sections: [
        {
          id: 'prompting-for-code',
          heading: 'Prompting per il codice: precisione più che persuasione',
          paragraphs: [
            "Un prompt di codifica trae il massimo vantaggio dalla precisione — la firma esatta della funzione, il linguaggio e la versione, il vincolo che il codice deve soddisfare, un esempio dell'input e dell'output attesi. Una formulazione vaga che sarebbe innocua in un prompt di scrittura (\"rendilo buono\") non dà quasi nulla su cui lavorare a un compito di codifica, poiché non esiste un'unica forma corretta per una richiesta del genere.",
          ],
        },
        {
          id: 'prompting-for-writing',
          heading: 'Prompting per la scrittura: pubblico, tono e un buon esempio',
          paragraphs: [
            'Un prompt di scrittura o editing trae il massimo vantaggio dalle indicazioni su contesto e vincoli descritte in come scrivere un prompt chiaro e specifico, linkato di seguito — per chi è pensato il testo, il tono che dovrebbe mantenere, e un vincolo di lunghezza o struttura. Un esempio della voce target, secondo il prompting few-shot, linkato di seguito, spesso fa più effetto qui di una descrizione più lunga del tono.',
          ],
        },
        {
          id: 'prompting-for-analysis',
          heading: "Prompting per l'analisi: chiedere il ragionamento, non solo la conclusione",
          paragraphs: [
            "Un compito analitico — valutare opzioni, interpretare dati, lavorare su una decisione con diversi fattori — di solito trae vantaggio dal prompting a catena di pensiero, linkato di seguito: chiedere al modello di esporre il suo ragionamento invece di limitarsi a dichiarare una conclusione ti dà qualcosa da verificare, e tende a far emergere un fattore trascurato o un'ipotesi debole. Questo è lo stesso tipo di compito di come scegliere un modello per il ragionamento complesso, linkato di seguito, che copre quale modello è costruito proprio per questo invece di ripetere qui quella guida.",
          ],
        },
      ],
      faq: [
        {
          question:
            'Una sola tecnica di prompting funziona meglio in tutti e tre i tipi di compito?',
          answer:
            "No — la precisione conta di più per il codice, il pubblico e il tono contano di più per la scrittura, e chiedere un ragionamento visibile conta di più per l'analisi. La maggior parte dei compiti trae vantaggio da un mix, ponderato verso qualunque di questi elementi il compito richieda davvero.",
        },
        {
          question: 'Il modello che scelgo conta quanto il modo in cui scrivo il prompt?',
          answer:
            "Contano entrambi, e sono leve diverse — questa guida riguarda la formulazione; vedi come scegliere un modello per il tuo compito, linkato di seguito, per il lato dell'adeguatezza del modello specifico per codice, scrittura e compiti a forte componente di ragionamento.",
        },
        {
          question: 'Un prompt di codifica è solo un prompt di scrittura con parole diverse?',
          answer:
            "No — un compito di codifica ha di solito un'unica forma corretta o funzionante, quindi la precisione sul requisito esatto conta più di quanto conti per la maggior parte della scrittura, dove diverse formulazioni possono essere tutte valide.",
        },
      ],
      productNote:
        'Le modalità di routing di ClawAI già tendono verso un modello adatto per ogni compito — Auto e High Reasoning per il lavoro analitico, ad esempio — così un prompt ben scritto e un instradamento adatto lavorano insieme invece che come scelte separate.',
    },
  },
};
