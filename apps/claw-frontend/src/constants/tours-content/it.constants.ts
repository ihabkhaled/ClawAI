import { TourId } from '@/enums/tour-id.enum';
import type { TourDictionary } from '@/types/tour.types';

export const IT_TOURS_CONTENT: TourDictionary = {
  ui: {
    next: 'Avanti',
    back: 'Indietro',
    skip: 'Salta il tour',
    done: 'Fine',
    stepOf: 'Passo {current} di {total}',
    dialogLabel: 'Tour del prodotto',
    launcherLabel: 'Tour e aiuto',
    launcherTitle: 'Tour del prodotto',
    launcherHint: 'Un breve giro di ciò che vedi in questa pagina.',
    launcherHere: 'In questa pagina',
    launcherDone: 'Fatto',
    launcherStart: 'Avvia',
    launcherRestart: 'Rivedi',
    offerTitle: 'Nuovo qui? Fai un tour di 1 minuto',
    offerStart: 'Mostrami',
    offerLater: 'Non ora',
    offerNever: 'Non mostrare più i tour',
    launcherNoneHere: 'Nessun tour per questa pagina, per ora.',
    launcherStopOffers: 'Non proporre più i tour',
    launcherResumeOffers: 'Proponi di nuovo i tour',
    launcherOffersStopped:
      'Le proposte di tour sono disattivate. Puoi comunque rivedere qui qualsiasi tour di questa pagina.',
    missingTarget: 'Questa parte non è sullo schermo adesso. Aprila e riavvia il tour.',
  },
  tours: {
    [TourId.ThreadsIntro]: {
      title: 'Conosci Threads',
      description: 'Trasforma una chat in un articolo pubblico, documentato e con fonti.',
      steps: {
        welcome: {
          title: 'Threads in un minuto',
          body: 'Un Thread è un articolo pubblico scritto a partire da una delle tue chat: ricercato sul web in tempo reale, scritto da più modelli, esaminato da un giudice e un critico e pubblicato solo quando lo approvi.',
        },
        list: {
          title: 'I tuoi Threads',
          body: 'Ogni Thread che avvii compare qui con il suo stato. Aprine uno per seguirlo mentre gira, rivedere la bozza, approvarla, esportarla o condividerla.',
        },
        create: {
          title: 'Crea un Thread',
          body: 'Scegli una chat di origine, dì di cosa parla l’articolo e scegli i modelli. Puoi anche partire da qualsiasi chat con «Trasforma in Thread pubblico».',
        },
        process: {
          title: 'Cosa succede dopo',
          body: 'ClawAI ricerca l’argomento, da tre a cinque autori scrivono in modo indipendente, si accordano su una bozza, poi giudice e critico la esaminano fino a tre giri.',
        },
        approve: {
          title: 'Decidi tu',
          body: 'Nulla diventa pubblico finché non leggi la bozza e la approvi. Puoi ritirarla in qualsiasi momento e un limite di spesa che imposti ne limita il costo.',
        },
      },
    },
    [TourId.ThreadCreate]: {
      title: 'Compila il modulo del Thread',
      description: 'Cosa fa ogni campo prima di iniziare.',
      steps: {
        topic: {
          title: 'L’argomento',
          body: 'Dì cosa deve spiegare o a cosa deve rispondere l’articolo. Una domanda chiara dà agli autori e alla ricerca un obiettivo chiaro.',
        },
        kind: {
          title: 'Tipo e lingua',
          body: 'Scegli articolo, articolo di ricerca, guida o spiegazione tecnica, e la lingua in cui sarà scritta la pagina pubblica.',
        },
        cap: {
          title: 'Spesa massima',
          body: 'Il massimo che questo Thread può costare. Ogni chiamata a un modello viene prima controllata rispetto a questo limite e il lavoro si ferma invece di superarlo.',
        },
        models: {
          title: 'Autori, giudice e critico',
          body: 'Scegli da tre a cinque autori, un giudice e un critico con lo stesso selettore della chat. Fornitori diversi danno bozze più varie e una revisione indipendente.',
        },
        consent: {
          title: 'Il tuo consenso',
          body: 'Spunta per confermare che sai che l’articolo finale sarà pubblico e ricercabile. L’avvio resta disattivato finché non lo fai.',
        },
        start: {
          title: 'Avvia la generazione',
          body: 'ClawAI avvia il lavoro e apre la pagina di revisione, dove puoi seguire ogni fase e annullare in qualsiasi momento.',
        },
      },
    },
    [TourId.ThreadReview]: {
      title: 'Rivedi un Thread',
      description: 'Seguilo, leggilo, approvalo, esportalo, condividilo.',
      steps: {
        status: {
          title: 'Avanzamento in diretta',
          body: 'Mentre il lavoro gira, questa riga dice cosa succede: ricerca, autori che scrivono, accordo su una bozza, giudice e critico. Annulla lo ferma e restituisce il credito non usato.',
        },
        draft: {
          title: 'La bozza e le sue fonti',
          body: 'Quando le revisioni passano, compare la bozza con le fonti numerate. Leggila con attenzione: puoi modificarla o chiedere cambiamenti prima che qualcosa sia pubblico.',
        },
        approve: {
          title: 'Approva e pubblica',
          body: 'Solo una bozza approvata diventa una pagina pubblica. Ritirare la toglie dalla pagina, dalla ricerca, dalla sitemap e dai feed.',
        },
        export: {
          title: 'Scaricalo',
          body: 'Spunta uno o più formati e scaricali insieme in un solo ZIP, oppure salva un PDF dalla finestra di stampa del browser.',
        },
        share: {
          title: 'Condividilo',
          body: 'Copia il link, usa il menu di condivisione del dispositivo o pubblicalo su WhatsApp, Facebook, LinkedIn, X, Telegram, Reddit o via email una volta pubblicato.',
        },
      },
    },
    [TourId.ChatIntro]: {
      title: 'Tour della chat',
      description: 'Tutto ciò che sta attorno alla casella del messaggio, in un minuto.',
      steps: {
        input: {
          title: 'Scrivi qui',
          body: 'Scrivi il messaggio e premi Invio per inviarlo. Maiusc+Invio aggiunge una riga. Puoi incollare anche immagini e file.',
        },
        context: {
          title: 'Contesto',
          body: 'Aggiungi pacchetti di contesto, visualizza in anteprima ciò che vedrà il modello e usa la tua memoria, così le risposte si basano sul tuo materiale.',
        },
        model: {
          title: 'Quale modello risponde',
          body: 'Lascia Auto e ClawAI sceglie un modello per ogni messaggio, oppure scegline uno preciso.',
        },
        attach: {
          title: 'Allega file',
          body: 'Carica documenti, immagini, audio o video. Il testo viene estratto perché qualsiasi modello possa leggerlo.',
        },
        research: {
          title: 'Cerca sul web',
          body: 'Attiva la ricerca web quando la risposta richiede fatti aggiornati e fonti.',
        },
        prompts: {
          title: 'Libreria di prompt',
          body: 'Prompt riutilizzabili per i lavori comuni. Sceglierne uno riempie la casella del messaggio.',
        },
        send: {
          title: 'Invia',
          body: 'Invia il messaggio. La risposta arriva in streaming e puoi fermarla in qualsiasi momento.',
        },
        rail: {
          title: 'Strumenti di questa chat',
          body: 'Confronta lo stesso prompt tra modelli, chiedi a un giudice di arbitrare, cerca in questa chat, condividila o apri altre azioni.',
        },
      },
    },
    [TourId.ChatModels]: {
      title: 'Come scegliere un modello',
      description: 'Routing automatico, scelta manuale e cosa significano i badge.',
      steps: {
        model: {
          title: 'Apri il selettore di modello',
          body: 'Questo pulsante mostra cosa risponderà al prossimo messaggio. Aprilo per vedere tutti i modelli, raggruppati per fornitore, con una casella di ricerca.',
        },
        auto: {
          title: 'Auto o un modello preciso',
          body: 'Il routing automatico sceglie un modello per ogni messaggio tra quelli consentiti dal tuo piano. Scegliere un modello vi fissa questa chat.',
        },
        badges: {
          title: 'Badge del credito',
          body: '«Usa credito» significa che il modello attinge al tuo credito dei connettori o alle richieste gratuite. I modelli inclusi non usano mai credito.',
        },
        credit: {
          title: 'Il tuo credito',
          body: 'Mostra quanto puoi spendere. Quando credito o richieste gratuite finiscono, ClawAI passa a un modello incluso e te lo dice.',
        },
      },
    },
    [TourId.ChatResearch]: {
      title: 'Come fare una ricerca',
      description: 'Ottieni risposte con fonti in tempo reale.',
      steps: {
        toggle: {
          title: 'Attiva la ricerca web',
          body: 'Attiva la ricerca prima di inviare. ClawAI cerca sul web, legge le pagine migliori e risponde da ciò che ha trovato.',
        },
        provider: {
          title: 'Scegli il motore di ricerca',
          body: 'Scegli quale fornitore di ricerca usare. Auto ne sceglie uno disponibile per te.',
        },
        sources: {
          title: 'Controlla le fonti',
          body: 'Le risposte mostrano le loro fonti così puoi aprirle e verificare le affermazioni. Per un’indagine lunga usa la pagina Ricerca.',
        },
      },
    },
    [TourId.ChatContext]: {
      title: 'Come aggiungere contesto',
      description: 'Basa le risposte sul tuo materiale.',
      steps: {
        context: {
          title: 'Il pulsante Contesto',
          body: 'Aprilo per allegare un pacchetto di contesto, vedere cosa è allegato e attivare o disattivare la memoria per questa chat.',
        },
        preview: {
          title: 'Anteprima prima dell’invio',
          body: 'Vedi esattamente cosa riceverà il modello da cronologia, pacchetti, memoria e file, così non parte nulla di inatteso.',
        },
        packs: {
          title: 'Crea i tuoi pacchetti',
          body: 'Un pacchetto di contesto è materiale di riferimento riutilizzabile. Creane uno nella pagina Contesto e allegalo a qualsiasi chat.',
        },
      },
    },
    [TourId.ChatToThread]: {
      title: 'Trasforma una chat in un Thread',
      description: 'Pubblica ciò che hai imparato, con le fonti.',
      steps: {
        more: {
          title: 'Apri Altre azioni',
          body: 'Il menu in fondo alla barra contiene Esporta, Trasforma in Thread pubblico, Impostazioni del Thread ed Elimina.',
        },
        create: {
          title: 'Scegli Trasforma in Thread pubblico',
          body: 'Si apre un modulo con questa chat come origine. Controlla l’argomento, scegli i modelli, imposta un limite di spesa e dai il consenso.',
        },
        after: {
          title: 'Seguilo e approva',
          body: 'Arrivi alla pagina di revisione. Quando le revisioni passano, leggi la bozza e approvala per pubblicare.',
        },
      },
    },
    [TourId.CompareIntro]: {
      title: 'Tour di Compare',
      description: 'Invia un prompt a più modelli.',
      steps: {
        prompt: {
          title: 'Un prompt, molti modelli',
          body: 'Scrivi il prompt una volta. Compare lo invia a ogni modello scelto e mostra le risposte affiancate.',
        },
        models: {
          title: 'Scegli i modelli',
          body: 'Scegli fino a cinque modelli con lo stesso selettore della chat. Mescola i fornitori per vedere come differiscono.',
        },
        judge: {
          title: 'Giudice e critico',
          body: 'Chiedi a un giudice di classificare le risposte e a un critico di indicare cosa è debole, entrambi con le loro ragioni.',
        },
      },
    },
    [TourId.ContextPacks]: {
      title: 'Come creare contesto',
      description: 'Costruisci materiale di riferimento riutilizzabile.',
      steps: {
        create: {
          title: 'Crea un pacchetto',
          body: 'Dagli un nome e aggiungi note, testo o file. Un pacchetto è tuo e resta fuori dalle chat degli altri.',
        },
        use: {
          title: 'Usalo in qualsiasi chat',
          body: 'Apri il pulsante Contesto in una chat e allega il pacchetto. Il modello risponde allora con quel materiale sotto gli occhi.',
        },
      },
    },
    [TourId.ChatList]: {
      title: 'Le tue chat',
      description: 'Trova, avvia e organizza le tue conversazioni.',
      steps: {
        new: {
          title: 'Avvia una chat',
          body: 'Inizia una nuova conversazione. Sul telefono usa il pulsante rotondo in basso.',
        },
        search: {
          title: 'Cerca nelle tue chat',
          body: 'Scrivi per trovare una chat dal suo titolo.',
        },
        tabs: {
          title: 'Tutte, Fissate, Archiviate',
          body: 'Le chat fissate restano in alto. Archivia una chat per riordinare l’elenco senza eliminarla.',
        },
        items: {
          title: 'Le tue conversazioni',
          body: 'Aprine una per continuarla. Usa il menu di una riga per fissarla o archiviarla.',
        },
      },
    },
    [TourId.ChatMessages]: {
      title: 'Messaggi e risposte',
      description: 'Cosa ti permette di fare ogni messaggio e ogni risposta.',
      steps: {
        yours: {
          title: 'Il tuo messaggio',
          body: 'Passa sopra un messaggio o mettilo a fuoco per copiarlo, modificarlo o creare un ramo della chat da quel punto.',
        },
        meta: {
          title: 'Quale modello ha risposto',
          body: 'Ogni risposta mostra il modello che l’ha scritta, come è stato scelto e cosa ha usato, come la memoria o i file.',
        },
        actions: {
          title: 'Lavora con una risposta',
          body: 'Copiala, valutala, rigenerala con lo stesso modello o con un altro, ascoltala, salvala in memoria, esportala o aprila più grande.',
        },
        more: {
          title: 'Dietro la risposta',
          body: 'Apri «Perché questo modello» per vedere il motivo della scelta e il pannello delle fonti quando la risposta ha usato la ricerca. Seleziona un testo qualsiasi di una risposta per citarlo nel messaggio successivo.',
        },
      },
    },
    [TourId.ChatHeader]: {
      title: 'Intestazione della chat e strumenti',
      description: 'Ricerca, qualità, esportazione e altro.',
      steps: {
        more: {
          title: 'Altre azioni',
          body: 'Cerca in questa chat, controlla la sua qualità, confronta i modelli, condividila, esportala, trasformala in un Thread o apri le sue impostazioni.',
        },
        rail: {
          title: 'Azioni rapide',
          body: 'Le più usate sono qui: confrontare i modelli, controllare la qualità e cercare in questa chat.',
        },
        keep: {
          title: 'Conserva una copia',
          body: 'L’esportazione salva questa conversazione in un file. Una chat creata da un ramo mostra una barra che rimanda alla chat di origine.',
        },
      },
    },
    [TourId.ChatShare]: {
      title: 'Condividi una chat',
      description: 'Pubblica un link di sola lettura, in sicurezza.',
      steps: {
        open: {
          title: 'Condividi una chat',
          body: 'Apri «Altre azioni» e scegli «Condividi» per pubblicare una copia di sola lettura di questa conversazione su un link pubblico.',
        },
        warning: {
          title: 'Leggi prima di pubblicare',
          body: 'Chiunque abbia il link può leggerla senza accedere. La copia contiene la conversazione così com’è ora; i messaggi successivi restano privati. Non condividere mai segreti o dati personali.',
        },
        link: {
          title: 'Il link e i motori di ricerca',
          body: 'Copia il link pubblico o aprilo in una nuova scheda. Consenti l’indicizzazione solo se vuoi che venga trovata nelle ricerche; altrimenti la trovano solo chi ha il link.',
        },
        manage: {
          title: 'Aggiorna o interrompi',
          body: 'Aggiorna la versione condivisa per pubblicare i messaggi più recenti, genera un nuovo link se il vecchio è trapelato, o interrompi la condivisione per disattivare subito il link.',
        },
      },
    },
    [TourId.ChatSettings]: {
      title: 'Impostazioni del thread',
      description: 'Regola una chat: modello, prompt e contesto.',
      steps: {
        open: {
          title: 'Impostazioni del thread',
          body: 'Apri «Altre azioni» e scegli «Impostazioni» per cambiare il comportamento di questa sola chat.',
        },
        model: {
          title: 'Modello e istruzioni',
          body: 'Scegli un modello preferito per questa chat e scrivi un prompt di sistema che ne definisca ruolo e tono.',
        },
        tuning: {
          title: 'Creatività e lunghezza',
          body: 'La temperatura rende le risposte più prevedibili o più varie. Il massimo di token limita la lunghezza di una risposta.',
        },
        context: {
          title: 'Contesto per questa chat',
          body: 'Allega pacchetti di contesto e attiva o disattiva memoria, contesto della chat e contesto delle altre chat solo per questa conversazione.',
        },
      },
    },
    [TourId.CompareResults]: {
      title: 'Leggere i risultati del confronto',
      description: 'Schede, Judge e cosa puoi fare con le risposte.',
      steps: {
        results: {
          title: 'Fianco a fianco',
          body: 'Ogni modello risponde nella propria scheda, così le leggi una accanto all’altra.',
        },
        judge: {
          title: 'Judge e Critic',
          body: 'Attiva il Judge per ordinare le risposte e spiegare perché. Aggiungi il Critic per mettere in discussione la scelta del Judge.',
        },
        actions: {
          title: 'Usa una risposta',
          body: 'Su ogni scheda puoi passare dal testo formattato a quello grezzo, copiarlo, esportarlo in Markdown o aprirlo più grande.',
        },
      },
    },
    [TourId.LabsIntro]: {
      title: 'Laboratori di orchestrazione',
      description: 'Fai passare un prompt per più modelli secondo uno schema fisso.',
      steps: {
        what: {
          title: 'Cosa fanno i laboratori',
          body: 'Ogni laboratorio fa passare il tuo prompt per più modelli secondo uno schema fisso: consenso, escalation, migliore di N, insieme di costi, scomposizione, pipeline, riparazione, pacchetto di ruoli o verifica.',
        },
        how: {
          title: 'Come usarne uno',
          body: 'Scegli i modelli, scrivi il prompt e invialo. Allega file, pacchetti di contesto e prompt salvati come in una chat normale. I risultati compaiono sotto come schede.',
        },
      },
    },
    [TourId.DashboardIntro]: {
      title: 'La tua dashboard',
      description: 'Uno sguardo rapido al tuo spazio di lavoro.',
      steps: {
        header: {
          title: 'Dashboard',
          body: 'La tua panoramica: cosa hai, cosa è connesso e se tutto funziona bene.',
        },
        stats: {
          title: 'Numeri chiave',
          body: 'Totale chat, connettori attivi e modelli locali a colpo d’occhio.',
        },
        actions: {
          title: 'Azioni rapide',
          body: 'Avvia una chat, aggiungi un connettore o configura l’instradamento con un clic.',
        },
      },
    },
    [TourId.PlanIntro]: {
      title: 'Il tuo piano',
      description: 'Cosa include il tuo abbonamento.',
      steps: {
        header: {
          title: 'Il mio piano',
          body: 'Il tuo piano attuale, le sue funzioni e i modelli che puoi usare.',
        },
        quota: {
          title: 'Quota giornaliera di token',
          body: 'La tua disponibilità per ogni giorno.',
        },
        models: {
          title: 'Modelli consentiti',
          body: 'I modelli che il tuo piano ti permette di usare. Passa a un piano superiore per sbloccarne altri.',
        },
      },
    },
    [TourId.BillingIntro]: {
      title: 'Fatturazione',
      description: 'Piani, prezzi e pagamenti.',
      steps: {
        header: {
          title: 'Fatturazione',
          body: 'Gestisci il tuo abbonamento e vedi quanto costa ogni piano.',
        },
        plans: {
          title: 'Scegli un piano',
          body: 'Confronta i piani e passa dalla fatturazione mensile a quella annuale.',
        },
      },
    },
    [TourId.UsageIntro]: {
      title: 'Utilizzo',
      description: 'Tieni traccia di quanto hai usato.',
      steps: {
        header: {
          title: 'Utilizzo',
          body: 'Segui il tuo consumo giornaliero di token rispetto al piano.',
        },
        card: {
          title: 'Utilizzo giornaliero dei token',
          body: 'La barra mostra quanta parte della quota di oggi hai usato e il credito connettori se il tuo piano lo include.',
        },
      },
    },
    [TourId.FilesIntro]: {
      title: 'I tuoi file',
      description: 'Carica file per dare contesto all’IA.',
      steps: {
        header: {
          title: 'File',
          body: 'Tutto ciò che carichi sta qui, pronto da usare come contesto in chat.',
        },
        upload: {
          title: 'Carica un file',
          body: 'Trascina un file qui o fai clic per sceglierne uno. I file vengono analizzati prima dell’uso.',
        },
      },
    },
    [TourId.SettingsIntro]: {
      title: 'Impostazioni',
      description: 'Il tuo account e le tue preferenze.',
      steps: {
        header: { title: 'Impostazioni', body: 'Gestisci profilo, sicurezza, lingua e aspetto.' },
        language: { title: 'Lingua', body: 'Scegli la lingua dell’intera app.' },
        appearance: { title: 'Aspetto', body: 'Passa tra tema chiaro, scuro e di sistema.' },
        danger: {
          title: 'Elimina account',
          body: 'Elimina definitivamente il tuo account e chiude tutte le sessioni. Non si può annullare.',
        },
      },
    },
    [TourId.MemoryIntro]: {
      title: 'Memoria',
      description: 'Cosa l’IA ricorda di te.',
      steps: {
        header: {
          title: 'Memoria',
          body: 'I record di memoria danno all’IA un contesto duraturo su di te e sul tuo lavoro.',
        },
        tabs: {
          title: 'Salvate e suggerite',
          body: 'Le memorie salvate vengono usate nelle tue chat. I suggerimenti sono nuove memorie che l’IA propone da rivedere.',
        },
      },
    },
    [TourId.ConnectorsIntro]: {
      title: 'Connettori',
      description: 'Le tue connessioni ai provider di IA.',
      steps: {
        header: {
          title: 'Connettori',
          body: 'Un connettore collega ClawAI a un provider di IA con la tua chiave.',
        },
        actions: {
          title: 'Aggiungi un connettore',
          body: 'Creane uno per usare i modelli di un provider. Poi puoi testare la connessione e sincronizzarne i modelli.',
        },
      },
    },
  },
};
