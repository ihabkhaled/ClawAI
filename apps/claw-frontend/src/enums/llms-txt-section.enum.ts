/**
 * The headings `/llms.txt` groups pages under.
 *
 * `HOME` is not rendered as a section — the home page becomes the leading
 * blockquote summary instead — but it is still a real outcome of
 * `resolveLlmsTxtSection`, so the mapping in
 * `utilities/llms-txt-section.utility.ts` stays one exhaustive switch instead
 * of a special case bolted on beside it.
 */
export enum LlmsTxtSection {
  HOME = 'HOME',
  PRODUCT = 'PRODUCT',
  COMPARISONS = 'COMPARISONS',
  LEGAL = 'LEGAL',
}
