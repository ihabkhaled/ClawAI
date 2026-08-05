import type { ClawEffortProfile, ClawSpeedProfile } from '@claw/shared-types';
import type { ToolChoiceMode } from '../../../common/enums';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';

export type ExecutionOptions = {
  fastPathEnabled: boolean;
  // Optional now: when undefined the adapter does NOT send max_tokens /
  // num_predict to the provider, letting the model decide its own stop
  // token. The cap is only applied when the thread explicitly sets one
  // (or the AUTO fast-path deliberately wants short replies).
  maxOutputTokens?: number;
  applyShortResponseConstraint: boolean;
  // Runtime V2 native tool calling. When set, the admitted tool catalog is
  // translated into the provider's native tool dialect and attached to the
  // request, and tool calls are parsed back off the response.
  //
  // This is the whole insertion point for native tools: ExecutionOptions is
  // already threaded callProvider -> dispatchProvider -> callCloudProvider ->
  // buildCloudProviderRequestBody, so no signature in that chain changes.
  //
  // Undefined means "no tools on this call" — ordinary chat, compare, judge
  // and every non-agent path are unaffected.
  toolCatalog?: readonly ToolDefinitionDto[];
  // How hard to push the model toward calling a tool this turn. Defaults to
  // AUTO when a catalog is present. REQUIRED must be released after one turn
  // or the run can never produce a final answer.
  toolChoice?: ToolChoiceMode;
  // Requested reasoning effort. Resolved per provider against the exact values
  // that model accepts — never mapped silently, so a request for MAX that the
  // model cannot honour is reported rather than quietly served as `low`.
  //
  // Undefined leaves every existing path exactly as it was: no effort
  // parameter is added to any request.
  effortProfile?: ClawEffortProfile;
  // Effort values this exact model is known to accept, from the capability
  // evidence registry. Empty or absent means nothing is proven, which resolves
  // to ClawAI-side orchestration rather than an invented provider value.
  effortSupportedValues?: readonly string[];
  // Requested speed tier. Orthogonal to effort: high effort at standard speed
  // and medium effort on an accelerated tier are both valid combinations.
  speedProfile?: ClawSpeedProfile;
  // Tier values this exact model/account is known to accept. Empty means the
  // tier cannot be granted, which is reported rather than silently served as
  // standard-with-a-2x-label.
  speedSupportedValues?: readonly string[];
};
