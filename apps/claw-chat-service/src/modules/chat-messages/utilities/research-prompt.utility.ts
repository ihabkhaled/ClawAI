// Shared helper for the 7 orchestration managers that pass raw prompt strings
// to ollama-service /generate (answer-repair, task-decomposition, best-of-n,
// cost-ensemble, verifier, pipeline, role-pack). Each manager calls
// ResearchEnricherManager.enrichForOrchestration once and prepends the
// resulting evidence block (already formatted with a Markdown header by
// `buildEvidenceBlock` in the enricher) to whatever prompt it would otherwise
// have used.
//
// A no-evidence prompt (empty `evidence`) is the safe no-op path so callers
// can unconditionally call this helper without any if-guards.

export function prependResearchEvidence(prompt: string, evidence: string): string {
  if (evidence.length === 0) {
    return prompt;
  }
  return `${evidence}\n\n${prompt}`;
}
