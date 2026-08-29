import { z } from 'zod';

/**
 * connector-service's provider-grain PAYG policy.
 *
 * One entry per DISTINCT provider that has a connector row; `true` when any
 * ENABLED connector for that provider is pay-as-you-go. The grain is the
 * provider, not the model, because `connectors` has no unique constraint on
 * `provider` — several rows can serve one provider, so a `{provider, model}`
 * key could not address any single one of them (ADR-082).
 *
 * The record is bounded so a compromised or misbehaving connector-service
 * cannot flood auth's cache with an unbounded map.
 */
export const connectorPaygPolicyResponseSchema = z.object({
  providers: z.record(z.string().min(1).max(64), z.boolean()),
});

export type ConnectorPaygPolicyResponse = z.infer<typeof connectorPaygPolicyResponseSchema>;
