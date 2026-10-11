import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const DE_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'In der App ansehen',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'Ein ClawAI-Chat mit einer Frage, der geschriebenen Antwort, einem Label mit dem antwortenden Modell und den Routing-Details unter der Antwort.',
      caption: 'Jede Antwort zeigt, welches Modell sie geschrieben hat und warum.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'Das ClawAI-Eingabefeld mit geöffneter Modellauswahl, die die wählbaren Modelle auflistet.',
      caption: 'Wähle ein Modell selbst oder lass AUTO wählen.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'Das Eingabefeld mit eingeschalteter Websuche und sichtbarer Auswahl des Suchanbieters.',
      caption: 'Schalte die Websuche ein und wähle, wie gesucht wird.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'Das Eingabefeld mit geöffnetem Kontextmenü, das dein Gedächtnis und deine Kontextpakete anbietet.',
      caption: 'Bring dein Gedächtnis und deine Kontextpakete in jeden Chat.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'Der Dialog „Diesen Chat teilen“ über einer Unterhaltung, mit den Optionen zum Teilen.',
      caption: 'Teile einen Chat per Link, zu deinen Bedingungen.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'Die Vergleichsseite mit drei ausgewählten Modellen und einem eingegebenen Prompt, bereit zum Senden.',
      caption: 'Stelle eine Frage und sieh drei Modelle nebeneinander antworten.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'Die Konsens-Seite, auf der mehrere Modelle dieselbe Frage beantworten und auf ein gemeinsames Ergebnis hinarbeiten.',
      caption: 'Lass mehrere Modelle antworten und erhalte eine gemeinsame Antwort.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'Die Dateiseite mit den von dir hochgeladenen Dateien und den Dateien, die ClawAI für dich erstellt hat.',
      caption: 'Deine Uploads und erzeugten Dateien an einem Ort.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'Die Gedächtnis-Seite zeigt, was ClawAI über dich weiß; du kannst es prüfen und bearbeiten.',
      caption: 'Sieh und steuere, was ClawAI sich merkt.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'Die Kontext-Seite mit wiederverwendbaren Kontextpaketen, die du an Chats anhängen kannst.',
      caption: 'Wiederverwendbare Kontextpakete für Arbeit, die sich wiederholt.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'Die Konnektoren-Seite mit den Diensten, die du mit deinem Arbeitsbereich verbinden kannst.',
      caption: 'Verbinde deine Tools, damit die KI mit ihnen arbeiten kann.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'Die Abrechnungsseite mit den verfügbaren Tarifen und dem aktuellen Tarif.',
      caption: 'Klare Tarife, und du siehst immer, welcher aktiv ist.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'Die Tarifseite zeigt, was dein Tarif enthält und wie viel davon du schon genutzt hast.',
      caption: 'Sieh genau, was dein Tarif enthält.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'Die Nutzungsseite mit Diagrammen, wie viele Tokens du im Zeitverlauf verbraucht hast.',
      caption: 'Verfolge deine Nutzung in Echtzeit.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'Die Einstellungsseite, bis zur Karte für Benachrichtigungen mit ihren Schaltern gescrollt.',
      caption: 'Wähle, welche Benachrichtigungen du erhältst.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'Die Threads-Seite mit deiner Liste von Threads und dem Status jedes einzelnen.',
      caption: 'Alle deine Threads und der Stand jedes einzelnen.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'Der Entwurf eines Threads auf der Prüfseite, vor der Veröffentlichung.',
      caption: 'Prüfe einen Entwurf, bevor etwas öffentlich wird.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'Das über die Glocke geöffnete Benachrichtigungsfeld mit einigen aktuellen Benachrichtigungen.',
      caption: 'Erfahre sofort, wenn etwas fertig ist.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'Eine kurze Produkttour-Karte auf der Chat-Seite, die auf eine Funktion zeigt.',
      caption: 'Eine kurze Tour zeigt dir alles.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'Das ClawAI-Dashboard mit einem Überblick über deine letzte Aktivität und Nutzung.',
      caption: 'Dein Arbeitsbereich auf einen Blick.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'Die Observability-Ansicht für Administratoren im Tab „Verbrauch“, mit Diagrammen zur Nutzung der Modelle.',
      caption: 'Administratoren sehen den Verbrauch in Diagrammen.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'Eine ClawAI-Chat-Unterhaltung auf einem Smartphone-Bildschirm.',
      caption: 'Derselbe Chat, auf deinem Smartphone.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'Das ClawAI-Dashboard auf einem Smartphone-Bildschirm.',
      caption: 'Dein Dashboard passt auch auf einen kleinen Bildschirm.',
    },
  },
};
