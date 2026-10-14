import {
  PLUGIN_ATTRIBUTE_UNSAFE,
  PLUGIN_CLOSING_TAG,
  PLUGIN_CLOSING_TAG_DEFANGED,
  PLUGIN_HOSTILE_CODE_POINT_RANGES,
  PLUGIN_RESULT_EXCERPT_MAX_CHARS,
  PLUGIN_RESULT_MODEL_MAX_CHARS,
  PLUGIN_TRUNCATION_MARKER,
} from '../constants/plugin-tools.constants';

function isHostileCodePoint(codePoint: number): boolean {
  return PLUGIN_HOSTILE_CODE_POINT_RANGES.some(
    ([from, to]) => codePoint >= from && codePoint <= to,
  );
}

function stripHostileCharacters(text: string): string {
  let kept = '';
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && !isHostileCodePoint(codePoint)) kept += character;
  }
  return kept;
}

/** Plain text only: no controls, no zero-width or bidi marks, NFC, capped. */
export function sanitizePluginText(text: string, maxChars: number): string {
  const cleaned = stripHostileCharacters(text.normalize('NFC'));
  return cleaned.length <= maxChars
    ? cleaned
    : cleaned.slice(0, maxChars) + PLUGIN_TRUNCATION_MARKER;
}

/** What is kept on the message and shown in the "what the plugin returned" block. */
export function pluginResultExcerpt(text: string): string {
  return sanitizePluginText(text, PLUGIN_RESULT_EXCERPT_MAX_CHARS);
}

/**
 * A tool result as the model sees it: sanitised, the closing tag defanged so the
 * content cannot end the fence early, and wrapped in an untrusted fence. The
 * system prompt tells the model that anything inside is data (see
 * PLUGIN_UNTRUSTED_RESULTS_INSTRUCTION).
 */
export function fencePluginResult(args: {
  pluginSlug: string;
  toolName: string;
  content: string;
}): string {
  const body = sanitizePluginText(args.content, PLUGIN_RESULT_MODEL_MAX_CHARS).replaceAll(
    PLUGIN_CLOSING_TAG,
    PLUGIN_CLOSING_TAG_DEFANGED,
  );
  const plugin = args.pluginSlug.replaceAll(PLUGIN_ATTRIBUTE_UNSAFE, '');
  const tool = args.toolName.replaceAll(PLUGIN_ATTRIBUTE_UNSAFE, '');
  return `<tool_result plugin="${plugin}" tool="${tool}" trust="untrusted">\n${body}\n</tool_result>`;
}
