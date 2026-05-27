import { ComfyUIModelType } from '../../../common/enums';
import type { ComfyUIDownloadDescriptor } from '../types/comfyui.types';

// Registry mapping (catalog entry `name:tag` → ComfyUI download recipe).
// Updating an existing IMAGE_GENERATION catalog entry? Update this map in the
// same commit so the ComfyUI runtime adapter knows how to actually fetch the
// weights. Catalog entries without an entry here are downloadable=false.
//
// All URLs MUST be:
//   - Direct download links (HuggingFace `/resolve/main/<file>` URLs work)
//   - Publicly accessible (no token required — gated repos must be replaced)
//   - .safetensors or .ckpt or .gguf (formats ComfyUI auto-loads)
//
// Sources verified against HuggingFace as of 2026-05-27. If a HEAD request
// against the URL returns 404, the catalog entry will be marked
// `availabilityError: 'HuggingFace weight not found'` in the UI.
const COMFYUI_DOWNLOAD_REGISTRY = new Map<string, ComfyUIDownloadDescriptor>([
  [
    'sdxl-base:1.0',
    {
      url: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors',
      filename: 'sd_xl_base_1.0.safetensors',
      modelType: ComfyUIModelType.CHECKPOINTS,
    },
  ],
  [
    'sdxl-turbo:latest',
    {
      url: 'https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors',
      filename: 'sd_xl_turbo_1.0_fp16.safetensors',
      modelType: ComfyUIModelType.CHECKPOINTS,
    },
  ],
  [
    'sd-1.5:latest',
    {
      url: 'https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors',
      filename: 'v1-5-pruned-emaonly.safetensors',
      modelType: ComfyUIModelType.CHECKPOINTS,
    },
  ],
  [
    'sd-3.5-large:latest',
    {
      // The official stabilityai/stable-diffusion-3.5-large repo is gated
      // (requires HF login + license acceptance) — un-tokened HEAD/GET
      // returns 401. Comfy-Org repacks the same weights as a single
      // FP8 safetensors that's ungated and ComfyUI-ready.
      url: 'https://huggingface.co/Comfy-Org/stable-diffusion-3.5-fp8/resolve/main/sd3.5_large_fp8_scaled.safetensors',
      filename: 'sd3.5_large_fp8_scaled.safetensors',
      modelType: ComfyUIModelType.CHECKPOINTS,
    },
  ],
  [
    'flux.1-schnell:latest',
    {
      // FLUX.1 Schnell ships as a single combined safetensors that ComfyUI
      // loads via CheckpointLoaderSimple (no separate clip/vae download).
      url: 'https://huggingface.co/Comfy-Org/flux1-schnell/resolve/main/flux1-schnell-fp8.safetensors',
      filename: 'flux1-schnell-fp8.safetensors',
      modelType: ComfyUIModelType.CHECKPOINTS,
    },
  ],
]);

export function getComfyUIDownloadDescriptor(
  catalogName: string,
  catalogTag: string,
): ComfyUIDownloadDescriptor | undefined {
  return COMFYUI_DOWNLOAD_REGISTRY.get(`${catalogName}:${catalogTag}`);
}

export function isComfyUIEntryDownloadable(catalogName: string, catalogTag: string): boolean {
  return COMFYUI_DOWNLOAD_REGISTRY.has(`${catalogName}:${catalogTag}`);
}

export function listComfyUIDownloadKeys(): string[] {
  return [...COMFYUI_DOWNLOAD_REGISTRY.keys()];
}
