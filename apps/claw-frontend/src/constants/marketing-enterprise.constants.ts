import type {
  EnterpriseAudienceEntry,
  EnterpriseComparisonColumn,
  EnterpriseDeploymentBenefit,
  EnterpriseEngagementItem,
  EnterpriseHybridGuardrail,
  EnterpriseLocalModelFamily,
  EnterpriseStartStep,
} from '@/types/marketing-enterprise.types';

// Where every call to action on this page goes. The private-deployment
// offering is scoped per engagement — there is deliberately no pricing table
// and no sign-up route for it.
export const ENTERPRISE_CONTACT_PATH = '/contact';

// Anchor target for the hero's secondary link.
export const ENTERPRISE_DEPLOYMENT_SECTION_ID = 'private-deployment';

// SEO fallbacks. The content registry is the source of truth for this page's
// title/description; generateMetadata only falls back to these when the
// registry entry is still PLANNED and therefore carries empty copy.
export const ENTERPRISE_PAGE_TITLE =
  'ClawAI on Your Infrastructure — Private Deployment for Organisations';
export const ENTERPRISE_PAGE_DESCRIPTION =
  'For organisations that cannot send data to a third-party AI provider: a private deployment of ClawAI inside your own network, running open-weight models on your own GPUs. Scoped and deployed with our team — contact us.';

export const ENTERPRISE_AUDIENCE_ENTRIES: ReadonlyArray<EnterpriseAudienceEntry> = [
  {
    nameKey: 'marketing.enterprise.audience.governmentName',
    descKey: 'marketing.enterprise.audience.governmentDesc',
  },
  {
    nameKey: 'marketing.enterprise.audience.healthcareName',
    descKey: 'marketing.enterprise.audience.healthcareDesc',
  },
  {
    nameKey: 'marketing.enterprise.audience.financeName',
    descKey: 'marketing.enterprise.audience.financeDesc',
  },
  {
    nameKey: 'marketing.enterprise.audience.legalName',
    descKey: 'marketing.enterprise.audience.legalDesc',
  },
  {
    nameKey: 'marketing.enterprise.audience.defenceName',
    descKey: 'marketing.enterprise.audience.defenceDesc',
  },
  {
    nameKey: 'marketing.enterprise.audience.residencyName',
    descKey: 'marketing.enterprise.audience.residencyDesc',
  },
];

export const ENTERPRISE_DEPLOYMENT_BENEFITS: ReadonlyArray<EnterpriseDeploymentBenefit> = [
  {
    nameKey: 'marketing.enterprise.deployment.platformName',
    descKey: 'marketing.enterprise.deployment.platformDesc',
  },
  {
    nameKey: 'marketing.enterprise.deployment.modelsName',
    descKey: 'marketing.enterprise.deployment.modelsDesc',
  },
  {
    nameKey: 'marketing.enterprise.deployment.identityName',
    descKey: 'marketing.enterprise.deployment.identityDesc',
  },
  {
    nameKey: 'marketing.enterprise.deployment.policiesName',
    descKey: 'marketing.enterprise.deployment.policiesDesc',
  },
  {
    nameKey: 'marketing.enterprise.deployment.auditName',
    descKey: 'marketing.enterprise.deployment.auditDesc',
  },
  {
    nameKey: 'marketing.enterprise.deployment.tenancyName',
    descKey: 'marketing.enterprise.deployment.tenancyDesc',
  },
];

// Open-weight families ClawAI can serve on customer hardware. Family names are
// BRAND NAMES and stay identical in every locale — only descKey is translated.
// The exact models inside a family are chosen during scoping, because they are
// bounded by the GPU memory and throughput the customer actually has.
export const ENTERPRISE_LOCAL_MODEL_FAMILIES: ReadonlyArray<EnterpriseLocalModelFamily> = [
  { name: 'Qwen', descKey: 'marketing.enterprise.models.qwenDesc' },
  { name: 'GLM', descKey: 'marketing.enterprise.models.glmDesc' },
  { name: 'DeepSeek', descKey: 'marketing.enterprise.models.deepseekDesc' },
  { name: 'Llama', descKey: 'marketing.enterprise.models.llamaDesc' },
  { name: 'Mistral', descKey: 'marketing.enterprise.models.mistralDesc' },
  { name: 'Gemma', descKey: 'marketing.enterprise.models.gemmaDesc' },
  { name: 'Phi', descKey: 'marketing.enterprise.models.phiDesc' },
];

export const ENTERPRISE_HYBRID_GUARDRAILS: ReadonlyArray<EnterpriseHybridGuardrail> = [
  {
    titleKey: 'marketing.enterprise.hybrid.allowListTitle',
    descKey: 'marketing.enterprise.hybrid.allowListDesc',
  },
  {
    titleKey: 'marketing.enterprise.hybrid.policyTitle',
    descKey: 'marketing.enterprise.hybrid.policyDesc',
  },
  {
    titleKey: 'marketing.enterprise.hybrid.localDefaultTitle',
    descKey: 'marketing.enterprise.hybrid.localDefaultDesc',
  },
  {
    titleKey: 'marketing.enterprise.hybrid.visibilityTitle',
    descKey: 'marketing.enterprise.hybrid.visibilityDesc',
  },
];

export const ENTERPRISE_COMPARISON_COLUMNS: ReadonlyArray<EnterpriseComparisonColumn> = [
  {
    badgeKey: 'marketing.enterprise.compare.hostedBadge',
    titleKey: 'marketing.enterprise.compare.hostedTitle',
    subtitleKey: 'marketing.enterprise.compare.hostedSubtitle',
    pointKeys: [
      'marketing.enterprise.compare.hostedPoint1',
      'marketing.enterprise.compare.hostedPoint2',
      'marketing.enterprise.compare.hostedPoint3',
      'marketing.enterprise.compare.hostedPoint4',
      'marketing.enterprise.compare.hostedPoint5',
    ],
    isFeatured: false,
  },
  {
    badgeKey: 'marketing.enterprise.compare.privateBadge',
    titleKey: 'marketing.enterprise.compare.privateTitle',
    subtitleKey: 'marketing.enterprise.compare.privateSubtitle',
    pointKeys: [
      'marketing.enterprise.compare.privatePoint1',
      'marketing.enterprise.compare.privatePoint2',
      'marketing.enterprise.compare.privatePoint3',
      'marketing.enterprise.compare.privatePoint4',
      'marketing.enterprise.compare.privatePoint5',
    ],
    isFeatured: true,
  },
];

export const ENTERPRISE_ENGAGEMENT_ITEMS: ReadonlyArray<EnterpriseEngagementItem> = [
  {
    nameKey: 'marketing.enterprise.engagement.deployName',
    descKey: 'marketing.enterprise.engagement.deployDesc',
  },
  {
    nameKey: 'marketing.enterprise.engagement.integrateName',
    descKey: 'marketing.enterprise.engagement.integrateDesc',
  },
  {
    nameKey: 'marketing.enterprise.engagement.modelsName',
    descKey: 'marketing.enterprise.engagement.modelsDesc',
  },
  {
    nameKey: 'marketing.enterprise.engagement.policiesName',
    descKey: 'marketing.enterprise.engagement.policiesDesc',
  },
  {
    nameKey: 'marketing.enterprise.engagement.handoverName',
    descKey: 'marketing.enterprise.engagement.handoverDesc',
  },
  {
    nameKey: 'marketing.enterprise.engagement.supportName',
    descKey: 'marketing.enterprise.engagement.supportDesc',
  },
];

export const ENTERPRISE_START_STEPS: ReadonlyArray<EnterpriseStartStep> = [
  {
    titleKey: 'marketing.enterprise.start.step1Title',
    descKey: 'marketing.enterprise.start.step1Desc',
  },
  {
    titleKey: 'marketing.enterprise.start.step2Title',
    descKey: 'marketing.enterprise.start.step2Desc',
  },
  {
    titleKey: 'marketing.enterprise.start.step3Title',
    descKey: 'marketing.enterprise.start.step3Desc',
  },
];
