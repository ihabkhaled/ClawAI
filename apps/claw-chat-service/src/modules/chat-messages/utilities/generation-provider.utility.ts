import { FILE_GENERATION_PROVIDER, IMAGE_PROVIDER_PREFIX } from '../../../common/constants';

/**
 * True for a provider that generates an artefact rather than a chat completion.
 *
 * These are capabilities, not connector deployments. `IMAGE_OPENAI` and
 * `IMAGE_GEMINI` resolve their credentials from the OpenAI and Google connectors
 * at call time inside image-service, and `IMAGE_LOCAL` talks to a local runtime;
 * none of them has a row in the model-exposure registry and none ever will.
 *
 * The distinction matters because the exposure gate asks the registry "is this
 * deployment offered", which is unanswerable for a capability. It answered no,
 * so every image model in the composer returned "The selected model is not
 * available" regardless of how the connectors were configured.
 */
export function isGenerationProvider(provider: string): boolean {
  return provider.startsWith(IMAGE_PROVIDER_PREFIX) || provider === FILE_GENERATION_PROVIDER;
}
