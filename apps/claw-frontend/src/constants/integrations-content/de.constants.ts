import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const DE_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufige Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt geprüft',
    backToHub: 'Alle Integrationen',
    ctaTitle: 'Verbinden und selbst sehen',
    ctaBody:
      'Jeder Connector ist in jedem kostenpflichtigen Tarif enthalten. Verbinden Sie ihn in den Einstellungen Ihres Arbeitsbereichs.',
    startFree: 'Mit dem kostenlosen Tarif starten',
    seeFeatures: 'Ansehen, was ClawAI kann',
    capabilitiesHeading: 'Was dieser Connector kann',
    readLabel: 'ClawAI kann lesen',
    writeLabel: 'ClawAI kann schreiben',
    syncLabel: 'Synchronisierung',
    realTimeLabel: 'Aktualisiert in Echtzeit',
    pollBasedLabel: 'Synchronisiert nach Zeitplan, nicht in Echtzeit',
  },
  hub: {
    seo: {
      title: 'Integrationen: ClawAI mit Ihren Tools verbinden',
      description:
        'ClawAI verbindet sich mit 14 Arbeitsbereich-Tools — GitHub, Slack, Jira, Google Drive, Gmail und mehr —, sodass ein Gespräch Ihre Arbeit lesen und darauf handeln kann, statt nur darüber zu reden.',
      keywords: ['ClawAI Integrationen', 'KI mit Tools verbinden', 'KI Workspace-Anbindung'],
    },
    eyebrow: 'Integrationen',
    title: 'ClawAI mit den Tools verbinden, die Sie bereits nutzen',
    summary:
      'Jeder Connector unten ist real und im Einsatz, kein Roadmap-Punkt — was er lesen kann, was er schreiben kann und ob er in Echtzeit oder nach Zeitplan aktualisiert, stammt alles aus derselben Registry, auf der das Produkt selbst läuft.',
    topicsHeading: 'Einen Connector wählen',
    cardSummaries: {
      [IntegrationTopic.GITHUB]:
        'Repositories, Issues, Pull Requests — lesen, kommentieren, überprüfen, genehmigen.',
      [IntegrationTopic.GITLAB]:
        'Projekte, Merge Requests, Issues — kommentieren, genehmigen, Änderungen vorschlagen.',
      [IntegrationTopic.BITBUCKET]:
        'Repositories und Pull Requests — kommentieren, genehmigen, Issues anlegen.',
      [IntegrationTopic.SLACK]:
        'Kanäle und Nachrichten — Kontext lesen, Nachrichten senden und beantworten.',
      [IntegrationTopic.JIRA]:
        'Issues und Projekte — Tickets anlegen, aktualisieren, kommentieren.',
      [IntegrationTopic.CONFLUENCE]:
        'Seiten und Spaces — Dokumentation lesen, Seiten anlegen und bearbeiten.',
      [IntegrationTopic.CLICKUP]:
        'Aufgaben, Spaces, Ordner — Aufgaben anlegen, aktualisieren und kommentieren.',
      [IntegrationTopic.FIGMA]:
        'Dateien und Kommentare — Designs lesen, Kommentare posten, an Jira übergeben.',
      [IntegrationTopic.GOOGLE_DRIVE]:
        'Dateien und Ordner — Dokumente und Tabellen lesen, Dateien hochladen und verschieben.',
      [IntegrationTopic.GMAIL]:
        'Threads und Nachrichten — E-Mails lesen, senden, beantworten und als Entwurf anlegen.',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]:
        'Sites, Dokumente, Listen — Dokumente lesen und hochladen, Listenelemente verwalten.',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]:
        'Dateien und Ordner — lesen, hochladen und verschieben.',
      [IntegrationTopic.GOOGLE_CALENDAR]:
        'Meetings und Termine — Ihren Kalender lesen, Termine anlegen.',
      [IntegrationTopic.OUTLOOK_CALENDAR]:
        'Meetings und Termine — Ihren Kalender lesen, Termine anlegen.',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'KI-Integration für GitHub — ClawAI',
        description:
          'Verbinden Sie GitHub mit ClawAI, um Repositories, Issues und Pull Requests zu lesen sowie PR-Beschreibungen zu entwerfen, zu kommentieren, Änderungen vorzuschlagen und zu genehmigen — direkt aus einem Gespräch heraus.',
        keywords: [
          'KI GitHub Integration',
          'KI Code Review GitHub',
          'mit GitHub Repository chatten',
        ],
      },
      eyebrow: 'Code-Hosting',
      title: 'GitHub',
      summary:
        'Verbinden Sie ein GitHub-Konto oder eine Organisation, damit ClawAI Ihre Repositories, Issues und Pull Requests lesen und darauf handeln kann — Beschreibungen entwerfen, Kommentare hinterlassen, Änderungen vorschlagen und Reviews genehmigen — direkt aus einem Gespräch heraus.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'Nach dem Verbinden kann ClawAI Repository-Inhalte, Issues, Pull Requests und Kommentare lesen. Echtzeit-Updates werden unterstützt — ein Webhook informiert ClawAI über Änderungen, statt auf die nächste Abfrage zu warten — und Delta-Sync sorgt dafür, dass ein großes Repository nicht bei jedem Mal von Grund auf neu gelesen werden muss.',
            'Auf der Schreibseite kann ClawAI ein Issue anlegen, ein Issue kommentieren, eine Pull-Request-Beschreibung entwerfen, einen Pull Request kommentieren, eine konkrete Codeänderung vorschlagen und einen Pull Request genehmigen. Jede Schreibaktion geschieht als ausdrückliche Handlung, die Sie prüfen — nicht still im Hintergrund.',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: 'Wie das zum Coding Agent passt',
          paragraphs: [
            'Der GitHub-Connector und der Coding Agent lösen verwandte, aber unterschiedliche Probleme. Der Coding Agent arbeitet in Ihrem Editor an einem ausgecheckten Repository. Der GitHub-Connector arbeitet in einem ClawAI-Gespräch mit den bei GitHub gehosteten Daten — Issues, Pull Requests und Review-Kommentare —, ohne dass jemand das Repository lokal geöffnet haben muss.',
            'Ein gängiges Muster: den Connector nutzen, um Issues aus dem Chat zu triagieren und PR-Beschreibungen zu entwerfen, und zum Coding Agent greifen, sobald es ans tatsächliche Schreiben und Ausführen von Code geht.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Wie Sie es verbinden',
          paragraphs: [
            'GitHub unterstützt OAuth (die Standardmethode — mit GitHub anmelden und begrenzten Zugriff gewähren) oder einen persönlichen Zugriffstoken für Konten und Automatisierungen, die einen Token bevorzugen. GitHub Enterprise wird unterstützt, indem der Connector statt auf github.com auf die API-URL Ihrer Instanz zeigt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ClawAI automatisch Kommentare zu meinen Pull Requests hinterlassen?',
          answer:
            'Es kann einen Kommentar hinterlassen, wenn Sie es darum bitten — einen Diff prüfen und Feedback posten oder genehmigen, sobald es überzeugt ist. Es kommentiert nicht von sich aus; jede Schreibaktion ist eine Handlung, die Sie anfordern.',
        },
        {
          question: 'Funktioniert es mit privaten Repositories?',
          answer:
            'Ja, im Rahmen des Zugriffs, den Sie beim Verbinden gewähren. ClawAI sieht nur das, was das verbundene Konto oder der Token sehen kann.',
        },
        {
          question: 'Ersetzt das den Coding Agent?',
          answer:
            'Nein — beide decken unterschiedliche Bereiche ab. Der Connector erreicht aus dem Chat heraus die bei GitHub gehosteten Issues und Pull Requests; der Coding Agent arbeitet an Ihrem ausgecheckten Code im Editor.',
        },
      ],
      productNote:
        'Der GitHub-Connector ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI, und jede Schreibaktion, die er ausführt, haben Sie angefordert.',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'KI-Integration für GitLab — ClawAI',
        description:
          'Verbinden Sie GitLab mit ClawAI, um Projekte, Merge Requests und Issues zu lesen sowie zu kommentieren, Änderungen vorzuschlagen, Beschreibungen zu aktualisieren und zu genehmigen — direkt aus einem Gespräch heraus.',
        keywords: ['KI GitLab Integration', 'KI Merge-Request-Review', 'GitLab KI-Assistent'],
      },
      eyebrow: 'Code-Hosting',
      title: 'GitLab',
      summary:
        'Verbinden Sie ein GitLab-Konto oder eine selbst betriebene Instanz, damit ClawAI Ihre Projekte, Merge Requests und Issues lesen und aus einem Gespräch heraus darauf handeln kann — kommentieren, Änderungen vorschlagen, Beschreibungen aktualisieren und genehmigen.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Projekte, Issues, Merge Requests und Kommentare lesen, mit Echtzeit-Updates über Webhook. Die Synchronisierung liest bei jedem Lauf alles neu ein, statt Delta-Sync zu nutzen — das fällt bei sehr großen Projekten stärker ins Gewicht als bei kleinen.',
            'Auf der Schreibseite: einen Merge Request kommentieren, ihn genehmigen, seine Beschreibung aktualisieren, eine konkrete Codeänderung vorschlagen, einen Inline-Kommentar zu einem Bild hinzufügen, ein Issue anlegen und ein Issue kommentieren. Jede davon ist eine ausdrückliche Handlung, die Sie anfordern.',
          ],
        },
        {
          id: 'self-managed',
          heading: 'Selbst betriebenes GitLab',
          paragraphs: [
            'Der Connector ist nicht auf gitlab.com beschränkt — wenn Sie ihn bei der Einrichtung auf die URL Ihrer eigenen Instanz zeigen lassen, verbindet sich ClawAI genauso mit einem selbst betriebenen GitLab wie mit dem gehosteten Dienst.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Wie Sie es verbinden',
          paragraphs: [
            'GitLab unterstützt OAuth oder einen persönlichen Zugriffstoken. Beide sind auf das begrenzt, was Sie beim Verbinden gewähren — ClawAI erhält nie mehr Zugriff, als der Token oder die OAuth-Freigabe erlaubt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Funktioniert es mit selbst betriebenem GitLab?',
          answer:
            'Ja — geben Sie beim Verbinden die Instanz-URL an, dann spricht ClawAI mit Ihrer eigenen GitLab-Installation statt mit gitlab.com.',
        },
        {
          question: 'Kann es echte Codeänderungen vorschlagen, nicht nur Kommentare?',
          answer:
            'Ja, über die Aktion für Änderungsvorschläge, die einen konkreten, anwendbaren Diff-Vorschlag auf dem Merge Request postet statt eines reinen Textkommentars.',
        },
        {
          question: 'Läuft die Synchronisierung von Merge Requests in Echtzeit?',
          answer:
            'Ja — der Connector unterstützt Webhooks, sodass ClawAI über Änderungen benachrichtigt wird, statt sie abzufragen.',
        },
      ],
      productNote:
        'GitLab ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI, jeder mit eigenen Lese- und Schreibfähigkeiten, dokumentiert auf seiner eigenen Seite.',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'KI-Integration für Bitbucket — ClawAI',
        description:
          'Verbinden Sie Bitbucket Cloud mit ClawAI, um Repositories und Pull Requests zu lesen sowie zu kommentieren, zu genehmigen und Issues anzulegen — direkt aus einem Gespräch heraus.',
        keywords: [
          'KI Bitbucket Integration',
          'Bitbucket KI-Assistent',
          'KI Code-Repository durchsuchen',
        ],
      },
      eyebrow: 'Code-Hosting',
      title: 'Bitbucket',
      summary:
        'Verbinden Sie ein Bitbucket-Cloud-Konto, damit ClawAI Ihre Repositories und Pull Requests lesen und aus einem Gespräch heraus darauf handeln kann — kommentieren, genehmigen und Issues anlegen.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Repositories und Pull Requests lesen, mit Unterstützung für Echtzeit-Updates über Webhook. Die Synchronisierung liest bei jedem Lauf alles neu ein, statt inkrementellen Delta-Sync zu nutzen.',
            'Auf der Schreibseite: einen Pull Request kommentieren, einen Pull Request genehmigen und ein Issue anlegen. Jede davon ist eine ausdrückliche Handlung, nichts, das ClawAI von sich aus tut.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Wie Sie es verbinden',
          paragraphs: [
            'Bitbucket verbindet sich über OAuth — melden Sie sich mit Ihrem Atlassian-Konto an und gewähren Sie begrenzten Zugriff auf die Workspaces und Repositories Ihrer Wahl.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wird Bitbucket Server oder Data Center unterstützt?',
          answer:
            'Der Connector richtet sich an Bitbucket Cloud. Selbst gehostetes Bitbucket Server oder Data Center wird derzeit nicht unterstützt.',
        },
        {
          question: 'Kann es einen Pull Request für mich genehmigen?',
          answer:
            'Ja, wenn Sie es nach der Prüfung des Diffs darum bitten — die Genehmigung ist eine ausdrückliche Handlung, die Sie anfordern, kein automatischer Schritt.',
        },
      ],
      productNote: 'Bitbucket ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI.',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'KI-Integration für Slack — ClawAI',
        description:
          'Verbinden Sie Slack mit ClawAI, um Kanäle und Nachrichten zu durchsuchen sowie Nachrichten zu senden und zu beantworten — damit ein Gespräch auf das reagieren kann, was Ihr Team gerade bespricht.',
        keywords: [
          'KI Slack-Assistent',
          'Slack-Nachrichten durchsuchen KI',
          'Slack KI-Integration',
        ],
      },
      eyebrow: 'Kommunikation',
      title: 'Slack',
      summary:
        'Verbinden Sie einen Slack-Workspace, damit ClawAI Kanäle, Nachrichten und Nutzer lesen und in Ihrem Namen Nachrichten senden oder beantworten kann — aus einer Suche über verstreute Threads wird eine Frage, die Sie einmal stellen.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Nachrichten, Kanäle und Nutzer lesen, mit Echtzeit-Updates über Slacks Event-Webhooks — neue Nachrichten sind sichtbar, sobald sie eintreffen, statt erst bei der nächsten Abfrage.',
            'Auf der Schreibseite: eine Nachricht an einen Kanal senden und in einem Thread antworten. Beides erfordert Ihre ausdrückliche Anfrage; ClawAI postet nie von sich aus in Slack.',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: 'Wofür es sich eignet',
          paragraphs: [
            'Eine Entscheidung finden, die drei Wochen alt in einem Thread vergraben liegt, die Diskussion eines Kanals vor einem Meeting zusammenfassen oder eine Antwort entwerfen, die sich auf den Kontext mehrerer Nachrichten bezieht — genau die Art von Suche, mit der Slacks Suchfeld schlecht zurechtkommt, weil es nach Stichwörtern abgleicht, nicht nach Bedeutung.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ClawAI private Kanäle lesen?',
          answer:
            'Nur Kanäle, in denen das verbundene Konto Mitglied ist und für die es beim Verbinden Zugriff gewährt — ClawAI sieht nie mehr von einem Workspace, als der verbindende Nutzer sehen kann.',
        },
        {
          question: 'Postet es in Slack, ohne dass ich darum bitte?',
          answer:
            'Nein. Eine Nachricht zu senden oder zu beantworten ist immer eine ausdrückliche Handlung, die Sie im Gespräch anfordern.',
        },
      ],
      productNote:
        'Slack ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI, mit Echtzeit-Updates über Webhook.',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'KI-Integration für Jira — ClawAI',
        description:
          'Verbinden Sie Jira mit ClawAI, um Issues und Projekte zu lesen sowie Tickets anzulegen, zu aktualisieren und zu kommentieren — bis hin dazu, einen Figma-Kommentar direkt in ein Ticket zu verwandeln.',
        keywords: ['KI Jira-Assistent', 'KI für Jira-Tickets', 'Jira KI-Integration'],
      },
      eyebrow: 'Projektmanagement',
      title: 'Jira',
      summary:
        'Verbinden Sie eine Atlassian-Jira-Site, damit ClawAI Issues, Tickets, Projekte und Kommentare lesen und darauf handeln kann — Tickets anlegen und aktualisieren, kommentieren und einen Figma-Design-Kommentar direkt in ein Jira-Ticket oder eine User Story verwandeln.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Issues, Tickets, Projekte und Kommentare lesen, mit Echtzeit-Updates über Webhook.',
            'Auf der Schreibseite: ein Ticket anlegen, ein Ticket direkt aus einem Figma-Kommentar anlegen, eine User Story aus einer Figma-Datei entwerfen, ein Issue aktualisieren und ein Ticket kommentieren. Die Figma-zu-Jira-Aktionen sind das Markanteste daran — sie schließen den Kreis zwischen einem Design-Review und einer erfassten Arbeitsaufgabe, ohne dass irgendetwas erneut abgetippt werden muss.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Wie Sie es verbinden',
          paragraphs: [
            'Jira unterstützt OAuth oder Basisauthentifizierung mit einem API-Token, zusammen mit der URL Ihrer Jira-Site. Basisauthentifizierung eignet sich für Servicekonten und Automatisierungen, die keinen interaktiven OAuth-Ablauf durchlaufen sollen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann es automatisch ein Jira-Ticket aus einem Figma-Kommentar erstellen?',
          answer:
            'Ja, wenn Sie es darum bitten — die Aktion liest den Figma-Kommentar und erstellt in einem Schritt ein entsprechendes Jira-Ticket oder einen User-Story-Entwurf, statt dass Sie Details von Hand zwischen den beiden Tools übertragen.',
        },
        {
          question: 'Funktioniert es mit Jira Server, oder nur mit Jira Cloud?',
          answer:
            'Der Connector richtet sich an Atlassians Cloud-Jira-REST-API. Eine selbst gehostete Jira-Server-Instanz wird derzeit nicht unterstützt.',
        },
      ],
      productNote:
        'Jira ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI und arbeitet direkt mit dem Figma-Connector zusammen, um Designs nahtlos in Tickets zu übergeben.',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'KI-Integration für Confluence — ClawAI',
        description:
          'Verbinden Sie Confluence mit ClawAI, um Seiten, Spaces und Kommentare zu lesen sowie Seiten anzulegen und zu bearbeiten — sodass Dokumentation nur ein Gespräch entfernt ist.',
        keywords: [
          'KI Confluence-Assistent',
          'Confluence KI-Integration',
          'KI-Dokumentation durchsuchen',
        ],
      },
      eyebrow: 'Dokumentation',
      title: 'Confluence',
      summary:
        'Verbinden Sie eine Atlassian-Confluence-Site, damit ClawAI Seiten, Spaces und Kommentare lesen und Seiten direkt anlegen oder bearbeiten kann — aus einer Dokumentationssuche wird eine Frage, aus einer Dokumentationsaktualisierung eine Anfrage.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Seiten, Kommentare und die Spaces lesen, die sie organisieren. Dieser Connector unterstützt keine Echtzeit-Updates über Webhook — die Synchronisierung erfolgt auf Anfrage statt per Push-Benachrichtigung, sodass eine gerade eben bearbeitete Seite erst bei der nächsten Synchronisierung berücksichtigt sein kann.',
            'Auf der Schreibseite: eine Seite anlegen und eine bestehende Seite bearbeiten. Beides sind ausdrückliche Handlungen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Läuft die Confluence-Synchronisierung in Echtzeit?',
          answer:
            'Nein — anders als GitHub oder Slack schickt Confluence keine Updates aktiv an ClawAI. Inhalte werden auf Anfrage synchronisiert, nicht in dem Moment, in dem sie sich ändern.',
        },
        {
          question: 'Kann es Dokumentation für mich schreiben, nicht nur lesen?',
          answer:
            'Ja — sowohl das Anlegen als auch das Bearbeiten von Seiten sind unterstützte Schreibaktionen, jede davon eine ausdrückliche Anfrage, die Sie stellen.',
        },
      ],
      productNote: 'Confluence ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI.',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'KI-Integration für Figma — ClawAI',
        description:
          'Verbinden Sie Figma mit ClawAI, um Dateien und Kommentare zu lesen, Kommentare zu posten und einen Design-Kommentar direkt als Ticket oder User Story an Jira zu übergeben.',
        keywords: ['KI Figma-Assistent', 'Figma KI-Integration', 'Figma-zu-Jira-Automatisierung'],
      },
      eyebrow: 'Design',
      title: 'Figma',
      summary:
        'Verbinden Sie ein Figma-Konto, damit ClawAI Dateien und Kommentare lesen, einen eigenen Kommentar posten und — zusammen mit dem Jira-Connector — einen Design-Kommentar direkt in ein erfasstes Ticket oder einen User-Story-Entwurf verwandeln kann.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Figma-Dateien und ihre Kommentare lesen, mit Echtzeit-Updates über Webhook. Auf der Schreibseite kann es einen Kommentar zu einer Datei posten.',
            'Figmas größter Hebel in ClawAI entsteht im Zusammenspiel mit Jira: Ein Kommentar zu einem Design kann zu einem Jira-Ticket oder einem User-Story-Entwurf werden, ohne dass jemand den Kontext von Hand abtippt — die konkreten Aktionen finden Sie auf der Jira-Integrationsseite.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ClawAI das eigentliche Design lesen, nicht nur Kommentare?',
          answer:
            'Es kann Dateiinhalte und Kommentare über die Figma-API lesen. Was es sinnvoll über das visuelle Design zusammenfassen kann, hängt von der Datei ab — Kommentare und Struktur sind die verlässlichste Quelle.',
        },
        {
          question: 'Brauche ich für den Figma-zu-Ticket-Workflow auch den Jira-Connector?',
          answer:
            'Ja — die Figma-zu-Jira-Aktionen liegen beim Jira-Connector und setzen voraus, dass beide Verbindungen aktiv sind.',
        },
      ],
      productNote:
        'Figma ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI und entfaltet den größten Nutzen im Zusammenspiel mit Jira.',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'KI-Integration für ClickUp — ClawAI',
        description:
          'Verbinden Sie ClickUp mit ClawAI, um Aufgaben, Spaces und Ordner zu lesen sowie Aufgaben anzulegen, zu aktualisieren und zu kommentieren — direkt aus einem Gespräch heraus.',
        keywords: ['KI ClickUp-Assistent', 'ClickUp KI-Integration', 'KI-Aufgabenverwaltung'],
      },
      eyebrow: 'Projektmanagement',
      title: 'ClickUp',
      summary:
        'Verbinden Sie einen ClickUp-Workspace, damit ClawAI Aufgaben, Spaces und Ordner lesen und Aufgaben direkt aus einem Gespräch heraus anlegen, aktualisieren oder kommentieren kann.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Aufgaben, Spaces, Ordner und Kommentare lesen. Dieser Connector unterstützt derzeit keine Echtzeit-Updates über Webhook — die zugrunde liegende Webhook-Zustellung lässt sich nicht als authentisch verifizieren, daher erfolgt die Synchronisierung auf Anfrage statt per Push.',
            'Auf der Schreibseite: eine Aufgabe anlegen, eine Aufgabe aktualisieren und eine Aufgabe kommentieren.',
          ],
        },
      ],
      faq: [
        {
          question: 'Aktualisiert sich ClickUp in Echtzeit?',
          answer:
            'Nein — die Synchronisierung erfolgt auf Anfrage, nicht über eine Live-Push-Benachrichtigung. Behandeln Sie es wie Confluence oder Google Drive: aktuell zum Stand der letzten Synchronisierung, nicht live.',
        },
        {
          question: 'Kann es eine Aufgabe zwischen Status verschieben?',
          answer:
            'Aufgabenaktualisierungen umfassen Status- und Feldänderungen an einer bestehenden Aufgabe; welche Felder genau aktualisierbar sind, hängt davon ab, wie Ihr ClickUp-Workspace konfiguriert ist.',
        },
      ],
      productNote:
        'ClickUp ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI. Die Synchronisierung folgt einem Zeitplan, nicht Echtzeit.',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'KI-Integration für Google Drive — ClawAI',
        description:
          'Verbinden Sie Google Drive mit ClawAI, um Dokumente und Tabellen zu lesen sowie Dateien hochzuladen und zu verschieben — mit Unterstützung dafür, nur Änderungen zu synchronisieren.',
        keywords: [
          'KI Google-Drive-Assistent',
          'KI-Dokumentensuche',
          'Google Drive KI-Integration',
        ],
      },
      eyebrow: 'Dateien',
      title: 'Google Drive',
      summary:
        'Verbinden Sie ein Google-Drive-Konto, damit ClawAI Dateien, Dokumente und Tabellen lesen und Dateien hochladen oder verschieben kann — mit Delta-Sync, sodass ein großes Drive beim erneuten Synchronisieren nicht jedes Mal komplett neu gelesen werden muss.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Dateien, Dokumente und Tabellen lesen. Dieser Connector unterstützt Delta-Sync — nach dem ersten vollständigen Einlesen holen spätere Synchronisierungen nur noch das, was sich tatsächlich geändert hat, was bei einem Drive mit Tausenden Dateien spürbar ins Gewicht fällt. Echtzeit-Updates über Webhook werden derzeit nicht unterstützt; die Synchronisierung erfolgt auf Anfrage.',
            'Auf der Schreibseite: eine Datei hochladen und eine Datei zwischen Ordnern verschieben.',
          ],
        },
      ],
      faq: [
        {
          question: 'Erhält ClawAI beim Verbinden von Drive Zugriff auf alles darin?',
          answer:
            'Nur das, wofür das verbundene Google-Konto während OAuth Zugriff gewährt — üblicherweise begrenzt auf Dateien, die das Konto ohnehin öffnen kann, keine organisationsweite Freigabe.',
        },
        {
          question: 'Ist das erneute Synchronisieren eines großen Drives jedes Mal langsam?',
          answer:
            'Die erste Synchronisierung liest, was sie braucht; Delta-Sync bedeutet, dass spätere Synchronisierungen nur Änderungen abrufen, sodass es nicht langsamer wird, je größer das Drive wird, sobald die erste Synchronisierung abgeschlossen ist.',
        },
      ],
      productNote:
        'Google Drive ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI, mit Delta-Sync für große Bibliotheken.',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'KI-Integration für Gmail — ClawAI',
        description:
          'Verbinden Sie Gmail mit ClawAI, um Threads und Nachrichten zu lesen sowie E-Mails zu senden, zu beantworten und als Entwurf anzulegen — direkt aus einem Gespräch heraus.',
        keywords: ['KI Gmail-Assistent', 'KI E-Mail-Integration', 'Gmail KI-Integration'],
      },
      eyebrow: 'E-Mail',
      title: 'Gmail',
      summary:
        'Verbinden Sie ein Gmail-Konto, damit ClawAI Threads, Nachrichten und Labels lesen und E-Mails direkt aus einem Gespräch heraus senden, beantworten oder als Entwurf anlegen kann — mit Delta-Sync, sodass nicht bei jeder Prüfung das gesamte Postfach neu gelesen wird.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann E-Mail-Threads, Nachrichten und Labels lesen, mit Delta-Sync. Echtzeit-Push-Benachrichtigungen für neue E-Mails werden derzeit nicht unterstützt — die Synchronisierung erfolgt auf Anfrage.',
            'Auf der Schreibseite: eine neue E-Mail senden, einen bestehenden Thread beantworten und einen Entwurf anlegen, ohne ihn zu senden — nützlich, wenn ClawAI eine Antwort vorbereiten soll, die Sie vor dem Versand noch prüfen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Sendet ClawAI E-Mails, ohne dass ich sie freigebe?',
          answer:
            'Nein. Das Senden ist eine ausdrückliche Handlung; die Entwurfsaktion existiert genau für die Fälle, in denen Sie vor dem Versand noch prüfen möchten.',
        },
        {
          question: 'Prüft es fortlaufend mein Postfach?',
          answer:
            'Es synchronisiert auf Anfrage statt über eine Live-Push-Verbindung, sodass neue E-Mails erst zum Stand der letzten Synchronisierung sichtbar sind, nicht sofort.',
        },
      ],
      productNote: 'Gmail ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'KI-Integration für SharePoint — ClawAI',
        description:
          'Verbinden Sie Microsoft SharePoint mit ClawAI, um Dokumente und Site-Listen zu lesen sowie Dokumente hochzuladen und Listenelemente zu verwalten — direkt aus einem Gespräch heraus.',
        keywords: [
          'KI SharePoint-Assistent',
          'SharePoint KI-Integration',
          'KI-Dokumentensuche Microsoft',
        ],
      },
      eyebrow: 'Dateien',
      title: 'Microsoft SharePoint',
      summary:
        'Verbinden Sie eine Microsoft-SharePoint-Site, damit ClawAI Dokumente, Dateien und Site-Listen lesen und Dokumente direkt aus einem Gespräch heraus hochladen oder Listenelemente verwalten kann.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Dokumente, Dateien und die Listen lesen, die eine SharePoint-Site organisieren. Die Synchronisierung erfolgt auf Anfrage, nicht über eine Echtzeit-Push-Verbindung.',
            'Auf der Schreibseite: ein Dokument hochladen, ein Listenelement anlegen und ein bestehendes Listenelement aktualisieren.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Wie Sie es verbinden',
          paragraphs: [
            'SharePoint benötigt neben OAuth Ihre Microsoft-Tenant-ID, damit der Connector weiß, welche SharePoint-Umgebung er ansprechen soll.',
          ],
        },
      ],
      faq: [
        {
          question: 'Braucht es meine Microsoft-365-Tenant-ID?',
          answer:
            'Ja — SharePoint ist an einen Tenant gebunden, daher braucht der Connector Ihre Tenant-ID, um zu wissen, mit welcher Organisation er sich verbinden soll.',
        },
        {
          question: 'Werden Inhalte in Echtzeit aktualisiert?',
          answer:
            'Nein — die Synchronisierung erfolgt auf Anfrage, nicht über eine Live-Push-Benachrichtigung.',
        },
      ],
      productNote: 'SharePoint ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'KI-Integration für OneDrive — ClawAI',
        description:
          'Verbinden Sie Microsoft OneDrive mit ClawAI, um Dateien und Dokumente zu lesen sowie Dateien hochzuladen und zu verschieben — mit Unterstützung dafür, nur Änderungen zu synchronisieren.',
        keywords: ['KI OneDrive-Assistent', 'OneDrive KI-Integration', 'KI-Dateisuche Microsoft'],
      },
      eyebrow: 'Dateien',
      title: 'Microsoft OneDrive',
      summary:
        'Verbinden Sie ein Microsoft-OneDrive-Konto, damit ClawAI Dateien und Dokumente lesen und direkt aus einem Gespräch heraus hochladen oder verschieben kann — mit Delta-Sync für große Bibliotheken.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Dateien und Dokumente lesen, mit Delta-Sync — nach dem ersten vollständigen Einlesen holen spätere Synchronisierungen nur noch, was sich geändert hat. Echtzeit-Push-Benachrichtigungen werden derzeit nicht unterstützt; die Synchronisierung erfolgt auf Anfrage.',
            'Auf der Schreibseite: eine Datei hochladen und eine Datei zwischen Ordnern verschieben.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Wie Sie es verbinden',
          paragraphs: [
            'OneDrive benötigt neben OAuth Ihre Microsoft-Tenant-ID, genau wie SharePoint.',
          ],
        },
      ],
      faq: [
        {
          question: 'Braucht es meine Microsoft-365-Tenant-ID?',
          answer: 'Ja, genau wie SharePoint — OneDrive for Business ist an einen Tenant gebunden.',
        },
        {
          question: 'Ist ein großes OneDrive langsam zu synchronisieren?',
          answer:
            'Die erste Synchronisierung ist die aufwendige; Delta-Sync bedeutet, dass nachfolgende Synchronisierungen nur das abrufen, was sich tatsächlich geändert hat.',
        },
      ],
      productNote:
        'OneDrive ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI, mit Delta-Sync für große Bibliotheken.',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'KI-Integration für Google Calendar — ClawAI',
        description:
          'Verbinden Sie Google Calendar mit ClawAI, um Meetings und Termine zu lesen sowie einen Kalendertermin anzulegen — direkt aus einem Gespräch heraus.',
        keywords: [
          'KI Google-Calendar-Assistent',
          'Google Calendar KI-Integration',
          'KI Termin planen',
        ],
      },
      eyebrow: 'Kalender',
      title: 'Google Calendar',
      summary:
        'Verbinden Sie einen Google Calendar, damit ClawAI Ihre Meetings und Termine lesen und direkt aus einem Gespräch heraus einen neuen Kalendertermin anlegen kann — mit Delta-Sync, damit die Prüfung Ihres Terminplans schnell bleibt.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Meetings und Termine lesen, mit Delta-Sync. Echtzeit-Push-Benachrichtigungen werden derzeit nicht unterstützt.',
            'Auf der Schreibseite unterstützt der Connector derzeit eine Aktion: einen Kalendertermin anlegen. Eine bestehende Einladung zu verschieben, zu löschen oder darauf zu antworten, wird als Schreibaktion noch nicht unterstützt — diese Seite wird aktualisiert, sobald sich das ändert.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ClawAI ein bestehendes Meeting für mich verschieben?',
          answer:
            'Noch nicht — der Connector unterstützt derzeit das Anlegen eines neuen Termins, nicht das Bearbeiten oder Verschieben eines bestehenden.',
        },
        {
          question:
            'Sieht es meinen gesamten Kalender, einschließlich anderer Kalender, auf die ich Zugriff habe?',
          answer:
            'Der Zugriff ist auf das begrenzt, was Sie beim Verbinden gewähren — üblicherweise Ihr primärer Kalender, sofern Sie das nicht ausdrücklich erweitern.',
        },
      ],
      productNote:
        'Google Calendar ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI. Seine Schreibaktion ist derzeit auf das Anlegen von Terminen beschränkt.',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'KI-Integration für Outlook Calendar — ClawAI',
        description:
          'Verbinden Sie Outlook Calendar mit ClawAI, um Meetings und Termine zu lesen sowie einen Kalendertermin anzulegen — direkt aus einem Gespräch heraus.',
        keywords: [
          'KI Outlook-Calendar-Assistent',
          'Outlook KI-Integration',
          'KI Termin planen Microsoft',
        ],
      },
      eyebrow: 'Kalender',
      title: 'Outlook Calendar',
      summary:
        'Verbinden Sie einen Microsoft Outlook Calendar, damit ClawAI Ihre Meetings und Termine lesen und direkt aus einem Gespräch heraus einen neuen Kalendertermin anlegen kann.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'Was der Connector abdeckt',
          paragraphs: [
            'ClawAI kann Meetings und Termine lesen. Dieser Connector unterstützt derzeit weder Delta-Sync noch Echtzeit-Push-Benachrichtigungen — jede Synchronisierung liest auf Anfrage, was sie braucht.',
            'Auf der Schreibseite unterstützt der Connector derzeit eine Aktion: einen Kalendertermin anlegen. Eine bestehende Einladung zu verschieben, zu löschen oder darauf zu antworten, wird noch nicht unterstützt.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Wie Sie es verbinden',
          paragraphs: [
            'Outlook Calendar unterstützt OAuth mit einer optionalen Tenant-ID — leer lassen, um Microsofts Multi-Tenant-Endpunkt zu nutzen, oder für eine bestimmte Organisation angeben.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ClawAI ein bestehendes Meeting für mich verschieben?',
          answer: 'Noch nicht — derzeit wird nur das Anlegen eines neuen Termins unterstützt.',
        },
        {
          question: 'Muss ich eine Tenant-ID angeben?',
          answer:
            'Nur, wenn der Connector auf eine bestimmte Microsoft-Organisation begrenzt sein soll. Lässt man das Feld leer, wird der Multi-Tenant-Endpunkt verwendet, der für die meisten privaten und organisatorischen Konten funktioniert.',
        },
      ],
      productNote:
        'Outlook Calendar ist einer von {connectorCount} Arbeitsbereich-Connectors in ClawAI. Seine Schreibaktion ist derzeit auf das Anlegen von Terminen beschränkt.',
    },
  },
};
