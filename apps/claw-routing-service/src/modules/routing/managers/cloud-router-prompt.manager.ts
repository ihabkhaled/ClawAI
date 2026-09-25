import { Injectable } from '@nestjs/common';
import { WorkflowKind } from '../../../generated/prisma';
import { CLOUD_ROUTER_PROMPT_INSTRUCTION } from '../constants/cloud-router-prompt.constants';
import { MODALITY_FIT_PROMPT_NOTES } from '../constants/modality-fit.constants';
import type { EligibleDeploymentRecord } from '../types/model-deployment.types';
import type { RoutingContext } from '../types/routing.types';

/**
 * Builds the compact prompt `CloudRouteRequest.prompt` expects.
 *
 * Deliberately separate from PromptBuilderManager rather than an extension of
 * it: that manager builds the much larger Ollama-assisted routing prompt —
 * installed local models, learned routing priors, router education snapshots,
 * connector priors — none of which the cloud router's own coordinator needs
 * or can use, since it asks a cloud provider to pick one deployment id from a
 * short, explicit list, not to reason about the whole local fleet. Extending
 * PromptBuilderManager to also emit this shape would mean threading an
 * unrelated "which mode am I building for" branch through code that is
 * already tightly coupled to the local-only path (fetchInstalledModels,
 * adaptive learning, router education). A small, focused builder is cheaper
 * to read and to test than that branch would be.
 */
@Injectable()
export class CloudRouterPromptManager {
  buildPrompt(context: RoutingContext, eligible: readonly EligibleDeploymentRecord[]): string {
    // Multimodal batch 8: with attachments, each line says how the model fits
    // them, and the list is already ranked best-fit first (rule 51 item 13).
    const deploymentLines = eligible
      .map((deployment) => {
        const fit =
          deployment.modalityFit === undefined
            ? ''
            : ` — ${MODALITY_FIT_PROMPT_NOTES[deployment.modalityFit]}`;
        return `- ${deployment.id} (${deployment.provider}: ${deployment.providerModelId})${fit}`;
      })
      .join('\n');
    const required = context.requiredModalities ?? [];
    const attachmentsLine =
      required.length > 0
        ? `ATTACHMENTS: ${(context.attachmentMimeTypes ?? []).join(', ')} (needs ${required.join(', ')}). Prefer a deployment that reads them directly.\n`
        : '';
    const workflowLine = Object.values(WorkflowKind).join(', ');
    const complexityLine = context.complexity?.class
      ? `Message complexity: ${context.complexity.class}\n`
      : '';

    return [
      CLOUD_ROUTER_PROMPT_INSTRUCTION,
      `ELIGIBLE DEPLOYMENTS:\n${deploymentLines}`,
      `AVAILABLE WORKFLOWS: ${workflowLine}`,
      `${complexityLine}${attachmentsLine}USER MESSAGE:\n${context.message}`,
    ].join('\n\n');
  }
}
