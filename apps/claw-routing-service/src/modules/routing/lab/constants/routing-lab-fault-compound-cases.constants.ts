import {
  RouterErrorCode,
  RoutingLabCaseCategory,
  RoutingLabConfigurationVariant,
  RoutingLabPromptLengthBucket,
} from '../../../../common/enums';
import { DomainTag, PrivacyClass, RouterProvider } from '../../../../generated/prisma';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';
import {
  LAB_ALL_CLOUD_DEPLOYMENT_IDS,
  LAB_DEP_GEMINI_FALLBACK,
  LAB_DEP_GEMINI_PRIMARY,
} from './routing-lab-corpus-dimensions.constants';

const DOMAIN = DomainTag.CODING;
const LENGTH_BUCKET = RoutingLabPromptLengthBucket.MEDIUM;
const PROMPT =
  'Refactor this TypeScript function so it no longer mutates its input, ' +
  'and route through whichever chain entry ends up trustworthy.';

/**
 * Multi-attempt behaviours a single injected code cannot demonstrate on its
 * own: retries resolving, the bounded repair, provider-wide skip, full
 * exhaustion, low-confidence escalation, a hard stop mid-chain, and the two
 * budget/attempt-ceiling and trigger-gating shapes. Each proves one sentence
 * of `router-inference-coordinator.manager.ts`'s own doc comment.
 */
export const ROUTING_LAB_FAULT_COMPOUND_CASES: readonly RoutingLabCase[] = [
  {
    id: 'case-fault-compound-01-retry-then-succeed',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description: 'Gemini times out once, then the retry (same entry budget) succeeds.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.TIMEOUT },
        { outcome: 'SUCCESS', deploymentId: LAB_DEP_GEMINI_PRIMARY },
      ],
    },
  },
  {
    id: 'case-fault-compound-02-repair-then-succeed',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description: 'Gemini answers malformed once; the single bounded repair succeeds.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT },
        { outcome: 'SUCCESS', deploymentId: LAB_DEP_GEMINI_PRIMARY },
      ],
    },
  },
  {
    id: 'case-fault-compound-03-repair-exhausted-falls-through',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Both Gemini entries stay malformed through their one repair each; Ollama Cloud answers.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT },
      ],
    },
  },
  {
    id: 'case-fault-compound-04-provider-wide-skip',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Gemini fails provider-wide after its retry; the model-fallback entry is skipped, not tried.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.PROVIDER_5XX }],
    },
  },
  {
    id: 'case-fault-compound-05-full-chain-exhaustion-transient',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description: 'Every provider fails 5xx; the whole chain exhausts with no quarantine.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.PROVIDER_5XX }],
      [RouterProvider.OLLAMA_CLOUD]: [{ outcome: 'FAULT', code: RouterErrorCode.PROVIDER_5XX }],
    },
  },
  {
    id: 'case-fault-compound-06-full-chain-exhaustion-quarantine',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Every entry answers MODEL_NOT_FOUND; every deployment is reported for quarantine.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.MODEL_NOT_FOUND }],
      [RouterProvider.OLLAMA_CLOUD]: [{ outcome: 'FAULT', code: RouterErrorCode.MODEL_NOT_FOUND }],
    },
  },
  {
    id: 'case-fault-compound-07-low-confidence-escalates',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Primary answers below the confidence floor; the model-fallback entry answers instead.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.LOW_CONFIDENCE },
        { outcome: 'SUCCESS', deploymentId: LAB_DEP_GEMINI_FALLBACK },
      ],
    },
  },
  {
    id: 'case-fault-compound-08-low-confidence-everywhere',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Every entry answers below the confidence floor; the walk declines LOW_CONFIDENCE.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.LOW_CONFIDENCE }],
      [RouterProvider.OLLAMA_CLOUD]: [{ outcome: 'FAULT', code: RouterErrorCode.LOW_CONFIDENCE }],
    },
  },
  {
    id: 'case-fault-compound-09-hard-stop-mid-chain-cancelled',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Entry 1 advances normally; entry 2 is CANCELLED, and Ollama Cloud is never called.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.MODEL_NOT_FOUND },
        { outcome: 'FAULT', code: RouterErrorCode.CANCELLED },
      ],
    },
  },
  {
    id: 'case-fault-compound-10-hard-stop-mid-chain-budget-exceeded',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Entry 1 advances normally; entry 2 hits BUDGET_EXCEEDED, and Ollama Cloud is never called.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.MODEL_NOT_FOUND },
        { outcome: 'FAULT', code: RouterErrorCode.BUDGET_EXCEEDED },
      ],
    },
  },
  {
    id: 'case-fault-compound-11-hard-stop-mid-chain-policy-blocked',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Entry 1 advances normally; entry 2 is POLICY_BLOCKED, and Ollama Cloud is never called.',
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.MODEL_NOT_FOUND },
        { outcome: 'FAULT', code: RouterErrorCode.POLICY_BLOCKED },
      ],
    },
  },
  {
    id: 'case-fault-compound-12-deadline-exceeded-zero-attempts',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description: "The request's total deadline is already spent; not one provider is called.",
    configurationVariant: RoutingLabConfigurationVariant.SHORT_DEADLINE,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {},
  },
  {
    id: 'case-fault-compound-13-attempt-ceiling-exceeded',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description: 'maxAttempts is 1; the walk stops after entry 1 and never reaches entry 2.',
    configurationVariant: RoutingLabConfigurationVariant.LOW_MAX_ATTEMPTS,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.MODEL_NOT_FOUND }],
    },
  },
  {
    id: 'case-fault-compound-14-trigger-gated-entry-reached',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Entry 1 answers malformed; the entry gated on MALFORMED_STRUCTURED_OUTPUT is reached and answers.',
    configurationVariant: RoutingLabConfigurationVariant.TRIGGER_GATED_FALLBACK,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT },
      ],
    },
  },
  {
    id: 'case-fault-compound-15-trigger-gated-entry-skipped',
    category: RoutingLabCaseCategory.FAULT_COMPOUND,
    description:
      'Entry 1 fails with a code the gated entry does not trigger on; the chain declines with nothing else to try.',
    configurationVariant: RoutingLabConfigurationVariant.TRIGGER_GATED_FALLBACK,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: DOMAIN,
    lengthBucket: LENGTH_BUCKET,
    prompt: PROMPT,
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.MODEL_NOT_FOUND }],
    },
  },
];
