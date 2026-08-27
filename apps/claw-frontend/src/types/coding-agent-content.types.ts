/** One question-and-answer pair, rendered as prose and as FAQPage structured data. */
export type CodingAgentFaqEntry = {
  question: string;
  answer: string;
};

/** One numbered step on the install page. */
export type CodingAgentInstallStep = {
  title: string;
  body: string;
};

/** One capability tile on the overview page. */
export type CodingAgentCapability = {
  title: string;
  body: string;
};

/**
 * Everything the two Coding Agent pages say, for one language.
 *
 * Product identifiers — the extension id, the publisher, the CLI command — are
 * deliberately absent: they live in `coding-agent.constants.ts` because they are
 * the same string in every language, and a translated copy of an extension id is
 * a broken install waiting to happen.
 */
export type CodingAgentDictionary = {
  overview: {
    eyebrow: string;
    title: string;
    intro: string;
    installCta: string;
    marketplaceCta: string;
    capabilitiesTitle: string;
    capabilities: readonly CodingAgentCapability[];
    requirementsTitle: string;
    requirementsBody: string;
    faqTitle: string;
    faq: readonly CodingAgentFaqEntry[];
  };
  install: {
    eyebrow: string;
    title: string;
    intro: string;
    stepsTitle: string;
    steps: readonly CodingAgentInstallStep[];
    cliTitle: string;
    cliBody: string;
    signInTitle: string;
    signInBody: string;
    troubleshootingTitle: string;
    troubleshooting: readonly CodingAgentFaqEntry[];
    marketplaceCta: string;
    openInEditorCta: string;
  };
};
