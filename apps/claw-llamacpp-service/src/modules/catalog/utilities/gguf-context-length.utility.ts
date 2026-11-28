import {
  HF_IMPORT_LICENSE,
  HF_IMPORT_PLACEHOLDER_CONTEXT_LENGTH,
} from '../constants/hf-discovery.constants';
import { type CatalogEntry } from '../types/catalog.types';
import { type HfApiGgufDetail } from '../types/hf-api.types';

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * The context window HuggingFace reports for a GGUF repo
 * (`GET /api/models/<repo>?expand[]=gguf` -> `gguf.context_length`, the value
 * stored in the file's own metadata). `null` when the repo reports none, or a
 * value that is not a positive whole number: unknown, never guessed (ADR-234).
 */
export function parseGgufContextLength(body: HfApiGgufDetail | null | undefined): number | null {
  const reported = body?.gguf?.context_length;
  return isPositiveInteger(reported) ? reported : null;
}

/**
 * The window of a catalog row as routing-service may record it, or `undefined`.
 *
 * A curated entry carries a published window. A HuggingFace import whose repo
 * reported no GGUF window was stored with a placeholder (the column is not
 * nullable), and a placeholder is not a model's window: forwarding it would put
 * "32K context" beside a model that may read a million tokens. Such a row is
 * recognised by what an import always is: license "Unknown" and the placeholder
 * value. A genuine window that equals the placeholder on an imported row is
 * dropped too; unknown is the safe side.
 */
export function forwardableContextWindow(
  row: Pick<CatalogEntry, 'contextLength' | 'license'>,
): number | undefined {
  if (!isPositiveInteger(row.contextLength)) {
    return undefined;
  }
  const isPlaceholder =
    row.license === HF_IMPORT_LICENSE && row.contextLength === HF_IMPORT_PLACEHOLDER_CONTEXT_LENGTH;
  return isPlaceholder ? undefined : row.contextLength;
}
