import { z } from 'zod';

/**
 * The effect taxonomy the coding-agent client classifies every tool call into.
 *
 * Kept in step with `src/core/policy-v2.ts` in the extension repository. A value
 * this service does not recognise is refused here rather than stored, so a
 * typo in an administrator's request cannot become a policy field that silently
 * matches nothing on the client.
 */
export const POLICY_EFFECT_KINDS = [
  'read',
  'workspace-write',
  'local-mutation',
  'network-write',
  'publication',
  'elevation',
  'production',
  'destructive',
] as const;

export const POLICY_RISK_CLASSES = ['R0', 'R1', 'R2', 'R3', 'R4'] as const;

/**
 * Permission modes, weakest constraint last.
 *
 * `minimumPermissionMode` names the weakest a member may choose, so the order
 * matters: `PLAN` constrains most, `AUTONOMOUS_SCOPED` least. `ENTERPRISE_LOCKED`
 * is absent on purpose — it is not a point on this scale, and offering it as a
 * floor would let an administrator pick a mode the client treats as stricter
 * than every other while the member can still leave it.
 */
export const POLICY_PERMISSION_MODES = ['PLAN', 'ASK', 'AUTO_EDIT', 'AUTONOMOUS_SCOPED'] as const;

function identifierList(max: number): z.ZodDefault<z.ZodArray<z.ZodString>> {
  return z.array(z.string().min(1).max(200)).max(max).default([]);
}

export const updateOrganizationPolicySchema = z
  .object({
    allowedTools: identifierList(256),
    allowedModels: identifierList(1_000),
    maximumRisk: z.enum(POLICY_RISK_CLASSES).default('R4'),
    deniedEffects: z.array(z.enum(POLICY_EFFECT_KINDS)).max(POLICY_EFFECT_KINDS.length).default([]),
    requireApproval: z
      .array(z.enum(POLICY_EFFECT_KINDS))
      .max(POLICY_EFFECT_KINDS.length)
      .default([]),
    maximumRetentionDays: z.number().int().min(0).max(3_650).default(3_650),
    minimumPermissionMode: z.enum(POLICY_PERMISSION_MODES).nullable().default(null),
  })
  .strict();

export type UpdateOrganizationPolicyDto = z.infer<typeof updateOrganizationPolicySchema>;
