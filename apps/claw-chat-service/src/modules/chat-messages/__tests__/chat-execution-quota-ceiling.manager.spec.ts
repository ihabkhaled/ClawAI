import { describe, expect, it, vi } from 'vitest';

// Bug, 2026-09-23: a user with a large, nearly-untouched monthly quota
// attached a big PDF and every provider refused the call outright —
// "max_tokens (3999650) exceeds model's maximum output tokens (1048576)
// for model glm-5.3". `resolveQuotaHeadroom` correctly computes "how many
// tokens of ALLOWANCE remain" (which can legitimately be millions), but
// `applyQuotaCeiling` forwarded that number straight into
// `options.maxOutputTokens` with no ceiling, and every request-body builder
// trusts `executionOptions.maxOutputTokens` as an authoritative per-reply
// cap. A quota headroom is not a valid `max_tokens` — it has to be bounded
// by the same HARD_MAX_OUTPUT_TOKENS ceiling an explicit thread cap already
// gets (chat-execution.manager.ts: resolveMaxOutputTokens).

import { HARD_MAX_OUTPUT_TOKENS } from '../constants/execution-fast-path.constants';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { ExecutionOptions } from '../types/execution-options.types';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

type ApplyQuotaCeiling = (
  userId: string | undefined,
  userPrompt: string,
  options: ExecutionOptions,
) => Promise<ExecutionOptions>;

const baseOptions = (): ExecutionOptions => ({
  fastPathEnabled: false,
  applyShortResponseConstraint: false,
});

const buildExecution = (
  resolveOutputCeiling: () => Promise<number | null>,
): ChatExecutionManager => {
  const access = createFakePaygAccessControl();
  access.resolveOutputCeiling = vi.fn(resolveOutputCeiling);
  return new ChatExecutionManager(
    {} as unknown as ContextAssemblyManager,
    {} as unknown as QualityCheckManager,
    {
      setExecutionManager: vi.fn(),
      shouldActivate: vi.fn().mockReturnValue(false),
    } as unknown as JudgeRefereeManager,
    {} as unknown as ChatStreamService,
    {} as unknown as SearchFirstManager,
    access as unknown as AccessControlService,
    {} as unknown as GeminiFilesApiManager,
    {} as unknown as LocalModelSelectionService,
  );
};

const applyQuotaCeiling = (manager: ChatExecutionManager): ApplyQuotaCeiling =>
  (manager as unknown as { applyQuotaCeiling: ApplyQuotaCeiling }).applyQuotaCeiling.bind(manager);

describe('ChatExecutionManager — applyQuotaCeiling', () => {
  it('clamps a huge quota headroom to the HARD output ceiling', async () => {
    const manager = buildExecution(async () => 3_999_650);

    const result = await applyQuotaCeiling(manager)('user-1', 'check this file', baseOptions());

    expect(result.maxOutputTokens).toBe(HARD_MAX_OUTPUT_TOKENS);
  });

  it('still narrows an existing cap when the quota is the tighter one', async () => {
    const manager = buildExecution(async () => 500);

    const result = await applyQuotaCeiling(manager)('user-1', 'hi', {
      ...baseOptions(),
      maxOutputTokens: 4096,
    });

    expect(result.maxOutputTokens).toBe(500);
  });

  it('leaves options untouched for an unlimited/admin entitlement', async () => {
    const manager = buildExecution(async () => null);

    const result = await applyQuotaCeiling(manager)('user-1', 'hi', baseOptions());

    expect(result.maxOutputTokens).toBeUndefined();
  });

  it('never widens an existing tighter cap even when quota headroom is large', async () => {
    const manager = buildExecution(async () => 3_999_999);

    const result = await applyQuotaCeiling(manager)('user-1', 'hi', {
      ...baseOptions(),
      maxOutputTokens: 1024,
    });

    expect(result.maxOutputTokens).toBe(1024);
  });
});
