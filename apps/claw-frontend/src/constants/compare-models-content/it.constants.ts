import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const IT_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: 'In questa pagina',
    faqTitle: 'Domande frequenti',
    relatedTitle: 'Dove andare adesso',
    lastReviewed: 'Ultima revisione',
    backToHub: 'Tutte le coppie',
    ctaTitle: 'Provalo invece di fidarti della nostra parola',
    ctaBody:
      'ClawAI instrada ogni conversazione verso il modello più adatto, tra tutti i provider a cui si collega, da un unico workspace.',
    startFree: 'Inizia con il piano gratuito',
    seeFeatures: 'Scopri cosa fa ClawAI',
    seePricing: 'Verifica il catalogo aggiornato nella pagina dei prezzi',
  },
  hub: {
    seo: {
      title: 'Come ClawAI instrada tra le famiglie di modelli',
      description:
        'Come il router di ClawAI sceglie tra due famiglie di provider per una data richiesta — fascia di costo, esigenze di contesto e se una richiesta deve restare locale. Nessuna classifica tra prodotti specifici, nessun benchmark inventato.',
      keywords: [
        'come ClawAI instrada tra i provider di modelli',
        'scegliere tra famiglie di modelli AI',
        'routing OpenAI vs Anthropic vs Google',
      ],
    },
    eyebrow: 'Routing dei modelli',
    title: 'Come ClawAI instrada tra le famiglie di modelli',
    summary:
      'Questo hub non stila classifiche tra OpenAI, Anthropic, Google, DeepSeek o xAI — è una domanda diversa da quella a cui risponde davvero il router di ClawAI. Ciò che fa il router è scegliere, per una data richiesta, a quale famiglia inviarla, ponderando la fascia di costo, quanto contesto richiede la richiesta, se il carico di lavoro deve restare su hardware che controlli tu, e quale modalità di routing hai selezionato. Ogni pagina qui sotto spiega questa scelta per una coppia di famiglie, basandosi sulle modalità di routing di ClawAI e sulle fasce di costo qualitative del suo catalogo modelli, mai su un punteggio di benchmark.',
    pairsHeading: 'Scegli una coppia',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        'Come il router pondera una richiesta tra i cataloghi di OpenAI e Anthropic.',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]:
        'Come il router pondera una richiesta tra i cataloghi di OpenAI e Google.',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        'Come il router pondera una richiesta tra i cataloghi di Anthropic e Google.',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        'Come la fascia di costo sposta la scelta del router tra OpenAI e DeepSeek.',
      [ModelFamilyPair.OPENAI_VS_XAI]:
        'Come il router pondera una richiesta tra i cataloghi di OpenAI e xAI.',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        'Cosa cambia quando una richiesta deve restare su hardware che controlli invece che su un provider cloud.',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI vs Anthropic: come ClawAI instrada tra i due',
        description:
          'Come il router di ClawAI sceglie tra i cataloghi di modelli di OpenAI e Anthropic per una data richiesta — fascia di costo, adeguatezza alla modalità di ragionamento e fissaggio manuale. Nessun vincitore dichiarato. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'OpenAI vs Anthropic',
          'router ClawAI OpenAI Anthropic',
          'scegliere tra modelli OpenAI e Claude',
        ],
      },
      eyebrow: 'Routing dei modelli',
      title: 'OpenAI vs Anthropic: come ClawAI instrada tra i due',
      summary:
        'OpenAI e Anthropic pubblicano entrambe cataloghi che coprono diverse fasce di costo, da modelli economici e rapidi a rispondere fino a livelli premium e massimi pensati per problemi più difficili. Questa pagina non colloca una famiglia sopra l’altra — spiega cosa pondera davvero il router di ClawAI quando una richiesta potrebbe plausibilmente andare a entrambe, e come puoi tu stesso sovrascrivere quella scelta.',
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading:
            'La fascia di costo attraversa entrambi i cataloghi, non un livello per fornitore',
          paragraphs: [
            'Il catalogo modelli di ClawAI etichetta ogni modello inserito con una fascia di costo qualitativa — economica, standard, premium o massima — invece di un prezzo esatto. Il catalogo di OpenAI copre da economica a premium; quello di Anthropic copre da standard alla fascia massima. Nessuno dei due fornitori possiede in modo esclusivo l’estremo economico o quello costoso, quindi una decisione del router basata sul costo deve guardare ai modelli specifici disponibili in entrambi i cataloghi, non presumere che un fornitore sia uniformemente più economico.',
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: 'Le modalità di routing che riguardano questa coppia',
          paragraphs: [
            'Con il routing Auto, il router di ClawAI può inviare una richiesta a un modello di uno dei due cataloghi in base a ciò di cui la richiesta ha bisogno. Il routing High Reasoning privilegia un modello costruito per affrontare un problema per passaggi, e sia OpenAI sia Anthropic pubblicano modelli di questo tipo; il routing Cost Saver privilegia un modello a fascia di costo più bassa, che esiste anch’esso in entrambi i cataloghi. La modalità Manual Model ti permette di fissare direttamente un modello specifico di uno dei due fornitori, la scelta deliberata da usare per un compito ricorrente di cui già conosci l’adeguatezza.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Cosa questa pagina non afferma',
          paragraphs: [
            'Nessuna pagina di questo sito pubblica un punteggio di benchmark o un’affermazione sulla velocità che confronti questi due fornitori, e questa non fa eccezione. Consulta come leggere i benchmark AI e come valutare i modelli AI, linkati più sotto, per verificare l’adeguatezza al tuo carico di lavoro invece di prendere una classifica da qualsiasi fonte, inclusa questa pagina.',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI o Anthropic è migliore?',
          answer:
            'Questa pagina non lo dirà — entrambe pubblicano modelli su diverse fasce di costo e casi d’uso, e nessun benchmark affidabile lo stabilisce per ogni compito. Consulta come valutare i modelli AI, linkato più sotto, per un metodo da applicare al tuo carico di lavoro.',
        },
        {
          question: 'Il router di ClawAI sceglie automaticamente tra OpenAI e Anthropic?',
          answer:
            'Con il routing Auto, High Reasoning o Cost Saver, sì — il router può inviare una richiesta a un modello di uno dei due cataloghi in base a ciò di cui ha bisogno. Puoi anche fissare un modello specifico di uno dei due fornitori con la modalità Manual Model.',
        },
        {
          question: 'Posso usare modelli sia OpenAI sia Anthropic nello stesso workspace?',
          answer:
            'Sì — ClawAI si collega a entrambi come provider separati, e il routing Auto può attingere a uno o all’altro a seconda della richiesta, oppure puoi fissare un modello specifico di ciascuno per compiti diversi con la modalità Manual Model.',
        },
      ],
      productNote:
        'Il routing Auto e High Reasoning di ClawAI può attingere sia al catalogo di OpenAI sia a quello di Anthropic per una data richiesta, oppure puoi fissarne uno direttamente con la modalità Manual Model.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI vs Google: come ClawAI instrada tra i due',
        description:
          'Come il router di ClawAI sceglie tra i cataloghi di modelli di OpenAI e Google per una data richiesta — fascia di costo, esigenze di contesto e fissaggio manuale. Nessun vincitore dichiarato. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'OpenAI vs Google Gemini',
          'router ClawAI OpenAI Google',
          'scegliere tra modelli OpenAI e Gemini',
        ],
      },
      eyebrow: 'Routing dei modelli',
      title: 'OpenAI vs Google: come ClawAI instrada tra i due',
      summary:
        'OpenAI e Google Gemini pubblicano entrambe cataloghi che vanno da modelli economici e rapidi a rispondere fino a livelli premium. Questa pagina non nomina un vincitore — spiega cosa pondera il router di ClawAI quando una richiesta potrebbe plausibilmente andare a entrambe le famiglie, e come sovrascrivere quella scelta.',
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: 'Fascia di costo e forma del catalogo',
          paragraphs: [
            'Il catalogo di OpenAI inserito nel sistema copre da economica a premium; anche il catalogo Gemini di Google copre da economica a premium, con una fascia economica propria. Una decisione del router che pondera la fascia di costo deve guardare al modello specifico, all’interno di ciascuna famiglia, adatto al budget della richiesta, poiché entrambi i fornitori pubblicano una gamma anziché un unico prezzo fisso.',
          ],
        },
        {
          id: 'context-window-considerations',
          heading: 'La finestra di contesto è una proprietà del singolo modello, non del fornitore',
          paragraphs: [
            'Quanto un modello può tenere sotto controllo in una volta varia in base al modello specifico scelto, non in base a quale di questi due fornitori lo pubblica. Consulta cos’è una finestra di contesto, linkato più sotto, per capire cosa significa questo limite e perché una richiesta che deve ragionare su un documento ampio o su una lunga cronologia di conversazione dovrebbe verificarlo direttamente invece di presumere che i modelli di un fornitore siano uniformemente più capienti.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Come ClawAI instrada una richiesta tra i due',
          paragraphs: [
            'Con il routing Auto, il router di ClawAI può inviare una richiesta a un modello adatto di uno dei due cataloghi. Il routing Cost Saver privilegia un modello a fascia di costo più bassa indipendentemente da quale dei due fornitori lo pubblica. La modalità Manual Model ti permette di fissare direttamente un modello specifico OpenAI o Google per un compito ricorrente di cui conosci già l’adeguatezza.',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI o Google Gemini è migliore?',
          answer:
            'Questa pagina non lo dice — entrambe pubblicano modelli su diverse fasce di costo, e l’adeguatezza dipende dal compito. Consulta come valutare i modelli AI, linkato più sotto, per un modo ripetibile di verificare rispetto al tuo carico di lavoro.',
        },
        {
          question: 'ClawAI instrada automaticamente tra i modelli OpenAI e Google?',
          answer:
            'Con il routing Auto o Cost Saver, il router può inviare una richiesta a un modello adatto di uno dei due cataloghi. Puoi anche fissare un modello specifico di uno dei due fornitori con la modalità Manual Model.',
        },
        {
          question: 'Quale fornitore ha la finestra di contesto più ampia?',
          answer:
            'Varia in base al modello specifico, non in modo uniforme per fornitore. Consulta cos’è una finestra di contesto, linkato più sotto, per capire come verificare il limite di un dato modello prima di affidarti ad esso per un documento ampio o una conversazione lunga.',
        },
      ],
      productNote:
        'Il routing Auto e Cost Saver di ClawAI può attingere sia al catalogo di OpenAI sia a quello di Google per una data richiesta, oppure puoi fissarne uno direttamente con la modalità Manual Model.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic vs Google: come ClawAI instrada tra i due',
        description:
          'Come il router di ClawAI sceglie tra i cataloghi di modelli di Anthropic e Google per una data richiesta — fascia di costo, adeguatezza alla modalità di ragionamento e fissaggio manuale. Nessun vincitore dichiarato. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'Anthropic vs Google Gemini',
          'router ClawAI Anthropic Google',
          'scegliere tra modelli Claude e Gemini',
        ],
      },
      eyebrow: 'Routing dei modelli',
      title: 'Anthropic vs Google: come ClawAI instrada tra i due',
      summary:
        'Il catalogo di Anthropic copre da standard fino alla fascia di costo massima; il catalogo Gemini di Google copre da economica a premium. Questa pagina spiega cosa comporta questa differenza di forma per il modo in cui il router di ClawAI sceglie tra i due — non quale sia il migliore.',
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: 'I due cataloghi coprono parti diverse della gamma di costo',
          paragraphs: [
            'I modelli di Anthropic inseriti nel sistema si collocano nelle fasce di costo standard, premium e massima, senza una voce nella fascia economica al momento; il catalogo Gemini di Google scende fino a una fascia economica. Questa differenza di forma, non un giudizio sulle capacità, è uno degli elementi che una decisione di routing attenta al costo pondera quando una richiesta ha un budget ristretto rispetto a una in cui il costo conta meno.',
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: 'Entrambi i cataloghi includono modelli orientati al ragionamento',
          paragraphs: [
            'Sia Anthropic sia Google pubblicano almeno un modello nel proprio catalogo pensato per affrontare un problema per passaggi invece di rispondere immediatamente. La modalità di routing High Reasoning di ClawAI può privilegiare un modello adatto di una delle due famiglie per questo tipo di richiesta; quale sceglie in concreto dipende dalla disponibilità e dalle altre esigenze della richiesta, non da una preferenza fissa per un fornitore.',
          ],
        },
        {
          id: 'overriding-the-router',
          heading: 'Sovrascrivere tu stesso il router',
          paragraphs: [
            'La modalità Manual Model ti permette di fissare direttamente un modello specifico Anthropic o Google, la scelta giusta per un compito ricorrente di cui già conosci l’adeguatezza — un flusso di lavoro documentato, uno stile noto, un’integrazione specifica — invece di lasciarlo al routing automatico ogni volta.',
          ],
        },
      ],
      faq: [
        {
          question: 'Anthropic o Google Gemini è migliore?',
          answer:
            'Questa pagina non ne nomina uno — i due cataloghi coprono parti diverse della gamma di costo ed entrambi includono modelli orientati al ragionamento. Consulta come valutare i modelli AI, linkato più sotto, per verificare l’adeguatezza al tuo carico di lavoro.',
        },
        {
          question: 'La modalità High Reasoning di ClawAI privilegia uno di questi fornitori?',
          answer:
            'Nessuna preferenza fissa — il routing High Reasoning può privilegiare un modello adatto di uno dei due cataloghi a seconda della disponibilità e delle esigenze della richiesta.',
        },
        {
          question: 'Posso fissare un modello Claude o Gemini per un compito ricorrente specifico?',
          answer:
            'Sì — la modalità Manual Model ti permette di fissare direttamente un modello specifico di uno dei due fornitori, una scelta ragionevole una volta che conosci l’adeguatezza di un compito, invece di affidarti al routing automatico ogni volta.',
        },
      ],
      productNote:
        'Il routing High Reasoning di ClawAI può privilegiare un modello adatto sia del catalogo di Anthropic sia di quello di Google, oppure puoi fissarne uno direttamente con la modalità Manual Model.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI vs DeepSeek: come ClawAI instrada tra i due',
        description:
          'Come la fascia di costo sposta il router di ClawAI tra i cataloghi di OpenAI e DeepSeek, e come il routing Cost Saver e la modalità Manual Model si adattano a questa coppia. Nessun vincitore dichiarato. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'OpenAI vs DeepSeek',
          'router ClawAI OpenAI DeepSeek',
          'alternativa AI più economica a OpenAI',
        ],
      },
      eyebrow: 'Routing dei modelli',
      title: 'OpenAI vs DeepSeek: come ClawAI instrada tra i due',
      summary:
        'Il catalogo di OpenAI copre da economica a premium; i modelli di DeepSeek inseriti nel sistema si collocano nella fascia di costo standard. Questa pagina illustra cosa comporta questa differenza di fascia di costo per l’instradamento di una richiesta tra i due, senza dichiarare quale sia il fornitore migliore.',
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading: 'La fascia di costo è la differenza più netta tra questi due cataloghi',
          paragraphs: [
            'I due modelli di DeepSeek inseriti nel sistema — un modello di chat generico e uno orientato al ragionamento — si collocano entrambi nella fascia di costo standard di ClawAI. Il catalogo di OpenAI copre una gamma più ampia, da una fascia economica fino a premium. Per una richiesta sensibile al costo, questo rende il catalogo di DeepSeek un punto di partenza ragionevole, anche se i modelli in fascia economica di OpenAI si collocano nella stessa fascia di costo e vale la pena considerarli a loro volta — il confronto è tra fasce di costo, non tra fornitori nel loro complesso.',
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'La modalità di routing Cost Saver di ClawAI',
          paragraphs: [
            'Cost Saver è una delle sette modalità di routing di ClawAI, pensata per privilegiare un modello a fascia di costo più bassa quando una richiesta non ne richiede uno premium. Può attingere a entrambi i cataloghi a seconda di quale modello si adatta davvero alla richiesta a quella fascia di costo, invece di preferire un fornitore per nome.',
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: 'Un’opzione orientata al ragionamento esiste in entrambi i cataloghi',
          paragraphs: [
            'DeepSeek pubblica un modello costruito appositamente per affrontare un problema per passaggi, nella stessa fascia di costo standard del suo modello di chat generico; OpenAI pubblica modelli orientati al ragionamento sia nella fascia standard sia in quella premium. Il routing High Reasoning può raggiungere entrambi, e quale si adatti a un compito specifico a più passaggi vale la pena verificarlo direttamente invece di presumerlo solo dalla fascia di costo.',
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeek è un’alternativa più economica a OpenAI?',
          answer:
            'I modelli di DeepSeek inseriti nel sistema si collocano nella fascia di costo standard di ClawAI, e anche OpenAI pubblica modelli in fascia economica e standard — quindi il confronto corretto è per fascia di costo, non per fornitore. Verifica il prezzo attuale di ogni modello specifico nella pagina dei prezzi.',
        },
        {
          question: 'La modalità Cost Saver di ClawAI preferisce DeepSeek?',
          answer:
            'Nessuna preferenza fissa — il routing Cost Saver privilegia il modello disponibile che si adatta a una fascia di costo più bassa per la richiesta, da uno dei due cataloghi.',
        },
        {
          question: 'DeepSeek ha un modello orientato al ragionamento come quello di OpenAI?',
          answer:
            'Sì — DeepSeek pubblica un modello costruito per affrontare un problema per passaggi, nella stessa fascia di costo del suo modello di chat generico. Anche OpenAI pubblica modelli orientati al ragionamento, su una gamma di costo più ampia.',
        },
      ],
      productNote:
        'Il routing Cost Saver di ClawAI può privilegiare un modello a fascia di costo più bassa sia dal catalogo di OpenAI sia da quello di DeepSeek, oppure puoi fissarne uno direttamente con la modalità Manual Model.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI vs xAI: come ClawAI instrada tra i due',
        description:
          'Come il router di ClawAI sceglie tra i cataloghi di OpenAI e Grok di xAI per una data richiesta — fascia di costo e fissaggio manuale. Nessun vincitore dichiarato. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'OpenAI vs xAI Grok',
          'router ClawAI OpenAI xAI',
          'scegliere tra modelli GPT e Grok',
        ],
      },
      eyebrow: 'Routing dei modelli',
      title: 'OpenAI vs xAI: come ClawAI instrada tra i due',
      summary:
        'Il catalogo di OpenAI copre da economica a premium; anche il catalogo Grok di xAI in ClawAI copre da economica a premium, con meno modelli inseriti nel complesso. Questa pagina spiega cosa pondera il router di ClawAI tra i due, senza nominare quale sia il fornitore migliore.',
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: 'Un catalogo più piccolo non significa una gamma di costo più ristretta',
          paragraphs: [
            'Il catalogo di xAI inserito in ClawAI è più piccolo di quello di OpenAI — due modelli contro i sei di OpenAI — ma copre comunque un modello in fascia economica e uno in fascia premium, la stessa gamma di fasce di costo che il catalogo di OpenAI copre ai suoi estremi. Una decisione del router tra i due pondera la fascia di costo del modello specifico rispetto al budget della richiesta, non la dimensione del catalogo di ciascun fornitore.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Come ClawAI instrada una richiesta tra i due',
          paragraphs: [
            'Con il routing Auto, il router di ClawAI può inviare una richiesta a un modello adatto di uno dei due cataloghi. Il routing Cost Saver privilegia l’opzione a fascia di costo più bassa indipendentemente dal fornitore. La modalità Manual Model ti permette di fissare direttamente un modello specifico OpenAI o xAI se sai già di quale ha bisogno un compito.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Cosa questa pagina non afferma',
          paragraphs: [
            'Questa pagina non fa alcuna affermazione sulla velocità né alcuna classifica di capacità tra questi due fornitori — nessuna pagina di questo sito lo fa. Consulta come valutare i modelli AI, linkato più sotto, per un metodo con cui verificare l’adeguatezza al tuo carico di lavoro.',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI o xAI Grok è migliore?',
          answer:
            'Questa pagina non lo dice — entrambe pubblicano modelli su una gamma di costo simile, e nessun benchmark affidabile stabilisce l’adeguatezza per ogni compito. Consulta come valutare i modelli AI, linkato più sotto.',
        },
        {
          question: 'ClawAI instrada automaticamente tra i modelli OpenAI e xAI?',
          answer:
            'Con il routing Auto o Cost Saver, sì — il router può inviare una richiesta a un modello adatto di uno dei due cataloghi. Puoi anche fissare un modello specifico di uno dei due fornitori con la modalità Manual Model.',
        },
        {
          question: 'xAI ha tanti modelli nel catalogo di ClawAI quanto OpenAI?',
          answer:
            'No — il catalogo di xAI inserito nel sistema è più piccolo, due modelli contro i sei di OpenAI, anche se copre comunque una gamma di fasce di costo simile. Verifica il catalogo aggiornato nella pagina dei prezzi.',
        },
      ],
      productNote:
        'Il routing Auto e Cost Saver di ClawAI può attingere sia al catalogo di OpenAI sia a quello di xAI per una data richiesta, oppure puoi fissarne uno direttamente con la modalità Manual Model.',
      catalogDisclaimer:
        'Disponibilità e limiti dei modelli sono applicati dal tuo piano e dal catalogo aggiornato, non da questa pagina. Verifica il catalogo aggiornato nella pagina dei prezzi prima di scegliere un piano costruito attorno a un modello specifico.',
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: 'Cloud vs locale: come ClawAI instrada tra i due',
        description:
          'Cosa cambia quando una richiesta resta su hardware che controlli invece che su un provider cloud, e come le modalità di routing Local-Only e Privacy-First di ClawAI si adattano a questa scelta. Nessun vincitore dichiarato. Verifica il catalogo aggiornato prima di scegliere un piano.',
        keywords: [
          'AI cloud vs AI locale',
          'routing Local-Only di ClawAI',
          'quando eseguire un modello in locale invece che nel cloud',
        ],
      },
      eyebrow: 'Routing dei modelli',
      title: 'Cloud vs locale: come ClawAI instrada tra i due',
      summary:
        'Questa è l’unica coppia di questo gruppo definita da dove viene eseguita una richiesta, non da quale fornitore risponde. Ogni famiglia cloud a cui ClawAI si collega — OpenAI, Anthropic, Google, DeepSeek, xAI — esegue un modello sulla propria infrastruttura; Ollama e llama.cpp eseguono invece un modello a pesi aperti su hardware che controlli tu. Questa pagina spiega cosa cambia e come il router di ClawAI tratta questa scelta, data la progettazione local-first di ClawAI.',
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: 'Cosa cambia davvero quando una richiesta resta locale',
          paragraphs: [
            'Un provider cloud esegue un modello sulla propria infrastruttura e addebita un costo per richiesta; Ollama e llama.cpp caricano invece un modello a pesi aperti su hardware che controlli tu, così la richiesta non raggiunge mai un provider cloud. Questo cambia chi può vedere la richiesta, non le capacità di un dato modello — consulta AI locale, nella pagina dei provider di modelli, per il meccanismo completo.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading:
            'Le modalità di routing Local-Only e Privacy-First di ClawAI esistono per questa scelta',
          paragraphs: [
            'Il routing Local-Only mantiene ogni richiesta su hardware che controlli tramite Ollama o llama.cpp, senza mai raggiungere nessuna delle cinque famiglie cloud coperte da questo gruppo di pagine. Il routing Privacy-First è una modalità separata con priorità proprie. Entrambe esistono proprio perché non ogni carico di lavoro dovrebbe usare per default il routing Auto, che può raggiungere qualsiasi provider connesso, cloud o locale, a seconda della richiesta.',
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: 'Quando un carico di lavoro è candidato a restare locale',
          paragraphs: [
            'Una richiesta è un candidato ragionevole per il routing Local-Only o Privacy-First quando il requisito è che non lasci mai l’hardware che controlli — un vincolo di conformità, un requisito di riservatezza verso un cliente, o semplicemente la preferenza di non inviare certi dati a nessun fornitore esterno. Consulta cos’è l’AI local-first, linkato più sotto, per come ragionare sul compromesso tra un modello a pesi aperti eseguito da te e il catalogo di un provider cloud.',
          ],
        },
      ],
      faq: [
        {
          question: 'Un modello locale è capace quanto un modello cloud?',
          answer:
            'Questa pagina non li classifica — la capacità dipende dal modello a pesi aperti specifico che scegli di eseguire, una tua decisione, non un confronto fisso che questa pagina possa fare in modo responsabile. Consulta cos’è l’AI local-first, linkato più sotto.',
        },
        {
          question: 'Come decide ClawAI se mantenere locale una richiesta?',
          answer:
            'Non lo decide per te in modo predefinito — il routing Local-Only mantiene ogni richiesta su hardware che controlli, e il routing Privacy-First applica priorità proprie; il routing Auto può raggiungere qualsiasi provider connesso, cloud o locale. Sei tu a scegliere quale modalità usa un workspace o una richiesta.',
        },
        {
          question: 'Eseguire un modello in locale costa qualcosa tramite ClawAI?',
          answer:
            'ClawAI non addebita una tariffa per token su un modello eseguito in locale come fa per un provider cloud, poiché non c’è alcun provider cloud da fatturare — il costo è l’hardware che già utilizzi. Verifica il comportamento attuale del piano nella pagina dei prezzi.',
        },
      ],
      productNote:
        'La modalità di routing Local-Only di ClawAI mantiene ogni richiesta su hardware che controlli tramite Ollama o llama.cpp — un connettore reale, già disponibile, non una voce di roadmap — accanto al routing Privacy-First per un diverso insieme di priorità.',
      catalogDisclaimer:
        'Qui non viene classificato deliberatamente nessun modello cloud o locale specifico: i modelli a pesi aperti e ogni catalogo cloud cambiano secondo tempistiche proprie, e sei tu a scegliere quale eseguire o collegare. Verifica il comportamento del piano per i carichi locali nella pagina dei prezzi.',
    },
  },
};
