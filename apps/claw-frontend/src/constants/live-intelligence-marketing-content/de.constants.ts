import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligenceMarketingSeo,
} from '@/types/live-intelligence-marketing-content.types';

/**
 * The German copy of the public Live & Video Intelligence pages. Every claim mirrors the English
 * file (`en.constants.ts`); nothing here may say more than it does.
 */
export const DE_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Neu in ClawAI: Live & Video Intelligence',
  title: 'Jeder Livestream, jedes Video – verstanden in deiner Sprache',
  intro:
    'Füge den Link zu einem Livestream oder einem aufgezeichneten Video von mehr als 30 Plattformen ein. ClawAI begleitet ihn mit Live-Untertiteln und einem laufenden Feed aus Zusammenfassungen und Höhepunkten – oder macht mit einem Klick aus dem ganzen Video einen übersichtlichen Bericht. Alles läuft auf den Servern von ClawAI und funktioniert deshalb auf jedem Gerät, auch auf deinem Smartphone.',
  openCta: 'Jetzt Link einfügen',
  signUpCta: 'Kostenloses Konto erstellen',
  howItWorksCta: 'So funktioniert es',
  videosTitle: 'In Aktion sehen',
  videosIntro:
    'Zwei kurze Clips aus dem echten Produkt. Tippe auf Abspielen: Sie laufen standardmäßig ohne Ton und in Schleife, du kannst sie also überall ansehen.',
  videos: [
    {
      title: 'Das KI-Analyse-Panel neben einem Gameplay-Stream',
      body: 'Ein Gaming-Stream läuft, während das KI-Analyse-Panel fortlaufend festhält, was auf dem Bildschirm passiert und was gesagt wird.',
    },
    {
      title: 'Ein arabischer Live-Nachrichtenstream mit englischen Untertiteln auf dem Smartphone',
      body: 'Eine Handyaufnahme einer Live-Nachrichtensendung auf YouTube: Die Moderatorin spricht Arabisch, die Untertitel erscheinen auf Englisch, und der Intelligente Feed fasst die Geschichte bis zu diesem Punkt zusammen.',
    },
  ],
  stepsTitle: 'So funktioniert es – in vier Schritten',
  stepsIntro: 'Vom eingefügten Link zu Notizen, die du behalten kannst. Ohne Installation.',
  steps: [
    {
      title: 'Link einfügen',
      body: 'Füge die Adresse eines Livestreams oder eines aufgezeichneten Videos ein: ein Reel, einen Beitrag, ein Short oder einen vergangenen Stream. ClawAI prüft zuerst, ob sich die Quelle lesen lässt, bevor irgendetwas startet.',
    },
    {
      title: 'Sprache und Modus wählen',
      body: 'Wähle die Sprache, in der du lesen möchtest – aus den 13 Sprachen der App – und einen Analysemodus: Ton, Ton + Bild oder Intelligent automatisch.',
    },
    {
      title: 'Live mitverfolgen oder „Video zusammenfassen“ klicken',
      body: 'Verfolge alles mit Untertiteln und einem Intelligenten Feed aus Zusammenfassungen, Höhepunkten und Bildnotizen. Bei einem aufgezeichneten Video kannst du stattdessen auf „Video zusammenfassen“ klicken und bekommst den kompletten Bericht auf einmal.',
    },
    {
      title: 'Exportieren und teilen',
      body: 'Alles wird in deinem Verlauf gespeichert. Exportiere es als PDF, Markdown oder TXT und teile es mit allen, die es brauchen.',
    },
  ],
  screenshotsTitle: 'So sieht es auf dem Smartphone aus',
  screenshotsIntro:
    'Echte Bildschirme aus der App, aufgenommen auf einem Smartphone im dunklen Design.',
  screenshots: [
    {
      title: 'Einen Link zu einem Livestream oder Video einfügen',
      body: 'Ein einziges Feld nimmt Links von jeder unterstützten Plattform an. Sprache und Modus wählen, dann starten.',
    },
    {
      title: 'Der Live-Feed mit Untertiteln, Zusammenfassungen und Höhepunkten',
      body: 'Die Untertitel laufen ein paar Sekunden hinter dem Gesprochenen her, während der Intelligente Feed Zusammenfassungen, Höhepunkte und Bildnotizen aktuell hält.',
    },
    {
      title: 'Eine Videozusammenfassung mit einem Klick',
      body: 'Der fertige Bericht: eine Gesamtzusammenfassung, Schlüsselmomente mit Zeitstempeln, Höhepunkte und das vollständige Transkript.',
    },
  ],
  outcomesTitle: 'Was es für dich leistet',
  outcomes: [
    {
      title: 'Einen zweistündigen Stream in Minuten nachholen',
      body: 'Lies die Zusammenfassung und die Schlüsselmomente, statt dich durch die ganze Aufzeichnung zu spulen. Jeder Moment hat einen Zeitstempel, sodass du direkt zur entscheidenden Stelle springen kannst.',
    },
    {
      title: 'Fremdsprachige Sendungen in deiner Sprache verfolgen',
      body: 'Eine Pressekonferenz auf Japanisch, ein Spielkommentar auf Spanisch, Nachrichten auf Arabisch: Lies Untertitel und Zusammenfassungen in der Sprache, die du wählst.',
    },
    {
      title: 'Nie wieder den entscheidenden Moment verpassen',
      body: 'Höhepunkte werden schon während des Streams herausgefiltert – du kannst also kurz wegschauen und weißt trotzdem, was gerade passiert ist.',
    },
    {
      title: 'Notizen für Meetings, Vorlesungen, Nachrichten und Gaming',
      body: 'Mach aus einem öffentlichen Webinar, einer aufgezeichneten Vorlesung, einem Eilmeldungs-Stream oder einem Turnier Notizen, die du durchsuchen, aufbewahren und exportieren kannst.',
    },
    {
      title: 'Funktioniert auf jedem Gerät',
      body: 'ClawAI liest den Stream auf den eigenen Servern. Du musst nichts von deinem Bildschirm teilen, deshalb funktioniert es auf Smartphone, Tablet und Computer genau gleich.',
    },
    {
      title: 'Dein Verlauf, deine Exporte',
      body: 'Was du dir angesehen hast und jede Zusammenfassung, die du erstellt hast, bleiben in deinem Verlauf – bereit zum Export als PDF, Markdown oder TXT.',
    },
  ],
  waysTitle: 'Zwei Arten, es zu nutzen',
  waysIntro:
    'Verfolge einen Stream, während er läuft, oder gib ClawAI ein aufgezeichnetes Video und erhalte den Bericht in einem Rutsch.',
  ways: [
    {
      title: 'Live-Analyse: mitverfolgen',
      body: 'Untertitel erscheinen etwa 7 bis 12 Sekunden nach dem Gesprochenen, und ein laufender Intelligenter Feed ergänzt Zusammenfassungen, Höhepunkte und Bildnotizen. Plattformen mit Live-Chat bekommen einen eigenen Chat-Tab. Ein aufgezeichnetes Video spielt ClawAI von Anfang an in normaler Geschwindigkeit ab, und die Analyse läuft mit.',
    },
    {
      title: 'Video zusammenfassen: ein Klick',
      body: 'Bei einem aufgezeichneten Video verarbeitet ClawAI das ganze Video auf einmal und liefert einen vollständigen Bericht: eine Gesamtzusammenfassung, Schlüsselmomente mit Zeitstempeln, Höhepunkte und das vollständige Transkript. Er wird in deinem Verlauf gespeichert und lässt sich als PDF, Markdown oder TXT exportieren.',
    },
  ],
  waysTableCaption: 'Live-Analyse und Zusammenfassung mit einem Klick im direkten Vergleich',
  waysTableAspect: 'Was du bekommst',
  waysTableLive: 'Live-Analyse',
  waysTableSummary: 'Video zusammenfassen',
  waysRows: [
    {
      label: 'Funktioniert mit',
      live: 'Livestreams und aufgezeichneten Videos',
      summary: 'Aufgezeichneten Videos bis 3 Stunden',
    },
    {
      label: 'Timing',
      live: 'Folgt dem Video in Echtzeit, Untertitel etwa 7 bis 12 Sekunden verzögert',
      summary: 'Das ganze Video wird auf einmal verarbeitet',
    },
    {
      label: 'Ergebnis',
      live: 'Untertitel und ein Intelligenter Feed aus Zusammenfassungen, Höhepunkten und Bildnotizen',
      summary:
        'Gesamtzusammenfassung, Schlüsselmomente mit Zeitstempeln, Höhepunkte und vollständiges Transkript',
    },
    {
      label: 'Live-Chat',
      live: 'Ein Chat-Tab auf Plattformen, die einen haben',
      summary: 'Nicht nötig',
    },
    {
      label: 'Aufbewahren',
      live: 'Im Verlauf gespeichert, Export als PDF, Markdown oder TXT',
      summary: 'Im Verlauf gespeichert, Export als PDF, Markdown oder TXT',
    },
  ],
  modesTitle: 'Drei Analysemodi',
  modesIntro: 'Der Modus bestimmt, worauf ClawAI achtet. Du wählst ihn vor dem Start.',
  modes: [
    {
      title: 'Ton',
      body: 'Untertitel, Zusammenfassungen und Höhepunkte aus dem, was gesagt wird. Ideal für Vorträge, Interviews, Podcasts, Vorlesungen und Nachrichten.',
    },
    {
      title: 'Ton + Bild',
      body: 'Berücksichtigt zusätzlich, was auf dem Bildschirm zu sehen ist – Folien, Diagramme, Spielstände oder Gameplay –, damit die Notizen beschreiben, was du siehst und was du hörst.',
    },
    {
      title: 'Intelligent automatisch',
      body: 'Startet mit dem Ton und schaut sich das Bild an, wenn es voraussichtlich wichtig ist, zum Beispiel wenn die sprechende Person verstummt oder die Szene wechselt.',
    },
  ],
  researchNote:
    'Recherche: Für eine Zusammenfassung kann eine Websuche laufen, um Kontext zu ergänzen – etwa wer eine sprechende Person ist oder worauf sich ein Ereignis bezieht.',
  languagesTitle: 'Lies es in deiner Sprache',
  languagesParagraphs: [
    'Wähle eine der 13 Sprachen der App: Englisch, Arabisch, Deutsch, Spanisch, Persisch, Französisch, Hindi, Italienisch, Japanisch, Portugiesisch, Russisch, Thai oder Chinesisch. Gesprochen werden darf in jeder Sprache.',
    'Spricht die Person bereits in deiner Sprache, liest du ihre genauen Worte. Wenn nicht, werden Untertitel, Zusammenfassungen und Höhepunkte übersetzt, und die Übersetzung erscheint anstelle des Originals.',
  ],
  platformsTitle: 'Mehr als 30 Plattformen',
  platformsBody:
    'YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili, Niconico, CHZZK, SOOP und viele mehr. Livestreams und aufgezeichnete Videos funktionieren gleichermaßen.',
  platformsCta: 'Alle Plattformen ansehen',
  limitsTitle: 'Gut zu wissen',
  limits: [
    {
      title: 'Nur öffentliche Videos und Streams',
      body: 'ClawAI kann nur öffentliche Videos und Streams lesen. Manche Plattformen oder einzelne Videos verweigern den Zugriff von einem Server; in diesem Fall sagt ClawAI dir das offen, statt etwas vorzutäuschen.',
    },
    {
      title: 'Aufgezeichnete Videos bis 3 Stunden',
      body: 'Ein aufgezeichnetes Video darf bis zu 3 Stunden lang sein – für die Live-Analyse ebenso wie für die Zusammenfassung mit einem Klick.',
    },
    {
      title: 'Untertitel kommen ein paar Sekunden später',
      body: 'Sprache wird in kurzen Abschnitten transkribiert, deshalb erscheinen Untertitel etwa 7 bis 12 Sekunden nach dem Gesprochenen. Das ist keine Sofort-Untertitelung.',
    },
    {
      title: 'Jeden Monat Freiminuten, bezahlte Minuten nur mit deiner Zustimmung',
      body: 'Jeder Tarif enthält jeden Monat Freiminuten. Danach werden Minuten erst berechnet, wenn du zustimmst. Eine Zusammenfassung mit einem Klick zählt die Länge des Videos in Minuten.',
    },
  ],
  faqTitle: 'Häufige Fragen',
  faq: [
    {
      question: 'Funktioniert es auf meinem Smartphone?',
      answer:
        'Ja. ClawAI liest den Stream oder das Video auf den eigenen Servern, du musst also nichts von deinem Bildschirm teilen. Es funktioniert auf Smartphones, Tablets und Computern gleichermaßen.',
    },
    {
      question: 'In welchen Sprachen kann ich die Untertitel lesen?',
      answer:
        'In jeder der 13 Sprachen der App: Englisch, Arabisch, Deutsch, Spanisch, Persisch, Französisch, Hindi, Italienisch, Japanisch, Portugiesisch, Russisch, Thai und Chinesisch. Gesprochen werden darf in jeder Sprache. Spricht die Person bereits deine Sprache, siehst du ihre genauen Worte; andernfalls erscheint die Übersetzung anstelle des Originals.',
    },
    {
      question: 'Funktioniert es mit aufgezeichneten Videos oder nur mit Livestreams?',
      answer:
        'Mit beidem. Füge einen Livestream ein oder ein aufgezeichnetes Video wie ein Reel, einen Beitrag, ein Short oder einen vergangenen Stream. Ein aufgezeichnetes Video kannst du von Anfang an in normaler Geschwindigkeit mitverfolgen oder auf „Video zusammenfassen“ klicken, um den kompletten Bericht auf einmal zu erhalten.',
    },
    {
      question: 'Wie lang darf ein Video sein?',
      answer: 'Ein aufgezeichnetes Video darf bis zu 3 Stunden lang sein.',
    },
    {
      question: 'Was enthält eine Zusammenfassung mit einem Klick?',
      answer:
        'Eine Gesamtzusammenfassung, die Schlüsselmomente mit Zeitstempeln, Höhepunkte und das vollständige Transkript. Sie wird in deinem Verlauf gespeichert und lässt sich als PDF, Markdown oder TXT exportieren.',
    },
    {
      question: 'Wie wird abgerechnet?',
      answer:
        'Jeder Tarif enthält jeden Monat Freiminuten. Danach zahlst du pro Minute – und nur, nachdem du zugestimmt hast. Eine Zusammenfassung mit einem Klick zählt die Länge des Videos in Minuten.',
    },
    {
      question: 'Sind die Untertitel in Echtzeit?',
      answer:
        'Fast. Untertitel erscheinen etwa 7 bis 12 Sekunden nach dem Gesprochenen, weil der Ton in kurzen Abschnitten transkribiert wird. Zusammenfassungen und Höhepunkte folgen den Untertiteln.',
    },
    {
      question: 'Welche Plattformen werden unterstützt?',
      answer:
        'Mehr als 30, darunter YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili und Niconico. Die Plattformseite listet sie alle auf. Es lassen sich nur öffentliche Videos und Streams lesen, und Discord wird nicht unterstützt, weil es keine öffentlichen Links hat.',
    },
    {
      question: 'Postet oder chattet ClawAI in meinem Namen?',
      answer:
        'Nein. ClawAI liest den Stream nur. Es postet, kommentiert oder chattet nie für dich auf irgendeiner Plattform. Was im Stream und in seinem Chat gesagt wird, gilt als nicht vertrauenswürdige Daten, die zusammengefasst werden – niemals als Anweisungen an ClawAI.',
    },
    {
      question: 'Wer kann sehen, was ich mir angesehen habe?',
      answer:
        'Dein Verlauf gehört dir. Die Analysen, die du angesehen hast, und die Zusammenfassungen, die du erstellt hast, bleiben in deinem Konto, bis du sie löschst – und du entscheidest, was du exportierst oder teilst.',
    },
  ],
  closingTitle: 'Füge deinen ersten Link ein',
  closingBody:
    'Ein Live-Spiel, eine Pressekonferenz, eine Vorlesung oder ein zweistündiger Stream, den du verpasst hast: Link einfügen, Sprache wählen und ClawAI die Notizen machen lassen. Jeder Tarif enthält jeden Monat Freiminuten.',
  platformsPage: {
    eyebrow: 'Neu in ClawAI: Live & Video Intelligence',
    title: 'Alle Plattformen, die Live & Video Intelligence lesen kann',
    intro:
      'Füge einen Link von einer dieser Plattformen ein, live oder aufgezeichnet. ClawAI liest ihn auf den eigenen Servern und funktioniert deshalb auf jedem Gerät, auch auf dem Smartphone.',
    openCta: 'Jetzt Link einfügen',
    backCta: 'Zurück zu Live & Video Intelligence',
    groupsTitle: 'Plattformen nach Art',
    groupsIntro:
      'Plattformnamen sind Marken ihrer jeweiligen Inhaber. ClawAI steht in keiner Verbindung zu ihnen und wird nicht von ihnen unterstützt.',
    groups: {
      [LiveMarketingPlatformGroup.GLOBAL_VIDEO]: {
        title: 'Globale Videoportale',
        body: 'Die großen Videoseiten, die Menschen jeden Tag teilen – von langen Vorträgen und Vorlesungen bis zu kurzen Clips und Audiosendungen.',
      },
      [LiveMarketingPlatformGroup.GAMING_STREAMING]: {
        title: 'Gaming und Streaming',
        body: 'Live-Gaming, E-Sport und Creator-Streams, bei denen ein Live-Chat-Tab direkt neben der Analyse sitzt.',
      },
      [LiveMarketingPlatformGroup.SOCIAL]: {
        title: 'Soziale Netzwerke',
        body: 'Reels, Beiträge, Shorts und Liveübertragungen aus sozialen Netzwerken und Messaging-Kanälen.',
      },
      [LiveMarketingPlatformGroup.ASIA]: {
        title: 'Asien',
        body: 'Video- und Liveplattformen aus China, Japan, Korea und ganz Asien – lesbar in jeder der 13 Sprachen der App.',
      },
    },
    liveTag: 'Live',
    videoTag: 'Videos',
    supportTitle: 'Was auf jeder Plattform funktioniert',
    supportIntro: 'Überall, wo ClawAI die Quelle lesen kann, funktionieren dieselben drei Dinge.',
    support: [
      {
        title: 'Livestreams',
        body: 'Untertitel etwa 7 bis 12 Sekunden nach dem Gesprochenen, ein Intelligenter Feed aus Zusammenfassungen, Höhepunkten und Bildnotizen und ein Live-Chat-Tab, wo die Plattform einen hat.',
      },
      {
        title: 'Aufgezeichnete Videos',
        body: 'Reels, Beiträge, Shorts und vergangene Streams bis zu 3 Stunden Länge. ClawAI spielt das Video von Anfang an in normaler Geschwindigkeit ab, und die Analyse läuft mit.',
      },
      {
        title: 'Zusammenfassung mit einem Klick',
        body: 'Klicke bei einem aufgezeichneten Video auf „Video zusammenfassen“ und erhalte eine Gesamtzusammenfassung, Schlüsselmomente mit Zeitstempeln, Höhepunkte und das vollständige Transkript.',
      },
    ],
    limitsTitle: 'Die ehrlichen Grenzen',
    limits: [
      {
        title: 'Nur öffentlich',
        body: 'Es lassen sich nur öffentliche Videos und Streams lesen. Private Inhalte oder Inhalte nur für Mitglieder sind nicht lesbar.',
      },
      {
        title: 'Eine Plattform kann Nein sagen',
        body: 'Manche Plattformen oder einzelne Videos verweigern den Zugriff von einem Server. Dann sagt ClawAI dir das offen, statt ein falsches Ergebnis zu zeigen.',
      },
      {
        title: 'Discord wird nicht unterstützt',
        body: 'Discord-Streams haben keine öffentlichen Links, also gibt es nichts, was ein Server öffnen könnte.',
      },
    ],
    faqTitle: 'Fragen zu den Plattformen',
    faq: [
      {
        question: 'Wird meine Plattform unterstützt?',
        answer:
          'Wenn sie auf dieser Seite steht, füge den Link ein – ClawAI prüft ihn, bevor irgendetwas startet. Verweigert die Plattform oder das Video den Serverzugriff, siehst du das sofort.',
      },
      {
        question: 'Funktionieren Livestreams und aufgezeichnete Videos beide?',
        answer:
          'Ja, auf jeder aufgeführten Plattform. Ein aufgezeichnetes Video bis zu 3 Stunden Länge lässt sich außerdem mit einem Klick zusammenfassen.',
      },
      {
        question: 'Warum kann ein Video scheitern, obwohl seine Plattform aufgeführt ist?',
        answer:
          'Eine Plattform kann verhindern, dass ein einzelnes Video von einem Server gelesen wird – selbst ein öffentliches. In diesem Fall sagt ClawAI dir das sofort. Private Videos und Streams lassen sich nie lesen.',
      },
      {
        question: 'Warum fehlt Discord?',
        answer:
          'Discord-Streams haben keinen öffentlichen Link, den ein Server öffnen könnte, deshalb kann ClawAI sie nicht lesen.',
      },
    ],
    closingTitle: 'Deine Plattform gefunden?',
    closingBody:
      'Link einfügen, Sprache wählen und loslegen. Jeder Tarif enthält jeden Monat Freiminuten.',
  },
};

/** German SEO copy for both pages; claims mirror the English file. */
export const DE_LIVE_INTELLIGENCE_MARKETING_SEO: LiveIntelligenceMarketingSeo = {
  overview: {
    title: 'Live & Video Intelligence: Live-Untertitel und Videozusammenfassung per Klick',
    description:
      'Füge einen Link zu einem Livestream oder Video von YouTube, Twitch, TikTok und 30+ Plattformen ein. Erhalte Live-Untertitel in deiner Sprache, einen Intelligenten Feed mit Zusammenfassungen und Höhepunkten oder eine Videozusammenfassung mit Zeitstempeln per Klick. Auf jedem Gerät.',
    keywords: [
      'Livestream Untertitel',
      'YouTube Video zusammenfassen',
      'KI Videozusammenfassung',
      'Live-Untertitel übersetzen',
      'Livestream Highlights',
    ],
  },
  platforms: {
    title: 'Unterstützte Plattformen für Live & Video Intelligence',
    description:
      'Alle Plattformen, die ClawAI für Live-Untertitel und Videozusammenfassungen lesen kann: YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X, Bilibili, Niconico, CHZZK, SOOP und mehr, nach Art gruppiert.',
    keywords: [
      'unterstützte Videoplattformen',
      'Livestream Plattformen',
      'Twitch Untertitel',
      'Videozusammenfassung Plattformen',
    ],
  },
};
