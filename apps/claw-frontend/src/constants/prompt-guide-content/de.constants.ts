import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PromptGuideDictionary } from '@/types/prompt-guide.types';

export const DE_PROMPT_GUIDE_CONTENT: PromptGuideDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufig gestellte Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt überprüft',
    backToHub: 'Alle Prompt-Guides',
    ctaTitle: 'An einem echten Gespräch üben',
    ctaBody:
      'ClawAI gibt dir einen Arbeitsbereich, um einen Prompt an Modellen jedes angebundenen Anbieters auszuprobieren, damit du selbst siehst, was sich ändert.',
    startFree: 'Kostenlos starten',
    seeFeatures: 'Was ClawAI kann',
  },
  hub: {
    seo: {
      title: 'Wie man bessere KI-Prompts schreibt',
      description:
        'Praktische, ehrliche Anleitungen zum Schreiben von Prompts, die bessere Ergebnisse liefern — Klarheit, Beispiele, schrittweises Denken, strukturierte Ausgabe, System-Prompts und das Korrigieren einer schlechten Antwort. Keine erfundenen Statistiken, keine Übertreibung dessen, was ein Prompt beheben kann.',
      keywords: [
        'wie schreibt man KI-Prompts',
        'Leitfaden zum Schreiben von Prompts',
        'Grundlagen des Prompt Engineering',
      ],
    },
    eyebrow: 'Prompt-Guides',
    title: 'Wie man bessere KI-Prompts schreibt',
    summary:
      'Ein Prompt ist die Anweisung, die du einem Modell gibst, und wie du ihn formulierst, verändert die Antwort, die du bekommst — das gilt unabhängig davon, welches Modell oder Produkt du nutzt. Diese Guides gehen die Techniken durch, die wirklich helfen: konkret sein, Beispiele geben, um schrittweises Denken bitten, das gewünschte Ausgabeformat beschreiben und eine Antwort korrigieren, die daneben lag. Keine davon macht ein Modell korrekt oder garantiert ein Ergebnis; sie erhöhen die Wahrscheinlichkeit, dass du bekommst, was du eigentlich wolltest.',
    topicsHeading: 'Guide auswählen',
    cardSummaries: {
      [PromptGuideTopic.WRITING_CLEAR_PROMPTS]:
        'Die Grundlagen: Kontext, Einschränkungen, Format und Beispiele.',
      [PromptGuideTopic.FEW_SHOT_PROMPTING]:
        'Einem Modell zeigen, was du willst, indem du Beispiele gibst.',
      [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]:
        'Ein Modell bitten, Schritte durchzuarbeiten, bevor es antwortet.',
      [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]:
        'Den Prompt schreiben, der nach JSON, einer Tabelle oder einer anderen festen Form fragt.',
      [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]:
        'Was ein System-Prompt anders macht als das, was du im Chat eintippst.',
      [PromptGuideTopic.ITERATING_ON_A_PROMPT]:
        'Was zu ändern ist, wenn die erste Antwort nicht stimmt.',
      [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]:
        'Wie sich der richtige Ansatz zwischen Code, Text und Analyse verschiebt.',
    },
  },
  topics: {
    [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: {
      seo: {
        title: 'Wie man einen klaren, konkreten KI-Prompt schreibt',
        description:
          'Die Grundlagen eines Prompts, der eine brauchbare Antwort liefert: Kontext geben, Einschränkungen nennen, das gewünschte Format benennen und ein Beispiel hinzufügen. Praktische Anleitung, keine erfundenen Statistiken.',
        keywords: [
          'wie schreibt man einen klaren Prompt',
          'Grundlagen von KI-Prompts',
          'konkretes Prompt-Schreiben',
        ],
      },
      eyebrow: 'Prompt-Guides',
      title: 'Wie man einen klaren, konkreten KI-Prompt schreibt',
      summary:
        'Die meisten enttäuschenden Antworten lassen sich auf einen Prompt zurückführen, der etwas ausgelassen hat, das das Modell unmöglich erraten konnte — die Zielgruppe, die Einschränkungen, das Format oder wie "gut" aussieht. Dieser Guide geht die vier Dinge durch, die es sich lohnt hinzuzufügen, bevor du einen Prompt sendest, ungefähr in der Reihenfolge ihrer Wichtigkeit.',
      sections: [
        {
          id: 'give-context',
          heading: 'Gib dem Modell den Kontext, den es nicht erraten kann',
          paragraphs: [
            'Ein Modell antwortet aus dem, was im Gespräch steht, plus dem, was es während des Trainings gelernt hat — es weiß nicht, für wen du schreibst, was du bereits versucht hast oder warum die Aufgabe wichtig ist, sofern du es nicht sagst. "Schreibe diese E-Mail um" und "Schreibe diese E-Mail so um, dass ein bereits frustrierter Kunde sie als Entschuldigung liest, nicht als Ausrede" sind dieselbe Aufgabe mit unterschiedlich viel Kontext, und sie erhalten unterschiedliche Antworten. Kontext muss nicht lang sein; er muss die ein oder zwei Fakten enthalten, die daran etwas ändern würden, wie eine Person die Aufgabe erledigen würde.',
          ],
        },
        {
          id: 'state-constraints',
          heading: 'Nenne die Einschränkungen, statt zu hoffen, dass sie sich von selbst verstehen',
          paragraphs: [
            'Ein Längenlimit, ein Lesenniveau, ein Ton, etwas, das nicht erwähnt werden soll, eine Frist, die die Antwort einhalten muss — ein Modell wendet eine Einschränkung an, wenn du sie nennst, und fällt sonst auf eine generische Standardvorgabe zurück, die möglicherweise nicht passt. "Halte es unter 150 Wörtern" und "vermeide Fachjargon" sind beides Einschränkungen, denen ein Modell zuverlässig folgen kann, sobald sie explizit genannt sind; keine davon leitet es von sich aus zuverlässig richtig ab.',
          ],
        },
        {
          id: 'name-the-format',
          heading: 'Benenne das Ausgabeformat, das du wirklich willst',
          paragraphs: [
            'Eine Aufzählungsliste, ein kurzer Absatz, eine Tabelle, eine Betreffzeile plus Text — wenn du die gewünschte Form von vornherein nennst, sparst du dir eine Folgenachricht, die um eine Neuformatierung bittet. Das wird umso wichtiger, wenn die Ausgabe von etwas anderem als einer lesenden Person verarbeitet werden muss; siehe dazu Prompts für strukturierte Ausgabe, unten verlinkt, den vertiefenden Begleit-Guide zu diesem Punkt.',
          ],
        },
        {
          id: 'add-an-example',
          heading: 'Füge ein Beispiel hinzu, wenn eine bloße Beschreibung mehrdeutig wäre',
          paragraphs: [
            'Manche Dinge lassen sich leichter zeigen als beschreiben — ein Hausstil, ein Ton, ein bestimmtes Format für eine wiederkehrende Aufgabe. Ein gut gewähltes Beispiel löst oft eine Mehrdeutigkeit auf, die mehrere Sätze Beschreibung nicht auflösen würden. Siehe Few-Shot-Prompting, unten verlinkt, dafür, wie man mehr als ein Beispiel gezielt einsetzt und wann sich die zusätzliche Länge im Prompt lohnt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Bekommt man mit einem längeren Prompt immer eine bessere Antwort?',
          answer:
            'Nein — ein längerer Prompt hilft nur, wenn die zusätzliche Länge Kontext, eine Einschränkung oder ein Beispiel ist, das dem Modell sonst fehlen würde. Einen Prompt mit wiederholten Anweisungen oder Füllstoff aufzublähen verbessert die Antwort nicht und kann den wichtigen Teil verschütten.',
        },
        {
          question: 'Verhindert ein klarer Prompt, dass ein Modell Fakten falsch darstellt?',
          answer:
            'Nein. Ein klarer Prompt macht es wahrscheinlicher, dass das Modell versteht, wonach du fragst, aber er überprüft keine Fakten und beseitigt keine Halluzinationen — siehe Warum KI halluziniert, unten verlinkt, dafür, was das tatsächlich verursacht und warum Prompting allein das nicht beheben kann.',
        },
        {
          question: 'Was ist das eine nützlichste, was man einem vagen Prompt hinzufügen kann?',
          answer:
            'Meistens Kontext: die ein oder zwei Fakten über die Zielgruppe, das Ziel oder die Situation, die eine Person bräuchte, um die Aufgabe gut zu erledigen. Eine Einschränkung oder ein Beispiel helfen ebenfalls, aber sie zählen weniger, solange das Modell immer noch nicht weiß, für wen die Antwort ist.',
        },
      ],
      productNote:
        'ClawAI schreibt deinen Prompt nicht für dich um, aber ein klarerer Prompt bringt bei jedem Modell mehr, zu dem du routest — auch über Auto-Routing, das immer noch aus dem antwortet, was du tatsächlich gefragt hast.',
    },
    [PromptGuideTopic.FEW_SHOT_PROMPTING]: {
      seo: {
        title: 'Few-Shot-Prompting: einem Modell Beispiele geben',
        description:
          'Wie man ein oder mehrere Beispiele in einem Prompt nutzt, um einem Modell das gewünschte Muster zu zeigen, statt es nur zu beschreiben — mit Hinweisen dazu, wie viele Beispiele helfen und wann Zero-Shot ausreicht.',
        keywords: ['Few-Shot-Prompting', 'Prompt-Beispiele', 'One-Shot vs. Few-Shot-Prompting'],
      },
      eyebrow: 'Prompt-Guides',
      title: 'Few-Shot-Prompting: einem Modell Beispiele geben',
      summary:
        'Few-Shot-Prompting bedeutet, ein oder mehrere durchgearbeitete Beispiele direkt in den Prompt aufzunehmen, damit das Modell dem Muster folgen kann, statt es nur aus einer Beschreibung abzuleiten. Es ist eine der zuverlässigeren Methoden, um einzugrenzen, was "gut" für eine Aufgabe bedeutet, die sich leichter zeigen als erklären lässt.',
      sections: [
        {
          id: 'what-few-shot-means',
          heading: '"Few-Shot" und "Zero-Shot": was die Begriffe bedeuten',
          paragraphs: [
            'Ein Zero-Shot-Prompt fragt nach einem Ergebnis ohne beigefügtes Beispiel; ein One-Shot-Prompt enthält genau eines; ein Few-Shot-Prompt enthält mehrere. Die Begriffe beschreiben, wie viele Beispiele im Prompt stehen, nicht eine Aussage über Genauigkeit — ein gut geschriebener Zero-Shot-Prompt kann einen schlecht gewählten Few-Shot-Prompt übertreffen, denn die Beispiele helfen nur, wenn sie tatsächlich das repräsentieren, was du willst.',
          ],
        },
        {
          id: 'when-examples-help-most',
          heading: 'Wann Beispiele mehr helfen als eine längere Beschreibung',
          paragraphs: [
            'Beispiele lohnen sich, wenn die Aufgabe ein Format, einen Ton oder ein Muster hat, das sich wirklich leichter zeigen als beschreiben lässt — Daten in Kategorien einordnen, die sich schwer in Worte fassen lassen, eine bestimmte Schreibstimme treffen oder eine Vorlage mit Eigenheiten befolgen, die eine reine Beschreibung übersehen würde. Bei einer Aufgabe, die bereits aus einer kurzen Anweisung eindeutig ist, fügt ein Beispiel Länge hinzu, ohne Information hinzuzufügen.',
          ],
        },
        {
          id: 'choosing-good-examples',
          heading: 'Was ein Beispiel nützlich macht, nicht nur vorhanden',
          paragraphs: [
            'Ein Beispiel ist nur so gut, wie repräsentativ es für die eigentliche Aufgabe ist — ein zu einfaches oder ungewöhnliches Beispiel kann das falsche Muster lehren. Ein paar gut gewählte Beispiele, die die Bandbreite der tatsächlich erwarteten Fälle abdecken, inklusive eines Grenzfalls, falls einer wahrscheinlich ist, funktionieren meist besser als mehrere Beispiele, die alle gleich aussehen. Wenn sich deine Beispiele in Ton oder Format widersprechen, wird das Modem sie eher vermischen, als das eine zu wählen, das du gemeint hast.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wie viele Beispiele sollte ein Few-Shot-Prompt enthalten?',
          answer:
            'Es gibt keine feste Zahl — genug, um die erwartete Bandbreite an Fällen abzudecken, oft zwei bis fünf, und mehr nur, wenn die Aufgabe wirklich stärker variiert. Beispiele hinzuzufügen, die alle gleich aussehen, hilft selten über das erste oder zweite hinaus.',
        },
        {
          question: 'Ist Few-Shot-Prompting immer besser als Zero-Shot?',
          answer:
            'Nein. Es ist kein garantierter Genauigkeitsgewinn belegt, und diese Seite behauptet keinen — ein klarer Zero-Shot-Prompt bei einer gut definierten Aufgabe kann genauso gut abschneiden, und Beispiele helfen vor allem, wenn sich die Aufgabe leichter zeigen als beschreiben lässt.',
        },
        {
          question: 'Kann ich Few-Shot-Beispiele mit einer schrittweisen Anweisung kombinieren?',
          answer:
            'Ja — sie adressieren unterschiedliche Dinge. Beispiele zeigen das gewünschte Muster oder Format; um schrittweises Denken zu bitten verändert, wie das Modell auf die Antwort hinarbeitet. Siehe Chain-of-Thought-Prompting, unten verlinkt, für die zweite Technik.',
        },
      ],
      productNote:
        'Ein Few-Shot-Prompt funktioniert bei jedem Modell, zu dem ClawAI routet, auf dieselbe Weise — die Beispiele stehen in deinem Prompt, nicht in einer Einstellung, sie wandern also mit dem Gespräch mit, egal welcher Anbieter antwortet.',
    },
    [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]: {
      seo: {
        title: 'Chain-of-Thought-Prompting: ein Modell bitten, schrittweise zu denken',
        description:
          'Was Chain-of-Thought-Prompting ist, wann es tatsächlich hilft, ein Modell Schritte durcharbeiten zu lassen, bevor es antwortet, und warum es kein korrektes Ergebnis garantiert.',
        keywords: [
          'Chain-of-Thought-Prompting',
          'schrittweises Prompting',
          'Technik für KI-Reasoning-Prompts',
        ],
      },
      eyebrow: 'Prompt-Guides',
      title: 'Chain-of-Thought-Prompting: ein Modell bitten, schrittweise zu denken',
      summary:
        'Chain-of-Thought-Prompting bittet ein Modell, ein Problem in Schritten durchzuarbeiten — es zu zerlegen, Zwischenergebnisse zu prüfen — bevor es eine endgültige Antwort gibt, statt sofort eine Antwort auf den ersten Wurf zu produzieren. Es ist eine echte, nützliche Technik für die richtige Art von Aufgabe, und sie garantiert für sich genommen kein korrektes Denken.',
      sections: [
        {
          id: 'what-it-is',
          heading: 'Was das Bitten um schrittweises Denken tatsächlich bewirkt',
          paragraphs: [
            'Ein Prompt wie "arbeite das Schritt für Schritt durch" oder "zeige dein Denken, bevor du eine endgültige Antwort gibst" bittet das Modell, Zwischenschritte darzulegen, statt direkt zu einem Schluss zu springen. Bei einem mehrstufigen Problem kann das einen Fehler in einem Zwischenschritt sichtbar machen, der sonst in einer einzigen, selbstsicher klingenden Endantwort verborgen bliebe — und es gibt dir etwas Konkretes zum Prüfen, statt nur ein Ergebnis, dem man vertrauen muss.',
          ],
        },
        {
          id: 'when-it-helps',
          heading: 'Wann es hilft und wann es unnötig ist',
          paragraphs: [
            'Schrittweises Prompting hilft meist am meisten bei Problemen mit mehreren voneinander abhängigen Schritten, mehreren gleichzeitig zu erfüllenden Einschränkungen oder einer Berechnung, die es wert ist, doppelt geprüft zu werden — einer mehrteiligen Textaufgabe, einer Entscheidung mit mehreren Faktoren, einer Logik, die in sich schlüssig sein muss. Eine kurze, einstufige Frage profitiert davon selten, und trotzdem danach zu fragen fügt nur Länge hinzu, ohne die Antwort zu verändern. Siehe Ein Modell für komplexes Reasoning wählen, unten verlinkt, dafür, wie das mit der Wahl eines Modells zusammenhängt, das genau für diese Art von Aufgabe gebaut ist.',
          ],
        },
        {
          id: 'what-it-does-not-guarantee',
          heading: 'Was es nicht garantiert',
          paragraphs: [
            'Ein Modell zu bitten, schrittweise zu denken, garantiert keine korrekte Antwort, und eine selbstsichere, gut strukturierte Kette von Schritten kann trotzdem zum falschen Schluss kommen — die zusätzlichen Schritte machen einen Fehler leichter erkennbar, nicht unmöglich zu machen. Das passt zu Warum KI halluziniert, unten verlinkt: Ein Modell kann flüssiges, plausibel klingendes Denken erzeugen, das trotzdem falsch ist, also lohnt es sich, eine schrittweise Antwort bei allem, was zählt, zu prüfen, statt sie für bare Münze zu nehmen, nur weil sie methodisch wirkt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Garantiert Chain-of-Thought-Prompting eine korrekte Antwort?',
          answer:
            'Nein — es garantiert kein korrektes Denken, und eine schrittweise Antwort kann trotzdem zu einem falschen Schluss kommen. Sie macht einen Fehler in den Zwischenschritten meist leichter erkennbar, was etwas anderes ist, als den Fehler zu verhindern.',
        },
        {
          question: 'Wann sollte ich ein Modell bitten, sein Denken zu zeigen?',
          answer:
            'Bei Problemen mit mehreren voneinander abhängigen Schritten oder Einschränkungen, bei denen ein Zwischenfehler sonst in einer einzigen Endantwort versteckt bliebe. Eine kurze, einstufige Frage braucht das selten.',
        },
        {
          question: 'Ist das dasselbe wie ein reasoning-fokussiertes Modell zu nutzen?',
          answer:
            'Verwandt, aber nicht identisch — dieser Guide geht darum, wie du einen Prompt für ein beliebiges Modell formulierst; Ein Modell für komplexes Reasoning wählen, unten verlinkt, geht darum, welches Modell standardmäßig dafür gebaut ist, Schritte durchzuarbeiten. Beides lässt sich kombinieren.',
        },
      ],
      productNote:
        'ClawAIs High-Reasoning-Routing-Modus bevorzugt ein Modell, das dafür geeignet ist, ein Problem in Schritten durchzuarbeiten, was gut zu einem schrittweisen Prompt passt — aber die Technik auf dieser Seite funktioniert mit jedem Modell, zu dem du routest.',
    },
    [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]: {
      seo: {
        title: 'Wie man einen Prompt schreibt, der nach strukturierter Ausgabe fragt',
        description:
          'Praktische Anleitung zum Schreiben eines Prompts, der zuverlässig nach JSON, einer Tabelle oder einem anderen festen Format fragt — der Begleitartikel dazu, was strukturierte KI-Ausgaben sind und warum Prompting allein keine gültige Struktur garantiert.',
        keywords: [
          'Prompt für JSON-Ausgabe',
          'Prompting für strukturierte Ausgabe',
          'wie man KI nach einer Tabelle fragt',
        ],
      },
      eyebrow: 'Prompt-Guides',
      title: 'Wie man einen Prompt schreibt, der nach strukturierter Ausgabe fragt',
      summary:
        'Dieser Guide ist der praktische "Wie schreibe ich den Prompt"-Begleiter zu Was sind strukturierte KI-Ausgaben, unten verlinkt, der den technischen Mechanismus behandelt — diese Seite setzt voraus, dass du bereits strukturierte Ausgabe willst, und konzentriert sich darauf, wie man gut danach fragt. Sie erklärt den zugrunde liegenden Mechanismus nicht erneut und bleibt konsistent mit dem, was jene Seite bereits darüber sagt, was ein einfacher Prompt garantieren kann und was nicht.',
      sections: [
        {
          id: 'describe-the-shape-exactly',
          heading: 'Beschreibe die genaue Form, die du willst, nicht nur den Formatnamen',
          paragraphs: [
            '"Gib das als JSON zurück" zu sagen ist ein Anfang, aber die Felder, ihre Reihenfolge und ihre Typen zu benennen ist das, was Mehrdeutigkeit tatsächlich beseitigt — "gib ein JSON-Objekt mit einem String-Feld namens title und einem Array-Feld namens steps zurück, bei dem jeder Schritt ein String ist" lässt dem Modell weit weniger zu erraten übrig als "gib JSON mit dem Titel und den Schritten zurück." Dasselbe gilt für eine Tabelle: benenne die Spalten und was in jede gehört, statt anzunehmen, dass das Modell dieselbe Aufteilung wählt, die du im Kopf hast.',
          ],
        },
        {
          id: 'show-an-example-of-the-shape',
          heading: 'Zeige ein Beispiel der genauen Ausgabe, die du willst',
          paragraphs: [
            'Ein einziges Beispiel der fertigen Form — ein kurzes Beispiel-JSON-Objekt oder eine Zeile der Tabelle — beseitigt oft mehr Mehrdeutigkeit als ein weiterer Beschreibungsabsatz, aus demselben Grund, aus dem ein Beispiel bei Few-Shot-Prompting hilft, unten verlinkt. Das zählt besonders, wenn das Format eine Eigenheit hat, die sich leicht ungenau beschreiben lässt, etwa ob ein Feld optional ist oder wie ein fehlender Wert dargestellt werden soll.',
          ],
        },
        {
          id: 'plain-prompting-has-limits',
          heading: 'Was ein gut geschriebener Prompt hier nicht garantiert',
          paragraphs: [
            'Ein sorgfältig geschriebener Prompt macht gültige, gut geformte Ausgabe wahrscheinlicher, garantiert sie aber nicht — ein Modell kann trotzdem fehlerhaftes JSON, ein zusätzliches Feld oder Fließtext um die gewünschte Struktur herum zurückgeben, besonders bei einer längeren oder komplexeren Antwort. Siehe Was sind strukturierte KI-Ausgaben, unten verlinkt, für die technischen Mechanismen — wie schema-eingeschränkte Generierung —, die genau deshalb existieren, weil Prompting allein keine zuverlässige Garantie ist, und dafür, was ClawAI anders macht, als im Prompt nur höflich zu bitten.',
          ],
        },
      ],
      faq: [
        {
          question: 'Reicht höfliches Bitten im Prompt, um gültiges JSON zu garantieren?',
          answer:
            'Nein — ein gut geschriebener Prompt macht es wahrscheinlicher, nicht sicher. Siehe Was sind strukturierte KI-Ausgaben, unten verlinkt, für die Mechanismen, die deshalb existieren, weil Prompting allein keine gültige Struktur zuverlässig garantiert.',
        },
        {
          question: 'Sollte ich das Format beschreiben oder ein Beispiel zeigen?',
          answer:
            'Beides, wenn das Format irgendeine Mehrdeutigkeit hat — eine genaue Beschreibung der Felder plus ein Beispiel der fertigen Form deckt mehr Fälle ab als eines von beiden allein. Siehe Few-Shot-Prompting, unten verlinkt, dafür, wie man ein gutes Beispiel auswählt.',
        },
        {
          question:
            'Was ist der Unterschied zwischen diesem Guide und Was sind strukturierte KI-Ausgaben?',
          answer:
            'Jene Seite erklärt den technischen Mechanismus hinter zuverlässiger strukturierter Ausgabe; diese Seite ist der praktische Begleiter — wie man den Prompt selbst schreibt. Sie sind dafür gedacht, zusammen gelesen zu werden, nicht als Duplikate voneinander.',
        },
      ],
      productNote:
        'Für Ausgaben, die zuverlässig gültig sein müssen, gehen ClawAIs Mechanismen für strukturierte Ausgabe (siehe Was sind strukturierte KI-Ausgaben, unten verlinkt) weiter als reiner Prompt-Wortlaut — dieser Guide deckt die Prompt-Schreib-Hälfte dieses Gesamtbilds ab.',
    },
    [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]: {
      seo: {
        title: 'System-Prompts vs. User-Prompts: was jeder davon tut',
        description:
          'Der Unterschied zwischen einem System-Prompt und den Nachrichten, die du in einem Gespräch eintippst — wofür jeder da ist, wann welcher zu verwenden ist und wie sie zusammenarbeiten.',
        keywords: [
          'System-Prompt vs. User-Prompt',
          'was ist ein System-Prompt',
          'KI-Prompt-Rollen erklärt',
        ],
      },
      eyebrow: 'Prompt-Guides',
      title: 'System-Prompts vs. User-Prompts: was jeder davon tut',
      summary:
        'Ein Gespräch mit einem Modell besteht meist aus mehr als einer Art von Nachricht: einem System-Prompt, der feste Anweisungen für das gesamte Gespräch setzt, und User-Prompts — das, was du tatsächlich eintippst —, die innerhalb dessen um etwas Bestimmtes bitten. Zu wissen, welchen man für eine gegebene Anweisung nutzt, erspart Wiederholungen und hält ein langes Gespräch konsistenter.',
      sections: [
        {
          id: 'what-a-system-prompt-is-for',
          heading: 'Wofür ein System-Prompt da ist',
          paragraphs: [
            'Ein System-Prompt setzt eine Anweisung, die für das gesamte Gespräch gilt und nicht nur für eine einzelne Nachricht darin — eine Persona, die beibehalten werden soll, ein Ton, der gehalten werden soll, eine Regel, die immer befolgt werden soll ("antworte immer in formellem Deutsch" oder "schlage niemals eine bestimmte Dosierung vor"). Er wird einmal gesetzt, typischerweise bevor das Gespräch beginnt, und ein Modell behandelt ihn als feste Vorgabe, nicht als etwas, das bei jeder neuen Nachricht neu ausgehandelt wird.',
          ],
        },
        {
          id: 'what-a-user-prompt-is-for',
          heading: 'Wofür ein User-Prompt da ist',
          paragraphs: [
            'Ein User-Prompt ist das, was du bei jeder Runde des Gesprächs eintippst — die konkrete Frage oder Aufgabe für diese Nachricht. Hier greift meist die Anleitung aus Klare Prompts schreiben zu Kontext, Einschränkungen, Format und Beispielen, da ein User-Prompt sich üblicherweise um eine konkrete Sache dreht statt um eine feste Regel für das ganze Gespräch.',
          ],
        },
        {
          id: 'when-to-use-which',
          heading: 'Wann eine Anweisung in den System-Prompt gehört, statt sie zu wiederholen',
          paragraphs: [
            'Eine Anweisung, die für jede Nachricht gelten soll — ein Ton, eine Persona, eine Grenze — gehört in den System-Prompt, damit du sie nicht jede Runde wiederholst und riskierst, dass sie mitten in einem langen Gespräch fallengelassen oder widersprochen wird. Eine einmalige Bitte, die nur für die aktuelle Nachricht gilt, gehört in den User-Prompt. Ein System-Prompt ist für sich genommen keine Sicherheitsgrenze; siehe Was ist Prompt-Injection, unten verlinkt, dafür, warum eine Anweisung an beiden Stellen trotzdem durch feindlichen Inhalt an anderer Stelle im Gespräch überschrieben werden kann.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann eine User-Nachricht einen System-Prompt überschreiben?',
          answer:
            'Das hängt davon ab, wie ein bestimmtes Produkt damit umgeht, und das ist generell keine gesicherte Garantie — ein System-Prompt ist als feste Vorgabe gedacht, nicht als unbrechbare Regel. Siehe Was ist Prompt-Injection, unten verlinkt, dafür, warum es ein Fehler ist, ihn als absolute Sicherheitsgrenze zu behandeln.',
        },
        {
          question: 'Brauche ich einen System-Prompt für eine einfache, einmalige Frage?',
          answer:
            'Nein — ein System-Prompt lohnt sich, wenn eine Anweisung für ein ganzes Gespräch gelten soll. Bei einer einzelnen Frage ist es einfacher und genauso wirksam, alles in den User-Prompt zu packen.',
        },
        {
          question:
            'Welche Art von Anweisung gehört in einen System-Prompt statt in einen User-Prompt?',
          answer:
            'Eine feste Regel, die nicht wiederholt werden muss — eine Persona, ein Ton, eine Grenze, die das Modell immer respektieren soll. Eine konkrete, einmalige Bitte gehört stattdessen in den User-Prompt.',
        },
      ],
      productNote:
        'ClawAIs System-Prompt-Einstellung gilt bei jedem Anbieter, zu dem geroutet wird, auf dieselbe Weise für ein gesamtes Gespräch, sodass eine feste Anweisung nicht pro Modell neu geschrieben werden muss.',
    },
    [PromptGuideTopic.ITERATING_ON_A_PROMPT]: {
      seo: {
        title: 'Was tun, wenn die erste KI-Antwort nicht stimmt',
        description:
          'Ein praktischer Ansatz zur Fehlersuche bei einem Prompt, der nicht die gewünschte Antwort geliefert hat — herausfinden, was gefehlt hat, statt die Bitte nur zu wiederholen, und wann es besser ist, neu anzufangen statt zu flicken.',
        keywords: [
          'einen KI-Prompt verbessern',
          'eine schlechte KI-Antwort korrigieren',
          'KI-Prompts debuggen',
        ],
      },
      eyebrow: 'Prompt-Guides',
      title: 'Was tun, wenn die erste KI-Antwort nicht stimmt',
      summary:
        'Die erste Antwort auf einen Prompt ist selten das letzte Wort — die meisten Menschen erzielen ein besseres Ergebnis, indem sie eine enttäuschende Antwort als Information darüber behandeln, was dem Prompt gefehlt hat, und dann anpassen, statt dieselbe Bitte zu wiederholen und auf etwas anderes zu hoffen. Dieser Guide geht durch, wie man eine schlechte Antwort diagnostiziert und entscheidet, was zu ändern ist.',
      sections: [
        {
          id: 'diagnose-before-you-rewrite',
          heading: 'Diagnostiziere, was schiefging, bevor du den ganzen Prompt umschreibst',
          paragraphs: [
            'Eine enttäuschende Antwort fällt meist in eine von wenigen Kategorien: sie hat Kontext übersehen, den du hattest aber nicht genannt hast, sie hat eine Einschränkung ignoriert, sie hat das falsche Format verwendet, oder sie liegt selbstsicher bei einem Fakt falsch. Zu benennen, was passiert ist, weist auf eine konkrete Korrektur hin — eine fehlende Einschränkung verlangt danach, die Einschränkung explizit hinzuzufügen, nicht den ganzen Prompt von Grund auf neu zu schreiben oder ihn nachdrücklicher zu wiederholen.',
          ],
        },
        {
          id: 'add-what-was-missing',
          heading: 'Füge genau das hinzu, was fehlte, nicht allgemein mehr Anweisungen',
          paragraphs: [
            'Sobald du weißt, was gefehlt hat, füge genau das hinzu: die Einschränkung, das Beispiel, das Stück Kontext oder die Formatbeschreibung, die die Bitte klar gemacht hätten. Siehe Wie man einen klaren, konkreten Prompt schreibt, unten verlinkt, für die Grundlagen, auf die dieser Schritt meist zurückgreift — die meiste Iteration wendet dieselbe Handvoll Dinge an, die der erste Prompt ausgelassen hat.',
          ],
        },
        {
          id: 'know-when-to-start-over',
          heading: 'Wisse, wann ein neuer Prompt besser ist als Flicken',
          paragraphs: [
            'Ein langes Hin und Her kleiner Korrekturen kann ein Gespräch mit widersprüchlichen Anweisungen zurücklassen, die das Modell nun zu vereinbaren versucht — an diesem Punkt ist ein frischer, vollständiger Prompt, der alles nennt, was du gelernt hast zu brauchen, oft schneller und zuverlässiger als noch ein Flicken. Das lohnt sich auch zu bedenken, wenn die Antwort bei einem Fakt selbstsicher falsch liegt statt nur falsch formatiert ist: den Wortlaut zu flicken behebt das nicht, denn es ist kein Wortlautproblem — siehe Warum KI halluziniert, unten verlinkt, dafür, was in diesem Fall tatsächlich passiert.',
          ],
        },
      ],
      faq: [
        {
          question:
            'Die Antwort ist gut geschrieben, aber sachlich falsch — wie behebe ich den Prompt?',
          answer:
            'Das lässt sich meist nicht durch Umformulieren des Prompts beheben, denn es ist kein Wortlautproblem. Siehe Warum KI halluziniert, unten verlinkt, dafür, was tatsächlich passiert und was wirklich hilft, etwa das Modell zu bitten, überprüfbare Quellen zu zitieren, oder einen Recherchemodus zu nutzen, der nachschlägt.',
        },
        {
          question: 'Sollte ich im selben Gespräch weiter korrigieren oder ein neues beginnen?',
          answer:
            'Beides kann funktionieren, aber eine lange Kette kleiner Korrekturen riskiert, widersprüchliche Anweisungen zu hinterlassen. Wenn ein Gespräch bereits mehrere Korrekturen hatte, ist ein frischer, vollständiger Prompt oft zuverlässiger als noch ein Flicken.',
        },
        {
          question: 'Wie oft sollte ich es versuchen, bevor ich einen Prompt-Ansatz aufgebe?',
          answer:
            'Es gibt keine feste Zahl — aber wenn zwei oder drei konkrete, diagnostizierte Korrekturen nicht geholfen haben, liegt das Problem vielleicht gar nicht am Prompt. Siehe Ein Modell für deine Aufgabe wählen, unten verlinkt, dafür, ob die Aufgabe stattdessen eine andere Art von Modell braucht.',
        },
      ],
      productNote:
        'Jedes Gespräch in ClawAI behält seinen Verlauf, sodass du einen Prompt über mehrere Runden iterieren und genau sehen kannst, was sich zwischen einer Antwort und der nächsten geändert hat.',
    },
    [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]: {
      seo: {
        title: 'Wie sich Prompting für Code, Text und Analyse unterscheidet',
        description:
          'Wie sich der richtige Prompting-Ansatz zwischen Coding-Aufgaben, Schreibaufgaben und analytischen Aufgaben verschiebt — und wie das mit der Wahl des richtigen Modells für jede zusammenhängt, nicht nur mit den richtigen Worten.',
        keywords: [
          'Prompting für Code vs. Text',
          'KI-Prompts nach Aufgabentyp',
          'Prompting für Analyseaufgaben',
        ],
      },
      eyebrow: 'Prompt-Guides',
      title: 'Wie sich Prompting für Code, Text und Analyse unterscheidet',
      summary:
        'Die Techniken in diesem Hub — Klarheit, Beispiele, schrittweises Denken, Format — gelten überall, aber welche davon am meisten zählen, verschiebt sich mit der Art der Aufgabe. Dieser Guide geht durch, was für Coding, für Schreiben und für Analyse meist am meisten hilft, und verlinkt auf den Modell-Passung-Cluster für die Modellseite derselben Frage, statt diese Aufgabenunterschiede hier erneut zu erklären.',
      sections: [
        {
          id: 'prompting-for-code',
          heading: 'Prompting für Code: Präzision statt Überzeugungskraft',
          paragraphs: [
            'Ein Coding-Prompt profitiert am meisten von Präzision — der genauen Funktionssignatur, der Sprache und Version, der Einschränkung, die der Code erfüllen muss, einem Beispiel für die erwartete Ein- und Ausgabe. Eine vage Formulierung, die in einem Schreibprompt harmlos wäre ("mach es gut"), gibt einer Coding-Aufgabe fast nichts zum Arbeiten, da es für eine solche Bitte keine einzige korrekte Form gibt.',
          ],
        },
        {
          id: 'prompting-for-writing',
          heading: 'Prompting für Text: Zielgruppe, Ton und ein gutes Beispiel',
          paragraphs: [
            'Ein Schreib- oder Redigierprompt profitiert am meisten von der Kontext- und Einschränkungsanleitung aus Wie man einen klaren, konkreten Prompt schreibt, unten verlinkt — für wen der Text ist, welchen Ton er halten soll, und einer Längen- oder Strukturvorgabe. Ein Beispiel der Zielstimme, gemäß Few-Shot-Prompting, unten verlinkt, leistet hier oft mehr als eine längere Beschreibung des Tons.',
          ],
        },
        {
          id: 'prompting-for-analysis',
          heading: 'Prompting für Analyse: nach dem Denkweg fragen, nicht nur dem Schluss',
          paragraphs: [
            'Eine analytische Aufgabe — Optionen abwägen, Daten interpretieren, eine Entscheidung mit mehreren Faktoren durcharbeiten — profitiert meist von Chain-of-Thought-Prompting, unten verlinkt: das Modell zu bitten, sein Denken darzulegen, statt nur einen Schluss zu nennen, gibt dir etwas zum Prüfen und macht tendenziell einen übersehenen Faktor oder eine schwache Annahme sichtbar. Das ist dieselbe Art von Aufgabe wie Ein Modell für komplexes Reasoning wählen, unten verlinkt, das behandelt, welches Modell genau dafür gebaut ist, statt diese Anleitung hier zu wiederholen.',
          ],
        },
      ],
      faq: [
        {
          question:
            'Funktioniert eine einzelne Prompting-Technik am besten über alle drei Aufgabentypen hinweg?',
          answer:
            'Nein — Präzision zählt am meisten für Code, Zielgruppe und Ton zählen am meisten für Text, und nach sichtbarem Denken zu fragen zählt am meisten für Analyse. Die meisten Aufgaben profitieren von einer Mischung, gewichtet danach, was die Aufgabe tatsächlich braucht.',
        },
        {
          question: 'Zählt das gewählte Modell genauso wie die Art, wie ich den Prompt schreibe?',
          answer:
            'Beides zählt, und es sind unterschiedliche Stellschrauben — dieser Guide geht um den Wortlaut; siehe Ein Modell für deine Aufgabe wählen, unten verlinkt, für die Modell-Passung-Seite von Coding-, Schreib- und reasoning-lastigen Aufgaben speziell.',
        },
        {
          question: 'Ist ein Coding-Prompt nur ein Schreibprompt mit anderen Worten?',
          answer:
            'Nein — eine Coding-Aufgabe hat meist eine einzige korrekte oder funktionierende Form, sodass Präzision bei der genauen Anforderung mehr zählt als bei den meisten Schreibaufgaben, bei denen mehrere unterschiedliche Formulierungen alle gut sein können.',
        },
      ],
      productNote:
        'ClawAIs Routing-Modi neigen bereits pro Aufgabe zu einem passenden Modell — Auto und High Reasoning etwa für analytische Arbeit —, sodass ein gut geschriebener Prompt und eine passende Route zusammenwirken, statt getrennte Entscheidungen zu sein.',
    },
  },
};
