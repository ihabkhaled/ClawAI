import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';

/** The catalog a run holds right now: the start catalog with loaded stubs replaced. */
export interface RuntimeV2EffectiveCatalog {
  readonly catalogVersion: number;
  readonly effectiveCatalogHash: string;
  readonly definitions: readonly ToolDefinitionDto[];
}

/** What a load request answers: the new catalog version and what it now holds. */
export interface RuntimeV2DeferredLoadAck {
  readonly runId: string;
  readonly catalogVersion: number;
  readonly effectiveCatalogHash: string;
  readonly loaded: readonly { readonly name: string; readonly version: string }[];
}
