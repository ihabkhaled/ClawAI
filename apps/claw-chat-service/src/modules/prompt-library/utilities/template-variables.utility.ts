import {
  CLOSE_BRACES,
  MAX_VARIABLES_PER_TEMPLATE,
  OPEN_BRACES,
  PLACEHOLDER_PATTERN,
  VARIABLE_NAME_PATTERN,
} from '../constants/prompt-library.constants';
import { PromptLibraryErrorCode } from '../enums/prompt-library-error-code.enum';
import { BusinessException } from '../../../common/errors';

/** Distinct `{{name}}` variables, in order of first appearance. Invalid names are skipped. */
export function extractTemplateVariables(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    const name = (match[1] ?? '').trim();
    if (VARIABLE_NAME_PATTERN.test(name)) {
      seen.add(name);
    }
  }
  return [...seen];
}

function invalid(message: string): BusinessException {
  return new BusinessException(message, PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID, 400);
}

/** Throws PROMPT_TEMPLATE_INVALID for an unclosed `{{`, a bad name, or too many variables. */
export function assertValidTemplate(body: string): void {
  const names = new Set<string>();
  let cursor = 0;
  for (;;) {
    const open = body.indexOf(OPEN_BRACES, cursor);
    if (open === -1) {
      break;
    }
    const close = body.indexOf(CLOSE_BRACES, open + OPEN_BRACES.length);
    if (close === -1) {
      throw invalid('Template has an unclosed {{ placeholder');
    }
    const inner = body.slice(open + OPEN_BRACES.length, close);
    if (inner.includes(OPEN_BRACES) || inner.includes('{') || inner.includes('}')) {
      throw invalid('Template has a nested or unclosed {{ placeholder');
    }
    const name = inner.trim();
    if (!VARIABLE_NAME_PATTERN.test(name)) {
      throw invalid(
        'Template variable names must start with a lowercase letter and use only a-z, 0-9 and _ (max 32 characters)',
      );
    }
    names.add(name);
    cursor = close + CLOSE_BRACES.length;
  }
  if (names.size > MAX_VARIABLES_PER_TEMPLATE) {
    throw invalid(`Template has more than ${MAX_VARIABLES_PER_TEMPLATE} distinct variables`);
  }
}
