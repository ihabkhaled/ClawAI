import { type ImageEditCapability } from './image-edit-capability.types';

/**
 * The image providers' edit capabilities, in the order an EDIT prefers them
 * (pack §10/§81). Selection is capability-driven: routing, chat-service and
 * image-service read this table instead of `provider === ...` checks.
 *
 * - IMAGE_GEMINI — reference image inline in `:generateContent`. Live.
 * - IMAGE_OPENAI — `POST /v1/images/edits` (gpt-image family) with an optional
 *   PNG alpha mask. Built 2026-09-26; live verification deferred (owner: the
 *   dev key has no OpenAI credit).
 * - IMAGE_LOCAL — SD WebUI img2img (`init_images`).
 * - IMAGE_GROK / IMAGE_LOCAL_COMFYUI — text-to-image only: the xAI call and the
 *   sd15-minimal ComfyUI workflow take no input image.
 */
export const IMAGE_EDIT_CAPABILITIES: readonly ImageEditCapability[] = [
  { provider: 'IMAGE_GEMINI', reference: true, mask: false, editModel: 'gemini-2.5-flash-image' },
  {
    provider: 'IMAGE_OPENAI',
    reference: true,
    mask: true,
    editModel: 'gpt-image-1',
    editModelPattern: /^gpt-image/iu,
  },
  { provider: 'IMAGE_LOCAL', reference: true, mask: false, editModel: 'sdxl-turbo' },
  { provider: 'IMAGE_GROK', reference: false, mask: false, editModel: 'grok-imagine-image' },
  { provider: 'IMAGE_LOCAL_COMFYUI', reference: false, mask: false, editModel: 'sd_v1-5' },
];
