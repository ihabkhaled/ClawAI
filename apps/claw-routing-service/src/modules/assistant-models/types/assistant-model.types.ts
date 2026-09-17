import type { AssistantModelRole, RouterProvider } from '../../../generated/prisma';

export interface AssistantModelSeedEntry {
  role: AssistantModelRole;
  order: number;
  provider: RouterProvider;
  modelAlias: string;
  timeoutMs: number;
  maxTokens: number;
}

/** One configured candidate, as the admin page and the callers see it. */
export interface AssistantModelRecord {
  id: string;
  role: AssistantModelRole;
  order: number;
  enabled: boolean;
  provider: RouterProvider;
  modelAlias: string;
  deploymentId: string | null;
  timeoutMs: number;
  maxTokens: number;
}

/** What a consuming service needs to actually place the call. */
export interface AssistantModelCandidate {
  provider: RouterProvider;
  modelAlias: string;
  timeoutMs: number;
  maxTokens: number;
}

export interface AssistantModelInput {
  provider: RouterProvider;
  modelAlias: string;
  deploymentId?: string;
  enabled: boolean;
  timeoutMs: number;
  maxTokens: number;
}
