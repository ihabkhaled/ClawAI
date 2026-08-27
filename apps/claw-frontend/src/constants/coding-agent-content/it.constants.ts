import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * La versione italiana delle due pagine del Coding Agent.
 *
 * Ogni affermazione qui viene dal README e dal manifest dell’estensione in
 * `apps/claw-coding-agent`, non dai desideri del marketing. L’estensione è un
 * client leggero — autenticazione, diritti, quote, cronologia, credenziali dei
 * fornitori, routing e inferenza restano sulla piattaforma — e il testo lo dice,
 * perché uno sviluppatore che la installa aspettandosi un modello di codice
 * offline la disinstalla nel giro di un minuto.
 */
export const IT_CODING_AGENT_CONTENT: CodingAgentDictionary = {
  overview: {
    eyebrow: 'ClawAI nel tuo editor',
    title: 'Il Coding Agent ClawAI per VS Code',
    intro:
      'Tutti i modelli del tuo abbonamento ClawAI, dentro l’editor che usi già. L’estensione è un client leggero: il tuo account, le tue quote, le credenziali dei tuoi fornitori e la cronologia delle conversazioni restano sulla piattaforma, così lo stesso thread che hai iniziato nel browser continua in VS Code.',
    installCta: 'Installa dal Marketplace',
    marketplaceCta: 'Vedi sul Marketplace',
    capabilitiesTitle: 'Che cosa fa',
    capabilities: [
      {
        title: 'Tutti i modelli, un solo abbonamento',
        body: 'Nove famiglie di modelli di punta e i tuoi modelli locali a pesi aperti, raggiungibili dall’editor senza incollare nessuna chiave API. Il routing avviene sulla piattaforma, così l’editor non tiene mai la credenziale di un fornitore.',
      },
      {
        title: 'Routing automatico o manuale',
        body: 'Lascia che il router scelga il modello per ogni messaggio, oppure fissa una conversazione su uno preciso. La scelta è la stessa che fa l’app web, perché viene fatta nello stesso posto.',
      },
      {
        title: 'Confronta e giudica, nell’editor',
        body: 'Manda un solo prompt a più modelli insieme e leggi le risposte affiancate, con un passaggio di giudizio opzionale: lo stesso flusso di confronto dell’app web, sul codice che hai aperto.',
      },
      {
        title: 'Anteprima prima di applicare',
        body: 'Le modifiche arrivano come un diff da rivedere, non come una scrittura a sorpresa. Nulla tocca la tua copia di lavoro finché non la accetti.',
      },
      {
        title: 'Un contesto che puoi ispezionare',
        body: 'Ogni risposta porta con sé un resoconto: quali file sono stati letti, quale modello ha risposto e quanto è costato sulla tua quota. Quando una risposta è sbagliata, puoi vedere che cosa stava guardando.',
      },
      {
        title: 'Conversazioni in parallelo',
        body: 'Più schede di chat con un titolo aperte insieme, due in esecuzione contemporaneamente su modelli diversi, con la cronologia del backend ripristinata al suo posto.',
      },
    ],
    requirementsTitle: 'Che cosa ti serve',
    requirementsBody:
      'VS Code 1.98 o successivo e un account ClawAI. L’estensione si collega alla piattaforma ospitata da ClawAI oppure alla tua installazione in self-hosting: scegli tu quale al momento dell’accesso.',
    faqTitle: 'Le domande più comuni',
    faq: [
      {
        question: 'Serve un abbonamento separato per l’estensione?',
        answer:
          'No. L’estensione usa l’account ClawAI che hai già e attinge alla stessa quota dell’app web. Non c’è nulla di extra da comprare.',
      },
      {
        question: 'Il mio codice viene inviato a un fornitore di modelli?',
        answer:
          'Solo quello che serve alla richiesta, e solo al modello che risponde: il resoconto di ogni risposta ne dice il nome. Fissa la conversazione su un modello locale a pesi aperti, oppure punta l’estensione su un’installazione in self-hosting, e nulla raggiunge un fornitore esterno.',
      },
      {
        question: 'Funziona con un ClawAI in self-hosting?',
        answer:
          'Sì. L’estensione chiede l’URL del backend al momento dell’accesso, così funziona con la piattaforma ospitata da ClawAI o con un’istanza che gira interamente sulla tua infrastruttura.',
      },
      {
        question: 'Posso continuare a usare anche l’app web?',
        answer:
          'Sì, e le stesse conversazioni compaiono in entrambe. La cronologia vive sulla piattaforma, così un thread iniziato nel browser continua nell’editor e poi di nuovo indietro.',
      },
    ],
  },
  install: {
    eyebrow: 'Installazione',
    title: 'Installa il Coding Agent ClawAI',
    intro:
      'Tre passaggi, circa un minuto. L’estensione è pubblicata sul Visual Studio Marketplace sotto l’editore verificato ClawAI.',
    stepsTitle: 'Da dentro VS Code',
    steps: [
      {
        title: 'Apri la vista Estensioni',
        body: 'Premi Ctrl+Shift+X su Windows e Linux, oppure Cmd+Shift+X su macOS. Puoi anche aprirla dalla barra delle attività sulla sinistra.',
      },
      {
        title: 'Cerca ClawAI Coding Agent',
        body: 'Scrivi «ClawAI» nel campo di ricerca. Cerca la voce pubblicata da ClawAI: il nome dell’editore porta un badge di verifica.',
      },
      {
        title: 'Installa ed esegui l’accesso',
        body: 'Fai clic su Installa, poi apri il pannello ClawAI ed esegui l’accesso. Ti verrà chiesto l’URL del backend: lascia quello predefinito per usare la piattaforma ospitata da ClawAI, oppure inserisci il tuo se sei in self-hosting.',
      },
    ],
    cliTitle: 'Dalla riga di comando',
    cliBody:
      'Se installi le estensioni da un terminale o da uno script di configurazione, basta un comando. Funziona ovunque il comando `code` sia nel PATH.',
    signInTitle: 'L’accesso',
    signInBody:
      'L’accesso avviene nel browser e restituisce all’editor un token con ambito limitato. L’estensione non memorizza mai la tua password e non tiene mai la chiave API di un fornitore di modelli: quelle restano sulla piattaforma.',
    troubleshootingTitle: 'Se qualcosa non va',
    troubleshooting: [
      {
        question: 'L’estensione non compare nella ricerca',
        answer:
          'Controlla la versione di VS Code: l’estensione richiede la 1.98 o successiva. Sulle versioni più vecchie il Marketplace la nasconde invece di proporre un’installazione incompatibile.',
      },
      {
        question: 'Il link di installazione non fa nulla',
        answer:
          'Il link a un clic usa il protocollo `vscode:`, che funziona solo se VS Code è installato sulla macchina da cui stai navigando. Usa invece la pagina del Marketplace o la riga di comando.',
      },
      {
        question: 'L’accesso riesce ma non viene elencato nessun modello',
        answer:
          'L’accesso ai modelli segue il tuo piano. Controlla la pagina Modelli nell’app web: se un modello manca anche lì, non è esposto al tuo account invece che assente dall’estensione.',
      },
      {
        question: 'Non riesce a raggiungere la mia installazione in self-hosting',
        answer:
          'L’URL del backend deve essere raggiungibile dalla tua macchina e deve presentare un certificato di cui il tuo editor si fida. Un certificato autofirmato che il browser ha accettato dopo un avviso qui verrà comunque rifiutato.',
      },
    ],
    marketplaceCta: 'Apri la scheda sul Marketplace',
    openInEditorCta: 'Apri in VS Code',
  },
};
