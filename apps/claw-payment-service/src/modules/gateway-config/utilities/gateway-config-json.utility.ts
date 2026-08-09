import { z } from 'zod';

import { GatewayCredentialField } from '../enums/gateway-credential-field.enum';
import type {
  EncryptedGatewayCredentials,
  GatewayConfigurationOptions,
} from '../types/gateway-config.types';

const encryptedCredentialsSchema = z.partialRecord(
  z.nativeEnum(GatewayCredentialField),
  z.string().min(1).max(8192),
);

const gatewayOptionsSchema = z
  .object({
    currency: z.string().length(3).optional(),
    webhookUrl: z.string().url().max(2048).optional(),
  })
  .strict();

export function parseEncryptedCredentials(value: unknown): EncryptedGatewayCredentials {
  const parsed = encryptedCredentialsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function parseGatewayOptions(value: unknown): GatewayConfigurationOptions {
  const parsed = gatewayOptionsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}
