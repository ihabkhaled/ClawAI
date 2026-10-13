import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../../common/enums/runtime-kind.enum';
import { type PluginManifestInput } from '../../../catalog/schemas/plugin-manifest.schema';

export const DATETIME_AND_MATH_MANIFEST: PluginManifestInput = {
  manifestVersion: 1,
  slug: 'datetime-and-math',
  version: '1.0.0',
  publisher: 'ClawAI',
  category: 'productivity',
  iconKey: 'calculator',
  translations: {
    en: {
      name: 'Date, Time and Math',
      summary: 'Exact dates, time zones and arithmetic.',
      description:
        'Gives the assistant a clock, a time zone converter and a calculator, so dates and sums are computed instead of guessed. Works offline and never contacts the internet.',
    },
    ar: {
      name: 'التاريخ والوقت والحساب',
      summary: 'تواريخ دقيقة ومناطق زمنية وعمليات حسابية.',
      description:
        'يمنح المساعد ساعة ومحوّلًا للمناطق الزمنية وآلة حاسبة، فتُحسب التواريخ والمجاميع بدل تخمينها. يعمل دون اتصال ولا يتصل بالإنترنت أبدًا.',
    },
    de: {
      name: 'Datum, Uhrzeit und Rechnen',
      summary: 'Exakte Daten, Zeitzonen und Arithmetik.',
      description:
        'Gibt dem Assistenten eine Uhr, einen Zeitzonen-Umrechner und einen Taschenrechner, damit Daten und Summen berechnet statt geraten werden. Funktioniert offline und greift nie auf das Internet zu.',
    },
    es: {
      name: 'Fecha, hora y cálculo',
      summary: 'Fechas exactas, zonas horarias y aritmética.',
      description:
        'Da al asistente un reloj, un conversor de zonas horarias y una calculadora para que las fechas y las sumas se calculen en lugar de adivinarse. Funciona sin conexión y nunca contacta con internet.',
    },
    fa: {
      name: 'تاریخ، زمان و محاسبه',
      summary: 'تاریخ دقیق، منطقه‌های زمانی و حساب.',
      description:
        'به دستیار یک ساعت، مبدل منطقه زمانی و ماشین‌حساب می‌دهد تا تاریخ‌ها و جمع‌ها محاسبه شوند و حدس زده نشوند. بدون اینترنت کار می‌کند و هرگز به اینترنت وصل نمی‌شود.',
    },
    fr: {
      name: 'Date, heure et calcul',
      summary: 'Dates exactes, fuseaux horaires et arithmétique.',
      description:
        "Donne à l'assistant une horloge, un convertisseur de fuseaux horaires et une calculatrice pour que les dates et les sommes soient calculées plutôt que devinées. Fonctionne hors ligne et ne contacte jamais Internet.",
    },
    hi: {
      name: 'तारीख़, समय और गणित',
      summary: 'सटीक तारीख़ें, समय क्षेत्र और अंकगणित।',
      description:
        'सहायक को एक घड़ी, समय क्षेत्र परिवर्तक और कैलकुलेटर देता है, ताकि तारीख़ें और जोड़ अनुमान से नहीं बल्कि गणना से मिलें। ऑफ़लाइन काम करता है और कभी इंटरनेट से संपर्क नहीं करता।',
    },
    it: {
      name: 'Data, ora e calcolo',
      summary: 'Date esatte, fusi orari e aritmetica.',
      description:
        "Dà all'assistente un orologio, un convertitore di fusi orari e una calcolatrice, così date e somme vengono calcolate invece che indovinate. Funziona offline e non contatta mai internet.",
    },
    ja: {
      name: '日付・時刻・計算',
      summary: '正確な日付、タイムゾーン、算術計算。',
      description:
        'アシスタントに時計、タイムゾーン変換、電卓を与え、日付や合計を推測ではなく計算で求められるようにします。オフラインで動作し、インターネットには一切接続しません。',
    },
    pt: {
      name: 'Data, hora e cálculo',
      summary: 'Datas exatas, fusos horários e aritmética.',
      description:
        'Dá ao assistente um relógio, um conversor de fusos horários e uma calculadora, para que datas e somas sejam calculadas em vez de adivinhadas. Funciona offline e nunca contata a internet.',
    },
    ru: {
      name: 'Дата, время и расчёты',
      summary: 'Точные даты, часовые пояса и арифметика.',
      description:
        'Даёт ассистенту часы, конвертер часовых поясов и калькулятор, чтобы даты и суммы вычислялись, а не угадывались. Работает офлайн и никогда не обращается к интернету.',
    },
    th: {
      name: 'วันที่ เวลา และการคำนวณ',
      summary: 'วันที่ที่แม่นยำ เขตเวลา และเลขคณิต',
      description:
        'มอบนาฬิกา ตัวแปลงเขตเวลา และเครื่องคิดเลขให้ผู้ช่วย เพื่อให้วันที่และผลรวมถูกคำนวณแทนการเดา ทำงานแบบออฟไลน์และไม่เชื่อมต่ออินเทอร์เน็ตเลย',
    },
    zh: {
      name: '日期、时间与计算',
      summary: '精确的日期、时区与算术运算。',
      description:
        '为助手提供时钟、时区换算和计算器，让日期与求和通过计算得出而不是猜测。可离线工作，从不连接互联网。',
    },
  },
  runtime: { kind: RuntimeKind.BUILTIN, adapterKey: 'datetime-and-math' },
  network: { hosts: [], publicWeb: false },
  auth: { kind: AuthKind.NONE },
  scopes: [{ id: 'compute', description: 'Compute dates, time zones and arithmetic locally' }],
  settingsSchema: { type: 'object', properties: {}, additionalProperties: false },
  tools: [
    {
      name: 'current_time',
      title: 'Current date and time',
      description:
        'Return the current date and time in a given IANA time zone. Use it whenever the answer depends on today or now.',
      inputSchema: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            maxLength: 64,
            description: 'IANA time zone such as Europe/Paris. Defaults to UTC.',
          },
        },
        additionalProperties: false,
      },
      riskLevel: RiskLevel.READ,
      scopes: ['compute'],
      resultKind: 'text',
      maxResultBytes: 4096,
      timeoutMs: 5000,
    },
    {
      name: 'convert_time',
      title: 'Convert a time between time zones',
      description:
        'Convert a date and time from one IANA time zone to another, including daylight saving rules.',
      inputSchema: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            maxLength: 40,
            description: 'ISO 8601 date and time, for example 2026-03-29T09:30:00',
          },
          from_timezone: { type: 'string', maxLength: 64, description: 'Source IANA time zone' },
          to_timezone: { type: 'string', maxLength: 64, description: 'Target IANA time zone' },
        },
        required: ['time', 'from_timezone', 'to_timezone'],
        additionalProperties: false,
      },
      riskLevel: RiskLevel.READ,
      scopes: ['compute'],
      resultKind: 'text',
      maxResultBytes: 4096,
      timeoutMs: 5000,
    },
    {
      name: 'calculate',
      title: 'Calculate an expression',
      description:
        'Evaluate an arithmetic expression exactly. Supports + - * / % ^ and parentheses. Use it instead of doing sums in your head.',
      inputSchema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            minLength: 1,
            maxLength: 256,
            description: 'The arithmetic expression, for example (12.5 * 4) / 3',
          },
        },
        required: ['expression'],
        additionalProperties: false,
      },
      riskLevel: RiskLevel.READ,
      scopes: ['compute'],
      resultKind: 'text',
      maxResultBytes: 4096,
      timeoutMs: 5000,
    },
  ],
  limits: { maxCallsPerTurn: 6 },
};
