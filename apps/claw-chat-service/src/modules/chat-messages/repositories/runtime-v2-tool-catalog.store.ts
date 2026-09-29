import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  RUNTIME_V2_LOAD_TOOLS_SCRIPT,
  RUNTIME_V2_READ_LOADED_TOOLS_SCRIPT,
} from '../constants/runtime-v2-deferred-tools.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { RuntimeV2EffectiveCatalog } from '../types/runtime-v2-deferred-tools.types';
import type { RuntimeV2BoundInput } from '../types/runtime-v2-store.types';
import {
  deferredToolField,
  effectiveRuntimeV2Catalog,
  loadedToolsRecord,
  verifyDeferredLoad,
} from '../utilities/runtime-v2-deferred-tools.utility';
import { runtimeV2LoadedToolsKey } from '../utilities/runtime-v2-key.utility';
import { runtimeV2Unavailable } from '../utilities/runtime-v2-reply.utility';

/**
 * The deferred half of a run's tool catalog (F028).
 *
 * Kept beside the run binding rather than inside it on purpose: the binding —
 * and its `toolCatalogHash` — stays exactly as admitted at start, so every
 * existing identity check keeps holding. What changes mid-run is only which
 * committed stubs have had their full definition supplied, and each one is
 * verified against its commitment on write AND on read.
 */
@Injectable()
export class RuntimeV2ToolCatalogStore {
  private readonly logger = new Logger(RuntimeV2ToolCatalogStore.name);

  constructor(private readonly redis: RedisService) {}

  async load(
    binding: RuntimeV2BoundInput,
    definitions: readonly ToolDefinitionDto[],
  ): Promise<RuntimeV2EffectiveCatalog> {
    verifyDeferredLoad(binding.toolDefinitions, definitions);
    const fields = definitions.flatMap((definition) => [
      deferredToolField(definition),
      JSON.stringify(definition),
    ]);
    const reply = await this.evaluate(RUNTIME_V2_LOAD_TOOLS_SCRIPT, binding, [
      ...fields,
      String(binding.ttlSeconds * 1_000),
    ]);
    const catalog = effectiveRuntimeV2Catalog(binding.toolDefinitions, loadedToolsRecord(reply));
    this.logger.log(
      `Runtime V2 run ${binding.runId} catalog v${String(catalog.catalogVersion)} ${catalog.effectiveCatalogHash}`,
    );
    return catalog;
  }

  /** The binding with its catalog as it stands now; unchanged when nothing is deferred. */
  async effectiveBinding(binding: RuntimeV2BoundInput): Promise<RuntimeV2BoundInput> {
    if (!binding.toolDefinitions.some((definition) => definition.deferred !== undefined)) {
      return binding;
    }
    const reply = await this.evaluate(RUNTIME_V2_READ_LOADED_TOOLS_SCRIPT, binding, []);
    const catalog = effectiveRuntimeV2Catalog(binding.toolDefinitions, loadedToolsRecord(reply));
    // Only what the model is shown and parsed against changes. The binding's
    // `toolCatalogHash` is untouched, and the Lua identity checks compare that
    // hash rather than the definitions, so every later mutation still binds.
    return { ...binding, toolDefinitions: catalog.definitions };
  }

  private async evaluate(
    script: string,
    binding: RuntimeV2BoundInput,
    arguments_: readonly string[],
  ): Promise<unknown> {
    try {
      return await this.redis.evalFailFast(
        script,
        [runtimeV2LoadedToolsKey(binding.runId)],
        arguments_,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Runtime V2 loaded-tools operation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw runtimeV2Unavailable();
    }
  }
}
