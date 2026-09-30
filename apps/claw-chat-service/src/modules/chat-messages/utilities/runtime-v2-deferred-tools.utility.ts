import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import {
  RUNTIME_V2_DEFERRED_INSTRUCTION,
  RUNTIME_V2_DEFERRED_TOOL_MISMATCH_CODE,
  RUNTIME_V2_START_CATALOG_VERSION,
  RUNTIME_V2_TOOL_NOT_DEFERRED_CODE,
  RUNTIME_V2_TOOL_SEARCH_NAME,
} from '../constants/runtime-v2-deferred-tools.constants';
import { type ToolDefinitionDto, toolDefinitionSchema } from '../dto/runtime-v2.dto';
import type { RuntimeV2EffectiveCatalog } from '../types/runtime-v2-deferred-tools.types';
import { runtimeV2Sha256, stableRuntimeV2Json } from './runtime-v2-identity.utility';

/** The field a loaded definition is stored under: one per name and version. */
export function deferredToolField(definition: Pick<ToolDefinitionDto, 'name' | 'version'>): string {
  return `${definition.name}@${definition.version}`;
}

/** The commitment a stub carries: a stable hash of the full definition. */
export function deferredDefinitionHash(definition: ToolDefinitionDto): string {
  return runtimeV2Sha256(stableRuntimeV2Json(definition));
}

function findStub(
  catalog: readonly ToolDefinitionDto[],
  definition: ToolDefinitionDto,
): ToolDefinitionDto | undefined {
  return catalog.find(
    (candidate) =>
      candidate.deferred !== undefined &&
      candidate.name === definition.name &&
      candidate.version === definition.version,
  );
}

/**
 * Accepts a load only for a tool the client declared deferred at start, and
 * only when the definition is exactly the one it committed to.
 *
 * This is the integrity check F028 must keep: the start catalog hash still
 * covers every tool the run can ever use, because each stub's commitment is
 * part of it.
 */
export function verifyDeferredLoad(
  catalog: readonly ToolDefinitionDto[],
  definitions: readonly ToolDefinitionDto[],
): void {
  for (const definition of definitions) {
    const stub = findStub(catalog, definition);
    if (stub?.deferred === undefined) {
      throw new BusinessException(
        `Tool ${deferredToolField(definition)} was not declared deferred when this run started`,
        RUNTIME_V2_TOOL_NOT_DEFERRED_CODE,
        HttpStatus.CONFLICT,
      );
    }
    if (deferredDefinitionHash(definition) !== stub.deferred.definitionHash) {
      throw new BusinessException(
        `Tool ${deferredToolField(definition)} does not match the definition committed at start`,
        RUNTIME_V2_DEFERRED_TOOL_MISMATCH_CODE,
        HttpStatus.CONFLICT,
      );
    }
  }
}

function verifiedLoaded(stub: ToolDefinitionDto, stored: string | undefined): ToolDefinitionDto {
  if (stored === undefined || stub.deferred === undefined) return stub;
  let candidate: unknown;
  try {
    candidate = JSON.parse(stored);
  } catch {
    return stub;
  }
  const parsed = toolDefinitionSchema.safeParse(candidate);
  // Re-verified on every read, not trusted because it was verified on write:
  // a stored value that no longer matches its commitment is ignored, so the
  // model keeps seeing the stub rather than an unverified schema.
  if (!parsed.success || parsed.data.deferred !== undefined) return stub;
  return deferredDefinitionHash(parsed.data) === stub.deferred.definitionHash ? parsed.data : stub;
}

/** The start catalog with every verified loaded definition in place of its stub. */
export function effectiveRuntimeV2Catalog(
  catalog: readonly ToolDefinitionDto[],
  stored: ReadonlyMap<string, string>,
): RuntimeV2EffectiveCatalog {
  let loaded = 0;
  const definitions = catalog.map((definition) => {
    const resolved = verifiedLoaded(definition, stored.get(deferredToolField(definition)));
    if (resolved !== definition) loaded += 1;
    return resolved;
  });
  return {
    catalogVersion: RUNTIME_V2_START_CATALOG_VERSION + loaded,
    effectiveCatalogHash: runtimeV2Sha256(JSON.stringify(definitions)),
    definitions,
  };
}

/** Redis HGETALL replies are a flat [field, value, ...] array. */
export function loadedToolsRecord(reply: unknown): Map<string, string> {
  const record = new Map<string, string>();
  if (!Array.isArray(reply)) return record;
  const entries: readonly unknown[] = reply;
  for (const [index, field] of entries.entries()) {
    const value = entries.at(index + 1);
    if (index % 2 === 0 && typeof field === 'string' && typeof value === 'string') {
      record.set(field, value);
    }
  }
  return record;
}

/** What the model is shown for one catalog entry: a stub omits its schema. */
export function modelCatalogEntry(definition: ToolDefinitionDto): Record<string, unknown> {
  const base = {
    name: definition.name,
    version: definition.version,
    description: definition.description,
    operations: definition.operations,
    targetIds: definition.targetIds,
  };
  return definition.deferred === undefined
    ? { ...base, inputSchema: definition.inputSchema }
    : { ...base, deferred: true };
}

/** The extra instruction a catalog with deferred entries needs; null when it has none. */
export function deferredCatalogInstruction(
  definitions: readonly ToolDefinitionDto[],
): string | null {
  return definitions.some((definition) => definition.deferred !== undefined)
    ? RUNTIME_V2_DEFERRED_INSTRUCTION
    : null;
}

/** A model-actionable reason a request for a still-deferred tool cannot run; null if loaded. */
export function deferredMismatch(definition: ToolDefinitionDto): string | null {
  return definition.deferred === undefined
    ? null
    : `"${definition.name}" is deferred and its input schema is not loaded yet. Call ${RUNTIME_V2_TOOL_SEARCH_NAME} with query "${definition.name}" first.`;
}
