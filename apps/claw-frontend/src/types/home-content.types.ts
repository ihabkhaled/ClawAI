// Homepage content descriptors. Each holds i18n KEY references (not literal
// copy) so the section components render translated strings via t(). The
// English source (and all 8 translations) live under the marketing.home
// namespace in the locale files.
export type RoutingModeDescriptor = {
  nameKey: string;
  descKey: string;
};

export type MessageFlowStep = {
  titleKey: string;
  descKey: string;
};

export type OrchestrationPrimitive = {
  nameKey: string;
  descKey: string;
};

export type IntegrationHighlight = {
  nameKey: string;
  descKey: string;
};

export type FaqEntry = {
  questionKey: string;
  answerKey: string;
};

export type UseCaseEntry = {
  nameKey: string;
  descKey: string;
};
