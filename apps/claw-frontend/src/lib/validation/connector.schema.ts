import { z } from 'zod';

import { ConnectorProvider } from '@/enums';

const connectorProviderValues = Object.values(ConnectorProvider) as [string, ...string[]];

const authTypeValues = ['API_KEY', 'OAUTH2', 'NONE'] as const;

export const createConnectorSchema = z.object({
  name: z
    .string()
    .min(1, 'Connector name is required')
    .max(100, 'Connector name must be at most 100 characters'),
  provider: z.enum(connectorProviderValues, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid provider',
    }),
  }),
  authType: z.enum(authTypeValues, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid auth type',
    }),
  }),
  apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
  baseUrl: z
    .string()
    .max(500, 'Base URL must be at most 500 characters')
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  region: z.string().max(50, 'Region must be at most 50 characters').optional(),
});

export const updateConnectorSchema = createConnectorSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export type CreateConnectorInput = z.infer<typeof createConnectorSchema>;
export type UpdateConnectorInput = z.infer<typeof updateConnectorSchema>;
