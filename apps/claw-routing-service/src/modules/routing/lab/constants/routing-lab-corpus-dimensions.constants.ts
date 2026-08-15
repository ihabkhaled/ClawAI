import { RoutingLabPromptLengthBucket } from '../../../../common/enums';
import { DomainTag, PrivacyClass } from '../../../../generated/prisma';

/**
 * Every combinatorial and edge-case fixture shares these deployment ids so a
 * scripted `SUCCESS` step, an `eligibleDeploymentIds` list and the fixture
 * chain itself always agree on what a decision may name.
 */
export const LAB_DEP_GEMINI_PRIMARY = 'lab_dep_gemini_primary';
export const LAB_DEP_GEMINI_FALLBACK = 'lab_dep_gemini_fallback';
export const LAB_DEP_OLLAMA_CLOUD_GLM = 'lab_dep_ollama_cloud_glm';
export const LAB_DEP_OLLAMA_CLOUD_MINIMAX = 'lab_dep_ollama_cloud_minimax';
export const LAB_DEP_OLLAMA_CLOUD_QWEN = 'lab_dep_ollama_cloud_qwen';
export const LAB_DEP_OLLAMA_CLOUD_GPTOSS = 'lab_dep_ollama_cloud_gptoss';
/** QUALITY_ESCALATION role — excluded from the ordinary walk by `resolveChain`. */
export const LAB_DEP_GEMINI_ESCALATION = 'lab_dep_gemini_escalation';

/** The 6 entries `resolveChain` treats as ordinarily runnable. */
export const LAB_ALL_CLOUD_DEPLOYMENT_IDS: readonly string[] = [
  LAB_DEP_GEMINI_PRIMARY,
  LAB_DEP_GEMINI_FALLBACK,
  LAB_DEP_OLLAMA_CLOUD_GLM,
  LAB_DEP_OLLAMA_CLOUD_MINIMAX,
  LAB_DEP_OLLAMA_CLOUD_QWEN,
  LAB_DEP_OLLAMA_CLOUD_GPTOSS,
];

/** The corpus builder throws if the assembled corpus does not total exactly this. */
export const ROUTING_LAB_EXPECTED_CORPUS_SIZE = 300;

export const ROUTING_LAB_PRIVACY_CLASSES: readonly PrivacyClass[] = Object.values(PrivacyClass);
export const ROUTING_LAB_DOMAINS: readonly DomainTag[] = Object.values(DomainTag);
export const ROUTING_LAB_LENGTH_BUCKETS: readonly RoutingLabPromptLengthBucket[] = Object.values(
  RoutingLabPromptLengthBucket,
);

/** Target character count a baseline prompt is built out to, per bucket. */
export const ROUTING_LAB_LENGTH_BUCKET_TARGET_CHARS: Readonly<
  Record<RoutingLabPromptLengthBucket, number>
> = {
  [RoutingLabPromptLengthBucket.SHORT]: 60,
  [RoutingLabPromptLengthBucket.MEDIUM]: 450,
  [RoutingLabPromptLengthBucket.LONG]: 2_200,
};

/** Used only if a lookup somehow misses a mapped bucket; mirrors MEDIUM. */
export const ROUTING_LAB_LENGTH_TARGET_FALLBACK_CHARS = 450;

/**
 * The fixture chain is cloud-only (Gemini + Ollama Cloud), matching the real
 * seeded default. A `LOCAL_ONLY` request therefore has nothing eligible to
 * select — the same honest decline production hits until a local entry
 * exists — which is why that row maps to an empty array rather than a typo.
 */
export const ROUTING_LAB_ELIGIBLE_DEPLOYMENT_IDS_BY_PRIVACY_CLASS: Readonly<
  Record<PrivacyClass, readonly string[]>
> = {
  [PrivacyClass.PUBLIC_OK]: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
  [PrivacyClass.CLOUD_PERMITTED]: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
  [PrivacyClass.LOCAL_PREFERRED]: LAB_ALL_CLOUD_DEPLOYMENT_IDS,
  [PrivacyClass.LOCAL_ONLY]: [],
};
