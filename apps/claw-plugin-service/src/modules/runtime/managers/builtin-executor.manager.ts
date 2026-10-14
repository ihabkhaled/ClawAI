import { Injectable, Logger } from '@nestjs/common';

import { AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';
import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { InvokeOutcome } from '../../../common/enums/invoke-outcome.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { AdapterError } from '../errors/adapter.error';
import {
  type CatalogTarget,
  type ExecutionContext,
  type ExecutionResult,
} from '../types/invoke.types';
import { AdapterRegistryManager } from './adapter-registry.manager';

/** Runs a BUILTIN catalog tool through its in-process adapter. */
@Injectable()
export class BuiltinExecutorManager {
  private readonly logger = new Logger(BuiltinExecutorManager.name);

  constructor(private readonly registry: AdapterRegistryManager) {}

  async execute(
    target: CatalogTarget,
    args: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const runtime = target.manifest.runtime;
    const adapter =
      runtime.kind === RuntimeKind.BUILTIN ? this.registry.get(runtime.adapterKey) : undefined;
    if (adapter === undefined) {
      this.logger.error(`execute: no adapter for ${target.slug}`);
      return this.failure(
        InvokeOutcome.ERROR,
        InvokeErrorCode.ADAPTER_MISSING,
        'This tool is not available.',
      );
    }
    try {
      const result = await adapter.execute(
        {
          userId: context.userId,
          settings: target.settings,
          signal: context.signal,
          allowedHosts: new Set(target.manifest.network.hosts.map((host) => host.toLowerCase())),
          timeoutMs: context.timeoutMs,
          maxResultBytes: context.maxResultBytes,
        },
        target.toolName,
        args,
      );
      return {
        outcome: InvokeOutcome.OK,
        text: result.content,
        errorCode: null,
        serverFault: false,
        truncated: result.truncated,
      };
    } catch (error) {
      return this.fromError(error, target.slug);
    }
  }

  private fromError(error: unknown, slug: string): ExecutionResult {
    if (error instanceof AdapterError) {
      return error.kind === AdapterFailureKind.TIMEOUT
        ? this.failure(InvokeOutcome.TIMEOUT, InvokeErrorCode.TIMED_OUT, error.message)
        : this.failure(InvokeOutcome.ERROR, InvokeErrorCode.TOOL_FAILED, error.message);
    }
    this.logger.error(`fromError: adapter of ${slug} failed unexpectedly`);
    return this.failure(InvokeOutcome.ERROR, InvokeErrorCode.ADAPTER_FAILED, 'The tool failed.');
  }

  private failure(
    outcome: InvokeOutcome,
    errorCode: InvokeErrorCode,
    text: string,
  ): ExecutionResult {
    return { outcome, text, errorCode, serverFault: false, truncated: false };
  }
}
