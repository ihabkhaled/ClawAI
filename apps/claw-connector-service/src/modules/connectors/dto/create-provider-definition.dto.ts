import { ConnectorModelsResponseFormat } from '@claw/shared-types';
import { z } from 'zod';
import { ConnectorAuthType, ProviderAdapterFamily } from '../../../generated/prisma';
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
      .regex(/^[A-Z][A-Z0-9_]{1,62}$/u)
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
    healthCheckEndpoint: z.string().max(255).refine(isSafeEndpointPath).optional(),
    authType: z.nativeEnum(ConnectorAuthType),
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
