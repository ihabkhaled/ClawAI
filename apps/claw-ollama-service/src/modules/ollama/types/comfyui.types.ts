import type { ComfyUIModelType } from '../../../common/enums';

// What every IMAGE_GENERATION (COMFYUI runtime) catalog entry needs in order
// for ComfyUIRuntimeAdapter to know HOW to download it. Lives alongside the
// catalog entry, not inferred — being explicit avoids brittle filename
// guessing logic for new Stable Diffusion / FLUX releases.
export type ComfyUIDownloadDescriptor = {
  // Full HuggingFace (or other CDN) URL to the .safetensors / .ckpt /
  // .gguf file. Must respond to HTTP HEAD with 200 (or 302 → 200).
  url: string;
  // Filename to write inside <modelsPath>/<modelType>/. Should match how
  // the model is referenced inside ComfyUI workflows (e.g.
  // `sd_xl_base_1.0.safetensors`).
  filename: string;
  // Subdirectory under <COMFYUI_MODELS_PATH>. Determines which ComfyUI
  // node will see the model (CheckpointLoaderSimple reads `checkpoints/`,
  // UNETLoader reads `unet/`, etc.).
  modelType: ComfyUIModelType;
};

// Subset of /system_stats response we actually consume.
export type ComfyUISystemStatsResponse = {
  system?: { os?: string; comfyui_version?: string };
  devices?: Array<{ name: string; type: string; vram_total?: number }>;
};
