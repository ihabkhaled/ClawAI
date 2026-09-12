import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const IT_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Cosa vedere dopo',
    lastReviewed: 'Ultima verifica',
    backToHub: 'Tutti i fornitori',
    ctaTitle: 'Provalo invece di crederci sulla parola',
    ctaBody:
      'ClawAI instrada una conversazione verso il modello più adatto, tra tutti i fornitori qui sotto, da un unico spazio di lavoro.',
    startFree: 'Inizia con il piano gratuito',
    seeFeatures: 'Scopri cosa fa ClawAI',
    catalogHeading: 'Modelli verso cui ClawAI può instradare',
    seePricing: 'Verifica il catalogo aggiornato nella pagina dei prezzi',
    catalogLiveNote:
      'Questo elenco viene letto in tempo reale dai modelli verso cui ClawAI può instradare in questo momento e cambia quindi man mano che vengono collegati fornitori o ritirati modelli.',
    catalogUnavailable:
      'Il catalogo dei modelli in tempo reale non è momentaneamente disponibile. La preghiamo di riprovare tra poco.',
    catalogMore: 'e altri {count} modelli disponibili presso questo fornitore',
    contextWindowLabel: 'Contesto',
    capabilityLabels: {
      vision: 'Visione',
      tools: 'Strumenti',
      audio: 'Audio',
    },
  },
  hub: {
    seo: {
      title: 'I fornitori di modelli AI a cui si collega ClawAI',
      description:
        'Ogni fornitore di modelli verso cui ClawAI può instradare una conversazione — OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok e modelli locali a pesi aperti — con fasce di costo qualitative e nessun benchmark inventato.',
      keywords: [
        'fornitori di modelli AI',
        'quali modelli AI supporta ClawAI',
        'confronto fornitori AI',
      ],
    },
    eyebrow: 'Fornitori di modelli',
    title: 'I fornitori di modelli dietro ClawAI',
    summary:
      'ClawAI non costruisce un modello: instrada la tua conversazione verso uno, scelto tra diversi fornitori in base al compito, al costo o alla privacy. Questa pagina elenca le famiglie di fornitori con un adattatore attivo oggi, per cosa sono generalmente noti e una fascia di costo qualitativa. Non li classifica e non sostituisce la verifica del catalogo aggiornato prima di scegliere un piano.',
    topicsHeading: 'Scegli un fornitore',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5, o3 e il resto della gamma attuale di OpenAI.',
      [ModelProviderPage.ANTHROPIC]: 'La famiglia Claude Opus, Sonnet e Haiku.',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro, Flash e Flash-Lite.',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek Chat e DeepSeek Reasoner.',
      [ModelProviderPage.XAI]: 'Grok 4 e Grok 3 mini di xAI.',
      [ModelProviderPage.LOCAL_AI]:
        'Modelli a pesi aperti che esegui tu stesso, con Ollama o llama.cpp.',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'I modelli OpenAI in ClawAI — GPT-5, o3 e altri',
        description:
          'I modelli OpenAI verso cui ClawAI può instradare una conversazione, a cosa serve ciascuno e una fascia di costo qualitativa. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: ['modelli OpenAI ClawAI', 'GPT-5 in ClawAI', 'quale modello OpenAI usare'],
      },
      eyebrow: 'Fornitore di modelli',
      title: 'OpenAI',
      summary:
        'ClawAI dispone di un adattatore attivo verso OpenAI, quindi una conversazione può essere instradata verso uno dei diversi modelli OpenAI a seconda del compito, della sua fascia di costo e della modalità di instradamento scelta. Questa pagina elenca i modelli che ClawAI può raggiungere oggi; non sostituisce il catalogo aggiornato nella pagina dei prezzi.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Cosa copre la gamma OpenAI',
          paragraphs: [
            'La gamma attuale di OpenAI comprende un livello di punta per ragionamento e uso generale (GPT-5), un fratello più leggero (GPT-5 mini), un modello multimodale generalista (GPT-4o e GPT-4o mini) e due modelli costruiti appositamente per compiti di ragionamento graduale (o3 e o4-mini). Il router di ClawAI può scegliere tra loro richiesta per richiesta, invece di vincolare l’intero account a uno solo.',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: 'Quando un compito si adatta a un modello OpenAI',
          paragraphs: [
            'I modelli OpenAI sono una scelta ragionevole di default per la scrittura generica, l’assistenza alla programmazione e le domande quotidiane, mentre i modelli della serie o sono costruiti specificamente per problemi di ragionamento in più passaggi, in cui ci si aspetta che il modello elabori il problema invece di rispondere subito. Quale funzioni davvero meglio per il tuo compito è qualcosa da verificare da soli — vedi come valutare i modelli AI più sotto — piuttosto che fidarsi di un testo promozionale, inclusa questa pagina.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Come ClawAI ci instrada',
          paragraphs: [
            'Il router di ClawAI può inviare una richiesta a un modello OpenAI automaticamente con l’instradamento Auto o Risparmio costi, oppure puoi fissarne uno specifico in modalità Modello manuale. Le fasce di costo qui sotto sono qualitative: i modelli più economici costano sensibilmente meno per richiesta, ma la tariffa esatta segue i listini di OpenAI, non qualcosa che ClawAI controlla.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI ha una partnership diretta con OpenAI?',
          answer:
            'No. ClawAI si collega all’API pubblica di OpenAI come farebbe qualsiasi applicazione con una chiave API. Questa pagina non implica alcun accordo speciale.',
        },
        {
          question: 'Quale modello OpenAI dovrei usare per programmare?',
          answer:
            'Dipende dal compito e dallo spazio di lavoro in cui ti trovi — vedi come valutare i modelli AI, collegato più sotto, per un metodo anziché un’unica raccomandazione. Questa pagina non afferma intenzionalmente che un modello sia il migliore.',
        },
        {
          question: 'GPT-5 è sempre disponibile nel mio piano?',
          answer:
            'La disponibilità dei modelli è determinata dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica la gamma attuale nella pagina dei prezzi prima di scegliere un piano per un modello specifico.',
        },
      ],
      productNote:
        'ClawAI può instradare una richiesta verso un modello OpenAI automaticamente, oppure puoi fissarne uno direttamente: la scelta è tua, non vincolata a un unico fornitore.',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'I modelli Claude di Anthropic in ClawAI',
        description:
          'I modelli Claude verso cui ClawAI può instradare una conversazione — Opus, Sonnet e Haiku — a cosa serve ciascuno e una fascia di costo qualitativa. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'modelli Claude ClawAI',
          'Anthropic in ClawAI',
          'Claude Opus vs Sonnet vs Haiku',
        ],
      },
      eyebrow: 'Fornitore di modelli',
      title: 'Anthropic',
      summary:
        'ClawAI dispone di un adattatore attivo verso Anthropic, quindi una conversazione può essere instradata verso un modello Claude a seconda del compito, della sua fascia di costo e della modalità di instradamento scelta. Questa pagina elenca i modelli che ClawAI può raggiungere oggi; non sostituisce il catalogo aggiornato nella pagina dei prezzi.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Cosa copre la gamma Claude',
          paragraphs: [
            'La gamma attuale di Anthropic ha tre livelli: Claude Opus 4 al vertice, pensato per i compiti più impegnativi e articolati; Claude Sonnet 4 come livello intermedio generalista; e Claude Haiku 4.5 come opzione veloce e a costo più contenuto per richieste più semplici. Il router di ClawAI può passare da uno all’altro richiesta per richiesta.',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: 'Quando un compito si adatta a un modello Claude',
          paragraphs: [
            'I modelli Claude sono comunemente usati per lavori su documenti lunghi, scrittura accurata passo dopo passo e assistenza alla programmazione dove seguire istruzioni dettagliate è importante. Come per qualsiasi fornitore, il modello giusto per un compito specifico va verificato sul proprio carico di lavoro — vedi come leggere i benchmark AI più sotto per capire cosa un numero pubblicato dice e cosa non dice.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Come ClawAI ci instrada',
          paragraphs: [
            'Il router di ClawAI può inviare una richiesta a un modello Claude automaticamente con l’instradamento Auto, Alto ragionamento o Risparmio costi, oppure puoi fissarne uno in modalità Modello manuale. Anthropic è l’unico fornitore in questo elenco a pubblicare una tariffa separata per la scrittura in cache, un dettaglio di fatturazione più che una differenza di capacità: non cambia ciò che il modello sa fare.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual è la differenza tra Opus, Sonnet e Haiku?',
          answer:
            'Sono tre livelli di costo e capacità della stessa famiglia di modelli: Opus è il livello più alto, Sonnet quello intermedio, Haiku quello più veloce e a costo più basso. Il router di ClawAI può scegliere tra loro, oppure puoi selezionarli manualmente.',
        },
        {
          question: 'ClawAI ha una partnership diretta con Anthropic?',
          answer:
            'No. ClawAI si collega all’API pubblica di Anthropic come farebbe qualsiasi applicazione con una chiave API.',
        },
        {
          question: 'Claude Opus 4 è disponibile in ogni piano?',
          answer:
            'La disponibilità dei modelli è determinata dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica la gamma attuale nella pagina dei prezzi prima di scegliere un piano per un modello specifico.',
        },
      ],
      productNote:
        'ClawAI può instradare una richiesta verso un modello Claude automaticamente, oppure puoi fissarne uno direttamente: la scelta è tua, non vincolata a un unico fornitore.',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'I modelli Google Gemini in ClawAI',
        description:
          'I modelli Gemini verso cui ClawAI può instradare una conversazione — 2.5 Pro, Flash e Flash-Lite — a cosa serve ciascuno e una fascia di costo qualitativa. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: ['modelli Gemini ClawAI', 'Google AI in ClawAI', 'Gemini Pro vs Flash'],
      },
      eyebrow: 'Fornitore di modelli',
      title: 'Google Gemini',
      summary:
        'ClawAI dispone di un adattatore attivo verso Google Gemini, quindi una conversazione può essere instradata verso un modello Gemini a seconda del compito, della sua fascia di costo e della modalità di instradamento scelta. Questa pagina elenca i modelli che ClawAI può raggiungere oggi; non sostituisce il catalogo aggiornato nella pagina dei prezzi.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Cosa copre la gamma Gemini',
          paragraphs: [
            'La gamma attuale di Google ha tre livelli: Gemini 2.5 Pro per le richieste più impegnative, Gemini 2.5 Flash come livello intermedio generalista e Gemini 2.5 Flash-Lite come opzione veloce e a costo più contenuto. Il router di ClawAI può passare da uno all’altro richiesta per richiesta.',
          ],
        },
        {
          id: 'when-google-fits',
          heading: 'Quando un compito si adatta a un modello Gemini',
          paragraphs: [
            'I modelli Gemini vengono comunemente scelti per compiti con una grande quantità di materiale di partenza da elaborare, dato che la famiglia è costruita attorno alla gestione di contesti lunghi. Se un determinato livello sia adatto al tuo carico di lavoro specifico è qualcosa da verificare da soli — vedi come valutare i modelli AI più sotto per un metodo ripetibile invece di un’affermazione generica.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Come ClawAI ci instrada',
          paragraphs: [
            'Il router di ClawAI può inviare una richiesta a un modello Gemini automaticamente con l’instradamento Auto o Risparmio costi, oppure puoi fissarne uno in modalità Modello manuale. Il listino pubblicato di Gemini sale oltre una certa soglia di contesto lungo, cosa che la fascia di costo di questa pagina non prova a modellare — una singola fascia qualitativa non è abbastanza precisa da esprimere una tariffa a scaglioni, quindi trattala come un punto di partenza, non come una fattura.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI ha una partnership diretta con Google?',
          answer:
            'No. ClawAI si collega all’API di Gemini come farebbe qualsiasi applicazione con una chiave API.',
        },
        {
          question: 'Quale modello Gemini gestisce meglio i documenti lunghi?',
          answer:
            'La famiglia è generalmente costruita per la gestione di contesti lunghi su tutti i livelli; il limite esatto e il costo dipendono dal modello specifico e dalla richiesta. Controlla il catalogo aggiornato invece di presumere un numero fisso.',
        },
        {
          question: 'Gemini 2.5 Pro è disponibile in ogni piano?',
          answer:
            'La disponibilità dei modelli è determinata dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica la gamma attuale nella pagina dei prezzi prima di scegliere un piano per un modello specifico.',
        },
      ],
      productNote:
        'ClawAI può instradare una richiesta verso un modello Gemini automaticamente, oppure puoi fissarne uno direttamente: la scelta è tua, non vincolata a un unico fornitore.',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'I modelli DeepSeek in ClawAI',
        description:
          'I modelli DeepSeek verso cui ClawAI può instradare una conversazione — DeepSeek Chat e DeepSeek Reasoner — a cosa serve ciascuno e una fascia di costo qualitativa. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: ['modelli DeepSeek ClawAI', 'DeepSeek in ClawAI', 'DeepSeek Chat vs Reasoner'],
      },
      eyebrow: 'Fornitore di modelli',
      title: 'DeepSeek',
      summary:
        'ClawAI dispone di un adattatore attivo verso DeepSeek, quindi una conversazione può essere instradata verso un modello DeepSeek a seconda del compito, della sua fascia di costo e della modalità di instradamento scelta. Questa pagina elenca i modelli che ClawAI può raggiungere oggi; non sostituisce il catalogo aggiornato nella pagina dei prezzi.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Cosa copre la gamma DeepSeek',
          paragraphs: [
            'La gamma attuale di DeepSeek comprende due modelli: DeepSeek Chat, un modello generalista, e DeepSeek Reasoner, costruito appositamente per compiti in cui ci si aspetta che il modello elabori diversi passaggi prima di rispondere. Entrambi hanno un prezzo ben inferiore a quello di diversi altri fornitori di questa pagina, il che spiega in parte perché una modalità di instradamento Risparmio costi si rivolga più spesso a DeepSeek.',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: 'Quando un compito si adatta a un modello DeepSeek',
          paragraphs: [
            'DeepSeek è un’opzione ragionevole quando il costo per richiesta conta più che spremere l’ultimo margine di capacità, e DeepSeek Reasoner in particolare per compiti di ragionamento in più passaggi. Come per qualsiasi fornitore, verifica sul tuo carico di lavoro invece di fidarti di un’affermazione generica — vedi come leggere i benchmark AI più sotto.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Come ClawAI ci instrada',
          paragraphs: [
            'Il router di ClawAI può inviare una richiesta a un modello DeepSeek automaticamente con l’instradamento Risparmio costi o Auto, oppure puoi fissarne uno in modalità Modello manuale. Entrambi i modelli DeepSeek rientrano nella fascia di costo standard di questa pagina — genuinamente economici rispetto ai livelli premium presenti altrove su questo sito, senza che questa pagina dichiari una tariffa esatta.',
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeek costa meno degli altri fornitori?',
          answer:
            'Entrambi i modelli DeepSeek si collocano qui nella fascia di costo standard, generalmente inferiore ai modelli di livello premium di altri fornitori — ma il prezzo esatto segue i listini pubblicati da DeepSeek, non questa pagina.',
        },
        {
          question: 'A cosa serve DeepSeek Reasoner?',
          answer:
            'È costruito per compiti in cui il modello elabora diversi passaggi prima di produrre una risposta, con un intento simile ai modelli orientati al ragionamento pubblicati da altri fornitori.',
        },
        {
          question: 'ClawAI ha una partnership diretta con DeepSeek?',
          answer:
            'No. ClawAI si collega all’API pubblica di DeepSeek come farebbe qualsiasi applicazione con una chiave API.',
        },
      ],
      productNote:
        'ClawAI può instradare una richiesta verso un modello DeepSeek automaticamente, oppure puoi fissarne uno direttamente: la scelta è tua, non vincolata a un unico fornitore.',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'I modelli Grok di xAI in ClawAI',
        description:
          'I modelli Grok di xAI verso cui ClawAI può instradare una conversazione — Grok 4 e Grok 3 mini — a cosa serve ciascuno e una fascia di costo qualitativa. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: ['modelli Grok ClawAI', 'xAI in ClawAI', 'Grok 4 in ClawAI'],
      },
      eyebrow: 'Fornitore di modelli',
      title: 'xAI',
      summary:
        'ClawAI dispone di un adattatore attivo verso xAI, quindi una conversazione può essere instradata verso un modello Grok a seconda del compito, della sua fascia di costo e della modalità di instradamento scelta. Questa pagina elenca i modelli che ClawAI può raggiungere oggi; non sostituisce il catalogo aggiornato nella pagina dei prezzi.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Cosa copre la gamma Grok',
          paragraphs: [
            'La gamma attuale di xAI ha due modelli disponibili tramite ClawAI: Grok 4, il livello a maggiore capacità, e Grok 3 mini, un’opzione più veloce e a costo più contenuto. Il router di ClawAI può passare dall’uno all’altro richiesta per richiesta.',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: 'Quando un compito si adatta a un modello Grok',
          paragraphs: [
            'I modelli Grok sono un’opzione generalista ragionevole accanto agli altri fornitori di questa pagina. Quale funzioni meglio per un compito specifico va verificato da soli — vedi come valutare i modelli AI più sotto per un metodo che non si basa sul materiale promozionale di un unico fornitore.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Come ClawAI ci instrada',
          paragraphs: [
            'Il router di ClawAI può inviare una richiesta a un modello Grok automaticamente con l’instradamento Auto o Risparmio costi, oppure puoi fissarne uno in modalità Modello manuale. Grok 3 mini rientra nella fascia di costo economica di questa pagina; Grok 4 in quella premium.',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI ha una partnership diretta con xAI?',
          answer:
            'No. ClawAI si collega all’API pubblica di xAI come farebbe qualsiasi applicazione con una chiave API.',
        },
        {
          question: 'Qual è la differenza tra Grok 4 e Grok 3 mini?',
          answer:
            'Sono un livello a maggiore capacità e un livello più veloce e a costo inferiore della stessa famiglia di modelli. Il router di ClawAI può scegliere tra loro, oppure puoi selezionarli manualmente.',
        },
        {
          question: 'Grok 4 è disponibile in ogni piano?',
          answer:
            'La disponibilità dei modelli è determinata dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica la gamma attuale nella pagina dei prezzi prima di scegliere un piano per un modello specifico.',
        },
      ],
      productNote:
        'ClawAI può instradare una richiesta verso un modello Grok automaticamente, oppure puoi fissarne uno direttamente: la scelta è tua, non vincolata a un unico fornitore.',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'Modelli AI locali a pesi aperti in ClawAI',
        description:
          'Esegui tu stesso modelli a pesi aperti con Ollama o llama.cpp tramite ClawAI, invece di inviare richieste a un fornitore cloud. Qual è il meccanismo e in cosa differisce dai fornitori cloud di questa pagina.',
        keywords: ['modelli AI locali ClawAI', 'Ollama in ClawAI', 'eseguire modelli AI in locale'],
      },
      eyebrow: 'Fornitore di modelli',
      title: 'AI locale',
      summary:
        'ClawAI dispone di adattatori attivi verso Ollama e llama.cpp, due modi per eseguire un modello a pesi aperti su hardware che controlli tu, invece di inviare una richiesta a un fornitore cloud. A differenza delle altre pagine di questo gruppo, non esiste un catalogo fisso da elencare: i modelli sono a pesi aperti e sei tu a scegliere quali eseguire.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Cosa cambia davvero eseguendo un modello in locale',
          paragraphs: [
            'Un fornitore cloud presente su questo sito esegue un modello sulla propria infrastruttura e addebita un costo per richiesta. Ollama e llama.cpp caricano invece un modello a pesi aperti su hardware che controlli tu — la tua macchina, oppure un server che gestisci — così la richiesta non lo lascia mai. Questo cambia chi può vedere la richiesta, non ciò che il modello è in grado di fare: un modello a pesi aperti eseguito in locale è un tipo di cosa diverso da qualsiasi fornitore cloud elencato altrove in questo gruppo, non un sostituto equivalente.',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollama e llama.cpp sono due strumenti diversi',
          paragraphs: [
            'Entrambi sono adattatori ClawAI reali, ma si adattano a situazioni diverse: Ollama punta sulla facilità di scaricare ed eseguire un modello con impostazioni predefinite sensate, mentre llama.cpp offre un controllo più diretto su come viene eseguito un modello, al prezzo di una configurazione più manuale. Il confronto completo si trova in Ollama vs llama.cpp, collegato più sotto, invece di essere ripetuto qui.',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: 'Scegliere quale modello a pesi aperti eseguire',
          paragraphs: [
            'Questa pagina non nomina deliberatamente alcun modello a pesi aperti specifico, perché il settore si muove più in fretta di quanto una pagina statica possa seguire e una raccomandazione superata è peggio di nessuna raccomandazione. Cos’è l’AI local-first, collegato più sotto, spiega i modelli a pesi aperti e il compromesso rispetto ai fornitori cloud con più profondità di quanta ne debba avere una pagina di prodotto.',
          ],
        },
      ],
      faq: [
        {
          question: 'L’AI locale ha un costo tramite ClawAI?',
          answer:
            'ClawAI non addebita una tariffa per token su un modello eseguito in locale come fa per un fornitore cloud, perché non c’è alcun fornitore cloud da fatturare: il costo è l’hardware che già possiedi. Verifica il comportamento attuale del piano nella pagina dei prezzi.',
        },
        {
          question: 'Quale modello a pesi aperti dovrei eseguire?',
          answer:
            'Questa pagina non ne consiglia uno — vedi cos’è l’AI local-first, collegato più sotto, per capire come ragionare sulla scelta, dato che il modello giusto dipende dal tuo hardware e dal compito in un modo che una pagina statica non può seguire in modo responsabile.',
        },
        {
          question: 'Un modello eseguito in locale è capace quanto un modello cloud?',
          answer:
            'Dipende interamente dal modello a pesi aperti specifico e dal tuo hardware, e questa pagina non farà un’affermazione generale in un senso o nell’altro. Vedi come valutare i modelli AI, collegato più sotto, per capire come verificarlo per il tuo carico di lavoro.',
        },
      ],
      productNote:
        'Gli adattatori Ollama e llama.cpp di ClawAI sono connettori reali e già rilasciati: la modalità di instradamento Solo locale mantiene ogni richiesta sull’hardware che controlli tu.',
    },
  },
};
