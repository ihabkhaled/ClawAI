import type {
  PublicLaunchCorePageDictionary,
  PublicLaunchLabels,
  PublicLaunchLocalizedLabels,
} from '@/types/public-launch-content.types';

/** Die Seitenelemente (onThisPage, evidence, …) stehen in public-commerce-policy-content. */
export const DE_PUBLIC_LAUNCH_LABELS: Omit<PublicLaunchLabels, keyof PublicLaunchLocalizedLabels> =
  {
    viewPricing: 'Preise ansehen',
    readSecurity: 'Sicherheit und Datenschutz lesen',
    baselineCatalog: 'Basiskatalog der Abonnements',
    monthlyPrice: 'Monatlich',
    yearlyPrice: 'Jährlich',
    dailyAllowance: 'Tägliches gewichtetes Kontingent',
    monthlyAllowance: 'Monatliches gewichtetes Kontingent',
    liveCheckoutNote:
      'Dies sind die Basispreise und Kontingente aus dem Repository. Der Live-Checkout bestätigt den aktuell gültigen Preis vor der Zahlung.',
    providerAvailabilityNote:
      'Modelle werden von den aktivierten Anbietern synchronisiert. Der genaue Katalog hängt von den konfigurierten Zugangsdaten, der Verfügbarkeit der Anbieter, dem Lebenszyklusstatus und den Richtlinien der Administratoren ab.',
    routingRailTitle: 'Eine Anfrage, eine nachvollziehbare Route',
    routingRailSummary:
      'ClawAI bewertet die Anfrage und die aktuelle Richtlinie, bevor es einen verfügbaren Ausführungsweg auswählt.',
    routingRailAlternative:
      'Eine Anfrage wird bewertet, an einen geeigneten Anbieter weitergeleitet, optional verglichen und mit Modellkennung und Nutzungsdetails zurückgegeben.',
    evaluate: 'Bewerten',
    evaluateDescription:
      'Aufgabe, verfügbaren Kontext, Richtlinie und aktuelle Berechtigung auslesen.',
    route: 'Weiterleiten',
    routeDescription:
      'Einen aktiven Modellweg aus den vom Betreiber konfigurierten Anbietern auswählen.',
    compare: 'Vergleichen',
    compareDescription:
      'Die Orchestrierung mehrerer Modelle nur nutzen, wenn der gewählte Modus und das Kontingent es erlauben.',
    receipt: 'Zurückgeben',
    receiptDescription:
      'Die Antwort mit sichtbarer Modellherkunft und Nutzungsinformationen streamen.',
  };

export const DE_PUBLIC_LAUNCH_PAGES: PublicLaunchCorePageDictionary = {
  about: {
    eyebrow: 'Über ClawAI',
    sections: [
      {
        id: 'purpose',
        title: 'Eine praktische Steuerzentrale für KI-Arbeit',
        body: 'ClawAI bringt Unterhaltungen, Modell-Routing, Dateien, Gedächtnis, Recherche, Generierung und Arbeitsbereichs-Aktionen in einer durchgängigen Oberfläche zusammen. Das Produkt soll den betrieblichen Aufwand beim Wechsel zwischen Anbietern verringern und dabei das gewählte Modell, die Nutzung und den Ausführungsweg für die arbeitende Person sichtbar halten.',
      },
      {
        id: 'principles',
        title: 'Gebaut um Wahlfreiheit, Belege und Kontrolle',
        body: 'Die Plattform betrachtet kein Modell als universell das beste. Sie kann nach Aufgabe routen, einer Person die Modellwahl überlassen, mehrere geeignete Antworten vergleichen oder eine unabhängige Instanz die Ausgabe prüfen lassen. Die Verfügbarkeit hängt stets von den Connectors, Zugangsdaten, Tarifrichtlinien und Modell-Lebenszyklen ab, die für die laufende Umgebung konfiguriert sind.',
      },
      {
        id: 'architecture',
        title: 'Lokal zuerst betreiben, Cloud-Modelle erreichen',
        body: 'Das Repository enthält eine Next.js-Oberfläche und eigenständig bereitstellbare Dienste, die über klare HTTP- und Ereignisgrenzen verbunden sind. Betreiber können die Plattform auf eigener Infrastruktur laufen lassen, unterstützte Cloud-Anbieter anbinden oder eine lokale Modellbereitstellung planen, deren Hardware und Integrationen zu den Anforderungen der Organisation passen.',
      },
      {
        id: 'trust',
        title: 'Vertrauen durch nachprüfbare Fakten',
        body: 'Wir veröffentlichen Architektur, Preisbasen, Sicherheitskontrollen, Einschränkungen und Prüfdaten, statt unbelegte Siegel oder erfundene Kundenbelege zu präsentieren. Das Quell-Repository steht für die technische Prüfung offen, während die Live-Anbieterkataloge und der Checkout maßgeblich dafür bleiben, was in einer bestimmten Bereitstellung verfügbar ist.',
      },
    ],
    evidence:
      'ClawAI ist ein offenes Repository mit 18 NestJS-Diensten, einem Next.js-Frontend, gemeinsamen Paketen, RabbitMQ-Ereignissen und einer Datenbank pro Dienst. Produktaussagen auf dieser Website beschränken sich auf das Verhalten, das in diesem Repository sichtbar ist.',
  },
  pricing: {
    eyebrow: 'Klare Abonnement-Basiswerte',
    sections: [
      {
        id: 'catalog',
        title: 'Sieben Einstiegspunkte, von kostenlos bis zu hohem Volumen',
        body: 'Der Basiskatalog umfasst die Tarife Free, Starter, Plus, Pro, Team, Scale und Unlimited. Die Monatspreise reichen von null bis zweihundert US-Dollar, die Jahrespreise entsprechen zehn Monatszahlungen, sofern eine jährliche Abrechnung angeboten wird. Der Checkout-Dienst ermittelt den unveränderlichen aktiven Preis auf dem Server, bevor er eine gehostete Zahlung erstellt.',
      },
      {
        id: 'allowances',
        title: 'Kontingente sind gewichtet, keine Versprechen in rohen Tokens',
        body: 'Die veröffentlichten Tages-, Wochen- und Monatswerte sind kostennormalisierte Einheiten. Ein teureres Modell verbraucht das Kontingent anders als ein günstiges, sodass ein einziges Guthaben unterschiedliche Anbieter abdeckt. Der Katalog legt je Tarif außerdem Grenzen für Unterhaltungen, Nachrichten, Parallelität, Arbeitsbereiche, Gedächtnis und Orchestrierung fest.',
      },
      {
        id: 'models',
        title: 'Der Modellzugang richtet sich nach der Live-Bereitstellung',
        body: 'Standardmäßig stellt das Repository die aktiven, synchronisierten Modelle bereit, sofern ein Administrator keine ausdrücklichen Anbieter- oder Modellbeschränkungen anlegt. Die vorbelegte Kostenklassen-Richtlinie belegt nicht die Regeln in einer bereitgestellten Datenbank, daher verspricht diese Seite kein bestimmtes Modell in einem bestimmten Tarif. Prüfen Sie den Live-Katalog, bevor Sie einen Tarif wegen eines Modells wählen.',
      },
      {
        id: 'payment',
        title: 'Serverseitig bepreister, gehosteter Checkout',
        body: 'Die Integrationen mit PayPal und Paymob nutzen einen gehosteten Checkout, sodass Kartennummern nicht durch die ClawAI-Anwendung laufen. Die maßgeblichen Tarifpreise werden in US-Dollar gespeichert; ein konfiguriertes Gateway kann in einer anderen unterstützten Währung abrechnen. Steuern, regionale Verfügbarkeit, Erstattungen und die Bereitschaft des Gateways hängen vom bereitgestellten Dienst und den geltenden Bedingungen ab.',
      },
    ],
    evidence:
      'Die Katalogwerte sind eine versionierte Basis aus dem Repository und keine Garantie, dass ein Administrator die aktive Bereitstellung nicht geändert hat. Der Checkout zeigt den aktuellen serverseitigen Preis an und berechnet ihn.',
  },
  'supported-models': {
    eyebrow: 'Modelle und Anbieter',
    sections: [
      {
        id: 'cloud',
        title: 'Implementierte Adapter für Cloud-Anbieter',
        body: 'Der Connector-Dienst enthält einsatzfähige Adapter für OpenAI, Anthropic, Google Gemini, DeepSeek und xAI Grok. Jeder Adapter synchronisiert den Anbieterkatalog, sobald gültige Zugangsdaten und Konfiguration vorliegen. Modellnamen und Verfügbarkeit können sich beim Anbieter ändern, daher ist der Live-Katalog die verlässliche Quelle für eine laufende Bereitstellung.',
      },
      {
        id: 'local',
        title: 'Lokale Ausführung mit Ollama und llama.cpp',
        body: 'Betreiber können Ollama und llama.cpp für Modelle konfigurieren, die auf kontrollierter Infrastruktur laufen. Ein rein lokaler Routing-Modus hält seine Ausweichkette bei lokalen Anbietern. Hardwareeignung, Modelllizenz, Kontextgrenzen, Qualität und Durchsatz unterscheiden sich, daher wird die Modellauswahl für private Bereitstellungen in der technischen Abstimmung geklärt und nicht pauschal versprochen.',
      },
      {
        id: 'selection',
        title: 'Manuelle Auswahl und richtlinienbewusstes Routing',
        body: 'Personen können ein verfügbares Modell direkt wählen oder die Routing-Logik einen geeigneten Weg für die Aufgabe auswählen lassen. Der Router berücksichtigt Modellfähigkeiten, Lebenszyklus, Connector-Konfiguration und Richtlinie. Mehrmodell-Modi ergänzen Vergleichs- und Prüfmuster, doch ihre Verfügbarkeit und Grenzen richten sich nach der aktiven Bereitstellung und nicht nach Werbetexten.',
      },
      {
        id: 'availability',
        title: 'Warum diese Seite keine feste Versionsliste enthält',
        body: 'Eine statische Liste modischer Modellversionen wird schnell ungenau und kann Zugangsdaten suggerieren, die nicht konfiguriert sind. ClawAI unterscheidet deshalb zwischen implementierten Anbieterfamilien und der tatsächlichen Modellverfügbarkeit. Die im Produkt angezeigten Modelle werden von aktivierten Connectors synchronisiert und nach Lebenszyklus und etwaigen Administratorbeschränkungen gefiltert.',
      },
    ],
    evidence:
      'AWS Bedrock existiert im Repository als Connector-Gerüst, doch die Modellsynchronisierung ist nicht implementiert; deshalb wird es hier bewusst nicht als verfügbarer Anbieter dargestellt.',
  },
  'security-and-privacy': {
    eyebrow: 'Sicherheit und Datenschutz',
    sections: [
      {
        id: 'credentials',
        title: 'Connector-Zugangsdaten sind im Ruhezustand geschützt',
        body: 'API-Schlüssel von Anbietern und Connectors werden mit AES-256-GCM, einem zufälligen Initialisierungsvektor und einem Authentifizierungs-Tag verschlüsselt und in API-Antworten maskiert. Zahlungs-Gateway-Tokens nutzen authentifizierte Verschlüsselung mit zeilengebundenen zugehörigen Daten. Diese Kontrollen stützen präzise Aussagen zum Schutz von Zugangsdaten, keine pauschale Aussage über jedes gespeicherte Byte.',
      },
      {
        id: 'boundaries',
        title: 'Klare Dienst- und Datengrenzen',
        body: 'ClawAI trennt die Zuständigkeit der Dienste und verhindert, dass ein Dienst direkt auf die Datenbank eines anderen zugreift. Anfragen laufen über authentifizierte HTTP-Grenzen oder RabbitMQ-Ereignisse, während Validierung, Autorisierung, Ratenbegrenzung, Sicherheits-Header und Audit-Einträge auf definierten Ebenen angewendet werden. Die Konfiguration der Bereitstellung bleibt Teil der Sicherheitsgrenze.',
      },
      {
        id: 'retention',
        title: 'Die Aufbewahrung unterscheidet sich je Datentyp',
        body: 'Dateien laufen standardmäßig nach dreißig Tagen ab, sofern ein Betreiber keine unbefristete Aufbewahrung konfiguriert. Client- und Server-Logs nutzen Ablaufindizes in der Datenbank von dreißig Tagen, während Audit-Einträge und Nutzungsbücher in ihren aktuellen Schemata keinen automatischen Ablauf haben. Personen können Unterhaltungen, Erinnerungen, Kontextpakete und Dateien löschen; die Kontolöschung ist derzeit nicht als Selbstbedienung verfügbar.',
      },
      {
        id: 'processing',
        title: 'Die Verarbeitung beim Anbieter ist eine Entscheidung der Bereitstellung',
        body: 'Prompts und Anhänge, die an ein Cloud-Modell gesendet werden, verarbeitet der konfigurierte Anbieter nach seinen eigenen Bedingungen. Rein lokales Routing kann die Modellausführung auf lokalen Ollama-Pfaden halten, doch andere aktivierte Dienste können weiterhin externe Auftragsverarbeiter einbeziehen. Zertifizierungen, Datenresidenz, regulatorische Konformität und universelle Löschgarantien erfordern gesonderte Nachweise und werden hier nicht behauptet.',
      },
    ],
    evidence:
      'Die Sicherheitsangaben beschreiben Kontrollen, die im Repository vorhanden sind. Sie sind weder eine Zertifizierung noch ein Penetrationstest-Bericht, ein Auftragsverarbeitungsvertrag oder eine Garantie für die endgültige Konfiguration eines Betreibers.',
  },
  /* Owner legal review pending (2026-11-23) */
  privacy: {
    eyebrow: 'Datenschutzhinweis',
    sections: [
      {
        id: 'data',
        title: 'Daten, die die Anwendung verarbeitet',
        body: 'ClawAI verarbeitet Kontodaten, Unterhaltungen, Prompts, generierte Antworten, Angaben zum gewählten Modell, hochgeladene Dateien, Erinnerungen, Kontextpakete, Nutzungsdaten, Audit-Ereignisse, Support-Nachrichten und Abrechnungsreferenzen, soweit sie zur Erbringung des Dienstes erforderlich sind. Arbeitsbereichs-Connectors können Inhalte und Kennungen aus Diensten verarbeiten, die eine berechtigte Person verbinden möchte.',
      },
      {
        id: 'use',
        title: 'Wie die Daten den Produktbetrieb unterstützen',
        body: 'Die Anwendung nutzt diese Daten, um Nutzer zu authentifizieren, angeforderte KI- und Arbeitsbereichs-Aktionen auszuführen, Kontext zu erhalten, konfigurierten Zugang und Kontingente durchzusetzen, Fehler zu analysieren, die Plattform zu sichern, den gehosteten Checkout abzuwickeln und Support-Anfragen zu beantworten. Externe Anbieter erhalten nur die Informationen, die für den konfigurierten Vorgang erforderlich sind, vorbehaltlich ihrer eigenen Bedingungen.',
      },
      {
        id: 'storage',
        title: 'Speicherung, Aufbewahrung und Löschung',
        body: 'Authentifizierungs-Tokens werden derzeit im lokalen Speicher des Browsers abgelegt, zusammen mit Einstellungen wie Design und Sprache; dort kann auch eine optional gemerkte E-Mail-Adresse stehen. Für Dateien und Betriebs-Logs gelten die Repository-Standards, die auf der Sicherheitsseite beschrieben sind. Nutzer können mehrere Inhaltstypen löschen, doch die vollständige Kontolöschung erfordert derzeit eine Anfrage beim Betreiber.',
      },
      {
        id: 'choices',
        title: 'Wahlmöglichkeiten und Fragen',
        body: 'Nutzer können optionale Connectors meiden, Unterhaltungen, Dateien, Erinnerungen und Kontextpakete entfernen, den lokalen Browserspeicher leeren und lokales Modell-Routing wählen, wenn die Bereitstellung es bietet. Anfragen zu einem Konto, zu den Praktiken des Betreibers, zu Auskunft, Berichtigung oder Löschung sollten über die Kontaktseite gesendet werden, damit der verantwortliche Betreiber sie prüfen und beantworten kann.',
      },
    ],
    evidence:
      'Dieser Hinweis behauptet bewusst nicht, dass Daten nie verkauft, nie für Training genutzt oder stets nach einem allgemeinen Zeitplan gelöscht werden, da diese betrieblichen und anbieterseitigen Zusagen nicht allein durch den Repository-Code belegt sind.',
  },
  /* Owner legal review pending (2026-11-23) */
  terms: {
    eyebrow: 'Nutzungsbedingungen',
    sections: [
      {
        id: 'service',
        title: 'Nutzung des Dienstes',
        body: 'Diese Bedingungen regeln den Zugang zur ClawAI-Anwendung und ihren gehosteten oder selbst betriebenen Funktionen. Nutzer müssen korrekte Kontoangaben machen, ihre Zugangsdaten schützen, geltendes Recht einhalten und nur Daten, Systeme und Integrationen verwenden, auf die sie zugreifen dürfen. Für eine gesondert vereinbarte private Bereitstellung können zusätzliche Geschäftsbedingungen gelten.',
      },
      {
        id: 'availability',
        title: 'Modelle, Integrationen und generierte Ausgaben',
        body: 'Die Verfügbarkeit von Modellen und Anbietern kann sich mit Konfiguration, Zugangsdaten, vorgelagerten Diensten, Lebenszyklusstatus und Administratorrichtlinie ändern. Generierte Ausgaben können unvollständig, ungenau, unsicher oder für einen bestimmten Zweck ungeeignet sein und müssen vor folgenreicher Verwendung geprüft werden. ClawAI ersetzt kein fachliches Urteil in rechtlichen, medizinischen, finanziellen oder sicherheitsrelevanten Fragen.',
      },
      {
        id: 'billing',
        title: 'Tarife und Zahlung',
        body: 'Kostenpflichtige Abonnements nutzen den aktiven Preis und das Abrechnungsintervall, die im serverseitig bepreisten, gehosteten Checkout angezeigt werden. Basiswerte des Katalogs auf der Marketing-Website können von der aktuellen Bereitstellung eines Administrators abweichen. Verfügbarkeit des Gateways, Abrechnungswährung, Steuern, Kündigungsfristen, Erstattungen und andere Zahlungsrechte richten sich nach den Angaben im Checkout und dem geltenden Recht.',
      },
      {
        id: 'changes',
        title: 'Änderungen, Sperrung und Kontakt',
        body: 'Der Betreiber kann Funktionen, Grenzen, Integrationen oder diese Bedingungen ändern, um den Dienst zu pflegen, zu sichern oder zu verbessern. Der Zugang kann bei Sicherheitsrisiko, Zahlungsverzug, rechtswidrigem Verhalten oder wesentlicher Vertragsverletzung eingeschränkt werden. Aktualisierte Bedingungen sollten ein neues Datum des Inkrafttretens tragen, und Fragen oder Streitfälle sollten zur Prüfung über die Kontaktseite vorgebracht werden.',
      },
    ],
    evidence:
      'Diese Produktbedingungen sind eine sachliche Ausgangsbasis zum Start und keine rechtliche Beratung für eine bestimmte Rechtsordnung. Der verantwortliche Betreiber sollte einen Rechtsbeistand hinzuziehen, bevor er sich für einen kommerziellen Produktivdienst darauf verlässt.',
  },
  /* Owner legal review pending (2026-11-23) */
  cookies: {
    eyebrow: 'Cookies und Browser-Speicher',
    sections: [
      {
        id: 'cookie',
        title: 'Das Marker-Cookie zur Authentifizierung',
        body: 'Nach der Anmeldung setzt das Frontend ein kurzes Marker-Cookie, das der Routing-Middleware mitteilt, dass eine authentifizierte Sitzung bestehen könnte. Der Marker ist nicht die Zugangsberechtigung, ist für den Client lesbar und verwendet SameSite Lax. Zugriffs- und Aktualisierungs-Tokens liegen derzeit getrennt im lokalen Speicher des Browsers und nicht in einem HttpOnly-Authentifizierungs-Cookie.',
      },
      {
        id: 'local-storage',
        title: 'Vom Interface genutzter lokaler Speicher',
        body: 'Der Browser kann Authentifizierungsstatus, Design, Sprache, Einstellungen der Modellansicht, vorübergehende Angaben des Eingabefelds und eine E-Mail-Adresse speichern, Letztere nur, wenn der Nutzer die Option zum Merken der E-Mail wählt. Das Löschen der Website-Daten entfernt diese lokalen Werte und kann den Nutzer abmelden oder Einstellungen zurücksetzen, ohne Kontoinhalte auf dem Server zu löschen.',
      },
      {
        id: 'advertising',
        title: 'Optionale Werbetechnologie',
        body: 'Das Marketing-Layout enthält eine über die Konfiguration aktivierbare Integration von Google AdSense. Das aktuelle Repository bietet keine vollständige Consent-Management-Plattform; Betreiber dürfen optionale Werbespeicherung daher nicht aktivieren, wo eine Einwilligung rechtlich erforderlich ist, bis sie einen geeigneten Einwilligungsablauf und eine regionale Richtlinie umgesetzt und geprüft haben.',
      },
      {
        id: 'control',
        title: 'Browser-Kontrollen und Aktualisierungen',
        body: 'Nutzer können Cookies und lokalen Speicher über ihren Browser einsehen, blockieren oder löschen, wobei das Blockieren erforderlicher Speicherung die Anmeldung oder das Behalten von Einstellungen verhindern kann. Betreiber sollten diesen Hinweis aktualisieren, wenn sich Speicherschlüssel, Analyse, Werbung, Zahlung oder eingebettete Dienste ändern, und das Datum des Inkrafttretens an das bereitgestellte Verhalten anpassen.',
      },
    ],
    evidence:
      'Dieser Hinweis beschreibt die Speicherung, die heute im Repository sichtbar ist. Ein Betreiber bleibt dafür verantwortlich, zusätzliche Skripte, Proxys, Analysen und Gateway-Verhalten zu prüfen, die über die Konfiguration hinzukommen.',
  },
  /* Owner legal review pending (2026-11-23) */
  'acceptable-use': {
    eyebrow: 'Zulässige Nutzung',
    sections: [
      {
        id: 'authorised',
        title: 'Nutzen Sie nur Systeme und Daten, zu deren Nutzung Sie berechtigt sind',
        body: 'Nutzen Sie ClawAI nicht, um ohne eindeutige Erlaubnis auf Konten, Repositories, Dateien, Netzwerke, Geräte oder Dienste Dritter zuzugreifen. Arbeitsbereichs-Aktionen und Agent-Fähigkeiten müssen innerhalb der vom jeweiligen Eigentümer erteilten Befugnis bleiben. Umgehen Sie keine Freigaben, Zugriffskontrollen, Ratenbegrenzungen, Sicherheitsgrenzen oder Administratorrichtlinien.',
      },
      {
        id: 'harm',
        title: 'Fördern Sie keinen Schaden und kein rechtswidriges Verhalten',
        body: 'Nutzen Sie den Dienst nicht, um Schadsoftware, Diebstahl von Zugangsdaten, zerstörerische Anleitungen, gezielte Belästigung, sexuelle Ausbeutung, rechtswidrige Überwachung, täuschende Identitätsvortäuschung oder Material zu erstellen oder zu verbreiten, das gegen geltendes Recht oder die Rechte anderer verstößt. Folgenreiche Entscheidungen erfordern eine Prüfung durch qualifizierte Menschen und angemessene Schutzvorkehrungen.',
      },
      {
        id: 'platform',
        title: 'Schützen Sie Zuverlässigkeit und Integrität des Dienstes',
        body: 'Sondieren, überlasten, scrapen, dekompilieren oder stören Sie eine Bereitstellung nicht, außer im Rahmen einer genehmigten Vereinbarung zu Sicherheitstests. Automatisieren Sie keine Kontoerstellung, umgehen Sie keine Kontingente, verschleiern Sie keine missbräuchliche Herkunft, manipulieren Sie keine Abrechnung und nutzen Sie generierte Inhalte nicht, um die Herkunft falsch darzustellen. Melden Sie vermutete Schwachstellen über den Kontaktweg.',
      },
      {
        id: 'enforcement',
        title: 'Prüfung und Durchsetzung',
        body: 'Der Betreiber kann glaubwürdigen Meldungen nachgehen, relevante Audit-Nachweise sichern, eine Funktion einschränken, ein Konto sperren oder den Zugang blockieren, wenn dies zum Schutz von Nutzern, Anbietern, Infrastruktur oder rechtlichen Pflichten vernünftigerweise erforderlich ist. Kontext, Absicht, Schwere, Wiederholung und verfügbare Abhilfe sollten jede Durchsetzungsentscheidung mitbestimmen.',
      },
    ],
    evidence:
      'Die Regeln zur zulässigen Nutzung ergänzen die technische Autorisierung und die Richtlinien der Anbieter; sie ersetzen diese nicht. Private Bereitstellungen sollten Durchsetzung und Meldeverfahren an ihre Organisation und Rechtsordnung anpassen.',
  },
};
