import { Locale } from '@/enums/locale.enum';
import type { PluginOwnServersLocaleTranslation } from '@/types/i18n.types';

/**
 * Notices for a message that mentioned one of the user's own MCP servers that could not offer
 * tools this turn (ADR-184): the server is failing or slow, or its tools changed and wait for
 * review. Spread flat into `chat` in every locale (read as `chat.pluginOwnServer<Name>`), so a
 * missing locale or key is a type error. "MCP" is the protocol's name and stays as it is.
 */
export const PLUGIN_OWN_SERVERS_TRANSLATIONS: Record<Locale, PluginOwnServersLocaleTranslation> = {
  [Locale.EN]: {
    pluginOwnServerUnavailable:
      'One of your own MCP servers is not answering or keeps failing, so it was skipped for this message. The answer was written without it.',
    pluginOwnServerNeedsReview:
      'One of your MCP servers changed its tools and needs your review before chat can use it. The answer was written without it.',
  },
  [Locale.AR]: {
    pluginOwnServerUnavailable:
      'أحد خوادم MCP الخاصة بك لا يستجيب أو يفشل باستمرار، لذلك تم تخطيه في هذه الرسالة. كُتبت الإجابة بدونه.',
    pluginOwnServerNeedsReview:
      'غيّر أحد خوادم MCP الخاصة بك أدواته ويحتاج إلى مراجعتك قبل أن تتمكن المحادثة من استخدامه. كُتبت الإجابة بدونه.',
  },
  [Locale.DE]: {
    pluginOwnServerUnavailable:
      'Einer Ihrer eigenen MCP-Server antwortet nicht oder schlägt ständig fehl und wurde für diese Nachricht übersprungen. Die Antwort wurde ohne ihn verfasst.',
    pluginOwnServerNeedsReview:
      'Einer Ihrer MCP-Server hat seine Tools geändert und muss von Ihnen geprüft werden, bevor der Chat ihn nutzen kann. Die Antwort wurde ohne ihn verfasst.',
  },
  [Locale.ES]: {
    pluginOwnServerUnavailable:
      'Uno de tus propios servidores MCP no responde o falla de forma repetida, así que se omitió en este mensaje. La respuesta se escribió sin él.',
    pluginOwnServerNeedsReview:
      'Uno de tus servidores MCP cambió sus herramientas y necesita tu revisión antes de que el chat pueda usarlo. La respuesta se escribió sin él.',
  },
  [Locale.FA]: {
    pluginOwnServerUnavailable:
      'یکی از سرورهای MCP شخصی شما پاسخ نمی‌دهد یا مدام خطا می‌دهد، بنابراین برای این پیام کنار گذاشته شد. پاسخ بدون آن نوشته شد.',
    pluginOwnServerNeedsReview:
      'یکی از سرورهای MCP شما ابزارهایش را تغییر داده و پیش از آنکه گفتگو بتواند از آن استفاده کند باید بررسی شود. پاسخ بدون آن نوشته شد.',
  },
  [Locale.FR]: {
    pluginOwnServerUnavailable:
      "L'un de vos propres serveurs MCP ne répond pas ou échoue sans cesse ; il a été ignoré pour ce message. La réponse a été rédigée sans lui.",
    pluginOwnServerNeedsReview:
      "L'un de vos serveurs MCP a modifié ses outils et doit être examiné par vous avant que le chat puisse l'utiliser. La réponse a été rédigée sans lui.",
  },
  [Locale.HI]: {
    pluginOwnServerUnavailable:
      'आपका अपना एक MCP सर्वर जवाब नहीं दे रहा है या बार-बार विफल हो रहा है, इसलिए इस संदेश के लिए उसे छोड़ दिया गया। उत्तर उसके बिना लिखा गया।',
    pluginOwnServerNeedsReview:
      'आपके एक MCP सर्वर ने अपने टूल बदल दिए हैं और चैट के उपयोग से पहले उसकी आपकी समीक्षा ज़रूरी है। उत्तर उसके बिना लिखा गया।',
  },
  [Locale.IT]: {
    pluginOwnServerUnavailable:
      'Uno dei tuoi server MCP non risponde o continua a fallire, quindi è stato saltato per questo messaggio. La risposta è stata scritta senza di esso.',
    pluginOwnServerNeedsReview:
      'Uno dei tuoi server MCP ha cambiato i suoi strumenti e deve essere riesaminato da te prima che la chat possa usarlo. La risposta è stata scritta senza di esso.',
  },
  [Locale.JA]: {
    pluginOwnServerUnavailable:
      'お客様ご自身の MCP サーバーのひとつが応答しないか、失敗を繰り返しているため、このメッセージでは使用しませんでした。回答はそのサーバーなしで作成されました。',
    pluginOwnServerNeedsReview:
      'お客様の MCP サーバーのひとつがツールを変更したため、チャットで使用する前に確認が必要です。回答はそのサーバーなしで作成されました。',
  },
  [Locale.PT]: {
    pluginOwnServerUnavailable:
      'Um dos seus próprios servidores MCP não está respondendo ou falha com frequência, por isso foi ignorado nesta mensagem. A resposta foi escrita sem ele.',
    pluginOwnServerNeedsReview:
      'Um dos seus servidores MCP alterou as ferramentas e precisa da sua revisão antes de o chat poder usá-lo. A resposta foi escrita sem ele.',
  },
  [Locale.RU]: {
    pluginOwnServerUnavailable:
      'Один из ваших собственных MCP-серверов не отвечает или постоянно даёт сбои, поэтому в этом сообщении он пропущен. Ответ написан без него.',
    pluginOwnServerNeedsReview:
      'Один из ваших MCP-серверов изменил свои инструменты, и его нужно проверить, прежде чем чат сможет им пользоваться. Ответ написан без него.',
  },
  [Locale.TH]: {
    pluginOwnServerUnavailable:
      'เซิร์ฟเวอร์ MCP ของคุณเองตัวหนึ่งไม่ตอบสนองหรือล้มเหลวซ้ำ ๆ จึงถูกข้ามสำหรับข้อความนี้ คำตอบถูกเขียนโดยไม่มีเซิร์ฟเวอร์นั้น',
    pluginOwnServerNeedsReview:
      'เซิร์ฟเวอร์ MCP ของคุณตัวหนึ่งเปลี่ยนเครื่องมือและต้องให้คุณตรวจสอบก่อนที่แชตจะใช้งานได้ คำตอบถูกเขียนโดยไม่มีเซิร์ฟเวอร์นั้น',
  },
  [Locale.ZH]: {
    pluginOwnServerUnavailable:
      '您自己的某个 MCP 服务器没有响应或持续失败，因此本条消息已跳过它。回答在没有它的情况下生成。',
    pluginOwnServerNeedsReview:
      '您的某个 MCP 服务器更改了工具，需要您审核后聊天才能使用。回答在没有它的情况下生成。',
  },
};
