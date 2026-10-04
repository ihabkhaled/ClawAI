import { ConnectorModelsResponseFormat } from '@claw/shared-types';
import { z } from 'zod';
import { ProviderAdapterFamily } from '../../../generated/prisma';
import { isAllowedCloudProviderUrl, isSafeEndpointPath } from '../utilities/provider-url.utility';
import { createProviderDefinitionSchema } from './create-provider-definition.dto';

export const updateProviderDefinitionSchema = createProviderDefinitionSchema
  .omit({ key: true, authType: true })
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
  })
  .strict();

export type UpdateProviderDefinitionDto = z.infer<typeof updateProviderDefinitionSchema>;
