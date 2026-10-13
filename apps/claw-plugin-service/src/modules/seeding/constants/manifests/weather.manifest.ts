import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../../common/enums/runtime-kind.enum';
import { type PluginManifestInput } from '../../../catalog/schemas/plugin-manifest.schema';

export const WEATHER_MANIFEST: PluginManifestInput = {
  manifestVersion: 1,
  slug: 'weather',
  version: '1.0.0',
  publisher: 'ClawAI',
  category: 'data',
  iconKey: 'cloud',
  homepageUrl: 'https://open-meteo.com',
  translations: {
    en: {
      name: 'Weather',
      summary: 'Current weather and a short forecast for any place.',
      description:
        'Looks up current conditions and a short forecast for a city or place name using the open Open-Meteo service. Only the place name you give is sent.',
    },
    ar: {
      name: 'الطقس',
      summary: 'الطقس الحالي وتوقعات قصيرة لأي مكان.',
      description:
        'يبحث عن الأحوال الجوية الحالية وتوقعات قصيرة لمدينة أو مكان بالاسم باستخدام خدمة Open-Meteo المفتوحة. لا يُرسل سوى اسم المكان الذي تذكره.',
    },
    de: {
      name: 'Wetter',
      summary: 'Aktuelles Wetter und kurze Vorhersage für jeden Ort.',
      description:
        'Fragt die aktuellen Bedingungen und eine kurze Vorhersage für eine Stadt oder einen Ortsnamen über den offenen Dienst Open-Meteo ab. Gesendet wird nur der Ortsname, den du nennst.',
    },
    es: {
      name: 'Clima',
      summary: 'Clima actual y pronóstico corto para cualquier lugar.',
      description:
        'Consulta las condiciones actuales y un pronóstico corto de una ciudad o lugar mediante el servicio abierto Open-Meteo. Solo se envía el nombre del lugar que indiques.',
    },
    fa: {
      name: 'آب‌وهوا',
      summary: 'وضعیت فعلی هوا و پیش‌بینی کوتاه برای هر مکان.',
      description:
        'وضعیت فعلی هوا و پیش‌بینی کوتاه یک شهر یا مکان را با سرویس باز Open-Meteo جست‌وجو می‌کند. فقط نام مکانی که شما بگویید ارسال می‌شود.',
    },
    fr: {
      name: 'Météo',
      summary: "Météo actuelle et prévisions courtes pour n'importe quel lieu.",
      description:
        'Recherche les conditions actuelles et une courte prévision pour une ville ou un lieu grâce au service ouvert Open-Meteo. Seul le nom du lieu que vous indiquez est envoyé.',
    },
    hi: {
      name: 'मौसम',
      summary: 'किसी भी जगह का मौजूदा मौसम और छोटा पूर्वानुमान।',
      description:
        'खुली सेवा Open-Meteo से किसी शहर या जगह के नाम के लिए मौजूदा हालात और छोटा पूर्वानुमान देखता है। केवल वही जगह का नाम भेजा जाता है जो आप बताते हैं।',
    },
    it: {
      name: 'Meteo',
      summary: 'Meteo attuale e previsioni brevi per qualsiasi luogo.',
      description:
        'Cerca le condizioni attuali e una breve previsione per una città o un luogo tramite il servizio aperto Open-Meteo. Viene inviato solo il nome del luogo che indichi.',
    },
    ja: {
      name: '天気',
      summary: 'あらゆる場所の現在の天気と短期予報。',
      description:
        '公開サービス Open-Meteo を使って、都市や地名の現在の天気と短期予報を調べます。送信されるのはあなたが指定した地名だけです。',
    },
    pt: {
      name: 'Clima',
      summary: 'Clima atual e previsão curta para qualquer lugar.',
      description:
        'Consulta as condições atuais e uma previsão curta para uma cidade ou local usando o serviço aberto Open-Meteo. Apenas o nome do local que você informar é enviado.',
    },
    ru: {
      name: 'Погода',
      summary: 'Текущая погода и краткий прогноз для любого места.',
      description:
        'Узнаёт текущие условия и краткий прогноз для города или места через открытый сервис Open-Meteo. Отправляется только название места, которое вы укажете.',
    },
    th: {
      name: 'สภาพอากาศ',
      summary: 'สภาพอากาศปัจจุบันและพยากรณ์สั้น ๆ ของทุกที่',
      description:
        'ค้นหาสภาพอากาศปัจจุบันและพยากรณ์สั้น ๆ ของเมืองหรือสถานที่ผ่านบริการเปิด Open-Meteo โดยส่งเฉพาะชื่อสถานที่ที่คุณระบุเท่านั้น',
    },
    zh: {
      name: '天气',
      summary: '任意地点的当前天气与短期预报。',
      description:
        '通过开放服务 Open-Meteo 查询城市或地点的当前天气和短期预报。只会发送你提供的地名。',
    },
  },
  runtime: { kind: RuntimeKind.BUILTIN, adapterKey: 'weather' },
  network: { hosts: ['api.open-meteo.com', 'geocoding-api.open-meteo.com'], publicWeb: false },
  auth: { kind: AuthKind.NONE },
  scopes: [{ id: 'read', description: 'Read public weather data for a named place' }],
  settingsSchema: {
    type: 'object',
    properties: {
      units: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' },
    },
    additionalProperties: false,
  },
  tools: [
    {
      name: 'get_weather',
      title: 'Get the weather',
      description:
        'Get the current weather and a short daily forecast for a named place. Use it when the user asks about the weather somewhere.',
      inputSchema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'City or place name, for example Cairo or Paris, France',
          },
          days: {
            type: 'integer',
            minimum: 1,
            maximum: 7,
            default: 3,
            description: 'Number of forecast days',
          },
        },
        required: ['location'],
        additionalProperties: false,
      },
      riskLevel: RiskLevel.READ,
      scopes: ['read'],
      resultKind: 'text',
      maxResultBytes: 16_384,
      timeoutMs: 10_000,
    },
  ],
  limits: { maxCallsPerTurn: 3 },
};
