import type { ComfyUINodeDescriptor, ComfyUIWorkflowPayload } from '../types/comfyui.types';

const CLASS_TYPE_LABELS: Record<string, string> = {
  CheckpointLoaderSimple: 'Checkpoint load',
  CLIPTextEncode: 'Text encode',
  EmptyLatentImage: 'Empty latent',
  KSampler: 'Sampling',
  KSamplerAdvanced: 'Sampling',
  VAEDecode: 'VAE decode',
  VAEEncode: 'VAE encode',
  SaveImage: 'Save image',
  PreviewImage: 'Preview image',
  LoraLoader: 'LoRA load',
  ControlNetLoader: 'ControlNet load',
  ControlNetApply: 'ControlNet apply',
  ImageScale: 'Image scale',
};

export function mapClassTypeToLabel(classType: string): string {
  return CLASS_TYPE_LABELS[classType] ?? classType;
}

export function buildNodeDescriptors(workflow: ComfyUIWorkflowPayload): ComfyUINodeDescriptor[] {
  const promptObj = workflow.prompt;
  if (!promptObj || typeof promptObj !== 'object') {
    return [];
  }
  const ids = Object.keys(promptObj).sort((a, b) => {
    const aNum = Number.parseInt(a, 10);
    const bNum = Number.parseInt(b, 10);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });
  return ids.map((nodeId, index) => {
    const node = promptObj[nodeId];
    const classType = node?.class_type ?? 'Unknown';
    return {
      nodeId,
      classType,
      humanLabel: mapClassTypeToLabel(classType),
      nodeIndex: index,
    };
  });
}

export function findDescriptor(
  descriptors: ReadonlyArray<ComfyUINodeDescriptor>,
  nodeId: string,
): ComfyUINodeDescriptor | undefined {
  return descriptors.find((d) => d.nodeId === nodeId);
}
