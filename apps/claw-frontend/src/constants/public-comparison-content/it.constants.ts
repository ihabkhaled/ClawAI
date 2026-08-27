import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const IT_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    atAGlance: 'In sintesi',
    tableCaption: 'ClawAI e {rival} a confronto, capacità per capacità',
    capabilityColumn: 'Capacità',
    clawColumn: 'ClawAI',
    strengthTitle: 'Dove {rival} è forte',
    differenceTitle: 'In cosa ClawAI lavora diversamente',
    chooseTitle: 'Quale scegliere',
    chooseRivalLabel: 'Scegli {rival} se',
    chooseClawLabel: 'Scegli ClawAI se',
    faqTitle: 'Domande frequenti',
    lastReviewed: 'Confronto basato su informazioni pubbliche, ultima verifica',
    independence:
      'ClawAI è un prodotto indipendente. Non è affiliato a nessuno degli assistenti citati in questa pagina, non è approvato da loro e non li rivende. Ogni affermazione proviene dalla documentazione pubblica del rispettivo fornitore alla data indicata sopra, e questi prodotti cambiano in fretta: controlla le pagine del fornitore prima di decidere.',
    otherComparisons: 'Confronta ClawAI con un altro assistente',
    startFree: 'Inizia con il piano gratuito',
    seePricing: 'Vedi i prezzi',
  },
  hub: {
    eyebrow: 'Confronti',
    intro:
      'ClawAI non punta a essere un assistente singolo migliore. Mette nove famiglie di modelli di punta sotto un solo abbonamento e manda ogni messaggio a quella adatta. Queste pagine lo mettono a confronto con gli assistenti che si usano già, sempre sulle stesse otto capacità.',
    cardsTitle: 'Scegli un assistente da confrontare',
    cardCta: 'Confronta con {rival}',
    coversTitle: 'Cosa copre ogni confronto',
    coversBody:
      'Le stesse otto capacità, nello stesso ordine, in ogni pagina: scelta dei modelli, routing, risposte affiancate, modelli locali, self-hosting, memoria e file, connettori e resoconto d’uso per risposta. Le stesse domande per tutti, così due pagine si leggono una accanto all’altra.',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'Scelta dei modelli',
    [ComparisonDimension.ROUTING]: 'Routing',
    [ComparisonDimension.SIDE_BY_SIDE]: 'Risposte affiancate',
    [ComparisonDimension.LOCAL_MODELS]: 'Modelli locali e a pesi aperti',
    [ComparisonDimension.SELF_HOSTING]: 'Self-hosting',
    [ComparisonDimension.MEMORY_AND_FILES]: 'Memoria e file',
    [ComparisonDimension.CONNECTORS]: 'Connettori di lavoro',
    [ComparisonDimension.RECEIPTS]: 'Resoconto d’uso',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]: 'Nove famiglie di modelli di punta con un solo abbonamento',
    [ComparisonDimension.ROUTING]:
      'Cinque modalità di routing, incluso quello automatico per messaggio',
    [ComparisonDimension.SIDE_BY_SIDE]: 'Un prompt a più modelli insieme, risposte affiancate',
    [ComparisonDimension.LOCAL_MODELS]:
      'Modelli a pesi aperti sulla tua GPU, via Ollama o llama.cpp',
    [ComparisonDimension.SELF_HOSTING]: 'L’intero stack gira sui tuoi server, sorgente su GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'Memoria che resta tra una conversazione e l’altra, più il contesto dei file',
    [ComparisonDimension.CONNECTORS]: 'Dodici connettori di lavoro',
    [ComparisonDimension.RECEIPTS]: 'Ogni risposta registra modello, costo e quota consumata',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI vs ChatGPT',
      intro:
        'ChatGPT è l’assistente a cui quasi tutti pensano quando dicono «IA»: curato, veloce, sostenuto dai modelli di punta di OpenAI. ClawAI ha un’altra forma: un abbonamento che raggiunge i modelli di OpenAI insieme ad altre otto famiglie e manda ogni messaggio a quella adatta.',
      theirStrength:
        'Un prodotto unico, fatto molto bene. Voce, generazione di immagini, esecuzione di codice e ricerca approfondita sono integrate e funzionano insieme, le app mobili sono ottime e il modello sottostante è di punta, non un compromesso.',
      ourDifference:
        'ClawAI non prova a essere un assistente singolo migliore. Toglie di mezzo la questione del fornitore unico: una stessa conversazione può passare tra OpenAI, Anthropic, Google e altre sei famiglie, scendere su un modello locale a pesi aperti quando i dati non possono uscire dalla rete, e registrare quale modello ha risposto.',
      chooseRival:
        'vuoi un assistente curato, i modelli OpenAI coprono quasi tutto ciò che fai e ti interessano gli strumenti vocali e di immagine integrati.',
      chooseClaw:
        'sbatti spesso contro il limite di un solo fornitore, vuoi un secondo modello che controlli il primo, o parte del lavoro deve restare sul tuo hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelli OpenAI',
        [ComparisonDimension.ROUTING]: 'Selezione automatica nella gamma di OpenAI',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una risposta alla volta',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Non offerto',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Memoria, progetti e caricamento file',
        [ComparisonDimension.CONNECTORS]: 'App e connettori nei piani a pagamento',
        [ComparisonDimension.RECEIPTS]: 'Uso a livello di piano, non costo per risposta',
      },
      faq: [
        {
          question: 'ClawAI può usare gli stessi modelli OpenAI di ChatGPT?',
          answer:
            'ClawAI instrada verso i modelli di OpenAI come una delle nove famiglie del suo catalogo. Non c’è alcun account OpenAI da creare né chiave API da incollare: l’accesso ai modelli è incluso nell’abbonamento.',
        },
        {
          question: 'ClawAI è un client di ChatGPT?',
          answer:
            'No. ClawAI è una piattaforma indipendente con i propri livelli di routing, memoria, confronto e orchestrazione. OpenAI è uno dei fornitori a cui può inviare un messaggio, non il prodotto che ci sta sotto.',
        },
        {
          question: 'Posso usare ClawAI senza inviare nulla a OpenAI?',
          answer:
            'Sì. Fissa la conversazione su un modello locale a pesi aperti, oppure installa l’intero stack da te ed esegui solo modelli sulle tue GPU, senza alcuna chiamata esterna.',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI vs Claude',
      intro:
        'Claude è ciò a cui molti si affidano quando il lavoro è lungo, meticoloso e scritto. ClawAI raggiunge anche i modelli di Anthropic — insieme ad altre otto famiglie — e lascia che un secondo modello controlli quanto ha detto il primo.',
      theirStrength:
        'Ragionamento accurato su documenti lunghi, il rispetto delle istruzioni più affidabile del settore e una buona revisione del codice. Progetti, artefatti e connettori MCP ne fanno un posto davvero valido per il lavoro scritto prolungato.',
      ourDifference:
        'ClawAI tratta Anthropic come una delle opzioni forti, non come l’unica. Lo stesso thread può inviare un prompt a Claude e ad altri quattro modelli insieme, far giudicare la risposta di uno da un altro e commutare automaticamente quando un fornitore cade.',
      chooseRival:
        'quasi tutto il tuo lavoro è ragionamento lungo o revisione di codice e un modello eccellente basta.',
      chooseClaw:
        'vuoi la risposta di Claude e un secondo parere, ti serve un modello locale per dati sensibili, o preferisci non tenere un abbonamento per fornitore.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelli Anthropic',
        [ComparisonDimension.ROUTING]: 'Scegli tu il modello',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una risposta alla volta',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Non offerto',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Progetti, file e memoria',
        [ComparisonDimension.CONNECTORS]: 'Connettori MCP ed estensioni desktop',
        [ComparisonDimension.RECEIPTS]: 'Uso a livello di piano, non costo per risposta',
      },
      faq: [
        {
          question: 'ClawAI include i modelli Claude?',
          answer:
            'Sì. Anthropic è una delle nove famiglie di modelli del catalogo, raggiungibile da qualsiasi conversazione senza un account o una chiave Anthropic separati.',
        },
        {
          question: 'Un modello può controllare la risposta di un altro?',
          answer:
            'Sì. Verify, Judge e Critic mettono un secondo modello sull’output del primo. Questo riduce il rischio di una risposta sbagliata e sicura di sé senza eliminarlo: tutto ciò che conta richiede ancora una lettura umana.',
        },
        {
          question: 'ClawAI è affiliato ad Anthropic?',
          answer:
            'No. ClawAI è indipendente. Instrada verso i modelli di Anthropic come verso altri otto fornitori, senza esserne approvato né partner.',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI vs Gemini',
      intro:
        'Gemini è l’assistente più vicino ai documenti che hai già, a patto che vivano in Google Workspace. ClawAI arriva dall’altro lato: neutrale rispetto ai fornitori, con i modelli di Google come una delle nove famiglie.',
      theirStrength:
        'Finestre di contesto molto ampie, gestione nativa di immagini, audio e video, risposte rapide e un’integrazione con Gmail, Drive e Docs che nessuna terza parte può eguagliare.',
      ourDifference:
        'ClawAI non è legato né a una suite per ufficio né alla roadmap di un fornitore. Si collega a dodici strumenti di lavoro invece che a uno, instrada ogni messaggio in base al compito e può tenere il lavoro sensibile su un modello locale a pesi aperti.',
      chooseRival:
        'la tua organizzazione vive dentro Google Workspace e vuoi l’assistente direttamente lì.',
      chooseClaw:
        'usi strumenti di più fornitori, vuoi confrontare i modelli prima di scegliere, o ti serve un’installazione senza alcuna chiamata esterna.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Solo modelli Google',
        [ComparisonDimension.ROUTING]: 'Selezione automatica nella gamma di Google',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una risposta alla volta',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo ospitato da Google',
        [ComparisonDimension.SELF_HOSTING]: 'Non offerto',
        [ComparisonDimension.MEMORY_AND_FILES]: 'File, Drive e contesto Workspace',
        [ComparisonDimension.CONNECTORS]: 'Integrazione profonda con Google Workspace',
        [ComparisonDimension.RECEIPTS]: 'Uso a livello di piano, non costo per risposta',
      },
      faq: [
        {
          question: 'ClawAI può usare i modelli Gemini?',
          answer:
            'Sì. Google è una delle nove famiglie di modelli del catalogo, disponibile in qualsiasi conversazione con lo stesso abbonamento.',
        },
        {
          question: 'ClawAI si collega a Google Workspace?',
          answer:
            'ClawAI offre dodici connettori per issue tracker, chat e documenti. La sua integrazione con Google è un connettore, non una superficie nativa: più ampia fra fornitori, meno profonda dentro Google.',
        },
        {
          question: 'Quale è meglio per documenti molto lunghi?',
          answer:
            'Entrambi se la cavano bene, e le finestre di contesto più grandi di Google sono tra le più ampie disponibili. La differenza di ClawAI è che puoi mandare lo stesso documento a due modelli e confrontare le conclusioni.',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI vs Perplexity',
      intro:
        'Perplexity è costruito attorno a un solo compito: rispondere a una domanda usando il web in tempo reale, con le fonti. ClawAI è costruito attorno a un altro: mettere il modello giusto sul lavoro che hai davanti, ricerca compresa.',
      theirStrength:
        'Il prodotto meglio tagliato per le domande di tipo ricerca. Le risposte arrivano con le citazioni, le domande successive tengono insieme il filo e tutta l’interfaccia è pensata per verificare da dove viene un’affermazione.',
      ourDifference:
        'ClawAI è uno spazio di lavoro, non un motore di risposte. La ricerca è una modalità fra le altre, accanto al confronto fra modelli, alla memoria persistente, al contesto dei file, a un agente di codice e ai modelli locali — e ogni risposta registra il modello che l’ha prodotta.',
      chooseRival: 'la maggior parte delle tue domande è «cosa è vero adesso, e chi lo dice».',
      chooseClaw:
        'la ricerca è solo una parte del lavoro e ti servono anche codice, scrittura lunga, confronto fra modelli o un modello che gira sul tuo hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modelli di più fornitori nei piani superiori',
        [ComparisonDimension.ROUTING]: 'Scelto per qualità di ricerca e risposta',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una risposta alla volta',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Non offerto',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Spazi, thread e caricamento file',
        [ComparisonDimension.CONNECTORS]: 'Connettori nei piani business',
        [ComparisonDimension.RECEIPTS]: 'Uso a livello di piano, non costo per risposta',
      },
      faq: [
        {
          question: 'ClawAI cerca sul web?',
          answer:
            'Sì. La ricerca esegue una ricerca web in più passaggi e restituisce una risposta con le sue fonti. È una capacità dentro lo spazio di lavoro, non l’intero prodotto.',
        },
        {
          question: 'Quale cita meglio?',
          answer:
            'Perplexity è costruito apposta per risposte citate e mostra fonti per praticamente ogni affermazione. ClawAI cita le sue ricerche; per una domanda di puro «trova e cita», un motore di risposte dedicato è lo strumento più affilato.',
        },
        {
          question: 'Posso usarli entrambi?',
          answer:
            'Molti lo fanno. Il confronto che conta è se vuoi un motore di risposte specializzato, uno spazio di lavoro multi-modello generale, o entrambi.',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI vs Microsoft Copilot',
      intro:
        'Copilot è Microsoft 365 con un assistente intrecciato dentro. ClawAI è uno spazio di lavoro autonomo che raggiunge nove famiglie di modelli e può girare interamente sui tuoi server.',
      theirStrength:
        'Nulla sta così vicino ai dati Microsoft che un’organizzazione ha già. Il contesto di Word, Excel, Outlook e Teams arriva senza configurazione, e licenze, tenancy e conformità seguono il contratto Microsoft 365 che l’IT ha già.',
      ourDifference:
        'ClawAI è neutrale rispetto ai fornitori e installabile ovunque. Instrada su nove famiglie di modelli invece che sulla selezione di un solo fornitore, mostra quanto è costata ogni risposta e può essere installato dentro la tua rete con modelli a pesi aperti e nessuna chiamata esterna.',
      chooseRival:
        'la tua organizzazione gira su Microsoft 365 e il valore sta nell’assistente dentro i documenti che ci sono già.',
      chooseClaw:
        'vuoi poter scegliere il fornitore, vedere il costo per risposta, o un’installazione che non lasci mai la tua infrastruttura.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modelli OpenAI più quelli di Microsoft',
        [ComparisonDimension.ROUTING]: 'Scelto da Microsoft per ciascuna superficie',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Una risposta alla volta',
        [ComparisonDimension.LOCAL_MODELS]: 'Solo cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Non offerto',
        [ComparisonDimension.MEMORY_AND_FILES]: 'File Microsoft 365 e contesto dell’organizzazione',
        [ComparisonDimension.CONNECTORS]: 'La più profonda integrazione con Microsoft 365',
        [ComparisonDimension.RECEIPTS]: 'Licenza per postazione, non costo per risposta',
      },
      faq: [
        {
          question: 'ClawAI può essere installato dentro la nostra rete?',
          answer:
            'Sì. L’intero stack gira sui tuoi server, con modelli a pesi aperti sulle tue GPU e nessuna chiamata a fornitori esterni. È un progetto definito su misura, non un piano acquistabile online.',
        },
        {
          question: 'ClawAI si integra con Microsoft 365?',
          answer:
            'ClawAI offre dodici connettori per issue tracker, chat e documenti: più ampio fra fornitori rispetto a Copilot e meno profondo dentro le applicazioni Microsoft.',
        },
        {
          question: 'Come viene fatturato l’uso?',
          answer:
            'A token normalizzati per costo su una quota giornaliera e mensile, non per postazione. Ogni risposta mostra il modello, il costo e la quota consumata.',
        },
      ],
    },
  },
};
