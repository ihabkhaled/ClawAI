import { ConnectorModelsResponseFormat } from '@claw/shared-types';
import { z } from 'zod';
import { ConnectorAuthType, ProviderAdapterFamily } from '../../../generated/prisma';
import { GATEWAY_HEADER_NAME_PATTERN } from '../constants/gateway-headers.constants';
import { isValidChatCompletionsPath } from '../utilities/chat-path.utility';
import { isAllowedCloudProviderUrl, isSafeEndpointPath } from '../utilities/provider-url.utility';

const providerLinkSchema = z
  .string()
  .url()
  .max(500)
  .refine(isAllowedCloudProviderUrl, 'Provider links must use a public HTTPS URL');

export const createProviderDefinitionSchema = z
  .object({
    key: z
      .string()
      .trim()
      .toUpperCase()
      // "ai-horde" and "ai horde" are accepted and stored as AI_HORDE.
      .transform((key) => key.replaceAll(/[\s-]+/gu, '_'))
      .pipe(z.string().regex(/^[A-Z][A-Z0-9_]{1,62}$/u))
      .refine((key) => key !== 'CUSTOM_OPENAI_COMPATIBLE', 'Provider key is reserved'),
    displayName: z.string().trim().min(1).max(255),
    description: z.string().trim().max(1000).optional(),
    adapterFamily: z.nativeEnum(ProviderAdapterFamily),
    defaultBaseUrl: z
      .string()
      .url()
      .max(500)
      .refine(isAllowedCloudProviderUrl, 'Provider base URL must use a public HTTPS URL'),
    modelsEndpoint: z.string().min(1).max(255).refine(isSafeEndpointPath),
    modelsResponseFormat: z.nativeEnum(ConnectorModelsResponseFormat),
    // '' clears the field (the service stores null).
    healthCheckEndpoint: z
      .string()
      .max(255)
      .refine((value) => value === '' || isSafeEndpointPath(value))
      .optional(),
    authType: z.nativeEnum(ConnectorAuthType),
    // How the key travels: header name + scheme prefix ("" sends the raw key,
    // e.g. AI Horde's `apikey` header).
    authHeaderName: z.string().trim().regex(GATEWAY_HEADER_NAME_PATTERN).default('Authorization'),
    authHeaderScheme: z.string().trim().max(50).default('Bearer'),
    // Where chat is served, relative to the base URL (e.g. /v1/chat/completions).
    chatCompletionsPath: z
      .string()
      .trim()
      .max(255)
      .refine(isValidChatCompletionsPath, 'Chat path must be a path ending in /chat/completions')
      .default('/chat/completions'),
    supportsNativeTools: z.boolean().default(false),
    supportsVision: z.boolean().default(false),
    registerUrl: providerLinkSchema.optional(),
    apiKeyUrl: providerLinkSchema.optional(),
    pricingUrl: providerLinkSchema.optional(),
    docsUrl: providerLinkSchema.optional(),
    defaultIsPayAsYouGo: z.boolean().default(false),
    hasFreeTier: z.boolean().default(false),
  })
  .strict();

export type CreateProviderDefinitionDto = z.infer<typeof createProviderDefinitionSchema>;
