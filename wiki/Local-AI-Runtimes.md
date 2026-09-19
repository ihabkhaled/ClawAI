# Local AI Runtimes

ClawAI supports local inference as first-class services.

## Ollama
Modules: `health`, `ollama`, `runtime-progress`.

## llama.cpp
Modules: `binary`, `catalog`, `hardware`, `health`, `inference`, `models-lifecycle`, `pull-jobs`, `runtime-progress`.

The repository also contains Docker GPU overlays for NVIDIA, ROCm and Vulkan, Ollama-specific compose overlays, and runtime probes for Ollama, llama.cpp, ComfyUI and Stable Diffusion WebUI.

Related: [[Docker and Containers|Docker-and-Containers]] · [scripts/local-runtime-probes/](https://github.com/ihabkhaled/ClawAI/blob/main/scripts/local-runtime-probes).
