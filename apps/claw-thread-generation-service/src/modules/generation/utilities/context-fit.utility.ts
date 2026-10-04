import { knownContextWindow } from '@claw/shared-utilities';

import type { ContextFit } from '../types/context-fit.types';

export function checkRoleContextFit(input: {
  provider: string;
  model: string;
  promptTokens: number;
  outputReserveTokens: number;
  knownWindowTokens?: number | null;
}): ContextFit {
  const windowTokens =
    input.knownWindowTokens ?? knownContextWindow(input.provider, input.model) ?? null;
  const requiredTokens = input.promptTokens + input.outputReserveTokens;
  return {
    fits: windowTokens !== null && requiredTokens <= windowTokens,
    windowTokens,
    requiredTokens,
  };
}
