import { ConnectorModelsResponseFormat } from '@claw/shared-types';
import { z } from 'zod';
import { ProviderAdapterFamily } from '../../../generated/prisma';
import { GATEWAY_HEADER_NAME_PATTERN } from '../constants/gateway-headers.constants';
import { isAllowedCloudProviderUrl, isSafeEndpointPath } from '../utilities/provider-url.utility';
import { createProviderDefinitionSchema } from './create-provider-definition.dto';

export const updateProviderDefinitionSchema = createProviderDefinitionSchema
  .omit({ key: true })
  .partial()
  .extend({
    adapterFamily: z.nativeEnum(ProviderAdapterFamily).optional(),
    defaultBaseUrl: z
      .string()
      .url()
      .max(500)
      .refine(isAllowedCloudProviderUrl, 'Provider base URL must use a public HTTPS URL')
      .optional(),
    modelsEndpoint: z.string().min(1).max(255).refine(isSafeEndpointPath).optional(),
    modelsResponseFormat: z.nativeEnum(ConnectorModelsResponseFormat).optional(),
    // Re-declared without defaults: `.partial()` keeps a field's default, so an
    // omitted field would otherwise be reset on every PATCH.
    authHeaderName: z.string().trim().regex(GATEWAY_HEADER_NAME_PATTERN).optional(),
    authHeaderScheme: z.string().trim().max(50).optional(),
    supportsNativeTools: z.boolean().optional(),
    supportsVision: z.boolean().optional(),
    defaultIsPayAsYouGo: z.boolean().optional(),
    hasFreeTier: z.boolean().optional(),
  })
  .strict();

export type UpdateProviderDefinitionDto = z.infer<typeof updateProviderDefinitionSchema>;
