import { RESULT_FENCE_ESCAPE, RESULT_FENCE_TAG } from '../constants/runtime.constants';
import { stripHostileText } from '../../mcp-servers/utilities/strip-hostile-text.utility';
import { type FencedResult } from '../types/invoke.types';
import { truncateUtf8 } from './truncate-utf8.utility';

/**
 * Makes a tool's output safe to put in front of a model, and says so in the output itself.
 *
 * The text is normalised to NFC and stripped of control, zero-width and bidi characters (the
 * usual hiding places for an instruction), cut to the byte cap, and wrapped in a fence naming the
 * plugin and tool with trust="untrusted". Any occurrence of the fence tag inside the text is
 * escaped, so a result cannot close its own fence and continue as if it were the system. The
 * model's system block says what the fence means; this function makes sure it cannot be forged.
 */
export function fenceToolResult(input: {
  slug: string;
  toolName: string;
  text: string;
  maxBytes: number;
  alreadyTruncated?: boolean;
}): FencedResult {
  const cleaned = stripHostileText(input.text, true);
  const cut = truncateUtf8(cleaned, input.maxBytes);
  const escaped = cut.text.replaceAll(RESULT_FENCE_ESCAPE, (match) => `&lt;${match.slice(1)}`);
  const note = cut.truncated || input.alreadyTruncated === true ? '\n[result truncated]' : '';
  return {
    content: `<${RESULT_FENCE_TAG} plugin="${input.slug}" tool="${input.toolName}" trust="untrusted">\n${escaped}${note}\n</${RESULT_FENCE_TAG}>`,
    bytes: Buffer.byteLength(cut.text, 'utf8'),
    truncated: cut.truncated || input.alreadyTruncated === true,
  };
}
