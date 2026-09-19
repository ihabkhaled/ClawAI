import { ROUTING_TO_CHAT_PROVIDER } from '../constants/file-writer.constants';
import type { FileContentCandidate, FileWriterCandidate } from '../types/file-writer.types';

/** Admin candidates in chat's provider names, deduplicated, order kept. */
export function toFileContentCandidates(
  admin: readonly FileWriterCandidate[],
  local: readonly string[],
): FileContentCandidate[] {
  const out: FileContentCandidate[] = [];
  const push = (provider: string, model: string): void => {
    if (!out.some((c) => c.provider === provider && c.model === model)) {
      out.push({ provider, model });
    }
  };
  for (const candidate of admin) {
    push(ROUTING_TO_CHAT_PROVIDER[candidate.provider] ?? candidate.provider, candidate.modelAlias);
  }
  for (const model of local) {
    if (model !== 'AUTO') {
      push(ROUTING_TO_CHAT_PROVIDER['OLLAMA'] ?? 'local-ollama', model);
    }
  }
  return out;
}
