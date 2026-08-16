import {
  RouterErrorCode,
  RoutingLabCaseCategory,
  RoutingLabConfigurationVariant,
} from '../../../../common/enums';
import { PrivacyClass, RouterProvider } from '../../../../generated/prisma';
import { LAB_ALL_CLOUD_DEPLOYMENT_IDS } from '../constants/routing-lab-corpus-dimensions.constants';
import {
  FAULT_SINGLE_DOMAIN,
  FAULT_SINGLE_LENGTH_BUCKET,
} from '../constants/routing-lab-fault-single-cases.constants';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';
import { buildRoutingLabPrompt } from './routing-lab-prompt.utility';

/**
 * One case per `RouterErrorCode` value, injected once on the primary
 * (Gemini) entry. Generated from the enum itself rather than hand-listed, so
 * a 16th code added to the taxonomy produces a 16th case automatically
 * instead of silently going untested.
 */
export function buildRoutingLabFaultSingleCases(): readonly RoutingLabCase[] {
  return Object.values(RouterErrorCode).map((code, index) => ({
    id: `case-fault-single-${String(index + 1).padStart(3, '0')}-${code.toLowerCase()}`,
    category: RoutingLabCaseCategory.FAULT_SINGLE,
    description: `Gemini's primary entry returns ${code} once; records how the chain classifies and routes around it.`,
    configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    domain: FAULT_SINGLE_DOMAIN,
    lengthBucket: FAULT_SINGLE_LENGTH_BUCKET,
    prompt: buildRoutingLabPrompt(FAULT_SINGLE_DOMAIN, FAULT_SINGLE_LENGTH_BUCKET),
    eligibleDeploymentIds: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
    faultPlan: { [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code }] },
  }));
}
