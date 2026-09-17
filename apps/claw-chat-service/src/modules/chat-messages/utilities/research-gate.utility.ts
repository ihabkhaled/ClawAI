import type { ResearchGateVerdict } from '../types/research-gate.types';

/**
 * Reads the classifier's reply.
 *
 * Fails CLOSED — anything unparseable means no web access. The classifier runs
 * on every turn, so a flaky or overloaded model must degrade into "answer
 * normally", never into "search every time". Searching on a malformed reply is
 * how a gate meant to REDUCE lookups ends up causing them.
 */
export function parseResearchGateVerdict(raw: string): ResearchGateVerdict {
  const match = raw.match(/\{[\s\S]*\}/u);
  if (match === null) {
    return { needsWeb: false, reason: 'unparseable' };
  }
  try {
    const parsed = JSON.parse(match[0]) as { needsWeb?: unknown; reason?: unknown };
    return {
      needsWeb: parsed.needsWeb === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'no reason given',
    };
  } catch {
    return { needsWeb: false, reason: 'invalid json' };
  }
}
