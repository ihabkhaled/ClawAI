import { z } from 'zod';

/**
 * Stream 13 — payload for `POST /agent/recipes/:id/runs`.
 *
 * `params` is the user-supplied parameter map; the runner validates each
 * value against the recipe DSL's `parameters` declaration before
 * starting. `deviceId` is the device the steps will execute on.
 */
export const startRunSchema = z.object({
  deviceId: z.string().cuid(),
  params: z.record(z.string(), z.unknown()).default({}),
  /**
   * V2 Stream 01e — when true, the runner walks the DAG, resolves
   * `$params` and `$steps.<id>.output` placeholders, and marks every
   * step SUCCEEDED with a synthesised output of
   * `{ dryRun: true, target, payload }` instead of calling
   * CapabilityApprovalManager.propose. The run itself ends as
   * SUCCEEDED with errorMessage=null and metadata recorded by the
   * caller. No CapabilityInvocation is ever created.
   */
  dryRun: z.boolean().optional().default(false),
});

export type StartRunDto = z.infer<typeof startRunSchema>;

export const listRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListRunsQueryDto = z.infer<typeof listRunsQuerySchema>;
