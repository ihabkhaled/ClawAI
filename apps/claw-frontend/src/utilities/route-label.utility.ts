import { SMART_ROUTER_PROVIDER_LABEL_KEYS } from '@/constants/smart-router-admin.constants';
import type { TranslateFunction } from '@/types/i18n.types';

/**
 * "Routed by gpt-oss:120b (Ollama Cloud) → answered by gpt-5.1", from the
 * stored `PROVIDER/model` router id and the answering model.
 *
 * Every AUTO answer states which model routed it. Before this only the
 * answering model was shown, so a reply that an Ollama Cloud model routed to
 * OpenAI read as if OpenAI had chosen itself (production, 2026-09-19).
 */
export function describeRoute(
  routerModel: string,
  answerModel: string,
  t: TranslateFunction,
): string {
  const slash = routerModel.indexOf('/');
  const provider = slash > 0 ? routerModel.slice(0, slash) : '';
  const model = slash > 0 ? routerModel.slice(slash + 1) : routerModel;
  const labelKey = (SMART_ROUTER_PROVIDER_LABEL_KEYS as Record<string, string | undefined>)[
    provider
  ];
  return t('chat.routedBy', {
    router: model,
    routerProvider: labelKey === undefined ? provider : t(labelKey),
    model: answerModel,
  });
}
