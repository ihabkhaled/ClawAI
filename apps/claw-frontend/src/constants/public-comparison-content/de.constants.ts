import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const DE_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    atAGlance: 'Auf einen Blick',
    tableCaption: 'ClawAI und {rival} im Vergleich, Fähigkeit für Fähigkeit',
    capabilityColumn: 'Fähigkeit',
    clawColumn: 'ClawAI',
    strengthTitle: 'Wo {rival} stark ist',
    differenceTitle: 'Was ClawAI anders macht',
    chooseTitle: 'Was wofür passt',
    chooseRivalLabel: 'Nimm {rival}, wenn',
    chooseClawLabel: 'Nimm ClawAI, wenn',
    faqTitle: 'Häufige Fragen',
    lastReviewed: 'Verglichen anhand öffentlicher Informationen, zuletzt geprüft',
    independence:
      'ClawAI ist ein unabhängiges Produkt. Es ist mit keinem der hier genannten Assistenten verbunden, wird von keinem unterstützt und verkauft für keinen weiter. Jede Aussage stammt aus der öffentlichen Dokumentation des jeweiligen Anbieters zum oben genannten Datum, und diese Produkte ändern sich schnell — prüfen Sie vor einer Entscheidung die Seiten des Anbieters.',
    otherComparisons: 'ClawAI mit einem anderen Assistenten vergleichen',
    startFree: 'Kostenlos starten',
    seePricing: 'Preise ansehen',
  },
  hub: {
    eyebrow: 'Vergleiche',
    intro:
      'ClawAI will nicht der bessere einzelne Assistent sein. Es stellt neun führende Modellfamilien hinter ein Abonnement und schickt jede Nachricht an die passende. Diese Seiten stellen das den Assistenten gegenüber, die Menschen bereits nutzen — jedes Mal anhand derselben acht Fähigkeiten.',
    cardsTitle: 'Assistenten zum Vergleichen auswählen',
    cardCta: 'Mit {rival} vergleichen',
    coversTitle: 'Was jeder Vergleich abdeckt',
    coversBody:
      'Dieselben acht Fähigkeiten, in derselben Reihenfolge, auf jeder Seite: Modellauswahl, Routing, Antworten nebeneinander, lokale Modelle, Self-Hosting, Speicher und Dateien, Konnektoren und Nutzungsbelege pro Antwort. Für alle dieselben Fragen, damit sich zwei Seiten nebeneinander lesen lassen.',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'Modellauswahl',
    [ComparisonDimension.ROUTING]: 'Routing',
    [ComparisonDimension.SIDE_BY_SIDE]: 'Antworten nebeneinander',
    [ComparisonDimension.LOCAL_MODELS]: 'Lokale und offene Modelle',
    [ComparisonDimension.SELF_HOSTING]: 'Self-Hosting',
    [ComparisonDimension.MEMORY_AND_FILES]: 'Speicher und Dateien',
    [ComparisonDimension.CONNECTORS]: 'Workspace-Konnektoren',
    [ComparisonDimension.RECEIPTS]: 'Nutzungsbelege',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]: 'Neun führende Modellfamilien in einem Abonnement',
    [ComparisonDimension.ROUTING]:
      'Fünf Routing-Modi, darunter automatisches Routing pro Nachricht',
    [ComparisonDimension.SIDE_BY_SIDE]:
      'Ein Prompt an mehrere Modelle gleichzeitig, Antworten nebeneinander',
    [ComparisonDimension.LOCAL_MODELS]:
      'Offene Modelle auf der eigenen GPU, über Ollama oder llama.cpp',
    [ComparisonDimension.SELF_HOSTING]:
      'Der gesamte Stack läuft auf Ihren Servern, Quellcode auf GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'Speicher, der über Gespräche hinweg bleibt, plus Dateikontext',
    [ComparisonDimension.CONNECTORS]: 'Zwölf Workspace-Konnektoren',
    [ComparisonDimension.RECEIPTS]:
      'Jede Antwort protokolliert Modell, Kosten und verbrauchtes Kontingent',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI vs. ChatGPT',
      intro:
        'ChatGPT ist der Assistent, den die meisten meinen, wenn sie „KI“ sagen: ausgereift, schnell, gestützt auf OpenAIs eigene Spitzenmodelle. ClawAI hat eine andere Form: ein Abonnement, das OpenAIs Modelle neben acht weiteren Familien erreicht und jede Nachricht an die passende schickt.',
      theirStrength:
        'Ein einzelnes, sehr gut gemachtes Produkt. Sprache, Bilderzeugung, Codeausführung und tiefe Recherche sind eingebaut und greifen ineinander, die mobilen Apps sind hervorragend, und das Modell darunter ist ein Spitzenmodell, kein Kompromiss.',
      ourDifference:
        'ClawAI versucht nicht, der bessere einzelne Assistent zu sein. Es nimmt die Anbieterfrage heraus: Ein Gespräch kann zwischen OpenAI, Anthropic, Google und sechs weiteren Familien wechseln, auf ein lokales offenes Modell fallen, wenn die Daten das Netz nicht verlassen dürfen, und festhalten, welches Modell geantwortet hat.',
      chooseRival:
        'Sie einen ausgereiften Assistenten wollen, OpenAI-Modelle fast alles abdecken und die eingebauten Sprach- und Bildwerkzeuge zählen.',
      chooseClaw:
        'Sie regelmäßig an die Grenze eines Anbieters stoßen, ein zweites Modell die erste Antwort prüfen soll oder ein Teil der Arbeit auf eigener Hardware bleiben muss.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Nur OpenAI-Modelle',
        [ComparisonDimension.ROUTING]: 'Automatische Auswahl innerhalb von OpenAIs Reihe',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Eine Antwort nach der anderen',
        [ComparisonDimension.LOCAL_MODELS]: 'Nur Cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Nicht angeboten',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Speicher, Projekte und Datei-Uploads',
        [ComparisonDimension.CONNECTORS]: 'Apps und Konnektoren in bezahlten Tarifen',
        [ComparisonDimension.RECEIPTS]: 'Nutzung auf Tarifebene, keine Kosten pro Antwort',
      },
      faq: [
        {
          question: 'Kann ClawAI dieselben OpenAI-Modelle nutzen wie ChatGPT?',
          answer:
            'ClawAI routet zu OpenAIs Modellen als eine von neun Familien im Katalog. Es gibt kein OpenAI-Konto anzulegen und keinen API-Schlüssel einzufügen — der Modellzugang gehört zum Abonnement.',
        },
        {
          question: 'Ist ClawAI ein ChatGPT-Client?',
          answer:
            'Nein. ClawAI ist eine unabhängige Plattform mit eigenen Schichten für Routing, Speicher, Vergleich und Orchestrierung. OpenAI ist einer der Anbieter, an die sie eine Nachricht schicken kann, nicht das Produkt darunter.',
        },
        {
          question: 'Kann ich ClawAI nutzen, ohne etwas an OpenAI zu senden?',
          answer:
            'Ja. Heften Sie ein Gespräch an ein lokales offenes Modell oder betreiben Sie den gesamten Stack selbst und führen nur Modelle auf eigenen GPUs aus, ganz ohne externe Anbieteraufrufe.',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI vs. Claude',
      intro:
        'Claude ist das, wonach viele greifen, wenn die Arbeit lang, sorgfältig und geschrieben ist. ClawAI erreicht Anthropics Modelle ebenfalls — neben acht weiteren Familien — und lässt ein zweites Modell prüfen, was das erste gesagt hat.',
      theirStrength:
        'Sorgfältiges Denken über lange Dokumente, das zuverlässigste Befolgen von Anweisungen im Feld und starke Code-Reviews. Projekte, Artefakte und MCP-Konnektoren machen es zu einem wirklich guten Ort für ausdauernde Schreibarbeit.',
      ourDifference:
        'ClawAI behandelt Anthropic als eine starke Option, nicht als die einzige. Derselbe Verlauf kann einen Prompt gleichzeitig an Claude und vier weitere Modelle schicken, ein Modell die Antwort eines anderen bewerten lassen und automatisch umschalten, wenn ein Anbieter ausfällt.',
      chooseRival:
        'fast Ihre gesamte Arbeit langes Denken oder Code-Review ist und ein exzellentes Modell genügt.',
      chooseClaw:
        'Sie Claudes Antwort und eine zweite Meinung wollen, ein lokales Modell für sensible Arbeit brauchen oder nicht pro Anbieter ein Abo halten möchten.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Nur Anthropic-Modelle',
        [ComparisonDimension.ROUTING]: 'Sie wählen das Modell selbst',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Eine Antwort nach der anderen',
        [ComparisonDimension.LOCAL_MODELS]: 'Nur Cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Nicht angeboten',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Projekte, Dateien und Speicher',
        [ComparisonDimension.CONNECTORS]: 'MCP-Konnektoren und Desktop-Erweiterungen',
        [ComparisonDimension.RECEIPTS]: 'Nutzung auf Tarifebene, keine Kosten pro Antwort',
      },
      faq: [
        {
          question: 'Enthält ClawAI Claude-Modelle?',
          answer:
            'Ja. Anthropic ist eine von neun Modellfamilien im Katalog, aus jedem Gespräch erreichbar, ohne eigenes Anthropic-Konto und ohne Schlüssel.',
        },
        {
          question: 'Kann ein Modell die Antwort eines anderen prüfen?',
          answer:
            'Ja. Verify, Judge und Critic setzen ein zweites Modell auf die Ausgabe des ersten an. Das senkt das Risiko einer selbstbewusst falschen Antwort, beseitigt es aber nicht — alles Folgenreiche braucht weiterhin einen menschlichen Blick.',
        },
        {
          question: 'Ist ClawAI mit Anthropic verbunden?',
          answer:
            'Nein. ClawAI ist unabhängig. Es routet zu Anthropics Modellen wie zu acht anderen Anbietern und ist mit keinem von ihnen verbunden oder von ihm unterstützt.',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI vs. Gemini',
      intro:
        'Gemini ist der Assistent, der Ihren vorhandenen Dokumenten am nächsten sitzt — sofern diese in Google Workspace liegen. ClawAI kommt von der anderen Seite: anbieterneutral, mit Googles Modellen als einer von neun Familien.',
      theirStrength:
        'Sehr große Kontextfenster, native Verarbeitung von Bildern, Audio und Video, schnelle Antworten und eine Integration in Gmail, Drive und Docs, die kein Dritter erreichen kann.',
      ourDifference:
        'ClawAI ist weder an eine Office-Suite noch an die Roadmap eines Anbieters gebunden. Es verbindet sich mit zwölf Arbeitswerkzeugen statt mit einem, routet jede Nachricht nach Aufgabe und kann sensible Arbeit auf einem lokalen offenen Modell halten.',
      chooseRival:
        'Ihre Organisation in Google Workspace lebt und Sie den Assistenten direkt darin haben wollen.',
      chooseClaw:
        'Sie Werkzeuge mehrerer Anbieter nutzen, Modelle vor der Festlegung vergleichen wollen oder eine Installation ohne externe Anbieteraufrufe brauchen.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Nur Google-Modelle',
        [ComparisonDimension.ROUTING]: 'Automatische Auswahl innerhalb von Googles Reihe',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Eine Antwort nach der anderen',
        [ComparisonDimension.LOCAL_MODELS]: 'Nur bei Google gehostet',
        [ComparisonDimension.SELF_HOSTING]: 'Nicht angeboten',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Dateien, Drive und Workspace-Kontext',
        [ComparisonDimension.CONNECTORS]: 'Tiefe Google-Workspace-Integration',
        [ComparisonDimension.RECEIPTS]: 'Nutzung auf Tarifebene, keine Kosten pro Antwort',
      },
      faq: [
        {
          question: 'Kann ClawAI Gemini-Modelle nutzen?',
          answer:
            'Ja. Google ist eine der neun Modellfamilien im Katalog und in jedem Gespräch unter demselben Abonnement verfügbar.',
        },
        {
          question: 'Verbindet sich ClawAI mit Google Workspace?',
          answer:
            'ClawAI liefert zwölf Konnektoren für Issue-Tracker, Chat und Dokumente. Die Google-Anbindung ist ein Konnektor, keine erstklassige Eigenfläche — breiter über Anbieter hinweg, flacher innerhalb von Google.',
        },
        {
          question: 'Was ist besser für sehr lange Dokumente?',
          answer:
            'Beides funktioniert gut, und Googles größte Kontextfenster gehören zu den größten überhaupt. ClawAIs Unterschied: Sie können dasselbe lange Dokument an zwei Modelle schicken und die Schlüsse vergleichen.',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI vs. Perplexity',
      intro:
        'Perplexity ist um eine Aufgabe gebaut: eine Frage aus dem aktuellen Web beantworten, mit Quellen. ClawAI ist um eine andere gebaut: das richtige Modell auf die Arbeit setzen, die gerade ansteht — Recherche eingeschlossen.',
      theirStrength:
        'Das am besten zugeschnittene Produkt für suchartige Fragen. Antworten kommen mit Belegen, Rückfragen halten den Faden zusammen, und die gesamte Oberfläche ist darauf ausgelegt, die Herkunft einer Aussage zu prüfen.',
      ourDifference:
        'ClawAI ist ein Arbeitsbereich, keine Antwortmaschine. Recherche ist ein Modus unter mehreren, neben Modellvergleich, dauerhaftem Speicher, Dateikontext, einem Coding-Agenten und lokalen Modellen — und jede Antwort hält fest, welches Modell sie erzeugt hat.',
      chooseRival: 'die meisten Ihrer Fragen lauten „was stimmt gerade jetzt, und wer sagt das“.',
      chooseClaw:
        'Recherche nur ein Teil der Arbeit ist und Sie außerdem Code, lange Texte, Modellvergleiche oder ein Modell auf eigener Hardware brauchen.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modelle mehrerer Anbieter in höheren Tarifen',
        [ComparisonDimension.ROUTING]: 'Nach Such- und Antwortqualität gewählt',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Eine Antwort nach der anderen',
        [ComparisonDimension.LOCAL_MODELS]: 'Nur Cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Nicht angeboten',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Spaces, Threads und Datei-Uploads',
        [ComparisonDimension.CONNECTORS]: 'Konnektoren in Business-Tarifen',
        [ComparisonDimension.RECEIPTS]: 'Nutzung auf Tarifebene, keine Kosten pro Antwort',
      },
      faq: [
        {
          question: 'Durchsucht ClawAI das Web?',
          answer:
            'Ja. Die Recherche führt eine mehrstufige Websuche aus und liefert eine Antwort mit ihren Quellen. Sie ist eine Fähigkeit im Arbeitsbereich, nicht das ganze Produkt.',
        },
        {
          question: 'Wer belegt besser?',
          answer:
            'Perplexity ist für belegte Antworten gebaut und zeigt praktisch für jede Aussage Quellen. ClawAI belegt seine Recherchen; für eine reine Finden-und-belegen-Frage ist eine dedizierte Antwortmaschine das schärfere Werkzeug.',
        },
        {
          question: 'Kann ich beides nutzen?',
          answer:
            'Viele tun das. Die eigentliche Frage ist, ob Sie eine spezialisierte Antwortmaschine, einen allgemeinen Multi-Modell-Arbeitsbereich oder beides wollen.',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI vs. Microsoft Copilot',
      intro:
        'Copilot ist Microsoft 365 mit einem Assistenten darin. ClawAI ist ein eigenständiger Arbeitsbereich, der neun Modellfamilien erreicht und vollständig auf Ihren eigenen Servern laufen kann.',
      theirStrength:
        'Nichts sitzt so nah an den vorhandenen Microsoft-Daten einer Organisation. Kontext aus Word, Excel, Outlook und Teams kommt ohne Konfiguration, und Lizenzierung, Mandantentrennung und Compliance folgen dem Microsoft-365-Vertrag, den die IT ohnehin hat.',
      ourDifference:
        'ClawAI ist herstellerneutral und überall betreibbar. Es routet über neun Modellfamilien statt über die Auswahl eines Lieferanten, zeigt die Kosten jeder Antwort und lässt sich vollständig im eigenen Netz mit offenen Modellen und ohne externe Aufrufe installieren.',
      chooseRival:
        'Ihre Organisation auf Microsoft 365 läuft und der Wert darin liegt, dass der Assistent in den vorhandenen Dokumenten sitzt.',
      chooseClaw:
        'Sie Anbieterwahl, sichtbare Kosten pro Antwort oder einen Betrieb wollen, der Ihre Infrastruktur nie verlässt.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'OpenAI-Modelle plus Microsofts eigene',
        [ComparisonDimension.ROUTING]: 'Von Microsoft je Oberfläche gewählt',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Eine Antwort nach der anderen',
        [ComparisonDimension.LOCAL_MODELS]: 'Nur Cloud',
        [ComparisonDimension.SELF_HOSTING]: 'Nicht angeboten',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Microsoft-365-Dateien und Organisationskontext',
        [ComparisonDimension.CONNECTORS]: 'Tiefste Microsoft-365-Integration',
        [ComparisonDimension.RECEIPTS]: 'Lizenz pro Platz, keine Kosten pro Antwort',
      },
      faq: [
        {
          question: 'Lässt sich ClawAI in unserem eigenen Netz betreiben?',
          answer:
            'Ja. Der gesamte Stack läuft auf Ihren Servern, mit offenen Modellen auf Ihren GPUs und ohne externe Anbieteraufrufe. Das ist ein abgestimmtes Projekt, kein online buchbarer Tarif.',
        },
        {
          question: 'Integriert sich ClawAI in Microsoft 365?',
          answer:
            'ClawAI liefert zwölf Konnektoren für Issue-Tracker, Chat und Dokumente — breiter über Anbieter hinweg als Copilot und flacher innerhalb von Microsofts eigenen Anwendungen.',
        },
        {
          question: 'Wie wird die Nutzung abgerechnet?',
          answer:
            'Nach kostennormalisierten Token gegen ein tägliches und monatliches Kontingent, nicht pro Platz. Jede Antwort zeigt Modell, Kosten und verbrauchtes Kontingent.',
        },
      ],
    },
  },
};
