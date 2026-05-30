import type { ComfyUIWorkflowBuildParams, ComfyUIWorkflowPayload } from '../types/comfyui.types';

const DEFAULT_CHECKPOINT = 'v1-5-pruned-emaonly.safetensors';
const DEFAULT_SAMPLER = 'euler';
const DEFAULT_SCHEDULER = 'normal';
const DEFAULT_STEPS = 20;
const DEFAULT_CFG = 7;
const DEFAULT_NEGATIVE = 'blurry, low quality, distorted';
const DEFAULT_FILENAME_PREFIX = 'ClawAI_image';

function generateRandomSeed(): number {
  // eslint-disable-next-line security/detect-pseudoRandomBytes
  return Math.floor(Math.random() * 0x100000000);
}

export function buildSd15MinimalWorkflow(
  clientId: string,
  params: ComfyUIWorkflowBuildParams,
): ComfyUIWorkflowPayload {
  const width = Math.max(64, Math.min(2048, params.width));
  const height = Math.max(64, Math.min(2048, params.height));
  const steps = params.steps ?? DEFAULT_STEPS;
  const cfg = params.cfg ?? DEFAULT_CFG;
  const sampler = params.sampler ?? DEFAULT_SAMPLER;
  const scheduler = params.scheduler ?? DEFAULT_SCHEDULER;
  const seed = params.seed ?? generateRandomSeed();
  const checkpointName = params.checkpointName ?? DEFAULT_CHECKPOINT;
  const filenamePrefix = params.filenamePrefix ?? DEFAULT_FILENAME_PREFIX;
  const negative = params.negativePrompt ?? DEFAULT_NEGATIVE;
  return {
    prompt: {
      '3': {
        class_type: 'KSampler',
        _meta: { title: 'KSampler' },
        inputs: {
          seed,
          steps,
          cfg,
          sampler_name: sampler,
          scheduler,
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
      },
      '4': {
        class_type: 'CheckpointLoaderSimple',
        _meta: { title: 'Load Checkpoint' },
        inputs: { ckpt_name: checkpointName },
      },
      '5': {
        class_type: 'EmptyLatentImage',
        _meta: { title: 'Empty Latent Image' },
        inputs: { width, height, batch_size: 1 },
      },
      '6': {
        class_type: 'CLIPTextEncode',
        _meta: { title: 'CLIP Text Encode (Positive)' },
        inputs: { text: params.prompt, clip: ['4', 1] },
      },
      '7': {
        class_type: 'CLIPTextEncode',
        _meta: { title: 'CLIP Text Encode (Negative)' },
        inputs: { text: negative, clip: ['4', 1] },
      },
      '8': {
        class_type: 'VAEDecode',
        _meta: { title: 'VAE Decode' },
        inputs: { samples: ['3', 0], vae: ['4', 2] },
      },
      '9': {
        class_type: 'SaveImage',
        _meta: { title: 'Save Image' },
        inputs: { filename_prefix: filenamePrefix, images: ['8', 0] },
      },
    },
    client_id: clientId,
  };
}
