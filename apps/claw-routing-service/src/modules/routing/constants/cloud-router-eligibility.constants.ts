import { DeploymentActivationState, PrivacyClass, RouterProvider } from '../../../generated/prisma';

/**
 * Privacy classes the cloud router's candidate set may ever include.
 *
 * A LOCAL_ONLY or LOCAL_PREFERRED deployment must never be selectable by the
 * cloud path, independent of whatever routed the request here. `handleAuto`
 * already steers privacy-enforced domains away before the eligibility filter
 * runs, but the filter does not treat that as its only guard — it is a unit
 * worth trusting on its own.
 */
export const CLOUD_ROUTER_ELIGIBLE_PRIVACY_CLASSES: readonly PrivacyClass[] = [
  PrivacyClass.PUBLIC_OK,
  PrivacyClass.CLOUD_PERMITTED,
];

/**
 * States a deployment may be picked from. REQUIRES_VALIDATION is included on
 * purpose: only chain-named models were ever promoted to ACTIVE, so filtering
 * on ACTIVE alone left production with 4 of 354 models, 3 of them Gemini, and
 * AUTO answered with Gemini almost every time. A model an admin EXPOSED to
 * users is fit to answer; the fallback chain covers one that fails.
 */
export const CLOUD_ROUTER_SELECTABLE_STATES: readonly DeploymentActivationState[] = [
  DeploymentActivationState.ACTIVE,
  DeploymentActivationState.REQUIRES_VALIDATION,
];

/** Router-only providers: they decide routes and never answer the user. */
export const CLOUD_ROUTER_NON_ANSWERING_PROVIDERS: readonly RouterProvider[] = [
  RouterProvider.OLLAMA_CLOUD,
];

/**
 * How many models the router prompt lists. Every name costs router tokens and
 * a long list lowers pick quality; 30, balanced across providers, keeps every
 * connected provider in view.
 */
export const CLOUD_ROUTER_MAX_CANDIDATES = 30;

export const EXPOSED_MODELS_TTL_MS = 60_000;

export const EXPOSED_MODELS_TIMEOUT_MS = 3_000;

export const CONNECTOR_MODELS_SNAPSHOT_URL_PATH = '/api/v1/internal/connectors/models-snapshot';

export const MODEL_EXPOSURE_EXPOSED = 'EXPOSED';

export const MODEL_KIND_CHAT = 'CHAT';
