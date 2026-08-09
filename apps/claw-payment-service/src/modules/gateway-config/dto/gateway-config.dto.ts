import { BillingGateway } from '@claw/shared-types';
import { z } from 'zod';

import { GatewayMode } from '../enums/gateway-mode.enum';

const credentialValueSchema = z.string().max(4096);

export const gatewayParamSchema = z.object({ gateway: z.nativeEnum(BillingGateway) }).strict();

export type GatewayParamDto = z.infer<typeof gatewayParamSchema>;

export const updateGatewayConfigurationSchema = z
  .object({
    isEnabled: z.boolean().optional(),
    mode: z.nativeEnum(GatewayMode).optional(),
    credentials: z
      .object({
        clientId: credentialValueSchema.optional(),
        clientSecret: credentialValueSchema.optional(),
        webhookId: credentialValueSchema.optional(),
        secretKey: credentialValueSchema.optional(),
        publicKey: credentialValueSchema.optional(),
        apiKey: credentialValueSchema.optional(),
        hmacSecret: credentialValueSchema.optional(),
        cardIntegrationId: credentialValueSchema.optional(),
      })
      .strict()
      .optional(),
    options: z
      .object({
        currency: z
          .string()
          .length(3)
          .regex(/^[A-Z]{3}$/)
          .optional(),
        webhookUrl: z
          .string()
          .url()
          .max(2048)
          .regex(/^https:\/\//)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type UpdateGatewayConfigurationDto = z.infer<typeof updateGatewayConfigurationSchema>;
