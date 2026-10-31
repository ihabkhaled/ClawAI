import { APPROX_CHARS_PER_TOKEN } from '../../../common/constants/execution.constants';
import { EVIDENCE_FIT_BUDGET_SHARE } from '../constants/evidence-fit.constants';
import type { BudgetedSource } from '../types/evidence-fit.types';
import { fitEvidenceToBudget } from './evidence-fit.utility';
import { resolveModelTokenBudget } from './model-token-budget.utility';

/**
 * The character budget web evidence may take in ONE prompt: the same 45% share of
 * the model's input window the main chat path uses (`EVIDENCE_FIT_BUDGET_SHARE`), so
 * adding sources (every provider's hits, plus page text) can never push the prompt
 * past the window. `contextWindowTokens` is the answering model's window when the caller
 * knows it; otherwise the surface's assumed window stands in.
 */
export function researchEvidenceBudgetChars(contextWindowTokens: number): number {
  const window = resolveModelTokenBudget({
    contextWindowTokens,
    provider: null,
    requestedOutputTokens: null,
    systemOverheadTokens: 0,
    toolOverheadTokens: 0,
  });
  return Math.floor(
    window.availableInputTokens * APPROX_CHARS_PER_TOKEN * EVIDENCE_FIT_BUDGET_SHARE,
  );
}

/**
 * Fits sources to the shared evidence budget. Returns the kept sources (bodies shortened
 * where needed, order preserved) and how many were left out, so the caller can SAY so
 * (rule 41). Items arrive ranked, so the tail is what is dropped.
 */
export function fitSourcesToResearchBudget<T extends BudgetedSource>(
  sources: readonly T[],
  contextWindowTokens: number,
): { kept: T[]; omitted: number } {
  const fitted = fitEvidenceToBudget(
    sources.map((source) => ({
      source,
      title: source.title,
      url: source.url,
      snippet: source.body,
    })),
    researchEvidenceBudgetChars(contextWindowTokens),
  );
  return {
    kept: fitted.items.map((item) => ({ ...item.source, body: item.snippet })),
    omitted: fitted.omitted,
  };
}
