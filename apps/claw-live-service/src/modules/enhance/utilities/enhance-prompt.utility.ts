import {
  ENHANCE_MAX_BODY_CHARS,
  ENHANCE_MAX_QUOTE_CHARS,
  ENHANCE_MAX_QUOTES,
  ENHANCE_SYSTEM_PROMPT,
  LINK_OR_MARKUP,
} from '../constants/enhance.constants';
import type { EnhancePrompt } from '../types/enhance.types';

function quoteOf(item: unknown): string | null {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null) {
    const record = item as { quote?: unknown; text?: unknown };
    if (typeof record.quote === 'string') return record.quote;
    if (typeof record.text === 'string') return record.text;
  }
  return null;
}

/** Evidence quotes of a card, capped in count and length. */
export function evidenceQuotes(evidence: unknown): string[] {
  return !Array.isArray(evidence)
    ? []
    : evidence
        .map((item) => quoteOf(item))
        .filter((quote): quote is string => quote !== null && quote.trim() !== '')
        .slice(0, ENHANCE_MAX_QUOTES)
        .map((quote) => quote.slice(0, ENHANCE_MAX_QUOTE_CHARS));
}

/** Stream content is untrusted: it goes in the user prompt, inside delimiters, never in the system prompt. */
export function buildEnhancePrompt(card: {
  title: string;
  body: string;
  evidence: unknown;
}): EnhancePrompt {
  const quotes = evidenceQuotes(card.evidence).map((quote) => `- ${quote}`);
  const userPrompt = [
    '<card>',
    `Title: ${card.title}`,
    `Body: ${card.body}`,
    '</card>',
    '<evidence>',
    ...quotes,
    '</evidence>',
  ].join('\n');
  return { systemPrompt: ENHANCE_SYSTEM_PROMPT, userPrompt };
}

/** Plain text only: no new links or markup that the card did not already carry. Null when unusable. */
export function sanitizeEnhancedBody(output: string, source: string): string | null {
  const text = [...output]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 32 || code === 9 || code === 10 || code === 13;
    })
    .join('')
    .trim();
  if (text === '' || text.length > ENHANCE_MAX_BODY_CHARS) return null;
  const known = new Set(source.match(LINK_OR_MARKUP) ?? []);
  const introduced = (text.match(LINK_OR_MARKUP) ?? []).some((hit) => !known.has(hit));
  return introduced ? null : text;
}
