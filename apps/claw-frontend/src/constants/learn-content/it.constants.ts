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
      [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]:
        'Come un prompt diventa token, probabilità e infine una risposta generata.',
      [LearnTopic.WHAT_ARE_AI_TOKENS]:
        'L’unità che un modello legge e scrive davvero, e perché un numero esatto richiede il suo tokenizer.',
      [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]:
        'Cosa cambiano davvero temperature e top-p in una risposta, e cosa non possono cambiare.',
      [LearnTopic.WHAT_ARE_EMBEDDINGS]:
        'Come il testo diventa un vettore di numeri, e perché questo rende possibile cercare per significato.',
      [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]:
        'Tre soluzioni diverse per tre problemi diversi, e perché molti prodotti non hanno mai bisogno della terza.',
      [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]:
        'Il modello non esegue mai nulla — propone una chiamata, e la tua applicazione decide cosa succede dopo.',
      [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]:
        'Chiedere JSON a un modello è una richiesta; solo alcuni meccanismi garantiscono davvero che corrisponda al tuo schema.',
      [LearnTopic.WHY_AI_HALLUCINATES]:
        'Perché un modello afferma una risposta sbagliata con la stessa sicurezza di una giusta — e cosa la riduce davvero.',
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
      [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]:
        'Cosa testare davvero prima di affidare il tuo lavoro a un modello — non un numero da classifica.',
      [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]:
        'Cosa misura davvero un numero da benchmark, e i modi in cui può trarti in inganno ancora prima di iniziare a testare.',
    },
  },
  topics: {
    [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]: {
      seo: {
        title: 'Come generano le risposte i modelli linguistici?',
        description:
          'Scopri tokenizzazione, previsione del token successivo, contesto e campionamento, e perché una risposta fluida può comunque essere sbagliata.',
        keywords: [
          'come funzionano i modelli linguistici',
          'previsione del token successivo',
          'generazione risposte LLM',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Come i modelli linguistici generano risposte',
      summary:
        'Un modello linguistico genera una risposta un token alla volta. Trasforma il prompt in token, usa il contesto attivo per assegnare probabilità ai possibili token successivi, ne sceglie uno, lo aggiunge e ripete. Il risultato può sembrare pianificato, ma nasce da schemi statistici appresi e non dal recupero di una risposta già pronta.',
      sections: [
        {
          id: 'tokenization',
          heading: 'Il testo entra come token',
          paragraphs: [
            'Prima della generazione, un tokenizer divide istruzioni, conversazione, risultati degli strumenti e altro contesto in token. Un token può essere una parola, una sua parte o un segno di punteggiatura. Il modello elabora identificatori anziché frasi visibili, quindi ortografia, formato e lingua cambiano lo spazio occupato nella finestra di contesto.',
          ],
        },
        {
          id: 'next-token-prediction',
          heading: 'Il modello prevede un token alla volta',
          paragraphs: [
            'Data la sequenza precedente, la rete assegna una probabilità a ogni possibile token successivo del vocabolario. Una regola di decodifica ne seleziona uno, lo accoda e ripete il calcolo. Il ciclo termina con un token di arresto o un limite configurato; di norma non viene recuperata una risposta completa memorizzata prima.',
          ],
        },
        {
          id: 'context-and-probability',
          heading: 'Il contesto modifica le probabilità',
          paragraphs: [
            'Istruzioni di sistema, richiesta, messaggi precedenti e documenti forniti spostano le probabilità finché rientrano nel contesto attivo. Scegliere sempre il token più probabile rende il risultato più ripetibile; campionare tra alternative plausibili crea varietà. Temperatura e controlli simili cambiano la selezione, non aggiungono fatti.',
          ],
        },
        {
          id: 'not-database-retrieval',
          heading: 'Generare non è cercare in un database',
          paragraphs: [
            'L’addestramento distribuisce gli schemi del testo tra molti pesi numerici, che non sono un catalogo di fonti con indirizzi affidabili. Senza recupero documentale o uno strumento separato, il modello non apre un record sorgente per provare un’affermazione. Una frase scorrevole può quindi combinare schemi familiari in un dato privo di fondamento.',
          ],
        },
        {
          id: 'practical-limitations',
          heading: 'Limiti pratici da considerare',
          paragraphs: [
            'I modelli possono inventare dettagli, interpretare male richieste ambigue, perdere informazioni fuori dal contesto, ripetere distorsioni dei dati di addestramento e sbagliare calcoli o ragionamenti lunghi. Tratta gli output importanti come bozze: fornisci contesto, usa recupero o strumenti per fatti attuali e verifica le affermazioni rilevanti con una fonte o un test indipendente.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un modello linguistico capisce la propria risposta?',
          answer:
            'Può rappresentare relazioni complesse e produrre testo simile a un ragionamento, ma definirlo comprensione umana aggiunge un’ipotesi non dimostrata dal meccanismo. Operativamente prevede token da parametri appresi e contesto.',
        },
        {
          question: 'Perché lo stesso prompt può dare risposte diverse?',
          answer:
            'Nel campionamento, una scelta diversa tra i primi token cambia tutte le probabilità successive. Impostazioni deterministiche riducono la variazione, ma non garantiscono che la risposta ripetuta sia corretta.',
        },
        {
          question: 'Il modello può citare le proprie fonti?',
          answer:
            'Solo quando le fonti sono fornite tramite contesto, recupero o strumenti e il sistema conserva il collegamento. Una citazione generata soltanto dai pesi può essere inventata e va verificata.',
        },
      ],
      productNote:
        'ClawAI instrada i prompt verso modelli cloud o locali configurati e può eseguire flussi di confronto e verifica; il modello scelto continua a generare in modo probabilistico, quindi il solo instradamento non garantisce la verità.',
    },
    [LearnTopic.WHAT_ARE_AI_TOKENS]: {
      seo: {
        title: 'Che cosa sono i token dell’IA?',
        description:
          'I token sono le unità che un modello linguistico legge e scrive davvero, non parole né caratteri. Come funziona la tokenizzazione, come si contano input e output, e perché solo il tokenizer del modello dà un numero esatto.',
        keywords: ['che cos’è un token IA', 'tokenizzazione LLM', 'token di input e output'],
      },
      eyebrow: 'Fondamenti',
      title: 'Che cosa sono i token dell’IA?',
      summary:
        'Un token è l’unità che un modello linguistico legge e scrive davvero: un frammento di testo ottenuto dividendo il tuo input con il tokenizer proprio del modello. Non è una parola né un carattere, e quanti token produce un testo dipende dalla lingua in cui è scritto, da come è formattato e da quale tokenizer lo sta contando.',
      sections: [
        {
          id: 'tokens-vs-words-and-characters',
          heading: 'Un token non è una parola, né un carattere',
          paragraphs: [
            'Un tokenizer divide il testo in pezzi tratti da un vocabolario fisso appreso durante l’addestramento. Una parola breve e comune è spesso esattamente un token; una parola più lunga o rara può dividersi in due o tre; un singolo simbolo insolito può da solo occupare più di un token. Anche la punteggiatura, gli spazi e gli a-capo sono token, e non sono gratuiti.',
            'Per questo il numero di token, il numero di parole e il numero di caratteri seguono percorsi indipendenti. Due frasi con lo stesso numero di parole possono usare un numero diverso di token, e riscrivere una frase con parole più brevi e comuni può ridurne il numero di token senza accorciarla come testo.',
          ],
        },
        {
          id: 'tokenization-differs-by-language-and-model',
          heading: 'La tokenizzazione varia per lingua e per modello',
          paragraphs: [
            'Ogni modello arriva con il proprio tokenizer e il proprio vocabolario fisso, costruito sul testo con cui è stato addestrato. Le espressioni frequenti in quel testo di addestramento tendono a comprimersi in token meno numerosi e più lunghi; le espressioni rare tendono a dividersi in pezzi più numerosi e più corti.',
            'Ne derivano due conseguenze dirette. Primo, la stessa frase può costare un numero di token sensibilmente diverso a seconda della lingua in cui è scritta, perché nessun vocabolario rappresenta due lingue allo stesso modo. Secondo, la stessa frase può costare un numero diverso di token su due modelli distinti, perché ciascuno ha il proprio vocabolario: un conteggio dal tokenizer di un modello non è una stima affidabile per un altro.',
          ],
        },
        {
          id: 'input-and-output-tokens',
          heading: 'Una richiesta consuma token di input e token di output',
          paragraphs: [
            'Ogni richiesta ha due riserve di token, contate e di norma tariffate separatamente. I token di input sono tutto ciò che viene inviato al modello: istruzioni, la conversazione visibile, eventuali documenti allegati e i risultati degli strumenti. I token di output sono tutto ciò che il modello genera in cambio.',
            'I token di input non sono un costo una tantum in una conversazione con più turni. Poiché ogni nuova richiesta rinvia la conversazione avuta fin lì, i messaggi precedenti ed eventuale materiale allegato vengono ricontati come input a ogni turno, non solo nel turno in cui sono stati aggiunti la prima volta.',
          ],
        },
        {
          id: 'tokens-and-the-context-window',
          heading: 'I token sono l’unità in cui si misura una finestra di contesto',
          paragraphs: [
            'Una finestra di contesto è un budget espresso in token, condiviso tra input e output di una singola richiesta. «Che cos’è una finestra di contesto?» spiega come si comporta questo budget nella pratica; qui conta solo l’unità di misura — la finestra non si misura in parole, caratteri o messaggi, si misura in token, e input e output attingono dallo stesso totale.',
          ],
        },
        {
          id: 'estimating-cost-without-a-price-table',
          heading: 'Stimare il costo senza un numero fisso',
          paragraphs: [
            'Il costo basato sui token è una moltiplicazione: token usati per una tariffa fissata per modello. I fornitori fissano e cambiano quelle tariffe secondo il proprio calendario, e un modello più capace di solito costa di più per token rispetto a uno più piccolo, con i token di output in genere tariffati più cari di quelli di input. Nulla di tutto ciò rende utile pubblicare qui una cifra precisa: una tariffa stampata su questa pagina sarebbe sbagliata entro pochi mesi.',
            'Ciò che resta vero a prescindere dal listino attuale è la forma del costo: prompt più brevi e mirati e risposte più brevi e mirate usano meno token, e rinviare grandi allegati a ogni turno di una conversazione lunga è uno dei modi più comuni in cui il consumo di token cresce senza che nessuno l’abbia deciso.',
          ],
        },
        {
          id: 'exact-counts-need-the-tokenizer',
          heading: 'Un numero esatto richiede il tokenizer proprio del modello',
          paragraphs: [
            'Una regola empirica sui token per parola è un’approssimazione valida per una lingua elaborata da un tokenizer, e non si trasferisce a un’altra lingua, un’altra scrittura o un altro modello. Anche la formattazione cambia il numero: codice, JSON e testo molto punteggiato tendono a tokenizzare in modo meno efficiente della stessa informazione scritta come prosa semplice.',
            'Se un numero esatto è importante — perché una richiesta è vicina a un limite di contesto, o perché il costo va previsto con precisione — l’unico metodo affidabile è far passare il testo reale attraverso il tokenizer proprio del modello specifico, o un endpoint di conteggio, prima di inviarlo. Una stima basata su parole o caratteri è una supposizione travestita da numero.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un token è la stessa cosa di una parola?',
          answer:
            'No. Una parola breve e comune è spesso un token, ma una parola più lunga o rara può dividersi in più token, e punteggiatura, spazi e a-capo contano come token a pieno titolo. Il numero di token e il numero di parole si corrispondono solo in modo approssimativo.',
        },
        {
          question: 'Perché la stessa frase usa un numero diverso di token in strumenti diversi?',
          answer:
            'Ogni strumento di solito riporta il conteggio del tokenizer di un modello specifico, e ogni modello ha il proprio vocabolario costruito sul proprio testo di addestramento. Un conteggio esatto per il tokenizer di un modello è solo una stima per un altro.',
        },
        {
          question: 'Una formattazione come codice o JSON usa più token del testo semplice?',
          answer:
            'Spesso sì. Indentazione, punteggiatura e simboli ripetuti sono essi stessi token, quindi un formato molto strutturato può usare notevolmente più token della stessa informazione scritta in frasi semplici.',
        },
        {
          question:
            'Come posso sapere il numero esatto di token di una richiesta prima di inviarla?',
          answer:
            'Fai passare il testo esatto attraverso il tokenizer proprio del modello specifico, o un endpoint di conteggio che offre. Qualsiasi stima basata su numero di parole o caratteri resta approssimativa, e l’errore cresce con le differenze di lingua, scrittura e formattazione.',
        },
      ],
      productNote:
        'ClawAI conta i token di input e output effettivamente usati da una richiesta una volta generata la risposta, e mostra il costo e la quota consumata per quella risposta invece di una stima fatta in anticipo.',
    },
    [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]: {
      seo: {
        title: 'Cosa controllano temperature e top-p?',
        description:
          'Temperature e top-p decidono come un modello sceglie il token successivo, non cosa sa. Cosa cambia davvero ogni impostazione, perché più basso non è automaticamente meglio, e perché temperature zero non è comunque perfettamente ripetibile.',
        keywords: [
          'temperature top-p spiegati',
          'parametri di campionamento LLM',
          'casualità nell’output dell’IA',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Cosa controllano temperature e top-p?',
      summary:
        'Temperature e top-p sono impostazioni di decodifica che cambiano il modo in cui un modello sceglie il token successivo a partire dalle probabilità già calcolate. Controllano la casualità nel lessico e nella formulazione, non l’accuratezza, la conoscenza o la capacità di ragionamento — e nessuna delle due garantisce un output esattamente ripetibile, nemmeno nell’impostazione più prudente.',
      sections: [
        {
          id: 'what-these-settings-actually-change',
          heading: 'Rimodellano una scelta, non la conoscenza del modello',
          paragraphs: [
            'Quando temperature o top-p entrano in gioco, il modello ha già calcolato una probabilità per ogni possibile token successivo dato il contesto attuale. Nessuna delle due impostazioni cambia da dove vengono quelle probabilità — i parametri appresi del modello e il contesto fornito. Cambiano solo il modo in cui un token viene scelto dalla distribuzione già prodotta dal modello.',
          ],
        },
        {
          id: 'temperature-and-the-shape-of-the-distribution',
          heading: 'La temperature regola quanto è marcata o piatta quella distribuzione',
          paragraphs: [
            'Una temperature più bassa rende i token con probabilità più alta ancora più probabili da scegliere, quindi l’output pende verso l’unica continuazione più probabile e si ripete di più tra esecuzioni distinte. Una temperature più alta appiattisce la distribuzione, dando ai token meno probabili una possibilità più realistica di essere scelti, il che produce una formulazione più varia — e più spazio perché un token improbabile, a volte strano, si insinui.',
            'La temperature non aggiunge informazioni che il modello non possiede. Non può trasformare una supposizione sbagliata in una corretta; cambia solo quanto fortemente il modello si impegna sulla supposizione che già preferisce.',
          ],
        },
        {
          id: 'top-p-and-the-candidate-pool',
          heading: 'Il top-p limita quali token vengono anche solo considerati',
          paragraphs: [
            'Il top-p, detto anche nucleus sampling, funziona in modo diverso dalla temperature: invece di rimodellare ogni probabilità, restringe prima il campo al più piccolo insieme di token principali le cui probabilità sommano a una soglia scelta, e poi campiona solo da quell’insieme. Un top-p basso conserva solo la manciata di token di cui il modello è più sicuro; un top-p alto lascia entrare una gamma più ampia di alternative plausibili. Temperature e top-p si applicano di solito insieme, uno dopo l’altro, non come sostituti l’uno dell’altro.',
          ],
        },
        {
          id: 'why-temperature-zero-is-not-perfectly-repeatable',
          heading: 'Temperature zero è vicina al deterministico, non esattamente deterministica',
          paragraphs: [
            'Una temperature pari a zero, o un’impostazione equivalente “scegli sempre il token più probabile”, rimuove il passaggio di campionamento e dovrebbe, in linea di principio, rendere l’output riproducibile per un input identico. In pratica, l’aritmetica in virgola mobile sulle GPU non è strettamente indipendente dall’ordine, e l’infrastruttura del fornitore può raggruppare o riordinare il calcolo tra le richieste. Il risultato è che lo stesso prompt inviato due volte con l’impostazione più deterministica può comunque tornare occasionalmente diverso, specialmente quando due token candidati erano quasi alla pari.',
          ],
        },
        {
          id: 'lower-is-not-the-same-as-better',
          heading: 'Un’impostazione più bassa non è automaticamente migliore',
          paragraphs: [
            'Ridurre la casualità rende l’output più ripetibile, non più corretto. Una continuazione sbagliata detta con sicurezza resta sbagliata detta con sicurezza a bassa temperature, e impostazioni molto basse possono anche produrre una formulazione notevolmente ripetitiva o rigida su output più lunghi, perché il modello continua a riselezionare gli stessi token sicuri e ad alta probabilità.',
          ],
        },
        {
          id: 'choosing-a-setting-for-the-task',
          heading: 'L’impostazione giusta dipende dall’uso dell’output',
          paragraphs: [
            'I compiti con essenzialmente una sola risposta corretta — estrarre un valore, seguire un formato rigido, scrivere codice che deve compilare — beneficiano in genere di meno casualità, perché la coerenza conta più della varietà. I compiti in cui più risposte diverse potrebbero essere tutte valide — brainstorming, redigere formulazioni alternative, scrittura aperta — beneficiano di più casualità, perché lì la varietà è proprio l’obiettivo. Nessuna delle due impostazioni sostituisce un contesto migliore dato al modello, né la verifica di una risposta che conta davvero.',
          ],
        },
      ],
      faq: [
        {
          question: 'Temperature zero rende l’output deterministico?',
          answer:
            'Quasi, ma non è garantito. Rimuove la casualità intenzionale del campionamento, ma il calcolo in virgola mobile e il raggruppamento lato fornitore possono comunque produrre occasionalmente un token diverso in caso di parità esatta o di scelta molto ravvicinata, quindi richieste identiche sono di solito — non sempre — identiche.',
        },
        {
          question: 'Qual è la differenza tra temperature e top-p?',
          answer:
            'La temperature rimodella la probabilità di ogni possibile token successivo. Il top-p restringe prima il campo al più piccolo insieme di candidati principali le cui probabilità superano una soglia, poi campiona solo da quell’insieme. Agiscono sulla stessa distribuzione in modi diversi e spesso si combinano.',
        },
        {
          question: 'Una temperature più alta rende un modello più creativo o più competente?',
          answer:
            'Cambia la varietà della formulazione, non la conoscenza o il ragionamento. Una temperature più alta può produrre una formulazione più varia, ma attinge sempre agli stessi parametri appresi, e può altrettanto facilmente far emergere una continuazione meno probabile e di qualità inferiore.',
        },
        {
          question: 'Dovrei sempre usare l’impostazione più bassa per i compiti fattuali?',
          answer:
            'Un’impostazione più bassa rende l’output più coerente, il che aiuta quando la coerenza stessa è l’obiettivo, ma non corregge una risposta sbagliata alla base — un output a bassa temperature può essere sbagliato con sicurezza e in modo ripetibile. Verificare un’affermazione fattuale richiede comunque una fonte o un controllo indipendente.',
        },
      ],
      productNote:
        'ClawAI offre un controllo della temperature per conversazione, applicato al fornitore che gestisce la richiesta; non offre il top-p come impostazione, quindi il nucleus sampling resta al valore predefinito di ciascun fornitore.',
    },
    [LearnTopic.WHAT_ARE_EMBEDDINGS]: {
      seo: {
        title: 'Cosa sono gli embedding?',
        description:
          'Un embedding trasforma il testo in un vettore di numeri che ne rappresenta il significato, il che rende possibile cercare per significato invece che per formulazione esatta. Come si misura la somiglianza, e perché gli embedding di modelli diversi non si mescolano.',
        keywords: [
          'cos’è un embedding',
          'embedding vettoriali spiegati',
          'ricerca semantica per significato',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Cosa sono gli embedding?',
      summary:
        'Un embedding è un elenco di numeri, prodotto da un modello di embedding, che rappresenta il significato di un testo come posizione in uno spazio ad alta dimensionalità. Testi con significato simile finiscono con vettori vicini tra loro, ed è proprio questa proprietà a rendere possibile cercare o abbinare per significato invece che per formulazione esatta.',
      sections: [
        {
          id: 'what-an-embedding-actually-is',
          heading: 'Un elenco di numeri al posto del significato',
          paragraphs: [
            'Un modello di embedding legge un frammento di testo — una parola, una frase, un paragrafo, a volte un documento intero — e restituisce un vettore di lunghezza fissa: un elenco ordinato di numeri, in genere lungo centinaia o migliaia di elementi. Quel vettore non è un riassunto leggibile da una persona; è una posizione in uno spazio matematico appreso dal modello durante l’addestramento, organizzato in modo che testi con significato affine si trovino vicini.',
          ],
        },
        {
          id: 'why-similar-meaning-lands-nearby',
          heading: 'Ciò che finisce vicino è il significato simile, non l’ortografia simile',
          paragraphs: [
            'Due frasi che non condividono quasi nessuna parola ma significano più o meno la stessa cosa possono produrre vettori vicini tra loro, perché il modello di embedding ha appreso associazioni tra concetti durante l’addestramento, non solo quali lettere compaiono. Al contrario, due frasi che condividono molte parole ma significano cose diverse possono finire molto distanti. Questa è la differenza chiave tra la ricerca basata su embedding e la corrispondenza per parole chiave esatte.',
          ],
        },
        {
          id: 'how-similarity-is-measured',
          heading: 'La vicinanza si misura, non si stima a occhio',
          paragraphs: [
            'Una volta che il testo è rappresentato come vettori, confrontare il significato diventa un problema geometrico: un punteggio di somiglianza calcolato tra due vettori, più spesso in base a quanto puntino nella stessa direzione. Cercare in una grande raccolta significa calcolare quel punteggio tra un vettore di ricerca e ogni vettore memorizzato, poi restituire le corrispondenze più vicine — la stessa operazione, che la raccolta abbia cento voci o cento milioni.',
          ],
        },
        {
          id: 'embeddings-are-model-specific',
          heading: 'Gli embedding di modelli diversi non si mescolano',
          paragraphs: [
            'Come il vocabolario di un tokenizer, lo spazio vettoriale di un modello di embedding è specifico di quel modello e di come è stato addestrato. Un vettore prodotto da un modello di embedding non è confrontabile in modo utile con un vettore prodotto da un modello diverso, anche se entrambi i vettori hanno lo stesso numero di dimensioni. Cambiare modello di embedding significa ricalcolare gli embedding di tutto ciò che è già memorizzato, non solo dei nuovi contenuti da quel momento in poi.',
          ],
        },
        {
          id: 'not-the-same-job-as-a-language-model',
          heading: 'Un modello di embedding fa un lavoro diverso da un modello linguistico',
          paragraphs: [
            'Un modello linguistico genera testo, un token alla volta, a partire da un prompt. Un modello di embedding non genera nulla: trasforma il testo in un vettore e si ferma lì. Alcuni sistemi usano lo stesso modello di base per entrambi i compiti, altri due modelli del tutto separati; in ogni caso, il vettore prodotto da un passaggio di embedding non è di per sé una risposta, ma solo qualcosa che un passaggio di ricerca o abbinamento può confrontare.',
          ],
        },
        {
          id: 'where-embeddings-show-up-in-practice',
          heading: 'Dove si ritrova questo nella pratica',
          paragraphs: [
            'Gli embedding sono ciò che rende possibile la generazione aumentata dal recupero — vedi cos’è il RAG per come il recupero si integra con un modello linguistico — ma la stessa tecnica sta anche alla base della ricerca semantica in ticket di supporto o documentazione, dell’abbinamento di conversazioni passate simili, della deduplicazione di contenuti quasi identici e del raggruppamento di elementi correlati senza che nessuno etichetti categorie a mano.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un embedding è la stessa cosa di un token?',
          answer:
            'No. Un token è un’unità di testo discreta che un modello linguistico legge o scrive una alla volta. Un embedding è un vettore continuo che rappresenta il significato di un testo più ampio, prodotto da un passaggio separato che non genera nulla.',
        },
        {
          question: 'Posso confrontare embedding prodotti da due modelli diversi?',
          answer:
            'Non in modo utile. Ogni modello di embedding definisce il proprio spazio vettoriale durante l’addestramento, quindi una distanza che nello spazio di un modello significa “molto simile” non ha un significato definito nello spazio di un altro modello, anche con vettori della stessa lunghezza.',
        },
        {
          question: 'Un vettore di embedding più grande significa una ricerca migliore?',
          answer:
            'Non da solo. Più dimensioni possono catturare più sfumature, ma la qualità dipende da su cosa è stato addestrato il modello e da quanto ciò si adatta ai tuoi contenuti, non solo dal numero di dimensioni.',
        },
        {
          question: 'Qualcuno può recuperare il testo originale da un embedding?',
          answer:
            'Un recupero esatto è in genere poco pratico, ma un embedding deriva comunque direttamente dal tuo contenuto e può far trapelare informazioni rilevanti su di esso con alcuni tipi di attacco. Tratta gli embedding memorizzati di testo sensibile con la stessa cura del testo stesso, non come se fossero già anonimizzati.',
        },
      ],
      productNote:
        'Le funzioni di memoria e pacchetti di contesto di ClawAI generano gli embedding localmente tramite Ollama e li memorizzano in un database vettoriale per la ricerca per somiglianza, invece di inviare i tuoi contenuti a un’API di embedding cloud separata per questo scopo.',
    },
    [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]: {
      seo: {
        title: 'Prompting vs. RAG vs. fine-tuning: qual è la differenza?',
        description:
          'Tre modi diversi di cambiare ciò che un modello produce: istruzioni migliori, contesto recuperato o un modello modificato. Cosa risolve davvero ciascuno, cosa non può risolvere, e perché molti prodotti non hanno mai bisogno del terzo.',
        keywords: [
          'differenza tra prompting RAG e fine-tuning',
          'quando fare fine-tuning a un LLM',
          'RAG o fine-tuning',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Prompting vs. RAG vs. fine-tuning: qual è la differenza?',
      summary:
        'Prompting, generazione aumentata dal recupero (RAG) e fine-tuning sono tre risposte diverse alla stessa domanda di fondo: come si fa a ottenere da un modello ciò di cui hai davvero bisogno? Ciascuno cambia una parte diversa del sistema — la richiesta, il contesto o il modello stesso — e risolve un tipo diverso di lacuna. Scegliere la tecnica sbagliata per il problema reale è la ragione più comune per cui un progetto si blocca.',
      sections: [
        {
          id: 'three-different-fixes-for-three-different-problems',
          heading: 'Tre soluzioni diverse per tre problemi diversi',
          paragraphs: [
            'Il prompting cambia ciò che dici al modello per una richiesta: istruzioni, esempi, regole di formattazione. La generazione aumentata dal recupero, o RAG, cambia ciò che il modello può vedere per una richiesta, recuperando materiale pertinente e aggiungendolo al contesto — vedi cos’è il RAG per come funziona questo passaggio di recupero. Il fine-tuning cambia il modello stesso, regolando i suoi pesi in modo che uno schema venga incorporato e disponibile senza doverlo ripetere ogni volta. Non sono tre livelli di difficoltà della stessa soluzione; rispondono a tre tipi diversi di lacuna.',
          ],
        },
        {
          id: 'prompting-changes-only-the-request',
          heading: 'Il prompting cambia solo la richiesta che hai davanti',
          paragraphs: [
            'Un prompt è fatto di istruzioni, esempi e vincoli inclusi in un’unica richiesta. Nulla di tutto ciò persiste una volta arrivata la risposta — la richiesta successiva riparte dallo stesso foglio bianco a meno che tu non includa di nuovo le stesse istruzioni. Questo rende il prompting la tecnica più economica e veloce su cui iterare: una modifica di formulazione si testa in pochi secondi, senza infrastruttura né riaddestramento.',
            'Il prompting è anche la prima cosa da esaurire prima di ricorrere a qualsiasi altra cosa. Una quota sorprendente di problemi del tipo "il modello non sa fare X" sono in realtà problemi del tipo "le istruzioni non hanno mai detto di fare X".',
          ],
        },
        {
          id: 'rag-adds-facts-without-touching-the-model',
          heading: 'Il RAG aggiunge fatti e documenti senza toccare il modello',
          paragraphs: [
            'Il RAG risolve un problema diverso: informazioni su cui il modello non è mai stato addestrato, o informazioni che cambiano troppo in fretta perché l’addestramento possa starci dietro — i tuoi documenti, dati aggiornati, qualsiasi cosa privata. Invece di insegnare quell’informazione al modello, un passaggio di recupero trova i brani pertinenti e li inserisce direttamente nella richiesta come contesto, usando gli embedding per cercare per significato invece che per formulazione esatta — vedi cosa sono gli embedding per come funziona questa ricerca sotto il cofano.',
            'Poiché nel modello non cambia nulla, aggiornare i documenti sottostanti aggiorna immediatamente ciò a cui il sistema può rispondere, senza alcun passaggio di riaddestramento. Il compromesso è che la qualità della risposta è limitata dalla qualità del recupero: se il brano giusto non viene mai trovato, il modello non può usare un’informazione che non ha mai visto.',
          ],
        },
        {
          id: 'fine-tuning-changes-the-model-itself',
          heading: 'Il fine-tuning cambia il modello stesso',
          paragraphs: [
            'Il fine-tuning regola i pesi di un modello usando esempi di addestramento aggiuntivi, in modo che uno schema di comportamento — un tono, un formato di risposta, un’abilità specializzata dimostrata negli esempi — diventi parte del modello invece di qualcosa da ripetere in ogni prompt o fornire tramite recupero. Una volta addestrato, il modello si comporta così per impostazione predefinita, su qualsiasi richiesta, senza istruzioni aggiuntive.',
            'Ha anche costi reali che prompting e RAG non hanno: gli esempi di addestramento vanno preparati e curati, un’esecuzione di addestramento va eseguita e valutata, e il risultato è un artefatto di modello specifico che va ospitato e mantenuto sincronizzato mano a mano che i modelli base migliorano. Il fine-tuning non aggiunge nemmeno fatti in tempo reale o mutevoli: incorpora uno schema da un set di addestramento fisso, e diventa obsoleto come qualsiasi addestramento statico.',
          ],
        },
        {
          id: 'matching-the-technique-to-the-failure',
          heading:
            'Far corrispondere la tecnica al fallimento reale, non all’opzione più sofisticata',
          paragraphs: [
            'Tono sbagliato, formato sbagliato, istruzioni ignorate: di solito un problema di prompting. Fatti sbagliati o mancanti, specialmente su materiale proprio o che cambia in fretta: di solito un problema di recupero. Un comportamento specializzato che vuoi applicato in modo coerente, a ogni richiesta, senza doverlo rispiegare ogni volta: il caso per cui il fine-tuning è davvero pensato. Non si escludono a vicenda — a un modello con fine-tuning si può comunque dare un prompt e contesto recuperato — ma ciascuna risolve solo il fallimento per cui è costruita, e usare quella sbagliata lascia irrisolto il problema reale aggiungendo costo e complessità.',
          ],
        },
        {
          id: 'why-many-products-skip-fine-tuning',
          heading: 'Perché molti prodotti non ricorrono mai al fine-tuning',
          paragraphs: [
            'Prompting e RAG lasciano intatto il modello sottostante, quindi passare a un modello base più recente o migliore è per lo più solo un cambio di configurazione. Un modello con fine-tuning resta legato al modello base da cui è stato addestrato — un aggiornamento significativo del modello base di solito significa ripreparare i dati e riaddestrare invece di semplicemente passare all’altro. Per questo molti prodotti risolvono l’intero problema con prompting più recupero, e ricorrono al fine-tuning solo quando un comportamento specifico e ben definito deve restare coerente su un volume enorme di richieste senza il costo di ripetere istruzioni e contesto ogni volta.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il RAG aggiorna la conoscenza del modello in modo permanente?',
          answer:
            'No. Il RAG cambia ciò che è incluso nel contesto di una richiesta; il modello sottostante non viene mai modificato. La richiesta successiva che non recupera lo stesso materiale riparte senza di esso, esattamente come qualsiasi altro prompt.',
        },
        {
          question: 'Il fine-tuning è sempre più accurato del prompting o del RAG?',
          answer:
            'No. Il fine-tuning incorpora uno schema dai suoi esempi di addestramento, ma non aggiunge fatti assenti da quei dati di addestramento, e non mantiene i fatti aggiornati come può fare il recupero. Un modello con fine-tuning può comunque sbagliare con sicurezza su tutto ciò che è fuori dal suo addestramento.',
        },
        {
          question: 'Prompting, RAG e fine-tuning si possono combinare?',
          answer:
            'Sì. Cambiano parti diverse del sistema, quindi a un modello con fine-tuning si può comunque dare contesto recuperato e istruzioni esplicite nella stessa richiesta. Combinarli è comune; non serve trattarli come scelte reciprocamente esclusive.',
        },
        {
          question: 'Quale dovrei provare per primo?',
          answer:
            'Il prompting, quasi sempre. Non richiede infrastruttura e una modifica di formulazione si testa in pochi secondi. Passa al recupero quando la lacuna è informazione mancante o obsoleta, e considera il fine-tuning solo quando un comportamento specifico e ben definito deve restare coerente su un volume di richieste abbastanza grande da giustificare il costo di addestramento e manutenzione.',
        },
      ],
      productNote:
        'I pacchetti di contesto di ClawAI e il recupero da file e workspace aggiungono materiale pertinente a una richiesta senza toccare il modello sottostante; ClawAI non offre fine-tuning dei modelli — i modelli cloud e locali verso cui instrada vengono usati così come sono già addestrati.',
    },
    [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]: {
      seo: {
        title: 'Come funziona davvero la chiamata di strumenti nell’IA?',
        description:
          'Un modello che chiama uno strumento non esegue mai nulla da solo: propone un nome e argomenti, e la tua applicazione decide se eseguire la chiamata. Come funziona il ciclo richiesta-risposta, e perché la proposta è un’ipotesi, non una garanzia.',
        keywords: [
          'come funziona la chiamata di strumenti',
          'function calling negli LLM spiegato',
          'meccanismo di uso degli strumenti IA',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Come funziona davvero la chiamata di strumenti nell’IA?',
      summary:
        'La chiamata di strumenti, a volte detta function calling, permette a un modello di chiedere che qualcosa venga fatto per suo conto: interrogare un database, chiamare un’API, eseguire un calcolo. Ciò che sorprende è cosa fa davvero il modello in quel momento — non esegue nulla. Produce una richiesta strutturata che nomina uno strumento e i suoi argomenti, e la tua applicazione decide se e come agire di conseguenza.',
      sections: [
        {
          id: 'what-tool-calling-actually-is',
          heading: 'Al modello viene dato un menù, non una tastiera',
          paragraphs: [
            'Prima di inviare una richiesta, l’applicazione descrive al modello gli strumenti disponibili: un nome, una descrizione di cosa fa ciascuno e uno schema per gli argomenti attesi. Il modello non riceve codice funzionante né una connessione attiva a nulla — riceve una descrizione, così come una persona legge un menù senza avere accesso alla cucina.',
          ],
        },
        {
          id: 'the-model-never-executes-anything',
          heading: 'Il modello non esegue mai nulla da solo',
          paragraphs: [
            'Quando un modello decide che uno strumento sarebbe utile, produce un output strutturato — tipicamente un nome di strumento e un insieme di argomenti — e si ferma lì. Non è stato ancora cercato, chiamato o modificato nulla. L’applicazione che ha inviato la richiesta legge quell’output strutturato, decide se agire di conseguenza, e in caso affermativo esegue la funzione o la chiamata API reale sulla propria infrastruttura.',
          ],
        },
        {
          id: 'the-loop-request-response-continue',
          heading: 'Uno scambio completo è un ciclo, non un singolo passaggio',
          paragraphs: [
            'La sequenza tipica: l’applicazione invia un prompt più l’elenco degli strumenti disponibili; il modello risponde con una risposta oppure con una chiamata di strumento proposta; se è una chiamata di strumento, l’applicazione la esegue e rimanda indietro il risultato come parte della conversazione; il modello prosegue quindi, spesso producendo una risposta finale che usa quel risultato. I compiti a più passaggi possono ripetere questo ciclo diverse volte prima che una risposta raggiunga l’utente.',
          ],
        },
        {
          id: 'a-proposed-call-is-a-guess-not-a-guarantee',
          heading: 'Una chiamata proposta è un’ipotesi plausibile, non una garanzia di correttezza',
          paragraphs: [
            'Un modello può proporre lo strumento sbagliato, inventare un argomento mai presente nello schema, o chiamare uno strumento quando non c’era nulla da chiamare — la stessa generazione probabilistica che produce qualsiasi altro output produce anche una chiamata di strumento. Nulla nel meccanismo rende una chiamata proposta intrinsecamente sicura da eseguire. Un’applicazione che esegue argomenti senza validarli rispetto allo schema, e senza autorizzare ciò che la chiamata può effettivamente toccare, sta affidando un accesso reale a un’ipotesi.',
          ],
        },
        {
          id: 'the-schema-is-the-interface-the-model-sees',
          heading: 'Lo schema è l’unica interfaccia che il modello vede davvero',
          paragraphs: [
            'Nome, descrizione e schema degli argomenti di uno strumento sono l’intera specifica su cui il modello può basarsi — non ha altro modo per sapere cosa fa uno strumento o come compilarne correttamente i parametri. La stessa funzione sottostante, descritta in modo chiaro e mirato, tende a essere chiamata correttamente molto più spesso di una descritta vagamente o raggruppata con opzioni non correlate, perché il modello sceglie e compila gli argomenti solo da quella descrizione.',
          ],
        },
        {
          id: 'why-this-differs-from-the-model-writing-code',
          heading: 'Perché è diverso dal chiedere a un modello di scrivere codice',
          paragraphs: [
            'Chiedere a un modello di produrre uno script funzionante e chiedergli di chiamare uno strumento predefinito non sono la stessa richiesta. Una chiamata di strumento è limitata a un nome e argomenti che la tua applicazione sa già gestire in sicurezza; il codice generato liberamente può tentare di fare qualsiasi cosa l’ambiente di esecuzione consenta, un problema di sicurezza molto più ampio e diverso. La chiamata di strumenti restringe ciò che un modello può richiedere a un insieme fisso e ispezionabile di opzioni.',
          ],
        },
      ],
      faq: [
        {
          question: 'Il modello esegue lo strumento da solo?',
          answer:
            'No. Il modello produce una richiesta strutturata che nomina uno strumento e i suoi argomenti. L’applicazione che ha inviato la richiesta decide se eseguirla, e la funzione o la chiamata API reale viene eseguita sull’infrastruttura propria dell’applicazione, non all’interno del modello.',
        },
        {
          question: 'Un modello può chiamare uno strumento con argomenti inventati?',
          answer:
            'Sì. Un modello può fornire un valore mai presente nello schema, o che non ha senso per lo strumento, perché la chiamata viene generata come qualsiasi altro output. Validare gli argomenti prima di eseguire qualcosa di reale è responsabilità dell’applicazione, non qualcosa che il modello garantisce.',
        },
        {
          question: 'Cosa succede se il modello chiama lo strumento sbagliato?',
          answer:
            'Dipende interamente da come è costruita l’applicazione. Una ben costruita verifica se la chiamata ha senso prima di eseguirla e può restituire un errore o un risultato chiarificatore al modello invece di agire su una richiesta non pertinente; una mal costruita esegue ciò che riceve.',
        },
        {
          question: 'La chiamata di strumenti è la stessa cosa di un agente IA?',
          answer:
            'No, ma gli agenti di solito si costruiscono sopra di essa. La chiamata di strumenti è il meccanismo sottostante di richiesta-risposta; un agente in genere ripete quel ciclo più volte, con logica aggiuntiva che decide cosa provare successivamente in base a ogni risultato.',
        },
      ],
      productNote:
        'ClawAI espone connettori del workspace e altre azioni ai modelli come strumenti richiamabili durante una richiesta di chat; una chiamata proposta viene validata rispetto al suo schema prima che ClawAI esegua qualsiasi cosa contro un connettore reale per tuo conto.',
    },
    [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]: {
      seo: {
        title: 'Cosa sono gli output strutturati dell’IA?',
        description:
          'Chiedere a un modello di rispondere in JSON è una richiesta, non una garanzia: la risposta può comunque tornare malformata. Cosa vincola davvero l’output di un modello, perché alcuni meccanismi lo impongono e altri si limitano a chiederlo, e perché la convalida resta importante in entrambi i casi.',
        keywords: [
          'cosa sono gli output strutturati',
          'modalità JSON degli LLM spiegata',
          'generazione IA vincolata da schema',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Cosa sono gli output strutturati dell’IA?',
      summary:
        'Un output strutturato è una risposta del modello modellata secondo un formato specifico — di solito JSON conforme a uno schema definito — invece di prosa libera, così il codice può analizzarla senza indovinare. Ciò che sorprende è che "chiedere al modello di restituire JSON" e "il modello garantisce di restituire JSON valido" sono due affermazioni diverse, e solo alcuni meccanismi mantengono davvero la seconda.',
      sections: [
        {
          id: 'what-structured-output-means',
          heading: 'Struttura significa che il codice a valle può fidarsi della forma',
          paragraphs: [
            'Un output strutturato vincola una risposta a una forma definita — un insieme fisso di campi, tipi specifici, un’enumerazione di valori consentiti — invece di un paragrafo di prosa. Non è una questione di stile; un programma che legge la risposta può estrarre un valore da un percorso noto invece di analizzare frasi e indovinarne il significato.',
          ],
        },
        {
          id: 'two-ways-to-ask-for-structure',
          heading: 'Ci sono due modi diversi per richiederla',
          paragraphs: [
            'Il primo è basato sul prompt: le istruzioni dicono al modello di rispondere solo in JSON secondo una forma descritta. Funziona con praticamente qualsiasi modello e non richiede supporto API speciale, ma è una richiesta che il modello può comunque ignorare, eseguire parzialmente in modo sbagliato, o avvolgere in testo esplicativo non richiesto. Il secondo è imposto dal fornitore: alcuni fornitori offrono una modalità, spesso chiamata output strutturati o modalità JSON, in cui la generazione stessa è vincolata in modo che a ogni passo possano essere prodotti solo token conformi allo schema. È un meccanismo più forte di un’istruzione, non solo uno che suona più rigido — ed è una funzionalità distinta dalla chiamata di strumenti (vedi come funziona la chiamata di strumenti), che modella gli argomenti di una funzione con nome invece della risposta del modello stesso.',
          ],
        },
        {
          id: 'a-prompt-instruction-is-a-request-not-a-guarantee',
          heading: 'Un’istruzione nel prompt è una richiesta, non una garanzia',
          paragraphs: [
            'Quando la struttura arriva solo dalla formulazione del prompt, il modello può comunque produrre un output che non corrisponde — un campo in più, uno mancante, prosa prima del JSON, un valore del tipo sbagliato. Qualsiasi sistema che si affida solo alla struttura via prompt ha bisogno di un piano reale per quando l’analisi fallisce, non del presupposto che non accadrà mai.',
          ],
        },
        {
          id: 'provider-enforced-output-is-a-different-guarantee',
          heading: 'La struttura imposta dal fornitore è un tipo diverso di garanzia',
          paragraphs: [
            'Quando un fornitore vincola la generazione direttamente rispetto a uno schema, l’output è molto più affidabilmente ben formato, perché i token malformati sono esclusi dalla generazione fin dall’inizio invece di essere semplicemente scoraggiati. Quali fornitori e modelli esattamente lo supportino, e con quanto rigore, varia e cambia nel tempo — tratta la struttura via prompt e quella imposta dal fornitore come livelli di affidabilità diversi, non come modi intercambiabili per ottenere lo stesso risultato.',
          ],
        },
        {
          id: 'schema-design-still-affects-quality',
          heading: 'Una forma valida non è la stessa cosa di una risposta corretta',
          paragraphs: [
            'Anche con l’applicazione più rigida, lo schema vincola solo la forma, non il significato. Un campo di riepilogo può essere JSON sintatticamente valido e contenere comunque tre frasi divaganti invece di una, o un numero sbagliato affermato con sicurezza in un campo etichettato come conteggio. Uno schema vago o troppo permissivo tende a produrre output tecnicamente valido ma comunque inaffidabile da usare.',
          ],
        },
        {
          id: 'validate-before-you-trust-it',
          heading: 'Analizzare con successo non è la stessa cosa di potersi fidare',
          paragraphs: [
            'Che la struttura provenga da un prompt o dall’imposizione del fornitore, analizzare con successo una risposta conferma solo che la forma è stata rispettata — non dice nulla sul fatto che i valori dei campi siano accurati, nell’intervallo giusto o sensati. Trattare un oggetto analizzato come dato verificato, invece che come affermazione da controllare, è dove i sistemi di output strutturato falliscono più spesso in produzione.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un output strutturato è la stessa cosa di una chiamata di strumento?',
          answer:
            'No. La chiamata di strumenti propone una funzione con nome e i suoi argomenti che la tua applicazione può eventualmente eseguire; un output strutturato modella la risposta del modello stesso secondo un formato definito. I due meccanismi possono essere usati separatamente o insieme.',
        },
        {
          question: 'Chiedere JSON al modello nel prompt garantisce di ricevere JSON valido?',
          answer:
            'No. È una richiesta che il modello può comunque sbagliare — testo in più, un campo mancante, un tipo scorretto. I sistemi che si affidano solo alla formulazione del prompt hanno bisogno di un fallback definito per quando l’analisi fallisce, non del presupposto che riesca sempre.',
        },
        {
          question: 'Se un fornitore impone uno schema, il risultato è garantito corretto?',
          answer:
            'È garantito ben formato secondo lo schema — i campi giusti, i tipi giusti. Non è garantito che i valori all’interno di quei campi siano accurati o sensati; l’imposizione vincola la forma, non la verità.',
        },
        {
          question: 'Devo comunque validare una risposta strutturata prima di usarla?',
          answer:
            'Sì. Analizzare con successo una risposta conferma che la forma corrispondeva, non che il contenuto sia corretto. I controlli di intervallo, di tipo e di ragionevolezza dei valori restano necessari, indipendentemente da come è stata prodotta la struttura.',
        },
      ],
      productNote:
        'La funzione judge di ClawAI chiede a un modello una forma JSON specifica tramite istruzioni nel prompt e ricade su uno stato definito di "analisi fallita" invece di indovinare quando una risposta non corrisponde — un esempio diretto e funzionante che uno schema richiesto in un prompt è una richiesta, non una garanzia.',
    },
    [LearnTopic.WHY_AI_HALLUCINATES]: {
      seo: {
        title: 'Perché l’IA ha le allucinazioni?',
        description:
          'Un modello linguistico afferma una risposta sbagliata con lo stesso tono sicuro di una giusta, perché non è mai stato addestrato a sapere cosa non sa. Perché nascono le allucinazioni, perché non si possono eliminare del tutto, e cosa le riduce davvero.',
        keywords: [
          'perché l’IA ha le allucinazioni',
          'allucinazione dei modelli linguistici spiegata',
          'l’IA che inventa cose',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Perché l’IA ha le allucinazioni?',
      summary:
        'Un’allucinazione è quando il modello afferma qualcosa di falso come se fosse un fatto, senza esitazioni e senza alcun segnale che sta indovinando. Succede perché un modello linguistico è addestrato a produrre il token successivo statisticamente più probabile, non a verificare un’affermazione contro la realtà — una frase fluida, sicura e falsa, e una fluida, sicura e giusta, nascono esattamente dallo stesso processo.',
      sections: [
        {
          id: 'a-confident-wrong-answer-not-a-crash',
          heading: 'È una risposta sbagliata sicura, non un errore che il modello può segnalare',
          paragraphs: [
            'Un modello non ha una modalità separata "non lo so" a cui ricorrere. Ogni risposta, giusta o sbagliata, viene dallo stesso processo di previsione del token successivo, quindi una citazione inventata o un metodo API che non esiste suonano con la stessa sicurezza fluida di una risposta corretta. È questo che distingue un’allucinazione da un normale bug software — nessuna eccezione viene sollevata, nessun segnale viene attivato, niente da intercettare. Il risultato appare ugualmente affidabile, sia esso giusto o sbagliato.',
          ],
        },
        {
          id: 'why-it-happens-training-and-prediction',
          heading: 'Perché succede: previsione, non consultazione',
          paragraphs: [
            'Un modello linguistico è addestrato a prevedere continuazioni plausibili di testo, apprese da pattern nei suoi dati di addestramento. Non memorizza i fatti in una forma recuperabile e verificabile come farebbe un database — memorizza la forma statistica del linguaggio, inclusi i fatti abbastanza comuni nell’addestramento da plasmare quella forma. Quando un prompt chiede qualcosa che il modello ha visto raramente, in modo incoerente, o mai, il modello non rinuncia a rispondere; produce comunque la continuazione più plausibile, perché è l’unica cosa che sa fare.',
            'Questo spiega anche perché l’allucinazione peggiora su dettagli specifici, rari o recenti — un caso giudiziario che suona vero ma è inventato, un numero di versione plausibile ma sbagliato, una citazione che sembra il titolo di un vero articolo. Più un’affermazione è specifica, più è probabile che il modello stia colmando un vuoto con qualcosa di semplicemente plausibile invece che noto.',
          ],
        },
        {
          id: 'grounding-narrows-it-does-not-remove-it',
          heading: 'Il grounding riduce il divario, non lo chiude',
          paragraphs: [
            'Mettere un vero testo sorgente davanti al modello prima che risponda — il retrieval, vedi cos’è il RAG — riduce in modo misurabile l’allucinazione sulle domande che quelle fonti coprono davvero, perché il modello può riformulare ciò che ha appena letto invece di prevedere solo dai dati di addestramento. Ma è una tendenza forte, non una garanzia: se il retrieval non restituisce nulla di utile, o le fonti sono incomplete, il modello può comunque rispondere con fluidità dalla memoria invece di ammettere che le fonti non hanno aiutato.',
          ],
        },
        {
          id: 'multiple-models-and-a-judge-are-a-filter-not-a-cure',
          heading: 'Incrociare più modelli è un filtro, non una cura',
          paragraphs: [
            'Fare la stessa domanda a più modelli e confrontare le risposte cattura le allucinazioni specifiche dell’addestramento o delle particolarità di un modello — se solo uno su tre modelli inventa un dettaglio, quel disaccordo è un segnale. Non cattura un’allucinazione condivisa dalla maggior parte dei modelli, perché i dati di addestramento si sovrappongono tra i fornitori. Lo stesso limite vale per l’uso di un modello separato come giudice per valutare una risposta: un modello giudice può essere ingannato dallo stesso tipo di testo fluido, sicuro e sbagliato che dovrebbe controllare.',
          ],
        },
        {
          id: 'what-actually-reduces-it',
          heading: 'Cosa riduce davvero l’allucinazione, in pratica',
          paragraphs: [
            'Nessuna tecnica da sola elimina l’allucinazione, perché è una proprietà di come questi modelli generano testo, non un difetto specifico di un modello o di un fornitore. Ciò che aiuta in modo misurabile è restringere il compito del modello: ancorare le risposte a testo sorgente recuperato per le domande che quelle fonti coprono, mantenere le richieste specifiche invece che aperte, e trattare citazioni, numeri e dettagli specifici del modello stesso come affermazioni da verificare, non come fatti già controllati. Combinare le tecniche — grounding, incrocio tra modelli e verifica contro una fonte — riduce il margine di errore più di ciascuna presa singolarmente.',
          ],
        },
        {
          id: 'why-lower-temperature-does-not-fix-it',
          heading: 'Perché abbassare la casualità non risolve il problema',
          paragraphs: [
            'È un’ipotesi comune che abbassare la temperatura (vedi temperatura e top-p) renda un modello più veritiero, perché il risultato sembra più cauto e deterministico. La temperatura controlla come il modello campiona tra i token successivi probabili — non cambia ciò che il modello sa e non aggiunge nessun controllo dei fatti. Un modello può avere allucinazioni a temperatura zero con la stessa sicurezza che a temperatura uno; un’impostazione più bassa lo fa solo allucinare la stessa risposta sbagliata con più costanza.',
          ],
        },
      ],
      faq: [
        {
          question: 'Le allucinazioni si possono correggere del tutto?',
          answer:
            'No, non con le attuali architetture dei modelli linguistici. Nascono da come questi modelli generano testo — prevedere continuazioni plausibili invece di controllare i fatti — quindi si possono ridurre con grounding, incrocio tra modelli e verifica, ma non eliminare come categoria.',
        },
        {
          question: 'Un modello più grande o più recente ha meno allucinazioni?',
          answer:
            'Spesso meno sulla conoscenza comune, perché una parte maggiore era ben rappresentata nell’addestramento. Questo non elimina il meccanismo di fondo — un modello più recente può comunque avere allucinazioni sicure su dettagli rari, specifici o recenti per cui non è stato addestrato bene.',
        },
        {
          question: 'Un’allucinazione è la stessa cosa di una bugia del modello?',
          answer:
            'No. Mentire presuppone conoscere la verità e affermare il contrario. Un modello non ha un canale separato per "la verità" con cui confrontare il suo output — genera la continuazione statisticamente più plausibile, che risulti accurata o no.',
        },
        {
          question: 'Dare al modello i propri documenti ferma le allucinazioni?',
          answer:
            'Le riduce molto sulle domande a cui quei documenti rispondono davvero, perché il modello può riformulare testo recuperato invece di prevedere solo dai dati di addestramento. Non impedisce al modello di rispondere con fluidità dalla memoria quando il retrieval non trova nulla di rilevante.',
        },
      ],
      productNote:
        'ClawAI non afferma di eliminare le allucinazioni — nessun prodotto può dirlo onestamente. Ciò che offre sono le mitigazioni che le riducono in modo misurabile: risposte con retrieval ancorate ai tuoi documenti (vedi cos’è il RAG), consenso multi-modello che mette in luce il disaccordo tra modelli (vedi cos’è il consenso IA), e un giudice IA che valuta le risposte secondo criteri definiti (vedi cos’è un giudice IA) — tre funzionalità reali e indipendenti, ciascuna un filtro parziale, non una garanzia.',
    },
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
    [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]: {
      seo: {
        title: 'Come valutare i modelli di IA per il proprio uso',
        description:
          'Un numero da classifica ti dice come è andato un modello sui compiti di qualcun altro. Cosa predice davvero se funzionerà per i tuoi — e i compromessi tra qualità, costo, latenza e privacy che un solo numero non può mostrarti.',
        keywords: [
          'come valutare i modelli di IA',
          'scegliere un modello di IA',
          'criteri di confronto tra modelli',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Come valutare i modelli di IA per il proprio uso',
      summary:
        'Valutare un modello per il proprio lavoro significa testarlo sui propri compiti, non fidarsi di un punteggio calcolato sui compiti di qualcun altro. Un modello in cima a una classifica pubblica può comunque essere la scelta sbagliata per un lavoro specifico, una volta che pesi la qualità contro il costo, la latenza e ciò che sei autorizzato a inviargli in primo luogo.',
      sections: [
        {
          id: 'a-leaderboard-score-is-not-your-score',
          heading: 'Un numero da classifica non è il tuo numero',
          paragraphs: [
            'I benchmark pubblici misurano le prestazioni su un insieme fisso di compiti raramente identici ai tuoi — dominio diverso, formato diverso, tipi di errore diversi che contano per te. Un modello può stare vicino alla cima di un benchmark generale e comunque rendere peggio di uno più piccolo sul tuo tipo specifico di richiesta, perché il benchmark non ha mai testato nulla di simile.',
            'I punteggi dei benchmark invecchiano anche in fretta e possono essere influenzati da quanto i dati di addestramento di un modello conoscano proprio quelle domande del benchmark, quindi un punteggio alto è un indizio che merita di essere verificato, non un verdetto da accettare ciecamente.',
          ],
        },
        {
          id: 'test-on-your-own-tasks',
          heading: 'L’unico test affidabile è il tuo compito',
          paragraphs: [
            'Prendi un campione rappresentativo di richieste reali dal tuo caso d’uso effettivo — non esempi semplificati — e falle passare attraverso i modelli candidati. Giudica i risultati in base a ciò che accetteresti davvero, non a una nozione generica di buona risposta. Un modello che scrive prosa elegante ma sbaglia la terminologia del tuo dominio è una scelta scadente anche se suona bene.',
          ],
        },
        {
          id: 'quality-is-not-the-only-dimension',
          heading: 'La qualità è solo una dimensione tra diverse che si scontrano tra loro',
          paragraphs: [
            'Il modello con il punteggio di qualità migliore è spesso anche il più lento e il più costoso per richiesta. Se quel compromesso valga la pena dipende dal lavoro: un processo batch in background di solito può permettersi un modello più lento ed economico; una risposta di chat interattiva di solito non può permettersi di essere lenta, per quanto sia buona. Valutare un modello isolatamente, solo sulla qualità, salta esattamente il compromesso che decide davvero se è utilizzabile nel tuo prodotto.',
          ],
        },
        {
          id: 'privacy-and-data-handling-are-evaluation-criteria-too',
          heading: 'Anche ciò che sei autorizzato a inviargli è un criterio di valutazione',
          paragraphs: [
            'Un modello che ottiene un buon punteggio ma richiede di inviare dati sensibili a terzi tramite internet aperta potrebbe non essere utilizzabile per un certo carico di lavoro indipendentemente dalla qualità — questo vincolo va verificato prima ancora che la qualità sia rilevante, non dopo aver già scelto il tuo preferito. Dove un compito coinvolge dati che non puoi far uscire dalla tua infrastruttura, girare in locale (vedi cos’è l’IA locale) o in self-hosting restringe il campo prima ancora che i benchmark entrino in gioco.',
          ],
        },
        {
          id: 'know-a-models-known-weaknesses',
          heading: 'Ogni modello ha punti deboli noti — trova i tuoi prima di fidartene',
          paragraphs: [
            'La tendenza nota di un modello ad avere allucinazioni su domande fuori dal suo dominio, o la sua coerenza su compiti che richiedono un ragionamento attento passo dopo passo, conta almeno quanto il suo punteggio medio. Se il tuo caso d’uso tocca un dominio in cui il modello tende a indovinare, valuta proprio quello invece di supporre che un buon punteggio medio lo copra — vedi perché l’IA ha le allucinazioni per capire perché la prestazione media non predice il comportamento su un punto debole specifico.',
          ],
        },
        {
          id: 'reevaluate-not-just-at-launch',
          heading: 'La valutazione non è una decisione presa una volta sola',
          paragraphs: [
            'I fornitori aggiornano i modelli — a volte silenziosamente, sotto lo stesso nome e lo stesso endpoint — e i prezzi e i limiti di frequenza cambiano. Un modello che era la scelta giusta al momento della valutazione può risultare non più adatto in seguito. Trattare la scelta del modello come una decisione da rivedere periodicamente, invece che fissata una volta al lancio, coglie quello scostamento prima che diventi un problema in produzione.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un punteggio di benchmark più alto è sempre la scelta migliore?',
          answer:
            'Non necessariamente. I benchmark testano un insieme fisso di compiti che potrebbe non somigliare ai tuoi, e un punteggio più alto spesso comporta un costo o una latenza maggiori. L’unico modo per saperlo è testare il modello sui tuoi compiti rappresentativi.',
        },
        {
          question: 'Quanti casi di test mi servono per valutare bene un modello?',
          answer:
            'Abbastanza da coprire la gamma di richieste che il tuo caso d’uso produce realmente, inclusi i casi limite e i tipi di input che tendono ad andare storti. Pochi esempi facili faranno sembrare buono quasi qualsiasi modello; i casi più difficili e rappresentativi sono dove emergono le vere differenze.',
        },
        {
          question: 'Devo rivalutare un modello dopo averlo già scelto?',
          answer:
            'Sì. I fornitori aggiornano i modelli sotto lo stesso nome, i prezzi e i limiti di frequenza cambiano, e il tuo caso d’uso stesso evolve. Tratta la scelta come qualcosa da rivedere periodicamente, non come fissata per sempre al lancio.',
        },
        {
          question: 'Devo testare privacy e gestione dei dati separatamente dalla qualità?',
          answer:
            'Sì, e dovrebbe venire per primo se squalifica un’opzione. Il punteggio di qualità di un modello è irrilevante se il carico di lavoro coinvolge dati che non sei autorizzato a inviare a quel fornitore in primo luogo.',
        },
      ],
      productNote:
        'Invece di ridurre una risposta di chat a un solo numero, il pannello di trasparenza del routing di ClawAI mostra la classe di costo, la classe di latenza, la confidenza del routing, e se per quella specifica risposta è stato usato un modello di fallback o un giudice — un segnale di valutazione legato alla richiesta reale, non un numero generico da classifica.',
    },
    [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]: {
      seo: {
        title: 'Come leggere i benchmark di IA senza farsi ingannare',
        description:
          'Un numero da benchmark sembra preciso, il che rende facile fidarsene troppo. Cosa misura davvero un punteggio come MMLU o HumanEval, i modi comuni in cui i numeri da benchmark ingannano, e cosa verificare prima di considerarne uno significativo per il tuo caso.',
        keywords: [
          'come leggere i benchmark di IA',
          'punteggi benchmark IA spiegati',
          'capire i benchmark degli LLM',
        ],
      },
      eyebrow: 'Fondamenti',
      title: 'Come leggere i benchmark di IA senza farsi ingannare',
      summary:
        'Un punteggio da benchmark misura le prestazioni su un unico insieme fisso e specifico di domande di test — né più né meno. Il numero sembra preciso e oggettivo, ed è proprio per questo che è facile fidarsene troppo: una sola cifra non può mostrarti cosa copriva il test, come è stato interrogato il modello, o se le domande sono finite nei dati di addestramento prima che il modello le vedesse mai davvero.',
      sections: [
        {
          id: 'a-benchmark-is-one-fixed-test-not-a-general-measure',
          heading: 'Un benchmark è un test fisso, non una misura generale di capacità',
          paragraphs: [
            'Benchmark noti come MMLU (cultura generale a scelta multipla), HumanEval (piccoli problemi di programmazione) o GSM8K (problemi di matematica in forma di testo di livello elementare) testano ciascuno un’abilità ristretta e specifica in un formato preciso. Un modello può ottenere un buon punteggio in uno e uno scarso in un compito che a un umano sembra simile ma è strutturato diversamente — programmazione estesa invece di brevi funzioni isolate, ad esempio, o scrittura libera invece di richiamo a scelta multipla.',
          ],
        },
        {
          id: 'contamination-benchmark-questions-leak-into-training-data',
          heading: 'Le domande di un benchmark possono finire nei dati di addestramento',
          paragraphs: [
            'I benchmark popolari sono pubblici, e le loro domande circolano ampiamente sul web, negli articoli scientifici e nelle discussioni sui forum — esattamente il tipo di testo su cui si addestrano i grandi modelli. Quando un modello ha di fatto già visto la risposta, il suo punteggio riflette la memorizzazione su quel test specifico, non la capacità generale che il benchmark intendeva rappresentare. Questo si chiama contaminazione, ed è difficile da individuare dall’esterno guardando solo il punteggio.',
          ],
        },
        {
          id: 'scores-can-depend-heavily-on-how-the-model-was-prompted',
          heading:
            'Il punteggio riportato può dipendere fortemente da come è stato interrogato il modello',
          paragraphs: [
            'Lo stesso modello può ottenere punteggi molto diversi a seconda del formato del prompt, del numero di esempi risolti mostrati prima della domanda vera, e se gli è stato permesso di ragionare passo dopo passo prima di rispondere. Un fornitore che riporta il suo miglior risultato in condizioni generose non sta mentendo, ma quel numero potrebbe non somigliare a ciò che otterresti con un prompt semplice e quotidiano.',
          ],
        },
        {
          id: 'benchmarks-saturate-and-stop-being-useful',
          heading:
            'I benchmark si saturano — e smettono di essere utili quando la maggior parte dei modelli li supera',
          paragraphs: [
            'Quando la maggior parte dei modelli di punta ottiene punteggi vicini al massimo in un benchmark, questo smette di distinguerli in modo significativo, anche se il numero più vecchio viene spesso citato comunque. Un punteggio quasi perfetto su un benchmark saturo dice meno di quanto dicesse prima; benchmark più nuovi e difficili tendono a sostituirlo, e un confronto di marketing che si appoggia a un vecchio numero saturo merita un secondo sguardo.',
          ],
        },
        {
          id: 'a-single-average-hides-where-a-model-actually-struggles',
          heading: 'Una singola media nasconde esattamente dove un modello fatica davvero',
          paragraphs: [
            'Un punteggio complessivo da benchmark è una media su molte domande di difficoltà e tipo diversi. Un modello può avere una buona media pur essendo inaffidabile in una sottocategoria specifica che ti interessa — un particolare tipo di ragionamento, un dominio specifico, una certa lunghezza di compito. La media è un riassunto, e i riassunti scartano proprio il dettaglio che di solito conta di più per una decisione reale.',
          ],
        },
        {
          id: 'treat-a-benchmark-as-a-starting-point-not-a-verdict',
          heading: 'Tratta un benchmark come un punto di partenza, non come un verdetto',
          paragraphs: [
            'Un punteggio da benchmark è più utile come filtro iniziale approssimativo — escludere chiaramente un modello inadatto, o preselezionare pochi candidati da testare ulteriormente — piuttosto che come parola definitiva su quale modello usare. Vedi come valutare i modelli di IA per capire cosa predice davvero l’adattabilità una volta ristretta la preselezione: testare sui propri compiti rappresentativi, cosa che nessun benchmark pubblicato può sostituire.',
          ],
        },
      ],
      faq: [
        {
          question: 'Cosa testa davvero un benchmark come MMLU o HumanEval?',
          answer:
            'Un insieme fisso e specifico di domande in un formato preciso — MMLU è cultura generale a scelta multipla, HumanEval sono piccoli problemi di programmazione. Ciascuno misura un’abilità ristretta, non un’intelligenza generale o una capacità su ogni compito.',
        },
        {
          question:
            'Perché i punteggi da benchmark di fornitori diversi a volte sembrano incoerenti?',
          answer:
            'I punteggi possono dipendere dal formato del prompt, da quanti esempi sono stati mostrati prima della domanda vera, e se era permesso il ragionamento passo dopo passo. Condizioni di rendicontazione diverse producono numeri diversi per lo stesso modello sottostante.',
        },
        {
          question: 'Cos’è la contaminazione del benchmark?',
          answer:
            'Quando le domande pubbliche di un benchmark finiscono nei dati di addestramento di un modello, così che questo ha di fatto già visto le risposte prima di essere testato. Il punteggio risultante riflette la memorizzazione, non la capacità che il benchmark intendeva misurare.',
        },
        {
          question: 'Dovrei ignorare del tutto i punteggi da benchmark?',
          answer:
            'No — sono un filtro iniziale ragionevole per escludere modelli chiaramente inadatti o costruire una preselezione. Semplicemente non trattare il numero finale come un verdetto; testa la preselezione sui tuoi compiti rappresentativi prima di decidere.',
        },
      ],
      productNote:
        'ClawAI non pubblica una propria classifica di benchmark né rivendica un punteggio proprietario per alcun modello — invece, il suo pannello di trasparenza del routing mostra la classe di costo, la classe di latenza e la confidenza del routing reali dietro una risposta specifica, così puoi giudicare una risposta rispetto alla tua richiesta reale e non a un set di test pubblicato che non puoi ispezionare.',
    },
  },
};
