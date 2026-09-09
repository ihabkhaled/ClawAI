import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesClusterDictionary } from '@/types/features-cluster.types';

export const DE_FEATURES_CLUSTER_CONTENT: FeaturesClusterDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufig gestellte Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt geprüft',
    backToHub: 'Alle Funktionen',
    ctaTitle: 'Probieren Sie es selbst aus, statt uns zu glauben',
    ctaBody:
      'ClawAI leitet ein Gespräch an das Modell und die Werkzeuge weiter, die zur Aufgabe passen, über jeden angebundenen Anbieter hinweg, aus einem einzigen Arbeitsbereich.',
    startFree: 'Kostenlos starten',
    seeUseCases: 'An einer echten Aufgabe ansehen',
  },
  hub: {
    capabilitiesHeading: 'Mehr zu einer bestimmten Funktion',
    capabilitiesIntro:
      'Die neun Abschnitte oben sind die Kurzfassung. Jede der sechs Funktionen unten ist eine eigene Seite: was das zugrunde liegende Feature tatsächlich tut, welcher Plan es freischaltet, und wo Sie den Mechanismus selbst nachprüfen können.',
    cardSummaries: {
      [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]:
        'Sieben Routing-Modi entscheiden, welches Modell antwortet, und neun Orchestrierungs-Bausteine setzen mehrere Modelle auf ein Problem an.',
      [FeatureCapability.MEMORY_AND_CONTEXT]:
        'Gedächtnis, das über Gespräche hinweg bestehen bleibt, und Context Packs mit Referenzmaterial für eine Aufgabe.',
      [FeatureCapability.WORKSPACE_CONNECTORS]:
        'Vierzehn Workspace-Connectoren lassen eine Anfrage die Werkzeuge lesen oder darin handeln, die Ihr Team bereits nutzt.',
      [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]:
        'Upload, Chunking und OCR beim Eingang; Bild-, Dokument- und Recherche-Generierung beim Ausgang.',
      [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]:
        'Jede Antwort verzeichnet, welches Modell sie bearbeitet hat, warum, und was es Ihr Kontingent gekostet hat.',
      [FeatureCapability.SECURITY_AND_DATA_HANDLING]:
        'Die konkreten Mechanismen — Authentifizierung, RBAC, Anmeldedaten-Verschlüsselung, Transportverschlüsselung — schlicht beschrieben.',
    },
  },
  capabilities: {
    [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: {
      seo: {
        title: 'Modell-Routing und Orchestrierung in ClawAI',
        description:
          'Die sieben Routing-Modi, die entscheiden, welches Modell eine Nachricht beantwortet, und die neun Orchestrierungs-Bausteine, die mehrere Modelle auf ein Problem ansetzen — beides wie in ClawAI ausgeliefert.',
        keywords: [
          'KI-Modell-Routing-Modi',
          'Multi-Modell-Orchestrierung',
          'KI-Routing-Transparenz',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Modell-Routing und Orchestrierung',
      summary:
        'Routing entscheidet, welches einzelne Modell eine Nachricht beantwortet; Orchestrierung entscheidet, was zu tun ist, wenn ein Modell nicht ausreicht. ClawAI liefert beides als eigenständige, planabhängige Mechanismen statt eines einzigen verborgenen Standards — sieben Routing-Modi und neun Orchestrierungs-Bausteine, alle sichtbar in der Antwort, die Sie erhalten.',
      sections: [
        {
          id: 'seven-routing-modes',
          heading: 'Sieben Routing-Modi statt eines verborgenen Standards',
          paragraphs: [
            'ClawAI klassifiziert jede Nachricht und kann sie automatisch an ein passendes Modell senden, oder Sie legen die Regel selbst fest. Die Modi: Auto (klassifiziert nach Aufgabe und wählt ein starkes Modell für diese Klasse), Manual Model (fixiert ein Modell für das Gespräch), Local-Only (jede Anfrage bleibt auf Hardware, die Sie kontrollieren, über Ollama oder llama.cpp), Privacy-First (ein eigener Modus mit eigenen Prioritäten, um eine Anfrage aus dem allgemeinen Cloud-Pfad herauszuhalten), Low Latency (bevorzugt das Modell mit der schnellsten Antwortzeit), High Reasoning (bevorzugt das stärkste Denkmodell, unabhängig von Geschwindigkeit oder Kosten) und Cost Saver (bevorzugt das günstigste Modell, das die Anfrage noch bewältigt). Siehe „Was ist KI-Modell-Routing“, unten verlinkt, für die allgemeine Funktionsweise eines Routers.',
          ],
        },
        {
          id: 'nine-orchestration-primitives',
          heading: 'Neun Wege, mehr als ein Modell auf ein Problem anzusetzen',
          paragraphs: [
            'Reicht ein Modell nicht, greifen ClawAIs Orchestrierungs-Bausteine — auf dem Ledger unter der Fläche ORCHESTRATION erfasst, getrennt vom normalen Chat: Compare (bis zu fünf Modelle auf eine Eingabe, nebeneinander), Consensus (eine Antwort aus der Übereinstimmung mehrerer Modelle synthetisieren und Abweichungen markieren), Escalation (günstig starten, automatisch aufsteigen, nur wenn die Qualität nicht reicht), Best-of-N (mehrere Kandidaten erzeugen, den stärksten behalten), Repair (einen bestimmten Fehler in einer bestehenden Antwort beheben statt neu zu erzeugen), Verify (ein zweites Modell prüft die Korrektheit mit begrenzter Revisionsrunde), Rollen-Pakete (ein kleines Team rollenspezialisierter Modelle übergibt sich gegenseitig) Pipelines (mehrere dieser Stufen zu einem benannten, wiederholbaren Ablauf verketten) und Judge und Critic (ein unabhängiges Modell bewertet eine Antwort anhand expliziter Kriterien, mit schriftlichem Critic-Feedback zu Schwachstellen). Compare und Judge sind je einzeln planabhängig (COMPARE_MODE, JUDGE_MODE, CRITIC_REVIEW); siehe „Was ist KI-Konsens“ und „Was ist ein KI-Richter“, beide unten verlinkt, für die Bewertung selbst.',
          ],
        },
        {
          id: 'automatic-fallback-on-provider-failure',
          heading: 'Was passiert, wenn ein Anbieter während der Anfrage ausfällt',
          paragraphs: [
            'Eine Routing-Entscheidung ist keine einmalige Wette: Fällt der Anbieter oder das Modell, an das eine Anfrage ging, mitten in der Bearbeitung aus, kann ClawAI automatisch auf ein anderes Modell ausweichen, und die Antwort verzeichnet, welches Modell tatsächlich eingesprungen ist — nicht nur das ursprünglich gewählte. Siehe „Was ist Modell-Fallback“, unten verlinkt, für die Entscheidung dahinter.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wie viele Routing-Modi hat ClawAI?',
          answer:
            'Sieben: Auto, Manual Model, Local-Only, Privacy-First, Low Latency, High Reasoning und Cost Saver. Auto ist der Standard; die anderen sechs sind für den Fall gedacht, dass Sie die Routing-Entscheidung selbst treffen oder in eine bestimmte Richtung lenken wollen.',
        },
        {
          question: 'Was unterscheidet Compare von Consensus?',
          answer:
            'Compare zeigt die Antworten aller Modelle auf dieselbe Eingabe nebeneinander, mit Latenz und Token-Zahl pro Modell, und überlässt das Lesen Ihnen. Consensus fasst aus der Übereinstimmung der Modelle eine Antwort zusammen und markiert Abweichungen.',
        },
        {
          question: 'Sehe ich, welches Modell tatsächlich geantwortet hat und warum?',
          answer:
            'Ja — jede Antwort trägt den Anbieter und das Modell, das sie erzeugt hat, die Begründung der Routing-Entscheidung und die Kosten gegen Ihr Kontingent. Ist ein Anbieter ausgefallen und ein anderes Modell eingesprungen, wird das ebenfalls verzeichnet.',
        },
      ],
      productNote:
        'Sieben Routing-Modi und neun Orchestrierungs-Bausteine sind reale, ausgelieferte Mechanismen in ClawAI, kein einzelner verborgener Standard — Compare, Judge und Critic sind je einzeln planabhängig und auf einer eigenen Ledger-Fläche gemessen.',
    },
    [FeatureCapability.MEMORY_AND_CONTEXT]: {
      seo: {
        title: 'Gedächtnis und Kontext in ClawAI',
        description:
          'Wie ClawAIs Gedächtnis und Context Packs funktionieren — genehmigte Gedächtniseinträge mit Konfidenzwert, bereichsbezogene Speicherung und versionierte Referenzmaterial-Bündel, als ausgelieferte, planabhängige Funktionen.',
        keywords: [
          'KI-Gedächtnisfunktion',
          'KI-Context-Packs',
          'dauerhaftes KI-Gesprächsgedächtnis',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Gedächtnis und Kontext',
      summary:
        'Gedächtnis und Context Packs sind zwei eigenständige, planabhängige Funktionen (MEMORY und CONTEXT_PACKS), die unterschiedliche Probleme lösen: Gedächtnis bewahrt, was ClawAI über Sie sitzungsübergreifend gelernt hat, während ein Context Pack Referenzmaterial für eine bestimmte Aufgabe bündelt. Beide sind Schalter pro Gespräch, nicht etwas, das global verwaltet werden muss.',
      sections: [
        {
          id: 'memory-records-and-approval',
          heading: 'Gedächtniseinträge und die vorgeschaltete Genehmigungsliste',
          paragraphs: [
            'Ein Gedächtniseintrag ist eine Tatsache, Präferenz, Anweisung oder Zusammenfassung, gespeichert mit Kategorie, Konfidenzwert und Herkunftsnachweis. Nichts wird stillschweigend gemerkt: Kandidaten landen in einer Liste, die Sie genehmigen oder ablehnen, und nur hochsichere, unsensible Einträge werden automatisch genehmigt, ab einer Schwelle, die Sie selbst festlegen. Siehe „Was ist KI-Gedächtnis“, unten verlinkt, für die allgemeine Funktionsweise.',
          ],
        },
        {
          id: 'context-packs-for-reference-material',
          heading: 'Context Packs für Material, das eine Aufgabe im Blick behalten muss',
          paragraphs: [
            'Ein Context Pack bündelt wiederverwendbaren Text, Dateien, Links und Gedächtnisverweise zu einer benannten, versionierten Einheit, die Sie an jedes Gespräch anhängen — so muss ein Style-Brief, ein Satz Quelldokumente oder eine Standardanweisung nicht jede Sitzung neu eingefügt werden. Packs sind versioniert, sodass Sie Änderungen sehen und zurückrollen können. Siehe „Was sind Context Packs“, unten verlinkt, für die allgemeine Funktionsweise.',
          ],
        },
        {
          id: 'scopes-receipts-and-controls',
          heading: 'Geltungsbereiche, Kontext-Belege und Kontrollen',
          paragraphs: [
            'Ein Gedächtniseintrag kann auf Sie selbst, ein einzelnes Gespräch, ein Projekt oder einen Arbeitsbereich begrenzt werden, sodass Arbeitskontext nicht in private Chats sickert. Jede Antwort, die auf Gedächtnis oder ein Pack zugreift, erzeugt einen Kontext-Beleg — welche Einträge in welcher Reihenfolge in die Eingabe flossen und wie viel Token-Budget jeder verbrauchte — und Kontrollen erlauben es, das gesamte Gedächtnis oder einen einzelnen Eintrag zu pausieren, ein Ablaufdatum zu setzen, etwas als sensibel zur Schwärzung zu markieren oder ganz zu löschen, jede Änderung im Audit-Log vermerkt. Siehe „Was ist ein Kontextfenster“, unten verlinkt, für die Bedeutung dieser Token-Budget-Abrechnung.',
          ],
        },
      ],
      faq: [
        {
          question: 'Merkt sich ClawAI Dinge über mich, ohne zu fragen?',
          answer:
            'Nein — Kandidaten landen in einer Genehmigungsliste, die Sie selbst prüfen. Nur hochsichere, unsensible Einträge werden automatisch genehmigt, ab einer von Ihnen gesetzten Schwelle, und jede Änderung an einem Gedächtniseintrag wird im Audit-Log vermerkt.',
        },
        {
          question: 'Was unterscheidet Gedächtnis von einem Context Pack?',
          answer:
            'Gedächtnis bewahrt sitzungsübergreifend, was ClawAI über Ihre Präferenzen gelernt hat. Ein Context Pack ist ein versioniertes Bündel aus Referenzmaterial — Text, Dateien, Links —, das Sie einer bestimmten Aufgabe anhängen statt einer langfristigen Präferenz. Beides sind getrennte, planabhängige Funktionen.',
        },
        {
          question: 'Kann ich Gedächtnis für eine einzelne Frage abschalten?',
          answer:
            'Ja — Gedächtnis und Context Packs sind Schalter pro Gespräch. Schalten Sie sie für eine einmalige Frage aus, enthält die Eingabe nichts außer dem, was Sie eingegeben haben.',
        },
      ],
      productNote:
        'Gedächtnis und Context Packs sind zwei getrennte, planabhängige ClawAI-Funktionen (MEMORY, CONTEXT_PACKS) — genehmigte Einträge mit Konfidenzwert und versionierte Referenzbündel, beide bereichsbezogen und prüfbar, kein einzelner vermischter Gedächtnisblock.',
    },
    [FeatureCapability.WORKSPACE_CONNECTORS]: {
      seo: {
        title: 'Workspace-Connectoren in ClawAI',
        description:
          'Die 14 Workspace-Connectoren, die ClawAI ausliefert — GitHub, Slack, Jira, Google Drive und mehr — und wie eine planabhängige Workspace-Aktion darin liest oder handelt.',
        keywords: [
          'KI-Workspace-Connectoren',
          'KI mit GitHub und Slack verbinden',
          'KI-Werkzeugintegrationen',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Workspace-Connectoren',
      summary:
        'Ein Workspace-Connector lässt eine ClawAI-Anfrage in einem Werkzeug lesen oder handeln, das Ihr Team bereits nutzt, statt Informationen manuell hin- und herzukopieren. ClawAI hat heute 14 Workspace-Connectoren, und Workspace-Zugriff ist eine eigene planabhängige Funktion (WORKSPACES) mit eigener gemessener Nutzungsfläche (WORKSPACE_ACTION).',
      sections: [
        {
          id: 'the-fourteen-connectors',
          heading: 'Die vierzehn Connectoren, nach Kategorie',
          paragraphs: [
            'Code-Hosting: GitHub, GitLab, Bitbucket. Messaging und Tracking: Slack, Jira, Confluence, ClickUp. Design: Figma. Dokumente und Speicher: Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive. Kalender: Google Calendar, Outlook Calendar. Jeder verbindet sich einmal über OAuth, und Anmeldedaten sind im Ruhezustand verschlüsselt, an Ihr Konto gebunden und mit einem Klick widerrufbar.',
          ],
        },
        {
          id: 'what-a-connected-workspace-can-do',
          heading: 'Was ein verbundener Arbeitsbereich eine Anfrage tatsächlich tun lässt',
          paragraphs: [
            'Einmal verbunden, kann ClawAI ein Werkzeug durchsuchen, Kontext daraus in ein Gespräch holen und nach Ihrer Zustimmung darin handeln — ein Jira-Ticket, ein Slack-Thread, eine Datei in Google Drive, direkt referenziert oder verändert statt manuell eingefügt. Verbindungen synchronisieren nach Zeitplan und über Webhooks, sodass Suchergebnisse aktuell bleiben, und wie viele Verbindungen Sie halten können, hängt von Ihrem Plan ab.',
          ],
        },
        {
          id: 'multi-model-review-inside-a-workspace-action',
          heading: 'Multi-Modell-Prüfung als Teil derselben gemessenen Fläche',
          paragraphs: [
            'Eine Workspace-Aktion ist nicht auf einen einzelnen Modellaufruf beschränkt — ein Ketten-Entwurfs- oder Übergabeschritt, oder eine Multi-Modell-Prüfung des Ergebnisses vor der Ausführung, nutzt dieselbe Routing- und Orchestrierungs-Infrastruktur, beschrieben auf der Seite Modell-Routing und Orchestrierung, unten verlinkt, angewandt auf eine Aktion, die ein verbundenes Werkzeug betrifft statt eine gewöhnliche Chat-Nachricht.',
          ],
        },
      ],
      faq: [
        {
          question: 'Mit wie vielen Werkzeugen verbindet sich ClawAI?',
          answer:
            'Vierzehn Workspace-Connectoren: GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, ClickUp, Figma, Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive, Google Calendar und Outlook Calendar.',
        },
        {
          question: 'Sind meine Connector-Anmeldedaten sicher?',
          answer:
            'Anmeldedaten sind im Ruhezustand verschlüsselt, an Ihr Konto gebunden und werden nie an den Browser zurückgegeben — siehe die Seite Sicherheit und Datenumgang, unten verlinkt, für den zugrunde liegenden Mechanismus.',
        },
        {
          question:
            'Wird eine Workspace-Aktion getrennt von einer gewöhnlichen Chat-Nachricht gemessen?',
          answer:
            'Ja — Workspace-Aktionen haben eine eigene gemessene Fläche (WORKSPACE_ACTION), getrennt vom Token-Kontingent einer gewöhnlichen Chat-Nachricht. Das aktuelle Kontingent finden Sie auf der Preisseite.',
        },
      ],
      productNote:
        'ClawAI verbindet sich heute mit 14 Workspace-Werkzeugen — Code-Hosting, Messaging, Aufgabenverfolgung, Design, Dokumente, Speicher und Kalender — hinter einer einzigen planabhängigen WORKSPACES-Funktion mit eigener gemessener Aktionsfläche.',
    },
    [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: {
      seo: {
        title: 'Datei- und Dokumentenverarbeitung in ClawAI',
        description:
          'Wie ClawAI Dateien aufnimmt — Upload, Chunking, OCR, Upload-Prüfungen — und sie als Bilder, Dokumente und Recherche-Läufe mit zitierten Quellen wieder ausgibt.',
        keywords: [
          'KI-Datei-Upload und OCR',
          'KI-Dokumentengenerierung',
          'KI-Dokument-Exportformate',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Datei- und Dokumentenverarbeitung',
      summary:
        'Dateien bewegen sich in ClawAI in beide Richtungen: hinein, als Upload, der in Abschnitte zerlegt und indexiert wird, sodass ein Modell aus Ihrem Inhalt antwortet statt nur aus Trainingsdaten; und hinaus, als erzeugtes Bild, exportiertes Dokument oder Recherche-Lauf mit zitierten Quellen. Beide Richtungen sind real, ausgeliefert und getrennt gemessen.',
      sections: [
        {
          id: 'upload-chunking-and-retrieval',
          heading: 'Upload, Chunking und modellgerechte Zustellung',
          paragraphs: [
            'ClawAI akzeptiert PDF, DOCX, Tabellen, CSV, JSON, Markdown, Klartext, Codedateien und Bilder. Eine Datei wird in Abschnitte zerlegt und indexiert, sodass nur die für eine Frage relevanten Teile in die Eingabe fließen, und jedes Modell erhält die Form, die es am zuverlässigsten verarbeitet — ein natives Bild, ein natives PDF oder extrahierten Text —, wobei jede Nachricht zeigt, welche Form jedes Modell tatsächlich erhielt. Dateien lassen sich pro Nachricht anhängen, auch in Compare-Läufen, sodass mehrere Modelle zugleich zum selben Dokument befragt werden können.',
          ],
        },
        {
          id: 'ocr-and-upload-checks',
          heading: 'OCR für gescannte Dokumente und Prüfungen bei jedem Upload',
          paragraphs: [
            'Ein gescanntes PDF ohne Textebene durchläuft OCR, bevor es ein Modell erreicht, und wird bei niedriger Erkennungssicherheit markiert. Jeder Upload wird auf Viren geprüft, gegen den angegebenen Dateityp abgeglichen, auf gefährliche Dateinamen untersucht und abgelehnt, wenn ein Archiv sich als Dekomprimierungsbombe erweist — Uploads zählen gegen die Datei- und Speichergrenzen eines Plans, und Dateien werden nach einem Aufbewahrungsplan entfernt oder jederzeit selbst löschbar.',
          ],
        },
        {
          id: 'generating-images-documents-and-research',
          heading: 'Bilder, Dokumente und zitierte Recherche erzeugen',
          paragraphs: [
            'Ausgangsseitig kann ClawAI ein Bild aus einer Beschreibung erzeugen, jede Antwort oder ein ganzes Gespräch als formatierte Datei in PDF, DOCX, CSV, HTML, Markdown, TXT oder JSON exportieren und eine Recherche-Aufgabe ausführen, die das Web durchsucht, Seiten abruft und liest und mit den tatsächlich genutzten Quellen antwortet. Bildgenerierung, Dateigenerierung und Recherche werden je getrennt gemessen (IMAGE, FILE_GENERATION sowie die Kontingente RESEARCH_MODE / WEB_SEARCH / WEB_FETCH / WEB_EXTRACT), getrennt vom gewöhnlichen Chat-Token-Verbrauch. Siehe „Wie KI-Tool-Aufrufe funktionieren“ und „Was sind strukturierte KI-Ausgaben“, beide unten verlinkt, für den Mechanismus hinter einer festgelegten Ausgabeform.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welche Dateitypen kann ich hochladen?',
          answer:
            'PDF, DOCX, Tabellen, CSV, JSON, Markdown, Klartext, Codedateien und Bilder. Jedes Modell erhält die Form, die es am zuverlässigsten verarbeitet, und die Nachricht zeigt, welche Form jedes Modell tatsächlich erhielt.',
        },
        {
          question: 'Kann ClawAI ein gescanntes Dokument ohne Textebene lesen?',
          answer:
            'Ja — ein gescanntes PDF durchläuft OCR, bevor es ein Modell erreicht, und wird bei niedriger Erkennungssicherheit markiert.',
        },
        {
          question: 'In welchen Formaten kann ich ein Dokument exportieren?',
          answer:
            'PDF, DOCX, CSV, HTML, Markdown, TXT und JSON. Dokumentenexport ist eine eigene gemessene Fläche, getrennt vom gewöhnlichen Chat und von der Recherchenutzung.',
        },
      ],
      productNote:
        'Upload, Chunking, OCR und Upload-Prüfungen eingangsseitig; Bildgenerierung, Dokumentenexport und zitierte Recherche-Läufe ausgangsseitig — reale, ausgelieferte, getrennt gemessene Funktionen, kein einzelner vermischter Dateimodus.',
    },
    [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: {
      seo: {
        title: 'Observability und Transparenz in ClawAI',
        description:
          'Wie ClawAI zeigt, was eine Anfrage verbraucht — ein Nutzungs-Dashboard, Routing-Details pro Antwort, ein Audit-Log und Live-Fortschritt —, sodass Nutzung nie eine Black Box ist.',
        keywords: ['KI-Nutzungstransparenz', 'KI-Routing-Audit-Log', 'KI-Kostenüberwachung'],
      },
      eyebrow: 'Funktion',
      title: 'Observability und Transparenz',
      summary:
        'Nutzung ist in ClawAI gemessen, zugeordnet und sichtbar statt eine Black Box: ein Nutzungs-Dashboard, Routing-Details pro Antwort, ein Audit-Log und Live-Fortschritt während ein Modell arbeitet sind vier eigenständige, ausgelieferte Bausteine desselben Prinzips — Sie sehen jederzeit, was eine Anfrage getan hat und was sie kostete.',
      sections: [
        {
          id: 'usage-dashboard-and-per-answer-detail',
          heading: 'Das Nutzungs-Dashboard und Routing-Details pro Antwort',
          paragraphs: [
            'Ein Nutzungs-Dashboard zeigt das heute und diesen Monat verbrauchte Kontingent, aufgeschlüsselt nach Modell, mit dem Restguthaben in denselben Einheiten, in denen ein Plan angegeben ist. Darunter trägt jede einzelne Antwort das Modell, das sie erzeugt hat, warum es gewählt wurde, wie lange es dauerte, wie viele Token es verbrauchte und was es gegen das Kontingent kostete — einschließlich, welches Modell einsprang, falls der ursprüngliche Anbieter mitten in der Anfrage ausfiel. Siehe „Was ist KI-Modell-Routing“ und „Was ist Modell-Fallback“, beide unten verlinkt, für diese Routing-Entscheidung selbst.',
          ],
        },
        {
          id: 'the-audit-log',
          heading: 'Ein Audit-Log für Anmeldungen, Plan-Änderungen und Connector-Aktivität',
          paragraphs: [
            'Anmeldungen, Plan-Änderungen, Connector-Aktivität, Gedächtnis-Bearbeitungen und erzeugte Inhalte werden je mit Zeitstempel und Urheber erfasst, sodass die Historie eines Kontos rekonstruierbar ist, nicht nur im Moment des Geschehens sichtbar. Dies ist derselbe Audit-Trail, auf den die Seiten Gedächtnis und Kontext sowie Sicherheit und Datenumgang, unten verlinkt, für die Aktionen verweisen, die jede dieser Funktionen dort einträgt.',
          ],
        },
        {
          id: 'live-progress-and-limit-warnings',
          heading: 'Live-Fortschritt während ein Modell arbeitet, und klare Limit-Warnungen',
          paragraphs: [
            'Während ein Modell arbeitet, sehen Sie die aktuelle Phase, den ankommenden Text, seine Argumentation, wenn das Modell sie offenlegt, sowie laufende Token- und Zeitzähler — kein stilles Warten. Erreicht eine Anfrage ein Plan-Limit, nennt ClawAI, welches Limit, wie viel auf den anderen Zeitfenstern übrig bleibt und wann es zurückgesetzt wird, statt die Anfrage kommentarlos abzubrechen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Sehe ich, welches Modell eine bestimmte Nachricht beantwortet hat und warum?',
          answer:
            'Ja — jede Antwort verzeichnet den Anbieter und das Modell, das sie erzeugt hat, die Begründung der Routing-Entscheidung, die Dauer, die verbrauchten Token und die Kosten gegen Ihr Kontingent.',
        },
        {
          question: 'Was zeichnet das Audit-Log tatsächlich auf?',
          answer:
            'Anmeldungen, Plan-Änderungen, Connector-Aktivität, Gedächtnis-Bearbeitungen und erzeugte Inhalte, je mit Zeitstempel und Urheber, sodass die Kontohistorie im Nachhinein rekonstruierbar ist.',
        },
        {
          question: 'Was passiert, wenn ich ein Nutzungslimit erreiche?',
          answer:
            'ClawAI nennt, welches konkrete Limit erreicht wurde, wie viel Kontingent auf Ihren anderen Nutzungsfenstern verbleibt und wann das Limit zurückgesetzt wird — nichts wird stillschweigend abgebrochen.',
        },
      ],
      productNote:
        'Ein Nutzungs-Dashboard, Routing-Details pro Antwort, ein Audit-Log und Live-Fortschritt sind vier reale, ausgelieferte Bausteine desselben Prinzips: Nutzung ist in ClawAI gemessen, zugeordnet und sichtbar, keine Black Box.',
    },
    [FeatureCapability.SECURITY_AND_DATA_HANDLING]: {
      seo: {
        title: 'Sicherheit und Datenumgang in ClawAI',
        description:
          'Die konkreten Mechanismen hinter ClawAIs Konto- und Datensicherheit — Argon2-Passwort-Hashing, rotierende Refresh-Token, RBAC, AES-256-GCM-Anmeldedatenverschlüsselung, TLS und Dienstisolierung — schlicht beschrieben, ohne Compliance-Behauptungen.',
        keywords: [
          'KI-Plattformsicherheit',
          'KI-Anmeldedatenverschlüsselung',
          'rollenbasierte Zugriffskontrolle KI',
        ],
      },
      eyebrow: 'Funktion',
      title: 'Sicherheit und Datenumgang',
      summary:
        'Diese Seite beschreibt Mechanismen, die heute im Produkt existieren, schlicht, statt eine Compliance-Behauptung. Konten, Anmeldedaten, Transport und Dienstgrenzen haben je einen konkreten, nachprüfbaren Mechanismus dahinter — und wo eine Anfrage auf Hardware bleiben muss, die Sie kontrollieren, statt überhaupt einen Cloud-Anbieter zu erreichen, sind Local-Only- und Privacy-First-Routing die Antwort darauf, keine Sicherheitszertifizierung.',
      sections: [
        {
          id: 'accounts-sessions-and-access-control',
          heading: 'Konten, Sitzungen und rollenbasierter Zugriff',
          paragraphs: [
            'Passwörter werden mit Argon2 gehasht; Zugriffstoken sind kurzlebig, und Refresh-Token rotieren bei jeder Verwendung, sodass ein gestohlenes Token erkennbar ist. Jedes Konto trägt eine Rolle und einen expliziten Berechtigungssatz, geprüft in der Oberfläche und erneut an jedem Backend-Endpunkt — rollenbasierte Zugriffskontrolle auf beiden Ebenen, nicht nur dort, wo die Oberfläche es zufällig anzeigt.',
          ],
        },
        {
          id: 'credential-and-transport-encryption',
          heading: 'Anmeldedatenverschlüsselung und Verschlüsselung während der Übertragung',
          paragraphs: [
            'Anbieter- und Connector-Anmeldedaten sind im Ruhezustand mit AES-256-GCM verschlüsselt und werden nie an den Browser zurückgegeben. Der Transport erfolgt per TLS vom Browser zur Edge und erneut per TLS zwischen jedem internen Dienst, mit an jedem Hop geprüften Zertifikaten — sodass eine Anmeldedaten sowohl gespeichert als auch während der Bewegung geschützt sind.',
          ],
        },
        {
          id: 'service-isolation-and-what-is-not-claimed',
          heading: 'Dienstisolierung, Rate-Limiting und was hier nicht behauptet wird',
          paragraphs: [
            'Jeder Backend-Dienst besitzt seine eigene Datenbank und kann nicht in der eines anderen lesen, sodass ein Ausfall der Bildgenerierung Ihre Gespräche nicht erreichen kann; kontobezogene Ratenlimits schützen sowohl Ihr Kontingent als auch die Plattform vor außer Kontrolle geratenen Schleifen. ClawAI hält heute keine Compliance-Zertifizierungen, und die gehostete App sendet Anfragen an Drittanbieter-Modelle unter deren eigenen Bedingungen — wo das für eine Organisation nicht funktioniert, wird eine private Bereitstellung im eigenen Netzwerk, nur mit offenen Modellgewichten, individuell abgestimmt; kontaktieren Sie uns dazu. Für eine Anfrage, die standardmäßig auf Hardware bleiben muss, die Sie kontrollieren, siehe Private und lokale Bereitstellung, unten verlinkt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wie werden meine Passwörter und Anmelde-Token geschützt?',
          answer:
            'Passwörter werden mit Argon2 gehasht. Zugriffstoken sind kurzlebig, und Refresh-Token rotieren bei jeder Verwendung, sodass ein gestohlenes Refresh-Token erkennbar statt still wiederverwendbar ist.',
        },
        {
          question: 'Wie werden meine Connector-Anmeldedaten gespeichert?',
          answer:
            'Anbieter- und Connector-Anmeldedaten sind im Ruhezustand mit AES-256-GCM verschlüsselt und werden nie an den Browser zurückgegeben, unabhängig vom Workspace-Connector.',
        },
        {
          question: 'Hält ClawAI Drittanbieter-Compliance-Zertifizierungen?',
          answer:
            'Nein — ClawAI hält heute keine Compliance-Zertifizierungen. Für eine Anforderung, die die gehostete App nicht erfüllen kann, wird eine private Bereitstellung im eigenen Netzwerk individuell abgestimmt; siehe den Anwendungsfall lokale und private Bereitstellung, unten verlinkt.',
        },
      ],
      productNote:
        'Argon2-Passwort-Hashing, rotierende Refresh-Token, RBAC an jedem Backend-Endpunkt geprüft, AES-256-GCM-Anmeldedatenverschlüsselung, TLS an jedem Hop und dienstweise Datenbankisolierung — konkrete Mechanismen, schlicht beschrieben, ohne behauptete Compliance-Zertifizierung.',
    },
  },
};
