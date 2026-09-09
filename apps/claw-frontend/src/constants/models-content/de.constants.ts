import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const DE_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufig gestellte Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt geprüft',
    backToHub: 'Alle Anbieter',
    ctaTitle: 'Probieren Sie es selbst aus, statt uns zu glauben',
    ctaBody:
      'ClawAI leitet eine Unterhaltung an das passende Modell weiter, über alle unten aufgeführten Anbieter hinweg, aus einem einzigen Arbeitsbereich.',
    startFree: 'Mit dem kostenlosen Plan starten',
    seeFeatures: 'Erfahren, was ClawAI kann',
    catalogHeading: 'Modelle, an die ClawAI routen kann',
    costBandLabel: 'Kostenstufe',
    seePricing: 'Aktuellen Katalog auf der Preisseite prüfen',
    sourceLabel: 'Quelle',
    costBandNames: {
      budget: 'Günstig',
      standard: 'Standard',
      premium: 'Premium',
      highest: 'Höchste',
    },
  },
  hub: {
    seo: {
      title: 'KI-Modellanbieter, mit denen ClawAI verbunden ist',
      description:
        'Jeder Modellanbieter, an den ClawAI eine Unterhaltung routen kann — OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok und lokale Modelle mit offenen Gewichten — mit qualitativen Kostenstufen und ohne erfundene Benchmarks.',
      keywords: [
        'KI-Modellanbieter',
        'welche KI-Modelle unterstützt ClawAI',
        'KI-Anbieter vergleichen',
      ],
    },
    eyebrow: 'Modellanbieter',
    title: 'Die Modellanbieter hinter ClawAI',
    summary:
      'ClawAI baut kein eigenes Modell — es routet Ihre Unterhaltung an eines, ausgewählt aus mehreren Anbietern je nach Aufgabe, Kosten oder Datenschutz. Diese Seite nennt die Anbieterfamilien mit einem aktiven Connector, wofür jede im Allgemeinen bekannt ist, und eine qualitative Kostenstufe. Sie ordnet sie nicht, und sie ersetzt nicht die Prüfung des aktuellen Katalogs, bevor Sie sich für einen Plan entscheiden.',
    topicsHeading: 'Einen Anbieter wählen',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5, o3 und der Rest der aktuellen Modellreihe von OpenAI.',
      [ModelProviderPage.ANTHROPIC]: 'Die Familie Claude Opus, Sonnet und Haiku.',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro, Flash und Flash-Lite.',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek Chat und DeepSeek Reasoner.',
      [ModelProviderPage.XAI]: 'Grok 4 und Grok 3 mini von xAI.',
      [ModelProviderPage.LOCAL_AI]:
        'Modelle mit offenen Gewichten, die Sie selbst betreiben, mit Ollama oder llama.cpp.',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'OpenAI-Modelle in ClawAI — GPT-5, o3 und mehr',
        description:
          'Die OpenAI-Modelle, an die ClawAI eine Unterhaltung routen kann, wofür jedes gebaut ist, und eine qualitative Kostenstufe. Prüfen Sie den aktuellen Katalog, bevor Sie einen Plan wählen.',
        keywords: ['OpenAI-Modelle ClawAI', 'GPT-5 in ClawAI', 'welches OpenAI-Modell verwenden'],
      },
      eyebrow: 'Modellanbieter',
      title: 'OpenAI',
      summary:
        'ClawAI hat einen aktiven Connector zu OpenAI, sodass eine Unterhaltung je nach Aufgabe, Kostenstufe und Routing-Modus an eines von mehreren OpenAI-Modellen weitergeleitet werden kann. Diese Seite nennt die Modelle, die ClawAI derzeit erreichen kann; sie ersetzt nicht den aktuellen Katalog auf der Preisseite.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Was die Modellreihe von OpenAI abdeckt',
          paragraphs: [
            'Die aktuelle Modellreihe von OpenAI umfasst eine Flaggschiff-Stufe für Reasoning und allgemeine Zwecke (GPT-5), eine leichtere und schlankere Variante (GPT-5 mini), einen multimodalen Allrounder (GPT-4o und GPT-4o mini) sowie zwei Modelle, die speziell für schrittweise Reasoning-Aufgaben gebaut sind (o3 und o4-mini). Der Router von ClawAI kann pro Anfrage zwischen ihnen wählen, statt Ihr gesamtes Konto auf eines festzulegen.',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: 'Wann eine Aufgabe zu einem OpenAI-Modell passt',
          paragraphs: [
            'OpenAI-Modelle sind eine vernünftige Standardwahl für allgemeines Schreiben, Unterstützung beim Programmieren und alltägliche Fragen, und die o-Serie ist speziell für mehrstufige Reasoning-Probleme gebaut, bei denen erwartet wird, dass das Modell eine Aufgabe durcharbeitet, statt sofort zu antworten. Welches Modell bei Ihrer Aufgabe tatsächlich am besten abschneidet, sollten Sie selbst prüfen — siehe unten, wie man KI-Modelle bewertet — statt es aus Marketingtexten zu übernehmen, auch nicht von dieser Seite.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Wie ClawAI dorthin routet',
          paragraphs: [
            'Der Router von ClawAI kann eine Anfrage unter Auto- oder Cost-Saver-Routing automatisch an ein OpenAI-Modell senden, oder Sie können im manuellen Modellmodus eines fest wählen. Die Kostenstufen unten sind qualitativ — günstigere Modelle kosten pro Anfrage spürbar weniger, aber der genaue Satz richtet sich nach der Preisgestaltung von OpenAI selbst, nicht nach etwas, das ClawAI steuert.',
          ],
        },
      ],
      faq: [
        {
          question: 'Hat ClawAI eine direkte Partnerschaft mit OpenAI?',
          answer:
            'Nein. ClawAI verbindet sich mit der öffentlichen API von OpenAI genau so, wie es jede Anwendung mit einem API-Schlüssel tun würde. Diese Seite impliziert keine besondere Vereinbarung.',
        },
        {
          question: 'Welches OpenAI-Modell sollte ich zum Programmieren verwenden?',
          answer:
            'Das hängt von der Aufgabe und dem Arbeitsbereich ab, in dem Sie sich befinden — siehe unten, wie man KI-Modelle bewertet, für eine Methode statt einer einzelnen Empfehlung. Diese Seite behauptet bewusst nicht, dass ein Modell das beste ist.',
        },
        {
          question: 'Ist GPT-5 immer in meinem Plan verfügbar?',
          answer:
            'Die Verfügbarkeit eines Modells wird durch Ihren Plan und den aktuellen Katalog bestimmt, nicht durch diese Seite. Prüfen Sie die aktuelle Modellreihe auf der Preisseite, bevor Sie einen Plan für ein bestimmtes Modell wählen.',
        },
      ],
      productNote:
        'ClawAI kann eine Anfrage automatisch an ein OpenAI-Modell routen, oder Sie können eines direkt festlegen — die Wahl liegt bei Ihnen, nicht an einen einzelnen Anbieter gebunden.',
      catalogDisclaimer:
        'Diese Liste spiegelt die OpenAI-Modelle wider, die ClawAI zum oben genannten Prüfdatum bepreist hat, kein Live-Feed. Die Modellverfügbarkeit ändert sich.',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'Anthropic-Claude-Modelle in ClawAI',
        description:
          'Die Claude-Modelle, an die ClawAI eine Unterhaltung routen kann — Opus, Sonnet und Haiku —, wofür jedes gebaut ist, und eine qualitative Kostenstufe. Prüfen Sie den aktuellen Katalog, bevor Sie einen Plan wählen.',
        keywords: [
          'Claude-Modelle ClawAI',
          'Anthropic in ClawAI',
          'Claude Opus vs Sonnet vs Haiku',
        ],
      },
      eyebrow: 'Modellanbieter',
      title: 'Anthropic',
      summary:
        'ClawAI hat einen aktiven Connector zu Anthropic, sodass eine Unterhaltung je nach Aufgabe, Kostenstufe und Routing-Modus an ein Claude-Modell weitergeleitet werden kann. Diese Seite nennt die Modelle, die ClawAI derzeit erreichen kann; sie ersetzt nicht den aktuellen Katalog auf der Preisseite.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Was die Claude-Modellreihe abdeckt',
          paragraphs: [
            'Die aktuelle Modellreihe von Anthropic hat drei Stufen: Claude Opus 4 an der Spitze, gebaut für die anspruchsvollsten und aufwendigsten Aufgaben; Claude Sonnet 4 als mittlere Stufe für allgemeine Zwecke; und Claude Haiku 4.5 als schnelle, kostengünstigere Option für einfachere Anfragen. Der Router von ClawAI kann pro Anfrage zwischen ihnen wechseln.',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: 'Wann eine Aufgabe zu einem Claude-Modell passt',
          paragraphs: [
            'Claude-Modelle werden häufig für die Arbeit mit langen Dokumenten, sorgfältiges schrittweises Schreiben und Unterstützung beim Programmieren eingesetzt, wo das genaue Befolgen detaillierter Anweisungen wichtig ist. Wie bei jedem Anbieter lohnt es sich, das richtige Modell für eine bestimmte Aufgabe an der eigenen Arbeitslast zu prüfen — siehe unten, wie man KI-Benchmarks liest, um zu verstehen, was eine veröffentlichte Zahl aussagt und was nicht.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Wie ClawAI dorthin routet',
          paragraphs: [
            'Der Router von ClawAI kann eine Anfrage unter Auto-, High-Reasoning- oder Cost-Saver-Routing automatisch an ein Claude-Modell senden, oder Sie können im manuellen Modellmodus eines fest wählen. Anthropic ist der einzige Anbieter in dieser Liste, der einen separaten Cache-Write-Satz veröffentlicht, was ein Abrechnungsdetail ist und kein Unterschied in den Fähigkeiten — es ändert nicht, was das Modell kann.',
          ],
        },
      ],
      faq: [
        {
          question: 'Was ist der Unterschied zwischen Opus, Sonnet und Haiku?',
          answer:
            'Es sind drei Kosten- und Leistungsstufen derselben Modellfamilie — Opus ist die höchste Stufe, Sonnet die mittlere Stufe, Haiku die schnellste und kostengünstigste Stufe. Der Router von ClawAI kann zwischen ihnen wählen, oder Sie wählen manuell.',
        },
        {
          question: 'Hat ClawAI eine direkte Partnerschaft mit Anthropic?',
          answer:
            'Nein. ClawAI verbindet sich mit der öffentlichen API von Anthropic genau so, wie es jede Anwendung mit einem API-Schlüssel tun würde.',
        },
        {
          question: 'Ist Claude Opus 4 in jedem Plan verfügbar?',
          answer:
            'Die Verfügbarkeit eines Modells wird durch Ihren Plan und den aktuellen Katalog bestimmt, nicht durch diese Seite. Prüfen Sie die aktuelle Modellreihe auf der Preisseite, bevor Sie einen Plan für ein bestimmtes Modell wählen.',
        },
      ],
      productNote:
        'ClawAI kann eine Anfrage automatisch an ein Claude-Modell routen, oder Sie können eines direkt festlegen — die Wahl liegt bei Ihnen, nicht an einen einzelnen Anbieter gebunden.',
      catalogDisclaimer:
        'Diese Liste spiegelt die Claude-Modelle wider, die ClawAI zum oben genannten Prüfdatum bepreist hat, kein Live-Feed. Die Modellverfügbarkeit ändert sich.',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'Google-Gemini-Modelle in ClawAI',
        description:
          'Die Gemini-Modelle, an die ClawAI eine Unterhaltung routen kann — 2.5 Pro, Flash und Flash-Lite —, wofür jedes gebaut ist, und eine qualitative Kostenstufe. Prüfen Sie den aktuellen Katalog, bevor Sie einen Plan wählen.',
        keywords: ['Gemini-Modelle ClawAI', 'Google AI in ClawAI', 'Gemini Pro vs Flash'],
      },
      eyebrow: 'Modellanbieter',
      title: 'Google Gemini',
      summary:
        'ClawAI hat einen aktiven Connector zu Google Gemini, sodass eine Unterhaltung je nach Aufgabe, Kostenstufe und Routing-Modus an ein Gemini-Modell weitergeleitet werden kann. Diese Seite nennt die Modelle, die ClawAI derzeit erreichen kann; sie ersetzt nicht den aktuellen Katalog auf der Preisseite.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Was die Gemini-Modellreihe abdeckt',
          paragraphs: [
            'Die aktuelle Modellreihe von Google hat drei Stufen: Gemini 2.5 Pro für die anspruchsvollsten Anfragen, Gemini 2.5 Flash als mittlere Stufe für allgemeine Zwecke und Gemini 2.5 Flash-Lite als schnelle, kostengünstigere Option. Der Router von ClawAI kann pro Anfrage zwischen ihnen wechseln.',
          ],
        },
        {
          id: 'when-google-fits',
          heading: 'Wann eine Aufgabe zu einem Gemini-Modell passt',
          paragraphs: [
            'Gemini-Modelle werden häufig für Aufgaben mit einer großen Menge an Ausgangsmaterial herangezogen, da die Familie auf die Verarbeitung langer Kontexte ausgelegt ist. Ob eine bestimmte Stufe zu Ihrer spezifischen Arbeitslast passt, lohnt sich selbst zu prüfen — siehe unten, wie man KI-Modelle bewertet, für eine wiederholbare Methode statt einer Ein-Satz-Behauptung.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Wie ClawAI dorthin routet',
          paragraphs: [
            'Der Router von ClawAI kann eine Anfrage unter Auto- oder Cost-Saver-Routing automatisch an ein Gemini-Modell senden, oder Sie können im manuellen Modellmodus eines fest wählen. Die veröffentlichten Preise von Gemini steigen oberhalb einer Schwelle für lange Kontexte, die die Kostenstufe dieser Seite nicht abzubilden versucht — eine einzelne qualitative Stufe ist nicht präzise genug, um einen gestaffelten Satz auszudrücken, also behandeln Sie sie als Ausgangspunkt, nicht als Rechnung.',
          ],
        },
      ],
      faq: [
        {
          question: 'Hat ClawAI eine direkte Partnerschaft mit Google?',
          answer:
            'Nein. ClawAI verbindet sich mit der Gemini-API genau so, wie es jede Anwendung mit einem API-Schlüssel tun würde.',
        },
        {
          question: 'Welches Gemini-Modell eignet sich am besten für lange Dokumente?',
          answer:
            'Die Familie ist über alle Stufen hinweg im Allgemeinen auf die Verarbeitung langer Kontexte ausgelegt; das genaue Limit und die Kosten hängen vom jeweiligen Modell und der Anfrage ab. Prüfen Sie den aktuellen Katalog, statt von einer festen Zahl auszugehen.',
        },
        {
          question: 'Ist Gemini 2.5 Pro in jedem Plan verfügbar?',
          answer:
            'Die Verfügbarkeit eines Modells wird durch Ihren Plan und den aktuellen Katalog bestimmt, nicht durch diese Seite. Prüfen Sie die aktuelle Modellreihe auf der Preisseite, bevor Sie einen Plan für ein bestimmtes Modell wählen.',
        },
      ],
      productNote:
        'ClawAI kann eine Anfrage automatisch an ein Gemini-Modell routen, oder Sie können eines direkt festlegen — die Wahl liegt bei Ihnen, nicht an einen einzelnen Anbieter gebunden.',
      catalogDisclaimer:
        'Diese Liste spiegelt die Gemini-Modelle wider, die ClawAI zum oben genannten Prüfdatum bepreist hat, kein Live-Feed. Die Modellverfügbarkeit ändert sich.',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'DeepSeek-Modelle in ClawAI',
        description:
          'Die DeepSeek-Modelle, an die ClawAI eine Unterhaltung routen kann — DeepSeek Chat und DeepSeek Reasoner —, wofür jedes gebaut ist, und eine qualitative Kostenstufe. Prüfen Sie den aktuellen Katalog, bevor Sie einen Plan wählen.',
        keywords: ['DeepSeek-Modelle ClawAI', 'DeepSeek in ClawAI', 'DeepSeek Chat vs Reasoner'],
      },
      eyebrow: 'Modellanbieter',
      title: 'DeepSeek',
      summary:
        'ClawAI hat einen aktiven Connector zu DeepSeek, sodass eine Unterhaltung je nach Aufgabe, Kostenstufe und Routing-Modus an ein DeepSeek-Modell weitergeleitet werden kann. Diese Seite nennt die Modelle, die ClawAI derzeit erreichen kann; sie ersetzt nicht den aktuellen Katalog auf der Preisseite.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Was die DeepSeek-Modellreihe abdeckt',
          paragraphs: [
            'Die aktuelle Modellreihe von DeepSeek umfasst zwei Modelle: DeepSeek Chat, ein Modell für allgemeine Zwecke, und DeepSeek Reasoner, speziell gebaut für Aufgaben, bei denen erwartet wird, dass das Modell mehrere Schritte durcharbeitet, bevor es antwortet. Beide sind deutlich günstiger bepreist als mehrere andere Anbieter auf dieser Seite, weshalb ein Cost-Saver-Routing-Modus häufiger auf DeepSeek zurückgreift.',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: 'Wann eine Aufgabe zu einem DeepSeek-Modell passt',
          paragraphs: [
            'DeepSeek ist eine vernünftige Option, wenn die Kosten pro Anfrage wichtiger sind als das letzte Quäntchen an Leistungsfähigkeit, und DeepSeek Reasoner speziell für mehrstufige Reasoning-Aufgaben. Wie bei jedem Anbieter sollten Sie dies an Ihrer eigenen Arbeitslast prüfen statt an einer allgemeinen Behauptung — siehe unten, wie man KI-Benchmarks liest.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Wie ClawAI dorthin routet',
          paragraphs: [
            'Der Router von ClawAI kann eine Anfrage unter Cost-Saver- oder Auto-Routing automatisch an ein DeepSeek-Modell senden, oder Sie können im manuellen Modellmodus eines fest wählen. Beide DeepSeek-Modelle fallen auf dieser Seite in die Standard-Kostenstufe — im Vergleich zu Premium-Stufen anderswo auf dieser Seite tatsächlich günstig, ohne dass diese Seite einen exakten Satz behauptet.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist DeepSeek günstiger als andere Anbieter?',
          answer:
            'Beide DeepSeek-Modelle liegen hier in der Standard-Kostenstufe, im Allgemeinen niedriger als Premium-Modelle anderer Anbieter — die genauen Preise richten sich jedoch nach den von DeepSeek selbst veröffentlichten Sätzen, nicht nach dieser Seite.',
        },
        {
          question: 'Wofür ist DeepSeek Reasoner gedacht?',
          answer:
            'Es ist für Aufgaben gebaut, bei denen das Modell mehrere Schritte durcharbeitet, bevor es eine Antwort erstellt, ähnlich in der Absicht wie die auf Reasoning ausgerichteten Modelle anderer Anbieter.',
        },
        {
          question: 'Hat ClawAI eine direkte Partnerschaft mit DeepSeek?',
          answer:
            'Nein. ClawAI verbindet sich mit der öffentlichen API von DeepSeek genau so, wie es jede Anwendung mit einem API-Schlüssel tun würde.',
        },
      ],
      productNote:
        'ClawAI kann eine Anfrage automatisch an ein DeepSeek-Modell routen, oder Sie können eines direkt festlegen — die Wahl liegt bei Ihnen, nicht an einen einzelnen Anbieter gebunden.',
      catalogDisclaimer:
        'Diese Liste spiegelt die DeepSeek-Modelle wider, die ClawAI zum oben genannten Prüfdatum bepreist hat, kein Live-Feed. Die Modellverfügbarkeit ändert sich.',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'xAI-Grok-Modelle in ClawAI',
        description:
          'Die xAI-Grok-Modelle, an die ClawAI eine Unterhaltung routen kann — Grok 4 und Grok 3 mini —, wofür jedes gebaut ist, und eine qualitative Kostenstufe. Prüfen Sie den aktuellen Katalog, bevor Sie einen Plan wählen.',
        keywords: ['Grok-Modelle ClawAI', 'xAI in ClawAI', 'Grok 4 in ClawAI'],
      },
      eyebrow: 'Modellanbieter',
      title: 'xAI',
      summary:
        'ClawAI hat einen aktiven Connector zu xAI, sodass eine Unterhaltung je nach Aufgabe, Kostenstufe und Routing-Modus an ein Grok-Modell weitergeleitet werden kann. Diese Seite nennt die Modelle, die ClawAI derzeit erreichen kann; sie ersetzt nicht den aktuellen Katalog auf der Preisseite.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Was die Grok-Modellreihe abdeckt',
          paragraphs: [
            'Die aktuelle Modellreihe von xAI umfasst zwei über ClawAI verfügbare Modelle: Grok 4, die leistungsfähigere Stufe, und Grok 3 mini, eine schnellere und kostengünstigere Option. Der Router von ClawAI kann pro Anfrage zwischen ihnen wechseln.',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: 'Wann eine Aufgabe zu einem Grok-Modell passt',
          paragraphs: [
            'Grok-Modelle sind eine vernünftige Option für allgemeine Zwecke neben den anderen Anbietern auf dieser Seite. Welches Modell bei einer bestimmten Aufgabe am besten abschneidet, lohnt sich selbst zu prüfen — siehe unten, wie man KI-Modelle bewertet, für eine Methode, die nicht auf dem Marketing eines einzelnen Anbieters beruht.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Wie ClawAI dorthin routet',
          paragraphs: [
            'Der Router von ClawAI kann eine Anfrage unter Auto- oder Cost-Saver-Routing automatisch an ein Grok-Modell senden, oder Sie können im manuellen Modellmodus eines fest wählen. Grok 3 mini liegt auf dieser Seite in der Budget-Kostenstufe; Grok 4 liegt in der Premium-Stufe.',
          ],
        },
      ],
      faq: [
        {
          question: 'Hat ClawAI eine direkte Partnerschaft mit xAI?',
          answer:
            'Nein. ClawAI verbindet sich mit der öffentlichen API von xAI genau so, wie es jede Anwendung mit einem API-Schlüssel tun würde.',
        },
        {
          question: 'Was ist der Unterschied zwischen Grok 4 und Grok 3 mini?',
          answer:
            'Es handelt sich um eine leistungsfähigere Stufe und eine schnellere, kostengünstigere Stufe derselben Modellfamilie. Der Router von ClawAI kann zwischen ihnen wählen, oder Sie wählen manuell.',
        },
        {
          question: 'Ist Grok 4 in jedem Plan verfügbar?',
          answer:
            'Die Verfügbarkeit eines Modells wird durch Ihren Plan und den aktuellen Katalog bestimmt, nicht durch diese Seite. Prüfen Sie die aktuelle Modellreihe auf der Preisseite, bevor Sie einen Plan für ein bestimmtes Modell wählen.',
        },
      ],
      productNote:
        'ClawAI kann eine Anfrage automatisch an ein Grok-Modell routen, oder Sie können eines direkt festlegen — die Wahl liegt bei Ihnen, nicht an einen einzelnen Anbieter gebunden.',
      catalogDisclaimer:
        'Diese Liste spiegelt die Grok-Modelle wider, die ClawAI zum oben genannten Prüfdatum bepreist hat, kein Live-Feed. Die Modellverfügbarkeit ändert sich.',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'Lokale KI-Modelle mit offenen Gewichten in ClawAI',
        description:
          'Betreiben Sie Modelle mit offenen Gewichten selbst mit Ollama oder llama.cpp über ClawAI, statt Anfragen an einen Cloud-Anbieter zu senden. Was der Mechanismus ist und wie er sich von den Cloud-Anbietern auf dieser Seite unterscheidet.',
        keywords: ['lokale KI-Modelle ClawAI', 'Ollama in ClawAI', 'KI-Modelle lokal ausführen'],
      },
      eyebrow: 'Modellanbieter',
      title: 'Lokale KI',
      summary:
        'ClawAI hat aktive Connectoren zu Ollama und llama.cpp, zwei Wege, ein Modell mit offenen Gewichten auf Hardware auszuführen, die Sie selbst kontrollieren, statt eine Anfrage an einen Cloud-Anbieter zu senden. Anders als bei den übrigen Seiten dieser Gruppe gibt es keinen festen Katalog zu nennen — die Modelle haben offene Gewichte, und Sie entscheiden, welche Sie ausführen.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Was das lokale Ausführen eines Modells tatsächlich ändert',
          paragraphs: [
            'Ein Cloud-Anbieter auf dieser Seite betreibt ein Modell auf eigener Infrastruktur und berechnet pro Anfrage. Ollama und llama.cpp laden stattdessen ein Modell mit offenen Gewichten auf Hardware, die Sie kontrollieren — Ihre eigene Maschine oder einen Server, den Sie betreiben —, sodass die Anfrage diese nie verlässt. Das ändert, wer die Anfrage sehen kann, nicht, wozu das Modell fähig ist; ein lokal ausgeführtes Modell mit offenen Gewichten ist etwas grundlegend anderes als jeder der andernorts in dieser Gruppe aufgeführten Cloud-Anbieter, kein direkter Ersatz für einen von ihnen.',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollama und llama.cpp sind zwei unterschiedliche Werkzeuge',
          paragraphs: [
            'Beide sind echte ClawAI-Connectoren, eignen sich aber für unterschiedliche Situationen — Ollama setzt auf einfaches Herunterladen und Ausführen eines Modells mit sinnvollen Standardeinstellungen, während llama.cpp direktere Kontrolle darüber gibt, wie ein Modell ausgeführt wird, auf Kosten von mehr manueller Einrichtung. Der vollständige Vergleich befindet sich unter Ollama vs. llama.cpp, unten verlinkt, statt hier wiederholt zu werden.',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: 'Auswahl, welches Modell mit offenen Gewichten ausgeführt werden soll',
          paragraphs: [
            'Diese Seite nennt bewusst kein bestimmtes Modell mit offenen Gewichten, weil sich das Feld schneller bewegt, als eine statische Seite es verfolgen kann, und eine veraltete Empfehlung schlimmer ist als keine. Was ist lokal-first KI, unten verlinkt, erklärt Modelle mit offenen Gewichten und die Abwägung gegenüber Cloud-Anbietern ausführlicher, als es eine Produktseite tun sollte.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kostet lokale KI über ClawAI etwas?',
          answer:
            'ClawAI berechnet für ein lokal ausgeführtes Modell keinen Preis pro Token, wie es das für einen Cloud-Anbieter tut, da kein Cloud-Anbieter abgerechnet wird — die Kosten sind die Hardware, die Sie bereits betreiben. Prüfen Sie das aktuelle Planverhalten auf der Preisseite.',
        },
        {
          question: 'Welches Modell mit offenen Gewichten sollte ich ausführen?',
          answer:
            'Diese Seite empfiehlt keines — siehe was ist lokal-first KI, unten verlinkt, für eine Herangehensweise an diese Entscheidung, da das richtige Modell von Ihrer Hardware und Aufgabe abhängt, in einer Weise, die eine statische Seite nicht verantwortungsvoll verfolgen kann.',
        },
        {
          question:
            'Ist ein lokal ausgeführtes Modell genauso leistungsfähig wie ein Cloud-Modell?',
          answer:
            'Das hängt vollständig vom jeweiligen Modell mit offenen Gewichten und Ihrer Hardware ab, und diese Seite wird dazu keine pauschale Aussage treffen. Siehe wie man KI-Modelle bewertet, unten verlinkt, um dies für Ihre eigene Arbeitslast zu prüfen.',
        },
      ],
      productNote:
        'Die Ollama- und llama.cpp-Connectoren von ClawAI sind echte, ausgelieferte Anbindungen — der Modus „Nur lokal“ hält jede Anfrage auf Hardware, die Sie kontrollieren.',
      catalogDisclaimer:
        'Hier wird absichtlich kein bestimmtes Modell genannt — Modelle mit offenen Gewichten und ihre Fähigkeiten ändern sich schnell, und Sie entscheiden, welche Sie ausführen. Prüfen Sie das Planverhalten für lokale Modelle auf der Preisseite.',
    },
  },
};
