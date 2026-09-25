import type { ConnectorAuthType } from '../enums/connector-auth-type.enum';
import type { ConnectorCreditHeadroomFormat } from '../enums/connector-credit-headroom-format.enum';
import type { ConnectorModelsResponseFormat } from '../enums/connector-models-response-format.enum';
import type { ConnectorPresetAuthHeader } from '../enums/connector-preset-auth-header.enum';
import type { ConnectorPresetCategory } from '../enums/connector-preset-category.enum';
import type { ConnectorPresetExtraField } from '../enums/connector-preset-extra-field.enum';
import type { ConnectorPresetGroup } from '../enums/connector-preset-group.enum';
import type { ConnectorProvider } from '../enums/connector-provider.enum';

/**
 * Where a provider reports how much credit its API key can still spend.
 *
 * Providers that pre-authorize `max_tokens × price` against the key (OpenRouter
 * refuses "can only afford N" with a 402) need this read BEFORE the call, so
 * chat-service can send a `max_tokens` the key can actually pay for.
 */
export type ConnectorPresetCreditHeadroom = {
  /** GET endpoints (paths or absolute URLs), read in parallel. */
  endpoints: readonly string[];
  format: ConnectorCreditHeadroomFormat;
};

/** The four quick links the admin form shows beside a picked preset. */
export type ConnectorPresetLinks = {
  register: string;
  apiKeys: string;
  pricing: string;
  docs: string;
};

/**
 * One provider an administrator can connect in a single step (ADR-117).
 *
 * The registry of these (`CONNECTOR_PRESETS` in `@claw/shared-utilities`) is
 * the ONLY place a preset's base URL, display name and links are written. The
 * admin form prefills from it, connector-service's generic adapter syncs and
 * health-checks from it, chat-service falls back to its base URL, and
 * routing-service admits its models by its key.
 */
export type ConnectorPreset = {
  key: ConnectorProvider;
  displayName: string;
  category: ConnectorPresetCategory;
  group: ConnectorPresetGroup;
  /** May contain `{ACCOUNT_ID}`, filled from the connector's account id. */
  defaultBaseUrl: string;
  /** Other regional endpoints the provider documents (e.g. mainland China). */
  alternateBaseUrls: readonly string[];
  /**
   * Where the model list lives: a path joined to the connector's base URL, or
   * an absolute URL. `null` means the provider has no usable list endpoint and
   * `staticModels` is the catalogue.
   */
  modelsEndpoint: string | null;
  modelsResponseFormat: ConnectorModelsResponseFormat;
  /** Model ids copied from the provider's docs. Used only when `modelsEndpoint` is null. */
  staticModels: readonly string[];
  /** The docs page `staticModels` was copied from. */
  staticModelsSource: string | null;
  /**
   * A GET that proves the key works (path or absolute URL). `null` means no
   * such endpoint exists and the health check sends a one-token chat
   * completion to `staticModels[0]` instead.
   */
  healthCheckEndpoint: string | null;
  authType: ConnectorAuthType;
  authHeader: ConnectorPresetAuthHeader;
  extraFields: readonly ConnectorPresetExtraField[];
  openAICompatible: boolean;
  /**
   * What `Connector.isPayAsYouGo` starts as. True means the provider bills
   * ClawAI per token, so a user's PAYG credit is debited; an administrator
   * who connects a free-tier key flips it off to open the provider to plans
   * without credit (ADR-082).
   */
  defaultIsPayAsYouGo: boolean;
  hasFreeTier: boolean;
  /** Whether chat-service may send native OpenAI `tools` to this provider. */
  supportsNativeTools: boolean;
  /**
   * Model ids known to accept images, for providers whose list reports no
   * modality. Narrow on purpose: a false positive sends images to a text model.
   */
  visionModelPattern: RegExp | null;
  /**
   * The key-credit endpoints, or `null` when the provider exposes none (or
   * does not pre-authorize output). `null` means chat-service sends no
   * affordability cap and relies on the reactive 402 retry instead.
   */
  creditHeadroom: ConnectorPresetCreditHeadroom | null;
  links: ConnectorPresetLinks;
};
