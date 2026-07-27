import type {
  MarketingUseCase,
  MarketingUseCaseValuePoint,
  MarketingUseCasesPageFallback,
} from '@/types/marketing-use-cases.types';

// The ten jobs the /use-cases page walks through. Each entry names the
// problem, how ClawAI handles it, and the capability it leans on — the copy
// itself lives under `marketing.useCasesPage.cases.*` in the locale files so
// this array holds keys only.
//
// Order matters: the two use cases that drive the most sign-ups (software
// development, research) lead, and the two narrowest (document export, image
// generation) close.
export const MARKETING_USE_CASES: ReadonlyArray<MarketingUseCase> = [
  {
    id: 'software-development',
    titleKey: 'marketing.useCasesPage.cases.softwareTitle',
    problemKey: 'marketing.useCasesPage.cases.softwareProblem',
    solutionKey: 'marketing.useCasesPage.cases.softwareSolution',
    capabilityKey: 'marketing.useCasesPage.cases.softwareCapability',
  },
  {
    id: 'research-and-analysis',
    titleKey: 'marketing.useCasesPage.cases.researchTitle',
    problemKey: 'marketing.useCasesPage.cases.researchProblem',
    solutionKey: 'marketing.useCasesPage.cases.researchSolution',
    capabilityKey: 'marketing.useCasesPage.cases.researchCapability',
  },
  {
    id: 'writing-and-editing',
    titleKey: 'marketing.useCasesPage.cases.writingTitle',
    problemKey: 'marketing.useCasesPage.cases.writingProblem',
    solutionKey: 'marketing.useCasesPage.cases.writingSolution',
    capabilityKey: 'marketing.useCasesPage.cases.writingCapability',
  },
  {
    id: 'data-analysis',
    titleKey: 'marketing.useCasesPage.cases.dataTitle',
    problemKey: 'marketing.useCasesPage.cases.dataProblem',
    solutionKey: 'marketing.useCasesPage.cases.dataSolution',
    capabilityKey: 'marketing.useCasesPage.cases.dataCapability',
  },
  {
    id: 'customer-support',
    titleKey: 'marketing.useCasesPage.cases.supportTitle',
    problemKey: 'marketing.useCasesPage.cases.supportProblem',
    solutionKey: 'marketing.useCasesPage.cases.supportSolution',
    capabilityKey: 'marketing.useCasesPage.cases.supportCapability',
  },
  {
    id: 'product-and-strategy',
    titleKey: 'marketing.useCasesPage.cases.productTitle',
    problemKey: 'marketing.useCasesPage.cases.productProblem',
    solutionKey: 'marketing.useCasesPage.cases.productSolution',
    capabilityKey: 'marketing.useCasesPage.cases.productCapability',
  },
  {
    id: 'learning-and-study',
    titleKey: 'marketing.useCasesPage.cases.learningTitle',
    problemKey: 'marketing.useCasesPage.cases.learningProblem',
    solutionKey: 'marketing.useCasesPage.cases.learningSolution',
    capabilityKey: 'marketing.useCasesPage.cases.learningCapability',
  },
  {
    id: 'translation-and-localisation',
    titleKey: 'marketing.useCasesPage.cases.translationTitle',
    problemKey: 'marketing.useCasesPage.cases.translationProblem',
    solutionKey: 'marketing.useCasesPage.cases.translationSolution',
    capabilityKey: 'marketing.useCasesPage.cases.translationCapability',
  },
  {
    id: 'document-generation',
    titleKey: 'marketing.useCasesPage.cases.documentsTitle',
    problemKey: 'marketing.useCasesPage.cases.documentsProblem',
    solutionKey: 'marketing.useCasesPage.cases.documentsSolution',
    capabilityKey: 'marketing.useCasesPage.cases.documentsCapability',
  },
  {
    id: 'image-generation',
    titleKey: 'marketing.useCasesPage.cases.imagesTitle',
    problemKey: 'marketing.useCasesPage.cases.imagesProblem',
    solutionKey: 'marketing.useCasesPage.cases.imagesSolution',
    capabilityKey: 'marketing.useCasesPage.cases.imagesCapability',
  },
];

// The argument for one subscription across many models rather than several
// separate vendor plans.
export const MARKETING_USE_CASE_VALUE_POINTS: ReadonlyArray<MarketingUseCaseValuePoint> = [
  {
    titleKey: 'marketing.useCasesPage.oneSubscription.pointRightModelTitle',
    descKey: 'marketing.useCasesPage.oneSubscription.pointRightModelDesc',
  },
  {
    titleKey: 'marketing.useCasesPage.oneSubscription.pointOneAllowanceTitle',
    descKey: 'marketing.useCasesPage.oneSubscription.pointOneAllowanceDesc',
  },
  {
    titleKey: 'marketing.useCasesPage.oneSubscription.pointNoLockInTitle',
    descKey: 'marketing.useCasesPage.oneSubscription.pointNoLockInDesc',
  },
  {
    titleKey: 'marketing.useCasesPage.oneSubscription.pointVisibleSpendTitle',
    descKey: 'marketing.useCasesPage.oneSubscription.pointVisibleSpendDesc',
  },
];

// Pricing is a section of the home page, not a route of its own yet.
export const MARKETING_USE_CASES_PRICING_PATH = '/pricing';

// On-premise deployment is an enterprise conversation, never a self-serve
// link — the page only points at the contact form.
export const MARKETING_USE_CASES_CONTACT_PATH = '/contact';

// The content-registry entry for the `use-cases` slug is still PLANNED, so
// its title/description are empty strings. These English defaults keep the
// document title and meta description meaningful until that entry is flipped
// to PUBLISHED, at which point the registry values win automatically.
export const MARKETING_USE_CASES_PAGE_FALLBACK: MarketingUseCasesPageFallback = {
  title: 'ClawAI Use Cases — One Subscription, Every Frontier Model',
  description:
    'Ten jobs people bring to ClawAI every day — coding, research, writing, data analysis, support, strategy, study, translation, documents and images — each routed to the model that handles it best, on one subscription.',
  canonicalPath: '/use-cases',
};
