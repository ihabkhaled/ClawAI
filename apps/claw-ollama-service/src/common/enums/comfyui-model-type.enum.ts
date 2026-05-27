// Subdirectories under <COMFYUI_MODELS_PATH> that ComfyUI auto-discovers.
// See https://github.com/comfyanonymous/ComfyUI/blob/master/folder_paths.py
// for the canonical list. We only enumerate the subset we actually use; if
// you add a new IMAGE_GENERATION catalog entry whose weight lives in a
// different folder (e.g. `vae/`), extend this enum AND update the
// ComfyUIRuntimeAdapter directory scan.
export enum ComfyUIModelType {
  CHECKPOINTS = 'checkpoints',
  UNET = 'unet',
  CLIP = 'clip',
  VAE = 'vae',
  LORAS = 'loras',
  CONTROLNET = 'controlnet',
  DIFFUSERS = 'diffusers',
}
