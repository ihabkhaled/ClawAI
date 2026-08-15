import { RouterErrorCode } from '../../../../common/enums';
import { RouterProvider } from '../../../../generated/prisma';
import type { RouterConfigurationSnapshot } from '../../types/router-chain-resolution.types';
import type {
  RouterInferenceProvider,
  RouterInferenceRequest,
  RouterInferenceResponse,
} from '../../types/router-inference.types';
import {
  LAB_DEFAULT_CONFIDENCE,
  LAB_DEFAULT_WORKFLOW,
  LAB_INJECTED_LATENCY_MS,
  LAB_LOW_CONFIDENCE_SAMPLE,
  LAB_MALFORMED_RAW,
} from '../constants/routing-lab-fault-injector.constants';
import type {
  RoutingLabFaultPlan,
  RoutingLabProviderStep,
} from '../types/routing-lab-fault-plan.types';
import type { RoutingLabProviderAdapters } from '../types/routing-lab-harness.types';

/**
 * Builds the `RouterInferenceResponse` one scripted step produces.
 *
 * `MALFORMED_STRUCTURED_OUTPUT` and `LOW_CONFIDENCE` are never returned by a
 * real adapter — they are what the coordinator's own validation turns an
 * `ok:true` answer into. Faking them any other way would test the injector's
 * fiction instead of the coordinator's real reclassification path.
 */
function buildResponseForStep(
  step: RoutingLabProviderStep,
  fallbackDeploymentId: string | null,
): RouterInferenceResponse {
  if (step.outcome === 'FAULT') {
    if (step.code === RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT) {
      return {
        ok: true,
        raw: LAB_MALFORMED_RAW,
        latencyMs: LAB_INJECTED_LATENCY_MS,
        inputTokens: null,
        outputTokens: null,
      };
    }
    if (step.code === RouterErrorCode.LOW_CONFIDENCE) {
      return {
        ok: true,
        raw: JSON.stringify({
          deploymentId: fallbackDeploymentId ?? '',
          workflow: LAB_DEFAULT_WORKFLOW,
          confidence: LAB_LOW_CONFIDENCE_SAMPLE,
          reasonCodes: ['LAB_INJECTED_LOW_CONFIDENCE'],
        }),
        latencyMs: LAB_INJECTED_LATENCY_MS,
        inputTokens: null,
        outputTokens: null,
      };
    }
    return {
      ok: false,
      code: step.code,
      safeMessage: `lab-injected ${step.code}`,
      latencyMs: LAB_INJECTED_LATENCY_MS,
    };
  }

  const deploymentId = step.deploymentId ?? fallbackDeploymentId;
  if (!deploymentId) {
    // No script entry and no resolvable chain default for this provider —
    // the lab has nothing truthful to answer with.
    return {
      ok: false,
      code: RouterErrorCode.UNKNOWN,
      safeMessage: 'lab: no default deployment available for this provider',
      latencyMs: LAB_INJECTED_LATENCY_MS,
    };
  }

  return {
    ok: true,
    raw: JSON.stringify({
      deploymentId,
      workflow: step.workflow ?? LAB_DEFAULT_WORKFLOW,
      confidence: step.confidence ?? LAB_DEFAULT_CONFIDENCE,
      reasonCodes: ['LAB_SCRIPTED_SUCCESS'],
    }),
    latencyMs: LAB_INJECTED_LATENCY_MS,
    inputTokens: 50,
    outputTokens: 20,
  };
}

/**
 * One provider's fault-injected adapter. Consumes `steps` in order and
 * repeats the last one once exhausted — the same convention
 * `router-inference-coordinator.manager.spec.ts`'s `fakeProvider` uses, so a
 * fault plan with fewer steps than the coordinator's retry budget still
 * behaves predictably instead of running out of script.
 */
function createRoutingLabProvider(
  provider: RouterProvider,
  steps: readonly RoutingLabProviderStep[] | undefined,
  fallbackDeploymentId: string | null,
): RouterInferenceProvider {
  const script: readonly RoutingLabProviderStep[] =
    steps && steps.length > 0 ? steps : [{ outcome: 'SUCCESS' }];
  let callIndex = 0;

  return {
    provider,
    invoke: (_request: RouterInferenceRequest): Promise<RouterInferenceResponse> => {
      const step = script[Math.min(callIndex, script.length - 1)] ?? { outcome: 'SUCCESS' };
      callIndex += 1;
      return Promise.resolve(buildResponseForStep(step, fallbackDeploymentId));
    },
  };
}

/** First resolved deploymentId the snapshot's chain assigns to this provider. */
function findDefaultDeploymentId(
  snapshot: RouterConfigurationSnapshot | null,
  provider: RouterProvider,
): string | null {
  if (!snapshot) {
    return null;
  }
  const match = snapshot.entries.find(
    (entry) => entry.provider === provider && entry.deploymentId !== null,
  );
  return match?.deploymentId ?? null;
}

/**
 * Builds the three fault-injected provider adapters `CloudRouterManager` is
 * wired to, one per `RouterProvider` it knows about. A provider absent from
 * `faultPlan` always succeeds with the chain's own default for it — most
 * corpus cases author only the fault they care about and get realistic
 * passthrough everywhere else for free.
 */
export function buildRoutingLabProviderAdapters(
  snapshot: RouterConfigurationSnapshot | null,
  faultPlan: RoutingLabFaultPlan,
): RoutingLabProviderAdapters {
  return {
    gemini: createRoutingLabProvider(
      RouterProvider.GEMINI,
      faultPlan[RouterProvider.GEMINI],
      findDefaultDeploymentId(snapshot, RouterProvider.GEMINI),
    ),
    ollamaCloud: createRoutingLabProvider(
      RouterProvider.OLLAMA_CLOUD,
      faultPlan[RouterProvider.OLLAMA_CLOUD],
      findDefaultDeploymentId(snapshot, RouterProvider.OLLAMA_CLOUD),
    ),
    legacyLocal: createRoutingLabProvider(
      RouterProvider.OLLAMA,
      faultPlan[RouterProvider.OLLAMA],
      findDefaultDeploymentId(snapshot, RouterProvider.OLLAMA),
    ),
  };
}
