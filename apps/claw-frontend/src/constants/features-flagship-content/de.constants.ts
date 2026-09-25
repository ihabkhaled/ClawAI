import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesFlagshipDictionary } from '@/types/features-cluster.types';

export const DE_FEATURES_FLAGSHIP_CONTENT: FeaturesFlagshipDictionary = {
  capabilitiesIntro:
    'Die Abschnitte oben sind die Kurzfassung. Jede Funktion unten hat eine eigene Seite: was das Feature tatsächlich tut, wie es freigeschaltet oder abgerechnet wird und welche Grenzen gelten — abgeglichen mit dem ausgelieferten Produkt.',
  cardSummaries: {
    [FeatureCapability.MULTIMODAL_AI]:
      'Sprach- und Videonachrichten, ein Helfer, der Bilder für Modelle ohne Bildverständnis beschreibt, und Routing, das ein Modell wählt, das mit dem Anhang umgehen kann.',
    [FeatureCapability.FILES_FROM_CHAT]:
      'Bitten Sie in normaler Sprache um ein PDF, eine Tabelle oder eine Präsentation und erhalten Sie eine echte Datei zurück, benannt von dem Modell, das sie geschrieben hat.',
    [FeatureCapability.SMART_ATTACHMENTS]:
      'Ziehen Sie Dokumente, Code, Medien oder ganze Archive in den Chat; jeder Upload wird auf Viren geprüft und sein Text für das Modell extrahiert.',
    [FeatureCapability.NARRATED_RESEARCH]:
      'Eine Recherche-Schleife, die entscheidet, ob gesucht oder gecrawlt wird, jeden Schritt während der Arbeit kommentiert und bei jedem Abruf robots.txt respektiert.',
    [FeatureCapability.ORCHESTRATION_LABS]:
      'Eigene Labs, die mehrere Modelle auf ein Problem ansetzen — Vergleich mit Richter, Konsens, Eskalation, Verifikation und mehr.',
    [FeatureCapability.CONVERSATION_TOOLS]:
      'Verzweigen Sie ein Gespräch, bearbeiten und wiederholen Sie eine Nachricht, durchsuchen Sie Ihre Threads, exportieren Sie eine Antwort und lassen Sie einen Thread auf einen anderen zurückgreifen.',
    [FeatureCapability.READ_ALOUD]:
      'Hören Sie sich jede Antwort an, statt sie zu lesen — die Wiedergabe beginnt, sobald der erste kurze Abschnitt fertig ist.',
    [FeatureCapability.IMAGE_GENERATION]:
      'Erzeugen und bearbeiten Sie Bilder direkt im Gespräch, über mehrere Bildanbieter mit automatischem Fallback zwischen ihnen.',
    [FeatureCapability.RELIABILITY]:
      'Automatischer Fallback auf ein anderes Modell, ein gemeinsamer Schutzschalter für Anbieter ohne Guthaben und Streams, die eine Neuverbindung überstehen.',
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]:
      'Ein monatliches Guthaben aus Ihrem Plan plus Aufladungen, die nie verfallen — vor jedem Aufruf reserviert und in Ihrer eigenen Währung angezeigt.',
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]:
      'Anpassbare Rollen, Benutzer- und Planverwaltung sowie ein filterbares Audit-Protokoll für alle, die ClawAI für eine Organisation betreiben.',
  },
  capabilities: {
    [FeatureCapability.MULTIMODAL_AI]: {
      seo: {
        title: 'Multimodale KI in ClawAI: Sprache, Video und Bilder',
        description:
          'Wie ClawAI mit Sprachnachrichten, Videonachrichten und Bildern umgeht: Transkription, ausgewählte Videoframes, ein Bild-Helfer für reine Textmodelle und Routing nach Anhangstyp.',
        keywords: ['KI-Sprachnachrichten', 'KI-Videoverständnis', 'multimodales KI-Routing'],
      },
      eyebrow: 'Funktion',
      title: 'Multimodale KI: Sprache, Video und Bilder',
      summary:
        'Sie können mit ClawAI sprechen, ihm ein Video zeigen oder ein Bild geben — und die Nachricht erreicht trotzdem ein Modell, das damit etwas anfangen kann. Aufnahme, Transkription, Frame-Auswahl und ein Bild-Helfer sind fester Bestandteil des Chats, keine separate App.',
      sections: [
        {
          id: 'voice-and-video-notes',
          heading: 'Sprach- und Videonachrichten direkt aus dem Eingabefeld',
          paragraphs: [
            'Das Eingabefeld hat eine Aufnahmetaste für Sprach- und Videonachrichten. Es fragt zuerst nach der Berechtigung, zeigt während der Aufnahme eine Live-Wellenform und begrenzt eine Aufnahme auf fünf Minuten. Die Aufnahme wird transkribiert — zuerst mit Gemini, OpenAI Whisper dient als Fallback — und das antwortende Modell erfährt, dass die Nachricht als Sprachnachricht kam, sodass es auf das Gesagte antwortet statt auf eine Datei.',
            'Vorhandene Audiodateien funktionieren genauso: Uploads in WebM, OGG, MP3, MP4 und M4A, WAV, FLAC und AAC werden transkribiert, bevor sie das Modell erreichen.',
          ],
        },
        {
          id: 'video-understanding',
          heading: 'Videos, denen das Modell wirklich folgen kann',
          paragraphs: [
            'Ein hochgeladenes Video wird mit Zeitstempeln transkribiert, und bis zu sechs Frames pro Video werden ausgewählt und dem Modell zusammen mit dem Transkript gezeigt. So kann es Fragen dazu beantworten, was auf dem Bildschirm passiert, und nicht nur dazu, was gesagt wird. Ein stummes Video wird als „ohne Sprache“ gemeldet, statt ein leeres Transkript zu erzeugen, und Sie können die Verarbeitung eines langen Videos jederzeit abbrechen.',
            'Jeder Plan hat ein vom Betreiber festgelegtes Kontingent für die Videolänge; unabhängig vom Plan darf ein einzelnes Video nie länger als dreißig Minuten sein oder 4K-Auflösung überschreiten. Unterstützte Container sind MP4, MOV, WebM, AVI und MPEG.',
          ],
        },
        {
          id: 'vision-helper-and-modality-routing',
          heading: 'Ein Bild-Helfer und Routing nach Anhangstyp',
          paragraphs: [
            'Nicht jedes Modell kann sehen. Ist das antwortende Modell ein reines Textmodell, kann ein zweites Modell bis zu vier Bilder für es beschreiben, einschließlich des darin enthaltenen Textes, und das antwortende Modell erfährt, dass es mit einer Beschreibung arbeitet. In Local-Only- und Privacy-First-Gesprächen werden nur lokale Helfer verwendet, die über Ollama oder llama.cpp bereitgestellt werden.',
            'Im Auto-Modus bewertet der Router die Kandidatenmodelle außerdem danach, wie gut sie mit der Art des Anhangs umgehen. Ein Bild, ein PDF oder ein Video landet so meist bei einem Modell, das es nativ verarbeitet, statt auf den Helfer angewiesen zu sein.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wie lang darf eine Sprach- oder Videonachricht sein?',
          answer:
            'Eine im Eingabefeld erstellte Aufnahme darf bis zu fünf Minuten lang sein. Hochgeladene Videos sind durch das Videolängen-Kontingent Ihres Plans begrenzt und in keinem Plan länger als dreißig Minuten oder höher als 4K-Auflösung.',
        },
        {
          question:
            'Was passiert, wenn ich ein Bild an ein Modell sende, das keine Bilder sehen kann?',
          answer:
            'Ist der Bild-Helfer in Ihrem Plan aktiviert, beschreibt ein bildfähiges Modell das Bild und transkribiert dessen Text. Das antwortende Modell arbeitet mit dieser Beschreibung und weiß, dass es eine Beschreibung ist und nicht das Bild selbst.',
        },
        {
          question: 'Wählt ClawAI wegen meines Anhangs ein anderes Modell?',
          answer:
            'Im Auto-Modus ja: Der Router bewertet die Kandidaten danach, wie gut sie mit dem Anhangstyp umgehen. Legen Sie selbst ein Modell fest, bleibt Ihre Wahl bestehen, und der Bild-Helfer schließt die Lücke, wo er aktiviert ist.',
        },
      ],
      productNote:
        'Sprach- und Videonachrichten, Transkription und modalitätsbewusstes Routing sind ausgeliefert; der Bild-Helfer ist eine Planfunktion, die ein Betreiber durch Zuweisen eines Helfermodells einschaltet.',
    },
    [FeatureCapability.FILES_FROM_CHAT]: {
      seo: {
        title: 'Dateien aus dem Chat: PDF, DOCX, XLSX, PPTX und ZIP',
        description:
          'Bitten Sie ClawAI in normaler Sprache um ein Dokument, eine Tabelle, eine Präsentation oder ein Archiv und laden Sie eine echte Datei in einem von zehn Formaten herunter, vom Modell benannt und zusammengefasst.',
        keywords: ['PDF mit KI erstellen', 'Tabelle mit KI erstellen', 'KI-PowerPoint-Generator'],
      },
      eyebrow: 'Funktion',
      title: 'Dateien aus dem Chat',
      summary:
        'Sagen Sie „mach daraus ein PDF“ oder „pack das in eine Tabelle“, und ClawAI gibt Ihnen eine Datei statt eines Textblocks zum Kopieren. Das Modell schreibt den Inhalt, ein Format-Adapter baut die Datei, und das Ergebnis liegt im Gespräch zum Herunterladen bereit.',
      sections: [
        {
          id: 'ten-formats-from-plain-language',
          heading: 'Zehn Dateiformate aus einer Anfrage in normaler Sprache',
          paragraphs: [
            'Eine Anfrage wie „erstelle ein PDF von diesem Plan“ oder „exportiere die Tabelle als CSV“ wird erkannt und an die Dateigenerierung weitergegeben. Unterstützt werden PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, reiner Text, CSV und JSON — jedes Format mit eigenem Adapter, sodass eine Tabelle echte Zellen und eine Präsentation echte Folien hat statt einer einzigen langen Seite.',
          ],
        },
        {
          id: 'named-by-the-model',
          heading: 'Benannt und zusammengefasst vom Modell, das sie geschrieben hat',
          paragraphs: [
            'Statt „Dokument (3).pdf“ gibt das Modell jeder Datei einen aussagekräftigen Titel mit bis zu 120 Zeichen und eine Zusammenfassung in einem Satz, die auf der Dateikarte im Chat erscheinen. Titel auf Arabisch, Chinesisch, Hindi oder in jeder anderen Schrift bleiben so erhalten, wie sie geschrieben wurden, statt transliteriert zu werden.',
            'Unabhängig davon lässt sich jede einzelne Antwort mit einem Klick als Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX oder ZIP exportieren. Diese Exporte wandeln eine bereits vorhandene Antwort um und zählen daher nie gegen Ihr tägliches Dateikontingent.',
          ],
        },
        {
          id: 'downloads-and-allowances',
          heading: 'Private Downloads und ein Tageskontingent in jedem Plan',
          paragraphs: [
            'Nur die Person, die eine Datei erstellt hat, kann sie über einen authentifizierten Link herunterladen. Der Download bleibt eine Stunde lang verfügbar; danach können Sie dieselbe Datei kostenlos neu erstellen oder das Modell bitten, sie mit frischem Inhalt neu zu generieren.',
            'Jeder Plan, auch Free, hat ein vom Betreiber festgelegtes Tageskontingent für KI-geschriebene Dateien; höhere Stufen erhöhen es oder heben die Grenze auf. Für das Schreiben selbst gilt zusätzlich Ihr normales Nutzungskontingent, und es greift jeweils die Grenze, die zuerst erreicht wird.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welche Dateiformate kann ClawAI erstellen?',
          answer:
            'Zehn: PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, reiner Text, CSV und JSON. Der Antwort-Export deckt acht davon ab — Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX und ZIP.',
        },
        {
          question: 'Warum funktioniert mein Download-Link nicht mehr?',
          answer:
            'Generierte Dateien bleiben eine Stunde lang herunterladbar. Danach öffnen Sie die Dateikarte und erstellen die Datei neu — gleicher Inhalt, kostenlos — oder bitten das Modell, sie neu zu generieren, wenn sie umgeschrieben werden soll.',
        },
        {
          question: 'Gibt es eine Grenze, wie viele Dateien ich erzeugen kann?',
          answer:
            'Ja, ein vom Betreiber festgelegtes Tageskontingent pro Plan, das auch im Free-Plan verfügbar ist. Der Export einer bereits vorhandenen Antwort zählt nicht dagegen.',
        },
      ],
      productNote:
        'Die Dateigenerierung ist ein eigener Dienst mit einem Adapter pro Format und einer eigenen Abrechnungsfläche (FILE_GENERATION), getrennt von der normalen Chat-Nutzung.',
    },
    [FeatureCapability.SMART_ATTACHMENTS]: {
      seo: {
        title: 'Intelligente Anhänge: Archive, Medien und Virenscan',
        description:
          'Was passiert, wenn Sie in ClawAI eine Datei anhängen: fünfzig unterstützte Typen, Archive als lesbarer Dateibaum, fortsetzbare Uploads und ein Virenscan, der im Zweifel blockiert.',
        keywords: ['Dateianhänge im KI-Chat', 'ZIP an KI hochladen', 'KI-Archivleser'],
      },
      eyebrow: 'Funktion',
      title: 'Intelligente Anhänge',
      summary:
        'Ein Anhang nützt nur, wenn das Modell ihn lesen kann. ClawAI extrahiert den Text aus Dokumenten und Archiven, bevor ein Modell sie sieht, prüft jeden Upload auf Schadsoftware und lässt Sie Dateien überall im Chat ablegen, statt nach einer Schaltfläche zu suchen.',
      sections: [
        {
          id: 'what-you-can-attach',
          heading: 'Was Sie anhängen können, und wie viel',
          paragraphs: [
            'Dokumente (PDF, DOCX, XLSX, PPTX, RTF), rund vierzig Text- und Codeformate, Bilder (PNG, JPEG, WebP, GIF, SVG), Audio, Video und Archive (ZIP, 7z, RAR, TAR, GZ, BZ2, XZ). Jede Datei darf bis zu 50 MB groß sein, und eine Nachricht kann bis zu zehn enthalten. Dateien über 4 MB werden in fortsetzbaren Teilen hochgeladen, sodass eine abgebrochene Verbindung keinen Neustart bedeutet.',
            'Sie können Dateien überall im Chat-Bereich ablegen — auf den Nachrichten oder im Eingabefeld —, und jeder Anhang zeigt während des Uploads einen Status-Chip mit einer Abbrechen-Taste, falls Sie es sich anders überlegen.',
          ],
        },
        {
          id: 'text-extraction-and-archives',
          heading: 'Textextraktion und Archive, in denen sich das Modell zurechtfindet',
          paragraphs: [
            'Der lesbare Text von PDF-, Office- und RTF-Dateien wird extrahiert und an das Modell übergeben, sodass es aus dem Dokument selbst antwortet statt aus einem Platzhalter. Ein Archiv wird in einen Dateibaum samt dem Text jeder enthaltenen Datei entpackt, sodass Sie ein gezipptes Projekt anhängen und nach einer bestimmten Datei darin fragen können.',
            'Archive werden vor dem Entpacken geprüft: Grenzen für die entpackte Gesamtgröße, die Anzahl der Einträge und die Verschachtelungstiefe verhindern, dass eine Dekompressionsbombe den Extraktor überhaupt erreicht.',
          ],
        },
        {
          id: 'scanning-and-retention',
          heading: 'Virenscan, der im Zweifel blockiert, und Aufbewahrung',
          paragraphs: [
            'Jeder Upload wird von ClamAV gescannt, bevor er gespeichert wird. Ist der Scanner nicht verfügbar, wird der Upload abgelehnt, statt ungeprüft durchgelassen zu werden. Uploads werden nach der vom Betreiber konfigurierten Aufbewahrungsfrist automatisch gelöscht, und Sie können eine Datei jederzeit selbst löschen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ich ein ganzes Projekt als ZIP-Datei hochladen?',
          answer:
            'Ja. ZIP-, 7z-, RAR-, TAR-, GZ-, BZ2- und XZ-Archive werden in einen Dateibaum mit dem Text jeder enthaltenen Datei entpackt, sodass das Modell eine bestimmte Datei im Archiv finden und zitieren kann.',
        },
        {
          question: 'Wie groß darf ein Anhang maximal sein?',
          answer:
            '50 MB pro Datei und bis zu zehn Anhänge pro Nachricht. Dateien über 4 MB werden in fortsetzbaren Teilen hochgeladen, sodass eine unterbrochene Verbindung fortgesetzt wird, statt von vorn zu beginnen.',
        },
        {
          question: 'Was passiert, wenn der Virenscanner ausgefallen ist?',
          answer:
            'Der Upload wird abgelehnt. ClawAI speichert nie ersatzweise eine ungescannte Datei — Sie sehen eine Fehlermeldung und können es erneut versuchen, sobald der Scan wieder läuft.',
        },
      ],
      productNote:
        'Die Anhangverarbeitung liegt im Dateidienst: Extraktion, Archiv-Manifeste, Uploads in Teilen und ClamAV-Scan sind standardmäßig aktiv, keine optionalen Zusätze.',
    },
    [FeatureCapability.NARRATED_RESEARCH]: {
      seo: {
        title: 'Kommentierte Recherche und Web-Crawling in ClawAI',
        description:
          'Wie ClawAI im Web recherchiert: ein Planer, der zwischen Suchen und Crawlen wählt, ein live kommentiertes Arbeitsprotokoll, gestuftes Abrufen unter Beachtung von robots.txt und belegte Quellen.',
        keywords: ['KI-Webrecherche', 'KI-Website-Crawler', 'KI-Recherche mit Quellen'],
      },
      eyebrow: 'Funktion',
      title: 'Kommentierte Recherche und Web-Crawling',
      summary:
        'Braucht eine Frage das aktuelle Web, rät ClawAI nicht. Ein Planer entscheidet, ob direkt geantwortet, gesucht, eine Website gecrawlt oder beides getan wird, kommentiert jeden Schritt während der Arbeit und liefert die Antwort mit den Quellen, die tatsächlich gelesen wurden.',
      sections: [
        {
          id: 'a-planner-not-a-keyword',
          heading: 'Ein Planer entscheidet, kein Schlüsselwort',
          paragraphs: [
            'Im Auto-Recherchemodus liest ein Planungsmodell die Nachricht und wählt einen von vier Wegen: aus vorhandenem Wissen antworten, im Web suchen, eine bestimmte Website crawlen oder erst crawlen und dann suchen. Ein eingefügter Link wird immer geöffnet. Liefert das Planungsmodell etwas Unbrauchbares, wird das nächste Modell versucht, statt die Recherche stillschweigend abzubrechen.',
            'Sie können den Modus auch selbst im Eingabefeld wählen: aus, Auto, nur Suche, Suche mit Seitenabruf oder Suche mit Extraktion strukturierter Inhalte.',
          ],
        },
        {
          id: 'a-narrated-work-log',
          heading: 'Ein Arbeitsprotokoll, dem Sie zusehen können',
          paragraphs: [
            'Jeder Schritt — der Plan, jede Suche, jede abgerufene oder übersprungene Seite — wird in Echtzeit in ein kommentiertes Protokoll über der Antwort gestreamt und mit der Antwort gespeichert, sodass es auch nach einem Neuladen noch da ist. Die Quellen, auf die sich die Antwort stützt, werden mit ihr aufgeführt, damit Sie sie selbst öffnen und prüfen können.',
          ],
        },
        {
          id: 'tiered-and-polite-fetching',
          heading: 'Gestuftes Abrufen, das sich an die Regeln hält',
          paragraphs: [
            'Seiten werden vom günstigsten Weg aufwärts abgerufen: zuerst über die offizielle API einer Website, sofern es eine gibt, dann über eine einfache HTTP-Anfrage und erst dann über einen Headless-Browser, wenn eine Seite einen braucht — mit einem Reader-Dienst und Archiv-Snapshots als spätere Fallbacks. Ein Crawl kann bis zu zweihundert Seiten einer Website umfassen.',
            'robots.txt wird bei jedem Abruf unter dem User-Agent ClawAI-ResearchBot beachtet, und eine gesperrte Seite wird nicht auf anderem Weg erneut versucht. Anmeldeschranken und rechtliche Sperren beenden den Abruf, Captchas werden nie gelöst, jede Weiterleitung wird gegen private Netzwerkadressen geprüft, und eine archivierte Kopie wird immer als solche gekennzeichnet.',
          ],
        },
      ],
      faq: [
        {
          question: 'Beachtet ClawAI robots.txt?',
          answer:
            'Ja, bei jedem Abruf, unter dem User-Agent ClawAI-ResearchBot. Eine Seite, die robots.txt sperrt, wird übersprungen und nicht über eine andere Abrufmethode erneut versucht.',
        },
        {
          question: 'Kann ich sehen, was die Recherche tatsächlich getan hat?',
          answer:
            'Ja. Ein kommentiertes Arbeitsprotokoll zeigt den Plan, jede Suche und jede abgerufene oder übersprungene Seite und wird zusammen mit der Liste der verwendeten Quellen mit der Antwort gespeichert.',
        },
        {
          question: 'Ist die Webrecherche in jedem Plan verfügbar?',
          answer:
            'Die Recherchemodi sind Planfunktionen (RESEARCH_MODE, WEB_SEARCH, WEB_FETCH und WEB_EXTRACT) mit eigenen Kontingenten, die der Betreiber pro Plan festlegt. Die Preisseite zeigt, was jeder Plan enthält.',
        },
      ],
      productNote:
        'Die Recherche-Schleife läuft in einem eigenen Recherchedienst mit vom Admin bearbeitbaren Abrufstufen und wird auf eigenen Flächen abgerechnet statt als normale Chat-Tokens.',
    },
    [FeatureCapability.ORCHESTRATION_LABS]: {
      seo: {
        title: 'Orchestrierungs-Labs: Vergleich, Richter, Konsens, Eskalation',
        description:
          'Die ClawAI-Labs, die mehrere Modelle auf einen Prompt ansetzen — Compare mit Judge und Critic, Consensus, Escalation, Best-of-N, Verify, Repair, Pipelines und mehr.',
        keywords: ['KI-Modelle direkt vergleichen', 'KI-Konsensantwort', 'LLM als Richter'],
      },
      eyebrow: 'Funktion',
      title: 'Orchestrierungs-Labs',
      summary:
        'Manche Fragen verdienen mehr als ein Modell. Die Labs sind eigene Arbeitsbereiche, jeder mit eigener Seite und Ergebnisansicht, um mehrere Modelle auf ein Problem anzusetzen und genau zu sehen, worin sie sich unterscheiden.',
      sections: [
        {
          id: 'compare-judge-and-critic',
          heading: 'Compare, mit Richter und Kritiker',
          paragraphs: [
            'Compare schickt einen Prompt an mehrere Modelle und zeigt ihre Antworten nebeneinander, mit Latenz und Token-Zahlen. Schalten Sie Judge ein, bewertet ein unabhängiges Modell jede Antwort anhand expliziter Kriterien; schalten Sie Critic ein, hält es fest, was an jeder Antwort schwach ist. Compare läuft auch in einem normalen Thread, sodass Sie eine einzelne Antwort prüfen können, ohne das Gespräch zu verlassen.',
          ],
        },
        {
          id: 'consensus-and-escalation',
          heading: 'Konsens und Eskalation',
          paragraphs: [
            'Consensus stellt zwei bis fünf Modellen dieselbe Frage, fasst aus ihren Übereinstimmungen eine Antwort zusammen und markiert, wo sie abweichen. Escalation beginnt mit einem günstigen Modell und steigt nur dann in der Kette auf, wenn die Antwort nicht ausreicht — so zahlen Sie für ein starkes Modell nur, wenn die Frage es wirklich braucht.',
          ],
        },
        {
          id: 'the-other-labs',
          heading: 'Verify, Repair und der Rest der Werkbank',
          paragraphs: [
            'Best-of-N erzeugt mehrere Kandidaten und behält den stärksten. Bei Verify prüft ein zweites Modell eine Antwort auf Korrektheit. Repair behebt einen bestimmten Fehler in einer bestehenden Antwort, statt sie neu zu erzeugen. Decompose zerlegt eine große Aufgabe in Schritte. Rollen-Pakete reichen ein Problem zwischen rollenspezialisierten Modellen weiter, Cost Ensemble wägt Qualität gegen Kosten ab, und Pipelines verketten mehrere Stufen zu einem benannten, wiederholbaren Ablauf.',
            'Jedes Lab wird vom Betreiber pro Plan freigeschaltet, und Lab-Läufe werden getrennt vom normalen Chat abgerechnet — Compare, Judge und Critic auf eigenen Flächen, die übrigen Labs auf der Orchestrierungsfläche.',
          ],
        },
      ],
      faq: [
        {
          question: 'Was ist der Unterschied zwischen Compare und Consensus?',
          answer:
            'Compare zeigt die Antwort jedes Modells nebeneinander und überlässt Ihnen das Urteil, optional mit einer Judge-Bewertung. Consensus führt die Antworten zu einer zusammen und markiert die Punkte, an denen die Modelle uneins sind.',
        },
        {
          question: 'Wie spart Eskalation Geld?',
          answer:
            'Sie beginnt mit einem günstigeren Modell und wechselt nur dann zu einem stärkeren, wenn die Antwort die Messlatte nicht erreicht — einfache Fragen zahlen so nie für das teuerste Modell.',
        },
        {
          question: 'Sind die Labs in jedem Plan enthalten?',
          answer:
            'Jedes Lab wird vom Betreiber pro Plan eingeschaltet, die Verfügbarkeit hängt also von Ihrem Plan ab. Die Preisseite listet auf, was jeder Plan enthält.',
        },
      ],
      productNote:
        'Compare, Consensus, Escalation, Repair, Decompose, Best-of-N, Verify, Pipeline, Cost Ensemble und Rollen-Pakete sind jeweils mit eigener Seite, eigenem Endpunkt und eigener Ergebniskarte ausgeliefert.',
    },
    [FeatureCapability.CONVERSATION_TOOLS]: {
      seo: {
        title: 'Profi-Werkzeuge für Gespräche: verzweigen, bearbeiten, suchen, exportieren',
        description:
          'Die ClawAI-Werkzeuge, um mit einem Gespräch zu arbeiten statt es nur zu lesen: Verzweigen, Bearbeiten und Wiederholen, Suche im Thread, threadübergreifende Suche, Export und geteilte Links.',
        keywords: [
          'KI-Gespräch verzweigen',
          'Prompt bearbeiten und neu ausführen',
          'KI-Chat exportieren',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Profi-Werkzeuge für Gespräche',
      summary:
        'Ein langes Gespräch ist ein Arbeitsdokument. ClawAI gibt Ihnen die Werkzeuge, es zu verzweigen, zu korrigieren, zu durchsuchen, in einem anderen Thread wiederzuverwenden und an jemand anderen weiterzugeben — ohne Kopieren und Einfügen.',
      sections: [
        {
          id: 'branch-edit-and-rerun',
          heading: 'Verzweigen, bearbeiten und erneut ausführen',
          paragraphs: [
            'Verzweigen Sie ein Gespräch an jeder beliebigen Nachricht, um eine andere Richtung auszuprobieren, während das Original unverändert bleibt. Bearbeiten Sie eine Ihrer früheren Nachrichten und führen Sie sie erneut aus, oder generieren Sie eine Antwort neu, mit der Sie nicht zufrieden sind — der Thread geht dann von der neuen Version aus weiter.',
          ],
        },
        {
          id: 'find-search-and-cross-thread-context',
          heading: 'Finden, suchen und Kontext aus anderen Threads',
          paragraphs: [
            'Suchen Sie im aktuellen Thread oder in all Ihren Threads nach Titel und Nachrichtentext. Threadübergreifender Kontext lässt ein Gespräch auf Ihre eigenen relevanten früheren Threads zurückgreifen — höchstens drei, und immer nur Ihre eigenen. Er ist standardmäßig aktiv, lässt sich pro Thread abschalten, und der Kontext-Inspektor zeigt, welche Threads verwendet wurden.',
          ],
        },
        {
          id: 'export-pin-and-share',
          heading: 'Exportieren, anheften und teilen',
          paragraphs: [
            'Exportieren Sie einen ganzen Thread als Markdown oder eine einzelne Antwort als Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX oder ZIP. Heften Sie die Threads an, zu denen Sie zurückkehren. Teilen Sie ein Gespräch über einen öffentlichen Link, den Sie jederzeit auf eine neue URL erneuern oder widerrufen können.',
          ],
        },
      ],
      faq: [
        {
          question: 'Verändert das Verzweigen das ursprüngliche Gespräch?',
          answer:
            'Nein. Ein Zweig ist ein neuer Thread, der bei der gewählten Nachricht beginnt; das ursprüngliche Gespräch bleibt genau so, wie es war.',
        },
        {
          question:
            'Kann das Gespräch einer anderen Person über threadübergreifenden Kontext in meines gelangen?',
          answer:
            'Nein. Threadübergreifender Kontext liest nur Ihre eigenen Threads, höchstens drei davon, und Sie können ihn für jeden Thread in dessen Einstellungen abschalten.',
        },
        {
          question:
            'Kann ich das Teilen eines Gesprächs beenden, nachdem ich den Link verschickt habe?',
          answer:
            'Ja. Sie können einen geteilten Link jederzeit widerrufen oder auf eine neue URL erneuern, sodass der alte nicht mehr funktioniert.',
        },
      ],
      productNote:
        'Verzweigen, Bearbeiten und erneutes Ausführen, Neugenerierung, Suche im Thread und threadübergreifend, Export, Anheften, Teilen und threadübergreifender Kontext sind alle im Chat-Arbeitsbereich ausgeliefert.',
    },
    [FeatureCapability.READ_ALOUD]: {
      seo: {
        title: 'Vorlesen: KI-Antworten in ClawAI anhören',
        description:
          'Wie ClawAI eine Antwort mit serverseitig erzeugter Sprache vorliest: früh startende Wiedergabe, Pause und Stopp, Umgang mit langen Antworten und keine Kosten für fehlgeschlagene Abschnitte.',
        keywords: ['KI vorlesen lassen', 'KI-Antworten als Sprachausgabe', 'KI-Chat anhören'],
      },
      eyebrow: 'Funktion',
      title: 'Vorlesen',
      summary:
        'Jede Antwort lässt sich anhören statt lesen. Die Sprache wird auf dem Server von einem Text-to-Speech-Modell erzeugt, nicht von der eingebauten Stimme des Browsers, und die Wiedergabe beginnt, bevor die gesamte Antwort umgewandelt ist.',
      sections: [
        {
          id: 'how-playback-works',
          heading: 'So funktioniert die Wiedergabe',
          paragraphs: [
            'Jede Antwort des Assistenten hat eine Vorlesen-Taste mit Wiedergabe, Pause und Stopp. Die Antwort wird in Abschnitten umgewandelt, und die Wiedergabe beginnt, sobald der erste kurze Abschnitt fertig ist — Sie müssen also nicht warten, bis eine lange Antwort vollständig verarbeitet ist, bevor Sie etwas hören.',
          ],
        },
        {
          id: 'long-answers-and-languages',
          heading: 'Lange Antworten und andere Sprachen',
          paragraphs: [
            'Bis zu 12.000 Zeichen einer Antwort werden vorgelesen, und Sie erfahren, wenn eine Antwort länger war und die Wiedergabe gekürzt wurde. Sätze werden für lateinische, arabische, Hindi- sowie chinesische, japanische und koreanische Texte korrekt getrennt, sodass eine mehrsprachige Antwort nicht an jedem Satzende stolpert.',
          ],
        },
        {
          id: 'voices-and-billing',
          heading: 'Stimmen, Verfügbarkeit und Abrechnung',
          paragraphs: [
            'Die Stimmen stammen von Text-to-Speech-Modellen von Gemini oder OpenAI, ausgewählt vom Betreiber. Vorlesen ist eine Planfunktion; ist keine Stimme zugewiesen, sagt Ihnen die Taste das, statt stillschweigend zu scheitern. Abschnitte, deren Erzeugung fehlschlägt, werden nicht berechnet.',
          ],
        },
      ],
      faq: [
        {
          question: 'Nutzt das Vorlesen die Stimme meines Browsers?',
          answer:
            'Nein. Die Sprache wird auf dem Server von einem Text-to-Speech-Modell von Gemini oder OpenAI erzeugt und klingt daher auf jedem Gerät und in jedem Browser gleich.',
        },
        {
          question: 'Kann es eine sehr lange Antwort vorlesen?',
          answer:
            'Es liest bis zu 12.000 Zeichen einer Antwort vor und sagt Ihnen, wenn die Antwort länger war, damit Sie wissen, dass die Wiedergabe vorzeitig endete.',
        },
        {
          question: 'Wird mir etwas berechnet, wenn das Vorlesen fehlschlägt?',
          answer:
            'Nur die Abschnitte, die tatsächlich erzeugt wurden. Ein fehlgeschlagener Abschnitt wird nicht berechnet, und Sie können die Antwort erneut abspielen.',
        },
      ],
      productNote:
        'Vorlesen ist eine Planfunktion, die ein vom Betreiber zugewiesenes serverseitiges Text-to-Speech-Modell nutzt; es ist nicht die Sprachausgabe des Browsers.',
    },
    [FeatureCapability.IMAGE_GENERATION]: {
      seo: {
        title: 'KI-Bildgenerierung direkt in ClawAI-Gesprächen',
        description:
          'Erzeugen und bearbeiten Sie Bilder aus einem ClawAI-Gespräch mit Gemini, OpenAI, xAI oder lokalen Stable-Diffusion-Modellen — mit Anbieter-Fallback, Fortschrittsanzeige und Wiederholung.',
        keywords: ['KI-Bildgenerator', 'Bild mit KI bearbeiten', 'Bildgenerierung mit Gemini'],
      },
      eyebrow: 'Funktion',
      title: 'Bildgenerierung',
      summary:
        'Beschreiben Sie im Gespräch ein Bild, und ClawAI erzeugt es genau dort, neben der übrigen Arbeit. Hinter einer Anfrage stehen mehrere Bildanbieter, und fällt einer aus, wird automatisch der nächste versucht.',
      sections: [
        {
          id: 'providers-and-fallback',
          heading: 'Mehrere Anbieter hinter einer Anfrage',
          paragraphs: [
            'Bildanfragen können von Gemini-Bildmodellen, gpt-image-1 von OpenAI, Grok Imagine von xAI oder lokalen Stable-Diffusion-Modellen (SDXL-Turbo und ein ComfyUI-Workflow) auf Ihrer eigenen Hardware bedient werden. Fällt der gewählte Anbieter aus, geht die Anfrage an den nächsten — erst Cloud, dann lokal —, statt einen Fehler zurückzugeben.',
            'Wählen Sie selbst ein bestimmtes Bildmodell, wird dieses Modell verwendet, auch wenn der Prompt kein offensichtliches Bild-Schlüsselwort enthält.',
          ],
        },
        {
          id: 'in-the-conversation',
          heading: 'Im Gespräch erzeugt, mit Fortschrittsanzeige',
          paragraphs: [
            'Bilder erscheinen direkt im Chat, mit einem Fortschrittsbereich, während sie erzeugt werden. Sie können eine Generierung abbrechen oder es mit einem anderen Anbieter erneut versuchen, wenn Ihnen das Ergebnis nicht gefällt. Es gibt keine separate Bild-App, zu der Sie wechseln müssten.',
          ],
        },
        {
          id: 'prompts-sizes-and-edits',
          heading: 'Prompts, Größen und Bearbeitungen',
          paragraphs: [
            'Prompts dürfen bis zu 4.000 Zeichen lang sein, und Bilder lassen sich in Größen von 256 bis 4.096 Pixeln anfordern. Hängen Sie ein Referenzbild mit bis zu 25 MB an, um ein vorhandenes Bild zu bearbeiten, statt bei null anzufangen. Die Bildgenerierung ist eine Funktion der kostenpflichtigen Pläne und wird auf einer eigenen Fläche abgerechnet, getrennt von Chat-Tokens.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welche Modelle erzeugen die Bilder?',
          answer:
            'Gemini-Bildmodelle, gpt-image-1 von OpenAI, Grok Imagine von xAI und lokale Stable-Diffusion-Modelle. Welche davon verfügbar sind, hängt davon ab, was der Betreiber konfiguriert hat.',
        },
        {
          question: 'Kann ich ein vorhandenes Bild bearbeiten?',
          answer:
            'Ja. Hängen Sie ein Referenzbild mit bis zu 25 MB an und beschreiben Sie die gewünschte Änderung, dann bearbeitet das Modell es, statt ein neues Bild von Grund auf zu erzeugen.',
        },
        {
          question: 'Ist die Bildgenerierung im kostenlosen Plan verfügbar?',
          answer:
            'Die Bildgenerierung ist eine Funktion der kostenpflichtigen Pläne und wird getrennt vom Chat abgerechnet. Die Preisseite zeigt, welche Pläne sie enthalten.',
        },
      ],
      productNote:
        'Die Bildgenerierung läuft in einem eigenen Bilddienst mit Anbieter-Fallback von Cloud- zu lokalen Modellen und wird auf der Fläche IMAGE abgerechnet.',
    },
    [FeatureCapability.RELIABILITY]: {
      seo: {
        title: 'Zuverlässigkeit in ClawAI: Fallback, Schutzschalter und fortsetzbare Streams',
        description:
          'Was ClawAI tut, wenn ein Anbieter ausfällt: automatischer Fallback auf ein anderes Modell, ein gemeinsamer Schutzschalter für erschöpfte Anbieterkonten und Streams, die nach einer Neuverbindung weiterlaufen.',
        keywords: ['KI-Modell-Fallback', 'LLM-Anbieter-Failover', 'fortsetzbares KI-Streaming'],
      },
      eyebrow: 'Funktion',
      title: 'Zuverlässigkeit',
      summary:
        'Anbieter fallen aus, haben kein Guthaben mehr oder laufen in Zeitüberschreitungen. ClawAI ist so gebaut, dass Ihr Gespräch in diesem Fall mit einem anderen Modell weitergeht und ein unterbrochener Stream dort fortsetzt, wo er aufgehört hat.',
      sections: [
        {
          id: 'automatic-fallback',
          heading: 'Automatischer Fallback auf ein anderes Modell',
          paragraphs: [
            'Jede geroutete Anfrage trägt eine Liste von Kandidatenmodellen. Fällt das gewählte Modell mitten in der Anfrage aus, wechselt ClawAI automatisch zum nächsten Kandidaten, und die Antwort verzeichnet, welches Modell tatsächlich geantwortet hat, nicht nur das zuerst gewählte.',
          ],
        },
        {
          id: 'a-shared-provider-breaker',
          heading: 'Ein gemeinsamer Schutzschalter für erschöpfte Anbieter',
          paragraphs: [
            'Hat ein Anbieterkonto kein Guthaben mehr, nimmt ein Schutzschalter diesen Anbieter für zehn Minuten aus der Rotation und lässt dann einen einzelnen Testaufruf durch, um zu prüfen, ob er sich erholt hat. Der Zustand des Schutzschalters wird über Redis zwischen allen Chat-Servern geteilt, sodass ein Ausfall einmal gelernt wird, statt von jedem Server neu entdeckt zu werden — und jeder Server greift auf seine eigene Kopie zurück, wenn Redis nicht verfügbar ist.',
          ],
        },
        {
          id: 'stop-and-resume',
          heading: 'Stopp, der immer stoppt, und Streams, die weiterlaufen',
          paragraphs: [
            'Ein Druck auf Stopp wird an alle Chat-Server übertragen, sodass derjenige, auf dem das Modell gerade läuft, es abbricht. Bricht Ihre Verbindung ab, während eine Antwort gestreamt wird, spielt die Neuverbindung die verpassten Ereignisse aus einem Puffer nach, statt den Rest der Antwort zu verlieren.',
          ],
        },
      ],
      faq: [
        {
          question: 'Was passiert, wenn ein Modell mitten in einer Antwort ausfällt?',
          answer:
            'ClawAI wechselt automatisch zum nächsten Kandidatenmodell, und die Antwort zeigt, welches Modell sie tatsächlich erzeugt hat.',
        },
        {
          question: 'Wovor schützt der Anbieter-Schutzschalter?',
          answer:
            'Vor einem Anbieterkonto, dessen Guthaben aufgebraucht ist. Es wird zehn Minuten lang übersprungen und dann mit einem Aufruf getestet, statt dass in der Zwischenzeit jede Anfrage daran scheitert.',
        },
        {
          question: 'Verliere ich eine Antwort, wenn meine Verbindung abbricht?',
          answer:
            'Nein. Sobald sich der Stream neu verbindet, werden die verpassten Ereignisse aus einem serverseitigen Puffer nachgespielt, und die Antwort geht weiter.',
        },
      ],
      productNote:
        'Fallback, der über Redis geteilte Anbieter-Schutzschalter, serverübergreifender Stopp und fortsetzbare Streams sind heute alle im Chat-Dienst; Betreiber sehen den Zustand des Schutzschalters auf der Admin-Seite für Connectoren.',
    },
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: {
      seo: {
        title: 'KI-Guthaben nach Verbrauch und Preise in Landeswährung',
        description:
          'So funktioniert das nutzungsbasierte Guthaben von ClawAI: ein monatliches Guthaben aus Ihrem Plan, Aufladungen ohne Verfall, vor jedem Aufruf reservierte Kosten und Preise in Ihrer Währung.',
        keywords: [
          'KI nach Verbrauch bezahlen',
          'KI-Guthaben aufladen',
          'KI-Preise in Landeswährung',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Guthaben nach Verbrauch und Landeswährung',
      summary:
        'Cloud-Modelle kosten pro Token echtes Geld, deshalb rechnet ClawAI sie gegen eine Guthaben-Wallet ab, statt die Kosten in einer Pauschale zu verstecken. Sie sehen, was jede Funktion verbraucht hat, laden nur auf, wenn Sie es brauchen, und lesen die Preise in Ihrer eigenen Währung.',
      sections: [
        {
          id: 'two-kinds-of-credit',
          heading: 'Zwei Arten von Guthaben, in fester Reihenfolge verbraucht',
          paragraphs: [
            'Die Wallet enthält zwei Arten von Guthaben. Das monatliche Guthaben ist ein Anteil am Preis Ihres kostenpflichtigen Plans, wird in jedem Abrechnungszeitraum zurückgesetzt und nicht übertragen; ein kostenloser Plan gewährt keines. Gekauftes Guthaben stammt aus Aufladungen, verfällt nie und bleibt Ihnen auch bei einem Downgrade oder einer Kündigung erhalten.',
            'Verbraucht wird immer zuerst das monatliche Guthaben und dann das gekaufte, sodass eine Aufladung erst angetastet wird, wenn das Guthaben des Zeitraums aufgebraucht ist. Jeder kann Guthaben aufladen, auch im kostenlosen Plan, und Aufladepakete sowie Planpreise stammen aus versionierten Preisdatensätzen, nicht von dieser Seite.',
          ],
        },
        {
          id: 'no-surprise-spend',
          heading: 'Kosten werden vor einem Aufruf reserviert, nie danach',
          paragraphs: [
            'Bevor ein Cloud-Modell läuft, werden die Kosten der Anfrage auf Ihrem Guthaben reserviert; danach wird die Reservierung zum tatsächlichen Betrag abgerechnet oder freigegeben. Sie können nicht über Ihr Guthaben hinaus ausgeben, und reicht der Rest nicht für eine brauchbare Antwort, wird die Anfrage abgelehnt, statt mittendrin abgebrochen zu werden. Ein Modell ohne veröffentlichten Preis wird gesperrt, statt als kostenlos behandelt zu werden.',
            'Das Guthaben deckt Chat, Compare, Judge, die Orchestrierungs-Labs, Bild- und Dateigenerierung, den Coding-Agenten, Workspace-Aktionen, Transkription, den Bild-Helfer und das Vorlesen ab. Lokale Modelle, die über Ollama oder llama.cpp bereitgestellt werden, werden nicht abgerechnet, und die Webrecherche nutzt eigene, separate Kontingente.',
          ],
        },
        {
          id: 'ledger-and-local-currency',
          heading: 'Ein Kontobuch nach Funktion und Preise in Ihrer Währung',
          paragraphs: [
            'Jede Bewegung wird in ganzen Mikro-Dollar in ein nur erweiterbares Kontobuch geschrieben — ohne Rundungsdrift —, und die Abrechnungsseite zeigt, welche Funktion welchen Betrag verbraucht hat. Eine intensive Woche mit Bildgenerierung ist so genau als solche erkennbar.',
            'Preise werden in mehr als sechzig Anzeigewährungen dargestellt, anhand Ihres Standorts erkannt oder von Hand gewählt, mit dem ursprünglichen US-Dollar-Betrag daneben. Der angezeigte Betrag ist eine Schätzung; berechnet wird in der beim Checkout angezeigten Währung, zu einem beim Bezahlen festgelegten Kurs, über die vom Betreiber aktivierten Zahlungsanbieter — derzeit PayPal und Paymob.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wird ungenutztes Guthaben übertragen?',
          answer:
            'Das monatliche Guthaben nicht — es wird in jedem Abrechnungszeitraum zurückgesetzt. Guthaben, das Sie per Aufladung gekauft haben, verfällt nie und bleibt auch bei einem Downgrade oder einer Kündigung erhalten.',
        },
        {
          question: 'Kann ein langes Gespräch mein Guthaben überziehen?',
          answer:
            'Nein. Die Kosten werden reserviert, bevor das Modell läuft, und eine Anfrage, die Ihr Restguthaben nicht decken kann, wird vorab abgelehnt, statt nachträglich berechnet zu werden.',
        },
        {
          question: 'Warum weicht der Preis beim Checkout leicht von dem ab, den ich gesehen habe?',
          answer:
            'Der Preis in Landeswährung auf der Website ist eine aus US-Dollar umgerechnete Schätzung. Berechnet wird in der beim Checkout angezeigten Währung zu einem Wechselkurs, der im Moment der Zahlung festgelegt wird.',
        },
      ],
      productNote:
        'Das nutzungsbasierte Guthaben ist eine Wallet mit einem nur erweiterbaren Mikro-Dollar-Kontobuch, die der Betreiber pro Bereitstellung einschaltet; Planpreise und Aufladepakete stammen immer aus versionierten Preisdatensätzen.',
    },
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]: {
      seo: {
        title: 'Verwaltung und Zugriffskontrolle in ClawAI',
        description:
          'Was ein Betreiber erhält, der ClawAI für eine Organisation betreibt: rollenbasierte Berechtigungen, eigene Rollen, Benutzerverwaltung, Plan- und Zahlungseinstellungen sowie ein filterbares Audit-Protokoll.',
        keywords: [
          'KI-Admin-Konsole',
          'rollenbasierte Zugriffskontrolle für KI',
          'KI-Audit-Protokoll',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Verwaltung und Zugriffskontrolle',
      summary:
        'ClawAI für eine Gruppe von Menschen zu betreiben — ein Unternehmen, eine Abteilung, ein Labor — heißt, festzulegen, wer was darf, und nachvollziehen zu können, was passiert ist. Die Admin-Konsole umfasst Benutzer, Rollen, Pläne, Zahlungen und einen Prüfpfad, und es ist dieselbe Konsole, ob ClawAI für Sie gehostet wird oder auf Ihren eigenen Servern läuft.',
      sections: [
        {
          id: 'roles-and-permissions',
          heading: 'Rollen und Berechtigungen, die Sie anpassen können',
          paragraphs: [
            'Jedes Konto hat eine Rolle, und jeder Bildschirm und jede API-Aktion prüft eine benannte Berechtigung statt einer fest einprogrammierten Rolle. Administratoren können ändern, welche Berechtigungen eine Rolle umfasst, und eigene neue Rollen anlegen — ein reiner Lese-Prüfer oder ein Betreiber nur für die Abrechnung ist so eine Konfigurationsänderung, keine Codeänderung.',
          ],
        },
        {
          id: 'users-plans-and-payments',
          heading: 'Benutzer, Pläne und Zahlungen',
          paragraphs: [
            'Administratoren können Konten aktivieren oder deaktivieren, die Rolle eines Benutzers ändern, ein temporäres Passwort setzen, das bei der nächsten Anmeldung geändert werden muss, und die Nutzung und den Plan einzelner Benutzer einsehen. Pläne, Erstattungen, Zahlungsanbieter, die Einstellungen des Smart Routers, Webhook-Zustellungen und Bereitstellungsdetails haben jeweils einen eigenen Admin-Bildschirm.',
          ],
        },
        {
          id: 'audit-and-self-hosting',
          heading: 'Ein Audit-Protokoll und bei Bedarf Ihre eigene Infrastruktur',
          paragraphs: [
            'Sicherheitsrelevante Aktionen werden in ein Audit-Protokoll geschrieben, das Administratoren filtern und prüfen können, und Audit-Einträge werden aufbewahrt, statt nach dem üblichen Log-Zeitplan zu verfallen. Organisationen, die keine Daten an einen Drittanbieter senden dürfen, können die gesamte Plattform auf ihren eigenen Servern ausschließlich mit lokalen Modellen betreiben; das ist eine individuell abgestimmte Bereitstellung, kein Self-Service-Plan.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ich eigene Rollen anlegen?',
          answer:
            'Ja. Administratoren können Rollen anlegen und festlegen, welche Berechtigungen jede Rolle umfasst; jeder Bildschirm und jede API-Aktion prüft eine benannte Berechtigung, keine feste Rolle.',
        },
        {
          question: 'Hat ClawAI Team-Arbeitsbereiche, Lizenzplätze oder Single Sign-on?',
          answer:
            'Noch nicht. Gemeinsame Team-Arbeitsbereiche, Abrechnung pro Lizenzplatz, E-Mail-Einladungen oder Single Sign-on gibt es heute nicht. Die Verwaltung erfolgt pro Bereitstellung: Ein Betreiber verwaltet Benutzer, Rollen und Pläne über die Admin-Konsole.',
        },
        {
          question: 'Können wir ClawAI in unserem eigenen Netzwerk betreiben?',
          answer:
            'Ja, als individuell abgestimmte Bereitstellung auf Ihren eigenen Servern ausschließlich mit lokalen Modellen, sodass kein Prompt und kein Dokument Ihre Infrastruktur verlässt. Die Seite zu privaten Bereitstellungen beschreibt, was dazugehört.',
        },
      ],
      productNote:
        'Rollenbasierte Berechtigungen, eigene Rollen, Benutzerverwaltung und das Audit-Protokoll sind in der Admin-Konsole ausgeliefert; Team-Arbeitsbereiche, Abrechnung pro Lizenzplatz, Einladungen und Single Sign-on sind es nicht.',
    },
  },
};
