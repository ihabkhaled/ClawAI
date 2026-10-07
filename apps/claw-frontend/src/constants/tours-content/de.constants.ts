import { TourId } from '@/enums/tour-id.enum';
import type { TourDictionary } from '@/types/tour.types';

export const DE_TOURS_CONTENT: TourDictionary = {
  ui: {
    next: 'Weiter',
    back: 'Zurück',
    skip: 'Tour überspringen',
    done: 'Fertig',
    stepOf: 'Schritt {current} von {total}',
    dialogLabel: 'Produkttour',
    launcherLabel: 'Touren und Hilfe',
    launcherTitle: 'Produkttouren',
    launcherHint: 'Ein kurzer Rundgang durch das, was du auf dieser Seite siehst.',
    launcherHere: 'Auf dieser Seite',
    launcherMore: 'Weitere Touren',
    launcherDone: 'Erledigt',
    launcherStart: 'Starten',
    launcherRestart: 'Wiederholen',
    offerTitle: 'Neu hier? Mach eine 1-Minuten-Tour',
    offerStart: 'Zeig es mir',
    offerLater: 'Jetzt nicht',
    missingTarget:
      'Dieser Teil ist gerade nicht sichtbar. Öffne ihn und starte die Tour dann erneut.',
  },
  tours: {
    [TourId.ThreadsIntro]: {
      title: 'Threads kennenlernen',
      description: 'Aus einem Chat wird ein recherchierter, belegter, öffentlicher Artikel.',
      steps: {
        welcome: {
          title: 'Threads in einer Minute',
          body: 'Ein Thread ist ein öffentlicher Artikel, der aus einem deiner Chats entsteht: im Live-Web recherchiert, von mehreren Modellen geschrieben, von Bewerter und Kritiker geprüft und erst mit deiner Freigabe veröffentlicht.',
        },
        list: {
          title: 'Deine Threads',
          body: 'Jeder Thread, den du startest, erscheint hier mit seinem Status. Öffne einen, um ihn während des Laufs zu verfolgen, den Entwurf zu prüfen, freizugeben, zu exportieren oder zu teilen.',
        },
        create: {
          title: 'Thread erstellen',
          body: 'Wähle einen Quellchat, sag, worum es im Artikel geht, und wähle die Modelle. Du kannst auch in jedem Chat mit „In öffentlichen Thread umwandeln“ starten.',
        },
        process: {
          title: 'Was danach passiert',
          body: 'ClawAI recherchiert das Thema, drei bis fünf Autoren schreiben unabhängig, sie einigen sich auf einen Entwurf, dann prüfen Bewerter und Kritiker bis zu drei Runden.',
        },
        approve: {
          title: 'Du entscheidest',
          body: 'Nichts wird öffentlich, bis du den Entwurf gelesen und freigegeben hast. Du kannst jederzeit zurückziehen, und ein selbst gesetztes Ausgabenlimit begrenzt die Kosten.',
        },
      },
    },
    [TourId.ThreadCreate]: {
      title: 'Das Thread-Formular ausfüllen',
      description: 'Was jedes Feld bewirkt, bevor du startest.',
      steps: {
        topic: {
          title: 'Das Thema',
          body: 'Sag, was der Artikel erklären oder beantworten soll. Eine klare Frage gibt den Autoren und der Recherche ein klares Ziel.',
        },
        kind: {
          title: 'Typ und Sprache',
          body: 'Wähle Artikel, Forschungsartikel, Anleitung oder technische Erklärung und die Sprache der öffentlichen Seite.',
        },
        cap: {
          title: 'Maximale Ausgaben',
          body: 'Das Meiste, was dieser Thread kosten darf. Jeder Modellaufruf wird zuerst dagegen geprüft, und der Auftrag stoppt, statt es zu überschreiten.',
        },
        models: {
          title: 'Autoren, Bewerter und Kritiker',
          body: 'Wähle drei bis fünf Autoren, einen Bewerter und einen Kritiker mit derselben Auswahl wie im Chat. Verschiedene Anbieter geben vielfältigere Entwürfe und unabhängige Prüfung.',
        },
        consent: {
          title: 'Deine Zustimmung',
          body: 'Hake das ab, um zu bestätigen, dass der fertige Artikel öffentlich und durchsuchbar wird. Ohne Häkchen bleibt der Start deaktiviert.',
        },
        start: {
          title: 'Generierung starten',
          body: 'ClawAI startet den Auftrag und öffnet die Prüfseite, wo du jede Phase verfolgen und jederzeit abbrechen kannst.',
        },
      },
    },
    [TourId.ThreadReview]: {
      title: 'Einen Thread prüfen',
      description: 'Verfolgen, lesen, freigeben, exportieren, teilen.',
      steps: {
        status: {
          title: 'Live-Fortschritt',
          body: 'Während der Auftrag läuft, sagt diese Zeile, was passiert: Recherche, Autoren schreiben, Einigung auf einen Entwurf, Bewerter und Kritiker. Abbrechen stoppt ihn und gibt ungenutztes Guthaben zurück.',
        },
        draft: {
          title: 'Der Entwurf und seine Quellen',
          body: 'Bestehen die Prüfungen, erscheint der Entwurf mit nummerierten Quellen. Lies ihn sorgfältig: Du kannst ihn bearbeiten oder Änderungen verlangen, bevor etwas öffentlich wird.',
        },
        approve: {
          title: 'Freigeben und veröffentlichen',
          body: 'Nur ein freigegebener Entwurf wird zur öffentlichen Seite. Zurückziehen entfernt ihn von der Seite, aus der Suche, der Sitemap und den Feeds.',
        },
        export: {
          title: 'Herunterladen',
          body: 'Wähle ein oder mehrere Formate und lade sie zusammen als ZIP herunter oder speichere ein PDF über den Druckdialog deines Browsers.',
        },
        share: {
          title: 'Teilen',
          body: 'Kopiere den Link, nutze das Teilen-Menü deines Geräts oder poste ihn nach der Veröffentlichung bei WhatsApp, Facebook, LinkedIn, X, Telegram, Reddit oder per E-Mail.',
        },
      },
    },
    [TourId.ChatIntro]: {
      title: 'Rundgang durch den Chat',
      description: 'Alles rund um das Nachrichtenfeld, in einer Minute.',
      steps: {
        input: {
          title: 'Hier schreiben',
          body: 'Tippe deine Nachricht und drücke Enter zum Senden. Shift+Enter fügt eine neue Zeile ein. Auch Bilder und Dateien kannst du einfügen.',
        },
        context: {
          title: 'Kontext',
          body: 'Füge Kontextpakete hinzu, sieh dir an, was das Modell sehen wird, und nutze dein Gedächtnis, damit Antworten auf deinem Material beruhen.',
        },
        model: {
          title: 'Welches Modell antwortet',
          body: 'Lass es auf Auto, dann wählt ClawAI pro Nachricht ein Modell, oder wähle ein bestimmtes.',
        },
        attach: {
          title: 'Dateien anhängen',
          body: 'Lade Dokumente, Bilder, Audio oder Video hoch. Der Text wird extrahiert, damit jedes Modell ihn lesen kann.',
        },
        research: {
          title: 'Im Web suchen',
          body: 'Schalte die Web-Recherche ein, wenn die Antwort aktuelle Fakten und Quellen braucht.',
        },
        prompts: {
          title: 'Prompt-Bibliothek',
          body: 'Wiederverwendbare Prompts für häufige Aufgaben. Wähle einen, um das Nachrichtenfeld zu füllen.',
        },
        send: {
          title: 'Senden',
          body: 'Sendet deine Nachricht. Die Antwort kommt laufend an, und du kannst sie jederzeit stoppen.',
        },
        rail: {
          title: 'Werkzeuge für diesen Chat',
          body: 'Vergleiche denselben Prompt über Modelle, lass einen Bewerter urteilen, durchsuche diesen Chat, teile ihn oder öffne weitere Aktionen.',
        },
      },
    },
    [TourId.ChatModels]: {
      title: 'So wählst du ein Modell',
      description: 'Auto-Routing, manuelle Auswahl und was die Markierungen bedeuten.',
      steps: {
        model: {
          title: 'Die Modellauswahl öffnen',
          body: 'Diese Schaltfläche zeigt, was deine nächste Nachricht beantwortet. Öffne sie, um alle Modelle nach Anbieter gruppiert mit Suchfeld zu sehen.',
        },
        auto: {
          title: 'Auto oder ein bestimmtes Modell',
          body: 'Auto-Routing wählt pro Nachricht ein Modell aus dem, was dein Tarif erlaubt. Ein gewähltes Modell bindet diesen Chat daran.',
        },
        badges: {
          title: 'Guthaben-Markierungen',
          body: '„Nutzt Guthaben“ heißt, das Modell zieht von deinem Connector-Guthaben oder den kostenlosen Anfragen ab. Enthaltene Modelle nutzen nie Guthaben.',
        },
        credit: {
          title: 'Dein Guthaben',
          body: 'Das zeigt, was du ausgeben kannst. Ist das Guthaben oder sind die kostenlosen Anfragen aufgebraucht, wechselt ClawAI zu einem enthaltenen Modell und sagt es dir.',
        },
      },
    },
    [TourId.ChatResearch]: {
      title: 'So recherchierst du',
      description: 'Antworten mit Live-Quellen erhalten.',
      steps: {
        toggle: {
          title: 'Web-Recherche einschalten',
          body: 'Schalte die Recherche vor dem Senden ein. ClawAI durchsucht das Web, liest die besten Seiten und antwortet aus dem Gefundenen.',
        },
        provider: {
          title: 'Suchanbieter wählen',
          body: 'Wähle, welchen Suchanbieter du nutzt. Auto nimmt einen, der dir zur Verfügung steht.',
        },
        sources: {
          title: 'Quellen prüfen',
          body: 'Antworten zeigen ihre Quellen, damit du sie öffnen und die Aussagen prüfen kannst. Für eine lange Untersuchung nutze die Recherche-Seite.',
        },
      },
    },
    [TourId.ChatContext]: {
      title: 'So fügst du Kontext hinzu',
      description: 'Antworten auf deinem eigenen Material gründen.',
      steps: {
        context: {
          title: 'Die Kontext-Schaltfläche',
          body: 'Öffne sie, um ein Kontextpaket anzuhängen, zu sehen, was angehängt ist, und das Gedächtnis für diesen Chat ein- oder auszuschalten.',
        },
        preview: {
          title: 'Vorschau vor dem Senden',
          body: 'Sieh genau, was das Modell aus Verlauf, Paketen, Gedächtnis und Dateien erhält, damit nichts Überraschendes mitgeht.',
        },
        packs: {
          title: 'Eigene Pakete erstellen',
          body: 'Ein Kontextpaket ist wiederverwendbares Referenzmaterial. Erstelle eines auf der Kontext-Seite und hänge es an jeden Chat.',
        },
      },
    },
    [TourId.ChatToThread]: {
      title: 'Einen Chat in einen Thread verwandeln',
      description: 'Veröffentliche, was du gelernt hast, mit Quellen.',
      steps: {
        more: {
          title: 'Weitere Aktionen öffnen',
          body: 'Das Menü am Ende der Leiste enthält Export, In öffentlichen Thread umwandeln, Thread-Einstellungen und Löschen.',
        },
        create: {
          title: 'In öffentlichen Thread umwandeln wählen',
          body: 'Ein Formular öffnet sich mit diesem Chat als Quelle. Prüfe das Thema, wähle Modelle, setze ein Ausgabenlimit und gib deine Zustimmung.',
        },
        after: {
          title: 'Verfolgen und freigeben',
          body: 'Du landest auf der Prüfseite. Bestehen die Prüfungen, lies den Entwurf und gib ihn zur Veröffentlichung frei.',
        },
      },
    },
    [TourId.CompareIntro]: {
      title: 'Rundgang durch Compare',
      description: 'Einen Prompt an mehrere Modelle senden.',
      steps: {
        prompt: {
          title: 'Ein Prompt, viele Modelle',
          body: 'Schreibe den Prompt einmal. Compare sendet ihn an jedes gewählte Modell und zeigt die Antworten nebeneinander.',
        },
        models: {
          title: 'Modelle wählen',
          body: 'Wähle bis zu fünf Modelle mit derselben Auswahl wie im Chat. Mische Anbieter, um Unterschiede zu sehen.',
        },
        judge: {
          title: 'Bewerter und Kritiker',
          body: 'Lass einen Bewerter die Antworten einordnen und einen Kritiker zeigen, was schwach ist, jeweils mit Begründung.',
        },
      },
    },
    [TourId.ContextPacks]: {
      title: 'So erstellst du Kontext',
      description: 'Wiederverwendbares Referenzmaterial aufbauen.',
      steps: {
        create: {
          title: 'Ein Paket erstellen',
          body: 'Gib ihm einen Namen und füge Notizen, Text oder Dateien hinzu. Ein Paket gehört dir und bleibt aus den Chats anderer heraus.',
        },
        use: {
          title: 'In jedem Chat verwenden',
          body: 'Öffne die Kontext-Schaltfläche in einem Chat und hänge das Paket an. Das Modell antwortet dann mit diesem Material vor Augen.',
        },
      },
    },
  },
};
