import {
  ConnectorAuthType,
  ConnectorModelsResponseFormat,
  type ConnectorPreset,
  ConnectorPresetAuthHeader,
  ConnectorPresetCategory,
  ConnectorPresetExtraField,
  ConnectorPresetGroup,
  ConnectorProvider,
} from '@claw/shared-types';

/** Written into a preset URL where the connector's Cloudflare account id goes. */
export const CONNECTOR_PRESET_ACCOUNT_ID_PLACEHOLDER = '{ACCOUNT_ID}';

/**
 * A Cloudflare account id: exactly 32 lowercase hex characters. Input is
 * trimmed and lower-cased before it is tested, and anything else is refused —
 * the value is spliced into an outbound URL path.
 */
export const CONNECTOR_PRESET_ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/u;

/**
 * Model ids that are clearly not chat models, for list endpoints that report
 * no type. Speech, embedding, moderation/guard and image-generation SKUs share
 * the `/chat/completions` catalogue on several providers (Groq lists Whisper
 * next to Llama) and would fail the first time a user picked one. Image-output
 * SKUs (`gpt-image-1`, `*-flash-image`) are excluded too: chat-service reroutes
 * those to image-service only for providers image-service has an adapter for.
 */
export const CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN =
  /(embed|whisper|tts|transcri|rerank|moderation|guard|dall-e|flux|stable-diffusion|sdxl|imagen|imagine|speech|(^|[-/_])image([-/_]|$))/iu;

/** `type` values a list may report that still mean "answers a chat turn". */
export const CONNECTOR_PRESET_CHAT_MODEL_TYPES: readonly string[] = ['chat', 'language', 'code'];

/** DeepInfra-style tags that mark a chat-capable model. */
export const CONNECTOR_PRESET_CHAT_TAGS: readonly string[] = ['chat', 'vlm'];

/** Tags and features that mark a model as accepting images. */
export const CONNECTOR_PRESET_VISION_TAGS: readonly string[] = ['vision', 'vlm'];

/** Tags and features that mark a model as accepting native tools. */
export const CONNECTOR_PRESET_TOOL_TAGS: readonly string[] = ['tool-use', 'tools'];

/** Cloudflare's task name for chat-capable models in `/ai/models/search`. */
export const CLOUDFLARE_TEXT_GENERATION_TASK = 'Text Generation';

/** Cohere endpoint name a model must list to be offered as a chat model. */
export const COHERE_CHAT_ENDPOINT = 'chat';

/**
 * Every OpenAI-compatible provider an administrator can connect in one step.
 *
 * THE ONLY place these base URLs, display names and links are written
 * (ADR-116). Consumers derive from it:
 * - the admin connector form prefills from it and renders the four links;
 * - connector-service's OpenAICompatibleAdapter health-checks and syncs from it;
 * - chat-service falls back to `defaultBaseUrl` when a connector row has none;
 * - routing-service admits discovered models by `key`.
 * `tools/__tests__/connector-preset-single-source.test.mjs` fails if a preset's
 * base URL or display name appears in source anywhere else.
 *
 * Adding a provider: one entry here, one enum value in three places, one
 * migration per enum. Runbook: skills/add-an-openai-compatible-provider.md.
 *
 * Model lists and links were checked on 2026-09-23. `staticModels` are copied
 * from the page named in `staticModelsSource`, never invented. Unauthenticated
 * probes that day: Groq, Cerebras, Fireworks, Together, Mistral, Moonshot,
 * Qwen, Cohere and Z.ai answered /models with 401 (route exists); OpenRouter,
 * SambaNova, DeepInfra and Vercel answered 200; Perplexity answered 404, so its
 * catalogue is static.
 *
 * Privacy: every preset is a third-party cloud. PRIVACY_FIRST and LOCAL_ONLY
 * routing already exclude all of them. Groq's free tier carries no privacy
 * SLA — do not connect a free-tier Groq key for workspaces that need one.
 */
export const CONNECTOR_PRESETS: readonly ConnectorPreset[] = [
  {
    key: ConnectorProvider.OPENROUTER,
    displayName: 'OpenRouter',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.AGGREGATOR,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    alternateBaseUrls: [],
    // Public: answers without a key, so it proves reachability, not the key.
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    // Key-scoped: 401 for a missing or invalid key, which is what a health
    // check has to prove.
    healthCheckEndpoint: 'https://openrouter.ai/api/v1/key',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: true,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://openrouter.ai/sign-up',
      apiKeys: 'https://openrouter.ai/settings/keys',
      pricing: 'https://openrouter.ai/models',
      docs: 'https://openrouter.ai/docs',
    },
  },
  {
    key: ConnectorProvider.GROQ,
    displayName: 'Groq',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    alternateBaseUrls: [],
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: true,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://console.groq.com',
      apiKeys: 'https://console.groq.com/keys',
      pricing: 'https://groq.com/pricing',
      docs: 'https://console.groq.com/docs',
    },
  },
  {
    key: ConnectorProvider.CEREBRAS,
    displayName: 'Cerebras Inference',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    alternateBaseUrls: [],
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://cloud.cerebras.ai',
      apiKeys: 'https://cloud.cerebras.ai',
      pricing: 'https://www.cerebras.ai/pricing',
      docs: 'https://inference-docs.cerebras.ai',
    },
  },
  {
    key: ConnectorProvider.SAMBANOVA,
    displayName: 'SambaNova Cloud',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
    defaultBaseUrl: 'https://api.sambanova.ai/v1',
    alternateBaseUrls: [],
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    // SambaNova's list answers 200 even for an invalid key and it documents no
    // key-scoped GET, so this proves reachability only. The key is proven by
    // the first chat call.
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: true,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://cloud.sambanova.ai',
      apiKeys: 'https://cloud.sambanova.ai/apis',
      pricing: 'https://cloud.sambanova.ai/plans/pricing',
      docs: 'https://docs.sambanova.ai',
    },
  },
  {
    key: ConnectorProvider.DEEPINFRA,
    displayName: 'DeepInfra',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
    defaultBaseUrl: 'https://api.deepinfra.com/v1/openai',
    alternateBaseUrls: [],
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    // Public without a key, but a supplied invalid key is refused with 401.
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://deepinfra.com/login',
      apiKeys: 'https://deepinfra.com/dash/api_keys',
      pricing: 'https://deepinfra.com/pricing',
      docs: 'https://deepinfra.com/docs',
    },
  },
  {
    key: ConnectorProvider.FIREWORKS,
    displayName: 'Fireworks AI',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
    defaultBaseUrl: 'https://api.fireworks.ai/inference/v1',
    alternateBaseUrls: [],
    // Ids come back as `accounts/fireworks/models/<name>`; the display-name
    // formatter keeps the last segment.
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://fireworks.ai/login',
      apiKeys: 'https://app.fireworks.ai/settings/users/api-keys',
      pricing: 'https://fireworks.ai/pricing',
      docs: 'https://docs.fireworks.ai',
    },
  },
  {
    key: ConnectorProvider.TOGETHER,
    displayName: 'Together AI',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
    defaultBaseUrl: 'https://api.together.xyz/v1',
    alternateBaseUrls: [],
    // A bare JSON array with a `type` per model (docs.together.ai/reference/models-1).
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.BARE_ARRAY,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://api.together.ai/signup',
      apiKeys: 'https://api.together.ai/settings/api-keys',
      pricing: 'https://www.together.ai/pricing',
      docs: 'https://docs.together.ai',
    },
  },
  {
    key: ConnectorProvider.MISTRAL,
    displayName: 'Mistral AI',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.DIRECT_MODEL_LAB,
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    alternateBaseUrls: [],
    // Reports `capabilities.{completion_chat,function_calling,vision}` per model.
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: true,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://console.mistral.ai',
      apiKeys: 'https://console.mistral.ai/api-keys',
      pricing: 'https://mistral.ai/pricing',
      docs: 'https://docs.mistral.ai',
    },
  },
  {
    key: ConnectorProvider.MOONSHOT,
    displayName: 'Moonshot AI (Kimi)',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.DIRECT_MODEL_LAB,
    defaultBaseUrl: 'https://api.moonshot.ai/v1',
    alternateBaseUrls: ['https://api.moonshot.cn/v1'],
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    // Moonshot names its image-input SKUs `*-vision-*` (moonshot-v1-8k-vision-preview).
    visionModelPattern: /vision/u,
    links: {
      register: 'https://platform.moonshot.ai',
      apiKeys: 'https://platform.moonshot.ai/console/api-keys',
      pricing: 'https://platform.moonshot.ai/docs/pricing/chat',
      docs: 'https://platform.moonshot.ai/docs',
    },
  },
  {
    key: ConnectorProvider.ZAI,
    displayName: 'Z.ai (Zhipu GLM)',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.DIRECT_MODEL_LAB,
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    alternateBaseUrls: ['https://open.bigmodel.cn/api/paas/v4'],
    // /models answers 401 without a key, but its list has not been verified
    // with one, so the catalogue is the documented one.
    modelsEndpoint: null,
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [
      'glm-5.1',
      'glm-5',
      'glm-4.7',
      'glm-4.7-flashx',
      'glm-4.6',
      'glm-4.5',
      'glm-4.5-x',
      'glm-4.5-air',
      'glm-4.5-airx',
      'glm-4-32b-0414-128k',
      'glm-4.7-flash',
      'glm-4.5-flash',
    ],
    staticModelsSource: 'https://docs.z.ai/guides/overview/pricing',
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://z.ai/model-api',
      apiKeys: 'https://z.ai/manage-apikey/apikey-list',
      pricing: 'https://docs.z.ai/guides/overview/pricing',
      docs: 'https://docs.z.ai',
    },
  },
  {
    key: ConnectorProvider.QWEN,
    displayName: 'Alibaba Cloud Model Studio (Qwen)',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.DIRECT_MODEL_LAB,
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    alternateBaseUrls: ['https://dashscope.aliyuncs.com/compatible-mode/v1'],
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    // Qwen's vision-language SKUs carry a `-vl` segment (qwen-vl-max, qwen2.5-vl-72b-instruct).
    visionModelPattern: /-vl(-|$)/u,
    links: {
      register: 'https://www.alibabacloud.com/product/model-studio',
      apiKeys: 'https://modelstudio.console.alibabacloud.com',
      pricing: 'https://www.alibabacloud.com/help/en/model-studio/models',
      docs: 'https://www.alibabacloud.com/help/en/model-studio',
    },
  },
  {
    key: ConnectorProvider.CLOUDFLARE,
    displayName: 'Cloudflare Workers AI',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
    defaultBaseUrl: 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1',
    alternateBaseUrls: [],
    modelsEndpoint:
      'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/models/search?task=Text%20Generation&per_page=100',
    modelsResponseFormat: ConnectorModelsResponseFormat.CLOUDFLARE_SEARCH,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint:
      'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/models/search?per_page=1',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [ConnectorPresetExtraField.ACCOUNT_ID],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: true,
    // Tool support varies per Workers AI model and the search result does not
    // say which; off until it is proven per model.
    supportsNativeTools: false,
    visionModelPattern: null,
    links: {
      register: 'https://dash.cloudflare.com/sign-up',
      apiKeys: 'https://dash.cloudflare.com/profile/api-tokens',
      pricing: 'https://developers.cloudflare.com/workers-ai/platform/pricing/',
      docs: 'https://developers.cloudflare.com/workers-ai/',
    },
  },
  {
    key: ConnectorProvider.VERCEL_AI_GATEWAY,
    displayName: 'Vercel AI Gateway',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.AGGREGATOR,
    defaultBaseUrl: 'https://ai-gateway.vercel.sh/v1',
    alternateBaseUrls: [],
    // Reports `type`, `tags` and `modalities` per model; an invalid key is refused.
    modelsEndpoint: '/models',
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: '/models',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: true,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://vercel.com/signup',
      apiKeys: 'https://vercel.com/dashboard',
      pricing: 'https://vercel.com/docs/ai-gateway/pricing',
      docs: 'https://vercel.com/docs/ai-gateway',
    },
  },
  {
    key: ConnectorProvider.PERPLEXITY,
    displayName: 'Perplexity Sonar',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.DIRECT_MODEL_LAB,
    defaultBaseUrl: 'https://api.perplexity.ai',
    alternateBaseUrls: [],
    // GET /models answers 404. Perplexity notes Sonar Chat Completions are
    // supported until 2026-09-27 in favour of its Agent API — re-check then.
    modelsEndpoint: null,
    modelsResponseFormat: ConnectorModelsResponseFormat.OPENAI_LIST,
    staticModels: ['sonar', 'sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research'],
    staticModelsSource: 'https://docs.perplexity.ai/getting-started/models',
    // No key-scoped GET exists; the check is a one-token completion to `sonar`.
    healthCheckEndpoint: null,
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: false,
    visionModelPattern: null,
    links: {
      register: 'https://www.perplexity.ai',
      apiKeys: 'https://www.perplexity.ai/account/api',
      pricing: 'https://docs.perplexity.ai/getting-started/pricing',
      docs: 'https://docs.perplexity.ai',
    },
  },
  {
    key: ConnectorProvider.COHERE,
    displayName: 'Cohere',
    category: ConnectorPresetCategory.LLM,
    group: ConnectorPresetGroup.DIRECT_MODEL_LAB,
    // The OpenAI-compatibility surface. Cohere's native API is
    // https://api.cohere.com/v2 and is not what chat-service speaks.
    defaultBaseUrl: 'https://api.cohere.ai/compatibility/v1',
    alternateBaseUrls: [],
    // Cohere's native list (docs.cohere.com/reference/list-models), filtered to
    // models that serve the chat endpoint.
    modelsEndpoint: 'https://api.cohere.com/v1/models?endpoint=chat&page_size=1000',
    modelsResponseFormat: ConnectorModelsResponseFormat.COHERE_MODELS,
    staticModels: [],
    staticModelsSource: null,
    healthCheckEndpoint: 'https://api.cohere.com/v1/models?endpoint=chat&page_size=1',
    authType: ConnectorAuthType.API_KEY,
    authHeader: ConnectorPresetAuthHeader.BEARER,
    extraFields: [],
    openAICompatible: true,
    defaultIsPayAsYouGo: true,
    hasFreeTier: false,
    supportsNativeTools: true,
    visionModelPattern: null,
    links: {
      register: 'https://dashboard.cohere.com/welcome/register',
      apiKeys: 'https://dashboard.cohere.com/api-keys',
      pricing: 'https://cohere.com/pricing',
      docs: 'https://docs.cohere.com',
    },
  },
];
