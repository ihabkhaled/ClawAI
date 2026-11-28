import {
  PLUGIN_ATTRIBUTE_UNSAFE,
  PLUGIN_CLOSING_TAG,
  PLUGIN_CLOSING_TAG_DEFANGED,
  PLUGIN_RESULT_EXCERPT_MAX_CHARS,
  PLUGIN_RESULT_MODEL_MAX_CHARS,
  PLUGIN_TRUNCATION_MARKER,
} from '../constants/plugin-tools.constants';
import {
  defangFenceTags,
  fenceUntrusted,
  sanitizeFenceAttribute,
  sanitizeUntrustedText,
} from './untrusted-fence.utility';

/** Plain text only: no controls, no zero-width or bidi marks, NFC, capped. */
export function sanitizePluginText(text: string, maxChars: number): string {
  return sanitizeUntrustedText(text, maxChars, PLUGIN_TRUNCATION_MARKER);
}

/** What is kept on the message and shown in the "what the plugin returned" block. */
export function pluginResultExcerpt(text: string): string {
  return sanitizePluginText(text, PLUGIN_RESULT_EXCERPT_MAX_CHARS);
}

/**
 * A tool result as the model sees it: sanitised, the closing tag defanged so the
 * content cannot end the fence early, and wrapped in an untrusted fence. The
 * system prompt tells the model that anything inside is data (see
 * PLUGIN_UNTRUSTED_RESULTS_INSTRUCTION). Same shared fence as web sources
 * (`untrusted-fence.utility.ts`).
 */
export function fencePluginResult(args: {
  pluginSlug: string;
  toolName: string;
  content: string;
}): string {
  const body = defangFenceTags(sanitizePluginText(args.content, PLUGIN_RESULT_MODEL_MAX_CHARS), [
    [PLUGIN_CLOSING_TAG, PLUGIN_CLOSING_TAG_DEFANGED],
  ]);
  return fenceUntrusted({
    tag: 'tool_result',
    attributes: [
      ['plugin', sanitizeFenceAttribute(args.pluginSlug, PLUGIN_ATTRIBUTE_UNSAFE)],
      ['tool', sanitizeFenceAttribute(args.toolName, PLUGIN_ATTRIBUTE_UNSAFE)],
    ],
    body,
  });
}
