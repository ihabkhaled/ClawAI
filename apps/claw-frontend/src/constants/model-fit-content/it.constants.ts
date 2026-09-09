import { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { ModelFitDictionary } from '@/types/model-fit.types';

export const IT_MODEL_FIT_CONTENT: ModelFitDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Dove andare adesso',
    lastReviewed: 'Ultima revisione',
    backToHub: 'Tutti gli scenari',
    ctaTitle: 'Provalo invece di fidarti della nostra parola',
    ctaBody:
      'ClawAI instrada ogni conversazione verso il modello più adatto, tra tutti i provider a cui si collega, da un unico workspace.',
    startFree: 'Inizia con il piano gratuito',
    seeFeatures: 'Scopri cosa fa ClawAI',
    seePricing: 'Verifica il catalogo aggiornato nella pagina dei prezzi',
  },
  hub: {
    seo: {
      title: 'Scegliere un modello per il tuo compito',
      description:
        'Cosa conta davvero quando scegli un modello per programmazione, ragionamento complesso, scrittura, ricerca con fonti o carichi privati e locali — nessuna classifica, nessun benchmark inventato.',
      keywords: [
        'scegliere un modello per un compito',
        'quale modello AI è adatto al mio compito',
        'modello per programmazione o scrittura',
      ],
    },
    eyebrow: 'Modello adatto',
    title: 'Scegliere un modello per il tuo compito',
    summary:
      'Non esiste un unico modello migliore in assoluto: esiste un modello adatto a un determinato compito, e l’adeguatezza cambia in base a ciò che il compito richiede — quanto deve essere profondo il ragionamento, quanto contesto deve gestire, quanto conta il costo e se la richiesta deve restare su hardware che controlli tu. Questo hub non stila classifiche tra modelli: illustra cosa valutare per cinque tipi di lavoro comuni e rimanda alle pagine dei provider e alle guide di valutazione che ti permettono di verificare di persona.',
    topicsHeading: 'Scegli un compito',
    cardSummaries: {
      [ModelFitTask.CODING]: 'Cosa conta quando un modello scrive o modifica codice.',
      [ModelFitTask.COMPLEX_REASONING]:
        'Problemi a più passaggi in cui il modello deve ragionare per gradi.',
      [ModelFitTask.WRITING_AND_EDITING]:
        'Scrittura lunga, editing e adesione a un brief di stile.',
      [ModelFitTask.RESEARCH_WITH_SOURCES]:
        'Risposte basate su fonti che il modello ha consultato, non solo sui dati di addestramento.',
      [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]:
        'Mantenere una richiesta su hardware che controlli invece che su un provider cloud.',
    },
  },
  tasks: {
    [ModelFitTask.CODING]: {
      seo: {
        title: 'Scegliere un modello per programmazione',
        description:
          'Cosa valutare quando scegli un modello per compiti di programmazione in ClawAI — capacità di seguire istruzioni, finestra di contesto e costo per richiesta. Nessuna classifica, nessun benchmark inventato. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'scegliere un modello per programmare',
          'quale modello usare per programmare',
          'modello AI per programmazione',
        ],
      },
      eyebrow: 'Modello adatto',
      title: 'Scegliere un modello per programmazione',
      summary:
        'Il lavoro di programmazione copre una gamma ampia — una correzione di una riga, un refactoring su più file, una funzionalità costruita da zero — e il modello adatto cambia in base alla dimensione e alla forma di quel lavoro. Questa pagina illustra cosa valutare invece di indicare un unico vincitore; il router di ClawAI può già occuparsene per la maggior parte dei casi, oppure puoi scegliere manualmente.',
      sections: [
        {
          id: 'what-coding-needs',
          heading: 'Cosa richiede davvero un compito di programmazione a un modello',
          paragraphs: [
            'I compiti di programmazione si basano sulla capacità di un modello di seguire istruzioni dettagliate e strutturate e di mantenere una modifica coerente al suo interno, su un file o su più file — un lavoro più vicino a una scrittura attenta e sequenziale che a una conversazione aperta. Diversi provider nel catalogo di ClawAI pubblicano modelli costruiti appositamente per affrontare un problema per passaggi anziché rispondere immediatamente, il che è una scelta ragionevole per una modifica non banale; una modifica semplice e ben definita raramente ne ha bisogno.',
          ],
        },
        {
          id: 'context-and-cost',
          heading: 'Finestra di contesto e costo, non solo capacità',
          paragraphs: [
            'Una base di codice ampia, o un compito che richiede più file aperti contemporaneamente, è prima di tutto un problema di finestra di contesto: un modello deve poter tenere sotto controllo il codice rilevante per ragionarci correttamente. Anche la sensibilità al costo varia all’interno dello stesso flusso di lavoro: un compito ad alto volume come generare codice ripetitivo o completamenti semplici è un contesto ragionevole per un modello a costo più basso, mentre un refactoring accurato su un percorso critico è un contesto ragionevole in cui spendere di più. Trattare ogni richiesta di programmazione allo stesso modo, indipendentemente dalla dimensione, di solito non è la scelta giusta di default.',
          ],
        },
        {
          id: 'how-clawai-routes-coding',
          heading: 'Come ClawAI può instradare una richiesta di programmazione',
          paragraphs: [
            'Il router di ClawAI può inviare automaticamente una richiesta di programmazione a un modello adatto con il routing Auto o High Reasoning, oppure puoi fissarne uno specifico con la modalità Manual Model quando sai esattamente di quale modello ha bisogno un compito. Consulta la pagina dei provider di modelli per vedere ogni famiglia di provider a cui ClawAI può instradare una richiesta, e verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico — disponibilità e limiti sono applicati lì, non in questa pagina.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual è il modello migliore per programmare?',
          answer:
            'Questa pagina non ne indica uno — "il migliore" dipende dalla dimensione e dalla forma del compito, e nessun benchmark affidabile lo stabilisce per ogni caso. Consulta come valutare i modelli AI, linkato più sotto, per un metodo ripetibile da applicare al tuo carico di lavoro.',
        },
        {
          question:
            'ClawAI sceglie automaticamente un modello diverso per i compiti di programmazione?',
          answer:
            'Con il routing Auto o High Reasoning, il router di ClawAI può inviare una richiesta a un modello che ritiene adatto al compito, programmazione inclusa. Puoi anche fissare tu stesso un modello specifico con la modalità Manual Model.',
        },
        {
          question:
            'Un modello orientato al ragionamento è sempre la scelta giusta per programmare?',
          answer:
            'Non necessariamente — una modifica semplice e ben definita spesso non ne ha bisogno, mentre un refactoring a più passaggi si presta meglio. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano attorno a un modello specifico.',
        },
      ],
      productNote:
        'ClawAI può instradare automaticamente una richiesta di programmazione verso un modello adatto, oppure puoi fissarne uno direttamente con la modalità Manual Model — la scelta è tua, non vincolata a un unico fornitore.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFitTask.COMPLEX_REASONING]: {
      seo: {
        title: 'Scegliere un modello per il ragionamento complesso',
        description:
          'Cosa valutare quando scegli un modello per compiti di ragionamento a più passaggi in ClawAI — profondità del ragionamento, modalità di routing e come valutare un modello sul tuo problema. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'scegliere un modello per il ragionamento',
          'modello AI per problemi complessi',
          'modello di ragionamento a più passaggi',
        ],
      },
      eyebrow: 'Modello adatto',
      title: 'Scegliere un modello per il ragionamento complesso',
      summary:
        'Un compito di ragionamento complesso chiede a un modello di affrontare più passaggi — scomporre un problema, controllare i risultati intermedi, rivedere prima di rispondere — invece di produrre una risposta al primo tentativo. Questa pagina illustra cosa cambia riguardo all’adeguatezza del modello, senza indicare un unico vincitore né citare un punteggio di benchmark.',
      sections: [
        {
          id: 'what-reasoning-tasks-need',
          heading: 'Cosa richiede un compito di ragionamento a più passaggi',
          paragraphs: [
            'Diversi provider nel catalogo di ClawAI pubblicano modelli costruiti appositamente per affrontare un problema passo dopo passo prima di produrre una risposta finale, anziché rispondere immediatamente — un punto di partenza ragionevole per un compito con più passaggi dipendenti tra loro, più vincoli da soddisfare contemporaneamente, o un risultato che va controllato prima di essere considerato definitivo. Una domanda breve e a passaggio unico raramente trae beneficio da questo tipo di modello; l’adeguatezza riguarda la struttura del compito, non un’idea generale di quale modello sia più forte.',
          ],
        },
        {
          id: 'high-reasoning-routing',
          heading: 'La modalità di routing High Reasoning di ClawAI',
          paragraphs: [
            'High Reasoning è una delle sette modalità di routing di ClawAI, pensata esattamente per questo tipo di richiesta: il router privilegia un modello adatto ad affrontare un problema per passaggi anziché rispondere immediatamente. Anche il routing Auto può ricorrere a uno di questi modelli quando ritiene che la richiesta lo richieda; la modalità Manual Model ti permette di fissarne uno direttamente se sai già di quale modello ha bisogno un compito ricorrente.',
          ],
        },
        {
          id: 'evaluating-reasoning-models',
          heading: 'Verificare da solo l’adeguatezza di un modello al ragionamento',
          paragraphs: [
            'Nessuna pagina di questo sito pubblica un punteggio di benchmark, perché un numero pubblicato raramente riflette come si comporta un modello sul tuo problema specifico — consulta come leggere i benchmark AI, linkato più sotto, per capire cosa dice e cosa non dice un punteggio pubblicato. Come valutare i modelli AI, anch’esso linkato più sotto, illustra un metodo ripetibile per verificare un modello sui tuoi compiti di ragionamento.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual è il modello migliore nel ragionamento?',
          answer:
            'Questa pagina non ne indica uno — i modelli costruiti per il ragionamento a più passaggi variano da provider a provider, e quanto bene uno si comporti sul tuo problema specifico vale la pena verificarlo di persona invece di affidarsi a un punteggio pubblicato. Consulta come valutare i modelli AI, linkato più sotto.',
        },
        {
          question: 'Cosa fa la modalità di routing High Reasoning di ClawAI?',
          answer:
            'È una delle sette modalità di routing di ClawAI; quando è selezionata, il router privilegia un modello adatto ad affrontare un problema per passaggi anziché rispondere immediatamente.',
        },
        {
          question: 'Devo usare sempre un modello orientato al ragionamento?',
          answer:
            'No — una domanda breve e a passaggio unico raramente ne ha bisogno, e i modelli orientati al ragionamento si trovano a ogni fascia di costo tra i provider di ClawAI. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano attorno a un modello specifico.',
        },
      ],
      productNote:
        'La modalità di routing High Reasoning di ClawAI può inviare una richiesta a un modello adatto ad affrontare un problema per passaggi, oppure puoi fissarne uno direttamente con la modalità Manual Model.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFitTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Scegliere un modello per scrittura ed editing',
        description:
          'Cosa valutare quando scegli un modello per bozze, editing e scrittura lunga in ClawAI — finestra di contesto, adesione a un brief di stile e costo lungo un flusso di lavoro. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'scegliere un modello per scrivere',
          'modello AI per editing',
          'modello per scrittura lunga',
        ],
      },
      eyebrow: 'Modello adatto',
      title: 'Scegliere un modello per scrittura ed editing',
      summary:
        'Scrittura ed editing coprono una gamma ampia di compiti — una breve riscrittura, un documento lungo corretto per coerenza, una bozza completa costruita secondo un brief di stile — e ciò che un modello deve saper fare bene cambia lungo questa gamma. Questa pagina illustra cosa valutare invece di indicare un unico modello come risposta.',
      sections: [
        {
          id: 'what-writing-tasks-need',
          heading: 'Cosa richiede un compito di scrittura o editing a un modello',
          paragraphs: [
            'Il lavoro di scrittura accurato si basa sulla capacità di un modello di seguire istruzioni dettagliate e mantenere un tono e una struttura coerenti lungo un intero testo, il che è vicino a ciò che diversi provider descrivono come l’ambito adatto ai loro modelli generici e alle fasce superiori. Una breve riscrittura o un singolo paragrafo raramente richiedono lo stesso modello di un documento lungo che deve restare coerente dalla prima all’ultima pagina.',
          ],
        },
        {
          id: 'context-window-for-long-documents',
          heading: 'La finestra di contesto conta per i documenti lunghi',
          paragraphs: [
            'Modificare un documento lungo, o redigerne uno seguendo un brief di stile e materiale di riferimento estesi, è prima di tutto un problema di finestra di contesto — il modello deve poter tenere sotto controllo l’intero documento, o gran parte di esso, per mantenere coerenti terminologia, tono e struttura. Consulta cos’è una finestra di contesto, linkato più sotto, per capire cosa significa davvero questo limite e da dove nasce.',
          ],
        },
        {
          id: 'how-clawai-routes-writing',
          heading: 'Come ClawAI può instradare una richiesta di scrittura',
          paragraphs: [
            'Il router di ClawAI può inviare automaticamente una richiesta di scrittura o editing a un modello adatto con il routing Auto o Cost Saver, oppure puoi fissarne uno specifico con la modalità Manual Model per un compito ricorrente con un brief di stile noto. Consulta la pagina dei provider di modelli per vedere ogni famiglia di provider a cui ClawAI può instradare, e verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual è il modello che scrive meglio?',
          answer:
            'Questa pagina non ne indica uno — la qualità della scrittura viene giudicata in modo diverso da ogni lettore e da ogni compito, e nessun benchmark lo stabilisce. Consulta come valutare i modelli AI, linkato più sotto, per un metodo che verifichi sul tuo materiale.',
        },
        {
          question: 'Quale modello dovrei usare per un documento lungo?',
          answer:
            'Guarda prima di tutto la dimensione della finestra di contesto, perché un documento lungo deve entrare interamente in vista perché il modello resti coerente lungo tutto il testo. Consulta cos’è una finestra di contesto, linkato più sotto, per capire come funziona questo limite.',
        },
        {
          question: 'Posso mantenere lo stesso modello per un compito di scrittura ricorrente?',
          answer:
            'Sì — fissane uno con la modalità Manual Model se un compito ricorrente ha un brief di stile noto e vuoi lo stesso modello ogni volta, invece di lasciarlo al routing automatico.',
        },
      ],
      productNote:
        'ClawAI può instradare automaticamente una richiesta di scrittura verso un modello adatto, oppure puoi fissarne uno direttamente con la modalità Manual Model per un compito ricorrente con un brief di stile noto.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFitTask.RESEARCH_WITH_SOURCES]: {
      seo: {
        title: 'Scegliere un modello per la ricerca con fonti',
        description:
          'Come la modalità Research di ClawAI basa una risposta su fonti consultate, come viene fatturata separatamente dal credito modello, e cosa dipende ancora dal modello scelto. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'ricerca AI con fonti',
          'risposte AI basate su fonti',
          'scegliere un modello per la ricerca',
        ],
      },
      eyebrow: 'Modello adatto',
      title: 'Scegliere un modello per la ricerca con fonti',
      summary:
        'Un compito di ricerca richiede una risposta basata su fonti che il modello ha effettivamente consultato, non solo su ciò che ha appreso durante l’addestramento. La modalità Research di ClawAI è una funzionalità reale, già disponibile, costruita proprio per questo; questa pagina spiega cosa fa, come viene fatturata e cosa la scelta del modello continua a determinare quando entrano in gioco le fonti.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Cosa fa la modalità Research di ClawAI',
          paragraphs: [
            'La modalità Research permette a una richiesta di cercare sul web, recuperare una pagina, oppure recuperare ed estrarre contenuto strutturato da essa, prima che il modello produca una risposta — così la risposta può citare fonti recuperate proprio per quella domanda specifica, invece di basarsi solo su ciò che il modello sottostante ha appreso durante l’addestramento. È una funzionalità legata al piano, con tre livelli di profondità: solo ricerca, ricerca più recupero, oppure ricerca più recupero ed estrazione.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'La ricerca viene fatturata separatamente, non dal tuo credito modello',
          paragraphs: [
            'L’accesso alla ricerca viene misurato come consumo a sé stante — ricerca web, recupero pagine ed estrazione — separato dal budget di token su cui si basa un messaggio di chat. Affermare che "la ricerca usa il tuo credito modello" sarebbe sbagliato: i due elementi vengono monitorati e fatturati come voci distinte, e il limite di ricerca del tuo piano è una riga separata rispetto al limite di token del modello.',
          ],
        },
        {
          id: 'what-the-model-still-changes',
          heading: 'Cosa determina ancora il modello sottostante',
          paragraphs: [
            'La modalità Research cambia ciò che il modello può vedere prima di rispondere, non quanto bene ragiona su ciò che ha recuperato — un modello deve comunque leggere le fonti recuperate, ponderarle tra loro e scrivere una risposta che le rifletta accuratamente. Valgono qui le stesse considerazioni che si applicano ai compiti di ragionamento complesso: un modello costruito per affrontare più passaggi è una scelta ragionevole per conciliare più fonti, ed è qualcosa che vale la pena verificare sul proprio materiale invece di darlo per scontato.',
          ],
        },
      ],
      faq: [
        {
          question: 'La ricerca consuma il mio credito modello?',
          answer:
            'No. L’accesso alla ricerca — ricerca web, recupero pagine ed estrazione — viene misurato separatamente dal budget di token su cui si basa un messaggio di chat. Verifica entrambi i limiti nella pagina dei prezzi.',
        },
        {
          question: 'Qual è la differenza tra i tre livelli di profondità della modalità Research?',
          answer:
            'Solo ricerca restituisce i risultati di una ricerca web; ricerca più recupero recupera anche il contenuto della pagina; ricerca più recupero ed estrazione estrae inoltre contenuto strutturato da ciò che è stato recuperato. Quale livello usa una richiesta dipende da come è configurata.',
        },
        {
          question: 'Il modello che scelgo conta se la modalità Research è attiva?',
          answer:
            'Sì — la modalità Research cambia quali fonti può vedere il modello, non quanto bene le legge e le concilia tra loro. Consulta come valutare i modelli AI, linkato più sotto, per capire come verificarlo sul tuo carico di lavoro.',
        },
      ],
      productNote:
        'La modalità Research di ClawAI può cercare, recuperare e recuperare-ed-estrarre contenuto dal web prima che un modello risponda — una funzionalità reale, già disponibile, misurata separatamente dal tuo credito token del modello.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]: {
      seo: {
        title: 'Scegliere un modello per carichi privati e locali',
        description:
          'Cosa cambia quando una richiesta resta su hardware che controlli invece che su un provider cloud, e come le modalità di routing Local-Only e Privacy-First di ClawAI si adattano ai carichi privati. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'carichi di lavoro AI privati',
          'scelta di modelli AI locali',
          'eseguire modelli AI sul proprio hardware',
        ],
      },
      eyebrow: 'Modello adatto',
      title: 'Scegliere un modello per carichi privati e locali',
      summary:
        'Un carico di lavoro privato o locale si definisce in base a dove viene eseguita la richiesta, non al tipo di compito — il requisito è che resti su hardware che controlli invece di raggiungere un provider cloud. ClawAI dispone di connettori reali verso Ollama e llama.cpp proprio per questo, oltre a modalità di routing che mantengono una richiesta locale per impostazione predefinita.',
      sections: [
        {
          id: 'what-changes-locally',
          heading: 'Cosa cambia davvero eseguendo un modello in locale',
          paragraphs: [
            'Un provider cloud altrove nel catalogo di ClawAI esegue un modello sulla propria infrastruttura e addebita un costo per richiesta; Ollama e llama.cpp caricano invece un modello a pesi aperti su hardware che controlli tu, così la richiesta non lascia mai quell’hardware. Questo cambia chi può vedere la richiesta, non le capacità di un dato modello — consulta AI locale, nella pagina dei provider di modelli, per il meccanismo completo invece di ripeterlo qui.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Le modalità di routing Local-Only e Privacy-First di ClawAI',
          paragraphs: [
            'Il routing Local-Only mantiene ogni richiesta su hardware che controlli, usando Ollama o llama.cpp anziché un provider cloud. Il routing Privacy-First è una modalità separata con priorità proprie; entrambe esistono proprio perché non ogni carico di lavoro dovrebbe usare per default il routing Auto. Scegliere tra le due, oppure fissare un modello locale specifico con la modalità Manual Model, è una decisione sul carico di lavoro che vale la pena prendere deliberatamente invece di lasciarla a un’impostazione generica.',
          ],
        },
        {
          id: 'choosing-which-open-weight-model',
          heading: 'Scegliere quale modello a pesi aperti eseguire',
          paragraphs: [
            'Questa pagina non nomina deliberatamente nessun modello a pesi aperti specifico, per lo stesso motivo per cui non lo fa la pagina del provider AI locale: il settore si evolve più in fretta di quanto una pagina statica possa seguire, e un consiglio superato è peggio di nessun consiglio. Consulta cos’è l’AI local-first, linkato più sotto, per capire come ragionare sul compromesso tra un modello a pesi aperti eseguito da te e un provider cloud.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quale modello a pesi aperti dovrei eseguire per un carico privato?',
          answer:
            'Questa pagina non ne consiglia uno — consulta cos’è l’AI local-first, linkato più sotto, per capire come ragionare sulla scelta, dato che il modello giusto dipende dal tuo hardware e dal tuo compito in un modo che una pagina statica non può seguire in modo responsabile.',
        },
        {
          question: 'Qual è la differenza tra il routing Local-Only e Privacy-First?',
          answer:
            'Local-Only mantiene ogni richiesta su hardware che controlli tramite Ollama o llama.cpp; Privacy-First è una modalità di routing separata con priorità proprie. Entrambe esistono perché non ogni carico di lavoro dovrebbe usare per default il routing Auto.',
        },
        {
          question: 'Eseguire un modello in locale costa qualcosa tramite ClawAI?',
          answer:
            'ClawAI non addebita una tariffa per token su un modello eseguito in locale come fa per un provider cloud, poiché non c’è alcun provider cloud da fatturare — il costo è l’hardware che già utilizzi. Verifica il comportamento attuale del piano nella pagina dei prezzi.',
        },
      ],
      productNote:
        'La modalità di routing Local-Only di ClawAI mantiene ogni richiesta su hardware che controlli tramite Ollama o llama.cpp — un connettore reale, già disponibile, non una voce di roadmap.',
      catalogDisclaimer:
        'Qui non viene nominato deliberatamente nessun modello specifico: i modelli a pesi aperti e le loro capacità cambiano rapidamente, e sei tu a scegliere quali eseguire. Verifica il comportamento del piano per i carichi locali nella pagina dei prezzi.',
    },
  },
};
