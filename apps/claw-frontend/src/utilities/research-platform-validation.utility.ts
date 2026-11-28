import {
  RESEARCH_PLATFORM_DOMAIN_LABEL_PATTERN,
  RESEARCH_PLATFORM_DOMAIN_TLD_PATTERN,
  RESEARCH_PLATFORM_LANGUAGE_PATTERN,
} from '@/constants/research-platform.constants';

/**
 * A bare domain a `site:` search can scope to (`reddit.com`, `gov.uk`): two or more dot-separated labels, none
 * starting or ending with `-`, the last letters only. No scheme, path, port or space. Checked label by label rather
 * than with one nested-quantifier pattern, which would backtrack badly on long input.
 */
export function isResearchPlatformDomain(value: string): boolean {
  const labels = value.split('.');
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        RESEARCH_PLATFORM_DOMAIN_LABEL_PATTERN.test(label) &&
        !label.startsWith('-') &&
        !label.endsWith('-'),
    ) &&
    RESEARCH_PLATFORM_DOMAIN_TLD_PATTERN.test(labels.at(-1) ?? '')
  );
}

/** A language code as research-service stores it: a base ISO 639 code. */
export function isResearchPlatformLanguage(value: string): boolean {
  return RESEARCH_PLATFORM_LANGUAGE_PATTERN.test(value);
}
