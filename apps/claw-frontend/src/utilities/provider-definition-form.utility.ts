import { ProviderAdapterFamily, ProviderModelsResponseFormat } from '@/enums';
import type { CreateProviderDefinition } from '@/types/provider-definition.types';

const text = (form: FormData, name: string): string => String(form.get(name) ?? '').trim();

/** Reads the provider form into the API payload; blank optional fields are sent as '' so an edit can clear them. */
export function readProviderDefinitionForm(form: FormData): CreateProviderDefinition {
  return {
    key: text(form, 'key'),
    displayName: text(form, 'displayName'),
    description: text(form, 'description'),
    adapterFamily: ProviderAdapterFamily.OPENAI_COMPATIBLE,
    defaultBaseUrl: text(form, 'defaultBaseUrl'),
    modelsEndpoint: text(form, 'modelsEndpoint'),
    modelsResponseFormat:
      (text(form, 'modelsResponseFormat') as ProviderModelsResponseFormat) ||
      ProviderModelsResponseFormat.OPENAI_LIST,
    healthCheckEndpoint: text(form, 'healthCheckEndpoint'),
    authType: (text(form, 'authType') || 'API_KEY') as CreateProviderDefinition['authType'],
    authHeaderName: text(form, 'authHeaderName') || 'Authorization',
    authHeaderScheme: text(form, 'authHeaderScheme'),
    supportsNativeTools: form.has('supportsNativeTools'),
    supportsVision: form.has('supportsVision'),
    defaultIsPayAsYouGo: form.has('defaultIsPayAsYouGo'),
    hasFreeTier: form.has('hasFreeTier'),
  };
}
