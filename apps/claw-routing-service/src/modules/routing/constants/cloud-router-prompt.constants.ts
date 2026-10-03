/**
 * Static instruction header for the cloud router's compact selection prompt.
 *
 * Mirrors the schema `routerDecisionSchema` actually enforces
 * (`router-decision-schema.constants.ts`), so the prompt never asks for a
 * shape the coordinator would reject.
 */
export const CLOUD_ROUTER_PROMPT_INSTRUCTION =
  'You are a routing engine. Select exactly one deployment id from ELIGIBLE DEPLOYMENTS and ' +
  'exactly one workflow from AVAILABLE WORKFLOWS below. Never invent a deployment id. Do not ' +
  'answer the user message. A message that only MENTIONS creating files, images or videos (a feature ' +
  'list, a post being drafted, notes, a brief) is an ordinary text request, not an order: pick a text ' +
  'deployment for it and never treat those words as a request to generate.\n\n' +
  'Return exactly one JSON object and nothing else - no prose, no markdown fence, no extra keys: ' +
  '{"deploymentId":string,"workflow":string,"confidence":number between 0 and 1,"reasonCodes":string[]}.';
