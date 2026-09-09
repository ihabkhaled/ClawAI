import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCasesClusterDictionary } from '@/types/use-cases-cluster.types';

export const DE_USE_CASES_CLUSTER_CONTENT: UseCasesClusterDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufig gestellte Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt geprüft',
    backToHub: 'Alle Anwendungsfälle',
    ctaTitle: 'Selbst ausprobieren statt uns nur zu glauben',
    ctaBody:
      'ClawAI leitet eine Unterhaltung an das passende Modell und die passenden Tools weiter, über jeden angebundenen Anbieter hinweg, aus einem einzigen Workspace heraus.',
    startFree: 'Kostenlos starten',
    seeFeatures: 'Was ClawAI kann',
  },
  hub: {
    tasksHeading: 'Tiefer in eine bestimmte Aufgabe einsteigen',
    tasksIntro:
      'Die Fälle oben sind die Kurzfassung. Jede der sieben folgenden Aufgaben ist eine eigene Seite: was die Aufgabe tatsächlich braucht, welche Funktion oder welcher Routing-Modus von ClawAI sie übernimmt, und wo Sie die Details selbst nachprüfen können.',
    cardSummaries: {
      [UseCaseTask.CODING_AND_DEVELOPMENT]:
        'Code schreiben, bearbeiten und überprüfen, mit dem Coding-Agenten für mehrstufige Änderungen.',
      [UseCaseTask.RESEARCH_AND_FACT_FINDING]:
        'Antworten, die auf Quellen beruhen, die ClawAI tatsächlich recherchiert hat, nicht nur auf Trainingsdaten.',
      [UseCaseTask.WRITING_AND_EDITING]:
        'Langtext-Entwürfe und Überarbeitungen, die über ein ganzes Dokument hinweg konsistent bleiben.',
      [UseCaseTask.COMPARING_MODEL_ANSWERS]:
        'Denselben Prompt über mehrere Modelle nebeneinander laufen lassen und einen Rest von einem Modell bewerten lassen.',
      [UseCaseTask.WORKSPACE_AUTOMATION]:
        'Die Tools anbinden, die Ihr Team bereits nutzt, damit ClawAI direkt in ihnen handeln kann.',
      [UseCaseTask.STRUCTURED_DATA_EXTRACTION]:
        'Unübersichtlichen Text oder Seiten in strukturierte Ausgaben umwandeln, die Ihre eigenen Systeme verarbeiten können.',
      [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]:
        'Eine Anfrage auf Hardware halten, die Sie selbst kontrollieren, statt bei einem Cloud-Anbieter.',
    },
  },
  tasks: {
    [UseCaseTask.CODING_AND_DEVELOPMENT]: {
      seo: {
        title: 'Programmieren und Entwicklung mit ClawAI',
        description:
          'Wie ClawAI Programmierarbeit unterstützt — Chat mit einem Modell für eine schnelle Korrektur, oder eine mehrstufige Änderung an den Coding-Agenten übergeben. Basiert auf dem Produkt, keine erfundenen Benchmarks.',
        keywords: [
          'KI fürs Programmieren',
          'Anwendungsfall Coding-Agent',
          'KI-Pair-Programming-Arbeitsablauf',
        ],
      },
      eyebrow: 'Anwendungsfall',
      title: 'Programmieren und Entwicklung',
      summary:
        'Programmierarbeit in ClawAI hat zwei Formen: eine kurze Frage oder eine Änderung an einer einzelnen Datei, beantwortet in einem gewöhnlichen Chat, und eine mehrstufige Änderung — mehrere Dateien, ein Plan, eine Überprüfung —, die an den Coding-Agenten übergeben wird. Beide teilen sich darunter dasselbe Routing und denselben Anbieterkatalog.',
      sections: [
        {
          id: 'quick-fixes-in-chat',
          heading: 'Schnelle Korrekturen und Fragen im gewöhnlichen Chat',
          paragraphs: [
            'Eine Änderung an einer einzelnen Datei, die Erklärung eines Fehlers oder ein kurzes Refactoring ist eine gewöhnliche ClawAI-Chatnachricht wie jede andere. Der Router kann sie unter Auto- oder High-Reasoning-Routing an ein passendes Modell senden, oder Sie legen im Manual-Model-Modus ein bestimmtes fest, wenn Sie bereits wissen, welches Modell eine wiederkehrende Art von Frage braucht — was dabei abzuwägen ist, steht auf der unten verlinkten Seite zur Modellwahl fürs Programmieren.',
          ],
        },
        {
          id: 'multi-step-changes-with-the-coding-agent',
          heading: 'Mehrstufige Änderungen mit dem Coding-Agenten',
          paragraphs: [
            'Für eine Änderung, die sich über mehrere Dateien oder Schritte erstreckt — ein Feature, eine Migration, ein Refactoring mit Plan — durchläuft der Coding-Agent von ClawAI eine turnbasierte Schleife über Ihre Codebasis, statt in einer einzigen Nachricht zu antworten, mit einer eigenen, separat gemessenen Nutzungsfläche gegenüber dem gewöhnlichen Chat. Auf der unten verlinkten Seite zum Coding-Agenten erfahren Sie, was er tut und wie er installiert wird.',
          ],
        },
        {
          id: 'connecting-your-repository',
          heading: 'Das Repository anbinden, das die Arbeit betrifft',
          paragraphs: [
            'Programmierarbeit braucht oft das Repository selbst im Blick, nicht nur eingefügte Ausschnitte — ClawAI bindet GitHub, GitLab und Bitbucket als Workspace-Connectoren an, sodass sich eine Anfrage auf den tatsächlichen Code, Issues oder Pull Requests beziehen kann, statt dass Sie Dateien von Hand hineinkopieren. Die vollständige Liste der Connectoren finden Sie auf der unten verlinkten Integrationsseite.',
          ],
        },
      ],
      faq: [
        {
          question: 'Schreibt ClawAI automatisch Code für mich?',
          answer:
            'Bei einer kleinen, klar spezifizierten Änderung reicht oft eine gewöhnliche Chatnachricht. Bei einer mehrstufigen Änderung über mehrere Dateien hinweg durchläuft der Coding-Agent eine turnbasierte Schleife über Ihre Codebasis, statt einmalig zu antworten — siehe die unten verlinkte Seite zum Coding-Agenten.',
        },
        {
          question: 'Kann ClawAI mein tatsächliches Repository sehen?',
          answer:
            'Ja, sobald Sie es anbinden — ClawAI hat Workspace-Connectoren für GitHub, GitLab und Bitbucket, sodass sich eine Programmieranfrage auf echte Dateien, Issues und Pull Requests beziehen kann, statt auf eingefügte Ausschnitte.',
        },
        {
          question: 'Welches Modell sollte ich fürs Programmieren nutzen?',
          answer:
            'Diese Seite nennt keins — was stattdessen abzuwägen ist, statt einer Rangliste, steht auf der unten verlinkten Seite zur Modellwahl fürs Programmieren.',
        },
      ],
      productNote:
        'ClawAI leitet eine gewöhnliche Programmierfrage automatisch an ein passendes Modell weiter und übergibt eine mehrstufige Änderung an den Coding-Agenten — eine reale, bereits ausgelieferte Funktion mit eigener gemessener Nutzung, kein Chat-Trick.',
    },
    [UseCaseTask.RESEARCH_AND_FACT_FINDING]: {
      seo: {
        title: 'Recherche und Faktenfindung mit ClawAI',
        description:
          'Wie der Research-Modus von ClawAI im Web sucht, Seiten abruft und extrahiert, sodass eine Antwort Quellen zitiert, die tatsächlich recherchiert wurden — getrennt vom Modellguthaben abgerechnet.',
        keywords: ['KI-Rechercheassistent', 'Faktenfindung mit KI', 'KI-Antworten mit Quellen'],
      },
      eyebrow: 'Anwendungsfall',
      title: 'Recherche und Faktenfindung',
      summary:
        'Eine Rechercheaufgabe verlangt eine Antwort, die auf Quellen beruht, die für genau diese Frage recherchiert wurden, nicht nur auf dem, was ein Modell während des Trainings gelernt hat. Der Research-Modus von ClawAI ist eine bereits ausgelieferte Funktion genau dafür, mit drei Tiefenstufen und einer eigenen Messung getrennt vom gewöhnlichen Chat.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Was der Research-Modus tatsächlich tut',
          paragraphs: [
            'Der Research-Modus lässt eine Anfrage das Web durchsuchen, eine Seite abrufen oder strukturierte Inhalte aus einer Seite abrufen und extrahieren, bevor ClawAI eine Antwort erstellt — sodass die Antwort Quellen zitieren kann, die für genau diese Frage abgerufen wurden, statt sich nur auf Trainingsdaten zu verlassen. Es handelt sich um eine planabhängige Funktion mit drei Tiefenstufen: nur Suche, Suche plus Abruf, oder Suche plus Abruf und Extraktion.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Getrennt von Ihrem Modellguthaben gemessen',
          paragraphs: [
            'Der Recherchezugriff — Websuche, Seitenabrufe und Extraktion — wird als eigene Nutzung gemessen, getrennt vom Token-Kontingent, das eine gewöhnliche Chatnachricht in Anspruch nimmt. Das Recherche-Kontingent Ihres Plans und sein Modell-Token-Kontingent sind zwei getrennte Positionen, kein gemeinsamer Vorrat — Recherche zehrt also nicht das Guthaben auf, das eine Programmier- oder Schreibaufgabe nutzen würde.',
          ],
        },
        {
          id: 'picking-a-depth-for-the-question',
          heading: 'Die passende Tiefe für die jeweilige Frage wählen',
          paragraphs: [
            'Eine schnelle Faktenprüfung braucht meist nur die reine Suche; eine Frage, bei der es darauf ankommt, was eine bestimmte Seite tatsächlich sagt, verlangt Suche plus Abruf; strukturierte Daten aus mehreren Seiten gleichzeitig herauszuziehen ist der Fall, in dem sich Suche plus Abruf und Extraktion lohnt. Die Tiefe an die Frage anzupassen hält die Recherchenutzung angemessen, statt jedes Mal automatisch zur teuersten Option zu greifen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Nutzt Recherche mein Modell-Token-Guthaben?',
          answer:
            'Nein. Der Recherchezugriff — Websuche, Seitenabrufe und Extraktion — wird getrennt vom Token-Kontingent gemessen, das eine gewöhnliche Chatnachricht in Anspruch nimmt. Beide Kontingente können Sie auf der Preisseite prüfen.',
        },
        {
          question: 'Was ist der Unterschied zwischen den drei Tiefenstufen des Research-Modus?',
          answer:
            'Nur Suche liefert Ergebnisse aus einer Websuche; Suche plus Abruf ruft zusätzlich den Seiteninhalt ab; Suche plus Abruf und Extraktion zieht darüber hinaus strukturierte Inhalte aus dem Abgerufenen.',
        },
        {
          question: 'Spielt das gewählte Modell für die Qualität der Recherche eine Rolle?',
          answer:
            'Ja — der Research-Modus ändert, welche Quellen ein Modell sehen kann, nicht wie gut es sie liest und miteinander in Einklang bringt. Siehe die unten verlinkte Seite zur Modellwahl für Recherche mit Quellen.',
        },
      ],
      productNote:
        'Der Research-Modus von ClawAI kann suchen, abrufen sowie abrufen und extrahieren, bevor ein Modell antwortet — eine reale, bereits ausgelieferte Funktion, getrennt von Ihrem Modell-Token-Guthaben gemessen.',
    },
    [UseCaseTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Schreiben und Überarbeiten mit ClawAI',
        description:
          'Wie ClawAI Langtext-Entwürfe und Überarbeitungen unterstützt — Context Packs für Referenzmaterial, Memory für eine wiederkehrende Stilvorgabe, und Routing an ein passendes Modell.',
        keywords: ['KI-Schreibassistent', 'KI-Überarbeitungsworkflow', 'Langtext-Entwürfe mit KI'],
      },
      eyebrow: 'Anwendungsfall',
      title: 'Schreiben und Überarbeiten',
      summary:
        'Schreiben und Überarbeiten in ClawAI reicht von einer kurzen Umformulierung bis zu einem langen Dokument, das von der ersten bis zur letzten Seite konsistent bleiben muss. Sobald ein Dokument länger wird, tragen zwei Funktionen den größten Teil der Last: Context Packs für Referenzmaterial und Memory für eine Stilvorgabe, die über Sitzungen hinweg bestehen bleiben soll.',
      sections: [
        {
          id: 'reference-material-with-context-packs',
          heading: 'Referenzmaterial mit Context Packs im Blick behalten',
          paragraphs: [
            'Ein Style-Brief, frühere Entwürfe oder Quellmaterial, mit dem ein Text konsistent bleiben muss, ist zuerst ein Kontextproblem und erst danach ein Schreibproblem — die Context Packs von ClawAI sind eine planabhängige Funktion, um dieses Material einer Unterhaltung verfügbar zu halten, statt es jede Sitzung neu einzufügen. Was diese Funktion genau tut, erfahren Sie auf der unten verlinkten Seite zu Context Packs.',
          ],
        },
        {
          id: 'memory-for-a-recurring-voice',
          heading: 'Memory für einen Ton, der bestehen bleiben soll',
          paragraphs: [
            'Eine wiederkehrende Schreibaufgabe — ein Newsletter, ein wöchentlicher Bericht, eine Dokumentationsvorgabe — profitiert davon, dass ClawAI etablierte Vorlieben über Sitzungen hinweg im Gedächtnis behält, statt sie jedes Mal neu zu formulieren. Memory ist eine von Context Packs getrennte, ebenfalls planabhängige Funktion: Context Packs halten Referenzmaterial für eine Aufgabe, Memory hält fest, was ClawAI darüber gelernt hat, wie Sie Dinge geschrieben haben möchten.',
          ],
        },
        {
          id: 'routing-a-writing-request',
          heading: 'Eine Schreib- oder Überarbeitungsanfrage an ein passendes Modell weiterleiten',
          paragraphs: [
            'Der Router von ClawAI kann eine Schreib- oder Überarbeitungsanfrage unter Auto- oder Cost-Saver-Routing automatisch an ein passendes Modell senden, oder Sie legen im Manual-Model-Modus ein bestimmtes für eine wiederkehrende Aufgabe mit bekannter Stilvorgabe fest. Was dabei bewusst abzuwägen ist, steht auf der unten verlinkten Seite zur Modellwahl fürs Schreiben und Überarbeiten.',
          ],
        },
      ],
      faq: [
        {
          question:
            'Kann ClawAI einen Style-Brief über eine ganze Überarbeitungssitzung hinweg im Blick behalten?',
          answer:
            'Ja — genau dafür sind Context Packs gebaut: Sie halten Referenzmaterial wie einen Style-Brief oder ein Quelldokument einer Unterhaltung verfügbar, statt es neu einzufügen. Siehe die unten verlinkte Seite zu Context Packs.',
        },
        {
          question: 'Merkt sich ClawAI, wie ich Dinge geschrieben haben möchte?',
          answer:
            'Memory kann etablierte Vorlieben über Sitzungen hinweg für eine wiederkehrende Schreibaufgabe im Gedächtnis behalten, getrennt von Context Packs, die aufgabenspezifisches Referenzmaterial halten und keine langfristigen Vorlieben.',
        },
        {
          question: 'Welches Modell sollte ich zum Schreiben nutzen?',
          answer:
            'Diese Seite nennt keins — was stattdessen abzuwägen ist, statt einer Rangliste, steht auf der unten verlinkten Seite zur Modellwahl fürs Schreiben und Überarbeiten.',
        },
      ],
      productNote:
        'ClawAI kann Referenzmaterial mit Context Packs im Blick behalten und eine wiederkehrende Stilvorgabe mit Memory im Gedächtnis behalten — beides reale, planabhängige Funktionen, keine Chat-Tricks.',
    },
    [UseCaseTask.COMPARING_MODEL_ANSWERS]: {
      seo: {
        title: 'Modellantworten vergleichen mit ClawAI',
        description:
          'Wie die Compare- und Judge-Modi von ClawAI einen Prompt über mehrere Modelle nebeneinander laufen lassen und ein Judge-Modell die Ergebnisse bewertet — basiert auf der ausgelieferten Funktion, keine erfundenen Ranglisten.',
        keywords: ['KI-Modellantworten vergleichen', 'KI-Modellkonsens', 'Best-of-N-KI-Antworten'],
      },
      eyebrow: 'Anwendungsfall',
      title: 'Modellantworten vergleichen',
      summary:
        'Manchmal besteht der richtige Schritt nicht darin, im Voraus ein Modell auszuwählen, sondern denselben Prompt über mehrere laufen zu lassen und sich anzusehen, was zurückkommt. Der Compare-Modus von ClawAI tut genau das, und der Judge-Modus kann ein separates Modell die Ergebnisse bewerten lassen, statt dass Sie jede Antwort selbst lesen müssen.',
      sections: [
        {
          id: 'what-compare-mode-does',
          heading: 'Was der Compare-Modus tut',
          paragraphs: [
            'Der Compare-Modus sendet einen Prompt gleichzeitig an mehrere Modelle und zeigt die Antworten nebeneinander an, sodass eine wichtige Entscheidung — eine Ermessensfrage, eine mehrdeutige Anfrage, ein Fall, in dem die Herangehensweise eines einzelnen Modells falsch sein könnte — mehr als eine Perspektive erhält. Es handelt sich um eine planabhängige Funktion, die pro Spur gemessen wird, nicht pro Durchlauf, sodass die Kosten mit der Zahl der verglichenen Modelle steigen.',
          ],
        },
        {
          id: 'consensus-and-best-of-n',
          heading: 'Konsens und Best-of-N richtig erklärt',
          paragraphs: [
            'Zwei Begriffe beschreiben, was Sie mit mehreren Antworten tun, sobald Sie sie vorliegen haben: Konsens, bei dem die Übereinstimmung zwischen Modellen selbst aussagekräftig ist, und Best-of-N, bei dem Sie mehrere Kandidaten erzeugen und die stärkste Antwort auswählen oder daraus zusammenführen. Wie beides tatsächlich funktioniert, statt einer werblichen Vereinfachung, erfahren Sie auf den unten verlinkten Seiten „Was ist KI-Konsens“ und „Was ist Best-of-N“.',
          ],
        },
        {
          id: 'judge-mode-and-critic-review',
          heading: 'Ein Modell den Rest bewerten lassen',
          paragraphs: [
            'Der Judge-Modus ist eine separate, planabhängige Funktion, die einen zweiten Durchgang über einen Compare-Lauf ausführt, wobei ein Modell die anderen bewertet, statt dass Sie jede Antwort von Hand lesen. Critic Review ist eine verwandte, eigenständige Funktion für einen zweiten Blick auf eine einzelne Antwort statt auf einen Vergleich über mehrere Modelle — wie die Bewertung tatsächlich funktioniert, erfahren Sie auf der unten verlinkten Seite „Was ist ein KI-Judge“.',
          ],
        },
      ],
      faq: [
        {
          question: 'Was ist der Unterschied zwischen dem Compare-Modus und dem Judge-Modus?',
          answer:
            'Der Compare-Modus sendet einen Prompt an mehrere Modelle und zeigt jede Antwort nebeneinander an. Der Judge-Modus ist ein separater, planabhängiger zweiter Durchgang, bei dem ein Modell die Ergebnisse eines Compare-Laufs bewertet, statt dass Sie jede Antwort selbst lesen.',
        },
        {
          question: 'Kostet der Compare-Modus mehr als eine gewöhnliche Chatnachricht?',
          answer:
            'Die Nutzung des Compare-Modus wird pro Spur gemessen, nicht pro Durchlauf — denselben Prompt gegen mehr Modelle laufen zu lassen kostet entsprechend mehr. Das aktuelle Kontingent können Sie auf der Preisseite prüfen.',
        },
        {
          question: 'Was ist Best-of-N, und ist das dasselbe wie Konsens?',
          answer:
            'Nein — Konsens betrachtet die Übereinstimmung zwischen Modellantworten selbst als aussagekräftig, während Best-of-N mehrere Kandidaten erzeugt und die stärkste Antwort auswählt oder daraus zusammenführt. Siehe die unten verlinkten Seiten „Was ist KI-Konsens“ und „Was ist Best-of-N“.',
        },
      ],
      productNote:
        'Die Compare- und Judge-Modi von ClawAI sind reale, bereits ausgelieferte, planabhängige Funktionen — ein Prompt über mehrere Modelle, mit einem optionalen zweiten Modell, das die Ergebnisse bewertet.',
    },
    [UseCaseTask.WORKSPACE_AUTOMATION]: {
      seo: {
        title: 'Workspace-Automatisierung mit ClawAI',
        description:
          'Wie ClawAI die Tools anbindet, die ein Team bereits nutzt — GitHub, Slack, Jira, Google Drive und mehr —, sodass eine Anfrage darin handeln kann, statt nur darüber zu sprechen.',
        keywords: [
          'KI-Workspace-Automatisierung',
          'KI-Tool-Connectoren',
          'KI mit Slack und Jira verbinden',
        ],
      },
      eyebrow: 'Anwendungsfall',
      title: 'Workspace-Automatisierung',
      summary:
        'Ein Workspace-Connector lässt eine ClawAI-Anfrage aus einem Tool lesen, das Ihr Team bereits betreibt, oder darin handeln, statt dass Sie Informationen von Hand hin- und herkopieren. ClawAI hat heute 14 Workspace-Connectoren, die Codehosting, Chat, Projektverfolgung, Dokumente und Kalender abdecken.',
      sections: [
        {
          id: 'what-a-workspace-connector-is',
          heading: 'Was ein Workspace-Connector tatsächlich tut',
          paragraphs: [
            'Ein angebundener Workspace lässt eine Anfrage auf echte Daten in diesem Tool verweisen oder darin handeln — ein Jira-Ticket, ein Slack-Thread, eine Datei in Google Drive —, statt dass Sie es in die Unterhaltung einfügen. Der Workspace-Zugriff ist eine planabhängige Funktion, und Connector-Aktionen werden als eigene Fläche gemessen, getrennt vom gewöhnlichen Chat.',
          ],
        },
        {
          id: 'which-tools-connect',
          heading: 'Welche Tools ClawAI anbindet',
          paragraphs: [
            'Die Connectoren von ClawAI decken Codehosting (GitHub, GitLab, Bitbucket), Messaging und Projektverfolgung (Slack, Jira, Confluence, ClickUp), Design (Figma), Dokumente und Speicher (Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive) sowie Kalender (Google Calendar, Outlook Calendar) ab. Was jeder einzelne tut, erfahren Sie auf der unten verlinkten Integrationsseite.',
          ],
        },
        {
          id: 'multi-model-review-and-handoff',
          heading: 'Mehrmodell-Überprüfung und Übergabe innerhalb einer Workspace-Aktion',
          paragraphs: [
            'Eine Workspace-Aktion kann mehr als einen einzelnen Modellaufruf umfassen — ein Schritt mit verketteter Ausarbeitung oder Übergabe, oder eine Mehrmodell-Überprüfung des Ergebnisses, bevor darauf gehandelt wird, ist Teil derselben gemessenen Fläche, keine separat zu aktivierende Funktion. Es ist dieselbe Routing-Infrastruktur, die der Rest von ClawAI nutzt, angewendet auf Aktionen, die ein angebundenes Tool betreffen.',
          ],
        },
      ],
      faq: [
        {
          question: 'An wie viele Tools bindet ClawAI heute an?',
          answer:
            'Vierzehn Workspace-Connectoren heute, die Codehosting, Messaging, Projektverfolgung, Design, Dokumente, Speicher und Kalender abdecken. Die vollständige Liste finden Sie auf der unten verlinkten Integrationsseite.',
        },
        {
          question: 'Kann ClawAI in einem angebundenen Tool handeln, oder nur daraus lesen?',
          answer:
            'Workspace-Aktionen können in einem angebundenen Tool handeln, nicht nur daraus lesen — die Details hängen vom jeweiligen Connector und vom Workspace-Kontingent Ihres Plans ab.',
        },
        {
          question: 'Wird Workspace-Automatisierung getrennt vom gewöhnlichen Chat gemessen?',
          answer:
            'Ja — Connector-Aktionen werden als eigene Nutzungsfläche gemessen, getrennt vom Token-Kontingent, das eine gewöhnliche Chatnachricht in Anspruch nimmt. Das aktuelle Kontingent können Sie auf der Preisseite prüfen.',
        },
      ],
      productNote:
        'ClawAI bindet heute 14 Workspace-Tools an — Codehosting, Messaging, Projektverfolgung, Design, Dokumente und Kalender — mit einer eigenen gemessenen Nutzungsfläche für Aktionen darin.',
    },
    [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: {
      seo: {
        title: 'Strukturierte Datenextraktion mit ClawAI',
        description:
          'Wie ClawAI unstrukturierten Text und Seiten in strukturierte Ausgaben umwandelt — Tool Calling für ein festgelegtes Schema und die Extraktionstiefe des Research-Modus für Webseiten.',
        keywords: [
          'KI-strukturierte-Datenextraktion',
          'KI-JSON-Ausgabe',
          'Daten aus Text mit KI extrahieren',
        ],
      },
      eyebrow: 'Anwendungsfall',
      title: 'Strukturierte Datenextraktion',
      summary:
        'Unübersichtlichen Text, ein Dokument oder eine Webseite in eine festgelegte Struktur umzuwandeln, die Ihre eigenen Systeme verarbeiten können, ist eine andere Aufgabe als das Verfassen von Fließtext — sie stützt sich auf Tool Calling zu einem festen Schema und, wenn die Quelle eine Webseite ist, auf die Extraktionstiefe des Research-Modus von ClawAI.',
      sections: [
        {
          id: 'tool-calling-for-a-defined-schema',
          heading: 'Tool Calling für ein festgelegtes Ausgabeschema',
          paragraphs: [
            'Wenn eine Anfrage ihre Ausgabe in einer bestimmten Form braucht — einen festen Satz an Feldern, eine festgelegte JSON-Struktur —, ist der Tool-Calling-Mechanismus von ClawAI das, was das verlässlich macht, statt darauf zu hoffen, dass eine reine Textantwort sich korrekt parsen lässt. Wie der Mechanismus tatsächlich funktioniert, erfahren Sie auf den unten verlinkten Seiten „Wie KI-Tool-Calling funktioniert“ und „Was sind strukturierte KI-Ausgaben“.',
          ],
        },
        {
          id: 'extracting-from-a-web-page',
          heading: 'Strukturierte Inhalte aus einer Webseite extrahieren',
          paragraphs: [
            'Wenn die Quelle eine lebende Webseite ist statt bereits vorliegender Text, zieht die Tiefenstufe Suche plus Abruf und Extraktion des Research-Modus strukturierte Inhalte aus dem Abgerufenen, als Teil derselben Funktion, die auch für Recherche mit Quellen genutzt wird. Sie wird als Rechercheausgabe gemessen, getrennt vom Token-Kontingent, das eine gewöhnliche Chatnachricht in Anspruch nimmt.',
          ],
        },
        {
          id: 'file-generation-for-the-output',
          heading: 'Aus dem extrahierten Ergebnis eine Datei erzeugen',
          paragraphs: [
            'Sobald Daten extrahiert sind, kann die Dokument- und Dateierzeugung von ClawAI daraus ein herunterladbares Artefakt machen, statt das Ergebnis nur im Chat-Verlauf zu belassen — mit einer eigenen gemessenen Fläche, getrennt vom gewöhnlichen Chat und von der Recherche.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann ClawAI gültige JSON-Ausgaben garantieren?',
          answer:
            'Tool Calling zu einem festgelegten Schema ist das, was strukturierte Ausgaben verlässlich macht, statt eine reine Textantwort im Nachhinein zu parsen. Wie der Mechanismus funktioniert, erfahren Sie auf der unten verlinkten Seite „Wie KI-Tool-Calling funktioniert“.',
        },
        {
          question:
            'Kann ClawAI strukturierte Daten aus einer Webseite extrahieren, nicht nur aus eingefügtem Text?',
          answer:
            'Ja — die Tiefenstufe Suche plus Abruf und Extraktion des Research-Modus zieht strukturierte Inhalte aus einer abgerufenen Webseite, gemessen als Rechercheausgabe getrennt vom gewöhnlichen Chat.',
        },
        {
          question: 'Kann ich das extrahierte Ergebnis als Datei erhalten statt nur als Chat-Text?',
          answer:
            'Ja — die Dokument- und Dateierzeugung kann aus einem extrahierten Ergebnis ein herunterladbares Artefakt machen, mit einer eigenen gemessenen Nutzungsfläche.',
        },
      ],
      productNote:
        'Das Tool Calling von ClawAI zu einem festgelegten Schema und die Extraktionstiefe des Research-Modus für Webseiten sind reale, bereits ausgelieferte Funktionen hinter strukturierter Datenextraktion — kein einzelner Prompt-Trick.',
    },
    [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: {
      seo: {
        title: 'Private und lokale Bereitstellung mit ClawAI',
        description:
          'Wie die Routing-Modi Local-Only und Privacy-First von ClawAI eine Anfrage auf Hardware halten, die Sie selbst kontrollieren, über die Connectoren Ollama und llama.cpp statt einen Cloud-Anbieter.',
        keywords: [
          'private KI-Bereitstellung',
          'lokale KI-Workloads',
          'KI-Modelle auf eigener Hardware ausführen',
        ],
      },
      eyebrow: 'Anwendungsfall',
      title: 'Private und lokale Bereitstellung',
      summary:
        'Manche Arbeit muss auf Hardware bleiben, die Sie selbst kontrollieren, statt überhaupt einen Cloud-Anbieter zu erreichen. ClawAI hat produktiv laufende Anbindungen an Ollama und llama.cpp genau dafür, dazu Routing-Modi, die eine Anfrage bewusst lokal halten statt aus Versehen.',
      sections: [
        {
          id: 'what-local-deployment-changes',
          heading: 'Was das lokale Ausführen tatsächlich ändert',
          paragraphs: [
            'Ein Cloud-Anbieter an anderer Stelle im Katalog von ClawAI führt ein Modell auf seiner eigenen Infrastruktur aus und berechnet pro Anfrage; Ollama und llama.cpp laden stattdessen ein offenes Modell auf Hardware, die Sie selbst kontrollieren, sodass die Anfrage diese nie verlässt. Das ändert, wer die Anfrage sehen kann, nicht, wozu ein gegebenes Modell fähig ist.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Die Routing-Modi Local-Only und Privacy-First',
          paragraphs: [
            'Local-Only-Routing hält jede Anfrage auf Hardware, die Sie selbst kontrollieren, über Ollama oder llama.cpp statt über einen Cloud-Anbieter. Privacy-First-Routing ist ein separater Modus mit eigenen Prioritäten; beide existieren, weil nicht jeder Workload standardmäßig auf Auto-Routing gehören sollte, und die Wahl zwischen ihnen ist eine bewusste Entscheidung statt eine unbeachtete Voreinstellung.',
          ],
        },
        {
          id: 'when-private-deployment-fits',
          heading: 'Wann ein privater oder lokaler Workload die richtige Form ist',
          paragraphs: [
            'Ein privater oder lokaler Workload wird dadurch definiert, wo die Anfrage läuft, nicht durch die Art der Aufgabe — Programmieren, Schreiben oder Recherche lassen sich alle so ausführen, wenn die Anforderung ist, dass nichts die von Ihnen kontrollierte Hardware verlässt. Die abzuwägenden Kompromisse finden Sie auf den unten verlinkten Seiten zur Modellwahl für private, lokale Workloads und „Was ist Local-First-KI“.',
          ],
        },
      ],
      faq: [
        {
          question: 'Was ist der Unterschied zwischen Local-Only- und Privacy-First-Routing?',
          answer:
            'Local-Only hält jede Anfrage über Ollama oder llama.cpp auf Hardware, die Sie selbst kontrollieren; Privacy-First ist ein separater Routing-Modus mit eigenen Prioritäten. Beide existieren, weil nicht jeder Workload standardmäßig auf Auto-Routing gehören sollte.',
        },
        {
          question: 'Welches offene Modell sollte ich lokal ausführen?',
          answer:
            'Diese Seite empfiehlt keins — wie Sie diese Wahl angehen, erfahren Sie auf der unten verlinkten Seite „Was ist Local-First-KI“, da das richtige Modell von Ihrer Hardware und Aufgabe abhängt.',
        },
        {
          question: 'Kann ich jede Art von Aufgabe lokal ausführen, oder nur bestimmte?',
          answer:
            'Ein privater oder lokaler Workload wird dadurch definiert, wo die Anfrage läuft, nicht durch die Aufgabe — Programmieren, Schreiben oder Recherche lassen sich alle so ausführen, wenn es wichtiger ist, auf selbst kontrollierter Hardware zu bleiben, als welche Aufgabe es ist.',
        },
      ],
      productNote:
        'Die Routing-Modi Local-Only und Privacy-First von ClawAI halten eine Anfrage über die Connectoren Ollama und llama.cpp auf Hardware, die Sie selbst kontrollieren — reale, bereits ausgelieferte Anbindungen, kein Vorhaben auf der Roadmap.',
    },
  },
};
