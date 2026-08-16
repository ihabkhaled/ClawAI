import {
  RoutingLabCaseCategory,
  RoutingLabConfigurationVariant,
  RoutingLabPromptLengthBucket,
} from '../../../../common/enums';
import { DomainTag, PrivacyClass } from '../../../../generated/prisma';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';
import {
  LAB_ALL_CLOUD_DEPLOYMENT_IDS,
  LAB_DEP_GEMINI_PRIMARY,
} from './routing-lab-corpus-dimensions.constants';

const DOMAIN = DomainTag.GENERAL;
const PRIVACY_CLASS = PrivacyClass.CLOUD_PERMITTED;
const LENGTH_BUCKET = RoutingLabPromptLengthBucket.MEDIUM;
const CONTROL_PROMPT = 'Summarize the current state of this workspace for a new teammate.';

/**
 * Structural and configuration edges the combinatorial baseline cannot
 * reach: prompt content shapes and `eligibleDeploymentIds` shapes real
 * traffic occasionally sends, plus the three config-level decline paths
 * `CloudRouterManager.decide()` returns before any provider is called.
 */
export const ROUTING_LAB_EDGE_CASES: readonly RoutingLabCase[] = [
  {
    id: 'case-edge-01-empty-eligible-set',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'Policy filtering left nothing eligible; declines NO_ELIGIBLE_EXECUTION_MODEL.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: [],
    faultPlan: {},
  },
  {
    id: 'case-edge-02-no-published-configuration',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'No PUBLISHED revision exists; declines NO_PUBLISHED_CONFIGURATION.',
    configurationVariant: RoutingLabConfigurationVariant.NO_PUBLISHED_CONFIGURATION,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-03-configuration-disabled',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'Published but enabled:false; declines CONFIGURATION_DISABLED.',
    configurationVariant: RoutingLabConfigurationVariant.CONFIGURATION_DISABLED,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-04-all-chain-entries-unresolved',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'Every entry is an unresolved alias; declines NO_RUNNABLE_CHAIN_ENTRY.',
    configurationVariant: RoutingLabConfigurationVariant.ALL_ENTRIES_UNRESOLVED,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-05-single-character-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'A one-character prompt still reaches a provider and routes normally.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: '?',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-06-empty-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description:
      'An empty prompt string still reaches the coordinator rather than being rejected upstream.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: '',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-07-whitespace-only-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'A whitespace-only prompt is content the router still has to handle.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: '   \n\t  \n  ',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-08-very-long-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'A prompt well past the LONG bucket, close to typical router input-token budgets.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: RoutingLabPromptLengthBucket.LONG,
    prompt: 'Analyze this incident report in full. '.repeat(400),
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-09-unicode-rtl-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'Right-to-left Arabic text mixed with an English code fragment.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DomainTag.TRANSLATION,
    lengthBucket: LENGTH_BUCKET,
    prompt: 'يرجى ترجمة هذه الدالة البرمجية: function add(a, b) { return a + b; } إلى العربية.',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-10-mixed-language-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'English, Japanese and emoji in the same request.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DomainTag.TRANSLATION,
    lengthBucket: LENGTH_BUCKET,
    prompt:
      'Please translate this into natural Japanese: "Deploys are green today 🚀" — 日本語でお願いします。',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-11-single-eligible-deployment',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'Exactly one deployment survived policy filtering.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: [LAB_DEP_GEMINI_PRIMARY],
    faultPlan: {},
  },
  {
    id: 'case-edge-12-duplicate-eligible-deployment-ids',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description:
      "The eligible list carries the same id twice — upstream dedup is not this layer's job.",
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: [
      LAB_DEP_GEMINI_PRIMARY,
      LAB_DEP_GEMINI_PRIMARY,
      ...LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    ],
    faultPlan: {},
  },
  {
    id: 'case-edge-13-many-eligible-deployments',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'A large eligible set (policy filtering barely narrowed a big fleet).',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: [
      ...LAB_ALL_CLOUD_DEPLOYMENT_IDS,
      ...Array.from({ length: 50 }, (_, index) => `lab_dep_synthetic_${String(index)}`),
    ],
    faultPlan: {},
  },
  {
    id: 'case-edge-14-code-block-heavy-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'A prompt whose body is mostly fenced code blocks and diff-style markers.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DomainTag.CODING,
    lengthBucket: LENGTH_BUCKET,
    prompt:
      'Review this diff:\n```diff\n- return a + b\n+ return Number(a) + Number(b)\n```\n' +
      'and this function:\n```ts\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-15-markdown-table-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description:
      'A prompt containing a markdown table the router must not mistake for structure of its own.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DomainTag.BUSINESS,
    lengthBucket: LENGTH_BUCKET,
    prompt:
      'Summarize this table:\n| Quarter | Revenue | Churn |\n|---|---|---|\n| Q1 | 1.2M | 4% |\n| Q2 | 1.4M | 3% |',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-16-embedded-json-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description:
      'A prompt embedding raw JSON, which a naive parser downstream could confuse for the schema.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DomainTag.CODING,
    lengthBucket: LENGTH_BUCKET,
    prompt:
      'Validate this payload against our schema: {"deploymentId":"x","workflow":"DIRECT","confidence":1.5}',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-17-control-characters-prompt',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description: 'Embedded tabs, carriage returns and repeated blank lines.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PRIVACY_CLASS,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: 'Step 1:\tgather logs\r\nStep 2:\tgather metrics\n\n\n\nStep 3:\tcorrelate.',
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-edge-18-local-only-privacy-with-cloud-only-chain',
    category: RoutingLabCaseCategory.EDGE_CASE,
    description:
      'LOCAL_ONLY privacy against a cloud-only chain names the honest decline explicitly, ' +
      'rather than leaving it as one row among the baseline combinatorial cases.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.LOCAL_ONLY,
    domain: DomainTag.MEDICAL,
    lengthBucket: LENGTH_BUCKET,
    prompt: CONTROL_PROMPT,
    eligibleDeploymentIds: [],
    faultPlan: {},
  },
];
