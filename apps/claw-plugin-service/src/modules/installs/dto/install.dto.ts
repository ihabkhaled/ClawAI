import { z } from 'zod';

import { RiskLevel } from '../../../common/enums/risk-level.enum';
import {
  AUTH_HEADER_PATTERN,
  SEMVER_PATTERN,
  SLUG_PATTERN,
  TOOL_NAME_PATTERN,
} from '../../catalog/constants/catalog.constants';
import { CREDENTIAL_VALUE_MAX } from '../constants/installs.constants';

const settingsObject = z.record(z.string().max(64), z.unknown());

export const installBodySchema = z.strictObject({
  slug: z.string().regex(SLUG_PATTERN),
  version: z.string().regex(SEMVER_PATTERN).optional(),
  settings: settingsObject.optional(),
});

export const updateInstallBodySchema = z
  .strictObject({ enabled: z.boolean().optional(), settings: settingsObject.optional() })
  .refine((body) => body.enabled !== undefined || body.settings !== undefined, {
    message: 'enabled or settings is required',
  });

export const credentialBodySchema = z.strictObject({
  kind: z.literal('API_KEY'),
  value: z.string().min(1).max(CREDENTIAL_VALUE_MAX),
  headerName: z.string().regex(AUTH_HEADER_PATTERN).optional(),
});

export const toolNameSchema = z.string().regex(TOOL_NAME_PATTERN);

export const consentBodySchema = z.strictObject({
  toolName: toolNameSchema,
  level: z.enum([RiskLevel.WRITE, RiskLevel.DESTRUCTIVE]),
});

export const installIdSchema = z.string().uuid();

export type InstallBody = z.infer<typeof installBodySchema>;
export type UpdateInstallBody = z.infer<typeof updateInstallBodySchema>;
export type CredentialBody = z.infer<typeof credentialBodySchema>;
export type ConsentBody = z.infer<typeof consentBodySchema>;
