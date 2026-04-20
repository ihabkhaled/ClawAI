import {
  EVIDENCE_COMPRESSED_SNIPPET_LENGTH,
  EVIDENCE_DETAILED_SNIPPET_LENGTH,
  EVIDENCE_MAX_ITEMS,
} from '../../../common/constants/evidence.constants';
import type {
  BuildEvidenceInput,
  EvidenceBundle,
  EvidenceItem,
  ResearchTraceEntry,
} from '../types/evidence-bundle.types';

export function buildEvidenceBundle(input: BuildEvidenceInput): EvidenceBundle {
  const mode = input.mode ?? 'detailed';
  const limit =
    mode === 'compressed' ? EVIDENCE_COMPRESSED_SNIPPET_LENGTH : EVIDENCE_DETAILED_SNIPPET_LENGTH;

  const deduped = dedupeByUrl(input.items);
  const ranked = [...deduped].sort((a, b) => b.confidence - a.confidence);
  const capped = ranked.slice(0, EVIDENCE_MAX_ITEMS);
  const trimmed = capped.map((item) => ({
    ...item,
    snippet: item.snippet.length > limit ? `${item.snippet.slice(0, limit)}…` : item.snippet,
  }));

  const warnings = [...input.warnings];
  if (ranked.length > EVIDENCE_MAX_ITEMS) {
    warnings.push(
      `Evidence truncated to ${String(EVIDENCE_MAX_ITEMS)} items (had ${String(ranked.length)})`,
    );
  }

  return {
    intent: input.intent,
    workflow: input.workflow,
    requestedModel: input.requestedModel,
    requestedProvider: input.requestedProvider,
    helperModels: input.helperModels,
    toolsUsed: input.toolsUsed,
    items: trimmed,
    warnings,
    generatedAt: new Date().toISOString(),
    mode,
  };
}

export function traceEntry(
  phase: string,
  status: ResearchTraceEntry['status'],
  latencyMs: number | null,
  message: string | null,
): ResearchTraceEntry {
  return {
    phase,
    status,
    latencyMs,
    message,
    timestamp: new Date().toISOString(),
  };
}

function dedupeByUrl(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Map<string, EvidenceItem>();
  for (const item of items) {
    const normalized = item.url.toLowerCase();
    const existing = seen.get(normalized);
    if (existing === undefined || item.confidence > existing.confidence) {
      seen.set(normalized, item);
    }
  }
  return [...seen.values()];
}
