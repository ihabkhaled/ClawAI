import type {
  FaqEntry,
  IntegrationHighlight,
  MessageFlowStep,
  OrchestrationPrimitive,
  RoutingModeDescriptor,
  UseCaseEntry,
} from '@/types/home-content.types';

// Each array holds i18n key references; the section components resolve them
// with t(). The English source + all translations live under the
// marketing.home namespace in the locale files.
export const ROUTING_MODES: ReadonlyArray<RoutingModeDescriptor> = [
  {
    nameKey: 'marketing.home.routing.modeAutoName',
    descKey: 'marketing.home.routing.modeAutoDesc',
  },
  {
    nameKey: 'marketing.home.routing.modeManualName',
    descKey: 'marketing.home.routing.modeManualDesc',
  },
  {
    nameKey: 'marketing.home.routing.modeLocalName',
    descKey: 'marketing.home.routing.modeLocalDesc',
  },
  {
    nameKey: 'marketing.home.routing.modePrivacyName',
    descKey: 'marketing.home.routing.modePrivacyDesc',
  },
  {
    nameKey: 'marketing.home.routing.modeBiasName',
    descKey: 'marketing.home.routing.modeBiasDesc',
  },
];

export const MESSAGE_FLOW_STEPS: ReadonlyArray<MessageFlowStep> = [
  {
    titleKey: 'marketing.home.howItWorks.step1Title',
    descKey: 'marketing.home.howItWorks.step1Desc',
  },
  {
    titleKey: 'marketing.home.howItWorks.step2Title',
    descKey: 'marketing.home.howItWorks.step2Desc',
  },
  {
    titleKey: 'marketing.home.howItWorks.step3Title',
    descKey: 'marketing.home.howItWorks.step3Desc',
  },
  {
    titleKey: 'marketing.home.howItWorks.step4Title',
    descKey: 'marketing.home.howItWorks.step4Desc',
  },
  {
    titleKey: 'marketing.home.howItWorks.step5Title',
    descKey: 'marketing.home.howItWorks.step5Desc',
  },
];

export const ORCHESTRATION_PRIMITIVES: ReadonlyArray<OrchestrationPrimitive> = [
  {
    nameKey: 'marketing.home.features.compareName',
    descKey: 'marketing.home.features.compareDesc',
  },
  {
    nameKey: 'marketing.home.features.consensusName',
    descKey: 'marketing.home.features.consensusDesc',
  },
  {
    nameKey: 'marketing.home.features.escalationName',
    descKey: 'marketing.home.features.escalationDesc',
  },
  {
    nameKey: 'marketing.home.features.bestOfNName',
    descKey: 'marketing.home.features.bestOfNDesc',
  },
  { nameKey: 'marketing.home.features.repairName', descKey: 'marketing.home.features.repairDesc' },
  { nameKey: 'marketing.home.features.verifyName', descKey: 'marketing.home.features.verifyDesc' },
  {
    nameKey: 'marketing.home.features.rolePackName',
    descKey: 'marketing.home.features.rolePackDesc',
  },
  {
    nameKey: 'marketing.home.features.pipelineName',
    descKey: 'marketing.home.features.pipelineDesc',
  },
  { nameKey: 'marketing.home.features.judgeName', descKey: 'marketing.home.features.judgeDesc' },
];

export const INTEGRATION_HIGHLIGHTS: ReadonlyArray<IntegrationHighlight> = [
  {
    nameKey: 'marketing.home.integrations.workspaceName',
    descKey: 'marketing.home.integrations.workspaceDesc',
  },
  {
    nameKey: 'marketing.home.integrations.agentName',
    descKey: 'marketing.home.integrations.agentDesc',
  },
  {
    nameKey: 'marketing.home.integrations.approvalName',
    descKey: 'marketing.home.integrations.approvalDesc',
  },
  {
    nameKey: 'marketing.home.integrations.imageName',
    descKey: 'marketing.home.integrations.imageDesc',
  },
  {
    nameKey: 'marketing.home.integrations.fileGenName',
    descKey: 'marketing.home.integrations.fileGenDesc',
  },
];

export const FAQ_ENTRIES: ReadonlyArray<FaqEntry> = [
  { questionKey: 'marketing.home.faq.q1', answerKey: 'marketing.home.faq.a1' },
  { questionKey: 'marketing.home.faq.q2', answerKey: 'marketing.home.faq.a2' },
  { questionKey: 'marketing.home.faq.q3', answerKey: 'marketing.home.faq.a3' },
  { questionKey: 'marketing.home.faq.q4', answerKey: 'marketing.home.faq.a4' },
];

export const USE_CASE_ENTRIES: ReadonlyArray<UseCaseEntry> = [
  {
    nameKey: 'marketing.home.useCases.privacyName',
    descKey: 'marketing.home.useCases.privacyDesc',
  },
  { nameKey: 'marketing.home.useCases.devName', descKey: 'marketing.home.useCases.devDesc' },
  {
    nameKey: 'marketing.home.useCases.selfHostName',
    descKey: 'marketing.home.useCases.selfHostDesc',
  },
  { nameKey: 'marketing.home.useCases.teamName', descKey: 'marketing.home.useCases.teamDesc' },
];
