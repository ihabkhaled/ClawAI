import {
  ConnectorModelsResponseFormat,
  type ConnectorPreset,
  ConnectorPresetAuthHeader,
  ConnectorPresetCategory,
  ConnectorPresetGroup,
  ConnectorAuthType as SharedConnectorAuthType,
} from '@claw/shared-types';
import { ConnectorAuthType, type ConnectorProviderDefinition } from '../../../generated/prisma';
import { BusinessException } from '../../../common/errors';

export function toRuntimeConnectorPreset(definition: ConnectorProviderDefinition): ConnectorPreset {
  if (
    definition.defaultBaseUrl === null ||
    definition.modelsEndpoint === null ||
    definition.modelsResponseFormat === null ||
    definition.authType === null
  ) {
    throw new BusinessException(
      'OpenAI-compatible provider definition is incomplete',
      'PROVIDER_DEFINITION_INCOMPLETE',
    );
  }
  return {
    key: definition.key,
    displayName: definition.displayName,
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.DIRECT_MODEL_LAB,
    defaultBaseUrl: definition.defaultBaseUrl,
    alternateBaseUrls: [],
    modelsEndpoint: definition.modelsEndpoint,
    modelsResponseFormat: toModelsResponseFormat(definition.modelsResponseFormat),
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: definition.healthCheckEndpoint,
    authType: toSharedAuthType(definition.authType),
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: definition.defaultIsPayAsYouGo,
    hasFreeTier: definition.hasFreeTier,
    supportsNativeTools: definition.supportsNativeTools,
    defaultSupportsTools: definition.supportsNativeTools,
    defaultSupportsVision: definition.supportsVision,
    visionModelPattern: null,
    creditHeadroom: null,
    links: {
      register: definition.registerUrl ?? '',
      apiKeys: definition.apiKeyUrl ?? '',
      pricing: definition.pricingUrl ?? '',
      docs: definition.docsUrl ?? '',
    },
  };
}

function toSharedAuthType(value: ConnectorAuthType): SharedConnectorAuthType {
  switch (value) {
    case ConnectorAuthType.NONE:
      return SharedConnectorAuthType.NONE;
    case ConnectorAuthType.API_KEY:
      return SharedConnectorAuthType.API_KEY;
    case ConnectorAuthType.OAUTH2:
      return SharedConnectorAuthType.OAUTH2;
  }
}

function toModelsResponseFormat(value: string): ConnectorModelsResponseFormat {
  switch (value) {
    case ConnectorModelsResponseFormat.OPENAI_LIST:
      return ConnectorModelsResponseFormat.OPENAI_LIST;
    case ConnectorModelsResponseFormat.BARE_ARRAY:
      return ConnectorModelsResponseFormat.BARE_ARRAY;
    case ConnectorModelsResponseFormat.COHERE_MODELS:
      return ConnectorModelsResponseFormat.COHERE_MODELS;
    case ConnectorModelsResponseFormat.CLOUDFLARE_SEARCH:
      return ConnectorModelsResponseFormat.CLOUDFLARE_SEARCH;
    default:
      throw new Error(`Unsupported runtime model list format: ${value}`);
  }
}
