import { Locale } from '@/enums/locale.enum';
import type { ModelScaleLocaleTranslation } from '@/types/model-scale.types';

/**
 * The words beside a model's name in every model list: "1M context · 750B params"
 * (ADR-234). The number and its K / M / B / T suffix are built by
 * `utilities/model-scale.utility.ts`; only the words around them are translated here.
 * `{value}` is that formatted number. All 13 locales, real translations.
 *
 * One file, imported by each locale, so a missing locale is a type error rather
 * than a key rendering raw (`t()` takes a plain string and is not checked).
 */
export const MODEL_SCALE_TRANSLATIONS: Record<Locale, ModelScaleLocaleTranslation> = {
  [Locale.EN]: {
    context: '{value} context',
    parameters: '{value} params',
    activeNote: '{value} active per token',
    parametersLabel: 'Parameters',
  },
  [Locale.AR]: {
    context: 'سياق {value}',
    parameters: '{value} معاملات',
    activeNote: '{value} نشطة لكل رمز',
    parametersLabel: 'المعاملات',
  },
  [Locale.DE]: {
    context: '{value} Kontext',
    parameters: '{value} Parameter',
    activeNote: '{value} aktiv pro Token',
    parametersLabel: 'Parameter',
  },
  [Locale.ES]: {
    context: '{value} de contexto',
    parameters: '{value} parámetros',
    activeNote: '{value} activos por token',
    parametersLabel: 'Parámetros',
  },
  [Locale.FA]: {
    context: 'زمینه {value}',
    parameters: '{value} پارامتر',
    activeNote: '{value} فعال به‌ازای هر توکن',
    parametersLabel: 'پارامترها',
  },
  [Locale.FR]: {
    context: '{value} de contexte',
    parameters: '{value} paramètres',
    activeNote: '{value} actifs par jeton',
    parametersLabel: 'Paramètres',
  },
  [Locale.HI]: {
    context: '{value} संदर्भ',
    parameters: '{value} पैरामीटर',
    activeNote: 'प्रति टोकन {value} सक्रिय',
    parametersLabel: 'पैरामीटर',
  },
  [Locale.IT]: {
    context: '{value} di contesto',
    parameters: '{value} parametri',
    activeNote: '{value} attivi per token',
    parametersLabel: 'Parametri',
  },
  [Locale.JA]: {
    context: '{value} コンテキスト',
    parameters: '{value} パラメータ',
    activeNote: 'トークンあたり {value} が稼働',
    parametersLabel: 'パラメータ数',
  },
  [Locale.PT]: {
    context: '{value} de contexto',
    parameters: '{value} parâmetros',
    activeNote: '{value} ativos por token',
    parametersLabel: 'Parâmetros',
  },
  [Locale.RU]: {
    context: '{value} контекста',
    parameters: '{value} параметров',
    activeNote: '{value} активных на токен',
    parametersLabel: 'Параметры',
  },
  [Locale.TH]: {
    context: 'บริบท {value}',
    parameters: '{value} พารามิเตอร์',
    activeNote: 'ใช้งานจริง {value} ต่อโทเค็น',
    parametersLabel: 'พารามิเตอร์',
  },
  [Locale.ZH]: {
    context: '{value} 上下文',
    parameters: '{value} 参数',
    activeNote: '每个 token 激活 {value}',
    parametersLabel: '参数量',
  },
};
