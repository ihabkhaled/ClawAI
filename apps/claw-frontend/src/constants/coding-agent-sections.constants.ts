/**
 * Anchor ids for the in-page section nav on the Coding Agent pages.
 *
 * Stable by contract, like the comparison ids: these end up in deep links, in
 * the section nav, and in anything anyone bookmarks. Renaming one breaks a link
 * somebody else owns.
 */
export const CODING_AGENT_SECTION_IDS = {
  capabilities: 'what-it-does',
  requirements: 'requirements',
  faq: 'questions',
} as const;

export const CODING_AGENT_INSTALL_SECTION_IDS = {
  steps: 'install-steps',
  cli: 'command-line',
  signIn: 'signing-in',
  troubleshooting: 'troubleshooting',
} as const;
