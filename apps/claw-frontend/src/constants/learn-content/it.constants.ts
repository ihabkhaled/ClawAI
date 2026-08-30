import { LearnTopic } from '@/enums/learn-topic.enum';
import type { LearnDictionary } from '@/types/learn.types';

export const IT_LEARN_CONTENT: LearnDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Dove proseguire',
    lastReviewed: 'Ultima verifica',
    backToHub: 'Tutte le guide',
    ctaTitle: 'Provalo invece di leggerne',
    ctaBody:
      'ClawAI raccoglie queste tecniche in un unico spazio di lavoro: puoi inviare lo stesso prompt a più modelli e vedere di persona la differenza.',
    startFree: 'Inizia con il piano gratuito',
    seeFeatures: 'Guarda cosa fa ClawAI',
  },
  hub: {
    seo: {
      title: 'Guide: IA multimodello, routing e orchestrazione',
      description:
        'Spiegazioni chiare delle tecniche dietro l’IA multimodello: routing, consenso, verifica, RAG, memoria e modelli open-weight sul tuo hardware.',
      keywords: ['orchestrazione LLM', 'routing dei modelli IA', 'IA multimodello'],
    },
    eyebrow: 'Guide',
    title: 'Come funziona davvero l’IA multimodello',
    summary:
      'Spiegazioni brevi e pratiche delle idee dietro l’invio di un prompt a più di un modello: cosa fa ogni tecnica, quando ripaga il suo costo e quando un modello solo è la risposta migliore. Nessun benchmark del fornitore, nessun numero inventato.',
    topicsHeading: 'Scegli un concetto',
    cardSummaries: {
      [LearnTopic.WHAT_IS_MULTI_MODEL_AI]:
        'Usare più modelli in un unico flusso invece di legarsi a uno solo.',
      [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]:
        'Lo strato che decide quale modello viene eseguito, in che ordine e cosa accade all’output.',
      [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]:
        'Inviare ogni richiesta a un modello scelto per compito, costo, riservatezza o latenza.',
      [LearnTopic.WHAT_IS_MODEL_FALLBACK]:
        'Cosa deve accadere quando il primo modello cade, viene limitato o rifiuta.',
      [LearnTopic.WHAT_IS_AI_CONSENSUS]:
        'Porre la stessa domanda a più modelli e usare il loro accordo come segnale.',
      [LearnTopic.WHAT_IS_BEST_OF_N]: 'Generare più risposte candidate e tenere la migliore.',
      [LearnTopic.WHAT_IS_AN_AI_JUDGE]:
        'Usare un modello per valutare le risposte di altri, e dove questo si rompe.',
      [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]:
        'Controllare una risposta con qualcosa di diverso dal modello che l’ha prodotta.',
      [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]:
        'La memoria di lavoro di una singola richiesta, e perché non è memoria.',
      [LearnTopic.WHAT_IS_RAG]: 'Recuperare i tuoi documenti e metterli davanti al modello.',
      [LearnTopic.WHAT_IS_AI_MEMORY]:
        'Cosa resta tra una conversazione e l’altra, e quanto ti costa.',
      [LearnTopic.WHAT_ARE_CONTEXT_PACKS]:
        'Pacchetti di contesto riutilizzabili che alleghi a una conversazione di proposito.',
      [LearnTopic.WHAT_IS_LOCAL_AI]:
        'Eseguire un modello su hardware che controlli, e cosa cambia davvero.',
      [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]:
        'Modelli di cui puoi scaricare i pesi, e cosa significa e non significa «aperto».',
      [LearnTopic.WHAT_IS_SELF_HOSTED_AI]:
        'Eseguire l’intera applicazione da soli, non solo il modello.',
      [LearnTopic.OLLAMA_VS_LLAMACPP]:
        'Due modi di eseguire modelli open-weight in locale, e a cosa serve ciascuno.',
      [LearnTopic.CLOUD_AI_VS_LOCAL_AI]:
        'Il vero scambio: capacità e comodità contro controllo e forma del costo.',
      [LearnTopic.AI_AGENT_VS_AI_CHATBOT]:
        'La differenza tra risponderti e fare qualcosa al posto tuo.',
    },
  },
  topics: {
    [LearnTopic.WHAT_IS_MULTI_MODEL_AI]: {
      seo: {
        title: 'Che cos’è l’IA multimodello?',
        description:
          'L’IA multimodello usa più modelli linguistici in un unico flusso invece di legarsi a uno. Cosa risolve, quanto costa e quando un modello solo basta.',
        keywords: ['IA multimodello', 'più modelli IA', 'scelta del modello'],
      },
      eyebrow: 'Fondamenti',
      title: 'Che cos’è l’IA multimodello?',
      summary:
        'L’IA multimodello tratta i modelli linguistici come pezzi intercambiabili invece di sceglierne uno e costruirci tutto attorno. La stessa domanda può andare a un modello veloce ed economico, a uno pesante da ragionamento o a uno che gira sul tuo hardware: la scelta si fa per richiesta e non una volta sola al momento dell’acquisto.',
      sections: [
        {
          id: 'the-problem',
          heading: 'Il problema che risolve',
          paragraphs: [
            'I modelli non sono uniformemente migliori o peggiori l’uno dell’altro. Uno scrive codice più pulito, un altro segue i documenti lunghi con più fedeltà, un terzo risponde in una frazione del tempo a una frazione del costo. Legarsi a un solo fornitore significa accettare il suo punto debole su ogni compito.',
            'Significa anche accettarne i disservizi, i limiti di frequenza, i cambi di prezzo e i ritiri. Quando un modello da cui dipendi viene dismesso, un flusso a modello singolo va ricostruito. Un flusso multimodello cambia un’impostazione.',
          ],
        },
        {
          id: 'what-it-looks-like',
          heading: 'Come si presenta nella pratica',
          paragraphs: [
            'Nella forma più semplice l’IA multimodello è un menu a tendina: scegli il modello per conversazione. È già utile, ed è da lì che quasi tutti iniziano.',
            'Diventa più interessante quando la scelta è automatica — quando un router legge la richiesta e la manda dove serve — e ancora di più quando più modelli rispondono insieme e le risposte vengono confrontate, valutate o unite. Sono tecniche distinte, ciascuna con il suo costo, e ciascuna ha qui la sua pagina.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Quanto costa',
          paragraphs: [
            'Ogni modello aggiunto è un altro account fornitore, un’altra serie di credenziali, un altro rapporto di fatturazione e un altro formato di dati d’uso. Questo carico è l’argomento onesto contro il multimodello, ed è il motivo per cui quasi nessuno lo fa a mano.',
            'Far girare più modelli sullo stesso prompt ne moltiplica il costo in token. Tecniche come consenso e best-of-N valgono il prezzo su decisioni che contano e sono spreco puro su domande di routine. Saperle distinguere è quasi tutta l’abilità.',
          ],
        },
        {
          id: 'when-one-is-enough',
          heading: 'Quando un modello solo è la risposta giusta',
          paragraphs: [
            'Se il tuo carico è ristretto e un modello lo gestisce bene, aggiungerne altri è complessità senza beneficio. L’approccio multimodello ripaga quando i compiti sono vari, quando il costo per compito varia di un ordine di grandezza tra le richieste, o quando parte dei tuoi dati non può proprio andare a terzi.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’IA multimodello non è solo un gateway di API?',
          answer:
            'Un gateway ti dà un endpoint unico per più fornitori, e risolve l’impiantistica. L’IA multimodello è cosa ci fai: scegliere per richiesta, confrontare risposte, ripiegare in caso di errore. Il gateway è un prerequisito, non la tecnica.',
        },
        {
          question: 'Usare più modelli rende le risposte più accurate?',
          answer:
            'Di per sé no. Mandare un prompt a tre modelli dà tre risposte, non una migliore. L’accuratezza cresce solo se aggiungi un modo di scegliere tra loro — accordo, valutazione o un controllo esterno — e ciascuno ha i suoi difetti.',
        },
        {
          question: 'Servono più abbonamenti?',
          answer:
            'Se vai diretto da ogni fornitore, sì. Le piattaforme che li aggregano esistono anche per evitarlo. ClawAI è una di queste: {cloudProviderCount} fornitori cloud più runtime locali sotto un unico account.',
        },
      ],
      productNote:
        'ClawAI è costruito su questa idea: {cloudProviderCount} fornitori cloud e modelli locali open-weight in un unico spazio, con il modello che ha risposto annotato su ogni messaggio.',
    },
    [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]: {
      seo: {
        title: 'Che cos’è l’orchestrazione LLM?',
        description:
          'L’orchestrazione LLM è lo strato che decide quale modello viene eseguito, in che ordine e cosa accade all’output. In cosa differisce dal prompting e dagli agenti.',
        keywords: ['orchestrazione LLM', 'orchestrazione IA', 'pipeline di modelli'],
      },
      eyebrow: 'Fondamenti',
      title: 'Che cos’è l’orchestrazione LLM?',
      summary:
        'L’orchestrazione è tutto ciò che sta attorno alla chiamata al modello. Scegliere quale eseguire, decidere se una chiamata basta, passare l’output di un passo a quello successivo e decidere cosa fare quando un passo fallisce. Il prompt è un’istruzione; l’orchestrazione è il programma dentro cui viene eseguita.',
      sections: [
        {
          id: 'not-prompting',
          heading: 'Non è prompt engineering',
          paragraphs: [
            'Il prompt engineering migliora una singola chiamata. L’orchestrazione decide quante chiamate ci sono, quali modelli le fanno e come si combinano gli output. Puoi avere prompt eccellenti e nessuna orchestrazione: il risultato è un sistema che cade appena un fornitore ha un’ora storta.',
            'La distinzione conta perché i due si ottimizzano in modo diverso. Un prompt migliore costa poco e alza un po’ la qualità. Un’orchestrazione migliore costa token e alza parecchio l’affidabilità.',
          ],
        },
        {
          id: 'what-it-decides',
          heading: 'Cosa decide uno strato di orchestrazione',
          paragraphs: [
            'Quale modello. Se interrogarne più di uno. Se controllare la risposta prima di restituirla. Cosa fare di fronte a un rifiuto, un timeout o un limite di frequenza. Se l’output di questo passo diventa l’input del prossimo. Se il tutto è sostenibile prima di iniziare.',
            'Ognuna di queste è una politica, e ognuna può sbagliare per conto suo. Per questo vale la pena chiamare l’orchestrazione uno strato a sé invece di spargere le decisioni nel codice applicativo.',
          ],
        },
        {
          id: 'techniques',
          heading: 'Le tecniche comuni',
          paragraphs: [
            'Il routing manda una richiesta a un modello adatto. Il fallback gestisce il guasto. Il consenso interroga più modelli e guarda l’accordo. Il best-of-N genera candidate e ne tiene una. Un giudice valuta le risposte. La verifica confronta un’affermazione con qualcosa fuori dal modello. Le pipeline concatenano passi. La scomposizione divide una richiesta grande in richieste minori.',
            'ClawAI ne implementa nove come modalità di orchestrazione distinte, più giudice e confronto come superfici proprie. Ognuna ha qui una pagina che spiega cos’è prima che tu decida se la vuoi.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quando non orchestrare',
          paragraphs: [
            'L’orchestrazione moltiplica costo e latenza. Un consenso su tre modelli costa circa il triplo dei token e dura quanto il più lento. Per una domanda la cui risposta verifichi a colpo d’occhio, è un cattivo affare.',
            'La regola che regge: orchestra quando sbagliare costa caro e verificare è difficile. Altrimenti manda una richiesta a un modello e leggi la risposta.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’orchestrazione è la stessa cosa di un framework di agenti?',
          answer:
            'Si sovrappongono ma non coincidono. Un agente decide da sé il passo successivo, spesso con strumenti. L’orchestrazione è la politica che lo circonda — quale modello, quanti, cosa fare in caso di errore — e vale allo stesso modo per un flusso senza alcun agente.',
        },
        {
          question: 'Serve un framework per orchestrare?',
          answer:
            'No. Un nuovo tentativo con un modello diverso è già orchestrazione. I framework aiutano quando le politiche diventano tante al punto che altrimenti le riscriveresti funzione per funzione.',
        },
        {
          question: 'Quanto costa?',
          answer:
            'In token, più o meno in proporzione a quante chiamate fa la politica. Una chiamata instradata costa quasi quanto una non instradata; un consenso su tre modelli circa il triplo. Il costo è prevedibile, ed è questo che ne fa una decisione di budget e non una scommessa.',
        },
      ],
      productNote:
        'ClawAI esegue {orchestrationLabCount} modalità di orchestrazione accanto alla chat normale e registra quali modelli ha usato ogni esecuzione: il costo di una tecnica si vede invece di essere dedotto.',
    },
    [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]: {
      seo: {
        title: 'Che cos’è il routing dei modelli IA?',
        description:
          'Il routing manda ogni richiesta a un modello scelto per compito, costo, riservatezza o latenza invece di usarne uno per tutto. Come decidono i router e come sbagliano.',
        keywords: ['routing dei modelli IA', 'router LLM', 'selezione del modello'],
      },
      eyebrow: 'Routing',
      title: 'Che cos’è il routing dei modelli IA?',
      summary:
        'Un router guarda una richiesta prima di eseguirla e sceglie quale modello deve rispondere. Il punto è che il modello giusto cambia con la richiesta: una domanda di una riga e un refactoring di mille non meritano lo stesso modello, e pagare prezzi di frontiera per entrambe non è una scelta che qualcuno fa di proposito.',
      sections: [
        {
          id: 'how-decisions-are-made',
          heading: 'Su cosa decide un router',
          paragraphs: [
            'Quasi tutti combinano pochi segnali: che tipo di compito sembra, quanto è lungo l’input, quanto sono sensibili i dati, quanto in fretta serve la risposta e quanto può costare la richiesta.',
            'Questi segnali confliggono. Il modello più veloce è di rado il più forte; l’opzione più riservata di rado la più capace. Un router è in realtà una politica su cosa sacrificare, perciò quelli utili ti lasciano dire cosa ti interessa invece di indovinarlo.',
          ],
        },
        {
          id: 'automatic-vs-explicit',
          heading: 'Routing automatico ed esplicito',
          paragraphs: [
            'Il routing automatico legge la richiesta e decide. È comodo e ogni tanto sbaglia, e sbagliare è difficile da notare se il sistema non dice quale modello ha risposto.',
            'Il routing esplicito significa che indichi tu la priorità — questo resta in locale, questo resta economico, per questo usa il ragionamento migliore — e il router la rispetta. In pratica quasi tutti vogliono entrambi: un default sensato e la possibilità di scavalcarlo per la richiesta che hanno davanti.',
          ],
        },
        {
          id: 'failure-modes',
          heading: 'Come il routing va storto',
          paragraphs: [
            'I due guasti comuni sono i declassamenti silenziosi e le decisioni invisibili. Un declassamento silenzioso è un router che manda di nascosto la tua richiesta curata a un modello economico. Una decisione invisibile è qualunque routing che non puoi verificare dopo.',
            'Entrambi hanno lo stesso rimedio: il sistema deve registrare quale modello ha davvero risposto e mostrarlo. Un router che non puoi ispezionare è indistinguibile da un router rotto.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Come lo fa ClawAI',
          paragraphs: [
            'ClawAI ha {routingModeCount} modalità di routing. Auto legge la richiesta e sceglie. Manuale fissa un modello. Solo locale tiene l’intera catena su modelli che girano sul tuo hardware. Riservatezza prima preferisce il locale e si rifiuta di uscirne in silenzio. Le altre inclinano la scelta verso meno latenza, ragionamento più forte o costo minore.',
            'Ogni risposta registra il modello che l’ha prodotta: una decisione automatica si verifica invece di doverci credere.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il routing peggiora la qualità delle risposte?',
          answer:
            'Può, se la politica non si adatta alla richiesta. Per questo la modalità la scegli tu e per questo viene mostrato il modello che ha risposto. Un routing che vedi e puoi scavalcare è un controllo di costo; uno che non vedi è un declassamento.',
        },
        {
          question: 'Un router può tenere i dati fuori dal cloud del tutto?',
          answer:
            'Solo se gli è permesso rifiutare invece di ripiegare. Una modalità «solo locale» la cui catena di fallback raggiunge un fornitore cloud non è un controllo di riservatezza. La modalità solo locale di ClawAI tiene la catena su fornitori locali.',
        },
        {
          question: 'Il routing conviene a una singola persona?',
          answer:
            'Di solito sì, più per il costo che per l’affidabilità. Quasi ogni carico individuale è fatto soprattutto di domande di routine con poche difficili; mandare quelle di routine a un modello più economico è la leva più grande su una bolletta personale.',
        },
      ],
      productNote:
        'ClawAI offre {routingModeCount} modalità di routing e mostra il modello scelto su ogni messaggio: puoi verificare il router invece di fidartene.',
    },
    [LearnTopic.WHAT_IS_MODEL_FALLBACK]: {
      seo: {
        title: 'Che cos’è il fallback tra modelli?',
        description:
          'Il fallback è ciò che accade quando il primo modello fallisce: giù, limitato o in rifiuto. Come funzionano le catene di fallback e perché quello silenzioso è pericoloso.',
        keywords: ['fallback dei modelli', 'failover LLM', 'affidabilità IA'],
      },
      eyebrow: 'Routing',
      title: 'Che cos’è il fallback tra modelli?',
      summary:
        'Il fallback risponde a «cosa succede quando il modello che volevi non è disponibile». I fornitori hanno disservizi, limiti di frequenza, rifiuti sui contenuti e timeout. Una catena di fallback è un elenco ordinato di cosa provare dopo, e quell’ordine codifica a cosa sei disposto a rinunciare.',
      sections: [
        {
          id: 'why-needed',
          heading: 'Perché non è opzionale',
          paragraphs: [
            'Un flusso con un solo fornitore ne eredita esattamente la disponibilità. I limiti di frequenza in particolare non sono eventi rari: sono la conseguenza normale di un’ora affollata, e un flusso senza fallback semplicemente si ferma.',
            'Il fallback trasforma un guasto netto in una risposta degradata. Che sia un miglioramento dipende interamente dal fatto che te lo dicano.',
          ],
        },
        {
          id: 'what-to-fall-back-to',
          heading: 'Scegliere l’ordine',
          paragraphs: [
            'L’ordine intuitivo è «il modello successivo», ma spesso è sbagliato. Se la prima scelta è fallita perché la richiesta era troppo lunga, anche un modello più piccolo fallirà. Se ha rifiutato per motivi di contenuto, uno simile rifiuterà allo stesso modo.',
            'Un ordine più utile cambia qualcosa di strutturale: un fornitore del tutto diverso, o un modello locale con altre regole, invece di un fratello che fallirà allo stesso modo.',
          ],
        },
        {
          id: 'silent-fallback',
          heading: 'La variante pericolosa',
          paragraphs: [
            'Il fallback silenzioso è un sistema che risponde di nascosto con un altro modello e non dice nulla. Ottieni una risposta peggiore, che attribuisci mentalmente al modello che hai scelto, e ne trai una conclusione sbagliata.',
            'Quando il fallback attraversa un confine di riservatezza è peggio di una conclusione sbagliata. Passare da un modello locale a un fornitore cloud manda dati esattamente dove l’utente aveva scelto di non mandarli. Una catena che può lasciare l’esecuzione locale dovrebbe essere una catena accettata esplicitamente.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Come lo fa ClawAI',
          paragraphs: [
            'Le modalità di routing definiscono catene proprie, e la modalità solo locale tiene la sua su fornitori locali invece di cercare un modello cloud quando quello locale è occupato. Ogni messaggio registra il modello che ha davvero risposto: un fallback si vede a posteriori invece di dedurlo da un cambio di tono.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il fallback è lo stesso di un nuovo tentativo?',
          answer:
            'Un nuovo tentativo manda la stessa richiesta allo stesso modello, e aiuta con un errore passeggero. Il fallback cambia modello, e aiuta quando il primo non può servire la richiesta affatto. I sistemi robusti fanno entrambe le cose, in quest’ordine.',
        },
        {
          question: 'Il fallback dovrebbe mai passare da locale a cloud?',
          answer:
            'Solo se l’utente lo ha chiesto. L’esecuzione locale si sceglie di solito per un motivo che un fallback non può rispettare, quindi la cosa sicura è fallire e dirlo invece di riuscire altrove.',
        },
        {
          question: 'Quanti modelli dovrebbe avere una catena?',
          answer:
            'Due o tre bastano di solito. Le catene lunghe aggiungono soprattutto latenza, perché ogni tentativo fallito si paga in tempo prima che inizi il successivo.',
        },
      ],
      productNote:
        'Le modalità di routing di ClawAI portano catene di fallback proprie, e solo locale tiene la sua in locale invece di raggiungere in silenzio un fornitore cloud.',
    },
    [LearnTopic.WHAT_IS_AI_CONSENSUS]: {
      seo: {
        title: 'Che cos’è il consenso tra modelli IA?',
        description:
          'Il consenso pone la stessa domanda a più modelli e tratta il loro accordo come segnale. Cosa dice e non dice l’accordo, e quando il costo si giustifica.',
        keywords: ['consenso IA', 'accordo tra modelli', 'ensemble di LLM'],
      },
      eyebrow: 'Orchestrazione',
      title: 'Che cos’è il consenso tra modelli IA?',
      summary:
        'Il consenso fa passare un prompt attraverso più modelli e confronta le risposte. Dove concordano hai un segnale debole che la risposta non è un artefatto di un solo modello. Dove divergono hai qualcosa di più utile: la segnalazione che la domanda era più difficile di quanto sembrasse.',
      sections: [
        {
          id: 'what-agreement-means',
          heading: 'Cosa dice davvero l’accordo',
          paragraphs: [
            'L’accordo è indizio, non prova. Modelli addestrati su dati che si sovrappongono condividono distorsioni e possono sbagliare con sicurezza nella stessa direzione. Tre modelli d’accordo su un fatto falso è un esito comune, non raro.',
            'Il segnale è più forte quando i modelli sono davvero diversi: fornitori diversi, addestramenti diversi, dimensioni diverse. Un consenso tra tre varianti della stessa famiglia vale quasi nulla.',
          ],
        },
        {
          id: 'disagreement-is-the-value',
          heading: 'Il disaccordo è l’output più utile',
          paragraphs: [
            'Il valore pratico del consenso sta di solito nel caso negativo. Quando i modelli divergono hai individuato una domanda che richiede una persona, e individuarle a basso costo vale più di un aumento marginale di fiducia sulle domande già facili.',
            'Questo ribalta quando usarlo. Il consenso non è un miglioramento di qualità applicato a tutto; è uno strumento di triage applicato dove sbagliare costa caro.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Il costo',
          paragraphs: [
            'Far girare tre modelli costa circa il triplo dei token e dura quanto il più lento. Su una domanda di routine è puro spreco. Su una clausola contrattuale, un piano di migrazione o un riassunto medico su cui intendi agire, è poco.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quando non usarlo',
          paragraphs: [
            'Non usare il consenso per domande con risposta verificabile. Se il codice compila oppure no, eseguilo: è un segnale più forte di tre modelli d’accordo. Il consenso serve per domande di giudizio dove non esiste un controllo esterno economico.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quanti modelli servono?',
          answer:
            'Tre è la scelta abituale, perché due possono solo concordare o no mentre tre mostrano la forma di un disaccordo. Oltre tre la decisione cambia di rado e la bolletta si moltiplica.',
        },
        {
          question: 'Il consenso previene le allucinazioni?',
          answer:
            'No. Intercetta quelle proprie di un modello e si lascia sfuggire quelle che più modelli condividono. È un filtro, non una garanzia.',
        },
        {
          question: 'È lo stesso del best-of-N?',
          answer:
            'No. Il consenso confronta risposte di modelli diversi per vedere se concordano. Il best-of-N genera più candidate e ne sceglie una. Il consenso misura l’accordo; il best-of-N seleziona la qualità.',
        },
      ],
      productNote:
        'Il consenso è una delle {orchestrationLabCount} modalità di orchestrazione di ClawAI, e ogni esecuzione registra tutti i modelli usati e quanto è costata.',
    },
    [LearnTopic.WHAT_IS_BEST_OF_N]: {
      seo: {
        title: 'Che cos’è il campionamento best-of-N?',
        description:
          'Il best-of-N genera più risposte candidate e tiene la migliore. Come si scelgono, perché il selettore conta più di N e quando batte un buon prompt.',
        keywords: ['best of N', 'campionamento di candidate', 'selezione delle risposte'],
      },
      eyebrow: 'Orchestrazione',
      title: 'Che cos’è il best-of-N?',
      summary:
        'Il best-of-N chiede più risposte allo stesso prompt e ne tiene una. Sfrutta il fatto che l’output del modello varia tra esecuzioni: un modello che risponde bene sette volte su dieci produrrà, in tre tentativi, almeno una buona risposta. La tecnica vive o muore su come scegli la vincitrice.',
      sections: [
        {
          id: 'why-it-works',
          heading: 'Perché funziona',
          paragraphs: [
            'L’output di un modello linguistico è campionato, non deterministico. Due esecuzioni dello stesso prompt danno risposte diverse di qualità variabile. Se le buone superano le cattive, prendere più campioni aumenta la probabilità che almeno una sia buona.',
            'È tutto il meccanismo. Non rende il modello più intelligente; ti dà più tentativi sulla capacità che già ha.',
          ],
        },
        {
          id: 'the-selector',
          heading: 'Scegliere la vincitrice è la parte difficile',
          paragraphs: [
            'Generare candidate è facile. Sceglierne una è il problema vero, ed è lì che sta gran parte del valore della tecnica e gran parte dei suoi fallimenti.',
            'La selezione tramite controllo automatico — compila, i test passano, lo schema è rispettato — è di gran lunga la più affidabile, perché il controllo è indipendente dal modello. La selezione tramite un altro modello è un giudice, con tutte le riserve di quella pagina. La selezione umana è la più accurata e la meno scalabile.',
          ],
        },
        {
          id: 'choosing-n',
          heading: 'Scegliere N',
          paragraphs: [
            'I rendimenti calano in fretta. Da una candidata a tre è un grande miglioramento; da tre a dieci è piccolo a più del triplo del costo. Quasi tutti gli usi pratici stanno tra tre e cinque.',
            'N moltiplica il costo esattamente. Cinque candidate sono cinque volte i token di generazione, più quanto costa la selezione.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quando non usarlo',
          paragraphs: [
            'Se non hai modo di distinguere una risposta buona da una cattiva, il best-of-N non può aiutarti: sceglierai a caso da un mucchio più grande pagando di più. Il suo terreno naturale è il lavoro con controllo oggettivo: codice, output strutturato, tutto ciò che si analizza oppure no.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il best-of-N equivale ad alzare la temperatura?',
          answer:
            'No, anche se interagiscono. La temperatura regola quanto varia ogni risposta. Il best-of-N riguarda quante ne prendi e come scegli. Un po’ di varietà aiuta, perché candidate identiche non lasciano nulla da scegliere.',
        },
        {
          question: 'Posso usare modelli diversi per le candidate?',
          answer:
            'Sì, e spesso aiuta: i modelli falliscono in modi diversi, quindi il gruppo è più vario di campioni ripetuti da uno solo. A quel punto sei vicino al consenso, con selezione al posto dell’accordo.',
        },
        {
          question: 'Aiuta con l’accuratezza fattuale?',
          answer:
            'Solo se il tuo selettore rileva errori fattuali. Senza un controllo esterno stai scegliendo tra risposte sicure di sé, e la sicurezza non è accuratezza.',
        },
      ],
      productNote:
        'Il best-of-N è una delle {orchestrationLabCount} modalità di orchestrazione di ClawAI, e ogni candidata generata viene registrata a fronte del costo dell’esecuzione.',
    },
    [LearnTopic.WHAT_IS_AN_AI_JUDGE]: {
      seo: {
        title: 'Che cos’è un giudice IA?',
        description:
          'Un giudice IA è un modello che valuta le risposte di altri modelli. A cosa serve, quali distorsioni porta e perché non sostituisce un controllo vero.',
        keywords: ['giudice IA', 'LLM come giudice', 'valutazione delle risposte'],
      },
      eyebrow: 'Orchestrazione',
      title: 'Che cos’è un giudice IA?',
      summary:
        'Un giudice è un modello con un altro compito: invece di rispondere alla domanda, legge risposte e le valuta. È così che si fa quasi tutta la selezione automatica tra candidate, e porta con sé un insieme di distorsioni ben documentate e facili da dimenticare.',
      sections: [
        {
          id: 'what-it-does',
          heading: 'Cosa fa un giudice',
          paragraphs: [
            'Un giudice riceve la domanda originale e due o più risposte, e restituisce una classifica o un punteggio, di solito con una motivazione. È il passo di selezione nel best-of-N e il passo di arbitrato quando i modelli divergono.',
            'L’attrattiva è evidente: scala come la revisione umana non fa, ed è molto più economico della persona che sostituisce.',
          ],
        },
        {
          id: 'the-biases',
          heading: 'Le distorsioni, che sono costanti',
          paragraphs: [
            'I giudici preferiscono risposte lunghe a quelle brevi, anche quando la breve è completa. Preferiscono formulazioni sicure a quelle caute, che la sicurezza sia giustificata o no. Sono sensibili all’ordine di presentazione delle candidate. E un modello chiamato a giudicare il proprio output tende a preferirlo.',
            'Nessuna è sottile, e tutte sono gestibili: mescola l’ordine, usa un modello diverso come giudice e come autore, chiedi criteri specifici invece di una preferenza generica. Ma vanno gestite di proposito, perché la configurazione predefinita le mostra tutte e quattro.',
          ],
        },
        {
          id: 'not-a-check',
          heading: 'Un giudice non è un verificatore',
          paragraphs: [
            'Un giudice confronta le risposte tra loro. Non le confronta con la realtà. Davanti a tre risposte sbagliate le ordinerà con sicurezza, e la vincitrice resterà sbagliata.',
            'Dove esiste un controllo esterno — test, uno schema, una ricerca — quel controllo batte un giudice, perché è indipendente da ciò che viene giudicato. Un giudice è ciò che usi quando un controllo simile non esiste.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il giudice dovrebbe essere il modello più potente?',
          answer:
            'Di solito uno forte, e preferibilmente non lo stesso che ha scritto le candidate. L’auto-preferenza è reale e il rimedio più economico è usare un altro modello.',
        },
        {
          question: 'Un giudice può valutare una risposta singola?',
          answer:
            'Può, ma il giudizio comparativo è più affidabile della valutazione assoluta. I modelli sono più bravi su «quale di queste è migliore» che su «questo è un 7 o un 8».',
        },
        {
          question: 'Come faccio a sapere se il giudice ha ragione?',
          answer:
            'Controllalo a campione contro il tuo giudizio. Se non verifichi mai, hai spostato la fiducia invece di guadagnarla.',
        },
      ],
      productNote:
        'ClawAI esegue il giudizio come superficie propria sopra un confronto: una risposta valutata registra sia i modelli che hanno scritto le candidate sia quello che le ha giudicate.',
    },
    [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]: {
      seo: {
        title: 'Che cos’è la verifica delle risposte IA?',
        description:
          'Verificare significa confrontare una risposta con qualcosa di diverso dal modello che l’ha prodotta. Perché l’indipendenza è tutto e quanto vale un autocontrollo.',
        keywords: ['verifica IA', 'controllo delle risposte', 'accuratezza LLM'],
      },
      eyebrow: 'Orchestrazione',
      title: 'Che cos’è la verifica delle risposte IA?',
      summary:
        'Verificare significa confrontare una risposta generata con una fonte che non è il generatore. La parola chiave è indipendente: un modello che rilegge la propria risposta condivide il ragionamento che ha prodotto l’errore, ed è per questo che gli autocontrolli intercettano molto meno di quanto ci si aspetti.',
      sections: [
        {
          id: 'independence',
          heading: 'L’indipendenza è tutta l’idea',
          paragraphs: [
            'Se un modello inventa un fatto per qualcosa nel suo addestramento, chiedere a quel modello se il fatto è vero consulta la stessa fonte che l’ha inventato. Controllo ed errore hanno una causa comune, quindi il controllo passa.',
            'Un verificatore utile cambia qualcosa. Un altro modello, una ricerca su documenti reali, un compilatore, una suite di test, un validatore di schema. Più il verificatore differisce dal generatore, più può intercettare.',
          ],
        },
        {
          id: 'kinds',
          heading: 'Tipi di verifica, dal più debole al più forte',
          paragraphs: [
            'Autorevisione: il modello rilegge la risposta. Economica, intercetta soprattutto formattazione e contraddizioni interne. Revisione incrociata: controlla un altro modello. Meglio, intercetta errori propri del primo. Recupero: l’affermazione è confrontata con documenti recuperati. Forte per le affermazioni fattuali. Esecuzione: il codice gira, lo schema valida, i test passano. La più forte, e disponibile solo dove la risposta è eseguibile.',
            'Lo schema è che la forza segue l’indipendenza dal modello, e la disponibilità va nel verso opposto: i controlli più forti esistono solo per certi tipi di lavoro.',
          ],
        },
        {
          id: 'repair',
          heading: 'Verifica e riparazione',
          paragraphs: [
            'Un verificatore che si limita a segnalare un problema ti lascia dov’eri. In pratica la verifica si accompagna alla riparazione: il fallimento e la sua ragione tornano a un modello, che produce una risposta corretta, che viene ricontrollata.',
            'Quel ciclo ha bisogno di un limite. Senza, un modello incapace di risolvere continuerà a produrre varianti dello stesso errore a prezzo pieno.',
          ],
        },
      ],
      faq: [
        {
          question: 'Chiedere al modello di ricontrollare serve?',
          answer:
            'Un po’, e soprattutto per l’incoerenza interna più che per l’errore fattuale. È la forma più debole di verifica e la più facile da sopravvalutare.',
        },
        {
          question: 'La verifica per recupero è la stessa cosa del RAG?',
          answer:
            'Usano lo stesso meccanismo in direzioni opposte. Il RAG recupera prima di generare, per informare la risposta. La verifica per recupero recupera dopo, per controllarla.',
        },
        {
          question: 'Quanti tentativi di riparazione sono sensati?',
          answer:
            'Uno o due. Se un modello non ha risolto al secondo, i successivi di solito sono riformulazioni dello stesso errore, e dovrebbe guardare una persona.',
        },
      ],
      productNote:
        'Verifica e riparazione sono due delle {orchestrationLabCount} modalità di orchestrazione di ClawAI, ed entrambe sono misurate per tentativo: un ciclo di riparazione non può accumulare una bolletta invisibile.',
    },
    [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]: {
      seo: {
        title: 'Che cos’è una finestra di contesto?',
        description:
          'La finestra di contesto è quanto testo un modello può considerare in una richiesta. Perché non è memoria, perché riempirla peggiora la qualità e come alza il costo.',
        keywords: ['finestra di contesto', 'token LLM', 'contesto lungo'],
      },
      eyebrow: 'Contesto',
      title: 'Che cos’è una finestra di contesto?',
      summary:
        'La finestra di contesto è tutta la quantità di testo che un modello può tenere in una singola richiesta: il tuo prompt, la conversazione fin qui, i documenti allegati e la risposta in scrittura. Si misura in token e si azzera del tutto tra una richiesta e l’altra.',
      sections: [
        {
          id: 'not-memory',
          heading: 'Non è memoria',
          paragraphs: [
            'Un modello non ricorda la tua conversazione precedente. L’illusione di memoria nasce dal fatto che l’applicazione rimanda i messaggi precedenti a ogni nuova richiesta. La finestra è spazio di lavoro per una chiamata, non archiviazione.',
            'Ne segue una conseguenza diretta che molti scoprono per caso: una conversazione lunga diventa più cara a ogni messaggio, perché l’intera cronologia viene rimandata e riaddebitata ogni volta.',
          ],
        },
        {
          id: 'filling-it',
          heading: 'Una finestra piena non è una finestra usata bene',
          paragraphs: [
            'Una finestra grande è un margine, non un obiettivo. I modelli distribuiscono l’attenzione in modo disuguale su un contesto lungo: ciò che sta a metà di un input molto lungo rischia più di essere trattato di sfuggita rispetto a ciò che sta agli estremi.',
            'In pratica dieci pagine mirate battono di solito duecento pagine sparse. Il recupero esiste proprio per scegliere quelle dieci pagine invece di mandare tutto e sperare.',
          ],
        },
        {
          id: 'cost',
          heading: 'Come alza il costo',
          paragraphs: [
            'Quasi tutti i fornitori fatturano a token, input e output separatamente, e l’input di solito costa meno. Un documento grande allegato a ogni messaggio di una conversazione lunga viene addebitato a ogni messaggio, non una volta.',
            'È la causa più comune di una bolletta sorprendente, e il rimedio è strutturale: allega ciò che la domanda richiede invece di tutto ciò che potrebbe servire.',
          ],
        },
      ],
      faq: [
        {
          question: 'Una finestra più grande è sempre meglio?',
          answer:
            'Toglie un limite, il che è positivo, ma non migliora come il modello usa ciò che riceve. Una finestra più grande ti compra soprattutto la possibilità di commettere un errore più costoso.',
        },
        {
          question: 'Che cos’è un token?',
          answer:
            'All’incirca un frammento di parola. In inglese si aggira sui tre quarti di parola per token, quindi mille token sono circa settecentocinquanta parole — ma varia molto per lingua, e gli alfabeti non latini spesso consumano più token per parola.',
        },
        {
          question: 'Cosa succede se la supero?',
          answer:
            'La richiesta fallisce, oppure l’applicazione scarta in silenzio i messaggi più vecchi. Il secondo caso è più frequente e più confuso, perché il modello sembra dimenticare qualcosa che hai detto.',
        },
      ],
      productNote:
        'ClawAI registra i token consumati da ogni messaggio: una conversazione che sta diventando cara si vede prima della fattura, non dopo.',
    },
    [LearnTopic.WHAT_IS_RAG]: {
      seo: {
        title: 'Che cos’è il RAG (generazione aumentata dal recupero)?',
        description:
          'Il RAG recupera i passaggi rilevanti dai tuoi documenti e li mette davanti al modello. Come la suddivisione e la qualità del recupero decidono se funziona.',
        keywords: ['RAG', 'generazione aumentata dal recupero', 'IA sui documenti'],
      },
      eyebrow: 'Contesto',
      title: 'Che cos’è la generazione aumentata dal recupero?',
      summary:
        'Il RAG consiste nel cercare nei propri documenti i passaggi rilevanti per una domanda e includerli nella richiesta. Il modello risponde a partire da materiale che hai fornito tu invece che dalla memoria, ed è questo che gli permette di parlare di documenti su cui non è mai stato addestrato.',
      sections: [
        {
          id: 'how-it-works',
          heading: 'Come funziona',
          paragraphs: [
            'I documenti vengono divisi in blocchi e ogni blocco è convertito in un vettore, una rappresentazione numerica del suo significato. La domanda è convertita allo stesso modo, e vengono recuperati i blocchi i cui vettori sono più vicini.',
            'Quei blocchi vengono inseriti nel prompt, di solito con l’istruzione di rispondere a partire da essi. Il modello fa il lavoro linguistico; il recupero fa il sapere.',
          ],
        },
        {
          id: 'retrieval-quality',
          heading: 'La qualità del recupero è tutto il sistema',
          paragraphs: [
            'Se il passaggio giusto non viene recuperato, nessun modello salverà la risposta: risponderà con conoscenze generali e suonerà altrettanto sicuro. Quasi tutti i sistemi RAG deludenti sono problemi di recupero travestiti da generazione.',
            'La suddivisione è dove si decide. Blocchi troppo piccoli perdono il contesto che li rendeva significativi; troppo grandi e ciascuno diluisce la corrispondenza. Suddividere secondo la struttura del documento — sezioni, titoli — batte di solito la suddivisione a lunghezza fissa.',
          ],
        },
        {
          id: 'what-it-fixes',
          heading: 'Cosa risolve e cosa no',
          paragraphs: [
            'Il RAG risolve «il modello non ha mai visto i miei documenti». Riduce le allucinazioni sulle domande a cui i documenti rispondono, perché la risposta è davanti al modello.',
            'Non risolve il ragionamento e non impedisce al modello di rispondere a memoria quando il recupero non restituisce nulla di utile. L’ancoraggio è una forte tendenza, non una garanzia, e la modalità di fallimento è una risposta sicura senza fonte.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il RAG è lo stesso del fine-tuning?',
          answer:
            'No, e risolvono problemi diversi. Il fine-tuning cambia come si comporta un modello; il RAG cambia cosa sa per una richiesta. Per «rispondi a domande sui miei documenti», il RAG è quasi sempre lo strumento giusto e molto più economico da tenere aggiornato.',
        },
        {
          question: 'Le finestre grandi rendono il RAG obsoleto?',
          answer:
            'No. Puoi incollare di più, ma paghi ogni token a ogni messaggio e i modelli distribuiscono male l’attenzione su input molto lunghi. Il recupero è anche l’unico approccio che scala oltre ciò che sta in qualsiasi finestra.',
        },
        {
          question: 'Il RAG manda i miei documenti al fornitore del modello?',
          answer:
            'I passaggi recuperati sì, perché è così che il modello li vede. Se è inaccettabile, il modello deve girare in un posto che controlli, ed è a questo che serve l’esecuzione locale.',
        },
      ],
      productNote:
        'ClawAI recupera dai file che alleghi e lo combina con l’esecuzione locale, così i passaggi recuperati possono restare sul tuo hardware.',
    },
    [LearnTopic.WHAT_IS_AI_MEMORY]: {
      seo: {
        title: 'Che cos’è la memoria di un assistente IA?',
        description:
          'La memoria è ciò che un assistente conserva tra le conversazioni. Come differisce dalla finestra di contesto, quanto costa in token e la questione della riservatezza.',
        keywords: ['memoria IA', 'contesto persistente', 'memoria dell’assistente'],
      },
      eyebrow: 'Contesto',
      title: 'Che cos’è la memoria di un assistente IA?',
      summary:
        'La memoria è l’applicazione che conserva fatti su di te e li reintroduce in conversazioni successive. Il modello di per sé non ricorda nulla tra le richieste; la memoria è una funzione costruita attorno, con un costo e una forma di riservatezza che vale la pena capire prima di attivarla.',
      sections: [
        {
          id: 'mechanism',
          heading: 'Come funziona davvero',
          paragraphs: [
            'L’applicazione decide che qualcosa vale la pena conservare — una preferenza, un fatto, un’istruzione permanente — e lo annota. In una conversazione successiva seleziona le voci rilevanti e le aggiunge alla richiesta prima che il modello la veda.',
            'Quindi la memoria è recupero su un archivio di fatti su di te, non qualcosa che accade dentro il modello. Il che significa che vale solo quanto valgono le decisioni su cosa conservare e cosa reintrodurre.',
          ],
        },
        {
          id: 'cost',
          heading: 'Non è gratis',
          paragraphs: [
            'Ogni fatto ricordato reintrodotto in una conversazione sono token di input, addebitati a ogni messaggio che li porta. Una memoria grande iniettata senza criterio è una tassa permanente su ogni conversazione.',
            'Le buone implementazioni sono selettive: riportano ciò che è rilevante per questa conversazione invece di tutto ciò che sanno.',
          ],
        },
        {
          id: 'privacy',
          heading: 'La questione della riservatezza',
          paragraphs: [
            'La memoria implica un archivio duraturo di fatti personali, che è una situazione diversa da una conversazione che puoi cancellare. Le domande utili sono dove è conservato, se puoi leggerlo per intero, se puoi cancellare singole voci e se viene inviato al fornitore del modello quando reintrodotto.',
            'L’ultima è quella che sfugge. Un fatto ricordato che viene iniettato in un prompt va dove va quel prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'La memoria addestra il modello sui miei dati?',
          answer:
            'Di per sé no. La memoria mette testo in un prompt; l’addestramento cambia i pesi del modello. Se un fornitore si addestri sui prompt è una questione separata e dipende dai suoi termini.',
        },
        {
          question: 'Perché l’assistente ricorda qualcosa di sbagliato?',
          answer:
            'Perché ha annotato qualcosa che una volta era vero, o ha letto un commento di passaggio come una preferenza permanente. Poter leggere e modificare l’archivio direttamente è l’unico vero rimedio.',
        },
        {
          question: 'La memoria equivale a una conversazione lunga?',
          answer:
            'No. Una conversazione lunga conserva tutto e lo paga a ogni messaggio. La memoria conserva fatti selezionati e sopravvive alla fine della conversazione.',
        },
      ],
      productNote:
        'La memoria in ClawAI è un insieme di voci archiviate e ispezionabili invece di un profilo opaco, e può essere abbinata all’esecuzione locale perché i fatti ricordati restino su hardware che controlli.',
    },
    [LearnTopic.WHAT_ARE_CONTEXT_PACKS]: {
      seo: {
        title: 'Che cosa sono i pacchetti di contesto?',
        description:
          'I pacchetti di contesto sono insiemi riutilizzabili che alleghi a una conversazione di proposito. Come differiscono da memoria e RAG, e quando conviene un pacchetto curato.',
        keywords: ['pacchetti di contesto', 'contesto riutilizzabile', 'contesto del prompt'],
      },
      eyebrow: 'Contesto',
      title: 'Che cosa sono i pacchetti di contesto?',
      summary:
        'Un pacchetto di contesto è un insieme di materiale con un nome e riutilizzabile — istruzioni, testi di riferimento, file, link — che alleghi a una conversazione di proposito. Sta tra la memoria, che il sistema sceglie per te, e un allegato una tantum, che ricostruisci ogni volta.',
      sections: [
        {
          id: 'the-gap',
          heading: 'Il vuoto che colmano',
          paragraphs: [
            'La memoria è automatica: il sistema decide cosa conservare e quando reintrodurlo, il che è comodo e impreciso. Un allegato una tantum è preciso e usa e getta: la settimana prossima raccogli di nuovo gli stessi cinque documenti.',
            'Un pacchetto è la via di mezzo: assemblato una volta, di proposito, e applicato quando decidi tu. I tuoi standard di codice, la terminologia del prodotto, i vincoli che un lavoro deve rispettare.',
          ],
        },
        {
          id: 'what-goes-in',
          heading: 'Cosa ci va dentro',
          paragraphs: [
            'Materiale stabile che altrimenti rispiegheresti: stile della casa, vocabolario di dominio, vincoli permanenti, la forma di output che vuoi sempre.',
            'Non ci va nulla che cambi a ogni domanda. Un pacchetto che modifichi ogni volta che lo usi è un prompt con passaggi in più.',
          ],
        },
        {
          id: 'cost-and-discipline',
          heading: 'Costo e disciplina',
          paragraphs: [
            'Un pacchetto sono token di input a ogni messaggio a cui è allegato, quindi uno grande applicato a tutto è il problema di costo della finestra di contesto in altra forma. Più pacchetti piccoli e specifici battono uno grande e generico.',
            'Poiché un pacchetto è esplicito, è anche verificabile: puoi leggere esattamente cosa viene inviato, cosa non vera per una memoria che si assembla da sola.',
          ],
        },
      ],
      faq: [
        {
          question: 'In cosa differisce da un prompt di sistema?',
          answer:
            'Un prompt di sistema è di solito un blocco di istruzioni impostato una volta. Un pacchetto è un insieme con un nome che alleghi e stacchi per conversazione, e può portare file e riferimenti oltre alle istruzioni.',
        },
        {
          question: 'Posso usarne più di uno insieme?',
          answer:
            'Sì, e comporne di piccoli è proprio il punto: un pacchetto lingua più uno di stile della casa invece di un blocco per progetto.',
        },
        {
          question: 'I pacchetti sostituiscono il RAG?',
          answer:
            'No. Un pacchetto è curato a mano e sempre incluso; il recupero seleziona da un corpus grande secondo la domanda. I pacchetti si adattano al materiale stabile; il recupero a materiale troppo grande da allegare.',
        },
      ],
      productNote:
        'I pacchetti di contesto di ClawAI sono insiemi riutilizzabili che alleghi per conversazione: ciò che il modello riceve è qualcosa che hai assemblato tu, non qualcosa dedotto su di te.',
    },
    [LearnTopic.WHAT_IS_LOCAL_AI]: {
      seo: {
        title: 'Che cos’è l’IA locale?',
        description:
          'L’IA locale esegue un modello su hardware che controlli. Cosa cambia per riservatezza e costo, cosa richiede in hardware e dove compete davvero.',
        keywords: ['IA locale', 'IA on-premise', 'IA privata'],
      },
      eyebrow: 'Locale e privato',
      title: 'Che cos’è l’IA locale?',
      summary:
        'IA locale significa che il modello gira su una macchina che controlli — il tuo portatile, il tuo server, il tuo rack — invece che come chiamata all’API di qualcun altro. Il prompt non lascia l’hardware, il che cambia del tutto la questione della riservatezza e cambia quella del costo in un modo spesso frainteso.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Cosa cambia',
          paragraphs: [
            'I dati sono il motivo vero. Un prompt inviato a un modello ospitato viene elaborato da quel fornitore secondo i suoi termini. Un prompt a un modello locale non viene inviato da nessuna parte, l’unica versione di quella garanzia che non dipende dalla politica di un terzo.',
            'Elimina anche la fatturazione a token, i limiti di frequenza e la possibilità che un modello venga ritirato sotto i tuoi piedi. Un modello scaricato continua a funzionare.',
          ],
        },
        {
          id: 'the-cost-shape',
          heading: 'La forma del costo, non il costo',
          paragraphs: [
            'L’IA locale non è automaticamente più economica. Converte un costo variabile in uno fisso: compri o affitti hardware, e da lì l’inferenza è quasi gratuita al margine.',
            'È un buon affare a volumi alti e costanti e un cattivo affare per l’uso occasionale. Una GPU ferma per gran parte della giornata costa più delle chiamate API che ha sostituito.',
          ],
        },
        {
          id: 'the-honest-limits',
          heading: 'I limiti onesti',
          paragraphs: [
            'I modelli che girano comodamente su una singola macchina non sono in genere i più grandi disponibili. Sui compiti di ragionamento più duri il divario con un modello di frontiera ospitato è reale.',
            'Per moltissimo lavoro quotidiano — riassumere, redigere, estrarre, classificare, codice di routine — il divario è molto più piccolo di quanto si creda, e le proprietà di riservatezza e costo contano spesso più dell’ultimo incremento di capacità.',
          ],
        },
        {
          id: 'hybrid',
          heading: 'Più utile in forma ibrida',
          paragraphs: [
            'Lo schema comune non è né solo locale né solo cloud. È locale per ciò che è sensibile o ad alto volume, ospitato per le domande più difficili, e una politica che decide cosa è cosa — esattamente ciò a cui serve un router.',
          ],
        },
      ],
      faq: [
        {
          question: 'Che hardware serve?',
          answer:
            'Dipende interamente da dimensione del modello e quantizzazione, e chi ti dà un numero unico sta tirando a indovinare. Il vincolo dominante è la memoria disponibile: i pesi devono starci, e ciò che ci sta determina cosa puoi eseguire.',
        },
        {
          question: 'L’IA locale è privata per definizione?',
          answer:
            'La chiamata al modello sì. Il resto dell’applicazione può non esserlo: ricerca, telemetria e altre integrazioni possono ancora uscire. La riservatezza è una proprietà dell’intero sistema, non di un componente.',
        },
        {
          question: 'I modelli locali possono usare i miei documenti?',
          answer:
            'Sì. Il recupero funziona allo stesso modo, e quando sia il recupero sia il modello sono locali i documenti non lasciano mai il tuo hardware.',
        },
      ],
      productNote:
        'ClawAI esegue modelli locali tramite Ollama e llama.cpp, e la sua modalità di routing solo locale tiene l’intera catena di fallback su fornitori locali invece di cercare un modello cloud.',
    },
    [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]: {
      seo: {
        title: 'Che cosa sono i modelli open-weight?',
        description:
          'I modelli open-weight pubblicano i parametri addestrati così puoi eseguirli tu. Cosa copre «aperto», cosa non copre e perché le licenze differiscono tanto.',
        keywords: ['modelli open-weight', 'LLM open source', 'modelli scaricabili'],
      },
      eyebrow: 'Locale e privato',
      title: 'Che cosa sono i modelli open-weight?',
      summary:
        'Un modello open-weight è un modello i cui parametri addestrati sono pubblicati, così puoi scaricarlo ed eseguirlo sul tuo hardware. È un termine preciso e volutamente più stretto di «open source»: la disponibilità dei pesi non dice nulla sui dati di addestramento, sul codice o su cosa consente la licenza.',
      sections: [
        {
          id: 'what-open-covers',
          heading: 'Cosa copre «aperto» qui',
          paragraphs: [
            'Pesi aperti significa che i numeri che costituiscono il modello addestrato sono scaricabili. Basta per eseguirlo, affinarlo, ispezionarlo e tenerlo funzionante indipendentemente da cosa farà poi l’editore.',
            'Di solito non include i dati di addestramento e spesso nemmeno il codice di addestramento. Quindi un modello open-weight è riproducibile nel senso che puoi eseguirlo, non nel senso che potresti ricostruirlo.',
          ],
        },
        {
          id: 'licences',
          heading: 'Le licenze differiscono davvero',
          paragraphs: [
            'Alcuni modelli open-weight portano normali licenze permissive. Altri portano condizioni: restrizioni sull’uso commerciale oltre una certa soglia, divieti su applicazioni particolari o requisiti di attribuzione e sui modelli derivati.',
            'Questo conta commercialmente ed è facile da saltare. «Possiamo scaricarlo» e «possiamo usarlo nel nostro prodotto» sono domande diverse, e solo la licenza risponde alla seconda.',
          ],
        },
        {
          id: 'why-they-matter',
          heading: 'Perché contano',
          paragraphs: [
            'Sono gli unici modelli che puoi eseguire interamente sul tuo hardware, il che li rende la base di ogni deployment locale e privato. E non possono essere ritirati sotto i tuoi piedi: un modello scaricato funziona finché lo conservi.',
            'Il divario di capacità con i migliori modelli ospitati è reale e si è ristretto parecchio. Per gran parte del lavoro quotidiano non è più il fattore decisivo.',
          ],
        },
      ],
      faq: [
        {
          question: 'Open-weight è lo stesso di open source?',
          answer:
            'No. Open source implica il codice sorgente e la libertà di usarlo e modificarlo. Open-weight significa che i parametri sono pubblicati, sotto la licenza scelta da chi li ha pubblicati, che a volte è restrittiva.',
        },
        {
          question: 'Posso affinare un modello open-weight?',
          answer:
            'Tecnicamente sì, è una delle ragioni principali per volere i pesi. Se tu possa farlo, e cosa tu possa fare del risultato, è una questione di licenza che varia per modello.',
        },
        {
          question: 'Si possono usare commercialmente senza rischi?',
          answer:
            'Molti sì; alcuni non senza condizioni. Leggi la licenza specifica del modello specifico: è l’unica cosa in questo ambito che davvero non si può generalizzare.',
        },
      ],
      productNote:
        'ClawAI esegue modelli open-weight tramite Ollama e llama.cpp sul tuo hardware, accanto a {cloudProviderCount} fornitori cloud, con il routing che decide chi gestisce cosa.',
    },
    [LearnTopic.WHAT_IS_SELF_HOSTED_AI]: {
      seo: {
        title: 'Che cos’è l’IA self-hosted?',
        description:
          'L’IA self-hosted significa eseguire l’intera applicazione da soli, non solo il modello. Cosa comprende, cosa richiede operativamente e come differisce dai modelli locali.',
        keywords: ['IA self-hosted', 'piattaforma IA on-premise', 'deployment privato'],
      },
      eyebrow: 'Locale e privato',
      title: 'Che cos’è l’IA self-hosted?',
      summary:
        'Self-hosting significa che l’applicazione gira su infrastruttura che controlli — l’interfaccia, i database, le code, l’orchestrazione — non solo il modello. È un impegno maggiore che eseguire un modello locale e risponde a un’altra domanda: non solo «dove avviene l’inferenza» ma «chi custodisce i dati a riposo».',
      sections: [
        {
          id: 'more-than-the-model',
          heading: 'È più del modello',
          paragraphs: [
            'Eseguire un modello locale lascia comunque conversazioni, file, memoria e dati dell’account nell’applicazione che hai usato. Il self-hosting sposta tutto questo sulla tua infrastruttura.',
            'La distinzione conta per chiunque abbia obblighi sui dati archiviati e non sull’inferenza. Dove gira il modello e dove vive lo storico sono domande separate, e solo il self-hosting risponde alla seconda.',
          ],
        },
        {
          id: 'what-it-costs-you',
          heading: 'Cosa costa operativamente',
          paragraphs: [
            'Ti prendi aggiornamenti, backup, monitoraggio, TLS e il debug quando qualcosa si rompe a un’ora scomoda. È un costo reale e continuo, misurato in attenzione più che in denaro.',
            'Vale la pena quando i dati davvero non possono stare altrove, o quando il deployment deve sopravvivere a qualunque rapporto con un fornitore. Non vale la pena come precauzione generica.',
          ],
        },
        {
          id: 'hybrid-is-normal',
          heading: 'Self-hosted non significa scollegato',
          paragraphs: [
            'Un deployment self-hosted può comunque chiamare modelli ospitati. Molti lo fanno: la piattaforma e i suoi dati sono tuoi, e i fornitori cloud si usano dove la loro capacità giustifica l’uscita dei dati.',
            'La combinazione che elimina del tutto l’elaborazione esterna è self-hosting più modelli locali, ed è una configurazione deliberata, non l’impostazione predefinita.',
          ],
        },
      ],
      faq: [
        {
          question: 'Self-hosting è lo stesso dell’IA locale?',
          answer:
            'No. L’IA locale riguarda dove gira il modello. Il self-hosting riguarda dove vivono l’applicazione e i suoi dati. Puoi avere l’uno senza l’altro, e la posizione di riservatezza più forte richiede entrambi.',
        },
        {
          question: 'Il self-hosting ci rende conformi?',
          answer:
            'No. Può essere un tassello di un percorso di conformità, ma la conformità è fatta di contratti, controlli, evidenze e audit. Dove gira il software è uno degli elementi, non l’unico.',
        },
        {
          question: 'Cosa serve per gestirlo?',
          answer:
            'Per quasi tutte le piattaforme, container, un database e un posto dove farli girare — più una persona che si assuma il percorso di aggiornamento. È l’ultima cosa a essere sottovalutata.',
        },
      ],
      productNote:
        'ClawAI gira sulla tua infrastruttura — l’intero stack, non un piano ospitato con un’opzione locale — e il suo codice è disponibile per una revisione tecnica.',
    },
    [LearnTopic.OLLAMA_VS_LLAMACPP]: {
      seo: {
        title: 'Ollama o llama.cpp: quale usare?',
        description:
          'Ollama e llama.cpp eseguono entrambi modelli open-weight in locale. Come si rapportano, a cosa serve ciascuno e perché usarli entrambi è normale.',
        keywords: ['Ollama o llama.cpp', 'runtime locale', 'eseguire un LLM in locale'],
      },
      eyebrow: 'Locale e privato',
      title: 'Ollama o llama.cpp',
      summary:
        'Non sono davvero concorrenti. llama.cpp è il motore di inferenza che ha reso praticabile eseguire modelli linguistici su hardware ordinario; Ollama è un gestore di modelli e un server costruiti su quella linea. La domanda di solito non è quale scegliere, ma a quale livello vuoi lavorare.',
      sections: [
        {
          id: 'what-each-is',
          heading: 'Cos’è ciascuno',
          paragraphs: [
            'llama.cpp è un motore di inferenza in C++. Esegue modelli quantizzati in modo efficiente su CPU e GPU, ed espone un controllo fine su come un modello viene caricato ed eseguito. È il livello basso, e gran parte dell’ecosistema dell’IA locale è costruita sopra.',
            'Ollama avvolge un motore di questo tipo nella comodità: scarichi un modello per nome, avvii un server, ottieni un’API HTTP e lasci gestire file dei modelli e memoria. Ottimizza per avere un modello in funzione in un minuto.',
          ],
        },
        {
          id: 'choosing',
          heading: 'Come scegliere',
          paragraphs: [
            'Scegli Ollama se vuoi modelli in funzione in fretta con impostazioni predefinite sensate, se alterni più modelli o se vuoi un’API locale stabile senza mettere mano a nulla.',
            'Scegli llama.cpp direttamente se ti serve controllo — una quantizzazione precisa, uno scarico di layer preciso, hardware insolito o inferenza incorporata nel tuo binario. Il prezzo è che i dettagli li gestisci tu.',
          ],
        },
        {
          id: 'both',
          heading: 'Usarli entrambi è normale',
          paragraphs: [
            'Un assetto comune è Ollama per l’uso interattivo quotidiano e llama.cpp per un carico ottimizzato di proposito. Non si escludono, e una piattaforma che supporta entrambi lascia decidere per deployment invece che una volta per tutte.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ollama è solo un wrapper?',
          answer:
            'Sarebbe riduttivo. Gestione dei modelli, gestione della memoria e un’API coerente sono proprio le parti che rendono i modelli locali praticabili ogni giorno, e sono lavoro vero qualunque sia il motore sotto.',
        },
        {
          question: 'Quale è più veloce?',
          answer:
            'A parità di modello, quantizzazione e hardware sono vicini, perché il lavoro pesante è lo stesso. Le differenze in pratica vengono di solito dalla configurazione, non dallo strumento.',
        },
        {
          question: 'Cos’è la quantizzazione?',
          answer:
            'Conservare i pesi del modello a precisione minore così occupano meno memoria. È ciò che fa stare modelli grandi su hardware ordinario, scambiando un po’ di qualità con molta praticità.',
        },
      ],
      productNote:
        'ClawAI supporta entrambi come runtime locali: un deployment può usare la comodità di Ollama, il controllo di llama.cpp o entrambi insieme.',
    },
    [LearnTopic.CLOUD_AI_VS_LOCAL_AI]: {
      seo: {
        title: 'IA cloud o IA locale: come scegliere',
        description:
          'I modelli cloud offrono capacità senza hardware; quelli locali offrono controllo e costo piatto. I compromessi che decidono davvero e perché quasi tutti usano entrambi.',
        keywords: ['IA cloud o locale', 'LLM locale o ospitato', 'deployment di IA privata'],
      },
      eyebrow: 'Locale e privato',
      title: 'IA cloud o IA locale',
      summary:
        'Il riassunto onesto: i modelli cloud sono più capaci ai vertici e non richiedono nulla da te; quelli locali tengono i dati sul tuo hardware e trasformano una bolletta variabile in una fissa. Quasi nessuno dovrebbe sceglierne uno per tutto, e la domanda interessante è dove passa la linea.',
      sections: [
        {
          id: 'capability',
          heading: 'Capacità',
          paragraphs: [
            'I modelli più grandi e potenti sono ospitati, e sul ragionamento davvero difficile la differenza è reale. Se il tuo lavoro è dominato dalle domande più dure, questo conta più di tutto il resto in questa pagina.',
            'Per riassumere, redigere, estrarre, classificare e codice di routine, il divario si è ristretto abbastanza da essere raramente decisivo.',
          ],
        },
        {
          id: 'data',
          heading: 'Dati',
          paragraphs: [
            'Di solito è questo a decidere davvero. Un prompt inviato a un modello ospitato viene elaborato da quel fornitore secondo i suoi termini. Per la maggior parte dei contenuti va bene. Per alcuni — documenti regolamentati, lavori non pubblicati, materiale riservato di terzi — no, e nessuna garanzia contrattuale è forte quanto dati che non escono.',
            'Per questo la divisione è raramente tutto o niente. Si decide di solito per tipo di dato e non per organizzazione.',
          ],
        },
        {
          id: 'cost',
          heading: 'Costo',
          paragraphs: [
            'Il cloud è variabile: nessun esborso iniziale e una bolletta proporzionale all’uso che cresce con il successo. Il locale è fisso: hardware in anticipo, poi costo marginale quasi nullo.',
            'Il punto di incrocio dipende dal volume. L’uso occasionale costa meno ospitato. L’uso intenso, costante e prevedibile costa di solito meno in locale, e il pareggio arriva prima di quanto ci si aspetti quando l’uso è continuo.',
          ],
        },
        {
          id: 'the-answer',
          heading: 'Quasi tutti finiscono con entrambi',
          paragraphs: [
            'Locale per il sensibile e l’alto volume, ospitato per le domande più dure, e una politica di routing che decide per richiesta. Serve un sistema in cui la decisione sia esplicita e verificabile — altrimenti «il sensibile resta in locale» è un’intenzione e non un controllo.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’IA locale è più economica?',
          answer:
            'A volume costante, di solito sì. A volume basso o irregolare, di solito no: l’hardware fermo costa comunque.',
        },
        {
          question: 'Posso iniziare ospitato e spostarmi dopo?',
          answer:
            'Sì, ed è un ordine sensato: valida il flusso con modelli ospitati, poi sposta le parti il cui volume o sensibilità giustifica l’hardware. È molto più facile su una piattaforma che già supporta entrambi.',
        },
        {
          question: 'L’ibrido è complicato?',
          answer:
            'Lo è se lo costruisci tu, perché mantieni due percorsi. È semplice se lo strato di routing tratta già modelli locali e ospitati come destinazioni intercambiabili.',
        },
      ],
      productNote:
        'ClawAI tratta modelli locali e cloud come lo stesso tipo di destinazione, e le sue modalità riservatezza prima e solo locale fanno di «il sensibile resta in locale» un’impostazione invece di un’abitudine.',
    },
    [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: {
      seo: {
        title: 'Agente IA o chatbot: qual è la differenza?',
        description:
          'Un chatbot risponde; un agente agisce. Cosa cambia quando un modello usa strumenti, perché alza la posta e cosa controllare prima di lasciarlo agire.',
        keywords: ['agente IA o chatbot', 'cos’è un agente IA', 'uso di strumenti'],
      },
      eyebrow: 'Fondamenti',
      title: 'Agente IA o chatbot',
      summary:
        'Un chatbot produce testo e decidi tu cosa farne. A un agente si danno strumenti e un obiettivo, e compie passi da solo — leggere file, chiamare API, eseguire comandi — finché non ritiene di aver finito. La differenza non è l’intelligenza; è se l’output sia un suggerimento o un’azione.',
      sections: [
        {
          id: 'the-difference',
          heading: 'La differenza vera',
          paragraphs: [
            'Il meccanismo è l’uso di strumenti. Un agente è un modello in un ciclo con un insieme di strumenti che può invocare, e ogni risultato alimenta la decisione successiva. Togli strumenti e ciclo e hai un chatbot.',
            'Quel ciclo è ciò che rende gli agenti utili e rischiosi. Un chatbot che sbaglia ti fa perdere tempo. Un agente che sbaglia ha già fatto qualcosa.',
          ],
        },
        {
          id: 'what-agents-are-good-at',
          heading: 'Dove gli agenti rendono',
          paragraphs: [
            'Lavoro a più passi con uno stato finale verificabile. Esegui i test, leggi il fallimento, cambia il codice, riesegui. Il controllo chiude il ciclo, e l’agente può sapere se ha avuto successo.',
            'Faticano dove il successo è questione di giudizio, perché nulla dice loro di fermarsi. Un agente senza modo di verificare i propri progressi continuerà con sicurezza.',
          ],
        },
        {
          id: 'what-to-check',
          heading: 'Cosa controllare prima di lasciarlo agire',
          paragraphs: [
            'Quali strumenti ha, e cosa possono raggiungere. Se le azioni distruttive richiedono approvazione. Se puoi vedere i passi compiuti e non solo il risultato. E se può essere fermato a metà.',
            'I passi contano di più. Un agente il cui ragionamento non puoi ispezionare è un agente da accettare o rifiutare in blocco, la posizione peggiore da cui rivedere un lavoro.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un chatbot con ricerca è un agente?',
          answer:
            'È il confine. Appena decide da sé se cercare, e cosa fare dei risultati, ha il ciclo. Quasi tutti gli assistenti utili oggi stanno da qualche parte su questo spettro invece che a un estremo.',
        },
        {
          question: 'Gli agenti hanno bisogno dei modelli più potenti?',
          answer:
            'Ne traggono più beneficio dei chatbot, perché gli errori si accumulano tra i passi. Un piccolo errore all’inizio può portare l’intera esecuzione altrove.',
        },
        {
          question: 'È sicuro eseguire un agente su una base di codice?',
          answer:
            'Con controllo di versione, permessi ristretti e un passo di revisione, sì — è un uso consolidato. Senza, un agente sta apportando modifiche non riviste al tuo lavoro.',
        },
      ],
      productNote:
        'L’agente di codice di ClawAI gira nel tuo editor con i passi visibili e la scelta del modello nelle tue mani: un’esecuzione si rivede invece di essere da prendere o lasciare.',
    },
  },
};
