import type { MarketingFaqCategory } from '@/types/marketing-faq.types';

// Destination for the "still have a question" CTA and for the
// organisation/private-deployment answer. Kept here rather than inline in the
// TSX so the section components stay pure render composition.
export const MARKETING_FAQ_CONTACT_PATH = '/contact';

// The FAQ page content tree. Each entry references i18n keys only; the English
// source and all translations live under `marketing.faqPage` in the locale
// files. Ordering here is the ordering rendered on the page and in the
// jump-links strip, so the categories run from "what is this" to
// "we are a company and need something bespoke".
export const MARKETING_FAQ_CATEGORIES: ReadonlyArray<MarketingFaqCategory> = [
  {
    id: 'getting-started',
    titleKey: 'marketing.faqPage.gettingStarted.title',
    descriptionKey: 'marketing.faqPage.gettingStarted.description',
    questions: [
      {
        id: 'what-is-clawai',
        questionKey: 'marketing.faqPage.gettingStarted.whatIsQ',
        answerKey: 'marketing.faqPage.gettingStarted.whatIsA',
      },
      {
        id: 'api-keys',
        questionKey: 'marketing.faqPage.gettingStarted.apiKeysQ',
        answerKey: 'marketing.faqPage.gettingStarted.apiKeysA',
      },
      {
        id: 'how-to-start',
        questionKey: 'marketing.faqPage.gettingStarted.howToStartQ',
        answerKey: 'marketing.faqPage.gettingStarted.howToStartA',
      },
      {
        id: 'free-tier',
        questionKey: 'marketing.faqPage.gettingStarted.freeTierQ',
        answerKey: 'marketing.faqPage.gettingStarted.freeTierA',
      },
    ],
  },
  {
    id: 'plans-and-billing',
    titleKey: 'marketing.faqPage.plansBilling.title',
    descriptionKey: 'marketing.faqPage.plansBilling.description',
    questions: [
      {
        id: 'available-plans',
        questionKey: 'marketing.faqPage.plansBilling.plansQ',
        answerKey: 'marketing.faqPage.plansBilling.plansA',
      },
      {
        id: 'payment-methods',
        questionKey: 'marketing.faqPage.plansBilling.paymentQ',
        answerKey: 'marketing.faqPage.plansBilling.paymentA',
      },
      {
        id: 'change-plan',
        questionKey: 'marketing.faqPage.plansBilling.changePlanQ',
        answerKey: 'marketing.faqPage.plansBilling.changePlanA',
      },
      {
        id: 'cancel',
        questionKey: 'marketing.faqPage.plansBilling.cancelQ',
        answerKey: 'marketing.faqPage.plansBilling.cancelA',
      },
      {
        id: 'failed-payment',
        questionKey: 'marketing.faqPage.plansBilling.failedPaymentQ',
        answerKey: 'marketing.faqPage.plansBilling.failedPaymentA',
      },
      {
        id: 'card-storage',
        questionKey: 'marketing.faqPage.plansBilling.cardStorageQ',
        answerKey: 'marketing.faqPage.plansBilling.cardStorageA',
      },
    ],
  },
  {
    id: 'models-and-routing',
    titleKey: 'marketing.faqPage.modelsRouting.title',
    descriptionKey: 'marketing.faqPage.modelsRouting.description',
    questions: [
      {
        id: 'available-models',
        questionKey: 'marketing.faqPage.modelsRouting.availableModelsQ',
        answerKey: 'marketing.faqPage.modelsRouting.availableModelsA',
      },
      {
        id: 'auto-routing',
        questionKey: 'marketing.faqPage.modelsRouting.autoRoutingQ',
        answerKey: 'marketing.faqPage.modelsRouting.autoRoutingA',
      },
      {
        id: 'pick-model',
        questionKey: 'marketing.faqPage.modelsRouting.pickModelQ',
        answerKey: 'marketing.faqPage.modelsRouting.pickModelA',
      },
      {
        id: 'compare-consensus-judge',
        questionKey: 'marketing.faqPage.modelsRouting.compareJudgeQ',
        answerKey: 'marketing.faqPage.modelsRouting.compareJudgeA',
      },
      {
        id: 'allowance-burn',
        questionKey: 'marketing.faqPage.modelsRouting.allowanceBurnQ',
        answerKey: 'marketing.faqPage.modelsRouting.allowanceBurnA',
      },
    ],
  },
  {
    id: 'usage-limits',
    titleKey: 'marketing.faqPage.usageLimits.title',
    descriptionKey: 'marketing.faqPage.usageLimits.description',
    questions: [
      {
        id: 'how-limits-measured',
        questionKey: 'marketing.faqPage.usageLimits.measurementQ',
        answerKey: 'marketing.faqPage.usageLimits.measurementA',
      },
      {
        id: 'limit-reached',
        questionKey: 'marketing.faqPage.usageLimits.limitReachedQ',
        answerKey: 'marketing.faqPage.usageLimits.limitReachedA',
      },
    ],
  },
  {
    id: 'data-and-privacy',
    titleKey: 'marketing.faqPage.dataPrivacy.title',
    descriptionKey: 'marketing.faqPage.dataPrivacy.description',
    questions: [
      {
        id: 'who-can-see',
        questionKey: 'marketing.faqPage.dataPrivacy.whoCanSeeQ',
        answerKey: 'marketing.faqPage.dataPrivacy.whoCanSeeA',
      },
      {
        id: 'model-training',
        questionKey: 'marketing.faqPage.dataPrivacy.trainingQ',
        answerKey: 'marketing.faqPage.dataPrivacy.trainingA',
      },
      {
        id: 'delete-data',
        questionKey: 'marketing.faqPage.dataPrivacy.deletionQ',
        answerKey: 'marketing.faqPage.dataPrivacy.deletionA',
      },
      {
        id: 'certifications',
        questionKey: 'marketing.faqPage.dataPrivacy.certificationsQ',
        answerKey: 'marketing.faqPage.dataPrivacy.certificationsA',
      },
    ],
  },
  {
    id: 'for-organisations',
    titleKey: 'marketing.faqPage.organisations.title',
    descriptionKey: 'marketing.faqPage.organisations.description',
    questions: [
      {
        id: 'private-deployment',
        questionKey: 'marketing.faqPage.organisations.privateDeploymentQ',
        answerKey: 'marketing.faqPage.organisations.privateDeploymentA',
      },
      {
        id: 'team-accounts',
        questionKey: 'marketing.faqPage.organisations.teamAccountsQ',
        answerKey: 'marketing.faqPage.organisations.teamAccountsA',
      },
    ],
  },
];
