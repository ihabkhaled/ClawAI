import { FILE_GENERATION_PROVIDER, LOCAL_ONLY_ROUTING_MODES } from '../../../common/constants';
import { isGenerationProvider } from './generation-provider.utility';
import { ThinkingFragmentScanner } from './thinking-fragment-scanner.utility';
import { ROUTING_TO_CHAT_PROVIDER } from '../constants/file-writer.constants';
import type { MessageRoutedData } from '../types/execution.types';
import type {
  FileContentCandidate,
  FileContentCandidateOptions,
  FileWriterCandidate,
} from '../types/file-writer.types';

/**
 * Who writes a file's content, in order, deduplicated:
 * 1. the model the user picked (`preferred`, manual mode only — F6, ADR-119);
 * 2. the admin's FILE_WRITER list, in chat's provider names;
 * 3. the local file models.
 * `localOnly` (LOCAL_ONLY / PRIVACY_FIRST) keeps only the local models: the
 * other two are hosted, so the content would leave the machine.
 */
export function toFileContentCandidates(
  admin: readonly FileWriterCandidate[],
  local: readonly string[],
  options: FileContentCandidateOptions = {},
): FileContentCandidate[] {
  const out: FileContentCandidate[] = [];
  const push = (provider: string, model: string): void => {
    if (!out.some((c) => c.provider === provider && c.model === model)) {
      out.push({ provider, model });
    }
  };
  if (options.localOnly !== true) {
    if (options.preferred !== undefined) {
      push(options.preferred.provider, options.preferred.model);
    }
    for (const candidate of admin) {
      push(
        ROUTING_TO_CHAT_PROVIDER[candidate.provider] ?? candidate.provider,
        candidate.modelAlias,
      );
    }
  }
  for (const model of local) {
    if (model !== 'AUTO') {
      push(ROUTING_TO_CHAT_PROVIDER['OLLAMA'] ?? 'local-ollama', model);
    }
  }
  return out;
}

/**
 * The writer options a routed FILE_GENERATION turn carries: the user's own
 * model first when routing passed one (manual mode), and local writers only
 * in LOCAL_ONLY / PRIVACY_FIRST.
 */
export function fileWriterOptionsFor(
  payload: Pick<MessageRoutedData, 'routingMode' | 'fileWriter'>,
): FileContentCandidateOptions {
  return {
    ...(payload.fileWriter === undefined ? {} : { preferred: payload.fileWriter }),
    ...(LOCAL_ONLY_ROUTING_MODES.has(payload.routingMode) ? { localOnly: true } : {}),
  };
}

/** Reads `fileWriter` off a message.routed event; anything malformed is ignored. */
export function parseFileWriter(raw: unknown): FileContentCandidate | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const provider: unknown = Reflect.get(raw, 'provider');
  const model: unknown = Reflect.get(raw, 'model');
  return typeof provider === 'string' &&
    provider !== '' &&
    typeof model === 'string' &&
    model !== ''
    ? { provider, model }
    : undefined;
}

/**
 * "another" / "one more" right after a generated file asks for another file.
 * AUTO always re-routed it; a manual pick now does too, and keeps the picked
 * model as the writer (F6, ADR-119). Runtime V2 never reaches this path.
 */
export function rerouteFileFollowUp(payload: MessageRoutedData): MessageRoutedData {
  const manualWriter =
    payload.routingMode === 'MANUAL_MODEL' && !isGenerationProvider(payload.selectedProvider)
      ? { fileWriter: { provider: payload.selectedProvider, model: payload.selectedModel } }
      : {};
  return {
    ...payload,
    ...manualWriter,
    selectedProvider: FILE_GENERATION_PROVIDER,
    selectedModel: 'auto',
  };
}

/**
 * A file writer's answer without its <think>/<thought>/<reasoning> blocks.
 * The streaming chat path already splits them out; the file path did not, so
 * Gemini-hosted gemma models shipped their reasoning inside the file (F6,
 * ADR-119). Reasoning with no answer after it is returned as it was, so a
 * file is never silently empty.
 */
export function stripWriterReasoning(content: string): string {
  const scanner = new ThinkingFragmentScanner();
  const answer = `${scanner.push(content).content}${scanner.flush().content}`.trim();
  return answer === '' ? content : answer;
}

/** `{ fileWriter }` when the event carries a well-formed one, else `{}`. */
export function fileWriterField(raw: unknown): { fileWriter?: FileContentCandidate } {
  const fileWriter = parseFileWriter(raw);
  return fileWriter === undefined ? {} : { fileWriter };
}
