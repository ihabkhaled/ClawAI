// Mirrors @claw/shared-types RuntimeProvider. The frontend never imports
// directly from shared-types — values must stay in sync with
// packages/shared-types/src/runtime-progress/runtime-provider.enum.ts.
export enum RuntimeProvider {
  OLLAMA = 'OLLAMA',
  LLAMACPP = 'LLAMACPP',
  STABLE_DIFFUSION_WEBUI = 'STABLE_DIFFUSION_WEBUI',
  COMFYUI = 'COMFYUI',
}
