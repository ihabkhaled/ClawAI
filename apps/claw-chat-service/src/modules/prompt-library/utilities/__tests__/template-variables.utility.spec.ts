import { BusinessException } from '../../../../common/errors';
import { PromptLibraryErrorCode } from '../../enums/prompt-library-error-code.enum';
import { assertValidTemplate, extractTemplateVariables } from '../template-variables.utility';

function codeOf(fn: () => void): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof BusinessException ? error.code : 'OTHER';
  }
  return undefined;
}

describe('extractTemplateVariables', () => {
  it('returns names in order of first appearance, deduplicated', () => {
    expect(extractTemplateVariables('Hi {{name}}, {{topic}} and {{name}} again')).toEqual([
      'name',
      'topic',
    ]);
  });

  it('handles adjacent placeholders and inner whitespace', () => {
    expect(extractTemplateVariables('{{a}}{{b_2}}{{ c }}')).toEqual(['a', 'b_2', 'c']);
  });

  it('skips invalid names and plain text', () => {
    expect(extractTemplateVariables('{{Bad}} {{1x}} {{}} no vars')).toEqual([]);
  });

  it('ignores unicode names and keeps ascii ones around them', () => {
    expect(extractTemplateVariables('مرحبا {{اسم}} {{ok}}')).toEqual(['ok']);
  });

  it('returns an empty list for an empty body', () => {
    expect(extractTemplateVariables('')).toEqual([]);
  });
});

describe('assertValidTemplate', () => {
  it('accepts text with valid, repeated and no variables', () => {
    expect(() => assertValidTemplate('plain text')).not.toThrow();
    expect(() => assertValidTemplate('{{a}} {{a}} {{b}}')).not.toThrow();
  });

  it('rejects an unclosed placeholder', () => {
    expect(codeOf(() => assertValidTemplate('hello {{name'))).toBe(
      PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID,
    );
  });

  it('rejects nested braces', () => {
    expect(codeOf(() => assertValidTemplate('{{a {{b}} }}'))).toBe(
      PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID,
    );
  });

  it('rejects an invalid name', () => {
    expect(codeOf(() => assertValidTemplate('{{Name}}'))).toBe(
      PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID,
    );
    expect(codeOf(() => assertValidTemplate('{{}}'))).toBe(
      PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID,
    );
    expect(codeOf(() => assertValidTemplate(`{{a${'b'.repeat(32)}}}`))).toBe(
      PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID,
    );
  });

  it('rejects more than 20 distinct variables but allows exactly 20', () => {
    const make = (n: number): string => Array.from({ length: n }, (_, i) => `{{v${i}}}`).join(' ');
    expect(() => assertValidTemplate(make(20))).not.toThrow();
    expect(codeOf(() => assertValidTemplate(make(21)))).toBe(
      PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID,
    );
  });
});
