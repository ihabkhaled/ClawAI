import { stripHostileText } from '../../mcp-servers/utilities/strip-hostile-text.utility';
import {
  MODEL_TEXT_LINE_BREAK_CODES,
  MODEL_TEXT_SPACE_RUNS,
} from '../constants/own-servers-chat.constants';

/**
 * Server-written text on its way into the model's tool list: line breaks and tabs folded to one
 * space (so a description cannot lay out fake instructions), invisible and control characters
 * removed again (the stored text was cleaned once, this does not rely on it), and a hard length cap.
 */
export function cleanModelText(text: string, max: number): string {
  const spaced = [...text]
    .map((char) => (MODEL_TEXT_LINE_BREAK_CODES.has(char.codePointAt(0) ?? 0) ? ' ' : char))
    .join('');
  const flat = stripHostileText(spaced, false).replaceAll(MODEL_TEXT_SPACE_RUNS, ' ').trim();
  return [...flat].slice(0, max).join('');
}
