import {
  CONNECTOR_PRESET_ACCOUNT_ID_PATTERN,
  presetRequiresAccountId,
} from '@claw/shared-utilities';
import { z } from 'zod';

import { ConnectorProvider } from '@/enums';

const connectorProviderValues = Object.values(ConnectorProvider) as [string, ...string[]];

const authTypeValues = ['API_KEY', 'OAUTH2', 'NONE'] as const;

// Mirrors claw-connector-service's `connectorAccountIdSchema` (ADR-117): the
// account id is spliced into every outbound Cloudflare request path, so the
// same 32-hex-character shape is enforced here before the round trip, not
// only after the server rejects it.
export const connectorAccountIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(CONNECTOR_PRESET_ACCOUNT_ID_PATTERN, 'Account ID must be 32 hexadecimal characters');

const connectorFieldsSchema = z.object({
  name: z
    .string()
    .min(1, 'Connector name is required')
    .max(100, 'Connector name must be at most 100 characters'),
  provider: z.enum(connectorProviderValues, {
    error: 'Please select a valid provider',
  }),
  authType: z.enum(authTypeValues, {
    error: 'Please select a valid auth type',
  }),
  apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
  baseUrl: z
    .string()
    .max(500, 'Base URL must be at most 500 characters')
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  region: z.string().max(50, 'Region must be at most 50 characters').optional(),
  workspaceId: z.string().max(100, 'Workspace ID must be at most 100 characters').optional(),
  accountId: connectorAccountIdSchema.optional().or(z.literal('')),
});

export const createConnectorSchema = connectorFieldsSchema.superRefine((dto, ctx) => {
  const accountId = dto.accountId === '' ? undefined : dto.accountId;
  if (accountId === undefined && presetRequiresAccountId(dto.provider)) {
    ctx.addIssue({
      code: 'custom',
      path: ['accountId'],
      message: 'This provider needs its 32-character account ID',
    });
  }
});

export const updateConnectorSchema = connectorFieldsSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export type CreateConnectorInput = z.infer<typeof createConnectorSchema>;
export type UpdateConnectorInput = z.infer<typeof updateConnectorSchema>;
