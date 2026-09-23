import { z } from 'zod';
import {
  CONNECTOR_PRESET_ACCOUNT_ID_PATTERN,
  presetRequiresAccountId,
} from '@claw/shared-utilities';
import { ConnectorAuthType, ConnectorProvider } from '../../../generated/prisma';

// Cloudflare's account id is spliced into the request PATH of every outbound
// call, so it is normalised and then held to exactly 32 hex characters here —
// before it is stored, not only when it is used (ADR-117).
export const connectorAccountIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(CONNECTOR_PRESET_ACCOUNT_ID_PATTERN, 'Account ID must be 32 hexadecimal characters');

export const createConnectorSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    provider: z.nativeEnum(ConnectorProvider),
    authType: z.nativeEnum(ConnectorAuthType),
    apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
    baseUrl: z.string().max(500, 'Base URL must be at most 500 characters').optional(),
    region: z.string().max(50, 'Region must be at most 50 characters').optional(),
    workspaceId: z.string().max(100, 'Workspace ID must be at most 100 characters').optional(),
    accountId: connectorAccountIdSchema.optional(),
    // Optional override of the provider default (`paygDefaultForProvider`). Left
    // out, an OpenAI connector is created metered and an Ollama connector free.
    // Present, the administrator's answer wins — an Ollama-Cloud connector is
    // exactly the case that needs it.
    isPayAsYouGo: z.boolean().optional(),
  })
  .superRefine((dto, ctx) => {
    if (dto.accountId === undefined && presetRequiresAccountId(dto.provider)) {
      ctx.addIssue({
        code: 'custom',
        path: ['accountId'],
        message: 'This provider needs its 32-character account ID',
      });
    }
  });

export type CreateConnectorDto = z.infer<typeof createConnectorSchema>;
